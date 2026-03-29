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
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

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

  async function updateStatus(orderId: string, status: string, cancelReasonText?: string) {
    await authFetch(`${API_BASE}/marketplace/orders/${orderId}/status`, {
      method: "PATCH", body: JSON.stringify({ distributorId: companyId, status, cancelReason: cancelReasonText }),
    });
    fetchData(companyId);
  }

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab);

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-6">
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
                {stats.avgResponseTimeHours != null && (
                  <div className="rounded-xl p-4 bg-white border border-gray-100 col-span-2 sm:col-span-1">
                    <Clock className="w-4 h-4 text-[#f97316] mb-1" />
                    <p className="text-xl font-black text-[#0A183A]">
                      {stats.avgResponseTimeHours < 1 ? `${Math.round(stats.avgResponseTimeHours * 60)}min` : `${stats.avgResponseTimeHours}h`}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase">Tiempo de respuesta prom.</p>
                  </div>
                )}
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
                              <button onClick={() => { setCancelModal(order.id); setCancelReason(""); }}
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

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #991b1b, #ef4444)" }}>
              <h3 className="font-bold text-white text-sm">Cancelar pedido</h3>
              <p className="text-[10px] text-white/70 mt-0.5">El cliente recibira un email con el motivo.</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Motivo de cancelacion *</label>
                <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 bg-gray-50 text-[#0A183A] focus:outline-none focus:border-red-300">
                  <option value="">Seleccionar motivo...</option>
                  <option value="Producto agotado">Producto agotado</option>
                  <option value="Precio incorrecto">Precio incorrecto</option>
                  <option value="No se puede entregar en esa zona">No se puede entregar en esa zona</option>
                  <option value="Datos del comprador incorrectos">Datos del comprador incorrectos</option>
                  <option value="Tiempo de entrega no viable">Tiempo de entrega no viable</option>
                </select>
              </div>
              <textarea value={cancelReason.startsWith("Otro:") ? cancelReason.slice(5) : ""}
                onChange={(e) => setCancelReason(e.target.value ? `Otro: ${e.target.value}` : cancelReason)}
                rows={2} placeholder="O escribe un motivo personalizado..."
                className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 bg-gray-50 text-[#0A183A] focus:outline-none focus:border-red-300 resize-none placeholder-gray-400" />
              <div className="flex gap-2">
                <button onClick={() => setCancelModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">
                  Volver
                </button>
                <button disabled={!cancelReason}
                  onClick={async () => {
                    await updateStatus(cancelModal, "cancelado", cancelReason);
                    setCancelModal(null);
                    setCancelReason("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-red-500 hover:bg-red-600 transition-colors">
                  Cancelar pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
