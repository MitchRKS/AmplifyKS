import {
  APPLE_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  linkOptionsFor,
  providerLabel,
} from '../auth-linking';

describe('linkOptionsFor', () => {
  it('offers password when the account was registered with a password', () => {
    expect(linkOptionsFor(GOOGLE_PROVIDER_ID, ['password'])).toEqual(['password']);
    expect(linkOptionsFor(APPLE_PROVIDER_ID, ['password'])).toEqual(['password']);
  });

  it('offers google when an apple attempt hits a google-registered account', () => {
    expect(linkOptionsFor(APPLE_PROVIDER_ID, [GOOGLE_PROVIDER_ID])).toEqual(['google']);
  });

  it('never offers google to re-auth a failed google attempt (would loop)', () => {
    expect(linkOptionsFor(GOOGLE_PROVIDER_ID, [GOOGLE_PROVIDER_ID])).toEqual([]);
    expect(linkOptionsFor(GOOGLE_PROVIDER_ID, [])).toEqual(['password']);
  });

  it('offers both when the account has both methods and apple was attempted', () => {
    expect(linkOptionsFor(APPLE_PROVIDER_ID, ['password', GOOGLE_PROVIDER_ID])).toEqual([
      'password',
      'google',
    ]);
  });

  it('offers every plausible option when methods are unknown (enumeration protection)', () => {
    // Empty methods still means the account EXISTS — Firebase already said so
    // via account-exists-with-different-credential; we just can't see how it
    // signs in.
    expect(linkOptionsFor(APPLE_PROVIDER_ID, [])).toEqual(['password', 'google']);
    expect(linkOptionsFor(GOOGLE_PROVIDER_ID, [])).toEqual(['password']);
  });

  it('handles an apple-registered account hit by a google attempt', () => {
    // Only apple exists; google can't re-auth it and there is no password.
    // (Rare in practice: Google usually signs straight into such emails.)
    expect(linkOptionsFor(GOOGLE_PROVIDER_ID, [APPLE_PROVIDER_ID])).toEqual([]);
  });
});

describe('providerLabel', () => {
  it('labels the known providers', () => {
    expect(providerLabel(GOOGLE_PROVIDER_ID)).toBe('Google');
    expect(providerLabel(APPLE_PROVIDER_ID)).toBe('Apple');
  });

  it('falls back to the raw id for unknown providers', () => {
    expect(providerLabel('facebook.com')).toBe('facebook.com');
  });
});
