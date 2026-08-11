import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';
import type { Official } from '@/services/openstates';

import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';

/**
 * How an official ended up saved:
 * - 'address': derived from the user's address (lookup "Save All" / profile
 *   address save) — these are the user's actual representatives, shown under
 *   "My Electeds".
 * - 'manual': individually bookmarked somewhere in the app — shown under
 *   "Saved Electeds".
 * Docs written before this distinction existed have no source field; they
 * came from the address flow (the only bulk writer), so missing = 'address'.
 */
export type SavedOfficialSource = 'address' | 'manual';
export type SavedOfficial = Official & { source?: SavedOfficialSource };

const isManual = (official: SavedOfficial) => official.source === 'manual';

const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(obj));

const toDocId = (id: string) => id.replaceAll('/', '_');

const upsertOfficial = (list: SavedOfficial[], incoming: SavedOfficial): SavedOfficial[] => {
  const next = list.filter((item) => item.id !== incoming.id);
  next.unshift(incoming);
  return next;
};

const mergeOfficials = (list: SavedOfficial[], incoming: SavedOfficial[]): SavedOfficial[] => {
  let next = list;
  for (const official of incoming) {
    next = upsertOfficial(next, official);
  }
  return next;
};

export function useSavedOfficials() {
  const { user } = useAuth();
  const [savedOfficials, setSavedOfficials] = useState<SavedOfficial[]>([]);
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
        const officials = snapshot.docs.map((d) => d.data() as SavedOfficial);
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

      // An individual bookmark save. Re-saving an official that's already an
      // address-derived elected must not demote it out of My Electeds.
      const existing = savedOfficials.find((item) => item.id === official.id);
      const record: SavedOfficial = {
        ...official,
        source: existing ? existing.source ?? 'address' : 'manual',
      };

      setSavedOfficials((prev) => upsertOfficial(prev, record));
      const docRef = doc(getFirestoreDb(), 'users', user.uid, 'savedOfficials', toDocId(official.id));
      try {
        await setDoc(docRef, stripUndefined(record as unknown as Record<string, unknown>));
      } catch (error) {
        console.error('saveOfficial failed:', error);
        throw error;
      }
    },
    [savedOfficials, user],
  );

  // Only manually bookmarked officials can be removed one-by-one. My Electeds
  // (address-derived) change solely through a new address search, so a stale
  // or mistaken entry can't punch a hole in the user's representation set.
  const removeOfficial = useCallback(
    async (officialId: string) => {
      if (!user) {
        throw new Error('Please sign in to manage saved officials.');
      }
      if (!officialId) {
        throw new Error('Unable to remove official: missing official id.');
      }
      const existing = savedOfficials.find((official) => official.id === officialId);
      if (existing && !isManual(existing)) {
        throw new Error(
          'This official is part of your My Electeds, which are set from your address. Save a new address to change them.',
        );
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

      // Bulk bookmark save — same demotion guard as saveOfficial.
      const records: SavedOfficial[] = validOfficials.map((official) => {
        const existing = savedOfficials.find((item) => item.id === official.id);
        return { ...official, source: existing ? existing.source ?? 'address' : 'manual' };
      });

      setSavedOfficials((prev) => mergeOfficials(prev, records));
      const db = getFirestoreDb();
      const batch = writeBatch(db);
      for (const official of records) {
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
    [savedOfficials, user],
  );

  // Replace the address-derived "My Electeds" set with a new one (used when a
  // new address search re-derives the user's electeds). This is the only
  // sanctioned way to remove electeds — individual removal is intentionally
  // not exposed in the UI. Manually bookmarked officials ("Saved Electeds")
  // are left untouched, except that a bookmark matching a new elected is
  // promoted into My Electeds.
  const replaceOfficials = useCallback(
    async (officials: Official[]) => {
      if (!user) {
        throw new Error('Please sign in to save officials.');
      }
      const validOfficials = officials.filter((official) => official?.id);
      if (validOfficials.length === 0) {
        throw new Error('Unable to save officials: no valid official ids.');
      }

      const records: SavedOfficial[] = validOfficials.map((official) => ({
        ...official,
        source: 'address',
      }));

      const previous = savedOfficials;
      const db = getFirestoreDb();
      const batch = writeBatch(db);

      const nextIds = new Set(records.map((official) => toDocId(official.id)));
      const keptManual = previous.filter(
        (existing) => isManual(existing) && !nextIds.has(toDocId(existing.id)),
      );
      for (const existing of previous) {
        // Only stale address-derived electeds are removed; bookmarks stay.
        if (!isManual(existing) && !nextIds.has(toDocId(existing.id))) {
          batch.delete(doc(db, 'users', user.uid, 'savedOfficials', toDocId(existing.id)));
        }
      }
      for (const official of records) {
        const docRef = doc(db, 'users', user.uid, 'savedOfficials', toDocId(official.id));
        batch.set(docRef, stripUndefined(official as unknown as Record<string, unknown>));
      }

      setSavedOfficials([...records, ...keptManual]);
      try {
        await batch.commit();
      } catch (error) {
        console.error('replaceOfficials failed:', error);
        setSavedOfficials(previous);
        throw error;
      }
    },
    [savedOfficials, user],
  );

  const isSaved = useCallback(
    (officialId: string) => savedOfficials.some((o) => o.id === officialId),
    [savedOfficials],
  );

  /** True when the official is in the address-derived My Electeds bucket. */
  const isMyElected = useCallback(
    (officialId: string) =>
      savedOfficials.some((o) => o.id === officialId && !isManual(o)),
    [savedOfficials],
  );

  // Address-derived representatives vs individually bookmarked officials.
  const myElecteds = useMemo(
    () => savedOfficials.filter((official) => !isManual(official)),
    [savedOfficials],
  );
  const savedElecteds = useMemo(
    () => savedOfficials.filter((official) => isManual(official)),
    [savedOfficials],
  );

  return {
    savedOfficials,
    myElecteds,
    savedElecteds,
    isLoaded,
    saveOfficial,
    removeOfficial,
    saveMultipleOfficials,
    replaceOfficials,
    isSaved,
    isMyElected,
  };
}
