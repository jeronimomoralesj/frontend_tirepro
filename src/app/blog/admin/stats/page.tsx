"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type CostEntry    = { valor: number; fecha: string };
type VidaEntry    = { valor: string; fecha: string };
type Inspection   = {
  fecha: string;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk: number; cpkProyectado: number;
  cpt?: number; cptProyectado?: number;
  diasEnUso?: number; mesesEnUso?: number;
  kilometrosRecorridos?: number; kmActualVehiculo?: number;
};
type PrimeraVida  = { diseno: string; cpk: number; costo: number; kilometros: number };
type Desechos     = { causales: string; milimetrosDesechados: number; remanente: number; fecha: string };

type Tire = {
  id: string; companyId: string; vehicleId?: string | null; placa: string;
  vida: VidaEntry[]; marca: string; diseno: string;
  profundidadInicial: number; dimension: string; eje: string;
  costo: CostEntry[]; posicion: number; inspecciones: Inspection[];
  primeraVida: PrimeraVida[]; kilometrosRecorridos: number;
  fechaInstalacion?: string | null; diasAcumulados: number;
  eventos: { valor: string; fecha: string }[];
  desechos?: Desechos | null;
};

type Vehicle = {
  id: string; placa: string; kilometrajeActual: number;
  tipovhc: string; tireCount: number; cliente?: string | null;
  companyId: string; union: string[];
};

type User = {
  id: string; name: string; email: string; role: string;
  companyId: string; puntos: number; isVerified: boolean;
  preferredLanguage?: string | null;
};

type Company = {
  id: string; name: string; plan: string;
  tireCount: number; userCount: number; vehicleCount: number;
  periodicity: number; profileImage?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.tirepro.com.co";
const ML  = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const C = {
  navy:"#0A183A", dark:"#173D68", mid:"#1E76B6", sky:"#348CCB",
  teal:"#0d9488", amber:"#d97706", red:"#dc2626", green:"#059669",
  slate:"#475569", purple:"#7c3aed",
};
const CC = [C.mid,C.teal,C.amber,C.red,C.green,C.purple,C.sky,"#f59e0b","#ec4899","#84cc16","#06b6d4","#f97316"];

const norm = (t: Tire): Tire => ({
  ...t,
  vida: Array.isArray(t.vida) ? t.vida : [],
  costo: Array.isArray(t.costo) ? t.costo : [],
  inspecciones: Array.isArray(t.inspecciones) ? t.inspecciones : [],
  primeraVida: Array.isArray(t.primeraVida) ? t.primeraVida : [],
  eventos: Array.isArray(t.eventos) ? t.eventos : [],
});

const lastVida = (t: Tire) =>
  t.vida.length ? t.vida[t.vida.length - 1].valor.toLowerCase() : "nueva";

const active = (t: Tire) => lastVida(t) !== "fin";

const latestInsp = (t: Tire): Inspection | null => {
  if (!t.inspecciones.length) return null;
  return [...t.inspecciones].sort((a, b) =>
    new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
};

const minD  = (i: Inspection) => Math.min(i.profundidadInt ?? 99, i.profundidadCen ?? 99, i.profundidadExt ?? 99);
const avgD  = (i: Inspection) => (i.profundidadInt + i.profundidadCen + i.profundidadExt) / 3;
const tcost = (t: Tire)       => t.costo.reduce((s, c) => s + (c.valor || 0), 0);
const safeAvg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

const sem = (t: Tire): "optimo"|"60d"|"30d"|"urgente"|"sin" => {
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
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `${(n/1_000).toFixed(1)}K`
  : fmt(n);

// ─── UI ───────────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="flex items-center justify-center py-24 gap-4">
    <div className="w-11 h-11 rounded-full border-4 border-[#1E76B6]/20 border-t-[#1E76B6] animate-spin" />
    <span className="text-[#1E76B6] font-semibold text-sm">Cargando datos globales…</span>
  </div>
);

function KPI({ label, value, sub, color, icon }: {
  label:string; value:string|number; sub?:string; color:string; icon:string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-2 shadow-md" style={{ background:color }}>
      <div className="absolute -right-2 -top-2 text-6xl opacity-[0.07] select-none">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{label}</p>
      <p className="text-3xl font-black text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-white/50">{sub}</p>}
    </div>
  );
}

function Card({ title, children, className="" }: { title:string; children:React.ReactNode; className?:string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#0A183A]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function RankBar({ label, value, max, color, suffix="" }: {
  label:string; value:number; max:number; color:string; suffix?:string;
}) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <span className="text-sm text-gray-600 w-40 truncate shrink-0 group-hover:text-gray-900 transition-colors">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, background:color }} />
      </div>
      <span className="text-sm font-bold text-gray-800 w-20 text-right tabular-nums shrink-0">
        {fmt(value)}{suffix}
      </span>
    </div>
  );
}

