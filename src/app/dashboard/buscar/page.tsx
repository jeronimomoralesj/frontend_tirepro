"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Car,
  X,
  Info,
  ChevronDown,
  Eye,
  Circle,
  BarChart3,
  Calendar,
  Ruler,
  Repeat,
  Trash2,
  Pencil,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

// =============================================================================
// Types — aligned with normalized backend (costos, inspecciones, eventos)
// =============================================================================

export type RawCosto = { valor: number; fecha: string | Date };

export type RawInspeccion = {
  id?: string;
  tireId?: string;
  fecha: string | Date;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk?: number | null;
  cpkProyectado?: number | null;
  cpt?: number | null;
  cptProyectado?: number | null;
  diasEnUso?: number | null;
  mesesEnUso?: number | null;
  kilometrosEstimados?: number | null;
  kmActualVehiculo?: number | null;
  kmEfectivos?: number | null;
  kmProyectado?: number | null;
  imageUrl?: string | null;
};

export type RawEvento = {
  id?: string;
  tireId?: string;
  tipo: string;
  fecha: string | Date;
  notas?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RawTire = {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  profundidadInicial: number;
  dimension: string;
  eje: string;
  posicion: number;
  companyId: string;
  vehicleId?: string | null;
  fechaInstalacion?: string | Date | null;
  diasAcumulados?: number;
  kilometrosRecorridos: number;
  alertLevel?: string;
  healthScore?: number | null;
  currentCpk?: number | null;
  currentProfundidad?: number | null;
  projectedDateEOL?: string | Date | null;
  primeraVida?: Array<{ cpk?: number; diseno?: string; costo?: number; kilometros?: number }>;
  desechos?: unknown;
  // Normalized relations
  costos: RawCosto[];
  inspecciones: RawInspeccion[];
  eventos: RawEvento[];
};

// Normalised shapes for component use
export type CostEntry  = { valor: number; fecha: string };
export type Inspection = {
  fecha: string;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk: number | null; cpkProyectado: number | null;
  cpt: number | null; cptProyectado: number | null;
  kilometrosEstimados: number | null; kmProyectado: number | null;
  imageUrl: string | null;
};
export type VidaEntry = { valor: string; fecha: string };

export type Tire = {
  id: string; placa: string; marca: string; diseno: string;
  profundidadInicial: number; dimension: string; eje: string;
  posicion: number; companyId: string; vehicleId?: string | null;
  fechaInstalacion?: string | null; diasAcumulados?: number;
  kilometrosRecorridos: number;
  alertLevel?: string; healthScore?: number | null;
  currentCpk?: number | null; currentProfundidad?: number | null;
  primeraVida?: Array<{ cpk?: number }>;
  // Normalised
  costo: CostEntry[];
  inspecciones: Inspection[];
  vida: VidaEntry[];
};

export type Vehicle = { id: string; placa: string; tipovhc?: string; carga?: string };

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

function toISO(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function WearChart({ inspecciones }: { inspecciones: Inspection[] }) {
  const sorted = [...inspecciones].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  if (sorted.length < 2) return null;

  const labels = sorted.map(i =>
    new Date(i.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })
  );

  const thresholdPlugin = {
    id: "thresholds",
    afterDraw(chart: ChartJS) {
      const { ctx, chartArea: { left, right }, scales: { y } } = chart;
      [{ val: 2, color: "#e24b4a", dash: [6, 3] as number[] }, { val: 4, color: "#ef9f27", dash: [] as number[] }]
        .forEach(({ val, color, dash }) => {
          const yPx = y.getPixelForValue(val);
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash(dash);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.moveTo(left, yPx);
          ctx.lineTo(right, yPx);
          ctx.stroke();
          ctx.restore();
        });
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: "Promedio",
        data: sorted.map(i => parseFloat(((i.profundidadInt + i.profundidadCen + i.profundidadExt) / 3).toFixed(2))),
        borderColor: "#378add",
        backgroundColor: "#378add18",
        tension: 0.3,
        pointRadius: 4,
        borderWidth: 2.5,
        fill: false,
      },
      {
        label: "Interior",
        data: sorted.map(i => i.profundidadInt),
        borderColor: "#1d9e75",
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 1.5,
        borderDash: [4, 3],
        fill: false,
      },
      {
        label: "Central",
        data: sorted.map(i => i.profundidadCen),
        borderColor: "#7f77dd",
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 1.5,
        borderDash: [4, 3],
        fill: false,
      },
      {
        label: "Exterior",
        data: sorted.map(i => i.profundidadExt),
        borderColor: "#d85a30",
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 1.5,
        borderDash: [4, 3],
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} mm`,
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 10 }, color: "#888", maxRotation: 45 },
        grid:  { color: "rgba(0,0,0,0.04)" },
      },
      y: {
        min: 0,
        title: { display: true, text: "Profundidad (mm)", font: { size: 10 }, color: "#888" },
        ticks: { font: { size: 10 }, color: "#888", callback: (v: number) => v + "mm" },
        grid:  { color: "rgba(0,0,0,0.04)" },
      },
    },
  };

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
      <SectionTitle icon={BarChart3} title="Desgaste de Profundidad" />

      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: "Promedio", color: "#378add", dash: false },
          { label: "Interior", color: "#1d9e75", dash: true  },
          { label: "Central",  color: "#7f77dd", dash: true  },
          { label: "Exterior", color: "#d85a30", dash: true  },
        ].map(d => (
          <span key={d.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span style={{ display: "inline-block", width: 20, height: 2, borderTop: `2px ${d.dash ? "dashed" : "solid"} ${d.color}` }} />
            {d.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span style={{ display: "inline-block", width: 20, height: 2, borderTop: "2px dashed #e24b4a" }} />
          Mínimo legal (2mm)
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span style={{ display: "inline-block", width: 20, height: 2, borderTop: "2px solid #ef9f27" }} />
          Alerta (4mm)
        </span>
      </div>

      <div style={{ position: "relative", width: "100%", height: "240px" }}>
        <Line data={data} options={options as any} plugins={[thresholdPlugin]} />
      </div>
    </div>
  );
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
    }));

  const vida: VidaEntry[] = raw.eventos
    .filter((e) => e.notas && VIDA_SET.has(e.notas.toLowerCase()))
    .map((e) => ({ valor: e.notas!.toLowerCase(), fecha: toISO(e.fecha) }));

  return { ...raw, costo, inspecciones, vida, fechaInstalacion: raw.fechaInstalacion ? toISO(raw.fechaInstalacion) : null };
}

// UI helpers
const VIDA_META: Record<string, { label: string; bg: string; text: string }> = {
  nueva:       { label: "Nueva",              bg: "#DCFCE7", text: "#166534" },
  reencauche1: { label: "1er Reencauche",     bg: "#DBEAFE", text: "#1E40AF" },
  reencauche2: { label: "2do Reencauche",     bg: "#EDE9FE", text: "#5B21B6" },
  reencauche3: { label: "3er Reencauche",     bg: "#FEE2E2", text: "#991B1B" },
  fin:         { label: "Descartada",         bg: "#F3F4F6", text: "#374151" },
};
const vidaMeta = (v: string) => VIDA_META[v.toLowerCase()] ?? { label: v, bg: "#F3F4F6", text: "#374151" };

function depthColor(d: number): string {
  if (d >= 7) return "#16A34A";
  if (d >= 5) return "#CA8A04";
  return "#DC2626";
}
function depthBg(d: number): string {
  if (d >= 7) return "#DCFCE7";
  if (d >= 5) return "#FEF9C3";
  return "#FEE2E2";
}

function fmt(n: number | null | undefined, prefix = ""): string {
  if (n == null || isNaN(n)) return "N/A";
  return `${prefix}${Number(n).toLocaleString("es-CO")}`;
}
function fmtMM(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return `${n} mm`;
}

// =============================================================================
// Sub-components
// =============================================================================

function Badge({ valor }: { valor: string }) {
  const m = vidaMeta(valor);
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: m.bg, color: m.text }}
    >
      {m.label}
    </span>
  );
}

function DepthPill({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: depthBg(value), color: depthColor(value) }}
    >
      {value} mm
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0 gap-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm font-medium text-[#0A183A] text-right">{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <h3 className="text-base font-black text-[#0A183A] tracking-tight">{title}</h3>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

const BuscarPage: React.FC = () => {
  const [searchMode, setSearchMode] = useState<"vehicle" | "tire">("vehicle");
  const [searchTerm, setSearchTerm] = useState("");
  const [tires,      setTires]      = useState<Tire[]>([]);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [showModal,    setShowModal]    = useState(false);

  // Edit state
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState({
    marca: "", diseno: "", dimension: "", eje: "",
    kilometrosRecorridos: 0, profundidadInicial: 0,
  });
  const [editingInspection, setEditingInspection] = useState<{
    fecha: string; profundidadInt: number; profundidadCen: number; profundidadExt: number;
  } | null>(null);
  const [editingCosto, setEditingCosto] = useState<{ fecha: string; newValor: number } | null>(null);
  const [editLoading,  setEditLoading]  = useState(false);
  const [editSuccess,  setEditSuccess]  = useState("");

  const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user       = storedUser ? JSON.parse(storedUser) : null;
  const companyId  = user?.companyId;

  // Search
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setTires([]); setSelectedTire(null);
    if (!searchTerm.trim()) { setError("Por favor ingrese un valor para buscar"); return; }
    if (!companyId)          { setError("Información de la compañía no encontrada"); return; }
    setLoading(true);
    try {
      if (searchMode === "vehicle") {
        const vRes = await authFetch(`${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(searchTerm.trim().toLowerCase())}&companyId=${companyId}`);
        if (!vRes.ok) throw new Error("Vehículo no encontrado");
        const vehicle: Vehicle = await vRes.json();
        const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicle.id}`);
        if (!tRes.ok) throw new Error("Error al obtener las llantas");
        const raw: RawTire[] = await tRes.json();
        setTires(raw.filter((t) => t.companyId === companyId).map(normalise).sort((a, b) => a.posicion - b.posicion));
      } else {
        const tRes = await authFetch(`${API_BASE}/tires?companyId=${companyId}&placa=${encodeURIComponent(searchTerm.trim())}`);
        if (!tRes.ok) throw new Error("Llanta no encontrada");
        const raw: RawTire[] = await tRes.json();
        setTires(raw.map(normalise).sort((a, b) => a.posicion - b.posicion));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const openModal = (tire: Tire) => {
    setSelectedTire(tire); setShowModal(true);
    setEditMode(false); setEditingInspection(null); setEditingCosto(null); setEditSuccess("");
  };
  const closeModal = () => {
    setSelectedTire(null); setShowModal(false);
    setEditMode(false); setEditingInspection(null); setEditingCosto(null); setEditSuccess("");
  };
  const openEditMode = (tire: Tire) => {
    setEditForm({
      marca: tire.marca, diseno: tire.diseno, dimension: tire.dimension, eje: tire.eje,
      kilometrosRecorridos: tire.kilometrosRecorridos, profundidadInicial: tire.profundidadInicial,
    });
    setEditingInspection(null); setEditingCosto(null); setEditSuccess(""); setEditMode(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedTire) return;
    setEditLoading(true); setEditSuccess("");
    try {
      const payload: Record<string, unknown> = { ...editForm };
      if (editingInspection) payload.inspectionEdit = editingInspection;
      if (editingCosto)      payload.costoEdit      = editingCosto;
      const res = await authFetch(`${API_BASE}/tires/${selectedTire.id}/edit`, {
        method: "PATCH", body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar cambios");
      const updated: RawTire = await res.json();
      const norm = normalise(updated);
      setSelectedTire(norm);
      setTires((ts) => ts.map((t) => (t.id === norm.id ? norm : t)));
      setEditSuccess("¡Cambios guardados exitosamente!");
      setEditMode(false); setEditingInspection(null); setEditingCosto(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteInspection = async (fecha: string) => {
    if (!selectedTire) return;
    if (!window.confirm("¿Estás seguro que quieres borrar esta inspección?")) return;
    try {
      const res = await authFetch(
        `${API_BASE}/tires/${selectedTire.id}/inspection?fecha=${encodeURIComponent(fecha)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      const updated = { ...selectedTire, inspecciones: selectedTire.inspecciones.filter((i) => i.fecha !== fecha) };
      setSelectedTire(updated);
      setTires((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      alert("No se pudo eliminar la inspección");
    }
  };

  // Derived display helpers
  const getLatestInsp = (tire: Tire) =>
    tire.inspecciones.length ? tire.inspecciones[tire.inspecciones.length - 1] : null;

  const getProjectedKm = (tire: Tire): string => {
    const last = getLatestInsp(tire);
    if (!last) return "N/A";
    if (last.kmProyectado && last.kmProyectado > 0) return Math.round(last.kmProyectado).toLocaleString("es-CO");
    const minProf = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
    const km = tire.kilometrosRecorridos;
    const mmWorn = tire.profundidadInicial - minProf;
    const mmLeft = Math.max(minProf - 2, 0);
    if (mmWorn <= 0 || km <= 0) return "∞";
    return Math.round(km + (km / mmWorn) * mmLeft).toLocaleString("es-CO");
  };

  const getCurrentVida = (tire: Tire) =>
    tire.vida.length ? vidaMeta(tire.vida[tire.vida.length - 1].valor).label : "No Registrada";

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none tracking-tight truncate">
              Buscar Llanta
            </h1>
            <p className="text-xs text-[#348CCB] mt-0.5">
              Busque por placa de vehículo o ID de llanta
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* ── Search panel ── */}
        <div
          className="rounded-2xl p-4 sm:p-6"
          style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
        >
          <form onSubmit={handleSearch}>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Mode select */}
              <div className="relative sm:w-56 flex-shrink-0">
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as "vehicle" | "tire")}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                >
                  <option value="vehicle">Por Placa de Vehículo</option>
                  <option value="tire">Por ID de Llanta</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-[#1E76B6]" />
              </div>

              {/* Input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  {searchMode === "vehicle"
                    ? <Car className="w-4 h-4 text-gray-400" />
                    : <Circle className="w-4 h-4 text-gray-400" />}
                </div>
                <input
                  type="text"
                  placeholder={searchMode === "vehicle" ? "Ej: ABC123" : "Ej: llanta-id-001"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
                <span>{loading ? "Buscando…" : "Buscar"}</span>
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-3 mt-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {tires.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
          >
            {/* Results header — matches MetricCard style */}
            <div
              className="px-4 sm:px-6 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}
            >
              <div className="flex items-center gap-2">
                <Circle className="w-5 h-5 text-white/70" />
                <span className="font-black text-white text-sm sm:text-base">
                  {tires.length} {tires.length === 1 ? "Llanta Encontrada" : "Llantas Encontradas"}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {tires.map((tire) => {
                  const last    = getLatestInsp(tire);
                  const avgMM   = last ? (last.profundidadInt + last.profundidadCen + last.profundidadExt) / 3 : null;
                  const lastVida = tire.vida.length ? tire.vida[tire.vida.length - 1] : null;

                  return (
                    <div
                      key={tire.id}
                      className="rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
                      style={{ border: "1px solid rgba(52,140,203,0.15)", background: "white" }}
                    >
                      {/* Card top accent */}
                      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1E76B6, #348CCB)" }} />

                      <div className="p-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-black text-[#0A183A] text-base leading-tight">{tire.placa}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{tire.marca} · {tire.diseno}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
                            >
                              Pos. {tire.posicion}
                            </span>
                            {avgMM !== null && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: depthBg(avgMM), color: depthColor(avgMM) }}
                              >
                                {avgMM.toFixed(1)} mm
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Vida badge */}
                        {lastVida && <div className="mb-3"><Badge valor={lastVida.valor} /></div>}

                        {/* Info rows */}
                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Ruler className="w-3.5 h-3.5 text-[#348CCB] flex-shrink-0" />
                            {tire.dimension}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <BarChart3 className="w-3.5 h-3.5 text-[#348CCB] flex-shrink-0" />
                            Eje: {tire.eje}
                          </div>
                          {last && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-[#348CCB] flex-shrink-0" />
                              Últ. insp.: {new Date(last.fecha).toLocaleDateString("es-CO")}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => openModal(tire)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Modal                                                               */}
      {/* ================================================================== */}
      {showModal && selectedTire && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full max-w-5xl my-4 rounded-2xl overflow-hidden"
            style={{ background: "white", boxShadow: "0 25px 60px rgba(10,24,58,0.3)" }}
          >
            {/* Modal header */}
            <div
              className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
              style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Info className="w-5 h-5 text-white/70 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-black text-white text-sm sm:text-base leading-none truncate">
                    {selectedTire.placa}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5 truncate">
                    {selectedTire.marca} {selectedTire.diseno} · {selectedTire.dimension}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => editMode ? setEditMode(false) : openEditMode(selectedTire)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: editMode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                  }}
                >
                  {editMode ? <><X className="w-3.5 h-3.5" /> Cancelar</> : <><Pencil className="w-3.5 h-3.5" /> Editar</>}
                </button>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">

              {/* Success banner */}
              {editSuccess && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}
                >
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-green-700">{editSuccess}</span>
                </div>
              )}

              {/* ── Edit panel ── */}
              {editMode && (
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(30,118,182,0.2)" }}
                >
                  <p className="text-sm font-black text-[#0A183A] mb-4">Editar Información</p>

                  {/* Core fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                    {([
                      { label: "Marca",          key: "marca",                 type: "text"   },
                      { label: "Diseño",         key: "diseno",                type: "text"   },
                      { label: "Dimensión",      key: "dimension",             type: "text"   },
                      { label: "Eje",            key: "eje",                   type: "text"   },
                      { label: "Km Recorridos",  key: "kilometrosRecorridos",  type: "number" },
                      { label: "Prof. Inicial",  key: "profundidadInicial",    type: "number" },
                    ] as const).map(({ label, key, type }) => (
                      <div key={key}>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                        <input
                          type={type}
                          value={(editForm as Record<string, unknown>)[key] as string}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                          style={{ background: "white", border: "1px solid rgba(52,140,203,0.25)", color: "#0A183A" }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Cost editor */}
                  {selectedTire.costo.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Editar Costo</p>
                      <div className="space-y-2">
                        {selectedTire.costo.map((entry, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-2 p-3 rounded-xl"
                            style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}
                          >
                            <span className="text-xs text-gray-500 min-w-[100px]">
                              {new Date(entry.fecha).toLocaleDateString("es-CO")}
                            </span>
                            <span className="text-xs font-medium text-[#173D68]">
                              ${entry.valor.toLocaleString("es-CO")}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingCosto((prev) =>
                                  prev?.fecha === entry.fecha ? null : { fecha: entry.fecha, newValor: entry.valor }
                                )
                              }
                              className="px-2 py-1 rounded-lg text-xs font-bold transition-colors ml-auto"
                              style={{
                                background: editingCosto?.fecha === entry.fecha ? "rgba(30,118,182,0.15)" : "rgba(10,24,58,0.05)",
                                color: editingCosto?.fecha === entry.fecha ? "#1E76B6" : "#374151",
                                border: "1px solid rgba(52,140,203,0.2)",
                              }}
                            >
                              {editingCosto?.fecha === entry.fecha ? "Editando" : "Editar"}
                            </button>
                            {editingCosto?.fecha === entry.fecha && (
                              <input
                                type="number"
                                value={editingCosto.newValor}
                                onChange={(e) =>
                                  setEditingCosto((c) => c ? { ...c, newValor: parseFloat(e.target.value) || 0 } : c)
                                }
                                className="flex-1 min-w-[100px] px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                                style={{ border: "1px solid rgba(30,118,182,0.4)", color: "#0A183A" }}
                                placeholder="Nuevo valor"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inspection depth editor */}
                  {selectedTire.inspecciones.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Editar Profundidades</p>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {[...selectedTire.inspecciones]
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .map((insp, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl overflow-hidden"
                              style={{ border: "1px solid rgba(52,140,203,0.15)", background: "white" }}
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2">
                                <span className="text-xs font-medium text-gray-600">
                                  {new Date(insp.fecha).toLocaleDateString("es-CO")} —&nbsp;
                                  {insp.profundidadInt}/{insp.profundidadCen}/{insp.profundidadExt} mm
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingInspection((prev) =>
                                      prev?.fecha === insp.fecha ? null : {
                                        fecha: insp.fecha,
                                        profundidadInt: insp.profundidadInt,
                                        profundidadCen: insp.profundidadCen,
                                        profundidadExt: insp.profundidadExt,
                                      }
                                    )
                                  }
                                  className="px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0"
                                  style={{
                                    background: editingInspection?.fecha === insp.fecha ? "rgba(30,118,182,0.12)" : "rgba(10,24,58,0.05)",
                                    color: editingInspection?.fecha === insp.fecha ? "#1E76B6" : "#374151",
                                    border: "1px solid rgba(52,140,203,0.2)",
                                  }}
                                >
                                  {editingInspection?.fecha === insp.fecha ? "Editando" : "Editar"}
                                </button>
                              </div>
                              {editingInspection?.fecha === insp.fecha && (
                                <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                                  {(["profundidadInt", "profundidadCen", "profundidadExt"] as const).map((field) => (
                                    <div key={field}>
                                      <label className="block text-[10px] text-gray-500 mb-1">
                                        {field === "profundidadInt" ? "Interior" : field === "profundidadCen" ? "Central" : "Exterior"}
                                      </label>
                                      <input
                                        type="number"
                                        value={editingInspection[field]}
                                        onChange={(e) =>
                                          setEditingInspection((prev) =>
                                            prev ? { ...prev, [field]: parseFloat(e.target.value) || 0 } : prev
                                          )
                                        }
                                        className="w-full px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                                        style={{ border: "1px solid rgba(30,118,182,0.3)", color: "#0A183A" }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Save / cancel */}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditMode(false); setEditingInspection(null); setEditingCosto(null); }}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
                      style={{ border: "1px solid rgba(10,24,58,0.1)" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleEditSubmit}
                      disabled={editLoading}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                    >
                      {editLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                        : "Guardar Cambios"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Summary metric cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Marca",      value: selectedTire.marca,     variant: "primary"   },
                  { label: "Posición",   value: selectedTire.posicion,  variant: "secondary" },
                  { label: "Dimensión",  value: selectedTire.dimension, variant: "accent"    },
                  { label: "Eje",        value: selectedTire.eje,       variant: "secondary" },
                ].map(({ label, value, variant }) => {
                  const bgs: Record<string, string> = {
                    primary:   "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
                    secondary: "linear-gradient(135deg, #173D68 0%, #1E76B6 100%)",
                    accent:    "linear-gradient(135deg, #1E76B6 0%, #348CCB 100%)",
                  };
                  return (
                    <div
                      key={label}
                      className="rounded-xl p-3 sm:p-4 flex flex-col justify-between"
                      style={{ background: bgs[variant], minHeight: 80 }}
                    >
                      <p className="text-lg sm:text-xl font-black text-white leading-none break-all">{value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-2">{label}</p>
                    </div>
                  );
                })}
              </div>

              {/* ── Vida history ── */}
              <div
                className="rounded-2xl p-4 sm:p-5"
                style={{ border: "1px solid rgba(52,140,203,0.15)" }}
              >
                <SectionTitle icon={Repeat} title="Historial de Vida" />
                {selectedTire.vida.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay registros de vida</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedTire.vida.map((entry, i) => {
                      const isNueva = entry.valor === "nueva";
                      const cpk = isNueva && selectedTire.primeraVida?.[0]?.cpk
                        ? selectedTire.primeraVida[0].cpk.toFixed(2)
                        : null;
                      return (
                        <div key={i} className="flex flex-col gap-0.5">
                          <Badge valor={entry.valor} />
                          <span className="text-[10px] text-gray-400 pl-1">
                            {new Date(entry.fecha).toLocaleDateString("es-CO")}
                            {cpk && ` · CPK: $${cpk}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Details grid ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Characteristics */}
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                >
                  <SectionTitle icon={Info} title="Características" />
                  <InfoRow label="Diseño"          value={selectedTire.diseno} />
                  <InfoRow label="Prof. Inicial"   value={fmtMM(selectedTire.profundidadInicial)} />
                  <InfoRow label="Km Recorridos"   value={`${selectedTire.kilometrosRecorridos.toLocaleString("es-CO")} km`} />
                  <InfoRow label="Km Proyectados"  value={`${getProjectedKm(selectedTire)} km`} />
                  <InfoRow label="Estado Actual"   value={getCurrentVida(selectedTire)} />
                  {selectedTire.fechaInstalacion && (
                    <InfoRow label="Instalación" value={new Date(selectedTire.fechaInstalacion).toLocaleDateString("es-CO")} />
                  )}
                  {selectedTire.diasAcumulados != null && (
                    <InfoRow label="Días Rodando" value={`${selectedTire.diasAcumulados} días`} />
                  )}
                </div>

                {/* Cost analysis */}
                <div
                  className="rounded-2xl p-4 sm:p-5"
                  style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                >
                  <SectionTitle icon={BarChart3} title="Análisis de Costos" />
                  {selectedTire.costo.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin registros de costo</p>
                  ) : (
                    selectedTire.costo.map((entry, idx) => (
                      <InfoRow
                        key={idx}
                        label={new Date(entry.fecha).toLocaleDateString("es-CO")}
                        value={`$${entry.valor.toLocaleString("es-CO")}`}
                      />
                    ))
                  )}
                </div>
              </div>

              {selectedTire.inspecciones.length >= 2 && (
  <WearChart inspecciones={selectedTire.inspecciones} />
)}

              {/* ── Inspection table ── */}
              {selectedTire.inspecciones.length > 0 && (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                >
                  <div className="px-4 sm:px-5 py-4">
                    <SectionTitle icon={Calendar} title="Historial de Inspecciones" />
                  </div>

                  {/* Scrollable table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[720px]">
                      <thead>
                        <tr style={{ background: "rgba(10,24,58,0.03)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                          {["Fecha","Interior","Central","Exterior","CPK","CPK Proy.","CPT","CPT Proy.","Km","Imagen",""].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedTire.inspecciones]
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .map((insp, idx) => (
                            <tr
                              key={idx}
                              className="transition-colors"
                              style={{ borderBottom: "1px solid rgba(52,140,203,0.08)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,118,182,0.03)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                                {new Date(insp.fecha).toLocaleDateString("es-CO")}
                              </td>
                              <td className="px-3 py-2.5"><DepthPill value={insp.profundidadInt} /></td>
                              <td className="px-3 py-2.5"><DepthPill value={insp.profundidadCen} /></td>
                              <td className="px-3 py-2.5"><DepthPill value={insp.profundidadExt} /></td>
                              <td className="px-3 py-2.5 text-xs font-medium text-[#0A183A]">
                                {insp.cpk != null ? `$${Number(insp.cpk).toFixed(0)}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-xs font-medium text-[#0A183A]">
                                {insp.cpkProyectado != null ? `$${Number(insp.cpkProyectado).toFixed(0)}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-600">
                                {insp.cpt != null ? `$${Number(insp.cpt).toFixed(0)}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-600">
                                {insp.cptProyectado != null ? `$${Number(insp.cptProyectado).toFixed(0)}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-600">
                                {insp.kilometrosEstimados != null ? insp.kilometrosEstimados.toLocaleString("es-CO") : "—"}
                              </td>
                              <td className="px-3 py-2.5">
                                {insp.imageUrl ? (
                                  <a href={insp.imageUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={insp.imageUrl}
                                      alt="Inspección"
                                      className="rounded-lg object-cover hover:scale-105 transition-transform duration-150"
                                      style={{ width: 48, height: 48 }}
                                    />
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  onClick={() => handleDeleteInspection(insp.fecha)}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ color: "#DC2626" }}
                                  title="Eliminar inspección"
                                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.08)")}
                                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Close button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={closeModal}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
                  style={{ border: "1px solid rgba(10,24,58,0.12)" }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuscarPage;