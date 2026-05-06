"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Loader2,
  CheckCircle, Package, Truck, MapPin, ChevronDown, X,
} from "lucide-react";
import { useCart } from "../../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { PaymentBadges } from "../../../components/marketplace/PaymentBadges";
import { trackViewCart, trackBeginCheckout, trackPurchase } from "../../../lib/marketplaceAnalytics";
import { productHref } from "../product/_lib/url";

// Bold Botón de Pagos — official button widget config returned by
// /payments/bold/button-config. Bold's library reads these off a
// <script data-bold-button> element to render their branded CTA.
type BoldButtonConfig = {
  apiKey:             string;
  orderId:            string;
  amount:             number;
  currency:           string;
  integritySignature: string;
  redirectionUrl:     string;
  description:        string;
  customerData?:      string;   // JSON-encoded
  billingAddress?:    string;   // JSON-encoded
  paymentId:          string;
  orderIds:           string[];
};

/**
 * Renders Bold's official designed button (with their logo + branding).
 * The library at https://checkout.bold.co/library/boldPaymentButton.js
 * scans the DOM for <script data-bold-button> and replaces them in
 * place with the styled button. Re-mounts on config change so a buyer
 * who edits the cart and re-submits gets a fresh button bound to the
 * new orderId / amount / signature triple.
 */
