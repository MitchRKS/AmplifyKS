/**
 * Pure decision logic for the cross-provider account-linking flow.
 *
 * When a social sign-in (Google/Apple) hits an existing account that was
 * registered a different way, Firebase throws
 * `auth/account-exists-with-different-credential`. We then offer the user a
 * way to sign in with their existing method and link the new provider, so
 * next time either method works.
 */

export const GOOGLE_PROVIDER_ID = 'google.com';
export const APPLE_PROVIDER_ID = 'apple.com';
export const PASSWORD_METHOD = 'password';

export type LinkOption = 'password' | 'google';

/**
 * Which re-authentication options to offer, given the provider the user just
 * tried and the sign-in methods that already exist for the email.
 *
 * `existingMethods` is empty when the project has email-enumeration
 * protection enabled (fetchSignInMethodsForEmail returns nothing) or the
 * lookup failed — we still KNOW an account exists (Firebase said so), we
 * just don't know how it signs in, so offer every plausible option.
 */
export function linkOptionsFor(
  attemptedProviderId: string,
  existingMethods: readonly string[],
): LinkOption[] {
  const options: LinkOption[] = [];
  const unknown = existingMethods.length === 0;

  if (unknown || existingMethods.includes(PASSWORD_METHOD)) {
    options.push('password');
  }

  // Google can re-authenticate the account only if Google is (or may be) one
  // of its existing methods — and only when that's not the provider that just
  // failed, which would loop.
  if (
    attemptedProviderId !== GOOGLE_PROVIDER_ID &&
    (unknown || existingMethods.includes(GOOGLE_PROVIDER_ID))
  ) {
    options.push('google');
  }

  return options;
}

/** Human label for the provider the user just tried ("Apple" / "Google"). */
export function providerLabel(providerId: string): string {
  switch (providerId) {
    case GOOGLE_PROVIDER_ID:
      return 'Google';
    case APPLE_PROVIDER_ID:
      return 'Apple';
    default:
      return providerId;
  }
}
