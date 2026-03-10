"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Car, X, Info, ChevronDown, Eye, BarChart3,
  Calendar, Ruler, Repeat, Trash2Icon, Building2, Loader2,
  AlertCircle, Pencil, CheckCircle2, Circle, TrendingUp,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk?: number | null;
  cpkProyectado?: number | null;
  cpt?: number | null;
  cptProyectado?: number | null;
  imageUrl?: string | null;
  fecha: string;
  kilometrosEstimados?: number | null;
  mesesEnUso?: number | null;
  diasEnUso?: number | null;
  kmActualVehiculo?: number | null;
  kmProyectado?: number | null;
};

export type CostEntry = { valor: number; fecha: string };

export type VidaEntry = { valor: string; fecha: string };

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  profundidadInicial: number;
  dimension: string;
  eje: string;
  costos: CostEntry[];
  // legacy field kept for modal cost display
  costo?: CostEntry[];
  posicion: number;
  inspecciones?: Inspection[];
  primeraVida?: Array<{ cpk?: number }>;
  kilometrosRecorridos: number;
  eventos?: { tipo: string; fecha: string; notas?: string | null }[];
  vida?: VidaEntry[];
  companyId: string;
  fechaInstalacion?: string;
  diasAcumulados?: number;
  alertLevel?: string;
  healthScore?: number | null;
  currentProfundidad?: number | null;
  projectedKmRemaining?: number | null;
};

export type Vehicle = {
  id: string;
  placa: string;
  tipovhc?: string;
  carga: string;
  companyId: string;
};

interface Company {
  id: string;
  name: string;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

const VIDA_SET = new Set(["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"]);

// =============================================================================
// Helpers
// =============================================================================

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

/** Extract vida entries from eventos array (normalized backend shape) */
function extractVida(eventos?: Tire["eventos"]): VidaEntry[] {
  if (!eventos?.length) return [];
  return eventos
    .filter((e) => e.notas && VIDA_SET.has(e.notas.toLowerCase()))
    .map((e) => ({ valor: e.notas!.toLowerCase(), fecha: e.fecha }));
}

/** Normalize a raw tire from the API into consistent shape */
function normalizeTire(raw: any): Tire {
  const costos: CostEntry[] = (raw.costos ?? []).map((c: any) => ({
    valor: c.valor ?? 0,
    fecha: c.fecha instanceof Date ? c.fecha.toISOString() : String(c.fecha ?? ""),
  }));

  const inspecciones: Inspection[] = (raw.inspecciones ?? []).map((i: any) => ({
    fecha: i.fecha instanceof Date ? i.fecha.toISOString() : String(i.fecha ?? ""),
    profundidadInt: i.profundidadInt ?? 0,
    profundidadCen: i.profundidadCen ?? 0,
    profundidadExt: i.profundidadExt ?? 0,
    cpk: i.cpk ?? null,
    cpkProyectado: i.cpkProyectado ?? null,
    cpt: i.cpt ?? null,
    cptProyectado: i.cptProyectado ?? null,
    kilometrosEstimados: i.kilometrosEstimados ?? null,
    mesesEnUso: i.mesesEnUso ?? null,
    diasEnUso: i.diasEnUso ?? null,
    kmActualVehiculo: i.kmActualVehiculo ?? null,
    kmProyectado: i.kmProyectado ?? null,
    imageUrl: i.imageUrl ?? null,
  }));

  const vida: VidaEntry[] = raw.vida ?? extractVida(raw.eventos);

  return { ...raw, costos, costo: costos, inspecciones, vida };
}

const VIDA_LABELS: Record<string, { text: string; bg: string; dot: string }> = {
  nueva:       { text: "Nueva",         bg: "rgba(52,140,203,0.12)", dot: "#348CCB" },
  reencauche1: { text: "Reencauche 1",  bg: "rgba(30,118,182,0.12)", dot: "#1E76B6" },
  reencauche2: { text: "Reencauche 2",  bg: "rgba(23,61,104,0.12)",  dot: "#173D68" },
  reencauche3: { text: "Reencauche 3",  bg: "rgba(10,24,58,0.12)",   dot: "#0A183A" },
  fin:         { text: "Descartada",    bg: "rgba(220,38,38,0.08)",  dot: "#DC2626" },
};

function vidaLabel(val: string) {
  return VIDA_LABELS[val.toLowerCase()] ?? { text: val, bg: "rgba(52,140,203,0.08)", dot: "#348CCB" };
}

function depthColor(d: number): string {
  if (d >= 6) return "#22c55e";
  if (d >= 3) return "#f59e0b";
  return "#ef4444";
}

function depthBg(d: number): string {
  if (d >= 6) return "rgba(34,197,94,0.12)";
  if (d >= 3) return "rgba(245,158,11,0.12)";
  return "rgba(239,68,68,0.12)";
}

function alertStyle(level?: string): { color: string; bg: string; label: string } {
  switch (level) {
    case "critical": return { color: "#DC2626", bg: "rgba(220,38,38,0.08)", label: "Crítico" };
    case "warning":  return { color: "#D97706", bg: "rgba(217,119,6,0.08)",  label: "Precaución" };
    case "watch":    return { color: "#1E76B6", bg: "rgba(30,118,182,0.08)", label: "Vigilar" };
    default:         return { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  label: "OK" };
  }
}

// =============================================================================
// Design-system micro-components (matching DistribuidorPage)
// =============================================================================

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.15)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
      }}
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

