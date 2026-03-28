"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, AlertTriangle, TrendingUp, Package,
  Bell, Calendar, Search, ChevronDown, Loader2,
  AlertCircle, X, Building2,
  Truck,
} from "lucide-react";

import SemaforoTabla   from "../cards/SemaforoTabla";
import type { Vehicle, Tire as SemaforoTire } from "../cards/SemaforoTabla";
import PorMarca        from "../cards/PorMarca";
import PorBanda        from "../cards/PorBanda";
import TablaCpk        from "../cards/TablaCpk";
import type { Tire as TablaCpkTire } from "../cards/TablaCpk";
import DetallesLlantas from "../cards/DetallesLlantas";
import type { Tire as DetallesLlantasTire } from "../cards/DetallesLlantas";
import ReencaucheHistorico from "../cards/ReencaucheHistorico";
import type { Tire as ReencaucheTire } from "../cards/ReencaucheHistorico";
import HistoricChart   from "../cards/HistoricChart";
import type { Tire as HistoricTire } from "../cards/HistoricChart";
import TanqueMilimetro from "../cards/TanqueMilimetro";
import type { Tire as TanqueTire } from "../cards/TanqueMilimetro";

// =============================================================================
// Types
// =============================================================================

type Company = { id: string; name: string; vehicleCount: number; tireCount: number };

type Notification = {
  id: string; title: string; message: string;
  type: "info" | "warning" | "critical"; createdAt: string;
  tireId?: string | null;
  company: { id: string; name: string };
  vehicle?: { id: string; placa: string };
};

type RawCosto      = { valor: number; fecha: string | Date };
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
// Micro-components
// =============================================================================

