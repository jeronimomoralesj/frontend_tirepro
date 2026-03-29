"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Loader2, Package, Truck, X, Filter,
  ShoppingCart, Star, ChevronLeft, ChevronRight,
  SlidersHorizontal, Tag, Clock, CheckCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) },
  });
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Listing {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  eje: string | null;
  precioCop: number;
  precioPromo: number | null;
  promoHasta: string | null;
  incluyeIva: boolean;
  cantidadDisponible: number;
  tiempoEntrega: string | null;
  descripcion: string | null;
  imageUrl: string | null;
  distributor: { id: string; name: string; profileImage: string };
  catalog: {
    id: string; skuRef: string; terreno: string | null; reencauchable: boolean;
    kmEstimadosReales: number | null; cpkEstimado: number | null;
    crowdAvgCpk: number | null; crowdAvgPrice: number | null;
    psiRecomendado: number | null; rtdMm: number | null;
  } | null;
}

interface Filters { dimensions: string[]; marcas: string[] }

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ dimensions: [], marcas: [] });

  const [search, setSearch] = useState("");
  const [dimension, setDimension] = useState("");
  const [marca, setMarca] = useState("");
  const [sortBy, setSortBy] = useState("price_asc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/marketplace/listings/filters`)
      .then((r) => (r.ok ? r.json() : { dimensions: [], marcas: [] }))
      .then(setFilters)
      .catch(() => {});
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dimension) params.set("dimension", dimension);
    if (marca) params.set("marca", marca);
    params.set("sortBy", sortBy);
    params.set("page", String(page));
    params.set("limit", "24");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings?${params}`);
      if (res.ok) { const d = await res.json(); setListings(d.listings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); }
    } catch { /* */ }
    setLoading(false);
  }, [search, dimension, marca, sortBy, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, dimension, marca, sortBy]);

  const activeFilterCount = [dimension, marca].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 py-4"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">Marketplace</h1>
              <p className="text-[10px] text-[#348CCB] mt-0.5">{total} productos disponibles</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar llantas por marca, modelo o dimension..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 text-[#0A183A] placeholder-gray-400"
            />
          </div>

          {/* Filter + Sort */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: showFilters ? "#0A183A" : "white", color: showFilters ? "white" : "#173D68", border: "1px solid rgba(52,140,203,0.2)" }}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros
              {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-[#1E76B6] text-white text-[8px] font-black flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-[#173D68] border border-gray-200 bg-white hidden sm:block">
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="newest">Recientes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Filter bar */}
        {showFilters && (
          <div className="flex gap-3 flex-wrap py-3 border-b border-gray-100">
            <select value={dimension} onChange={(e) => setDimension(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#173D68]">
              <option value="">Todas las dimensiones</option>
              {filters.dimensions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={marca} onChange={(e) => setMarca(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#173D68]">
              <option value="">Todas las marcas</option>
              {filters.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#173D68] sm:hidden">
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="newest">Recientes</option>
            </select>
            {activeFilterCount > 0 && (
              <button onClick={() => { setDimension(""); setMarca(""); }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50">
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
        )}

        {/* Results */}
        <div className="py-4 sm:py-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-[#1E76B6]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Cargando productos...</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-gray-400">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-base font-bold text-[#0A183A]">Sin productos disponibles</p>
              <p className="text-sm mt-1 text-center max-w-xs">Los distribuidores aun no han publicado llantas. Vuelve pronto.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-4">{total} resultado{total !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((l) => <ProductCard key={l.id} listing={l} />)}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-8">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-[#173D68] border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                      const p = page <= 3 ? i + 1 : page + i - 2;
                      if (p < 1 || p > pages) return null;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                          style={{ background: p === page ? "#0A183A" : "transparent", color: p === page ? "white" : "#173D68" }}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-[#173D68] border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Product Card — Amazon-style
// =============================================================================

function ProductCard({ listing: l }: { listing: Listing }) {
  const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
  const price = hasPromo ? l.precioPromo! : l.precioCop;
  const cpk = l.catalog?.crowdAvgCpk ?? l.catalog?.cpkEstimado;
  const kmEst = l.catalog?.kmEstimadosReales;
  const discount = hasPromo ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 group"
      style={{ border: "1px solid rgba(10,24,58,0.06)" }}>

      {/* Image area */}
      <div className="relative h-40 flex items-center justify-center overflow-hidden" style={{ background: "#f8fafc" }}>
        {l.imageUrl ? (
          <img src={l.imageUrl} alt={`${l.marca} ${l.modelo}`} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform" />
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-2" style={{ background: "rgba(30,118,182,0.06)" }}>
              <Package className="w-8 h-8 text-[#348CCB]/40" />
            </div>
            <p className="text-[10px] text-gray-300 font-bold">{l.marca}</p>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasPromo && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-black text-white bg-red-500">-{discount}%</span>
          )}
          {l.catalog?.reencauchable && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold text-purple-700 bg-purple-100">Reencauchable</span>
          )}
        </div>
        {l.cantidadDisponible <= 3 && l.cantidadDisponible > 0 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold text-orange-700 bg-orange-100">
            Quedan {l.cantidadDisponible}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Brand + Model */}
        <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">{l.marca}</p>
        <p className="text-sm font-black text-[#0A183A] mt-0.5 leading-tight line-clamp-2">{l.modelo}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{l.dimension}{l.eje ? ` · ${l.eje}` : ""}</p>

        {/* Price */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[#0A183A]">{fmtCOP(price)}</span>
            {l.incluyeIva && <span className="text-[9px] text-gray-400">IVA incl.</span>}
          </div>
          {hasPromo && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 line-through">{fmtCOP(l.precioCop)}</span>
              <span className="text-[10px] font-bold text-red-500">Ahorras {fmtCOP(l.precioCop - price)}</span>
            </div>
          )}
        </div>

        {/* Specs row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {l.catalog?.terreno && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{l.catalog.terreno}</span>
          )}
          {kmEst && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{(kmEst / 1000).toFixed(0)}K km</span>
          )}
          {cpk != null && cpk > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-600">CPK {fmtCOP(Math.round(cpk))}</span>
          )}
        </div>

        {/* Delivery + Distributor */}
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
          {l.tiempoEntrega && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-green-500" />
              <span className="text-[10px] text-gray-600">Entrega: <strong className="text-green-600">{l.tiempoEntrega}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Truck className="w-3 h-3 text-[#348CCB]" />
            <span className="text-[10px] font-medium text-[#173D68]">{l.distributor.name}</span>
          </div>
          {l.cantidadDisponible > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-[10px] text-green-600 font-bold">En stock ({l.cantidadDisponible})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
