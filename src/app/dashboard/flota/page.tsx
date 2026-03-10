"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Download,
  Filter,
  ChevronDown,
  Layers,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import PorMarca    from "../cards/porMarca";
import PorVida     from "../cards/porVida";
import PromedioEje from "../cards/promedioEje";
import TablaCpk    from "../cards/tablaCpk";
import PorBanda    from "../cards/porBanda";
import Notificaciones from "../cards/Notificaciones";

// =============================================================================
// Types — identical normalisation layer as resumen-page
// =============================================================================

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
  alertLevel: string;
  healthScore: number | null;
  costos: RawCosto[];
  inspecciones: RawInspeccion[];
  eventos: RawEvento[];
  [key: string]: unknown;
};

export type CostEntry  = { valor: number; fecha: string };
export type Inspection = {
  cpk: number; cpkProyectado: number; cpt: number; cptProyectado: number;
  fecha: string; imageUrl: string;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
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
  costo: CostEntry[];
  inspecciones: Inspection[];
  vida: VidaEntry[];
  [key: string]: unknown;
};

export type Vehicle = { id: string; placa: string; cliente?: string };

// =============================================================================
// Shared helpers (same as resumen-page)
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

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

function toISOString(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function extractVida(eventos: RawEvento[]): VidaEntry[] {
  const VIDA_VALUES = new Set(["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"]);
  return eventos
    .filter((e) => e.notas && VIDA_VALUES.has(e.notas.toLowerCase()))
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
      profundidadInt: i.profundidadInt ?? 0,
      profundidadCen: i.profundidadCen ?? 0,
      profundidadExt: i.profundidadExt ?? 0,
      cpk:           i.cpk            ?? 0,
      cpkProyectado: i.cpkProyectado  ?? 0,
      cpt:           i.cpt            ?? 0,
      cptProyectado: i.cptProyectado  ?? 0,
      imageUrl:      i.imageUrl       ?? "",
    }));

  const vida = extractVida(raw.eventos);

  return { ...raw, costo, inspecciones, vida } as unknown as Tire;
}

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
// Filter labels
// =============================================================================

const FL = {
  all:          "Todos",
  allBrands:    "Todas",
  allAxles:     "Todos",
  allOwners:    "Todos",
  optimal:      "Óptimo",
  days60:       "60 Días",
  days30:       "30 Días",
  urgent:       "Urgente",
  noInspection: "Sin Inspección",
};

// =============================================================================
// Design primitives (identical to resumen-page)
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
      style={{ background: bgs[variant], boxShadow: "0 4px 20px rgba(10,24,58,0.18)", minHeight: 100 }}
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

