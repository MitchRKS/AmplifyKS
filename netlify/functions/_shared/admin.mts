// Shared firebase-admin bootstrap for Netlify Functions.
//
// Requires the FIREBASE_SERVICE_ACCOUNT env var: the service-account JSON
// from Firebase console → Project settings → Service accounts → "Generate
// new private key", either as raw JSON or base64-encoded. Set it in the
// Netlify environment (and in .env for `netlify dev`).
//
// This directory (_shared/) is not picked up as a function by Netlify —
// only top-level files in netlify/functions/ are.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export interface AdminServices {
  auth: Auth;
  db: Firestore;
}

export function getAdmin(): AdminServices | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  if (getApps().length === 0) {
    const json = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export const notConfigured = (): Response =>
  Response.json(
    {
      error:
        'FIREBASE_SERVICE_ACCOUNT is not configured on the server. Add the service-account key to the Netlify environment.',
    },
    { status: 503 },
  );

/** Verify a "Bearer <idToken>" Authorization header; returns the decoded uid or null. */
export async function verifyBearer(
  auth: Auth,
  req: Request,
): Promise<{ uid: string; email?: string; name?: string } | null> {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

// Origins allowed to use the auth endpoints. Production + local dev; extend
// with PASSKEY_ALLOWED_ORIGINS (comma-separated) when a custom domain lands.
const DEFAULT_ORIGINS = ['https://amplifyks-web.netlify.app'];

export function resolveOrigin(req: Request): { origin: string; rpID: string } | null {
  const origin = req.headers.get('origin') ?? '';
  const extra = (process.env.PASSKEY_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed =
    DEFAULT_ORIGINS.includes(origin) ||
    extra.includes(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin);
  if (!allowed) return null;
  try {
    return { origin, rpID: new URL(origin).hostname };
  } catch {
    return null;
  }
}
