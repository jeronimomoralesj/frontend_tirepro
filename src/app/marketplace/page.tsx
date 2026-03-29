"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Loader2, Package, Truck, X, MapPin,
  ShoppingCart, ChevronLeft, ChevronRight, Store,
  SlidersHorizontal, Clock, CheckCircle, Star, Shield,
  ChevronDown, Recycle, CircleDot, Building2,
} from "lucide-react";

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
  _count?: { reviews: number };
  reviews?: { rating: number }[];
}

interface DistributorOption { id: string; name: string; profileImage: string }
interface Filters { dimensions: string[]; marcas: string[]; distributors: DistributorOption[] }

// =============================================================================

export default function PublicMarketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ dimensions: [], marcas: [], distributors: [] });

  const [search, setSearch] = useState("");
  const [dimension, setDimension] = useState("");
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [sortBy, setSortBy] = useState("price_asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/marketplace/listings/filters`)
      .then((r) => (r.ok ? r.json() : { dimensions: [], marcas: [], distributors: [] }))
      .then(setFilters).catch(() => {});
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
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        {/* Top bar */}
        <div className="bg-[#0A183A] text-white/70 text-[10px] text-center py-1.5 font-medium tracking-wide">
          Marketplace de llantas para flotas — Encuentra las mejores ofertas de distribuidores verificados
        </div>

        {/* Main nav */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-black text-[#0A183A] text-sm leading-none">TirePro</p>
                <p className="text-[9px] text-[#348CCB] font-bold">Marketplace</p>
              </div>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-2xl relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar llantas, marcas, distribuidores..."
                className="w-full pl-11 pr-4 py-3 rounded-full text-sm bg-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/30 text-[#0A183A] placeholder-gray-400"
              />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/login" className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-[#0A183A] border border-gray-200 hover:bg-gray-50 transition-colors">
                Ingresar
              </Link>
              <Link href="/companyregister" className="px-4 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                Registrarse
              </Link>
            </div>
          </div>

          {/* Categories + filters row */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
            {/* Type pills */}
            {[{ v: "", l: "Todo" }, { v: "nueva", l: "Llantas Nuevas" }, { v: "reencauche", l: "Reencauche" }].map((t) => (
              <button key={t.v} onClick={() => setTipo(t.v)}
                className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
                style={{ background: tipo === t.v ? "#0A183A" : "white", color: tipo === t.v ? "white" : "#555", border: tipo === t.v ? "none" : "1px solid #e5e5e5" }}>
                {t.l}
              </button>
            ))}

            <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

            {/* Dimension quick picks — show top 4 */}
            {filters.dimensions.slice(0, 4).map((d) => (
              <button key={d} onClick={() => setDimension(dimension === d ? "" : d)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0"
                style={{ background: dimension === d ? "#1E76B6" : "white", color: dimension === d ? "white" : "#777", border: dimension === d ? "none" : "1px solid #e5e5e5" }}>
                {d}
              </button>
            ))}

            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 ml-auto"
              style={{ background: filtersOpen ? "#0A183A" : "white", color: filtersOpen ? "white" : "#555", border: filtersOpen ? "none" : "1px solid #e5e5e5" }}>
              <SlidersHorizontal className="w-3 h-3" />
              Mas filtros
              {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-[#1E76B6] text-white text-[8px] font-black flex items-center justify-center ml-0.5">{activeFilters}</span>}
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div className="bg-gray-50 border-t border-gray-100">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-3 flex-wrap items-center">
              <select value={dimension} onChange={(e) => setDimension(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#333]">
                <option value="">Todas las dimensiones</option>
                {filters.dimensions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={marca} onChange={(e) => setMarca(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#333]">
                <option value="">Todas las marcas</option>
                {filters.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#333]">
                <option value="">Todos los distribuidores</option>
                {filters.distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ciudad de entrega"
                className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#333] w-36 placeholder-gray-400" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#333]">
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="newest">Mas recientes</option>
              </select>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:underline">Limpiar filtros</button>
              )}
            </div>
          </div>
        )}
      </header>

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

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-[#0A183A] mt-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="font-black text-white text-sm mb-2">TirePro Marketplace</p>
              <p className="text-xs text-white/40 leading-relaxed">
                La plataforma de llantas para flotas mas grande de Colombia.
                Encuentra las mejores ofertas de distribuidores verificados.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Enlaces</p>
              <div className="space-y-2">
                <Link href="/" className="block text-xs text-white/40 hover:text-white transition-colors">Inicio</Link>
                <Link href="/marketplace" className="block text-xs text-white/40 hover:text-white transition-colors">Marketplace</Link>
                <Link href="/blog" className="block text-xs text-white/40 hover:text-white transition-colors">Blog</Link>
                <Link href="/login" className="block text-xs text-white/40 hover:text-white transition-colors">Ingresar</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Distribuidores</p>
              <p className="text-xs text-white/40 leading-relaxed">
                ¿Vendes llantas? Registrate como distribuidor y publica tu catalogo.
              </p>
              <Link href="/companyregister" className="inline-block mt-3 px-4 py-2 rounded-full text-[10px] font-bold text-[#0A183A] bg-white hover:bg-gray-100 transition-colors">
                Registrar mi empresa
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-[10px] text-white/30">tirepro.com.co — Marketplace de llantas para flotas en Colombia</p>
          </div>
        </div>
      </footer>
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
