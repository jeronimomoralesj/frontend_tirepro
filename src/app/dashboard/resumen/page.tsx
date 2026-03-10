"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Download,
  Filter,
  ChevronDown,
  BarChart3,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import SemaforoPie        from "../cards/semaforoPie";
import PromedioEje        from "../cards/promedioEje";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import TanqueMilimetro    from "../cards/tanqueMilimetro";
import HistoricChart      from "../cards/historicChart";
import Notificaciones     from "../cards/Notificaciones";

// =============================================================================
// Types — aligned with TireService response shape (normalized relations)
// =============================================================================

/** Raw shape returned by GET /tires?companyId=xxx  (Prisma include) */
export type RawCosto = { valor: number; fecha: string | Date };

export type RawInspeccion = {
  id: string;
  tireId: string;
  fecha: string | Date;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk: number | null;
  cpkProyectado: number | null;
  cpt: number | null;
  cptProyectado: number | null;
  diasEnUso: number | null;
  mesesEnUso: number | null;
  kilometrosEstimados: number | null;
  kmActualVehiculo: number | null;
  kmEfectivos: number | null;
  kmProyectado: number | null;
  imageUrl: string | null;
};

export type RawEvento = {
  id: string;
  tireId: string;
  tipo: string;
  fecha: string | Date;
  notas: string | null;
  metadata: Record<string, unknown> | null;
};

/** Raw tire as Prisma returns it (relation names: costos, inspecciones, eventos) */
export type RawTire = {
  id: string;
  companyId: string;
  vehicleId: string | null;
  placa: string;
  marca: string;
  diseno: string;
  dimension: string;
  eje: string;
  posicion: number;
  profundidadInicial: number;
  fechaInstalacion: string | Date | null;
  diasAcumulados: number;
  kilometrosRecorridos: number;
  currentCpk: number | null;
  currentCpt: number | null;
  currentProfundidad: number | null;
  cpkTrend: number | null;
  projectedKmRemaining: number | null;
  projectedDateEOL: string | Date | null;
  healthScore: number | null;
  alertLevel: string;
  lastInspeccionDate: string | Date | null;
  primeraVida: unknown[];
  desechos: unknown | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  // Normalized relations (actual field names from Prisma include)
  costos: RawCosto[];
  inspecciones: RawInspeccion[];
  eventos: RawEvento[];
};

/** Normalised shape consumed by chart/filter components */
export type CostEntry   = { valor: number; fecha: string };
export type Inspection  = {
  cpk: number;
  cpkProyectado: number;
  cpt: number;
  cptProyectado: number;
  fecha: string;
  imageUrl: string;
  profundidadCen: number;
  profundidadExt: number;
  profundidadInt: number;
};
export type VidaEntry = { valor: string; fecha: string };

export type Tire = {
  id: string;
  marca: string;
  diseno: string;
  dimension: string;
  eje: string;
  posicion: number;
  vehicleId?: string | null;
  // Normalised child arrays (names the chart components expect)
  costo: CostEntry[];
  inspecciones: Inspection[];
  vida: VidaEntry[];
  [key: string]: unknown;
};

export type Vehicle = { id: string; placa: string; cliente?: string };

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

/**
 * Attach the JWT to every API request.
 * AuthProvider stores the token as a flat string: localStorage.setItem("token", data.access_token)
 */
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

const FILTER_LABELS = {
  all:           "Todos",
  optimal:       "Óptimo",
  days60:        "60 Días",
  days30:        "30 Días",
  urgent:        "Urgente",
  noInspection:  "Sin Inspección",
};

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);

// =============================================================================
// Data normalisation — converts raw API shape → component-friendly Tire shape
// =============================================================================

