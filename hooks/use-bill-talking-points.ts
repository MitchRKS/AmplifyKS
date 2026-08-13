import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';

/**
 * Talking points admins publish per bill to guide testimony writers, stored
 * at billTalkingPoints/{billId}/points/{pointId}. Doc shape matches the iOS
 * BillTalkingPointsManager exactly ({ id, billId: number, title, content,
 * order, createdAt, updatedAt }) so both platforms share the data. Rules:
 * authed read, admin write.
 */
export interface TalkingPoint {
  id: string;
  billId: number;
  title: string;
  content: string;
  order: number;
}

export function useBillTalkingPoints(billId: number) {
  const { user } = useAuth();
  const [points, setPoints] = useState<TalkingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ALL doc ids in snapshot-order — including docs the display list filters
  // out (blank title+content). iOS counts every doc when assigning the next
  // order, so ordering math must too, or the platforms collide.
  const allDocsRef = useRef<{ id: string; order: number }[]>([]);

  const uid = user?.uid;

  useEffect(() => {
    // Rules require auth to read — don't subscribe (and log errors) anon.
    if (!uid || !billId) {
      setPoints([]);
      allDocsRef.current = [];
      setIsLoading(false);
      return;
    }

    // Re-arm the loading state on every resubscribe (auth restore, bill
    // change) so stale points never render under a new context.
    setIsLoading(true);
    setPoints([]);
    allDocsRef.current = [];

    const db = getFirestoreDb();
    const col = collection(db, 'billTalkingPoints', String(billId), 'points');
    const unsubscribe = onSnapshot(
      col,
      (snapshot) => {
        const all = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            billId: typeof data.billId === 'number' ? data.billId : billId,
            title: String(data.title ?? ''),
            content: String(data.content ?? ''),
            order: typeof data.order === 'number' ? data.order : 0,
          };
        });
        allDocsRef.current = all.map(({ id, order }) => ({ id, order }));
        setPoints(all.filter((p) => p.title || p.content).sort((a, b) => a.order - b.order));
        setIsLoading(false);
      },
      (error) => {
        console.error('Talking points listener failed:', error);
        setPoints([]);
        allDocsRef.current = [];
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [uid, billId]);

  const addPoint = useCallback(
    async (title: string, content: string) => {
      const db = getFirestoreDb();
      const ref = doc(collection(db, 'billTalkingPoints', String(billId), 'points'));
      const maxOrder = allDocsRef.current.reduce((max, p) => Math.max(max, p.order), -1);
      const now = Timestamp.now();
      await setDoc(ref, {
        id: ref.id,
        billId,
        title: title.trim(),
        content: content.trim(),
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      });
    },
    [billId],
  );

  const updatePoint = useCallback(
    async (pointId: string, title: string, content: string) => {
      const db = getFirestoreDb();
      // updateDoc (not merge-set): if the point was deleted concurrently the
      // write fails NOT_FOUND instead of resurrecting a partial doc that the
      // iOS Codable decode would silently drop.
      await updateDoc(doc(db, 'billTalkingPoints', String(billId), 'points', pointId), {
        title: title.trim(),
        content: content.trim(),
        updatedAt: Timestamp.now(),
      });
    },
    [billId],
  );

  const removePoint = useCallback(
    async (pointId: string) => {
      const db = getFirestoreDb();
      // Delete AND renumber the survivors to keep orders compact 0..n-1 —
      // iOS's add assigns order = count and depends on this invariant (its
      // own delete renumbers the same way).
      const batch = writeBatch(db);
      batch.delete(doc(db, 'billTalkingPoints', String(billId), 'points', pointId));
      const survivors = allDocsRef.current
        .filter((p) => p.id !== pointId)
        .sort((a, b) => a.order - b.order);
      survivors.forEach((p, index) => {
        if (p.order !== index) {
          batch.update(doc(db, 'billTalkingPoints', String(billId), 'points', p.id), {
            order: index,
          });
        }
      });
      await batch.commit();
    },
    [billId],
  );

  return { points, isLoading, addPoint, updatePoint, removePoint };
}
