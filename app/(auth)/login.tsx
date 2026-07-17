import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ContentContainer } from '@/components/content-container';
import { SocialAuthButtons } from '@/components/social-auth-buttons';
import { passkeysSupported, signInWithPasskey } from '@/services/passkeys';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function LoginScreen() {
  const router = useRouter();
  const { login, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const brandBg = useThemeColor({ light: '#1c355e', dark: '#1c355e' }, 'tint');

  const canSubmit = Boolean(email.trim() && password.trim());

  const handleLogin = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await login({ email, password });
      if (!result.success) {
        AppAlert.alert('Login Failed', result.error ?? 'Please try again.');
      }
    } catch {
      AppAlert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeySignIn = async () => {
    if (isPasskeySubmitting) return;
    setIsPasskeySubmitting(true);
    try {
      // On success the auth-state listener redirects away from this screen.
      await signInWithPasskey();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Passkey sign-in failed. Please try again.';
      AppAlert.alert('Passkey Sign-in Failed', message);
    } finally {
      setIsPasskeySubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (isResettingPassword) return;

    if (!email.trim()) {
      AppAlert.alert(
        'Enter Your Email',
        'Type your email address in the field above, then tap "Forgot password?" again.',
      );
      return;
    }

    setIsResettingPassword(true);
    try {
      const result = await resetPassword(email);
      if (result.success) {
        AppAlert.alert(
          'Check Your Email',
          `If an account exists for ${email.trim()}, we've sent instructions to reset your password.`,
        );
      } else {
        AppAlert.alert('Error', result.error ?? 'Please try again.');
      }
    } catch {
      AppAlert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ContentContainer style={styles.content}>
            <View style={[styles.brandSection, { backgroundColor: brandBg }]}>
              <View style={styles.logoCircle}>
                <MaterialIcons name="campaign" size={36} color={brandBg} />
              </View>
              <ThemedText style={styles.brandName}>Amplify</ThemedText>
              <ThemedText style={styles.brandTagline}>
                Your voice in the Kansas Legislature
              </ThemedText>
            </View>

            <View style={[styles.formCard, { backgroundColor: surface, borderColor: border }, Shadows.md]}>
              <ThemedText type="subtitle" style={styles.formTitle}>Welcome back</ThemedText>
              <ThemedText style={[styles.formSubtitle, { color: mutedText }]}>
                Sign in to your account
              </ThemedText>

              <View style={styles.form}>
                <View style={styles.field}>
                  <ThemedText style={[styles.label, { color: mutedText }]}>Email</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                    placeholder="jane@example.org"
                    placeholderTextColor={placeholder}
                    value={email}
                    onChangeText={setEmail}
                    textContentType="username"
                    autoComplete="email"
                    keyboardType="email-address"
                    inputMode="email"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText style={[styles.label, { color: mutedText }]}>Password</ThemedText>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                    placeholder="Enter your password"
                    placeholderTextColor={placeholder}
                    value={password}
                    onChangeText={setPassword}
                    textContentType="password"
                    autoComplete="current-password"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={styles.forgotPasswordLink}
                  onPress={handleForgotPassword}
                  disabled={isResettingPassword}
                >
                  <ThemedText style={[styles.forgotPasswordText, { color: tint }]}>
                    {isResettingPassword ? 'Sending…' : 'Forgot password?'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: canSubmit && !isSubmitting ? tint : inputBorder },
                    pressed && canSubmit && styles.buttonPressed,
                  ]}
                  onPress={handleLogin}
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Sign In</ThemedText>
                  )}
                </Pressable>

                <SocialAuthButtons />

                {passkeysSupported() && (
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.passkeyButton,
                      { borderColor: border },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handlePasskeySignIn}
                    disabled={isPasskeySubmitting}
                  >
                    {isPasskeySubmitting ? (
                      <ActivityIndicator size="small" color={mutedText} />
                    ) : (
                      <>
                        <MaterialIcons name="fingerprint" size={20} color={tint} />
                        <ThemedText style={[styles.passkeyButtonText, { color: tint }]}>
                          Sign in with a passkey
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.footer}>
              <ThemedText style={[styles.footerText, { color: mutedText }]}>
                Don&apos;t have an account?
              </ThemedText>
              <Pressable accessibilityRole="link" onPress={() => router.replace('/(auth)/register')}>
                <ThemedText style={[styles.linkText, { color: tint }]}>Create Account</ThemedText>
              </Pressable>
            </View>
          </ContentContainer>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  brandSection: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    borderRadius: Radius.xl,
    marginBottom: Spacing['2xl'],
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
  },
  formTitle: {
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing['2xl'],
  },
  form: {
    gap: Spacing.lg,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  button: {
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  passkeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginTop: Spacing.md,
  },
  passkeyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing['2xl'],
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