function Badge({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={style}
    >
      {children}
    </span>
  );
}

// =============================================================================
// Main component
// =============================================================================

const BuscarDist: React.FC = () => {
  const [searchTerm, setSearchTerm]           = useState("");
  const [tires, setTires]                     = useState<Tire[]>([]);
  const [error, setError]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [selectedTire, setSelectedTire]       = useState<Tire | null>(null);
  const [showModal, setShowModal]             = useState(false);
  const [companies, setCompanies]             = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDropdown, setShowDropdown]       = useState(false);
  const [companySearch, setCompanySearch]     = useState("");
  const dropdownRef                           = useRef<HTMLDivElement>(null);

  // Edit state
  const [editMode, setEditMode]               = useState(false);
  const [editForm, setEditForm]               = useState({ marca: "", diseno: "", dimension: "", eje: "", kilometrosRecorridos: 0, profundidadInicial: 0 });
  const [editingInsp, setEditingInsp]         = useState<{ fecha: string; profundidadInt: number; profundidadCen: number; profundidadExt: number } | null>(null);
  const [editingCosto, setEditingCosto]       = useState<{ fecha: string; newValor: number } | null>(null);
  const [editLoading, setEditLoading]         = useState(false);
  const [editSuccess, setEditSuccess]         = useState("");

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch companies ──────────────────────────────────────────────────────
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/companies/me/clients`);
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(data.map((a: any) => ({ id: a.company.id, name: a.company.name })));
    } catch {/* silent */}
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // ── Search ───────────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setTires([]); setSelectedTire(null);
    if (!searchTerm.trim()) { setError("Ingrese una placa de vehículo."); return; }
    if (!selectedCompany)   { setError("Seleccione un cliente primero."); return; }

    setLoading(true);
    try {
      // Updated endpoint: GET /api/vehicles/placa?placa=...&companyId=...
      const vRes = await authFetch(
        `${API_BASE}/vehicles/placa?placa=${encodeURIComponent(searchTerm.trim().toLowerCase())}&companyId=${selectedCompany.id}`
      );
      if (!vRes.ok) throw new Error("Vehículo no encontrado en este cliente.");
      const vehicle: Vehicle = await vRes.json();

      const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicle.id}`);
      if (!tRes.ok) throw new Error("Error al obtener las llantas.");
      const raw: any[] = await tRes.json();

      const valid = raw
        .filter((t) => t.companyId === selectedCompany.id)
        .map(normalizeTire)
        .sort((a, b) => a.posicion - b.posicion);

      setTires(valid);
      if (!valid.length) setError("No se encontraron llantas para este vehículo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  const openModal = (tire: Tire) => {
    setSelectedTire(tire);
    setShowModal(true);
    setEditMode(false);
    setEditSuccess("");
  };

  const closeModal = () => {
    setSelectedTire(null);
    setShowModal(false);
    setEditMode(false);
    setEditingInsp(null);
    setEditingCosto(null);
    setEditSuccess("");
  };

  const openEditMode = (tire: Tire) => {
    setEditForm({
      marca: tire.marca, diseno: tire.diseno, dimension: tire.dimension,
      eje: tire.eje, kilometrosRecorridos: tire.kilometrosRecorridos,
      profundidadInicial: tire.profundidadInicial,
    });
    setEditingInsp(null); setEditingCosto(null); setEditSuccess("");
    setEditMode(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedTire) return;
    setEditLoading(true); setEditSuccess("");
    try {
      const payload: any = { ...editForm };
      if (editingInsp)  payload.inspectionEdit = editingInsp;
      if (editingCosto) payload.costoEdit       = editingCosto;

      const res = await authFetch(`${API_BASE}/tires/${selectedTire.id}/edit`, {
        method: "PATCH", body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar cambios.");
      const updated = normalizeTire(await res.json());
      setSelectedTire(updated);
      setTires((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
      setEditSuccess("¡Cambios guardados exitosamente!");
      setEditMode(false);
      setEditingInsp(null); setEditingCosto(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete inspection ────────────────────────────────────────────────────
  const handleDeleteInspection = async (fecha: string) => {
    if (!selectedTire) return;
    if (!window.confirm("¿Estás seguro que quieres borrar esta inspección?")) return;
    try {
      const res = await authFetch(
        `${API_BASE}/tires/${selectedTire.id}/inspection?fecha=${encodeURIComponent(fecha)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      const updated = { ...selectedTire, inspecciones: (selectedTire.inspecciones ?? []).filter((i) => i.fecha !== fecha) };
      setSelectedTire(updated);
      setTires((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      alert("No se pudo eliminar la inspección.");
    }
  };

  // ── Derived helpers ──────────────────────────────────────────────────────
  const getLatestInsp = (tire: Tire) =>
    tire.inspecciones?.length
      ? [...tire.inspecciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
      : null;

  const getAvgDepth = (tire: Tire): number | null => {
    const l = getLatestInsp(tire);
    if (!l) return null;
    return (l.profundidadInt + l.profundidadCen + l.profundidadExt) / 3;
  };

  const getProjectedKm = (tire: Tire): string => {
    const l = getLatestInsp(tire);
    if (!l) return "N/A";
    if (l.kmProyectado && l.kmProyectado > 0) return Math.round(l.kmProyectado).toLocaleString("es-CO");
    const minProf = Math.min(l.profundidadInt, l.profundidadCen, l.profundidadExt);
    const mmWorn  = tire.profundidadInicial - minProf;
    const mmLeft  = Math.max(minProf - 2, 0);
    if (mmWorn <= 0 || tire.kilometrosRecorridos <= 0) return "∞";
    return Math.round(tire.kilometrosRecorridos + (tire.kilometrosRecorridos / mmWorn) * mmLeft).toLocaleString("es-CO");
  };

  const getCurrentVida = (tire: Tire) => {
    if (!tire.vida?.length) return null;
    return tire.vida[tire.vida.length - 1];
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 py-4 sm:py-5 rounded-2xl flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)", boxShadow: "0 8px 32px rgba(10,24,58,0.22)" }}
        >
          <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-white text-lg leading-none tracking-tight">Buscar Llanta</h1>
            <p className="text-xs text-white/60 mt-0.5">Busque por cliente y placa de vehículo</p>
          </div>
        </div>

        {/* ── Search form ─────────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Client selector */}
              <div ref={dropdownRef} className="relative">
                <label className="block text-xs font-bold text-[#0A183A] uppercase tracking-wide mb-1.5">
                  Cliente
                </label>
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    border: selectedCompany ? "1.5px solid rgba(30,118,182,0.5)" : "1.5px solid rgba(52,140,203,0.2)",
                    background: selectedCompany ? "rgba(30,118,182,0.04)" : "white",
                    color: selectedCompany ? "#0A183A" : "#9ca3af",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 flex-shrink-0 text-[#1E76B6]" />
                    <span className="truncate font-medium">{selectedCompany?.name ?? "Seleccionar cliente"}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 text-[#1E76B6] transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                </button>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div
                      className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                      style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)", boxShadow: "0 8px 32px rgba(10,24,58,0.15)" }}
                    >
                      <div className="p-2 border-b" style={{ borderColor: "rgba(52,140,203,0.12)" }}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <input
                            autoFocus type="text" placeholder="Buscar cliente…"
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                            style={{ border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                          />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {filteredCompanies.length === 0
                          ? <p className="text-center text-sm text-gray-400 py-4">Sin resultados</p>
                          : filteredCompanies.map((c) => (
                            <button
                              key={c.id} type="button"
                              onClick={() => { setSelectedCompany(c); setShowDropdown(false); setCompanySearch(""); }}
                              className="block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F0F7FF]"
                              style={{ color: selectedCompany?.id === c.id ? "#1E76B6" : "#0A183A", fontWeight: selectedCompany?.id === c.id ? 700 : 400 }}
                            >
                              {c.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Plate input + button */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#0A183A] uppercase tracking-wide mb-1.5">
                  Placa de Vehículo
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ej. ABC-123"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                      style={{ border: "1.5px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:opacity-90 whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", boxShadow: "0 4px 12px rgba(30,118,182,0.3)" }}
                  >
                    <Search className="w-4 h-4" />
                    Buscar
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-[#1E76B6]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Cargando datos…</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div
              className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="flex-1 text-red-700">{error}</span>
              <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}
        </Card>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {tires.length > 0 && (
          <Card className="overflow-hidden">
            <div
              className="px-4 sm:px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                  <Circle className="w-4 h-4 text-[#1E76B6]" />
                </div>
                <h2 className="text-sm font-black text-[#0A183A] tracking-tight">
                  {tires.length} {tires.length === 1 ? "Llanta Encontrada" : "Llantas Encontradas"}
                </h2>
              </div>
              <Badge style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}>
                {selectedCompany?.name}
              </Badge>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tires.map((tire) => {
                  const avg    = getAvgDepth(tire);
                  const vida   = getCurrentVida(tire);
                  const alert  = alertStyle(tire.alertLevel);
                  const latest = getLatestInsp(tire);

                  return (
                    <div
                      key={tire.id}
                      className="rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg"
                      style={{ border: "1.5px solid rgba(52,140,203,0.14)", background: "white" }}
                    >
                      {/* Card header stripe */}
                      <div
                        className="h-1.5"
                        style={{ background: avg !== null ? depthColor(avg) : "#9ca3af" }}
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-black text-[#0A183A] text-base leading-tight">{tire.placa.toUpperCase()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{tire.marca} · {tire.diseno}</p>
                          </div>
                          <Badge style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}>
                            Pos. {tire.posicion}
                          </Badge>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(10,24,58,0.03)" }}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Profundidad</p>
                            <p className="text-sm font-black mt-0.5" style={{ color: avg !== null ? depthColor(avg) : "#9ca3af" }}>
                              {avg !== null ? `${avg.toFixed(1)} mm` : "N/A"}
                            </p>
                          </div>
                          <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(10,24,58,0.03)" }}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Km Recorridos</p>
                            <p className="text-sm font-black text-[#0A183A] mt-0.5">{tire.kilometrosRecorridos.toLocaleString("es-CO")}</p>
                          </div>
                        </div>

                        {/* Vida + alert badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {vida && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                              style={{ background: vidaLabel(vida.valor).bg, color: vidaLabel(vida.valor).dot }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: vidaLabel(vida.valor).dot }} />
                              {vidaLabel(vida.valor).text}
                            </span>
                          )}
                          {tire.alertLevel && tire.alertLevel !== "ok" && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
                              style={{ background: alert.bg, color: alert.color }}
                            >
                              {alert.label}
                            </span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="space-y-1 mb-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Ruler className="w-3 h-3 text-[#348CCB]" />
                            {tire.dimension}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <BarChart3 className="w-3 h-3 text-[#348CCB]" />
                            Eje: {tire.eje}
                          </div>
                          {latest && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar className="w-3 h-3 text-[#348CCB]" />
                              Última insp: {new Date(latest.fecha).toLocaleDateString("es-CO")}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => openModal(tire)}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ======================================================================
          MODAL
         ====================================================================== */}
      {showModal && selectedTire && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div
            className="w-full max-w-5xl my-8 rounded-2xl overflow-hidden"
            style={{ background: "white", boxShadow: "0 24px 80px rgba(10,24,58,0.25)" }}
          >
            {/* Modal header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
              style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <Info className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-white text-base leading-none">{selectedTire.placa.toUpperCase()}</h2>
                  <p className="text-xs text-white/60 mt-0.5">{selectedTire.marca} · {selectedTire.diseno}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-6">

              {/* Edit toggle */}
              <div className="flex justify-end">
                <button
                  onClick={() => editMode ? setEditMode(false) : openEditMode(selectedTire)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={editMode
                    ? { background: "rgba(10,24,58,0.06)", color: "#0A183A", border: "1px solid rgba(10,24,58,0.1)" }
                    : { background: "rgba(30,118,182,0.1)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.2)" }}
                >
                  {editMode ? <><X className="w-3.5 h-3.5" /> Cancelar</> : <><Pencil className="w-3.5 h-3.5" /> Editar llanta</>}
                </button>
              </div>

              {/* ── Edit panel ──────────────────────────────────────────── */}
              {editMode && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(30,118,182,0.04)", border: "1.5px solid rgba(30,118,182,0.2)" }}
                >
                  <h3 className="text-sm font-black text-[#0A183A] mb-4 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-[#1E76B6]" />
                    Editar Información
                  </h3>

                  {editSuccess && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
                      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#15803d" }}>
                      <CheckCircle2 className="w-4 h-4" />
                      {editSuccess}
                    </div>
                  )}

                  {/* Core fields */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Marca", key: "marca", type: "text" },
                      { label: "Diseño", key: "diseno", type: "text" },
                      { label: "Dimensión", key: "dimension", type: "text" },
                      { label: "Eje", key: "eje", type: "text" },
                      { label: "Km Recorridos", key: "kilometrosRecorridos", type: "number" },
                      { label: "Prof. Inicial (mm)", key: "profundidadInicial", type: "number" },
                    ].map(({ label, key, type }) => (
                      <div key={key}>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                        <input
                          type={type}
                          value={(editForm as any)[key]}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                          style={{ border: "1.5px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Cost editor */}
                  {(selectedTire.costos ?? selectedTire.costo ?? []).length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-black text-[#0A183A] mb-2">Editar Costos</p>
                      <div className="space-y-2">
                        {(selectedTire.costos ?? selectedTire.costo ?? []).map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                            <span className="text-xs text-gray-500 min-w-[100px]">{new Date(entry.fecha).toLocaleDateString("es-CO")}</span>
                            <span className="text-xs text-gray-400 flex-1">${entry.valor.toLocaleString("es-CO")}</span>
                            <button
                              type="button"
                              onClick={() => setEditingCosto((p) => p?.fecha === entry.fecha ? null : { fecha: entry.fecha, newValor: entry.valor })}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                              style={editingCosto?.fecha === entry.fecha
                                ? { background: "#1E76B6", color: "white" }
                                : { background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
                            >
                              {editingCosto?.fecha === entry.fecha ? "Editando" : "Editar"}
                            </button>
                            {editingCosto?.fecha === entry.fecha && (
                              <input
                                type="number"
                                value={editingCosto.newValor}
                                onChange={(e) => setEditingCosto((c) => c ? { ...c, newValor: parseFloat(e.target.value) || 0 } : c)}
                                className="w-28 px-2 py-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                                style={{ border: "1.5px solid rgba(30,118,182,0.3)", color: "#0A183A" }}
                                placeholder="Nuevo valor"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inspection depth editor */}
                  {(selectedTire.inspecciones ?? []).length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-black text-[#0A183A] mb-2">Editar Profundidad de Inspección</p>
                      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {[...(selectedTire.inspecciones ?? [])]
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .map((insp, idx) => (
                            <div key={idx} className="bg-white rounded-xl px-3 py-2.5" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-gray-600">
                                  {new Date(insp.fecha).toLocaleDateString("es-CO")} &nbsp;·&nbsp;
                                  Int:{insp.profundidadInt} Cen:{insp.profundidadCen} Ext:{insp.profundidadExt}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingInsp((p) => p?.fecha === insp.fecha ? null : { fecha: insp.fecha, profundidadInt: insp.profundidadInt, profundidadCen: insp.profundidadCen, profundidadExt: insp.profundidadExt })}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                                  style={editingInsp?.fecha === insp.fecha
                                    ? { background: "#1E76B6", color: "white" }
                                    : { background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
                                >
                                  {editingInsp?.fecha === insp.fecha ? "Editando" : "Editar"}
                                </button>
                              </div>
                              {editingInsp?.fecha === insp.fecha && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                  {(["profundidadInt", "profundidadCen", "profundidadExt"] as const).map((field) => (
                                    <div key={field}>
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                                        {field === "profundidadInt" ? "Interior" : field === "profundidadCen" ? "Central" : "Exterior"}
                                      </label>
                                      <input
                                        type="number"
                                        value={editingInsp[field]}
                                        onChange={(e) => setEditingInsp((p) => p ? { ...p, [field]: parseFloat(e.target.value) || 0 } : p)}
                                        className="w-full px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                                        style={{ border: "1.5px solid rgba(30,118,182,0.3)", color: "#0A183A" }}
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

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditMode(false); setEditingInsp(null); setEditingCosto(null); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                      style={{ background: "rgba(10,24,58,0.06)", color: "#0A183A" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleEditSubmit}
                      disabled={editLoading}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                    >
                      {editLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
                        : "Guardar Cambios"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── KPI summary ──────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Marca",     value: selectedTire.marca,     variant: "primary" },
                  { label: "Posición",  value: String(selectedTire.posicion), variant: "secondary" },
                  { label: "Dimensión", value: selectedTire.dimension,  variant: "accent" },
                  { label: "Eje",       value: selectedTire.eje,        variant: "accent" },
                ].map(({ label, value, variant }) => {
                  const bgs: Record<string, string> = {
                    primary:   "linear-gradient(135deg, #0A183A, #173D68)",
                    secondary: "linear-gradient(135deg, #173D68, #1E76B6)",
                    accent:    "linear-gradient(135deg, #1E76B6, #348CCB)",
                  };
                  return (
                    <div key={label} className="rounded-xl p-4" style={{ background: bgs[variant] }}>
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{label}</p>
                      <p className="font-black text-white mt-1 text-sm truncate">{value}</p>
                    </div>
                  );
                })}
              </div>

              {/* ── Life history ─────────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                  <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                    <Repeat className="w-4 h-4 text-[#1E76B6]" />
                  </div>
                  <h3 className="text-sm font-black text-[#0A183A] tracking-tight">Historial de Vida</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedTire.vida ?? []).map((v, idx) => {
                    const vl   = vidaLabel(v.valor);
                    const isLast = idx === (selectedTire.vida?.length ?? 0) - 1;
                    const cpkEntry = v.valor === "nueva" && selectedTire.primeraVida?.[0]?.cpk;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          background: vl.bg,
                          border: isLast ? `1.5px solid ${vl.dot}` : "1.5px solid transparent",
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: vl.dot }} />
                          <span className="text-xs font-bold" style={{ color: vl.dot }}>{vl.text}</span>
                          {isLast && <span className="text-[10px] font-bold text-white rounded px-1" style={{ background: vl.dot }}>Actual</span>}
                        </div>
                        <p className="text-[10px] text-gray-500">{new Date(v.fecha).toLocaleDateString("es-CO")}</p>
                        {cpkEntry && <p className="text-[10px] font-bold mt-0.5" style={{ color: vl.dot }}>CPK: {cpkEntry.toFixed(2)}</p>}
                      </div>
                    );
                  })}
                  {!selectedTire.vida?.length && <p className="text-xs text-gray-400 italic">Sin historial de vida registrado.</p>}
                </div>
              </div>

              {/* ── Details 2-col ─────────────────────────────────────────── */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Characteristics */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                      <TrendingUp className="w-4 h-4 text-[#1E76B6]" />
                    </div>
                    <h4 className="text-xs font-black text-[#0A183A] uppercase tracking-wide">Características</h4>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
                    {[
                      { k: "Diseño",           v: selectedTire.diseno },
                      { k: "Prof. Inicial",    v: `${selectedTire.profundidadInicial} mm` },
                      { k: "Km Recorridos",    v: `${selectedTire.kilometrosRecorridos.toLocaleString("es-CO")} km` },
                      { k: "Km Proyectados",   v: `${getProjectedKm(selectedTire)} km` },
                      ...(selectedTire.diasAcumulados ? [{ k: "Días rodando", v: String(selectedTire.diasAcumulados) }] : []),
                      ...(selectedTire.fechaInstalacion ? [{ k: "Instalación", v: new Date(selectedTire.fechaInstalacion).toLocaleDateString("es-CO") }] : []),
                      ...(selectedTire.healthScore != null ? [{ k: "Health Score", v: `${selectedTire.healthScore}/100` }] : []),
                    ].map(({ k, v }, i) => (
                      <div key={k} className={`flex justify-between items-center px-4 py-2.5 text-xs ${i % 2 === 0 ? "" : ""}`}
                        style={{ background: i % 2 === 0 ? "rgba(10,24,58,0.02)" : "white", borderBottom: "1px solid rgba(52,140,203,0.08)" }}>
                        <span className="font-bold text-gray-500">{k}</span>
                        <span className="font-bold text-[#0A183A]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Costs */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                      <BarChart3 className="w-4 h-4 text-[#1E76B6]" />
                    </div>
                    <h4 className="text-xs font-black text-[#0A183A] uppercase tracking-wide">Análisis de Costos</h4>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
                    {(selectedTire.costos ?? selectedTire.costo ?? []).length > 0 ? (
                      (selectedTire.costos ?? selectedTire.costo ?? []).map((entry, idx) => (
                        <div key={idx} className="flex justify-between items-center px-4 py-2.5 text-xs"
                          style={{ background: idx % 2 === 0 ? "rgba(10,24,58,0.02)" : "white", borderBottom: "1px solid rgba(52,140,203,0.08)" }}>
                          <span className="font-bold text-gray-500">{new Date(entry.fecha).toLocaleDateString("es-CO")}</span>
                          <span className="font-black text-[#0A183A]">${entry.valor.toLocaleString("es-CO")}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-gray-400 italic">Sin registros de costo.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Inspections table ────────────────────────────────────── */}
              {(selectedTire.inspecciones ?? []).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                    <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                      <Calendar className="w-4 h-4 text-[#1E76B6]" />
                    </div>
                    <h3 className="text-sm font-black text-[#0A183A] tracking-tight">Historial de Inspecciones</h3>
                  </div>
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr style={{ background: "rgba(10,24,58,0.03)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                          {["Fecha", "Int", "Cen", "Ext", "CPK", "CPK Proy.", "CPT", "CPT Proy.", "Km", "Imagen", ""].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-black text-[#0A183A] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...(selectedTire.inspecciones ?? [])]
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .map((insp, idx) => (
                            <tr key={idx} className="transition-colors hover:bg-blue-50/30"
                              style={{ borderBottom: "1px solid rgba(52,140,203,0.08)" }}>
                              <td className="px-3 py-2.5 font-medium text-[#0A183A] whitespace-nowrap">{new Date(insp.fecha).toLocaleDateString("es-CO")}</td>
                              {[insp.profundidadInt, insp.profundidadCen, insp.profundidadExt].map((d, di) => (
                                <td key={di} className="px-3 py-2.5">
                                  <span className="px-1.5 py-0.5 rounded-md font-bold" style={{ background: depthBg(d), color: depthColor(d) }}>
                                    {d}mm
                                  </span>
                                </td>
                              ))}
                              <td className="px-3 py-2.5 font-medium text-[#0A183A]">{insp.cpk != null ? `$${Number(insp.cpk).toFixed(2)}` : "N/A"}</td>
                              <td className="px-3 py-2.5 font-medium text-[#0A183A]">{insp.cpkProyectado != null ? `$${Number(insp.cpkProyectado).toFixed(2)}` : "N/A"}</td>
                              <td className="px-3 py-2.5 font-medium text-[#0A183A]">{insp.cpt != null ? `$${Number(insp.cpt).toFixed(2)}` : "N/A"}</td>
                              <td className="px-3 py-2.5 font-medium text-[#0A183A]">{insp.cptProyectado != null ? `$${Number(insp.cptProyectado).toFixed(2)}` : "N/A"}</td>
                              <td className="px-3 py-2.5 font-medium text-[#0A183A]">{insp.kilometrosEstimados?.toLocaleString("es-CO") ?? "N/A"}</td>
                              <td className="px-3 py-2.5">
                                {insp.imageUrl
                                  ? <a href={insp.imageUrl} target="_blank" rel="noopener noreferrer">
                                      <img src={insp.imageUrl} alt="insp" className="w-10 h-10 rounded-lg object-cover hover:scale-105 transition-transform" style={{ border: "1px solid rgba(52,140,203,0.2)" }} />
                                    </a>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  onClick={() => handleDeleteInspection(insp.fecha)}
                                  className="p-1 rounded-lg transition-colors hover:bg-red-50 text-red-400 hover:text-red-600"
                                >
                                  <Trash2Icon className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Close */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={closeModal}
                  className="px-5 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{ background: "rgba(10,24,58,0.06)", color: "#0A183A" }}
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

export default BuscarDist;