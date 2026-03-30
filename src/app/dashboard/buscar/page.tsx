"use client";

import React, { useState, useMemo } from "react";
import {
  Search, Car, X, Info, ChevronDown, Eye, Circle, BarChart3,
  Calendar, Ruler, Repeat, Trash2, Pencil, CheckCircle, Check,
  AlertCircle, Loader2, Activity, DollarSign, Gauge,
  AlertTriangle, Shield, ChevronRight, Zap, Layers,
  CheckCircle2, Timer, AlertOctagon, RotateCcw,
} from "lucide-react";
import AgentCardHeader from "../../../components/AgentCardHeader";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Filler, BarElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler, BarElement,
);

// =============================================================================
// Types
// =============================================================================
export type RawCosto = { valor: number; fecha: string | Date };
export type RawInspeccion = {
  id?: string; tireId?: string; fecha: string | Date;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk?: number | null; cpkProyectado?: number | null;
  cpt?: number | null; cptProyectado?: number | null;
  diasEnUso?: number | null; mesesEnUso?: number | null;
  kilometrosEstimados?: number | null; kmActualVehiculo?: number | null;
  kmEfectivos?: number | null; kmProyectado?: number | null;
  imageUrl?: string | null; presionPsi?: number | null;
  presionRecomendadaPsi?: number | null; presionDelta?: number | null;
  inspeccionadoPorNombre?: string | null;
};
export type RawEvento = {
  id?: string; tireId?: string; tipo: string;
  fecha: string | Date; notas?: string | null; metadata?: Record<string, unknown> | null;
};
export type RawTire = {
  id: string; placa: string; marca: string; diseno: string;
  profundidadInicial: number; dimension: string; eje: string;
  posicion: number; companyId: string; vehicleId?: string | null;
  fechaInstalacion?: string | Date | null; diasAcumulados?: number;
  kilometrosRecorridos: number; alertLevel?: string;
  healthScore?: number | null; currentCpk?: number | null;
  currentProfundidad?: number | null; projectedDateEOL?: string | Date | null;
  primeraVida?: Array<{ cpk?: number; diseno?: string; costo?: number; kilometros?: number }>;
  desechos?: unknown; costos: RawCosto[]; inspecciones: RawInspeccion[]; eventos: RawEvento[];
};
export type CostEntry = { valor: number; fecha: string };
export type Inspection = {
  fecha: string;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk: number | null; cpkProyectado: number | null;
  cpt: number | null; cptProyectado: number | null;
  kilometrosEstimados: number | null; kmProyectado: number | null;
  imageUrl: string | null; presionPsi: number | null;
  presionRecomendadaPsi: number | null; presionDelta: number | null;
  inspeccionadoPorNombre: string | null;
};
export type VidaEntry = { valor: string; fecha: string };
export type Tire = {
  id: string; placa: string; marca: string; diseno: string;
  profundidadInicial: number; dimension: string; eje: string;
  posicion: number; companyId: string; vehicleId?: string | null;
  fechaInstalacion?: string | null; diasAcumulados?: number;
  kilometrosRecorridos: number; alertLevel?: string;
  healthScore?: number | null; currentCpk?: number | null;
  currentProfundidad?: number | null;
  primeraVida?: Array<{ cpk?: number; diseno?: string; costo?: number; kilometros?: number }>;
  costo: CostEntry[]; inspecciones: Inspection[]; vida: VidaEntry[];
};
export type Vehicle = { id: string; placa: string; tipovhc?: string; carga?: string };

// =============================================================================
// API helpers
// =============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

function toISO(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

const VIDA_SET = new Set(["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"]);

function normalise(raw: RawTire): Tire {
  const costo: CostEntry[] = [...raw.costos]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((c) => ({ valor: typeof c.valor === "number" ? c.valor : 0, fecha: toISO(c.fecha) }));
  const inspecciones: Inspection[] = [...raw.inspecciones]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((i) => ({
      fecha: toISO(i.fecha),
      profundidadInt: i.profundidadInt ?? 0,
      profundidadCen: i.profundidadCen ?? 0,
      profundidadExt: i.profundidadExt ?? 0,
      cpk: i.cpk ?? null, cpkProyectado: i.cpkProyectado ?? null,
      cpt: i.cpt ?? null, cptProyectado: i.cptProyectado ?? null,
      kilometrosEstimados: i.kilometrosEstimados ?? null,
      kmProyectado: i.kmProyectado ?? null,
      imageUrl: i.imageUrl ?? null,
      presionPsi: i.presionPsi ?? null,
      inspeccionadoPorNombre: i.inspeccionadoPorNombre ?? null,
      presionRecomendadaPsi: i.presionRecomendadaPsi ?? null,
      presionDelta: i.presionDelta ?? null,
    }));
  const vida: VidaEntry[] = raw.eventos
    .filter((e) => e.notas && VIDA_SET.has(e.notas.toLowerCase()))
    .map((e) => ({ valor: e.notas!.toLowerCase(), fecha: toISO(e.fecha) }));
  return {
    ...raw, costo, inspecciones, vida,
    fechaInstalacion: raw.fechaInstalacion ? toISO(raw.fechaInstalacion) : null,
  };
}

// =============================================================================
// Semaforo classification — mirrors SemaforoPie exactly
// >7mm Óptimo | >6mm 60 días | >3mm 30 días | <=3mm Urgente
// =============================================================================
type SemaforoCondition = "buenEstado" | "dias60" | "dias30" | "cambioInmediato";

function getSemaforoCondition(tire: Tire): SemaforoCondition | null {
  if (!tire.inspecciones.length) return null;
  const last = tire.inspecciones[tire.inspecciones.length - 1];
  const minDepth = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
  if (minDepth > 7) return "buenEstado";
  if (minDepth > 6) return "dias60";
  if (minDepth > 3) return "dias30";
  return "cambioInmediato";
}

const SEMAFORO_META: Record<SemaforoCondition, {
  label: string; color: string; bg: string; lightBg: string;
  icon: React.ReactElement;
}> = {
  buenEstado:      { label: "Óptimo",  color: "#22c55e", bg: "rgba(34,197,94,0.12)",  lightBg: "#bbf7d0", icon: <CheckCircle2 size={14} /> },
  dias60:          { label: "60 Días", color: "#2D95FF", bg: "rgba(45,149,255,0.12)", lightBg: "#bfdbfe", icon: <Timer size={14} /> },
  dias30:          { label: "30 Días", color: "#f97316", bg: "rgba(249,115,22,0.12)", lightBg: "#fed7aa", icon: <AlertOctagon size={14} /> },
  cambioInmediato: { label: "Urgente", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  lightBg: "#fecaca", icon: <RotateCcw size={14} /> },
};

// Health = percentage of usable mm remaining (above 2mm legal minimum)
function calcMmHealthScore(tire: Tire): number {
  if (!tire.inspecciones.length) return 0;
  const last = tire.inspecciones[tire.inspecciones.length - 1];
  const minDepth = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
  const initial = tire.profundidadInicial > 0 ? tire.profundidadInicial : 22;
  const usable = Math.max(initial - 2, 1);
  const remaining = Math.max(minDepth - 2, 0);
  return Math.round(Math.min((remaining / usable) * 100, 100));
}

function getLatestInsp(tire: Tire) {
  return tire.inspecciones.length ? tire.inspecciones[tire.inspecciones.length - 1] : null;
}

function getTotalCost(tire: Tire): number {
  return tire.costo.reduce((s, c) => s + c.valor, 0);
}

function getProjectedKm(tire: Tire): string {
  const last = getLatestInsp(tire);
  if (!last) return "N/A";
  if (last.kmProyectado && last.kmProyectado > 0)
    return Math.round(last.kmProyectado).toLocaleString("es-CO");
  const minProf = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
  const km = tire.kilometrosRecorridos;
  const mmWorn = tire.profundidadInicial - minProf;
  const mmLeft = Math.max(minProf - 2, 0);
  if (mmWorn <= 0 || km <= 0) return "∞";
  return Math.round(km + (km / mmWorn) * mmLeft).toLocaleString("es-CO");
}

// Per-mm depth coloring
function depthColor(d: number): string {
  if (d > 7) return "#22c55e";
  if (d > 6) return "#2D95FF";
  if (d > 3) return "#f97316";
  return "#ef4444";
}
function depthBg(d: number): string {
  if (d > 7) return "rgba(34,197,94,0.12)";
  if (d > 6) return "rgba(45,149,255,0.12)";
  if (d > 3) return "rgba(249,115,22,0.12)";
  return "rgba(239,68,68,0.12)";
}

// Fleet stats
function calcFleetStats(tires: Tire[]) {
  const withInsp = tires.filter(t => t.inspecciones.length > 0);
  const cpkValues = withInsp
    .map(t => getLatestInsp(t)?.cpk)
    .filter((v): v is number => v != null && v > 0);
  const depthValues = withInsp.map(t => {
    const l = getLatestInsp(t);
    return l ? (l.profundidadInt + l.profundidadCen + l.profundidadExt) / 3 : null;
  }).filter((v): v is number => v != null);

  const avgCpk = cpkValues.length ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : null;
  const avgDepth = depthValues.length ? depthValues.reduce((a, b) => a + b, 0) / depthValues.length : null;
  const avgHealth = tires.length
    ? Math.round(tires.reduce((s, t) => s + calcMmHealthScore(t), 0) / tires.length)
    : null;

  const counts = { buenEstado: 0, dias60: 0, dias30: 0, cambioInmediato: 0 };
  tires.forEach(t => { const c = getSemaforoCondition(t); if (c) counts[c]++; });

  const totalCost = tires.reduce((s, t) => s + getTotalCost(t), 0);
  const urgent = tires.filter(t => {
    const c = getSemaforoCondition(t);
    return c === "cambioInmediato" || c === "dias30";
  });

  return { avgCpk, avgDepth, avgHealth, counts, totalCost, urgent };
}

// =============================================================================
// Vida meta
// =============================================================================
const VIDA_META: Record<string, { label: string; bg: string; text: string; accent: string }> = {
  nueva:       { label: "Nueva",          bg: "rgba(16,185,129,0.12)", text: "#065f46", accent: "#10b981" },
  reencauche1: { label: "1er Reencauche", bg: "rgba(59,130,246,0.12)", text: "#1e3a8a", accent: "#3b82f6" },
  reencauche2: { label: "2do Reencauche", bg: "rgba(139,92,246,0.12)", text: "#4c1d95", accent: "#8b5cf6" },
  reencauche3: { label: "3er Reencauche", bg: "rgba(239,68,68,0.12)",  text: "#7f1d1d", accent: "#ef4444" },
  fin:         { label: "Descartada",     bg: "rgba(107,114,128,0.12)",text: "#374151", accent: "#6b7280" },
};
const vidaMeta = (v: string) =>
  VIDA_META[v.toLowerCase()] ?? { label: v, bg: "rgba(107,114,128,0.12)", text: "#374151", accent: "#6b7280" };

// =============================================================================
// Micro components
// =============================================================================
function VidaBadge({ valor }: { valor: string }) {
  const m = vidaMeta(valor);
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: m.bg, color: m.text, border: `1px solid ${m.accent}40` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.accent }} />
      {m.label}
    </span>
  );
}

