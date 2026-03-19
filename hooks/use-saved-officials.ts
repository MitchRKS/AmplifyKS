import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import type { Official } from '@/services/openstates';

const storageKey = (uid: string) => `@amplifyks_saved_officials_${uid}`;

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

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(user.uid));
        setSavedOfficials(raw ? JSON.parse(raw) : []);
      } catch {
        setSavedOfficials([]);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [user]);

  const persist = useCallback(
    async (next: Official[]) => {
      if (!user) return;
      setSavedOfficials(next);
      await AsyncStorage.setItem(storageKey(user.uid), JSON.stringify(next));
    },
    [user],
  );

  const saveOfficial = useCallback(
    async (official: Official) => {
      const exists = savedOfficials.some((o) => o.id === official.id);
      if (exists) return;
      await persist([...savedOfficials, official]);
    },
    [savedOfficials, persist],
  );

  const removeOfficial = useCallback(
    async (officialId: string) => {
      await persist(savedOfficials.filter((o) => o.id !== officialId));
    },
    [savedOfficials, persist],
  );

  const isSaved = useCallback(
    (officialId: string) => savedOfficials.some((o) => o.id === officialId),
    [savedOfficials],
  );

  return { savedOfficials, isLoaded, saveOfficial, removeOfficial, isSaved };
}
