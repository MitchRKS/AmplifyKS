import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

// Screens that are part of the auth/onboarding flow itself — prompting on
// top of these would be circular (login/register) or duplicative (lookup
// already has its own save-prompt modal).
const EXEMPT_PREFIXES = ['/login', '/register', '/lookup'];

/**
 * Signed-out visitors get a sign-in/register prompt on every page: the modal
 * re-arms each time the pathname changes, and dismissing it only clears it
 * for the page currently being viewed.
 */
export function AuthPromptModal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const dismissedPathRef = useRef<string | null>(null);

  const exempt =
    pathname === '/' || EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (isLoading || user || exempt) {
      setVisible(false);
      return;
    }
    if (dismissedPathRef.current !== pathname) {
      // Small delay so the page renders beneath before the prompt appears.
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [pathname, user, isLoading, exempt]);

  if (!visible) return null;

  const dismiss = () => {
    dismissedPathRef.current = pathname;
    setVisible(false);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: '#1c355e' }, Shadows.lg]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={styles.close}
            onPress={dismiss}
            hitSlop={12}
          >
            <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>

          <MaterialIcons name="campaign" size={36} color="rgba(255,255,255,0.85)" />
          <ThemedText style={styles.title}>Sign in to Amplify</ThemedText>
          <ThemedText style={styles.body}>
            Create a free account or sign in to save your electeds, track bills, and submit
            testimony directly to committees.
          </ThemedText>

          <View style={styles.buttons}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              onPress={() => {
                dismiss();
                router.navigate('/(auth)/register');
              }}
            >
              <ThemedText style={styles.primaryText}>Create Account</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              onPress={() => {
                dismiss();
                router.navigate('/(auth)/login');
              }}
            >
              <ThemedText style={styles.secondaryText}>Sign In</ThemedText>
            </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  primary: {
    backgroundColor: '#0097b2',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.8,
  },
});
