import {
  detectInstallPlatform,
  DISMISS_COOLDOWN_MS,
  shouldShowInstallPrompt,
  type InstallPromptContext,
} from '../pwa-install';

const NOW = 1_800_000_000_000;

const ctx = (overrides: Partial<InstallPromptContext> = {}): InstallPromptContext => ({
  platformOS: 'web',
  isStandalone: false,
  standaloneSeenAt: null,
  dismissedAt: null,
  platform: 'ios',
  canPromptNative: false,
  now: NOW,
  ...overrides,
});

describe('shouldShowInstallPrompt', () => {
  it('prompts eligible iOS and Android browser sessions', () => {
    expect(shouldShowInstallPrompt(ctx({ platform: 'ios' }))).toBe(true);
    expect(shouldShowInstallPrompt(ctx({ platform: 'android' }))).toBe(true);
  });

  it('never prompts native app builds', () => {
    expect(shouldShowInstallPrompt(ctx({ platformOS: 'ios' }))).toBe(false);
  });

  it('never prompts a session already running standalone', () => {
    expect(shouldShowInstallPrompt(ctx({ isStandalone: true }))).toBe(false);
  });

  it('never prompts a device that has ever launched standalone', () => {
    expect(shouldShowInstallPrompt(ctx({ standaloneSeenAt: NOW - 1000 }))).toBe(false);
  });

  it('respects the dismiss cooldown, then prompts again', () => {
    expect(
      shouldShowInstallPrompt(ctx({ dismissedAt: NOW - DISMISS_COOLDOWN_MS + 1000 })),
    ).toBe(false);
    expect(
      shouldShowInstallPrompt(ctx({ dismissedAt: NOW - DISMISS_COOLDOWN_MS - 1000 })),
    ).toBe(true);
  });

  it('skips desktop unless a native install prompt was captured', () => {
    expect(shouldShowInstallPrompt(ctx({ platform: 'desktop' }))).toBe(false);
    expect(
      shouldShowInstallPrompt(ctx({ platform: 'desktop', canPromptNative: true })),
    ).toBe(true);
  });
});

describe('detectInstallPlatform', () => {
  it('detects iOS devices', () => {
    expect(
      detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
    ).toBe('ios');
    expect(detectInstallPlatform('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('ios');
  });

  it('detects Android devices', () => {
    expect(
      detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0'),
    ).toBe('android');
  });

  it('defaults everything else to desktop', () => {
    expect(
      detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'),
    ).toBe('desktop');
  });
});
