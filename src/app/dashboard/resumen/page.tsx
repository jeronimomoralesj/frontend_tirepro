"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Award,
  Calendar,
  AlertCircle,
  X,
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
import PorVida from "../cards/PorVida";
import PorMarca from "../cards/PorMarca";
import FilterFab from "../components/FilterFab";
import type { FilterOption } from "../components/FilterFab";

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
        className="relative z-10 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full"
      >
        <div className="bg-[#173D68] text-white p-4 sm:p-5 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold">{title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {description && (
              <div className="relative cursor-pointer" title={description}>
                <svg className="peer w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
                </svg>
                <div className="absolute z-20 -top-2 right-full mr-2 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 peer-hover:opacity-100 transition-opacity duration-300 w-48 sm:w-56 pointer-events-none shadow-xl">
                  <p>{description}</p>
                </div>
              </div>
            )}
          </div>
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

export default function ResumenPage() {
  const router = useRouter();
  const [tires, setTires] = useState<RawTire[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    marca: "Todos", eje: "Todos", vida: "Todos",
  });
  const [filterSearch, setFilterSearch] = useState("");

  // -- Fetch ------------------------------------------------------------------

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    let user: { companyId?: string; name?: string };
    try { user = JSON.parse(stored); } catch { router.push("/login"); return; }
    if (user.name) setUserName(user.name);
    if (!user.companyId) return;

    setLoading(true);
    // Cursor-paginated fetch: backend returns slim tire payloads in chunks
    // of 500, each Redis-cached independently. Drop-in replacement for the
    // old /tires?slim=true call — returns the same flat array shape.
    import('@/shared/fetchTiresPaged')
      .then(({ fetchTiresPaged }) => fetchTiresPaged<RawTire>(user.companyId!))
      .then((data) => setTires(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  // -- Derived data -----------------------------------------------------------

  const months = useMemo(() => getLast12Months(), []);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const filterOptions: FilterOption[] = useMemo(() => [
    { key: "marca", label: "Marca", options: ["Todos", ...Array.from(new Set(tires.map((t) => t.marca))).sort()] },
    { key: "eje", label: "Eje", options: ["Todos", ...Array.from(new Set(tires.map((t) => t.eje))).sort()] },
    { key: "vida", label: "Vida", options: ["Todos", "nueva", "reencauche1", "reencauche2", "reencauche3", "fin"] },
  ], [tires]);

  const filtered = useMemo(() => {
    // Exclude fin de vida unless explicitly selected
    let result = tires;
    if (!filterValues.vida || filterValues.vida === "Todos")
      result = result.filter((t) => t.vidaActual !== "fin");
    else
      result = result.filter((t) => t.vidaActual === filterValues.vida);
    if (filterValues.marca && filterValues.marca !== "Todos")
      result = result.filter((t) => t.marca === filterValues.marca);
    if (filterValues.eje && filterValues.eje !== "Todos")
      result = result.filter((t) => t.eje === filterValues.eje);
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      result = result.filter((t) => t.placa.toLowerCase().includes(q) || t.marca.toLowerCase().includes(q));
    }
    return result;
  }, [tires, filterValues, filterSearch]);

  // Fin-de-vida tires (for dinero perdido — applies marca/eje/search but always keeps only fin)
  const finTires = useMemo(() => {
    let result = tires.filter((t) => t.vidaActual === "fin");
    if (filterValues.marca && filterValues.marca !== "Todos")
      result = result.filter((t) => t.marca === filterValues.marca);
    if (filterValues.eje && filterValues.eje !== "Todos")
      result = result.filter((t) => t.eje === filterValues.eje);
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      result = result.filter((t) => t.placa.toLowerCase().includes(q) || t.marca.toLowerCase().includes(q));
    }
    return result;
  }, [tires, filterValues, filterSearch]);

  const inversionMes = useMemo(() => {
    let total = 0;
    tires.forEach((t) => (t.costos ?? []).forEach((c) => {
      if (!isInversionCost(c)) return;
      if (toMonthKey(c.fecha) === currentMonth) total += c.valor;
    }));
    return total;
  }, [tires, currentMonth]);

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
    tires.forEach((t) => {
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
  }, [tires, currentMonth]);

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

  const handleExport = useCallback(() => {
    const style = document.createElement("style");
    style.innerHTML = `@media print { body * { visibility: hidden } #resumen-print, #resumen-print * { visibility: visible } #resumen-print { position: absolute; left: 0; top: 0; width: 100% } }`;
    document.head.appendChild(style);
    if (contentRef.current) contentRef.current.id = "resumen-print";
    setTimeout(() => { window.print(); setTimeout(() => { document.head.removeChild(style); if (contentRef.current) contentRef.current.removeAttribute("id"); }, 500); }, 300);
  }, []);

  const rankColors = ["#D4AF37", "#94A3B8", "#CD7F32", "#348CCB", "#348CCB"];
  const chartKey = `${Object.values(filterValues).join("-")}-${filterSearch}-${filtered.length}`;

  // -- Render -----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-white">
      {/* -- HEADER ---------------------------------------------------------- */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">Mi Resumen</h1>
            <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Actualizado: {new Date().toLocaleDateString("es-CO")}
              {userName && <> &middot; Bienvenido, {userName}</>}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      {/* -- CONTENT --------------------------------------------------------- */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(10,24,58,0.06)", border: "1px solid rgba(10,24,58,0.2)" }}>
            <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-[#0A183A]">{error}</span>
            <button onClick={() => setError("")} className="text-[#348CCB] hover:text-[#0A183A]"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Cargando datos...</span>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Llantas" value={filtered.length.toLocaleString("es-CO")} subtitle={filtered.length !== tires.length ? `de ${tires.length} totales` : undefined} />
              <MetricCard label="Inversion del Mes" value={fmtCOPCompact(inversionMes)} subtitle={inversionMes >= 1000 ? fmtCOP(inversionMes) : undefined} />
              <MetricCard label="CPK Proyectado Flota" value={cpkProyectado > 0 ? fmtCOP(+cpkProyectado.toFixed(1)) : "--"} />
              <MetricCard label="Llantas Analizadas" value={llantasAnalizadas.toLocaleString("es-CO")} subtitle={`de ${filtered.length.toLocaleString("es-CO")} filtradas`} />
            </div>

            {/* Row 1: CPK Evolution + Por Vida */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CardWrap
                title="CPK Proyectado"
                description="Promedio ponderado por km del CPK proyectado de la flota en los ultimos 12 meses. Un valor menor indica mejor rendimiento por kilometro."
              >
                <Bar
                  key={`cpk-${chartKey}`}
                  data={makeBarData(cpkEvolution, COLORS.accent)}
                  options={makeBarOpts(cpkEvolution, (v) => fmtCOP(v), (v) => `CPK Proy: ${fmtCOP(v)}`)}
                />
              </CardWrap>
              <PorVida tires={filtered.map((t) => ({ id: t.id, vida: [{ valor: t.vidaActual ?? "nueva", fecha: new Date().toISOString() }] }))} />
            </div>

            {/* Row 2: Inversion Mensual + Por Marca */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <CardWrap
                title="Inversion Mensual"
                description="Total invertido en llantas por mes incluyendo compras nuevas, reencauches y reparaciones."
              >
                <Bar
                  key={`inv-${chartKey}`}
                  data={makeBarData(inversionMensual, COLORS.accent)}
                  options={makeBarOpts(inversionMensual, (v) => `${(v / 1e6).toFixed(1)}M`, (v) => fmtCOP(v))}
                />
              </CardWrap>
              <PorMarca groupData={marcaData} />
            </div>

            {/* Row 3: Dinero Perdido + Inversion por Categoria */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CardWrap
                title="Dinero Perdido por Desecho"
                description="Dinero estimado perdido cuando llantas se desechan con profundidad remanente. Calculado como la proporcion de profundidad restante sobre el costo total."
              >
                <Line
                  key={`perdido-${chartKey}`}
                  data={makeLineData(dineroPerdido, "#f97316")}
                  options={makeLineOpts(dineroPerdido, (v) => `${(v / 1e6).toFixed(1)}M`, (v) => `Perdida: ${fmtCOP(v)}`)}
                />
              </CardWrap>

              {/* Inversion por Categoria este mes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
                <div className="bg-[#173D68] text-white p-4 sm:p-5 flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold">Inversión del Mes por Categoría</h2>
                  <div className="group relative cursor-pointer shrink-0 ml-2" title="Desglose de costos registrados este mes agrupados por etapa de vida de la llanta (nueva, reencauche 1-3, fin de vida).">
                    <svg className="w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
                    </svg>
                    <div className="absolute z-20 -top-2 right-full mr-2 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-48 sm:w-56 pointer-events-none shadow-xl">
                      <p>Desglose de costos registrados este mes agrupados por etapa de vida de la llanta.</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {inversionByVida.entries.length === 0 ? (
                    <div className="h-64 sm:h-72 flex items-center justify-center">
                      <p className="text-sm text-gray-400">Sin costos registrados este mes.</p>
                    </div>
                  ) : (
                    <div className="h-64 sm:h-72 flex flex-col justify-between">
                      {/* Total header */}
                      <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-gray-100">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total del mes</span>
                        <span className="text-xl font-black text-[#0A183A]">{fmtCOP(inversionByVida.grandTotal)}</span>
                      </div>

                      {/* Category bars */}
                      <div className="flex-1 space-y-3 overflow-y-auto">
                        {inversionByVida.entries.map((entry) => {
                          const pct = inversionByVida.grandTotal > 0
                            ? Math.max(2, (entry.total / inversionByVida.grandTotal) * 100)
                            : 0;
                          return (
                            <div key={entry.vida}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                                  <span className="text-xs font-bold text-[#0A183A]">{entry.label}</span>
                                  <span className="text-[10px] text-gray-400">({entry.count} llanta{entry.count !== 1 ? "s" : ""})</span>
                                </div>
                                <span className="text-xs font-black text-[#0A183A]">{fmtCOP(entry.total)}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: entry.color }}
                                />
                              </div>
                              <div className="text-right mt-0.5">
                                <span className="text-[9px] text-gray-400">
                                  {inversionByVida.grandTotal > 0 ? Math.round((entry.total / inversionByVida.grandTotal) * 100) : 0}% del total
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mejores Combinaciones CPK */}
            {topCpkCombinations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-[#348CCB]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#348CCB]">
                    Mejores Combinaciones CPK Proyectado
                  </h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  {topCpkCombinations.map((combo, i) => (
                    <div
                      key={`${combo.marca}-${combo.diseno}-${combo.dimension}`}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl border-l-4"
                      style={{ borderLeftColor: rankColors[i], background: "rgba(10,24,58,0.015)" }}
                    >
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ background: rankColors[i] }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A183A] truncate">{combo.marca} {combo.diseno}</p>
                        <p className="text-xs text-gray-400">{combo.dimension}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black text-[#0A183A]">{fmtCOP(+combo.avgCpk.toFixed(1))}</p>
                        <p className="text-[10px] text-gray-400">{combo.count} {combo.count === 1 ? "llanta" : "llantas"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && (
        <FilterFab
          filters={filterOptions}
          values={filterValues}
          onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
          search={filterSearch}
          onSearchChange={setFilterSearch}
          searchPlaceholder="Buscar por placa o marca..."
        />
      )}
    </div>
  );
}