function toISOString(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

/**
 * Extract "vida" lifecycle entries from TireEvento records.
 *
 * The service stores vida states (nueva, reencauche1…fin) as TireEvento rows
 * where:
 *   - tipo  = 'montaje'  (TireEventType.montaje)
 *   - notas = the vida value string  ('nueva', 'reencauche1', etc.)
 *   - metadata.vidaValor = same value (belt-and-suspenders)
 *
 * We surface these as { valor, fecha } pairs so existing chart components
 * that read tire.vida[] keep working without modification.
 */
function extractVida(eventos: RawEvento[]): VidaEntry[] {
  const VIDA_VALUES = new Set(['nueva', 'reencauche1', 'reencauche2', 'reencauche3', 'fin']);
  return eventos
    .filter(e => e.notas && VIDA_VALUES.has(e.notas.toLowerCase()))
    .map(e => ({
      valor: e.notas!.toLowerCase(),
      fecha: toISOString(e.fecha),
    }));
}

/**
 * Normalise a single raw tire from the API into the shape the
 * frontend components consume.
 *
 * Key mappings:
 *   costos       → costo       (field rename)
 *   inspecciones → inspecciones (same name, but: ordered asc + nulls resolved)
 *   eventos      → vida         (filtered & mapped)
 */
function normaliseRawTire(raw: RawTire): Tire {
  // costos → costo (sorted asc for time-series charts)
  const costo: CostEntry[] = [...raw.costos]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map(c => ({
      valor: typeof c.valor === "number" ? c.valor : 0,
      fecha: toISOString(c.fecha),
    }));

  // inspecciones: service returns desc (for performance), charts need asc
  const inspecciones: Inspection[] = [...raw.inspecciones]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map(i => ({
      fecha:          toISOString(i.fecha),
      profundidadInt: i.profundidadInt  ?? 0,
      profundidadCen: i.profundidadCen  ?? 0,
      profundidadExt: i.profundidadExt  ?? 0,
      cpk:            i.cpk             ?? 0,
      cpkProyectado:  i.cpkProyectado   ?? 0,
      cpt:            i.cpt             ?? 0,
      cptProyectado:  i.cptProyectado   ?? 0,
      imageUrl:       i.imageUrl        ?? "",
    }));

  // eventos → vida (lifecycle state history)
  const vida = extractVida(raw.eventos);

  return {
    // Spread all scalar fields so downstream components can still access
    // marca, diseno, eje, posicion, alertLevel, healthScore, etc.
    ...raw,
    // Override with normalised children (remove Prisma relation names)
    costo,
    inspecciones,
    vida,
    // Keep the original relations available under namespaced keys
    // in case any component needs them, without polluting the main names.
    _costos:   raw.costos,
    _eventos:  raw.eventos,
  } as unknown as Tire;
}

// =============================================================================
// Traffic-light classification (same logic, now reads from normalised shape)
// =============================================================================

function classifyCondition(tire: Tire): string {
  if (!tire.inspecciones?.length) return "sin_inspeccion";
  const last = tire.inspecciones[tire.inspecciones.length - 1];
  const min  = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
  if (min > 7) return "optimo";
  if (min > 6) return "60_dias";
  if (min > 5) return "30_dias";
  return "urgente";
}

// =============================================================================
// Design primitives
// =============================================================================

function MetricCard({
  value,
  label,
  loading,
  variant = "primary",
}: {
  value: string;
  label: string;
  loading: boolean;
  variant?: "primary" | "secondary" | "accent" | "dark";
}) {
  const bgs = {
    primary:   "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
    secondary: "linear-gradient(135deg, #173D68 0%, #1E76B6 100%)",
    accent:    "linear-gradient(135deg, #1E76B6 0%, #348CCB 100%)",
    dark:      "linear-gradient(135deg, #0A183A 0%, #0A183A 100%)",
  };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col justify-between"
      style={{
        background: bgs[variant],
        boxShadow: "0 4px 20px rgba(10,24,58,0.18)",
        minHeight: 100,
      }}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando…</span>
        </div>
      ) : (
        <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
      )}
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mt-2">{label}</p>
    </div>
  );
}

// =============================================================================
// Filter dropdown
// =============================================================================

