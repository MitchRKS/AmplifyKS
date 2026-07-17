import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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

import { getAuth } from '@/services/firebase';

interface AuthUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  register: (params: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  login: (params: {
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithApple: () => Promise<{ success: boolean; error?: string }>;
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
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
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
    async (provider: GoogleAuthProvider | OAuthProvider) => {
      if (Platform.OS !== 'web') {
        return {
          success: false,
          error: 'Social sign-in is not available in this app build yet. Please use email and password.',
        };
      }
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
          return {
            success: false,
            error:
              'An account already exists with this email using a different sign-in method. Sign in the way you originally registered.',
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
    () => ({ user, isLoading, register, login, resetPassword, loginWithGoogle, loginWithApple, logout }),
    [user, isLoading, register, login, resetPassword, loginWithGoogle, loginWithApple, logout],
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
