/**
 * "Add to Home Screen" detection and prompt eligibility.
 *
 * No platform lets a website ask "is this app installed?" — the closest
 * durable signal is per-device: whenever a session runs in standalone mode
 * (launched from the home-screen icon) we record it in localStorage, and the
 * install prompt is suppressed on that device forever after. Installedness
 * is a device property, so device-scoped storage is the right granularity.
 */

export type InstallPlatform = 'ios' | 'android' | 'desktop';

const STANDALONE_SEEN_KEY = 'pwa:standaloneSeenAt';
const DISMISSED_KEY = 'pwa:installPromptDismissedAt';

/** How long a "Not Now" suppresses the prompt. */
export const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export const detectInstallPlatform = (userAgent: string): InstallPlatform => {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
};

export interface InstallPromptContext {
  /** Platform.OS — everything except 'web' is ineligible. */
  platformOS: string;
  /** Session is currently running from the home-screen install. */
  isStandalone: boolean;
  /** A standalone launch was ever recorded on this device. */
  standaloneSeenAt: number | null;
  /** Last "Not Now" on this device. */
  dismissedAt: number | null;
  platform: InstallPlatform;
  /** A Chromium beforeinstallprompt event has been captured. */
  canPromptNative: boolean;
  now: number;
}

export function shouldShowInstallPrompt(ctx: InstallPromptContext): boolean {
  if (ctx.platformOS !== 'web') return false;
  if (ctx.isStandalone) return false;
  if (ctx.standaloneSeenAt != null) return false;
  if (ctx.dismissedAt != null && ctx.now - ctx.dismissedAt < DISMISS_COOLDOWN_MS) return false;
  // With a captured native prompt, installing is definitely possible (any
  // Chromium, including desktop). Otherwise only iOS/Android have a manual
  // "Add to Home Screen" path worth explaining — desktop Safari/Firefox
  // would get instructions for a menu item they don't have.
  if (ctx.canPromptNative) return true;
  return ctx.platform === 'ios' || ctx.platform === 'android';
}

const readTimestamp = (key: string): number | null => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeTimestamp = (key: string): void => {
  try {
    globalThis.localStorage?.setItem(key, String(Date.now()));
  } catch {
    // Storage unavailable (private mode etc.) — degrade to session-only.
  }
};

export const getStandaloneSeenAt = (): number | null => readTimestamp(STANDALONE_SEEN_KEY);
export const markStandaloneSeen = (): void => writeTimestamp(STANDALONE_SEEN_KEY);
export const getInstallPromptDismissedAt = (): number | null => readTimestamp(DISMISSED_KEY);
export const markInstallPromptDismissed = (): void => writeTimestamp(DISMISSED_KEY);

export const isStandaloneNow = (): boolean => {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
};
