"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Award,
  Calendar,
  AlertCircle,
  X,
  HelpCircle,
  Pencil,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Eye,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line, Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";

import MetricCard from "../components/MetricCard";
import {
  COLORS,
  createGradient,
  fmtCOP,
  fmtCOPCompact,
} from "../components/chartConfig";
import PorVida from "../cards/porVida";
import PorMarca from "../cards/porMarca";
import PorBanda from "../cards/porBanda";
import PorDimension from "../cards/porDimension";
import SemaforoPie from "../cards/semaforoPie";
import PromedioEje from "../cards/promedioEje";
import TipoVehiculo from "../cards/tipoVehiculo";
import HistoricChart from "../cards/historicChart";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import TanqueMilimetro from "../cards/tanqueMilimetro";
import ProyeccionVida from "../cards/ProyeccionVida";
import FilterFab from "../components/FilterFab";
import type { FilterOption } from "../components/FilterFab";
import AnaFab from "../components/AnaFab";
import LazyMount from "@/shared/LazyMount";
import { AdvancedCondition, passAllAdvanced } from "@/shared/advancedFilters";
import InspectionsDayReportCard from "@/shared/InspectionsDayReportCard";
import ExportModal from "./ExportModal";
import { buildResumenReportData, type ReportFilterOpts } from "@/shared/buildResumenReport";

// -- Chart.js registration ----------------------------------------------------

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  ChartDataLabels,
);

// -- Types --------------------------------------------------------------------

type RawCosto = { valor: number; fecha: string | Date; concepto?: string | null };
type RawInspeccion = { fecha: string | Date; cpkProyectado: number | null; cpk?: number | null; lifetimeCpk?: number | null };

type RawTire = {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension: string;
  eje: string;
  vehicleId: string | null;
  profundidadInicial: number;
  kilometrosRecorridos: number;
  currentCpk: number | null;
  lifetimeCpk?: number | null;
  currentProfundidad: number | null;
  projectedProfundidad?: number | null;
  projectedAlertLevel?: string | null;
  projectedHealthScore?: number | null;
  projectedDaysToLimit?: number | null;
  vidaActual: string;
  costos: RawCosto[];
  inspecciones: RawInspeccion[];
  vehicle?: { placa: string } | null;
};

// -- Constants ----------------------------------------------------------------

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

// -- Helpers ------------------------------------------------------------------

function monthLabel(d: Date): string {
  return d.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

function getLast12Months(): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(d),
    });
  }
  return months;
}

