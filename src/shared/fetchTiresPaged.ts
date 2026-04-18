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
  /** Tires per round-trip. Default 2000, max 2000. */
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
  const limit    = Math.min(opts.limit ?? 2000, 2000);
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

// ─────────────────────────────────────────────────────────────────────────────
// Progressive version — calls onChunk after each page so React can render
// the dashboard from page 1 immediately while the rest stream in. Use this
// when first-paint latency matters more than correctness of aggregates
// (i.e. every dashboard).
// ─────────────────────────────────────────────────────────────────────────────
export interface ProgressiveTiresOpts extends TiresPagedOpts {
  /** Called with the running full array every time a page arrives. */
  onChunk: <T>(soFar: T[]) => void;
  /**
   * Minimum ms between mid-stream onChunk calls. First and last pages always
   * fire immediately; middle pages coalesce via a trailing-edge timer so the
   * caller's React tree doesn't re-render + re-aggregate on every 2000-tire
   * page arrival. Set to 0 to disable throttling. Default 350ms.
   */
  throttleMs?: number;
}

export async function fetchTiresProgressive<T = any>(
  companyId: string,
  opts: ProgressiveTiresOpts,
): Promise<T[]> {
  const limit      = Math.min(opts.limit ?? 2000, 2000);
  const maxTires   = opts.maxTires ?? Number.POSITIVE_INFINITY;
  const fetcher    = opts.fetcher ?? defaultFetcher;
  const throttleMs = opts.throttleMs ?? 350;

  const all: T[] = [];
  let cursor: string | null = null;
  let pages = 0;
  let lastFiredAt = 0;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  const fire = () => {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    lastFiredAt = Date.now();
    opts.onChunk([...all]);
  };

  try {
    while (true) {
      if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError');

      const url =
        `${API_BASE}/tires/page?companyId=${encodeURIComponent(companyId)}` +
        `&limit=${limit}` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');

      const res = await fetcher(url);
      if (!res.ok) {
        if (all.length === 0) throw new Error(`fetchTiresProgressive: HTTP ${res.status}`);
        break;
      }

      const body = await res.json() as { data: T[]; nextCursor: string | null };
      const chunk = body?.data ?? [];
      all.push(...chunk);
      pages++;

      // onProgress fires on EVERY page — not throttled. The caller uses
      // this to drive a progress bar; it shouldn't be gated by the heavy
      // onChunk throttle or the UI will jump in big steps.
      opts.onProgress?.(all.length, pages);

      const isFirst = pages === 1;
      const isLast  = !body.nextCursor || all.length >= maxTires;
      const since   = Date.now() - lastFiredAt;

      if (throttleMs <= 0 || isFirst || isLast) {
        // First page: instant first paint. Last page: final authoritative
        // array. Both bypass the throttle so the UI is never stuck on stale
        // data after the fetch finishes.
        fire();
      } else if (since >= throttleMs) {
        fire();
      } else if (!pendingTimer) {
        // Schedule a trailing-edge flush. If more pages land before it fires,
        // they'll just accumulate into `all` and the pending timer picks
        // them up without scheduling redundant renders.
        pendingTimer = setTimeout(fire, throttleMs - since);
      }

      if (all.length >= maxTires) break;
      if (!body.nextCursor) break;
      cursor = body.nextCursor;
    }
  } finally {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  }

  return all;
}
