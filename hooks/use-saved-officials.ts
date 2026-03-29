import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';
import type { Official } from '@/services/openstates';

import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';

const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(obj));

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
      (error) => {
        console.error('savedOfficials listener failed:', error);
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
      await setDoc(docRef, stripUndefined(official as unknown as Record<string, unknown>));
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

  const saveMultipleOfficials = useCallback(
    async (officials: Official[]) => {
      if (!user || officials.length === 0) return;
      const db = getFirestoreDb();
      const batch = writeBatch(db);
      for (const official of officials) {
        const docRef = doc(db, 'users', user.uid, 'savedOfficials', official.id);
        batch.set(docRef, stripUndefined(official as unknown as Record<string, unknown>));
      }
      await batch.commit();
    },
    [user],
  );

  const isSaved = useCallback(
    (officialId: string) => savedOfficials.some((o) => o.id === officialId),
    [savedOfficials],
  );

  return { savedOfficials, isLoaded, saveOfficial, removeOfficial, saveMultipleOfficials, isSaved };
}
