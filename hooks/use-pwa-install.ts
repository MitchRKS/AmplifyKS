import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  detectInstallPlatform,
  getInstallPromptDismissedAt,
  getStandaloneSeenAt,
  isStandaloneNow,
  markInstallPromptDismissed,
  markStandaloneSeen,
  shouldShowInstallPrompt,
  type InstallPlatform,
} from '@/services/pwa-install';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chromium fires beforeinstallprompt early — often before React mounts — so
// it must be captured at module load, not in a component effect.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    // Install moment (Chromium only) — as durable a signal as a standalone
    // launch, so record it the same way.
    markStandaloneSeen();
    deferredPrompt = null;
    notify();
  });
}

export function usePwaInstall() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  // Running standalone is the "they installed it" signal — record it so the
  // prompt stays suppressed on this device even in future browser-tab visits.
  useEffect(() => {
    if (Platform.OS === 'web' && isStandaloneNow() && getStandaloneSeenAt() == null) {
      markStandaloneSeen();
    }
  }, []);

  const platform: InstallPlatform =
    Platform.OS === 'web' && typeof navigator !== 'undefined'
      ? detectInstallPlatform(navigator.userAgent)
      : 'desktop';

  const shouldPrompt = shouldShowInstallPrompt({
    platformOS: Platform.OS,
    isStandalone: Platform.OS === 'web' && isStandaloneNow(),
    standaloneSeenAt: getStandaloneSeenAt(),
    dismissedAt: getInstallPromptDismissedAt(),
    platform,
    canPromptNative: deferredPrompt != null,
    now: Date.now(),
  });

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const event = deferredPrompt;
    if (!event) return false;
    deferredPrompt = null;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') {
        markStandaloneSeen();
        notify();
        return true;
      }
    } catch {
      // Prompt already used or blocked — treat as declined.
    }
    notify();
    return false;
  }, []);

  const dismiss = useCallback(() => {
    markInstallPromptDismissed();
  }, []);

  return {
    shouldPrompt,
    platform,
    canPromptNative: deferredPrompt != null,
    promptInstall,
    dismiss,
  };
}
