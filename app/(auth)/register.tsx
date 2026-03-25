import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const brandBg = useThemeColor({ light: '#1c355e', dark: '#1c355e' }, 'tint');

  const canSubmit = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim(),
  );

  const handleRegister = async () => {
    if (!canSubmit || isSubmitting) return;

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure your passwords match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({ email, firstName, lastName, password });
      if (!result.success) {
        Alert.alert('Registration Failed', result.error ?? 'Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
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
                <MaterialIcons name="campaign" size={32} color={brandBg} />
              </View>
              <ThemedText style={styles.brandName}>AmplifyKS</ThemedText>
              <ThemedText style={styles.brandTagline}>
                Track bills & submit testimony
              </ThemedText>
            </View>

            <View style={[styles.formCard, { backgroundColor: surface, borderColor: border }, Shadows.md]}>
              <ThemedText type="subtitle" style={styles.formTitle}>Create your account</ThemedText>
              <ThemedText style={[styles.formSubtitle, { color: mutedText }]}>
                Join AmplifyKS to make your voice heard
              </ThemedText>

              <View style={styles.form}>
                <View style={styles.row}>
                  <View style={[styles.field, styles.halfField]}>
                    <ThemedText style={[styles.label, { color: mutedText }]}>First Name</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                      placeholder="Jane"
                      placeholderTextColor={placeholder}
                      value={firstName}
                      onChangeText={setFirstName}
                      textContentType="givenName"
                      autoComplete="name-given"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                    />
                  </View>

                  <View style={[styles.field, styles.halfField]}>
                    <ThemedText style={[styles.label, { color: mutedText }]}>Last Name</ThemedText>
                    <TextInput
                      ref={lastNameRef}
                      style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                      placeholder="Doe"
                      placeholderTextColor={placeholder}
                      value={lastName}
                      onChangeText={setLastName}
                      textContentType="familyName"
                      autoComplete="name-family"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <ThemedText style={[styles.label, { color: mutedText }]}>Email</ThemedText>
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                    placeholder="jane@example.org"
                    placeholderTextColor={placeholder}
                    value={email}
                    onChangeText={setEmail}
                    textContentType="emailAddress"
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
                    placeholder="At least 6 characters"
                    placeholderTextColor={placeholder}
                    value={password}
                    onChangeText={setPassword}
                    textContentType="newPassword"
                    autoComplete="new-password"
                    secureTextEntry
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText style={[styles.label, { color: mutedText }]}>Confirm Password</ThemedText>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={placeholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    textContentType="newPassword"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: canSubmit && !isSubmitting ? tint : inputBorder },
                    pressed && canSubmit && styles.buttonPressed,
                  ]}
                  onPress={handleRegister}
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Create Account</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.footer}>
              <ThemedText style={[styles.footerText, { color: mutedText }]}>
                Already have an account?
              </ThemedText>
              <Pressable accessibilityRole="link" onPress={() => router.replace('/(auth)/login')}>
                <ThemedText style={[styles.linkText, { color: tint }]}>Sign In</ThemedText>
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
    paddingVertical: Spacing['3xl'],
    borderRadius: Radius.xl,
    marginBottom: Spacing['2xl'],
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 14,
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.sm,
  },
  halfField: {
    flex: 1,
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
