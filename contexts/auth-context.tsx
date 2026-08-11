import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  linkWithCredential,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type AuthCredential,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Platform } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { router } from 'expo-router';

import { GOOGLE_PROVIDER_ID } from '@/services/auth-linking';
import { getAuth } from '@/services/firebase';

interface AuthUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * A social sign-in that hit an existing account registered a different way.
 * Holds everything needed to sign in with the existing method and then link
 * the new provider so both work from then on.
 */
export interface PendingSocialLink {
  email: string;
  /** OAuth credential from the attempted sign-in, linked after re-auth. */
  credential: AuthCredential;
  /** Provider the user just tried ('google.com' | 'apple.com'). */
  attemptedProviderId: string;
  /**
   * Sign-in methods that already exist for this email. Empty when the
   * backend hides them (email-enumeration protection) — the account still
   * exists, we just can't see how it signs in.
   */
  existingMethods: string[];
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface SocialAuthResult extends AuthResult {
  /** Set when the account exists with a different method and needs linking. */
  pendingLink?: PendingSocialLink;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  register: (params: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) => Promise<AuthResult>;
  login: (params: {
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<SocialAuthResult>;
  loginWithApple: () => Promise<SocialAuthResult>;
  /** Sign in with the account's password, then link the pending provider. */
  completePendingLinkWithPassword: (
    link: PendingSocialLink,
    password: string,
  ) => Promise<AuthResult>;
  /** Sign in with Google, then link the pending provider (Apple). */
  completePendingLinkWithGoogle: (link: PendingSocialLink) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toAuthUser = (firebaseUser: FirebaseUser): AuthUser => {
  const displayName = firebaseUser.displayName ?? '';
  const parts = displayName.split(' ');
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') ?? '',
  };
};

const firebaseErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      // Deliberately doesn't reveal whether the email has an account
      // (same enumeration-safety stance as resetPassword).
      return 'That email and password combination didn\'t work. Double-check both, or tap "Forgot password?" to reset it. If you signed up with Google or Apple, use those buttons instead.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser ? toAuthUser(firebaseUser) : null);
        setIsLoading(false);
      });
      return unsubscribe;
    } catch {
      setIsLoading(false);
      return () => {};
    }
  }, []);

  const register = useCallback(
    async (params: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
    }) => {
      const { email, firstName, lastName, password } = params;
      try {
        const credential = await createUserWithEmailAndPassword(
          getAuth(),
          email.trim(),
          password,
        );
        await updateProfile(credential.user, {
          displayName: `${firstName.trim()} ${lastName.trim()}`,
        });
        setUser(toAuthUser(credential.user));
        return { success: true };
      } catch (error: any) {
        return { success: false, error: firebaseErrorMessage(error.code) };
      }
    },
    [],
  );

  const login = useCallback(
    async (params: { email: string; password: string }) => {
      try {
        await signInWithEmailAndPassword(getAuth(), params.email.trim(), params.password);
        return { success: true };
      } catch (error: any) {
        console.error('Firebase login error:', error.code, error.message);
        return { success: false, error: firebaseErrorMessage(error.code) };
      }
    },
    [],
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
      return { success: true };
    } catch (error: any) {
      // Don't reveal whether the email is registered — treat "not found" as
      // success so this can't be used to enumerate accounts.
      if (error.code === 'auth/user-not-found') {
        return { success: true };
      }
      console.error('Firebase password reset error:', error.code, error.message);
      return { success: false, error: firebaseErrorMessage(error.code) };
    }
  }, []);

  // Social sign-in. Registration and login are the same flow — Firebase
  // creates the account on first sign-in with the provider.
  // Web uses popup OAuth; the native builds need expo-auth-session /
  // expo-apple-authentication wiring before these can work there.
  // NOTE: each provider must also be enabled in the Firebase console
  // (Authentication → Sign-in method) before this succeeds in production.
  const loginWithProvider = useCallback(
    async (provider: GoogleAuthProvider | OAuthProvider): Promise<SocialAuthResult> => {
      if (Platform.OS !== 'web') {
        return {
          success: false,
          error: 'Social sign-in is not available in this app build yet. Please use email and password.',
        };
      }
      const attemptedProviderId =
        provider instanceof GoogleAuthProvider ? GOOGLE_PROVIDER_ID : provider.providerId;
      try {
        await signInWithPopup(getAuth(), provider);
        return { success: true };
      } catch (error: any) {
        // The user closing the popup isn't an error worth alerting about.
        if (
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request'
        ) {
          return { success: false };
        }
        if (error.code === 'auth/account-exists-with-different-credential') {
          // The email already has an account under another sign-in method.
          // Rather than turning the user away, capture the OAuth credential
          // from the failed attempt so the UI can re-authenticate them with
          // their existing method and link this provider to the account.
          const email: string | undefined = error.customData?.email;
          const credential =
            provider instanceof GoogleAuthProvider
              ? GoogleAuthProvider.credentialFromError(error)
              : OAuthProvider.credentialFromError(error);
          if (!email || !credential) {
            return {
              success: false,
              error:
                'An account already exists with this email using a different sign-in method. Sign in the way you originally registered.',
            };
          }
          // May legitimately come back empty (email-enumeration protection);
          // the linking UI then offers every plausible method.
          let existingMethods: string[] = [];
          try {
            existingMethods = await fetchSignInMethodsForEmail(getAuth(), email);
          } catch {
            // Treat lookup failures the same as "unknown".
          }
          return {
            success: false,
            // Fallback copy for callers that don't (yet) render the linking
            // modal — UIs that do should prefer pendingLink over this error.
            error:
              'An account already exists with this email using a different sign-in method. Sign in the way you originally registered.',
            pendingLink: { email, credential, attemptedProviderId, existingMethods },
          };
        }
        if (error.code === 'auth/operation-not-allowed') {
          return {
            success: false,
            error: 'This sign-in method is not enabled yet. Please use email and password.',
          };
        }
        console.error('Social sign-in error:', error.code, error.message);
        return { success: false, error: firebaseErrorMessage(error.code) };
      }
    },
    [],
  );

  // After a pendingLink re-auth succeeds the user is signed in either way —
  // linking the new provider is best-effort on top of that. A link failure
  // (e.g. the credential is somehow attached to another account) shouldn't
  // undo or hide a successful sign-in.
  const linkCredentialBestEffort = useCallback(
    async (firebaseUser: FirebaseUser, credential: AuthCredential) => {
      try {
        await linkWithCredential(firebaseUser, credential);
      } catch (error: any) {
        console.error('Provider link failed after sign-in:', error.code, error.message);
      }
    },
    [],
  );

  const completePendingLinkWithPassword = useCallback(
    async (link: PendingSocialLink, password: string): Promise<AuthResult> => {
      try {
        const result = await signInWithEmailAndPassword(getAuth(), link.email, password);
        await linkCredentialBestEffort(result.user, link.credential);
        return { success: true };
      } catch (error: any) {
        // The generic sign-in message points at UI ("Forgot password?",
        // social buttons) that doesn't exist inside the linking modal —
        // give directions that make sense from here instead.
        if (
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-credential'
        ) {
          return {
            success: false,
            error:
              'That password didn\'t work. Try again, or cancel and use "Forgot password?" on the sign-in screen.',
          };
        }
        return { success: false, error: firebaseErrorMessage(error.code) };
      }
    },
    [linkCredentialBestEffort],
  );

  const completePendingLinkWithGoogle = useCallback(
    async (link: PendingSocialLink): Promise<AuthResult> => {
      const provider = new GoogleAuthProvider();
      // Steer the account chooser to the email that owns the account.
      provider.setCustomParameters({ login_hint: link.email });
      try {
        const result = await signInWithPopup(getAuth(), provider);
        // Only link if Google signed in the same email; otherwise the user
        // picked a different Google account and is now signed into that one —
        // attaching this credential to it would tangle two identities.
        if (result.user.email?.toLowerCase() === link.email.toLowerCase()) {
          await linkCredentialBestEffort(result.user, link.credential);
        }
        return { success: true };
      } catch (error: any) {
        if (
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request'
        ) {
          return { success: false };
        }
        console.error('Google re-auth for linking failed:', error.code, error.message);
        return { success: false, error: firebaseErrorMessage(error.code) };
      }
    },
    [linkCredentialBestEffort],
  );

  const loginWithGoogle = useCallback(
    () => loginWithProvider(new GoogleAuthProvider()),
    [loginWithProvider],
  );

  const loginWithApple = useCallback(() => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  const logout = useCallback(async () => {
    await signOut(getAuth());
    // Send the user to the sign-in page after signing out (rather than
    // leaving them on an authenticated screen or the anon lookup landing).
    router.replace('/(auth)/login');
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      register,
      login,
      resetPassword,
      loginWithGoogle,
      loginWithApple,
      completePendingLinkWithPassword,
      completePendingLinkWithGoogle,
      logout,
    }),
    [
      user,
      isLoading,
      register,
      login,
      resetPassword,
      loginWithGoogle,
      loginWithApple,
      completePendingLinkWithPassword,
      completePendingLinkWithGoogle,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
