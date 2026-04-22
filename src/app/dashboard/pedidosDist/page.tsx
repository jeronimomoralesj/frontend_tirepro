"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ChevronDown, ChevronUp, Send, Check, X,
  BarChart3, Calendar, Package, Gavel, Clock, DollarSign, Store,
  Building, CheckCircle, AlertCircle, User, RotateCcw,
} from "lucide-react";
import CatalogAutocomplete from "../../../components/CatalogAutocomplete";

const VentasDistPage = React.lazy(() => import("../ventasDist/page"));
const CatalogoDistPage = React.lazy(() => import("../catalogoDist/page"));

// -- API ----------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

// -- Types --------------------------------------------------------------------

// Mirrors the backend PurchaseOrderItem row. Optional quote fields are
// filled by the dist at cotización time; lifecycle fields drive the
// reencauche flow (en_reencauche_bucket → aprobada/rechazada → entregada).
type ItemStatus =
  | "pendiente"
  | "cotizada"
  | "en_reencauche_bucket"
  | "aprobada"
  | "rechazada"
  | "entregada"
  | "completada"
  | "cancelada";

interface OrderItem {
  id: string;
  tireId?: string | null;
  marca: string;
  modelo?: string | null;
  dimension: string;
  eje?: string | null;
  cantidad: number;
  tipo: "nueva" | "reencauche";
  vehiclePlaca?: string | null;
  urgency?: string | null;
  notas?: string | null;

  // Quote fields (filled at cotización time)
  precioUnitario?: number | null;
  disponible?: boolean | null;
  tiempoEntrega?: string | null;
  cotizacionNotas?: string | null;
  // Reencauche-only: the banda the dist will use.
  bandaOfrecidaMarca?: string | null;
  bandaOfrecidaModelo?: string | null;

  // Lifecycle
  status: ItemStatus;
  estimatedDelivery?: string | null;
  motivoRechazo?: string | null;
  finalizedAt?: string | null;
  vidaPrevia?: string | null;
  vidaNueva?: string | null;
}

// Draft state held in the UI while the dist is filling in the quote form.
// Converted to the API payload in handleSubmitCotizacion.
interface CotizacionDraft {
  itemId: string;
  precioUnitario: number;
  disponible: boolean;
  tiempoEntrega: string;
  notas: string;
  alternativeTire?: string;
  // Reencauche-only: the banda the dist commits to.
  bandaOfrecidaMarca?: string;
  bandaOfrecidaModelo?: string;
}

interface PurchaseOrder {
  id: string;
  companyId: string;
  distributorId: string;
  status: string;
  items: OrderItem[];
  totalEstimado: number | null;
  totalCotizado: number | null;
  cotizacionFecha: string | null;
  cotizacionNotas: string | null;
  notas: string | null;
  resolvedAt: string | null;
  createdAt: string;
  company?: { id: string; name: string; profileImage?: string };
}

