"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

// Window.gtag global is declared in src/lib/marketplaceAnalytics.ts —
// don't redeclare here or TS errors with "subsequent declaration must
// match" when the two signatures drift. GA_MEASUREMENT_ID is set on
// the gtag config in layout.tsx so we don't need it in this scope.

// =============================================================================
// Hub-route detection — `/marketplace/dimension/[size]`, `/brand/[slug]`,
// `/ciudad/[city]`, `/categoria/[slug]`, `/vehiculo/[slug]`. Each fires a
// GA4 `view_item_list` event so the hub pages (the ones we built the
// whole SEO strategy around) show up in GA's Monetization reports as
// distinct collections — same shape as MercadoLibre's listing pages.
//
// Centralised here so we don't have to thread analytics calls through
// every SSR hub page individually.
// =============================================================================

interface HubMatch {
  list_id:   string;
  list_name: string;
}

function detectHub(pathname: string): HubMatch | null {
  const dimension = pathname.match(/^\/marketplace\/dimension\/([^/?#]+)/);
  if (dimension) {
    return { list_id: `dimension_${dimension[1]}`, list_name: `Llantas ${dimension[1].toUpperCase()}` };
  }
  const brand = pathname.match(/^\/marketplace\/brand\/([^/?#]+)/);
  if (brand) {
    return { list_id: `brand_${brand[1]}`, list_name: `Marca ${brand[1]}` };
  }
  // City × brand combo first (more specific) — `/ciudad/[city]/[brand]`
  const cityBrand = pathname.match(/^\/marketplace\/ciudad\/([^/?#]+)\/([^/?#]+)/);
  if (cityBrand) {
    return {
      list_id:   `ciudad_${cityBrand[1]}_brand_${cityBrand[2]}`,
      list_name: `${cityBrand[2]} en ${cityBrand[1]}`,
    };
  }
  const ciudad = pathname.match(/^\/marketplace\/ciudad\/([^/?#]+)/);
  if (ciudad) {
    return { list_id: `ciudad_${ciudad[1]}`, list_name: `Llantas en ${ciudad[1]}` };
  }
  const categoria = pathname.match(/^\/marketplace\/categoria\/([^/?#]+)/);
  if (categoria) {
    return { list_id: `categoria_${categoria[1]}`, list_name: `Categoría ${categoria[1]}` };
  }
  const vehiculo = pathname.match(/^\/marketplace\/vehiculo\/([^/?#]+)/);
  if (vehiculo) {
    return { list_id: `vehiculo_${vehiculo[1]}`, list_name: `Llantas para ${vehiculo[1]}` };
  }
  const distributor = pathname.match(/^\/marketplace\/distributor\/([^/?#]+)/);
  if (distributor) {
    return { list_id: `distributor_${distributor[1]}`, list_name: `Distribuidor ${distributor[1]}` };
  }
  return null;
}

// =============================================================================
// Inner tracker — split out so the suspense boundary can wrap it.
// Next 16 requires useSearchParams() to be inside a <Suspense> at the
// root layout level; without it the whole tree bails out of streaming.
// =============================================================================

function RouteTrackerInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  // Dedup guard — strict-mode in dev runs effects twice; without this
  // we'd record 2 page_views per navigation in development. Production
  // never hits the dup but the guard is cheap.
  const lastSent = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;

    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    if (fullPath === lastSent.current) return;
    lastSent.current = fullPath;

    // Standard page_view — fires on first mount AND every subsequent
    // navigation. Auto page_view in gtag config is disabled in
    // layout.tsx so this is the single source of truth.
    window.gtag("event", "page_view", {
      page_path:     fullPath,
      page_location: typeof window !== "undefined" ? window.location.href : undefined,
      page_title:    typeof document !== "undefined" ? document.title : undefined,
    });

    // Hub-specific view_item_list — only fires when the route matches
    // one of the marketplace hub patterns. Lets us see in GA which
    // hubs (dimension X, brand Y, city Z) actually drive engagement.
    const hub = detectHub(pathname);
    if (hub) {
      window.gtag("event", "view_item_list", {
        item_list_id:   hub.list_id,
        item_list_name: hub.list_name,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function RouteTracker() {
  // useSearchParams must be inside a Suspense boundary per Next 16's
  // streaming rules. Empty fallback because RouteTracker renders null
  // anyway — Suspense is purely for compliance, not UX.
  return (
    <Suspense fallback={null}>
      <RouteTrackerInner />
    </Suspense>
  );
}
