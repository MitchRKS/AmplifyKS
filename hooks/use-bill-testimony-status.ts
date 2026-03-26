import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { getFirestoreDb } from '@/services/firebase';

const COLLECTION = 'billTestimony';

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
    setIsOpen(next);
    await setDoc(ref, { isOpen: next }, { merge: true });
  }, [docId, isOpen]);

  return { isOpen, isLoading, toggleOpen };
}
