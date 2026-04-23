"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, Users, Package, Calendar, Loader2, AlertCircle, Download,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

type Stats = {
  totals: { allTime: number; range: number; days: number };
  byUser: Array<{ user: { id: string; name: string; email: string | null }; count: number }>;
  bySku:  Array<{ sku: { id: string; marca: string; modelo: string; dimension: string; skuRef: string }; count: number }>;
  daily:  Array<{ day: string; count: number }>;
};

export default function CatalogoSkuStatsPage() {
  const [days,    setDays]    = useState(30);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await authFetch(`${API_BASE}/catalog/dist/downloads/stats?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Stats = await res.json();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando estadísticas");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // Daily series chart — normalize to range [0..1] for a simple bar chart.
  const maxDaily = useMemo(() => Math.max(1, ...(stats?.daily.map((d) => d.count) ?? [1])), [stats]);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 px-3 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <Link href="/dashboard/catalogoSku" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-[#0A183A]" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none">Descargas de catálogo</h1>
            <p className="text-xs text-[#348CCB] mt-0.5">Seguimiento para el gerente de ventas</p>
          </div>
        </div>
        <div className="ml-auto">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
            style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }}>
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
            <option value={365}>12 meses</option>
          </select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-700 flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {loading && !stats ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard icon={Download} label="Descargas últimas" value={stats.totals.range.toLocaleString("es-CO")} sub={`${days} días`} />
              <KpiCard icon={Users} label="Usuarios activos" value={stats.byUser.length.toLocaleString("es-CO")} sub="con al menos 1 descarga" />
              <KpiCard icon={Calendar} label="Total histórico" value={stats.totals.allTime.toLocaleString("es-CO")} sub="todas las descargas" />
            </div>

            {/* Daily chart */}
            <section className="rounded-2xl p-4 sm:p-5" style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}>
              <h2 className="text-sm font-black text-[#0A183A] mb-3">Descargas por día</h2>
              {stats.daily.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">Sin datos en el rango seleccionado</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {stats.daily.map((d) => {
                    const pct = (d.count / maxDaily) * 100;
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div className="w-full rounded-t flex-1 flex items-end">
                          <div className="w-full rounded-t transition-all"
                            style={{
                              height: `${pct}%`, minHeight: d.count > 0 ? 3 : 0,
                              background: "linear-gradient(180deg, #1E76B6, #348CCB)",
                            }} title={`${d.day}: ${d.count}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {stats.daily.length > 0 && (
                <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                  <span>{new Date(stats.daily[0].day).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
                  <span>{new Date(stats.daily[stats.daily.length - 1].day).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
                </div>
              )}
            </section>

            {/* By user */}
            <section className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(52,140,203,0.1)", background: "rgba(10,24,58,0.02)" }}>
                <Users className="w-4 h-4 text-[#1E76B6]" />
                <h2 className="text-sm font-black text-[#0A183A]">Por vendedor</h2>
              </div>
              {stats.byUser.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Sin descargas en el rango</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(52,140,203,0.08)" }}>
                  {stats.byUser.map((row) => (
                    <div key={row.user.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                        {row.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0A183A] truncate">{row.user.name}</p>
                        {row.user.email && <p className="text-[10px] text-gray-400 truncate">{row.user.email}</p>}
                      </div>
                      <span className="text-sm font-black text-[#1E76B6] tabular-nums">{row.count.toLocaleString("es-CO")}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* By SKU */}
            <section className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(52,140,203,0.1)", background: "rgba(10,24,58,0.02)" }}>
                <Package className="w-4 h-4 text-[#1E76B6]" />
                <h2 className="text-sm font-black text-[#0A183A]">Por SKU</h2>
              </div>
              {stats.bySku.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Sin descargas en el rango</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(52,140,203,0.08)" }}>
                  {stats.bySku.map((row) => (
                    <Link key={row.sku.id} href={`/dashboard/catalogoSku/${row.sku.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0A183A] truncate">
                          {row.sku.marca} · {row.sku.modelo}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">
                          {row.sku.dimension} · {row.sku.skuRef}
                        </p>
                      </div>
                      <span className="text-sm font-black text-[#1E76B6] tabular-nums">{row.count.toLocaleString("es-CO")}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
      <Icon className="w-4 h-4 text-white/60 mb-2" />
      <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 mt-2">{label}</p>
      <p className="text-[9px] text-white/40 mt-0.5">{sub}</p>
    </div>
  );
}
