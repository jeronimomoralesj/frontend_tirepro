"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Loader2,
  CheckCircle, Package, Truck, CreditCard,
} from "lucide-react";
import { useCart } from "../../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { trackViewCart, trackBeginCheckout, trackPurchase, trackRemoveFromCart } from "../../../lib/marketplaceAnalytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "";
const WOMPI_ENV = process.env.NEXT_PUBLIC_WOMPI_ENV ?? "sandbox";

declare global {
  interface Window {
    WidgetCheckout?: new (config: any) => { open: () => void };
  }
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default function CartPage() {
  const { items, count, total, updateQty, removeItem, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState({ buyerName: "", buyerEmail: "", buyerPhone: "", buyerAddress: "", buyerCity: "", buyerCompany: "", notas: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (user.name) setForm((f) => ({ ...f, buyerName: user.name, buyerEmail: user.email ?? "" }));
    } catch { /* guest */ }
    if (items.length > 0) trackViewCart(total, count);
  }, []);

  const totalWithIva = Math.round(total * 1.19);

  async function handleCheckout() {
    if (!form.buyerName || !form.buyerEmail || items.length === 0) return;
    trackBeginCheckout(total, items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity })));
    setSubmitting(true);
    const ids: string[] = [];
    const fullIds: string[] = [];
    let userId: string | undefined;
    try { userId = JSON.parse(localStorage.getItem("user") ?? "{}").id; } catch { /* */ }
    const token = localStorage.getItem("token") ?? "";

    // Create one order per item (each may go to a different distributor)
    for (const item of items) {
      try {
        const res = await fetch(`${API_BASE}/marketplace/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            listingId: item.listingId,
            quantity: item.quantity,
            userId,
            ...form,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          ids.push(data.id?.slice(0, 8).toUpperCase() ?? "");
          fullIds.push(data.id);
        }
      } catch { /* continue with other items */ }
    }

    // Try Wompi payment if configured
    if (WOMPI_PUBLIC_KEY && fullIds.length > 0 && window.WidgetCheckout) {
      const reference = fullIds.join("_");
      const amountInCents = totalWithIva * 100;

      try {
        // Get integrity signature from backend
        const sigRes = await fetch(`${API_BASE}/marketplace/payments/integrity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, amountInCents }),
        });
        const { signature } = await sigRes.json();

        const checkout = new window.WidgetCheckout({
          currency: "COP",
          amountInCents,
          reference,
          publicKey: WOMPI_PUBLIC_KEY,
          signature: { integrity: signature },
          redirectUrl: `${window.location.origin}/marketplace/cart?paid=true&ref=${reference}`,
          customerData: {
            email: form.buyerEmail,
            fullName: form.buyerName,
            phoneNumber: form.buyerPhone || undefined,
          },
        });
        checkout.open();
        setSubmitting(false);
        return; // Wompi handles the rest via redirect
      } catch (err) {
        console.warn("Wompi widget failed, falling back to direct order:", err);
      }
    }

    // Fallback: complete without payment gateway (existing flow)
    setOrderIds(ids);
    setSuccess(true);
    if (ids.length > 0) {
      trackPurchase({
        orderId: ids.join("-"),
        totalCop: totalWithIva,
        items: items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity, distributorName: i.distributorName })),
      });
    }
    clearCart();
    setSubmitting(false);
  }

  function getItemPrice(item: typeof items[0]) {
    const hasPromo = item.precioPromo != null && item.promoHasta && new Date(item.promoHasta) > new Date();
    return hasPromo ? item.precioPromo! : item.precioCop;
  }

  // Group items by distributor
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.distributorId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Handle Wompi redirect back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "true") {
      setSuccess(true);
      setOrderIds([params.get("ref")?.slice(0, 8).toUpperCase() ?? ""]);
      clearCart();
      // Clean URL
      window.history.replaceState({}, "", "/marketplace/cart");
    }
  }, []);

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A] placeholder-gray-400";

  const wompiScriptUrl = WOMPI_ENV === "production"
    ? "https://checkout.wompi.co/widget.js"
    : "https://checkout.wompi.co/widget.js";

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {WOMPI_PUBLIC_KEY && <Script src={wompiScriptUrl} strategy="lazyOnload" />}
      <MarketplaceNav />

      {/* Success */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-black text-[#0A183A] mb-2">Pedidos Confirmados</h2>
            <p className="text-sm text-gray-500 mb-1">{orderIds.length} pedido{orderIds.length !== 1 ? "s" : ""} creado{orderIds.length !== 1 ? "s" : ""}</p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {orderIds.map((id) => (
                <span key={id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">#{id}</span>
              ))}
            </div>
            <p className="text-sm text-gray-500 mb-6">Te enviamos emails de confirmacion. Los distribuidores se comunicaran contigo.</p>
            <Link href="/marketplace"
              className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
              Seguir comprando
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {items.length === 0 && !success ? (
          <div className="flex flex-col items-center py-24">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-bold text-[#0A183A]">Tu carrito esta vacio</p>
            <p className="text-sm text-gray-400 mt-1">Agrega productos desde el marketplace.</p>
            <Link href="/marketplace" className="mt-4 px-5 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
              Ir al Marketplace
            </Link>
          </div>
        ) : !success && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT — Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-[#0A183A]">Carrito ({count})</h1>
                <button onClick={clearCart} className="text-xs font-bold text-red-500 hover:underline">Vaciar carrito</button>
              </div>

              {Object.entries(grouped).map(([distId, distItems]) => (
                <div key={distId} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                  {/* Distributor header */}
                  <div className="px-5 py-3 flex items-center gap-2 bg-gray-50 border-b border-gray-100">
                    <Truck className="w-3.5 h-3.5 text-[#348CCB]" />
                    <Link href={`/marketplace/distributor/${distId}`} className="text-xs font-bold text-[#0A183A] hover:text-[#1E76B6]">
                      {distItems[0].distributorName}
                    </Link>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-50">
                    {distItems.map((item) => {
                      const price = getItemPrice(item);
                      return (
                        <div key={item.listingId} className="px-5 py-4 flex gap-4">
                          {/* Image */}
                          <div className="w-20 h-20 rounded-xl bg-[#fafafa] flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={`${item.marca} ${item.modelo} ${item.dimension}`} className="w-full h-full object-contain p-2" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-200" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/marketplace/product/${item.listingId}`} className="text-sm font-bold text-[#0A183A] hover:text-[#1E76B6] leading-snug">
                              {item.marca} {item.modelo}
                            </Link>
                            <p className="text-[11px] text-gray-400 mt-0.5">{item.dimension} · {item.tipo === "reencauche" ? "Reencauche" : "Nueva"}</p>
                            <p className="text-sm font-black text-[#0A183A] mt-1">{fmtCOP(price)}<span className="text-[10px] font-normal text-gray-400"> /unidad</span></p>
                          </div>

                          {/* Qty + remove */}
                          <div className="flex flex-col items-end gap-2">
                            <button onClick={() => removeItem(item.listingId)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                              <button onClick={() => updateQty(item.listingId, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-50">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 py-1 text-xs font-bold border-x border-gray-200">{item.quantity}</span>
                              <button onClick={() => updateQty(item.listingId, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-50">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs font-bold text-[#0A183A]">{fmtCOP(price * item.quantity)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT — Summary + Checkout */}
            <div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
                <h2 className="text-sm font-black text-[#0A183A] mb-4">Resumen del pedido</h2>

                <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Subtotal ({count} producto{count !== 1 ? "s" : ""})</span>
                    <span className="font-bold text-[#0A183A]">{fmtCOP(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">IVA (19%)</span>
                    <span className="font-bold text-[#0A183A]">{fmtCOP(Math.round(total * 0.19))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Distribuidores</span>
                    <span className="font-bold text-[#0A183A]">{Object.keys(grouped).length}</span>
                  </div>
                </div>

                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold text-[#0A183A]">Total con IVA</span>
                  <span className="text-xl font-black text-[#0A183A]">{fmtCOP(Math.round(total * 1.19))}</span>
                </div>
                <p className="text-[9px] text-gray-400 mb-5">Subtotal {fmtCOP(total)} + IVA {fmtCOP(Math.round(total * 0.19))}</p>

                {!showCheckout ? (
                  <button onClick={() => setShowCheckout(true)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                    Proceder al checkout
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Datos de contacto</p>
                    <input type="text" value={form.buyerName} onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                      placeholder="Nombre completo *" className={inputCls} />
                    <input type="email" value={form.buyerEmail} onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
                      placeholder="Email *" className={inputCls} />
                    <input type="tel" value={form.buyerPhone} onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                      placeholder="Telefono" className={inputCls} />
                    <input type="text" value={form.buyerCity} onChange={(e) => setForm((f) => ({ ...f, buyerCity: e.target.value }))}
                      placeholder="Ciudad" className={inputCls} />
                    <input type="text" value={form.buyerAddress} onChange={(e) => setForm((f) => ({ ...f, buyerAddress: e.target.value }))}
                      placeholder="Direccion de entrega" className={inputCls} />
                    <input type="text" value={form.buyerCompany} onChange={(e) => setForm((f) => ({ ...f, buyerCompany: e.target.value }))}
                      placeholder="Empresa (opcional)" className={inputCls} />
                    <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                      rows={2} placeholder="Notas..." className={`${inputCls} resize-none`} />

                    <button onClick={handleCheckout}
                      disabled={submitting || !form.buyerName || !form.buyerEmail}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : WOMPI_PUBLIC_KEY ? <><CreditCard className="w-4 h-4 inline mr-1.5" />Pagar — {fmtCOP(totalWithIva)}</> : `Confirmar — ${fmtCOP(totalWithIva)}`}
                    </button>
                    <button onClick={() => setShowCheckout(false)} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600">
                      Volver
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
