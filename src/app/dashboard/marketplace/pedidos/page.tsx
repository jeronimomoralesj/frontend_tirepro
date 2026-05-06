"use client";

// Unified orders inbox for distribuidores: combines orders that came in
// through the public marketplace (MarketplaceOrder — buyers checking out
// from /marketplace/product/<id>) with orders that originated from a
// fleet's TirePro platform (PurchaseOrder — analista flow / direct quote).
// Two tabs, shared header, same row template so a marketplace_tracker
// gets a single inbox to work from.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight, Building2, Calendar, Check, CheckCircle2, ChevronDown, Clock, Hash,
  Loader2, Lock, Mail, MapPin, Package, Pencil, Phone, RefreshCw, ShoppingCart,
  Tag, Truck, User2, X, XCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";
// Date-only fields (like an ETA the dist picked from a date input)
// must format in UTC — the value is stored at noon UTC and the
// formatter would otherwise drift by one day for viewers west of UTC.
const fmtDateUtc = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

// Public-facing order number — match the format the buyer sees in the
// status-change email so dist + buyer can reference the same string.
const orderNumber = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

// Statuses that close the order — once we hit one of these, no more
// edits and the action controls disappear.
const TERMINAL_STATUSES = new Set(["entregado", "cancelado"]);
// Same idea for the platform purchase orders (different vocabulary):
// once they're in one of these states they're done from the dist's
// perspective and shouldn't crowd the active inbox.
const TERMINAL_PO_STATUSES = new Set(["completada", "rechazada"]);

interface MktOrder {
  id: string;
  status: string;
  quantity: number;
  totalCop: number;
  totalWithIva: number | null;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  buyerAddress: string | null;
  buyerCity: string | null;
  buyerCompany: string | null;
  paymentStatus: string | null;
  notas: string | null;
  etaDate: string | null;
  createdAt: string;
  listing?: {
    marca: string;
    modelo: string;
    dimension: string;
    imageUrls?: string[] | null;
    coverIndex?: number | null;
  } | null;
}

interface PoOrder {
  id: string;
  status: string;
  totalEstimado: number | null;
  totalCotizado: number | null;
  cotizacionFecha: string | null;
  pickupDate: string | null;
  createdAt: string;
  company?: { id: string; name: string } | null;
  items?: Array<{ marca: string; modelo: string | null; dimension: string; cantidad: number }> | null;
}

type Tab = "mkt" | "plataforma";

