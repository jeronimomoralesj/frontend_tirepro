"use client";

import { useEffect, useRef } from "react";

// Window.gtag global lives in src/lib/marketplaceAnalytics.ts.

/**
 * Client-side analytics bridge for the SSR /marketplace/buscar route.
 *
 * Two GA4 events:
 *  - `search`              — every render with a non-empty query
 *  - `view_search_results` — every render, even when query is empty
 *                            (lets us track filter-only browsing too)
 *
 * Dedup ref prevents firing twice in dev under React strict mode and
 * also guards against an in-page state update re-running the effect
 * for an unchanged (q, total) tuple.
 */
export default function BuscarAnalytics({
  q,
  total,
  filters,
}: {
  q: string | null;
  total: number;
  filters: Record<string, string | undefined>;
}) {
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;

    const key = `${q ?? ""}|${total}|${JSON.stringify(filters)}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    if (q && q.trim().length > 0) {
      window.gtag("event", "search", {
        search_term:       q.trim(),
        mp_results_count:  total,
      });
    }

    window.gtag("event", "view_search_results", {
      search_term:      q?.trim() ?? "",
      mp_results_count: total,
      // Surface every active filter as a separate event param so we can
      // segment GA reports by which filter combinations actually
      // convert. Dropped if undefined; GA4 ignores undefined values.
      ...(filters.marca     && { filter_marca:     filters.marca }),
      ...(filters.dimension && { filter_dimension: filters.dimension }),
      ...(filters.tipo      && { filter_tipo:      filters.tipo }),
      ...(filters.ciudad    && { filter_ciudad:    filters.ciudad }),
    });
  }, [q, total, filters]);

  return null;
}
