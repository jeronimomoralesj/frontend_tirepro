"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Loader2, Package, Truck, X, Store, MapPin,
  ChevronLeft, ChevronRight, Star,
  Recycle, Clock,
} from "lucide-react";
import { useCart } from "../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../components/MarketplaceShell";

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

export default function PublicMarketplace() {
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
  const cart = useCart();

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
    fetch(`${API_BASE}/marketplace/listings/filters`)
      .then((r) => (r.ok ? r.json() : { dimensions: [], marcas: [], distributors: [] }))
      .then(setFilters).catch(() => {});
    // Fetch recent orders + recommendations
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (token && user.id) {
        fetch(`${API_BASE}/marketplace/orders/user?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : [])).then(setRecentOrders).catch(() => {});
        // Personalized recommendations
        fetch(`${API_BASE}/marketplace/recommendations?userId=${user.id}`)
          .then((r) => (r.ok ? r.json() : { type: "", listings: [] }))
          .then(setRecommendations).catch(() => {});
      } else {
        // Guest — popular/newest
        fetch(`${API_BASE}/marketplace/recommendations`)
          .then((r) => (r.ok ? r.json() : { type: "", listings: [] }))
          .then(setRecommendations).catch(() => {});
      }
    } catch {
      // Guest fallback
      fetch(`${API_BASE}/marketplace/recommendations`)
        .then((r) => (r.ok ? r.json() : { type: "", listings: [] }))
        .then(setRecommendations).catch(() => {});
    }
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (dimension) p.set("dimension", dimension);
    if (marca) p.set("marca", marca);
    if (tipo) p.set("tipo", tipo);
    if (distributorId) p.set("distributorId", distributorId);
    if (ciudad) p.set("ciudad", ciudad);
    p.set("sortBy", sortBy);
    p.set("page", String(page));
    p.set("limit", "24");
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings?${p}`);
      if (res.ok) { const d = await res.json(); setListings(d.listings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); }
    } catch { /* */ }
    setLoading(false);
  }, [search, dimension, marca, tipo, distributorId, ciudad, sortBy, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, dimension, marca, tipo, distributorId, ciudad, sortBy]);

  const activeFilters = [dimension, marca, tipo, distributorId, ciudad].filter(Boolean).length;

  function clearFilters() { setDimension(""); setMarca(""); setTipo(""); setDistributorId(""); setCiudad(""); }

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
            <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ciudad"
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

      {/* ═══ HERO CAROUSEL (full width) ═══ */}
      {!search && !activeFilters && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <HeroCarousel />
          {/* Category pills */}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setTipo("nueva")}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all hover:shadow-md"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)", color: "white" }}>
              Llantas Nuevas
            </button>
            <button onClick={() => setTipo("reencauche")}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all hover:shadow-md"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white" }}>
              Reencauche
            </button>
          </div>
        </div>
      )}

      {/* ═══ DISTRIBUTORS CAROUSEL ═══ */}
      {filters.distributors.length > 0 && !distributorId && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <h2 className="text-sm font-black text-[#0A183A] mb-3">Distribuidores verificados</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {filters.distributors.map((d) => (
              <Link key={d.id} href={`/marketplace/distributor/${d.id}`}
                className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
                style={{ minWidth: 180 }}>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {d.profileImage && d.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                    <img src={d.profileImage} alt={d.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Store className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0A183A] truncate">{d.name}</p>
                  <p className="text-[9px] text-gray-400">Ver catalogo</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RECENT PURCHASES ═══ */}
      {recentOrders.length > 0 && !search && !activeFilters && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
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
                    {cover ? <img src={cover} alt="" className="w-full h-full object-contain p-1" /> : <Package className="w-5 h-5 text-gray-200" />}
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

      {/* ═══ RECOMMENDATIONS ═══ */}
      {recommendations.listings.length > 0 && !search && !activeFilters && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <h2 className="text-sm font-black text-[#0A183A] mb-3">
            {recommendations.type === "personalized" ? "Recomendado para ti" : recommendations.type === "popular" ? "Mas vendidos" : "Productos destacados"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recommendations.listings.slice(0, 4).map((l) => (
              <ProductCard key={l.id} l={l} />
            ))}
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

      <MarketplaceFooter />

    </div>
  );
}

// =============================================================================
// Product Card
// =============================================================================

// =============================================================================
// Hero Carousel
// =============================================================================

const HERO_SLIDES = [
  {
    img: "https://mqplatform.blob.core.windows.net/attributeimageresized/caf4efd9-b23a-5f43-eb34-648c9d77bb36.png?sv=2025-05-05&ss=bfqt&srt=sco&st=2026-03-28T05%3A18%3A16Z&se=2026-03-30T05%3A18%3A16Z&sp=rwdxylacuptfi&sig=iGId38CRD3HDcQ4ie4CS3%2FJVt%2FgSSswt5VukinTAt%2F0%3D",
    title: "Las mejores llantas para tu flota",
    sub: "Encuentra ofertas de distribuidores verificados en toda Colombia",
  },
  {
    img: "https://mqplatform.blob.core.windows.net/attributeimageresized/3c4ab77f-0ba0-44b1-0eb9-d3a1224693ce.png?sv=2025-05-05&ss=bfqt&srt=sco&st=2026-03-28T05%3A18%3A16Z&se=2026-03-30T05%3A18%3A16Z&sp=rwdxylacuptfi&sig=iGId38CRD3HDcQ4ie4CS3%2FJVt%2FgSSswt5VukinTAt%2F0%3D",
    title: "Compara precios en segundos",
    sub: "Cotiza con multiples distribuidores y elige la mejor opcion",
  },
];

function HeroCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[idx];

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height: "clamp(180px, 30vw, 320px)" }}>
      {/* Image */}
      <div className="absolute inset-0 transition-opacity duration-700" key={idx}>
        <img src={slide.img} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>

      {/* Text */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight max-w-sm">{slide.title}</h2>
        <p className="text-sm text-white/70 mt-1 max-w-xs">{slide.sub}</p>
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="w-2 h-2 rounded-full transition-all"
            style={{ background: i === idx ? "white" : "rgba(255,255,255,0.4)" }} />
        ))}
      </div>

      {/* Arrows */}
      <button onClick={() => setIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
        <ChevronLeft className="w-4 h-4 text-white" />
      </button>
      <button onClick={() => setIdx((i) => (i + 1) % HERO_SLIDES.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
        <ChevronRight className="w-4 h-4 text-white" />
      </button>
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
                <img src={l.distributor.profileImage} alt="" className="w-full h-full object-contain" />
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
