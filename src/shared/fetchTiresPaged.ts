// src/shared/fetchTiresPaged.ts
//
// Paged replacement for `GET /api/tires?companyId=...&slim=true`. Returns
// the same flat array the old endpoint returned, but fetches it in chunks
// via `/api/tires/page?companyId=...&cursor=...`. Redis caches each page
// independently so repeat loads are ~instant; first-ever load is bounded
// by the API response time × number of pages.
//
// Usage:
//   import { fetchTiresPaged } from '@/shared/fetchTiresPaged';
//   const tires = await fetchTiresPaged(companyId);
//
// Optional progress callback for a loading bar:
//   await fetchTiresPaged(companyId, { onProgress: (n) => setLoaded(n) });

export interface TiresPagedOpts {
  /** Tires per round-trip. Default 500, max 500. */
  limit?: number;
  /** Stop after this many tires (safety net for huge tenants). */
  maxTires?: number;
  /** Called after each page is fetched with the running count. */
  onProgress?: (loaded: number, pages: number) => void;
  /** Fetch implementation override — tests, or prepending Authorization. */
  fetcher?: (url: string) => Promise<Response>;
  /** Abort early. */
  signal?: AbortSignal;
}

const API_BASE = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.tirepro.com.co/api';

function defaultFetcher(url: string): Promise<Response> {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('token') ?? '')
    : '';
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function fetchTiresPaged<T = any>(
  companyId: string,
  opts: TiresPagedOpts = {},
): Promise<T[]> {
  const limit    = Math.min(opts.limit ?? 500, 500);
  const maxTires = opts.maxTires ?? Number.POSITIVE_INFINITY;
  const fetcher  = opts.fetcher ?? defaultFetcher;

  const all: T[] = [];
  let cursor: string | null = null;
  let pages = 0;

  while (true) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError');

    const url =
      `${API_BASE}/tires/page?companyId=${encodeURIComponent(companyId)}` +
      `&limit=${limit}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');

    const res = await fetcher(url);
    if (!res.ok) {
      // First page failing is fatal; later pages failing means we return what we have.
      if (pages === 0) throw new Error(`fetchTiresPaged: HTTP ${res.status}`);
      break;
    }

    const body = await res.json() as { data: T[]; nextCursor: string | null };
    const chunk = body?.data ?? [];
    all.push(...chunk);
    pages++;
    opts.onProgress?.(all.length, pages);

    if (all.length >= maxTires) break;
    if (!body.nextCursor) break;
    cursor = body.nextCursor;
  }

  return all;
}
