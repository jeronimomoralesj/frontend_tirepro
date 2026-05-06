"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, ShoppingCart, Eye, TrendingUp, Package, MapPin, Loader2,
  ArrowUpRight, X, Calendar, ChevronRight, Image as ImageIcon,
} from "lucide-react";
import { productHref } from "../../../marketplace/product/_lib/url";

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

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("es-CO").format(n);

// =============================================================================
// Types — match the NestJS marketplace-stats.service.ts response shape
// exactly. If the backend ever evolves, update these and TS will flag
// every divergent reference.
// =============================================================================

interface OrdersByStatus {
  pendiente: number;
  confirmado: number;
  enviado: number;
  entregado: number;
  cancelado: number;
}

interface ProductRow {
  listingId: string;
  marca: string;
  modelo: string;
  dimension: string;
  imageUrl: string | null;
}
interface SoldProduct extends ProductRow { unitsSold: number; revenue: number; orderCount: number; }
interface ViewedProduct extends ProductRow { views: number; }

interface Overview {
  windowDays: number;
  ordersByStatus: OrdersByStatus;
  revenue: { today: number; last7: number; last30: number; mtd: number; ytd: number; allTime: number };
  ordersCount: { today: number; last7: number; last30: number };
  aov: number;
  topProducts: SoldProduct[];
  profileViews: { last7: number; last30: number };
  topViewedProducts: ViewedProduct[];
}

interface ProductDetail {
  windowDays: number;
  listing: {
    id: string; marca: string; modelo: string; dimension: string;
    precioCop: number; imageUrl: string | null;
    cantidadDisponible: number; isActive: boolean;
  };
  totalViews: number;
  viewsByDay: Array<{ date: string; count: number }>;
  viewsByCity: Array<{ city: string; count: number }>;
  viewsByCountry: Array<{ country: string; count: number }>;
  ordersFromViews: number;
  conversionPct: number | null;
}

