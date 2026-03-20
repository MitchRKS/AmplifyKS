import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth as getFirebaseAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

function getAuth(): Auth {
  if (authInstance) return authInstance;

  if (typeof window === 'undefined') {
    throw new Error(
      'Firebase Auth can only be used in the browser. Ensure EXPO_PUBLIC_FIREBASE_* env vars are set in your deploy environment (e.g. Netlify).',
    );
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  authInstance =
    Platform.OS === 'web'
      ? getFirebaseAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });

  return authInstance;
}

function getFirestoreDb(): Firestore {
  if (!firestoreInstance) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}

export { getAuth, getFirestoreDb };
