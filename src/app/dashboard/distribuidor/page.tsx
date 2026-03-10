"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, AlertTriangle, TrendingUp, Package,
  Bell, Calendar, Search, ChevronDown, Loader2,
  AlertCircle, X, Building2,
} from "lucide-react";

import SemaforoTabla   from "../cards/semaforoTabla";
import type { Vehicle, Tire as SemaforoTire } from "../cards/semaforoTabla";
import PorMarca        from "../cards/porMarca";
import PorBanda        from "../cards/porBanda";
import TablaCpk        from "../cards/tablaCpk";
import type { Tire as TablaCpkTire } from "../cards/tablaCpk";
import DetallesLlantas from "../cards/detallesLlantas";
import type { Tire as DetallesLlantasTire } from "../cards/detallesLlantas";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import type { Tire as ReencaucheTire } from "../cards/reencaucheHistorico";
import HistoricChart   from "../cards/historicChart";
import type { Tire as HistoricTire } from "../cards/historicChart";
import TanqueMilimetro from "../cards/tanqueMilimetro";
import type { Tire as TanqueTire } from "../cards/tanqueMilimetro";

// =============================================================================
// Types — normalized backend shape
// =============================================================================

type Company = { id: string; name: string; vehicleCount: number; tireCount: number };

type Notification = {
  id: string; title: string; message: string;
  type: "info" | "warning" | "critical"; timestamp: string;
  company: { id: string; name: string };
  vehicle?: { id: string; placa: string };
};

// Raw tire from /api/tires (normalized relations)
type RawCosto     = { valor: number; fecha: string | Date };
type RawInspeccion = {
  fecha: string | Date;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk?: number | null; cpkProyectado?: number | null;
  cpt?: number | null; cptProyectado?: number | null;
  kilometrosEstimados?: number | null; kmProyectado?: number | null;
  imageUrl?: string | null;
};
type RawEvento = {
  tipo: string; fecha: string | Date;
  notas?: string | null; metadata?: Record<string, unknown> | null;
};
type RawTire = {
  id: string; placa: string; marca: string; diseno: string;
  profundidadInicial: number; dimension: string; eje: string;
  posicion: number; companyId: string; vehicleId?: string | null;
  diasAcumulados?: number; kilometrosRecorridos: number;
  primeraVida?: Array<{ cpk?: number }>;
  costos: RawCosto[];
  inspecciones: RawInspeccion[];
  eventos: RawEvento[];
};

// Normalised shapes used by child cards
type CostEntry  = { valor: number; fecha: string };
type Inspection = {
  fecha: string; profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk: number | null; cpkProyectado: number | null;
  cpt: number | null; cptProyectado: number | null;
  kilometrosEstimados: number | null; kmProyectado: number | null; imageUrl: string | null;
};
type VidaEntry = { valor: string; fecha: string };
type NormTire  = RawTire & { costo: CostEntry[]; inspecciones: Inspection[]; vida: VidaEntry[] };

// =============================================================================
// Helpers
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

const VIDA_SET = new Set(["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"]);