export default function PedidosMarketplacePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mkt");
  // Lifecycle filter — 'active' is the default because that's what
  // the dist actually has to action. 'done' surfaces the archive
  // (entregado / cancelado / completada / rechazada).
  const [lifecycle, setLifecycle] = useState<"active" | "done">("active");
  const [mktOrders, setMktOrders] = useState<MktOrder[]>([]);
  const [poOrders, setPoOrders] = useState<PoOrder[]>([]);
  const [loadingMkt, setLoadingMkt] = useState(true);
  const [loadingPo, setLoadingPo] = useState(true);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u?.companyId) setCompanyId(u.companyId);
    } catch { /* */ }
  }, []);

  // Both fetches as callbacks so the manual "Actualizar" button can
  // re-run them on demand without ripping into the useEffect closure.
  const fetchMkt = React.useCallback((cId: string) => {
    setLoadingMkt(true);
    return authFetch(`${API_BASE}/marketplace/orders/distributor?distributorId=${encodeURIComponent(cId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMktOrders(Array.isArray(data) ? data : []))
      .catch(() => setMktOrders([]))
      .finally(() => setLoadingMkt(false));
  }, []);

  const fetchPo = React.useCallback((cId: string) => {
    setLoadingPo(true);
    return authFetch(`${API_BASE}/purchase-orders/distributor?distributorId=${encodeURIComponent(cId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPoOrders(Array.isArray(data) ? data : []))
      .catch(() => setPoOrders([]))
      .finally(() => setLoadingPo(false));
  }, []);

  useEffect(() => { if (companyId) fetchMkt(companyId); }, [companyId, fetchMkt]);
  useEffect(() => { if (companyId) fetchPo(companyId);  }, [companyId, fetchPo]);

  const reloading = loadingMkt || loadingPo;
  function reload() {
    if (!companyId) return;
    fetchMkt(companyId);
    fetchPo(companyId);
  }

  // Apply the lifecycle filter to both channels so list rendering
  // and counts agree.
  const filteredMkt = useMemo(
    () => mktOrders.filter((o) => lifecycle === "active"
      ? !TERMINAL_STATUSES.has(o.status)
      :  TERMINAL_STATUSES.has(o.status)),
    [mktOrders, lifecycle],
  );
  const filteredPo = useMemo(
    () => poOrders.filter((o) => lifecycle === "active"
      ? !TERMINAL_PO_STATUSES.has(o.status)
      :  TERMINAL_PO_STATUSES.has(o.status)),
    [poOrders, lifecycle],
  );

  // Per-tab subcounts for the lifecycle chips. Counts ignore the
  // lifecycle filter itself (so the chips advertise the totals
  // available behind each option, not the count of what's currently
  // shown).
  const lifecycleCounts = useMemo(() => {
    const list = tab === "mkt" ? mktOrders : poOrders;
    const term = tab === "mkt" ? TERMINAL_STATUSES : TERMINAL_PO_STATUSES;
    const active = list.filter((o) => !term.has(o.status)).length;
    return { active, done: list.length - active };
  }, [tab, mktOrders, poOrders]);

  const counts = useMemo(() => ({
    mkt:        mktOrders.length,
    plataforma: poOrders.length,
  }), [mktOrders, poOrders]);

  const totalMkt = useMemo(
    () => mktOrders.reduce((s, o) => s + (Number(o.totalCop) || 0), 0),
    [mktOrders],
  );
  const totalPo = useMemo(
    () => poOrders.reduce((s, o) => s + (Number(o.totalCotizado) || Number(o.totalEstimado) || 0), 0),
    [poOrders],
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#1E76B6]">
              Marketplace · Pedidos
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] mt-1 leading-tight">
              Bandeja de pedidos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Pedidos que llegan por el marketplace público y por la plataforma TirePro, en un solo lugar.
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={reloading || !companyId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-[#0A183A] bg-white hover:bg-[#F0F7FF] transition-colors disabled:opacity-50 flex-shrink-0"
            style={{ border: "1px solid rgba(10,24,58,0.10)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reloading ? "animate-spin" : ""}`} />
            {reloading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Kpi label="MKT · Pedidos"      value={String(counts.mkt)}        accent="#1E76B6" />
          <Kpi label="MKT · GMV"          value={fmtCOP(totalMkt)}          accent="#62b8f0" />
          <Kpi label="Plataforma · Pedidos" value={String(counts.plataforma)} accent="#0A183A" />
          <Kpi label="Plataforma · GMV"     value={fmtCOP(totalPo)}           accent="#173D68" />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-3">
          <TabBtn active={tab === "mkt"}        onClick={() => setTab("mkt")}        icon={ShoppingCart} count={counts.mkt}>
            Marketplace
          </TabBtn>
          <TabBtn active={tab === "plataforma"} onClick={() => setTab("plataforma")} icon={Truck}        count={counts.plataforma}>
            Plataforma
          </TabBtn>
        </div>

        {/* Lifecycle filter — defaults to 'active' so the dist's first
            view is the inbox of what they have to action. */}
        <div className="flex gap-2 mb-4">
          <LifecycleChip
            active={lifecycle === "active"}
            onClick={() => setLifecycle("active")}
            count={lifecycleCounts.active}
          >
            En proceso
          </LifecycleChip>
          <LifecycleChip
            active={lifecycle === "done"}
            onClick={() => setLifecycle("done")}
            count={lifecycleCounts.done}
          >
            Finalizados
          </LifecycleChip>
        </div>

        {/* List */}
        {tab === "mkt" ? (
          <MktList
            loading={loadingMkt}
            orders={filteredMkt}
            companyId={companyId}
            onPatched={(updated) =>
              setMktOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
            }
          />
        ) : (
          <PoList loading={loadingPo} orders={filteredPo} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-white p-3.5" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">{label}</p>
      <p className="text-lg sm:text-xl font-black tabular-nums mt-0.5" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function TabBtn({
  active, onClick, children, icon: Icon, count,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors"
      style={{
        background: active ? "#0A183A" : "white",
        color: active ? "white" : "#0A183A",
        border: `1px solid ${active ? "#0A183A" : "rgba(10,24,58,0.10)"}`,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
      <span
        className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
        style={{
          background: active ? "rgba(255,255,255,0.18)" : "rgba(30,118,182,0.10)",
          color: active ? "white" : "#1E76B6",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function LifecycleChip({
  active, onClick, children, count,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
      style={{
        background: active ? "#1E76B6" : "white",
        color:      active ? "white"   : "#0A183A",
        border:     `1px solid ${active ? "#1E76B6" : "rgba(10,24,58,0.10)"}`,
      }}
    >
      {children}
      <span
        className="px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums"
        style={{
          background: active ? "rgba(255,255,255,0.20)" : "rgba(30,118,182,0.10)",
          color:      active ? "white"                  : "#1E76B6",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function MktList({
  loading, orders, companyId, onPatched,
}: {
  loading: boolean;
  orders: MktOrder[];
  companyId: string | null;
  onPatched: (updated: MktOrder) => void;
}) {
  if (loading) return <ListSpinner />;
  if (orders.length === 0)
    return <Empty message="Aún no llegan pedidos por el marketplace público." />;

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <MktRow key={o.id} order={o} companyId={companyId} onPatched={onPatched} />
      ))}
    </div>
  );
}

function MktRow({
  order, companyId, onPatched,
}: {
  order: MktOrder;
  companyId: string | null;
  onPatched: (updated: MktOrder) => void;
}) {
  const isTerminal = TERMINAL_STATUSES.has(order.status);
  // The marketplace order schema is one listing × quantity, so unit price
  // is just the simple split. If/when the model grows multi-line, swap
  // this for the actual line array.
  const unitPrice = order.quantity > 0 ? order.totalCop / order.quantity : order.totalCop;
  // Buyer paid subtotal + 19% IVA via Bold. The order's totalCop is
  // the net subtotal — IVA was added on top at checkout. Compute the
  // breakdown so the dist sees what the buyer actually paid (matches
  // the receipt + Bold dashboard). Falls back to totalWithIva if the
  // backend ever populates it directly.
  const subtotal  = order.totalCop;
  const ivaAmount =
    order.totalWithIva != null && order.totalWithIva > subtotal
      ? order.totalWithIva - subtotal
      : Math.round(subtotal * 0.19);
  const total     = subtotal + ivaAmount;
  const imgs      = Array.isArray(order.listing?.imageUrls) ? order.listing!.imageUrls! : [];
  const cover     = imgs.length > 0 ? (imgs[order.listing?.coverIndex ?? 0] ?? imgs[0]) : null;

  return (
    <article
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: "1px solid rgba(10,24,58,0.08)" }}
    >
      {/* Card header — order #, status, created date, optional ETA */}
      <header
        className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap"
        style={{ background: "#fafbfc", borderBottom: "1px solid rgba(10,24,58,0.06)" }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#0A183A] tracking-wider">
            <Hash className="w-3 h-3 text-gray-400" />
            {orderNumber(order.id).slice(1)}
          </span>
          <span className="hidden sm:inline text-[11px] text-gray-400">·</span>
          <span className="hidden sm:inline text-[11px] text-gray-500 truncate">
            {fmtDate(order.createdAt)}
          </span>
          {order.etaDate && (
            <>
              <span className="hidden sm:inline text-[11px] text-gray-400">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E76B6]">
                <Truck className="w-3 h-3" />
                Entrega {fmtDateUtc(order.etaDate)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* "Pago confirmado" badge — surfaces alongside the status
              pill whenever Bold has approved the payment OR the order
              has moved past pago_pendiente (which only happens after
              the webhook flips it). Gives the dist a clear "it's safe
              to act on this order, the buyer's money is in" signal
              before they accept / ship. */}
          {(order.paymentStatus === "approved" || (order.status !== "pago_pendiente" && order.status !== "cancelado")) && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Pago confirmado
            </span>
          )}
          <StatusPill status={order.status} />
        </div>
      </header>

      {/* Line items — one per row. The marketplace model is single-listing
          today, so this is a list of length 1 with room to grow. */}
      <section className="px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Productos</p>
        <div className="space-y-3">
          <LineItem
            cover={cover}
            title={order.listing
              ? `${order.listing.marca} ${order.listing.modelo}`
              : "Producto eliminado"}
            subtitle={order.listing?.dimension ?? "—"}
            quantity={order.quantity}
            unitPrice={unitPrice}
            lineTotal={order.totalCop}
          />
        </div>
      </section>

      {/* Buyer + totals — two columns on desktop, stacked on mobile */}
      <section
        className="grid sm:grid-cols-2 gap-x-6 gap-y-4 px-5 py-4"
        style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Cliente</p>
          <div className="space-y-1.5 text-xs text-[#0A183A]">
            <p className="font-bold flex items-center gap-1.5">
              <User2 className="w-3.5 h-3.5 text-gray-400" />
              {order.buyerName ?? "Comprador"}
            </p>
            {order.buyerCompany && (
              <p className="text-gray-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {order.buyerCompany}
              </p>
            )}
            {order.buyerEmail && (
              <a
                href={`mailto:${order.buyerEmail}`}
                className="text-[#1E76B6] hover:underline flex items-center gap-1.5 truncate"
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{order.buyerEmail}</span>
              </a>
            )}
            {order.buyerPhone && (
              <a
                href={`tel:${order.buyerPhone}`}
                className="text-[#1E76B6] hover:underline flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                {order.buyerPhone}
              </a>
            )}
            {(order.buyerAddress || order.buyerCity) && (
              <p className="text-gray-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>
                  {order.buyerAddress ? `${order.buyerAddress}` : ""}
                  {order.buyerAddress && order.buyerCity ? ", " : ""}
                  {order.buyerCity ?? ""}
                </span>
              </p>
            )}
          </div>
          {order.notas && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 text-[11px] text-amber-900" style={{ border: "1px solid rgba(180,83,9,0.15)" }}>
              <p className="font-bold uppercase tracking-wider text-[9px] text-amber-700 mb-1">Notas</p>
              {order.notas}
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Resumen</p>
          <div className="space-y-1.5 text-xs">
            <Row label="Subtotal" value={fmtCOP(subtotal)} />
            <Row label="IVA (19%)" value={fmtCOP(ivaAmount)} muted />
            <div className="pt-1.5 mt-1.5" style={{ borderTop: "1px dashed rgba(10,24,58,0.10)" }}>
              <Row label="Total pagado" value={fmtCOP(total)} bold />
            </div>
            {order.paymentStatus && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Pago: {order.paymentStatus}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer — status actions or terminal lock */}
      <footer
        className="flex justify-end items-center px-5 py-3"
        style={{ background: "#fafbfc", borderTop: "1px solid rgba(10,24,58,0.06)" }}
      >
        {isTerminal ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <Lock className="w-3 h-3" /> Pedido cerrado
          </span>
        ) : (
          <StatusActions order={order} companyId={companyId} onPatched={onPatched} />
        )}
      </footer>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Card sub-pieces
// ─────────────────────────────────────────────────────────────────────

function LineItem({
  cover, title, subtitle, quantity, unitPrice, lineTotal,
}: {
  cover: string | null;
  title: string;
  subtitle: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)", border: "1px solid rgba(10,24,58,0.06)" }}
      >
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cover} alt="" className="w-full h-full object-contain p-1" />
        ) : (
          <Package className="w-5 h-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-[#0A183A] truncate">{title}</p>
        <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
        <p className="text-[11px] text-gray-600 mt-0.5 tabular-nums">
          <span className="font-bold">{quantity}×</span>
          <span className="text-gray-400"> · </span>
          {fmtCOP(unitPrice)} <span className="text-gray-400">c/u</span>
        </p>
      </div>
      <p className="text-sm font-black text-[#0A183A] tabular-nums flex-shrink-0">
        {fmtCOP(lineTotal)}
      </p>
    </div>
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
// Status update controls — three paths: Entregada (terminal), Cancelar
// (terminal, asks for reason), or "Otro estado…" (free-text). Backend
// fires a status-change email on every PATCH so the buyer is always in
// the loop.
// ─────────────────────────────────────────────────────────────────────

function StatusActions({
  order, companyId, onPatched,
}: {
  order: MktOrder;
  companyId: string | null;
  onPatched: (updated: MktOrder) => void;
}) {
  // Stage flow (canonical happy path): pendiente → confirmado (with
  // ETA) → enviado → entregado. Cancelar and the free-text "Otro
  // estado…" are escape hatches available at every stage so the dist
  // can drop in custom statuses ("en preparación", "listo para
  // retirar", etc.) between the canonical steps.
  // Status-update modes:
  //  - idle / menu             — entry points (button → menu)
  //  - eta                     — set or update the delivery date
  //                              (chained off Confirmar OR standalone
  //                              "Editar fecha estimada" entry)
  //  - confirmNote / shipNote  — Confirmar / Enviado with an optional
  //                              note for the buyer (chained off menu)
  //  - deliverNote             — Entregado with an optional note
  //  - custom / cancel         — free-form status / cancelReason
  type Mode =
    | "idle" | "menu"
    | "eta" | "confirmNote" | "shipNote" | "deliverNote"
    | "custom" | "cancel";
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [etaInput, setEtaInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Close the menu / inline form when clicking outside.
  useEffect(() => {
    if (mode === "idle") return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setMode("idle"); setError("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [mode]);

  async function patch(opts: {
    status: string;
    cancelReason?: string;
    etaDate?: string | null;
    note?: string;
  }) {
    if (!companyId) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        distributorId: companyId,
        status: opts.status,
      };
      if (opts.cancelReason) body.cancelReason = opts.cancelReason;
      if (opts.note?.trim()) body.note = opts.note.trim();
      if (opts.etaDate !== undefined) {
        // Empty string clears, ISO string sets, undefined leaves untouched.
        body.etaDate = opts.etaDate || null;
      }
      const res = await authFetch(`${API_BASE}/marketplace/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onPatched({
        ...order,
        status: updated.status ?? opts.status,
        etaDate: (updated.etaDate ?? order.etaDate) ?? null,
      });
      setMode("idle");
      setText("");
      setNoteText("");
      setEtaInput("");
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  }

  // Today (yyyy-mm-dd) for the date input min so the dist can't
  // promise a delivery in the past.
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div ref={containerRef} className="relative">
      {mode === "idle" && (
        <button
          type="button"
          onClick={() => setMode("menu")}
          disabled={!companyId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#0A183A,#1E76B6)",
            boxShadow: "0 8px 20px -8px rgba(30,118,182,0.45)",
          }}
        >
          <Pencil className="w-3 h-3" />
          Actualizar estado
          <ChevronDown className="w-3 h-3 -mr-0.5" />
        </button>
      )}

      {mode === "menu" && (
        <div
          className="absolute right-0 bottom-full mb-2 w-72 rounded-xl bg-white shadow-xl z-10 overflow-hidden"
          style={{ border: "1px solid rgba(10,24,58,0.10)" }}
        >
          {/* Canonical happy path — top of menu */}
          <button
            type="button"
            onClick={() => { setMode("eta"); setEtaInput(order.etaDate ? order.etaDate.slice(0, 10) : ""); setNoteText(""); }}
            disabled={saving || order.status === "confirmado"}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-[#1E76B6] hover:bg-[#F0F7FF] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar
            <span className="ml-auto text-[9px] font-normal text-gray-400 uppercase tracking-wider">+ Fecha</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode("shipNote"); setNoteText(""); }}
            disabled={saving}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
            style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
          >
            <Truck className="w-4 h-4" /> Enviado
            <span className="ml-auto text-[9px] font-normal text-gray-400 uppercase tracking-wider">+ Nota</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode("deliverNote"); setNoteText(""); }}
            disabled={saving}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
          >
            <Package className="w-4 h-4" /> Entregado
            <span className="ml-auto text-[9px] font-normal text-gray-400 uppercase tracking-wider">cierra</span>
          </button>

          {/* Editable fecha estimada — always available, even after the
              order has shipped, so the dist can revise it whenever the
              operation slips. Not a status change; just an etaDate
              patch on the current status. */}
          <div style={{ borderTop: "1px solid rgba(10,24,58,0.10)" }}>
            <button
              type="button"
              onClick={() => { setMode("eta"); setEtaInput(order.etaDate ? order.etaDate.slice(0, 10) : ""); setNoteText(""); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-[#0A183A] hover:bg-[#F0F7FF]"
            >
              <Calendar className="w-4 h-4 text-[#1E76B6]" />
              {order.etaDate ? "Editar fecha estimada" : "Agregar fecha estimada"}
            </button>
          </div>

          {/* Escape hatches — keep separated visually */}
          <div style={{ borderTop: "1px solid rgba(10,24,58,0.10)" }}>
            <button
              type="button"
              onClick={() => { setMode("custom"); setText(""); setNoteText(""); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-[#0A183A] hover:bg-[#F0F7FF]"
            >
              <Pencil className="w-4 h-4" /> Otro estado…
            </button>
            <button
              type="button"
              onClick={() => { setMode("cancel"); setText(""); setNoteText(""); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-red-700 hover:bg-red-50"
              style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
            >
              <XCircle className="w-4 h-4" /> Cancelar pedido
              <span className="ml-auto text-[9px] font-normal text-gray-400 uppercase tracking-wider">cierra</span>
            </button>
          </div>
        </div>
      )}

      {/* Fecha estimada picker. Two entry points:
            - "Confirmar" from the menu  → sets status=confirmado + etaDate
            - "Editar fecha" from menu   → keeps current status, just patches etaDate
          The standalone-edit path uses the order's CURRENT status so we
          don't accidentally regress an already-shipped order back to
          confirmado. */}
      {mode === "eta" && (() => {
        const targetStatus = order.status === "pendiente" ? "confirmado" : order.status;
        const isStatusChange = order.status === "pendiente";
        return (
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E76B6]">
                Fecha estimada de entrega
              </span>
              <input
                autoFocus
                type="date"
                min={todayIso}
                value={etaInput}
                onChange={(e) => setEtaInput(e.target.value)}
                className="px-3 py-1.5 rounded-full text-xs bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.25)" }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setMode("idle"); setEtaInput(""); setNoteText(""); setError(""); }
                }}
              />
            </div>
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Nota para el comprador (opcional)"
              className="px-3 py-1.5 rounded-full text-xs bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              style={{ border: "1px solid rgba(52,140,203,0.25)" }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!etaInput) return;
                  // Pin at noon UTC so every viewer (server email, buyer
                  // browser, dist browser) reads the same calendar day
                  // regardless of their local timezone — avoids the
                  // off-by-one drift we'd get with local-midnight or
                  // local-23:59:59 conversions.
                  patch({
                    status: targetStatus,
                    etaDate: `${etaInput}T12:00:00.000Z`,
                    note: noteText.trim() || undefined,
                  });
                }}
                disabled={!etaInput || saving}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isStatusChange ? "Confirmar pedido" : "Guardar fecha"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("idle"); setEtaInput(""); setNoteText(""); setError(""); }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Nota inline — Enviado / Entregado pop a single text field
          for the dist to add a personalized message before saving. */}
      {(mode === "shipNote" || mode === "deliverNote") && (
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E76B6]">
            {mode === "shipNote" ? "Marcar como enviado" : "Marcar como entregado"}
          </span>
          <input
            autoFocus
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={mode === "shipNote"
              ? "Ej: Salió por Servientrega, guía 0123…"
              : "Ej: Recibido por Juan en recepción"}
            className="px-3 py-1.5 rounded-full text-xs bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] sm:w-72"
            style={{ border: "1px solid rgba(52,140,203,0.25)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                patch({
                  status: mode === "shipNote" ? "enviado" : "entregado",
                  note: noteText.trim() || undefined,
                });
              } else if (e.key === "Escape") {
                setMode("idle"); setNoteText(""); setError("");
              }
            }}
          />
          <p className="text-[10px] text-gray-400 italic">
            La nota aparece en el seguimiento del comprador. Es opcional.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => patch({
                status: mode === "shipNote" ? "enviado" : "entregado",
                note: noteText.trim() || undefined,
              })}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white disabled:opacity-50"
              style={{
                background: mode === "shipNote"
                  ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                  : "linear-gradient(135deg,#059669,#22c55e)",
              }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {mode === "shipNote" ? "Marcar enviado" : "Marcar entregado"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("idle"); setNoteText(""); setError(""); }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100"
              aria-label="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {(mode === "custom" || mode === "cancel") && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "cancel" ? "Motivo de cancelación" : "Ej. en preparación"}
            className="px-3 py-1.5 rounded-full text-xs bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] w-56"
            style={{ border: "1px solid rgba(52,140,203,0.25)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                if (mode === "cancel") patch({ status: "cancelado", cancelReason: text.trim() });
                else patch({ status: text.trim() });
              } else if (e.key === "Escape") {
                setMode("idle"); setText(""); setError("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!text.trim()) return;
              if (mode === "cancel") patch({ status: "cancelado", cancelReason: text.trim() });
              else patch({ status: text.trim() });
            }}
            disabled={!text.trim() || saving}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white disabled:opacity-50"
            style={{ background: mode === "cancel" ? "#dc2626" : "#1E76B6" }}
            aria-label="Confirmar"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => { setMode("idle"); setText(""); setError(""); }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Cancelar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 mt-1 text-[10px] text-red-600">{error}</p>
      )}
    </div>
  );
}

function PoList({ loading, orders }: { loading: boolean; orders: PoOrder[] }) {
  if (loading) return <ListSpinner />;
  if (orders.length === 0)
    return <Empty message="Aún no llegan pedidos desde la plataforma TirePro." />;

  return (
    <div className="space-y-2">
      {orders.map((o) => {
        const total = o.totalCotizado ?? o.totalEstimado ?? 0;
        const itemSummary = o.items && o.items.length > 0
          ? `${o.items.length} ítem${o.items.length === 1 ? "" : "s"} · ${o.items[0].marca} ${o.items[0].modelo ?? ""}`.trim()
          : "Pedido";
        return (
          <Link
            key={o.id}
            href={`/dashboard/pedidosDist?orderId=${o.id}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-white hover:border-[#1E76B6]/40 transition-colors"
            style={{ border: "1px solid rgba(10,24,58,0.08)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(30,118,182,0.08)" }}
            >
              <Truck className="w-4 h-4 text-[#1E76B6]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold text-gray-400 tracking-wider">
                  {orderNumber(o.id)}
                </span>
                <p className="text-sm font-black text-[#0A183A] truncate">{itemSummary}</p>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {o.company?.name ?? "Cliente"} · creado {fmtDate(o.createdAt)}
                {o.pickupDate ? ` · recogida ${fmtDate(o.pickupDate)}` : ""}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-[#0A183A] tabular-nums">{fmtCOP(total)}</p>
              <StatusPill status={o.status} />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; color: string; bg: string }> = {
    pending:           { label: "Pendiente", color: "#1E76B6", bg: "rgba(30,118,182,0.10)" },
    pendiente:         { label: "Pendiente", color: "#1E76B6", bg: "rgba(30,118,182,0.10)" },
    paid:              { label: "Pagado",    color: "#16a34a", bg: "rgba(34,197,94,0.10)"  },
    completada:        { label: "Completado", color: "#16a34a", bg: "rgba(34,197,94,0.10)" },
    confirmado:        { label: "Confirmado", color: "#1E76B6", bg: "rgba(30,118,182,0.10)" },
    enviado:           { label: "Enviado",   color: "#0A183A", bg: "rgba(10,24,58,0.08)"   },
    entregado:         { label: "Entregado", color: "#16a34a", bg: "rgba(34,197,94,0.10)"  },
    aceptada:          { label: "Aceptado",  color: "#1E76B6", bg: "rgba(30,118,182,0.10)" },
    cotizacion_recibida:{label: "Cotizada",   color: "#f97316", bg: "rgba(249,115,22,0.10)" },
    solicitud_enviada:  {label: "Nueva",      color: "#1E76B6", bg: "rgba(30,118,182,0.10)" },
    rechazada:         { label: "Rechazada", color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
    cancelado:         { label: "Cancelado", color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
    cancelled:         { label: "Cancelada", color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
  };
  const m = meta[status] ?? { label: status, color: "#6b7280", bg: "rgba(107,114,128,0.10)" };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-1"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

function ListSpinner() {
  return (
    <div className="flex items-center justify-center py-16 text-[#1E76B6]">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl bg-white p-10 text-center"
      style={{ border: "1px dashed rgba(10,24,58,0.12)" }}
    >
      <Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
