"use client";

// Public-but-gated order tracking page. The post-checkout flow lands
// here with ?email= pre-filled; transactional emails link here too.
// Backend gates the GET by buyerEmail so anyone who doesn't already
// know the buyer's address can't browse other people's orders.
//
// Auth strategy:
//   1. ?email=  in the URL  → submit it directly (used by email links)
//   2. logged-in user        → seed the form with the JWT user.email
//   3. nothing                → render an "ingresa tu correo" form

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Mail,
  MapPin, Package, Phone, RefreshCw, ShoppingCart, Truck, XCircle,
  Star, MessageSquare,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// Same convention the dashboard + emails use — the 8-char prefix is
// what the buyer + dist quote at each other when they talk on the phone.
const orderNumber = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

interface StatusEvent {
  status: string;
  at: string;
  note?: string | null;
  /** Set on the "confirmado" event when the dist promised a delivery date. */
  eta?: string | null;
}

interface OrderSurvey {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface TrackedOrder {
  id: string;
  status: string;
  quantity: number;
  totalCop: number;
  totalWithIva: number | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  buyerAddress: string | null;
  buyerCity: string | null;
  buyerCompany: string | null;
  paymentStatus: string | null;
  notas: string | null;
  statusHistory: StatusEvent[] | null;
  etaDate: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string;
    marca: string;
    modelo: string;
    dimension: string;
    imageUrls: string[] | null;
    coverIndex: number;
  };
  distributor: {
    id: string;
    name: string;
    slug: string | null;
    profileImage: string | null;
    telefono: string | null;
    ciudad: string | null;
  };
  /** Post-delivery survey, when one has been submitted. */
  survey?: OrderSurvey | null;
}

