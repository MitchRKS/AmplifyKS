import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';
import type { Official } from '@/services/openstates';

import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';

export function useSavedOfficials() {
  const { user } = useAuth();
  const [savedOfficials, setSavedOfficials] = useState<Official[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setSavedOfficials([]);
      setIsLoaded(true);
      return;
    }

    const col = collection(getFirestoreDb(), 'users', user.uid, 'savedOfficials');
    const unsubscribe = onSnapshot(
      col,
      (snapshot) => {
        const officials = snapshot.docs.map((d) => d.data() as Official);
        setSavedOfficials(officials);
        setIsLoaded(true);
      },
      () => {
        setSavedOfficials([]);
        setIsLoaded(true);
      },
    );

    return unsubscribe;
  }, [user]);

  const saveOfficial = useCallback(
    async (official: Official) => {
      if (!user) return;
      const docRef = doc(getFirestoreDb(), 'users', user.uid, 'savedOfficials', official.id);
      await setDoc(docRef, official);
    },
    [user],
  );

  const removeOfficial = useCallback(
    async (officialId: string) => {
      if (!user) return;
      const docRef = doc(getFirestoreDb(), 'users', user.uid, 'savedOfficials', officialId);
      await deleteDoc(docRef);
    },
    [user],
  );

  const isSaved = useCallback(
    (officialId: string) => savedOfficials.some((o) => o.id === officialId),
    [savedOfficials],
  );

  return { savedOfficials, isLoaded, saveOfficial, removeOfficial, isSaved };
}
