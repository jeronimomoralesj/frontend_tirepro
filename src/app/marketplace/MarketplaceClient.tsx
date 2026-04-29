"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Loader2, Package, Truck, X, Store, MapPin,
  ChevronLeft, ChevronRight, Star,
  Recycle, Clock, Search, MessageCircle, Send, ArrowRight,
  Car, Factory, Shield, CreditCard, Wrench, Sparkles, Tag,
} from "lucide-react";
import { useCart } from "../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../components/MarketplaceShell";
import { trackMarketplaceHome, trackSearch, trackFilter, trackMarketplaceSession } from "../../lib/marketplaceAnalytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Listing {
  id: string; marca: string; modelo: string; dimension: string;
  eje: string | null; tipo: string; precioCop: number;
  precioPromo: number | null; promoHasta: string | null;
  incluyeIva: boolean; cantidadDisponible: number;
  tiempoEntrega: string | null; descripcion: string | null;
  imageUrls: string[] | null; coverIndex: number;
  distributor: { id: string; slug?: string | null; name: string; profileImage: string };
  catalog: {
    terreno: string | null; reencauchable: boolean;
    kmEstimadosReales: number | null; cpkEstimado: number | null;
    crowdAvgCpk: number | null;
  } | null;
  _count?: { reviews: number; orders: number };
  reviews?: { rating: number }[];
}

interface DistributorOption { id: string; name: string; profileImage: string }
interface Filters { dimensions: string[]; marcas: string[]; distributors: DistributorOption[] }

export interface BrandMeta { name: string; slug: string; logoUrl: string | null }
export type BrandsMap = Map<string, BrandMeta>;

// Slugify helper used as a fallback when a brand has no BrandInfo row but
// the user still wants the link to point at the brand page (which will 404
// gracefully if the brand isn't seeded — better than a /marketplace?q=
// search that mixes models from other brands).
export function brandSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