// Per-status visual + label info. Anything not in this map (free-text
// statuses the dist may set inline) gets a generic "in-progress" look.
const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  pago_pendiente: { label: "Esperando pago",   icon: Clock,        color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  pendiente:      { label: "Pedido recibido",  icon: Clock,        color: "#1E76B6", bg: "rgba(30,118,182,0.10)" },
  confirmado:     { label: "Confirmado",       icon: CheckCircle2, color: "#1E76B6", bg: "rgba(30,118,182,0.10)" },
  enviado:        { label: "Enviado",          icon: Truck,        color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  entregado:      { label: "Entregado",        icon: Package,      color: "#16a34a", bg: "rgba(34,197,94,0.10)"  },
  cancelado:      { label: "Cancelado",        icon: XCircle,      color: "#dc2626", bg: "rgba(239,68,68,0.10)"  },
};

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const orderId = params.id;

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const fetchOrder = useCallback(async (email: string) => {
    if (!orderId || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const url = `${API_BASE}/marketplace/orders/${orderId}/track?email=${encodeURIComponent(email.trim())}`;
      const res = await fetch(url);
      if (res.status === 403) {
        setOrder(null);
        setError("Ese correo no coincide con este pedido. Verifica que sea el mismo que usaste al comprar.");
        return;
      }
      if (res.status === 404) {
        setOrder(null);
        setError("No encontramos un pedido con ese identificador.");
        return;
      }
      if (!res.ok) {
        setOrder(null);
        setError("No pudimos cargar el pedido. Intenta de nuevo en un momento.");
        return;
      }
      const data = (await res.json()) as TrackedOrder;
      setOrder(data);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // On mount: try the URL email first (email-link flow), then the
  // logged-in user's email (returning customer flow). If neither
  // resolves, render the gate form.
  useEffect(() => {
    const fromUrl = search?.get("email")?.trim();
    if (fromUrl) {
      setEmailInput(fromUrl);
      fetchOrder(fromUrl);
      return;
    }
    try {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      if (user?.email) {
        setEmailInput(user.email);
        fetchOrder(user.email);
      }
    } catch { /* not logged in — show gate */ }
  }, [orderId, search, fetchOrder]);

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-[#1E76B6] transition-colors mb-3"
        >
          <ArrowLeft className="w-3 h-3" />
          Marketplace
        </Link>
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#1E76B6]">
          Seguimiento de pedido
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] mt-1 leading-tight">
          {orderNumber(orderId)}
        </h1>

        {/* Email gate (no order loaded yet). Shows on first visit when
            ?email= isn't passed and the user isn't logged in. */}
        {!order && !loading && (
          <div
            className="mt-6 rounded-2xl bg-white p-5 sm:p-6"
            style={{ border: "1px solid rgba(10,24,58,0.08)" }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(30,118,182,0.10)" }}
              >
                <Mail className="w-4 h-4 text-[#1E76B6]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#0A183A]">Verifica tu correo</p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Por seguridad, ingresa el correo con el que hiciste el pedido para ver el estado.
                </p>
              </div>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); fetchOrder(emailInput); }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="email"
                required
                autoFocus
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="tu@correo.com"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.20)" }}
              />
              <button
                type="submit"
                disabled={!emailInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                  boxShadow: "0 12px 28px -10px rgba(30,118,182,0.40)",
                }}
              >
                Ver pedido
              </button>
            </form>
            {error && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="mt-6 flex items-center justify-center py-16 text-[#1E76B6]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {order && (
          <OrderCard
            order={order}
            onRefresh={() => fetchOrder(emailInput)}
            refreshing={loading}
          />
        )}
      </div>

      <MarketplaceFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function OrderCard({
  order, onRefresh, refreshing,
}: {
  order: TrackedOrder;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const subtotal = order.totalCop;
  const total    = order.totalWithIva ?? subtotal;
  const ivaAmount = total - subtotal;
  const unitPrice = order.quantity > 0 ? order.totalCop / order.quantity : order.totalCop;

  const imgs = Array.isArray(order.listing.imageUrls) ? order.listing.imageUrls : [];
  const cover = imgs.length > 0 ? (imgs[order.listing.coverIndex ?? 0] ?? imgs[0]) : null;

  // Build the journey timeline. Prefer the server-side audit log; fall
  // back to a synthetic { pendiente@createdAt + currentStatus@updatedAt }
  // for legacy orders that pre-date the statusHistory column.
  const history: StatusEvent[] = Array.isArray(order.statusHistory) && order.statusHistory.length > 0
    ? order.statusHistory
    : [
        { status: "pendiente", at: order.createdAt },
        ...(order.status !== "pendiente"
          ? [{ status: order.status, at: order.updatedAt }]
          : []),
      ];

  return (
    <article
      className="mt-6 rounded-2xl bg-white overflow-hidden"
      style={{ border: "1px solid rgba(10,24,58,0.08)", boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ background: "#fafbfc", borderBottom: "1px solid rgba(10,24,58,0.06)" }}
      >
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">
            Creado {fmtDateTime(order.createdAt)}
          </p>
          {order.updatedAt !== order.createdAt && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              Última actualización {fmtDateTime(order.updatedAt)}
            </p>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#1E76B6] hover:bg-[#F0F7FF] disabled:opacity-50"
          aria-label="Actualizar"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {/* Journey timeline — vertical map of every status event the
          order has been through, with timestamps. The most recent
          event is highlighted as "current" with a brand-color glow;
          earlier ones render filled but quieter; future steps (only
          shown when the order isn't terminal) appear ghosted so the
          buyer sees what's left in the journey. */}
      <section className="px-5 sm:px-6 py-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
          Seguimiento del pedido
        </p>
        {order.etaDate && order.status !== "cancelado" && order.status !== "entregado" && (
          <div
            className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.20)" }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">
                Entrega estimada
              </p>
              <p className="text-base font-black text-[#0A183A] leading-tight mt-0.5">
                {new Date(order.etaDate).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
              </p>
            </div>
          </div>
        )}
        <Journey events={history} currentStatus={order.status} cancelNote={order.notas} />
      </section>

      {/* Post-delivery survey — only shown once status hits entregado.
          If a survey already exists we show the thank-you state with
          the buyer's own words echoed back. */}
      {order.status === "entregado" && (
        <section className="px-5 sm:px-6 py-5" style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}>
          <DeliverySurvey
            orderId={order.id}
            email={order.buyerEmail}
            existing={order.survey ?? null}
            onSubmitted={onRefresh}
          />
        </section>
      )}

      {/* Product */}
      <section className="px-5 sm:px-6 py-5" style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Producto</p>
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)" }}
          >
            {cover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={cover} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <Package className="w-6 h-6 text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">{order.listing.marca}</p>
            <p className="text-base font-black text-[#0A183A] truncate">{order.listing.modelo}</p>
            <p className="text-[11px] text-gray-500">{order.listing.dimension}</p>
            <p className="text-[11px] text-gray-600 mt-0.5 tabular-nums">
              <span className="font-bold">{order.quantity}×</span>
              <span className="text-gray-400"> · </span>
              {fmtCOP(unitPrice)} <span className="text-gray-400">c/u</span>
            </p>
          </div>
          <p className="text-base font-black text-[#0A183A] tabular-nums flex-shrink-0">
            {fmtCOP(order.totalCop)}
          </p>
        </div>
      </section>

      {/* Distributor + buyer + totals */}
      <section
        className="grid sm:grid-cols-2 gap-x-6 gap-y-4 px-5 sm:px-6 py-5"
        style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Distribuidor</p>
          <Link
            href={`/marketplace/distributor/${order.distributor.slug ?? order.distributor.id}`}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
              {order.distributor.profileImage && !order.distributor.profileImage.includes("logoFull.png") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={order.distributor.profileImage} alt="" className="max-w-full max-h-full object-contain" />
              ) : (
                <Truck className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#0A183A] truncate group-hover:text-[#1E76B6]">
                {order.distributor.name}
              </p>
              {order.distributor.ciudad && (
                <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {order.distributor.ciudad}
                </p>
              )}
            </div>
          </Link>
          {order.distributor.telefono && (
            <a
              href={`tel:${order.distributor.telefono}`}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1E76B6]"
            >
              <Phone className="w-3 h-3" /> {order.distributor.telefono}
            </a>
          )}

          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">Entrega</p>
          <div className="text-xs text-[#0A183A] space-y-0.5">
            <p className="font-bold">{order.buyerName}</p>
            {order.buyerCompany && <p className="text-gray-600">{order.buyerCompany}</p>}
            {(order.buyerAddress || order.buyerCity) && (
              <p className="text-gray-600 flex items-start gap-1">
                <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>
                  {order.buyerAddress ?? ""}
                  {order.buyerAddress && order.buyerCity ? ", " : ""}
                  {order.buyerCity ?? ""}
                </span>
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Resumen</p>
          <div className="space-y-1.5 text-xs">
            <Row label="Subtotal" value={fmtCOP(subtotal)} />
            {order.totalWithIva != null && ivaAmount > 0 && (
              <Row label="IVA" value={fmtCOP(ivaAmount)} muted />
            )}
            <div className="pt-1.5 mt-1.5" style={{ borderTop: "1px dashed rgba(10,24,58,0.10)" }}>
              <Row label="Total" value={fmtCOP(total)} bold />
            </div>
          </div>
          {order.paymentStatus && (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Pago: {order.paymentStatus}
            </p>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <footer
        className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4"
        style={{ background: "#fafbfc", borderTop: "1px solid rgba(10,24,58,0.06)" }}
      >
        <p className="text-[11px] text-gray-500">
          Te enviaremos un correo cada vez que el estado cambie.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold text-[#1E76B6] hover:bg-[#F0F7FF]"
        >
          <ShoppingCart className="w-3 h-3" /> Seguir comprando
        </Link>
      </footer>
    </article>
  );
}

function Row({
  label, value, bold, muted,
}: {
  label: string; value: string; bold?: boolean; muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-[11px] ${muted ? "text-gray-400" : "text-gray-600"} ${bold ? "font-bold uppercase tracking-wider" : ""}`}>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? "text-base font-black text-[#0A183A]" : muted ? "text-gray-500" : "text-[#0A183A] font-bold"}`}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Journey — vertical map of status events with the line connecting
// each marker. Append-only events come from the server (statusHistory);
// future steps are projected from the canonical pendiente → confirmado
// → enviado → entregado pipeline so the buyer sees what's coming next
// alongside what's already happened.
// ─────────────────────────────────────────────────────────────────────

const FUTURE_PIPELINE = ["pendiente", "confirmado", "enviado", "entregado"] as const;

function Journey({
  events, currentStatus, cancelNote,
}: {
  events: StatusEvent[];
  currentStatus: string;
  cancelNote: string | null;
}) {
  const isTerminal = currentStatus === "entregado" || currentStatus === "cancelado";
  // Project the remaining future steps when the order is still moving
  // through the pipeline. We only project canonical statuses we
  // haven't seen yet; free-text statuses don't seed a projection
  // because we don't know what comes next.
  const seen = new Set(events.map((e) => e.status));
  const remainingFuture = !isTerminal
    ? FUTURE_PIPELINE.filter((s) => !seen.has(s) && s !== "pendiente")
    : [];

  return (
    <ol className="relative">
      {events.map((evt, i) => {
        const isLast = i === events.length - 1;
        const isCurrentMarker = isLast && remainingFuture.length === 0 && !isTerminal
          ? false   // edge case: free-text most recent without future steps — still mark as current
          : isLast;
        return (
          <JourneyNode
            key={`${evt.status}-${evt.at}-${i}`}
            event={evt}
            current={isLast}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _placeholder={isCurrentMarker}
            cancelNote={evt.status === "cancelado" ? cancelNote ?? evt.note ?? null : null}
            connector={!isLast || remainingFuture.length > 0}
          />
        );
      })}
      {remainingFuture.map((status, i) => (
        <JourneyNode
          key={`future-${status}`}
          event={{ status, at: "" }}
          ghost
          connector={i < remainingFuture.length - 1}
        />
      ))}
    </ol>
  );
}

function JourneyNode({
  event, current, ghost, connector, cancelNote,
}: {
  event: StatusEvent;
  current?: boolean;
  ghost?: boolean;
  connector: boolean;
  cancelNote?: string | null;
  // Discarded — kept so the parent's spread doesn't blow up TS.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _placeholder?: boolean;
}) {
  const meta = STATUS_META[event.status];
  const Icon = meta?.icon ?? Clock;
  const label = meta?.label ?? event.status;
  const color = meta?.color ?? "#1E76B6";
  const bg    = meta?.bg ?? "rgba(30,118,182,0.10)";

  return (
    <li className="relative pl-12 pb-5 last:pb-0">
      {/* Vertical connector line — sits behind the marker. Last node
          AND ghost-tail nodes don't render a trailing line. */}
      {connector && (
        <span
          aria-hidden
          className="absolute left-[18px] top-9 bottom-0 w-px"
          style={{
            background: ghost
              ? "repeating-linear-gradient(to bottom, rgba(10,24,58,0.18) 0 4px, transparent 4px 8px)"
              : "linear-gradient(to bottom, #1E76B6, rgba(30,118,182,0.25))",
          }}
        />
      )}

      {/* Marker dot */}
      <span
        className="absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: ghost
            ? "white"
            : current
              ? "linear-gradient(135deg,#0A183A,#1E76B6)"
              : bg,
          border: ghost
            ? "1.5px dashed rgba(10,24,58,0.20)"
            : current
              ? "none"
              : `1px solid ${color}33`,
          boxShadow: current ? `0 10px 24px -8px ${color}80` : "none",
        }}
      >
        <Icon
          className="w-4 h-4"
          style={{
            color: ghost ? "#9ca3af" : current ? "white" : color,
          }}
        />
      </span>

      {/* Body */}
      <div className="pt-1">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <p
            className={`text-sm font-black leading-tight ${ghost ? "text-gray-400" : "text-[#0A183A]"}`}
          >
            {label}
          </p>
          {!ghost && event.at && (
            <time
              dateTime={event.at}
              className="text-[11px] text-gray-500 tabular-nums"
            >
              {fmtDateTime(event.at)}
            </time>
          )}
        </div>
        {!ghost && current && (
          <p className="text-[11px] font-bold mt-0.5" style={{ color }}>
            Estado actual
          </p>
        )}
        {!ghost && event.eta && (
          <p className="text-[11px] text-[#1E76B6] mt-1 font-bold">
            Entrega estimada: {new Date(event.eta).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </p>
        )}
        {!ghost && event.note && event.status !== "cancelado" && (
          <p className="text-[11px] text-gray-600 mt-1 italic">{event.note}</p>
        )}
        {!ghost && cancelNote && event.status === "cancelado" && (
          <div
            className="mt-2 p-2.5 rounded-lg text-[11px]"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#7f1d1d" }}
          >
            <span className="font-bold">Motivo:</span>{" "}
            {cancelNote.replace(/^\[CANCELADO\]\s*/, "").split(" | Original:")[0]}
          </div>
        )}
        {ghost && (
          <p className="text-[11px] text-gray-400 mt-0.5">Pendiente</p>
        )}
      </div>
    </li>
  );
}

// =============================================================================
// DELIVERY SURVEY — buyer rates the order experience after entrega
//
// Renders one of three states based on `existing`:
//   1. submitted (existing survey, < 30 days old) → thank-you card with
//                                                   their own rating
//                                                   echoed back
//   2. submitted (older)                          → still thank-you, no
//                                                   second-guess prompt
//   3. nothing yet                                → form with 5-star
//                                                   picker + optional
//                                                   comment + Enviar
//
// API call is email-gated server-side. The same email already pulled
// from the URL/JWT to load the order is reused, so the buyer doesn't
// re-type it.
// =============================================================================

function DeliverySurvey({
  orderId, email, existing, onSubmitted,
}: {
  orderId: string;
  email: string;
  existing: { id: string; rating: number; comment: string | null; createdAt: string } | null;
  /** Called after a successful submit — parent should refetch the
   *  order so `existing` populates and the form flips to thank-you. */
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [hover, setHover]   = useState<number>(0);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-existing survey — show the thank-you state immediately.
  if (existing) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg,rgba(34,197,94,0.06),rgba(16,185,129,0.04))",
          border: "1px solid rgba(34,197,94,0.20)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0"
            style={{ border: "1px solid rgba(34,197,94,0.25)" }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">¡Gracias por tu reseña!</p>
            <p className="text-sm text-[#0A183A] font-bold mt-0.5">Tu opinión ayuda al distribuidor a mejorar.</p>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="w-4 h-4"
                  fill={s <= existing.rating ? "#f59e0b" : "none"}
                  style={{ color: s <= existing.rating ? "#f59e0b" : "#d1d5db" }}
                />
              ))}
              <span className="text-xs font-bold text-[#0A183A] ml-1">{existing.rating}/5</span>
            </div>
            {existing.comment && (
              <blockquote className="mt-2 text-xs text-gray-600 italic border-l-2 border-emerald-200 pl-3">
                {existing.comment}
              </blockquote>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function submit() {
    if (rating < 1) {
      setError("Selecciona una calificación de 1 a 5 estrellas");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/marketplace/orders/${orderId}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSubmitted();
    } catch (e) {
      setError((e instanceof Error ? e.message : "").slice(0, 200) || "No se pudo enviar tu reseña");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg,rgba(30,118,182,0.06),rgba(52,140,203,0.04))",
        border: "1px solid rgba(30,118,182,0.20)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0"
          style={{ border: "1px solid rgba(30,118,182,0.25)" }}>
          <MessageSquare className="w-5 h-5 text-[#1E76B6]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1E76B6]">¿Cómo fue tu experiencia?</p>
          <p className="text-sm text-[#0A183A] font-bold mt-0.5">Califica este pedido</p>
          <p className="text-[11px] text-gray-500 mt-1">
            Tu reseña le llega al distribuidor para mejorar el servicio.
          </p>

          {/* Star picker */}
          <div className="flex items-center gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(s)}
                className="p-1 transition-transform active:scale-90"
                aria-label={`${s} estrella${s === 1 ? "" : "s"}`}
              >
                <Star
                  className="w-7 h-7"
                  fill={s <= (hover || rating) ? "#f59e0b" : "none"}
                  style={{ color: s <= (hover || rating) ? "#f59e0b" : "#d1d5db" }}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs font-bold text-[#0A183A] ml-2">{rating}/5</span>
            )}
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="¿Algún comentario? (opcional)"
            className="mt-3 w-full px-3 py-2 rounded-xl text-sm bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/30"
            style={{ border: "1px solid rgba(52,140,203,0.20)", resize: "vertical" }}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-400">{comment.length}/1000</span>
          </div>

          {error && <p className="text-[11px] text-red-600 font-medium mt-2">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || rating < 1}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black text-white transition-all disabled:opacity-50 hover:opacity-90"
            style={{
              background: "linear-gradient(135deg,#0A183A,#1E76B6)",
              boxShadow: "0 8px 20px -8px rgba(30,118,182,0.45)",
            }}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Enviar reseña
          </button>
        </div>
      </div>
    </div>
  );
}