function FilterDropdown({
  id,
  label,
  options,
  selected,
  onChange,
  activeDropdown,
  setActiveDropdown,
  dropdownRef,
}: {
  id: string;
  label: string;
  options: string[];
  selected: string;
  onChange: (v: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}) {
  const isOpen     = activeDropdown === id;
  const isFiltered = selected && selected !== FILTER_LABELS.all && selected !== "Todas" && selected !== "Todos";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setActiveDropdown(isOpen ? null : id); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
        style={{
          background: isFiltered ? "rgba(30,118,182,0.1)" : "rgba(10,24,58,0.03)",
          border: isFiltered ? "1px solid rgba(30,118,182,0.4)" : "1px solid rgba(52,140,203,0.2)",
          color: isFiltered ? "#1E76B6" : "#0A183A",
        }}
      >
        <span className="truncate">
          <span className="text-[#348CCB] mr-1">{label}:</span>
          {selected || FILTER_LABELS.all}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: "#1E76B6" }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute z-30 mt-1 w-full rounded-xl py-1 overflow-auto max-h-52"
          style={{
            background: "white",
            border: "1px solid rgba(52,140,203,0.2)",
            boxShadow: "0 8px 24px rgba(10,24,58,0.12)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setActiveDropdown(null); }}
              className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[#F0F7FF]"
              style={{ color: selected === opt ? "#1E76B6" : "#0A183A", fontWeight: selected === opt ? 700 : 400 }}
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

export default function ResumenPage() {
  const router = useRouter();

  const [tires,         setTires]         = useState<Tire[]>([]);
  const [vehicles,      setVehicles]      = useState<Vehicle[]>([]);
  const [filteredTires, setFilteredTires] = useState<Tire[]>([]);
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [userName,      setUserName]      = useState("");
  const [userPlan,      setUserPlan]      = useState("");

  // Metrics
  const [gastoTotal,       setGastoTotal]       = useState(0);
  const [gastoMes,         setGastoMes]         = useState(0);
  const [cpkPromedio,      setCpkPromedio]      = useState(0);
  const [cpkProyectado,    setCpkProyectado]    = useState(0);
  const [cptPromedio,      setCptPromedio]      = useState(0);
  const [cptProyectadoVal, setCptProyectadoVal] = useState(0);

  // Filters
  const [marcasOptions,    setMarcasOptions]    = useState<string[]>([]);
  const [selectedMarca,    setSelectedMarca]    = useState(FILTER_LABELS.all);
  const [ejeOptions,       setEjeOptions]       = useState<string[]>([]);
  const [selectedEje,      setSelectedEje]      = useState(FILTER_LABELS.all);
  const [clienteOptions,   setClienteOptions]   = useState<string[]>([]);
  const [selectedCliente,  setSelectedCliente]  = useState(FILTER_LABELS.all);
  const [semaforoOptions,  setSemaforoOptions]  = useState<string[]>([]);
  const [selectedSemaforo, setSelectedSemaforo] = useState(FILTER_LABELS.all);
  const [bandaOptions,     setBandaOptions]     = useState<string[]>([]);
  const [selectedBanda,    setSelectedBanda]    = useState(FILTER_LABELS.all);
  const [vidaOptions,      setVidaOptions]      = useState<string[]>([]);
  const [selectedVida,     setSelectedVida]     = useState(FILTER_LABELS.all);

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

  // ===========================================================================
  // Click outside
  // ===========================================================================

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!activeDropdown) return;
      const ref = dropdownRefs[activeDropdown as keyof typeof dropdownRefs];
      if (ref?.current && !ref.current.contains(e.target as Node)) setActiveDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown, dropdownRefs]);

  // ===========================================================================
  // Calculations — operate on normalised Tire[] (costo / inspecciones arrays)
  // ===========================================================================

  const calculateTotals = useCallback((tyres: Tire[]) => {
    let total = 0, mes = 0;
    const now = new Date();
    tyres.forEach((tire) => {
      // `tire.costo` is the normalised CostEntry[] array
      (tire.costo ?? []).forEach((entry) => {
        const v = typeof entry.valor === "number" ? entry.valor : 0;
        total += v;
        const d = new Date(entry.fecha);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) mes += v;
      });
    });
    setGastoTotal(total);
    setGastoMes(mes);
  }, []);

  const calculateCpkAverages = useCallback((tyres: Tire[]) => {
    let totalCpk = 0, totalCpkP = 0, totalCpt = 0, totalCptP = 0;
    let cntCpk = 0, cntCpt = 0;

    tyres.forEach((tire) => {
      if (!tire.inspecciones?.length) return;
      // inspecciones are sorted asc — last item is the most recent
      const last = tire.inspecciones[tire.inspecciones.length - 1];

      if (last.cpk && !isNaN(last.cpk))                       { totalCpk  += last.cpk;           cntCpk++; }
      if (last.cpkProyectado && !isNaN(last.cpkProyectado))   { totalCpkP += last.cpkProyectado;          }
      if (last.cpt && !isNaN(last.cpt))                       { totalCpt  += last.cpt;           cntCpt++; }
      if (last.cptProyectado && !isNaN(last.cptProyectado))   { totalCptP += last.cptProyectado;          }
    });

    setCpkPromedio(     cntCpk > 0 ? Number((totalCpk  / cntCpk).toFixed(2)) : 0);
    setCpkProyectado(   cntCpk > 0 ? Number((totalCpkP / cntCpk).toFixed(2)) : 0);
    setCptPromedio(     cntCpt > 0 ? Number((totalCpt  / cntCpt).toFixed(2)) : 0);
    setCptProyectadoVal(cntCpt > 0 ? Number((totalCptP / cntCpt).toFixed(2)) : 0);
  }, []);

  // ===========================================================================
  // Fetch
  // ===========================================================================

  const fetchCompany = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/companies/${companyId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUserPlan(data.plan ?? "");
    } catch {
      setError("No se pudo cargar la configuración de la compañía");
    }
  }, []);

  const fetchVehicles = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/vehicles?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data: Vehicle[] = await res.json();
      setVehicles(data);
      const clientes = Array.from(new Set(data.map((v) => v.cliente ?? "").filter(Boolean)));
      setClienteOptions([FILTER_LABELS.all, ...clientes]);
    } catch (err: unknown) {
      setError((p) => (p + " " + (err instanceof Error ? err.message : "")).trim());
    }
  }, []);

  const fetchTires = useCallback(async (companyId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/tires?companyId=${companyId}`);
      if (!res.ok) throw new Error(`Failed to fetch tires (${res.status})`);

      const raw: RawTire[] = await res.json();

      // Normalise every tire: costos→costo, eventos→vida, inspecciones asc
      const normalised: Tire[] = raw.map(normaliseRawTire);

      // Active tires only: exclude those whose last vida value is 'fin'
      const active = normalised.filter((t) => {
        if (!t.vida?.length) return true;
        return t.vida[t.vida.length - 1].valor.toLowerCase() !== "fin";
      });

      setTires(active);
      calculateTotals(active);
      calculateCpkAverages(active);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado al cargar llantas");
    } finally {
      setLoading(false);
    }
  }, [calculateTotals, calculateCpkAverages]);

  // ===========================================================================
  // Build filter options from normalised tires
  // ===========================================================================

  useEffect(() => {
    if (!tires.length) return;

    setMarcasOptions([
      FILTER_LABELS.all,
      ...Array.from(new Set(tires.map((t) => t.marca ?? "Sin marca"))),
    ]);
    setEjeOptions([
      FILTER_LABELS.all,
      ...Array.from(new Set(tires.map((t) => t.eje ?? "Sin eje"))),
    ]);
    setBandaOptions([
      FILTER_LABELS.all,
      ...Array.from(new Set(tires.map((t) => (t.diseno as string) ?? "Sin banda"))),
    ]);
    setVidaOptions([
      FILTER_LABELS.all,
      ...Array.from(new Set(
        tires.flatMap((t) =>
          (t.vida ?? []).map((v) => {
            const s = v.valor?.trim() ?? "Sin vida";
            return s.charAt(0).toUpperCase() + s.slice(1);
          }),
        ),
      )),
    ]);
    setSemaforoOptions([
      FILTER_LABELS.all,
      FILTER_LABELS.optimal,
      FILTER_LABELS.days60,
      FILTER_LABELS.days30,
      FILTER_LABELS.urgent,
      FILTER_LABELS.noInspection,
    ]);

    setFilteredTires(tires);
  }, [tires]);

  // ===========================================================================
  // Apply filters
  // ===========================================================================

  const applyFilters = useCallback(() => {
    let result = [...tires];

    if (selectedMarca   !== FILTER_LABELS.all && selectedMarca)
      result = result.filter((t) => t.marca === selectedMarca);

    if (selectedBanda   !== FILTER_LABELS.all && selectedBanda)
      result = result.filter((t) => t.diseno === selectedBanda);

    if (selectedEje     !== FILTER_LABELS.all && selectedEje)
      result = result.filter((t) => t.eje === selectedEje);

    if (selectedVida    !== FILTER_LABELS.all && selectedVida) {
      result = result.filter((t) => {
        if (!t.vida?.length) return false;
        const last = t.vida[t.vida.length - 1].valor ?? "";
        return last.toLowerCase() === selectedVida.toLowerCase();
      });
    }

    if (selectedCliente !== FILTER_LABELS.all && selectedCliente) {
      const ids = vehicles
        .filter((v) => v.cliente === selectedCliente)
        .map((v) => v.id);
      result = result.filter((t) => t.vehicleId && ids.includes(t.vehicleId as string));
    }

    if (selectedSemaforo !== FILTER_LABELS.all && selectedSemaforo) {
      const map: Record<string, string> = {
        [FILTER_LABELS.optimal]:      "optimo",
        [FILTER_LABELS.days60]:       "60_dias",
        [FILTER_LABELS.days30]:       "30_dias",
        [FILTER_LABELS.urgent]:       "urgente",
        [FILTER_LABELS.noInspection]: "sin_inspeccion",
      };
      result = result.filter((t) => classifyCondition(t) === map[selectedSemaforo]);
    }

    setFilteredTires(result);
    calculateCpkAverages(result);
  }, [
    tires, vehicles,
    selectedMarca, selectedBanda, selectedEje,
    selectedVida, selectedCliente, selectedSemaforo,
    calculateCpkAverages,
  ]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  // ===========================================================================
  // Auth
  // ===========================================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) { router.push("/login"); return; }

    let user: { companyId?: string; name?: string; email?: string };
    try { user = JSON.parse(storedUser); }
    catch { router.push("/login"); return; }

    if (!user.companyId) { setError("No company assigned to user"); return; }
    setUserName(user.name ?? user.email ?? "");
    fetchCompany(user.companyId);
    fetchVehicles(user.companyId);
    fetchTires(user.companyId);
  }, [router, fetchTires, fetchVehicles, fetchCompany]);

  // ===========================================================================
  // Export
  // ===========================================================================

  const exportToPDF = () => {
    try {
      setExporting(true);
      const style     = document.createElement("style");
      style.type      = "text/css";
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
    } catch {
      setExporting(false);
    }
  };

  // ===========================================================================
  // Derived
  // ===========================================================================

  const activeFiltersCount = [
    selectedMarca, selectedBanda, selectedEje,
    selectedVida, selectedCliente, selectedSemaforo,
  ].filter((v) => v && v !== FILTER_LABELS.all && v !== "Todas" && v !== "Todos").length;

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>

      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between gap-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
              Mi Resumen
            </h1>
            <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Actualizado: {new Date().toLocaleDateString("es-CO")}
              {userName && <> · Bienvenido, {userName}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Exportando…</>
              : <><Download className="w-4 h-4" /> Exportar</>}
          </button>
          <Notificaciones />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" ref={contentRef}>

        {/* Error banner */}
        {error && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              background: "rgba(10,24,58,0.06)",
              border: "1px solid rgba(10,24,58,0.2)",
            }}
          >
            <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-[#0A183A]">{error}</span>
            <button onClick={() => setError("")} className="text-[#348CCB] hover:text-[#0A183A]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            loading={loading}
            value={`${(gastoMes / 1_000_000).toFixed(1)}M COP`}
            label="Inversión del Mes"
            variant="primary"
          />
          <MetricCard
            loading={loading}
            value={`${(gastoTotal / 1_000_000).toFixed(1)}M COP`}
            label="Inversión Total"
            variant="secondary"
          />
          <MetricCard
            loading={loading}
            value={`${fmtCOP(cpkPromedio)} / ${fmtCOP(cptPromedio)}`}
            label="CPK / CPT Promedio"
            variant="accent"
          />
          <MetricCard
            loading={loading}
            value={`${fmtCOP(cpkProyectado)} / ${fmtCOP(cptProyectadoVal)}`}
            label="CPK / CPT Proyectado"
            variant="secondary"
          />
        </div>

        {/* Filter panel */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "white",
            border: "1px solid rgba(52,140,203,0.18)",
            boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-[#1E76B6]" />
            <p className="text-sm font-bold text-[#0A183A]">Filtros</p>
            {activeFiltersCount > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(30,118,182,0.12)", color: "#1E76B6" }}
              >
                {activeFiltersCount} activo{activeFiltersCount > 1 ? "s" : ""}
              </span>
            )}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setSelectedMarca(FILTER_LABELS.all);
                  setSelectedEje(FILTER_LABELS.all);
                  setSelectedBanda(FILTER_LABELS.all);
                  setSelectedVida(FILTER_LABELS.all);
                  setSelectedCliente(FILTER_LABELS.all);
                  setSelectedSemaforo(FILTER_LABELS.all);
                }}
                className="ml-auto text-xs font-semibold text-[#1E76B6] hover:opacity-70 transition-opacity"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className={`grid grid-cols-2 ${userPlan === "retail" ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
            {userPlan === "retail" && (
              <FilterDropdown
                id="cliente" label="Dueño"
                options={clienteOptions}  selected={selectedCliente}
                onChange={setSelectedCliente}
                activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}
                dropdownRef={dropdownRefs.cliente}
              />
            )}
            <FilterDropdown
              id="marca" label="Marca"
              options={marcasOptions}   selected={selectedMarca}
              onChange={setSelectedMarca}
              activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}
              dropdownRef={dropdownRefs.marca}
            />
            <FilterDropdown
              id="eje" label="Eje"
              options={ejeOptions}      selected={selectedEje}
              onChange={setSelectedEje}
              activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}
              dropdownRef={dropdownRefs.eje}
            />
            <FilterDropdown
              id="semaforo" label="Estado"
              options={semaforoOptions} selected={selectedSemaforo}
              onChange={setSelectedSemaforo}
              activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}
              dropdownRef={dropdownRefs.semaforo}
            />
            <FilterDropdown
              id="vida" label="Vida"
              options={vidaOptions}     selected={selectedVida}
              onChange={setSelectedVida}
              activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}
              dropdownRef={dropdownRefs.vida}
            />
            <FilterDropdown
              id="banda" label="Banda"
              options={bandaOptions}    selected={selectedBanda}
              onChange={setSelectedBanda}
              activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown}
              dropdownRef={dropdownRefs.banda}
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <HistoricChart    tires={filteredTires} language="es" />
          <PromedioEje
            tires={filteredTires}
            onSelectEje={(e) => setSelectedEje(e ?? FILTER_LABELS.all)}
            selectedEje={selectedEje}
            language="es"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <SemaforoPie         tires={filteredTires} language="es" />
          <ReencaucheHistorico tires={filteredTires} language="es" />
        </div>

        <TanqueMilimetro tires={filteredTires} language="es" />

        {/* Loading */}
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