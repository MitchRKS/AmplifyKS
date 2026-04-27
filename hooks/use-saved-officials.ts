import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';
import type { Official } from '@/services/openstates';

import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';

const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(obj));

const toDocId = (id: string) => id.replaceAll('/', '_');

const upsertOfficial = (list: Official[], incoming: Official): Official[] => {
  const next = list.filter((item) => item.id !== incoming.id);
  next.unshift(incoming);
  return next;
};

const mergeOfficials = (list: Official[], incoming: Official[]): Official[] => {
  let next = list;
  for (const official of incoming) {
    next = upsertOfficial(next, official);
  }
  return next;
};

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
      if (!user) {
        throw new Error('Please sign in to save officials.');
      }
      if (!official?.id) {
        throw new Error('Unable to save official: missing official id.');
      }

      setSavedOfficials((prev) => upsertOfficial(prev, official));
      const docRef = doc(getFirestoreDb(), 'users', user.uid, 'savedOfficials', toDocId(official.id));
      try {
        await setDoc(docRef, stripUndefined(official as unknown as Record<string, unknown>));
      } catch (error) {
        console.error('saveOfficial failed:', error);
        throw error;
      }
    },
    [user],
  );

  const removeOfficial = useCallback(
    async (officialId: string) => {
      if (!user) {
        throw new Error('Please sign in to manage saved officials.');
      }
      if (!officialId) {
        throw new Error('Unable to remove official: missing official id.');
      }

      const previous = savedOfficials;
      setSavedOfficials((prev) => prev.filter((official) => official.id !== officialId));
      const docRef = doc(getFirestoreDb(), 'users', user.uid, 'savedOfficials', toDocId(officialId));
      try {
        await deleteDoc(docRef);
      } catch (error) {
        console.error('removeOfficial failed:', error);
        setSavedOfficials(previous);
        throw error;
      }
    },
    [savedOfficials, user],
  );

  const saveMultipleOfficials = useCallback(
    async (officials: Official[]) => {
      if (!user) {
        throw new Error('Please sign in to save officials.');
      }
      if (officials.length === 0) return;

      const validOfficials = officials.filter((official) => official?.id);
      if (validOfficials.length === 0) {
        throw new Error('Unable to save officials: no valid official ids.');
      }

      setSavedOfficials((prev) => mergeOfficials(prev, validOfficials));
      const db = getFirestoreDb();
      const batch = writeBatch(db);
      for (const official of validOfficials) {
        const docRef = doc(db, 'users', user.uid, 'savedOfficials', toDocId(official.id));
        batch.set(docRef, stripUndefined(official as unknown as Record<string, unknown>));
      }
      try {
        await batch.commit();
      } catch (error) {
        console.error('saveMultipleOfficials failed:', error);
        throw error;
      }
    },
    [user],
  );

  const isSaved = useCallback(
    (officialId: string) => savedOfficials.some((o) => o.id === officialId),
    [savedOfficials],
  );

  return { savedOfficials, isLoaded, saveOfficial, removeOfficial, saveMultipleOfficials, isSaved };
}
