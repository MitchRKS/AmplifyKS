import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getFirestoreDb } from '@/services/firebase';

const COLLECTION = 'billTestimony';

/**
 * The organization's stance on a bill, set by admins — users no longer pick
 * their own. Values reuse the testimony form's Position vocabulary; admin UI
 * labels them Favorable / Neutral / Opposition.
 */
export type TestimonyDisposition = 'support' | 'neutral' | 'oppose';

const isDisposition = (value: unknown): value is TestimonyDisposition =>
  value === 'support' || value === 'neutral' || value === 'oppose';

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
  /** Admin-set stance for testimony on this bill; null until set. */
  disposition: TestimonyDisposition | null;
  isLoading: boolean;
  toggleOpen: () => Promise<void>;
  /** Admin-only (rules-enforced): set the organization's stance. */
  setDisposition: (disposition: TestimonyDisposition) => Promise<void>;
}

export function useBillTestimonyStatus(billId: string | number): BillTestimonyStatus {
  const [isOpen, setIsOpen] = useState(false);
  const [disposition, setDispositionState] = useState<TestimonyDisposition | null>(null);
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
          const data = snapshot.data();
          setIsOpen(data.isOpen === true);
          setDispositionState(isDisposition(data.disposition) ? data.disposition : null);
        } else {
          setIsOpen(false);
          setDispositionState(null);
        }
        setIsLoading(false);
      },
      () => {
        setIsOpen(false);
        setDispositionState(null);
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

  const dispositionWriteSeq = useRef(0);
  const setDisposition = useCallback(
    async (next: TestimonyDisposition) => {
      if (!docId) return;
      const seq = ++dispositionWriteSeq.current;
      const previous = disposition;
      setDispositionState(next); // optimistic, reconciled by the listener
      try {
        await setDoc(doc(getFirestoreDb(), COLLECTION, docId), { disposition: next }, { merge: true });
      } catch (error) {
        // Only revert if no newer tap superseded this write — otherwise the
        // revert would clobber the newer optimistic value with a stale one.
        if (dispositionWriteSeq.current === seq) {
          setDispositionState(previous);
        }
        console.error('Error setting testimony disposition:', error);
      }
    },
    [docId, disposition],
  );

  return { isOpen, disposition, isLoading, toggleOpen, setDisposition };
}
