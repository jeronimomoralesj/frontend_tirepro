"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Loader2,
  CheckCircle, Package, Truck, MapPin, ChevronDown, X,
} from "lucide-react";
import { useCart } from "../../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { PaymentBadges } from "../../../components/marketplace/PaymentBadges";
import { BoldLogo } from "../../../components/marketplace/BoldLogo";
import { trackViewCart, trackBeginCheckout, trackPurchase } from "../../../lib/marketplaceAnalytics";
import { productHref } from "../product/_lib/url";

// Bold Botón de Pagos — config returned by /payments/bold/button-config.
// Used to instantiate Bold's BoldCheckout class (provided by their
// loader at checkout.bold.co/library/boldPaymentButton.js).
//
// We don't use the <script data-bold-button> widget approach: Bold's
// library scans the DOM for those tags ONCE at load time and doesn't
// observe subsequent insertions, so React-injected buttons never
// render. The instance API (new BoldCheckout(...).open()) works the
// same way under the hood and lets us trigger the modal in one click.
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

// Bold's library attaches BoldCheckout to window once boldPaymentButton.js
// has loaded. We listen for the `boldCheckoutLoaded` event to know it's
// ready before letting the buyer click pay.
type BoldCheckoutInstance = {
  open: () => void;
  updateConfig: (key: string, value: unknown) => void;
};
declare global {
  interface Window {
    BoldCheckout?: new (config: Record<string, unknown>) => BoldCheckoutInstance;
  }
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

  // Single-click checkout via Bold's BoldCheckout JS API:
  //   1. Buyer fills the form and clicks "Pagar". We POST to
  //      /payments/bold/button-config to mint Payment + Orders + the
  //      integrity hash that locks the amount.
  //   2. We instantiate `new window.BoldCheckout(config)` and call
  //      `.open()` — Bold opens its embedded checkout modal on the
  //      same page. The buyer pays without leaving tirepro.com.co.
  //   3. After payment, Bold redirects to redirectionUrl (the order
  //      tracking page) and the webhook reconciles status async.
  const [checkoutError, setCheckoutError] = useState("");
  // Bold's loader script lives in the marketplace layout so it starts
  // loading the moment the buyer enters /marketplace/* — by the time
  // they reach the cart, window.BoldCheckout is almost always ready.
  // We don't gate the button on that anymore (used to render disabled-
  // gray on cold first visit). Instead handlePay waits up to a few
  // seconds for the library if it isn't quite there when the buyer
  // clicks. Cached visits stay instant.
  async function waitForBoldCheckout(timeoutMs = 5000): Promise<void> {
    if (typeof window === "undefined") throw new Error("Bold no está disponible aquí");
    if (window.BoldCheckout) return;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        window.removeEventListener("boldCheckoutLoaded", onLoaded);
        reject(new Error("Bold tardó demasiado en cargar. Revisa tu conexión y vuelve a intentar."));
      }, timeoutMs);
      const onLoaded = () => { clearTimeout(t); resolve(); };
      window.addEventListener("boldCheckoutLoaded", onLoaded, { once: true });
      // In case the event already fired before this listener attached.
      if (window.BoldCheckout) { clearTimeout(t); resolve(); }
    });
  }
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

      // Track purchase intent now — Bold's modal opens next and
      // depending on whether the buyer completes / cancels we can't
      // always fire from the post-modal redirect side.
      trackPurchase({
        orderId: data.orderIds.join("-"),
        totalCop: totalToCharge,
        items: items.map((i) => ({ id: i.listingId, marca: i.marca, modelo: i.modelo, precioCop: i.precioCop, quantity: i.quantity, distributorName: i.distributorName })),
      });

      // Wait for Bold's loader script if it isn't ready yet. Layout
      // starts the load on every marketplace page, so on cached
      // visits this is a no-op; on cold first visits we may wait a
      // few hundred ms. Throws after 5s so the buyer gets feedback
      // if the library is genuinely failing.
      await waitForBoldCheckout();
      if (!window.BoldCheckout) {
        throw new Error("Bold no terminó de cargar. Vuelve a intentar.");
      }

      // Instance API — same library that powers Bold's <script
      // data-bold-button> widget, but invoked programmatically. The
      // config keys are camelCase (NOT the data-* dash form). Embedded
      // mode opens a modal iframe; redirect mode is the default.
      const checkout = new window.BoldCheckout({
        orderId:            data.orderId,
        currency:           data.currency,
        amount:             String(data.amount),
        apiKey:             data.apiKey,
        integritySignature: data.integritySignature,
        redirectionUrl:     data.redirectionUrl,
        description:        data.description,
        ...(data.customerData   ? { customerData:   data.customerData   } : {}),
        ...(data.billingAddress ? { billingAddress: data.billingAddress } : {}),
        renderMode: "embedded",
      });
      checkout.open();
      // Don't clear the cart yet — buyer can still cancel inside the
      // modal. Once Bold reports success the webhook flips the order
      // and the redirect lands on /marketplace/order/<id>; from there
      // the user typically navigates away from /cart anyway.
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

  // "También te podría gustar" — recommendations based on what's in
  // the cart. We don't restrict to the EXACT dimension because tire
  // sizes are too narrow (a buyer with 205/55R16 in cart almost
  // certainly fits 205/60R16, 215/55R16, etc.). Instead we search by
  // RIM SIZE: tires sharing the same rim are typically interchangeable
  // across the same vehicle class, which surfaces meaningfully more
  // options without recommending tires for completely different
  // vehicles. Filtered to same tipo (nueva vs reencauche) when the
  // cart is uniform on that axis.
  type RecListing = {
    id: string; marca: string; modelo: string; dimension: string; tipo: string;
    precioCop: number; precioPromo: number | null; promoHasta: string | null;
    imageUrls: string[] | null; coverIndex: number; cantidadDisponible: number;
    distributor: { id: string; slug: string | null; name: string };
    retailSource?: { isActive: boolean; hasBodegaStock?: boolean; bodegaUnits?: number } | null;
  };
  const [recommendations, setRecommendations] = useState<RecListing[]>([]);
  // Top dimension key — joined to a stable string so the effect
  // re-fires only when the cart's "shape" changes, not on every
  // qty bump.
  const topDimension = useMemo(() => {
    if (items.length === 0) return null;
    const counts = items.reduce<Record<string, number>>((acc, i) => {
      acc[i.dimension] = (acc[i.dimension] ?? 0) + i.quantity; return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [items.map((i) => `${i.dimension}:${i.quantity}`).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!topDimension) { setRecommendations([]); return; }
    const inCartIds = new Set(items.map((i) => i.listingId));
    // Pull the rim out of the dimension string ("205/55R16" → "16",
    // "295/80R22.5" → "22.5"). The backend's `rimSizes` filter on
    // /marketplace/listings already does the right SQL `contains
    // R<rim>` match. If we can't parse a rim (weird format), fall
    // back to the original exact-dimension query.
    const rimMatch = topDimension.match(/R(\d+(?:\.\d+)?)/i);
    const rimSize = rimMatch ? rimMatch[1] : null;
    // Same-tipo filter only when the cart is uniform — a mixed cart
    // (some nueva, some reencauche) shouldn't bias the recs either way.
    const tipos = Array.from(new Set(items.map((i) => i.tipo)));
    const tipoQuery = tipos.length === 1 ? `&tipo=${encodeURIComponent(tipos[0])}` : "";
    const url = rimSize
      ? `${API_BASE}/marketplace/listings?rimSizes=${encodeURIComponent(rimSize)}&limit=14&sortBy=relevance${tipoQuery}`
      : `${API_BASE}/marketplace/listings?dimension=${encodeURIComponent(topDimension)}&limit=10&sortBy=relevance${tipoQuery}`;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const all = (d?.listings ?? []) as RecListing[];
        setRecommendations(all.filter((l) => !inCartIds.has(l.id)).slice(0, 8));
      })
      .catch(() => { if (!cancelled) setRecommendations([]); });
    return () => { cancelled = true; };
  }, [topDimension, items.map((i) => `${i.listingId}:${i.tipo}`).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buyer-facing ETA shown in the checkout block. Pickup-only orders
  // are typically same-day or next-day, so we surface that copy. Mixed
  // / delivery orders quote a 3–7 business-day window — the actual
  // confirmed ETA comes from the distributor when they accept the
  // order on /dashboard/marketplace/pedidos. Computed against today
  // so the dates always look fresh on a stale tab.
  const etaLabel = useMemo(() => {
    if (items.length === 0) return null;
    if (hasPickupItems && !hasDeliveryItems) return "Listo para recoger en 1–2 días";
    const addBusinessDays = (start: Date, days: number) => {
      const d = new Date(start);
      let added = 0;
      while (added < days) {
        d.setDate(d.getDate() + 1);
        const day = d.getDay();
        if (day !== 0 && day !== 6) added += 1;
      }
      return d;
    };
    const now      = new Date();
    const earliest = addBusinessDays(now, 3);
    const latest   = addBusinessDays(now, 7);
    const monthsEs = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    const sameMonth = earliest.getMonth() === latest.getMonth();
    return sameMonth
      ? `${earliest.getDate()}–${latest.getDate()} ${monthsEs[latest.getMonth()]}`
      : `${earliest.getDate()} ${monthsEs[earliest.getMonth()]} – ${latest.getDate()} ${monthsEs[latest.getMonth()]}`;
  }, [items.length, hasPickupItems, hasDeliveryItems]);
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
      <MarketplaceNav />

      {/* Hero band — single smooth blue (top-to-bottom subtle deepening
          from #1E76B6 → #1668A0). Cleaner than the prior 3-stop dark
          gradient. Right-side "Estás a un paso" tag plays the same
          motivational role as Mercado Libre's "Ya casi es tuya" without
          repeating their copy verbatim. Hidden on the smallest phones
          to keep the title row uncrowded. */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg,#1E76B6 0%,#1668A0 100%)" }}
      >
        <div className="relative max-w-5xl mx-auto px-3 sm:px-6 pt-5 pb-7">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-3 h-3" />
            Seguir comprando
          </Link>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">Tu carrito</h1>
              <p className="text-[11px] sm:text-xs text-white/85 mt-1">
                {count > 0 ? <>{count} producto{count !== 1 ? "s" : ""} · {Object.keys(grouped).length} distribuidor{Object.keys(grouped).length !== 1 ? "es" : ""}</> : "Sin productos"}
              </p>
            </div>
            {count > 0 && (
              <span className="hidden sm:inline-flex items-center px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-base font-black text-white whitespace-nowrap tracking-tight">
                Estás a un paso
              </span>
            )}
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

              {/* También te podría gustar — moved INTO the left column
                  (was at the bottom of <main>) so the user sees recs
                  while still scrolling through their cart instead of
                  way below the order summary. Sticks visually with
                  the items it's based on. Empty silently if the
                  endpoint returned nothing. */}
              {recommendations.length > 0 && (
                <section className="pt-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-lg sm:text-xl font-black text-[#0A183A] tracking-tight">También te podría gustar</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                    {recommendations.map((l) => {
                      const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                      const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
                      const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                      const price = hasPromo ? l.precioPromo! : l.precioCop;
                      return (
                        <Link
                          key={l.id}
                          href={productHref({ id: l.id, marca: l.marca, modelo: l.modelo, dimension: l.dimension })}
                          className="group bg-white rounded-2xl p-3 transition-all hover:shadow-xl hover:-translate-y-0.5"
                          style={{ border: "1px solid rgba(10,24,58,0.08)" }}
                        >
                          <div className="aspect-square w-full bg-[#fafafa] rounded-xl flex items-center justify-center overflow-hidden mb-2.5">
                            {cover ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={cover} alt={`${l.marca} ${l.modelo}`} className="max-w-full max-h-full object-contain p-2 group-hover:scale-105 transition-transform" />
                            ) : (
                              <Package className="w-8 h-8 text-gray-300" />
                            )}
                          </div>
                          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest leading-none">{l.marca}</p>
                          <p className="text-[12px] font-black text-[#0A183A] leading-tight mt-0.5 line-clamp-1">{l.modelo}</p>
                          <p className="text-sm font-black text-[#1E76B6] tabular-nums tracking-tight mt-1">{l.dimension}</p>
                          <p className="text-[14px] font-black text-[#0A183A] tracking-tight tabular-nums mt-1.5">{fmtCOP(price)}</p>
                          {hasPromo && (
                            <p className="text-[10px] text-gray-400 line-through tabular-nums">{fmtCOP(l.precioCop)}</p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
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

                {/* Merged checkout block — Total + ETA + Pay button +
                    accepted methods all live in a single card so the
                    buyer's eye lands on one focal point. White Pay
                    button (clean / trustworthy / premium), inline
                    Bold logo on the right, dark text. */}
                {!showCheckout && !editingDetails && !isLoggedIn ? (
                  <div
                    className="rounded-2xl p-5 mb-5"
                    style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)", boxShadow: "0 8px 24px -16px rgba(10,24,58,0.15)" }}
                  >
                    <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-widest mb-1">Total a pagar</p>
                    <p className="text-3xl font-black tracking-tight leading-none text-[#0A183A]">{fmtCOP(totalToCharge)}</p>
                    {etaLabel && (
                      <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
                        Entrega estimada: <span className="font-bold text-[#0A183A]">{etaLabel}</span>
                      </p>
                    )}
                    <button onClick={() => setShowCheckout(true)}
                      className="mt-4 w-full py-3.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg,#1E76B6,#1668A0)" }}>
                      Pagar
                    </button>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Aceptamos</p>
                      <PaymentBadges variant="compact" className="!flex-row" />
                    </div>
                  </div>
                ) : isLoggedIn && !editingDetails && !showCheckout ? (
                  <div
                    className="rounded-2xl p-5 mb-5 space-y-3"
                    style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)", boxShadow: "0 8px 24px -16px rgba(10,24,58,0.15)" }}
                  >
                    <div>
                      <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-widest mb-1">Total a pagar</p>
                      <p className="text-3xl font-black tracking-tight leading-none text-[#0A183A]">{fmtCOP(totalToCharge)}</p>
                      {etaLabel && (
                        <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
                          Entrega estimada: <span className="font-bold text-[#0A183A]">{etaLabel}</span>
                        </p>
                      )}
                    </div>

                    {/* White Pay button — clean premium feel, dark text +
                        inline Bold logo. Hover deepens the border / adds
                        shadow. Uses the same merged label pattern as
                        before (Pagar / amount on the left, "con bold"
                        on the right) but inverted color scheme. */}
                    <button
                      onClick={handlePay}
                      disabled={submitting}
                      className="w-full py-5 px-5 rounded-xl bg-white text-[#0A0A0A] disabled:opacity-50 transition-all hover:border-[#0A0A0A] hover:shadow-2xl hover:shadow-black/15 active:scale-[0.99] flex items-center justify-between gap-3"
                      style={{ border: "2px solid #0A0A0A" }}
                    >
                      {submitting ? (
                        <span className="w-full flex items-center justify-center gap-2 text-base font-bold">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Procesando…
                        </span>
                      ) : (
                        <>
                          <span className="flex flex-col items-start leading-tight">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Pagar</span>
                            <span className="text-2xl sm:text-[26px] font-black tracking-tight tabular-nums">{fmtCOP(totalToCharge)}</span>
                          </span>
                          <span className="flex items-center gap-2 text-base font-black text-[#0A0A0A]">
                            con
                            <BoldLogo height={26} />
                          </span>
                        </>
                      )}
                    </button>

                    <div className="pt-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Aceptamos</p>
                      <PaymentBadges variant="compact" className="!flex-row" />
                    </div>
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
                    <p className="text-[10px] text-gray-400 leading-relaxed text-center">
                      Pago 100% seguro. Bold protege tus datos con cifrado SSL.
                    </p>
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

                    {/* Same white Pay button + ETA + payment-methods strip
                        as the logged-in path. Repeated here so the form
                        flow shares the same clean checkout block. */}
                    <div
                      className="rounded-2xl p-4 space-y-3"
                      style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)", boxShadow: "0 8px 24px -16px rgba(10,24,58,0.15)" }}
                    >
                      {etaLabel && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
                          Entrega estimada: <span className="font-bold text-[#0A183A]">{etaLabel}</span>
                        </p>
                      )}
                      <button
                        onClick={handlePay}
                        disabled={
                          submitting
                          || !form.buyerName.trim()
                          || !form.buyerEmail.trim()
                          || (addressNeeded && (!form.buyerAddress.trim() || !form.buyerCity.trim()))
                        }
                        className="w-full py-5 px-5 rounded-xl bg-white text-[#0A0A0A] disabled:opacity-40 transition-all hover:border-[#0A0A0A] hover:shadow-2xl hover:shadow-black/15 active:scale-[0.99] flex items-center justify-between gap-3"
                        style={{ border: "2px solid #0A0A0A" }}
                      >
                        {submitting ? (
                          <span className="w-full flex items-center justify-center gap-2 text-sm font-bold">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Procesando…
                          </span>
                        ) : (
                          <>
                            <span className="flex flex-col items-start leading-tight">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pagar</span>
                              <span className="text-lg font-black tracking-tight">{fmtCOP(totalToCharge)}</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-600">
                              con
                              <BoldLogo height={20} />
                            </span>
                          </>
                        )}
                      </button>
                      <div className="pt-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Aceptamos</p>
                        <PaymentBadges variant="compact" className="!flex-row" />
                      </div>
                    </div>

                    {checkoutError && (
                      <p className="text-[11px] text-red-600 font-medium">{checkoutError}</p>
                    )}

                    <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                      Bold abrirá una ventana segura para completar el pago. {addressNeeded ? "El distribuidor coordinará la entrega a la dirección indicada." : "Recoges en la tienda seleccionada cuando el distribuidor confirme tu pedido."}
                    </p>

                    <button
                      onClick={() => { setShowCheckout(false); setEditingDetails(false); }}
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

      {/* City + store selector modal.
          Mobile: bottom-sheet at 92vh so the stores list is always
          visible below the city picker. City pills scroll horizontally
          in a single row instead of wrapping (a wrap-row of 25+ city
          pills was eating most of the modal height and pushing the
          stores list off-screen — the original "you pick a city but
          don't see the stores" bug).
          Desktop: centered card at max 90vh. */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col"
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
            <div className="px-5 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(10,24,58,0.06)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Ciudad</p>
              {/* Horizontal scroll instead of wrap so the city row is one
                  line tall regardless of how many cities Bold returned. */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {data.cities.map((c) => (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => setSelectedCity(c.city)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black transition-all flex-shrink-0"
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
            {/* Sucursales header so the user has a clear visual cue that
                the list below is filtered to the chosen city. */}
            <div className="px-5 pt-3 pb-1.5 flex items-baseline justify-between flex-shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Sucursales {activeGroup ? `en ${activeGroup.cityDisplay}` : ""}
              </p>
              {activeGroup && (
                <span className="text-[10px] font-bold text-emerald-700">
                  {activeGroup.points.length} {activeGroup.points.length === 1 ? "tienda" : "tiendas"} · {activeGroup.totalStock} unid.
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
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