const Tip = ({ active: a, payload, label }: any) => {
  if (!a || !payload?.length) return null;
  return (
    <div className="bg-[#0A183A] text-white text-xs rounded-xl px-3 py-2.5 shadow-2xl border border-white/10">
      {label && <p className="font-bold mb-1.5 text-white/70">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || "#93c5fd" }}>
          {p.name}: <span className="font-bold">{typeof p.value === "number" ? fmt(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

function DataTable({ cols, rows }: { cols:string[]; rows:(string|number|React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-100">
            {cols.map(c => (
              <th key={c} className="text-left py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
              {row.map((cell, j) => <td key={j} className="py-2.5 px-3 text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanBadge({ plan }: { plan:string }) {
  const m: Record<string,{bg:string;tx:string}> = {
    premium:      { bg:"#059669", tx:"#fff" },
    retail:       { bg:"#1E76B6", tx:"#fff" },
    distribuidor: { bg:"#7c3aed", tx:"#fff" },
    basic:        { bg:"#e5e7eb", tx:"#374151" },
  };
  const s = m[plan?.toLowerCase()] || m.basic;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize"
      style={{ background: s.bg+"20", color: s.bg === "#e5e7eb" ? s.tx : s.bg, border:`1px solid ${s.bg}40` }}>
      {plan}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type TabId = "overview"|"tires"|"vehicles"|"companies"|"users";

const TABS: { id:TabId; label:string; icon:string }[] = [
  { id:"overview",  label:"Resumen",   icon:"📊" },
  { id:"tires",     label:"Llantas",   icon:"🛞" },
  { id:"vehicles",  label:"Vehículos", icon:"🚛" },
  { id:"companies", label:"Compañías", icon:"🏢" },
  { id:"users",     label:"Usuarios",  icon:"👥" },
];

export default function AdminDashboard() {
  const [tires,     setTires]     = useState<Tire[]>([]);
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([]);
  const [users,     setUsers]     = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [errs,      setErrs]      = useState<string[]>([]);
  const [tab,       setTab]       = useState<TabId>("overview");
  const [lastFetch, setLastFetch] = useState<Date|null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErrs([]);
    const e: string[] = [];

    const safe = async <T,>(url: string, label: string): Promise<T[]> => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return Array.isArray(d) ? d : [];
      } catch (err: any) { e.push(`${label}: ${err.message}`); return []; }
    };

    const [tr, vr, ur, cr] = await Promise.all([
      safe<Tire>    (`${API}/api/tires/all`,     "Llantas"),
      safe<Vehicle> (`${API}/api/vehicles/all`,  "Vehículos"),
      safe<User>    (`${API}/api/users/all`,     "Usuarios"),
      safe<Company> (`${API}/api/companies/all`, "Compañías"),
    ]);

    setTires(tr.map(norm));
    setVehicles(vr);
    setUsers(ur);
    setCompanies(cr);
    if (e.length) setErrs(e);
    setLastFetch(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const S = useMemo(() => {
    const act  = tires.filter(active);
    const ret  = tires.filter(t => !active(t));
    const wi   = act.filter(t => latestInsp(t) !== null);
    const now  = new Date();

    // Semáforo
    const sc = { optimo:0, "60d":0, "30d":0, urgente:0, sin:0 };
    act.forEach(t => sc[sem(t)]++);

    // Financial
    const totalInv = tires.reduce((s, t) => s + tcost(t), 0);
    const monthSp  = tires.reduce((s, t) =>
      s + t.costo.reduce((ss, c) => {
        const d = new Date(c.fecha);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
          ? ss + c.valor : ss;
      }, 0), 0);

    // Monthly spend last 12
    const msp: Record<string,number> = {};
    tires.forEach(t => t.costo.forEach(c => {
      const d = new Date(c.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      msp[k] = (msp[k]||0) + c.valor;
    }));
    const sp12 = Array.from({length:12},(_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-(11-i), 1);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      return { mes:ML[d.getMonth()], gasto:msp[k]||0 };
    });

    // CPK / CPT
    const cpks = wi.map(t => latestInsp(t)!.cpk).filter(v => v>0 && isFinite(v));
    const cpkp = wi.map(t => latestInsp(t)!.cpkProyectado).filter(v => v>0 && isFinite(v));
    const cpts = wi.map(t => latestInsp(t)!.cpt||0).filter(v => v>0);
    const avgCPK  = safeAvg(cpks);
    const avgCPKP = safeAvg(cpkp);
    const avgCPT  = safeAvg(cpts);

    // KM / depth
    const totalKm  = act.reduce((s,t) => s + (t.kilometrosRecorridos||0), 0);
    const depVals  = wi.map(t => avgD(latestInsp(t)!));
    const avgDepth = safeAvg(depVals);
    const critical = act.filter(t => { const l=latestInsp(t); return l && minD(l)<=2; }).length;

    // By brand
    const bb: Record<string,{count:number;totalCost:number;totalKm:number;cpks:number[];depths:number[]}> = {};
    act.forEach(t => {
      const b = (t.marca||"Desconocido").toUpperCase();
      if (!bb[b]) bb[b] = {count:0,totalCost:0,totalKm:0,cpks:[],depths:[]};
      bb[b].count++; bb[b].totalCost += tcost(t); bb[b].totalKm += t.kilometrosRecorridos||0;
      const l = latestInsp(t);
      if (l) { if (l.cpk>0) bb[b].cpks.push(l.cpk); bb[b].depths.push(avgD(l)); }
    });

    const cnt = (key: keyof Tire) => {
      const m: Record<string,number> = {};
      act.forEach(t => { const v = (t[key] as string)||"N/A"; m[v]=(m[v]||0)+1; });
      return m;
    };
    const byDiseno    = cnt("diseno");
    const byDimension = cnt("dimension");
    const byEje       = cnt("eje");

    const byVida: Record<string,number> = {};
    act.forEach(t => { const v=lastVida(t); byVida[v]=(byVida[v]||0)+1; });

    const rCount = act.filter(t => lastVida(t).startsWith("reencauche")).length;
    const rRate  = act.length ? (rCount/act.length)*100 : 0;
    const rSave  = act.filter(t=>t.primeraVida.length>0&&t.costo.length>1)
      .reduce((s,t) => s + Math.max((t.primeraVida[0]?.costo||0)-(t.costo[t.costo.length-1]?.valor||0), 0), 0);

    // Desechos
    const dTires = ret.filter(t => t.desechos);
    const desByR: Record<string,number> = {};
    let totRem = 0;
    dTires.forEach(t => {
      const r = t.desechos!.causales||"Desconocido";
      desByR[r] = (desByR[r]||0)+1;
      totRem += t.desechos!.remanente||0;
    });
    const avgMmD = dTires.length ? safeAvg(dTires.map(t => t.desechos!.milimetrosDesechados||0)) : 0;

    // Inspection per month
    const ipm: Record<string,number> = {};
    tires.forEach(t => t.inspecciones.forEach(i => {
      const d = new Date(i.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      ipm[k] = (ipm[k]||0)+1;
    }));
    const insp12 = Array.from({length:12},(_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-(11-i), 1);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      return { mes:ML[d.getMonth()], inspecciones:ipm[k]||0 };
    });
    const totalInsp = tires.reduce((s,t) => s+t.inspecciones.length, 0);

    // CPK by brand
    const cpkByBrand = Object.entries(bb)
      .map(([b,v]) => ({ brand:b, cpk:v.cpks.length?safeAvg(v.cpks):0, count:v.count }))
      .filter(x => x.cpk>0).sort((a,b) => a.cpk-b.cpk).slice(0,14);

    // Depth trend
    const dpm: Record<string,number[]> = {};
    tires.forEach(t => t.inspecciones.forEach(i => {
      const d = new Date(i.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!dpm[k]) dpm[k]=[];
      dpm[k].push(avgD(i));
    }));
    const dep12 = Array.from({length:12},(_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-(11-i), 1);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const vals = dpm[k]||[];
      return { mes:ML[d.getMonth()], profundidad:vals.length?safeAvg(vals):null };
    });

    // Vehicles
    const vbt: Record<string,number> = {};
    vehicles.forEach(v => { const t=v.tipovhc||"Desconocido"; vbt[t]=(vbt[t]||0)+1; });
    const avgKmV  = safeAvg(vehicles.map(v => v.kilometrajeActual||0));
    const vwt     = vehicles.filter(v => v.tireCount>0).length;
    const vEmpty  = vehicles.length - vwt;
    const vUnion  = vehicles.filter(v => Array.isArray(v.union)&&v.union.length>0).length;
    const vbc: Record<string,number> = {};
    vehicles.forEach(v => { const c=v.cliente||"Sin cliente"; vbc[c]=(vbc[c]||0)+1; });

    // Companies
    const cbp: Record<string,number> = {};
    companies.forEach(c => { cbp[c.plan]=(cbp[c.plan]||0)+1; });
    const topCo = [...companies].sort((a,b) => (b.tireCount||0)-(a.tireCount||0)).slice(0,15);

    // Users
    const ubr: Record<string,number> = {};
    users.forEach(u => { ubr[u.role]=(ubr[u.role]||0)+1; });
    const verified   = users.filter(u => u.isVerified).length;
    const totPuntos  = users.reduce((s,u) => s+(u.puntos||0), 0);
    const ubl: Record<string,number> = {};
    users.forEach(u => { const l=u.preferredLanguage||"es"; ubl[l]=(ubl[l]||0)+1; });
    const ubco: Record<string,number> = {};
    users.forEach(u => { ubco[u.companyId]=(ubco[u.companyId]||0)+1; });
    const topUCo = Object.entries(ubco).sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([cid,cnt]) => ({ name:companies.find(c=>c.id===cid)?.name||cid.slice(0,8), count:cnt }));

    return {
      totalTires:tires.length, activeTires:act.length, retiredTires:ret.length,
      critical, withInsp:wi.length, totalInsp,
      rCount, rRate, rSave,
      totalInv, monthSp, avgCPK, avgCPKP, avgCPT,
      totalKm, avgDepth,
      desByR, totRem, avgMmD,
      sc, bb, byDiseno, byDimension, byEje, byVida,
      sp12, insp12, dep12, cpkByBrand,
      vbt, avgKmV, vwt, vEmpty, vUnion, vbc,
      cbp, topCo,
      ubr, verified, totPuntos, ubl, topUCo,
    };
  }, [tires, vehicles, users, companies]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f4f8]" style={{ fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.dark} 55%,${C.mid} 100%)` }}
        className="px-6 py-5 shadow-2xl">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">TirePro · Admin Dashboard</h1>
            <p className="text-blue-200 text-xs mt-0.5">
              {loading ? "Cargando…" : `${fmt(tires.length)} llantas · ${fmt(vehicles.length)} vehículos · ${fmt(companies.length)} compañías · ${fmt(users.length)} usuarios`}
              {lastFetch && !loading && <span className="ml-2 opacity-50">· {lastFetch.toLocaleTimeString("es-CO")}</span>}
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-sm font-bold transition flex items-center gap-2">
            <span className={loading?"animate-spin":""}>↻</span> Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                tab===t.id
                  ? "border-[#1E76B6] text-[#1E76B6] bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-2xl mx-auto px-4 py-8">

        {errs.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 space-y-1">
            {errs.map((e,i) => <p key={i} className="text-red-700 text-sm font-medium">⚠️ {e}</p>)}
          </div>
        )}

        {loading ? <Spinner /> : (
          <div className="space-y-6">

            {/* ══════ OVERVIEW ══════ */}
            {tab==="overview" && <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPI label="Llantas totales"  value={fmt(S.totalTires)}     color={C.navy}   icon="🛞" />
                <KPI label="Activas"          value={fmt(S.activeTires)}    color={C.dark}   icon="✅" />
                <KPI label="Vehículos"        value={fmt(vehicles.length)}  color={C.mid}    icon="🚛" />
                <KPI label="Compañías"        value={fmt(companies.length)} color={C.teal}   icon="🏢" />
                <KPI label="Usuarios"         value={fmt(users.length)}     color={C.slate}  icon="👥" />
                <KPI label="Críticas ≤ 2mm"   value={fmt(S.critical)}       color={C.red}    icon="🚨" sub="Cambio urgente" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Inversión total COP" value={fmtM(S.totalInv)}    color={C.navy}  icon="💰" />
                <KPI label="Gasto este mes"       value={fmtM(S.monthSp)}    color={C.dark}  icon="📅" />
                <KPI label="CPK promedio"         value={`$${fmtM(S.avgCPK)}`}  color={C.mid}  icon="📈" sub="Costo / km" />
                <KPI label="CPK proyectado"       value={`$${fmtM(S.avgCPKP)}`} color={C.teal} icon="🔭" sub="Al límite legal" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Gasto mensual — últimos 12 meses">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={S.sp12} margin={{top:4,right:8,left:-10,bottom:0}}>
                      <defs>
                        <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.mid} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={C.mid} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="mes" tick={{fontSize:11,fill:"#94a3b8"}}/>
                      <YAxis tickFormatter={fmtM} tick={{fontSize:10,fill:"#94a3b8"}}/>
                      <Tooltip content={<Tip/>} formatter={(v:number) => fmtM(v)}/>
                      <Area dataKey="gasto" name="Gasto COP" stroke={C.mid} fill="url(#gg)" strokeWidth={2.5} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Inspecciones por mes — últimos 12 meses">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={S.insp12} margin={{top:4,right:8,left:-10,bottom:0}}>
                      <defs>
                        <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.teal} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={C.teal} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="mes" tick={{fontSize:11,fill:"#94a3b8"}}/>
                      <YAxis tick={{fontSize:10,fill:"#94a3b8"}}/>
                      <Tooltip content={<Tip/>}/>
                      <Area dataKey="inspecciones" name="Inspecciones" stroke={C.teal} fill="url(#gi)" strokeWidth={2.5} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Semáforo de condición">
                  <div className="space-y-2 mb-4">
                    {([
                      ["optimo","Óptimo (> 7 mm)",   C.green],
                      ["60d",  "~60 días (> 6 mm)",  C.mid  ],
                      ["30d",  "~30 días (> 5 mm)",  C.amber],
                      ["urgente","Urgente (≤ 5 mm)", C.red  ],
                      ["sin",  "Sin inspección",      C.slate],
                    ] as const).map(([k,lbl,col]) => (
                      <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{background:col+"12",border:`1px solid ${col}25`}}>
                        <span className="text-sm font-semibold" style={{color:col}}>{lbl}</span>
                        <span className="text-xl font-black" style={{color:col}}>{S.sc[k]}</span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={[
                        {name:"Óptimo",    value:S.sc.optimo},
                        {name:"60 días",   value:S.sc["60d"]},
                        {name:"30 días",   value:S.sc["30d"]},
                        {name:"Urgente",   value:S.sc.urgente},
                        {name:"Sin insp.", value:S.sc.sin},
                      ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" nameKey="name">
                        {[C.green,C.mid,C.amber,C.red,C.slate].map((c,i) => <Cell key={i} fill={c}/>)}
                      </Pie>
                      <Tooltip content={<Tip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Distribución por vida">
                  {Object.entries(S.byVida).sort((a,b)=>b[1]-a[1]).map(([v,c],i) => (
                    <RankBar key={v} label={v.charAt(0).toUpperCase()+v.slice(1)}
                      value={c} max={S.activeTires} color={CC[i%CC.length]}/>
                  ))}
                  <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Reencauche %</p>
                      <p className="text-2xl font-black text-[#0d9488]">{S.rRate.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Ahorro aprox.</p>
                      <p className="text-2xl font-black text-[#059669]">${fmtM(S.rSave)}</p>
                    </div>
                  </div>
                </Card>

                <Card title="Profundidad promedio mensual (mm)">
                  <ResponsiveContainer width="100%" height={290}>
                    <LineChart data={S.dep12} margin={{top:4,right:8,left:-10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="mes" tick={{fontSize:11,fill:"#94a3b8"}}/>
                      <YAxis domain={[0,"auto"]} tick={{fontSize:10,fill:"#94a3b8"}}/>
                      <Tooltip content={<Tip/>} formatter={(v:number) => `${v?.toFixed(1)} mm`}/>
                      <Line dataKey="profundidad" name="Profundidad" stroke={C.amber}
                        strokeWidth={2.5} dot={{r:3,fill:C.amber}} connectNulls/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card title="Total inspecciones">
                  <p className="text-4xl font-black text-[#0A183A]">{fmt(S.totalInsp)}</p>
                  <p className="text-sm text-gray-400 mt-1">en toda la historia</p>
                </Card>
                <Card title="KM acumulados">
                  <p className="text-4xl font-black text-[#1E76B6]">{fmtM(S.totalKm)}</p>
                  <p className="text-sm text-gray-400 mt-1">flota activa</p>
                </Card>
                <Card title="Prof. prom. actual">
                  <p className="text-4xl font-black text-[#d97706]">{S.avgDepth.toFixed(1)} mm</p>
                  <p className="text-sm text-gray-400 mt-1">promedio flota activa</p>
                </Card>
                <Card title="CPT promedio">
                  <p className="text-4xl font-black text-[#059669]">${fmtM(S.avgCPT)}</p>
                  <p className="text-sm text-gray-400 mt-1">costo por mes</p>
                </Card>
              </div>
            </>}

            {/* ══════ LLANTAS ══════ */}
            {tab==="tires" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Activas"        value={S.activeTires}    color={C.navy}  icon="🛞"/>
                <KPI label="Retiradas"      value={S.retiredTires}   color={C.slate} icon="🗑️"/>
                <KPI label="Con inspección" value={S.withInsp}       color={C.mid}   icon="🔍"/>
                <KPI label="Reencauchadas"  value={S.rCount}         color={C.teal}  icon="♻️"
                  sub={`${S.rRate.toFixed(1)}% de activas`}/>
              </div>

              <Card title="CPK promedio por marca — menor es más eficiente">
                <ResponsiveContainer width="100%" height={Math.max(220,S.cpkByBrand.length*30)}>
                  <BarChart data={S.cpkByBrand} layout="vertical" margin={{left:8,right:50,top:4,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" tickFormatter={v=>`$${fmtM(v)}`} tick={{fontSize:10,fill:"#94a3b8"}}/>
                    <YAxis dataKey="brand" type="category" tick={{fontSize:11,fill:"#475569"}} width={95}/>
                    <Tooltip content={<Tip/>} formatter={(v:number) => `$${fmt(v,0)}`}/>
                    <Bar dataKey="cpk" name="CPK" radius={[0,6,6,0]}
                      label={{position:"right",fontSize:10,formatter:(v:number)=>`$${fmtM(v)}`}}>
                      {S.cpkByBrand.map((_,i) => <Cell key={i} fill={CC[i%CC.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Detalle por marca">
                <DataTable
                  cols={["Marca","Llantas","KM total","Inversión","CPK prom.","Prof. prom."]}
                  rows={Object.entries(S.bb).sort((a,b)=>b[1].count-a[1].count).map(([b,v]) => [
                    <span key={b} className="font-bold text-[#0A183A]">{b}</span>,
                    fmt(v.count),
                    fmtM(v.totalKm),
                    `$${fmtM(v.totalCost)}`,
                    v.cpks.length ? `$${fmt(safeAvg(v.cpks),0)}` : "—",
                    v.depths.length ? `${safeAvg(v.depths).toFixed(1)} mm` : "—",
                  ])}
                />
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top diseños / bandas">
                  {Object.entries(S.byDiseno).sort((a,b)=>b[1]-a[1]).slice(0,18)
                    .map(([d,c],i) => (
                      <RankBar key={d} label={d} value={c}
                        max={Math.max(...Object.values(S.byDiseno))} color={CC[i%CC.length]}/>
                    ))}
                </Card>
                <Card title="Distribución por dimensión">
                  {Object.entries(S.byDimension).sort((a,b)=>b[1]-a[1]).slice(0,18)
                    .map(([d,c],i) => (
                      <RankBar key={d} label={d} value={c}
                        max={Math.max(...Object.values(S.byDimension))} color={CC[i%CC.length]}/>
                    ))}
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Distribución por eje">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={Object.entries(S.byEje).map(([k,v])=>({name:k,value:v}))}
                        cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name"
                        label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {Object.keys(S.byEje).map((_,i) => <Cell key={i} fill={CC[i%CC.length]}/>)}
                      </Pie>
                      <Tooltip content={<Tip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  {Object.entries(S.byEje).sort((a,b)=>b[1]-a[1]).map(([e,c],i) => (
                    <RankBar key={e} label={e} value={c}
                      max={Math.max(...Object.values(S.byEje))} color={CC[i%CC.length]}/>
                  ))}
                </Card>

                <Card title="Análisis de desechos">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Retiradas</p>
                      <p className="text-2xl font-black text-red-600">{S.retiredTires}</p>
                    </div>
                    <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Prom. mm</p>
                      <p className="text-2xl font-black text-orange-600">{S.avgMmD.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-1">Remanente</p>
                      <p className="text-2xl font-black text-amber-600">${fmtM(S.totRem)}</p>
                    </div>
                  </div>
                  {Object.keys(S.desByR).length > 0 ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Causales de desecho</p>
                      {Object.entries(S.desByR).sort((a,b)=>b[1]-a[1]).map(([r,c]) => (
                        <RankBar key={r} label={r} value={c}
                          max={Math.max(...Object.values(S.desByR))} color={C.red}/>
                      ))}
                    </>
                  ) : <p className="text-gray-400 text-sm">Sin causales registradas.</p>}
                </Card>
              </div>
            </>}

            {/* ══════ VEHÍCULOS ══════ */}
            {tab==="vehicles" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Total vehículos" value={vehicles.length} color={C.navy}  icon="🚛"/>
                <KPI label="Con llantas"     value={S.vwt}           color={C.mid}   icon="✅"/>
                <KPI label="Sin llantas"     value={S.vEmpty}        color={C.amber} icon="⬜"/>
                <KPI label="En unión"        value={S.vUnion}        color={C.teal}  icon="🔗" sub="Cabezote + trailer"/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Tipo de vehículo">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={Object.entries(S.vbt).map(([k,v])=>({name:k,value:v}))}
                        cx="50%" cy="50%" outerRadius={85} innerRadius={42} dataKey="value" nameKey="name">
                        {Object.keys(S.vbt).map((_,i) => <Cell key={i} fill={CC[i%CC.length]}/>)}
                      </Pie>
                      <Tooltip content={<Tip/>}/>
                      <Legend iconType="circle" iconSize={8}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-0.5">
                    {Object.entries(S.vbt).sort((a,b)=>b[1]-a[1]).map(([t,c],i) => (
                      <RankBar key={t} label={t} value={c}
                        max={Math.max(...Object.values(S.vbt))} color={CC[i%CC.length]}/>
                    ))}
                  </div>
                </Card>

                <Card title="Por cliente">
                  {Object.entries(S.vbc).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([c,n],i) => (
                    <RankBar key={c} label={c} value={n}
                      max={Math.max(...Object.values(S.vbc))} color={CC[i%CC.length]}/>
                  ))}
                </Card>
              </div>

              <Card title="Top 30 vehículos por kilometraje">
                <DataTable
                  cols={["Placa","Tipo","KM actual","Llantas","Cliente","Compañía"]}
                  rows={[...vehicles].sort((a,b)=>(b.kilometrajeActual||0)-(a.kilometrajeActual||0)).slice(0,30).map(v => [
                    <span key={v.id} className="font-mono font-bold text-[#0A183A]">{v.placa.toUpperCase()}</span>,
                    v.tipovhc,
                    <span key="km" className="font-semibold text-[#1E76B6]">{fmt(v.kilometrajeActual||0)} km</span>,
                    v.tireCount,
                    v.cliente || <span key="cl" className="text-gray-400">—</span>,
                    <span key="co" className="text-xs text-gray-500">{companies.find(c=>c.id===v.companyId)?.name||"—"}</span>,
                  ])}
                />
              </Card>
            </>}

            {/* ══════ COMPAÑÍAS ══════ */}
            {tab==="companies" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Total compañías" value={companies.length}                                        color={C.navy}   icon="🏢"/>
                <KPI label="Premium"          value={S.cbp["premium"]      || 0}                             color={C.green}  icon="⭐"/>
                <KPI label="Distribuidores"   value={S.cbp["distribuidor"] || 0}                             color={C.purple} icon="🔗"/>
                <KPI label="Basic / retail"   value={(S.cbp["basic"]||0)+(S.cbp["retail"]||0)}               color={C.slate}  icon="📋"/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Distribución por plan">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={Object.entries(S.cbp).map(([k,v])=>({name:k,value:v}))}
                        cx="50%" cy="50%" outerRadius={85} innerRadius={42} dataKey="value" nameKey="name"
                        label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {Object.keys(S.cbp).map((_,i) => <Cell key={i} fill={CC[i%CC.length]}/>)}
                      </Pie>
                      <Tooltip content={<Tip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  {Object.entries(S.cbp).sort((a,b)=>b[1]-a[1]).map(([p,c],i) => (
                    <RankBar key={p} label={p.charAt(0).toUpperCase()+p.slice(1)} value={c}
                      max={Math.max(...Object.values(S.cbp))} color={CC[i%CC.length]}/>
                  ))}
                </Card>

                <Card title="Top compañías por llantas">
                  {S.topCo.map((c,i) => (
                    <RankBar key={c.id} label={c.name} value={c.tireCount}
                      max={S.topCo[0]?.tireCount||1} color={CC[i%CC.length]}/>
                  ))}
                </Card>
              </div>

              <Card title="Todas las compañías">
                <DataTable
                  cols={["Compañía","Plan","Llantas","Vehículos","Usuarios","Periodicidad"]}
                  rows={[...companies].sort((a,b)=>(b.tireCount||0)-(a.tireCount||0)).map(c => [
                    <span key={c.id} className="font-bold text-[#0A183A]">{c.name}</span>,
                    <PlanBadge key="p" plan={c.plan}/>,
                    <span key="t" className="font-semibold text-[#1E76B6]">{c.tireCount}</span>,
                    c.vehicleCount, c.userCount,
                    `${c.periodicity} mes(es)`,
                  ])}
                />
              </Card>
            </>}

            {/* ══════ USUARIOS ══════ */}
            {tab==="users" && <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPI label="Total usuarios" value={users.length}               color={C.navy}  icon="👥"/>
                <KPI label="Verificados"    value={S.verified}                 color={C.green} icon="✅"
                  sub={`${users.length?((S.verified/users.length)*100).toFixed(0):0}% del total`}/>
                <KPI label="Sin verificar"  value={users.length-S.verified}    color={C.amber} icon="⏳"/>
                <KPI label="Puntos totales" value={fmtM(S.totPuntos)}          color={C.mid}   icon="⭐"/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Por rol">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={Object.entries(S.ubr).map(([k,v])=>({name:k,value:v}))}
                        cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                        label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {Object.keys(S.ubr).map((_,i) => <Cell key={i} fill={CC[i%CC.length]}/>)}
                      </Pie>
                      <Tooltip content={<Tip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-0.5">
                    {Object.entries(S.ubr).sort((a,b)=>b[1]-a[1]).map(([r,c],i) => (
                      <RankBar key={r} label={r.charAt(0).toUpperCase()+r.slice(1)} value={c}
                        max={Math.max(...Object.values(S.ubr))} color={CC[i%CC.length]}
                        suffix={` (${users.length?((c/users.length)*100).toFixed(0):0}%)`}/>
                    ))}
                  </div>
                </Card>

                <Card title="Usuarios por compañía (top 10)">
                  {S.topUCo.map((c,i) => (
                    <RankBar key={c.name} label={c.name} value={c.count}
                      max={S.topUCo[0]?.count||1} color={CC[i%CC.length]}/>
                  ))}
                </Card>
              </div>

              <Card title="Top 30 usuarios por puntos">
                <DataTable
                  cols={["#","Nombre","Email","Rol","Puntos","Verificado","Idioma"]}
                  rows={[...users].sort((a,b)=>(b.puntos||0)-(a.puntos||0)).slice(0,30).map((u,i) => [
                    <span key={i} className="text-gray-400 font-mono text-xs">{i+1}</span>,
                    <span key="n" className="font-semibold text-[#0A183A]">{u.name}</span>,
                    <span key="e" className="text-xs text-gray-500">{u.email}</span>,
                    <span key="r" className="capitalize text-gray-600">{u.role}</span>,
                    <span key="p" className="font-bold text-[#1E76B6]">{fmt(u.puntos||0)}</span>,
                    u.isVerified ? "✅" : "⏳",
                    u.preferredLanguage || "es",
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