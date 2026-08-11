import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { AuthForm, type AuthFormHandle } from '@/components/auth-form';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth, type PendingSocialLink } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { linkOptionsFor, providerLabel } from '@/services/auth-linking';

interface LinkAccountModalProps {
  link: PendingSocialLink;
  onClose: () => void;
}

/**
 * Shown when a Google/Apple sign-in hits an account that was registered with
 * a different method. The user signs in once with their existing method and
 * the new provider is linked to the account — from then on either works.
 */
export function LinkAccountModal({ link, onClose }: LinkAccountModalProps) {
  const { completePendingLinkWithPassword, completePendingLinkWithGoogle } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | 'google' | null>(null);

  const formRef = useRef<AuthFormHandle>(null);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const errorColor = useThemeColor({ light: '#DC2626', dark: '#F87171' }, 'text');

  const options = linkOptionsFor(link.attemptedProviderId, link.existingMethods);
  const attemptedLabel = providerLabel(link.attemptedProviderId);
  // Edge case (e.g. Apple-only account hit by a Google attempt): nothing we
  // can re-auth with here — point the user at their existing method instead
  // of showing an empty dead-end modal.
  const existingLabels = link.existingMethods.map(providerLabel).join(' or ');

  // Signed in either way — but if the provider link itself failed, say so
  // rather than letting the modal's silent close imply it worked.
  const finishSignedIn = (linked: boolean | undefined) => {
    onClose();
    if (linked === false) {
      AppAlert.alert(
        'Signed In',
        `You're signed in, but we couldn't connect ${attemptedLabel} to your account. You can try again from the sign-in screen next time.`,
      );
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim() || busy) return;
    setBusy('password');
    setError(null);
    try {
      const result = await completePendingLinkWithPassword(link, password);
      if (result.success) {
        finishSignedIn(result.linked);
      } else {
        setError(result.error ?? 'Sign-in failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy('google');
    setError(null);
    try {
      const result = await completePendingLinkWithGoogle(link);
      if (result.success) {
        finishSignedIn(result.linked);
      } else if (result.error) {
        setError(result.error);
      }
      // Cancelled popup: stay on the modal quietly.
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const canSubmitPassword = Boolean(password.trim()) && !busy;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      // Escape/back must respect the same guard as the disabled Cancel
      // button — dismissing mid-re-auth would silently drop the outcome.
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: surface }, Shadows.lg]}>
          <ThemedText type="subtitle">Link your accounts</ThemedText>
          <ThemedText style={[styles.message, { color: mutedText }]}>
            {options.length > 0
              ? `You already have an Amplify account for ${link.email}. Sign in the way you registered to connect ${attemptedLabel} — after that, you can use either.`
              : `You already have an Amplify account for ${link.email} that signs in with ${existingLabels || 'a different method'}. Close this and use that sign-in method instead.`}
          </ThemedText>

          {options.includes('password') && (
            <AuthForm ref={formRef} onSubmit={handlePasswordSubmit} style={styles.form}>
              {/* Visible but read-only so browser password managers know which
                  saved credential this password field belongs to. */}
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor: inputBorder, color: mutedText },
                ]}
                value={link.email}
                editable={false}
                nativeID="link-email"
                textContentType="username"
                autoComplete="username"
              />
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
                ]}
                placeholder="Your password"
                placeholderTextColor={placeholder}
                value={password}
                onChangeText={setPassword}
                nativeID="link-password"
                textContentType="password"
                autoComplete="current-password"
                secureTextEntry
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => formRef.current?.submit()}
              />
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: canSubmitPassword ? tint : inputBorder },
                  pressed && canSubmitPassword && styles.pressed,
                ]}
                onPress={() => formRef.current?.submit()}
                disabled={!canSubmitPassword}
              >
                {busy === 'password' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    Sign In & Link {attemptedLabel}
                  </ThemedText>
                )}
              </Pressable>
            </AuthForm>
          )}

          {options.includes('google') && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={({ pressed }) => [
                styles.googleButton,
                { borderColor: inputBorder },
                pressed && styles.pressed,
              ]}
              onPress={handleGoogle}
              disabled={busy !== null}
            >
              {busy === 'google' ? (
                <ActivityIndicator size="small" color={mutedText} />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={18} color={inputText} />
                  <ThemedText style={[styles.googleButtonText, { color: inputText }]}>
                    Continue with Google
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}

          {error ? (
            <ThemedText style={[styles.errorText, { color: errorColor }]}>{error}</ThemedText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            onPress={onClose}
            disabled={busy !== null}
          >
            <ThemedText style={[styles.cancelText, { color: mutedText }]}>Cancel</ThemedText>
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
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    width: '100%',
    maxWidth: 400,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginTop: Spacing.md,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: Spacing.sm,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
