"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
} from "recharts";

// --- Types --------------------------------------------------------------------

type CostEntry  = { valor: number; fecha: string };
type VidaEntry  = { valor: string; fecha: string };

type Inspection = {
  fecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk: number;
  cpkProyectado: number;
  cpt?: number;
  cptProyectado?: number;
  presionPsi?: number;
  presionRecomendadaPsi?: number;
  presionDelta?: number;
  diasEnUso?: number;
  mesesEnUso?: number;
  kilometrosRecorridos?: number;
  kmActualVehiculo?: number;
  vidaAlMomento?: string;
  source?: string;
};

type PrimeraVida = { diseno: string; cpk: number; costo: number; kilometros: number };
type Desechos    = { causales: string; milimetrosDesechados: number; remanente: number; fecha: string };

type Tire = {
  id: string;
  companyId: string;
  vehicleId?: string | null;
  placa: string;
  vida: VidaEntry[];
  marca: string;
  diseno: string;
  profundidadInicial: number;
  dimension: string;
  eje: string;
  costo: CostEntry[];
  posicion: number;
  inspecciones: Inspection[];
  primeraVida: PrimeraVida[];
  kilometrosRecorridos: number;
  fechaInstalacion?: string | null;
  diasAcumulados: number;
  eventos: { valor?: string; notas?: string; fecha: string; tipo?: string }[];
  desechos?: Desechos | null;
  // Cached analytics fields from DB
  currentCpk?: number | null;
  currentCpt?: number | null;
  currentProfundidad?: number | null;
  currentPresionPsi?: number | null;
  cpkTrend?: number | null;
  projectedKmRemaining?: number | null;
  projectedDateEOL?: string | null;
  healthScore?: number | null;
  alertLevel?: string | null;
  vidaActual?: string | null;
  totalVidas?: number;
  lastInspeccionDate?: string | null;
  inventoryBucketId?: string | null;
  lastVehicleId?: string | null;
  lastVehiclePlaca?: string | null;
};

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  tipovhc: string;
  tireCount?: number;
  cliente?: string | null;
  companyId: string;
  union: string[];
  carga?: string;
  pesoCarga?: number;
  presionesRecomendadas?: { posicion: number; presionRecomendadaPsi: number }[];
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  puntos: number;
  isVerified: boolean;
  preferredLanguage?: string | null;
};

type Company = {
  id: string;
  name: string;
  plan: string;
  tireCount: number;
  userCount: number;
  vehicleCount: number;
  periodicity: number;
  profileImage?: string;
};

// --- Constants ----------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const ML = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/** Attach the JWT stored by AuthProvider to every request. */
function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

const P = {
  navy:    "#0A183A",
  cobalt:  "#173D68",
  azure:   "#1E76B6",
  sky:     "#348CCB",
  teal:    "#0d9488",
  emerald: "#059669",
  amber:   "#d97706",
  flame:   "#ea580c",
  crimson: "#dc2626",
  slate:   "#475569",
  violet:  "#7c3aed",
  rose:    "#e11d48",
  gold:    "#ca8a04",
};

const SC = [
  "#1E76B6","#0d9488","#d97706","#7c3aed","#059669",
  "#ea580c","#348CCB","#e11d48","#ca8a04","#475569",
  "#dc2626","#0891b2","#16a34a","#9333ea","#c2410c",
];

// --- Utility ------------------------------------------------------------------

const norm = (t: Tire): Tire => ({
  ...t,
  vida:         Array.isArray(t.vida)         ? t.vida         : [],
  costo:        Array.isArray(t.costo)        ? t.costo        : [],
  inspecciones: Array.isArray(t.inspecciones) ? t.inspecciones : [],
  primeraVida:  Array.isArray(t.primeraVida)  ? t.primeraVida  : [],
  eventos:      Array.isArray(t.eventos)      ? t.eventos      : [],
});

const lastVida = (t: Tire): string => {
  if (t.vidaActual) return t.vidaActual.toLowerCase();
  if (t.vida?.length) return t.vida[t.vida.length - 1].valor.toLowerCase();
  return "nueva";
};

const active     = (t: Tire) => lastVida(t) !== "fin";
const latestInsp = (t: Tire): Inspection | null => {
  if (!t.inspecciones?.length) return null;
  return [...t.inspecciones].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )[0];
};

const minD    = (i: Inspection) => Math.min(i.profundidadInt ?? 99, i.profundidadCen ?? 99, i.profundidadExt ?? 99);
const avgD    = (i: Inspection) => (i.profundidadInt + i.profundidadCen + i.profundidadExt) / 3;
const tcost   = (t: Tire)       => t.costo?.reduce((s, c) => s + (c.valor || 0), 0) ?? 0;
const safeAvg = (a: number[])   => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

const sem = (t: Tire): "optimo" | "60d" | "30d" | "urgente" | "sin" => {
  if (t.alertLevel) {
    const a = t.alertLevel.toLowerCase();
    if (a === "ok")       return "optimo";
    if (a === "watch")    return "60d";
    if (a === "warning")  return "30d";
    if (a === "critical") return "urgente";
  }
  const l = latestInsp(t);
  if (!l) return "sin";
  const m = minD(l);
  if (m > 7) return "optimo";
  if (m > 6) return "60d";
  if (m > 5) return "30d";
  return "urgente";
};

const fmt  = (n: number, d = 0) => isNaN(n) ? "0" : n.toLocaleString("es-CO", { maximumFractionDigits: d });
const fmtM = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : fmt(n);
const pct  = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "0%";

// --- Micro-components ---------------------------------------------------------

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-32 gap-4">
    <div className="relative w-14 h-14">
      <div className="absolute inset-0 rounded-full border-4 border-[#1E76B6]/10" />
      <div className="absolute inset-0 rounded-full border-4 border-t-[#1E76B6] animate-spin" />
    </div>
    <p className="text-[#1E76B6] font-semibold text-sm tracking-wide">Cargando datos globales…</p>
  </div>
);

function KPI({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-2 shadow-lg"
      style={{ background: color }}>
      <div className="absolute -right-3 -top-3 text-7xl opacity-[0.06] select-none leading-none">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">{label}</p>
      <p className="text-[2rem] font-black text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-white/45">{sub}</p>}
    </div>
  );
}

function Card({ title, children, className = "" }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0A183A]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl"
      style={{ background: color + "14", border: `1px solid ${color}22` }}>
      <span className="text-[10px] uppercase tracking-widest font-black" style={{ color }}>{label}</span>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
    </div>
  );
}

function RankBar({ label, value, max, color, suffix = "", detail }: {
  label: string; value: number; max: number; color: string; suffix?: string; detail?: string;
}) {
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5 group cursor-default">
      <span className="text-sm text-gray-400 w-44 truncate shrink-0 group-hover:text-gray-700 transition-colors" title={label}>
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: color }} />
      </div>
      <span className="text-sm font-black tabular-nums shrink-0 w-20 text-right" style={{ color }}>
        {fmt(value)}{suffix}
      </span>
      {detail && <span className="text-xs text-gray-300 shrink-0">{detail}</span>}
    </div>
  );
}

