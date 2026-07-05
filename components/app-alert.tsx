import { useEffect, useState } from 'react';
import { Alert as NativeAlert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

// react-native-web's Alert.alert() is a no-op stub, so on web every error and
// confirmation dialog in the app silently did nothing. This is a minimal
// drop-in replacement with the same call shape as RN's Alert.alert. Native
// platforms delegate straight to the real Alert for the familiar OS dialog;
// web renders a themed Modal via AppAlertHost, mounted once at the root.
let currentAlert: AlertState | null = null;
let listeners: ((state: AlertState | null) => void)[] = [];

function setAlertState(state: AlertState | null) {
  currentAlert = state;
  listeners.forEach((listener) => listener(state));
}

function useAlertState(): AlertState | null {
  const [state, setState] = useState<AlertState | null>(currentAlert);
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((listener) => listener !== setState);
    };
  }, []);
  return state;
}

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[]): void {
    if (Platform.OS !== 'web') {
      NativeAlert.alert(title, message, buttons);
      return;
    }
    setAlertState({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    });
  },
};

export function AppAlertHost() {
  const alert = useAlertState();
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'surface');
  const text = useThemeColor({}, 'text');
  const mutedText = useThemeColor({}, 'secondaryText');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({}, 'error');

  if (!alert) return null;

  const dismiss = () => setAlertState(null);

  const buttonTextColor = (buttonStyle: AppAlertButton['style']) => {
    if (buttonStyle === 'destructive') return errorColor;
    if (buttonStyle === 'cancel') return mutedText;
    return tint;
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: surface }, Shadows.lg]}>
          <ThemedText type="subtitle" style={{ color: text }}>
            {alert.title}
          </ThemedText>
          {alert.message ? (
            <ThemedText style={[styles.message, { color: mutedText }]}>{alert.message}</ThemedText>
          ) : null}
          <View style={[styles.buttonList, { borderTopColor: border }]}>
            {alert.buttons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  index > 0 && { borderTopWidth: 1, borderTopColor: border },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  dismiss();
                  button.onPress?.();
                }}
              >
                <ThemedText style={[styles.buttonText, { color: buttonTextColor(button.style) }]}>
                  {button.text}
                </ThemedText>
              </Pressable>
            ))}
          </View>
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
    borderRadius: Radius.xl,
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  buttonList: {
    marginTop: Spacing.lg,
    marginHorizontal: -Spacing['2xl'],
    borderTopWidth: 1,
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
