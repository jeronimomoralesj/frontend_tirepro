"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Loader2, ShoppingCart, Filter, ChevronDown,
  Package, Truck, Tag, X, ArrowUpDown,
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

interface Filters {
  dimensions: string[];
  marcas: string[];
}

export default function MarketplaceTab() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ dimensions: [], marcas: [] });

  // Search/filter state
  const [search, setSearch] = useState("");
  const [dimension, setDimension] = useState("");
  const [marca, setMarca] = useState("");
  const [sortBy, setSortBy] = useState("price_asc");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch filters on mount
  useEffect(() => {
    authFetch(`${API_BASE}/marketplace/listings/filters`)
      .then((r) => (r.ok ? r.json() : { dimensions: [], marcas: [] }))
      .then(setFilters)
      .catch(() => {});
  }, []);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dimension) params.set("dimension", dimension);
    if (marca) params.set("marca", marca);
    if (sortBy) params.set("sortBy", sortBy);
    params.set("page", String(page));
    params.set("limit", "20");

    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      }
    } catch { /* */ }
    setLoading(false);
  }, [search, dimension, marca, sortBy, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, dimension, marca, sortBy]);

  const inputCls = "w-full px-3 py-2 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#93b8d4]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo o dimension..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{
            background: showFilters ? "#0A183A" : "white",
            color: showFilters ? "white" : "#173D68",
            border: "1px solid rgba(52,140,203,0.2)",
          }}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {(dimension || marca) && (
            <span className="w-5 h-5 rounded-full bg-[#1E76B6] text-white text-[9px] font-black flex items-center justify-center">
              {[dimension, marca].filter(Boolean).length}
            </span>
          )}
        </button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-bold text-[#173D68] border border-[#348CCB]/20 bg-white"
        >
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="newest">Mas recientes</option>
        </select>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex gap-3 flex-wrap">
          <select value={dimension} onChange={(e) => setDimension(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-[#348CCB]/20 bg-white text-[#173D68]">
            <option value="">Todas las dimensiones</option>
            {filters.dimensions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={marca} onChange={(e) => setMarca(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-[#348CCB]/20 bg-white text-[#173D68]">
            <option value="">Todas las marcas</option>
            {filters.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {(dimension || marca) && (
            <button onClick={() => { setDimension(""); setMarca(""); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {total} producto{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[#1E76B6]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Cargando catalogo...</span>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Package className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm font-bold text-[#0A183A]">Sin productos disponibles</p>
          <p className="text-xs mt-1">Los distribuidores aun no han publicado llantas en el marketplace.</p>
        </div>
      ) : (
        <>
          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => {
              const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
              const displayPrice = hasPromo ? l.precioPromo! : l.precioCop;
              const cpk = l.catalog?.crowdAvgCpk ?? l.catalog?.cpkEstimado;

              return (
                <div key={l.id} className="bg-white rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
                  {/* Image or placeholder */}
                  <div className="h-32 flex items-center justify-center" style={{ background: "rgba(10,24,58,0.03)" }}>
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt={`${l.marca} ${l.modelo}`} className="h-full w-full object-contain p-3" />
                    ) : (
                      <div className="text-center">
                        <Package className="w-8 h-8 text-[#348CCB]/30 mx-auto" />
                        <p className="text-[10px] text-gray-300 mt-1">{l.marca}</p>
                      </div>
                    )}
                    {hasPromo && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white bg-red-500">
                        PROMO
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#0A183A] leading-tight">{l.marca} {l.modelo}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{l.dimension}{l.eje ? ` · ${l.eje}` : ""}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className="text-lg font-black text-[#0A183A]">{fmtCOP(displayPrice)}</p>
                      {hasPromo && (
                        <p className="text-xs text-gray-400 line-through">{fmtCOP(l.precioCop)}</p>
                      )}
                      {l.incluyeIva && <span className="text-[9px] text-gray-400">IVA incl.</span>}
                    </div>

                    {/* Metadata row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {l.cantidadDisponible > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">
                          {l.cantidadDisponible} disponible{l.cantidadDisponible !== 1 ? "s" : ""}
                        </span>
                      )}
                      {l.tiempoEntrega && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">
                          {l.tiempoEntrega}
                        </span>
                      )}
                      {l.catalog?.reencauchable && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600">
                          Reencauchable
                        </span>
                      )}
                      {l.catalog?.terreno && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-600">
                          {l.catalog.terreno}
                        </span>
                      )}
                    </div>

                    {/* CPK + Distributor */}
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Truck className="w-3 h-3 text-[#348CCB] flex-shrink-0" />
                        <span className="text-[10px] font-bold text-[#173D68] truncate">{l.distributor.name}</span>
                      </div>
                      {cpk != null && cpk > 0 && (
                        <span className="text-[10px] font-bold text-[#1E76B6] flex-shrink-0">
                          CPK: {fmtCOP(Math.round(cpk))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#173D68] border border-[#348CCB]/20 disabled:opacity-30 hover:bg-[#F0F7FF] transition-colors">
                Anterior
              </button>
              <span className="text-xs text-gray-400">
                Pagina {page} de {pages}
              </span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#173D68] border border-[#348CCB]/20 disabled:opacity-30 hover:bg-[#F0F7FF] transition-colors">
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