function FilterDropdown({
  id, label, options, selected, onChange, activeDropdown, setActiveDropdown, dropdownRef,
}: {
  id: string; label: string; options: string[]; selected: string;
  onChange: (v: string) => void; activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}) {
  const isOpen     = activeDropdown === id;
  const isFiltered = selected && selected !== FL.all && selected !== FL.allBrands && selected !== FL.allAxles && selected !== FL.allOwners;

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
          {selected || FL.all}
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

export default function FlotaPage() {
  const router = useRouter();

  const [tires,            setTires]           = useState<Tire[]>([]);
  const [vehicles,         setVehicles]         = useState<Vehicle[]>([]);
  const [filteredTires,    setFilteredTires]    = useState<Tire[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [error,            setError]            = useState("");
  const [loading,          setLoading]          = useState(false);
  const [exporting,        setExporting]        = useState(false);
  const [userPlan,         setUserPlan]         = useState("");

  // Metrics
  const [cpkPromedio,   setCpkPromedio]   = useState(0);
  const [cpkProyectado, setCpkProyectado] = useState(0);

  // Filters
  const [marcasOptions,    setMarcasOptions]    = useState<string[]>([]);
  const [selectedMarca,    setSelectedMarca]    = useState(FL.allBrands);
  const [ejeOptions,       setEjeOptions]       = useState<string[]>([]);
  const [selectedEje,      setSelectedEje]      = useState(FL.allAxles);
  const [clienteOptions,   setClienteOptions]   = useState<string[]>([]);
  const [selectedCliente,  setSelectedCliente]  = useState(FL.allOwners);
  const [semaforoOptions,  setSemaforoOptions]  = useState<string[]>([]);
  const [selectedSemaforo, setSelectedSemaforo] = useState(FL.all);
  const [bandaOptions,     setBandaOptions]      = useState<string[]>([]);
  const [selectedBanda,    setSelectedBanda]     = useState(FL.all);
  const [vidaOptions,      setVidaOptions]       = useState<string[]>([]);
  const [selectedVida,     setSelectedVida]      = useState(FL.all);

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
  // Calculations
  // ===========================================================================

  const calculateCpkAverages = useCallback((tyres: Tire[]) => {
    let totalCpk = 0, totalCpkP = 0, cnt = 0;
    tyres.forEach((t) => {
      if (!t.inspecciones?.length) return;
      const last = t.inspecciones[t.inspecciones.length - 1];
      if (last.cpk && !isNaN(last.cpk)) { totalCpk += last.cpk; cnt++; }
      if (last.cpkProyectado && !isNaN(last.cpkProyectado)) totalCpkP += last.cpkProyectado;
    });
    setCpkPromedio(   cnt > 0 ? Number((totalCpk  / cnt).toFixed(2)) : 0);
    setCpkProyectado( cnt > 0 ? Number((totalCpkP / cnt).toFixed(2)) : 0);
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
    } catch { setError("No se pudo cargar la configuración de la compañía"); }
  }, []);

  const fetchVehicles = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/vehicles?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data: Vehicle[] = await res.json();
      setVehicles(data);
      const clientes = Array.from(new Set(data.map((v) => v.cliente ?? "").filter(Boolean)));
      setClienteOptions([FL.allOwners, ...clientes]);
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
      const normalised      = raw.map(normaliseRawTire);

      // Exclude retired tires (last vida = "fin")
      const active = normalised.filter((t) => {
        if (!t.vida?.length) return true;
        return t.vida[t.vida.length - 1].valor !== "fin";
      });

      setTires(active);
      calculateCpkAverages(active);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado al cargar llantas");
    } finally {
      setLoading(false);
    }
  }, [calculateCpkAverages]);

  // ===========================================================================
  // Build filter options from normalised tires
  // ===========================================================================

  useEffect(() => {
    if (!tires.length) return;

    setMarcasOptions([FL.allBrands, ...Array.from(new Set(tires.map((t) => t.marca || "Sin marca")))]);
    setEjeOptions([FL.allAxles,     ...Array.from(new Set(tires.map((t) => t.eje   || "Sin eje")))]);
    setBandaOptions([FL.all,        ...Array.from(new Set(tires.map((t) => t.diseno || "Sin banda")))]);
    setVidaOptions([FL.all, ...Array.from(new Set(
      tires.flatMap((t) => (t.vida ?? []).map((v) => {
        const s = v.valor?.trim() ?? "";
        return s.charAt(0).toUpperCase() + s.slice(1);
      })),
    ))]);
    setSemaforoOptions([FL.all, FL.optimal, FL.days60, FL.days30, FL.urgent, FL.noInspection]);
    setFilteredTires(tires);
    setFilteredVehicles(vehicles);
  }, [tires, vehicles]);

  // ===========================================================================
  // Apply filters
  // ===========================================================================

  const applyFilters = useCallback(() => {
    let result = [...tires];

    if (selectedMarca   !== FL.allBrands && selectedMarca)
      result = result.filter((t) => t.marca === selectedMarca);

    if (selectedBanda   !== FL.all && selectedBanda)
      result = result.filter((t) => t.diseno === selectedBanda);

    if (selectedEje     !== FL.allAxles && selectedEje)
      result = result.filter((t) => t.eje === selectedEje);

    if (selectedVida    !== FL.all && selectedVida) {
      result = result.filter((t) => {
        if (!t.vida?.length) return false;
        return t.vida[t.vida.length - 1].valor?.toLowerCase() === selectedVida.toLowerCase();
      });
    }

    if (selectedCliente !== FL.allOwners && selectedCliente) {
      const ids = vehicles.filter((v) => v.cliente === selectedCliente).map((v) => v.id);
      result = result.filter((t) => t.vehicleId && ids.includes(t.vehicleId as string));
    }

    if (selectedSemaforo !== FL.all && selectedSemaforo) {
      const map: Record<string, string> = {
        [FL.optimal]:      "optimo",
        [FL.days60]:       "60_dias",
        [FL.days30]:       "30_dias",
        [FL.urgent]:       "urgente",
        [FL.noInspection]: "sin_inspeccion",
      };
      result = result.filter((t) => classifyCondition(t) === map[selectedSemaforo]);
    }

    setFilteredTires(result);
    setFilteredVehicles(vehicles);
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
    let user: { companyId?: string };
    try { user = JSON.parse(storedUser); } catch { router.push("/login"); return; }
    if (!user.companyId) { setError("No company assigned to user"); return; }
    fetchCompany(user.companyId);
    fetchVehicles(user.companyId);
    fetchTires(user.companyId);
  }, [router, fetchCompany, fetchVehicles, fetchTires]);

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
    } catch { setExporting(false); }
  };

  // ===========================================================================
  // Derived
  // ===========================================================================

  const activeFiltersCount = [
    selectedMarca !== FL.allBrands ? selectedMarca : "",
    selectedBanda !== FL.all       ? selectedBanda : "",
    selectedEje   !== FL.allAxles  ? selectedEje   : "",
    selectedVida  !== FL.all       ? selectedVida  : "",
    selectedCliente !== FL.allOwners ? selectedCliente : "",
    selectedSemaforo !== FL.all    ? selectedSemaforo : "",
  ].filter(Boolean).length;

  const tiresGroupByMarca = filteredTires.reduce<Record<string, number>>((acc, t) => {
    const k = t.marca || "Sin marca";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const tiresGroupByBanda = filteredTires.reduce<Record<string, number>>((acc, t) => {
    const k = t.diseno || "Sin Banda";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

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
          <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">Mi Flota</h1>
            <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Actualizado: {new Date().toLocaleDateString("es-CO")}
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
            style={{ background: "rgba(10,24,58,0.06)", border: "1px solid rgba(10,24,58,0.2)" }}
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
          <MetricCard loading={loading} value={String(filteredVehicles.length)} label="Vehículos"      variant="primary"   />
          <MetricCard loading={loading} value={String(filteredTires.length)}    label="Llantas"        variant="secondary" />
          <MetricCard loading={loading} value={cpkPromedio.toLocaleString("es-CO")}   label="CPK Promedio"   variant="accent"    />
          <MetricCard loading={loading} value={cpkProyectado.toLocaleString("es-CO")} label="CPK Proyectado" variant="secondary" />
        </div>

        {/* Filter panel */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
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
                  setSelectedMarca(FL.allBrands);
                  setSelectedEje(FL.allAxles);
                  setSelectedBanda(FL.all);
                  setSelectedVida(FL.all);
                  setSelectedCliente(FL.allOwners);
                  setSelectedSemaforo(FL.all);
                }}
                className="ml-auto text-xs font-semibold text-[#1E76B6] hover:opacity-70 transition-opacity"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className={`grid grid-cols-2 ${userPlan === "retail" ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
            {userPlan === "retail" && (
              <FilterDropdown id="cliente" label="Dueño"  options={clienteOptions}  selected={selectedCliente}  onChange={setSelectedCliente}  activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.cliente}  />
            )}
            <FilterDropdown id="marca"    label="Marca"  options={marcasOptions}   selected={selectedMarca}    onChange={setSelectedMarca}    activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.marca}    />
            <FilterDropdown id="eje"      label="Eje"    options={ejeOptions}      selected={selectedEje}      onChange={setSelectedEje}      activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.eje}      />
            <FilterDropdown id="semaforo" label="Estado" options={semaforoOptions} selected={selectedSemaforo} onChange={setSelectedSemaforo} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.semaforo} />
            <FilterDropdown id="vida"     label="Vida"   options={vidaOptions}     selected={selectedVida}     onChange={setSelectedVida}     activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.vida}     />
            <FilterDropdown id="banda"    label="Banda"  options={bandaOptions}    selected={selectedBanda}    onChange={setSelectedBanda}    activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} dropdownRef={dropdownRefs.banda}    />
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <PorVida tires={filteredTires} />
          <PromedioEje
            tires={filteredTires}
            onSelectEje={(e) => setSelectedEje(e ?? FL.allAxles)}
            selectedEje={selectedEje}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <PorBanda groupData={tiresGroupByBanda} />
          <PorMarca groupData={tiresGroupByMarca} />
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
        >
          <TablaCpk tires={filteredTires} />
        </div>

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