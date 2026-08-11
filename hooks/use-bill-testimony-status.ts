import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { getFirestoreDb } from '@/services/firebase';

const COLLECTION = 'billTestimony';

/**
 * Direct write used by the admin panel's bill list, where per-row hook
 * instances aren't practical. Rules restrict writes to admins.
 */
export async function setTestimonyOpen(billId: string | number, isOpen: boolean): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(doc(db, COLLECTION, String(billId)), { isOpen }, { merge: true });
}

interface BillTestimonyStatus {
  isOpen: boolean;
  isLoading: boolean;
  toggleOpen: () => Promise<void>;
}

export function useBillTestimonyStatus(billId: string | number): BillTestimonyStatus {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const docId = String(billId);

  useEffect(() => {
    if (!docId) {
      setIsLoading(false);
      return;
    }

    const db = getFirestoreDb();
    const ref = doc(db, COLLECTION, docId);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          setIsOpen(snapshot.data().isOpen === true);
        } else {
          setIsOpen(false);
        }
        setIsLoading(false);
      },
      () => {
        setIsOpen(false);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [docId]);

  const toggleOpen = useCallback(async () => {
    if (!docId) return;
    const db = getFirestoreDb();
    const ref = doc(db, COLLECTION, docId);
    const next = !isOpen;
    setIsOpen(next); // optimistic
    try {
      await setDoc(ref, { isOpen: next }, { merge: true });
    } catch (error) {
      // Revert the optimistic flip so the Switch reflects the real persisted
      // state instead of silently showing a value that never saved. The
      // onSnapshot listener will also reconcile, but reverting here avoids a
      // flicker window where the toggle lies about being on.
      setIsOpen(!next);
      console.error('Error toggling testimony status:', error);
    }
  }, [docId, isOpen]);

  return { isOpen, isLoading, toggleOpen };
}