const STATUS_META: Record<keyof OrdersByStatus, { label: string; color: string; bg: string }> = {
  pendiente:  { label: "Pendientes",  color: "#b45309", bg: "rgba(245,158,11,0.12)" },
  confirmado: { label: "Confirmados", color: "#1E76B6", bg: "rgba(30,118,182,0.12)" },
  enviado:    { label: "Enviados",    color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  entregado:  { label: "Entregados",  color: "#059669", bg: "rgba(16,185,129,0.12)" },
  cancelado:  { label: "Cancelados",  color: "#9ca3af", bg: "rgba(100,116,139,0.10)" },
};

// =============================================================================
// Page
// =============================================================================

export default function EstadisticasPage() {
  const [days, setDays] = useState<number>(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerListingId, setDrawerListingId] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/dist/stats/overview?days=${days}`);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = (await res.json()) as Overview;
      setOverview(data);
    } catch (e) {
      setError((e instanceof Error ? e.message : "").slice(0, 200) || "No se pudieron cargar las estadísticas");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-[#0A183A] leading-none tracking-tight">Estadísticas</h1>
              <p className="text-xs text-[#348CCB] mt-0.5">Datos reales de tu marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-xl text-xs font-bold text-[#173D68] border border-gray-200 bg-white"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
              <option value={365}>Último año</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-700"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        {loading && !overview ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : !overview ? null : (
          <>
            {/* KPI cards — top-line numbers. Each one renders a real DB aggregate
                with no mocked or extrapolated value. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard
                label="Ingresos (30 días)"
                value={fmtCOP(overview.revenue.last30)}
                hint={overview.revenue.today > 0 ? `Hoy: ${fmtCOP(overview.revenue.today)}` : "Sin pedidos hoy"}
                icon={TrendingUp}
                accent="#059669"
              />
              <KpiCard
                label="Pedidos (30 días)"
                value={fmtNum(overview.ordersCount.last30)}
                hint={`Ticket prom. ${overview.aov > 0 ? fmtCOP(overview.aov) : "—"}`}
                icon={ShoppingCart}
                accent="#1E76B6"
              />
              <KpiCard
                label="Vistas al perfil (30d)"
                value={fmtNum(overview.profileViews.last30)}
                hint={`7 días: ${fmtNum(overview.profileViews.last7)}`}
                icon={Eye}
                accent="#7c3aed"
              />
              <KpiCard
                label="Ingresos del año"
                value={fmtCOP(overview.revenue.ytd)}
                hint={`Mes en curso: ${fmtCOP(overview.revenue.mtd)}`}
                icon={BarChart3}
                accent="#f59e0b"
              />
            </div>

            {/* Pedidos por estado — operational queue */}
            <section className="bg-white rounded-2xl p-5"
              style={{ boxShadow: "0 8px 24px -16px rgba(10,24,58,0.18)", border: "1px solid rgba(10,24,58,0.05)" }}
            >
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Operación</p>
                  <h2 className="text-base font-black text-[#0A183A]">Pedidos por estado</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Conteo de todos los pedidos por estado actual.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(Object.keys(STATUS_META) as Array<keyof OrdersByStatus>).map((k) => {
                  const meta = STATUS_META[k];
                  const count = overview.ordersByStatus[k] ?? 0;
                  return (
                    <div key={k} className="rounded-xl p-3"
                      style={{ background: meta.bg, border: `1px solid ${meta.color}22` }}>
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color }}>
                        {meta.label}
                      </p>
                      <p className="text-2xl font-black mt-1 tabular-nums" style={{ color: meta.color }}>
                        {fmtNum(count)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Top vendidos */}
            <section className="bg-white rounded-2xl p-5"
              style={{ boxShadow: "0 8px 24px -16px rgba(10,24,58,0.18)", border: "1px solid rgba(10,24,58,0.05)" }}>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Más vendidos</p>
                  <h2 className="text-base font-black text-[#0A183A]">Top productos por unidades ({overview.windowDays} días)</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Solo cuenta pedidos pagados (Bold confirmó) y no cancelados.
                  </p>
                </div>
              </div>
              {overview.topProducts.length === 0 ? (
                <EmptyState text="Aún no hay pedidos pagados en este período." />
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <th className="px-2 py-2">Producto</th>
                        <th className="px-2 py-2 text-right">Unidades</th>
                        <th className="px-2 py-2 text-right">Pedidos</th>
                        <th className="px-2 py-2 text-right">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.topProducts.map((p, i) => (
                        <tr key={p.listingId} className={i % 2 === 0 ? "bg-gray-50/50" : ""}>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <ProductThumb url={p.imageUrl} alt={`${p.marca} ${p.modelo}`} />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E76B6]">{p.marca}</p>
                                <p className="text-[12px] font-bold text-[#0A183A] truncate">{p.modelo}</p>
                                <p className="text-[10px] text-gray-400">{p.dimension}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-black text-[#0A183A] tabular-nums">{fmtNum(p.unitsSold)}</td>
                          <td className="px-2 py-2 text-right text-gray-600 tabular-nums">{fmtNum(p.orderCount)}</td>
                          <td className="px-2 py-2 text-right font-bold text-[#059669] tabular-nums">{fmtCOP(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Top vistos */}
            <section className="bg-white rounded-2xl p-5"
              style={{ boxShadow: "0 8px 24px -16px rgba(10,24,58,0.18)", border: "1px solid rgba(10,24,58,0.05)" }}>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Más vistos</p>
                  <h2 className="text-base font-black text-[#0A183A]">Top productos por vistas ({overview.windowDays} días)</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Toca un producto para ver detalle de visitantes y ciudades.
                  </p>
                </div>
              </div>
              {overview.topViewedProducts.length === 0 ? (
                <EmptyState text="Aún no hay vistas registradas en este período." />
              ) : (
                <div className="space-y-1">
                  {overview.topViewedProducts.map((p, i) => (
                    <button
                      key={p.listingId}
                      onClick={() => setDrawerListingId(p.listingId)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-[11px] font-black w-5 text-gray-400 tabular-nums">{i + 1}</span>
                      <ProductThumb url={p.imageUrl} alt={`${p.marca} ${p.modelo}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E76B6]">{p.marca}</p>
                        <p className="text-[13px] font-bold text-[#0A183A] truncate">{p.modelo}</p>
                        <p className="text-[10px] text-gray-400">{p.dimension}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Eye className="w-3.5 h-3.5 text-[#7c3aed]" />
                        <span className="text-sm font-black text-[#0A183A] tabular-nums">{fmtNum(p.views)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {drawerListingId && (
        <ProductDetailDrawer
          listingId={drawerListingId}
          days={days}
          onClose={() => setDrawerListingId(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function KpiCard({ label, value, hint, icon: Icon, accent }: {
  label: string; value: string; hint?: string; icon: any; accent: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{ boxShadow: "0 8px 24px -16px rgba(10,24,58,0.18)", border: "1px solid rgba(10,24,58,0.05)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}14` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-[#0A183A] mt-2 tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function ProductThumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="w-full h-full object-contain p-1" />
      ) : (
        <ImageIcon className="w-4 h-4 text-gray-300" />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-gray-400 gap-2">
      <Package className="w-8 h-8 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// =============================================================================
// Per-product detail drawer
// =============================================================================

function ProductDetailDrawer({ listingId, days, onClose }: {
  listingId: string; days: number; onClose: () => void;
}) {
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`${API_BASE}/marketplace/dist/stats/product/${listingId}?days=${days}`);
        if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e instanceof Error ? e.message : "").slice(0, 200) || "Error cargando detalle");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, days]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Sparkline scaling — find max for chart bar heights
  const maxDay = useMemo(() => {
    if (!data?.viewsByDay?.length) return 1;
    return Math.max(1, ...data.viewsByDay.map((d) => d.count));
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Detalle del producto</p>
            <h2 className="text-base font-black text-[#0A183A] truncate">
              {data ? `${data.listing.marca} ${data.listing.modelo}` : "Cargando…"}
            </h2>
            {data && <p className="text-[11px] text-gray-500">{data.listing.dimension} · {fmtCOP(data.listing.precioCop)}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[#1E76B6]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !data ? null : (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Vistas" value={fmtNum(data.totalViews)} accent="#7c3aed" />
                <MiniStat label="Pedidos" value={fmtNum(data.ordersFromViews)} accent="#059669" />
                <MiniStat label="Conversión" value={data.conversionPct != null ? `${data.conversionPct.toFixed(1)}%` : "—"} accent="#1E76B6" />
                <MiniStat label="Stock" value={fmtNum(data.listing.cantidadDisponible)} accent="#0A183A" />
              </div>

              {/* Sparkline */}
              <section>
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Vistas por día ({data.windowDays}d)</p>
                {data.viewsByDay.length === 0 ? (
                  <EmptyState text="Sin vistas registradas en este período." />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-end gap-1 h-20">
                      {data.viewsByDay.map((d) => {
                        const h = Math.max(2, (d.count / maxDay) * 100);
                        return (
                          <div
                            key={d.date}
                            title={`${d.date}: ${d.count} vista${d.count === 1 ? "" : "s"}`}
                            className="flex-1 rounded-t bg-[#1E76B6]/70 hover:bg-[#1E76B6] transition-colors"
                            style={{ height: `${h}%`, minWidth: 4 }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 font-medium">
                      <span>{data.viewsByDay[0]?.date}</span>
                      <span>{data.viewsByDay[data.viewsByDay.length - 1]?.date}</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Cities */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-[#1E76B6]" />
                  <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Ciudades</p>
                </div>
                {data.viewsByCity.length === 0 ? (
                  <p className="text-[11px] text-gray-500">No tenemos datos geográficos para este período.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.viewsByCity.map((c) => {
                      const max = data.viewsByCity[0].count;
                      const pct = (c.count / max) * 100;
                      return (
                        <div key={c.city} className="flex items-center gap-3 text-sm">
                          <span className="w-32 sm:w-40 text-[12px] font-bold text-[#0A183A] truncate">{c.city}</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#1E76B6,#348CCB)" }} />
                          </div>
                          <span className="w-12 text-right text-[12px] font-black text-[#0A183A] tabular-nums">{fmtNum(c.count)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Countries */}
              {data.viewsByCountry.length > 0 && (
                <section>
                  <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Países</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.viewsByCountry.map((c) => (
                      <span key={c.country}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-[#0A183A]">
                        {c.country} · {fmtNum(c.count)}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Footer link */}
              <div className="pt-3 border-t border-gray-100">
                <a
                  href={productHref(data.listing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#1E76B6] hover:underline"
                >
                  Ver el producto en el marketplace
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}>
      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: accent }}>{label}</p>
      <p className="text-base sm:text-lg font-black mt-0.5 tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}