function SemaforoBadge({ tire }: { tire: Tire }) {
  const cond = getSemaforoCondition(tire);
  if (!cond) return null;
  const m = SEMAFORO_META[cond];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}30` }}>
      {m.icon}
      {m.label}
    </span>
  );
}

function DepthBar({ value, max = 14 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: depthColor(value) }} />
      </div>
      <span className="text-xs font-bold w-12 text-right" style={{ color: depthColor(value) }}>
        {value.toFixed(1)} mm
      </span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, badge }: {
  icon: React.ElementType; title: string; badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h3>
      {badge && (
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function HealthRing({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? 48 : 60;
  const r = size === "sm" ? 18 : 24;
  const sw = size === "sm" ? 4 : 5;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 60 ? "#22c55e" : score >= 35 ? "#f97316" : "#ef4444";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg viewBox={`0 0 ${dim} ${dim}`} className="w-full h-full -rotate-90">
          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="rgba(10,24,58,0.06)" strokeWidth={sw} />
          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${textSize} font-black text-[#0A183A]`}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Salud</span>
    </div>
  );
}

// =============================================================================
// Wear chart
// =============================================================================
function WearChart({ inspecciones }: { inspecciones: Inspection[] }) {
  const sorted = [...inspecciones].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  if (sorted.length < 2) return (
    <div className="rounded-2xl p-4 flex items-center justify-center text-sm text-gray-400"
      style={{ border: "1px solid rgba(10,24,58,0.08)", background: "white", minHeight: 120 }}>
      Se necesitan al menos 2 inspecciones
    </div>
  );

  const thresholdPlugin = {
    id: "thr",
    afterDraw(chart: ChartJS) {
      const { ctx, chartArea: { left, right }, scales: { y } } = chart as any;
      [{ val: 2, color: "#ef4444", dash: [5, 3] as number[] }, { val: 4, color: "#f97316", dash: [] as number[] }]
        .forEach(({ val, color, dash }) => {
          const yPx = y.getPixelForValue(val);
          ctx.save(); ctx.beginPath(); ctx.setLineDash(dash);
          ctx.strokeStyle = color; ctx.lineWidth = 1.5;
          ctx.moveTo(left, yPx); ctx.lineTo(right, yPx); ctx.stroke(); ctx.restore();
        });
    },
  };

  const labels = sorted.map(i =>
    new Date(i.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
  );
  const data = {
    labels,
    datasets: [
      {
        label: "Promedio",
        data: sorted.map(i => +((i.profundidadInt + i.profundidadCen + i.profundidadExt) / 3).toFixed(2)),
        borderColor: "#1E76B6", backgroundColor: "rgba(30,118,182,0.06)",
        tension: 0.4, pointRadius: 4, borderWidth: 2.5, fill: true,
      },
      { label: "Interior", data: sorted.map(i => i.profundidadInt), borderColor: "#22c55e", backgroundColor: "transparent", tension: 0.4, pointRadius: 2, borderWidth: 1.5, borderDash: [4, 3], fill: false },
      { label: "Central",  data: sorted.map(i => i.profundidadCen), borderColor: "#8b5cf6", backgroundColor: "transparent", tension: 0.4, pointRadius: 2, borderWidth: 1.5, borderDash: [4, 3], fill: false },
      { label: "Exterior", data: sorted.map(i => i.profundidadExt), borderColor: "#f97316", backgroundColor: "transparent", tension: 0.4, pointRadius: 2, borderWidth: 1.5, borderDash: [4, 3], fill: false },
    ],
  };
  const opts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} mm` } } },
    scales: {
      x: { ticks: { font: { size: 10 }, color: "#94a3b8", maxRotation: 45 }, grid: { color: "rgba(0,0,0,0.03)" } },
      y: { min: 0, title: { display: true, text: "Profundidad (mm)", font: { size: 10 }, color: "#94a3b8" }, ticks: { font: { size: 10 }, color: "#94a3b8", callback: (v: number) => v + "mm" }, grid: { color: "rgba(0,0,0,0.03)" } },
    },
  };

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ border: "1px solid rgba(10,24,58,0.08)", background: "white" }}>
      <SectionTitle icon={BarChart3} title="Curva de Desgaste" badge={`${sorted.length} inspecciones`} />
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: "Promedio", color: "#1E76B6", dash: false },
          { label: "Interior", color: "#22c55e", dash: true },
          { label: "Central",  color: "#8b5cf6", dash: true },
          { label: "Exterior", color: "#f97316", dash: true },
          { label: "Mínimo legal (2mm)", color: "#ef4444", dash: true },
          { label: "Alerta (4mm)", color: "#f97316", dash: false },
        ].map(d => (
          <span key={d.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span style={{ display: "inline-block", width: 16, height: 2, borderTop: `2px ${d.dash ? "dashed" : "solid"} ${d.color}` }} />
            {d.label}
          </span>
        ))}
      </div>
      <div style={{ position: "relative", height: 220 }}>
        <Line data={data} options={opts} plugins={[thresholdPlugin]} />
      </div>
    </div>
  );
}

// =============================================================================
// CPK chart
// =============================================================================
function CpkChart({ inspecciones }: { inspecciones: Inspection[] }) {
  const sorted = [...inspecciones]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .filter(i => i.cpk != null && i.cpk > 0);

  if (sorted.length < 2) return (
    <div className="rounded-2xl p-4 flex items-center justify-center text-sm text-gray-400"
      style={{ border: "1px solid rgba(10,24,58,0.08)", background: "white", minHeight: 120 }}>
      Se necesitan al menos 2 registros de CPK
    </div>
  );

  const labels = sorted.map(i =>
    new Date(i.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
  );
  const data = {
    labels,
    datasets: [
      {
        label: "CPK Real",
        data: sorted.map(i => Math.round(i.cpk!)),
        backgroundColor: sorted.map((_, idx, arr) => `rgba(30,118,182,${0.3 + (idx / Math.max(arr.length - 1, 1)) * 0.55})`),
        borderRadius: 6, borderSkipped: false,
      },
      {
        label: "CPK Proyectado",
        type: "line" as const,
        data: sorted.map(i => i.cpkProyectado ? Math.round(i.cpkProyectado) : null),
        borderColor: "#f59e0b", backgroundColor: "transparent",
        tension: 0.4, pointRadius: 3, borderWidth: 2, borderDash: [4, 3],
      },
    ],
  };
  const opts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: $${ctx.parsed.y?.toLocaleString("es-CO") ?? "—"}` } } },
    scales: {
      x: { ticks: { font: { size: 10 }, color: "#94a3b8" }, grid: { display: false } },
      y: { ticks: { font: { size: 10 }, color: "#94a3b8", callback: (v: number) => `$${(v / 1000).toFixed(0)}k` }, grid: { color: "rgba(0,0,0,0.03)" } },
    },
  };

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ border: "1px solid rgba(10,24,58,0.08)", background: "white" }}>
      <SectionTitle icon={DollarSign} title="Evolución CPK" badge="Costo/km" />
      <div className="flex gap-4 mb-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "#1E76B6" }} />
          CPK Real
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span style={{ display: "inline-block", width: 16, height: 2, borderTop: "2px dashed #f59e0b" }} />
          CPK Proyectado
        </span>
      </div>
      <div style={{ position: "relative", height: 200 }}>
        <Bar data={data} options={opts} />
      </div>
    </div>
  );
}