function BoldOfficialButton({ config }: { config: BoldButtonConfig }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const s = document.createElement("script");
    // dark-L = Bold's biggest dark-themed variant. Other valid values:
    // dark-S/M/L, light-S/M/L. Omit for default (dark-L).
    s.setAttribute("data-bold-button", "dark-L");
    s.setAttribute("data-api-key",            config.apiKey);
    s.setAttribute("data-order-id",           config.orderId);
    s.setAttribute("data-amount",             String(config.amount));
    s.setAttribute("data-currency",           config.currency);
    s.setAttribute("data-integrity-signature", config.integritySignature);
    s.setAttribute("data-redirection-url",    config.redirectionUrl);
    s.setAttribute("data-description",        config.description);
    if (config.customerData)   s.setAttribute("data-customer-data",   config.customerData);
    if (config.billingAddress) s.setAttribute("data-billing-address", config.billingAddress);
    // Embedded = modal iframe — keeps the buyer on our domain through
    // the whole flow, only redirecting after the result.
    s.setAttribute("data-render-mode", "embedded");
    host.appendChild(s);
  }, [config]);
  return <div ref={ref} className="bold-button-host" />;
}

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
  const { items, count, total, updateQty, removeItem, setPickup, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState({
    buyerName: "", buyerEmail: "", buyerPhone: "",
    buyerAddress: "", buyerCity: "", buyerCompany: "", notas: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [distributorProfiles, setDistributorProfiles] = useState<Record<string, DistributorProfile>>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");
  // True iff the localStorage `user` blob has both name + email — that's
  // enough to skip the data form entirely. The check runs after mount
  // so SSR renders the guest form and hydration upgrades it once we
  // can read localStorage.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Lets the user override the auto-fill if e.g. they want to ship to a
  // different email than their account. Set true by clicking "Cambiar"
  // on the logged-in confirmation row.
  const [editingDetails, setEditingDetails] = useState(false);

  // -- Pre-fill buyer details from logged-in user + persisted profile -------
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}");
      const userName  = (user.name ?? "").toString().trim();
      const userEmail = (user.email ?? "").toString().trim();
      // Logged-in for our purposes = we have enough data to populate the
      // checkout payload without asking. Email is the only field Bold
      // strictly requires beyond the cart contents.
      if (userName && userEmail) setIsLoggedIn(true);
      setForm((f) => ({
        ...f,
        buyerName:    f.buyerName    || stored.buyerName    || userName  || "",
        buyerEmail:   f.buyerEmail   || stored.buyerEmail   || userEmail || "",
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
  // and a different one on the gateway confused buyers.
  const totalToCharge = total;

  // Two-step checkout with Bold's official designed button:
  //   1. Buyer fills the form and clicks "Continuar al pago". We POST to
  //      /payments/bold/button-config to mint Payment + Orders + the
  //      integrity hash that locks the amount.
  //   2. Bold's <script data-bold-button> widget renders their polished,
  //      Bold-branded button in place. The buyer clicks it and Bold
  //      opens the embedded checkout modal.
  // The webhook reconciliation flow is unchanged — same Payment row,
  // same boldOrderId reference, same backend handler.
  const [checkoutError, setCheckoutError] = useState("");
  const [boldConfig, setBoldConfig]       = useState<BoldButtonConfig | null>(null);
  async function handlePay() {
    setCheckoutError("");
    if (!form.buyerName.trim() || !form.buyerEmail.trim() || items.length === 0) return;
    // Block submission when delivery items exist but the buyer hasn't
    // provided a shipping address. (Pickup-only carts and recogida-only
    // distributors skip this check via addressNeeded === false.)
    if (addressNeeded && (!form.buyerAddress.trim() || !form.buyerCity.trim())) {
      setCheckoutError("Falta la dirección de entrega.");
      setShowCheckout(true);
      setEditingDetails(true);
      return;
    }

    trackBeginCheckout(total, items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity })));
    setSubmitting(true);
    const token = localStorage.getItem("token") ?? "";

    // Persist the minimal buyer profile so a return visit doesn't have
    // to re-type. Address now lives alongside the rest of the profile
    // (collected back at checkout when delivery is needed).
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        buyerName:    form.buyerName,
        buyerEmail:   form.buyerEmail,
        buyerPhone:   form.buyerPhone,
        buyerCompany: form.buyerCompany,
        buyerAddress: form.buyerAddress,
        buyerCity:    form.buyerCity,
      }));
      // Also append the address to the saved-addresses book (deduped on
      // ciudad+direccion) so the next checkout can offer it as a
      // saved option.
      if (form.buyerAddress.trim() && form.buyerCity.trim()) {
        const next: SavedAddress[] = [
          { ciudad: form.buyerCity.trim(), direccion: form.buyerAddress.trim() },
          ...savedAddresses.filter(
            (a) =>
              a.ciudad.trim().toLowerCase() !== form.buyerCity.trim().toLowerCase() ||
              a.direccion.trim().toLowerCase() !== form.buyerAddress.trim().toLowerCase(),
          ),
        ].slice(0, 5);
        localStorage.setItem(ADDRESSES_KEY, JSON.stringify(next));
      }
    } catch { /* ignore */ }

    try {
      // Step 1 of the Bold checkout: ask the backend for the data
      // attributes needed to render Bold's official <script data-bold-button>
      // widget. This also creates the Payment + MarketplaceOrder rows
      // and locks the amount via the integrity hash, so the webhook
      // reconciliation works exactly like the legacy redirect flow.
      const res = await fetch(`${API_BASE}/payments/bold/button-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          items: items.map((i) => ({
            listingId:     i.listingId,
            quantity:      i.quantity,
            // Forward the pickup-point selection (when set) so the
            // backend can validate stock against the right store and
            // mark the order as deliveryMode='pickup'.
            ...(i.pickupPointId ? { pickupPointId: i.pickupPointId } : {}),
          })),
          buyerName:    form.buyerName.trim(),
          buyerEmail:   form.buyerEmail.trim(),
          buyerPhone:   form.buyerPhone.trim() || undefined,
          buyerCompany: form.buyerCompany.trim() || undefined,
          // Forward the shipping address when at least one item ships.
          // Pickup-only carts omit it so the order rows stay clean.
          ...(hasDeliveryItems && form.buyerAddress.trim() ? { buyerAddress: form.buyerAddress.trim() } : {}),
          ...(hasDeliveryItems && form.buyerCity.trim()    ? { buyerCity:    form.buyerCity.trim()    } : {}),
          notas:        form.notas.trim() || undefined,
          // Bold requires HTTPS for the post-payment redirect URL, so
          // for local dev we let an env var pin the redirect to the
          // production host. Tracking page is public — buyer still
          // lands on the right order page after paying.
          redirectBaseUrl:
            (process.env.NEXT_PUBLIC_PAYMENT_REDIRECT_BASE?.trim()) ||
            (typeof window !== "undefined" ? window.location.origin : "https://www.tirepro.com.co"),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "No se pudo iniciar el pago");
      }
      const data = await res.json() as BoldButtonConfig;
      if (!data?.integritySignature || !data?.apiKey) {
        throw new Error("Respuesta inválida del servidor");
      }

      // Track purchase intent now — Bold's checkout opens in a modal,
      // and depending on whether the buyer completes / cancels we
      // can't always fire from the redirect side.
      trackPurchase({
        orderId: data.orderIds.join("-"),
        totalCop: totalToCharge,
        items: items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity, distributorName: i.distributorName })),
      });

      // Hand off to Bold's button widget. Cart isn't cleared yet — we
      // wait until the buyer actually clicks Bold's button (best signal
      // we have without webhook callbacks on the frontend). If they
      // bail at this point the orders will resolve on a webhook event
      // (declined / expired) anyway.
      setBoldConfig(data);
      setSubmitting(false);
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

  // Per-line aggregates that drive the checkout form. An item without a
  // pickupPointId is in delivery mode (the default); an item with one
  // ships in pickup mode against the chosen retail bodega.
  const hasDeliveryItems = useMemo(() => items.some((i) => !i.pickupPointId), [items]);
  const hasPickupItems   = useMemo(() => items.some((i) => !!i.pickupPointId), [items]);
  // Address only required when at least one item ships and at least one
  // distributor in the cart actually offers domicilio. Pickup-only carts
  // can pay without entering a shipping address.
  const addressNeeded = hasDeliveryItems && requiresAddress;

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
      {/* Bold Botón de Pagos library — must be in the document before the
          <script data-bold-button> nodes BoldOfficialButton injects, but
          we use afterInteractive so it doesn't block the cart's first
          paint. The library scans the DOM for data-bold-button elements
          on every load and replaces them with the styled Bold button. */}
      <Script src="https://checkout.bold.co/library/boldPaymentButton.js" strategy="afterInteractive" />
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
                        <div key={item.listingId} className="px-4 sm:px-5 py-4 flex flex-col gap-3">
                          <div className="flex gap-3 sm:gap-4">
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
                              <Link href={productHref({ id: item.listingId, marca: item.marca, modelo: item.modelo, dimension: item.dimension })} className="text-sm font-black text-[#0A183A] hover:text-[#1E76B6] leading-snug truncate block">
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
                          {/* Delivery mode picker — collapses to a single
                              "Envío a domicilio" line when no pickup
                              points exist for this listing, expands into
                              the pickup selector when they do. */}
                          <PickupChooser
                            listingId={item.listingId}
                            currentPickupPointId={item.pickupPointId ?? null}
                            currentPickupPointName={item.pickupPointName ?? null}
                            currentPickupCity={item.pickupCity ?? null}
                            onChoose={setPickup}
                          />
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

                {/* Three states for the checkout entry point:
                    1. Guest               → "Pagar" button reveals the form (showCheckout)
                    2. Logged in (default) → straight-to-Bold button + "Pagas como [name]" line
                    3. Logged in but user clicked "Cambiar" → falls through to the form like a guest */}
                {!showCheckout && !(isLoggedIn && !editingDetails) ? (
                  <button onClick={() => setShowCheckout(true)}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
                    Pagar
                  </button>
                ) : isLoggedIn && !editingDetails ? (
                  <div className="space-y-2.5">
                    {boldConfig ? (
                      // Bold's own designed button — replaces our gradient
                      // CTA once we've reserved the order on the backend.
                      // The buyer clicks Bold's button to open the embedded
                      // checkout modal.
                      <BoldOfficialButton config={boldConfig} />
                    ) : (
                      <button
                        onClick={handlePay}
                        disabled={submitting}
                        className="w-full py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Continuar al pago ${fmtCOP(totalToCharge)}`}
                      </button>
                    )}
                    <p className="text-[11px] text-gray-500 text-center">
                      Pagas como <span className="font-bold text-[#0A183A]">{form.buyerName}</span>
                      {" · "}
                      <button
                        onClick={() => setEditingDetails(true)}
                        className="font-bold text-[#1E76B6] hover:underline"
                      >
                        Cambiar
                      </button>
                    </p>
                    {/* Delivery / pickup summary so the buyer can confirm
                        before going to Bold without having to re-open
                        the full form. Click "Cambiar" to edit. */}
                    {addressNeeded && (
                      form.buyerAddress.trim() ? (
                        <p className="text-[11px] text-gray-500 text-center truncate">
                          Envío a <span className="font-bold text-[#0A183A]">{form.buyerAddress}</span>
                          {form.buyerCity && <>, {form.buyerCity}</>}
                          {" · "}
                          <button
                            onClick={() => setEditingDetails(true)}
                            className="font-bold text-[#1E76B6] hover:underline"
                          >
                            Cambiar
                          </button>
                        </p>
                      ) : (
                        <button
                          onClick={() => setEditingDetails(true)}
                          className="text-[11px] font-bold text-amber-700 hover:underline w-full text-center"
                        >
                          + Agregar dirección de entrega
                        </button>
                      )
                    )}
                    {hasPickupItems && (
                      <p className="text-[11px] text-emerald-700 text-center">
                        Recoger en {items.filter((i) => i.pickupPointId).length} {items.filter((i) => i.pickupPointId).length === 1 ? "tienda" : "tiendas"} ya seleccionada{items.filter((i) => i.pickupPointId).length === 1 ? "" : "s"}
                      </p>
                    )}
                    {checkoutError && (
                      <p className="text-[11px] text-red-600 font-medium text-center">{checkoutError}</p>
                    )}
                    {boldConfig ? (
                      <>
                        <p className="text-[10px] text-gray-400 leading-relaxed text-center">
                          Haz clic en el botón de Bold para completar el pago de forma segura.
                        </p>
                        <button
                          onClick={() => setBoldConfig(null)}
                          className="w-full py-1 text-[10px] font-bold text-gray-400 hover:text-gray-600"
                        >
                          Modificar pedido
                        </button>
                      </>
                    ) : (
                      <p className="text-[10px] text-gray-400 leading-relaxed text-center">
                        Te llevaremos a Bold para completar el pago de forma segura.
                      </p>
                    )}
                  </div>
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

                    {/* Shipping address — only when at least one item is set
                        to delivery and at least one distributor in the cart
                        offers domicilio. Pickup-only orders skip this. */}
                    {addressNeeded && (
                      <div className="pt-1">
                        <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">
                          Dirección de entrega
                          {hasPickupItems && (
                            <span className="ml-1 text-[9px] font-bold text-gray-400 normal-case">
                              · solo para los productos con envío
                            </span>
                          )}
                        </p>
                        {validSavedAddresses.length > 0 && (
                          <div className="mb-2 flex gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setAddressMode("saved")}
                              className="px-2.5 py-1 rounded-full text-[10px] font-black"
                              style={{
                                background: addressMode === "saved" ? "#1E76B6" : "white",
                                color:      addressMode === "saved" ? "white" : "#0A183A",
                                border:     addressMode === "saved" ? "1px solid transparent" : "1px solid rgba(10,24,58,0.10)",
                              }}
                            >
                              Guardadas
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddressMode("new")}
                              className="px-2.5 py-1 rounded-full text-[10px] font-black"
                              style={{
                                background: addressMode === "new" ? "#1E76B6" : "white",
                                color:      addressMode === "new" ? "white" : "#0A183A",
                                border:     addressMode === "new" ? "1px solid transparent" : "1px solid rgba(10,24,58,0.10)",
                              }}
                            >
                              Nueva
                            </button>
                          </div>
                        )}
                        {addressMode === "saved" && validSavedAddresses.length > 0 ? (
                          <div className="space-y-1.5">
                            {validSavedAddresses.map((a, i) => {
                              const active = form.buyerCity === a.ciudad && form.buyerAddress === a.direccion;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => selectSavedAddress(i)}
                                  className="w-full text-left rounded-xl px-3 py-2 transition-colors"
                                  style={{
                                    background: active ? "rgba(30,118,182,0.08)" : "white",
                                    border: active ? "1px solid #1E76B6" : "1px solid rgba(10,24,58,0.08)",
                                  }}
                                >
                                  <p className="text-[12px] font-black text-[#0A183A] truncate">{a.direccion}</p>
                                  <p className="text-[10px] text-gray-500 truncate">{a.ciudad}</p>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {deliveryCities.length > 0 ? (
                              <select
                                value={form.buyerCity}
                                onChange={(e) => setForm((f) => ({ ...f, buyerCity: e.target.value }))}
                                className={inputCls}
                              >
                                <option value="">Ciudad *</option>
                                {deliveryCities.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={form.buyerCity}
                                onChange={(e) => setForm((f) => ({ ...f, buyerCity: e.target.value }))}
                                placeholder="Ciudad *"
                                className={inputCls}
                              />
                            )}
                            <input
                              type="text"
                              value={form.buyerAddress}
                              onChange={(e) => setForm((f) => ({ ...f, buyerAddress: e.target.value }))}
                              placeholder="Dirección (calle, número, piso, apto) *"
                              className={inputCls}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pickup-summary — when at least one item is set to
                        recoger en tienda, surface a confirmation strip so
                        the buyer sees the bodega(s) one last time before
                        paying. Editing happens on the per-line
                        PickupChooser above. */}
                    {hasPickupItems && (
                      <div className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5">
                          Recoges en tienda
                        </p>
                        <ul className="space-y-1">
                          {items.filter((i) => i.pickupPointId).map((i) => (
                            <li key={i.listingId} className="text-[11px] text-[#0A183A] truncate">
                              <span className="font-bold">{i.marca} {i.modelo}</span>
                              <span className="text-gray-500"> · {i.pickupPointName} · {i.pickupCity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {boldConfig ? (
                      // Form's been validated server-side — Bold's button
                      // replaces our gradient CTA. Buyer clicks Bold's
                      // button to open the embedded checkout modal.
                      <BoldOfficialButton config={boldConfig} />
                    ) : (
                      <button
                        onClick={handlePay}
                        disabled={
                          submitting
                          || !form.buyerName.trim()
                          || !form.buyerEmail.trim()
                          || (addressNeeded && (!form.buyerAddress.trim() || !form.buyerCity.trim()))
                        }
                        className="w-full py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-40 transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Continuar al pago ${fmtCOP(totalToCharge)}`}
                      </button>
                    )}

                    {checkoutError && (
                      <p className="text-[11px] text-red-600 font-medium">{checkoutError}</p>
                    )}

                    {boldConfig ? (
                      <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                        Haz clic en el botón de Bold para completar el pago de forma segura. {addressNeeded ? "El distribuidor coordinará la entrega a la dirección indicada." : "Recoges en la tienda seleccionada cuando el distribuidor confirme tu pedido."}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                        Te llevaremos a Bold para completar el pago de forma segura. {addressNeeded ? "El distribuidor coordinará la entrega a la dirección indicada." : "Recoges en la tienda seleccionada cuando el distribuidor confirme tu pedido."}
                      </p>
                    )}

                    <button
                      onClick={() => { setBoldConfig(null); setShowCheckout(false); }}
                      className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
                      {boldConfig ? "Modificar pedido" : "Volver"}
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

// =============================================================================
// PICKUP CHOOSER — per-line delivery-mode toggle. Renders nothing if
// the listing has no retail-source connected (`/pickup-points` returns
// null). When pickup is available, lets the buyer flip between
// "Envío a domicilio" (default) and "Recoger en tienda" with a city
// selector + per-store list. Selection persists into the cart blob.
// =============================================================================

interface PickupCityGroup {
  city: string;
  cityDisplay: string;
  totalStock: number;
  points: Array<{
    id: string;
    externalId: string | null;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    hours: string | null;
    stockUnits: number;
  }>;
}

interface PickupResponse {
  url: string;
  domain: string | null;
  lastSuccessAt: string | null;
  cities: PickupCityGroup[];
}

function PickupChooser({
  listingId,
  currentPickupPointId,
  currentPickupPointName,
  currentPickupCity,
  onChoose,
}: {
  listingId: string;
  currentPickupPointId: string | null;
  currentPickupPointName: string | null;
  currentPickupCity: string | null;
  onChoose: (
    listingId: string,
    pickup: { pointId: string; pointName: string; city: string } | null,
  ) => void;
}) {
  const [data, setData] = useState<PickupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(currentPickupCity ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/marketplace/listings/${listingId}/pickup-points`);
        if (!res.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const json = (await res.json()) as PickupResponse | null;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId]);

  // No retail source / no in-stock cities → render nothing. The default
  // shipping flow is the only option, no UI noise needed.
  if (loading) return null;
  if (!data || data.cities.length === 0) return null;

  const isPickup = !!currentPickupPointId;
  const activeCity = selectedCity ?? data.cities[0]?.city ?? null;
  const activeGroup = data.cities.find((c) => c.city === activeCity) ?? data.cities[0];

  return (
    <div className="rounded-xl px-3 py-2.5"
      style={{ background: "#F8FAFC", border: "1px solid rgba(10,24,58,0.06)" }}>
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChoose(listingId, null)}
          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all"
          style={{
            background: !isPickup ? "#1E76B6" : "white",
            color:      !isPickup ? "white" : "#0A183A",
            border:     !isPickup ? "1px solid transparent" : "1px solid rgba(10,24,58,0.10)",
          }}
        >
          <Truck className="w-3 h-3" />
          Envío a domicilio
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all"
          style={{
            background: isPickup ? "#1E76B6" : "white",
            color:      isPickup ? "white" : "#0A183A",
            border:     isPickup ? "1px solid transparent" : "1px solid rgba(10,24,58,0.10)",
          }}
        >
          <MapPin className="w-3 h-3" />
          Recoger en tienda
        </button>
      </div>

      {/* Selected pickup point summary */}
      {isPickup && (
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="text-[11px] text-[#0A183A] flex-1 min-w-0">
            <p className="font-black truncate">{currentPickupPointName}</p>
            <p className="text-gray-500 truncate">{currentPickupCity}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[10px] font-bold text-[#1E76B6] hover:underline flex-shrink-0"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* City + store selector modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Recoger en tienda</p>
                <p className="text-sm font-black text-[#0A183A]">Elige ciudad y sucursal</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(10,24,58,0.06)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Ciudad</p>
              <div className="flex flex-wrap gap-1.5">
                {data.cities.map((c) => (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => setSelectedCity(c.city)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black transition-all"
                    style={{
                      background: activeCity === c.city ? "#1E76B6" : "white",
                      color:      activeCity === c.city ? "white" : "#0A183A",
                      border:     activeCity === c.city ? "1px solid transparent" : "1px solid rgba(10,24,58,0.10)",
                    }}
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    {c.cityDisplay}
                    <span className="text-[9px] opacity-80">· {c.totalStock}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeGroup?.points.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChoose(listingId, {
                      pointId:   p.id,
                      pointName: p.name,
                      city:      activeGroup.cityDisplay,
                    });
                    setOpen(false);
                  }}
                  className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-[#F0F7FF] transition-colors flex items-start gap-2"
                  style={{
                    border: currentPickupPointId === p.id
                      ? "1px solid #1E76B6"
                      : "1px solid rgba(10,24,58,0.08)",
                    background: currentPickupPointId === p.id ? "rgba(30,118,182,0.05)" : "white",
                  }}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-[#0A183A] truncate">{p.name}</p>
                    {p.address && <p className="text-[10px] text-gray-500 truncate">{p.address}</p>}
                    {p.hours && <p className="text-[10px] text-gray-400 truncate">{p.hours}</p>}
                  </div>
                  <span className="text-[10px] font-black tabular-nums flex-shrink-0"
                    style={{ color: p.stockUnits > 0 ? "#059669" : "#9ca3af" }}>
                    {p.stockUnits} u.
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