function toISO(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function normaliseTire(raw: RawTire): NormTire {
  const costo: CostEntry[] = [...raw.costos]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((c) => ({ valor: c.valor ?? 0, fecha: toISO(c.fecha) }));

  const inspecciones: Inspection[] = [...raw.inspecciones]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((i) => ({
      fecha: toISO(i.fecha),
      profundidadInt: i.profundidadInt ?? 0, profundidadCen: i.profundidadCen ?? 0, profundidadExt: i.profundidadExt ?? 0,
      cpk: i.cpk ?? null, cpkProyectado: i.cpkProyectado ?? null,
      cpt: i.cpt ?? null, cptProyectado: i.cptProyectado ?? null,
      kilometrosEstimados: i.kilometrosEstimados ?? null, kmProyectado: i.kmProyectado ?? null,
      imageUrl: i.imageUrl ?? null,
    }));

  const vida: VidaEntry[] = raw.eventos
    .filter((e) => e.notas && VIDA_SET.has(e.notas.toLowerCase()))
    .map((e) => ({ valor: e.notas!.toLowerCase(), fecha: toISO(e.fecha) }));

  return { ...raw, costo, inspecciones, vida };
}

const fmtCOP = (n: number) =>
  n === 0 ? "N/A"
  : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

// =============================================================================
// Micro-components — TirePro design system
// =============================================================================

/** Frosted-glass sticky header bar  */
function PageHeader({ userName, selectedClient, options, onSelect, searchTerm, onSearch, showDropdown, setShowDropdown }:
  { userName: string; selectedClient: string; options: string[]; onSelect: (v: string) => void;
    searchTerm: string; onSearch: (v: string) => void; showDropdown: boolean; setShowDropdown: (v: boolean) => void }) {
  return (
    <div
      className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none tracking-tight truncate">
            Panel Distribuidor
          </h1>
          <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date().toLocaleDateString("es-CO")}
            {userName && <> · Bienvenido, {userName}</>}
          </p>
        </div>
      </div>

      {/* Client selector */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: selectedClient !== "Todos" ? "rgba(30,118,182,0.1)" : "rgba(10,24,58,0.04)",
            border: selectedClient !== "Todos" ? "1px solid rgba(30,118,182,0.4)" : "1px solid rgba(52,140,203,0.2)",
            color: selectedClient !== "Todos" ? "#1E76B6" : "#0A183A",
          }}
        >
          <span className="max-w-[120px] sm:max-w-[180px] truncate">
            {selectedClient === "Todos" ? "Todos los clientes" : selectedClient}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform text-[#1E76B6] ${showDropdown ? "rotate-180" : ""}`} />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div
              className="absolute right-0 mt-1 w-60 rounded-xl overflow-hidden z-20"
              style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)", boxShadow: "0 8px 32px rgba(10,24,58,0.15)" }}
            >
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    autoFocus type="text" placeholder="Buscar cliente…"
                    value={searchTerm}
                    onChange={(e) => onSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                    style={{ border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {options.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-4">Sin resultados</p>
                  : options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { onSelect(opt); setShowDropdown(false); onSearch(""); }}
                      className="block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F0F7FF]"
                      style={{ color: selectedClient === opt ? "#1E76B6" : "#0A183A", fontWeight: selectedClient === opt ? 700 : 400 }}
                    >
                      {opt === "Todos" ? "Todos los clientes" : opt}
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Dark-gradient metric card — same as ResumenPage */
function MetricCard({ value, sub, label, loading, variant = "primary" }: {
  value: string; sub?: string; label: string; loading?: boolean;
  variant?: "primary" | "secondary" | "accent" | "warn";
}) {
  const bgs: Record<string, string> = {
    primary:   "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
    secondary: "linear-gradient(135deg, #173D68 0%, #1E76B6 100%)",
    accent:    "linear-gradient(135deg, #1E76B6 0%, #348CCB 100%)",
    warn:      "linear-gradient(135deg, #92400E 0%, #D97706 100%)",
  };
  return (
    <div className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between" style={{ background: bgs[variant], minHeight: 100, boxShadow: "0 4px 20px rgba(10,24,58,0.18)" }}>
      {loading
        ? <div className="flex items-center gap-2 text-white/60"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">…</span></div>
        : (
          <>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none break-all">{value}</p>
            {sub && <p className="text-xs font-bold text-white/70 mt-0.5">{sub}</p>}
          </>
        )}
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mt-2">{label}</p>
    </div>
  );
}

/** White panel card wrapper */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
    >
      {children}
    </div>
  );
}

/** Card title row */
function CardTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <h2 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h2>
    </div>
  );
}

/** Loading skeleton */
function SkeletonCard({ label }: { label: string }) {
  return (
    <Card className="p-6 flex items-center justify-center min-h-[140px]">
      <div className="flex items-center gap-2 text-[#1E76B6]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </Card>
  );
}

/** Horizontal scroll wrapper */
function ScrollCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b sm:hidden" style={{ borderColor: "rgba(52,140,203,0.1)", background: "rgba(10,24,58,0.02)" }}>
        <span className="text-[10px] font-medium" style={{ color: "#348CCB" }}>← Desliza para ver más →</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