function toMonthKey(fecha: string | Date): string {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// -- Card wrapper (matches existing card components: blue header + body) -------

function CardWrap({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <div
        className="relative z-10 bg-white rounded-2xl overflow-hidden w-full transition-all duration-200"
        style={{
          border: '1px solid rgba(10,24,58,0.08)',
          boxShadow: '0 2px 12px -4px rgba(10,24,58,0.08)',
        }}
      >
        <div
          className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2"
          style={{ borderBottom: '1px solid rgba(10,24,58,0.06)' }}
        >
          <h2 className="text-sm font-bold text-[#0A183A] truncate">{title}</h2>
          {description && (
            <div className="group relative cursor-pointer shrink-0 print:hidden">
              <HelpCircle className="text-[#173D68]/40 hover:text-[#173D68] transition-colors" size={18} />
              <div className="absolute z-20 top-full mt-2 right-0 bg-[#0A183A] text-white text-xs p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-52 pointer-events-none shadow-xl"
                   style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <p>{description}</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 sm:p-6">
          <div className="h-64 sm:h-72">{children}</div>
        </div>
      </div>
    </div>
  );
}

// -- Datalabels helper: show label at first, mid, last non-null points --------

function keyPointLabels(data: (number | null)[]) {
  const indices: number[] = [];
  data.forEach((v, i) => { if (v !== null && v !== 0) indices.push(i); });
  if (indices.length === 0) return new Set<number>();
  const first = indices[0];
  const last = indices[indices.length - 1];
  const mid = indices[Math.floor(indices.length / 2)];
  return new Set([first, mid, last]);
}

// =============================================================================
// Page
// =============================================================================

// "Inversion" = money actively put INTO the fleet (new tire purchases +
// retreads). Fin-de-vida "dinero perdido" is wasted tread value, NOT
// fresh investment, and must never land in the inversion KPIs. The
// backend only writes compra_nueva / reencauche concepts, but we also
// allowlist here so any future rogue row labelled "desecho" or similar
// gets silently excluded from the investment charts.
const INVERSION_CONCEPTS = new Set(["compra_nueva", "reencauche", ""]);
function isInversionCost(c: { concepto?: string | null }): boolean {
  const k = (c.concepto ?? "").toLowerCase().trim();
  return INVERSION_CONCEPTS.has(k);
}

// =============================================================================
// Streaming progress bar — thin sticky bar + numeric pill
// =============================================================================

function LoadProgressBar({
  streaming, loaded, expected,
}: {
  streaming: boolean; loaded: number; expected: number;
}) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (streaming) {
      setVisible(true);
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    } else if (visible) {
      // Flash to 100% then fade
      hideTimer.current = setTimeout(() => setVisible(false), 800);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [streaming, visible]);

  if (!visible) return null;

  const hasExpected = expected > 0;
  const pct = hasExpected
    ? Math.min(100, Math.round((loaded / expected) * 100))
    : 0;
  const isDone = !streaming && hasExpected;

  return (
    <>
      {/* Thin bar pinned at the very top of the viewport.
          z-50 keeps it ABOVE the sticky page header (z-40). Previously it
          was z-30 below the header, so the 0.92-opacity backdrop-blur
          header was painting over the 1px strip — invisible in practice. */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gray-100/80 overflow-hidden pointer-events-none">
        <div
          className={hasExpected ? "h-full transition-all duration-300" : "h-full animate-pulse"}
          style={{
            width: hasExpected ? `${isDone ? 100 : Math.max(pct, 3)}%` : "40%",
            background: "linear-gradient(90deg, #1E76B6 0%, #348CCB 50%, #7DC5F0 100%)",
            boxShadow: "0 0 12px rgba(52,140,203,0.55)",
            marginLeft: hasExpected ? "0" : "30%",
          }}
        />
      </div>

      {/* Count pill — renders in normal content flow below the header. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
        <div
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-[11px]"
          style={{
            background: "linear-gradient(135deg, rgba(30,118,182,0.06), rgba(52,140,203,0.04))",
            border: "1px solid rgba(52,140,203,0.2)",
          }}
        >
          <Loader2 className={`w-3.5 h-3.5 text-[#1E76B6] ${streaming ? "animate-spin" : ""}`} />
          <span className="font-bold text-[#0A183A]">
            {isDone
              ? "Listo"
              : hasExpected
                ? `Cargando ${loaded.toLocaleString("es-CO")} de ${expected.toLocaleString("es-CO")} llantas`
                : `Cargando ${loaded.toLocaleString("es-CO")} llantas…`}
          </span>
          {hasExpected && (
            <span className="ml-auto text-[#1E76B6] font-black tabular-nums">
              {isDone ? "100%" : `${pct}%`}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default function ResumenPage() {
  const router = useRouter();
  // Raw tires as they stream in (unthrottled counter source — drives the
  // progress bar). `tires` below is the frozen snapshot used by charts.
  const [allTires, setAllTires]   = useState<RawTire[]>([]);
  const [tires, setTires]         = useState<RawTire[]>([]);
  const [loading, setLoading]     = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [loadedTires, setLoadedTires] = useState(0);
  const [expectedTires, setExpectedTires] = useState(0);
  const [userName, setUserName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    marca: "Todos", eje: "Todos", vida: "Todos",
  });
  const [filterSearch, setFilterSearch] = useState("");
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  // Inspection date-range filter. When either bound is set we keep only
  // tires with at least one inspection in [from, to] and replace their
  // `inspecciones` array with the SINGLE latest in-range record so
  // downstream charts that read the last inspection see the right value
  // without knowing about the filter.
  const [inspectionFrom, setInspectionFrom] = useState<string>("");
  const [inspectionTo,   setInspectionTo]   = useState<string>("");

  // -- Fetch ------------------------------------------------------------------

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    let user: { companyId?: string; name?: string; role?: string };
    try { user = JSON.parse(stored); } catch { router.push("/login"); return; }
    if (user.name) setUserName(user.name);
    if (user.role === "admin") setIsAdmin(true);
    if (!user.companyId) return;
    setCompanyId(user.companyId);

    setLoading(true);
    setStreaming(true);
    setLoadedTires(0);

    // Read stats.tires for the progress bar denominator via the shared
    // cache. Sidebar + RouteGuard + root redirect fetch the same object
    // and we reuse their response instead of firing a fourth parallel
    // request that tripped the rate limiter.
    import("@/shared/fetchCompany")
      .then(({ fetchCompany }) => fetchCompany(user.companyId!))
      .then((c) => {
        const total = c?._count?.tires ?? c?.stats?.tires ?? 0;
        if (typeof total === "number" && total > 0) setExpectedTires(total);
        if (c?.name) setCompanyName(c.name);
        if (c?.profileImage) setCompanyLogo(c.profileImage);
      })
      .catch(() => {});

    // Progressive fetch: page 1 paints charts (~300-500ms), subsequent pages
    // update the progress bar live but charts stay frozen at the page-1
    // snapshot until the stream ends. Avoids re-rendering 12 chart.js canvases
    // 8 times for a 20k-tire account.
    import('@/shared/fetchTiresPaged').then(({ fetchTiresProgressive }) => {
      fetchTiresProgressive<RawTire>(user.companyId!, {
        // Unthrottled — drives the smooth progress bar.
        onProgress: (loaded) => setLoadedTires(loaded),
        // Throttled (750ms) — updates allTires. The chart snapshot effect
        // below decides whether to forward this into `tires`.
        onChunk: (soFar) => {
          startTransition(() => {
            setAllTires(soFar as RawTire[]);
          });
          // Always clear the full-page spinner on first chunk, even if
          // the chunk is empty (zero-tire tenant). The old `soFar.length > 0`
          // guard stranded newly-provisioned companies on the loading
          // spinner forever — "reloads and reloads" from the user's POV.
          setLoading(false);
        },
      })
        .catch(() => setLoading(false))
        .finally(() => setStreaming(false));
    });
  }, [router]);

  // Chart data snapshot: `tires` (consumed by charts) only updates on
  // (a) first chunk — immediate first paint
  // (b) stream completion — final authoritative data
  // Mid-stream chunk arrivals are deliberately ignored here; the progress
  // bar gives live feedback instead. Same pattern as the distribuidor page.
  useEffect(() => {
    if (allTires.length === 0) {
      if (tires.length !== 0) setTires([]);
      return;
    }
    if (tires.length === 0) {
      // First-chunk paint
      setTires(allTires);
      return;
    }
    if (!streaming && tires !== allTires) {
      setTires(allTires);
    }
  }, [allTires, streaming, tires]);

  // -- Derived data -----------------------------------------------------------

  const months = useMemo(() => getLast12Months(), []);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Defer filter values so toggling a filter doesn't block the main thread
  // while 10+ useMemos reshape. Pill updates instant; chart re-render is
  // idle-priority.
  const deferredFilterValues = useDeferredValue(filterValues);
  const deferredFilterSearch = useDeferredValue(filterSearch);
  const deferredAdvanced     = useDeferredValue(advancedConditions);
  const deferredInspectionFrom = useDeferredValue(inspectionFrom);
  const deferredInspectionTo   = useDeferredValue(inspectionTo);
  const filterPending =
    filterValues       !== deferredFilterValues
    || filterSearch    !== deferredFilterSearch
    || advancedConditions !== deferredAdvanced
    || inspectionFrom  !== deferredInspectionFrom
    || inspectionTo    !== deferredInspectionTo;

  const filterOptions: FilterOption[] = useMemo(() => [
    { key: "marca", label: "Marca", options: ["Todos", ...Array.from(new Set(tires.map((t) => t.marca))).sort()] },
    { key: "eje", label: "Eje", options: ["Todos", ...Array.from(new Set(tires.map((t) => t.eje))).sort()] },
    { key: "vida", label: "Vida", options: ["Todos", "nueva", "reencauche1", "reencauche2", "reencauche3", "fin"] },
  ], [tires]);

  const filtered = useMemo(() => {
    let result: RawTire[] = tires;

    // Date-range filter — applied FIRST so downstream charts and the
    // vida/marca/eje filters all see the narrowed `inspecciones` list
    // (just the latest inspection per tire that falls inside the range).
    // Open-ended on a missing bound; comparison done in local time so
    // "2025-12-24" matches inspections recorded that day in the user's
    // timezone.
    if (deferredInspectionFrom || deferredInspectionTo) {
      const from = deferredInspectionFrom || "0000-00-00";
      const to   = deferredInspectionTo   || "9999-12-31";
      const narrowed: RawTire[] = [];
      for (const t of result) {
        let latest: RawInspeccion | null = null;
        let latestTs = -Infinity;
        for (const i of t.inspecciones) {
          const local = new Date(i.fecha).toLocaleDateString("en-CA");
          if (local < from || local > to) continue;
          const ts = new Date(i.fecha).getTime();
          if (ts > latestTs) { latestTs = ts; latest = i; }
        }
        if (!latest) continue;
        narrowed.push({ ...t, inspecciones: [latest] });
      }
      result = narrowed;
    }

    // Exclude fin de vida unless explicitly selected
    if (!deferredFilterValues.vida || deferredFilterValues.vida === "Todos")
      result = result.filter((t) => t.vidaActual !== "fin");
    else
      result = result.filter((t) => t.vidaActual === deferredFilterValues.vida);
    if (deferredFilterValues.marca && deferredFilterValues.marca !== "Todos")
      result = result.filter((t) => t.marca === deferredFilterValues.marca);
    if (deferredFilterValues.eje && deferredFilterValues.eje !== "Todos")
      result = result.filter((t) => t.eje === deferredFilterValues.eje);
    if (deferredFilterSearch.trim()) {
      const q = deferredFilterSearch.toLowerCase();
      result = result.filter((t) => t.placa.toLowerCase().includes(q) || t.marca.toLowerCase().includes(q));
    }
    if (deferredAdvanced.length > 0) {
      result = result.filter((t) => passAllAdvanced(t, deferredAdvanced));
    }
    return result;
  }, [tires, deferredFilterValues, deferredFilterSearch, deferredAdvanced, deferredInspectionFrom, deferredInspectionTo]);

  // Fin-de-vida tires (for dinero perdido — applies marca/eje/search but always keeps only fin)
  const finTires = useMemo(() => {
    let result = tires.filter((t) => t.vidaActual === "fin");
    if (deferredFilterValues.marca && deferredFilterValues.marca !== "Todos")
      result = result.filter((t) => t.marca === deferredFilterValues.marca);
    if (deferredFilterValues.eje && deferredFilterValues.eje !== "Todos")
      result = result.filter((t) => t.eje === deferredFilterValues.eje);
    if (deferredFilterSearch.trim()) {
      const q = deferredFilterSearch.toLowerCase();
      result = result.filter((t) => t.placa.toLowerCase().includes(q) || t.marca.toLowerCase().includes(q));
    }
    return result;
  }, [tires, deferredFilterValues, deferredFilterSearch]);

  // Reads `filtered` (not raw `tires`) so the KPI respects marca/eje/vida
  // and the search box — matched how the rest of the cards already behave.
  const inversionMes = useMemo(() => {
    let total = 0;
    filtered.forEach((t) => (t.costos ?? []).forEach((c) => {
      if (!isInversionCost(c)) return;
      if (toMonthKey(c.fecha) === currentMonth) total += c.valor;
    }));
    return total;
  }, [filtered, currentMonth]);

  const llantasAnalizadas = useMemo(
    () => filtered.filter((t) => t.inspecciones?.length > 0).length,
    [filtered],
  );

  // Inversion breakdown by the TYPE of cost (compra_nueva vs reencauche),
  // not the tire's current vida. Grouping by vidaActual used to label a
  // new-tire purchase as "Fin de Vida" once the tire was scrapped — which
  // made users think scrap losses were being counted as investment.
  const inversionByVida = useMemo(() => {
    const CONCEPT_LABELS: Record<string, string> = {
      compra_nueva: "Llanta Nueva",
      reencauche:   "Reencauche",
      "":           "Llanta Nueva", // legacy rows without explicit concepto
    };
    const CONCEPT_COLORS: Record<string, string> = {
      compra_nueva: "#1E76B6",
      reencauche:   "#22c55e",
      "":           "#1E76B6",
    };
    const byConcept: Record<string, { total: number; count: number }> = {};
    filtered.forEach((t) => {
      (t.costos ?? []).forEach((c) => {
        if (!isInversionCost(c)) return;
        if (toMonthKey(c.fecha) !== currentMonth) return;
        const key = (c.concepto ?? "").toLowerCase().trim() || "compra_nueva";
        if (!byConcept[key]) byConcept[key] = { total: 0, count: 0 };
        byConcept[key].total += c.valor;
        byConcept[key].count++;
      });
    });
    const entries = Object.entries(byConcept)
      .map(([concept, { total, count }]) => ({
        vida: concept,
        label: CONCEPT_LABELS[concept] ?? concept,
        color: CONCEPT_COLORS[concept] ?? "#64748b",
        total,
        count,
      }))
      .sort((a, b) => b.total - a.total);
    const grandTotal = entries.reduce((s, e) => s + e.total, 0);
    return { entries, grandTotal };
  }, [filtered, currentMonth]);

  // Chart data: CPK evolution (km-weighted per month).
  // Prefers lifetimeCpk (sum-of-costs-across-all-vidas / total km) so the
  // line reflects true cost-per-km for the fleet, not just the current
  // vida. Falls back to cpkProyectado / cpk on inspections that predate
  // the lifetime column.
  const cpkEvolution = useMemo(() => {
    const byMonth: Record<string, { sumCpkKm: number; sumKm: number }> = {};
    filtered.forEach((t) => {
      if (!t.kilometrosRecorridos) return;
      (t.inspecciones ?? []).forEach((i) => {
        const cpkVal = (i.lifetimeCpk && i.lifetimeCpk > 0) ? i.lifetimeCpk
          : (i.cpkProyectado && i.cpkProyectado > 0) ? i.cpkProyectado
          : (i.cpk && i.cpk > 0) ? i.cpk : 0;
        if (cpkVal <= 0) return;
        const k = toMonthKey(i.fecha);
        if (!byMonth[k]) byMonth[k] = { sumCpkKm: 0, sumKm: 0 };
        byMonth[k].sumCpkKm += cpkVal * t.kilometrosRecorridos;
        byMonth[k].sumKm += t.kilometrosRecorridos;
      });
    });
    return months.map((m) => byMonth[m.key] && byMonth[m.key].sumKm > 0
      ? +(byMonth[m.key].sumCpkKm / byMonth[m.key].sumKm).toFixed(1)
      : null  // null = no data (not 0)
    );
  }, [filtered, months]);

  // Headline CPK: prefer the tire-level cached lifetimeCpk (already
  // sum_costs / sum_km for the tire), km-weighted across the fleet.
  const cpkProyectado = useMemo(() => {
    // First try: most recent month with data
    for (let i = cpkEvolution.length - 1; i >= 0; i--) {
      if (cpkEvolution[i] !== null && cpkEvolution[i]! > 0) return cpkEvolution[i]!;
    }
    // Fallback: use persisted lifetimeCpk on each tire, km-weighted.
    let sumCpkKm = 0, sumKm = 0;
    filtered.forEach((t) => {
      if (!t.kilometrosRecorridos) return;
      const tireCpk = (t.lifetimeCpk && t.lifetimeCpk > 0) ? t.lifetimeCpk
        : (t.currentCpk && t.currentCpk > 0) ? t.currentCpk : 0;
      if (tireCpk > 0) {
        sumCpkKm += tireCpk * t.kilometrosRecorridos;
        sumKm += t.kilometrosRecorridos;
      }
    });
    return sumKm > 0 ? +(sumCpkKm / sumKm).toFixed(1) : 0;
  }, [cpkEvolution, filtered]);

  // Chart data: Inversion mensual — same allowlist as the headline KPI
  // so scrap "dinero perdido" can never sneak into the monthly bars.
  const inversionMensual = useMemo(() => {
    const byMonth: Record<string, number> = {};
    filtered.forEach((t) => (t.costos ?? []).forEach((c) => {
      if (!isInversionCost(c)) return;
      const k = toMonthKey(c.fecha);
      byMonth[k] = (byMonth[k] || 0) + c.valor;
    }));
    return months.map((m) => byMonth[m.key] || 0);
  }, [filtered, months]);

  // Chart data: Dinero perdido
  const dineroPerdido = useMemo(() => {
    const byMonth: Record<string, number> = {};
    finTires.forEach((t) => {
      const depth = t.projectedProfundidad ?? t.currentProfundidad;
      if (!depth || !t.profundidadInicial || t.profundidadInicial <= 0) return;
      const totalCost = (t.costos ?? []).reduce((s, c) => s + c.valor, 0);
      const waste = (depth / t.profundidadInicial) * totalCost;
      if (waste <= 0) return;
      const lastCosto = [...(t.costos ?? [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
      byMonth[lastCosto ? toMonthKey(lastCosto.fecha) : currentMonth] = (byMonth[lastCosto ? toMonthKey(lastCosto.fecha) : currentMonth] || 0) + waste;
    });
    return months.map((m) => Math.round(byMonth[m.key] || 0));
  }, [finTires, months, currentMonth]);

  // Marca distribution (for PorMarca)
  const marcaData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((t) => { m[t.marca] = (m[t.marca] ?? 0) + 1; });
    return m;
  }, [filtered]);

  const bandaData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((t) => { m[t.diseno] = (m[t.diseno] ?? 0) + 1; });
    return m;
  }, [filtered]);

  const dimensionData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((t) => { const d = t.dimension?.trim(); if (d) m[d] = (m[d] ?? 0) + 1; });
    return m;
  }, [filtered]);

  const [vehicles, setVehicles] = useState<{ id: string; placa: string; tipovhc?: string }[]>([]);
  const [selectedEje, setSelectedEje] = useState("");

  useEffect(() => {
    if (!companyId) return;
    authFetch(`${API_BASE}/vehicles?companyId=${companyId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((v) => setVehicles(v))
      .catch(() => {});
  }, [companyId]);

  const vehiclesWithCount = useMemo(() => {
    const countByVehicle: Record<string, number> = {};
    filtered.forEach((t) => { if (t.vehicleId) countByVehicle[t.vehicleId] = (countByVehicle[t.vehicleId] ?? 0) + 1; });
    return vehicles.map((v) => ({ ...v, tireCount: countByVehicle[v.id] ?? 0 })).filter((v) => v.tireCount > 0);
  }, [vehicles, filtered]);

  // Best CPK combinations (nueva only)
  const topCpkCombinations = useMemo(() => {
    const groups: Record<string, { marca: string; diseno: string; dimension: string; cpks: number[]; count: number }> = {};
    filtered.forEach((t) => {
      if (t.vidaActual !== "nueva") return;
      if (!t.inspecciones?.length) return;
      const latest = [...t.inspecciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
      if (!latest.cpkProyectado || latest.cpkProyectado <= 0) return;
      const key = `${t.marca}|${t.dimension}|${t.diseno}`;
      if (!groups[key]) groups[key] = { marca: t.marca, diseno: t.diseno, dimension: t.dimension, cpks: [], count: 0 };
      groups[key].cpks.push(latest.cpkProyectado);
      groups[key].count++;
    });
    return Object.values(groups)
      .map((g) => ({ ...g, avgCpk: g.cpks.reduce((a, b) => a + b, 0) / g.cpks.length }))
      .sort((a, b) => a.avgCpk - b.avgCpk)
      .slice(0, 5);
  }, [filtered]);

  // -- Shared line chart builder ----------------------------------------------

  function makeLineOpts(
    data: (number | null)[],
    yFmt: (v: number) => string,
    tooltipLabel: (v: number) => string,
  ): ChartOptions<"line"> {
    const kp = keyPointLabels(data);
    const lastIdx = data.length - 1;
    const firstIdx = data.findIndex((v) => v !== null);
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 28, right: 55, left: 5 } },
      animation: { duration: 800, easing: "easeOutQuart" as const },
      elements: { line: { tension: 0.4, borderWidth: 2.5 }, point: { radius: 0, hoverRadius: 5 } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 0 } },
        y: { grid: { color: "rgba(52,140,203,0.06)" }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => yFmt(v as number) } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, borderWidth: 0, titleFont: { size: 12, weight: "bold" }, bodyFont: { size: 12 }, callbacks: { label: (ctx) => tooltipLabel(ctx.parsed.y) } },
        datalabels: {
          display: (ctx) => kp.has(ctx.dataIndex),
          align: (ctx) => {
            if (ctx.dataIndex >= lastIdx) return "left" as const;
            if (ctx.dataIndex <= firstIdx) return "right" as const;
            return "top" as const;
          },
          anchor: (ctx) => ctx.dataIndex >= lastIdx ? "center" as const : "end" as const,
          offset: 6,
          clamp: true,
          color: "#1E76B6",
          font: { size: 11, weight: "bold" as const },
          backgroundColor: "rgba(30,118,182,0.1)",
          borderRadius: 4,
          padding: { top: 3, bottom: 3, left: 6, right: 6 },
          formatter: (v: number | null) => (v !== null && v !== 0) ? yFmt(v) : "",
        },
      },
    };
  }

  function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function makeLineData(data: (number | null)[], color: string): ChartData<"line"> {
    return {
      labels: months.map((m) => m.label),
      datasets: [{
        data,
        borderColor: color,
        pointBackgroundColor: color,
        fill: true,
        backgroundColor: (ctx) => {
          const { ctx: context } = ctx.chart;
          return createGradient(context, hexToRgba(color, 0.18), hexToRgba(color, 0.0));
        },
      }],
    };
  }

  function makeBarData(data: (number | null)[], color: string): ChartData<"bar"> {
    return {
      labels: months.map((m) => m.label),
      datasets: [{
        data,
        backgroundColor: data.map((_, i) => i === data.length - 1 ? color : hexToRgba(color, 0.55)),
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
      }],
    };
  }

  function makeBarOpts(
    data: (number | null)[],
    yFmt: (v: number) => string,
    tooltipLabel: (v: number) => string,
  ): ChartOptions<"bar"> {
    const kp = keyPointLabels(data);
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 28, right: 10, left: 5 } },
      animation: { duration: 800, easing: "easeOutQuart" as const },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 0 } },
        y: { grid: { color: "rgba(52,140,203,0.06)" }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => yFmt(v as number) } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, borderWidth: 0, titleFont: { size: 12, weight: "bold" }, bodyFont: { size: 12 }, callbacks: { label: (ctx) => tooltipLabel(ctx.parsed.y) } },
        datalabels: {
          display: (ctx) => kp.has(ctx.dataIndex),
          anchor: "end" as const,
          align: "top" as const,
          offset: 4,
          clamp: true,
          color: "#1E76B6",
          font: { size: 10, weight: "bold" as const },
          backgroundColor: "rgba(30,118,182,0.1)",
          borderRadius: 4,
          padding: { top: 2, bottom: 2, left: 5, right: 5 },
          formatter: (v: number | null) => (v !== null && v !== 0) ? yFmt(v) : "",
        },
      },
    };
  }

  // -- Export ------------------------------------------------------------------

  // Export is a real, co-branded vector PDF (jsPDF) built by resumenReportPdf,
  // NOT a screenshot of the on-screen charts. The dashboard charts are chart.js
  // canvases tuned for a dark interactive UI, and the app is on Tailwind v4
  // (oklch theme) which html2canvas can't parse — both make for ugly,
  // page-splitting printouts. Clicking Exportar opens a modal where the user
  // picks a template, an accent color, the sections, edits the title/company/
  // note, and — crucially — RE-FILTERS the data (brand / axle / life / date
  // range) so the same dashboard can produce, say, a 2027 board review.
  //
  // The modal owns its own filter state and re-derives the data via
  // buildResumenReportData (which mirrors the dashboard's aggregation math but
  // with a dynamic month window). We just hand it the raw tire snapshot and a
  // builder bound to the current company branding.
  const [exportOpen, setExportOpen] = useState(false);

  // Default the export filters to whatever the dashboard is currently showing.
  // Memoised so the modal doesn't reset the user's in-modal tweaks on every
  // parent re-render.
  const exportDefaultFilters = useMemo<ReportFilterOpts>(() => ({
    marca:    filterValues.marca || "Todos",
    eje:      filterValues.eje   || "Todos",
    vida:     filterValues.vida  || "Todos",
    search:   filterSearch,
    dateFrom: inspectionFrom,
    dateTo:   inspectionTo,
  }), [filterValues, filterSearch, inspectionFrom, inspectionTo]);

  const buildExportData = useCallback(
    (opts: ReportFilterOpts) =>
      buildResumenReportData(tires, opts, { name: companyName, logo: companyLogo }, tires.length),
    [tires, companyName, companyLogo],
  );

  const rankColors = ["#D4AF37", "#94A3B8", "#CD7F32", "#348CCB", "#348CCB"];
  const chartKey = `${Object.values(filterValues).join("-")}-${filterSearch}-${filtered.length}`;

  // ===========================================================================
  // Dashboard layout — customizable widget order + visibility
  // ===========================================================================

  type WidgetDef = { id: string; label: string; fullWidth?: boolean };

  const ALL_WIDGETS: WidgetDef[] = [
    // -- Resumen native --
    { id: "cpk_evolution",       label: "CPK Proyectado" },
    { id: "por_vida",            label: "Llantas por Vida" },
    { id: "inversion_mensual",   label: "Inversión Mensual" },
    { id: "por_marca",           label: "Llantas por Marca" },
    { id: "dinero_perdido",      label: "Dinero Perdido" },
    { id: "inversion_categoria", label: "Inversión por Categoría" },
    { id: "mejores_cpk",         label: "Mejores Combinaciones CPK", fullWidth: true },
    { id: "inspecciones_dia",    label: "Reporte de Inspecciones",   fullWidth: true },
    // -- From Detalle (hidden by default) --
    { id: "semaforo_pie",        label: "Semáforo" },
    { id: "por_banda",           label: "Llantas por Banda" },
    { id: "por_dimension",       label: "Llantas por Dimensión" },
    { id: "promedio_eje",        label: "Profundidad por Eje" },
    { id: "tipo_vehiculo",       label: "Tipo de Vehículo" },
    { id: "historic_chart",      label: "Histórico Inspecciones" },
    { id: "reencauche_hist",     label: "Reencauche Histórico" },
    { id: "tanque_milimetro",    label: "Tanque Milimétrico" },
    { id: "proyeccion_vida",     label: "Proyección de Vida" },
  ];

  const STORAGE_KEY = "tirepro_dashboard_layout";

  type LayoutState = { order: string[]; hidden: string[] };

  const DETALLE_WIDGET_IDS = ["semaforo_pie", "por_banda", "por_dimension", "promedio_eje", "tipo_vehiculo", "historic_chart", "reencauche_hist", "tanque_milimetro", "proyeccion_vida"];

  const defaultLayout: LayoutState = {
    order: ALL_WIDGETS.map((w) => w.id),
    hidden: DETALLE_WIDGET_IDS,
  };

  function loadLayout(): LayoutState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultLayout;
      const parsed = JSON.parse(raw) as Partial<LayoutState>;
      const allIds = new Set(ALL_WIDGETS.map((w) => w.id));
      const order = (parsed.order ?? []).filter((id: string) => allIds.has(id));
      ALL_WIDGETS.forEach((w) => { if (!order.includes(w.id)) order.push(w.id); });
      return { order, hidden: (parsed.hidden ?? []).filter((id: string) => allIds.has(id)) };
    } catch { return defaultLayout; }
  }

  const [layout, setLayout] = useState<LayoutState>(defaultLayout);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { setLayout(loadLayout()); }, []);

  function saveLayout(next: LayoutState) {
    setLayout(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* */ }
  }

  function moveWidget(id: string, dir: -1 | 1) {
    const idx = layout.order.indexOf(id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= layout.order.length) return;
    const next = [...layout.order];
    [next[idx], next[target]] = [next[target], next[idx]];
    saveLayout({ ...layout, order: next });
  }

  function toggleHidden(id: string) {
    const isHidden = layout.hidden.includes(id);
    const next = isHidden
      ? layout.hidden.filter((h) => h !== id)
      : [...layout.hidden, id];
    saveLayout({ ...layout, hidden: next });
  }

  function resetLayout() {
    saveLayout(defaultLayout);
  }

  const visibleWidgets = layout.order.filter((id) => !layout.hidden.includes(id));
  const hiddenWidgets = layout.order.filter((id) => layout.hidden.includes(id));

  // -- Render -----------------------------------------------------------------

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      {/* -- HEADER ---------------------------------------------------------- */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
        style={{
          background: "rgba(248,250,252,0.85)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          borderBottom: "1px solid rgba(10,24,58,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">Mi Resumen</h1>
            <p className="text-xs text-[#173D68]/50 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Actualizado: {new Date().toLocaleDateString("es-CO")}
              {userName && <> &middot; Bienvenido, {userName}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode((v) => !v)}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
              editMode
                ? "bg-[#0A183A] text-white"
                : "text-[#173D68]/60 hover:bg-[#0A183A]/[0.04] hover:text-[#173D68]",
            ].join(" ")}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{editMode ? "Listo" : "Editar"}</span>
          </button>
          <button
            onClick={() => setExportOpen(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#173D68]/60 hover:bg-[#0A183A]/[0.04] hover:text-[#173D68] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Streaming progress bar — sticky under the header while tires load */}
      <LoadProgressBar streaming={streaming} loaded={loadedTires} expected={expectedTires} />

      {/* -- CONTENT --------------------------------------------------------- */}
      <div
        ref={contentRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 transition-opacity duration-200"
        style={{
          opacity: filterPending ? 0.55 : 1,
          pointerEvents: filterPending ? "none" : "auto",
        }}
      >
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(10,24,58,0.06)", border: "1px solid rgba(10,24,58,0.2)" }}>
            <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-[#0A183A]">{error}</span>
            <button onClick={() => setError("")} className="text-[#348CCB] hover:text-[#0A183A]"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? (
          // Friendly loading state — live tire count + progress so the
          // user sees motion instead of a static spinner. The sticky
          // progress bar already gives the percentage up top; this is the
          // mid-page reassurance.
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[#1E76B6]/15" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1E76B6] animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-[#0A183A]">
                {loadedTires > 0
                  ? `Cargando ${loadedTires.toLocaleString("es-CO")} llantas…`
                  : "Preparando tu panel…"}
              </p>
              {expectedTires > 0 && (
                <p className="text-[11px] text-gray-500 mt-1 tabular-nums">
                  {Math.min(100, Math.round((loadedTires / expectedTires) * 100))}% de {expectedTires.toLocaleString("es-CO")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards — always visible, not part of widget system */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Llantas" value={filtered.length.toLocaleString("es-CO")} subtitle={filtered.length !== tires.length ? `de ${tires.length} totales` : undefined} />
              <MetricCard label="Inversion del Mes" value={fmtCOPCompact(inversionMes)} subtitle={inversionMes >= 1000 ? fmtCOP(inversionMes) : undefined} />
              <MetricCard label="CPK Proyectado Flota" value={cpkProyectado > 0 ? fmtCOP(+cpkProyectado.toFixed(1)) : "--"} />
              <MetricCard label="Llantas Analizadas" value={llantasAnalizadas.toLocaleString("es-CO")} subtitle={`de ${filtered.length.toLocaleString("es-CO")} filtradas`} />
            </div>

            {/* Hidden widgets restore panel — only in edit mode */}
            {editMode && hiddenWidgets.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{ border: '1px dashed rgba(10,24,58,0.15)', background: 'rgba(10,24,58,0.02)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <EyeOff className="w-3.5 h-3.5 text-[#173D68]/40" />
                  <p className="text-[11px] font-medium text-[#173D68]/50 uppercase tracking-wider">Widgets ocultos</p>
                  <button
                    onClick={resetLayout}
                    className="ml-auto flex items-center gap-1 text-[11px] font-medium text-[#A374FF] hover:text-[#0A183A] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Restablecer todo
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hiddenWidgets.map((id) => {
                    const w = ALL_WIDGETS.find((w) => w.id === id);
                    if (!w) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => toggleHidden(id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#173D68]/60 hover:text-[#0A183A] hover:bg-white transition-colors"
                        style={{ border: '1px solid rgba(10,24,58,0.08)' }}
                      >
                        <Eye className="w-3 h-3" /> {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customizable widget grid */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 ${editMode ? "pt-3" : ""}`} style={editMode ? { overflow: 'visible' } : undefined}>
              {visibleWidgets.map((id, idx) => {
                const def = ALL_WIDGETS.find((w) => w.id === id);
                if (!def) return null;
                const isFirst = idx === 0;
                const isLast = idx === visibleWidgets.length - 1;

                const widgetContent = (() => {
                  switch (id) {
                    case "cpk_evolution":
                      return (
                        <CardWrap title="CPK Proyectado" description="Promedio ponderado por km del CPK proyectado de la flota en los ultimos 12 meses.">
                          <Bar key={`cpk-${chartKey}`} data={makeBarData(cpkEvolution, COLORS.accent)} options={makeBarOpts(cpkEvolution, (v) => fmtCOP(v), (v) => `CPK Proy: ${fmtCOP(v)}`)} />
                        </CardWrap>
                      );
                    case "por_vida":
                      return <PorVida tires={filtered.map((t) => ({ id: t.id, vida: [{ valor: t.vidaActual ?? "nueva", fecha: new Date().toISOString() }] }))} />;
                    case "inversion_mensual":
                      return (
                        <CardWrap title="Inversión Mensual" description="Total invertido en llantas por mes incluyendo compras nuevas, reencauches y reparaciones.">
                          <Bar key={`inv-${chartKey}`} data={makeBarData(inversionMensual, COLORS.accent)} options={makeBarOpts(inversionMensual, (v) => `${(v / 1e6).toFixed(1)}M`, (v) => fmtCOP(v))} />
                        </CardWrap>
                      );
                    case "por_marca":
                      return <PorMarca groupData={marcaData} />;
                    case "dinero_perdido":
                      return (
                        <CardWrap title="Dinero Perdido por Desecho" description="Dinero estimado perdido cuando llantas se desechan con profundidad remanente.">
                          <Line key={`perdido-${chartKey}`} data={makeLineData(dineroPerdido, "#f97316")} options={makeLineOpts(dineroPerdido, (v) => `${(v / 1e6).toFixed(1)}M`, (v) => `Perdida: ${fmtCOP(v)}`)} />
                        </CardWrap>
                      );
                    case "inversion_categoria":
                      return (
                        <div className="bg-white rounded-2xl overflow-hidden w-full transition-all duration-200" style={{ border: '1px solid rgba(10,24,58,0.08)', boxShadow: '0 2px 12px -4px rgba(10,24,58,0.08)' }}>
                          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid rgba(10,24,58,0.06)' }}>
                            <h2 className="text-sm font-bold text-[#0A183A] truncate">Inversión por Categoría</h2>
                          </div>
                          <div className="p-4 sm:p-6">
                            {inversionByVida.entries.length === 0 ? (
                              <div className="h-64 sm:h-72 flex items-center justify-center"><p className="text-sm text-gray-400">Sin costos este mes.</p></div>
                            ) : (
                              <div className="h-64 sm:h-72 flex flex-col justify-between">
                                <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-gray-100">
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total del mes</span>
                                  <span className="text-xl font-black text-[#0A183A]">{fmtCOP(inversionByVida.grandTotal)}</span>
                                </div>
                                <div className="flex-1 space-y-3 overflow-y-auto">
                                  {inversionByVida.entries.map((entry) => {
                                    const pct = inversionByVida.grandTotal > 0 ? Math.max(2, (entry.total / inversionByVida.grandTotal) * 100) : 0;
                                    return (
                                      <div key={entry.vida}>
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                                            <span className="text-xs font-bold text-[#0A183A]">{entry.label}</span>
                                            <span className="text-[10px] text-gray-400">({entry.count})</span>
                                          </div>
                                          <span className="text-xs font-black text-[#0A183A]">{fmtCOP(entry.total)}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: entry.color }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    case "mejores_cpk":
                      return topCpkCombinations.length > 0 ? (
                        <div className="bg-white rounded-2xl p-4 sm:p-5 transition-all duration-200" style={{ border: '1px solid rgba(10,24,58,0.08)', boxShadow: '0 2px 12px -4px rgba(10,24,58,0.08)' }}>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(163,116,255,0.08)' }}><Award className="w-3.5 h-3.5 text-[#A374FF]" /></div>
                            <h3 className="text-sm font-bold text-[#0A183A]">Mejores Combinaciones CPK</h3>
                          </div>
                          <div className="flex flex-col gap-2">
                            {topCpkCombinations.map((combo, i) => (
                              <div key={`${combo.marca}-${combo.diseno}-${combo.dimension}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[#F8FAFC]" style={{ border: '1px solid rgba(10,24,58,0.05)' }}>
                                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: rankColors[i] }}>{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold text-[#0A183A] truncate">{combo.marca} {combo.diseno}</p>
                                  <p className="text-[11px] text-[#173D68]/40">{combo.dimension} · {combo.count} {combo.count === 1 ? "llanta" : "llantas"}</p>
                                </div>
                                <p className="text-sm font-bold text-[#0A183A] tabular-nums flex-shrink-0">{fmtCOP(+combo.avgCpk.toFixed(1))}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    case "inspecciones_dia":
                      return <InspectionsDayReportCard companyId={companyId} />;
                    // -- Detalle widgets --
                    case "semaforo_pie":
                      return <SemaforoPie tires={filtered as any} language="es" />;
                    case "por_banda":
                      return <PorBanda groupData={bandaData} />;
                    case "por_dimension":
                      return <PorDimension groupData={dimensionData} />;
                    case "promedio_eje":
                      return <PromedioEje tires={filtered as any} onSelectEje={(eje: string | null) => setSelectedEje(eje ?? "")} selectedEje={selectedEje} />;
                    case "tipo_vehiculo":
                      return <TipoVehiculo vehicles={vehiclesWithCount as any} />;
                    case "historic_chart":
                      return <HistoricChart tires={filtered as any} language="es" />;
                    case "reencauche_hist":
                      return <ReencaucheHistorico tires={filtered as any} language="es" />;
                    case "tanque_milimetro":
                      return <TanqueMilimetro tires={filtered as any} language="es" />;
                    case "proyeccion_vida":
                      return <ProyeccionVida tires={filtered as any} />;
                    default: return null;
                  }
                })();

                if (!widgetContent) return null;

                return (
                  <div
                    key={id}
                    className={`${def.fullWidth ? "lg:col-span-2" : ""} ${editMode ? "relative z-0" : ""}`}
                    style={editMode ? { overflow: "visible" } : undefined}
                  >
                    {/* Edit controls */}
                    {editMode && (
                      <div
                        className="absolute flex items-center gap-0.5 rounded-lg p-0.5"
                        style={{
                          top: -10,
                          right: -4,
                          zIndex: 30,
                          background: 'white',
                          border: '1px solid rgba(10,24,58,0.1)',
                          boxShadow: '0 4px 12px rgba(10,24,58,0.12)',
                        }}
                      >
                        <button
                          onClick={() => moveWidget(id, -1)}
                          disabled={isFirst}
                          className="p-1.5 rounded-md hover:bg-[#F8FAFC] disabled:opacity-20 transition-colors"
                          title="Mover arriba"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-[#0A183A]" />
                        </button>
                        <button
                          onClick={() => moveWidget(id, 1)}
                          disabled={isLast}
                          className="p-1.5 rounded-md hover:bg-[#F8FAFC] disabled:opacity-20 transition-colors"
                          title="Mover abajo"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-[#0A183A]" />
                        </button>
                        <div className="w-px h-4 bg-[#0A183A]/10 mx-0.5" />
                        <button
                          onClick={() => toggleHidden(id)}
                          className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                          title="Ocultar widget"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    )}
                    {/* Dashed border overlay */}
                    {editMode && (
                      <div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ border: '2px dashed rgba(163,116,255,0.3)', zIndex: 20 }}
                      />
                    )}
                    {widgetContent}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {!loading && (
        <>
          {isAdmin && <AnaFab />}
          <FilterFab
            filters={filterOptions}
            values={filterValues}
            onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
            search={filterSearch}
            onSearchChange={setFilterSearch}
            searchPlaceholder="Buscar por placa o marca..."
            advancedConditions={advancedConditions}
            onAdvancedChange={setAdvancedConditions}
            dateFrom={inspectionFrom}
            dateTo={inspectionTo}
            onDateRangeChange={(from, to) => { setInspectionFrom(from); setInspectionTo(to); }}
            dateRangeLabel="Rango de inspecciones"
          />
        </>
      )}

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        buildData={buildExportData}
        defaultFilters={exportDefaultFilters}
        marcaOptions={filterOptions.find((f) => f.key === "marca")?.options ?? []}
        ejeOptions={filterOptions.find((f) => f.key === "eje")?.options ?? []}
        defaultTitle="Reporte de Resumen"
        defaultCompany={companyName}
        defaultPreparedBy={userName}
      />
    </div>
  );
}
