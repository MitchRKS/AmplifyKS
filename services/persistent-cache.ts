// Shared AsyncStorage-backed cache used by the API service layers.

import AsyncStorage from '@react-native-async-storage/async-storage';

interface PersistentCacheEntry<T> {
  timestamp: number;
  data: T;
}

/**
 * Read a cached entry along with its freshness, keeping stale entries in
 * storage so callers can serve them while revalidating.
 */
export const readPersistentCache = async <T>(
  key: string,
  ttlMs: number,
): Promise<{ data: T; isFresh: boolean } | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistentCacheEntry<T>;
    const age = Date.now() - parsed.timestamp;
    return { data: parsed.data, isFresh: age <= ttlMs };
  } catch {
    return null;
  }
};

/**
 * Read a cached entry only if it is still fresh; expired entries are evicted.
 */
export const readFreshPersistentCache = async <T>(
  key: string,
  ttlMs: number,
): Promise<T | null> => {
  const hit = await readPersistentCache<T>(key, ttlMs);
  if (!hit) return null;
  if (!hit.isFresh) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Eviction is best-effort.
    }
    return null;
  }
  return hit.data;
};

export const writePersistentCache = async <T>(key: string, data: T): Promise<void> => {
  try {
    const payload: PersistentCacheEntry<T> = { timestamp: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures; the network path still works.
  }
};