// =============================================================================
// Vehicle Fleet Overview
// =============================================================================
// SENTINEL vehicle-level quick verdict
// =============================================================================

function VehicleVerdict({ tires, stats }: { tires: Tire[]; stats: ReturnType<typeof calcFleetStats> }) {
  const verdict = useMemo(() => {
    if (tires.length === 0) return null;

    const withInsp = tires.filter((t) => t.inspecciones.length > 0);
    if (withInsp.length === 0) return null;

    // Overall grade
    const h = stats.avgHealth ?? 0;
    let grade: { label: string; color: string; emoji: string };
    if (h >= 70) grade = { label: "Buen estado", color: "#22c55e", emoji: "✅" };
    else if (h >= 45) grade = { label: "Requiere atencion", color: "#f97316", emoji: "⚠️" };
    else grade = { label: "Estado critico", color: "#ef4444", emoji: "🔴" };

    // Scan every tire for issues
    const issues: string[] = [];
    const posLabel = (t: Tire) => `P${t.posicion}`;
    const posLabels = (arr: Tire[]) => arr.map(posLabel).join(", ");

    // Alignment check — shoulder delta >= 1.5mm
    const alignmentProblems = withInsp.filter((t) => {
      const l = t.inspecciones[t.inspecciones.length - 1];
      return Math.abs(l.profundidadInt - l.profundidadExt) >= 1.5;
    });
    if (alignmentProblems.length > 0) {
      issues.push(`Desgaste desigual entre hombros (${posLabels(alignmentProblems)}) — revisar alineacion`);
    }

    // Center vs edges — over/under inflation wear pattern
    const overInflated = withInsp.filter((t) => {
      const l = t.inspecciones[t.inspecciones.length - 1];
      return l.profundidadCen - ((l.profundidadInt + l.profundidadExt) / 2) > 1.5;
    });
    const underInflated = withInsp.filter((t) => {
      const l = t.inspecciones[t.inspecciones.length - 1];
      return ((l.profundidadInt + l.profundidadExt) / 2) - l.profundidadCen > 1.5;
    });
    if (underInflated.length > 0) {
      issues.push(`Desgaste en hombros excesivo (${posLabels(underInflated)}) — indica baja presion`);
    }
    if (overInflated.length > 0) {
      issues.push(`Desgaste central excesivo (${posLabels(overInflated)}) — indica sobreinflado`);
    }

    // Pressure reading problems
    const pressureProblems = withInsp.filter((t) => {
      const l = t.inspecciones[t.inspecciones.length - 1];
      return l.presionDelta != null && Math.abs(l.presionDelta) > 10;
    });
    if (pressureProblems.length > 0) {
      issues.push(`Presion fuera de rango (${posLabels(pressureProblems)})`);
    }

    // Urgent replacements
    const urgentTires = tires.filter((t) => getSemaforoCondition(t) === "cambioInmediato");
    const soonTires = tires.filter((t) => getSemaforoCondition(t) === "dias30");
    if (urgentTires.length > 0) {
      issues.push(`Cambio inmediato requerido (${posLabels(urgentTires)})`);
    } else if (soonTires.length > 0) {
      issues.push(`A 30 dias de retiro (${posLabels(soonTires)})`);
    }

    // High wear rate on any tire
    const highWearTires = withInsp.filter((t) => {
      if (t.inspecciones.length < 2) return false;
      const sorted = [...t.inspecciones].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const firstMin = Math.min(first.profundidadInt, first.profundidadCen, first.profundidadExt);
      const lastMin = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
      const months = (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return months >= 1 && (firstMin - lastMin) / months > 1.5;
    });
    if (highWearTires.length > 0) {
      issues.push(`Desgaste acelerado >1.5mm/mes (${posLabels(highWearTires)})`);
    }

    // CPK assessment
    if (stats.avgCpk != null && stats.avgCpk > 150) {
      issues.push(`CPK alto ($${Math.round(stats.avgCpk).toLocaleString("es-CO")}/km) — evaluar marcas o condiciones`);
    }

    // Recalculate grade based on actual issues found
    if (urgentTires.length > 0) grade = { label: "Estado critico", color: "#ef4444", emoji: "🔴" };
    else if (issues.length > 0) grade = { label: "Requiere atencion", color: "#f97316", emoji: "⚠️" };

    // Top recommendation — prioritized
    let recommendation = "";
    if (urgentTires.length > 0) {
      recommendation = "Prioridad: retirar las llantas urgentes antes de que se pierdan los cascos para reencauche.";
    } else if (underInflated.length > 0 || overInflated.length > 0) {
      recommendation = "Corregir presiones de inflado. Desgaste irregular en hombros o centro reduce vida util y aumenta costos.";
    } else if (alignmentProblems.length > 0) {
      recommendation = "Programar revision de alineacion para evitar desgaste prematuro y preservar cascos.";
    } else if (highWearTires.length > 0) {
      recommendation = "Investigar causa de desgaste acelerado: sobrecarga, velocidad excesiva, o condiciones de ruta.";
    } else if (pressureProblems.length > 0) {
      recommendation = "Ajustar presiones a los valores recomendados para optimizar vida util.";
    } else if (soonTires.length > 0) {
      recommendation = "Cotizar reencauches o reemplazos para las llantas que se acercan a retiro optimo.";
    } else if (issues.length === 0) {
      recommendation = "Vehiculo en buen estado. Mantener frecuencia de inspeccion actual.";
    } else {
      recommendation = "Monitorear de cerca y aumentar frecuencia de inspeccion.";
    }

    return { grade, issues, recommendation };
  }, [tires, stats]);

  if (!verdict) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${verdict.grade.color}25` }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
        <AgentCardHeader agent="sentinel" insight={
          `Vehiculo con ${tires.length} llantas — ${verdict.grade.label}.\n\n` +
          (verdict.issues.length > 0 ? verdict.issues.map((i) => `• ${i}`).join("\n") + "\n\n" : "") +
          `Recomendacion: ${verdict.recommendation}`
        } />
        <span className="text-sm font-black text-white">Diagnostico Rapido</span>
        <span className="ml-auto text-base">{verdict.grade.emoji}</span>
      </div>
      <div className="px-4 py-3 flex items-start gap-3" style={{ background: `${verdict.grade.color}06` }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: verdict.grade.color }}>{verdict.grade.label}</p>
          {verdict.issues.length > 0 ? (
            <div className="mt-1.5 space-y-1">
              {verdict.issues.map((issue, i) => (
                <p key={i} className="text-[11px] text-gray-600 flex items-start gap-1.5">
                  <span className="text-[9px] mt-0.5">•</span> {issue}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 mt-0.5">Sin problemas detectados.</p>
          )}
          <p className="text-[11px] font-bold text-[#173D68] mt-2 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
            {verdict.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
function VehicleFleetOverview({ tires }: { tires: Tire[] }) {
  const stats = useMemo(() => calcFleetStats(tires), [tires]);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)", boxShadow: "0 8px 32px rgba(10,24,58,0.2)" }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-white/70" />
            <span className="text-white font-black text-base">Análisis de Flota</span>
            <span className="ml-auto text-white/50 text-xs">{tires.length} llantas</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "CPK Promedio", value: stats.avgCpk ? `$${Math.round(stats.avgCpk).toLocaleString("es-CO")}` : "N/A", sub: "por kilómetro", icon: DollarSign },
              { label: "Profundidad Prom.", value: stats.avgDepth ? `${stats.avgDepth.toFixed(1)} mm` : "N/A", sub: "banda de rodamiento", icon: Gauge },
              { label: "Salud Flota", value: stats.avgHealth != null ? `${stats.avgHealth}%` : "N/A", sub: "mm restantes vs inicial", icon: Activity },
              { label: "Inversión Total", value: stats.totalCost > 0 ? `$${(stats.totalCost / 1_000_000).toFixed(1)}M` : "N/A", sub: "costo acumulado", icon: DollarSign },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <s.icon className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-lg font-black text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Semaforo counts */}
        <div className="px-4 sm:px-6 pb-4 grid grid-cols-4 gap-2">
          {(["buenEstado", "dias60", "dias30", "cambioInmediato"] as SemaforoCondition[]).map(key => {
            const m = SEMAFORO_META[key];
            return (
              <div key={key} className="rounded-xl p-2 text-center" style={{ background: `${m.color}22` }}>
                <p className="text-xl font-black" style={{ color: m.color }}>{stats.counts[key]}</p>
                <p className="text-[10px] font-bold" style={{ color: m.color, opacity: 0.85 }}>{m.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SENTINEL vehicle verdict */}
      <VehicleVerdict tires={tires} stats={stats} />

      {/* Urgent tires */}
      {stats.urgent.length > 0 && (
        <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-black text-red-700">Requieren Acción</span>
            <span className="ml-auto text-xs font-bold text-red-500">
              {stats.urgent.length} llanta{stats.urgent.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {stats.urgent.map(t => {
              const cond = getSemaforoCondition(t);
              const m = cond ? SEMAFORO_META[cond] : null;
              const last = getLatestInsp(t);
              const minD = last ? Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt) : null;
              return (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white"
                  style={{ border: "1px solid rgba(239,68,68,0.12)" }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m?.color ?? "#94a3b8" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0A183A] truncate">{t.placa.toUpperCase()} · Pos. {t.posicion}</p>
                    <p className="text-[10px] text-gray-500">{t.marca} {t.diseno}</p>
                  </div>
                  {minD != null && (
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: depthColor(minD) }}>
                      {minD.toFixed(1)} mm mín.
                    </span>
                  )}
                  {m && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: m.bg, color: m.color }}>{m.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Tire Card
// =============================================================================
function TireCard({ tire, onView }: { tire: Tire; onView: () => void }) {
  const last = getLatestInsp(tire);
  const avgMM = last ? (last.profundidadInt + last.profundidadCen + last.profundidadExt) / 3 : null;
  const lastVida = tire.vida.length ? tire.vida[tire.vida.length - 1] : null;
  const health = calcMmHealthScore(tire);
  const cond = getSemaforoCondition(tire);
  const condColor = cond ? SEMAFORO_META[cond].color : "#94a3b8";

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ border: "1px solid rgba(10,24,58,0.08)", background: "white", boxShadow: "0 2px 8px rgba(10,24,58,0.04)" }}>
      <div className="h-1 w-full" style={{ background: condColor }} />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-black text-[#0A183A] text-base leading-none truncate">{tire.placa.toUpperCase()}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}>Posición {tire.posicion}</span>
            </div>
            <p className="text-xs text-gray-500">{tire.marca} · {tire.diseno}</p>
          </div>
          <SemaforoBadge tire={tire} />
        </div>

        {/* Vida + health */}
        <div className="flex items-center justify-between mb-3">
          {lastVida ? <VidaBadge valor={lastVida.valor} /> : <span />}
          <HealthRing score={health} size="sm" />
        </div>

        {/* Depth bars */}
        {last && (
          <div className="space-y-1.5 mb-3">
            <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-400 font-semibold mb-1">
              <span>Interior</span><span className="text-center">Central</span><span className="text-right">Exterior</span>
            </div>
            {[{ label: "Int", value: last.profundidadInt }, { label: "Cen", value: last.profundidadCen }, { label: "Ext", value: last.profundidadExt }]
              .map(d => <DepthBar key={d.label} value={d.value} />)}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {last?.cpk != null && (
            <div className="rounded-xl p-2" style={{ background: "rgba(10,24,58,0.03)" }}>
              <p className="text-[10px] text-gray-400 font-semibold">CPK</p>
              <p className="text-sm font-black text-[#0A183A]">${Math.round(last.cpk).toLocaleString("es-CO")}</p>
            </div>
          )}
          {avgMM != null && (
            <div className="rounded-xl p-2" style={{ background: depthBg(avgMM) }}>
              <p className="text-[10px] font-semibold" style={{ color: depthColor(avgMM) }}>Promedio</p>
              <p className="text-sm font-black" style={{ color: depthColor(avgMM) }}>{avgMM.toFixed(1)} mm</p>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-1 mb-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><Ruler className="w-3 h-3 text-[#1E76B6]" />{tire.dimension}</div>
          <div className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3 text-[#1E76B6]" />Eje: {tire.eje} · {tire.kilometrosRecorridos.toLocaleString("es-CO")} km</div>
          {last && <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-[#1E76B6]" />Últ. insp.: {new Date(last.fecha).toLocaleDateString("es-CO")}</div>}
        </div>

        <button onClick={onView}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 p-3"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          Ver Análisis Completo
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Vida History
// =============================================================================
function VidaHistory({ tire }: { tire: Tire }) {
  if (tire.vida.length === 0)
    return <p className="text-sm text-gray-400 py-6 text-center">No hay registros de vida</p>;
  return (
    <div className="space-y-2">
      {tire.vida.map((entry, i) => {
        const m = vidaMeta(entry.valor);
        const isLast = i === tire.vida.length - 1;
        const cpk = entry.valor === "nueva" && tire.primeraVida?.[0]?.cpk
          ? tire.primeraVida[0].cpk : null;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: isLast ? m.bg : "rgba(10,24,58,0.02)", border: `1px solid ${isLast ? m.accent + "40" : "rgba(10,24,58,0.06)"}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: m.bg, border: `1px solid ${m.accent}40` }}>
              <Layers className="w-4 h-4" style={{ color: m.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black" style={{ color: m.text }}>{m.label}</span>
                {isLast && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: m.accent }}>Actual</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-500">
                  {new Date(entry.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                {cpk && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-[11px] font-bold text-[#1E76B6]">CPK final: ${cpk.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0">#{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Fecha Instalacion Editor
// =============================================================================
function FechaInstalacionEditor({ tire, onUpdated }: { tire: Tire; onUpdated: (t: Tire) => void }) {
  const [saving, setSaving] = useState(false);

  async function handleChange(dateStr: string) {
    if (!dateStr || !tire.inspecciones.length) return;
    setSaving(true);
    try {
      const firstInsp = tire.inspecciones[0];
      const res = await authFetch(
        `${API_BASE}/tires/${tire.id}/inspection/edit?fecha=${encodeURIComponent(firstInsp.fecha)}`,
        { method: "PATCH", body: JSON.stringify({ fechaInstalacion: new Date(dateStr).toISOString() }) }
      );
      if (!res.ok) throw new Error();
      const raw = await res.json();
      onUpdated(normalise(raw));
    } catch {
      alert("Error al actualizar fecha de instalacion");
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-3 mt-2 p-2.5 rounded-xl" style={{ background: "rgba(30,118,182,0.03)", border: "1px solid rgba(30,118,182,0.08)" }}>
      <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Fecha instalacion:</span>
      <input
        type="date"
        defaultValue={tire.fechaInstalacion ? new Date(tire.fechaInstalacion).toISOString().split("T")[0] : ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="px-2 py-1 rounded-lg text-xs border border-[#1E76B6]/20 bg-white focus:outline-none focus:ring-1 focus:ring-[#1E76B6] disabled:opacity-50"
      />
      {saving
        ? <span className="text-[9px] text-[#1E76B6] font-bold">Recalculando...</span>
        : <span className="text-[9px] text-gray-400">Cambiar recalcula CPK/CPT de todas las inspecciones</span>
      }
    </div>
  );
}

// =============================================================================
// Inspection Table
// =============================================================================
function InspectionTable({ tire, onDelete, onEdit }: { tire: Tire; onDelete: (fecha: string) => void; onEdit: (oldFecha: string, data: { fecha: string; profundidadInt: number; profundidadCen: number; profundidadExt: number; inspeccionadoPorNombre: string; kilometrosEstimados?: number }) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState({ fecha: "", profundidadInt: 0, profundidadCen: 0, profundidadExt: 0, inspeccionadoPorNombre: "", kilometrosEstimados: undefined as number | undefined });

  if (tire.inspecciones.length === 0)
    return <p className="text-sm text-gray-400 py-6 text-center">Sin inspecciones registradas</p>;

  const sorted = [...tire.inspecciones].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  function startEdit(idx: number) {
    const insp = sorted[idx];
    setEditIdx(idx);
    setEditData({
      fecha: new Date(insp.fecha).toISOString().split("T")[0],
      profundidadInt: insp.profundidadInt,
      profundidadCen: insp.profundidadCen,
      profundidadExt: insp.profundidadExt,
      inspeccionadoPorNombre: insp.inspeccionadoPorNombre ?? "",
      kilometrosEstimados: insp.kilometrosEstimados ?? undefined,
    });
  }

  function saveEdit(oldFecha: string) {
    onEdit(oldFecha, editData);
    setEditIdx(null);
  }

  const editInputCls = "w-16 px-1.5 py-1 rounded-lg text-xs font-bold text-center border border-[#1E76B6]/30 bg-[#F0F7FF] focus:outline-none focus:ring-1 focus:ring-[#1E76B6]";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr style={{ background: "rgba(10,24,58,0.03)" }}>
            {["Fecha", "Int", "Cen", "Ext", "Prom.", "CPK", "CPK Proy.", "Km", "Presión", "Img", "Inspector", ""].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((insp, idx) => {
            const avg = (insp.profundidadInt + insp.profundidadCen + insp.profundidadExt) / 3;
            const isLatest = idx === 0;
            const isEditing = editIdx === idx;
            return (
              <tr key={`${insp.fecha}-${idx}`} className="border-b transition-colors"
                style={{ borderColor: "rgba(10,24,58,0.05)", background: isEditing ? "rgba(30,118,182,0.06)" : isLatest ? "rgba(30,118,182,0.02)" : undefined }}
                onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = "rgba(30,118,182,0.03)"; }}
                onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = isLatest ? "rgba(30,118,182,0.02)" : ""; }}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {isEditing ? (
                    <input type="date" value={editData.fecha} onChange={(e) => setEditData((d) => ({ ...d, fecha: e.target.value }))}
                      className="px-1.5 py-1 rounded-lg text-xs border border-[#1E76B6]/30 bg-[#F0F7FF] focus:outline-none" />
                  ) : (
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => startEdit(idx)}>
                      {isLatest && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#1E76B6]" />}
                      <span className="text-xs text-gray-600">{new Date(insp.fecha).toLocaleDateString("es-CO")}</span>
                    </div>
                  )}
                </td>
                {isEditing ? (
                  <>
                    <td className="px-2 py-2"><input type="number" step="0.1" value={editData.profundidadInt} onChange={(e) => setEditData((d) => ({ ...d, profundidadInt: Number(e.target.value) }))} className={editInputCls} /></td>
                    <td className="px-2 py-2"><input type="number" step="0.1" value={editData.profundidadCen} onChange={(e) => setEditData((d) => ({ ...d, profundidadCen: Number(e.target.value) }))} className={editInputCls} /></td>
                    <td className="px-2 py-2"><input type="number" step="0.1" value={editData.profundidadExt} onChange={(e) => setEditData((d) => ({ ...d, profundidadExt: Number(e.target.value) }))} className={editInputCls} /></td>
                  </>
                ) : (
                  [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt].map((v, vi) => (
                    <td key={vi} className="px-3 py-2.5 cursor-pointer" onClick={() => startEdit(idx)}>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs font-bold"
                        style={{ background: depthBg(v), color: depthColor(v) }}>{v} mm</span>
                    </td>
                  ))
                )}
                <td className="px-3 py-2.5">
                  <span className="text-xs font-black" style={{ color: depthColor(isEditing ? (editData.profundidadInt + editData.profundidadCen + editData.profundidadExt) / 3 : avg) }}>
                    {(isEditing ? (editData.profundidadInt + editData.profundidadCen + editData.profundidadExt) / 3 : avg).toFixed(1)} mm
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs font-bold text-[#0A183A] whitespace-nowrap">
                  {insp.cpk != null ? `$${Math.round(insp.cpk).toLocaleString("es-CO")}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                  {insp.cpkProyectado != null ? `$${Math.round(insp.cpkProyectado).toLocaleString("es-CO")}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                  {isEditing ? (
                    <input type="number" value={editData.kilometrosEstimados ?? ""} placeholder="Km"
                      onChange={(e) => setEditData((d) => ({ ...d, kilometrosEstimados: e.target.value ? Number(e.target.value) : undefined }))}
                      className={editInputCls} style={{ width: "5rem" }} />
                  ) : (
                    <span className="cursor-pointer" onClick={() => startEdit(idx)}>
                      {insp.kilometrosEstimados != null ? insp.kilometrosEstimados.toLocaleString("es-CO") : "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {insp.presionPsi != null ? (
                    <span className="text-xs font-bold" style={{
                      color: (insp.presionDelta ?? 0) < -10 ? "#ef4444" : (insp.presionDelta ?? 0) < 0 ? "#f97316" : "#22c55e"
                    }}>{insp.presionPsi} PSI</span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  {insp.imageUrl ? (
                    <a href={insp.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img src={insp.imageUrl} alt="Insp." className="rounded-lg object-cover hover:scale-110 transition-transform" style={{ width: 36, height: 36 }} />
                    </a>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {isEditing ? (
                    <input type="text" value={editData.inspeccionadoPorNombre} onChange={(e) => setEditData((d) => ({ ...d, inspeccionadoPorNombre: e.target.value }))}
                      placeholder="Inspector" className="w-20 px-1.5 py-1 rounded-lg text-xs border border-[#1E76B6]/30 bg-[#F0F7FF] focus:outline-none" />
                  ) : (
                    <span className="text-xs font-bold cursor-pointer" onClick={() => startEdit(idx)}>
                      {insp.inspeccionadoPorNombre || "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(insp.fecha)}
                          className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="Guardar">
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        </button>
                        <button onClick={() => setEditIdx(null)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Cancelar">
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(idx)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5 text-[#1E76B6]" />
                        </button>
                        <button onClick={() => onDelete(insp.fecha)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// SENTINEL Analysis — per-tire deep analysis with recommendations
// =============================================================================

function SentinelAnalysis({ tire }: { tire: Tire }) {
  const analysis = useMemo(() => {
    const findings: { icon: string; title: string; detail: string; severity: "ok" | "warn" | "critical" | "info" }[] = [];
    const recommendations: string[] = [];
    const insps = tire.inspecciones;

    if (insps.length === 0) return { findings, recommendations, insight: "" };

    const last = insps[insps.length - 1];
    const minDepth = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
    const maxDepth = Math.max(last.profundidadInt, last.profundidadCen, last.profundidadExt);
    const shoulderDelta = Math.abs(last.profundidadInt - last.profundidadExt);
    const centerVsEdge = last.profundidadCen - ((last.profundidadInt + last.profundidadExt) / 2);
    const health = calcMmHealthScore(tire);

    // 1. Shoulder delta → alignment
    if (shoulderDelta >= 1.5) {
      findings.push({
        icon: "⚠️", title: "Desgaste desigual detectado",
        detail: `Diferencia de ${shoulderDelta.toFixed(1)}mm entre hombros (Int: ${last.profundidadInt}mm, Ext: ${last.profundidadExt}mm). Umbral: 1.5mm.`,
        severity: shoulderDelta >= 2.5 ? "critical" : "warn",
      });
      recommendations.push(
        shoulderDelta >= 2.5
          ? "URGENTE: Revisar alineacion del vehiculo inmediatamente. Desgaste severo en un hombro indica desalineacion que destruye el casco."
          : "Programar revision de alineacion. La diferencia entre hombros sugiere un angulo incorrecto."
      );
    } else {
      findings.push({ icon: "✅", title: "Desgaste uniforme entre hombros", detail: `Delta: ${shoulderDelta.toFixed(1)}mm — dentro del rango aceptable (<1.5mm).`, severity: "ok" });
    }

    // 2. Center vs edges → pressure
    if (centerVsEdge > 1.5) {
      findings.push({
        icon: "🔴", title: "Desgaste central excesivo",
        detail: `Centro ${centerVsEdge.toFixed(1)}mm por encima de los hombros. Indica sobreinflado cronico.`,
        severity: "warn",
      });
      recommendations.push("Reducir la presion de inflado. El centro se desgasta mas rapido cuando hay sobreinflado, lo cual reduce la huella de contacto y acorta la vida util.");
    } else if (centerVsEdge < -1.5) {
      findings.push({
        icon: "🔴", title: "Desgaste en hombros excesivo",
        detail: `Hombros ${Math.abs(centerVsEdge).toFixed(1)}mm por encima del centro. Indica baja presion cronica.`,
        severity: "warn",
      });
      recommendations.push("Aumentar la presion de inflado a la recomendada. Baja presion causa desgaste excesivo en los hombros, mayor consumo de combustible y riesgo de falla.");
    } else {
      findings.push({ icon: "✅", title: "Perfil de presion correcto", detail: "Desgaste equilibrado entre centro y hombros.", severity: "ok" });
    }

    // 3. Wear rate trend
    if (insps.length >= 2) {
      const sorted = [...insps].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      const first = sorted[0];
      const firstMin = Math.min(first.profundidadInt, first.profundidadCen, first.profundidadExt);
      const months = (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (months >= 1) {
        const rate = (firstMin - minDepth) / months;
        findings.push({
          icon: "📉", title: "Tasa de desgaste",
          detail: `${rate.toFixed(2)}mm/mes en ${months.toFixed(0)} meses (${insps.length} inspecciones).`,
          severity: rate > 1.5 ? "warn" : "info",
        });
        if (rate > 1.5) {
          recommendations.push(`Tasa de desgaste alta (${rate.toFixed(2)}mm/mes). Normal: 0.5-1.2mm/mes. Revisar condiciones de operacion, peso de carga, velocidad y presion.`);
        }
        // Projected retirement
        const mmToRetire = minDepth - 3;
        if (mmToRetire > 0 && rate > 0) {
          const monthsLeft = mmToRetire / rate;
          const retireDate = new Date(Date.now() + monthsLeft * 30 * 24 * 60 * 60 * 1000);
          findings.push({
            icon: "📅", title: "Retiro proyectado",
            detail: `~${Math.round(monthsLeft)} meses (${retireDate.toLocaleDateString("es-CO", { month: "short", year: "numeric" })}) a 3mm optimo para preservar casco.`,
            severity: monthsLeft < 2 ? "critical" : monthsLeft < 4 ? "warn" : "info",
          });
          if (monthsLeft < 2) {
            recommendations.push("Esta llanta llegara a retiro optimo en menos de 2 meses. Solicita cotizacion de reencauche o reemplazo ahora.");
          }
        }
      }
    }

    // 4. Pressure check
    if (last.presionPsi != null && last.presionRecomendadaPsi != null) {
      const delta = last.presionPsi - last.presionRecomendadaPsi;
      if (Math.abs(delta) > 10) {
        findings.push({
          icon: delta < 0 ? "🔽" : "🔼",
          title: delta < 0 ? "Presion baja" : "Presion alta",
          detail: `${last.presionPsi} PSI vs ${last.presionRecomendadaPsi} PSI recomendada (${delta > 0 ? "+" : ""}${delta.toFixed(0)} PSI).`,
          severity: Math.abs(delta) > 20 ? "critical" : "warn",
        });
        recommendations.push(
          delta < 0
            ? `Inflar a ${last.presionRecomendadaPsi} PSI. Baja presion aumenta consumo de combustible ~3% y reduce vida util hasta 25%.`
            : `Reducir a ${last.presionRecomendadaPsi} PSI. Sobreinflado reduce area de contacto y causa desgaste central acelerado.`
        );
      }
    }

    // 5. CPK trend
    const cpkValues = insps.filter((i) => i.cpk != null && i.cpk > 0).map((i) => i.cpk!);
    if (cpkValues.length >= 3) {
      const recentCpk = cpkValues.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const olderCpk = cpkValues.slice(0, -2).reduce((a, b) => a + b, 0) / Math.max(1, cpkValues.length - 2);
      if (recentCpk > olderCpk * 1.15) {
        findings.push({ icon: "💰", title: "CPK en aumento", detail: `CPK reciente: $${Math.round(recentCpk).toLocaleString("es-CO")} vs historico: $${Math.round(olderCpk).toLocaleString("es-CO")}. Rendimiento economico deteriorandose.`, severity: "warn" });
        recommendations.push("El costo por kilometro esta subiendo. Evalua si la llanta esta cerca de su vida util optima y si vale la pena continuar o retirar.");
      }
    }

    // 6. Reencauche opportunity
    const currentVida = tire.vida.length ? tire.vida[tire.vida.length - 1].valor : "nueva";
    if (minDepth <= 4 && minDepth > 2 && currentVida !== "reencauche3" && currentVida !== "fin") {
      const vidaNum = currentVida === "nueva" ? 0 : currentVida === "reencauche1" ? 1 : currentVida === "reencauche2" ? 2 : 3;
      if (vidaNum < 3 && shoulderDelta < 2) {
        findings.push({ icon: "♻️", title: "Candidata a reencauche", detail: `Profundidad ${minDepth.toFixed(1)}mm con desgaste uniforme. Casco en condiciones de ser reencauchado (vida actual: ${currentVida}).`, severity: "info" });
        recommendations.push("Retirar a 3mm para preservar el casco y enviar a reencauche. Esperar mas alla de 3mm puede dañar el casco e impedir el reencauche.");
      }
    }

    // Build insight string
    const lines: string[] = [];
    lines.push(`Analisis de llanta ${tire.placa.toUpperCase()} — ${insps.length} inspecciones, salud ${health}%.`);
    const critCount = findings.filter((f) => f.severity === "critical").length;
    const warnCount = findings.filter((f) => f.severity === "warn").length;
    if (critCount > 0) lines.push(`${critCount} hallazgo${critCount > 1 ? "s" : ""} critico${critCount > 1 ? "s" : ""} detectado${critCount > 1 ? "s" : ""}.`);
    if (warnCount > 0) lines.push(`${warnCount} advertencia${warnCount > 1 ? "s" : ""}.`);
    if (recommendations.length > 0) lines.push(`Recomendaciones:\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`);

    return { findings, recommendations, insight: lines.join("\n\n") };
  }, [tire]);

  if (tire.inspecciones.length === 0) return null;

  const sevColors = {
    ok: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)", text: "#22c55e" },
    warn: { bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.15)", text: "#f97316" },
    critical: { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)", text: "#ef4444" },
    info: { bg: "rgba(52,140,203,0.06)", border: "rgba(52,140,203,0.15)", text: "#348CCB" },
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.1)", background: "white" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
        <AgentCardHeader agent="sentinel" insight={analysis.insight} />
        <div>
          <p className="text-sm font-black text-white">Analisis SENTINEL</p>
          <p className="text-[10px] text-white/50">
            {analysis.findings.length} hallazgos &middot; {analysis.recommendations.length} recomendaciones
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Findings */}
        {analysis.findings.map((f, i) => {
          const c = sevColors[f.severity];
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <span className="text-base flex-shrink-0 mt-0.5">{f.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black" style={{ color: c.text }}>{f.title}</p>
                <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{f.detail}</p>
              </div>
            </div>
          );
        })}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="mt-2 rounded-xl px-4 py-3" style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(10,24,58,0.06)" }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0A183A] mb-2">Recomendaciones</p>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-black text-[#1E76B6] mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-[11px] text-gray-700 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TIRE DETAIL MODAL — all tabs fully rendered, no conditional short-circuit
// =============================================================================
type ModalTab = "overview" | "inspecciones" | "costos" | "vida";

function TireDetailModal({
  tire, onClose, onUpdate, onDelete, onEdit,
}: {
  tire: Tire;
  onClose: () => void;
  onUpdate: (t: Tire) => void;
  onDelete: (fecha: string) => void;
  onEdit: (oldFecha: string, data: { fecha: string; profundidadInt: number; profundidadCen: number; profundidadExt: number; inspeccionadoPorNombre: string; kilometrosEstimados?: number; fechaInstalacion?: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    marca: tire.marca, diseno: tire.diseno, dimension: tire.dimension, eje: tire.eje,
    kilometrosRecorridos: tire.kilometrosRecorridos, profundidadInicial: tire.profundidadInicial,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState("");

  const last = getLatestInsp(tire);
  const avgDepth = last ? (last.profundidadInt + last.profundidadCen + last.profundidadExt) / 3 : null;
  const totalCost = getTotalCost(tire);
  const projKm = getProjectedKm(tire);
  const health = calcMmHealthScore(tire);
  const currentVida = tire.vida.length ? tire.vida[tire.vida.length - 1].valor : "nueva";
  const cond = getSemaforoCondition(tire);
  const condMeta = cond ? SEMAFORO_META[cond] : null;

  async function handleEditSubmit() {
    setEditLoading(true); setEditSuccess("");
    try {
      const res = await authFetch(`${API_BASE}/tires/${tire.id}/edit`, {
        method: "PATCH", body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const raw = await res.json();
      onUpdate(normalise(raw));
      setEditSuccess("¡Cambios guardados exitosamente!");
      setEditMode(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEditLoading(false);
    }
  }

  const tabs: { id: ModalTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "overview",     label: "Resumen",      icon: Activity },
    { id: "inspecciones", label: "Inspecciones", icon: Calendar,  count: tire.inspecciones.length },
    { id: "costos",       label: "Costos",       icon: DollarSign,count: tire.costo.length },
    { id: "vida",         label: "Historial",    icon: Repeat,    count: tire.vida.length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
      style={{ background: "rgba(10,24,58,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-4xl my-4 rounded-3xl overflow-hidden"
        style={{ background: "#f8fafc", boxShadow: "0 32px 80px rgba(10,24,58,0.35)" }}>

        {/* Header */}
        <div className="relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
          <div className="relative px-4 sm:px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Circle className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-white font-black text-xl leading-none">{tire.placa.toUpperCase()}</h2>
                    {condMeta && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: condMeta.bg, color: condMeta.color }}>
                        {condMeta.label}
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm mt-0.5">{tire.marca} {tire.diseno} · {tire.dimension}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <VidaBadge valor={currentVida} />
                    <span className="text-white/40 text-[11px]">Posición {tire.posicion} · Eje {tire.eje}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => { setEditMode(!editMode); setEditSuccess(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}>
                  {editMode ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Pencil className="w-3.5 h-3.5" />Editar</>}
                </button>
                <button onClick={onClose} className="p-1.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {[
                { label: "Profundidad Prom.", value: avgDepth ? `${avgDepth.toFixed(1)} mm` : "N/A", color: avgDepth ? depthColor(avgDepth) : "#94a3b8" },
                { label: "CPK Actual",  value: last?.cpk ? `$${Math.round(last.cpk).toLocaleString("es-CO")}` : "N/A", color: "#60a5fa" },
                { label: "Km Recorridos", value: tire.kilometrosRecorridos.toLocaleString("es-CO"), color: "#a78bfa" },
                { label: "Km Proyectados", value: projKm, color: "#34d399" },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <p className="text-base font-black" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-white/50 font-semibold mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-white/10">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all"
                style={{
                  color: activeTab === t.id ? "white" : "rgba(255,255,255,0.45)",
                  borderBottom: activeTab === t.id ? "2px solid white" : "2px solid transparent",
                  background: activeTab === t.id ? "rgba(255,255,255,0.08)" : "transparent",
                }}>
                <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.count != null && t.count > 0 && (
                  <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full font-black"
                    style={{ background: activeTab === t.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", color: "white" }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6 space-y-4">

          {editSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-green-700">{editSuccess}</span>
            </div>
          )}

          {/* Edit panel */}
          {editMode && (
            <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(30,118,182,0.15)" }}>
              <p className="text-sm font-black text-[#0A183A] mb-3">Editar Información</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {([
                  { label: "Marca",          key: "marca",                type: "text"   },
                  { label: "Diseño",         key: "diseno",               type: "text"   },
                  { label: "Dimensión",      key: "dimension",            type: "text"   },
                  { label: "Eje",            key: "eje",                  type: "text"   },
                  { label: "Km Recorridos",  key: "kilometrosRecorridos", type: "number" },
                  { label: "Prof. Inicial",  key: "profundidadInicial",   type: "number" },
                ] as const).map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                    <input type={type}
                      value={(editForm as Record<string, unknown>)[key] as string}
                      onChange={e => setEditForm(f => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                      style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setEditMode(false); setEditSuccess(""); }}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                  style={{ border: "1px solid rgba(10,24,58,0.1)" }}>
                  Cancelar
                </button>
                <button onClick={handleEditSubmit} disabled={editLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                  {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</> : "Guardar Cambios"}
                </button>
              </div>
            </div>
          )}

          {/* --- OVERVIEW --- */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Characteristics */}
                <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)" }}>
                  <SectionTitle icon={Info} title="Características" />
                  {[
                    { label: "Diseño",         value: tire.diseno },
                    { label: "Dimensión",      value: tire.dimension },
                    { label: "Eje",            value: tire.eje },
                    { label: "Prof. Inicial",  value: `${tire.profundidadInicial} mm` },
                    { label: "Km Recorridos",  value: `${tire.kilometrosRecorridos.toLocaleString("es-CO")} km` },
                    { label: "Km Proyectados", value: `${projKm} km` },
                    { label: "Estado Actual",  value: <VidaBadge valor={currentVida} /> },
                    ...(tire.fechaInstalacion ? [{ label: "Instalación", value: new Date(tire.fechaInstalacion).toLocaleDateString("es-CO") }] : []),
                    ...(tire.diasAcumulados != null ? [{ label: "Días Rodando", value: `${tire.diasAcumulados} días` }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 gap-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">{label}</span>
                      <span className="text-sm font-semibold text-[#0A183A] text-right">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Right column */}
                <div className="space-y-3">
                  {/* Health */}
                  <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)" }}>
                    <SectionTitle icon={Shield} title="Estado de Salud" />
                    <div className="flex items-center gap-4">
                      <HealthRing score={health} />
                      <div className="flex-1">
                        <p className="text-2xl font-black text-[#0A183A]">{health}<span className="text-sm text-gray-400">/100</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {health >= 60 ? "Llanta en buen estado" : health >= 35 ? "Requiere seguimiento" : "Acción inmediata"}
                        </p>
                        <div className="mt-2 h-2 rounded-full bg-gray-100">
                          <div className="h-full rounded-full"
                            style={{ width: `${health}%`, background: health >= 60 ? "#22c55e" : health >= 35 ? "#f97316" : "#ef4444" }} />
                        </div>
                        {condMeta && <div className="mt-2"><SemaforoBadge tire={tire} /></div>}
                      </div>
                    </div>
                  </div>

                  {/* Pressure */}
                  {last?.presionPsi != null && (
                    <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)" }}>
                      <SectionTitle icon={Gauge} title="Presión Neumático" />
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-black text-[#0A183A]">{last.presionPsi} <span className="text-sm text-gray-400">PSI</span></div>
                        {last.presionRecomendadaPsi && (
                          <div className="flex-1 text-right">
                            <p className="text-xs text-gray-400">Recomendada</p>
                            <p className="text-sm font-bold text-gray-600">{last.presionRecomendadaPsi} PSI</p>
                          </div>
                        )}
                      </div>
                      {last.presionDelta != null && (
                        <span className="mt-2 inline-flex text-xs font-bold px-2 py-1 rounded-lg"
                          style={{
                            background: last.presionDelta < -10 ? "rgba(239,68,68,0.1)" : last.presionDelta < 0 ? "rgba(249,115,22,0.1)" : "rgba(34,197,94,0.1)",
                            color: last.presionDelta < -10 ? "#ef4444" : last.presionDelta < 0 ? "#f97316" : "#22c55e",
                          }}>
                          {last.presionDelta > 0 ? "+" : ""}{last.presionDelta.toFixed(1)} PSI vs recomendada
                        </span>
                      )}
                    </div>
                  )}

                  {/* Financial */}
                  <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)" }}>
                    <SectionTitle icon={DollarSign} title="Resumen Financiero" />
                    {totalCost > 0 ? (
                      <div className="space-y-0">
                        {[
                          { label: "Inversión Total", value: `$${totalCost.toLocaleString("es-CO")}`, bold: true },
                          ...(last?.cpk != null ? [{ label: "CPK Actual", value: `$${Math.round(last.cpk).toLocaleString("es-CO")}/km`, bold: false }] : []),
                          ...(last?.cpkProyectado != null ? [{ label: "CPK Proyectado", value: `$${Math.round(last.cpkProyectado).toLocaleString("es-CO")}/km`, bold: false }] : []),
                          ...(last?.cpt != null ? [{ label: "CPT Actual", value: `$${Math.round(last.cpt).toLocaleString("es-CO")}/mes`, bold: false }] : []),
                        ].map(row => (
                          <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{row.label}</span>
                            <span className={`text-sm ${row.bold ? "font-black text-[#0A183A]" : "font-bold text-[#1E76B6]"}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-gray-400">Sin registros de costo</p>}
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <WearChart inspecciones={tire.inspecciones} />
                <CpkChart inspecciones={tire.inspecciones} />
              </div>

              {/* SENTINEL analysis & recommendations */}
              <SentinelAnalysis tire={tire} />
            </div>
          )}

          {/* --- INSPECCIONES --- */}
          {activeTab === "inspecciones" && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)" }}>
              <div className="p-4 border-b border-gray-50">
                <SectionTitle icon={Calendar} title="Historial de Inspecciones" badge={`${tire.inspecciones.length} registros`} />
                {/* Fecha de instalacion editor */}
                <FechaInstalacionEditor tire={tire} onUpdated={(updated) => { onUpdate(updated); }} />
              </div>
              <div className="p-4">
                <InspectionTable tire={tire} onDelete={onDelete} onEdit={onEdit} />
              </div>
            </div>
          )}

          {/* --- COSTOS --- */}
          {activeTab === "costos" && (
            <div className="rounded-2xl p-4"
              style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)" }}>
              <SectionTitle icon={DollarSign} title="Análisis de Costos" badge={`${tire.costo.length} entradas`} />
              {tire.costo.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sin registros de costo</p>
              ) : (
                <div className="space-y-2">
                  {tire.costo.map((entry, idx) => (
                    <div key={`costo-${idx}`} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(10,24,58,0.05)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(30,118,182,0.1)" }}>
                          <DollarSign className="w-4 h-4 text-[#1E76B6]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0A183A]">
                            {new Date(entry.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                          <p className="text-[10px] text-gray-400">Entrada #{idx + 1}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-[#0A183A]">${entry.valor.toLocaleString("es-CO")}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-xl mt-2"
                    style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                    <span className="text-white font-bold text-sm">Total Invertido</span>
                    <span className="text-white font-black text-lg">${totalCost.toLocaleString("es-CO")}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- VIDA --- */}
          {activeTab === "vida" && (
            <div className="rounded-2xl p-4"
              style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)" }}>
              <SectionTitle icon={Repeat} title="Historial de Vida" badge={`${tire.vida.length} fases`} />
              <VidaHistory tire={tire} />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              style={{ border: "1px solid rgba(10,24,58,0.1)" }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================
const BuscarPage: React.FC = () => {
  const [searchMode, setSearchMode] = useState<"vehicle" | "tire">("vehicle");
  const [searchTerm, setSearchTerm] = useState("");
  const [tires,   setTires]   = useState<Tire[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);

  const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = storedUser ? JSON.parse(storedUser) : null;
  const companyId = user?.companyId;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setTires([]); setVehicle(null); setSelectedTire(null);
    if (!searchTerm.trim()) { setError("Por favor ingrese un valor para buscar"); return; }
    if (!companyId)          { setError("Información de la compañía no encontrada"); return; }
    setLoading(true);
    try {
      if (searchMode === "vehicle") {
        const vRes = await authFetch(
          `${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(searchTerm.trim().toLowerCase())}&companyId=${companyId}`
        );
        if (!vRes.ok) throw new Error("Vehículo no encontrado");
        const v: Vehicle = await vRes.json();
        setVehicle(v);
        const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${v.id}`);
        if (!tRes.ok) throw new Error("Error al obtener las llantas");
        const raw: RawTire[] = await tRes.json();
        setTires(raw.filter(t => t.companyId === companyId).map(normalise).sort((a, b) => a.posicion - b.posicion));
      } else {
        const tRes = await authFetch(
          `${API_BASE}/tires?companyId=${companyId}`
        );
        if (!tRes.ok) throw new Error("Llanta no encontrada");
        const raw: RawTire[] = await tRes.json();
        const term = searchTerm.trim().toLowerCase();
        const matched = raw
          .filter(t => t.placa.toLowerCase() === term || t.placa.toLowerCase().includes(term))
          .sort((a, b) => {
            // Exact match first, then by how close the match is
            const aExact = a.placa.toLowerCase() === term ? 0 : 1;
            const bExact = b.placa.toLowerCase() === term ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
            // Then by startsWith
            const aStarts = a.placa.toLowerCase().startsWith(term) ? 0 : 1;
            const bStarts = b.placa.toLowerCase().startsWith(term) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            return a.posicion - b.posicion;
          });
        if (matched.length === 0) throw new Error(`No se encontró la llanta "${searchTerm.trim()}"`);
        setTires(matched.map(normalise));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteInspection(fecha: string) {
    if (!selectedTire) return;
    if (!window.confirm("¿Eliminar esta inspección?")) return;
    try {
      const res = await authFetch(
        `${API_BASE}/tires/${selectedTire.id}/inspection?fecha=${encodeURIComponent(fecha)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      const updated: Tire = {
        ...selectedTire,
        inspecciones: selectedTire.inspecciones.filter(i => i.fecha !== fecha),
      };
      setSelectedTire(updated);
      setTires(ts => ts.map(t => t.id === updated.id ? updated : t));
    } catch {
      alert("No se pudo eliminar la inspección");
    }
  }

  async function handleEditInspection(oldFecha: string, data: { fecha: string; profundidadInt: number; profundidadCen: number; profundidadExt: number; inspeccionadoPorNombre: string; kilometrosEstimados?: number }) {
    if (!selectedTire) return;
    try {
      const body: any = {};
      // Only send fields that actually changed
      const oldInsp = selectedTire.inspecciones.find(i => i.fecha === oldFecha);
      if (data.fecha && data.fecha !== new Date(oldFecha).toISOString().split("T")[0]) body.fecha = new Date(data.fecha).toISOString();
      if (oldInsp && data.profundidadInt !== oldInsp.profundidadInt) body.profundidadInt = data.profundidadInt;
      if (oldInsp && data.profundidadCen !== oldInsp.profundidadCen) body.profundidadCen = data.profundidadCen;
      if (oldInsp && data.profundidadExt !== oldInsp.profundidadExt) body.profundidadExt = data.profundidadExt;
      if (data.inspeccionadoPorNombre !== (oldInsp?.inspeccionadoPorNombre ?? "")) body.inspeccionadoPorNombre = data.inspeccionadoPorNombre;
      if (data.kilometrosEstimados !== undefined && data.kilometrosEstimados !== (oldInsp?.kilometrosEstimados ?? undefined)) body.kilometrosEstimados = data.kilometrosEstimados;

      if (Object.keys(body).length === 0) return; // Nothing changed

      const res = await authFetch(
        `${API_BASE}/tires/${selectedTire.id}/inspection/edit?fecha=${encodeURIComponent(oldFecha)}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      if (!res.ok) throw new Error("No se pudo guardar");

      // The edit endpoint returns the full updated tire
      const raw = await res.json();
      const updated = normalise(raw);
      setSelectedTire(updated);
      setTires(ts => ts.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al editar la inspección");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#ffff" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-3"
        style={{ background: "rgba(241,245,249,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          <Search className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none tracking-tight">Buscar Llanta</h1>
          <p className="text-xs text-[#1E76B6] mt-0.5">Análisis por placa de vehículo o ID de llanta</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-5">
        {/* Search */}
        <div className="rounded-2xl p-4 sm:p-5"
          style={{ background: "white", border: "1px solid rgba(10,24,58,0.08)", boxShadow: "0 4px 20px rgba(10,24,58,0.04)" }}>
          <form onSubmit={handleSearch}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative sm:w-56 flex-shrink-0">
                <select value={searchMode} onChange={e => setSearchMode(e.target.value as "vehicle" | "tire")}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ background: "rgba(10,24,58,0.04)", border: "1px solid rgba(10,24,58,0.12)", color: "#0A183A" }}>
                  <option value="vehicle">Por Placa de Vehículo</option>
                  <option value="tire">Por ID de Llanta</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-400" />
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  {searchMode === "vehicle" ? <Car className="w-4 h-4 text-gray-400" /> : <Circle className="w-4 h-4 text-gray-400" />}
                </div>
                <input type="text"
                  placeholder={searchMode === "vehicle" ? "Ej: ABC123" : "Ej: llanta-id-001"}
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ background: "rgba(10,24,58,0.04)", border: "1px solid rgba(10,24,58,0.12)", color: "#0A183A" }} />
              </div>
              <button type="submit" disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? "Buscando…" : "Buscar"}
              </button>
            </div>
          </form>
          {error && (
            <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-red-600">{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {tires.length > 0 && (
          <div className="space-y-5">
            {searchMode === "vehicle" && vehicle && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Car className="w-4 h-4 text-[#1E76B6]" />
                  <span className="text-sm font-black text-[#0A183A]">Vehículo {vehicle.placa.toUpperCase()}</span>
                  {vehicle.tipovhc && (
                    <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(10,24,58,0.06)" }}>{vehicle.tipovhc}</span>
                  )}
                </div>
                <VehicleFleetOverview tires={tires} />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#0A183A]">{tires.length} {tires.length === 1 ? "Llanta" : "Llantas"}</span>
                <span className="text-xs text-gray-400">encontradas</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {tires.map(tire => (
                <TireCard key={tire.id} tire={tire} onView={() => setSelectedTire(tire)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTire && (
        <TireDetailModal
          tire={selectedTire}
          onClose={() => setSelectedTire(null)}
          onUpdate={updated => {
            setSelectedTire(updated);
            setTires(ts => ts.map(t => t.id === updated.id ? updated : t));
          }}
          onDelete={handleDeleteInspection}
          onEdit={handleEditInspection}
        />
      )}
    </div>
  );
};

export default BuscarPage;