// -- Helpers ------------------------------------------------------------------

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  solicitud_enviada:   { label: "Nueva",       color: "#1E76B6", bg: "rgba(30,118,182,0.08)" },
  cotizacion_recibida: { label: "Cotizada",    color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  aceptada:            { label: "Aceptada",    color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  rechazada:           { label: "Rechazada",   color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  completada:          { label: "Completada",  color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "#ef4444", immediate: "#f97316", next_month: "#eab308", plan: "#348CCB",
};

const TIEMPO_OPTIONS = ["Inmediato", "1-3 dias", "1 semana", "2 semanas"];

type FilterTab = "nuevas" | "proceso" | "completadas";

function matchFilter(status: string, tab: FilterTab): boolean {
  if (tab === "nuevas") return status === "solicitud_enviada";
  if (tab === "proceso") return status === "cotizacion_recibida" || status === "aceptada";
  return status === "completada" || status === "rechazada";
}

// -- Input classes ------------------------------------------------------------

const inputCls =
  "w-full px-3 py-2 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

// -- Order card ---------------------------------------------------------------

function OrderCard({
  order,
  companyId,
  onUpdated,
}: {
  order: PurchaseOrder;
  companyId: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [conIva, setConIva] = useState(false);

  const items = order.items ?? [];
  const st = STATUS_META[order.status] ?? STATUS_META.solicitud_enviada;
  const canQuote = order.status === "solicitud_enviada";

  // Editable cotización draft — one row per item, keyed by the item's stable
  // id so the form stays aligned with the server's rows even if item order
  // changes between fetches.
  const [cotItems, setCotItems] = useState<CotizacionDraft[]>(() =>
    items.map((it) => ({
      itemId:               it.id,
      precioUnitario:       0,
      disponible:           true,
      tiempoEntrega:        "Inmediato",
      notas:                "",
      // Seed the banda fields from the fleet's recommendation so the dist
      // can accept-as-is in one click; they can override if they'd rather
      // use a different banda brand or type.
      bandaOfrecidaMarca:   it.tipo === "reencauche" ? (it.marca  ?? "") : "",
      bandaOfrecidaModelo:  it.tipo === "reencauche" ? (it.modelo ?? "") : "",
    })),
  );

  function updateCotItem(idx: number, field: keyof CotizacionDraft, value: any) {
    setCotItems((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  }

  const subtotal = cotItems.reduce(
    (s, c, i) => s + (c.disponible ? c.precioUnitario * (items[i]?.cantidad ?? 1) : 0),
    0,
  );
  const ivaAmount = conIva ? Math.round(subtotal * 0.19) : 0;
  const totalCot = subtotal + ivaAmount;

  const nuevaCount = items.filter((it) => it.tipo === "nueva").length;
  const reencaucheCount = items.filter((it) => it.tipo === "reencauche").length;

  async function handleSubmitCotizacion() {
    setSending(true);
    try {
      const notasWithIva = [generalNotes, conIva ? "Precios incluyen IVA (19%)" : "Precios sin IVA"].filter(Boolean).join(" — ");
      // Strip UI-only fields (alternativeTire) — if the dist suggested an
      // alternative we fold it into the notas for that item so nothing is
      // lost when the server persists the row. The banda fields are only
      // sent for reencauche items so nueva items don't pick up stale text.
      const payload = cotItems.map((c, i) => {
        const isReencauche = items[i]?.tipo === "reencauche";
        return {
          itemId:               c.itemId,
          precioUnitario:       c.precioUnitario,
          disponible:           c.disponible,
          tiempoEntrega:        c.tiempoEntrega,
          notas:                c.alternativeTire
                                  ? `[Alternativa: ${c.alternativeTire}] ${c.notas}`.trim()
                                  : c.notas,
          bandaOfrecidaMarca:   isReencauche ? (c.bandaOfrecidaMarca?.trim()  || undefined) : undefined,
          bandaOfrecidaModelo:  isReencauche ? (c.bandaOfrecidaModelo?.trim() || undefined) : undefined,
        };
      });
      const res = await authFetch(`${API_BASE}/purchase-orders/${order.id}/cotizacion`, {
        method: "PATCH",
        body: JSON.stringify({
          distributorId: companyId,
          cotizacion: payload,
          totalCotizado: totalCot,
          notas: notasWithIva || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      onUpdated();
    } catch { /* */ }
    setSending(false);
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all"
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Company avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
          style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
        >
          {(order.company?.name ?? "?").charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0A183A] truncate">
            {order.company?.name ?? "Cliente"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {fmtDate(order.createdAt)}
            {nuevaCount > 0 && ` \u00b7 ${nuevaCount} nueva${nuevaCount > 1 ? "s" : ""}`}
            {reencaucheCount > 0 && ` \u00b7 ${reencaucheCount} reencauche${reencaucheCount > 1 ? "s" : ""}`}
          </p>
        </div>

        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: st.bg, color: st.color }}
        >
          {st.label}
        </span>

        {order.totalEstimado && (
          <span className="text-sm font-black text-[#0A183A] flex-shrink-0 hidden sm:block">
            {fmtCOP(order.totalCotizado ?? order.totalEstimado)}
          </span>
        )}

        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-gray-100 p-4 sm:p-5 space-y-4">
          {/* Client notes */}
          {order.notas && (
            <div className="px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-500">
              <span className="font-bold text-gray-400">Nota del cliente: </span>
              {order.notas}
            </div>
          )}

          {/* Items table — horizontally scrollable */}
          <div className="overflow-x-auto -mx-4 px-4" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="text-sm" style={{ minWidth: canQuote ? "900px" : "500px" }}>
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 pr-2 whitespace-nowrap">Detalle</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">Dimensión</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">Eje</th>
                  <th className="text-center py-2 px-2 whitespace-nowrap">Cant.</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">Tipo</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">Urgencia</th>
                  {canQuote && (
                    <>
                      <th className="text-center py-2 px-2 whitespace-nowrap">Disp.</th>
                      <th className="text-left py-2 px-2 whitespace-nowrap">Alternativa</th>
                      <th className="text-right py-2 px-2 whitespace-nowrap">Precio Unit. <span className="font-normal normal-case">(antes de IVA)</span></th>
                      <th className="text-left py-2 px-2 whitespace-nowrap">Entrega</th>
                      <th className="text-left py-2 pl-2 whitespace-nowrap">Notas</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const urgColor = URGENCY_COLORS[item.urgency ?? "plan"] ?? "#348CCB";
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2.5 pr-2" style={{ minWidth: "140px" }}>
                        {item.tipo === "nueva" ? (
                          <div>
                            <p className="font-medium text-[#0A183A] text-sm">
                              {item.marca}{item.modelo ? ` ${item.modelo}` : ""}
                            </p>
                            {item.vehiclePlaca && <p className="text-[10px] text-gray-400">Veh: {item.vehiclePlaca}</p>}
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-[#7c3aed] text-sm">
                              {item.modelo || "Banda por definir"}
                            </p>
                            {item.vehiclePlaca && <p className="text-[10px] text-gray-400">Veh: {item.vehiclePlaca}</p>}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-gray-500 text-sm whitespace-nowrap">{item.dimension}</td>
                      <td className="py-2.5 px-2 text-gray-500 text-sm capitalize whitespace-nowrap">{item.eje ?? "—"}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#0A183A]">{item.cantidad}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: item.tipo === "nueva" ? "rgba(30,118,182,0.08)" : "rgba(124,58,237,0.08)",
                            color: item.tipo === "nueva" ? "#1E76B6" : "#7c3aed",
                          }}
                        >
                          {item.tipo === "nueva" ? "Nueva" : "Reencauche"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: urgColor }} />
                        <span className="text-xs text-gray-400 capitalize">{item.urgency ?? "plan"}</span>
                      </td>
                      {canQuote && (
                        <>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => { updateCotItem(i, "disponible", !cotItems[i]?.disponible); if (cotItems[i]?.disponible) updateCotItem(i, "alternativeTire", ""); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: cotItems[i]?.disponible ? "#22c55e" : "#ef4444" }}
                            >
                              {cotItems[i]?.disponible ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-white" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-2">
                            {item.tipo === "reencauche" ? (
                              // Reencauche quotes need banda brand + type
                              // (always, not just when disponible is false),
                              // so both the fleet and the entregar step see
                              // exactly what banda the dist committed to.
                              <div className="flex flex-col gap-1" style={{ minWidth: "180px" }}>
                                <input
                                  type="text"
                                  value={cotItems[i]?.bandaOfrecidaMarca ?? ""}
                                  onChange={(e) => updateCotItem(i, "bandaOfrecidaMarca", e.target.value)}
                                  placeholder="Marca banda"
                                  className={`${inputCls} text-xs`}
                                />
                                <input
                                  type="text"
                                  value={cotItems[i]?.bandaOfrecidaModelo ?? ""}
                                  onChange={(e) => updateCotItem(i, "bandaOfrecidaModelo", e.target.value)}
                                  placeholder="Tipo / diseño"
                                  className={`${inputCls} text-xs`}
                                />
                              </div>
                            ) : !cotItems[i]?.disponible ? (
                              <input
                                type="text"
                                value={cotItems[i]?.alternativeTire ?? ""}
                                onChange={(e) => updateCotItem(i, "alternativeTire", e.target.value)}
                                placeholder="Llanta alternativa..."
                                className={`${inputCls} text-xs`}
                                style={{ minWidth: "150px" }}
                              />
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min={0}
                              value={cotItems[i]?.precioUnitario || ""}
                              onChange={(e) => updateCotItem(i, "precioUnitario", Number(e.target.value))}
                              placeholder="COP"
                              className={`${inputCls} text-right`}
                              style={{ minWidth: "120px" }}
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <select
                              value={cotItems[i]?.tiempoEntrega ?? "Inmediato"}
                              onChange={(e) => updateCotItem(i, "tiempoEntrega", e.target.value)}
                              className={`${inputCls}`}
                              style={{ minWidth: "120px" }}
                            >
                              {TIEMPO_OPTIONS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 pl-2">
                            <input
                              type="text"
                              value={cotItems[i]?.notas ?? ""}
                              onChange={(e) => updateCotItem(i, "notas", e.target.value)}
                              placeholder="Notas..."
                              className={inputCls}
                              style={{ minWidth: "130px" }}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Already quoted — read-only summary, pulled from the items
              themselves (per-item pricing replaced the legacy cotizacion JSON). */}
          {!canQuote && items.some((it) => it.precioUnitario != null) && (
            <div className="rounded-xl p-4" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.1)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Cotizacion enviada</p>
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-500">
                      {it.marca}{it.modelo ? ` ${it.modelo}` : ""} — {it.dimension}
                    </p>
                    {it.tipo === "reencauche" && (it.bandaOfrecidaMarca || it.bandaOfrecidaModelo) && (
                      <p className="text-[10px] text-[#7c3aed] font-semibold">
                        Banda ofrecida: {it.bandaOfrecidaMarca}{it.bandaOfrecidaMarca && it.bandaOfrecidaModelo ? " · " : ""}{it.bandaOfrecidaModelo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={it.disponible ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                      {it.disponible ? "Disponible" : "No disp."}
                    </span>
                    <span className="font-bold text-[#0A183A]">{fmtCOP(it.precioUnitario ?? 0)}</span>
                    <span className="text-gray-400">{it.tiempoEntrega ?? "—"}</span>
                  </div>
                </div>
              ))}
              {order.cotizacionNotas && (
                <p className="text-xs text-gray-500 mt-2">Notas: {order.cotizacionNotas}</p>
              )}
              <p className="text-sm font-black text-[#0A183A] mt-3 text-right">Total: {fmtCOP(order.totalCotizado ?? 0)}</p>
            </div>
          )}

          {/* Quote form footer */}
          {canQuote && (
            <div className="space-y-3 pt-2">
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={2}
                placeholder="Notas generales para el cliente..."
                className={`${inputCls} resize-none`}
              />

              {/* Subtotal + IVA + Total */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.1)" }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-[#0A183A]">{fmtCOP(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setConIva(!conIva)}
                    className="flex items-center gap-2 transition-colors"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: conIva ? "#1E76B6" : "rgba(52,140,203,0.08)", border: conIva ? "none" : "1.5px solid rgba(52,140,203,0.3)" }}>
                      {conIva && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-gray-500">IVA (19%)</span>
                  </button>
                  <span className="font-bold text-[#0A183A]">{conIva ? fmtCOP(ivaAmount) : "—"}</span>
                </div>
                <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}>
                  <span className="text-sm font-black text-[#0A183A]">Total</span>
                  <span className="text-lg font-black text-[#0A183A]">{fmtCOP(totalCot)}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSubmitCotizacion}
                  disabled={sending || subtotal <= 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Cotizacion
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// Page
// ==============================================================================

// =============================================================================
// Bid Request Card — distributor responds with prices
// =============================================================================

function BidRequestCard({ bid, companyId, onUpdated }: { bid: any; companyId: string; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const items: any[] = Array.isArray(bid.items) ? bid.items : [];
  const myResponse = (bid.responses ?? [])[0]; // already filtered by distributorId in API
  const hasQuoted = myResponse?.status === "cotizada";
  const hasRejected = myResponse?.status === "rechazada";
  const deadline = bid.deadline ? new Date(bid.deadline) : null;
  const hoursLeft = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60))) : null;

  const [cotItems, setCotItems] = useState<Array<{
    precioUnitario: number; disponible: boolean; tiempoEntrega: string; notas: string;
    alternativeMarca: string; alternativeModelo: string; alternativePrecio: number;
    // Reencauche offer — split into brand + design. Profundidad captured
    // alongside so even bandas that aren't in the catalog carry the info
    // the fleet and the entregar step need.
    bandaOfrecidaMarca:       string;
    bandaOfrecidaModelo:      string;
    bandaOfrecidaProfundidad: number | "";
  }>>(
    items.map((it: any) => ({
      precioUnitario: 0, disponible: true, tiempoEntrega: "1-3 dias", notas: "",
      alternativeMarca: "", alternativeModelo: "", alternativePrecio: 0,
      // Seed marca from the fleet's requested banda so dist can accept-as-is.
      bandaOfrecidaMarca:       it?.tipo === "reencauche" ? (it?.marca  ?? "") : "",
      bandaOfrecidaModelo:      "",
      bandaOfrecidaProfundidad: "",
    }))
  );
  const [globalNotas, setGlobalNotas] = useState("");
  const [incluyeIva, setIncluyeIva] = useState(false);

  // Autofill: two items are "the same tire" if tipo+marca+dimension+eje match.
  // Editing a field on one propagates to all siblings so the dist doesn't have
  // to retype the same price/band 5× for a fleet request of the same SKU.
  const itemKeyOf = (it: any) => `${it?.tipo ?? ""}|${(it?.marca ?? "").trim().toLowerCase()}|${(it?.dimension ?? "").trim().toLowerCase()}|${(it?.eje ?? "").trim().toLowerCase()}`;
  const siblingIndexes = useMemo(() => {
    const groups: Record<string, number[]> = {};
    items.forEach((it, i) => {
      const k = itemKeyOf(it);
      (groups[k] ??= []).push(i);
    });
    return items.map((it) => groups[itemKeyOf(it)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function patchItem(idx: number, patch: Partial<typeof cotItems[number]>, propagate: boolean) {
    setCotItems((prev) => {
      const targets = propagate ? siblingIndexes[idx] : [idx];
      return prev.map((c, i) => (targets.includes(i) ? { ...c, ...patch } : c));
    });
  }

  const totalCotizado = cotItems.reduce((s, c) => {
    if (!c.disponible) {
      return s + (c.alternativeMarca && c.alternativeModelo ? c.alternativePrecio : 0);
    }
    return s + c.precioUnitario;
  }, 0) * (incluyeIva ? 1.19 : 1);

  async function handleSubmitBid() {
    setSubmitting(true);
    try {
      const cotizacion = cotItems.map((c, i) => {
        const isReencauche = items[i]?.tipo === "reencauche";
        // Keep the legacy single-string `bandaOfrecida` populated when we
        // have both marca + modelo so existing bid consumers still work;
        // ship the structured fields alongside it for the new UI.
        const bandaFull = isReencauche && c.disponible && c.bandaOfrecidaMarca && c.bandaOfrecidaModelo
          ? `${c.bandaOfrecidaMarca} ${c.bandaOfrecidaModelo}`.trim()
          : undefined;
        return {
          itemIndex: i,
          precioUnitario: c.disponible
            ? c.precioUnitario
            : (c.alternativeMarca && c.alternativeModelo ? c.alternativePrecio : 0),
          disponible: c.disponible,
          tiempoEntrega: c.tiempoEntrega,
          notas: c.notas,
          alternativeTire: !c.disponible && c.alternativeMarca && c.alternativeModelo
            ? `${c.alternativeMarca} ${c.alternativeModelo}` : undefined,
          alternativePrecio: !c.disponible && c.alternativeMarca && c.alternativeModelo
            ? c.alternativePrecio : undefined,
          bandaOfrecida:           bandaFull,
          bandaOfrecidaMarca:      isReencauche && c.disponible ? (c.bandaOfrecidaMarca?.trim()  || undefined) : undefined,
          bandaOfrecidaModelo:     isReencauche && c.disponible ? (c.bandaOfrecidaModelo?.trim() || undefined) : undefined,
          bandaOfrecidaProfundidad: isReencauche && c.disponible && typeof c.bandaOfrecidaProfundidad === "number"
            ? c.bandaOfrecidaProfundidad : undefined,
        };
      });
      await authFetch(`${API_BASE}/marketplace/bid-responses`, {
        method: "POST",
        body: JSON.stringify({
          bidRequestId: bid.id,
          distributorId: companyId,
          cotizacion,
          totalCotizado: Math.round(totalCotizado),
          notas: globalNotas || null,
          incluyeIva,
          tiempoEntrega: cotItems[0]?.tiempoEntrega ?? "1-3 dias",
        }),
      });
      onUpdated();
    } catch { /* */ }
    setSubmitting(false);
  }

  async function handleRejectBid() {
    if (!confirm("¿Rechazar esta licitación por completo? No podrás cotizar después.")) return;
    setRejecting(true);
    try {
      await authFetch(`${API_BASE}/marketplace/bid-responses/reject`, {
        method: "POST",
        body: JSON.stringify({
          bidRequestId: bid.id,
          distributorId: companyId,
          notas: globalNotas || null,
        }),
      });
      onUpdated();
    } catch { /* */ }
    setRejecting(false);
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{
      border: `1px solid ${hasRejected ? "rgba(239,68,68,0.25)" : hasQuoted ? "rgba(34,197,94,0.2)" : "rgba(139,92,246,0.2)"}`,
    }}>
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
        <Gavel className="w-4 h-4 text-[#8b5cf6] flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#0A183A]">{bid.company?.name ?? "Cliente"}</p>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
              background: hasRejected ? "rgba(239,68,68,0.1)" : hasQuoted ? "rgba(34,197,94,0.1)" : "rgba(139,92,246,0.1)",
              color: hasRejected ? "#ef4444" : hasQuoted ? "#22c55e" : "#8b5cf6",
            }}>
              {hasRejected ? "Rechazado" : hasQuoted ? "Cotizado" : "Pendiente"}
            </span>
          </div>
          <p className="text-[10px] text-gray-400">
            {items.length} llantas · Est: ${(bid.totalEstimado ?? 0).toLocaleString("es-CO")}
            {hoursLeft !== null && <> · <Clock className="w-3 h-3 inline" /> {hoursLeft}h restantes</>}
            {bid._count && <> · {bid._count.invitations} distribuidores invitados</>}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
          {/* Notas del cliente */}
          {bid.notas && (
            <div className="px-3 py-2 rounded-lg text-xs text-gray-600" style={{ background: "rgba(10,24,58,0.02)" }}>
              <span className="font-bold text-gray-400">Notas: </span>{bid.notas}
            </div>
          )}

          {/* Per-item pricing */}
          <div className="space-y-2">
            {items.map((item: any, idx: number) => {
              const cot = cotItems[idx];
              const isReencauche = item.tipo === "reencauche";
              const siblingCount = siblingIndexes[idx]?.length ?? 1;
              const isFirstOfGroup = (siblingIndexes[idx]?.[0] ?? idx) === idx;
              const groupBadge = siblingCount > 1 && isFirstOfGroup
                ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}>×{siblingCount} · autocompletado</span>
                : null;

              return (
                <div key={idx} className="rounded-lg p-3" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(10,24,58,0.05)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-[#0A183A] flex items-center gap-1.5">
                        {item.marca} {item.dimension}
                        {groupBadge}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {isReencauche ? "Reencauche" : "Nueva"} · Eje: {item.eje ?? "—"}
                        {item.catalogSuggestion && <> · Sugerido: {item.catalogSuggestion}</>}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={cot.disponible}
                        onChange={(e) => patchItem(idx, { disponible: e.target.checked }, true)}
                        className="accent-[#22c55e]" />
                      <span className="text-[10px] font-bold text-gray-500">Disponible</span>
                    </label>
                  </div>

                  {cot.disponible ? (
                    <div className="space-y-2">
                      {isReencauche && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Banda · marca</label>
                              <CatalogAutocomplete
                                value={cot.bandaOfrecidaMarca}
                                onChange={(v) => patchItem(idx, { bandaOfrecidaMarca: v }, true)}
                                field="marca"
                                placeholder="Ej. Bandag"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Banda · diseño</label>
                              <CatalogAutocomplete
                                value={cot.bandaOfrecidaModelo}
                                onChange={(v) => patchItem(idx, { bandaOfrecidaModelo: v }, true)}
                                field="modelo"
                                filterMarca={cot.bandaOfrecidaMarca}
                                filterDimension={item.dimension}
                                placeholder="Ej. BDR-HT"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase">
                              Profundidad inicial (mm)
                              <span className="text-[9px] font-medium text-gray-400 normal-case ml-1">
                                — requerida si la banda no está en tu catálogo
                              </span>
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={cot.bandaOfrecidaProfundidad === "" ? "" : cot.bandaOfrecidaProfundidad}
                              onChange={(e) => patchItem(
                                idx,
                                { bandaOfrecidaProfundidad: e.target.value === "" ? "" : Number(e.target.value) },
                                true,
                              )}
                              placeholder="Ej. 16"
                              className={inputCls}
                            />
                          </div>
                        </>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Precio unitario</label>
                          <input type="number" value={cot.precioUnitario || ""} placeholder="COP"
                            onChange={(e) => patchItem(idx, { precioUnitario: Number(e.target.value) }, true)}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Tiempo entrega</label>
                          <select value={cot.tiempoEntrega}
                            onChange={(e) => patchItem(idx, { tiempoEntrega: e.target.value }, true)}
                            className={inputCls}>
                            <option value="Inmediato">Inmediato</option>
                            <option value="1-3 dias">1-3 dias</option>
                            <option value="1 semana">1 semana</option>
                            <option value="2 semanas">2 semanas</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400">Sugerir alternativa:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <CatalogAutocomplete
                          value={cot.alternativeMarca}
                          onChange={(v) => patchItem(idx, { alternativeMarca: v }, true)}
                          field="marca"
                          placeholder="Marca alternativa"
                        />
                        <CatalogAutocomplete
                          value={cot.alternativeModelo}
                          onChange={(v) => patchItem(idx, { alternativeModelo: v }, true)}
                          field="modelo"
                          filterMarca={cot.alternativeMarca}
                          placeholder="Modelo"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Precio alternativa</label>
                        <input type="number" value={cot.alternativePrecio || ""} placeholder="COP"
                          onChange={(e) => patchItem(idx, { alternativePrecio: Number(e.target.value) }, true)}
                          className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer: IVA toggle + total + notes + submit */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={incluyeIva} onChange={(e) => setIncluyeIva(e.target.checked)} className="accent-[#1E76B6]" />
              <span className="text-[10px] font-bold text-gray-500">Incluye IVA (19%)</span>
            </label>
            <div className="flex-1" />
            <p className="text-sm font-black text-[#0A183A]">Total: ${Math.round(totalCotizado).toLocaleString("es-CO")}</p>
          </div>

          <textarea value={globalNotas} onChange={(e) => setGlobalNotas(e.target.value)}
            placeholder={hasRejected ? "Licitación rechazada." : "Notas generales de la cotizacion..."} rows={2}
            disabled={hasRejected}
            className={`${inputCls} resize-none`} />

          {hasRejected ? (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
              <X className="w-4 h-4" />
              Licitación rechazada
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button onClick={handleRejectBid} disabled={rejecting || submitting}
                className="sm:col-span-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Rechazar
              </button>
              <button onClick={handleSubmitBid} disabled={submitting || rejecting || totalCotizado <= 0}
                className="sm:col-span-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {hasQuoted ? "Actualizar Cotizacion" : "Enviar Cotizacion"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
// Distributor Marketplace Profile Editor
// =============================================================================

const COLOMBIAN_CITIES = [
  "Bogota","Medellin","Cali","Barranquilla","Cartagena","Bucaramanga","Cucuta",
  "Pereira","Santa Marta","Ibague","Manizales","Villavicencio","Pasto","Monteria",
  "Neiva","Armenia","Popayan","Valledupar","Sincelejo","Tunja","Riohacha",
  "Florencia","Quibdo","Yopal","Mocoa","Leticia","Arauca","San Jose del Guaviare",
  "Puerto Carreno","Mitu","Inirida","Sogamoso","Duitama","Girardot","Zipaquira",
  "Facatativa","Fusagasuga","Soacha","Bello","Envigado","Itagui","Sabaneta",
  "Rionegro","Apartado","Turbo","Palmira","Buenaventura","Tulua","Buga",
  "Cartago","Soledad","Maicao","Barrancabermeja","Piedecuesta","Floridablanca",
  "Giron","Dosquebradas","La Virginia","Tuquerres","Ipiales","Tumaco",
];

type CoberturaItem = { ciudad: string; direccion: string; lat: number | null; lng: number | null };

type ToastType = { id: number; message: string; type: "success" | "error" };

function ToastContainer({ toasts, onDismiss }: { toasts: ToastType[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto transition-all"
          style={{ background: t.type === "success" ? "rgba(22,163,74,0.96)" : "rgba(220,38,38,0.96)", minWidth: 260, maxWidth: 360 }}
          onClick={() => onDismiss(t.id)}>
          {t.type === "success" ? <CheckCircle className="w-4 h-4 text-white flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />}
          <span className="text-white text-sm font-medium flex-1">{t.message}</span>
          <X className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

function DistributorProfileSection() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [form, setForm] = useState({
    telefono: "", descripcion: "", bannerImage: "", direccion: "", ciudad: "", sitioWeb: "",
    cobertura: [] as CoberturaItem[], tipoEntrega: "ambos", colorMarca: "#1E76B6",
  });
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<{ display: string; city: string; address: string; lat: number; lng: number }[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounce = React.useRef<NodeJS.Timeout | null>(null);

  const toast = useCallback((msg: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    let user: { companyId?: string };
    try { user = JSON.parse(stored); } catch { router.push("/login"); return; }
    const cId = user.companyId ?? "";
    if (!cId) return;
    setCompanyId(cId);

    authFetch(`${API_BASE}/marketplace/distributor/${cId}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          let cob: CoberturaItem[] = [];
          if (Array.isArray(data.cobertura)) {
            cob = data.cobertura.map((c: any) =>
              typeof c === "string" ? { ciudad: c, direccion: "", lat: null, lng: null } : c
            );
          }
          setForm({
            telefono: data.telefono ?? "", descripcion: data.descripcion ?? "",
            bannerImage: data.bannerImage ?? "", direccion: data.direccion ?? "",
            ciudad: data.ciudad ?? "", sitioWeb: data.sitioWeb ?? "",
            cobertura: cob, tipoEntrega: data.tipoEntrega ?? "ambos",
            colorMarca: data.colorMarca ?? "#1E76B6",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function handleAddressSearch(query: string) {
    setAddressQuery(query);
    setAddressResults([]);
    if (addressDebounce.current) clearTimeout(addressDebounce.current);
    if (query.length < 3) return;
    addressDebounce.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Colombia")}&format=json&limit=5&countrycodes=co&accept-language=es`);
        if (res.ok) {
          const data = await res.json();
          setAddressResults(data.map((r: any) => {
            const parts = (r.display_name ?? "").split(",").map((s: string) => s.trim());
            const city = parts.find((p: string) => COLOMBIAN_CITIES.some((c) => p.toLowerCase().includes(c.toLowerCase()))) ?? parts[1] ?? "";
            return {
              display: r.display_name ?? query,
              city: city.replace("Bogotá D.C.", "Bogota").replace("Bogotá", "Bogota").replace("Medellín", "Medellin"),
              address: parts.slice(0, 2).join(", "),
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            };
          }));
        }
      } catch { /* */ }
      setAddressSearching(false);
    }, 400);
  }

  function addCoveragePoint(result: { city: string; address: string; lat: number; lng: number }) {
    setForm((f) => ({
      ...f,
      cobertura: [...f.cobertura, { ciudad: result.city || addressQuery, direccion: result.address, lat: result.lat, lng: result.lng }],
    }));
    setAddressQuery("");
    setAddressResults([]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/marketplace/distributor/${companyId}/profile`, {
        method: "PATCH", body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast("Perfil del marketplace actualizado", "success");
    } catch { toast("Error al guardar", "error"); }
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-[#1E76B6]" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(30,118,182,0.1)" }}>
          <Building className="w-4 h-4 text-[#1E76B6]" />
        </div>
        <h3 className="text-sm font-black text-[#0A183A] tracking-tight">Perfil en Marketplace</h3>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Esta informacion aparece en tu pagina publica del marketplace.
        {companyId && (
          <a href={`/marketplace/distributor/${companyId}`} target="_blank" rel="noopener" className="ml-1 text-[#1E76B6] font-bold hover:underline">Ver mi pagina</a>
        )}
      </p>

      <div className="rounded-2xl p-5 sm:p-6" style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefono</label>
            <input type="tel" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="+57 300 123 4567" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sitio Web</label>
            <input type="url" value={form.sitioWeb} onChange={(e) => setForm((f) => ({ ...f, sitioWeb: e.target.value }))}
              placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ciudad principal</label>
            <input type="text" value={form.ciudad} onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
              placeholder="Bogota" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Direccion principal</label>
            <input type="text" value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              placeholder="Calle 80 #45-12" className={inputCls} />
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Color de marca</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.colorMarca} onChange={(e) => setForm((f) => ({ ...f, colorMarca: e.target.value }))}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 cursor-pointer" />
            <span className="text-xs font-mono text-gray-500">{form.colorMarca}</span>
            <div className="flex gap-1">
              {["#1E76B6", "#ef4444", "#22c55e", "#f97316", "#8b5cf6", "#0A183A"].map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, colorMarca: c }))}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{ background: c, borderColor: form.colorMarca === c ? "#0A183A" : "transparent" }} />
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descripcion</label>
          <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            rows={3} placeholder="Describe tu empresa, servicios y especialidades..." className={`${inputCls} resize-none`} />
        </div>
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Imagen de portada (URL)</label>
          <input type="url" value={form.bannerImage} onChange={(e) => setForm((f) => ({ ...f, bannerImage: e.target.value }))}
            placeholder="https://...imagen-portada.jpg" className={inputCls} />
          {form.bannerImage && (
            <div className="mt-2 h-20 rounded-xl overflow-hidden bg-gray-100">
              <img src={form.bannerImage} alt="Banner" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Delivery type */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo de entrega</label>
          <div className="flex rounded-xl overflow-hidden border border-[#348CCB]/30">
            {[{ value: "domicilio", label: "Domicilio" }, { value: "recogida", label: "Recogida" }, { value: "ambos", label: "Ambos" }].map((t) => (
              <button key={t.value} type="button" onClick={() => setForm((f) => ({ ...f, tipoEntrega: t.value }))}
                className="flex-1 px-3 py-2 text-xs font-bold transition-all"
                style={{ background: form.tipoEntrega === t.value ? "#0A183A" : "#F0F7FF", color: form.tipoEntrega === t.value ? "white" : "#173D68" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Coverage locations */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Puntos de cobertura ({form.cobertura.length})
          </label>

          {form.cobertura.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {form.cobertura.map((loc, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm">
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: form.colorMarca, border: "2px solid white", boxShadow: `0 0 0 1px ${form.colorMarca}40` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0A183A]">{loc.ciudad}</p>
                    {loc.direccion && <p className="text-[10px] text-gray-400 truncate">{loc.direccion}</p>}
                  </div>
                  {loc.lat && loc.lng && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 flex-shrink-0">
                      📍 {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                    </span>
                  )}
                  <button onClick={() => setForm((f) => ({ ...f, cobertura: f.cobertura.filter((_, j) => j !== i) }))}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Add new — smart search */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input type="text" value={addressQuery} onChange={(e) => handleAddressSearch(e.target.value)}
                  placeholder="Buscar direccion, barrio o ciudad..." className={inputCls} />
                {addressSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[#348CCB]" />
                )}
              </div>
            </div>

            {addressResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                {addressResults.map((r, i) => (
                  <button key={i} onClick={() => addCoveragePoint(r)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F0F7FF] transition-colors border-b border-gray-50 last:border-0">
                    <p className="text-xs font-bold text-[#0A183A]">{r.city || "Colombia"}</p>
                    <p className="text-[10px] text-gray-400 truncate">{r.display}</p>
                  </button>
                ))}
              </div>
            )}

            {!addressQuery && form.cobertura.length < 3 && (
              <div className="mt-2">
                <p className="text-[9px] text-gray-400 mb-1.5">Agregar rapidamente:</p>
                <div className="flex flex-wrap gap-1">
                  {COLOMBIAN_CITIES.slice(0, 10)
                    .filter((c) => !form.cobertura.some((loc) => loc.ciudad === c))
                    .slice(0, 6)
                    .map((city) => (
                      <button key={city} onClick={() => {
                        handleAddressSearch(city);
                        setTimeout(() => {
                          fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", Colombia")}&format=json&limit=1&countrycodes=co`)
                            .then((r) => r.ok ? r.json() : [])
                            .then((data) => {
                              if (data.length > 0) {
                                addCoveragePoint({ city, address: "", lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                              } else {
                                setForm((f) => ({ ...f, cobertura: [...f.cobertura, { ciudad: city, direccion: "", lat: null, lng: null }] }));
                              }
                            })
                            .catch(() => setForm((f) => ({ ...f, cobertura: [...f.cobertura, { ciudad: city, direccion: "", lat: null, lng: null }] })));
                          setAddressQuery("");
                        }, 100);
                      }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-medium text-[#1E76B6] bg-[#1E76B6]/5 hover:bg-[#1E76B6]/10 transition-colors">
                        + {city}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Guardar Perfil
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Reencauche review — dist-side review/approval UI for tires the fleet has
// sent to the reencauche bucket. Surfaces per-item accept (with ETA) and
// reject (routes tire to fin-de-vida with motivo + desechos). Lives inside
// the "En Proceso" tab because those items are tires physically at the
// distributor's facility awaiting disposition.
// =============================================================================

type ReencaucheStatus = "en_reencauche_bucket" | "aprobada";

interface ReencaucheItem extends OrderItem {
  // Widened so the filtered map carries enough context to render each row
  // without joining back to the parent order.
  _orderId:    string;
  _clientName: string;
  _clientId:   string;
  _createdAt:  string;
  tire?: {
    id: string;
    placa: string;
    posicion: number | null;
    vidaActual: string;
    vehicle?: { id: string; placa: string } | null;
  } | null;
}

type StatsRange = "month" | "7d" | "30d" | "90d" | "all";

function rangeStart(range: StatsRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 86_400_000);
}

const STATS_RANGE_LABEL: Record<StatsRange, string> = {
  month: "Este mes",
  "7d":  "7 días",
  "30d": "30 días",
  "90d": "90 días",
  all:   "Todo",
};

function ReencaucheReviewSection({
  orders, companyId, onUpdated,
}: {
  orders: PurchaseOrder[];
  companyId: string;
  onUpdated: () => void;
}) {
  const [clientFilter,   setClientFilter]   = useState<string>("all");
  const [statusFilter,   setStatusFilter]   = useState<ReencaucheStatus | "all">("all");
  const [approving,      setApproving]      = useState<ReencaucheItem | null>(null);
  const [rejecting,      setRejecting]      = useState<ReencaucheItem | null>(null);
  const [returning,      setReturning]      = useState<ReencaucheItem | null>(null);
  // Multi-select + entregar modal — aprobada tires the dist is handing back.
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [entregarOpen,   setEntregarOpen]   = useState(false);
  const [statsRange,     setStatsRange]     = useState<StatsRange>("month");

  // Flatten orders → per-item rows that are actively in the reencauche flow.
  const allItems: ReencaucheItem[] = useMemo(() => {
    const rows: ReencaucheItem[] = [];
    for (const o of orders) {
      if (!Array.isArray(o.items)) continue;
      for (const it of o.items) {
        if (it.tipo !== "reencauche") continue;
        if (it.status !== "en_reencauche_bucket" && it.status !== "aprobada") continue;
        rows.push({
          ...(it as any),
          _orderId:    o.id,
          _clientName: o.company?.name ?? "Cliente",
          _clientId:   o.companyId,
          _createdAt:  o.createdAt,
        });
      }
    }
    // Oldest-first so the dist tackles the longest-waiting tires first.
    rows.sort((a, b) => new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime());
    return rows;
  }, [orders]);

  // Distinct client list for the filter dropdown.
  const clientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of allItems) seen.set(it._clientId, it._clientName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [allItems]);

  const filtered = useMemo(() => {
    return allItems.filter((it) => {
      if (clientFilter !== "all" && it._clientId !== clientFilter) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      return true;
    });
  }, [allItems, clientFilter, statusFilter]);

  // Delivered items — for the stats strip. Scanned across ALL orders (not
  // just active), filtered by finalizedAt within the selected window.
  const deliveredStats = useMemo(() => {
    const start = rangeStart(statsRange);
    let count = 0;
    let total = 0;
    for (const o of orders) {
      if (!Array.isArray(o.items)) continue;
      for (const it of o.items) {
        if (it.tipo !== "reencauche" || it.status !== "entregada") continue;
        if (start && (!it.finalizedAt || new Date(it.finalizedAt) < start)) continue;
        count += 1;
        total += (it.precioUnitario ?? 0) * (it.cantidad ?? 1);
      }
    }
    return { count, total };
  }, [orders, statsRange]);

  const counts = useMemo(() => ({
    pendientes: allItems.filter((i) => i.status === "en_reencauche_bucket").length,
    aprobadas:  allItems.filter((i) => i.status === "aprobada").length,
  }), [allItems]);

  // Aprobada rows the dist currently ticked for hand-off.
  const selectedItems = useMemo(
    () => allItems.filter((i) => i.status === "aprobada" && selectedIds.has(i.id)),
    [allItems, selectedIds],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // Nothing to review AND no history in the window → render nothing so we
  // don't clutter the "En Proceso" tab with an empty purple card.
  if (allItems.length === 0 && deliveredStats.count === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.02)" }}>
      {/* Stats strip — count + $ of reencauches delivered in the chosen range */}
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap" style={{ background: "rgba(34,197,94,0.04)", borderBottom: "1px solid rgba(34,197,94,0.12)" }}>
        <CheckCircle className="w-4 h-4 text-[#15803d]" />
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#15803d]">Entregadas</p>
            <p className="text-sm font-black text-[#0A183A] tabular-nums leading-none">
              {deliveredStats.count.toLocaleString("es-CO")}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#15803d]">Facturado</p>
            <p className="text-sm font-black text-[#0A183A] tabular-nums leading-none">
              {fmtCOP(deliveredStats.total)}
            </p>
          </div>
        </div>
        <div className="ml-auto flex gap-1 bg-white rounded-lg p-0.5 border" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
          {(["month", "7d", "30d", "90d", "all"] as StatsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setStatsRange(r)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors"
              style={{
                background: statsRange === r ? "#15803d" : "transparent",
                color:      statsRange === r ? "white" : "#15803d",
              }}
            >
              {STATS_RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.15)" }}>
        <RotateCcw className="w-4 h-4 text-[#7c3aed]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7c3aed]">Reencauche · revisión</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]">
          {counts.pendientes} por aprobar · {counts.aprobadas} en proceso
        </span>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {/* Status filter */}
          <div className="flex gap-1 bg-white rounded-lg p-0.5 border" style={{ borderColor: "rgba(124,58,237,0.2)" }}>
            {([
              { k: "all" as const,                    label: "Todos" },
              { k: "en_reencauche_bucket" as const,   label: "Por aprobar" },
              { k: "aprobada" as const,               label: "En proceso" },
            ]).map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors"
                style={{
                  background: statusFilter === k ? "#7c3aed" : "transparent",
                  color:      statusFilter === k ? "white" : "#7c3aed",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Client filter */}
          {clientOptions.length > 1 && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="text-[11px] font-bold text-[#0A183A] bg-white border rounded-lg px-2 py-1"
              style={{ borderColor: "rgba(124,58,237,0.2)" }}
            >
              <option value="all">Todos los clientes</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-6 text-center">
          Sin llantas que coincidan con el filtro.
        </p>
      ) : (
        <div className="divide-y divide-[#7c3aed]/10">
          {filtered.map((it) => {
            const placa    = it.tire?.vehicle?.placa ?? it.vehiclePlaca ?? "—";
            const pos      = it.tire?.posicion != null ? `P${it.tire.posicion}` : "—";
            const vidaIn   = it.vidaPrevia  ?? it.tire?.vidaActual ?? "—";
            const etaStr   = it.estimatedDelivery
              ? new Date(it.estimatedDelivery).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
              : null;
            const isAprobada = it.status === "aprobada";

            const sel = selectedIds.has(it.id);
            return (
              <div
                key={it.id}
                className="px-4 py-3 flex items-center gap-3 flex-wrap text-xs transition-colors"
                style={{ background: sel ? "rgba(34,197,94,0.05)" : undefined }}
              >
                {/* Checkbox — only tires awaiting hand-off are selectable */}
                {isAprobada ? (
                  <button
                    onClick={() => toggleSelect(it.id)}
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: sel ? "#15803d" : "transparent",
                      border: sel ? "none" : "1.5px solid #cbd5e1",
                    }}
                    title="Seleccionar para entrega"
                  >
                    {sel && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </button>
                ) : (
                  <span className="w-4 h-4 flex-shrink-0" />
                )}

                {/* Client */}
                <div className="flex items-center gap-1.5 min-w-[140px]">
                  <Building className="w-3 h-3 text-gray-400" />
                  <span className="font-bold text-[#0A183A] truncate">{it._clientName}</span>
                </div>

                {/* Tire spec */}
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-[#0A183A]">
                    {it.marca}{it.modelo ? ` · ${it.modelo}` : ""} · {it.dimension}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {placa} · {pos} · vida actual: <span className="font-mono">{vidaIn}</span>
                    {it.precioUnitario ? ` · ${fmtCOP(it.precioUnitario)}` : ""}
                  </p>
                  {(it.bandaOfrecidaMarca || it.bandaOfrecidaModelo) && (
                    <p className="text-[10px] text-[#7c3aed] font-semibold mt-0.5">
                      Banda ofrecida: {it.bandaOfrecidaMarca}
                      {it.bandaOfrecidaMarca && it.bandaOfrecidaModelo ? " · " : ""}
                      {it.bandaOfrecidaModelo}
                    </p>
                  )}
                </div>

                {/* Status / ETA badge */}
                {isAprobada ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "rgba(34,197,94,0.1)", color: "#15803d" }}>
                    <CheckCircle className="w-3 h-3" />
                    {etaStr ? `Entrega: ${etaStr}` : "Aprobada"}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "rgba(234,179,8,0.1)", color: "#a16207" }}>
                    <Clock className="w-3 h-3" />
                    Por aprobar
                  </span>
                )}

                {/* Actions — split per lifecycle state */}
                {isAprobada ? (
                  <button
                    onClick={() => { setSelectedIds(new Set([it.id])); setEntregarOpen(true); }}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-white bg-[#0A183A] hover:bg-[#173D68] transition-colors"
                    title="Entregar esta llanta"
                  >
                    <Send className="w-3 h-3" /> Entregar
                  </button>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setApproving(it)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-white bg-green-500 hover:bg-green-600 transition-colors"
                      title="Reencauchar"
                    >
                      <Check className="w-3 h-3" /> Reencauchar
                    </button>
                    <button
                      onClick={() => setReturning(it)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-[#1E76B6] bg-[#1E76B6]/10 hover:bg-[#1E76B6]/15 transition-colors"
                      title="Devolver a Disponible — tire isn't retreadable para este job pero sigue siendo útil"
                    >
                      <Send className="w-3 h-3 rotate-180" /> Devolver
                    </button>
                    <button
                      onClick={() => setRejecting(it)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      title="Fin de vida — tire no sirve más"
                    >
                      <X className="w-3 h-3" /> Fin de vida
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve modal */}
      {approving && (
        <ApproveReencaucheModal
          item={approving}
          companyId={companyId}
          onClose={() => setApproving(null)}
          onDone={() => { setApproving(null); onUpdated(); }}
        />
      )}

      {/* Reject modal — fin-de-vida path */}
      {rejecting && (
        <RejectReencaucheModal
          item={rejecting}
          companyId={companyId}
          onClose={() => setRejecting(null)}
          onDone={() => { setRejecting(null); onUpdated(); }}
        />
      )}

      {/* Return modal — tire is fine, just not retreadable for this job */}
      {returning && (
        <ReturnReencaucheModal
          item={returning}
          companyId={companyId}
          onClose={() => setReturning(null)}
          onDone={() => { setReturning(null); onUpdated(); }}
        />
      )}

      {/* Multi-select action bar — only when at least one aprobada is ticked */}
      {selectedItems.length > 0 && !entregarOpen && (
        <div className="px-4 py-2 flex items-center gap-3 text-xs" style={{ background: "rgba(10,24,58,0.04)", borderTop: "1px solid rgba(10,24,58,0.1)" }}>
          <span className="font-bold text-[#0A183A]">
            {selectedItems.length} seleccionada{selectedItems.length !== 1 ? "s" : ""} para entregar
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-500 hover:text-gray-700 ml-2"
          >
            Limpiar
          </button>
          <button
            onClick={() => setEntregarOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#0A183A] hover:bg-[#173D68] transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Entregar {selectedItems.length > 1 ? `${selectedItems.length} llantas` : "llanta"}
          </button>
        </div>
      )}

      {entregarOpen && selectedItems.length > 0 && (
        <EntregarModal
          items={selectedItems}
          companyId={companyId}
          onClose={() => setEntregarOpen(false)}
          onDone={() => {
            setEntregarOpen(false);
            setSelectedIds(new Set());
            onUpdated();
          }}
        />
      )}
    </div>
  );
}

// Entregar modal — captures the retread details needed to progress each
// tire's vida and then fires POST /purchase-orders/:orderId/entregar. We
// batch deliveries by their parent order so one form submission can touch
// multiple orders in a single transaction per order.
function EntregarModal({
  items, companyId, onClose, onDone,
}: {
  items: ReencaucheItem[];
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  // Sensible defaults: ~16 mm profundidad for a fresh retread, banda = the
  // modelo the dist committed to at approval time. Dist can adjust per row.
  type Row = {
    banda:              string;
    bandaMarca:         string;
    costo:              number | "";
    profundidadInicial: number | "";
    proveedor:          string;
  };
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const init: Record<string, Row> = {};
    for (const it of items) {
      init[it.id] = {
        // Pre-fill from the dist's own quote (bandaOfrecida*) when it's
        // there; fall back to the fleet's requested modelo for banda and
        // to empty for marca so the dist doesn't retype the common case.
        banda:              it.bandaOfrecidaModelo ?? it.modelo ?? "",
        bandaMarca:         it.bandaOfrecidaMarca  ?? "",
        costo:              it.precioUnitario      ?? "",
        profundidadInicial: 16,
        proveedor:          "",
      };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  function patch(id: string, next: Partial<Row>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  }

  async function submit() {
    // Validate all rows first — do not start any network call if anything
    // is obviously malformed, so the dist doesn't end up in a partial state.
    for (const it of items) {
      const r = rows[it.id];
      if (!r?.banda.trim() || typeof r.costo !== "number" || typeof r.profundidadInicial !== "number") {
        setErr(`Completa banda, costo y profundidad inicial para cada llanta.`);
        return;
      }
      if (r.profundidadInicial <= 0) {
        setErr(`La profundidad inicial debe ser mayor a 0.`);
        return;
      }
    }
    setErr(null);
    setSaving(true);
    try {
      // Group by orderId so we can POST once per order (the backend expects
      // an array of deliveries under a single order).
      const byOrder = new Map<string, { tireId: string; banda: string; bandaMarca?: string; costo: number; profundidadInicial: number; proveedor?: string }[]>();
      for (const it of items) {
        if (!it.tireId) continue;
        const r = rows[it.id];
        const list = byOrder.get(it._orderId) ?? [];
        list.push({
          tireId:             it.tireId,
          banda:              r.banda.trim(),
          bandaMarca:         r.bandaMarca.trim() || undefined,
          costo:              r.costo as number,
          profundidadInicial: r.profundidadInicial as number,
          proveedor:          r.proveedor.trim() || undefined,
        });
        byOrder.set(it._orderId, list);
      }

      for (const [orderId, deliveries] of byOrder.entries()) {
        const res = await authFetch(`${API_BASE}/purchase-orders/${orderId}/entregar`, {
          method: "POST",
          body: JSON.stringify({ distributorId: companyId, deliveries }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message ?? `No se pudo entregar el pedido ${orderId.slice(0, 8)}`);
        }
      }
      onDone();
    } catch (e: any) {
      setErr(e.message ?? "Error al entregar");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
          <div>
            <h2 className="font-bold text-sm text-white">Entregar reencauche</h2>
            <p className="text-[11px] text-white/60 mt-0.5">
              {items.length} llanta{items.length !== 1 ? "s" : ""} — el vida avanzará y pasará al bucket Disponible
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.map((it) => {
            const r = rows[it.id];
            const nextVida = nextVidaLabel(it.tire?.vidaActual ?? it.vidaPrevia ?? "nueva");
            return (
              <div key={it.id} className="rounded-xl p-3" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)" }}>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-[#0A183A]">
                      {it.marca}{it.modelo ? ` · ${it.modelo}` : ""} · {it.dimension}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {it._clientName} · {it.tire?.vehicle?.placa ?? it.vehiclePlaca ?? "—"}
                      {it.tire?.posicion != null ? ` · P${it.tire.posicion}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                    vida → <span className="font-mono">{nextVida}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Banda</label>
                    <input className={`${inputCls} text-xs`} value={r.banda}
                           onChange={(e) => patch(it.id, { banda: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Marca banda</label>
                    <input className={`${inputCls} text-xs`} value={r.bandaMarca}
                           onChange={(e) => patch(it.id, { bandaMarca: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Costo (COP)</label>
                    <input type="number" min={0} className={`${inputCls} text-xs`} value={r.costo}
                           onChange={(e) => patch(it.id, { costo: e.target.value === "" ? "" : Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Prof. inicial (mm)</label>
                    <input type="number" min={0} step={0.1} className={`${inputCls} text-xs`} value={r.profundidadInicial}
                           onChange={(e) => patch(it.id, { profundidadInicial: e.target.value === "" ? "" : Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Proveedor</label>
                    <input className={`${inputCls} text-xs`} value={r.proveedor}
                           onChange={(e) => patch(it.id, { proveedor: e.target.value })} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {err && <div className="px-5 pt-2 flex-shrink-0"><p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{err}</p></div>}

        <div className="px-5 py-3 bg-gray-50 flex gap-2 flex-shrink-0 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Confirmar entrega
          </button>
        </div>
      </div>
    </div>
  );
}

// Small readability helper — shows the vida the retread will bump to.
function nextVidaLabel(current: string): string {
  const map: Record<string, string> = {
    nueva:       "reencauche1",
    reencauche1: "reencauche2",
    reencauche2: "reencauche3",
    reencauche3: "fin",
  };
  return map[current] ?? "reencauche1";
}

function ApproveReencaucheModal({
  item, companyId, onClose, onDone,
}: {
  item: ReencaucheItem;
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  // Default ETA a week out — typical retread turnaround. Dist can adjust.
  const [eta,     setEta]     = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/purchase-orders/items/${item.id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          distributorId:     companyId,
          estimatedDelivery: eta,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "No se pudo aprobar la llanta");
      }
      onDone();
    } catch (e: any) {
      setErr(e.message ?? "Error");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
          <h2 className="font-bold text-sm text-white">Aceptar para reencauche</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-lg p-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" }}>
            <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider">Llanta</p>
            <p className="text-sm font-bold text-[#0A183A] mt-0.5">
              {item.marca}{item.modelo ? ` · ${item.modelo}` : ""} · {item.dimension}
            </p>
            <p className="text-xs text-gray-500">
              {item._clientName} · {item.tire?.vehicle?.placa ?? item.vehiclePlaca ?? "—"}
              {item.tire?.posicion != null ? ` · P${item.tire.posicion}` : ""}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              Fecha estimada de entrega
            </label>
            <input
              type="date"
              value={eta}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setEta(e.target.value)}
              className={inputCls}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              El cliente verá esta fecha en el estado del pedido.
            </p>
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{err}</p>}
        </div>
        <div className="px-5 py-3 bg-gray-50 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving || !eta}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectReencaucheModal({
  item, companyId, onClose, onDone,
}: {
  item: ReencaucheItem;
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivo,              setMotivo]              = useState("");
  const [causales,            setCausales]            = useState("");
  const [milimetros,          setMilimetros]          = useState<number | "">("");
  const [saving,              setSaving]              = useState(false);
  const [err,                 setErr]                 = useState<string | null>(null);

  async function submit() {
    if (!motivo.trim() || !causales.trim() || typeof milimetros !== "number") {
      setErr("Completa el motivo, la causa y los milímetros desechados.");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/purchase-orders/items/${item.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({
          distributorId: companyId,
          motivoRechazo: motivo.trim(),
          desechos: {
            causales:             causales.trim(),
            milimetrosDesechados: milimetros,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "No se pudo rechazar la llanta");
      }
      onDone();
    } catch (e: any) {
      setErr(e.message ?? "Error");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
          <h2 className="font-bold text-sm text-white">Rechazar para reencauche</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-700">
              Rechazar esta llanta la enviará a <strong>fin de vida</strong>. Esta acción es irreversible.
            </p>
          </div>

          <div className="rounded-lg p-2" style={{ background: "#f9fafb" }}>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Llanta</p>
            <p className="text-xs font-bold text-[#0A183A] mt-0.5">
              {item.marca}{item.modelo ? ` · ${item.modelo}` : ""} · {item.dimension} · vida {item.tire?.vidaActual ?? "—"}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Motivo del rechazo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder="Ej: casco comprometido, separación lateral..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Causa del desecho</label>
            <textarea
              value={causales}
              onChange={(e) => setCausales(e.target.value)}
              rows={2}
              placeholder="Detalle técnico para el snapshot de fin-de-vida"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Milímetros desechados</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={milimetros}
              onChange={(e) => setMilimetros(e.target.value === "" ? "" : Number(e.target.value))}
              className={inputCls}
            />
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{err}</p>}
        </div>
        <div className="px-5 py-3 bg-gray-50 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Rechazar y enviar a fin de vida
          </button>
        </div>
      </div>
    </div>
  );
}

// Return modal — dist inspects the tire, decides it's still usable but
// not retreadable for this job. Tire goes back to the fleet's Disponible
// bucket; no desechos form, no vida change. Just a short motivo so the
// fleet can see why.
function ReturnReencaucheModal({
  item, companyId, onClose, onDone,
}: {
  item: ReencaucheItem;
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  async function submit() {
    if (!motivo.trim()) {
      setErr("Dinos por qué no pudiste reencaucharla.");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/purchase-orders/items/${item.id}/return-to-disponible`, {
        method: "PATCH",
        body: JSON.stringify({
          distributorId: companyId,
          motivoRechazo: motivo.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "No se pudo devolver la llanta");
      }
      onDone();
    } catch (e: any) {
      setErr(e.message ?? "Error");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
          <h2 className="font-bold text-sm text-white">Devolver a Disponible</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-lg p-3" style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.18)" }}>
            <p className="text-[11px] font-bold text-[#1E76B6] uppercase tracking-wider">Llanta</p>
            <p className="text-sm font-bold text-[#0A183A] mt-0.5">
              {item.marca}{item.modelo ? ` · ${item.modelo}` : ""} · {item.dimension}
            </p>
            <p className="text-xs text-gray-500">
              {item._clientName} · {item.tire?.vehicle?.placa ?? item.vehiclePlaca ?? "—"}
              {item.tire?.posicion != null ? ` · P${item.tire.posicion}` : ""}
            </p>
          </div>

          <div className="rounded-lg p-2.5 flex items-start gap-2" style={{ background: "#f9fafb" }}>
            <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-600">
              La llanta volverá al inventario <strong>Disponible</strong> del cliente sin
              cambios en la vida. Usa esta opción cuando la llanta no sirva para
              reencauche pero <strong>todavía pueda usarse</strong> (p.ej. no cumple
              especificaciones del banco, cliente pidió otra banda…).
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: casco apto pero cliente pidió otra banda; casco bueno, fuera de especificación para nuestro proceso; …"
              className={inputCls}
            />
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{err}</p>}
        </div>
        <div className="px-5 py-3 bg-gray-50 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 rotate-180" />}
            Devolver a Disponible
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================

export default function PedidosDistPage() {
  const [section, setSection] = useState<"pedidos" | "marketplace" | "catalogo" | "perfil">("pedidos");

  const tabs: { key: typeof section; icon: React.ElementType; label: string }[] = [
    { key: "pedidos", icon: Package, label: "Pedidos" },
    { key: "marketplace", icon: Store, label: "Marketplace" },
    { key: "catalogo", icon: Package, label: "Catalogo" },
    { key: "perfil", icon: User, label: "Mi Perfil" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">Pedidos y Ventas</h1>
          <p className="text-xs text-[#348CCB] mt-0.5">Gestiona pedidos de clientes y ventas del marketplace</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setSection(t.key)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all whitespace-nowrap"
              style={{ background: section === t.key ? "#0A183A" : "transparent", color: section === t.key ? "#fff" : "#173D68", border: section === t.key ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)" }}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {section === "pedidos" && <PedidosSection />}
      {section === "marketplace" && (
        <React.Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-[#1E76B6]" /></div>}>
          <VentasDistPage />
        </React.Suspense>
      )}
      {section === "catalogo" && (
        <React.Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-[#1E76B6]" /></div>}>
          <CatalogoDistPage />
        </React.Suspense>
      )}
      {section === "perfil" && <DistributorProfileSection />}
    </div>
  );
}

function PedidosSection() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [tab, setTab] = useState<FilterTab>("nuevas");
  const [bidRequests, setBidRequests] = useState<any[]>([]);
  const [showBids, setShowBids] = useState(false);

  const fetchOrders = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      // Use /distributor (full history) instead of /available so the dist
      // can see quoted-but-not-adjudicated bids on En Proceso and won/
      // lost ones on Completadas. /available still drives the sidebar
      // bubble, which only counts fresh work.
      const [ordersRes, bidsRes] = await Promise.all([
        authFetch(`${API_BASE}/purchase-orders/distributor?companyId=${cId}`),
        authFetch(`${API_BASE}/marketplace/bid-requests/distributor?distributorId=${cId}`),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (bidsRes.ok) setBidRequests(await bidsRes.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    let user: { companyId?: string };
    try { user = JSON.parse(stored); } catch { router.push("/login"); return; }
    if (!user.companyId) return;
    setCompanyId(user.companyId);
    fetchOrders(user.companyId);
  }, [router, fetchOrders]);

  const filtered = useMemo(
    () => orders.filter((o) => matchFilter(o.status, tab)),
    [orders, tab],
  );

  // Classify each bid request against the three tabs the dist sees.
  // Source of truth is (bid.status, my response.status) — no server-side
  // grouping, since the same bid shifts tabs as the dist acts on it.
  function bidMatchesTab(bid: any, t: FilterTab): boolean {
    const my = (bid?.responses ?? [])[0];
    const myStatus = my?.status as string | undefined;
    const open = bid.status === "abierta";
    if (t === "nuevas") {
      return open && myStatus !== "cotizada" && myStatus !== "rechazada" && myStatus !== "ganadora";
    }
    if (t === "proceso") {
      return open && myStatus === "cotizada";
    }
    // completadas: anything terminal or where the dist has a terminal state
    return !open || myStatus === "ganadora" || myStatus === "rechazada";
  }

  const bidsByTab = useMemo(
    () => bidRequests.filter((b) => bidMatchesTab(b, tab)),
    [bidRequests, tab],
  );

  const counts = useMemo(() => ({
    nuevas:      orders.filter((o) => matchFilter(o.status, "nuevas")).length
               + bidRequests.filter((b) => bidMatchesTab(b, "nuevas")).length,
    proceso:     orders.filter((o) => matchFilter(o.status, "proceso")).length
               + bidRequests.filter((b) => bidMatchesTab(b, "proceso")).length,
    completadas: orders.filter((o) => matchFilter(o.status, "completadas")).length
               + bidRequests.filter((b) => bidMatchesTab(b, "completadas")).length,
  }), [orders, bidRequests]);

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "nuevas" as const, label: "Nuevas", count: counts.nuevas },
            { key: "proceso" as const, label: "En Proceso", count: counts.proceso },
            { key: "completadas" as const, label: "Completadas", count: counts.completadas },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all"
              style={{
                background: tab === t.key ? "#0A183A" : "transparent",
                color: tab === t.key ? "#fff" : "#173D68",
                border: tab === t.key ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)",
              }}
            >
              {t.label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: tab === t.key ? "rgba(255,255,255,0.2)" : "rgba(52,140,203,0.1)",
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Reencauche review — only makes sense alongside in-flight orders */}
        {tab === "proceso" && (
          <ReencaucheReviewSection
            orders={orders}
            companyId={companyId}
            onUpdated={() => fetchOrders(companyId)}
          />
        )}

        {/* Licitaciones — visible on every tab now, scoped to the bids
            that belong to that tab's state. Nuevas = open & unquoted;
            En Proceso = open & already quoted (waiting for adjudication);
            Completadas = won, lost, cancelled, or closed. */}
        {bidsByTab.length > 0 && (
          <div>
            <button onClick={() => setShowBids(!showBids)} className="w-full flex items-center gap-3 mb-3">
              <Gavel className="w-4 h-4 text-[#8b5cf6]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b5cf6]">
                {tab === "nuevas"     ? "Licitaciones abiertas"
                 : tab === "proceso"  ? "Licitaciones cotizadas"
                                      : "Licitaciones cerradas"}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">{bidsByTab.length}</span>
              <div className="flex-1 h-px bg-gray-200" />
              {showBids ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {showBids && (
              <div className="space-y-3 mb-6">
                {bidsByTab.map((bid: any) => (
                  <BidRequestCard key={bid.id} bid={bid} companyId={companyId} onUpdated={() => fetchOrders(companyId)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 && bidsByTab.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Package className="w-8 h-8 mb-2" />
            <p className="text-sm font-bold text-[#0A183A]">Sin pedidos en esta categoria</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                companyId={companyId}
                onUpdated={() => fetchOrders(companyId)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
