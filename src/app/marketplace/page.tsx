"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Loader2, Package, Truck, X, Store, MapPin,
  ChevronLeft, ChevronRight, Star,
  Recycle, Clock, Search, MessageCircle, Send, ArrowRight,
  Car, Factory,
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
  distributor: { id: string; name: string; profileImage: string };
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ dimensions: [], marcas: [], distributors: [] });

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [dimension, setDimension] = useState("");
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState(searchParams.get("tipo") ?? "");
  const [distributorId, setDistributorId] = useState("");
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
    // Only send ciudad as hard filter if user set it manually
    if (ciudad && ciudadManual) p.set("ciudad", ciudad);
    p.set("sortBy", sortBy);
    p.set("page", String(page));
    p.set("limit", "24");
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings?${p}`);
      if (res.ok) {
        const d = await res.json();
        setListings(d.listings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1);
        if (search) trackSearch(search, d.total ?? 0);
        if (dimension) trackFilter("dimension", dimension);
        if (marca) trackFilter("marca", marca);
        if (tipo) trackFilter("tipo", tipo);
      }
    } catch { /* */ }
    setLoading(false);
  }, [search, dimension, marca, tipo, distributorId, ciudad, ciudadManual, sortBy, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, dimension, marca, tipo, distributorId, ciudad, sortBy]);

  const activeFilters = [dimension, marca, tipo, distributorId, ciudadManual ? ciudad : ""].filter(Boolean).length;

  function clearFilters() { setDimension(""); setMarca(""); setTipo(""); setDistributorId(""); setCiudad(""); setCiudadManual(false); }

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

            <select value={marca} onChange={(e) => setMarca(e.target.value)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-gray-200 bg-white text-[#555] flex-shrink-0">
              <option value="">Marca</option>
              {filters.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-gray-200 bg-white text-[#555] flex-shrink-0">
              <option value="">Distribuidor</option>
              {filters.distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
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

      {/* ═══ NEW HERO — full-bleed background + SEO + buscar por medida ═══ */}
      {!search && !activeFilters && (
        <MarketplaceHero
          dimensions={filters.dimensions}
          onSearchDimension={(d) => setDimension(d)}
        />
      )}

      {/* ═══ CATEGORÍAS ═══ */}
      {!search && !activeFilters && (
        <CategoriesSection onPick={(q) => setSearch(q)} />
      )}

      {/* ═══ LLANTAS MÁS VENDIDAS — horizontal scroll ═══ */}
      {recommendations.listings.length > 0 && !search && !activeFilters && (
        <BestSellersScroller listings={recommendations.listings} />
      )}

      {/* ═══ DISTRIBUIDORES DESTACADOS (max 3) ═══ */}
      {filters.distributors.length > 0 && !distributorId && !search && !activeFilters && (
        <FeaturedDistributors distributors={filters.distributors.slice(0, 3)} />
      )}

      {/* ═══ MAPA DE DISTRIBUIDORES ═══ */}
      {filters.distributors.length > 0 && !search && !activeFilters && (
        <DistributorsMap distributors={filters.distributors} />
      )}

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
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          <>
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500"><span className="font-bold text-[#0A183A]">{total}</span> producto{total !== 1 ? "s" : ""}</p>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-[#333] hidden sm:block">
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="newest">Mas recientes</option>
              </select>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {listings.map((l) => <ProductCard key={l.id} l={l} />)}
            </div>

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
          </>
        )}
      </main>

      {/* ═══ CTA BANNER ═══ */}
      {!userHasCompany && (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="rounded-xl overflow-hidden relative flex items-center justify-between gap-4 px-5 sm:px-8 py-4" style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white leading-snug">¿Quieres llevar el detalle de tus llantas?</p>
            <p className="text-[10px] text-white/50 mt-0.5">TirePro 100% gratis — Desgaste, CPK, inventario.</p>
          </div>
          <Link href="/companyregister"
            className="px-4 py-2 rounded-full text-[11px] font-bold text-[#0A183A] bg-white hover:bg-gray-100 transition-colors flex-shrink-0">
            Comenzar Gratis
          </Link>
        </div>
      </div>
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

const HERO_BG = "https://cdn.pixabay.com/photo/2017/11/05/14/01/truck-2920533_1280.jpg";

function MarketplaceHero({
  dimensions,
  onSearchDimension,
}: {
  dimensions: string[];
  onSearchDimension: (d: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    onSearchDimension(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 600, behavior: "smooth" });
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <section
        className="relative rounded-3xl overflow-hidden"
        style={{ height: "clamp(380px, 52vw, 520px)" }}
      >
        <img
          src={HERO_BG}
          alt="Llantas para flotas y vehículos en Colombia — Marketplace TirePro"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(10,24,58,0.92) 0%, rgba(23,61,104,0.78) 45%, rgba(30,118,182,0.45) 100%)",
          }}
        />

        <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[10px] font-bold text-white uppercase tracking-widest w-fit mb-4">
            <Star className="w-3 h-3 text-yellow-300" />
            Marketplace #1 de llantas en Colombia
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
            Las mejores llantas
            <br />
            <span style={{ background: "linear-gradient(90deg,#f59e0b,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              al mejor precio
            </span>
          </h1>
          <p className="text-sm sm:text-base text-white/80 mt-3 max-w-xl">
            Compara llantas nuevas, reencauche e industriales de los distribuidores verificados de Colombia. Encuentra tu medida y cotiza en segundos.
          </p>

          {/* Buscar por medida */}
          <form onSubmit={handleSubmit} className="mt-6 max-w-xl">
            <label className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Buscar por medida
            </label>
            <div className="flex gap-2 p-1.5 rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
                <input
                  type="text"
                  list="hero-dimensions"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Ej: 295/80R22.5, 215/55R17…"
                  className="flex-1 bg-transparent outline-none text-sm text-[#0A183A] placeholder-gray-400 py-2.5"
                />
                <datalist id="hero-dimensions">
                  {dimensions.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              <button
                type="submit"
                className="px-5 sm:px-6 rounded-xl text-sm font-black text-white transition-all hover:opacity-95 active:scale-[0.98] flex items-center gap-2"
                style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
              >
                Buscar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {dimensions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] text-white/60 self-center mr-1">Populares:</span>
                {dimensions.slice(0, 5).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSearchDimension(d)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// Categorías
// =============================================================================

const CATEGORIES: Array<{
  key: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  query: string;
}> = [
  {
    key: "camion",
    label: "Camión",
    sub: "Carga pesada y flota",
    icon: Truck,
    gradient: "linear-gradient(135deg,#0A183A 0%,#1E76B6 100%)",
    query: "camion",
  },
  {
    key: "auto",
    label: "Auto y Camioneta",
    sub: "Vehículos livianos y SUV",
    icon: Car,
    gradient: "linear-gradient(135deg,#1E76B6 0%,#348CCB 100%)",
    query: "auto",
  },
  {
    key: "industrial",
    label: "Industrial",
    sub: "Maquinaria y agrícola",
    icon: Factory,
    gradient: "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)",
    query: "industrial",
  },
];

function CategoriesSection({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Categorías</h2>
        <p className="text-xs text-gray-500 hidden sm:block">Encuentra llantas según tu tipo de vehículo</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => onPick(c.query)}
              className="group relative rounded-2xl overflow-hidden text-left transition-all hover:-translate-y-1 hover:shadow-2xl"
              style={{ height: 160, background: c.gradient }}
            >
              <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:opacity-25 transition-opacity">
                <Icon className="w-44 h-44 text-white" />
              </div>
              <div className="relative h-full flex flex-col justify-between p-5">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Categoría</p>
                  <h3 className="text-xl font-black text-white leading-tight">{c.label}</h3>
                  <p className="text-[11px] text-white/70 mt-0.5">{c.sub}</p>
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
// Llantas más vendidas — horizontal scroller
// =============================================================================

function BestSellersScroller({ listings }: { listings: Listing[] }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.7), behavior: "smooth" });
  }
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Llantas más vendidas</h2>
          <p className="text-xs text-gray-500 mt-0.5">Las favoritas de las flotas en Colombia</p>
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
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-hide scroll-smooth snap-x snap-mandatory"
      >
        {listings.map((l) => (
          <div key={l.id} className="flex-shrink-0 snap-start" style={{ width: "min(72vw, 240px)" }}>
            <ProductCard l={l} />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Distribuidores destacados (max 3)
// =============================================================================

function FeaturedDistributors({ distributors }: { distributors: DistributorOption[] }) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Distribuidores destacados</h2>
          <p className="text-xs text-gray-500 mt-0.5">Verificados por TirePro</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {distributors.map((d) => (
          <Link
            key={d.id}
            href={`/marketplace/distributor/${d.id}`}
            className="group relative rounded-2xl bg-white border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all"
          >
            <div
              className="h-20"
              style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
            />
            <div className="px-5 pb-5 -mt-10">
              <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {d.profileImage && d.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                  <img src={d.profileImage} alt={d.name} className="w-full h-full object-contain p-1.5" />
                ) : (
                  <Store className="w-7 h-7 text-gray-300" />
                )}
              </div>
              <h3 className="mt-3 text-base font-black text-[#0A183A] truncate">{d.name}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                Distribuidor verificado
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1E76B6] group-hover:gap-2 transition-all">
                Ver catálogo <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Mapa de distribuidores — OpenStreetMap embed centered on Colombia
// =============================================================================

function DistributorsMap({ distributors }: { distributors: DistributorOption[] }) {
  // Bounding box covering mainland Colombia (lon_min,lat_min,lon_max,lat_max)
  const bbox = "-79.5,-4.5,-66.5,13.5";
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Distribuidores en Colombia</h2>
          <p className="text-xs text-gray-500 mt-0.5">{distributors.length} distribuidores en nuestra red</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 relative" style={{ minHeight: 380 }}>
          <iframe
            title="Mapa de distribuidores TirePro en Colombia"
            src={mapSrc}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
          />
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow text-[11px] font-bold text-[#0A183A] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1E76B6]" />
            Colombia
          </div>
        </div>
        <div className="p-4 sm:p-5 max-h-[420px] overflow-y-auto">
          <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-widest mb-2">Red TirePro</p>
          <div className="space-y-2">
            {distributors.map((d) => (
              <Link
                key={d.id}
                href={`/marketplace/distributor/${d.id}`}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {d.profileImage && d.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                    <img src={d.profileImage} alt={d.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Store className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0A183A] truncate">{d.name}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> Colombia
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Product Card
// =============================================================================

function ProductCard({ l }: { l: Listing }) {
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
          <img src={coverImg} alt={`${l.marca} ${l.modelo}`} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-300" />
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
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{l.marca}</p>
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
          {cpk != null && cpk > 0 && (
            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">CPK {fmtCOP(Math.round(cpk))}</span>
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