export function BrandLink({
  marca,
  brandsMap,
  className = "",
  showLogo = true,
}: {
  marca: string;
  brandsMap?: BrandsMap;
  className?: string;
  showLogo?: boolean;
}) {
  const meta = brandsMap?.get(marca.toLowerCase().trim());
  const slug = meta?.slug ?? brandSlug(marca);
  return (
    <Link
      href={`/marketplace/brand/${slug}`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity ${className}`}
    >
      {showLogo && meta?.logoUrl && (
        <span
          className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-white"
          style={{ border: "1px solid rgba(30,118,182,0.18)" }}
        >
          <img src={meta.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
        </span>
      )}
      <span className="truncate">{marca}</span>
    </Link>
  );
}

// =============================================================================

export default function PublicMarketplaceWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7]" />}>
      <PublicMarketplace />
    </Suspense>
  );
}

function PublicMarketplace() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ dimensions: [], marcas: [], distributors: [] });
  const [brandsMap, setBrandsMap] = useState<BrandsMap>(new Map());

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [dimension, setDimension] = useState("");
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState(searchParams.get("tipo") ?? "");
  const [distributorId, setDistributorId] = useState("");
  const [rimSizes, setRimSizes] = useState<string[]>([]);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<{ type: string; listings: Listing[] }>({ type: "", listings: [] });
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [detectedCity, setDetectedCity] = useState("");
  const [userHasCompany, setUserHasCompany] = useState(false);
  const cart = useCart();

  // Check if logged in user has a company + track session
  useEffect(() => {
    trackMarketplaceSession();
    trackMarketplaceHome();
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (user.companyId) setUserHasCompany(true);
    } catch { /* */ }
  }, []);

  // Location detection
  useEffect(() => {
    // 1. Check localStorage first
    const saved = localStorage.getItem("marketplace_city");
    if (saved) { setCiudad(saved); setDetectedCity(saved); return; }

    // 2. Try to get from logged-in user's company
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (token && user.companyId) {
        fetch(`${API_BASE}/companies/${user.companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.ok ? r.json() : null).then((company) => {
          if (company?.ciudad) {
            setCiudad(company.ciudad);
            setDetectedCity(company.ciudad);
            localStorage.setItem("marketplace_city", company.ciudad);
            return;
          }
          // No company city → ask
          setShowLocationBanner(true);
        }).catch(() => setShowLocationBanner(true));
        return;
      }
    } catch { /* guest */ }

    // 3. Guest — try browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=es`);
            if (res.ok) {
              const data = await res.json();
              const city = data.address?.city || data.address?.town || data.address?.state || "";
              if (city) {
                // Normalize common Colombian city names
                const normalized = city.replace("Bogotá D.C.", "Bogota").replace("Bogotá", "Bogota")
                  .replace("Medellín", "Medellin").replace("Barranquilla", "Barranquilla");
                setCiudad(normalized);
                setDetectedCity(normalized);
                localStorage.setItem("marketplace_city", normalized);
                return;
              }
            }
          } catch { /* */ }
          setShowLocationBanner(true);
        },
        () => setShowLocationBanner(true),
        { timeout: 5000 }
      );
    } else {
      setShowLocationBanner(true);
    }
  }, []);

  useEffect(() => {
    // Parallel fetch: filters + recommendations (+ orders if logged in)
    const filtersP = fetch(`${API_BASE}/marketplace/listings/filters`)
      .then((r) => (r.ok ? r.json() : { dimensions: [], marcas: [], distributors: [] }));

    let ordersP: Promise<any> = Promise.resolve([]);
    let recsP: Promise<any>;

    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (token && user.id) {
        ordersP = fetch(`${API_BASE}/marketplace/orders/user?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
        recsP = fetch(`${API_BASE}/marketplace/recommendations?userId=${user.id}`)
          .then((r) => (r.ok ? r.json() : { type: "", listings: [] })).catch(() => ({ type: "", listings: [] }));
      } else {
        recsP = fetch(`${API_BASE}/marketplace/recommendations`)
          .then((r) => (r.ok ? r.json() : { type: "", listings: [] })).catch(() => ({ type: "", listings: [] }));
      }
    } catch {
      recsP = fetch(`${API_BASE}/marketplace/recommendations`)
        .then((r) => (r.ok ? r.json() : { type: "", listings: [] })).catch(() => ({ type: "", listings: [] }));
    }

    Promise.all([filtersP, ordersP, recsP]).then(([f, o, r]) => {
      setFilters(f);
      setRecentOrders(o);
      setRecommendations(r);
    });

    // Fetch brand metadata once for clickable brand pills + logos
    fetch(`${API_BASE}/marketplace/brands`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        const m: BrandsMap = new Map();
        if (Array.isArray(rows)) {
          rows.forEach((row) => {
            if (row?.name && row?.slug) {
              m.set(String(row.name).toLowerCase().trim(), {
                name: row.name, slug: row.slug, logoUrl: row.logoUrl ?? null,
              });
            }
          });
        }
        setBrandsMap(m);
      })
      .catch(() => { /* ignore — falls back to slugified link, no logo */ });
  }, []);

  // Track whether user explicitly set the city filter (vs auto-detected)
  const [ciudadManual, setCiudadManual] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (dimension) p.set("dimension", dimension);
    if (marca) p.set("marca", marca);
    if (tipo) p.set("tipo", tipo);
    if (distributorId) p.set("distributorId", distributorId);
    if (rimSizes.length > 0) p.set("rimSizes", rimSizes.join(","));
    // Only send ciudad as hard filter if user set it manually
    if (ciudad && ciudadManual) p.set("ciudad", ciudad);
    p.set("sortBy", sortBy);
    p.set("page", String(page));
    // When a category is active we fetch a larger page so the client-side
    // rim filter has enough data to work with even if the backend hasn't
    // been updated to honor `rimSizes`.
    p.set("limit", rimSizes.length > 0 ? "50" : "24");
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings?${p}`);
      if (res.ok) {
        const d = await res.json();
        let nextListings: Listing[] = d.listings ?? [];
        let nextTotal: number = d.total ?? 0;
        let nextPages: number = d.pages ?? 1;
        // Defensive client-side rim filter — works even if the backend
        // ignores the rimSizes param.
        if (rimSizes.length > 0) {
          const rimRegexes = rimSizes.map(
            (r) => new RegExp(`R\\s*${r.replace(".", "\\.")}\\b`, "i")
          );
          nextListings = nextListings.filter((l) =>
            rimRegexes.some((rx) => rx.test(l.dimension ?? ""))
          );
          nextTotal = nextListings.length;
          nextPages = 1;
        }
        setListings(nextListings); setTotal(nextTotal); setPages(nextPages);
        if (search) trackSearch(search, d.total ?? 0);
        if (dimension) trackFilter("dimension", dimension);
        if (marca) trackFilter("marca", marca);
        if (tipo) trackFilter("tipo", tipo);
      }
    } catch { /* */ }
    setLoading(false);
  }, [search, dimension, marca, tipo, distributorId, rimSizes, ciudad, ciudadManual, sortBy, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, dimension, marca, tipo, distributorId, rimSizes, ciudad, sortBy]);

  // Keep the URL's `?q=` in sync with the search state so users can share
  // links (`/marketplace?q=Bfgoodrich`) and the back button works as they
  // expect. Uses router.replace so we don't stack history entries on
  // every keystroke. Debounced via the trim() check — empty searches
  // clear the query param cleanly.
  useEffect(() => {
    const trimmed = search.trim();
    const current = searchParams.get("q") ?? "";
    if (trimmed === current) return;

    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) params.set("q", trimmed);
    else         params.delete("q");

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [search, pathname, router, searchParams]);

  const activeFilters = [dimension, marca, tipo, distributorId, rimSizes.length > 0 ? "rim" : "", ciudadManual ? ciudad : ""].filter(Boolean).length;

  function clearFilters() { setDimension(""); setMarca(""); setTipo(""); setDistributorId(""); setRimSizes([]); setCategoryLabel(""); setCiudad(""); setCiudadManual(false); }

  // Matching brands for the current search term — surfaced as a horizontal
  // strip above the product listings. Lets users land on a brand page even
  // when we currently stock zero tires of that brand.
  //
  // Ranking: starts-with > word-boundary > substring. Also normalizes
  // diacritics so "bfg" / "BFGOODRICH" / "bf goodrich" all find
  // BFGoodrich. Kept at 12 max so the strip stays scannable on mobile.
  // ─── Home-vs-results gating ────────────────────────────────────────────
  // ?todos=1 explicitly bypasses the curated home view so users who clicked
  // "Todo" in the nav see the actual product grid, not categories again.
  const showAll = searchParams.get("todos") === "1";
  const homeView = !search && !activeFilters && !showAll;

  // ─── Featured strip data ───────────────────────────────────────────────
  // recommendations.listings is empty until we accumulate sales/orders.
  // We always top up to MIN_FEATURED with random listings so the strip
  // looks full even on a fresh marketplace with very few sales — better
  // than seeing a half-empty "Más vendidas" row.
  //
  // We split bestsellers into two scrollers: nuevas (tipo !== reencauche)
  // and reencauche, so each category gets its own visual identity instead
  // of being mixed together. Each is independently topped up.
  const MIN_FEATURED = 12;
  const buildFeatured = useCallback((wantReencauche: boolean) => {
    const matchTipo = (l: Listing) =>
      wantReencauche ? l.tipo === "reencauche" : l.tipo !== "reencauche";
    const recs = recommendations.listings.filter(matchTipo);
    const haveIds = new Set(recs.map((r) => r.id));
    // Pool is the rest of the catalog filtered by tipo. Shuffle so home
    // reloads vary. Safe to use Math.random here because both arrays
    // start empty on SSR and only populate after client-side fetches.
    const pool = listings.filter((l) => !haveIds.has(l.id) && matchTipo(l));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return [...recs, ...shuffled].slice(0, Math.max(MIN_FEATURED, recs.length));
  }, [recommendations.listings, listings]);

  const featuredNuevas = useMemo(() => buildFeatured(false), [buildFeatured]);
  const featuredReencauche = useMemo(() => buildFeatured(true), [buildFeatured]);

  const nuevasTitle = recommendations.listings.some((l) => l.tipo !== "reencauche") && recommendations.listings.length >= MIN_FEATURED
    ? (recommendations.type === "personalized" || recommendations.type === "user_history"
        ? "Recomendado para ti"
        : "Llantas más vendidas")
    : "Llantas más vendidas";

  // ─── Brands with actual inventory ──────────────────────────────────────
  // BrandsStrip should never link to an empty brand page. The authoritative
  // list of brands with stock is `filters.marcas` (the backend's distinct
  // aggregate over active listings). The recommender / paginated listings
  // would only reflect what's loaded into the current page, which collapses
  // the strip to a single brand on a fresh marketplace.
  const stockedBrandSlugs = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const slugs = new Set<string>();
    const sourceMarcas = filters.marcas.length > 0
      ? filters.marcas
      : Array.from(new Set([
          ...recommendations.listings.map((l) => l.marca),
          ...listings.map((l) => l.marca),
        ]));
    for (const marca of sourceMarcas) {
      const meta = brandsMap.get(marca);
      if (meta?.slug) slugs.add(meta.slug);
      else {
        // Fallback: derive a slug from the marca name when no BrandInfo row
        // exists. Matches what the brand-page route expects.
        const candidate = norm(marca).replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (candidate) slugs.add(candidate);
      }
    }
    return slugs;
  }, [filters.marcas, recommendations.listings, listings, brandsMap]);

  const matchingBrands = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const q = norm(search);
    if (!q || q.length < 1) return [];

    type Scored = { meta: BrandMeta; score: number };
    const scored: Scored[] = [];
    for (const meta of brandsMap.values()) {
      const n = norm(meta.name);
      let score = 0;
      if (n === q)                              score = 100;
      else if (n.startsWith(q))                 score = 80;
      // Word-boundary match — picks up "BF Goodrich" when user types "go"
      else if (new RegExp(`\\b${q}`).test(n))   score = 60;
      else if (n.includes(q))                   score = 40;
      // Compact match: collapse spaces/hyphens so "bfg" matches "bf goodrich"
      else if (q.length >= 3 && n.replace(/[\s-]+/g, "").includes(q.replace(/[\s-]+/g, "")))
        score = 30;
      if (score > 0) scored.push({ meta, score });
    }
    scored.sort((a, b) => b.score - a.score || a.meta.name.localeCompare(b.meta.name));
    return scored.slice(0, 12).map((s) => s.meta);
  }, [search, brandsMap]);

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* ═══ NAV ═══ */}
      <MarketplaceNav initialSearch={search} onSearch={setSearch} />

      {/* Filters bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-hide">
            {/* Dimension quick picks */}
            {filters.dimensions.slice(0, 5).map((d) => (
              <button key={d} onClick={() => setDimension(dimension === d ? "" : d)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0"
                style={{ background: dimension === d ? "#1E76B6" : "white", color: dimension === d ? "white" : "#777", border: dimension === d ? "none" : "1px solid #e5e5e5" }}>
                {d}
              </button>
            ))}

            <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0" />

            <SearchablePicker
              label="Marca"
              value={marca}
              options={filters.marcas.map((m) => ({ value: m, label: m }))}
              onChange={setMarca}
            />
            <SearchablePicker
              label="Distribuidor"
              value={distributorId}
              options={filters.distributors.map((d) => ({ value: d.id, label: d.name }))}
              onChange={setDistributorId}
            />
            <input type="text" value={ciudad} onChange={(e) => { setCiudad(e.target.value); setCiudadManual(true); }} placeholder="Ciudad"
              className="px-3 py-1.5 rounded-full text-[11px] border border-gray-200 bg-white text-[#555] w-24 placeholder-gray-400 flex-shrink-0" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-gray-200 bg-white text-[#555] flex-shrink-0 ml-auto">
              <option value="relevance">Relevancia</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="newest">Recientes</option>
            </select>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="text-[11px] font-bold text-red-500 hover:underline flex-shrink-0">Limpiar</button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ LOCATION BANNER ═══ */}
      {detectedCity && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3 h-3 text-[#1E76B6]" />
            <span>Mostrando productos con envio a <strong className="text-[#0A183A]">{detectedCity}</strong></span>
            <button onClick={() => { setCiudad(""); setDetectedCity(""); localStorage.removeItem("marketplace_city"); setShowLocationBanner(true); }}
              className="text-[10px] text-[#1E76B6] font-bold hover:underline ml-1">Cambiar</button>
          </div>
        </div>
      )}
      {showLocationBanner && !detectedCity && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#1E76B6]/5 border border-[#1E76B6]/10">
            <MapPin className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
            <p className="text-xs text-[#0A183A] flex-1">¿Donde necesitas tus llantas? Mostramos distribuidores que entregan en tu ciudad.</p>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  setCiudad(e.target.value);
                  setCiudadManual(true);
                  setDetectedCity(e.target.value);
                  localStorage.setItem("marketplace_city", e.target.value);
                  setShowLocationBanner(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs border border-[#1E76B6]/20 bg-white text-[#0A183A] flex-shrink-0">
              <option value="">Seleccionar ciudad</option>
              {["Bogota","Medellin","Cali","Barranquilla","Cartagena","Bucaramanga","Cucuta","Pereira","Santa Marta","Ibague","Manizales","Villavicencio","Pasto","Monteria","Neiva","Armenia"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={() => setShowLocationBanner(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* When the user clicks "Todo" in the nav we land here with ?todos=1.
          That bypasses the curated home view (hero / categories / etc.) and
          drops the user straight into the full product grid. Counts as
          "browsing all" — different from a real search/filter. */}
      {/* ═══ HERO — dual-mode search (medida o texto) + trust signals ═══ */}
      {homeView && (
        <MarketplaceHero
          dimensions={filters.dimensions}
          onSearchDimension={(d) => setDimension(d)}
          onSearchText={(q) => setSearch(q)}
        />
      )}

      {/* ═══ TRUST BAND — verificados, envío, pago ═══ */}
      {homeView && <TrustBand />}

      {/* ═══ CATEGORÍAS ═══ */}
      {homeView && (
        <CategoriesSection
          availableDimensions={filters.dimensions}
          onPick={(rims, label) => {
            setRimSizes(rims);
            setCategoryLabel(label);
            if (typeof window !== "undefined") {
              setTimeout(() => window.scrollTo({ top: 540, behavior: "smooth" }), 50);
            }
          }}
        />
      )}

      {/* ═══ MARCAS MÁS VENDIDAS — solo marcas con tires en inventario ═══ */}
      {homeView && brandsMap.size > 0 && stockedBrandSlugs.size > 0 && (
        <BrandsStrip brandsMap={brandsMap} stockedSlugs={stockedBrandSlugs} />
      )}

      {/* ═══ LLANTAS MÁS VENDIDAS (nuevas) ═══
            Always topped up to MIN_FEATURED — never half-empty. */}
      {homeView && featuredNuevas.length > 0 && (
        <BestSellersScroller listings={featuredNuevas} brandsMap={brandsMap} title={nuevasTitle} />
      )}

      {/* ═══ REENCAUCHE MÁS VENDIDO — separate scroller so the category
            gets its own visual identity instead of being mixed in. */}
      {homeView && featuredReencauche.length > 0 && (
        <BestSellersScroller
          listings={featuredReencauche}
          brandsMap={brandsMap}
          title="Reencauche más vendido"
          subtitle="Renueva tus llantas con la mitad del costo"
        />
      )}

      {/* ═══ OFERTAS DESTACADAS — solo listados con promo activa ═══ */}
      {homeView && (featuredNuevas.length > 0 || featuredReencauche.length > 0) && (
        <DealsStrip listings={[...featuredNuevas, ...featuredReencauche]} brandsMap={brandsMap} />
      )}

      {/* ═══ CÓMO FUNCIONA ═══ */}
      {homeView && <HowItWorks />}

      {/* ═══ RECENT PURCHASES (personalized) ═══ */}
      {recentOrders.length > 0 && !search && !activeFilters && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <h2 className="text-sm font-black text-[#0A183A] mb-2">Tus compras recientes</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentOrders.map((o: any) => {
              const imgs = Array.isArray(o.listing?.imageUrls) ? o.listing.imageUrls : [];
              const cover = imgs.length > 0 ? imgs[o.listing?.coverIndex ?? 0] ?? imgs[0] : null;
              return (
                <Link key={o.id} href={`/marketplace/product/${o.listingId}`}
                  className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all"
                  style={{ minWidth: 240 }}>
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {cover ? <img src={cover} alt={`${o.listing?.marca} ${o.listing?.modelo}`} className="w-full h-full object-contain p-1" /> : <Package className="w-5 h-5 text-gray-200" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0A183A] truncate">{o.listing?.marca} {o.listing?.modelo}</p>
                    <p className="text-[10px] text-gray-400">{o.quantity} uds · {new Date(o.createdAt).toLocaleDateString("es-CO")}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ RESULTS ═══ */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ display: homeView ? "none" : undefined }}>
        {rimSizes.length > 0 && categoryLabel && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
            <span>Categoría: {categoryLabel}</span>
            <button
              onClick={() => { setRimSizes([]); setCategoryLabel(""); }}
              className="ml-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              aria-label="Quitar categoría"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E76B6] mb-3" />
            <p className="text-sm text-gray-500">Buscando productos...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center py-32">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-bold text-[#0A183A]">Sin resultados</p>
            <p className="text-sm text-gray-400 mt-1 text-center max-w-sm">
              {activeFilters > 0 ? "Intenta con menos filtros o una busqueda diferente." : "Los distribuidores aun no han publicado productos."}
            </p>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="mt-4 px-5 py-2 rounded-full text-sm font-bold text-[#1E76B6] border border-[#1E76B6]/30 hover:bg-[#1E76B6]/5">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar filters — desktop only */}
            <aside className="hidden lg:block">
              <ResultsSidebar
                filters={filters}
                marca={marca}
                setMarca={setMarca}
                dimension={dimension}
                setDimension={setDimension}
                tipo={tipo}
                setTipo={setTipo}
                distributorId={distributorId}
                setDistributorId={setDistributorId}
                clearFilters={clearFilters}
              />
            </aside>

            <div>
              {/* Brand match strip — rendered FIRST so users see matching
                  brands even when there are zero product rows below.
                  Appears whenever the search term matches ≥1 brand
                  regardless of whether we stock their tires right now. */}
              {matchingBrands.length > 0 && search.trim() && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">
                      {matchingBrands.length === 1
                        ? `Marca: ${matchingBrands[0].name}`
                        : `Marcas que coinciden con "${search}"`}
                    </p>
                    {matchingBrands.length > 1 && (
                      <span className="text-[10px] font-bold text-gray-400">
                        {matchingBrands.length} marca{matchingBrands.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    {matchingBrands.map((b) => (
                      <Link
                        key={b.slug}
                        href={`/marketplace/brand/${b.slug}`}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#1E76B6] hover:shadow-md transition-all flex-shrink-0 group min-w-[160px]"
                      >
                        <span
                          className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-sm font-black"
                          style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
                        >
                          {b.logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={b.logoUrl} alt="" className="max-w-full max-h-full object-contain p-0.5 bg-white" />
                          ) : (
                            b.name.charAt(0).toUpperCase()
                          )}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-[#0A183A] leading-tight truncate">{b.name}</span>
                          <span className="text-[9px] text-gray-400 group-hover:text-[#1E76B6] transition-colors">
                            Ver marca →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Results header */}
              <div className="flex items-center justify-between mb-4 gap-3">
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-[#0A183A]">{total}</span> resultado{total !== 1 ? "s" : ""}
                  {search && <> para <span className="font-bold text-[#0A183A]">&quot;{search}&quot;</span></>}
                </p>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]">
                  <option value="relevance">Relevancia</option>
                  <option value="price_asc">Menor precio</option>
                  <option value="price_desc">Mayor precio</option>
                  <option value="newest">Más recientes</option>
                </select>
              </div>

              {/* Product list — full-width rows */}
              <div className="space-y-3">
                {listings.map((l) => <ProductRow key={l.id} l={l} brandsMap={brandsMap} />)}
              </div>

              {/* Empty-state callout when no listings BUT we matched a
                  brand — guide the user to the brand page. */}
              {!loading && listings.length === 0 && matchingBrands.length > 0 && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-gray-100">
                  <p className="text-sm font-black text-[#0A183A] mb-1">
                    Sin llantas en el marketplace ahora mismo
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Pero sí conocemos la marca. Visita su página para conocer más sobre{" "}
                    <span className="font-bold text-[#0A183A]">{matchingBrands[0].name}</span>.
                  </p>
                  <Link
                    href={`/marketplace/brand/${matchingBrands[0].slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#0A183A] to-[#1E76B6] hover:opacity-90 transition-opacity"
                  >
                    Ir a {matchingBrands[0].name}
                  </Link>
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-10">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#333] border border-gray-200 disabled:opacity-20 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                    const p = page <= 4 ? i + 1 : Math.min(page + i - 3, pages - 6 + i + 1);
                    if (p < 1 || p > pages) return null;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className="w-9 h-9 rounded-full text-xs font-bold transition-all"
                        style={{ background: p === page ? "#0A183A" : "transparent", color: p === page ? "white" : "#555" }}>
                        {p}
                      </button>
                    );
                  })}
                  <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#333] border border-gray-200 disabled:opacity-20 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ═══ CTA BANNER ═══ */}
      {!userHasCompany && (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="rounded-xl overflow-hidden relative flex items-center justify-between gap-4 px-5 sm:px-8 py-4" style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">¿Quieres llevar el detalle de tus llantas?</p>
            <p className="text-[10px] text-white/50 mt-0.5">TirePro 100% gratis — Desgaste, inventario, alertas.</p>
          </div>
          <Link href="/companyregister"
            className="px-4 py-2 rounded-full text-[11px] font-bold text-[#0A183A] bg-white hover:bg-gray-100 transition-colors flex-shrink-0">
            Comenzar Gratis
          </Link>
        </div>
      </div>
      )}

      {/* ═══ SEO LINK BLOCK — densely linked landing zone for crawlers ═══ */}
      {!search && !activeFilters && brandsMap.size > 0 && (
        <SeoLinkBlock brandsMap={brandsMap} />
      )}

      <MarketplaceFooter />

      {/* ═══ FLOATING ASSISTANT BUTTON ═══ */}
      <TireAssistant onSearch={(q) => setSearch(q)} />

    </div>
  );
}

// =============================================================================
// Product Card
// =============================================================================

// =============================================================================
// Plate Search Bar
// =============================================================================

// =============================================================================
// Tire Assistant — guided chat to find the right tire
// =============================================================================

// Common Colombian vehicles → tire dimensions
const VEHICLE_DB: Record<string, { dims: string[]; type: string }> = {
  // City cars
  "kia picanto": { dims: ["165/65R14", "175/65R14"], type: "City car" },
  "chevrolet spark": { dims: ["155/80R13", "165/65R14"], type: "City car" },
  "renault kwid": { dims: ["165/70R14"], type: "City car" },
  "suzuki alto": { dims: ["155/65R14"], type: "City car" },
  // Sedans
  "renault logan": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "chevrolet onix": { dims: ["195/65R15", "205/55R16"], type: "Sedan" },
  "kia rio": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "hyundai accent": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "hyundai i25": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "toyota corolla": { dims: ["205/55R16", "215/45R17"], type: "Sedan" },
  "mazda 3": { dims: ["205/60R16", "215/45R18"], type: "Sedan" },
  "honda civic": { dims: ["205/55R16", "215/50R17"], type: "Sedan" },
  "kia cerato": { dims: ["205/55R16", "215/45R17"], type: "Sedan" },
  "volkswagen jetta": { dims: ["205/55R16", "215/45R17"], type: "Sedan" },
  "nissan versa": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  // Hatchbacks
  "renault sandero": { dims: ["185/65R15", "195/55R16"], type: "Hatchback" },
  "mazda 2": { dims: ["185/65R15", "195/55R16"], type: "Hatchback" },
  "honda fit": { dims: ["185/55R16", "175/65R15"], type: "Hatchback" },
  "volkswagen polo": { dims: ["185/65R15", "195/55R16"], type: "Hatchback" },
  "suzuki swift": { dims: ["185/55R16", "195/45R17"], type: "Hatchback" },
  // SUV / Crossover
  "hyundai tucson": { dims: ["225/60R17", "235/55R18"], type: "SUV" },
  "kia sportage": { dims: ["225/60R17", "235/55R18"], type: "SUV" },
  "toyota rav4": { dims: ["225/65R17", "235/55R18"], type: "SUV" },
  "mazda cx-5": { dims: ["225/65R17", "225/55R19"], type: "SUV" },
  "nissan qashqai": { dims: ["215/65R16", "225/55R18"], type: "SUV" },
  "renault duster": { dims: ["215/65R16", "215/60R17"], type: "SUV" },
  "chevrolet tracker": { dims: ["215/55R17", "215/50R18"], type: "SUV" },
  "ford escape": { dims: ["225/65R17", "235/55R18"], type: "SUV" },
  "hyundai creta": { dims: ["205/65R16", "215/60R17"], type: "SUV" },
  "kia seltos": { dims: ["215/60R17", "235/45R18"], type: "SUV" },
  // Campero / 4x4
  "toyota prado": { dims: ["265/65R17", "265/60R18"], type: "Campero" },
  "toyota fortuner": { dims: ["265/65R17", "265/60R18"], type: "Campero" },
  "toyota land cruiser": { dims: ["265/65R17", "285/60R18"], type: "Campero" },
  "nissan patrol": { dims: ["265/70R17", "275/60R20"], type: "Campero" },
  "chevrolet trailblazer": { dims: ["265/65R17", "265/60R18"], type: "Campero" },
  "ford bronco": { dims: ["255/70R16", "265/70R17"], type: "Campero" },
  // Pickup / Camioneta
  "toyota hilux": { dims: ["265/65R17", "265/60R18"], type: "Pickup" },
  "nissan frontier": { dims: ["255/70R16", "265/65R17"], type: "Pickup" },
  "chevrolet d-max": { dims: ["245/70R16", "265/65R17"], type: "Pickup" },
  "ford ranger": { dims: ["265/65R17", "265/60R18"], type: "Pickup" },
  "mitsubishi l200": { dims: ["245/70R16", "265/65R17"], type: "Pickup" },
  "mazda bt-50": { dims: ["255/70R16", "265/65R17"], type: "Pickup" },
  // Vans
  "hyundai h1": { dims: ["215/70R16", "225/70R16"], type: "Van" },
  "mercedes vito": { dims: ["225/65R16C", "235/60R17"], type: "Van" },
  "renault kangoo": { dims: ["185/65R15", "195/65R15"], type: "Van" },
  // Premium / Electric / European
  "volvo xc40": { dims: ["235/55R18", "245/45R19"], type: "SUV" },
  "volvo xc60": { dims: ["235/55R19", "255/45R20"], type: "SUV" },
  "volvo xc90": { dims: ["255/50R19", "275/45R20"], type: "SUV" },
  "volvo s60": { dims: ["225/50R17", "235/45R18"], type: "Sedan" },
  "tesla model 3": { dims: ["235/45R18", "235/40R19"], type: "Sedan electrico" },
  "tesla model y": { dims: ["255/45R19", "255/40R20"], type: "SUV electrico" },
  "tesla model s": { dims: ["245/45R19", "265/35R21"], type: "Sedan electrico" },
  "tesla model x": { dims: ["255/45R20", "265/40R21"], type: "SUV electrico" },
  "bmw x1": { dims: ["225/55R17", "225/50R18"], type: "SUV" },
  "bmw x3": { dims: ["245/50R19", "245/45R20"], type: "SUV" },
  "bmw x5": { dims: ["265/50R19", "275/45R20"], type: "SUV" },
  "bmw serie 3": { dims: ["225/50R17", "225/45R18"], type: "Sedan" },
  "audi q3": { dims: ["215/65R17", "235/55R18"], type: "SUV" },
  "audi q5": { dims: ["235/60R18", "255/45R20"], type: "SUV" },
  "audi a3": { dims: ["225/50R17", "225/45R18"], type: "Sedan" },
  "audi a4": { dims: ["225/50R17", "245/40R18"], type: "Sedan" },
  "mercedes glc": { dims: ["235/60R18", "255/45R20"], type: "SUV" },
  "mercedes gle": { dims: ["255/55R19", "275/45R21"], type: "SUV" },
  "mercedes clase c": { dims: ["225/50R17", "225/45R18"], type: "Sedan" },
  "mercedes clase a": { dims: ["225/45R17", "225/40R18"], type: "Sedan" },
  "jeep wrangler": { dims: ["245/75R17", "255/70R18"], type: "Campero" },
  "jeep grand cherokee": { dims: ["265/60R18", "265/50R20"], type: "SUV" },
  "jeep renegade": { dims: ["215/65R16", "225/55R18"], type: "SUV" },
  "subaru forester": { dims: ["225/60R17", "225/55R18"], type: "SUV" },
  "subaru outback": { dims: ["225/60R18", "225/65R17"], type: "SUV" },
  "mini cooper": { dims: ["195/55R16", "205/45R17"], type: "Hatchback" },
  "peugeot 208": { dims: ["195/55R16", "205/45R17"], type: "Hatchback" },
  "peugeot 2008": { dims: ["215/60R17", "215/55R18"], type: "SUV" },
  "peugeot 3008": { dims: ["225/55R18", "235/55R19"], type: "SUV" },
  "citroen c3": { dims: ["195/65R15", "205/55R16"], type: "Hatchback" },
  "fiat 500": { dims: ["185/55R15", "195/45R16"], type: "City car" },
  "chery tiggo 4": { dims: ["215/55R18", "215/60R17"], type: "SUV" },
  "chery tiggo 7": { dims: ["225/60R18", "235/55R19"], type: "SUV" },
  "jac s3": { dims: ["205/55R17", "215/55R17"], type: "SUV" },
  "great wall haval h6": { dims: ["225/60R18", "235/55R19"], type: "SUV" },
  "mg zs": { dims: ["215/55R17", "215/50R18"], type: "SUV" },
  "mg hs": { dims: ["225/55R19", "235/50R19"], type: "SUV" },
  "ssangyong rexton": { dims: ["265/60R18", "255/55R19"], type: "SUV" },
  "ssangyong tivoli": { dims: ["215/60R17", "225/45R18"], type: "SUV" },
  "dfsk glory 580": { dims: ["225/60R18", "215/60R17"], type: "SUV" },
  // Motorcycles
  "honda cb190": { dims: ["120/80-17", "100/80-17"], type: "Motocicleta" },
  "yamaha fz": { dims: ["140/60R17", "100/80-17"], type: "Motocicleta" },
  "bajaj pulsar": { dims: ["130/70-17", "100/80-17"], type: "Motocicleta" },
  "suzuki gixxer": { dims: ["140/60R17", "100/80-17"], type: "Motocicleta" },
  "honda navi": { dims: ["120/80-12", "90/90-12"], type: "Motocicleta" },
  "yamaha nmax": { dims: ["130/70-13", "110/70-13"], type: "Scooter" },
  "akt ak125": { dims: ["90/90-18", "2.75-18"], type: "Motocicleta" },
  // Trucks
  "chevrolet nhr": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "chevrolet nqr": { dims: ["215/75R17.5", "235/75R17.5"], type: "Camion mediano" },
  "hino fc": { dims: ["215/75R17.5", "235/75R17.5"], type: "Camion mediano" },
  "hino 500": { dims: ["295/80R22.5", "11R22.5"], type: "Camion pesado" },
  "jac x350": { dims: ["215/75R17.5", "235/75R17.5"], type: "Camion mediano" },
  "hyundai hd65": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "hyundai hd45": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "foton aumark": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "jmc carrying": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  // Tractomulas
  "kenworth t680": { dims: ["295/80R22.5", "11R22.5", "315/80R22.5"], type: "Tractomula" },
  "kenworth t800": { dims: ["295/80R22.5", "11R22.5", "12R22.5"], type: "Tractomula" },
  "freightliner cascadia": { dims: ["295/80R22.5", "11R22.5", "315/80R22.5"], type: "Tractomula" },
  "international lt": { dims: ["295/80R22.5", "11R22.5"], type: "Tractomula" },
  "international prostar": { dims: ["295/80R22.5", "11R22.5"], type: "Tractomula" },
  "mack anthem": { dims: ["295/80R22.5", "11R22.5"], type: "Tractomula" },
  "volvo fh": { dims: ["295/80R22.5", "315/80R22.5"], type: "Tractomula" },
  "scania r": { dims: ["295/80R22.5", "315/80R22.5"], type: "Tractomula" },
  // Volquetas
  "kenworth t800 volqueta": { dims: ["12R24.5", "11R24.5", "315/80R22.5"], type: "Volqueta" },
  "international 7600": { dims: ["12R24.5", "11R24.5"], type: "Volqueta" },
  "mack granite": { dims: ["12R24.5", "11R24.5"], type: "Volqueta" },
  // Buses
  "mercedes of": { dims: ["275/80R22.5", "295/80R22.5"], type: "Bus" },
  "mercedes o500": { dims: ["295/80R22.5", "275/80R22.5"], type: "Bus" },
  "marcopolo": { dims: ["295/80R22.5", "275/80R22.5"], type: "Bus" },
  "chevrolet lv150": { dims: ["215/75R17.5", "235/75R17.5"], type: "Bus urbano" },
  "hino ak": { dims: ["275/80R22.5", "295/80R22.5"], type: "Bus" },
};

function findVehicleDims(input: string): { match: string; type: string; dims: string[] } | null {
  const q = input.toLowerCase().trim();
  // Exact match
  if (VEHICLE_DB[q]) return { match: q, type: VEHICLE_DB[q].type, dims: VEHICLE_DB[q].dims };
  // Partial match
  for (const [key, val] of Object.entries(VEHICLE_DB)) {
    if (key.includes(q) || q.includes(key)) return { match: key, type: val.type, dims: val.dims };
  }
  // Word match (e.g. "hilux" matches "toyota hilux")
  for (const [key, val] of Object.entries(VEHICLE_DB)) {
    const words = q.split(/\s+/);
    if (words.some(w => w.length >= 3 && key.includes(w))) return { match: key, type: val.type, dims: val.dims };
  }
  return null;
}

type AssistantStep = "closed" | "vehicle" | "dimension" | "budget" | "results";
type ChatMsg = { from: "bot" | "user"; text: string };

function TireAssistant({ onSearch }: { onSearch: (q: string) => void }) {
  const [step, setStep] = useState<AssistantStep>("closed");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [vehicleInput, setVehicleInput] = useState("");
  const [selectedDim, setSelectedDim] = useState("");
  const [budget, setBudget] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [foundDims, setFoundDims] = useState<string[]>([]);

  function open() {
    setStep("vehicle");
    setMsgs([{ from: "bot", text: "Hola! Te ayudo a encontrar la llanta perfecta. ¿Que vehiculo tienes? (ej: Kia Picanto, Toyota Hilux, Renault Logan...)" }]);
    setVehicleInput(""); setSelectedDim(""); setBudget(""); setResults([]); setFoundDims([]);
  }

  function close() {
    setStep("closed"); setMsgs([]);
  }

  function searchVehicle() {
    if (!vehicleInput.trim()) return;
    const result = findVehicleDims(vehicleInput);
    if (result) {
      setFoundDims(result.dims);
      setMsgs(prev => [...prev,
        { from: "user", text: vehicleInput },
        { from: "bot", text: `${result.match.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} (${result.type}) usa estas medidas. ¿Cual necesitas?` },
      ]);
      setStep("dimension");
    } else {
      setMsgs(prev => [...prev,
        { from: "user", text: vehicleInput },
        { from: "bot", text: `No tengo "${vehicleInput}" en mi base de datos. Puedes seleccionar el tipo de vehiculo o escribir la dimension directamente (ej: 225/55R18):` },
      ]);
      setFoundDims([]);
      setStep("dimension");
    }
    setVehicleInput("");
  }

  function pickVehicleType(key: string) {
    const v = VEHICLE_TIRE_MAP[key];
    if (!v) return;
    setFoundDims(v.dimensions);
    setMsgs(prev => [...prev,
      { from: "user", text: v.label },
      { from: "bot", text: `${v.label} — estas son las dimensiones mas comunes. ¿Cual necesitas?` },
    ]);
  }

  function pickDimension(dim: string) {
    setSelectedDim(dim);
    setMsgs(prev => [...prev,
      { from: "user", text: dim },
      { from: "bot", text: `Perfecto, ${dim}. ¿Cual es tu presupuesto maximo por llanta? (en pesos COP)` },
    ]);
    setStep("budget");
  }

  async function submitBudget() {
    const maxPrice = parseInt(budget.replace(/\D/g, ""));
    if (!maxPrice || maxPrice < 10000) return;

    setMsgs(prev => [...prev,
      { from: "user", text: `$${maxPrice.toLocaleString("es-CO")}` },
      { from: "bot", text: "Buscando las mejores opciones..." },
    ]);
    setLoading(true);

    try {
      // Search both with and without space before R to match all formats
      const dimNoSpace = selectedDim.replace(/\s+/g, "");
      const dimWithSpace = dimNoSpace.replace(/(\d)R(\d)/g, "$1 R$2");
      const p = new URLSearchParams({ search: dimNoSpace === "custom" ? budget : dimWithSpace, limit: "20", sortBy: "price_asc" });
      const res = await fetch(`${API_BASE}/marketplace/listings?${p}`);
      if (res.ok) {
        const data = await res.json();
        const listings = (data.listings ?? []).filter((l: any) => l.precioCop <= maxPrice);

        // Sort by best value: prefer those with km estimates (higher = better)
        listings.sort((a: any, b: any) => {
          const aKm = a.catalog?.kmEstimadosReales ?? 0;
          const bKm = b.catalog?.kmEstimadosReales ?? 0;
          if (bKm !== aKm) return bKm - aKm;
          return a.precioCop - b.precioCop;
        });

        setResults(listings.slice(0, 5));

        if (listings.length === 0) {
          setMsgs(prev => [...prev.slice(0, -1),
            { from: "bot", text: `No encontre llantas ${selectedDim} por menos de $${maxPrice.toLocaleString("es-CO")}. Intenta con un presupuesto mayor o busca directamente.` },
          ]);
        } else {
          const best = listings[0];
          const bestKm = best.catalog?.kmEstimadosReales;
          const recText = bestKm
            ? `Encontre ${listings.length} opciones. Te recomiendo ${best.marca} ${best.modelo} a $${best.precioCop.toLocaleString("es-CO")} — tiene ${bestKm.toLocaleString("es-CO")} km estimados de vida, el mejor rendimiento en tu rango.`
            : `Encontre ${listings.length} opciones. La mas economica es ${best.marca} ${best.modelo} a $${best.precioCop.toLocaleString("es-CO")}.`;
          setMsgs(prev => [...prev.slice(0, -1), { from: "bot", text: recText }]);
        }
        setStep("results");
      }
    } catch { /* */ }
    setLoading(false);
  }

  const fmtCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  if (step === "closed") {
    return (
      <button onClick={open}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        style={{ background: "#0A183A", color: "white" }}>
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs font-bold">¿Necesitas ayuda?</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: "70vh", border: "1px solid rgba(10,24,58,0.1)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#62b8f0]" />
          <span className="text-sm font-bold text-white">Asistente TirePro</span>
        </div>
        <button onClick={close} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ minHeight: 200 }}>
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.from === "user"
                ? "bg-[#1E76B6] text-white rounded-br-sm"
                : "bg-gray-100 text-[#0A183A] rounded-bl-sm"
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Results cards */}
        {step === "results" && results.length > 0 && (
          <div className="space-y-2 pt-1">
            {results.map((l) => {
              const cover = l.imageUrls?.[l.coverIndex ?? 0] ?? l.imageUrls?.[0];
              return (
                <a key={l.id} href={`/marketplace/product/${l.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-[#1E76B6]/30 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {cover ? <img src={cover} alt={`${l.marca} ${l.modelo}`} className="w-full h-full object-contain p-1" /> : <Package className="w-5 h-5 text-gray-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase">{l.marca}</p>
                    <p className="text-xs font-bold text-[#0A183A] truncate">{l.modelo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black text-[#0A183A]">{fmtCOP(l.precioCop)}</span>
                      {l.catalog?.kmEstimadosReales && (
                        <span className="text-[9px] text-green-600 font-bold">{Math.round(l.catalog.kmEstimadosReales / 1000)}K km</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}>
        {step === "vehicle" && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={vehicleInput}
              onChange={(e) => setVehicleInput(e.target.value)}
              placeholder="Ej: Kia Picanto, Toyota Hilux..."
              autoFocus
              className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-gray-50 border border-gray-200 text-[#0A183A] placeholder-gray-400 focus:outline-none focus:border-[#1E76B6]"
              onKeyDown={(e) => { if (e.key === "Enter") searchVehicle(); }}
            />
            <button onClick={searchVehicle} disabled={!vehicleInput.trim()}
              className="p-2.5 rounded-xl text-white disabled:opacity-30 transition-all" style={{ background: "#1E76B6" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "dimension" && (
          <div className="space-y-2">
            {foundDims.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {foundDims.map((dim) => (
                  <button key={dim} onClick={() => pickDimension(dim)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#1E76B6" }}>
                    {dim}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Dimension (ej: 225/55R18)"
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-gray-50 border border-gray-200 text-[#0A183A] placeholder-gray-400 focus:outline-none focus:border-[#1E76B6]"
                    onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) pickDimension(v); } }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(VEHICLE_TIRE_MAP).map(([key, val]) => (
                    <button key={key} onClick={() => pickVehicleType(key)}
                      className="px-2 py-2 rounded-lg text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-[#1E76B6]/5 hover:border-[#1E76B6]/20 hover:text-[#0A183A] transition-all text-center">
                      {val.label.split(" / ")[0]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === "budget" && (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Ej: 800000"
                autoFocus
                className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm bg-gray-50 border border-gray-200 text-[#0A183A] placeholder-gray-400 focus:outline-none focus:border-[#1E76B6]"
                onKeyDown={(e) => { if (e.key === "Enter") submitBudget(); }}
              />
            </div>
            <button onClick={submitBudget} disabled={loading || !budget}
              className="p-2.5 rounded-xl text-white disabled:opacity-30 transition-all"
              style={{ background: "#1E76B6" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "results" && (
          <div className="flex gap-2">
            <button onClick={() => { onSearch(selectedDim.replace(/\s+/g, "").replace(/(\d)R(\d)/g, "$1 R$2")); close(); }}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
              style={{ background: "#1E76B6" }}>
              Ver todos en {selectedDim}
            </button>
            <button onClick={open}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
              Reiniciar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================

const VEHICLE_TIRE_MAP: Record<string, { label: string; dimensions: string[] }> = {
  tractocamion: { label: "Tractocamion / Tractomula", dimensions: ["295/80R22.5", "11R22.5", "315/80R22.5"] },
  camion:       { label: "Camion", dimensions: ["295/80R22.5", "11R22.5", "12R22.5"] },
  volqueta:     { label: "Volqueta", dimensions: ["12R24.5", "11R24.5", "315/80R22.5"] },
  bus:          { label: "Bus", dimensions: ["295/80R22.5", "275/80R22.5", "11R22.5"] },
  buseta:       { label: "Buseta / Microbus", dimensions: ["215/75R17.5", "235/75R17.5", "7.50R16"] },
  camioneta:    { label: "Camioneta / Pickup", dimensions: ["235/75R15", "265/70R16", "245/70R16"] },
  campero:      { label: "Campero / SUV", dimensions: ["265/70R16", "245/70R16", "235/75R15"] },
  automovil:    { label: "Automovil / Sedan", dimensions: ["195/65R15", "205/55R16", "215/60R16"] },
  furgon:       { label: "Furgon", dimensions: ["215/75R17.5", "235/75R17.5", "7.50R16"] },
};

// =============================================================================
// Hero Carousel
// =============================================================================

// NOTE: must be a cdn.pixabay.com URL — the pixabay.com/images/download/* path
// serves a self-signed cert and browsers reject it (ERR_CERT_AUTHORITY_INVALID).
const HERO_BG    = "https://cdn.pixabay.com/photo/2015/05/26/09/33/canada-784392_1280.jpg";
const HERO_BG_SM = "https://cdn.pixabay.com/photo/2015/05/26/09/33/canada-784392_960_720.jpg";

// =============================================================================
// ResultsSidebar — desktop filters column for the results page
// =============================================================================

function ResultsSidebar({
  filters,
  marca, setMarca,
  dimension, setDimension,
  tipo, setTipo,
  distributorId, setDistributorId,
  clearFilters,
}: {
  filters: Filters;
  marca: string; setMarca: (v: string) => void;
  dimension: string; setDimension: (v: string) => void;
  tipo: string; setTipo: (v: string) => void;
  distributorId: string; setDistributorId: (v: string) => void;
  clearFilters: () => void;
}) {
  const activeCount = [marca, dimension, tipo, distributorId].filter(Boolean).length;
  const sectionTitle = "text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2";

  return (
    <div
      className="bg-white rounded-2xl p-4 sticky top-20"
      style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.12), 0 0 0 1px rgba(30,118,182,0.06)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-black text-[#0A183A]">Filtros</p>
        {activeCount > 0 && (
          <button onClick={clearFilters} className="text-[10px] font-black text-red-500 hover:underline">
            Limpiar ({activeCount})
          </button>
        )}
      </div>

      {/* Tipo */}
      <div className="mb-5">
        <p className={sectionTitle}>Tipo</p>
        <div className="space-y-1">
          {[{ v: "", l: "Todas" }, { v: "nueva", l: "Nuevas" }, { v: "reencauche", l: "Reencauche" }].map((t) => (
            <button
              key={t.v || "all"}
              onClick={() => setTipo(t.v)}
              className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: tipo === t.v ? "rgba(30,118,182,0.08)" : "transparent",
                color: tipo === t.v ? "#1E76B6" : "#555",
                fontWeight: tipo === t.v ? 800 : 500,
              }}
            >
              <span
                className="w-3 h-3 rounded-full border flex items-center justify-center"
                style={{ borderColor: tipo === t.v ? "#1E76B6" : "#cbd5e1" }}
              >
                {tipo === t.v && <span className="w-1.5 h-1.5 rounded-full bg-[#1E76B6]" />}
              </span>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Dimensión */}
      {filters.dimensions.length > 0 && (
        <div className="mb-5">
          <p className={sectionTitle}>Dimensión</p>
          <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
            {filters.dimensions.slice(0, 30).map((d) => (
              <button
                key={d}
                onClick={() => setDimension(dimension === d ? "" : d)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate"
                style={{
                  background: dimension === d ? "rgba(30,118,182,0.08)" : "transparent",
                  color: dimension === d ? "#1E76B6" : "#555",
                  fontWeight: dimension === d ? 800 : 500,
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Marca */}
      {filters.marcas.length > 0 && (
        <div className="mb-5">
          <p className={sectionTitle}>Marca</p>
          <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
            {filters.marcas.slice(0, 30).map((m) => (
              <button
                key={m}
                onClick={() => setMarca(marca === m ? "" : m)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate"
                style={{
                  background: marca === m ? "rgba(30,118,182,0.08)" : "transparent",
                  color: marca === m ? "#1E76B6" : "#555",
                  fontWeight: marca === m ? 800 : 500,
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Distribuidor */}
      {filters.distributors.length > 0 && (
        <div>
          <p className={sectionTitle}>Distribuidor</p>
          <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
            {filters.distributors.slice(0, 30).map((d) => (
              <button
                key={d.id}
                onClick={() => setDistributorId(distributorId === d.id ? "" : d.id)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate"
                style={{
                  background: distributorId === d.id ? "rgba(30,118,182,0.08)" : "transparent",
                  color: distributorId === d.id ? "#1E76B6" : "#555",
                  fontWeight: distributorId === d.id ? 800 : 500,
                }}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ProductRow — Amazon-style full-width result row
// =============================================================================

function ProductRow({ l, brandsMap }: { l: Listing; brandsMap?: BrandsMap }) {
  const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
  const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
  const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
  const price = hasPromo ? l.precioPromo! : l.precioCop;
  const discount = hasPromo ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;
  const cpk = l.catalog?.crowdAvgCpk ?? l.catalog?.cpkEstimado;
  const reviewCount = l._count?.reviews ?? 0;
  const avgRating = (l.reviews && l.reviews.length > 0)
    ? (l.reviews.reduce((s, r) => s + r.rating, 0) / l.reviews.length)
    : 0;

  return (
    <Link
      href={`/marketplace/product/${l.id}`}
      className="group flex flex-col sm:flex-row gap-4 bg-white rounded-2xl p-4 hover:-translate-y-0.5 hover:shadow-2xl transition-all border border-gray-100"
    >
      {/* Image */}
      <div
        className="relative w-full sm:w-44 h-44 sm:h-40 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)", border: "1px solid rgba(30,118,182,0.06)" }}
      >
        {cover ? (
          <img src={cover} alt={`Llanta ${l.marca} ${l.modelo} ${l.dimension}${l.tipo === "reencauche" ? " reencauche" : ""} — Comprar en Colombia`} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <Package className="w-10 h-10 text-gray-200" />
        )}
        {hasPromo && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white"
            style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}
          >
            -{discount}%
          </span>
        )}
        {l.tipo === "reencauche" && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black text-purple-700 bg-purple-100/90 backdrop-blur-sm flex items-center gap-0.5">
            <Recycle className="w-2.5 h-2.5" /> Reenc.
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">
          <BrandLink marca={l.marca} brandsMap={brandsMap}
            className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest" />
          <h3 className="text-base sm:text-lg font-black text-[#0A183A] leading-snug group-hover:text-[#1E76B6] transition-colors line-clamp-2 mt-0.5">
            {l.modelo}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-bold text-[#0A183A]">{l.dimension}</span>
            {l.eje && <> · Eje {l.eje}</>}
            {l.tipo === "reencauche" ? " · Reencauche" : " · Nueva"}
          </p>

          {/* Reviews + meta chips */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {reviewCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3 h-3" fill={s <= Math.round(avgRating) ? "#f59e0b" : "none"} style={{ color: s <= Math.round(avgRating) ? "#f59e0b" : "#d1d5db" }} />
                  ))}
                </div>
                ({reviewCount})
              </span>
            )}
            {l.tiempoEntrega && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {l.tiempoEntrega}
              </span>
            )}
            {l.distributor?.name && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Truck className="w-2.5 h-2.5" />
                {l.distributor.name}
              </span>
            )}
          </div>

          {l.descripcion && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2 hidden sm:block whitespace-pre-line">{l.descripcion}</p>
          )}
        </div>
      </div>

      {/* Price column */}
      <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 sm:min-w-[140px] sm:text-right">
        <div>
          {hasPromo && (
            <p className="text-xs text-gray-400 line-through">{fmtCOP(l.precioCop)}</p>
          )}
          <p className="text-2xl sm:text-3xl font-black text-[#0A183A] tracking-tight leading-none">{fmtCOP(price)}</p>
          <p className="text-[10px] text-gray-400 mt-1">+ IVA</p>
        </div>
        <span
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black text-white sm:mt-2"
          style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
        >
          Ver llanta
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

// =============================================================================
// SearchablePicker — typeahead replacement for plain <select> when there are
// many options (e.g. marca, distribuidor).
// =============================================================================

function SearchablePicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = React.useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-gray-200 bg-white text-[#555] whitespace-nowrap hover:border-[#1E76B6]/40 transition-colors"
      >
        <span className="truncate max-w-[120px]">{selected ? selected.label : label}</span>
        <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 mt-1.5 z-30 w-60 rounded-2xl bg-white overflow-hidden"
          style={{ boxShadow: "0 12px 32px -10px rgba(10,24,58,0.22), 0 0 0 1px rgba(30,118,182,0.08)" }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}…`}
                className="w-full pl-8 pr-2 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
                className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50"
              >
                Limpiar selección
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-3">Sin resultados</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F0F7FF] transition-colors truncate"
                  style={{
                    color: o.value === value ? "#1E76B6" : "#0A183A",
                    fontWeight: o.value === value ? 700 : 400,
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Tighter, conversion-focused hero. Two-mode search (Medida vs. Marca/Modelo)
// keeps cognitive load low while covering both high-intent paths. Height
// clamped at 360–420px so the user sees Categories/Best Sellers without
// scrolling past the fold on mid-size screens.
function MarketplaceHero({
  dimensions,
  onSearchDimension,
  onSearchText,
}: {
  dimensions: string[];
  onSearchDimension: (d: string) => void;
  onSearchText: (q: string) => void;
}) {
  const [mode, setMode] = useState<"medida" | "texto">("medida");
  const [ancho, setAncho]   = useState("");
  const [perfil, setPerfil] = useState("");
  const [rin, setRin]       = useState("");
  const [text, setText]     = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "texto") {
      const q = text.trim();
      if (!q) return;
      onSearchText(q);
      if (typeof window !== "undefined") window.scrollTo({ top: 540, behavior: "smooth" });
      return;
    }
    const a = ancho.trim().replace(",", ".");
    const p = perfil.trim().replace(",", ".");
    const r = rin.trim().replace(",", ".").replace(/^r/i, "");
    if (!a && !p && !r) return;
    const built = a && p && r ? `${a}/${p} R${r}` : [a, p, r].filter(Boolean).join(" ");
    onSearchDimension(built);
    if (typeof window !== "undefined") window.scrollTo({ top: 540, behavior: "smooth" });
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4">
      <section
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden"
        style={{ minHeight: "clamp(360px, 42vw, 420px)" }}
      >
        <img
          src={HERO_BG_SM}
          srcSet={`${HERO_BG_SM} 1x, ${HERO_BG} 2x`}
          alt="Marketplace de llantas en Colombia — TirePro"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(10,24,58,0.92) 0%, rgba(23,61,104,0.82) 45%, rgba(30,118,182,0.55) 100%)",
          }}
        />

        <div className="relative flex flex-col justify-center gap-4 px-5 py-7 sm:px-10 sm:py-8 lg:px-16 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-widest w-fit">
            <Star className="w-3 h-3 text-yellow-300" />
            <span className="hidden xs:inline">Marketplace #1 de llantas en Colombia</span>
            <span className="xs:hidden">#1 en Colombia</span>
          </span>

          <h1 className="text-[28px] leading-[1.05] sm:text-5xl lg:text-[56px] font-black text-white tracking-tight">
            Compra llantas{" "}
            <span style={{ background: "linear-gradient(90deg,#f59e0b,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              al mejor precio
            </span>{" "}
            de Colombia
          </h1>
          <p className="text-[13px] sm:text-base text-white/80 max-w-xl leading-snug -mt-1">
            Distribuidores verificados, envío a todo el país, instalación incluida.
          </p>

          {/* Tab switcher — Medida (default, more common for fleet buyers) vs. Texto */}
          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div role="tablist" aria-label="Modo de búsqueda" className="flex gap-1 mb-2">
              {[
                { k: "medida", label: "Por medida" },
                { k: "texto",  label: "Por marca o modelo" },
              ].map((t) => {
                const active = mode === (t.k as typeof mode);
                return (
                  <button
                    key={t.k}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMode(t.k as typeof mode)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                    style={{
                      background: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.10)",
                      color: active ? "#0A183A" : "rgba(255,255,255,0.85)",
                      border: active ? "1px solid transparent" : "1px solid rgba(255,255,255,0.20)",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl">
              {mode === "medida" ? (
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div className="flex flex-col px-2">
                    <span className="text-[9px] font-bold text-[#1E76B6] uppercase tracking-wider mt-1">Ancho</span>
                    <input type="text" inputMode="numeric" value={ancho} onChange={(e) => setAncho(e.target.value)}
                      placeholder="295" aria-label="Ancho"
                      className="w-full bg-transparent outline-none text-base font-bold text-[#0A183A] placeholder-gray-300 pb-1.5" />
                  </div>
                  <div className="flex flex-col px-2 border-l border-gray-200">
                    <span className="text-[9px] font-bold text-[#1E76B6] uppercase tracking-wider mt-1">Perfil</span>
                    <input type="text" inputMode="numeric" value={perfil} onChange={(e) => setPerfil(e.target.value)}
                      placeholder="80" aria-label="Perfil"
                      className="w-full bg-transparent outline-none text-base font-bold text-[#0A183A] placeholder-gray-300 pb-1.5" />
                  </div>
                  <div className="flex flex-col px-2 border-l border-gray-200">
                    <span className="text-[9px] font-bold text-[#1E76B6] uppercase tracking-wider mt-1">Rin</span>
                    <input type="text" inputMode="decimal" value={rin} onChange={(e) => setRin(e.target.value)}
                      placeholder="22.5" aria-label="Rin"
                      className="w-full bg-transparent outline-none text-base font-bold text-[#0A183A] placeholder-gray-300 pb-1.5" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center flex-1 px-3">
                  <Search className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
                  <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                    placeholder="Hankook DM04, Michelin XZE2..." aria-label="Buscar por marca o modelo"
                    className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-[#0A183A] placeholder-gray-400 px-2 py-2.5" />
                </div>
              )}
              <button type="submit"
                className="px-5 sm:px-6 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>

            {mode === "medida" && dimensions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="text-[10px] text-white/60 self-center mr-1">Populares:</span>
                {dimensions.slice(0, 5).map((d) => (
                  <button key={d} type="button" onClick={() => onSearchDimension(d)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all">
                    {d}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Inline trust pills — visible on first paint */}
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/75">
            <li className="inline-flex items-center gap-1"><Shield className="w-3 h-3 text-[#62b8f0]" /> Distribuidores verificados</li>
            <li className="inline-flex items-center gap-1"><Truck className="w-3 h-3 text-[#62b8f0]" /> Envío nacional</li>
            <li className="inline-flex items-center gap-1"><CreditCard className="w-3 h-3 text-[#62b8f0]" /> Pago seguro</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// Categorías
// =============================================================================

// Categories are matched by rim size (the most reliable signal in the
// dimension string). Each category lists the rim sizes that belong to it
// — clicking the category sends the user to the filtered results page.
const CATEGORIES: Array<{
  key: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bg?: { src1x: string; src2x: string };
  rims: string[];
}> = [
  {
    key: "auto",
    label: "Auto y Camioneta",
    sub: "Vehículos livianos y SUV",
    icon: Car,
    gradient: "linear-gradient(135deg,#1E76B6 0%,#348CCB 100%)",
    bg: {
      src1x: "https://cdn.pixabay.com/photo/2018/03/31/12/11/car-3278002_960_720.jpg",
      src2x: "https://cdn.pixabay.com/photo/2018/03/31/12/11/car-3278002_1280.jpg",
    },
    // Rim sizes typical for sedans, SUV and pickups.
    rims: ["13", "14", "15", "16", "17", "18", "19", "20", "21"],
  },
  {
    key: "camion",
    label: "Camión",
    sub: "Carga pesada y flota",
    icon: Truck,
    gradient: "linear-gradient(135deg,#0A183A 0%,#1E76B6 100%)",
    bg: {
      src1x: "https://cdn.pixabay.com/photo/2019/10/30/06/19/truck-4588791_960_720.jpg",
      src2x: "https://cdn.pixabay.com/photo/2019/10/30/06/19/truck-4588791_1280.jpg",
    },
    // Standard truck/bus rim sizes.
    rims: ["17.5", "19.5", "22.5", "24.5"],
  },
  {
    key: "industrial",
    label: "Industrial",
    sub: "Maquinaria y agrícola",
    icon: Factory,
    gradient: "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)",
    // OTR / industrial rims.
    rims: ["24", "25", "26", "27", "29", "33", "35", "49", "51", "57", "63"],
  },
];

function CategoriesSection({
  onPick,
  availableDimensions,
}: {
  onPick: (rims: string[], label: string) => void;
  availableDimensions: string[];
}) {
  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-7 sm:pt-8">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-base sm:text-xl font-black text-[#0A183A]">Categorías</h2>
        <p className="text-xs text-gray-500 hidden sm:block">Encuentra llantas según tu tipo de vehículo</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          // Only show categories that have at least one matching dimension
          // in the available catalog — otherwise the click leads to "Sin
          // resultados".
          const hasMatch = availableDimensions.some((d) =>
            c.rims.some((r) => new RegExp(`\\bR${r.replace(".", "\\.")}\\b`, "i").test(d))
          );
          if (!hasMatch && availableDimensions.length > 0) return null;
          return (
            <button
              key={c.key}
              onClick={() => onPick(c.rims, c.label)}
              className="group relative rounded-2xl overflow-hidden text-left transition-all hover:-translate-y-1 hover:shadow-2xl h-32 sm:h-40"
              style={{ background: c.gradient }}
            >
              {c.bg && (
                <img
                  src={c.bg.src1x}
                  srcSet={`${c.bg.src1x} 1x, ${c.bg.src2x} 2x`}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {c.bg && (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(10,24,58,0.75) 0%, rgba(23,61,104,0.55) 55%, rgba(30,118,182,0.35) 100%)",
                  }}
                />
              )}
              {!c.bg && (
                <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:opacity-25 transition-opacity">
                  <Icon className="w-44 h-44 text-white" />
                </div>
              )}
              <div className="relative h-full flex flex-col justify-between p-3 sm:p-5">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-white/70 uppercase tracking-widest hidden sm:block">Categoría</p>
                  <h3 className="text-sm sm:text-xl font-black text-white leading-tight drop-shadow">{c.label}</h3>
                  <p className="text-[10px] sm:text-[11px] text-white/80 mt-0.5 hidden xs:block">{c.sub}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Trust band — 4 micro-cards establishing credibility right after the hero.
// Conversion role: addresses the "is this real?" concern in <2 seconds before
// the user has to think about it. Mobile collapses to a 2x2 grid.
// =============================================================================

const TRUST_ITEMS: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; sub: string }> = [
  { icon: Shield,     title: "Distribuidores verificados", sub: "Cada vendedor pasa nuestro filtro de calidad." },
  { icon: Truck,      title: "Envío a toda Colombia",      sub: "Bogotá, Medellín, Cali, Barranquilla y más." },
  { icon: CreditCard, title: "Pago 100% seguro",            sub: "Tarjeta, PSE, Nequi. Compra protegida." },
];

function TrustBand() {
  return (
    <section
      aria-labelledby="trust-band-heading"
      className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8"
    >
      <h2 id="trust-band-heading" className="sr-only">Por qué comprar llantas en TirePro</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {TRUST_ITEMS.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.title}
              className="flex items-start gap-3 p-3 sm:p-4 rounded-2xl bg-white border border-gray-100"
              style={{ boxShadow: "0 4px 14px -8px rgba(10,24,58,0.12)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,rgba(30,118,182,0.10),rgba(52,140,203,0.05))", border: "1px solid rgba(30,118,182,0.15)" }}>
                <Icon className="w-4 h-4 text-[#1E76B6]" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] sm:text-sm font-black text-[#0A183A] leading-tight">{t.title}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 leading-snug mt-0.5 hidden sm:block">{t.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// =============================================================================
// Top-brands strip — visual entry points to the highest-intent brand pages.
// Drives both internal-link SEO ("Hankook Colombia", "Michelin tractomula")
// and one-click navigation for users who already know the brand they want.
// =============================================================================

function BrandsStrip({ brandsMap, stockedSlugs }: { brandsMap: BrandsMap; stockedSlugs: Set<string> }) {
  // Show EVERY stocked brand. Curated preferences float to the front so
  // the major Colombian fleet brands (Michelin, Bridgestone, etc.) are
  // immediately visible; the rest are appended alphabetically so the
  // strip is exhaustive without losing visual hierarchy.
  const PREFERRED = [
    "Michelin", "Bridgestone", "Continental", "Goodyear",
    "Hankook", "Pirelli", "Yokohama", "Firestone",
  ];
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const curated = PREFERRED
    .map((name) => {
      for (const meta of brandsMap.values()) {
        if (norm(meta.name) === norm(name) && stockedSlugs.has(meta.slug)) return meta;
      }
      return null;
    })
    .filter((b): b is BrandMeta => b !== null);

  const haveSlug = new Set(curated.map((b) => b.slug));
  const rest: BrandMeta[] = [];
  for (const meta of brandsMap.values()) {
    if (!haveSlug.has(meta.slug) && stockedSlugs.has(meta.slug)) rest.push(meta);
  }
  rest.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  const items = [...curated, ...rest];

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="brands-heading"
      className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-7 sm:pt-8"
    >
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 id="brands-heading" className="text-base sm:text-xl font-black text-[#0A183A]">
            Marcas más vendidas
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
            Las preferidas por flotas y conductores en Colombia.
          </p>
        </div>
        <Link href="/marketplace?todos=1" className="text-[11px] font-bold text-[#1E76B6] hover:underline whitespace-nowrap">
          Ver todas →
        </Link>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
        {items.map((b) => (
          <Link key={b.slug} href={`/marketplace/brand/${b.slug}`}
            className="group flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#1E76B6]/40 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#fafafa] flex items-center justify-center overflow-hidden p-1">
              {b.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={b.logoUrl} alt={`Llantas ${b.name} en Colombia`} className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-base font-black text-[#0A183A]">{b.name.charAt(0)}</span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#0A183A] text-center leading-tight truncate w-full">{b.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// Deals strip — only listings with an active promo. High-conversion zone:
// urgency cue + visible discount in COP.
// =============================================================================

function DealsStrip({ listings, brandsMap }: { listings: Listing[]; brandsMap?: BrandsMap }) {
  const fmtCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  const deals = listings.filter((l) =>
    l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date()
  );

  if (deals.length === 0) return null;

  return (
    <section
      aria-labelledby="deals-heading"
      className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-7 sm:pt-8"
    >
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 id="deals-heading" className="text-base sm:text-xl font-black text-[#0A183A] inline-flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#1E76B6]" />
            Ofertas destacadas
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
            Promociones por tiempo limitado de distribuidores verificados.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {deals.slice(0, 8).map((l) => {
          const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
          const cover = imgs[l.coverIndex ?? 0] ?? imgs[0];
          const discount = Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100);
          const meta = brandsMap?.get(l.marca);
          return (
            <Link key={l.id} href={`/marketplace/product/${l.id}`}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#1E76B6]/30 hover:shadow-lg hover:-translate-y-0.5 transition-all group block">
              <div className="relative aspect-square flex items-center justify-center overflow-hidden bg-[#fafafa]">
                {cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={cover}
                    alt={`Llanta ${l.marca} ${l.modelo} ${l.dimension} con descuento — Comprar en Colombia`}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Package className="w-10 h-10 text-gray-200" />
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-red-500 shadow-sm">
                  -{discount}%
                </span>
                {meta?.logoUrl && (
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-sm p-1 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={meta.logoUrl} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest truncate">{l.marca}</p>
                <p className="text-sm font-black text-[#0A183A] leading-snug truncate">{l.modelo}</p>
                <p className="text-[10px] text-gray-400">{l.dimension}</p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-base font-black text-[#0A183A]">{fmtCOP(l.precioPromo!)}</span>
                  <span className="text-[10px] text-gray-400 line-through">{fmtCOP(l.precioCop)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// =============================================================================
// How it works — 3-step strip. Sets buyer expectations and answers "what
// happens after I click?" before the user has to ask.
// =============================================================================

function HowItWorks() {
  const steps = [
    { n: "01", icon: Search,       title: "Busca tu llanta",     sub: "Por medida, marca, modelo o vehículo." },
    { n: "02", icon: Sparkles,     title: "Compara y elige",     sub: "Precios y opciones de distribuidores verificados." },
    { n: "03", icon: ShoppingCartIcon, title: "Compra y recibe",  sub: "Pago seguro. Envío e instalación incluidos." },
  ];
  return (
    <section
      aria-labelledby="howitworks-heading"
      className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-10"
    >
      <h2 id="howitworks-heading" className="text-base sm:text-xl font-black text-[#0A183A] mb-3">
        Cómo funciona
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="relative p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 overflow-hidden"
              style={{ boxShadow: "0 4px 14px -8px rgba(10,24,58,0.10)" }}>
              <div className="absolute -top-4 -right-2 text-[64px] leading-none font-black text-[#0A183A]/[0.04] select-none">{s.n}</div>
              <div className="relative flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0A183A]">{s.title}</p>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{s.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Local cart icon — keeps imports minimal (HowItWorks needs it).
function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

// =============================================================================
// SEO link block — dense internal-linking section. Boosts keyword coverage
// for high-volume queries like "llantas Bogotá", "llantas 295/80R22.5",
// "comprar llantas Hankook", and feeds Googlebot a discovery surface for
// brand + dimension + city pages.
// =============================================================================

const SEO_CITIES = [
  "Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga",
  "Cartagena", "Pereira", "Cúcuta", "Ibagué", "Manizales",
];
const SEO_DIMENSIONS = [
  "295/80R22.5", "11R22.5", "315/80R22.5", "12R22.5",
  "265/70R16", "285/60R18", "205/55R16", "195/65R15",
];
const SEO_USES = [
  { q: "tractomula",   label: "Llantas para tractomula" },
  { q: "camion",       label: "Llantas para camión" },
  { q: "bus",          label: "Llantas para bus" },
  { q: "camioneta",    label: "Llantas para camioneta" },
  { q: "reencauche",   label: "Llantas reencauchadas" },
];

function SeoLinkBlock({ brandsMap }: { brandsMap: BrandsMap }) {
  const PREFERRED = ["Michelin", "Bridgestone", "Continental", "Goodyear", "Hankook", "Pirelli", "Yokohama", "Firestone"];
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const brandLinks = PREFERRED
    .map((name) => {
      for (const meta of brandsMap.values()) if (norm(meta.name) === norm(name)) return meta;
      return null;
    })
    .filter((b): b is BrandMeta => b !== null);

  return (
    <section
      aria-labelledby="seo-links-heading"
      className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-10 pb-4"
    >
      <div className="rounded-2xl bg-white border border-gray-100 p-5 sm:p-7"
        style={{ boxShadow: "0 4px 14px -8px rgba(10,24,58,0.10)" }}>
        <h2 id="seo-links-heading" className="text-base sm:text-lg font-black text-[#0A183A] mb-4">
          Compra llantas en Colombia
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {brandLinks.length > 0 && (
            <div>
              <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Por marca</h3>
              <ul className="space-y-1.5">
                {brandLinks.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/marketplace/brand/${b.slug}`} className="text-xs text-gray-600 hover:text-[#1E76B6] hover:underline">
                      Llantas {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Por uso</h3>
            <ul className="space-y-1.5">
              {SEO_USES.map((u) => (
                <li key={u.q}>
                  <Link href={`/marketplace?q=${encodeURIComponent(u.q)}`} className="text-xs text-gray-600 hover:text-[#1E76B6] hover:underline">
                    {u.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Por medida</h3>
            <ul className="space-y-1.5">
              {SEO_DIMENSIONS.map((d) => (
                <li key={d}>
                  <Link href={`/marketplace?q=${encodeURIComponent(d)}`} className="text-xs text-gray-600 hover:text-[#1E76B6] hover:underline">
                    Llantas {d}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Por ciudad</h3>
            <ul className="space-y-1.5">
              {SEO_CITIES.map((c) => (
                <li key={c}>
                  <Link href={`/marketplace?q=${encodeURIComponent(c)}`} className="text-xs text-gray-600 hover:text-[#1E76B6] hover:underline">
                    Llantas en {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Llantas más vendidas — horizontal scroller
// =============================================================================

function BestSellersScroller({ listings, brandsMap, title, subtitle }: { listings: Listing[]; brandsMap?: BrandsMap; title?: string; subtitle?: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.7), behavior: "smooth" });
  }
  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-10">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base sm:text-xl font-black text-[#0A183A]">{title ?? "Llantas más vendidas"}</h2>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{subtitle ?? "Las favoritas de las flotas en Colombia"}</p>
        </div>
        <div className="hidden sm:flex gap-1.5">
          <button onClick={() => scroll(-1)} aria-label="Anterior"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:shadow-md transition-all">
            <ChevronLeft className="w-4 h-4 text-[#0A183A]" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Siguiente"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:shadow-md transition-all">
            <ChevronRight className="w-4 h-4 text-[#0A183A]" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-hide scroll-smooth snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0"
      >
        {listings.map((l) => (
          <div key={l.id} className="flex-shrink-0 snap-start" style={{ width: "min(60vw, 220px)" }}>
            <ProductCard l={l} brandsMap={brandsMap} />
          </div>
        ))}
      </div>
    </div>
  );
}


// =============================================================================
// Product Card
// =============================================================================

function ProductCard({ l, brandsMap }: { l: Listing; brandsMap?: BrandsMap }) {
  const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
  const coverImg = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
  const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
  const price = hasPromo ? l.precioPromo! : l.precioCop;
  const cpk = l.catalog?.crowdAvgCpk ?? l.catalog?.cpkEstimado;
  const discount = hasPromo ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;
  const isReencauche = l.tipo === "reencauche";
  const reviewCount = l._count?.reviews ?? 0;
  const soldCount = l._count?.orders ?? 0;
  const avgRating = l.reviews && l.reviews.length > 0
    ? l.reviews.reduce((s, r) => s + r.rating, 0) / l.reviews.length : 0;

  return (
    <Link href={`/marketplace/product/${l.id}`}
      className="bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group block">

      {/* Image */}
      <div className="relative aspect-square flex items-center justify-center overflow-hidden bg-[#fafafa]">
        {coverImg ? (
          <img src={coverImg} alt={`Llanta ${l.marca} ${l.modelo} ${l.dimension}${l.tipo === "reencauche" ? " reencauche" : ""} — Comprar en Colombia`} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Package className="w-10 h-10 text-gray-200" />
            <p className="text-[9px] text-gray-300 font-medium">{l.marca}</p>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasPromo && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black text-white bg-red-500 shadow-sm">-{discount}%</span>
          )}
          {isReencauche && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-purple-700 bg-purple-100 flex items-center gap-0.5">
              <Recycle className="w-2.5 h-2.5" /> Reencauche
            </span>
          )}
        </div>

        {l.cantidadDisponible > 0 && l.cantidadDisponible <= 3 && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-bold text-orange-700 bg-orange-100">
            Ultimas {l.cantidadDisponible} unidades
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <BrandLink marca={l.marca} brandsMap={brandsMap}
          className="text-[10px] text-[#1E76B6] uppercase tracking-wider font-black" />
        <p className="text-sm font-bold text-[#111] mt-0.5 leading-snug line-clamp-2">{l.modelo}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{l.dimension}{l.eje ? ` · ${l.eje}` : ""}</p>

        {/* Stars */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3" style={{ color: s <= Math.round(avgRating) ? "#f59e0b" : "#e5e7eb" }} fill={s <= Math.round(avgRating) ? "#f59e0b" : "none"} />
              ))}
            </div>
            <span className="text-[9px] text-gray-400">({reviewCount})</span>
            {soldCount > 0 && <span className="text-[9px] text-gray-400 ml-1">&middot; {soldCount} vendido{soldCount !== 1 ? "s" : ""}</span>}
          </div>
        )}

        {/* Price */}
        <div className="mt-2.5">
          <span className="text-lg font-black text-[#111]">{fmtCOP(price)}</span>
          {hasPromo && (
            <span className="text-[11px] text-gray-400 line-through ml-1.5">{fmtCOP(l.precioCop)}</span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {l.catalog?.terreno && (
            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{l.catalog.terreno}</span>
          )}
          {l.catalog?.reencauchable && !isReencauche && (
            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">Reencauchable</span>
          )}
        </div>

        {/* Distributor + delivery */}
        <div className="mt-3 pt-2.5 flex items-center justify-between" style={{ borderTop: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {l.distributor.profileImage && l.distributor.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                <img src={l.distributor.profileImage} alt={`${l.distributor.name}`} className="w-full h-full object-contain" />
              ) : (
                <Store className="w-2.5 h-2.5 text-gray-400" />
              )}
            </div>
            <span className="text-[10px] text-gray-500 truncate">{l.distributor.name}</span>
          </div>
          {l.tiempoEntrega && (
            <span className="text-[9px] font-medium text-emerald-600 flex-shrink-0">{l.tiempoEntrega}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
