"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ChevronDown, ChevronUp, Send, Check, X,
  BarChart3, Calendar, Package, Gavel, Clock, DollarSign,
} from "lucide-react";
import CatalogAutocomplete from "../../../components/CatalogAutocomplete";

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

interface OrderItem {
  tireId?: string;
  marca: string;
  dimension: string;
  eje?: string;
  cantidad: number;
  tipo: "nueva" | "reencauche";
  vehiclePlaca?: string;
  urgency?: string;
  catalogSuggestion?: string | null;
  bandaRecomendada?: string | null;
}

interface CotizacionItem {
  itemIndex: number;
  precioUnitario: number;
  disponible: boolean;
  tiempoEntrega: string;
  notas: string;
  alternativeTire?: string;
}

interface PurchaseOrder {
  id: string;
  companyId: string;
  distributorId: string;
  status: string;
  items: OrderItem[];
  totalEstimado: number | null;
  totalCotizado: number | null;
  cotizacion: CotizacionItem[] | null;
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

  // Editable cotizacion state (one per item)
  const [cotItems, setCotItems] = useState<CotizacionItem[]>(() =>
    items.map((_, i) => ({
      itemIndex: i,
      precioUnitario: 0,
      disponible: true,
      tiempoEntrega: "Inmediato",
      notas: "",
    })),
  );

