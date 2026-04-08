"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Package, ShoppingBag, RotateCcw, X,
  CheckCircle, Clock, Truck, AlertCircle,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  pendiente:  { label: "Pendiente",  color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: Clock },
  confirmado: { label: "Confirmado", color: "#1E76B6", bg: "rgba(30,118,182,0.1)",  icon: CheckCircle },
  enviado:    { label: "Enviado",    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: Truck },
  entregado:  { label: "Entregado",  color: "#22c55e", bg: "rgba(34,197,94,0.1)",   icon: CheckCircle },
  cancelado:  { label: "Cancelado",  color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: X },
};

const RETURN_META: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: "Devolución pendiente", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  aprobada:  { label: "Devolución aprobada",  color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  rechazada: { label: "Devolución rechazada", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

interface Order {
  id: string;
  listingId: string;
  quantity: number;
  totalCop: number;
  status: string;
  createdAt: string;
  buyerName: string;
  buyerCity?: string;
  buyerAddress?: string;
  notas?: string;
  returnStatus?: string | null;
  returnReason?: string | null;
  returnRequestedAt?: string | null;
  listing?: {
    id: string; marca: string; modelo: string; dimension: string; tipo: string;
    imageUrls?: string[] | null; coverIndex?: number;
    distributor?: { id: string; name: string };
  };
}

export default function MisPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [returnModal, setReturnModal] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (!token || !user.id) { setNeedsLogin(true); setLoading(false); return; }
      const res = await fetch(`${API_BASE}/marketplace/orders/user?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrders(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function submitReturn() {
    if (!returnModal || !returnReason.trim()) return;
    setReturnSubmitting(true);
    setReturnError("");
    try {
      const token = localStorage.getItem("token") ?? "";
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      const res = await fetch(`${API_BASE}/marketplace/orders/${returnModal.id}/return-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, reason: returnReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo enviar la solicitud");
      }
      setReturnModal(null);
      setReturnReason("");
      fetchOrders();
    } catch (e) {
      setReturnError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setReturnSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)" }}
      >
        <div className="absolute inset-0 opacity-10" aria-hidden style={{
          backgroundImage: "radial-gradient(circle at 20% 0%, rgba(52,140,203,0.6), transparent 40%), radial-gradient(circle at 80% 100%, rgba(245,158,11,0.4), transparent 40%)",
        }} />
        <div className="relative max-w-4xl mx-auto px-3 sm:px-6 pt-5 pb-7">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-3 h-3" />
            Volver al marketplace
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">Mis pedidos</h1>
              <p className="text-[11px] sm:text-xs text-white/70 mt-1">
                {loading ? "Cargando…" : `${orders.length} pedido${orders.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 -mt-4 relative">
        {needsLogin ? (
          <div className="bg-white rounded-3xl p-8 text-center" style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}>
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-black text-[#0A183A]">Inicia sesión para ver tus pedidos</p>
            <Link href="/login"
              className="inline-block mt-4 px-5 py-2.5 rounded-2xl text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
              Iniciar sesión
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" /></div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center" style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}>
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-black text-[#0A183A]">Todavía no tienes pedidos</p>
            <p className="text-xs text-gray-500 mt-1">Cuando compres llantas en el marketplace aparecerán aquí.</p>
            <Link href="/marketplace"
              className="inline-block mt-4 px-5 py-2.5 rounded-2xl text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
              Ir al marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const st = STATUS_META[o.status] ?? STATUS_META.pendiente;
              const StatusIcon = st.icon;
              const ret = o.returnStatus ? RETURN_META[o.returnStatus] : null;
              const imgs = Array.isArray(o.listing?.imageUrls) ? o.listing!.imageUrls! : [];
              const cover = imgs.length > 0 ? imgs[o.listing?.coverIndex ?? 0] ?? imgs[0] : null;
              const canRequestReturn = !o.returnStatus && (o.status === "entregado" || o.status === "enviado");

              return (
                <div
                  key={o.id}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100"
                  style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}
                >
                  <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    <div
                      className="w-full sm:w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)", border: "1px solid rgba(30,118,182,0.08)" }}
                    >
                      {cover ? (
                        <img src={cover} alt={`${o.listing?.marca} ${o.listing?.modelo}`} className="w-full h-full object-contain p-2" />
                      ) : (
                        <Package className="w-7 h-7 text-gray-200" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: st.bg, color: st.color }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                        {ret && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: ret.bg, color: ret.color }}>
                            {ret.label}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono">#{o.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <p className="text-[10px] text-[#1E76B6] font-black uppercase tracking-widest mt-2">{o.listing?.marca}</p>
                      <Link href={`/marketplace/product/${o.listingId}`} className="text-sm font-black text-[#0A183A] hover:text-[#1E76B6] block leading-snug">
                        {o.listing?.modelo}
                      </Link>
                      <p className="text-[11px] text-gray-400">{o.listing?.dimension} · {o.quantity} uds</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(o.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                        {o.listing?.distributor && <> · {o.listing.distributor.name}</>}
                      </p>
                      {o.returnReason && (
                        <p className="text-[10px] text-gray-500 mt-1.5 italic">Motivo: {o.returnReason}</p>
                      )}
                    </div>

                    {/* Total + actions */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                      <p className="text-base sm:text-lg font-black text-[#0A183A]">{fmtCOP(o.totalCop)}</p>
                      {canRequestReturn && (
                        <button
                          onClick={() => { setReturnModal(o); setReturnReason(""); setReturnError(""); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black text-[#1E76B6] border border-[#1E76B6]/25 hover:bg-[#1E76B6]/5 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Solicitar devolución
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              className="rounded-2xl p-4 text-[11px] text-[#0A183A] flex items-start gap-2.5"
              style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.15)" }}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0 mt-0.5" />
              <span>
                Puedes solicitar la devolución de un pedido entregado dentro de los 30 días posteriores a
                la entrega. Revisa los detalles en nuestra{" "}
                <Link href="/marketplace/return-policy" className="font-black text-[#1E76B6] hover:underline">
                  política de devoluciones
                </Link>.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Return modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Solicitar devolución</h3>
                  <p className="text-[10px] text-white/70 mt-0.5">El distribuidor recibirá tu solicitud</p>
                </div>
                <button onClick={() => setReturnModal(null)} className="ml-auto text-white/70 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="px-3 py-2 rounded-xl bg-gray-50">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pedido</p>
                <p className="text-sm font-black text-[#0A183A]">{returnModal.listing?.marca} {returnModal.listing?.modelo}</p>
                <p className="text-[10px] text-gray-500">#{returnModal.id.slice(0, 8).toUpperCase()} · {returnModal.quantity} uds · {fmtCOP(returnModal.totalCop)}</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest block mb-1.5">Motivo *</label>
                <select
                  value={returnReason.startsWith("Otro:") ? "Otro" : returnReason}
                  onChange={(e) => setReturnReason(e.target.value === "Otro" ? "Otro: " : e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]"
                >
                  <option value="">Seleccionar motivo…</option>
                  <option value="Producto incorrecto">Producto incorrecto</option>
                  <option value="Defecto de fábrica">Defecto de fábrica</option>
                  <option value="Daños en el transporte">Daños en el transporte</option>
                  <option value="Cambio de opinión">Cambio de opinión</option>
                  <option value="Otro">Otro motivo</option>
                </select>
              </div>
              {(returnReason.startsWith("Otro:") || returnReason === "Otro") && (
                <textarea
                  value={returnReason.startsWith("Otro:") ? returnReason.slice(5).trimStart() : ""}
                  onChange={(e) => setReturnReason(`Otro: ${e.target.value}`)}
                  rows={3}
                  placeholder="Describe el motivo en detalle…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] resize-none"
                />
              )}
              {returnError && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[11px]" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700">{returnError}</span>
                </div>
              )}
              <p className="text-[10px] text-gray-400 leading-relaxed">
                El distribuidor tiene hasta 5 días hábiles para responder a tu solicitud. Te llegará un
                correo cuando haya una actualización.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setReturnModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  disabled={returnSubmitting || !returnReason.trim() || returnReason === "Otro" || returnReason === "Otro: "}
                  onClick={submitReturn}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-all"
                  style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                >
                  {returnSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Enviar solicitud"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MarketplaceFooter />
    </div>
  );
}
