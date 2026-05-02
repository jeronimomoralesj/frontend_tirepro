"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Search, ChevronRight, Loader2, Package, Image as ImageIcon,
  Filter, X, BarChart3, Plus, Lightbulb, Star, Sparkles, ShoppingCart, Check,
  Sliders, CheckCircle2,
} from "lucide-react";
import { useCatalogCart } from "./cart";

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
  psiRecomendado: number | null;
  pesoKg: number | null;
  cinturones: string | null;
  pr: string | null;
  tipoBanda: string | null;
  construccion: string | null;
  segmento: string | null;
  tipo: string | null;
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
  // Bulk ficha-técnica edit by banda is admin-only — the backend
  // gates with roles: ['admin'] on /catalog/dist/bulk-by-banda.
  const [canBulkEdit, setCanBulkEdit] = useState(false);
  // Sales advisor modal (open to everyone — it's a selling tool).
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [bandaOpen,   setBandaOpen]   = useState(false);
  // Cart badge in the header links to the multi-tire quote builder.
  const cart = useCatalogCart();
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      setCanSeeStats(u?.role === "admin" || u?.role === "catalogo_admin");
      setCanCurate (u?.role === "admin" || u?.role === "catalogo_admin");
      setCanBulkEdit(u?.role === "admin");
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
          {cart.count > 0 && (
            <Link href="/dashboard/catalogoSku/cotizacion"
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.25)" }}>
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cotización</span>
              <span className="ml-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: "#1E76B6" }}>
                {cart.count}
              </span>
            </Link>
          )}
          <button onClick={() => setAdvisorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: "rgba(245,158,11,0.12)", color: "#b45309", border: "1px solid rgba(245,158,11,0.35)" }}>
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Asesor de ventas</span>
            <span className="sm:hidden">Asesor</span>
          </button>
          {canBulkEdit && (
            <button onClick={() => setBandaOpen(true)}
              title="Editar ficha técnica para todas las dimensiones de una banda"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.25)" }}>
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar ficha por banda</span>
              <span className="sm:hidden">Banda</span>
            </button>
          )}
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
            {items.map((row) => <SkuCard key={row.id} row={row} cart={cart} />)}
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

      {advisorOpen && <AdvisorModal onClose={() => setAdvisorOpen(false)} />}
      {bandaOpen && (
        <BandaFichaModal
          onClose={() => setBandaOpen(false)}
          onApplied={() => { setBandaOpen(false); fetchItems(); }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Sku card
// =============================================================================

function SkuCard({ row, cart }: {
  row: CatalogRow;
  cart: ReturnType<typeof useCatalogCart>;
}) {
  const cover = row.images[0]?.url;
  const price = row.precioCop;
  const inCart = cart.has(row.id);
  // Quick-add click: stop the outer Link's navigation, toggle the cart
  // entry, and seed the line with qty=4 + catalog's precioCop as the
  // default unit price so a rep can get to a quote without editing
  // every field.
  const onQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) { cart.remove(row.id); return; }
    cart.add({
      catalogId: row.id,
      marca:     row.marca,
      modelo:    row.modelo,
      dimension: row.dimension,
      categoria: row.categoria,
      terreno:   row.terreno,
      ejeTirePro: row.ejeTirePro,
      imageUrl:  row.images[0]?.url ?? null,
      indiceCarga:     row.indiceCarga,
      indiceVelocidad: row.indiceVelocidad,
      rtdMm:           row.rtdMm,
      psiRecomendado:  row.psiRecomendado,
      pesoKg:          row.pesoKg,
      cinturones:      row.cinturones,
      pr:              row.pr,
      reencauchable:   row.reencauchable,
      tipoBanda:       row.tipoBanda,
      construccion:    row.construccion,
      segmento:        row.segmento,
      tipo:            row.tipo,
      quantity: 4,
      unitPriceCop: row.precioCop ?? null,
    });
  };
  return (
    <Link href={`/dashboard/catalogoSku/${row.id}`}
      className="group rounded-2xl overflow-hidden transition-all hover:shadow-md bg-white flex flex-col relative"
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
        {/* Quick-add — hover-reveal on desktop, always-on when the tire is
            already in the cart (so the rep can scan which cards are
            stacked). Mobile still has the detail-page "Agregar a
            cotización" button; this one is a desktop accelerator. */}
        <button onClick={onQuickAdd}
          title={inCart ? "Quitar de la cotización" : "Agregar a cotización"}
          className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-bold text-white shadow-sm transition-opacity ${
            inCart ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
          style={{ background: inCart ? "rgba(16,185,129,0.95)" : "rgba(30,118,182,0.95)" }}>
          {inCart ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {inCart ? "En cotización" : "Cotización"}
        </button>
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

// =============================================================================
// Sales advisor modal
// Salesperson fills a prospect's profile (tier, dimension, eje, pavimento %,
// reencauchable, terreno) and we POST /catalog/dist/recommend to get a
// ranked shortlist from the dist's OWN catalog. Results show fit score +
// match reasons + a link through to each tire's detail page.
// =============================================================================

type AdvisorResult = {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  terreno: string | null;
  ejeTirePro: string | null;
  pctPavimento: number;
  reencauchable: boolean;
  image: string | null;
  brand: { tier: string | null; country: string | null; logoUrl: string | null } | null;
  score: number;
  reasons: string[];
};

function AdvisorModal({ onClose }: { onClose: () => void }) {
  // Core profile
  const [tier, setTier]                   = useState<string>("");
  const [dimension, setDimension]         = useState<string>("");
  const [eje, setEje]                     = useState<string>("");
  const [categoria, setCategoria]         = useState<string>("");
  const [reencauchable, setReencauchable] = useState<string>("any");
  const [pctPavimento, setPctPavimento]   = useState<string>("");
  const [terreno, setTerreno]             = useState<string>("");
  // Dimensions dropdown sourced from THIS dist's subscribed catalog — a
  // rep picks instead of typing, which eliminates the "295/80R22.5" vs
  // "295/80 R22.5" typo class. Empty while loading / if the endpoint
  // fails — the field just shows "Cualquiera" in that case.
  const [dimensions, setDimensions]       = useState<string[]>([]);
  useEffect(() => {
    authFetch(`${API_BASE}/catalog/dist/dimensions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.dimensions) setDimensions(d.dimensions); })
      .catch(() => {});
  }, []);
  // Expanded — every remaining catalog attribute as an optional filter
  const [indiceCarga, setIndiceCarga]         = useState<string>("");
  const [indiceVelocidad, setIndiceVelocidad] = useState<string>("");
  const [minRtdMm, setMinRtdMm]               = useState<string>("");
  const [minPsiRecomendado, setMinPsi]        = useState<string>("");
  const [cinturones, setCinturones]           = useState<string>("");
  const [pr, setPr]                           = useState<string>("");
  const [construccion, setConstruccion]       = useState<string>("");
  const [segmento, setSegmento]               = useState<string>("");
  const [tipoTubeless, setTipoTubeless]       = useState<string>("");
  const [tipoBanda, setTipoBanda]             = useState<string>("");
  const [advancedOpen, setAdvancedOpen]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [results, setResults]                 = useState<AdvisorResult[] | null>(null);
  const [error, setError]                     = useState("");

  async function onSubmit() {
    setLoading(true); setError(""); setResults(null);
    try {
      const body: Record<string, unknown> = {};
      if (tier)                   body.tier = tier;
      if (dimension.trim())       body.dimension = dimension.trim();
      if (eje)                    body.eje = eje;
      if (categoria)              body.categoria = categoria;
      if (reencauchable !== "any") body.reencauchable = reencauchable === "true";
      if (pctPavimento !== "") {
        const n = Number(pctPavimento);
        if (!Number.isNaN(n)) body.pctPavimento = Math.max(0, Math.min(100, n));
      }
      if (terreno)                body.terreno = terreno;
      if (indiceCarga.trim())     body.indiceCarga = indiceCarga.trim();
      if (indiceVelocidad.trim()) body.indiceVelocidad = indiceVelocidad.trim();
      if (minRtdMm !== "") {
        const n = Number(minRtdMm);
        if (!Number.isNaN(n) && n > 0) body.minRtdMm = n;
      }
      if (minPsiRecomendado !== "") {
        const n = Number(minPsiRecomendado);
        if (!Number.isNaN(n) && n > 0) body.minPsiRecomendado = n;
      }
      if (cinturones.trim())      body.cinturones = cinturones.trim();
      if (pr.trim())              body.pr = pr.trim();
      if (construccion)           body.construccion = construccion;
      if (segmento.trim())        body.segmento = segmento.trim();
      if (tipoTubeless)           body.tipo = tipoTubeless;
      if (tipoBanda.trim())       body.tipoBanda = tipoBanda.trim();

      const res = await authFetch(`${API_BASE}/catalog/dist/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar recomendaciones");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.55)" }}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(52,140,203,0.1)", background: "linear-gradient(135deg, #fff7ed, #fef3c7)" }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}>
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-[#0A183A]">Asesor de ventas</p>
              <p className="text-[10px] text-[#92400E]">Describe las necesidades del cliente y te sugerimos opciones de tu catálogo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Two-pane layout: form + results */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-5 gap-0">
          {/* Form (col-span 2) */}
          <div className="md:col-span-2 p-5 space-y-3 border-r" style={{ borderColor: "rgba(52,140,203,0.1)" }}>
            <Select label="Tipo de llanta" value={tier} onChange={setTier} options={[
              { v: "",        l: "Cualquiera" },
              { v: "premium", l: "Premium" },
              { v: "mid",     l: "Intermedia" },
              { v: "value",   l: "Económica" },
            ]} />
            <Select label="Categoría" value={categoria} onChange={setCategoria} options={[
              { v: "",           l: "Cualquiera" },
              { v: "nueva",      l: "Nueva" },
              { v: "reencauche", l: "Reencauche" },
            ]} />
            <Select label="Dimensión" value={dimension} onChange={setDimension} options={[
              { v: "", l: dimensions.length === 0 ? "Cargando…" : "Cualquiera" },
              ...dimensions.map((d) => ({ v: d, l: d })),
            ]} />
            <Select label="Eje" value={eje} onChange={setEje} options={[
              { v: "",          l: "Cualquiera" },
              { v: "direccion", l: "Dirección" },
              { v: "traccion",  l: "Tracción" },
              { v: "libre",     l: "Libre / multi" },
              { v: "remolque",  l: "Remolque" },
            ]} />
            <Select label="Terreno" value={terreno} onChange={setTerreno} options={[
              { v: "",          l: "Cualquiera" },
              { v: "Carretera", l: "Carretera" },
              { v: "Mixto",     l: "Mixto" },
              { v: "Urbano",    l: "Urbano" },
              { v: "Regional",  l: "Regional" },
              { v: "Off-Road",  l: "Off-Road" },
            ]} />
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">% Pavimento</label>
              <input type="range" min={0} max={100} step={5}
                value={pctPavimento === "" ? 50 : Number(pctPavimento)}
                onChange={(e) => setPctPavimento(e.target.value)}
                className="w-full accent-[#1E76B6]" />
              <p className="text-[10px] text-gray-500 mt-0.5">
                {pctPavimento === ""
                  ? "No especificado"
                  : `${pctPavimento}% pavimento · ${100 - Number(pctPavimento)}% destapado`}
              </p>
            </div>
            <Select label="Reencauchable" value={reencauchable} onChange={setReencauchable} options={[
              { v: "any",   l: "Cualquiera" },
              { v: "true",  l: "Sí" },
              { v: "false", l: "No" },
            ]} />

            {/* Advanced — every remaining spec as an optional filter. Hidden
                by default so the form doesn't overwhelm first-time users. */}
            <button type="button" onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full text-left text-[10px] font-bold uppercase tracking-wide text-[#1E76B6] hover:text-[#0A183A] transition-colors flex items-center gap-1 mt-2">
              {advancedOpen ? "▾" : "▸"} Filtros avanzados
            </button>
            {advancedOpen && (
              <div className="space-y-3 pt-1">
                <TextInput label="Índice de carga" value={indiceCarga} onChange={setIndiceCarga} placeholder="Ej: 152/148" />
                <TextInput label="Índice de velocidad" value={indiceVelocidad} onChange={setIndiceVelocidad} placeholder="Ej: M, K, L" />
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">Profundidad mínima (mm)</label>
                  <input type="number" step="0.1" min="0" value={minRtdMm}
                    onChange={(e) => setMinRtdMm(e.target.value)} placeholder="Ej: 16"
                    className="w-full mt-0.5 px-2.5 py-2 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                    style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">PSI mínimo</label>
                  <input type="number" min="0" value={minPsiRecomendado}
                    onChange={(e) => setMinPsi(e.target.value)} placeholder="Ej: 110"
                    className="w-full mt-0.5 px-2.5 py-2 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                    style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }} />
                </div>
                <TextInput label="Cinturones" value={cinturones} onChange={setCinturones} placeholder="Ej: 4B+2N" />
                <TextInput label="PR (ply rating)" value={pr} onChange={setPr} placeholder="Ej: 16, 18PR" />
                <Select label="Construcción" value={construccion} onChange={setConstruccion} options={[
                  { v: "",            l: "Cualquiera" },
                  { v: "Radial",      l: "Radial" },
                  { v: "Convencional", l: "Convencional" },
                ]} />
                <TextInput label="Segmento" value={segmento} onChange={setSegmento} placeholder="Ej: Tractomula, Bus" />
                <Select label="Tipo" value={tipoTubeless} onChange={setTipoTubeless} options={[
                  { v: "",          l: "Cualquiera" },
                  { v: "Tubeless",  l: "Tubeless" },
                  { v: "Tube-Type", l: "Tube-Type" },
                ]} />
                <TextInput label="Tipo de banda" value={tipoBanda} onChange={setTipoBanda} placeholder="Ej: Bandag BDR-HT" />
              </div>
            )}

            <button onClick={onSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40 mt-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Buscando…" : "Generar recomendaciones"}
            </button>
          </div>

          {/* Results (col-span 3) */}
          <div className="md:col-span-3 p-5">
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg text-xs text-red-700"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}
            {!results && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-10">
                <Sparkles className="w-8 h-8 opacity-40" />
                <p className="text-xs text-center max-w-xs">
                  Completa los datos del cliente y te mostramos las mejores llantas de tu catálogo ordenadas por puntaje de afinidad.
                </p>
              </div>
            )}
            {results && results.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-10">
                <Package className="w-8 h-8 opacity-40" />
                <p className="text-xs text-center">No hay opciones en tu catálogo que cumplan estos criterios.</p>
              </div>
            )}
            {results && results.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">
                  {results.length} recomendacion{results.length === 1 ? "" : "es"} · ordenadas por afinidad
                </p>
                {results.map((r, i) => (
                  <Link key={r.id} href={`/dashboard/catalogoSku/${r.id}`}
                    className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:shadow-md bg-white"
                    style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)" }}>
                      {r.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={r.image} alt="" className="w-full h-full object-contain p-0.5" />
                        : <ImageIcon className="w-6 h-6 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase text-[#348CCB]">{r.marca}</span>
                        <span className="text-sm font-black text-[#0A183A] truncate">{r.modelo}</span>
                        <span className="text-[11px] text-gray-500 font-mono">{r.dimension}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {r.reasons.length ? r.reasons.join(" · ") : "Match general"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 px-2 py-1 rounded-full"
                        style={{ background: scoreTone(r.score).bg }}>
                        <Star className="w-3 h-3" style={{ color: scoreTone(r.score).fg }} fill={scoreTone(r.score).fg} />
                        <span className="text-[10px] font-black" style={{ color: scoreTone(r.score).fg }}>
                          {r.score}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 w-6 text-right">#{i + 1}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Score is a 0-100 fit percentage (backend filters out anything below 40%,
// so values surfaced here fall in [40, 100]). Buckets:
//   70+ → strong fit (green)
//   50+ → decent (amber)
//   40+ → minimal (gray) — still passed the threshold, just barely
function scoreTone(score: number): { bg: string; fg: string } {
  if (score >= 70) return { bg: "rgba(16,185,129,0.12)",  fg: "#059669" };
  if (score >= 50) return { bg: "rgba(245,158,11,0.15)",  fg: "#b45309" };
  return                 { bg: "rgba(100,116,139,0.1)",  fg: "#64748b" };
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 px-2.5 py-2 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
        style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-0.5 px-2.5 py-2 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
        style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }} />
    </div>
  );
}

// =============================================================================
// Banda ficha modal
// Same pattern as the marketplace BandaEditModal but operates on the
// shared TireMasterCatalog (subscribed SKUs only) and edits ficha-técnica
// fields instead of images/description. Identity fields (marca/modelo/
// dimension/skuRef/anchoMm/perfil/rin) are stripped server-side so the
// per-dimension uniqueness can't be corrupted from here.
// =============================================================================

type BandaPreviewItem = {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  skuRef: string;
};

function BandaFichaModal({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  // Brand + modelo options drawn from this dist's subscribed catalog
  // (one big page) — we don't want the user typing brands they don't
  // already have in their list.
  const [allRows, setAllRows] = useState<{ marca: string; modelo: string }[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "500" });
        const res = await authFetch(`${API_BASE}/catalog/dist/search?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAllRows((data.items ?? []).map((r: { marca: string; modelo: string }) => ({
          marca: r.marca, modelo: r.modelo,
        })));
      } catch {
        setAllRows([]);
      } finally {
        setLoadingRows(false);
      }
    })();
  }, []);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) if (r.marca?.trim()) set.add(r.marca.trim());
    return [...set].sort();
  }, [allRows]);

  const [marca, setMarca] = useState<string>("");
  useEffect(() => {
    if (!marca && brandOptions[0]) setMarca(brandOptions[0]);
  }, [brandOptions, marca]);

  const [modeloMatch, setModeloMatch] = useState("");
  const [preview, setPreview] = useState<BandaPreviewItem[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ updated: number } | null>(null);

  const modeloSuggestions = useMemo(() => {
    if (!marca.trim()) return [];
    const set = new Set<string>();
    const m = marca.trim().toLowerCase();
    for (const r of allRows) {
      if (r.marca?.trim().toLowerCase() === m && r.modelo?.trim()) {
        set.add(r.modelo.trim());
      }
    }
    return [...set].sort();
  }, [allRows, marca]);

  // Ficha técnica payload — every field optional; only filled values
  // are sent. Reencauchable uses a tri-state ('keep'/'true'/'false') so
  // an empty save doesn't accidentally overwrite a true to false.
  const [terreno, setTerreno]                   = useState("");
  const [ejeTirePro, setEjeTirePro]             = useState("");
  const [posicion, setPosicion]                 = useState("");
  const [pctPavimento, setPctPavimento]         = useState("");
  const [rtdMm, setRtdMm]                       = useState("");
  const [indiceCarga, setIndiceCarga]           = useState("");
  const [indiceVelocidad, setIndiceVelocidad]   = useState("");
  const [psiRecomendado, setPsiRecomendado]     = useState("");
  const [pesoKg, setPesoKg]                     = useState("");
  const [cinturones, setCinturones]             = useState("");
  const [pr, setPr]                             = useState("");
  const [reencauchable, setReencauchable]       = useState<"keep" | "true" | "false">("keep");
  const [tipoBanda, setTipoBanda]               = useState("");
  const [categoria, setCategoria]               = useState("");
  const [segmento, setSegmento]                 = useState("");
  const [tipo, setTipo]                         = useState("");
  const [construccion, setConstruccion]         = useState("");
  const [notasColombia, setNotasColombia]       = useState("");

  function buildPayload(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (terreno)                  data.terreno = terreno;
    if (ejeTirePro)               data.ejeTirePro = ejeTirePro;
    if (posicion.trim())          data.posicion = posicion.trim();
    if (pctPavimento !== "") {
      const n = Number(pctPavimento);
      if (!Number.isNaN(n)) {
        const clamped = Math.max(0, Math.min(100, n));
        data.pctPavimento = clamped;
        data.pctDestapado = 100 - clamped;
      }
    }
    if (rtdMm !== "") {
      const n = Number(rtdMm);
      if (!Number.isNaN(n) && n >= 0) data.rtdMm = n;
    }
    if (indiceCarga.trim())       data.indiceCarga = indiceCarga.trim();
    if (indiceVelocidad.trim())   data.indiceVelocidad = indiceVelocidad.trim();
    if (psiRecomendado !== "") {
      const n = Number(psiRecomendado);
      if (!Number.isNaN(n) && n >= 0) data.psiRecomendado = n;
    }
    if (pesoKg !== "") {
      const n = Number(pesoKg);
      if (!Number.isNaN(n) && n >= 0) data.pesoKg = n;
    }
    if (cinturones.trim())        data.cinturones = cinturones.trim();
    if (pr.trim())                data.pr = pr.trim();
    if (reencauchable !== "keep") data.reencauchable = reencauchable === "true";
    if (tipoBanda.trim())         data.tipoBanda = tipoBanda.trim();
    if (categoria)                data.categoria = categoria;
    if (segmento.trim())          data.segmento = segmento.trim();
    if (tipo)                     data.tipo = tipo;
    if (construccion)             data.construccion = construccion;
    if (notasColombia.trim())     data.notasColombia = notasColombia.trim();
    return data;
  }

  const payloadHasFields = Object.keys(buildPayload()).length > 0;

  async function handlePreview() {
    if (!marca.trim() || !modeloMatch.trim()) {
      setError("Selecciona marca y escribe la banda");
      return;
    }
    setPreviewing(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/catalog/dist/preview-by-banda`, {
        method: "POST",
        body: JSON.stringify({
          marca:          marca.trim(),
          modeloContains: modeloMatch.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as BandaPreviewItem[];
      setPreview(data);
    } catch (e) {
      setError((e instanceof Error ? e.message : "").slice(0, 200) || "No se pudo cargar la vista previa");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApply() {
    if (!preview || preview.length === 0) {
      setError("Vista previa primero para confirmar a cuáles aplica");
      return;
    }
    const data = buildPayload();
    if (Object.keys(data).length === 0) {
      setError("Llena al menos un campo de ficha técnica");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/catalog/dist/bulk-by-banda`, {
        method: "PATCH",
        body: JSON.stringify({
          marca:          marca.trim(),
          modeloContains: modeloMatch.trim(),
          data,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const out = await res.json();
      setDone({ updated: out.updated ?? 0 });
      setTimeout(() => onApplied(), 1500);
    } catch (e) {
      setError((e instanceof Error ? e.message : "").slice(0, 200) || "No se pudo aplicar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">Editar ficha por banda</p>
            <h2 className="text-lg font-black text-[#0A183A]">Ficha técnica en lote</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Aplica los mismos atributos a todas las dimensiones de una misma banda en tu catálogo.
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Step 1 — picker */}
          <div className="grid sm:grid-cols-2 gap-3">
            <ModalField label="Marca">
              <select
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                value={marca}
                onChange={(e) => { setMarca(e.target.value); setPreview(null); }}
              >
                {loadingRows && <option value="">Cargando…</option>}
                {!loadingRows && brandOptions.length === 0 && <option value="">Sin SKUs en tu catálogo</option>}
                {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </ModalField>
            <ModalField label="Banda / modelo">
              <input
                list="catalog-banda-suggestions"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                value={modeloMatch}
                onChange={(e) => { setModeloMatch(e.target.value); setPreview(null); }}
                placeholder="Ej: ATX, AT PRO RA8, R268"
              />
              <datalist id="catalog-banda-suggestions">
                {modeloSuggestions.map((m) => <option key={m} value={m} />)}
              </datalist>
              <p className="text-[10px] text-gray-500 mt-1">
                Match parcial — escribe lo suficiente para identificar la banda.
              </p>
            </ModalField>
          </div>

          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing || !marca.trim() || !modeloMatch.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-[#1E76B6] hover:bg-[#F0F7FF] disabled:opacity-50"
            style={{ border: "1px solid rgba(30,118,182,0.20)" }}
          >
            {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Ver vista previa
          </button>

          {preview && (
            <div
              className="rounded-xl p-4"
              style={{
                background: preview.length > 0 ? "rgba(30,118,182,0.06)" : "rgba(245,158,11,0.06)",
                border:     `1px solid ${preview.length > 0 ? "rgba(30,118,182,0.20)" : "rgba(245,158,11,0.25)"}`,
              }}
            >
              <p className="text-sm font-black text-[#0A183A]">
                {preview.length} SKU{preview.length !== 1 ? "s" : ""} se actualizará{preview.length !== 1 ? "n" : ""}
              </p>
              {preview.length === 0 ? (
                <p className="text-xs text-amber-700 mt-1">
                  No encontramos SKUs en tu catálogo con esa banda. Intenta con menos texto.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {preview.map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white"
                      style={{ color: "#0A183A", border: "1px solid rgba(10,24,58,0.08)" }}
                    >
                      {p.modelo} · {p.dimension}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — ficha técnica payload */}
          {preview && preview.length > 0 && !done && (
            <div className="border-t pt-4 space-y-3" style={{ borderColor: "rgba(10,24,58,0.06)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#348CCB]">
                Llena solo los campos que quieras sobreescribir
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <ModalField label="Terreno">
                  <FichaSelect value={terreno} onChange={setTerreno} options={[
                    { v: "", l: "— No cambiar —" },
                    { v: "Carretera", l: "Carretera" },
                    { v: "Mixto",     l: "Mixto" },
                    { v: "Urbano",    l: "Urbano" },
                    { v: "Regional",  l: "Regional" },
                    { v: "Off-Road",  l: "Off-Road" },
                  ]} />
                </ModalField>
                <ModalField label="Eje TirePro">
                  <FichaSelect value={ejeTirePro} onChange={setEjeTirePro} options={[
                    { v: "",          l: "— No cambiar —" },
                    { v: "direccion", l: "Dirección" },
                    { v: "traccion",  l: "Tracción" },
                    { v: "libre",     l: "Libre / multi" },
                    { v: "remolque",  l: "Remolque" },
                  ]} />
                </ModalField>
                <ModalField label="Categoría">
                  <FichaSelect value={categoria} onChange={setCategoria} options={[
                    { v: "",           l: "— No cambiar —" },
                    { v: "nueva",      l: "Nueva" },
                    { v: "reencauche", l: "Reencauche" },
                  ]} />
                </ModalField>
                <ModalField label="Construcción">
                  <FichaSelect value={construccion} onChange={setConstruccion} options={[
                    { v: "",             l: "— No cambiar —" },
                    { v: "Radial",       l: "Radial" },
                    { v: "Convencional", l: "Convencional" },
                  ]} />
                </ModalField>
                <ModalField label="Tipo">
                  <FichaSelect value={tipo} onChange={setTipo} options={[
                    { v: "",          l: "— No cambiar —" },
                    { v: "Tubeless",  l: "Tubeless" },
                    { v: "Tube-Type", l: "Tube-Type" },
                  ]} />
                </ModalField>
                <ModalField label="Reencauchable">
                  <FichaSelect value={reencauchable} onChange={(v) => setReencauchable(v as "keep" | "true" | "false")} options={[
                    { v: "keep",  l: "— No cambiar —" },
                    { v: "true",  l: "Sí" },
                    { v: "false", l: "No" },
                  ]} />
                </ModalField>
                <ModalField label="Posición">
                  <FichaText value={posicion} onChange={setPosicion} placeholder="Ej: Direccional" />
                </ModalField>
                <ModalField label="Segmento">
                  <FichaText value={segmento} onChange={setSegmento} placeholder="Ej: Tractomula, Bus" />
                </ModalField>
                <ModalField label="Tipo de banda">
                  <FichaText value={tipoBanda} onChange={setTipoBanda} placeholder="Ej: Bandag BDR-HT" />
                </ModalField>
                <ModalField label="Índice de carga">
                  <FichaText value={indiceCarga} onChange={setIndiceCarga} placeholder="Ej: 152/148" />
                </ModalField>
                <ModalField label="Índice de velocidad">
                  <FichaText value={indiceVelocidad} onChange={setIndiceVelocidad} placeholder="Ej: M, K, L" />
                </ModalField>
                <ModalField label="Cinturones">
                  <FichaText value={cinturones} onChange={setCinturones} placeholder="Ej: 4B+2N" />
                </ModalField>
                <ModalField label="PR (ply rating)">
                  <FichaText value={pr} onChange={setPr} placeholder="Ej: 16, 18PR" />
                </ModalField>
                <ModalField label="Profundidad RTD (mm)">
                  <FichaNumber value={rtdMm} onChange={setRtdMm} placeholder="Ej: 16" step="0.1" />
                </ModalField>
                <ModalField label="PSI recomendado">
                  <FichaNumber value={psiRecomendado} onChange={setPsiRecomendado} placeholder="Ej: 110" />
                </ModalField>
                <ModalField label="Peso (kg)">
                  <FichaNumber value={pesoKg} onChange={setPesoKg} placeholder="Ej: 65" step="0.1" />
                </ModalField>
                <ModalField label="% Pavimento">
                  <FichaNumber value={pctPavimento} onChange={setPctPavimento} placeholder="0–100" />
                  {pctPavimento !== "" && !Number.isNaN(Number(pctPavimento)) && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Se guarda también % destapado = {Math.max(0, Math.min(100, 100 - Number(pctPavimento)))}
                    </p>
                  )}
                </ModalField>
              </div>

              <ModalField label="Notas Colombia — opcional">
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.2)", resize: "vertical" }}
                  value={notasColombia}
                  onChange={(e) => setNotasColombia(e.target.value)}
                  placeholder="Comentarios sobre la banda en operación local."
                />
              </ModalField>
            </div>
          )}

          {done && (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.20)",
              }}
            >
              <p className="text-sm font-black text-[#0A183A]">
                {done.updated} SKU{done.updated !== 1 ? "s" : ""} actualizado{done.updated !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-end gap-2" style={{ borderTop: "1px solid rgba(10,24,58,0.08)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm font-bold text-[#0A183A] hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          {!done && (
            <button
              type="button"
              onClick={handleApply}
              disabled={
                saving ||
                !preview ||
                preview.length === 0 ||
                !payloadHasFields
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {preview ? `Aplicar a ${preview.length}` : "Aplicar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function FichaSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
      style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function FichaText({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
      style={{ border: "1px solid rgba(52,140,203,0.2)" }} />
  );
}

function FichaNumber({ value, onChange, placeholder, step }: {
  value: string; onChange: (v: string) => void; placeholder?: string; step?: string;
}) {
  return (
    <input type="number" value={value} step={step} min="0"
      onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
      style={{ border: "1px solid rgba(52,140,203,0.2)" }} />
  );
}