  function updateCotItem(idx: number, field: keyof CotizacionItem, value: any) {
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
      const res = await authFetch(`${API_BASE}/purchase-orders/${order.id}/cotizacion`, {
        method: "PATCH",
        body: JSON.stringify({
          distributorId: companyId,
          cotizacion: cotItems,
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
                            <p className="font-medium text-[#0A183A] text-sm">{item.catalogSuggestion || item.marca}</p>
                            {item.vehiclePlaca && <p className="text-[10px] text-gray-400">Veh: {item.vehiclePlaca}</p>}
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-[#7c3aed] text-sm">{item.bandaRecomendada || "Banda por definir"}</p>
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
                            {!cotItems[i]?.disponible ? (
                              <input
                                type="text"
                                value={cotItems[i]?.alternativeTire ?? ""}
                                onChange={(e) => updateCotItem(i, "alternativeTire", e.target.value)}
                                placeholder={item.tipo === "nueva" ? "Llanta alternativa..." : "Banda alternativa..."}
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

          {/* Already quoted — read-only summary */}
          {!canQuote && order.cotizacion && (
            <div className="rounded-xl p-4" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.1)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Cotizacion enviada</p>
              {(order.cotizacion as CotizacionItem[]).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{items[c.itemIndex]?.marca ?? `Item ${c.itemIndex + 1}`} - {items[c.itemIndex]?.dimension ?? ""}</span>
                  <div className="flex items-center gap-3">
                    <span className={c.disponible ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                      {c.disponible ? "Disponible" : "No disp."}
                    </span>
                    <span className="font-bold text-[#0A183A]">{fmtCOP(c.precioUnitario)}</span>
                    <span className="text-gray-400">{c.tiempoEntrega}</span>
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
  const items: any[] = Array.isArray(bid.items) ? bid.items : [];
  const myResponse = (bid.responses ?? [])[0]; // already filtered by distributorId in API
  const hasQuoted = myResponse?.status === "cotizada";
  const deadline = bid.deadline ? new Date(bid.deadline) : null;
  const hoursLeft = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60))) : null;

  const [cotItems, setCotItems] = useState<Array<{
    precioUnitario: number; disponible: boolean; tiempoEntrega: string; notas: string; alternativeMarca: string; alternativeModelo: string;
  }>>(
    items.map(() => ({ precioUnitario: 0, disponible: true, tiempoEntrega: "1-3 dias", notas: "", alternativeMarca: "", alternativeModelo: "" }))
  );
  const [globalNotas, setGlobalNotas] = useState("");
  const [incluyeIva, setIncluyeIva] = useState(false);

  const totalCotizado = cotItems.reduce((s, c) => s + (c.disponible ? c.precioUnitario : 0), 0) * (incluyeIva ? 1.19 : 1);

  async function handleSubmitBid() {
    setSubmitting(true);
    try {
      const cotizacion = cotItems.map((c, i) => ({
        itemIndex: i,
        precioUnitario: c.precioUnitario,
        disponible: c.disponible,
        tiempoEntrega: c.tiempoEntrega,
        notas: c.notas,
        alternativeTire: c.alternativeMarca && c.alternativeModelo
          ? `${c.alternativeMarca} ${c.alternativeModelo}` : undefined,
      }));
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

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${hasQuoted ? "rgba(34,197,94,0.2)" : "rgba(139,92,246,0.2)"}` }}>
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
        <Gavel className="w-4 h-4 text-[#8b5cf6] flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#0A183A]">{bid.company?.name ?? "Cliente"}</p>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
              background: hasQuoted ? "rgba(34,197,94,0.1)" : "rgba(139,92,246,0.1)",
              color: hasQuoted ? "#22c55e" : "#8b5cf6",
            }}>
              {hasQuoted ? "Cotizado" : "Pendiente"}
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
              return (
                <div key={idx} className="rounded-lg p-3" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(10,24,58,0.05)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-[#0A183A]">{item.marca} {item.dimension}</p>
                      <p className="text-[10px] text-gray-400">
                        {item.tipo === "reencauche" ? "Reencauche" : "Nueva"} · Eje: {item.eje ?? "—"}
                        {item.catalogSuggestion && <> · Sugerido: {item.catalogSuggestion}</>}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={cot.disponible}
                        onChange={(e) => setCotItems((p) => p.map((c, i) => i === idx ? { ...c, disponible: e.target.checked } : c))}
                        className="accent-[#22c55e]" />
                      <span className="text-[10px] font-bold text-gray-500">Disponible</span>
                    </label>
                  </div>

                  {cot.disponible ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Precio unitario</label>
                        <input type="number" value={cot.precioUnitario || ""} placeholder="COP"
                          onChange={(e) => setCotItems((p) => p.map((c, i) => i === idx ? { ...c, precioUnitario: Number(e.target.value) } : c))}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Tiempo entrega</label>
                        <select value={cot.tiempoEntrega}
                          onChange={(e) => setCotItems((p) => p.map((c, i) => i === idx ? { ...c, tiempoEntrega: e.target.value } : c))}
                          className={inputCls}>
                          <option value="Inmediato">Inmediato</option>
                          <option value="1-3 dias">1-3 dias</option>
                          <option value="1 semana">1 semana</option>
                          <option value="2 semanas">2 semanas</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400">Sugerir alternativa:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <CatalogAutocomplete
                          value={cot.alternativeMarca}
                          onChange={(v) => setCotItems((p) => p.map((c, i) => i === idx ? { ...c, alternativeMarca: v } : c))}
                          field="marca"
                          placeholder="Marca alternativa"
                        />
                        <CatalogAutocomplete
                          value={cot.alternativeModelo}
                          onChange={(v) => setCotItems((p) => p.map((c, i) => i === idx ? { ...c, alternativeModelo: v } : c))}
                          field="modelo"
                          filterMarca={cot.alternativeMarca}
                          placeholder="Modelo"
                        />
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
            placeholder="Notas generales de la cotizacion..." rows={2}
            className={`${inputCls} resize-none`} />

          <button onClick={handleSubmitBid} disabled={submitting || totalCotizado <= 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {hasQuoted ? "Actualizar Cotizacion" : "Enviar Cotizacion"}
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function PedidosDistPage() {
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
      const [ordersRes, bidsRes] = await Promise.all([
        authFetch(`${API_BASE}/purchase-orders/distributor?companyId=${cId}`),
        authFetch(`${API_BASE}/marketplace/bid-requests/available?distributorId=${cId}`),
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

  const counts = useMemo(() => ({
    nuevas: orders.filter((o) => matchFilter(o.status, "nuevas")).length,
    proceso: orders.filter((o) => matchFilter(o.status, "proceso")).length,
    completadas: orders.filter((o) => matchFilter(o.status, "completadas")).length,
  }), [orders]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
            Pedidos de Clientes
          </h1>
          <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} total{orders.length !== 1 ? "es" : ""}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
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

        {/* Licitaciones activas */}
        {bidRequests.length > 0 && (
          <div>
            <button onClick={() => setShowBids(!showBids)} className="w-full flex items-center gap-3 mb-3">
              <Gavel className="w-4 h-4 text-[#8b5cf6]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b5cf6]">Licitaciones Abiertas</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">{bidRequests.length}</span>
              <div className="flex-1 h-px bg-gray-200" />
              {showBids ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {showBids && (
              <div className="space-y-3 mb-6">
                {bidRequests.map((bid: any) => (
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
        ) : filtered.length === 0 && bidRequests.length === 0 ? (
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
