"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Loader2, Package, Truck, X, ArrowLeft,
  ShoppingCart, ChevronLeft, ChevronRight,
  SlidersHorizontal, Clock, CheckCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

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
  imageUrl: string | null;
  distributor: { id: string; name: string; profileImage: string };
  catalog: {
    terreno: string | null; reencauchable: boolean;
    kmEstimadosReales: number | null; cpkEstimado: number | null;
    crowdAvgCpk: number | null;
  } | null;
}

interface Filters { dimensions: string[]; marcas: string[] }

export default function PublicMarketplace() {
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
    fetch(`${API_BASE}/marketplace/listings/filters`)
      .then((r) => (r.ok ? r.json() : { dimensions: [], marcas: [] }))
      .then(setFilters).catch(() => {});
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
      const res = await fetch(`${API_BASE}/marketplace/listings?${params}`);
      if (res.ok) { const d = await res.json(); setListings(d.listings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); }
    } catch { /* */ }
    setLoading(false);
  }, [search, dimension, marca, sortBy, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, dimension, marca, sortBy]);

  const activeFilterCount = [dimension, marca].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "1px solid rgba(10,24,58,0.06)", boxShadow: "0 1px 4px rgba(10,24,58,0.04)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="p-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-[#0A183A] text-base hidden sm:block">TirePro <span className="text-[#348CCB] font-bold">Marketplace</span></span>
          </Link>

          <div className="flex-1 relative max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar llantas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 text-[#0A183A] placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#173D68] border border-gray-200 hover:bg-gray-50">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-[#1E76B6] text-white text-[8px] font-black flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            <Link href="/login"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              Ingresar
            </Link>
          </div>
        </div>

        {showFilters && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex gap-3 flex-wrap">
            <select value={dimension} onChange={(e) => setDimension(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#173D68]">
              <option value="">Dimensiones</option>
              {filters.dimensions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={marca} onChange={(e) => setMarca(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#173D68]">
              <option value="">Marcas</option>
              {filters.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs border border-gray-200 bg-white text-[#173D68]">
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
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-32 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Cargando productos...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center py-32 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-bold text-[#0A183A]">Sin productos disponibles</p>
            <p className="text-sm mt-1">Pronto habra llantas disponibles en el marketplace.</p>
            <Link href="/" className="mt-4 flex items-center gap-1 text-sm font-bold text-[#1E76B6] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">{total} resultado{total !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((l) => {
                const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                const price = hasPromo ? l.precioPromo! : l.precioCop;
                const cpk = l.catalog?.crowdAvgCpk ?? l.catalog?.cpkEstimado;
                const discount = hasPromo ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;

                return (
                  <div key={l.id} className="bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 group"
                    style={{ border: "1px solid rgba(10,24,58,0.06)" }}>
                    <div className="relative h-36 flex items-center justify-center overflow-hidden" style={{ background: "#f8fafc" }}>
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt={`${l.marca} ${l.modelo}`} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(30,118,182,0.06)" }}>
                          <Package className="w-7 h-7 text-[#348CCB]/30" />
                        </div>
                      )}
                      {hasPromo && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black text-white bg-red-500">-{discount}%</span>}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">{l.marca}</p>
                      <p className="text-sm font-black text-[#0A183A] mt-0.5 leading-tight">{l.modelo}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{l.dimension}</p>

                      <div className="mt-2.5">
                        <span className="text-xl font-black text-[#0A183A]">{fmtCOP(price)}</span>
                        {hasPromo && <span className="text-xs text-gray-400 line-through ml-2">{fmtCOP(l.precioCop)}</span>}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {l.catalog?.terreno && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{l.catalog.terreno}</span>}
                        {cpk != null && cpk > 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-600">CPK {fmtCOP(Math.round(cpk))}</span>}
                        {l.catalog?.reencauchable && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Reencauchable</span>}
                      </div>

                      <div className="mt-3 pt-2.5 space-y-1" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3 h-3 text-[#348CCB]" />
                          <span className="text-[10px] font-medium text-[#173D68]">{l.distributor.name}</span>
                        </div>
                        {l.tiempoEntrega && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] text-green-600 font-bold">{l.tiempoEntrega}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-[#173D68] border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-xs text-gray-400">Pagina {page} de {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-[#173D68] border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 text-center" style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}>
        <Link href="/" className="text-sm font-bold text-[#348CCB] hover:underline">tirepro.com.co</Link>
        <p className="text-xs text-gray-400 mt-1">Marketplace de llantas para flotas en Colombia</p>
      </footer>
    </div>
  );
}
