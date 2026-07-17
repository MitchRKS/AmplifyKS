import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * "Continue with Google / Apple" buttons shared by the login and register
 * screens. With OAuth providers, registering and signing in are the same
 * flow — Firebase creates the account on first provider sign-in.
 */
export function SocialAuthButtons() {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [pendingProvider, setPendingProvider] = useState<'google' | 'apple' | null>(null);

  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const buttonText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');

  const handle = async (provider: 'google' | 'apple') => {
    if (pendingProvider) return;
    setPendingProvider(provider);
    try {
      const action = provider === 'google' ? loginWithGoogle : loginWithApple;
      const result = await action();
      // Cancelled popups return success:false with no error — stay quiet.
      if (!result.success && result.error) {
        AppAlert.alert('Sign-in Failed', result.error);
      }
    } catch {
      AppAlert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: border }]} />
        <ThemedText type="caption" style={{ color: mutedText }}>
          or continue with
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: border }]} />
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          style={({ pressed }) => [
            styles.button,
            { borderColor: border },
            pressed && styles.pressed,
          ]}
          onPress={() => handle('google')}
          disabled={pendingProvider !== null}
        >
          {pendingProvider === 'google' ? (
            <ActivityIndicator size="small" color={mutedText} />
          ) : (
            <>
              <MaterialCommunityIcons name="google" size={18} color={buttonText} />
              <ThemedText style={[styles.buttonLabel, { color: buttonText }]}>Google</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          style={({ pressed }) => [
            styles.button,
            { borderColor: border },
            pressed && styles.pressed,
          ]}
          onPress={() => handle('apple')}
          disabled={pendingProvider !== null}
        >
          {pendingProvider === 'apple' ? (
            <ActivityIndicator size="small" color={mutedText} />
          ) : (
            <>
              <MaterialCommunityIcons name="apple" size={20} color={buttonText} />
              <ThemedText style={[styles.buttonLabel, { color: buttonText }]}>Apple</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
