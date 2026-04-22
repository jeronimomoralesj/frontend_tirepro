"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// Purchase recommendations and order management
// is rendered inside this tab so it can read the live recommendations.
import {
  Loader2, Check, X, Send, Package, ChevronDown,
  ChevronRight, AlertTriangle, Truck, RotateCcw,
  Printer, Archive, CheckSquare, Square, Pencil,
} from "lucide-react";

// ===============================================================================
// API
// ===============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) },
  });
}

// ===============================================================================
// Types
// ===============================================================================

interface AgentSettings { agentEnabled: boolean; purchaseMode: "agent_auto" | "manual"; monthlyBudgetCap?: number; }

interface PurchaseOrder {
  id: string; status: string; items: any[]; totalEstimado: number | null;
  totalCotizado: number | null; cotizacionNotas: string | null; notas: string | null;
  // cotizacion is always undefined now (per-item quote data moved to items[]) —
  // kept on the type so legacy code paths still compile. Phase 5 rewrites those
  // call sites to read from items[] directly.
  cotizacion?: any[] | null;
  createdAt: string; distributor?: { id: string; name: string }; company?: { id: string; name: string };
}

interface Distributor { id: string; distributor: { id: string; name: string } }
interface Bucket { id: string; nombre: string; color: string | null }

interface RawInsp {
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  fecha: string; cpkProyectado: number | null; presionDelta?: number | null;
}

interface RawTire {
  id: string; placa: string; marca: string; diseno: string; dimension: string;
  eje: string; posicion: number; profundidadInicial: number;
  vehicleId: string | null; currentCpk: number | null;
  currentProfundidad: number | null; alertLevel: string;
  vidaActual: string | null;
  inspecciones: RawInsp[];
  costos: { valor: number; fecha: string }[];
  vehicle?: { placa: string; tipovhc?: string; tipoOperacion?: string | null } | null;
}

interface CatalogMatch {
  marca: string; modelo: string; dimension: string;
  psiRecomendado: number | null; kmEstimadosReales: number | null;
  precioCop: number | null; cpkEstimado: number | null;
  terreno: string | null; reencauchable: boolean;
  vidasReencauche: number; skuRef: string;
}

interface Recommendation {
  tire: RawTire;
  type: "reencauche" | "nueva";
  urgency: "critical" | "immediate" | "next_month" | "plan";
  minDepth: number;
  reason: string;
  estimatedPrice: number;
  vehiclePlaca: string;
  catalogMatch?: CatalogMatch | null;
  bandaRecomendada?: string; // for reencauche: recommended band name
}

// ===============================================================================
// Analysis engine
// ===============================================================================

const VIDA_MAP: Record<string, number> = { nueva: 0, reencauche1: 1, reencauche2: 2, reencauche3: 3, fin: 99 };
const MAX_REENC: Record<string, number> = { premium: 3, mid: 2, economic: 1 };
const PREMIUM = new Set(["michelin", "bridgestone", "continental", "goodyear", "pirelli", "firestone", "bf goodrich"]);
const MID = new Set(["hankook", "yokohama", "falken", "general tire"]);

const OPTIMAL_RETIREMENT_MM = 3;
const ALIGNMENT_WARN_MM = 1.5;

function getTier(m: string) { const k = m.toLowerCase().trim(); return PREMIUM.has(k) ? "premium" : MID.has(k) ? "mid" : "economic"; }

// Map from position code to banda recommendation
const BANDA_REC: Record<string, string> = {
  direccion: "Banda direccional",
  traccion: "Banda tracción",
  libre: "Banda toda posición",
  remolque: "Banda libre/remolque",
};

// ===============================================================================
// Recommendation override — lets the analista change marca/modelo/dimension/
// cantidad on a specific recommendation before it becomes a purchase-order
// item. Stored in-memory only; committed on submit.
// ===============================================================================

type ItemOverride = {
  marca?:     string;
  modelo?:    string;   // tread design for nueva; banda recomendada for reencauche
  dimension?: string;
  cantidad?:  number;
};

// Stable reference key used to group recommendations "of the same tire" — the
// bulk-edit flow ("all Continental HDR 295 → X") applies one override to every
// row sharing this key. Case- and whitespace-insensitive so minor catalog
// variation doesn't split an otherwise-identical reference.
function refKey(marca: string, modelo: string, dimension: string): string {
  return `${marca}|${modelo}|${dimension}`.trim().toLowerCase().replace(/\s+/g, ' ');
}

// The tire specs that will actually be sent to the distributor for a given
// recommendation, folding any override on top of the recommendation's own
// baseline (catalog match → recommended banda → raw tire).
function effectiveSpec(r: Recommendation, ov?: ItemOverride) {
  const baseMarca     = r.type === "nueva"
    ? (r.catalogMatch?.marca ?? r.tire.marca)
    : r.tire.marca;
  const baseModelo    = r.type === "nueva"
    ? (r.catalogMatch?.modelo ?? r.tire.diseno)
    : (r.bandaRecomendada ?? r.tire.diseno);
  const baseDimension = r.catalogMatch?.dimension ?? r.tire.dimension;

  return {
    marca:     ov?.marca     ?? baseMarca,
    modelo:    ov?.modelo    ?? baseModelo,
    dimension: ov?.dimension ?? baseDimension,
    cantidad:  ov?.cantidad  ?? 1,
  };
}

function analyzeFleet(tires: RawTire[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const t of tires) {
    if (t.vidaActual === "fin" || !t.inspecciones?.length) continue;
    const last = t.inspecciones[0];
    const minD = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
    if (minD > 9) continue;

    const reencCount = VIDA_MAP[t.vidaActual ?? "nueva"] ?? 0;
    const maxR = MAX_REENC[getTier(t.marca)] ?? 1;
    const needsNew = reencCount >= maxR;

    const displayAlert = (t as any).projectedAlertLevel ?? t.alertLevel ?? "ok";
    let urgency: Recommendation["urgency"] = "plan";
    if (minD <= 2 || displayAlert === "critical") urgency = "critical";
    else if (minD <= OPTIMAL_RETIREMENT_MM) urgency = "immediate";
    else if (minD <= 6) urgency = "next_month";

    const type = needsNew ? "nueva" : "reencauche";

    const shoulderDelta = Math.abs(last.profundidadInt - last.profundidadExt);
    let reason: string;
    if (minD <= 2) reason = `Limite legal: ${minD.toFixed(1)}mm — casco en riesgo`;
    else if (minD <= OPTIMAL_RETIREMENT_MM) reason = `Retiro optimo: ${minD.toFixed(1)}mm — preservar casco`;
    else if (shoulderDelta >= ALIGNMENT_WARN_MM) reason = `Desalineacion: Δ${shoulderDelta.toFixed(1)}mm hombros (${minD.toFixed(1)}mm)`;
    else if (minD <= 6) reason = `Profundidad baja: ${minD.toFixed(1)}mm`;
    else reason = `Planificar: ${minD.toFixed(1)}mm`;

    const price = type === "reencauche" ? 650000 :
      (t.costos?.length ? t.costos[t.costos.length - 1].valor * 1.05 : 1900000);

    recs.push({
      tire: t, type, urgency, minDepth: minD, reason,
      estimatedPrice: Math.round(price),
      vehiclePlaca: t.vehicle?.placa ?? "Sin vehiculo",
      bandaRecomendada: type === "reencauche" ? (BANDA_REC[t.eje] ?? "Banda compatible con el eje") : undefined,
    });
  }
  recs.sort((a, b) => a.minDepth - b.minDepth);
  return recs;
}

// ===============================================================================
// Formatters
// ===============================================================================

const fmtCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