/** 2-column responsive row */
function PairRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">{children}</div>;
}

// =============================================================================
// Main Page
// =============================================================================

export default function DistribuidorPage() {
  const [companies,          setCompanies]          = useState<Company[]>([]);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");
  const [userName,           setUserName]           = useState("");
  const [selectedClient,     setSelectedClient]     = useState("Todos");
  const [showDropdown,       setShowDropdown]       = useState(false);
  const [clientSearch,       setClientSearch]       = useState("");
  const [notifications,      setNotifications]      = useState<Notification[]>([]);
  const [activeAlerts,       setActiveAlerts]       = useState(0);
  const [avgCpkProyectado,   setAvgCpkProyectado]   = useState(0);
  const [avgCptProyectado,   setAvgCptProyectado]   = useState(0);
  const [allVehicles,        setAllVehicles]        = useState<Vehicle[]>([]);
  const [allTires,           setAllTires]           = useState<SemaforoTire[]>([]);
  const [loadingCards,       setLoadingCards]       = useState(false);
  const [marcaData,          setMarcaData]          = useState<Record<string, number>>({});
  const [bandaData,          setBandaData]          = useState<Record<string, number>>({});
  const [cpkTires,           setCpkTires]           = useState<TablaCpkTire[]>([]);
  const [detailTires,        setDetailTires]        = useState<DetallesLlantasTire[]>([]);
  const [reencaucheTires,    setReencaucheTires]    = useState<ReencaucheTire[]>([]);
  const [historicTires,      setHistoricTires]      = useState<HistoricTire[]>([]);
  const [tanqueTires,        setTanqueTires]        = useState<TanqueTire[]>([]);
  const [vidaStats,          setVidaStats]          = useState({ nueva: 0, reencauche1: 0, reencauche2: 0, reencauche3: 0, total: 0 });
  const [totalClients,       setTotalClients]       = useState(0);

  // ── Auth user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      setUserName(u.name || u.email || "Distribuidor");
    }
  }, []);

  // ── Fetch companies list ───────────────────────────────────────────────────
  const fetchCompanies = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await authFetch(`${API_BASE}/companies/me/clients`);
      if (!res.ok) throw new Error("Error cargando clientes");
      const data = await res.json();

      const withCounts = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map(async (access: any) => {
          try {
            const [vRes, tRes] = await Promise.all([
              authFetch(`${API_BASE}/vehicles?companyId=${access.company.id}`),
              authFetch(`${API_BASE}/tires?companyId=${access.company.id}`),
            ]);
            return {
              id: access.company.id, name: access.company.name,
              vehicleCount: vRes.ok ? (await vRes.json()).length : 0,
              tireCount:    tRes.ok ? (await tRes.json()).length : 0,
            };
          } catch {
            return { id: access.company.id, name: access.company.name, vehicleCount: 0, tireCount: 0 };
          }
        })
      );
      setCompanies(withCounts);
      setTotalClients(withCounts.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const filteredCompanies = useMemo(() =>
    selectedClient === "Todos" ? companies : companies.filter((c) => c.name === selectedClient),
    [companies, selectedClient]
  );

  const filteredOptions = useMemo(() => {
    const all = ["Todos", ...companies.map((c) => c.name)];
    return clientSearch.trim()
      ? all.filter((o) => o.toLowerCase().includes(clientSearch.toLowerCase()))
      : all;
  }, [companies, clientSearch]);

  // ── Fetch notifications ────────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredCompanies.length) { setNotifications([]); setActiveAlerts(0); return; }
    const run = async () => {
      try {
        const res = await authFetch(`${API_BASE}/notifications/by-companies`, {
          method: "POST",
          body: JSON.stringify({ companyIds: filteredCompanies.map((c) => c.id) }),
        });
        if (!res.ok) return;
        const data: Notification[] = await res.json();
        setNotifications(data); setActiveAlerts(data.length);
      } catch { /* silent */ }
    };
    run();
  }, [filteredCompanies]);

  // ── Fetch tires for KPI stats ──────────────────────────────────────────────
  useEffect(() => {
    if (!filteredCompanies.length) {
      setAvgCpkProyectado(0); setAvgCptProyectado(0);
      setVidaStats({ nueva: 0, reencauche1: 0, reencauche2: 0, reencauche3: 0, total: 0 });
      return;
    }
    const run = async () => {
      const bucket: NormTire[] = [];
      await Promise.all(
        filteredCompanies.map(async (co) => {
          const res = await authFetch(`${API_BASE}/tires?companyId=${co.id}`);
          if (!res.ok) return;
          const raw: RawTire[] = await res.json();
          bucket.push(...raw.map(normaliseTire));
        })
      );

      let sumCpk = 0, sumCpt = 0, cntCpk = 0, cntCpt = 0;
      let nueva = 0, r1 = 0, r2 = 0, r3 = 0;

      bucket.forEach((t) => {
        if (t.inspecciones.length) {
          const last = t.inspecciones[t.inspecciones.length - 1];
          if (last.cpkProyectado && last.cpkProyectado > 0) { sumCpk += last.cpkProyectado; cntCpk++; }
          if (last.cptProyectado && last.cptProyectado > 0) { sumCpt += last.cptProyectado; cntCpt++; }
        }
        if (t.vida.length) {
          const v = t.vida[t.vida.length - 1].valor;
          if (v === "nueva") nueva++;
          else if (v === "reencauche1") r1++;
          else if (v === "reencauche2") r2++;
          else if (v === "reencauche3") r3++;
        }
      });

      setAvgCpkProyectado(cntCpk > 0 ? Math.round(sumCpk / cntCpk) : 0);
      setAvgCptProyectado(cntCpt > 0 ? Math.round(sumCpt / cntCpt) : 0);
      setVidaStats({ nueva, reencauche1: r1, reencauche2: r2, reencauche3: r3, total: nueva + r1 + r2 + r3 });
    };
    run();
  }, [filteredCompanies]);

  // ── Fetch vehicles + tires for charts ─────────────────────────────────────
  useEffect(() => {
    if (!filteredCompanies.length) {
      setAllVehicles([]); setAllTires([]); setMarcaData({}); setBandaData({});
      setCpkTires([]); setLoadingCards(false); return;
    }
    const run = async () => {
      setLoadingCards(true);
      const vehiclesArr: Vehicle[] = [];
      const tiresArr: NormTire[]   = [];

      await Promise.all(
        filteredCompanies.map(async (co) => {
          try {
            const [vRes, tRes] = await Promise.all([
              authFetch(`${API_BASE}/vehicles?companyId=${co.id}`),
              authFetch(`${API_BASE}/tires?companyId=${co.id}`),
            ]);
            if (vRes.ok) vehiclesArr.push(...await vRes.json());
            if (tRes.ok) {
              const raw: RawTire[] = await tRes.json();
              tiresArr.push(...raw.map(normaliseTire));
            }
          } catch { /* skip company */ }
        })
      );

      setAllVehicles(vehiclesArr);

      // SemaforoTabla expects tires with costo / inspecciones / vida shape — pass NormTire as-is
      setAllTires(tiresArr as unknown as SemaforoTire[]);

      // marca / banda counts
      const mCount: Record<string, number> = {};
      const bCount: Record<string, number> = {};
      tiresArr.forEach((t) => {
        if (t.marca?.trim())  mCount[t.marca.trim()]  = (mCount[t.marca.trim()]  || 0) + 1;
        if (t.diseno?.trim()) bCount[t.diseno.trim()] = (bCount[t.diseno.trim()] || 0) + 1;
      });
      setMarcaData(mCount); setBandaData(bCount);

      const vehicleMap = new Map(vehiclesArr.map((v) => [v.id, v.placa]));

      setCpkTires(tiresArr.map((t) => ({
        id: t.id,
        placa: t.vehicleId ? (vehicleMap.get(t.vehicleId) ?? "N/A") : "N/A",
        marca: t.marca || "N/A", posicion: t.posicion || 0,
        vida: t.vida, inspecciones: t.inspecciones,
      })));

      setDetailTires(tiresArr.map((t) => ({
        id: t.id, placa: t.placa, marca: t.marca, diseno: t.diseno,
        profundidadInicial: t.profundidadInicial, dimension: t.dimension,
        eje: t.eje, posicion: t.posicion, kilometrosRecorridos: t.kilometrosRecorridos,
        costo: t.costo, vida: t.vida, inspecciones: t.inspecciones,
        primeraVida: t.primeraVida || [], vehicleId: t.vehicleId,
        // detallesLlantas.tsx reads tire.eventos.at(-1)?.valor for the vida label —
        // reconstruct a minimal eventos array from the already-normalised vida entries
        // so the card never sees undefined.
        eventos: (t.vida ?? []).map((v) => ({
          tipo:  "vida",
          fecha: v.fecha,
          notas: v.valor,
          metadata: null,
        })),
      })));

      setReencaucheTires(tiresArr.map((t) => ({ id: t.id, vida: t.vida })));
      setHistoricTires(tiresArr.map((t) => ({ id: t.id, inspecciones: t.inspecciones })));
      setTanqueTires(tiresArr.map((t) => ({ id: t.id, profundidadInicial: t.profundidadInicial, inspecciones: t.inspecciones })));

      setLoadingCards(false);
    };
    run();
  }, [filteredCompanies]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalReencauche = vidaStats.reencauche1 + vidaStats.reencauche2 + vidaStats.reencauche3;
  const pct = (n: number) => vidaStats.total > 0 ? ((n / vidaStats.total) * 100).toFixed(1) : "0.0";

  const vidaBars = [
    { label: "Nueva",        value: vidaStats.nueva,       grad: "linear-gradient(90deg, #348CCB, #7DC5F0)" },
    { label: "Reencauche 1", value: vidaStats.reencauche1, grad: "linear-gradient(90deg, #1E76B6, #348CCB)" },
    { label: "Reencauche 2", value: vidaStats.reencauche2, grad: "linear-gradient(90deg, #173D68, #1E76B6)" },
    { label: "Reencauche 3", value: vidaStats.reencauche3, grad: "linear-gradient(90deg, #0A183A, #173D68)" },
  ];

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>

      <PageHeader
        userName={userName}
        selectedClient={selectedClient}
        options={filteredOptions}
        onSelect={setSelectedClient}
        searchTerm={clientSearch}
        onSearch={setClientSearch}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* Error banner */}
        {error && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard loading={loading} value={String(totalClients)}           label="Clientes Totales"   variant="primary"   />
          <MetricCard loading={loading} value={String(activeAlerts)}           label="Alertas Activas"    variant="warn"      />
          <MetricCard loading={loading} value={fmtCOP(avgCpkProyectado)} sub={fmtCOP(avgCptProyectado)} label="CPK · CPT Proyectado" variant="secondary" />
          <MetricCard loading={loading} value={String(totalReencauche)}  sub={`/ ${vidaStats.nueva} nuevas`} label="Reencauche · Nueva" variant="accent" />
        </div>

        {/* ── Row 1: Semáforo + Alerts ──────────────────────────────────────── */}
        <PairRow>
          {loadingCards ? <SkeletonCard label="Cargando semáforo…" /> : (
            <ScrollCard><SemaforoTabla vehicles={allVehicles} tires={allTires} /></ScrollCard>
          )}

          {/* Alerts */}
          <Card className="p-4 sm:p-5 flex flex-col">
            <CardTitle icon={Bell} title="Alertas por Cliente" />
            {activeAlerts > 0 && (
              <span
                className="self-start mb-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}
              >
                {activeAlerts} activa{activeAlerts > 1 ? "s" : ""}
              </span>
            )}
            <div className="overflow-y-auto max-h-64 space-y-2 flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <Bell className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Sin alertas activas</p>
                </div>
              ) : notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl p-3"
                  style={{ borderLeft: "3px solid #DC2626", background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0A183A] truncate">{n.company.name}</p>
                      {n.vehicle && <p className="text-[10px] text-gray-500">Vehículo: {n.vehicle.placa.toUpperCase()}</p>}
                      <p className="text-xs font-semibold text-gray-800 mt-0.5">{n.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    <time className="text-[9px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {new Date(n.timestamp).toLocaleDateString("es-CO")}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </PairRow>

        {/* ── Row 2: Vida distribution + PorMarca ──────────────────────────── */}
        <PairRow>
          <Card className="p-4 sm:p-5 flex flex-col">
            <CardTitle icon={Package} title="Distribución de Neumáticos" />
            <div className="flex-1 space-y-3">
              {vidaBars.map(({ label, value, grad }) => (
                <div key={label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-semibold text-[#0A183A]">{label}</span>
                    <span className="text-xs font-black text-[#0A183A]">
                      {value}
                      <span className="font-normal text-gray-400 ml-1">({pct(value)}%)</span>
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "rgba(10,24,58,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct(value)}%`, background: grad }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: "1px solid rgba(52,140,203,0.12)" }}>
              <span className="text-xs font-bold text-[#0A183A]">Total</span>
              <span className="text-xs font-black text-[#1E76B6]">{vidaStats.total} neumáticos</span>
            </div>
          </Card>

          {loadingCards ? <SkeletonCard label="Cargando marcas…" /> :
            Object.keys(marcaData).length > 0 ? <PorMarca groupData={marcaData} /> : <SkeletonCard label="Sin datos de marcas" />}
        </PairRow>

        {/* ── Row 3: PorBanda + TablaCpk ───────────────────────────────────── */}
        <PairRow>
          {loadingCards ? <SkeletonCard label="Cargando bandas…" /> :
            Object.keys(bandaData).length > 0 ? <PorBanda groupData={bandaData} /> : <SkeletonCard label="Sin datos de bandas" />}

          {loadingCards ? <SkeletonCard label="Cargando CPK…" /> : (
            <ScrollCard><TablaCpk tires={cpkTires} /></ScrollCard>
          )}
        </PairRow>

        {/* ── Row 4: TanqueMilimetro + ReencaucheHistorico ─────────────────── */}
        <PairRow>
          {loadingCards ? <SkeletonCard label="Cargando datos…" /> : <TanqueMilimetro tires={tanqueTires} language="es" />}
          {loadingCards ? <SkeletonCard label="Cargando histórico…" /> : <ReencaucheHistorico tires={reencaucheTires} language="es" />}
        </PairRow>

        {/* ── Row 5: HistoricChart + DetallesLlantas ────────────────────────── */}
        <PairRow>
          {loadingCards ? <SkeletonCard label="Cargando gráfico…" /> : <HistoricChart tires={historicTires} language="es" />}
          {loadingCards ? <SkeletonCard label="Cargando detalles…" /> : (
            <ScrollCard><DetallesLlantas tires={detailTires} vehicles={allVehicles} /></ScrollCard>
          )}
        </PairRow>

        {/* ── Client list ───────────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle icon={Users} title="Listado de Clientes" />
            {filteredCompanies.length > 0 && (
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full ml-auto"
                style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
              >
                {filteredCompanies.length} cliente{filteredCompanies.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#1E76B6]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Cargando clientes…</span>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Sin clientes para mostrar</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredCompanies.map((co) => (
                <button
                  key={co.id}
                  onClick={() => setSelectedClient(co.name)}
                  className="text-left rounded-xl p-3 sm:p-4 transition-all duration-200 group focus:outline-none"
                  style={{
                    border: selectedClient === co.name ? "2px solid rgba(30,118,182,0.5)" : "2px solid rgba(52,140,203,0.12)",
                    background: selectedClient === co.name ? "rgba(30,118,182,0.04)" : "white",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(10,24,58,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-black text-sm mb-2 sm:mb-3 transition-transform group-hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
                  >
                    {co.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-[#0A183A] text-xs sm:text-sm truncate mb-1.5 group-hover:text-[#1E76B6] transition-colors">
                    {co.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">🚛 <strong className="text-[#0A183A]">{co.vehicleCount}</strong> vehículos</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">⚫ <strong className="text-[#0A183A]">{co.tireCount}</strong> neumáticos</p>
                </button>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}