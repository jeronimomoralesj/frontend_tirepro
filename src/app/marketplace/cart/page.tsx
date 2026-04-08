"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Loader2,
  CheckCircle, Package, Truck, MapPin, ChevronDown,
} from "lucide-react";
import { useCart } from "../../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
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
  const { items, count, total, updateQty, removeItem, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState({
    buyerName: "", buyerEmail: "", buyerPhone: "",
    buyerAddress: "", buyerCity: "", buyerCompany: "", notas: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>([]);
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

  const totalWithIva = Math.round(total * 1.19);

  async function handleCheckout() {
    if (!form.buyerName || !form.buyerEmail || items.length === 0) return;
    if (requiresAddress && (!form.buyerCity || !form.buyerAddress)) return;

    trackBeginCheckout(total, items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity })));
    setSubmitting(true);
    const ids: string[] = [];
    let userId: string | undefined;
    try { userId = JSON.parse(localStorage.getItem("user") ?? "{}").id; } catch { /* */ }
    const token = localStorage.getItem("token") ?? "";

    // Create one order per item (each may go to a different distributor).
    // No payment gateway: distributors confirm and request payment manually.
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
        }
      } catch { /* continue with other items */ }
    }

    // Persist the buyer profile + address for next time.
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        buyerName: form.buyerName,
        buyerEmail: form.buyerEmail,
        buyerPhone: form.buyerPhone,
        buyerCompany: form.buyerCompany,
      }));
      if (form.buyerCity && form.buyerAddress) {
        const next: SavedAddress[] = [
          { ciudad: form.buyerCity, direccion: form.buyerAddress },
          ...savedAddresses.filter((a) => !(a.ciudad === form.buyerCity && a.direccion === form.buyerAddress)),
        ].slice(0, 8);
        setSavedAddresses(next);
        localStorage.setItem(ADDRESSES_KEY, JSON.stringify(next));
      }
    } catch { /* ignore */ }

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
                  <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-widest mb-1">Total con IVA</p>
                  <p
                    className="text-3xl font-black tracking-tight leading-none"
                    style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    {fmtCOP(totalWithIva)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">Subtotal {fmtCOP(total)} + IVA {fmtCOP(Math.round(total * 0.19))}</p>
                </div>

                {!showCheckout ? (
                  <button onClick={() => setShowCheckout(true)}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
                    Proceder al checkout
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Datos de contacto</p>
                    <input type="text" value={form.buyerName} onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                      placeholder="Nombre completo *" className={inputCls} />
                    <input type="email" value={form.buyerEmail} onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
                      placeholder="Email *" className={inputCls} />
                    <input type="tel" value={form.buyerPhone} onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                      placeholder="Teléfono" className={inputCls} />
                    <input type="text" value={form.buyerCompany} onChange={(e) => setForm((f) => ({ ...f, buyerCompany: e.target.value }))}
                      placeholder="Empresa (opcional)" className={inputCls} />

                    {/* Delivery section — driven by distributor coverage */}
                    {distributorList.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-[11px] text-gray-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Cargando opciones de entrega…
                      </div>
                    ) : onlyRecogida ? (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                        style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.15)" }}>
                        <Truck className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-[#0A183A]">
                          Este distribuidor solo ofrece <span className="font-bold">recogida en tienda</span>. No es necesaria una dirección.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest pt-2">Dirección de entrega</p>

                        {/* City — restricted to distributor coverage */}
                        <div className="relative">
                          <select
                            value={form.buyerCity}
                            onChange={(e) => setForm((f) => ({ ...f, buyerCity: e.target.value, buyerAddress: f.buyerCity === e.target.value ? f.buyerAddress : "" }))}
                            className={`${inputCls} appearance-none pr-9`}
                          >
                            <option value="">Seleccionar ciudad</option>
                            {deliveryCities.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                        {deliveryCities.length === 0 && (
                          <p className="text-[10px] text-amber-600 -mt-1">El distribuidor aún no tiene cobertura registrada.</p>
                        )}

                        {/* Address — saved options + new */}
                        {requiresAddress && form.buyerCity && (
                          <>
                            {validSavedAddresses.filter((a) => a.ciudad === form.buyerCity).length > 0 && (
                              <>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => setAddressMode("saved")}
                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all"
                                    style={{
                                      background: addressMode === "saved" ? "linear-gradient(135deg,#0A183A,#1E76B6)" : "white",
                                      color: addressMode === "saved" ? "white" : "#555",
                                      border: addressMode === "saved" ? "none" : "1px solid #e5e5e5",
                                    }}>
                                    Guardadas
                                  </button>
                                  <button type="button" onClick={() => setAddressMode("new")}
                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all"
                                    style={{
                                      background: addressMode === "new" ? "linear-gradient(135deg,#0A183A,#1E76B6)" : "white",
                                      color: addressMode === "new" ? "white" : "#555",
                                      border: addressMode === "new" ? "none" : "1px solid #e5e5e5",
                                    }}>
                                    + Nueva
                                  </button>
                                </div>
                                {addressMode === "saved" && (
                                  <div className="space-y-1.5">
                                    {validSavedAddresses.filter((a) => a.ciudad === form.buyerCity).map((a, i) => (
                                      <button
                                        type="button"
                                        key={`${a.ciudad}-${a.direccion}`}
                                        onClick={() => selectSavedAddress(savedAddresses.indexOf(a))}
                                        className="w-full text-left flex items-start gap-2 px-3 py-2 rounded-xl transition-all"
                                        style={{
                                          background: form.buyerAddress === a.direccion ? "rgba(30,118,182,0.08)" : "white",
                                          border: form.buyerAddress === a.direccion ? "1px solid rgba(30,118,182,0.4)" : "1px solid #e5e5e5",
                                        }}
                                      >
                                        <MapPin className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0 mt-0.5" />
                                        <span className="text-[11px] text-[#0A183A] font-medium">{a.direccion}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                            {(addressMode === "new" || validSavedAddresses.filter((a) => a.ciudad === form.buyerCity).length === 0) && (
                              <input
                                type="text"
                                value={form.buyerAddress}
                                onChange={(e) => setForm((f) => ({ ...f, buyerAddress: e.target.value }))}
                                placeholder="Dirección exacta (calle, número, barrio)"
                                className={inputCls}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}

                    <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                      rows={2} placeholder="Notas para el distribuidor (opcional)" className={`${inputCls} resize-none`} />

                    <button onClick={handleCheckout}
                      disabled={
                        submitting ||
                        !form.buyerName ||
                        !form.buyerEmail ||
                        (requiresAddress && !onlyRecogida && (!form.buyerCity || !form.buyerAddress))
                      }
                      className="w-full py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-40 transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Confirmar pedido — ${fmtCOP(totalWithIva)}`}
                    </button>

                    {/* Payment confirmation note */}
                    <div
                      className="px-3 py-2.5 rounded-xl text-[10px] text-[#0A183A] leading-relaxed"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
                    >
                      <span className="font-black text-[#92400e]">💡 Nota:</span> El pago será solicitado tras la confirmación de la empresa distribuidora.
                    </div>

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
