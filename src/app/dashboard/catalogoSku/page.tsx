"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Search, ChevronRight, Loader2, Package, Image as ImageIcon,
  Filter, X, BarChart3, Plus,
} from "lucide-react";

// =============================================================================
// API base
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

// =============================================================================
// Types
// =============================================================================

type CatalogImage = { id: string; url: string; coverIndex: number };
type CatalogRow = {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  skuRef: string;
  categoria: string | null;
  terreno: string | null;
  ejeTirePro: string | null;
  rtdMm: number | null;
  indiceCarga: string | null;
  indiceVelocidad: string | null;
  precioCop: number | null;
  kmEstimadosReales: number | null;
  reencauchable: boolean;
  images: CatalogImage[];
};

// =============================================================================
// Page
// =============================================================================

export default function CatalogoSkuPage() {
  const [q,         setQ]         = useState("");
  const [eje,       setEje]       = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [items,     setItems]     = useState<CatalogRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  // Stats are manager-only — a plain `catalogo` sales rep shouldn't see
  // their teammates' numbers. The backend enforces this too.
  const [canSeeStats, setCanSeeStats] = useState(false);
  // Curation (add / remove tires from the list) is a management task —
  // admins + sales managers. Plain catalogo reps don't see the button.
  const [canCurate,  setCanCurate]  = useState(false);
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      setCanSeeStats(u?.role === "admin" || u?.role === "catalogo_admin");
      setCanCurate (u?.role === "admin" || u?.role === "catalogo_admin");
    } catch { /* leave as false */ }
  }, []);

  const PAGE_SIZE = 24;

  const fetchItems = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (q.trim())     params.set("q",         q.trim());
      if (eje)          params.set("eje",       eje);
      if (categoria)    params.set("categoria", categoria);
      const res = await authFetch(`${API_BASE}/catalog/dist/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando catálogo");
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, q, eje, categoria]);

  // Debounce search — so we don't pound the backend on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => fetchItems(), 250);
    return () => clearTimeout(t);
  }, [fetchItems]);

  // Reset to page 1 on filter change.
  useEffect(() => { setPage(1); }, [q, eje, categoria]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = !!(q || eje || categoria);

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none tracking-tight">Catálogo SKU</h1>
            <p className="text-xs text-[#348CCB] mt-0.5">Fichas técnicas para tus clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCurate && (
            <Link href="/dashboard/catalogoSku/explorar"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Explorar catálogo</span>
              <span className="sm:hidden">Agregar</span>
            </Link>
          )}
          {canSeeStats && (
            <Link href="/dashboard/catalogoSku/stats"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.2)", color: "#1E76B6" }}>
              <BarChart3 className="w-4 h-4" />
              Estadísticas
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por marca, modelo, dimensión o SKU"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
              style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }}
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select value={eje} onChange={(e) => setEje(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
            style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }}>
            <option value="">Eje: todos</option>
            <option value="direccion">Dirección</option>
            <option value="traccion">Tracción</option>
            <option value="libre">Libre / multi</option>
            <option value="remolque">Remolque</option>
          </select>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
            style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }}>
            <option value="">Categoría: todas</option>
            <option value="nueva">Nueva</option>
            <option value="reencauche">Reencauche</option>
          </select>
        </div>

        {/* Result header */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {loading ? "Cargando…" : `${total.toLocaleString("es-CO")} SKU${total === 1 ? "" : "s"}`}
            {hasFilter && total > 0 && <> — página {page} de {totalPages}</>}
          </span>
          {hasFilter && (
            <button onClick={() => { setQ(""); setEje(""); setCategoria(""); }}
              className="flex items-center gap-1 text-[#1E76B6] hover:underline">
              <Filter className="w-3 h-3" />
              Limpiar filtros
            </button>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-700"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        {/* Grid */}
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          // Two distinct empty states:
          //   • search/filter active → just "sin resultados"
          //   • catalog is empty (no subscriptions)  → onboarding CTA
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Package className="w-10 h-10 opacity-40" />
            {hasFilter ? (
              <p className="text-sm">Sin resultados en tu catálogo con estos filtros</p>
            ) : (
              <>
                <p className="text-sm font-medium text-[#0A183A]">Tu catálogo está vacío</p>
                <p className="text-xs text-gray-500 max-w-xs text-center">
                  Explora el catálogo completo y agrega las llantas que vendes. Sólo las que agregues aparecerán aquí.
                </p>
                {canCurate && (
                  <Link href="/dashboard/catalogoSku/explorar"
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                    <Plus className="w-3.5 h-3.5" />
                    Explorar catálogo
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {items.map((row) => <SkuCard key={row.id} row={row} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}>
              Anterior
            </button>
            <span className="text-xs text-gray-500 font-medium px-2">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}>
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sku card
// =============================================================================

function SkuCard({ row }: { row: CatalogRow }) {
  const cover = row.images[0]?.url;
  const price = row.precioCop;
  return (
    <Link href={`/dashboard/catalogoSku/${row.id}`}
      className="group rounded-2xl overflow-hidden transition-all hover:shadow-md bg-white flex flex-col"
      style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
      {/* Cover */}
      <div className="aspect-square relative flex items-center justify-center"
        style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={`${row.marca} ${row.modelo}`} className="w-full h-full object-contain p-2" />
        ) : (
          <ImageIcon className="w-10 h-10 text-gray-300" />
        )}
        {row.reencauchable && (
          <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full text-white"
            style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
            REENC.
          </span>
        )}
      </div>
      {/* Body */}
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">{row.marca}</p>
        <p className="text-sm font-black text-[#0A183A] leading-tight truncate">{row.modelo}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-mono">{row.dimension}</p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
          {row.ejeTirePro && <span>{row.ejeTirePro}</span>}
          {row.terreno && <span>· {row.terreno}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs font-black text-[#0A183A]">
            {price != null && price > 0
              ? `$${Math.round(price).toLocaleString("es-CO")}`
              : <span className="text-gray-300 font-normal">Sin precio</span>}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1E76B6]" />
        </div>
      </div>
    </Link>
  );
}
