import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirestoreDb } from '@/services/firebase';

const COLLECTION = 'billTestimony';

export function useOpenTestimonyBillIds() {
  const [billIds, setBillIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const db = getFirestoreDb();
    const q = query(collection(db, COLLECTION), where('isOpen', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setBillIds(snapshot.docs.map((doc) => doc.id));
        setIsLoading(false);
      },
      () => {
        setBillIds([]);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return { billIds, isLoading };
}