function PageHeader({
  userName, selectedClient, companies, onSelect,
  searchTerm, onSearch, showDropdown, setShowDropdown,
}: {
  userName: string;
  selectedClient: Company | null;
  companies: Company[];
  onSelect: (c: Company) => void;
  searchTerm: string;
  onSearch: (v: string) => void;
  showDropdown: boolean;
  setShowDropdown: (v: boolean) => void;
}) {
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [companies, searchTerm]);

  return (
    <div
      className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}
    >
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
            {companies.length > 0 && <> · {companies.length} cliente{companies.length !== 1 ? "s" : ""}</>}
          </p>
        </div>
      </div>

      {/* Client selector */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: selectedClient ? "rgba(30,118,182,0.1)" : "rgba(10,24,58,0.04)",
            border: selectedClient ? "1px solid rgba(30,118,182,0.4)" : "1px solid rgba(52,140,203,0.2)",
            color: selectedClient ? "#1E76B6" : "#0A183A",
          }}
        >
          <span className="max-w-[120px] sm:max-w-[180px] truncate">
            {selectedClient ? selectedClient.name : "Seleccionar cliente"}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform text-[#1E76B6] ${showDropdown ? "rotate-180" : ""}`} />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div
              className="absolute right-0 mt-1 w-64 rounded-xl overflow-hidden z-20"
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
              <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-4">Sin resultados</p>
                  : filtered.map((co) => (
                    <button
                      key={co.id}
                      onClick={() => { onSelect(co); setShowDropdown(false); onSearch(""); }}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F0F7FF]"
                      style={{ color: selectedClient?.id === co.id ? "#1E76B6" : "#0A183A", fontWeight: selectedClient?.id === co.id ? 700 : 400 }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
                      >
                        {co.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{co.name}</p>
                        <p className="text-[10px] text-gray-400">{co.tireCount} neumáticos · {co.vehicleCount} vehículos</p>
                      </div>
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

function PairRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">{children}</div>;
}

/** Empty state when no client is selected yet */
function NoClientSelected({ companies, onSelect }: { companies: Company[]; onSelect: (c: Company) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="p-5 rounded-3xl" style={{ background: "rgba(30,118,182,0.08)" }}>
        <Building2 className="w-10 h-10 text-[#1E76B6]" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-black text-[#0A183A] mb-1">Selecciona un cliente</h2>
        <p className="text-sm text-gray-400">Elige una empresa para ver sus datos de neumáticos</p>
      </div>
      {companies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-2xl px-4">
          {companies.slice(0, 8).map((co) => (
            <button
              key={co.id}
              onClick={() => onSelect(co)}
              className="text-left rounded-xl p-3 transition-all hover:shadow-md"
              style={{ border: "2px solid rgba(52,140,203,0.15)", background: "white" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,118,182,0.4)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(52,140,203,0.15)"; }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm mb-2"
                style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
              >
                {co.name.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-[#0A183A] text-xs truncate">{co.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{co.tireCount} neum.</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function DistribuidorPage() {
  const [companies,        setCompanies]        = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [error,            setError]            = useState("");
  const [userName,         setUserName]         = useState("");

  // ── Single selected client (not "Todos" anymore) ──────────────────────────
  const [selectedClient,   setSelectedClient]   = useState<Company | null>(null);
  const [showDropdown,     setShowDropdown]      = useState(false);
  const [clientSearch,     setClientSearch]      = useState("");

  // ── Per-client data ────────────────────────────────────────────────────────
  const [notifications,    setNotifications]    = useState<Notification[]>([]);
  const [avgCpkProyectado, setAvgCpkProyectado] = useState(0);
  const [avgCptProyectado, setAvgCptProyectado] = useState(0);

  const [savingPerMonth,   setSavingPerMonth]   = useState(0);
  const [savingPerYear,    setSavingPerYear]    = useState(0);
  const [savingPct,        setSavingPct]        = useState(0);
  const [allVehicles,      setAllVehicles]      = useState<Vehicle[]>([]);
  const [allTires,         setAllTires]         = useState<SemaforoTire[]>([]);
  const [loadingCards,     setLoadingCards]     = useState(false);
  const [marcaData,        setMarcaData]        = useState<Record<string, number>>({});
  const [bandaData,        setBandaData]        = useState<Record<string, number>>({});
  const [cpkTires,         setCpkTires]         = useState<TablaCpkTire[]>([]);
  const [detailTires,      setDetailTires]      = useState<DetallesLlantasTire[]>([]);
  const [reencaucheTires,  setReencaucheTires]  = useState<ReencaucheTire[]>([]);
  const [historicTires,    setHistoricTires]    = useState<HistoricTire[]>([]);
  const [tanqueTires,      setTanqueTires]      = useState<TanqueTire[]>([]);
  const [vidaStats,        setVidaStats]        = useState({ nueva: 0, reencauche1: 0, reencauche2: 0, reencauche3: 0, total: 0 });

  // ── Auth user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      setUserName(u.name || u.email || "Distribuidor");
    }
  }, []);

  // ── Fetch companies list (lightweight — just names, no counts) ─────────────
  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true); setError("");
    try {
      const res = await authFetch(`${API_BASE}/companies/me/clients`);
      if (!res.ok) throw new Error("Error cargando clientes");
      const data = await res.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: Company[] = data.map((access: any) => ({
        id: access.company.id,
        name: access.company.name,
        vehicleCount: 0,
        tireCount: 0,
      }));

      setCompanies(list);

      // Auto-select the first client so the dashboard isn't empty
      if (list.length > 0) {
        setSelectedClient(list[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // ── Clear charts when client changes ──────────────────────────────────────
  const clearClientData = useCallback(() => {
  setNotifications([]);
  setAvgCpkProyectado(0); setAvgCptProyectado(0);
  setSavingPerMonth(0); setSavingPerYear(0); setSavingPct(0);
  setAllVehicles([]); setAllTires([]);
  setMarcaData({}); setBandaData({});
  setCpkTires([]); setDetailTires([]);
  setReencaucheTires([]); setHistoricTires([]); setTanqueTires([]);
  setVidaStats({ nueva: 0, reencauche1: 0, reencauche2: 0, reencauche3: 0, total: 0 });
}, []);

  // ── Fetch notifications for selected client ────────────────────────────────
  useEffect(() => {
    if (!selectedClient) return;
    const run = async () => {
      try {
        const res = await authFetch(`${API_BASE}/notifications/by-companies`, {
          method: "POST",
          body: JSON.stringify({ companyIds: [selectedClient.id] }),
        });
        if (!res.ok) return;
        const data: Notification[] = await res.json();
        setNotifications(data);
      } catch { /* silent */ }
    };
    run();
  }, [selectedClient]);

  // ── Fetch full tire data — ONLY for the single selected client ─────────────
  useEffect(() => {
    if (!selectedClient) { clearClientData(); return; }

    const run = async () => {
      setLoadingCards(true);

      try {
        const [vRes, tRes] = await Promise.all([
          authFetch(`${API_BASE}/vehicles?companyId=${selectedClient.id}`),
          authFetch(`${API_BASE}/tires?companyId=${selectedClient.id}`),
        ]);

        const vehiclesArr: Vehicle[] = vRes.ok ? await vRes.json() : [];
        const rawTires: RawTire[]    = tRes.ok ? await tRes.json() : [];
        const tiresArr: NormTire[]   = rawTires.map(normaliseTire);

        setAllVehicles(vehiclesArr);
        setAllTires(tiresArr as unknown as SemaforoTire[]);

        // Update selected client's counts (avoids fetching counts for ALL companies upfront)
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id
              ? { ...c, vehicleCount: vehiclesArr.length, tireCount: tiresArr.length }
              : c
          )
        );

        // ── KPI stats ──────────────────────────────────────────────────────
        let sumCpk = 0, sumCpt = 0, cntCpk = 0, cntCpt = 0;
        let nueva = 0, r1 = 0, r2 = 0, r3 = 0;

        tiresArr.forEach((t) => {
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

        const computedAvgCpk = cntCpk > 0 ? Math.round(sumCpk / cntCpk) : 0;
        const computedAvgCpt = cntCpt > 0 ? Math.round(sumCpt / cntCpt) : 0;

        setAvgCpkProyectado(computedAvgCpk);
        setAvgCptProyectado(computedAvgCpt);
        setVidaStats({ nueva, reencauche1: r1, reencauche2: r2, reencauche3: r3, total: nueva + r1 + r2 + r3 });

        // ------------------------------------------------------------------
        // Savings estimate for dashboard cards
        // Temporary frontend approximation until /companies/:id/roi exists
        // ------------------------------------------------------------------

        // 1. Estimate current fleet monthly km from vehicles
        const monthlyKmFleet = vehiclesArr.reduce((sum, v) => {
        return sum + (v.kilometrajeActual || 0);
        }, 0);

        // 2. Use benchmark target CPK for now
        const targetCpk = 12;

        // 3. Use projected avg CPK as current CPK
        const currentCpk = computedAvgCpk;

        // 4. Savings only if current CPK is worse than target
        const monthlySaving =
        currentCpk > targetCpk
          ? monthlyKmFleet * (currentCpk - targetCpk)
          : 0;

        const yearlySaving = monthlySaving * 12;
        const improvementPct =
        currentCpk > 0 && currentCpk > targetCpk
          ? ((currentCpk - targetCpk) / currentCpk) * 100
          : 0;

        setSavingPerMonth(monthlySaving);
        setSavingPerYear(yearlySaving);
        setSavingPct(improvementPct);

        // ── Marca / Banda counts ───────────────────────────────────────────
        const mCount: Record<string, number> = {};
        const bCount: Record<string, number> = {};
        tiresArr.forEach((t) => {
          if (t.marca?.trim())  mCount[t.marca.trim()]  = (mCount[t.marca.trim()]  || 0) + 1;
          if (t.diseno?.trim()) bCount[t.diseno.trim()] = (bCount[t.diseno.trim()] || 0) + 1;
        });
        setMarcaData(mCount); setBandaData(bCount);

        // ── Card-specific shapes ───────────────────────────────────────────
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
          eventos: (t.vida ?? []).map((v) => ({
            tipo: "vida", fecha: v.fecha, notas: v.valor, metadata: null,
          })),
        })));

        setReencaucheTires(tiresArr.map((t) => ({ id: t.id, vida: t.vida })));
        setHistoricTires(tiresArr.map((t) => ({ id: t.id, inspecciones: t.inspecciones })));
        setTanqueTires(tiresArr.map((t) => ({ id: t.id, profundidadInicial: t.profundidadInicial, inspecciones: t.inspecciones })));

      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos del cliente");
      } finally {
        setLoadingCards(false);
      }
    };

    run();
  }, [selectedClient, clearClientData]);

  // ── Handle client selection ────────────────────────────────────────────────
  const handleSelectClient = useCallback((co: Company) => {
    if (co.id === selectedClient?.id) return; // no-op if same
    clearClientData();
    setSelectedClient(co);
  }, [selectedClient, clearClientData]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalReencauche = vidaStats.reencauche1 + vidaStats.reencauche2 + vidaStats.reencauche3;
  const pct = (n: number) => vidaStats.total > 0 ? ((n / vidaStats.total) * 100).toFixed(1) : "0.0";

  const vidaBars = [
    { label: "Nueva",        value: vidaStats.nueva,       grad: "linear-gradient(90deg, #348CCB, #7DC5F0)" },
    { label: "Reencauche 1", value: vidaStats.reencauche1, grad: "linear-gradient(90deg, #1E76B6, #348CCB)" },
    { label: "Reencauche 2", value: vidaStats.reencauche2, grad: "linear-gradient(90deg, #173D68, #1E76B6)" },
    { label: "Reencauche 3", value: vidaStats.reencauche3, grad: "linear-gradient(90deg, #0A183A, #173D68)" },
  ];

  const tireInfoMap = useMemo(() => {
  const map = new Map<string, { posicion: number; marca: string; diseno: string }>();
  allTires.forEach((t) => {
    map.set((t as unknown as NormTire).id, {
      posicion: (t as unknown as NormTire).posicion,
      marca:    (t as unknown as NormTire).marca,
      diseno:   (t as unknown as NormTire).diseno,
    });
  });
  return map;
}, [allTires]);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>

      <PageHeader
        userName={userName}
        selectedClient={selectedClient}
        companies={companies}
        onSelect={handleSelectClient}
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

        {/* ── No client selected ────────────────────────────────────────────── */}
        {loadingCompanies ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Cargando clientes…</span>
          </div>
        ) : !selectedClient ? (
          <NoClientSelected companies={companies} onSelect={handleSelectClient} />
        ) : (
          <>
            {/* ── Client context bar ──────────────────────────────────────── */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
                  style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
                >
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black text-[#0A183A]">{selectedClient.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {selectedClient.vehicleCount} vehículos · {selectedClient.tireCount} neumáticos
                  </p>
                </div>
              </div>
            </div>

            {/* ── KPI cards ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              loading={loadingCards}
              value={`${selectedClient.vehicleCount}`}
              sub={`${allTires.length} neumáticos`}
              label="Activos Flota"
              variant="primary"
            />

            <MetricCard
              loading={loadingCards}
              value={fmtCOP(savingPerMonth)}
              sub={`${savingPct.toFixed(1)}% mejora potencial`}
              label="Ahorro Mensual"
              variant="warn"
            />

            <MetricCard
              loading={loadingCards}
              value={fmtCOP(avgCpkProyectado)}
              sub={fmtCOP(avgCptProyectado)}
              label="CPK · CPT Proyectado"
              variant="secondary"
            />

            <MetricCard
              loading={loadingCards}
              value={fmtCOP(savingPerYear)}
              sub="Proyección anual"
              label="Ahorro Anual"
              variant="accent"
            />
          </div>

            {/* ── Row 1: Semáforo + Alerts ──────────────────────────────────── */}
            <PairRow>
              {loadingCards ? <SkeletonCard label="Cargando semáforo…" /> : (
                <ScrollCard><SemaforoTabla vehicles={allVehicles} tires={allTires} /></ScrollCard>
              )}
              <Card className="p-4 sm:p-5 flex flex-col">
  <CardTitle icon={Bell} title="Alertas Activas" />

  {notifications.length > 0 && (
  <div className="flex gap-2 flex-wrap mb-3">
    {(() => {
      const critical = notifications.filter((n) => n.type === "critical").length;
      const warning = notifications.filter((n) => n.type === "warning").length;

      return (
        <>
          {critical > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}
            >
              {critical} crítica{critical > 1 ? "s" : ""}
            </span>
          )}

          {warning > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}
            >
              {warning} advertencia{warning > 1 ? "s" : ""}
            </span>
          )}
        </>
      );
    })()}
  </div>
)}

  <div className="overflow-y-auto max-h-72 space-y-2 flex-1">
    {notifications.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
        <Bell className="w-8 h-8 opacity-30" />
        <p className="text-sm">Sin alertas activas</p>
      </div>
    ) : (
      // Group by vehicle
      (() => {
        const grouped = notifications.reduce((acc, n) => {
          const key = n.vehicle?.id ?? "__no_vehicle__";
          if (!acc[key]) acc[key] = { vehicle: n.vehicle, items: [] };
          acc[key].items.push(n);
          return acc;
        }, {} as Record<string, { vehicle: Notification["vehicle"]; items: Notification[] }>);

        return Object.entries(grouped).map(([key, group]) => {
          const hasCritical = group.items.some(n => n.type === "critical");
          const accentColor = hasCritical ? "#DC2626" : "#D97706";
          const accentBg    = hasCritical ? "rgba(220,38,38,0.04)" : "rgba(217,119,6,0.04)";

          return (
            <details key={key} className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${hasCritical ? "rgba(220,38,38,0.2)" : "rgba(217,119,6,0.2)"}` }}>

              {/* Vehicle header — always visible */}
              <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none select-none"
                style={{ background: accentBg }}>
                <Truck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentColor }} />
                <span className="text-xs font-bold text-[#0A183A] flex-1 truncate">
                  {group.vehicle?.placa?.toUpperCase() ?? "Sin vehículo asignado"}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${accentColor}20`, color: accentColor }}>
                  {group.items.length} llanta{group.items.length > 1 ? "s" : ""}
                </span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: accentColor }} />
              </summary>

              {/* Tire rows */}
              <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                {group.items.map(n => {
  const tireInfo = n.tireId ? tireInfoMap.get(n.tireId) : undefined;
  return (
    <div key={n.id} className="flex items-start gap-2 px-3 py-2 pl-8">
      {/* Position badge */}
      {tireInfo && (
        <div
          className="flex-shrink-0 w-6 h-6 p-2 rounded-full flex items-center justify-center text-[10px] font-black"
          style={{ background: "rgba(10,24,58,0.07)", color: "#0A183A" }}
        >
          Pos. {tireInfo.posicion}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-[#0A183A] truncate">{n.title}</p>
        {tireInfo && (
          <p className="text-[10px] text-[#1E76B6] font-medium">
            {tireInfo.marca} · {tireInfo.diseno}
          </p>
        )}
        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
      </div>
      <time className="text-[9px] text-gray-400 flex-shrink-0 whitespace-nowrap mt-0.5">
        {new Date(n.createdAt).toLocaleDateString("es-CO")}
      </time>
    </div>
  );
})}
              </div>
            </details>
          );
        });
      })()
    )}
  </div>
</Card>
            </PairRow>

            {/* ── Row 2: Vida distribution + PorMarca ──────────────────────── */}
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

            {/* ── Row 3: PorBanda + TablaCpk ───────────────────────────────── */}
            <PairRow>
              {loadingCards ? <SkeletonCard label="Cargando bandas…" /> :
                Object.keys(bandaData).length > 0 ? <PorBanda groupData={bandaData} /> : <SkeletonCard label="Sin datos de bandas" />}

              {loadingCards ? <SkeletonCard label="Cargando CPK…" /> : (
                <ScrollCard><TablaCpk tires={cpkTires} /></ScrollCard>
              )}
            </PairRow>

            {/* ── Row 4: TanqueMilimetro + ReencaucheHistorico ─────────────── */}
            <PairRow>
              {loadingCards ? <SkeletonCard label="Cargando datos…" /> : <TanqueMilimetro tires={tanqueTires} language="es" />}
              {loadingCards ? <SkeletonCard label="Cargando histórico…" /> : <ReencaucheHistorico tires={reencaucheTires} language="es" />}
            </PairRow>

            {/* ── Row 5: HistoricChart + DetallesLlantas ────────────────────── */}
            <PairRow>
              {loadingCards ? <SkeletonCard label="Cargando gráfico…" /> : <HistoricChart tires={historicTires} language="es" />}
              {loadingCards ? <SkeletonCard label="Cargando detalles…" /> : (
                <ScrollCard><DetallesLlantas tires={detailTires} vehicles={allVehicles} /></ScrollCard>
              )}
            </PairRow>
          </>
        )}
      </div>
    </div>
  );
}