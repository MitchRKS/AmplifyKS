// Passkey (WebAuthn) endpoints backing the app's passkey sign-in.
//
// Firebase Auth has no native passkey support, so this function implements
// the WebAuthn ceremonies with @simplewebauthn/server and bridges into
// Firebase by minting a custom token (signInWithCustomToken on the client).
//
// Actions (POST JSON {action, ...}):
//   register-options  (Bearer id-token)  → creation options; challenge stored per-uid
//   register-verify   (Bearer id-token)  → verifies + stores the credential
//   auth-options      (anonymous)        → request options (discoverable/usernameless)
//   auth-verify       (anonymous)        → verifies assertion → {token} custom token
//
// Firestore (admin-only; clients are locked out by the default-deny rules):
//   passkeyCredentials/{credentialId}: {uid, publicKey(b64url), counter,
//     transports, deviceType, backedUp, label, createdAt}
//   webauthnChallenges/{uid | session:<id>}: {challenge, type, createdAt}

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

import { getAdmin, notConfigured, resolveOrigin, verifyBearer } from './_shared/admin.mts';

const RP_NAME = 'Amplify';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Best-effort limiter (in-memory per warm instance, same caveats as the
// LegiScan proxy's): these endpoints write Firestore docs and do crypto,
// so don't let a naive loop hammer them.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(clientId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  timestamps.push(now);
  requestLog.set(clientId, timestamps);
  if (requestLog.size > 500) {
    const oldestKey = requestLog.keys().next().value;
    if (oldestKey !== undefined) requestLog.delete(oldestKey);
  }
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

const bad = (message: string, status = 400): Response =>
  Response.json({ error: message }, { status });

interface StoredChallenge {
  challenge: string;
  type: 'registration' | 'authentication';
  createdAt: number;
}

export default async (req: Request, context: { ip?: string }): Promise<Response> => {
  if (req.method !== 'POST') return bad('POST only', 405);

  const clientId = context.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'unknown';
  if (isRateLimited(clientId)) return bad('Too many requests. Please slow down.', 429);

  const admin = getAdmin();
  if (!admin) return notConfigured();
  const { auth, db } = admin;

  const originInfo = resolveOrigin(req);
  if (!originInfo) return bad('Origin not allowed.', 403);
  const { origin, rpID } = originInfo;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }

  const challenges = db.collection('webauthnChallenges');
  const credentials = db.collection('passkeyCredentials');

  const readChallenge = async (
    docId: string,
    type: StoredChallenge['type'],
  ): Promise<string | null> => {
    const snap = await challenges.doc(docId).get();
    if (!snap.exists) return null;
    const data = snap.data() as StoredChallenge;
    await challenges.doc(docId).delete(); // single-use
    if (data.type !== type || Date.now() - data.createdAt > CHALLENGE_TTL_MS) return null;
    return data.challenge;
  };

  switch (body.action) {
    case 'register-options': {
      const user = await verifyBearer(auth, req);
      if (!user) return bad('Sign in required.', 401);

      const existing = await credentials.where('uid', '==', user.uid).get();
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userName: user.email ?? user.uid,
        userDisplayName: user.name ?? '',
        attestationType: 'none',
        excludeCredentials: existing.docs.map((d) => ({
          id: d.id,
          transports: d.data().transports ?? undefined,
        })),
        authenticatorSelection: {
          // Discoverable so sign-in works without typing an email first.
          residentKey: 'required',
          userVerification: 'preferred',
        },
      });

      await challenges.doc(user.uid).set({
        challenge: options.challenge,
        type: 'registration',
        createdAt: Date.now(),
      } satisfies StoredChallenge);

      return Response.json(options);
    }

    case 'register-verify': {
      const user = await verifyBearer(auth, req);
      if (!user) return bad('Sign in required.', 401);
      if (!body.response) return bad('Missing response.');

      const expectedChallenge = await readChallenge(user.uid, 'registration');
      if (!expectedChallenge) return bad('Challenge expired — try again.', 410);

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body.response,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });
      } catch (error: any) {
        return bad(`Registration could not be verified: ${error.message}`);
      }
      if (!verification.verified || !verification.registrationInfo) {
        return bad('Registration could not be verified.');
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;
      await credentials.doc(credential.id).set({
        uid: user.uid,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        label: typeof body.label === 'string' ? body.label.slice(0, 60) : 'Passkey',
        createdAt: Date.now(),
      });

      return Response.json({ verified: true });
    }

    case 'auth-options': {
      // Usernameless: no allowCredentials — the browser offers whatever
      // discoverable credentials it holds for this RP.
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
      });

      const sessionId = crypto.randomUUID();
      await challenges.doc(`session:${sessionId}`).set({
        challenge: options.challenge,
        type: 'authentication',
        createdAt: Date.now(),
      } satisfies StoredChallenge);

      return Response.json({ options, sessionId });
    }

    case 'auth-verify': {
      if (typeof body.sessionId !== 'string' || !body.response?.id) {
        return bad('Missing sessionId or response.');
      }

      const expectedChallenge = await readChallenge(`session:${body.sessionId}`, 'authentication');
      if (!expectedChallenge) return bad('Challenge expired — try again.', 410);

      const credSnap = await credentials.doc(body.response.id).get();
      if (!credSnap.exists) return bad('Unknown passkey.', 404);
      const cred = credSnap.data()!;

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body.response,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: credSnap.id,
            publicKey: new Uint8Array(Buffer.from(cred.publicKey, 'base64url')),
            counter: cred.counter,
            transports: cred.transports ?? undefined,
          },
        });
      } catch (error: any) {
        return bad(`Sign-in could not be verified: ${error.message}`);
      }
      if (!verification.verified) return bad('Sign-in could not be verified.', 401);

      await credSnap.ref.update({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: Date.now(),
      });

      const token = await auth.createCustomToken(cred.uid);
      return Response.json({ token });
    }

    default:
      return bad(`Unknown action: ${body.action}`);
  }
};
