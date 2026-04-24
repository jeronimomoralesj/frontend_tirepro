"use client";

// -----------------------------------------------------------------------------
// Discovery page — admin + catalogo_admin only.
// Searches the FULL master catalog (not just the dist's subscriptions) so
// the curator can add tires to their list. Each row shows an "Agregar"
// button that POSTs /catalog/dist/:id/subscribe. Already-subscribed rows
// render a "Ya en tu catálogo" badge instead.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, Loader2, Package, Filter, X, Plus, Check, AlertCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

type DiscoverRow = {
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
  reencauchable: boolean;
  subscribed: boolean;
};

export default function CatalogoSkuExplorarPage() {
  const router = useRouter();
  const [q,         setQ]         = useState("");
  const [eje,       setEje]       = useState("");
  const [categoria, setCategoria] = useState("");
  const [page,      setPage]      = useState(1);
  const [items,     setItems]     = useState<DiscoverRow[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  // Tracks per-row add/remove state so the button shows a spinner
  // instead of flickering the whole list during the round-trip.
  const [pending,   setPending]   = useState<Set<string>>(new Set());
  const [toast,     setToast]     = useState("");

  // Gate the page on role — redirect plain catalogo users away. The
  // backend refuses the endpoint too, but avoiding the flash of a
  // page they'd see a 403 on is nicer.
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u?.role !== "admin" && u?.role !== "catalogo_admin") {
        router.replace("/dashboard/catalogoSku");
      }
    } catch { /* keep rendering */ }
  }, [router]);

  const PAGE_SIZE = 24;

  const fetchItems = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (q.trim())  params.set("q", q.trim());
      if (eje)       params.set("eje", eje);
      if (categoria) params.set("categoria", categoria);
      const res = await authFetch(`${API_BASE}/catalog/dist/discover?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error buscando en el catálogo");
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, q, eje, categoria]);

  useEffect(() => {
    const t = setTimeout(() => fetchItems(), 250);
    return () => clearTimeout(t);
  }, [fetchItems]);

  useEffect(() => { setPage(1); }, [q, eje, categoria]);

  async function toggleSubscription(row: DiscoverRow) {
    setPending((prev) => new Set(prev).add(row.id));
    setError("");
    try {
      const method = row.subscribed ? "DELETE" : "POST";
      const res = await authFetch(`${API_BASE}/catalog/dist/${row.id}/subscribe`, { method });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      // Flip the row's subscribed flag in-place so the user gets instant
      // feedback — no need to re-fetch the whole list.
      setItems((prev) => prev.map((r) =>
        r.id === row.id ? { ...r, subscribed: !r.subscribed } : r));
      setToast(row.subscribed ? "Quitada de tu catálogo" : "Agregada a tu catálogo");
      setTimeout(() => setToast(""), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setPending((prev) => {
        const next = new Set(prev); next.delete(row.id); return next;
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter  = !!(q || eje || categoria);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <Link href="/dashboard/catalogoSku" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-[#0A183A]" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none">Explorar catálogo</h1>
          <p className="text-xs text-[#348CCB] mt-0.5">Agrega las llantas que vendes a tu catálogo</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por marca, modelo, dimensión o SKU"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
              style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }} />
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

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{loading ? "Cargando…" : `${total.toLocaleString("es-CO")} SKU${total === 1 ? "" : "s"} en el catálogo global`}</span>
          {hasFilter && (
            <button onClick={() => { setQ(""); setEje(""); setCategoria(""); }}
              className="flex items-center gap-1 text-[#1E76B6] hover:underline">
              <Filter className="w-3 h-3" />
              Limpiar filtros
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm text-red-700"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {toast && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-emerald-700"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Check className="w-4 h-4" />
            {toast}
          </div>
        )}

        {/* Results — rows, not cards, so the add button has a clear home */}
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Package className="w-10 h-10 opacity-40" />
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden divide-y"
            style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)", borderColor: "rgba(52,140,203,0.1)" }}>
            {items.map((row) => {
              const isPending = pending.has(row.id);
              return (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-[#348CCB]">{row.marca}</span>
                      <span className="text-sm font-black text-[#0A183A] truncate">{row.modelo}</span>
                      <span className="text-xs text-gray-500 font-mono">{row.dimension}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {[row.categoria, row.terreno, row.ejeTirePro, row.indiceCarga, row.reencauchable ? "reencauchable" : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {row.subscribed ? (
                    <button onClick={() => toggleSubscription(row)} disabled={isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#059669", border: "1px solid rgba(16,185,129,0.35)" }}>
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      En tu catálogo
                    </button>
                  ) : (
                    <button onClick={() => toggleSubscription(row)} disabled={isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Agregar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}>Anterior</button>
            <span className="text-xs text-gray-500 font-medium px-2">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
}
