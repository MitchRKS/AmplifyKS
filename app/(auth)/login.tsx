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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const inputBackground = useThemeColor({ light: '#F2F2F7', dark: '#1C1C1E' }, 'background');
  const inputBorder = useThemeColor({ light: '#D1D1D6', dark: '#2C2C2E' }, 'background');
  const inputText = useThemeColor({ light: '#000000', dark: '#FFFFFF' }, 'text');
  const placeholder = useThemeColor({ light: '#8E8E93', dark: '#8E8E93' }, 'text');
  const tint = useThemeColor({ light: '#0a7ea4', dark: '#0a7ea4' }, 'tint');
  const mutedText = useThemeColor({ light: '#6C6C70', dark: '#A1A1A6' }, 'text');
  const errorColor = useThemeColor({ light: '#FF3B30', dark: '#FF453A' }, 'text');

  const canSubmit = Boolean(email.trim() && password.trim());

  const handleLogin = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await login({ email, password });
      if (!result.success) {
        Alert.alert('Login Failed', result.error ?? 'Please try again.');
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              Sign in to your AmplifyKS account
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: mutedText }]}>Email</ThemedText>
              <TextInput
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
                placeholder="Enter your password"
                placeholderTextColor={placeholder}
                value={password}
                onChangeText={setPassword}
                textContentType="password"
                autoComplete="password"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: canSubmit && !isSubmitting ? tint : inputBorder }]}
              onPress={handleLogin}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Sign In</ThemedText>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: mutedText }]}>
              Don't have an account?
            </ThemedText>
            <Pressable accessibilityRole="link" onPress={() => router.replace('/(auth)/register')}>
              <ThemedText style={[styles.linkText, { color: tint }]}>Create Account</ThemedText>
            </Pressable>
          </View>
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
