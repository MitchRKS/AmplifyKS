import { signInWithCustomToken } from 'firebase/auth';
import { Platform } from 'react-native';

import { getAuth } from '@/services/firebase';

// Client half of the passkey flows backed by netlify/functions/passkey.mts.
// Web-only: WebAuthn needs the browser's navigator.credentials; the native
// builds would need platform passkey modules (not wired yet).

const PASSKEY_ENDPOINT = '/.netlify/functions/passkey';

export const passkeysSupported = (): boolean =>
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined';

class PasskeyError extends Error {
  /** True when the user dismissed the browser prompt — not worth an alert. */
  cancelled: boolean;
  constructor(message: string, cancelled = false) {
    super(message);
    this.cancelled = cancelled;
  }
}

const post = async (body: Record<string, unknown>, idToken?: string) => {
  const response = await fetch(PASSKEY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PasskeyError(data.error ?? `Passkey request failed (${response.status}).`);
  }
  return data;
};

const isBrowserCancel = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'NotAllowedError' || error.name === 'AbortError');

/** Create a passkey for the currently signed-in user. */
export async function registerPasskey(): Promise<{ cancelled?: boolean }> {
  const currentUser = getAuth().currentUser;
  if (!currentUser) throw new PasskeyError('Sign in first to add a passkey.');

  const { startRegistration } = await import('@simplewebauthn/browser');
  const idToken = await currentUser.getIdToken();
  const options = await post({ action: 'register-options' }, idToken);

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: options });
  } catch (error) {
    if (isBrowserCancel(error)) return { cancelled: true };
    throw error;
  }

  await post({ action: 'register-verify', response: attestation }, idToken);
  return {};
}

/** Usernameless passkey sign-in; resolves once Firebase auth state updates. */
export async function signInWithPasskey(): Promise<{ cancelled?: boolean }> {
  const { startAuthentication } = await import('@simplewebauthn/browser');
  const { options, sessionId } = await post({ action: 'auth-options' });

  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON: options });
  } catch (error) {
    if (isBrowserCancel(error)) return { cancelled: true };
    throw error;
  }

  const { token } = await post({ action: 'auth-verify', sessionId, response: assertion });
  await signInWithCustomToken(getAuth(), token);
  return {};
}
