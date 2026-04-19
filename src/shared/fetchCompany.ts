// src/shared/fetchCompany.ts
//
// Shared, deduped, short-TTL cache for GET /api/companies/:id.
//
// Why it exists: the dashboard bootstraps through 3–4 places that each want
// the company object (plan, profileImage, stats):
//
//   1. /dashboard/page.tsx  root redirect             — needs `plan`
//   2. RouteGuard                                      — needs `plan`
//   3. sidebar.tsx                                     — needs `profileImage`, `plan`
//   4. dashboard/resumen/page.tsx (progress-bar denom) — needs `stats.tires`
//
// Without dedupe, a single navigation fires 4 identical network calls in
// parallel. The backend ThrottlerModule responded with 429 Too Many Requests
// and the whole dashboard collapsed because the redirect/guard paths treat
// a failed fetch as "log the user out".
//
// This helper:
//   - Dedupes concurrent in-flight requests (map keyed by companyId)
//   - Caches successful responses in memory for 60s (most navs happen
//     within that window; cross-tab refresh still gets a fresh read)
//   - Reuses the same token the other helpers pull from localStorage

export type CompanyData = {
  id?: string;
  name?: string;
  plan?: string;
  profileImage?: string | null;
  _count?: { tires?: number; vehicles?: number; users?: number };
  stats?: { tires?: number; vehicles?: number; users?: number };
  [key: string]: unknown;
};

const CACHE = new Map<string, { data: CompanyData; expiresAt: number }>();
const INFLIGHT = new Map<string, Promise<CompanyData>>();
const TTL_MS = 60 * 1000;

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") ?? "";
}

export interface FetchCompanyOpts {
  /** Bypass the cache but still dedupe in-flight requests. */
  fresh?: boolean;
  /** Override the auth token (tests). */
  token?: string;
}

// Stale cache horizon — if the backend rate-limits us, we'd rather serve a
// slightly out-of-date company object (plan, profileImage rarely change) than
// bounce the user to /login. This window is much longer than the TTL above,
// but only falls back to stale data on error.
const STALE_FALLBACK_MS = 30 * 60 * 1000; // 30 min

async function rawFetch(companyId: string, token: string): Promise<CompanyData> {
  const res = await fetch(`${API_BASE}/companies/${companyId}`, {
    headers: token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = new Error(`fetchCompany: HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as CompanyData;
}

export async function fetchCompany(
  companyId: string,
  opts: FetchCompanyOpts = {},
): Promise<CompanyData> {
  if (!companyId) throw new Error("fetchCompany: companyId is required");

  // 1. Cache hit (fresh window)
  if (!opts.fresh) {
    const cached = CACHE.get(companyId);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  // 2. In-flight dedupe — if another caller is already waiting, reuse
  //    its promise. Prevents the 4-parallel-fetch stampede that triggered
  //    the rate limiter.
  const inflight = INFLIGHT.get(companyId);
  if (inflight) return inflight;

  const token = opts.token ?? getToken();

  const promise = (async (): Promise<CompanyData> => {
    try {
      const data = await rawFetch(companyId, token);
      CACHE.set(companyId, { data, expiresAt: Date.now() + TTL_MS });
      return data;
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      // Transient errors (429 rate limit, 502/503/504 gateway blips): try one
      // short backoff before giving up — covers the typical dev-HMR burst
      // and short production rate-limit windows.
      if (status === 429 || status === 502 || status === 503 || status === 504) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const data = await rawFetch(companyId, token);
          CACHE.set(companyId, { data, expiresAt: Date.now() + TTL_MS });
          return data;
        } catch {
          // Still failing — fall back to any stale cache we have so the UI
          // doesn't collapse to a /login redirect. The CACHE entry may be
          // past its fresh TTL but still useful for plan/profile reads.
          const stale = CACHE.get(companyId);
          if (stale && Date.now() - (stale.expiresAt - TTL_MS) < STALE_FALLBACK_MS) {
            return stale.data;
          }
          throw err;
        }
      }
      throw err;
    }
  })().finally(() => {
    INFLIGHT.delete(companyId);
  });

  INFLIGHT.set(companyId, promise);
  return promise;
}

/** Evict a company from the cache — call after successful company mutations. */
export function invalidateCompany(companyId: string): void {
  CACHE.delete(companyId);
}
