"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Download, Filter, ChevronDown, Loader2,
  AlertCircle, X, Calendar, SlidersHorizontal,
} from "lucide-react";

import SemaforoPie         from "../cards/semaforoPie";
import PromedioEje         from "../cards/promedioEje";
import SemaforoTabla       from "../cards/semaforoTabla";
import PorVida             from "../cards/porVida";
import DetallesLlantas     from "../cards/detallesLlantas";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import Notificaciones      from "../cards/Notificaciones";

// =============================================================================
// Types
// =============================================================================

export type RawCosto = { valor: number; fecha: string | Date };
export type RawInspeccion = {
  id: string; tireId: string; fecha: string | Date;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk: number | null; cpkProyectado: number | null; cpt: number | null; cptProyectado: number | null;
  diasEnUso: number | null; mesesEnUso: number | null; kilometrosEstimados: number | null;
  kmActualVehiculo: number | null; kmEfectivos: number | null; kmProyectado: number | null; imageUrl: string | null;
};
export type RawEvento = {
  id: string; tireId: string; tipo: string; fecha: string | Date;
  notas: string | null; metadata: Record<string, unknown> | null;
};
export type RawTire = {
  id: string; companyId: string; vehicleId: string | null; placa: string;
  marca: string; diseno: string; dimension: string; eje: string; posicion: number;
  profundidadInicial: number; fechaInstalacion: string | Date | null; diasAcumulados: number;
  kilometrosRecorridos: number; currentCpk: number | null; currentCpt: number | null;
  currentProfundidad: number | null; cpkTrend: number | null; projectedKmRemaining: number | null;
  projectedDateEOL: string | Date | null; healthScore: number | null; alertLevel: string;
  lastInspeccionDate: string | Date | null; primeraVida: unknown[]; desechos: unknown | null;
  createdAt: string | Date; updatedAt: string | Date;
  costos: RawCosto[]; inspecciones: RawInspeccion[]; eventos: RawEvento[];
};
export type CostEntry   = { valor: number; fecha: string };
export type Inspection  = {
  cpk: number; cpkProyectado: number; cpt: number; cptProyectado: number;
  fecha: string; imageUrl: string;
  profundidadCen: number; profundidadExt: number; profundidadInt: number;
};
export type VidaEntry = { valor: string; fecha: string };
export type Tire = {
  id: string; marca: string; diseno: string; dimension: string;
  eje: string; posicion: number; vehicleId?: string | null;
  costo: CostEntry[]; inspecciones: Inspection[]; vida: VidaEntry[];
  [key: string]: unknown;
};
export type Vehicle = { id: string; placa: string; tireCount?: number; cliente?: string };

// =============================================================================
// Helpers
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

const FILTER_ALL = "Todos";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);

function toISOString(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function extractVida(eventos: RawEvento[]): VidaEntry[] {
  const VIDA = new Set(["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"]);
  return eventos
    .filter((e) => e.notas && VIDA.has(e.notas.toLowerCase()))
    .map((e) => ({ valor: e.notas!.toLowerCase(), fecha: toISOString(e.fecha) }));
}

function normaliseRawTire(raw: RawTire): Tire {
  const costo: CostEntry[] = [...raw.costos]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((c) => ({ valor: typeof c.valor === "number" ? c.valor : 0, fecha: toISOString(c.fecha) }));
  const inspecciones: Inspection[] = [...raw.inspecciones]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((i) => ({
      fecha: toISOString(i.fecha),
      profundidadInt: i.profundidadInt ?? 0, profundidadCen: i.profundidadCen ?? 0, profundidadExt: i.profundidadExt ?? 0,
      cpk: i.cpk ?? 0, cpkProyectado: i.cpkProyectado ?? 0, cpt: i.cpt ?? 0, cptProyectado: i.cptProyectado ?? 0,
      imageUrl: i.imageUrl ?? "",
    }));
  return { ...raw, costo, inspecciones, vida: extractVida(raw.eventos), _costos: raw.costos, _eventos: raw.eventos } as unknown as Tire;
}

function classifyCondition(tire: Tire): string {
  if (!tire.inspecciones?.length) return "sin_inspeccion";
  const last = tire.inspecciones[tire.inspecciones.length - 1];
  const min = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
  if (min > 7) return "optimo";
  if (min > 6) return "60_dias";
  if (min > 5) return "30_dias";
  return "urgente";
}

// =============================================================================
// MetricCard
// =============================================================================

function MetricCard({ value, label, loading, variant = "primary" }: {
  value: string; label: string; loading: boolean;
  variant?: "primary" | "secondary" | "accent";
}) {
  const bgs = {
    primary:   "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
    secondary: "linear-gradient(135deg, #173D68 0%, #1E76B6 100%)",
    accent:    "linear-gradient(135deg, #1E76B6 0%, #348CCB 100%)",
  };
  return (
    <div
      className="rounded-2xl p-5 flex flex-col justify-between"
      style={{ background: bgs[variant], boxShadow: "0 4px 20px rgba(10,24,58,0.18)", minHeight: 100 }}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando…</span>
        </div>
      ) : (
        <p className="text-2xl font-black text-white tracking-tight leading-none break-all">{value}</p>
      )}
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mt-2">{label}</p>
    </div>
  );
}

