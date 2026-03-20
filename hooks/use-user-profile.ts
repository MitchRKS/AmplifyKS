import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';

export interface UserProfile {
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
}

const defaultProfile: UserProfile = {
  phone: '',
  streetAddress: '',
  city: '',
  state: 'KS',
  zip: '',
};

const PROFILE_COLLECTION = 'users';

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const profileRef = useRef(profile);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  profileRef.current = profile;

  useEffect(() => {
    if (!user) {
      setProfile(defaultProfile);
      setIsLoaded(true);
      return;
    }

    const load = async () => {
      try {
        const db = getFirestoreDb();
        const profileDocRef = doc(db, PROFILE_COLLECTION, user.uid);
        const snapshot = await getDoc(profileDocRef);
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<UserProfile>;
          setProfile({ ...defaultProfile, ...data });
        } else {
          setProfile(defaultProfile);
        }
      } catch {
        setProfile(defaultProfile);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [user?.uid]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) return;

      const next = { ...profileRef.current, ...updates };
      setProfile(next);
      setIsSaving(true);
      try {
        const db = getFirestoreDb();
        const profileDocRef = doc(db, PROFILE_COLLECTION, user.uid);
        await setDoc(profileDocRef, next, { merge: true });
      } finally {
        setIsSaving(false);
      }
    },
    [user],
  );

  return { profile, isLoaded, isSaving, updateProfile };
}
