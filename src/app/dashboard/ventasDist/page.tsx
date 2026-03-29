"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Package, DollarSign, TrendingUp, ShoppingCart,
  Calendar, Check, Truck, Clock, X, ChevronDown,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) } });
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: "Pendiente",  color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  confirmado: { label: "Confirmado", color: "#1E76B6", bg: "rgba(30,118,182,0.1)" },
  enviado:    { label: "Enviado",    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  entregado:  { label: "Entregado",  color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  cancelado:  { label: "Cancelado",  color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export default function VentasDistPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const fetchData = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        authFetch(`${API_BASE}/marketplace/orders/distributor?distributorId=${cId}`),
        authFetch(`${API_BASE}/marketplace/sales/distributor?distributorId=${cId}`),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    try { const u = JSON.parse(stored); if (u.companyId) { setCompanyId(u.companyId); fetchData(u.companyId); } } catch { router.push("/login"); }
  }, [router, fetchData]);

  async function updateStatus(orderId: string, status: string) {
    await authFetch(`${API_BASE}/marketplace/orders/${orderId}/status`, {
      method: "PATCH", body: JSON.stringify({ distributorId: companyId, status }),
    });
    fetchData(companyId);
  }

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-[#0A183A] text-lg leading-none">Ventas del Marketplace</h1>
          <p className="text-xs text-[#348CCB] mt-0.5">{orders.length} pedido{orders.length !== 1 ? "s" : ""} total{orders.length !== 1 ? "es" : ""}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <>
            {/* KPIs */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                  <DollarSign className="w-4 h-4 text-white/50 mb-1" />
                  <p className="text-xl font-black text-white">{fmtCOP(stats.totalRevenue)}</p>
                  <p className="text-[10px] text-white/50 uppercase">Ingresos totales</p>
                </div>
                <div className="rounded-xl p-4 bg-white border border-gray-100">
                  <Package className="w-4 h-4 text-[#348CCB] mb-1" />
                  <p className="text-xl font-black text-[#0A183A]">{stats.totalUnitsSold}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Unidades vendidas</p>
                </div>
                <div className="rounded-xl p-4 bg-white border border-gray-100">
                  <TrendingUp className="w-4 h-4 text-[#22c55e] mb-1" />
                  <p className="text-xl font-black text-[#0A183A]">{stats.totalOrders}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Pedidos</p>
                </div>
              </div>
            )}

            {/* Top products */}
            {stats?.topListings?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-black text-[#0A183A] uppercase tracking-wider mb-3">Productos mas vendidos</p>
                <div className="space-y-2">
                  {stats.topListings.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-[#1E76B6]/10 text-[#1E76B6] text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#0A183A] truncate">{item.listing.marca} {item.listing.modelo}</p>
                        <p className="text-[10px] text-gray-400">{item.listing.dimension} · {item.unitsSold} uds</p>
                      </div>
                      <span className="text-xs font-black text-[#0A183A]">{fmtCOP(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{ key: "all", label: "Todos" }, { key: "pendiente", label: "Pendientes" }, { key: "confirmado", label: "Confirmados" }, { key: "enviado", label: "Enviados" }, { key: "entregado", label: "Entregados" }].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                  style={{ background: tab === t.key ? "#0A183A" : "white", color: tab === t.key ? "white" : "#555", border: tab === t.key ? "none" : "1px solid #e5e5e5" }}>
                  {t.label} ({t.key === "all" ? orders.length : orders.filter((o) => o.status === t.key).length})
                </button>
              ))}
            </div>

            {/* Orders list */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold text-[#0A183A]">Sin pedidos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((order: any) => {
                  const st = STATUS_META[order.status] ?? STATUS_META.pendiente;
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[#0A183A]">{order.listing?.marca} {order.listing?.modelo}</p>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {order.buyerName} · {order.buyerEmail}
                            {order.buyerPhone && ` · ${order.buyerPhone}`}
                            {order.buyerCity && ` · ${order.buyerCity}`}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString("es-CO")} · {order.quantity} uds · #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          {order.buyerAddress && <p className="text-[10px] text-gray-400">Entrega: {order.buyerAddress}</p>}
                          {order.notas && <p className="text-[10px] text-gray-500 mt-1 italic">"{order.notas}"</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-black text-[#0A183A]">{fmtCOP(order.totalCop)}</p>
                          {order.status === "pendiente" && (
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => updateStatus(order.id, "confirmado")}
                                className="px-2 py-1 rounded-lg text-[9px] font-bold text-white bg-[#1E76B6] hover:opacity-90">
                                Confirmar
                              </button>
                              <button onClick={() => updateStatus(order.id, "cancelado")}
                                className="px-2 py-1 rounded-lg text-[9px] font-bold text-red-500 border border-red-200 hover:bg-red-50">
                                Cancelar
                              </button>
                            </div>
                          )}
                          {order.status === "confirmado" && (
                            <button onClick={() => updateStatus(order.id, "enviado")}
                              className="mt-1 px-2 py-1 rounded-lg text-[9px] font-bold text-white bg-[#8b5cf6] hover:opacity-90">
                              Marcar enviado
                            </button>
                          )}
                          {order.status === "enviado" && (
                            <button onClick={() => updateStatus(order.id, "entregado")}
                              className="mt-1 px-2 py-1 rounded-lg text-[9px] font-bold text-white bg-[#22c55e] hover:opacity-90">
                              Marcar entregado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