const Tip = ({ active: a, payload, label }: any) => {
  if (!a || !payload?.length) return null;
  return (
    <div className="bg-[#0A183A] text-white text-xs rounded-xl px-3 py-2.5 shadow-2xl border border-white/10 min-w-[120px]">
      {label && <p className="font-bold mb-1.5 text-white/50 text-[10px] uppercase tracking-wider">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center justify-between gap-3" style={{ color: p.color || "#93c5fd" }}>
          <span className="opacity-70">{p.name}</span>
          <span className="font-black">{typeof p.value === "number" ? fmt(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

function DataTable({ cols, rows, small }: {
  cols: string[]; rows: (string | number | React.ReactNode)[][];
  small?: boolean;
}) {
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className={`w-full ${small ? "text-xs" : "text-sm"}`}>
        <thead>
          <tr className="border-b-2 border-gray-50">
            {cols.map(c => (
              <th key={c} className="text-left py-3 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-gray-300">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
              {row.map((cell, j) => <td key={j} className="py-2.5 px-3 text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const m: Record<string, string> = {
    premium: "#059669", pro: "#1E76B6", enterprise: "#7c3aed",
    distribuidor: "#ea580c", basic: "#94a3b8",
  };
  const col = m[plan?.toLowerCase()] ?? "#94a3b8";
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-black capitalize whitespace-nowrap"
      style={{ background: col + "1a", color: col, border: `1px solid ${col}30` }}>
      {plan}
    </span>
  );
}

function AlertBadge({ level }: { level?: string | null }) {
  const m: Record<string, [string, string]> = {
    ok:       [P.emerald, "OK"],
    watch:    [P.amber,   "Vigilar"],
    warning:  [P.flame,   "Alerta"],
    critical: [P.crimson, "Crítico"],
  };
  const [col, lbl] = m[level?.toLowerCase() ?? "ok"] ?? m.ok;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
      style={{ background: col + "18", color: col }}>{lbl}</span>
  );
}

function HealthBar({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  const col = score >= 70 ? P.emerald : score >= 50 ? P.amber : score >= 25 ? P.flame : P.crimson;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[56px]">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: col }} />
      </div>
      <span className="text-xs font-black tabular-nums" style={{ color: col }}>{score}</span>
    </div>
  );
}

function VidaBadge({ vida }: { vida: string }) {
  const m: Record<string, string> = {
    nueva: P.azure, reencauche1: P.teal, reencauche2: P.violet, reencauche3: P.flame, fin: P.crimson,
  };
  const col = m[vida?.toLowerCase()] ?? P.slate;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black capitalize"
      style={{ background: col + "18", color: col }}>{vida}</span>
  );
}

// --- Tab Types ----------------------------------------------------------------

type TabId = "overview" | "tires" | "vehicles" | "companies" | "users" | "pressure" | "fleet";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview",   label: "Resumen",     icon: "📊" },
  { id: "tires",      label: "Llantas",     icon: "🛞" },
  { id: "pressure",   label: "Presión",     icon: "💨" },
  { id: "fleet",      label: "Flota Intel", icon: "🧠" },
  { id: "vehicles",   label: "Vehículos",   icon: "🚛" },
  { id: "companies",  label: "Compañías",   icon: "🏢" },
  { id: "users",      label: "Usuarios",    icon: "👥" },
];

// --- Main ---------------------------------------------------------------------

export default function AdminDashboard() {
  const [tires,     setTires]     = useState<Tire[]>([]);
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([]);
  const [users,     setUsers]     = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [errs,      setErrs]      = useState<string[]>([]);
  const [tab,       setTab]       = useState<TabId>("overview");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [search,    setSearch]    = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErrs([]);
    const e: string[] = [];
    const safe = async <T,>(url: string, label: string): Promise<T[]> => {
      try {
        const r = await authFetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return Array.isArray(d) ? d : [];
      } catch (err: any) { e.push(`${label}: ${err.message}`); return []; }
    };
    const [tr, vr, ur, cr] = await Promise.all([
      safe<Tire>   (`${API}/tires/all`,     "Llantas"),
      safe<Vehicle>(`${API}/vehicles/all`,  "Vehículos"),
      safe<User>   (`${API}/users/all`,     "Usuarios"),
      safe<Company>(`${API}/companies/all`, "Compañías"),
    ]);
    setTires(tr.map(norm)); setVehicles(vr); setUsers(ur); setCompanies(cr);
    if (e.length) setErrs(e);
    setLastFetch(new Date()); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // -- Computed stats ---------------------------------------------------------
  const S = useMemo(() => {
    const act = tires.filter(active);
    const ret = tires.filter(t => !active(t));
    const wi  = act.filter(t => latestInsp(t) !== null);
    const now = new Date();

    // Semáforo
    const sc = { optimo: 0, "60d": 0, "30d": 0, urgente: 0, sin: 0 };
    act.forEach(t => sc[sem(t)]++);

    // Vida distribution
    const byVida: Record<string, number> = {};
    act.forEach(t => { const v = lastVida(t); byVida[v] = (byVida[v] || 0) + 1; });

    // Health
    const hsArr     = act.filter(t => t.healthScore != null).map(t => t.healthScore as number);
    const avgHealth = safeAvg(hsArr);
    const hsDistrib = [
      { range: "90-100", count: hsArr.filter(s => s >= 90).length },
      { range: "70-89",  count: hsArr.filter(s => s >= 70 && s < 90).length },
      { range: "50-69",  count: hsArr.filter(s => s >= 50 && s < 70).length },
      { range: "25-49",  count: hsArr.filter(s => s >= 25 && s < 50).length },
      { range: "0-24",   count: hsArr.filter(s => s < 25).length },
    ];

    // Financial
    const totalInv = tires.reduce((s, t) => s + tcost(t), 0);
    const monthSp  = tires.reduce((s, t) =>
      s + t.costo.reduce((ss, c) => {
        const d = new Date(c.fecha);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() ? ss + c.valor : ss;
      }, 0), 0);
    const msp: Record<string, number> = {};
    tires.forEach(t => t.costo.forEach(c => {
      const d = new Date(c.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      msp[k] = (msp[k] || 0) + c.valor;
    }));
    const sp12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { mes: ML[d.getMonth()], gasto: msp[k] || 0 };
    });

    // CPK / CPT
    const cpks = act.map(t => t.currentCpk ?? latestInsp(t)?.cpk ?? 0).filter(v => v > 0 && isFinite(v));
    const cpkp = wi.map(t => latestInsp(t)!.cpkProyectado).filter(v => v > 0 && isFinite(v));
    const cpts = act.map(t => t.currentCpt ?? latestInsp(t)?.cpt ?? 0).filter(v => v > 0);
    const avgCPK  = safeAvg(cpks);
    const avgCPKP = safeAvg(cpkp);
    const avgCPT  = safeAvg(cpts);

    const trendArr       = act.filter(t => t.cpkTrend != null).map(t => t.cpkTrend as number);
    const avgCpkTrend    = trendArr.length ? safeAvg(trendArr) : null;
    const improvingTires = trendArr.filter(v => v < -0.05).length;
    const degradingTires = trendArr.filter(v => v > 0.05).length;

    // KM / depth
    const totalKm  = act.reduce((s, t) => s + (t.kilometrosRecorridos || 0), 0);
    const depVals  = wi.map(t => t.currentProfundidad ?? avgD(latestInsp(t)!));
    const avgDepth = safeAvg(depVals);
    const critical = act.filter(t => sem(t) === "urgente").length;
    const projKmArr   = act.filter(t => (t.projectedKmRemaining ?? 0) > 0).map(t => t.projectedKmRemaining as number);
    const totalProjKm = projKmArr.reduce((s, v) => s + v, 0);

    // Pressure
    const tiresWithPressure = wi.filter(t => latestInsp(t)?.presionPsi != null);
    const underInflated     = tiresWithPressure.filter(t => (latestInsp(t)!.presionDelta ?? 0) < -10);
    const criticalPressure  = tiresWithPressure.filter(t => (latestInsp(t)!.presionDelta ?? 0) < -20);
    const avgPresion        = safeAvg(tiresWithPressure.map(t => latestInsp(t)!.presionPsi as number));

    // By brand
    const bb: Record<string, { count: number; totalCost: number; totalKm: number; cpks: number[]; depths: number[]; healthScores: number[] }> = {};
    act.forEach(t => {
      const b = (t.marca || "Desconocido").toUpperCase();
      if (!bb[b]) bb[b] = { count: 0, totalCost: 0, totalKm: 0, cpks: [], depths: [], healthScores: [] };
      bb[b].count++; bb[b].totalCost += tcost(t); bb[b].totalKm += t.kilometrosRecorridos || 0;
      const l = latestInsp(t);
      if (l) {
        const cpk = t.currentCpk ?? l.cpk;
        if (cpk > 0) bb[b].cpks.push(cpk);
        bb[b].depths.push(t.currentProfundidad ?? avgD(l));
      }
      if (t.healthScore != null) bb[b].healthScores.push(t.healthScore);
    });

    const topBrands  = Object.entries(bb).sort((a, b) => b[1].count - a[1].count).slice(0, 6);
    const maxKmBrand = Math.max(...topBrands.map(([, v]) => v.totalKm), 1);
    const maxCpk     = Math.max(...topBrands.map(([, v]) => safeAvg(v.cpks)), 1);
    const brandRadar = topBrands.map(([brand, v]) => ({
      brand: brand.length > 10 ? brand.slice(0, 10) + "…" : brand,
      health: safeAvg(v.healthScores),
      kmEff:  Math.round((v.totalKm / maxKmBrand) * 100),
      cpkEff: maxCpk > 0 ? Math.round((1 - safeAvg(v.cpks) / maxCpk) * 100) : 0,
      depth:  Math.round(safeAvg(v.depths) * 10),
      count:  v.count,
    }));

    const cnt = (key: keyof Tire) => {
      const m: Record<string, number> = {};
      act.forEach(t => { const v = (t[key] as string) || "N/A"; m[v] = (m[v] || 0) + 1; });
      return m;
    };
    const byDiseno    = cnt("diseno");
    const byDimension = cnt("dimension");
    const byEje       = cnt("eje");

    const rCount = act.filter(t => lastVida(t).startsWith("reencauche")).length;
    const rRate  = act.length ? (rCount / act.length) * 100 : 0;
    const r2Count = act.filter(t => lastVida(t) === "reencauche2").length;
    const r3Count = act.filter(t => lastVida(t) === "reencauche3").length;
    const rSave  = act
      .filter(t => t.primeraVida.length > 0 && t.costo.length > 1)
      .reduce((s, t) => s + Math.max((t.primeraVida[0]?.costo || 0) - (t.costo[t.costo.length - 1]?.valor || 0), 0), 0);

    const dTires = ret.filter(t => t.desechos);
    const desByR: Record<string, number> = {};
    let totRem = 0;
    dTires.forEach(t => {
      const r = t.desechos!.causales || "Desconocido";
      desByR[r] = (desByR[r] || 0) + 1;
      totRem += t.desechos!.remanente || 0;
    });
    const avgMmD = dTires.length ? safeAvg(dTires.map(t => t.desechos!.milimetrosDesechados || 0)) : 0;

    // Inspections per month
    const ipm: Record<string, number> = {};
    tires.forEach(t => t.inspecciones.forEach(i => {
      const d = new Date(i.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      ipm[k] = (ipm[k] || 0) + 1;
    }));
    const insp12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { mes: ML[d.getMonth()], inspecciones: ipm[k] || 0 };
    });
    const totalInsp = tires.reduce((s, t) => s + t.inspecciones.length, 0);

    const sourceCount: Record<string, number> = {};
    wi.forEach(t => {
      const src = latestInsp(t)?.source ?? "manual";
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    });

    const cpkByBrand = Object.entries(bb)
      .map(([b, v]) => ({
        brand: b.length > 14 ? b.slice(0, 13) + "…" : b,
        cpk: v.cpks.length ? safeAvg(v.cpks) : 0,
        count: v.count,
        health: safeAvg(v.healthScores),
      }))
      .filter(x => x.cpk > 0)
      .sort((a, b) => a.cpk - b.cpk)
      .slice(0, 14);

    const dpm: Record<string, number[]> = {};
    tires.forEach(t => t.inspecciones.forEach(i => {
      const d = new Date(i.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!dpm[k]) dpm[k] = [];
      dpm[k].push(avgD(i));
    }));
    const dep12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const vals = dpm[k] || [];
      return { mes: ML[d.getMonth()], profundidad: vals.length ? safeAvg(vals) : null };
    });

    // Vehicles
    const vbt: Record<string, number> = {};
    vehicles.forEach(v => { const t = v.tipovhc || "Desconocido"; vbt[t] = (vbt[t] || 0) + 1; });
    const vWithPressureConfig = vehicles.filter(v => Array.isArray(v.presionesRecomendadas) && v.presionesRecomendadas.length > 0).length;
    const avgKmV = safeAvg(vehicles.map(v => v.kilometrajeActual || 0));
    const vwt    = vehicles.filter(v => (v.tireCount ?? 0) > 0).length;
    const vEmpty = vehicles.length - vwt;
    const vUnion = vehicles.filter(v => Array.isArray(v.union) && v.union.length > 0).length;
    const vbc: Record<string, number> = {};
    vehicles.forEach(v => { const c = v.cliente || "Sin cliente"; vbc[c] = (vbc[c] || 0) + 1; });
    const kmBuckets = [
      { label: "0-50k",    count: vehicles.filter(v => (v.kilometrajeActual || 0) < 50_000).length },
      { label: "50-100k",  count: vehicles.filter(v => (v.kilometrajeActual || 0) >= 50_000  && (v.kilometrajeActual || 0) < 100_000).length },
      { label: "100-200k", count: vehicles.filter(v => (v.kilometrajeActual || 0) >= 100_000 && (v.kilometrajeActual || 0) < 200_000).length },
      { label: "200-500k", count: vehicles.filter(v => (v.kilometrajeActual || 0) >= 200_000 && (v.kilometrajeActual || 0) < 500_000).length },
      { label: "500k+",    count: vehicles.filter(v => (v.kilometrajeActual || 0) >= 500_000).length },
    ];

    // Companies
    const cbp: Record<string, number> = {};
    companies.forEach(c => { cbp[c.plan] = (cbp[c.plan] || 0) + 1; });
    const topCo    = [...companies].sort((a, b) => (b.tireCount || 0) - (a.tireCount || 0)).slice(0, 15);
    const perDist: Record<number, number> = {};
    companies.forEach(c => { perDist[c.periodicity] = (perDist[c.periodicity] || 0) + 1; });
    const planPrice: Record<string, number> = { premium: 500_000, pro: 300_000, enterprise: 1_000_000, distribuidor: 400_000, basic: 150_000 };

    // Users
    const ubr: Record<string, number> = {};
    users.forEach(u => { ubr[u.role] = (ubr[u.role] || 0) + 1; });
    const verified  = users.filter(u => u.isVerified).length;
    const totPuntos = users.reduce((s, u) => s + (u.puntos || 0), 0);
    const ubl: Record<string, number> = {};
    users.forEach(u => { const l = u.preferredLanguage || "es"; ubl[l] = (ubl[l] || 0) + 1; });
    const ubco: Record<string, number> = {};
    users.forEach(u => { ubco[u.companyId] = (ubco[u.companyId] || 0) + 1; });
    const topUCo = Object.entries(ubco).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([cid, cnt]) => ({ name: companies.find(c => c.id === cid)?.name || cid.slice(0, 8), count: cnt }));
    const topUsers = [...users].sort((a, b) => (b.puntos || 0) - (a.puntos || 0)).slice(0, 30);

    // CPK scatter
    const cpkScatter = act
      .filter(t => latestInsp(t) && t.currentCpk)
      .map(t => ({ km: t.kilometrosRecorridos || 0, cpk: t.currentCpk as number, health: t.healthScore ?? 50 }))
      .slice(0, 200);

    return {
      totalTires: tires.length, activeTires: act.length, retiredTires: ret.length,
      critical, withInsp: wi.length, totalInsp,
      rCount, rRate, rSave, r2Count, r3Count,
      totalInv, monthSp, avgCPK, avgCPKP, avgCPT,
      totalKm, avgDepth, totalProjKm,
      avgHealth, hsDistrib, avgCpkTrend, improvingTires, degradingTires,
      desByR, totRem, avgMmD,
      sc, bb, byDiseno, byDimension, byEje, byVida,
      sp12, insp12, dep12, cpkByBrand, brandRadar, cpkScatter,
      sourceCount,
      tiresWithPressure: tiresWithPressure.length,
      underInflated: underInflated.length,
      criticalPressure: criticalPressure.length,
      avgPresion, vWithPressureConfig,
      vbt, avgKmV, vwt, vEmpty, vUnion, vbc, kmBuckets,
      cbp, topCo, perDist, planPrice,
      ubr, verified, totPuntos, ubl, topUCo, topUsers,
    };
  }, [tires, vehicles, users, companies]);

  // -- Render -----------------------------------------------------------------
  return (
    <div className="min-h-screen" style={{ background: "#f5f7fb", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${P.navy} 0%,${P.cobalt} 55%,${P.azure} 100%)` }}
        className="px-6 py-5 shadow-2xl">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 24 }}>🛞</span>
              <h1 className="text-2xl font-black text-white tracking-tight">TirePro · Admin</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-white/50 uppercase tracking-widest">Live</span>
            </div>
            <p className="text-blue-200/60 text-xs mt-1 ml-9">
              {loading ? "Cargando…" : (
                <>
                  {fmt(tires.length)} llantas · {fmt(vehicles.length)} vehículos · {fmt(companies.length)} compañías · {fmt(users.length)} usuarios
                  {lastFetch && <span className="ml-2 opacity-40">· {lastFetch.toLocaleTimeString("es-CO")}</span>}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <input placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white text-sm placeholder-white/30 border border-white/10 focus:outline-none focus:border-white/30 w-36" />
            <button onClick={load} disabled={loading}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-sm font-bold transition flex items-center gap-2">
              <span className={loading ? "animate-spin inline-block" : ""}>↻</span> Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                tab === t.id
                  ? "border-[#1E76B6] text-[#1E76B6] bg-blue-50/30"
                  : "border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50"
              }`}>
              <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {errs.length > 0 && (
        <div className="max-w-screen-2xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-1">
            {errs.map((e, i) => <p key={i} className="text-red-600 text-sm font-medium">⚠ {e}</p>)}
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        {loading ? <Spinner /> : (
          <div className="space-y-6">

            {/* ======== OVERVIEW ======== */}
            {tab === "overview" && <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPI label="Llantas totales"  value={fmt(S.totalTires)}    color={P.navy}    icon="🛞" />
                <KPI label="Activas"           value={fmt(S.activeTires)}   color={P.cobalt}  icon="✅" />
                <KPI label="Críticas ≤ 2mm"    value={fmt(S.critical)}      color={P.crimson} icon="🚨" sub="Cambio urgente" />
                <KPI label="Con inspección"    value={fmt(S.withInsp)}      color={P.azure}   icon="🔍" sub={pct(S.withInsp, S.activeTires) + " de activas"} />
                <KPI label="Salud promedio"    value={`${S.avgHealth.toFixed(0)}`} color={P.teal} icon="💚" sub="Score 0–100" />
                <KPI label="Reencauchadas"     value={fmt(S.rCount)}        color={P.emerald} icon="♻️" sub={`${S.rRate.toFixed(1)}% de activas`} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Inversión total COP" value={fmtM(S.totalInv)}        color={P.navy}   icon="💰" />
                <KPI label="Gasto este mes"       value={fmtM(S.monthSp)}         color={P.cobalt} icon="📅" />
                <KPI label="CPK promedio"         value={`$${fmtM(S.avgCPK)}`}    color={P.azure}  icon="📈" sub="Costo / km" />
                <KPI label="KM acumulados"        value={fmtM(S.totalKm)}         color={P.teal}   icon="🛣️" sub="flota activa" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Gasto mensual — últimos 12 meses">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={S.sp12} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={P.azure} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={P.azure} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<Tip />} formatter={(v: number) => fmtM(v)} />
                      <Area dataKey="gasto" name="Gasto COP" stroke={P.azure} fill="url(#gg)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Inspecciones por mes — últimos 12 meses">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={S.insp12} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={P.teal} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={P.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<Tip />} />
                      <Area dataKey="inspecciones" name="Inspecciones" stroke={P.teal} fill="url(#gi)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Semáforo */}
                <Card title="Semáforo de condición">
                  <div className="space-y-2 mb-5">
                    {([
                      ["optimo",  "Óptimo (> 7 mm)",    P.emerald],
                      ["60d",     "~60 días (> 6 mm)",  P.azure  ],
                      ["30d",     "~30 días (> 5 mm)",  P.amber  ],
                      ["urgente", "Urgente (≤ 5 mm)",   P.crimson],
                      ["sin",     "Sin inspección",      P.slate  ],
                    ] as const).map(([k, lbl, col]) => (
                      <div key={k} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                        style={{ background: col + "0f", border: `1px solid ${col}20` }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: col }} />
                          <span className="text-sm font-semibold" style={{ color: col }}>{lbl}</span>
                        </div>
                        <span className="text-lg font-black" style={{ color: col }}>{S.sc[k]}</span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={[
                        { name: "Óptimo",    value: S.sc.optimo },
                        { name: "60 días",   value: S.sc["60d"] },
                        { name: "30 días",   value: S.sc["30d"] },
                        { name: "Urgente",   value: S.sc.urgente },
                        { name: "Sin insp.", value: S.sc.sin },
                      ]} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" nameKey="name">
                        {[P.emerald, P.azure, P.amber, P.crimson, P.slate].map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Vida dist */}
                <Card title="Distribución por vida">
                  <div className="space-y-1 mb-5">
                    {Object.entries(S.byVida).sort((a, b) => b[1] - a[1]).map(([v, c], i) => (
                      <RankBar key={v} label={v.charAt(0).toUpperCase() + v.slice(1)}
                        value={c} max={S.activeTires} color={SC[i % SC.length]} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                    <StatPill label="Reenc.%" value={`${S.rRate.toFixed(1)}%`} color={P.teal} />
                    <StatPill label="R2+R3"   value={fmt(S.r2Count + S.r3Count)} color={P.violet} />
                    <StatPill label="Ahorro"  value={`$${fmtM(S.rSave)}`} color={P.emerald} />
                  </div>
                </Card>

                {/* Depth trend */}
                <Card title="Profundidad promedio mensual (mm)">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={S.dep12} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis domain={[0, "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<Tip />} formatter={(v: number) => `${v?.toFixed(1)} mm`} />
                      <Line dataKey="profundidad" name="Profundidad" stroke={P.amber} strokeWidth={2} dot={{ r: 3, fill: P.amber }} connectNulls />
                      <Line dataKey={() => 2} name="Límite legal" stroke={P.crimson} strokeDasharray="5 5" strokeWidth={1} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card title="Total inspecciones">
                  <p className="text-3xl font-black text-[#0A183A]">{fmt(S.totalInsp)}</p>
                  <p className="text-xs text-gray-400 mt-1">historia completa</p>
                </Card>
                <Card title="Compañías">
                  <p className="text-3xl font-black text-[#1E76B6]">{fmt(companies.length)}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmt(S.cbp["premium"] ?? 0)} premium</p>
                </Card>
                <Card title="Prof. prom. actual">
                  <p className="text-3xl font-black text-[#d97706]">{S.avgDepth.toFixed(1)} mm</p>
                  <p className="text-xs text-gray-400 mt-1">promedio flota activa</p>
                </Card>
                <Card title="CPT promedio">
                  <p className="text-3xl font-black text-[#059669]">${fmtM(S.avgCPT)}</p>
                  <p className="text-xs text-gray-400 mt-1">costo por mes</p>
                </Card>
              </div>
            </>}

            {/* ======== LLANTAS ======== */}
            {tab === "tires" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Activas"       value={S.activeTires}            color={P.navy}    icon="🛞" />
                <KPI label="Retiradas"     value={S.retiredTires}           color={P.slate}   icon="🗑️" />
                <KPI label="Health prom."  value={`${S.avgHealth.toFixed(0)}`} color={P.teal} icon="💚" sub="score 0–100" />
                <KPI label="Reencauchadas" value={S.rCount}                 color={P.emerald} icon="♻️" sub={`${S.rRate.toFixed(1)}%`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Distribución de Health Score">
                  <div className="space-y-1 mb-4">
                    {([
                      [S.hsDistrib[0], P.emerald],
                      [S.hsDistrib[1], P.teal],
                      [S.hsDistrib[2], P.amber],
                      [S.hsDistrib[3], P.flame],
                      [S.hsDistrib[4], P.crimson],
                    ] as [{ range: string; count: number }, string][]).map(([d, col]) => (
                      <RankBar key={d.range} label={`Score ${d.range}`}
                        value={d.count} max={S.activeTires} color={col} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                    <StatPill label="Mejorando"  value={fmt(S.improvingTires)} color={P.emerald} />
                    <StatPill label="Degradando" value={fmt(S.degradingTires)} color={P.crimson} />
                  </div>
                </Card>

                <Card title="CPK promedio por marca — menor es mejor">
                  <ResponsiveContainer width="100%" height={Math.max(200, S.cpkByBrand.length * 32)}>
                    <BarChart data={S.cpkByBrand} layout="vertical" margin={{ left: 8, right: 60, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `$${fmtM(v)}`} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis dataKey="brand" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={100} />
                      <Tooltip content={<Tip />} formatter={(v: number) => `$${fmt(v, 0)}`} />
                      <Bar dataKey="cpk" name="CPK" radius={[0, 6, 6, 0]}
                        label={{ position: "right", fontSize: 10, formatter: (v: number) => `$${fmtM(v)}` }}>
                        {S.cpkByBrand.map((_, i) => <Cell key={i} fill={SC[i % SC.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card title="Detalle por marca">
                <DataTable
                  cols={["Marca", "Llantas", "KM total", "Inversión", "CPK prom.", "Prof. prom.", "Health prom."]}
                  rows={Object.entries(S.bb).sort((a, b) => b[1].count - a[1].count).map(([b, v]) => [
                    <span key={b} className="font-black text-[#0A183A]">{b}</span>,
                    fmt(v.count),
                    fmtM(v.totalKm),
                    `$${fmtM(v.totalCost)}`,
                    v.cpks.length ? `$${fmt(safeAvg(v.cpks), 0)}` : "—",
                    v.depths.length ? `${safeAvg(v.depths).toFixed(1)} mm` : "—",
                    v.healthScores.length ? <HealthBar key="hs" score={Math.round(safeAvg(v.healthScores))} /> : "—",
                  ])}
                />
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top diseños / bandas">
                  {Object.entries(S.byDiseno).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([d, c], i) => (
                    <RankBar key={d} label={d} value={c}
                      max={Math.max(...Object.values(S.byDiseno))} color={SC[i % SC.length]} />
                  ))}
                </Card>
                <Card title="Distribución por dimensión">
                  {Object.entries(S.byDimension).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([d, c], i) => (
                    <RankBar key={d} label={d} value={c}
                      max={Math.max(...Object.values(S.byDimension))} color={SC[i % SC.length]} />
                  ))}
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Distribución por eje">
                  <ResponsiveContainer width="100%" height={175}>
                    <PieChart>
                      <Pie data={Object.entries(S.byEje).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" outerRadius={72} dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {Object.keys(S.byEje).map((_, i) => <Cell key={i} fill={SC[i % SC.length]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-0.5">
                    {Object.entries(S.byEje).sort((a, b) => b[1] - a[1]).map(([e, c], i) => (
                      <RankBar key={e} label={e} value={c}
                        max={Math.max(...Object.values(S.byEje))} color={SC[i % SC.length]} />
                    ))}
                  </div>
                </Card>

                <Card title="Análisis de desechos">
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <StatPill label="Retiradas" value={S.retiredTires}      color={P.crimson} />
                    <StatPill label="Prom. mm"  value={S.avgMmD.toFixed(1)} color={P.flame}   />
                    <StatPill label="Remanente" value={`$${fmtM(S.totRem)}`} color={P.amber}  />
                  </div>
                  {Object.keys(S.desByR).length > 0 ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-300 mb-3">Causales</p>
                      {Object.entries(S.desByR).sort((a, b) => b[1] - a[1]).map(([r, c]) => (
                        <RankBar key={r} label={r} value={c}
                          max={Math.max(...Object.values(S.desByR))} color={P.crimson} />
                      ))}
                    </>
                  ) : <p className="text-gray-400 text-sm text-center py-4">Sin causales registradas.</p>}
                </Card>
              </div>

              {/* Top tires table */}
              <Card title="Llantas con mayor deterioro (CPK más alto)">
                <DataTable
                  cols={["Llanta", "Marca", "Vida", "CPK", "Profundidad", "Health", "Alerta", "EOL"]}
                  rows={[...tires]
                    .filter(t => active(t) && (t.currentCpk ?? latestInsp(t)?.cpk ?? 0) > 0)
                    .sort((a, b) => (b.currentCpk ?? 0) - (a.currentCpk ?? 0))
                    .slice(0, 20)
                    .map(t => {
                      const l = latestInsp(t);
                      return [
                        <span key={t.id} className="font-mono text-xs font-black text-[#0A183A]">{t.placa.toUpperCase()}</span>,
                        t.marca.toUpperCase(),
                        <VidaBadge key="v" vida={lastVida(t)} />,
                        <span key="cpk" className="font-black text-[#dc2626]">${fmtM(t.currentCpk ?? l?.cpk ?? 0)}</span>,
                        l ? `${avgD(l).toFixed(1)} mm` : "—",
                        <HealthBar key="hs" score={t.healthScore} />,
                        <AlertBadge key="al" level={t.alertLevel} />,
                        t.projectedDateEOL
                          ? new Date(t.projectedDateEOL).toLocaleDateString("es-CO", { month: "short", year: "2-digit" })
                          : "—",
                      ];
                    })}
                />
              </Card>
            </>}

            {/* ======== PRESIÓN ======== */}
            {tab === "pressure" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Con datos presión" value={fmt(S.tiresWithPressure)} color={P.navy}   icon="💨" sub={pct(S.tiresWithPressure, S.withInsp) + " de inspeccionadas"} />
                <KPI label="Sub-infladas >10"  value={fmt(S.underInflated)}    color={P.amber}   icon="⚠️" sub="> 10 PSI bajo lo recomendado" />
                <KPI label="Críticas >20 PSI"  value={fmt(S.criticalPressure)} color={P.crimson} icon="🔴" sub="> 20 PSI bajo lo recomendado" />
                <KPI label="Presión prom."     value={`${S.avgPresion.toFixed(0)} PSI`} color={P.teal} icon="📊" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Llantas críticas por presión">
                  <DataTable
                    small
                    cols={["Placa", "Marca", "Pos.", "Actual", "Recomendada", "Delta", "Estado"]}
                    rows={tires
                      .filter(t => { const l = latestInsp(t); return l?.presionPsi != null && (l.presionDelta ?? 0) < -10; })
                      .sort((a, b) => (latestInsp(a)?.presionDelta ?? 0) - (latestInsp(b)?.presionDelta ?? 0))
                      .slice(0, 25)
                      .map(t => {
                        const l = latestInsp(t)!;
                        const delta = l.presionDelta ?? 0;
                        const col = delta < -20 ? P.crimson : P.amber;
                        return [
                          <span key={t.id} className="font-mono text-[10px] font-black">{t.placa.toUpperCase()}</span>,
                          t.marca.toUpperCase(),
                          `P${t.posicion}`,
                          <span key="p" className="font-black tabular-nums" style={{ color: col }}>{l.presionPsi?.toFixed(0)} PSI</span>,
                          `${l.presionRecomendadaPsi?.toFixed(0) ?? "—"} PSI`,
                          <span key="d" className="font-black tabular-nums" style={{ color: col }}>{delta.toFixed(0)} PSI</span>,
                          <AlertBadge key="al" level={delta < -20 ? "critical" : "warning"} />,
                        ];
                      })}
                  />
                </Card>

                <Card title="Distribución por delta de presión">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={[
                      { label: "≥ 0 PSI",    count: tires.filter(t => (latestInsp(t)?.presionDelta ?? 1) >= 0).length },
                      { label: "0 a -5",     count: tires.filter(t => { const d = latestInsp(t)?.presionDelta ?? 0; return d < 0 && d >= -5; }).length },
                      { label: "-5 a -10",   count: tires.filter(t => { const d = latestInsp(t)?.presionDelta ?? 0; return d < -5 && d >= -10; }).length },
                      { label: "-10 a -20",  count: tires.filter(t => { const d = latestInsp(t)?.presionDelta ?? 0; return d < -10 && d >= -20; }).length },
                      { label: "< -20 PSI",  count: tires.filter(t => (latestInsp(t)?.presionDelta ?? 0) < -20).length },
                    ]} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" name="Llantas" radius={[4, 4, 0, 0]}>
                        {[P.emerald, P.teal, P.amber, P.flame, P.crimson].map((c, i) => <Cell key={i} fill={c} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-400 mt-3">
                    Sub-inflación es la causa #1 de desgaste prematuro en flotas pesadas.
                  </p>
                </Card>
              </div>

              <Card title="Cobertura de presiones recomendadas por vehículo">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <StatPill label="Con config."  value={fmt(S.vWithPressureConfig)}                         color={P.azure} />
                  <StatPill label="Sin config."  value={fmt(vehicles.length - S.vWithPressureConfig)}       color={P.slate} />
                  <StatPill label="Cobertura"    value={pct(S.vWithPressureConfig, vehicles.length)}        color={P.teal} />
                  <StatPill label="Sub-infladas" value={pct(S.underInflated, S.tiresWithPressure)}          color={P.amber} />
                </div>
                <p className="text-xs text-gray-400">
                  Configurar <code className="bg-gray-100 px-1 rounded text-gray-500">presionesRecomendadas</code> en{" "}
                  <code className="bg-gray-100 px-1 rounded text-gray-500">PATCH /vehicles/:id</code> permite
                  que el backend calcule automáticamente el delta PSI en cada inspección.
                </p>
              </Card>
            </>}

            {/* ======== FLOTA INTEL ======== */}
            {tab === "fleet" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Salud flota prom." value={`${S.avgHealth.toFixed(0)}/100`} color={P.navy}   icon="🧠" />
                <KPI label="Tendencia CPK"     value={S.avgCpkTrend != null ? `${S.avgCpkTrend > 0 ? "+" : ""}${S.avgCpkTrend.toFixed(2)}` : "—"} color={S.avgCpkTrend != null && S.avgCpkTrend > 0 ? P.crimson : P.emerald} icon="📈" sub="Positivo = encareciendo" />
                <KPI label="KM proy. restantes" value={fmtM(S.totalProjKm)} color={P.azure}  icon="🛣️" sub="suma flota activa" />
                <KPI label="Mejorando / Degradando" value={`${S.improvingTires}/${S.degradingTires}`} color={P.teal} icon="⚖️" sub="tendencia CPK" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar */}
                <Card title="Radar de rendimiento por marca (top 6)">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart
                      data={[
                        { metric: "Health" },
                        { metric: "KM Eficiencia" },
                        { metric: "CPK Eficiencia" },
                        { metric: "Profundidad" },
                      ]}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#cbd5e1" }} />
                      {S.brandRadar.map((b, i) => (
                        <Radar key={b.brand} name={b.brand} dataKey={b.brand}
                          stroke={SC[i]} fill={SC[i]} fillOpacity={0.07}
                          data={[
                            { metric: "Health",         [b.brand]: b.health },
                            { metric: "KM Eficiencia",  [b.brand]: b.kmEff },
                            { metric: "CPK Eficiencia", [b.brand]: b.cpkEff },
                            { metric: "Profundidad",    [b.brand]: b.depth },
                          ]}
                        />
                      ))}
                      <Tooltip content={<Tip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {S.brandRadar.map((b, i) => (
                      <span key={b.brand} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SC[i] }} />
                        {b.brand} ({b.count})
                      </span>
                    ))}
                  </div>
                </Card>

                {/* Source breakdown */}
                <Card title="Origen de inspecciones y resumen por vida">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-300 mb-3">Origen</p>
                  <div className="space-y-1 mb-5">
                    {Object.entries(S.sourceCount).sort((a, b) => b[1] - a[1]).map(([src, cnt], i) => (
                      <RankBar key={src} label={src} value={cnt}
                        max={Math.max(...Object.values(S.sourceCount))}
                        color={SC[i % SC.length]}
                        detail={pct(cnt, S.withInsp)} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 border-t border-gray-50 pt-3 mb-4">
                    Solo inspecciones <code className="bg-gray-100 px-1 rounded">computer_vision</code> entrenan el modelo de profundidad CV.
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-300 mb-3">Vidas activas</p>
                  <div className="space-y-1">
                    {Object.entries(S.byVida).map(([v, c], i) => (
                      <RankBar key={v} label={v} value={c}
                        max={S.activeTires} color={SC[i % SC.length]} />
                    ))}
                  </div>
                </Card>
              </div>

              {/* CPK Scatter */}
              <Card title="CPK vs KM — distribución de flota activa">
                <ResponsiveContainer width="100%" height={270}>
                  <ScatterChart margin={{ top: 8, right: 8, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="km" name="KM" type="number" tickFormatter={fmtM}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      label={{ value: "KM recorridos", position: "insideBottom", offset: -10, fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis dataKey="cpk" name="CPK" tickFormatter={fmtM} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip content={<Tip />} formatter={(v: number, n: string) => n === "km" ? fmtM(v) : `$${fmtM(v)}`} />
                    <Scatter data={S.cpkScatter} name="Llantas" fill={P.azure} opacity={0.5} />
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 mt-1">
                  Alto CPK con muchos km → candidatos a retiro. CPK bajo con muchos km → rendimiento excelente.
                </p>
              </Card>

              {/* EOL projection */}
              <Card title="Próximos vencimientos proyectados">
                <DataTable
                  cols={["Llanta", "Marca", "Vida", "Health", "EOL proyectado", "KM restantes", "Alerta"]}
                  rows={[...tires]
                    .filter(t => active(t) && t.projectedDateEOL)
                    .sort((a, b) => new Date(a.projectedDateEOL!).getTime() - new Date(b.projectedDateEOL!).getTime())
                    .slice(0, 20)
                    .map(t => [
                      <span key={t.id} className="font-mono text-xs font-black">{t.placa.toUpperCase()}</span>,
                      t.marca.toUpperCase(),
                      <VidaBadge key="v" vida={lastVida(t)} />,
                      <HealthBar key="hs" score={t.healthScore} />,
                      new Date(t.projectedDateEOL!).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" }),
                      t.projectedKmRemaining != null ? `${fmtM(t.projectedKmRemaining)} km` : "—",
                      <AlertBadge key="al" level={t.alertLevel} />,
                    ])}
                />
              </Card>
            </>}

            {/* ======== VEHÍCULOS ======== */}
            {tab === "vehicles" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Total vehículos" value={vehicles.length} color={P.navy}  icon="🚛" />
                <KPI label="Con llantas"     value={S.vwt}           color={P.azure} icon="✅" />
                <KPI label="Sin llantas"     value={S.vEmpty}        color={P.amber} icon="⬜" sub="vacíos" />
                <KPI label="En unión"        value={S.vUnion}        color={P.teal}  icon="🔗" sub="cabezote + trailer" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Tipo de vehículo">
                  <ResponsiveContainer width="100%" height={195}>
                    <PieChart>
                      <Pie data={Object.entries(S.vbt).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" outerRadius={85} innerRadius={42} dataKey="value" nameKey="name">
                        {Object.keys(S.vbt).map((_, i) => <Cell key={i} fill={SC[i % SC.length]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-0.5">
                    {Object.entries(S.vbt).sort((a, b) => b[1] - a[1]).map(([t, c], i) => (
                      <RankBar key={t} label={t} value={c}
                        max={Math.max(...Object.values(S.vbt))} color={SC[i % SC.length]} />
                    ))}
                  </div>
                </Card>

                <Card title="Distribución KM actual">
                  <ResponsiveContainer width="100%" height={215}>
                    <BarChart data={S.kmBuckets} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" name="Vehículos" fill={P.azure} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3">
                    <StatPill label="KM prom."    value={fmtM(S.avgKmV)}               color={P.azure} />
                    <StatPill label="Con presión" value={fmt(S.vWithPressureConfig)}    color={P.teal} />
                  </div>
                </Card>
              </div>

              <Card title="Por cliente">
                {Object.entries(S.vbc).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([c, n], i) => (
                  <RankBar key={c} label={c} value={n}
                    max={Math.max(...Object.values(S.vbc))} color={SC[i % SC.length]} />
                ))}
              </Card>

              <Card title="Top 30 vehículos por kilometraje">
                <DataTable
                  cols={["Placa", "Tipo", "KM actual", "Llantas", "Cliente", "Compañía", "Unión"]}
                  rows={[...vehicles].sort((a, b) => (b.kilometrajeActual || 0) - (a.kilometrajeActual || 0)).slice(0, 30).map(v => [
                    <span key={v.id} className="font-mono font-black text-[#0A183A]">{v.placa.toUpperCase()}</span>,
                    v.tipovhc,
                    <span key="km" className="font-black text-[#1E76B6] tabular-nums">{fmt(v.kilometrajeActual || 0)} km</span>,
                    <span key="tc">{v.tireCount ?? "—"}</span>,
                    v.cliente || <span key="cl" className="text-gray-300">—</span>,
                    <span key="co" className="text-xs text-gray-400">{companies.find(c => c.id === v.companyId)?.name || "—"}</span>,
                    Array.isArray(v.union) && v.union.length > 0
                      ? <span key="u" className="text-xs text-[#0d9488] font-bold">🔗 {v.union.length}</span>
                      : <span key="u" className="text-gray-300 text-xs">—</span>,
                  ])}
                />
              </Card>
            </>}

            {/* ======== COMPAÑÍAS ======== */}
            {tab === "companies" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Total compañías" value={companies.length}                                        color={P.navy}   icon="🏢" />
                <KPI label="Enterprise"      value={S.cbp["enterprise"]   || 0}                             color={P.violet} icon="⭐" />
                <KPI label="Premium / Pro"   value={(S.cbp["premium"]||0)+(S.cbp["pro"]||0)}               color={P.emerald} icon="💎" />
                <KPI label="Distribuidores"  value={S.cbp["distribuidor"] || 0}                             color={P.flame}  icon="🔗" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Distribución por plan">
                  <ResponsiveContainer width="100%" height={195}>
                    <PieChart>
                      <Pie data={Object.entries(S.cbp).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" outerRadius={85} innerRadius={42}
                        dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {Object.keys(S.cbp).map((_, i) => <Cell key={i} fill={SC[i % SC.length]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {Object.entries(S.cbp).sort((a, b) => b[1] - a[1]).map(([p, c], i) => (
                    <RankBar key={p} label={p.charAt(0).toUpperCase() + p.slice(1)}
                      value={c} max={Math.max(...Object.values(S.cbp))} color={SC[i % SC.length]} />
                  ))}
                </Card>

                <Card title="Top compañías por llantas">
                  {S.topCo.map((c, i) => (
                    <RankBar key={c.id} label={c.name} value={c.tireCount}
                      max={S.topCo[0]?.tireCount || 1} color={SC[i % SC.length]}
                      detail={c.vehicleCount ? `${c.vehicleCount} veh.` : ""} />
                  ))}
                </Card>

                <Card title="Periodicidad de inspección">
                  {Object.entries(S.perDist).sort((a, b) => Number(a[0]) - Number(b[0])).map(([p, c], i) => (
                    <RankBar key={p} label={`${p} mes${Number(p) !== 1 ? "es" : ""}`}
                      value={c} max={Math.max(...Object.values(S.perDist))} color={SC[i % SC.length]} />
                  ))}
                </Card>
              </div>

              <Card title="Todas las compañías">
                <DataTable
                  cols={["Compañía", "Plan", "Llantas", "Vehículos", "Usuarios", "Periodicidad", "Rev. estimada"]}
                  rows={[...companies]
                    .sort((a, b) => (b.tireCount || 0) - (a.tireCount || 0))
                    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
                    .map(c => {
                      const planKey = c.plan?.toLowerCase() ?? "basic";
                      const rev = (S.planPrice as any)[planKey] ?? 150_000;
                      return [
                        <span key={c.id} className="font-black text-[#0A183A]">{c.name}</span>,
                        <PlanBadge key="p" plan={c.plan} />,
                        <span key="t" className="font-black text-[#1E76B6]">{c.tireCount}</span>,
                        c.vehicleCount, c.userCount,
                        `${c.periodicity} mes${c.periodicity !== 1 ? "es" : ""}`,
                        <span key="rev" className="font-semibold text-[#059669]">${fmtM(rev)}</span>,
                      ];
                    })}
                />
              </Card>
            </>}

            {/* ======== USUARIOS ======== */}
            {tab === "users" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Total usuarios" value={users.length}               color={P.navy}    icon="👥" />
                <KPI label="Verificados"    value={S.verified}                 color={P.emerald} icon="✅" sub={pct(S.verified, users.length) + " del total"} />
                <KPI label="Sin verificar"  value={users.length - S.verified}  color={P.amber}   icon="⏳" />
                <KPI label="Puntos totales" value={fmtM(S.totPuntos)}          color={P.azure}   icon="⭐" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Por rol">
                  <ResponsiveContainer width="100%" height={175}>
                    <PieChart>
                      <Pie data={Object.entries(S.ubr).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" outerRadius={78} dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {Object.keys(S.ubr).map((_, i) => <Cell key={i} fill={SC[i % SC.length]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-0.5">
                    {Object.entries(S.ubr).sort((a, b) => b[1] - a[1]).map(([r, c], i) => (
                      <RankBar key={r} label={r.charAt(0).toUpperCase() + r.slice(1)}
                        value={c} max={Math.max(...Object.values(S.ubr))}
                        color={SC[i % SC.length]}
                        suffix={` (${pct(c, users.length)})`} />
                    ))}
                  </div>
                </Card>

                <Card title="Usuarios por compañía (top 10)">
                  {S.topUCo.map((c, i) => (
                    <RankBar key={c.name} label={c.name} value={c.count}
                      max={S.topUCo[0]?.count || 1} color={SC[i % SC.length]} />
                  ))}
                  <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3">
                    <StatPill label="Idioma ES" value={fmt(S.ubl["es"] ?? 0)} color={P.azure} />
                    <StatPill label="Idioma EN" value={fmt(S.ubl["en"] ?? 0)} color={P.teal} />
                  </div>
                </Card>
              </div>

              <Card title="Top 30 usuarios por puntos">
                <DataTable
                  cols={["#", "Nombre", "Email", "Rol", "Puntos", "Verificado", "Idioma", "Compañía"]}
                  rows={S.topUsers.map((u, i) => [
                    <span key={i} className="text-gray-300 font-mono text-xs">{i + 1}</span>,
                    <span key="n" className="font-black text-[#0A183A]">{u.name}</span>,
                    <span key="e" className="text-xs text-gray-400">{u.email}</span>,
                    <span key="r" className="capitalize text-gray-500 text-xs">{u.role}</span>,
                    <span key="p" className="font-black text-[#1E76B6] tabular-nums">{fmt(u.puntos || 0)}</span>,
                    u.isVerified
                      ? <span key="v" className="text-[#059669] font-bold text-xs">✓</span>
                      : <span key="v" className="text-amber-400 text-xs">⏳</span>,
                    <span key="l" className="text-xs text-gray-400 uppercase">{u.preferredLanguage || "es"}</span>,
                    <span key="co" className="text-xs text-gray-400">
                      {companies.find(c => c.id === u.companyId)?.name?.slice(0, 18) || "—"}
                    </span>,
                  ])}
                />
              </Card>
            </>}

          </div>
        )}
      </div>
    </div>
  );
}