const URGENCY_META: Record<string, { label: string; color: string; bg: string }> = {
  critical:   { label: "Critico",     color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  immediate:  { label: "Inmediato",   color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  next_month: { label: "Proximo mes", color: "#eab308", bg: "rgba(234,179,8,0.08)" },
  plan:       { label: "Planificar",  color: "#348CCB", bg: "rgba(52,140,203,0.08)" },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  solicitud_enviada:   { label: "Enviada",     color: "#1E76B6", bg: "rgba(30,118,182,0.08)" },
  cotizacion_recibida: { label: "Cotizacion",  color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  aceptada:            { label: "Aceptada",    color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  rechazada:           { label: "Rechazada",   color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  completada:          { label: "Completada",  color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

const inputCls = "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20";

// ===============================================================================
// Print helper
// ===============================================================================

function printProposal(recs: Recommendation[], tab: string) {
  // Get company info from localStorage (populated by fetchAll)
  let companyName = "Mi Empresa";
  let companyLogo = "";
  try {
    companyName = localStorage.getItem("companyName") || "Mi Empresa";
    companyLogo = localStorage.getItem("companyLogo") || "";
  } catch { /* */ }

  const td = "padding:10px 12px;border-bottom:1px solid #e5e7eb";
  const rows = recs.map((r, i) => {
    const terreno = r.tire.vehicle?.tipoOperacion
      ? (() => { const p = r.tire.vehicle!.tipoOperacion!.split("-"); return `${p[0]}% pav / ${p[1] ?? (100 - Number(p[0]))}% dest`; })()
      : "—";
    const rec = r.type === "reencauche"
      ? (r.bandaRecomendada ?? "Reencauche")
      : (r.catalogMatch ? `${r.catalogMatch.marca} ${r.catalogMatch.modelo}` : "Llanta nueva");
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `<tr style="background:${bg}">
      <td style="${td}">${r.vehiclePlaca}</td>
      <td style="${td}">P${r.tire.posicion}</td>
      <td style="${td}">${r.tire.eje}</td>
      <td style="${td}">${r.tire.marca} ${r.tire.diseno}</td>
      <td style="${td}">${r.tire.dimension}</td>
      <td style="${td}">${terreno}</td>
      <td style="${td};font-weight:600">${rec}</td>
      <td style="${td};text-align:right;font-weight:700">${fmtCOP(r.catalogMatch?.precioCop ?? r.estimatedPrice)}</td>
    </tr>`;
  }).join("");

  const total = recs.reduce((s, r) => s + (r.catalogMatch?.precioCop ?? r.estimatedPrice), 0);
  const date = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const title = tab === "reencauche" ? "Propuesta de Reencauche" : "Propuesta de Llantas Nuevas";

  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" style="height:48px;object-fit:contain;border-radius:8px" />`
    : `<div style="width:48px;height:48px;background:#0A183A;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:18px">${companyName.charAt(0)}</div>`;

  const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; color: #0A183A; }
    </style>
  </head><body>
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #0A183A, #173D68);padding:28px 36px;display:flex;align-items:center;gap:20px">
      ${logoHtml}
      <div style="flex:1">
        <h1 style="margin:0;color:white;font-size:20px;font-weight:800;letter-spacing:0.5px">${companyName}</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:12px">${title}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px">${date}</p>
        <p style="margin:4px 0 0;color:white;font-size:14px;font-weight:700">${recs.length} llanta${recs.length !== 1 ? "s" : ""}</p>
      </div>
    </div>

    <!-- Summary bar -->
    <div style="background:#f0f7ff;padding:14px 36px;display:flex;gap:32px;border-bottom:2px solid #1E76B6">
      <div><span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Total Estimado</span><br/><strong style="font-size:18px;color:#0A183A">${fmtCOP(total)}</strong></div>
      <div><span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Tipo</span><br/><strong style="font-size:14px;color:#1E76B6">${tab === "reencauche" ? "Reencauche" : "Llantas Nuevas"}</strong></div>
      <div><span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Vehiculos</span><br/><strong style="font-size:14px;color:#0A183A">${new Set(recs.map(r => r.vehiclePlaca)).size}</strong></div>
    </div>

    <!-- Table -->
    <div style="padding:20px 36px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#0A183A;color:white">
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:0.5px">VEHICULO</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:0.5px">POS</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:0.5px">EJE</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:0.5px">LLANTA ACTUAL</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:0.5px">DIMENSION</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:0.5px">TERRENO</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:0.5px">RECOMENDACION</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;font-size:11px;letter-spacing:0.5px">PRECIO EST.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#0A183A;color:white">
            <td colspan="7" style="padding:12px;font-weight:700;font-size:13px;letter-spacing:0.5px">TOTAL ESTIMADO</td>
            <td style="padding:12px;text-align:right;font-weight:800;font-size:15px">${fmtCOP(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 36px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
      <p style="margin:0;color:#94a3b8;font-size:10px">Generado por TirePro — tirepro.com.co</p>
      <p style="margin:0;color:#94a3b8;font-size:10px">${date}</p>
    </div>
  </body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
}

// ===============================================================================
// Agent auto mode view
// ===============================================================================

function AgentView({ orders, budget, tires }: { orders: PurchaseOrder[]; budget: number; tires: RawTire[] }) {
  const thisMonth = orders.filter((o) => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const spent = useMemo(() => {
    let total = 0;
    tires.filter((t) => (t.vidaActual ?? "nueva") !== "fin").forEach((t) => (t.costos ?? []).forEach((c) => { const d = new Date(c.fecha); if (d.getMonth() === curMonth && d.getFullYear() === curYear) total += c.valor; }));
    return total;
  }, [tires, curMonth, curYear]);
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#173D68] text-white p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div>
              <h2 className="text-lg font-bold">Pedidos del mes</h2>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Ordenes generadas y enviadas a tus distribuidores</p>
            </div>
          </div>
          <p className="text-sm text-white/60 mt-1">Ha procesado {thisMonth.length} solicitudes este mes</p>
        </div>
        {budget > 0 && (
          <div className="p-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400">Gastado: {fmtCOP(spent)}</span>
              <span className="font-bold text-[#0A183A]">Presupuesto: {fmtCOP(budget)}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? "#ef4444" : "linear-gradient(90deg, #1E76B6, #348CCB)" }} />
            </div>
          </div>
        )}
      </div>
      {orders.length > 0 && (
        <div className="space-y-2">
          {orders.map((o) => {
            const st = STATUS_LABELS[o.status] ?? STATUS_LABELS.solicitud_enviada;
            return (
              <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0A183A]">{o.distributor?.name ?? "Distribuidor"}</p>
                  <p className="text-xs text-gray-400">{fmtDate(o.createdAt)} - {o.items?.length ?? 0} llantas</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                <span className="text-sm font-black text-[#0A183A]">{fmtCOP(o.totalCotizado ?? o.totalEstimado ?? 0)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===============================================================================
// Manual mode view
// ===============================================================================

function ManualView({
  recs, orders, distributors, allDistributors, buckets, companyId, onRefresh, budget, tires,
}: {
  recs: Recommendation[];
  orders: PurchaseOrder[];
  distributors: Distributor[];
  allDistributors: { id: string; name: string }[];
  buckets: Bucket[];
  companyId: string;
  onRefresh: () => void;
  budget: number;
  tires: RawTire[];
}) {
  const [tab, setTab] = useState<"reencauche" | "nueva">("reencauche");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionModal, setActionModal] = useState<"send" | "bucket" | "acceptConfirm" | "sendReencauche" | null>(null);
  // Per-tire spec overrides. Empty by default — the analista can edit one row
  // (editingTireId) or bulk-edit every selected row sharing a reference
  // (bulkEditKey). Cleared whenever the tab changes so a reencauche override
  // doesn't silently apply to a nueva-tab rec with the same tireId.
  const [overrides,      setOverrides]      = useState<Record<string, ItemOverride>>({});
  const [editingTireId,  setEditingTireId]  = useState<string | null>(null);
  const [bulkEditKey,    setBulkEditKey]    = useState<string | null>(null);
  const [sendDistId, setSendDistId] = useState("");
  const [sendDistIds, setSendDistIds] = useState<Set<string>>(new Set());
  const [bidDeadlineHours, setBidDeadlineHours] = useState(48);
  const [bidRequests, setBidRequests] = useState<any[]>([]);
  const [sendNotes, setSendNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderToAccept, setOrderToAccept] = useState<PurchaseOrder | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [bucketId, setBucketId] = useState("");
  const [sending, setSending] = useState(false);
  const [showSolicitudes, setShowSolicitudes] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);

  const byType = useMemo(() => recs.filter((r) => r.type === tab), [recs, tab]);
  const filtered = useMemo(() => {
    if (urgencyFilter === "all") return byType;
    if (urgencyFilter === "urgent") return byType.filter((r) => r.urgency === "critical" || r.urgency === "immediate");
    return byType.filter((r) => r.urgency === urgencyFilter);
  }, [byType, urgencyFilter]);

  // Urgency counts for filter pills
  const urgencyCounts = useMemo(() => {
    const c = { critical: 0, immediate: 0, next_month: 0, plan: 0 };
    byType.forEach((r) => { c[r.urgency]++; });
    return c;
  }, [byType]);

  const groups = useMemo(() => {
    const map = new Map<string, Recommendation[]>();
    filtered.forEach((r) => { const k = r.vehiclePlaca; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); });
    return Array.from(map.entries());
  }, [filtered]);

  const selectedRecs = useMemo(() => recs.filter((r) => selected.has(r.tire.id)), [recs, selected]);
  const totalEstimated = selectedRecs.reduce((s, r) => s + (r.catalogMatch?.precioCop ?? r.estimatedPrice), 0);

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  // Select all / deselect all for current tab
  function toggleSelectAll() {
    const allIds = filtered.map((r) => r.tire.id);
    const allSelected = allIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); allIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); allIds.forEach((id) => n.add(id)); return n; });
    }
  }

  const allTabSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.tire.id));

  const cotizaciones = orders.filter((o) => o.status === "cotizacion_recibida");

  // Merge distributors: connected ones first, then all others
  const connectedIds = new Set(distributors.map((d) => d.distributor.id));
  const sortedDistributors = useMemo(() => {
    const connected = distributors.map((d) => ({ id: d.distributor.id, name: d.distributor.name, isConnected: true }));
    const others = allDistributors.filter((d) => !connectedIds.has(d.id)).map((d) => ({ id: d.id, name: d.name, isConnected: false }));
    return [...connected, ...others];
  }, [distributors, allDistributors, connectedIds]);

  // Fetch bid requests on mount
  useEffect(() => { fetchBidRequests(); }, [companyId]);

  // Build items from selected recommendations, applying any override the
  // analista set via the per-item or bulk edit UI.
  function buildItems() {
    return selectedRecs.map((r) => {
      const spec = effectiveSpec(r, overrides[r.tire.id]);
      return {
        tireId: r.tire.id,
        tipo: r.type,
        marca: spec.marca,
        modelo: spec.modelo,
        dimension: spec.dimension,
        eje: r.tire.eje,
        cantidad: spec.cantidad,
        vehiclePlaca: r.vehiclePlaca,
        urgency: r.urgency,
      };
    });
  }

  // Stats for the selected-items summary strip — rolls up by effective
  // (marca + modelo + dimension) so the analista can see at a glance
  // "I'm about to order 20 Continental HDR and 30 Michelin XDE2".
  const selectedStats = useMemo(() => {
    const byBrand      = new Map<string, number>();
    const byReference  = new Map<string, { marca: string; modelo: string; dimension: string; count: number }>();
    for (const r of selectedRecs) {
      const spec = effectiveSpec(r, overrides[r.tire.id]);
      byBrand.set(spec.marca, (byBrand.get(spec.marca) ?? 0) + spec.cantidad);
      const key = refKey(spec.marca, spec.modelo, spec.dimension);
      const prev = byReference.get(key);
      byReference.set(key, {
        marca:     spec.marca,
        modelo:    spec.modelo,
        dimension: spec.dimension,
        count:     (prev?.count ?? 0) + spec.cantidad,
      });
    }
    const overridden = Object.keys(overrides).filter((k) => selected.has(k)).length;
    return {
      byBrand:     [...byBrand.entries()].sort((a, b) => b[1] - a[1]),
      byReference: [...byReference.values()].sort((a, b) => b.count - a.count),
      overridden,
    };
  }, [selectedRecs, overrides, selected]);

  // Group selected recs by reference for the bulk-edit picker. Only groups
  // with >1 row are worth offering a "change all of these" action.
  const selectedRefGroups = useMemo(() => {
    const m = new Map<string, { marca: string; modelo: string; dimension: string; tireIds: string[] }>();
    for (const r of selectedRecs) {
      const spec = effectiveSpec(r, overrides[r.tire.id]);
      const key = refKey(spec.marca, spec.modelo, spec.dimension);
      const prev = m.get(key);
      if (prev) prev.tireIds.push(r.tire.id);
      else m.set(key, { marca: spec.marca, modelo: spec.modelo, dimension: spec.dimension, tireIds: [r.tire.id] });
    }
    return [...m.entries()].map(([key, g]) => ({ key, ...g }));
  }, [selectedRecs, overrides]);

  function applyPerItemEdit(tireId: string, next: ItemOverride) {
    setOverrides((prev) => {
      const n = { ...prev };
      // Drop the override if every field is blank — keeps state lean and
      // makes "revert to recommendation" a single click on the modal.
      if (!next.marca && !next.modelo && !next.dimension && !next.cantidad) {
        delete n[tireId];
      } else {
        n[tireId] = next;
      }
      return n;
    });
  }

  function applyBulkEdit(tireIds: string[], next: ItemOverride) {
    setOverrides((prev) => {
      const n = { ...prev };
      for (const id of tireIds) {
        const merged: ItemOverride = { ...prev[id], ...next };
        if (!merged.marca && !merged.modelo && !merged.dimension && !merged.cantidad) {
          delete n[id];
        } else {
          n[id] = merged;
        }
      }
      return n;
    });
  }

  // Send as bid request to multiple distributors
  async function handleSendBid() {
    if (sendDistIds.size === 0 || selected.size === 0) return;
    setSending(true);
    try {
      const items = buildItems();
      const deadline = new Date(Date.now() + bidDeadlineHours * 60 * 60 * 1000).toISOString();
      const fullNotes = [sendNotes, deliveryAddress ? `[Entrega] ${deliveryAddress}` : ""].filter(Boolean).join("\n") || null;
      const res = await authFetch(`${API_BASE}/marketplace/bid-requests`, {
        method: "POST",
        body: JSON.stringify({
          companyId,
          items,
          totalEstimado: totalEstimated,
          notas: fullNotes,
          deliveryAddress: deliveryAddress || null,
          deadline,
          distributorIds: [...sendDistIds],
        }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set()); setActionModal(null); setSendNotes(""); setDeliveryAddress("");
      setSendDistIds(new Set());
      fetchBidRequests();
      onRefresh();
    } catch { /* */ }
    setSending(false);
  }

  // Legacy single-distributor send (backward compat)
  async function handleSend() {
    if (!sendDistId || selected.size === 0) return;
    setSending(true);
    try {
      const items = buildItems();
      const fullNotes = [sendNotes, deliveryAddress ? `[Entrega] ${deliveryAddress}` : ""].filter(Boolean).join("\n") || null;
      const res = await authFetch(`${API_BASE}/purchase-orders`, {
        method: "POST",
        body: JSON.stringify({ companyId, distributorId: sendDistId, items, totalEstimado: totalEstimated, notas: fullNotes }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set()); setActionModal(null); setSendNotes(""); setDeliveryAddress(""); onRefresh();
    } catch { /* */ }
    setSending(false);
  }

  // Fetch active bid requests
  async function fetchBidRequests() {
    if (!companyId) return;
    try {
      const res = await authFetch(`${API_BASE}/marketplace/bid-requests/company?companyId=${companyId}`);
      if (res.ok) setBidRequests(await res.json());
    } catch { /* */ }
  }

  // Award a bid
  // Key format: `${bidRequestId}:${distributorId}` — one spinner per
  // candidate so rapid double-clicks on the same row get deduplicated.
  const [awarding, setAwarding] = useState<string | null>(null);

  // Which ofertas the user has expanded to see tire-by-tire prices.
  // Defaults to empty — cards render as compact summaries until opened.
  const [expandedOfertas, setExpandedOfertas] = useState<Set<string>>(new Set());
  function toggleOferta(id: string) {
    setExpandedOfertas(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleAwardBid(bidRequestId: string, distributorId: string) {
    const key = `${bidRequestId}:${distributorId}`;
    if (awarding === key) return;                  // ignore double-click
    setAwarding(key);
    try {
      const res = await authFetch(`${API_BASE}/marketplace/bid-requests/${bidRequestId}/award`, {
        method: "PATCH",
        body: JSON.stringify({ distributorId, companyId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        // The backend throws BadRequest when the bid is already adjudicada
        // or the dist never submitted a quote — surface that instead of
        // failing silently so the user understands why the button didn't
        // do anything.
        window.alert(body?.message ?? `No se pudo adjudicar (${res.status})`);
        return;
      }
      await fetchBidRequests();
    } finally {
      setAwarding(null);
    }
  }

  async function handleBulkMoveToBucket() {
    if (!bucketId || selected.size === 0) return;
    setSending(true);
    try {
      const res = await authFetch(`${API_BASE}/inventory-buckets/bulk-move`, {
        method: "POST",
        body: JSON.stringify({ tireIds: [...selected], bucketId, companyId }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set()); setActionModal(null); onRefresh();
    } catch { /* */ }
    setSending(false);
  }

  function handleAcceptOrder(orderId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    setOrderToAccept(order);
    setActionModal("acceptConfirm");
  }

  // Accept the order on the server. If it contains reencauche items we then
  // open the bucket-send confirmation so the fleet can physically hand over
  // the tires before the distributor starts the approval review. Per-tire
  // vida changes no longer happen here — they run later in the lifecycle
  // (dist entregar step) so the state matches physical reality.
  async function executeAcceptOrder() {
    if (!orderToAccept) return;
    setAccepting(true);
    try {
      const res = await authFetch(`${API_BASE}/purchase-orders/${orderToAccept.id}/accept`, {
        method: "PATCH",
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) throw new Error("No se pudo aceptar la orden");

      // If there's any reencauche item with a tire attached, prompt the user
      // to send those tires to the reencauche bucket now. Otherwise we're done.
      const reencaucheItems = (orderToAccept.items as any[])
        .filter((it) => it?.tipo === "reencauche" && it?.tireId);

      if (reencaucheItems.length > 0) {
        setActionModal("sendReencauche");
      } else {
        setOrderToAccept(null);
        setActionModal(null);
        onRefresh();
      }
    } catch (e: any) {
      alert(`Error al procesar: ${e.message ?? "Error desconocido"}`);
    }
    setAccepting(false);
  }

  // Fleet confirms the reencauche tires are ready to leave the vehicles. The
  // backend moves the tires into the Reencauche bucket and flips each item
  // to `en_reencauche_bucket`. The vehicles will show "empty" positions
  // until the retread comes back.
  async function executeSendToReencauche() {
    if (!orderToAccept) return;
    setAccepting(true);
    try {
      const res = await authFetch(`${API_BASE}/purchase-orders/${orderToAccept.id}/reencauche/send`, {
        method: "POST",
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) throw new Error("No se pudieron mover las llantas al bucket");
      setOrderToAccept(null);
      setActionModal(null);
      onRefresh();
    } catch (e: any) {
      alert(`Error: ${e.message ?? "Error desconocido"}`);
    }
    setAccepting(false);
  }

  async function handleRejectOrder(orderId: string) {
    await authFetch(`${API_BASE}/purchase-orders/${orderId}/reject`, { method: "PATCH", body: JSON.stringify({ companyId }) });
    onRefresh();
  }

  async function handleRevisionRequest(orderId: string, notas: string) {
    await authFetch(`${API_BASE}/purchase-orders/${orderId}/revision`, { method: "PATCH", body: JSON.stringify({ companyId, notas }) });
    onRefresh();
  }

  const monthSpent = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    let total = 0;
    tires.filter((t) => (t.vidaActual ?? "nueva") !== "fin").forEach((t) => (t.costos ?? []).forEach((c) => { const d = new Date(c.fecha); if (d.getMonth() === curMonth && d.getFullYear() === curYear) total += c.valor; }));
    return total;
  }, [tires]);
  const budgetPct = budget > 0 ? Math.min((monthSpent / budget) * 100, 100) : 0;

  return (
    <div className="space-y-5">
      {/* Recommendations header + budget */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
        <div className="bg-[#173D68] text-white p-4 rounded-t-xl flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">Recomendaciones de compra</p>
            <p className="text-[10px] text-white/50">{recs.length} llantas analizadas · {orders.length} ordenes este mes</p>
          </div>
        </div>
        {budget > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400">Gastado este mes: {fmtCOP(monthSpent)}</span>
              <span className="font-bold text-[#0A183A]">Presupuesto: {fmtCOP(budget)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${budgetPct}%`, background: budgetPct > 80 ? "#ef4444" : "linear-gradient(90deg, #22c55e, #348CCB)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-2">
        {(["reencauche", "nueva"] as const).map((t) => {
          const count = recs.filter((r) => r.type === t).length;
          return (
            <button key={t} onClick={() => { setTab(t); setSelected(new Set()); setUrgencyFilter("all"); setOverrides({}); }}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all"
              style={{ background: tab === t ? "#0A183A" : "transparent", color: tab === t ? "#fff" : "#173D68", border: tab === t ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)" }}
            >
              {t === "reencauche" ? <RotateCcw className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
              {t === "reencauche" ? "Reencauche" : "Llanta Nueva"}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: tab === t ? "rgba(255,255,255,0.2)" : "rgba(52,140,203,0.1)" }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Urgency filter + Select All */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setUrgencyFilter("all")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: urgencyFilter === "all" ? "rgba(10,24,58,0.08)" : "transparent", color: "#0A183A", border: "1px solid rgba(0,0,0,0.08)" }}>
          Todos ({byType.length})
        </button>
        <button onClick={() => setUrgencyFilter("urgent")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: urgencyFilter === "urgent" ? "rgba(239,68,68,0.1)" : "transparent", color: urgencyFilter === "urgent" ? "#ef4444" : "#64748b", border: `1px solid ${urgencyFilter === "urgent" ? "rgba(239,68,68,0.3)" : "rgba(0,0,0,0.08)"}` }}>
          Urgentes ({urgencyCounts.critical + urgencyCounts.immediate})
        </button>
        <button onClick={() => setUrgencyFilter("next_month")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: urgencyFilter === "next_month" ? "rgba(234,179,8,0.1)" : "transparent", color: urgencyFilter === "next_month" ? "#eab308" : "#64748b", border: `1px solid ${urgencyFilter === "next_month" ? "rgba(234,179,8,0.3)" : "rgba(0,0,0,0.08)"}` }}>
          Proximo mes ({urgencyCounts.next_month})
        </button>
        <button onClick={() => setUrgencyFilter("plan")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: urgencyFilter === "plan" ? "rgba(52,140,203,0.1)" : "transparent", color: urgencyFilter === "plan" ? "#348CCB" : "#64748b", border: `1px solid ${urgencyFilter === "plan" ? "rgba(52,140,203,0.3)" : "rgba(0,0,0,0.08)"}` }}>
          Planificar ({urgencyCounts.plan})
        </button>
        {filtered.length > 0 && (
          <button onClick={toggleSelectAll}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
            style={{ color: allTabSelected ? "#1E76B6" : "#64748b", background: allTabSelected ? "rgba(30,118,182,0.08)" : "transparent", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            {allTabSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {allTabSelected ? "Quitar" : "Selec. todo"}
          </button>
        )}
      </div>

      {/* Summary strip — live totals by brand / reference for the current
          selection. Gives the analista a glance at what the order will look
          like (e.g. "20 Continental · 30 Michelin") before it's sent. */}
      {selectedRecs.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-3.5 h-3.5 text-[#1E76B6]" />
            <p className="text-[11px] font-black uppercase tracking-wider text-[#0A183A]">
              Resumen del pedido
            </p>
            <span className="text-[10px] text-gray-400">
              {selectedRecs.length} llanta{selectedRecs.length !== 1 ? "s" : ""}
              {selectedStats.overridden > 0 && <> · {selectedStats.overridden} editada{selectedStats.overridden !== 1 ? "s" : ""}</>}
            </span>
            {selectedRefGroups.some((g) => g.tireIds.length > 1) && (
              <button
                onClick={() => {
                  // Open bulk-edit on the largest multi-row group by default.
                  const multi = selectedRefGroups.filter((g) => g.tireIds.length > 1)
                                                 .sort((a, b) => b.tireIds.length - a.tireIds.length);
                  if (multi[0]) setBulkEditKey(multi[0].key);
                }}
                className="ml-auto flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0A183A] text-white hover:bg-[#173D68] transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Editar referencia en grupo
              </button>
            )}
          </div>

          {/* Brand pills */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedStats.byBrand.map(([brand, n]) => (
              <span
                key={brand}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
              >
                {n} {brand}
              </span>
            ))}
          </div>

          {/* Reference breakdown — shows multi-row groups so bulk-edit
              candidates are obvious. */}
          {selectedStats.byReference.length > 0 && (
            <div className="divide-y divide-gray-50 border-t border-gray-50 pt-1">
              {selectedStats.byReference.slice(0, 6).map((ref) => {
                const group = selectedRefGroups.find(
                  (g) => g.marca === ref.marca && g.modelo === ref.modelo && g.dimension === ref.dimension,
                );
                return (
                  <div
                    key={`${ref.marca}-${ref.modelo}-${ref.dimension}`}
                    className="flex items-center gap-2 py-1.5 text-[11px]"
                  >
                    <span className="font-mono text-gray-400 w-6 text-right">{ref.count}×</span>
                    <span className="font-semibold text-[#0A183A] truncate flex-1">
                      {ref.marca} {ref.modelo}
                    </span>
                    <span className="text-gray-400 tabular-nums">{ref.dimension}</span>
                    {group && group.tireIds.length > 1 && (
                      <button
                        onClick={() => setBulkEditKey(refKey(ref.marca, ref.modelo, ref.dimension))}
                        className="text-[10px] font-bold text-[#1E76B6] hover:underline flex-shrink-0"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                );
              })}
              {selectedStats.byReference.length > 6 && (
                <p className="text-[10px] text-gray-400 pt-1">
                  + {selectedStats.byReference.length - 6} referencia{selectedStats.byReference.length - 6 !== 1 ? "s" : ""} más
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Vehicle groups */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Check className="w-8 h-8 mb-2 text-green-400" />
          <p className="text-sm font-bold text-[#0A183A]">Sin recomendaciones de {tab === "reencauche" ? "reencauche" : "llanta nueva"}</p>
        </div>
      ) : (
        groups.map(([placa, vehicleRecs]) => (
          <VehicleRecGroup
            key={placa}
            placa={placa}
            recs={vehicleRecs}
            selected={selected}
            onToggle={toggleSelect}
            tab={tab}
            overrides={overrides}
            onEdit={setEditingTireId}
          />
        ))
      )}

      {/* ========== Solicitudes enviadas (collapsible) ========== */}
      {orders.filter((o) => o.status === "solicitud_enviada").length > 0 && (
        <div>
          <button onClick={() => setShowSolicitudes(!showSolicitudes)} className="w-full flex items-center gap-3 mb-3 group">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#348CCB]">Solicitudes Enviadas</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#348CCB]/10 text-[#348CCB]">{orders.filter((o) => o.status === "solicitud_enviada").length}</span>
            <div className="flex-1 h-px bg-gray-200" />
            {showSolicitudes ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          {showSolicitudes && <div className="space-y-2">
            {orders.filter((o) => o.status === "solicitud_enviada").map((o) => (
              <div key={o.id} className="bg-white rounded-xl shadow-sm p-4" style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
                <div className="flex items-center gap-3">
                  <Send className="w-4 h-4 text-[#1E76B6]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0A183A]">{o.distributor?.name ?? "Distribuidor"}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(o.createdAt)} — {o.items?.length ?? 0} llantas — Esperando cotización</p>
                  </div>
                  <span className="text-sm font-bold text-[#348CCB]">{fmtCOP(o.totalEstimado ?? 0)}</span>
                </div>
              </div>
            ))}
          </div>}
        </div>
      )}

      {/* ========== Ofertas recibidas (cotizaciones) ========== */}
      {cotizaciones.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f97316]">Ofertas Para Revisar</h3>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-3">
            {cotizaciones.map((o) => {
              // Quote data lives on each item now — no separate cotizacion array.
              const items = Array.isArray(o.items) ? o.items as any[] : [];
              const isExpanded = expandedOfertas.has(o.id);
              return (
                <div key={o.id} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid rgba(249,115,22,0.2)" }}>
                  {/* Header — click to toggle per-item detail */}
                  <button
                    type="button"
                    onClick={() => toggleOferta(o.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[rgba(249,115,22,0.08)] transition-colors"
                    style={{ background: "rgba(249,115,22,0.05)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0A183A]">{o.distributor?.name ?? "Distribuidor"}</p>
                      <p className="text-[10px] text-gray-400">
                        {fmtDate(o.createdAt)} — {items.length} llanta{items.length !== 1 ? "s" : ""}
                        {" · "}
                        <span className="text-[#f97316] font-semibold">
                          {isExpanded ? "Ocultar detalle" : "Ver detalle por llanta"}
                        </span>
                      </p>
                    </div>
                    <p className="text-lg font-black text-[#0A183A] flex-shrink-0 ml-3">{fmtCOP(o.totalCotizado ?? 0)}</p>
                    <ChevronDown
                      className={`w-4 h-4 text-[#f97316] ml-2 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Items detail — hidden by default so a page of offers
                      stays scannable; click the header to expand. */}
                  {isExpanded && (
                  <div className="px-4 py-3 space-y-2">
                    {items.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#0A183A]">
                            {it.marca}{it.modelo ? ` ${it.modelo}` : ""}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {it.dimension}{it.eje ? ` — ${it.eje}` : ""}
                            {it.tiempoEntrega ? ` — ${it.tiempoEntrega}` : ""}
                            {it.tipo === "reencauche" && it.tire?.vehicle?.placa
                              ? ` — ${it.tire.vehicle.placa}·P${it.tire.posicion ?? "?"}`
                              : ""}
                          </p>
                          {it.tipo === "reencauche" && (it.bandaOfrecidaMarca || it.bandaOfrecidaModelo) && (
                            <p className="text-[10px] text-[#7c3aed] font-semibold mt-0.5">
                              Banda ofrecida: {it.bandaOfrecidaMarca}
                              {it.bandaOfrecidaMarca && it.bandaOfrecidaModelo ? " · " : ""}
                              {it.bandaOfrecidaModelo}
                            </p>
                          )}
                          {it.cotizacionNotas && <p className="text-[10px] text-[#f97316]">{it.cotizacionNotas}</p>}
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-[#0A183A]">{fmtCOP(it.precioUnitario ?? 0)}</p>
                          <p className="text-[10px]" style={{ color: it.disponible ? "#22c55e" : "#ef4444" }}>
                            {it.disponible ? "Disponible" : "No disp."}
                          </p>
                        </div>
                      </div>
                    ))}
                    {o.cotizacionNotas && <p className="text-xs text-gray-500 pt-1">{o.cotizacionNotas}</p>}
                  </div>
                  )}

                  {/* Actions — always visible so the fleet can accept/reject
                      without expanding every card, but offer acceptance
                      without reviewing details is a flow the warning on
                      the header already hints at. */}
                  <div className="px-4 py-3 flex gap-2 flex-wrap" style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}>
                    <button onClick={() => handleAcceptOrder(o.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-colors">
                      <Check className="w-3 h-3" /> Aceptar
                    </button>
                    <button onClick={() => { const msg = prompt("Nota para el distribuidor (qué necesitas diferente):"); if (msg) handleRevisionRequest(o.id, msg); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-[#f97316] bg-orange-50 hover:bg-orange-100 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Pedir Revisión
                    </button>
                    <button onClick={() => handleRejectOrder(o.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                      <X className="w-3 h-3" /> Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== Licitaciones activas ========== */}
      {bidRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b5cf6]">Licitaciones</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">{bidRequests.length}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-3">
            {bidRequests.map((bid: any) => {
              const items = Array.isArray(bid.items) ? bid.items : [];
              const responses = bid.responses ?? [];
              const quoted = responses.filter((r: any) => r.status === "cotizada" || r.status === "ganadora");
              const winner = responses.find((r: any) => r.status === "ganadora");
              const isOpen = bid.status === "abierta";
              const deadline = bid.deadline ? new Date(bid.deadline) : null;
              const hoursLeft = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60))) : null;

              return (
                <div key={bid.id} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: `1px solid ${isOpen ? "rgba(139,92,246,0.2)" : "rgba(0,0,0,0.06)"}` }}>
                  {/* Header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: isOpen ? "rgba(139,92,246,0.04)" : "rgba(0,0,0,0.02)" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#0A183A]">{items.length} llantas</p>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
                          background: bid.status === "abierta" ? "rgba(139,92,246,0.1)" : bid.status === "adjudicada" ? "rgba(34,197,94,0.1)" : "rgba(0,0,0,0.05)",
                          color: bid.status === "abierta" ? "#8b5cf6" : bid.status === "adjudicada" ? "#22c55e" : "#64748b",
                        }}>
                          {bid.status === "abierta" ? "Abierta" : bid.status === "adjudicada" ? "Adjudicada" : bid.status === "cerrada" ? "Cerrada" : "Cancelada"}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {fmtDate(bid.createdAt)} — {responses.length} invitados, {quoted.length} cotizaron
                        {isOpen && hoursLeft !== null && <> — <span className="font-bold text-[#8b5cf6]">{hoursLeft}h restantes</span></>}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#0A183A]">{fmtCOP(bid.totalEstimado ?? 0)}</p>
                  </div>

                  {/* Responses comparison */}
                  {quoted.length > 0 && (
                    <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                      {quoted.sort((a: any, b: any) => (a.totalCotizado ?? Infinity) - (b.totalCotizado ?? Infinity)).map((resp: any, i: number) => {
                        const isWinner = resp.status === "ganadora";
                        const isBest = i === 0 && !winner;
                        return (
                          <div key={resp.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{
                            background: isWinner ? "rgba(34,197,94,0.06)" : isBest ? "rgba(30,118,182,0.04)" : "rgba(0,0,0,0.01)",
                            border: isWinner ? "1px solid rgba(34,197,94,0.2)" : isBest ? "1px solid rgba(30,118,182,0.15)" : "1px solid rgba(0,0,0,0.04)",
                          }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-[#0A183A]">{resp.distributor?.name ?? "Distribuidor"}</p>
                                {isWinner && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-green-500 text-white">GANADOR</span>}
                                {isBest && !winner && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#1E76B6]/10 text-[#1E76B6]">Mejor precio</span>}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {resp.tiempoEntrega ?? "Sin tiempo estimado"} {resp.incluyeIva ? "· IVA incluido" : ""}
                              </p>
                            </div>
                            <p className="text-base font-black text-[#0A183A]">{fmtCOP(resp.totalCotizado ?? 0)}</p>
                            {isOpen && !winner && resp.status === "cotizada" && (() => {
                              const awardKey = `${bid.id}:${resp.distributorId}`;
                              const busy = awarding === awardKey;
                              return (
                                <button
                                  onClick={() => handleAwardBid(bid.id, resp.distributorId)}
                                  disabled={busy}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                                  style={{ background: "#22c55e" }}
                                >
                                  {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                                  {busy ? "Adjudicando…" : "Adjudicar"}
                                </button>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pending responses */}
                  {isOpen && responses.filter((r: any) => r.status === "pendiente").length > 0 && (
                    <div className="px-4 py-2" style={{ background: "rgba(0,0,0,0.01)", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                      <p className="text-[10px] text-gray-400">
                        Esperando: {responses.filter((r: any) => r.status === "pendiente").map((r: any) => r.distributor?.name).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== Historial (collapsible) ========== */}
      {orders.filter((o) => o.status === "aceptada" || o.status === "rechazada").length > 0 && (
        <div>
          <button onClick={() => setShowHistorial(!showHistorial)} className="w-full flex items-center gap-3 mb-3 group">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Historial</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{orders.filter((o) => o.status === "aceptada" || o.status === "rechazada").length}</span>
            <div className="flex-1 h-px bg-gray-200" />
            {showHistorial ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          {showHistorial && <div className="space-y-2">
            {orders.filter((o) => o.status === "aceptada" || o.status === "rechazada").map((o) => {
              const isAccepted = o.status === "aceptada";
              return (
                <div key={o.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3" style={{ border: "1px solid rgba(52,140,203,0.08)" }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isAccepted ? "#22c55e" : "#ef4444" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0A183A]">{o.distributor?.name ?? "Dist."}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(o.createdAt)} — {isAccepted ? "Aceptada" : "Rechazada"}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: isAccepted ? "#22c55e" : "#ef4444" }}>{fmtCOP(o.totalCotizado ?? o.totalEstimado ?? 0)}</span>
                </div>
              );
            })}
          </div>}
        </div>
      )}

      {/* ============== Sticky footer with multiple actions ============== */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 sm:px-6 py-3"
          style={{ background: "linear-gradient(135deg, #0A183A, #173D68)", boxShadow: "0 -4px 24px rgba(10,24,58,0.3)" }}>
          <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="text-white min-w-0">
              <p className="text-sm font-bold">{selected.size} llanta{selected.size !== 1 ? "s" : ""}</p>
              <p className="text-xs text-white/60">Est: {fmtCOP(totalEstimated)}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {/* Print */}
              <button onClick={() => printProposal(selectedRecs, tab)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-white/90 border border-white/20 hover:bg-white/10 transition-all">
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </button>
              {/* Move to bucket */}
              {buckets.length > 0 && (
                <button onClick={() => setActionModal("bucket")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-white/90 border border-white/20 hover:bg-white/10 transition-all">
                  <Archive className="w-3.5 h-3.5" /> Mover a Inventario
                </button>
              )}
              {/* Send proposal */}
              <button onClick={() => setActionModal("send")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
                <Send className="w-3.5 h-3.5" /> Enviar Propuesta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Send Proposal Modal ============== */}
      {actionModal === "send" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
            <div className="bg-[#173D68] text-white px-5 py-3.5 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="font-bold text-sm">Solicitar Cotizaciones</h2>
                <p className="text-[10px] text-white/50">{selected.size} llantas — Total estimado: {fmtCOP(totalEstimated)}</p>
              </div>
              <button onClick={() => setActionModal(null)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Distributor multi-select */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Distribuidores ({sendDistIds.size} seleccionados)
                </label>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-[#348CCB]/20 divide-y divide-gray-50">
                  {sortedDistributors.filter((d) => d.isConnected).length > 0 && (
                    <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#348CCB] bg-[#F0F7FF]">Mis distribuidores</p>
                  )}
                  {sortedDistributors.filter((d) => d.isConnected).map((d) => (
                    <label key={d.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F0F7FF] cursor-pointer transition-colors">
                      <input type="checkbox" checked={sendDistIds.has(d.id)}
                        onChange={() => setSendDistIds((prev) => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; })}
                        className="accent-[#1E76B6] w-3.5 h-3.5" />
                      <span className="text-xs font-medium text-[#0A183A]">{d.name}</span>
                      <span className="ml-auto text-[9px] text-green-500 font-bold">Conectado</span>
                    </label>
                  ))}
                  {sortedDistributors.filter((d) => !d.isConnected).length > 0 && (
                    <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50">Otros distribuidores</p>
                  )}
                  {sortedDistributors.filter((d) => !d.isConnected).map((d) => (
                    <label key={d.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F0F7FF] cursor-pointer transition-colors">
                      <input type="checkbox" checked={sendDistIds.has(d.id)}
                        onChange={() => setSendDistIds((prev) => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; })}
                        className="accent-[#1E76B6] w-3.5 h-3.5" />
                      <span className="text-xs font-medium text-[#0A183A]">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Plazo para cotizar</label>
                <select value={bidDeadlineHours} onChange={(e) => setBidDeadlineHours(Number(e.target.value))} className={inputCls}>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                  <option value={72}>72 horas</option>
                  <option value={168}>1 semana</option>
                </select>
              </div>

              {/* Delivery address */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Direccion de entrega</label>
                <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Ej: Bodega Calle 80 #45-12, Bogota" className={inputCls} />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Notas (opcional)</label>
                <textarea value={sendNotes} onChange={(e) => setSendNotes(e.target.value)} rows={2}
                  className={`${inputCls} resize-none`} placeholder="Notas adicionales..." />
              </div>

              {selectedRecs.some((r) => r.urgency === "critical") && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 text-xs text-red-600">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Incluye llantas criticas que requieren atencion inmediata.
                </div>
              )}

              {/* Items summary */}
              <div className="rounded-lg p-3" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(10,24,58,0.06)" }}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Llantas solicitadas</p>
                <div className="space-y-1">
                  {selectedRecs.slice(0, 5).map((r) => (
                    <div key={r.tire.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-600">{r.tire.marca} {r.tire.dimension} · {r.type === "reencauche" ? "Reencauche" : "Nueva"}</span>
                      <span className="font-bold text-[#0A183A]">{fmtCOP(r.catalogMatch?.precioCop ?? r.estimatedPrice)}</span>
                    </div>
                  ))}
                  {selectedRecs.length > 5 && <p className="text-[9px] text-gray-400">+{selectedRecs.length - 5} mas...</p>}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}>
              <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">Cancelar</button>
              <button onClick={handleSendBid} disabled={sending || sendDistIds.size === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Solicitar a {sendDistIds.size} distribuidor{sendDistIds.size !== 1 ? "es" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Move to Bucket Modal ============== */}
      {actionModal === "bucket" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-xl shadow-sm w-full max-w-md overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
            <div className="bg-[#173D68] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-bold text-sm">Mover a Inventario</h2>
              <button onClick={() => setActionModal(null)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-400">Mover {selected.size} llanta{selected.size !== 1 ? "s" : ""} a un bucket de inventario</p>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Bucket de destino</label>
                <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} className={inputCls}>
                  <option value="">Seleccionar bucket...</option>
                  {buckets.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">Cancelar</button>
                <button onClick={handleBulkMoveToBucket} disabled={sending || !bucketId}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />} Mover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== Accept Confirmation Modal ============== */}
      {actionModal === "acceptConfirm" && orderToAccept && (() => {
        const oItems = Array.isArray(orderToAccept.items) ? orderToAccept.items as any[] : [];
        const reencItems = oItems.filter((it: any) => it.tipo === "reencauche");
        const newItems = oItems.filter((it: any) => it.tipo === "nueva");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}>
            <div className="bg-white rounded-xl shadow-sm w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
              <div className="px-6 py-4 flex justify-between items-center sticky top-0 z-10" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                <h2 className="font-bold text-sm text-white">Confirmar Aceptación</h2>
                <button onClick={() => { setActionModal(null); setOrderToAccept(null); }} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-[#0A183A]">
                  Vas a aceptar la cotización de <strong>{orderToAccept.distributor?.name}</strong>. El pedido pasará al estado <em>aceptada</em> y el distribuidor empezará a procesarlo.
                </p>

                {reencItems.length > 0 && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <p className="text-xs font-bold text-[#7c3aed] uppercase tracking-wider mb-2">
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      {reencItems.length} llanta{reencItems.length !== 1 ? "s" : ""} a reencauchar
                    </p>
                    <ul className="space-y-1">
                      {reencItems.slice(0, 8).map((it: any) => (
                        <li key={it.id} className="text-xs text-[#0A183A] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] flex-shrink-0" />
                          <span>
                            {it.tire?.vehicle?.placa ?? it.vehiclePlaca ?? "—"}
                            {it.tire?.posicion != null ? ` · P${it.tire.posicion}` : ""}
                            {" — "}{it.modelo || "Banda por definir"} · {it.dimension}
                          </span>
                        </li>
                      ))}
                      {reencItems.length > 8 && (
                        <li className="text-[10px] text-gray-400">+ {reencItems.length - 8} más</li>
                      )}
                    </ul>
                    <p className="text-[10px] text-[#7c3aed]/70 mt-2">
                      Después de aceptar, te pediremos enviar estas llantas al bucket de Reencauche.
                    </p>
                  </div>
                )}

                {newItems.length > 0 && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(30,118,182,0.05)", border: "1px solid rgba(30,118,182,0.15)" }}>
                    <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider mb-2">
                      <Package className="w-3 h-3 inline mr-1" />
                      {newItems.length} llanta{newItems.length !== 1 ? "s" : ""} nueva{newItems.length !== 1 ? "s" : ""}
                    </p>
                    <ul className="space-y-1">
                      {newItems.slice(0, 8).map((it: any) => (
                        <li key={it.id} className="text-xs text-[#0A183A] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1E76B6] flex-shrink-0" />
                          <span>{it.marca}{it.modelo ? ` ${it.modelo}` : ""} — {it.dimension}</span>
                        </li>
                      ))}
                      {newItems.length > 8 && (
                        <li className="text-[10px] text-gray-400">+ {newItems.length - 8} más</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.1)" }}>
                  <span className="text-sm font-bold text-[#0A183A]">Total cotizado</span>
                  <span className="text-lg font-black text-[#0A183A]">{fmtCOP(orderToAccept.totalCotizado ?? 0)}</span>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setActionModal(null); setOrderToAccept(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">
                    Cancelar
                  </button>
                  <button onClick={executeAcceptOrder} disabled={accepting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                    {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Aceptar pedido
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============== Send-to-Reencauche-bucket Modal ============== */}
      {actionModal === "sendReencauche" && orderToAccept && (() => {
        const reencItems = (Array.isArray(orderToAccept.items) ? orderToAccept.items as any[] : [])
          .filter((it: any) => it.tipo === "reencauche" && it.tireId);

        // Group by vehicle so the warning matches how the operator thinks
        // ("vehicle ABC-123 will be down three tires").
        const byVehicle = new Map<string, any[]>();
        for (const it of reencItems) {
          const placa = it.tire?.vehicle?.placa ?? it.vehiclePlaca ?? "Sin vehículo";
          const list = byVehicle.get(placa) ?? [];
          list.push(it);
          byVehicle.set(placa, list);
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}>
            <div className="bg-white rounded-xl shadow-sm w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
              <div className="px-6 py-4 flex justify-between items-center sticky top-0 z-10" style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-white" />
                  <h2 className="font-bold text-sm text-white">Enviar llantas al reencauche</h2>
                </div>
                <button onClick={() => { setActionModal(null); setOrderToAccept(null); onRefresh(); }} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}>
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#713f12]">
                    Los vehículos involucrados quedarán con <strong>posiciones vacías</strong> hasta que el distribuidor
                    devuelva las llantas retrituradas. Asegúrate de tener llantas de respaldo si el vehículo debe operar
                    mientras tanto.
                  </p>
                </div>

                <p className="text-xs text-gray-500">
                  Se moverán <strong>{reencItems.length}</strong> llanta{reencItems.length !== 1 ? "s" : ""} al bucket
                  de Reencauche. El distribuidor las revisará una por una y decidirá cuáles acepta para reencauchar.
                </p>

                <div className="space-y-2">
                  {[...byVehicle.entries()].map(([placa, list]) => (
                    <div key={placa} className="rounded-xl p-3" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.12)" }}>
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#7c3aed] mb-1.5">
                        {placa} — {list.length} posición{list.length !== 1 ? "es" : ""}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((it: any) => (
                          <span key={it.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border"
                                style={{ borderColor: "rgba(124,58,237,0.25)", color: "#7c3aed" }}>
                            P{it.tire?.posicion ?? "?"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setActionModal(null); setOrderToAccept(null); onRefresh(); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7c3aed] border border-[#7c3aed]/30 hover:bg-[#f5f3ff] transition-colors">
                    Ahora no
                  </button>
                  <button onClick={executeSendToReencauche} disabled={accepting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
                    {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar al bucket
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============== Per-item Edit Modal ============== */}
      {editingTireId && (() => {
        const rec = recs.find((r) => r.tire.id === editingTireId);
        if (!rec) return null;
        return (
          <EditItemModal
            rec={rec}
            override={overrides[editingTireId]}
            onClose={() => setEditingTireId(null)}
            onSave={(next) => { applyPerItemEdit(editingTireId, next); setEditingTireId(null); }}
          />
        );
      })()}

      {/* ============== Bulk Edit Modal ============== */}
      {bulkEditKey && (() => {
        const group = selectedRefGroups.find((g) => g.key === bulkEditKey);
        if (!group) return null;
        return (
          <BulkEditModal
            group={group}
            onClose={() => setBulkEditKey(null)}
            onSave={(next) => { applyBulkEdit(group.tireIds, next); setBulkEditKey(null); }}
          />
        );
      })()}
    </div>
  );
}

// ===============================================================================
// Edit modals — one row at a time or every selected row of the same reference.
// Both write into the override map which is read by `effectiveSpec` /
// `buildItems` on submit.
// ===============================================================================

function EditItemModal({
  rec, override, onClose, onSave,
}: {
  rec: Recommendation;
  override?: ItemOverride;
  onClose: () => void;
  onSave: (next: ItemOverride) => void;
}) {
  // Prefill the form with whatever the analista would actually order right
  // now — either the override or, if none yet, the current recommendation
  // baseline — so they see the true starting point, not a blank form.
  const baseline = effectiveSpec(rec, override);
  const [marca,     setMarca]     = useState<string>(baseline.marca);
  const [modelo,    setModelo]    = useState<string>(baseline.modelo ?? "");
  const [dimension, setDimension] = useState<string>(baseline.dimension);
  const [cantidad,  setCantidad]  = useState<number>(baseline.cantidad);

  const original = effectiveSpec(rec, undefined);
  const isDirty =
    marca.trim()     !== original.marca     ||
    modelo.trim()    !== (original.modelo ?? "") ||
    dimension.trim() !== original.dimension ||
    cantidad         !== original.cantidad;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0A183A] px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Editar referencia</p>
            <p className="text-sm font-black text-white">{rec.vehiclePlaca} · P{rec.tire.posicion}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Recomendación original</p>
          <p className="text-xs text-gray-500">
            {original.marca} {original.modelo} <span className="text-gray-400">· {original.dimension}</span>
          </p>

          <div className="h-px bg-gray-100 my-2" />

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Marca</label>
            <input type="text" className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              {rec.type === "reencauche" ? "Banda" : "Modelo / diseño"}
            </label>
            <input type="text" className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Dimensión</label>
            <input type="text" className={inputCls} value={dimension} onChange={(e) => setDimension(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Cantidad</label>
            <input type="number" min={1} className={inputCls}
                   value={cantidad}
                   onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))} />
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 flex gap-2">
          {override && (
            <button
              onClick={() => onSave({})}
              className="px-3 py-2 rounded-lg text-xs font-bold text-[#64748b] hover:bg-gray-100 transition-colors"
            >
              Restaurar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(isDirty ? {
              marca:     marca.trim(),
              modelo:    modelo.trim() || undefined,
              dimension: dimension.trim(),
              cantidad,
            } : {})}
            disabled={!marca.trim() || !dimension.trim()}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-[#0A183A] hover:bg-[#173D68] disabled:opacity-40 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkEditModal({
  group, onClose, onSave,
}: {
  group: { key: string; marca: string; modelo: string; dimension: string; tireIds: string[] };
  onClose: () => void;
  onSave: (next: ItemOverride) => void;
}) {
  const [marca,     setMarca]     = useState<string>(group.marca);
  const [modelo,    setModelo]    = useState<string>(group.modelo ?? "");
  const [dimension, setDimension] = useState<string>(group.dimension);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0A183A] px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Editar en grupo</p>
            <p className="text-sm font-black text-white">
              {group.tireIds.length} llantas con la misma referencia
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-lg p-3" style={{ background: "rgba(52,140,203,0.06)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Actualmente</p>
            <p className="text-xs font-bold text-[#0A183A] mt-0.5">
              {group.marca} {group.modelo} <span className="text-gray-400">· {group.dimension}</span>
            </p>
          </div>
          <p className="text-[11px] text-gray-500">
            Cambiarás las {group.tireIds.length} llantas seleccionadas por la referencia que definas abajo.
          </p>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Marca</label>
            <input type="text" className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Modelo / banda</label>
            <input type="text" className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Dimensión</label>
            <input type="text" className={inputCls} value={dimension} onChange={(e) => setDimension(e.target.value)} />
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({
              marca:     marca.trim(),
              modelo:    modelo.trim() || undefined,
              dimension: dimension.trim(),
            })}
            disabled={!marca.trim() || !dimension.trim()}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-[#0A183A] hover:bg-[#173D68] disabled:opacity-40 transition-colors"
          >
            Aplicar a {group.tireIds.length}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===============================================================================
// Vehicle recommendation group
// ===============================================================================

function VehicleRecGroup({
  placa, recs, selected, onToggle, tab, overrides, onEdit,
}: {
  placa: string;
  recs: Recommendation[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  tab: "reencauche" | "nueva";
  overrides: Record<string, ItemOverride>;
  onEdit: (tireId: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Vehicle header */}
      <div className="bg-[#173D68] px-4 py-2.5 flex items-center gap-2">
        <Truck className="w-3.5 h-3.5 text-[#348CCB]" />
        <span className="font-mono font-bold text-white text-xs tracking-wider">{placa.toUpperCase()}</span>
        <span className="text-[10px] text-white/40 ml-auto">{recs.length} llanta{recs.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Tire rows */}
      <div className="divide-y divide-gray-50">
        {recs.map((r) => {
          const sel = selected.has(r.tire.id);
          const u = URGENCY_META[r.urgency];
          const price = tab === "reencauche" ? 650000 : (r.catalogMatch?.precioCop ?? r.estimatedPrice);
          const ov = overrides[r.tire.id];
          const spec = effectiveSpec(r, ov);
          const isOverridden = !!ov;

          return (
            <div key={r.tire.id} onClick={() => onToggle(r.tire.id)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50"
              style={{ background: sel ? "rgba(30,118,182,0.04)" : undefined }}>

              {/* Checkbox */}
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: sel ? "#1E76B6" : "transparent", border: sel ? "none" : "1.5px solid #cbd5e1" }}>
                {sel && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>

              {/* Urgency dot */}
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: u.color }} title={u.label} />

              {/* Info — shows the effective (possibly overridden) spec so the
                  analista sees what will actually be ordered. */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0A183A]">
                    {spec.marca} {spec.modelo && <span className="font-medium text-[#173D68]">{spec.modelo}</span>} {spec.dimension}
                  </span>
                  {spec.cantidad > 1 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#0A183A] text-white">
                      ×{spec.cantidad}
                    </span>
                  )}
                  {isOverridden && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}
                      title={`Original: ${r.tire.marca} ${r.tire.diseno} ${r.tire.dimension}`}
                    >
                      Editada
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">P{r.tire.posicion} · {r.tire.eje}</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">{r.reason}</p>
              </div>

              {/* Depth */}
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-black" style={{ color: r.minDepth <= 3 ? "#ef4444" : r.minDepth <= 6 ? "#f97316" : "#348CCB" }}>
                  {r.minDepth.toFixed(1)}mm
                </span>
              </div>

              {/* Price */}
              <span className="text-[11px] font-bold text-[#0A183A] flex-shrink-0 w-20 text-right">
                {fmtCOP(price)}
              </span>

              {/* Edit button — stops propagation so it doesn't toggle the row */}
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(r.tire.id); }}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#1E76B6] hover:bg-[#1E76B6]/10 transition-colors"
                title="Editar referencia / cantidad"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===============================================================================
// Main component
// ===============================================================================

export default function PedidosTab() {
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [tires, setTires] = useState<RawTire[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [allDistributors, setAllDistributors] = useState<{ id: string; name: string }[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [catalogCache, setCatalogCache] = useState<Map<string, CatalogMatch>>(new Map());

  const fetchAll = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      // Tires go through the paged helper — the legacy
      // /tires?companyId=X&slim=true endpoint shipped the whole fleet in
      // one response, which for 16k-tire clients was a 5-10 MB payload
      // that blocked render. fetchTiresPaged wraps /tires/page with the
      // same slim projection + Redis per-page cache.
      const { fetchTiresPaged } = await import("@/shared/fetchTiresPaged");

      const [settingsRes, tires, ordersRes, distRes, bucketsRes, companyRes, allDistRes] = await Promise.all([
        authFetch(`${API_BASE}/companies/${cId}/agent-settings`),
        fetchTiresPaged<any>(cId),
        authFetch(`${API_BASE}/purchase-orders/company?companyId=${cId}`),
        authFetch(`${API_BASE}/companies/${cId}/distributors`),
        authFetch(`${API_BASE}/inventory-buckets?companyId=${cId}`),
        authFetch(`${API_BASE}/companies/${cId}`),
        authFetch(`${API_BASE}/companies/all`),
      ]);

      if (settingsRes.ok) { const data = await settingsRes.json(); setSettings(data.agentSettings ?? null); }
      setTires(tires);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (distRes.ok) setDistributors(await distRes.json());
      if (bucketsRes.ok) setBuckets(await bucketsRes.json());
      if (allDistRes.ok) {
        const all = await allDistRes.json();
        setAllDistributors((all as any[]).filter((c: any) => c.plan === "distribuidor" && c.id !== cId).map((c: any) => ({ id: c.id, name: c.name })));
      }
      if (companyRes.ok) {
        const c = await companyRes.json();
        try { localStorage.setItem("companyName", c.name ?? ""); localStorage.setItem("companyLogo", c.profileImage ?? ""); } catch { /* */ }
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try { const user = JSON.parse(stored); if (!user.companyId) return; setCompanyId(user.companyId); fetchAll(user.companyId); } catch { /* */ }
  }, [fetchAll]);


  const rawRecs = useMemo(() => analyzeFleet(tires), [tires]);

  // Fetch catalog replacements for "nueva" recommendations
  useEffect(() => {
    if (!rawRecs.length) return;
    const seen = new Set<string>();
    const toFetch: { dimension: string; eje: string }[] = [];
    for (const r of rawRecs.filter((r) => r.type === "nueva")) {
      const key = `${r.tire.dimension}|${r.tire.eje}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toFetch.push({ dimension: r.tire.dimension, eje: r.tire.eje });
    }
    if (!toFetch.length) return;

    Promise.all(
      toFetch.map(({ dimension, eje }) =>
        authFetch(`${API_BASE}/catalog/replacements?dimension=${encodeURIComponent(dimension)}&eje=${eje}`)
          .then((r) => r.ok ? r.json() : [])
          .then((items: CatalogMatch[]) => ({ key: `${dimension}|${eje}`, best: items[0] ?? null }))
          .catch(() => ({ key: `${dimension}|${eje}`, best: null })),
      ),
    ).then((results) => {
      const map = new Map<string, CatalogMatch>();
      for (const { key, best } of results) { if (best) map.set(key, best); }
      setCatalogCache(map);
    });
  }, [rawRecs]);

  const recommendations = useMemo(() => {
    if (!catalogCache.size) return rawRecs;
    return rawRecs.map((r) => {
      if (r.type !== "nueva") return r;
      return { ...r, catalogMatch: catalogCache.get(`${r.tire.dimension}|${r.tire.eje}`) ?? null };
    });
  }, [rawRecs, catalogCache]);

  const sendableRecs = useMemo(
    () => recommendations.filter((r) => r.urgency === "critical" || r.urgency === "immediate"),
    [recommendations],
  );

  async function sendProposalToDistributor() {
    if (sendableRecs.length === 0) { window.alert("No hay recomendaciones críticas o inmediatas para enviar."); return; }
    if (allDistributors.length === 0) { window.alert("No tienes distribuidores vinculados. Abre una licitación pública en su lugar."); return; }
    const list = allDistributors.map((d, i) => `${i + 1}. ${d.name}`).join("\n");
    const pick = window.prompt(`¿A qué proveedor envío la propuesta?\n\n${list}\n\nEscribe el número:`);
    if (!pick) return;
    const idx = parseInt(pick, 10) - 1;
    const dist = allDistributors[idx];
    if (!dist) { window.alert("Selección inválida."); return; }
    const items = sendableRecs.map((r) => ({
      tireId: r.tire.id,
      tipo: r.type,
      placa: r.vehiclePlaca,
      marca: r.tire.marca,
      dimension: r.tire.dimension,
      eje: r.tire.eje,
      profundidad: r.minDepth,
      precioEstimado: r.estimatedPrice,
      banda: r.bandaRecomendada ?? null,
    }));
    const total = sendableRecs.reduce((s, r) => s + r.estimatedPrice, 0);
    try {
      const res = await authFetch(`${API_BASE}/purchase-orders`, {
        method: "POST",
        body: JSON.stringify({ companyId, distributorId: dist.id, items, totalEstimado: total, notas: `Propuesta generada (${sendableRecs.length} ítems)` }),
      });
      if (!res.ok) throw new Error();
      window.alert(`Propuesta enviada a ${dist.name}.`);
      fetchAll(companyId);
    } catch { window.alert("No se pudo enviar la propuesta."); }
  }

  async function openLicitacion() {
    if (sendableRecs.length === 0) { window.alert("No hay recomendaciones críticas o inmediatas para licitar."); return; }
    const ok = window.confirm(`Se abrirá una licitación pública con ${sendableRecs.length} ítems. Todos los distribuidores en TirePro podrán cotizar. ¿Continuar?`);
    if (!ok) return;
    const items = sendableRecs.map((r) => ({
      tireId: r.tire.id,
      tipo: r.type,
      placa: r.vehiclePlaca,
      marca: r.tire.marca,
      dimension: r.tire.dimension,
      eje: r.tire.eje,
      profundidad: r.minDepth,
      precioEstimado: r.estimatedPrice,
      banda: r.bandaRecomendada ?? null,
    }));
    try {
      const res = await authFetch(`${API_BASE}/marketplace/bid-requests`, {
        method: "POST",
        body: JSON.stringify({ companyId, items, notas: `Licitación abierta (${sendableRecs.length} ítems)` }),
      });
      if (!res.ok) throw new Error();
      window.alert("Licitación abierta. Recibirás cotizaciones en Pedidos.");
      fetchAll(companyId);
    } catch { window.alert("No se pudo abrir la licitación."); }
  }
  // --------------------------------------------------------------------------

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#1E76B6]"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  const isAgentAuto = settings?.agentEnabled && settings?.purchaseMode === "agent_auto";

  return (
    <>
      {isAgentAuto ? (
        <AgentView orders={orders} budget={settings?.monthlyBudgetCap ?? 0} tires={tires} />
      ) : (
        <ManualView
          recs={recommendations}
          orders={orders}
          distributors={distributors}
          allDistributors={allDistributors}
          buckets={buckets}
          companyId={companyId}
          onRefresh={() => fetchAll(companyId)}
          budget={settings?.monthlyBudgetCap ?? 0}
          tires={tires}
        />
      )}
    </>
  );
}