// =============================================================================
// FilterDropdown
// =============================================================================

function FilterDropdown({ id, label, options, selected, onChange, activeDropdown, setActiveDropdown, dropdownRef }: {
  id: string; label: string; options: string[]; selected: string;
  onChange: (v: string) => void; activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void; dropdownRef: React.RefObject<HTMLDivElement>;
}) {
  const isOpen     = activeDropdown === id;
  const isFiltered = selected && selected !== FILTER_ALL && selected !== "Todas";
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setActiveDropdown(isOpen ? null : id); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
        style={{
          background: isFiltered ? "rgba(30,118,182,0.1)" : "rgba(10,24,58,0.03)",
          border: isFiltered ? "1px solid rgba(30,118,182,0.4)" : "1px solid rgba(52,140,203,0.2)",
          color: isFiltered ? "#1E76B6" : "#0A183A",
          minHeight: 44,
        }}
      >
        <span className="truncate text-left flex-1 min-w-0">
          <span className="text-[#348CCB] mr-1">{label}:</span>
          <span className="truncate">{selected || FILTER_ALL}</span>
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: "#1E76B6" }}
        />
      </button>
      {isOpen && (
        <div
          className="absolute z-30 mt-1 w-full rounded-xl py-1 overflow-auto"
          style={{
            background: "white", border: "1px solid rgba(52,140,203,0.2)",
            boxShadow: "0 8px 24px rgba(10,24,58,0.12)", maxHeight: "min(208px, 40vh)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setActiveDropdown(null); }}
              className="block w-full text-left px-4 py-2.5 sm:py-2 text-sm transition-colors hover:bg-[#F0F7FF]"
              style={{ color: selected === opt ? "#1E76B6" : "#0A183A", fontWeight: selected === opt ? 700 : 400, minHeight: 40 }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function SemaforoPage() {
  const router = useRouter();

  const [tires,         setTires]         = useState<Tire[]>([]);
  const [vehicles,      setVehicles]      = useState<Vehicle[]>([]);
  const [filteredTires, setFilteredTires] = useState<Tire[]>([]);
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [userName,      setUserName]      = useState("");
  const [userPlan,      setUserPlan]      = useState("");
  const [filtersOpen,   setFiltersOpen]   = useState(false);

  const [gastoTotal,    setGastoTotal]    = useState(0);
  const [gastoMes,      setGastoMes]      = useState(0);
  const [cpkPromedio,   setCpkPromedio]   = useState(0);
  const [cpkProyectado, setCpkProyectado] = useState(0);

  const [marcasOptions,    setMarcasOptions]    = useState<string[]>([]);
  const [selectedMarca,    setSelectedMarca]    = useState(FILTER_ALL);
  const [ejeOptions,       setEjeOptions]       = useState<string[]>([]);
  const [selectedEje,      setSelectedEje]      = useState(FILTER_ALL);
  const [clienteOptions,   setClienteOptions]   = useState<string[]>([]);
  const [selectedCliente,  setSelectedCliente]  = useState(FILTER_ALL);
  const [semaforoOptions,  setSemaforoOptions]  = useState<string[]>([]);
  const [selectedSemaforo, setSelectedSemaforo] = useState(FILTER_ALL);
  const [bandaOptions,     setBandaOptions]     = useState<string[]>([]);
  const [selectedBanda,    setSelectedBanda]    = useState(FILTER_ALL);
  const [vidaOptions,      setVidaOptions]      = useState<string[]>([]);
  const [selectedVida,     setSelectedVida]     = useState(FILTER_ALL);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const dropdownRefs = useRef({
    marca:    useRef<HTMLDivElement>(null),
    eje:      useRef<HTMLDivElement>(null),
    semaforo: useRef<HTMLDivElement>(null),
    cliente:  useRef<HTMLDivElement>(null),
    banda:    useRef<HTMLDivElement>(null),
    vida:     useRef<HTMLDivElement>(null),
  }).current;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!activeDropdown) return;
      const ref = dropdownRefs[activeDropdown as keyof typeof dropdownRefs];
      if (ref?.current && !ref.current.contains(e.target as Node)) setActiveDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown, dropdownRefs]);

  const calculateTotals = useCallback((tyres: Tire[]) => {
    let total = 0, mes = 0;
    const now = new Date();
    tyres.forEach((tire) => {
      (tire.costo ?? []).forEach((entry) => {
        const v = typeof entry.valor === "number" ? entry.valor : 0;
        total += v;
        const d = new Date(entry.fecha);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) mes += v;
      });
    });
    setGastoTotal(total); setGastoMes(mes);
  }, []);

  const calculateCpkAverages = useCallback((tyres: Tire[]) => {
    let totalCpk = 0, totalCpkP = 0, cnt = 0;
    tyres.forEach((tire) => {
      if (!tire.inspecciones?.length) return;
      const last = tire.inspecciones[tire.inspecciones.length - 1];
      if (last.cpk && !isNaN(last.cpk))                     { totalCpk  += last.cpk;           cnt++; }
      if (last.cpkProyectado && !isNaN(last.cpkProyectado)) { totalCpkP += last.cpkProyectado;        }
    });
    setCpkPromedio(  cnt > 0 ? Number((totalCpk  / cnt).toFixed(2)) : 0);
    setCpkProyectado(cnt > 0 ? Number((totalCpkP / cnt).toFixed(2)) : 0);
  }, []);

  const fetchCompany = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/companies/${companyId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUserPlan(data.plan ?? "");
    } catch { setError("No se pudo cargar la configuración de la compañía"); }
  }, []);

  const fetchVehicles = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/vehicles?companyId=${companyId}`);
      if (!res.ok) throw new Error();
      const data: Vehicle[] = await res.json();
      setVehicles(data);
      const clientes = Array.from(new Set(data.map((v) => v.cliente ?? "").filter(Boolean)));
      setClienteOptions([FILTER_ALL, ...clientes]);
    } catch (err: unknown) {
      setError((p) => (p + " " + (err instanceof Error ? err.message : "")).trim());
    }
  }, []);

  const fetchTires = useCallback(async (companyId: string) => {
    setLoading(true); setError("");
    try {
      const res = await authFetch(`${API_BASE}/tires?companyId=${companyId}`);
      if (!res.ok) throw new Error(`Failed to fetch tires (${res.status})`);
      const raw: RawTire[] = await res.json();
      const normalised = raw.map(normaliseRawTire);
      const active = normalised.filter((t) => {
        if (!t.vida?.length) return true;
        return t.vida[t.vida.length - 1].valor.toLowerCase() !== "fin";
      });
      setTires(active); calculateTotals(active); calculateCpkAverages(active);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado al cargar llantas");
    } finally { setLoading(false); }
  }, [calculateTotals, calculateCpkAverages]);

  useEffect(() => {
    if (!tires.length) return;
    setMarcasOptions([FILTER_ALL, ...Array.from(new Set(tires.map((t) => t.marca ?? "Sin marca")))]);
    setEjeOptions([FILTER_ALL, ...Array.from(new Set(tires.map((t) => t.eje ?? "Sin eje")))]);
    setBandaOptions([FILTER_ALL, ...Array.from(new Set(tires.map((t) => (t.diseno as string) ?? "Sin banda")))]);
    setVidaOptions([FILTER_ALL, ...Array.from(new Set(tires.flatMap((t) => (t.vida ?? []).map((v) => {
      const s = v.valor?.trim() ?? "Sin vida"; return s.charAt(0).toUpperCase() + s.slice(1);
    }))))]);
    setSemaforoOptions([FILTER_ALL, "Óptimo", "60 Días", "30 Días", "Urgente", "Sin Inspección"]);
    setFilteredTires(tires);
  }, [tires]);

  const applyFilters = useCallback(() => {
    let result = [...tires];
    if (selectedMarca    !== FILTER_ALL && selectedMarca)    result = result.filter((t) => t.marca  === selectedMarca);
    if (selectedBanda    !== FILTER_ALL && selectedBanda)    result = result.filter((t) => t.diseno === selectedBanda);
    if (selectedEje      !== FILTER_ALL && selectedEje)      result = result.filter((t) => t.eje    === selectedEje);
    if (selectedVida     !== FILTER_ALL && selectedVida) {
      result = result.filter((t) => {
        if (!t.vida?.length) return false;
        return t.vida[t.vida.length - 1].valor.toLowerCase() === selectedVida.toLowerCase();
      });
    }
    if (selectedCliente  !== FILTER_ALL && selectedCliente) {
      const ids = vehicles.filter((v) => v.cliente === selectedCliente).map((v) => v.id);
      result = result.filter((t) => t.vehicleId && ids.includes(t.vehicleId as string));
    }
    if (selectedSemaforo !== FILTER_ALL && selectedSemaforo) {
      const map: Record<string, string> = {
        "Óptimo": "optimo", "60 Días": "60_dias", "30 Días": "30_dias",
        "Urgente": "urgente", "Sin Inspección": "sin_inspeccion",
      };
      result = result.filter((t) => classifyCondition(t) === map[selectedSemaforo]);
    }
    setFilteredTires(result); calculateCpkAverages(result); calculateTotals(result);
  }, [tires, vehicles, selectedMarca, selectedBanda, selectedEje, selectedVida, selectedCliente, selectedSemaforo, calculateCpkAverages, calculateTotals]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) { router.push("/login"); return; }
    let user: { companyId?: string; name?: string; email?: string };
    try { user = JSON.parse(storedUser); } catch { router.push("/login"); return; }
    if (!user.companyId) { setError("No company assigned to user"); return; }
    setUserName(user.name ?? user.email ?? "");
    fetchCompany(user.companyId); fetchVehicles(user.companyId); fetchTires(user.companyId);
  }, [router, fetchTires, fetchVehicles, fetchCompany]);

  const exportToPDF = () => {
    try {
      setExporting(true);
      const style = document.createElement("style");
      style.type  = "text/css";
      style.innerHTML = `@media print { body * { visibility: hidden } #ctp, #ctp * { visibility: visible } #ctp { position: absolute; left: 0; top: 0; width: 100% } }`;
      document.head.appendChild(style);
      if (contentRef.current) contentRef.current.id = "ctp";
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            document.head.removeChild(style);
            if (contentRef.current) contentRef.current.removeAttribute("id");
            setExporting(false);
          }, 500);
        }, 300);
      }, 500);
    } catch { setExporting(false); }
  };

  const clearFilters = () => {
    setSelectedMarca(FILTER_ALL); setSelectedEje(FILTER_ALL);
    setSelectedBanda(FILTER_ALL); setSelectedVida(FILTER_ALL);
    setSelectedCliente(FILTER_ALL); setSelectedSemaforo(FILTER_ALL);
  };

  const activeFiltersCount = [selectedMarca, selectedBanda, selectedEje, selectedVida, selectedCliente, selectedSemaforo]
    .filter((v) => v && v !== FILTER_ALL && v !== "Todas").length;

  const filterCols = userPlan === "retail"
    ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

  // =============================================================================
  // Render
  // =============================================================================
  return (
    /*
     * FIX A: `overflow-hidden` (not overflow-x-hidden) on the root.
     * Do NOT use w-full here — the sidebar parent already constrains width.
     * overflow-hidden ensures nothing bleeds out horizontally.
     */
    <div className="min-h-screen overflow-hidden" style={{ background: "#ffffff" }}>

      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none tracking-tight truncate">
              Mi Semáforo
            </h1>
            <p className="text-[10px] sm:text-xs text-[#348CCB] mt-0.5 flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              Actualizado: {new Date().toLocaleDateString("es-CO")}
              {userName && <span className="hidden sm:inline"> · Bienvenido, {userName}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex sm:hidden items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-bold transition-all relative"
            style={{
              background: filtersOpen || activeFiltersCount > 0 ? "rgba(30,118,182,0.12)" : "rgba(10,24,58,0.05)",
              border: "1px solid rgba(52,140,203,0.25)",
              color: "#1E76B6",
            }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white" style={{ background: "#1E76B6" }}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            {exporting
              ? <><Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /><span className="hidden sm:inline ml-1">Exportando…</span></>
              : <><Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline ml-1">Exportar</span></>}
          </button>
          <Notificaciones />
        </div>
      </div>

      {/*
       * FIX B: `flex flex-col gap-*` instead of `space-y-*`.
       * space-y uses a `>*+*` margin selector — it does NOT set min-width:0
       * on children, so block-level children (including grid items that
       * contain DetallesLlantas) can still expand to their intrinsic width.
       * flex children DO get min-width:0 by default, which breaks the cycle.
       */}
      <div
        className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4 sm:gap-5 lg:gap-6"
        ref={contentRef}
      >

        {/* Error banner */}
        {error && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(10,24,58,0.06)", border: "1px solid rgba(10,24,58,0.2)" }}
          >
            <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-[#0A183A]">{error}</span>
            <button onClick={() => setError("")} className="text-[#348CCB] hover:text-[#0A183A] flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard loading={loading} value={`${(gastoMes / 1_000_000).toFixed(1)}M COP`}   label="Inversión del Mes"  variant="primary"   />
          <MetricCard loading={loading} value={`${(gastoTotal / 1_000_000).toFixed(1)}M COP`} label="Inversión Total"    variant="secondary" />
          <MetricCard loading={loading} value={fmtCOP(cpkPromedio)}                            label="CPK Promedio"       variant="accent"    />
          <MetricCard loading={loading} value={fmtCOP(cpkProyectado)}                          label="CPK Proyectado"     variant="secondary" />
        </div>

        {/* Filter panel */}
        <div
          className={`rounded-2xl print:hidden ${filtersOpen ? "block" : "hidden sm:block"}`}
          style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
              <p className="text-sm font-bold text-[#0A183A]">Filtros</p>
              {activeFiltersCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(30,118,182,0.12)", color: "#1E76B6" }}>
                  {activeFiltersCount} activo{activeFiltersCount > 1 ? "s" : ""}
                </span>
              )}
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="ml-auto text-xs font-semibold text-[#1E76B6] hover:opacity-70 transition-opacity whitespace-nowrap">
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className={`grid ${filterCols} gap-2 sm:gap-2.5`}>
              {userPlan === "retail" && (
                <FilterDropdown id="cliente" label="Dueño"  options={clienteOptions}  selected={selectedCliente}  onChange={setSelectedCliente}  activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.cliente}  />
              )}
              <FilterDropdown id="marca"    label="Marca"   options={marcasOptions}   selected={selectedMarca}    onChange={setSelectedMarca}    activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.marca}    />
              <FilterDropdown id="eje"      label="Eje"     options={ejeOptions}      selected={selectedEje}      onChange={setSelectedEje}      activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.eje}      />
              <FilterDropdown id="semaforo" label="Estado"  options={semaforoOptions} selected={selectedSemaforo} onChange={setSelectedSemaforo} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.semaforo} />
              <FilterDropdown id="vida"     label="Vida"    options={vidaOptions}     selected={selectedVida}     onChange={setSelectedVida}     activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.vida}     />
              <FilterDropdown id="banda"    label="Banda"   options={bandaOptions}    selected={selectedBanda}    onChange={setSelectedBanda}    activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.banda}    />
            </div>
          </div>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <SemaforoTabla vehicles={vehicles} tires={filteredTires} />
          <PromedioEje tires={filteredTires} onSelectEje={(eje) => setSelectedEje(eje || FILTER_ALL)} selectedEje={selectedEje} language="es" />
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-3">
          <PorVida             tires={filteredTires} />
          <SemaforoPie         tires={filteredTires} language="es" />
        </div>

        {/*
         * FIX C: min-w-0 on this wrapper.
         * As a flex child (parent is now flex-col), it would default to
         * min-width:auto without this — which lets it grow to fit the table.
         * min-w-0 forces it to respect the flex container's width.
         */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <ReencaucheHistorico tires={filteredTires} language="es" />
          <DetallesLlantas tires={filteredTires} vehicles={vehicles} />
        </div>
        <div className="min-w-0">
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Cargando neumáticos…</span>
          </div>
        )}
      </div>
    </div>
  );
}