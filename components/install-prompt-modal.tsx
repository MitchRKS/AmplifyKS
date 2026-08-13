import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { InstallPlatform } from '@/services/pwa-install';

interface InstallPromptModalProps {
  platform: InstallPlatform;
  /** A captured Chromium install prompt is available. */
  canPromptNative: boolean;
  /** Trigger the native prompt; resolves true when the user accepts. */
  onInstall: () => Promise<boolean>;
  onClose: () => void;
}

/**
 * Dashboard prompt nudging browser-tab visitors to add Amplify to their home
 * screen. Chromium gets a real Install button (captured beforeinstallprompt);
 * iOS and Android without the event get their platform's manual steps —
 * neither exposes an install API.
 */
export function InstallPromptModal({
  platform,
  canPromptNative,
  onInstall,
  onClose,
}: InstallPromptModalProps) {
  const [installing, setInstalling] = useState(false);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const handleInstall = async () => {
    if (installing) return;
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
      onClose();
    }
  };

  const steps: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }[] =
    platform === 'ios'
      ? [
          { icon: 'ios-share', text: 'Tap the Share button in Safari' },
          { icon: 'add-box', text: 'Choose "Add to Home Screen"' },
        ]
      : [
          { icon: 'more-vert', text: 'Open the browser menu' },
          { icon: 'add-to-home-screen', text: 'Choose "Add to Home screen"' },
        ];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.lg]}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={20} color={mutedText} />
          </Pressable>

          <View style={[styles.iconCircle, { backgroundColor: tint + '15' }]}>
            <MaterialIcons name="install-mobile" size={28} color={tint} />
          </View>
          <ThemedText type="subtitle" style={styles.title}>
            Add Amplify to your Home Screen
          </ThemedText>
          <ThemedText style={[styles.body, { color: mutedText }]}>
            Get one-tap access to your electeds, bills, and testimony — no app store needed.
          </ThemedText>

          {canPromptNative ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: tint },
                pressed && styles.pressed,
              ]}
              onPress={() => void handleInstall()}
              disabled={installing}
            >
              {installing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Install</ThemedText>
              )}
            </Pressable>
          ) : (
            <View style={styles.steps}>
              {steps.map((step, index) => (
                <View key={step.text} style={styles.stepRow}>
                  <ThemedText style={[styles.stepNumber, { color: tint }]}>{index + 1}.</ThemedText>
                  <MaterialIcons name={step.icon} size={18} color={mutedText} />
                  <ThemedText style={styles.stepText}>{step.text}</ThemedText>
                </View>
              ))}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={onClose}
          >
            <ThemedText style={[styles.secondaryText, { color: mutedText }]}>Not Now</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 380,
  },
  close: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  steps: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepNumber: {
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
  },
  primaryButton: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
