"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Loader2,
  CheckCircle, Package, Truck, MapPin, ChevronDown,
} from "lucide-react";
import { useCart } from "../../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { PaymentBadges } from "../../../components/marketplace/PaymentBadges";
import { trackViewCart, trackBeginCheckout, trackPurchase } from "../../../lib/marketplaceAnalytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

// Persisted buyer profile (saved on a successful checkout) — keeps the
// cart pre-populated next time the user comes back without forcing a
// backend round trip.
const PROFILE_KEY = "marketplace_buyer_profile";
const ADDRESSES_KEY = "marketplace_buyer_addresses";

type DistributorProfile = {
  id: string;
  name: string;
  ciudad: string | null;
  telefono: string | null;
  tipoEntrega: string | null;
  cobertura: Array<{ ciudad?: string; direccion?: string; lat?: number; lng?: number } | string> | null;
};

type SavedAddress = { ciudad: string; direccion: string };

export default function CartPage() {
  const router = useRouter();
  const { items, count, total, updateQty, removeItem, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState({
    buyerName: "", buyerEmail: "", buyerPhone: "",
    buyerAddress: "", buyerCity: "", buyerCompany: "", notas: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [distributorProfiles, setDistributorProfiles] = useState<Record<string, DistributorProfile>>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");

  // -- Pre-fill buyer details from logged-in user + persisted profile -------
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}");
      setForm((f) => ({
        ...f,
        buyerName:    f.buyerName    || stored.buyerName    || user.name  || "",
        buyerEmail:   f.buyerEmail   || stored.buyerEmail   || user.email || "",
        buyerPhone:   f.buyerPhone   || stored.buyerPhone   || user.telefono || "",
        buyerAddress: f.buyerAddress || stored.buyerAddress || "",
        buyerCity:    f.buyerCity    || stored.buyerCity    || "",
        buyerCompany: f.buyerCompany || stored.buyerCompany || "",
      }));
      // If logged-in user has a buyer companyId, pull ciudad/dirección from
      // the company so we don't have to ask again.
      if (user.companyId) {
        fetch(`${API_BASE}/companies/${user.companyId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((co) => {
            if (!co) return;
            setForm((f) => ({
              ...f,
              buyerCompany: f.buyerCompany || co.name    || "",
              buyerCity:    f.buyerCity    || co.ciudad  || "",
              buyerAddress: f.buyerAddress || co.direccion || "",
              buyerPhone:   f.buyerPhone   || co.telefono  || "",
            }));
          })
          .catch(() => { /* ignore */ });
      }
    } catch { /* guest */ }
    try {
      const addrs = JSON.parse(localStorage.getItem(ADDRESSES_KEY) ?? "[]");
      if (Array.isArray(addrs)) setSavedAddresses(addrs);
    } catch { /* ignore */ }
    if (items.length > 0) trackViewCart(total, count);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We charge what's in the cart, no automatic IVA gross-up. The dist's
  // own invoice handles IVA breakdown — showing one number on the cart
  // and a different one on Wompi confused buyers.
  const totalToCharge = total;

  // Single-step checkout: backend creates orders + Payment, returns a
  // ready-to-redirect Wompi checkout URL. Buyer pays on Wompi → returns
  // to the tracking page → webhook flips status async.
  const [checkoutError, setCheckoutError] = useState("");
  async function handlePay() {
    setCheckoutError("");
    if (!form.buyerName.trim() || !form.buyerEmail.trim() || items.length === 0) return;

    trackBeginCheckout(total, items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity })));
    setSubmitting(true);
    const token = localStorage.getItem("token") ?? "";

    // Persist the minimal buyer profile so a return visit doesn't have
    // to re-type. Address fields are no longer collected at checkout.
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        buyerName:    form.buyerName,
        buyerEmail:   form.buyerEmail,
        buyerPhone:   form.buyerPhone,
        buyerCompany: form.buyerCompany,
      }));
    } catch { /* ignore */ }

    try {
      const res = await fetch(`${API_BASE}/payments/wompi/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
          buyerName:    form.buyerName.trim(),
          buyerEmail:   form.buyerEmail.trim(),
          buyerPhone:   form.buyerPhone.trim() || undefined,
          buyerCompany: form.buyerCompany.trim() || undefined,
          notas:        form.notas.trim() || undefined,
          // Wompi's CloudFront WAF rejects http://localhost as a
          // redirect-url even in sandbox, so for local dev we let an
          // env var pin the redirect to the production host. The
          // tracking page is public anyway — buyer still lands on the
          // right order page after paying. In production the env var
          // isn't set, so we fall back to the actual origin.
          redirectBaseUrl:
            (process.env.NEXT_PUBLIC_PAYMENT_REDIRECT_BASE?.trim()) ||
            (typeof window !== "undefined" ? window.location.origin : "https://www.tirepro.com.co"),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "No se pudo iniciar el pago");
      }
      const data = await res.json() as {
        checkoutUrl: string;
        orderIds: string[];
        amountInCents: number;
      };
      if (!data?.checkoutUrl) throw new Error("Respuesta inválida del servidor");

      // Track purchase intent before we leave the page — Wompi return
      // doesn't always come back to /marketplace/cart so this is the
      // last chance to fire the analytics event.
      trackPurchase({
        orderId: data.orderIds.join("-"),
        totalCop: totalToCharge,
        items: items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity, distributorName: i.distributorName })),
      });
      clearCart();
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setCheckoutError(e?.message?.slice(0, 200) || "No se pudo iniciar el pago");
      setSubmitting(false);
    }
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

  // -- Fetch distributor profiles for delivery context ----------------------
  const distIds = useMemo(() => Object.keys(grouped).join(","), [grouped]);
  useEffect(() => {
    const ids = distIds ? distIds.split(",") : [];
    ids.forEach((id) => {
      if (!id || distributorProfiles[id]) return;
      fetch(`${API_BASE}/marketplace/distributor/${id}/profile`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setDistributorProfiles((p) => ({ ...p, [id]: d }));
        })
        .catch(() => { /* ignore */ });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distIds]);

  // -- Delivery context derived from the cart's distributors ---------------
  // Ciudad options come from the intersection of every distributor's
  // cobertura (so the same address works for all orders in the cart).
  // Address is required only if at least one distributor offers
  // tipoEntrega "domicilio" or "ambos" — if every distributor only does
  // "recogida", we don't ask for an address.
  const distributorList = Object.values(distributorProfiles);
  const deliveryCities: string[] = useMemo(() => {
    if (distributorList.length === 0) return [];
    const sets = distributorList.map((d) => {
      const arr = Array.isArray(d.cobertura) ? d.cobertura : [];
      const cities = arr
        .map((c) => (typeof c === "string" ? c : c?.ciudad ?? ""))
        .filter(Boolean) as string[];
      return new Set(cities);
    });
    if (sets.length === 0) return [];
    return Array.from(sets[0]).filter((c) => sets.every((s) => s.has(c))).sort();
  }, [distributorList]);
  const requiresAddress = useMemo(
    () => distributorList.some((d) => d.tipoEntrega === "domicilio" || d.tipoEntrega === "ambos"),
    [distributorList],
  );
  const onlyRecogida = distributorList.length > 0 && distributorList.every((d) => d.tipoEntrega === "recogida");

  // Saved addresses limited to the available delivery cities
  const validSavedAddresses = useMemo(
    () => savedAddresses.filter((a) => deliveryCities.length === 0 || deliveryCities.includes(a.ciudad)),
    [savedAddresses, deliveryCities],
  );

  function selectSavedAddress(idx: number) {
    const a = validSavedAddresses[idx];
    if (!a) return;
    setForm((f) => ({ ...f, buyerCity: a.ciudad, buyerAddress: a.direccion }));
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A] placeholder-gray-400";

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      {/* Hero band */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)" }}
      >
        <div className="absolute inset-0 opacity-10" aria-hidden style={{
          backgroundImage: "radial-gradient(circle at 20% 0%, rgba(52,140,203,0.6), transparent 40%), radial-gradient(circle at 80% 100%, rgba(245,158,11,0.4), transparent 40%)",
        }} />
        <div className="relative max-w-5xl mx-auto px-3 sm:px-6 pt-5 pb-7">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-3 h-3" />
            Seguir comprando
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">Tu carrito</h1>
              <p className="text-[11px] sm:text-xs text-white/70 mt-1">
                {count > 0 ? <>{count} producto{count !== 1 ? "s" : ""} · {Object.keys(grouped).length} distribuidor{Object.keys(grouped).length !== 1 ? "es" : ""}</> : "Sin productos"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 -mt-4 relative">
        {items.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* LEFT — Items */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center justify-end">
                <button onClick={clearCart} className="text-xs font-bold text-red-500 hover:underline">Vaciar carrito</button>
              </div>

              {Object.entries(grouped).map(([distId, distItems]) => (
                <div
                  key={distId}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100"
                  style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}
                >
                  {/* Distributor header */}
                  <div
                    className="px-5 py-3 flex items-center gap-2 border-b border-gray-100"
                    style={{ background: "linear-gradient(90deg,rgba(30,118,182,0.08),rgba(30,118,182,0.02))" }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-[#1E76B6]/15">
                      <Truck className="w-3.5 h-3.5 text-[#1E76B6]" />
                    </div>
                    <Link href={`/marketplace/distributor/${distId}`} className="text-xs font-black text-[#0A183A] hover:text-[#1E76B6]">
                      {distItems[0].distributorName}
                    </Link>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-50">
                    {distItems.map((item) => {
                      const price = getItemPrice(item);
                      return (
                        <div key={item.listingId} className="px-4 sm:px-5 py-4 flex gap-3 sm:gap-4">
                          {/* Image */}
                          <div
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)", border: "1px solid rgba(30,118,182,0.08)" }}
                          >
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={`${item.marca} ${item.modelo} ${item.dimension}`} className="w-full h-full object-contain p-2" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-200" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">{item.marca}</p>
                            <Link href={`/marketplace/product/${item.listingId}`} className="text-sm font-black text-[#0A183A] hover:text-[#1E76B6] leading-snug truncate block">
                              {item.modelo}
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
              <div
                className="bg-white rounded-3xl p-5 sm:p-6 lg:sticky lg:top-20"
                style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.22), 0 0 0 1px rgba(30,118,182,0.06)" }}
              >
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Resumen</p>
                <h2 className="text-base font-black text-[#0A183A] mb-4">Detalle del pedido</h2>

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

                <div
                  className="rounded-2xl p-4 mb-5"
                  style={{ background: "linear-gradient(135deg,rgba(30,118,182,0.06),rgba(52,140,203,0.04))", border: "1px solid rgba(30,118,182,0.12)" }}
                >
                  <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-widest mb-1">Total a pagar</p>
                  <p
                    className="text-3xl font-black tracking-tight leading-none"
                    style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    {fmtCOP(totalToCharge)}
                  </p>
                  <div className="mt-3">
                    <PaymentBadges variant="wide" />
                  </div>
                </div>

                {!showCheckout ? (
                  <button onClick={() => setShowCheckout(true)}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
                    Pagar
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Tus datos</p>
                    <input
                      type="text"
                      value={form.buyerName}
                      onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                      placeholder="Nombre completo *"
                      autoFocus
                      className={inputCls}
                    />
                    <input
                      type="email"
                      value={form.buyerEmail}
                      onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
                      placeholder="Email *"
                      className={inputCls}
                    />
                    <input
                      type="tel"
                      value={form.buyerPhone}
                      onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                      placeholder="Teléfono"
                      className={inputCls}
                    />

                    <button
                      onClick={handlePay}
                      disabled={submitting || !form.buyerName.trim() || !form.buyerEmail.trim()}
                      className="w-full py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-40 transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Pagar ${fmtCOP(totalToCharge)}`}
                    </button>

                    {checkoutError && (
                      <p className="text-[11px] text-red-600 font-medium">{checkoutError}</p>
                    )}

                    <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                      Te llevaremos a Wompi para completar el pago de forma segura. Los detalles de entrega los coordinas con el distribuidor después de la confirmación.
                    </p>

                    <button
                      onClick={() => setShowCheckout(false)}
                      className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
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
