const CACHE_KEY = (companyId: string) => `tires_cache_${companyId}`;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = { data: T; timestamp: number };

export function getCached<T>(companyId: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(companyId));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY(companyId));
      return null;
    }
    return entry.data;
  } catch { return null; }
}

export function setCached<T>(companyId: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY(companyId), JSON.stringify(entry));
  } catch { /* storage full — silently skip */ }
}

export function invalidateCache(companyId: string): void {
  sessionStorage.removeItem(CACHE_KEY(companyId));
}