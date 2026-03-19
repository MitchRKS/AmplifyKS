import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { auth } from '@/services/firebase';

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toAuthUser(firebaseUser) : null);
      setIsLoading(false);
    });
    return unsubscribe;
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
          auth,
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
        await signInWithEmailAndPassword(auth, params.email.trim(), params.password);
        return { success: true };
      } catch (error: any) {
        console.error('Firebase login error:', error.code, error.message);
        return {
          success: false,
          error: `${firebaseErrorMessage(error.code)} (${error.code ?? 'unknown'})`,
        };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, register, login, logout }),
    [user, isLoading, register, login, logout],
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
