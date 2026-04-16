"use client";

import React, { useEffect, useState, Suspense } from "react";
const FastModeDesechos = React.lazy(() => import("../../dashboard/desechosDist/FastModeDesechos"));
import {
  Search, X, AlertTriangle, Clock, DollarSign,
  Loader2, CheckCircle, Layers,
  Camera,
  MapPin,
} from "lucide-react";
import { DESECHO_CAUSALES } from "@/lib/desechoCausales";

// =============================================================================
// Types
// =============================================================================

export type VidaEntry = { fecha: string; valor: string };

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  // vida is now TireEvento records with notas containing the vida value
  vida: VidaEntry[];          
  posicion?: string | number;
  diseno?: string;
  profundidadInicial?: number;
  desechos?: {
    causales:             string;
    milimetrosDesechados: number;
    remanente:            number;   // read-only — computed by backend
    fecha:                string;   // backend also writes this
  } | null;
};

export type Vehicle = { id: string; placa: string; tipovhc?: string };

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

const VIDA_ORDER = ["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"] as const;

const VIDA_LABELS: Record<string, string> = {
  nueva: "Nueva",
  reencauche1: "Reencauche 1",
  reencauche2: "Reencauche 2",
  reencauche3: "Reencauche 3",
  fin: "Fin de vida",
};

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

function currentVida(tire: Tire): string {
  const vidaEventos = (tire.eventos ?? []).filter(
    (e: any) => VIDA_ORDER.includes(e.notas?.toLowerCase())
  );
  if (!vidaEventos.length) return "nueva";
  return vidaEventos[vidaEventos.length - 1].notas.toLowerCase();
}

function nextOptions(current: string): string[] {
  const idx = VIDA_ORDER.indexOf(current as typeof VIDA_ORDER[number]);
  if (idx < 0 || idx >= VIDA_ORDER.length - 1) return [];
  const opts: string[] = [];
  if (idx < 3) opts.push(VIDA_ORDER[idx + 1]); // next reencauche
  if (VIDA_ORDER[idx + 1] !== "fin") opts.push("fin"); // always allow fin
  else if (opts.length === 0) opts.push("fin");
  return opts;
}

function vidaBadgeStyle(vida: string): React.CSSProperties {
  if (vida === "fin")         return { background: "rgba(220,38,38,0.1)",  color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)" };
  if (vida === "nueva")       return { background: "rgba(22,163,74,0.1)",  color: "#16a34a", border: "1px solid rgba(22,163,74,0.25)" };
  return                             { background: "rgba(30,118,182,0.1)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.25)" };
}

// =============================================================================
// Design-system micro-components
// =============================================================================

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

function CardTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <div>
        <p className="text-sm font-black text-[#0A183A] leading-none">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl text-sm font-medium text-[#0A183A] bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = { border: "1.5px solid rgba(52,140,203,0.2)" };

// =============================================================================
// Main component
// =============================================================================

const VidaPage: React.FC = () => {
  const [viewMode, setViewMode]         = useState<"vida" | "desechos">("vida");
  const [searchTerm, setSearchTerm]     = useState("");
  const [vehicle,    setVehicle]        = useState<Vehicle | null>(null);
  const [tires,      setTires]          = useState<Tire[]>([]);
  const [error,      setError]          = useState("");
  const [loading,    setLoading]        = useState(false);

  // Modal state
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [selectedVida, setSelectedVida] = useState("");
  const [bandaValue,   setBandaValue]   = useState("");
  const [bandaMarcaValue, setBandaMarcaValue] = useState("");
  const [costValue,    setCostValue]    = useState("");
  const [profValue,    setProfValue]    = useState("");
  const [causalValue,  setCausalValue]  = useState("");
  const [causalOtroValue, setCausalOtroValue] = useState("");
  const [mmValue,      setMmValue]      = useState("");
  const [modalError,   setModalError]   = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [desechoImages, setDesechoImages] = useState<string[]>([]);
  const [proveedorQuery,    setProveedorQuery]    = useState("");
  const [proveedorResults,  setProveedorResults]  = useState<Array<{id: string; name: string}>>([]);
  const [selectedProveedor, setSelectedProveedor] = useState<{id: string | null; name: string} | null>(null);
  const [proveedorLoading,  setProveedorLoading]  = useState(false);
  const [showProvDropdown,  setShowProvDropdown]  = useState(false);
  // -- Search -----------------------------------------------------------------
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setVehicle(null); setTires([]);
    if (!searchTerm.trim()) { setError("Por favor ingrese la placa del vehículo."); return; }

    setLoading(true);
    try {
      const companyId = localStorage.getItem("companyId") ?? "";
      const vRes = await authFetch(
        `${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(searchTerm.trim().toLowerCase())}${companyId ? `&companyId=${companyId}` : ""}`
      );
      if (!vRes.ok) throw new Error("Vehículo no encontrado");
      const vData: Vehicle = await vRes.json();
      setVehicle(vData);

      const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${vData.id}`);
      if (!tRes.ok) throw new Error("Error al obtener las llantas");
      const tData: Tire[] = await tRes.json();
      tData.sort((a, b) => (Number(a.posicion) || Infinity) - (Number(b.posicion) || Infinity));
      setTires(tData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('[data-proveedor-field]')) {
      setShowProvDropdown(false);
    }
  }
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, []);

  // -- Open modal -------------------------------------------------------------
  function openModal(tire: Tire) {
    const opts = nextOptions(currentVida(tire));
    setSelectedTire(tire);
    setModalError("");
    setCostValue(""); setCausalValue(""); setCausalOtroValue(""); setMmValue("");
    setBandaValue(tire.diseno ?? "");
    setProfValue(tire.profundidadInicial && tire.profundidadInicial > 0 ? String(tire.profundidadInicial) : "");
    setSelectedVida(opts[0] ?? "");
    if (!opts.length) setModalError("Esta llanta ya está en estado 'fin'. No se puede actualizar.");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false); setSelectedTire(null);
    setSelectedVida(""); setBandaValue(""); setBandaMarcaValue(""); setCostValue("");
    setProfValue(""); setCausalValue(""); setCausalOtroValue(""); setMmValue("");
    setModalError("");
    setDesechoImages([]);
    setProveedorQuery(""); setSelectedProveedor(null); setShowProvDropdown(false);
  }

  async function searchProveedores(q: string) {
  if (!q.trim()) { setProveedorResults([]); setShowProvDropdown(false); return; }
  setProveedorLoading(true);
  try {
    const companyId = (() => {
      try { return JSON.parse(atob(localStorage.getItem("token")!.split(".")[1])).companyId; }
      catch { return localStorage.getItem("companyId") ?? ""; }
    })();
    const res = await authFetch(
      `${API_BASE}/companies/search/by-name?q=${encodeURIComponent(q)}&distributorsOnly=true${companyId ? `&exclude=${companyId}` : ""}`
    );
    if (!res.ok) throw new Error();
    const data: Array<{id: string; name: string}> = await res.json();
    setProveedorResults(data);
    setShowProvDropdown(true);
  } catch {
    setProveedorResults([]);
    setShowProvDropdown(true); // still show "add custom" option
  } finally {
    setProveedorLoading(false);
  }
}

  // -- Submit vida update -----------------------------------------------------
  async function handleUpdate() {
    if (!selectedTire) return;
    if (!selectedVida) return setModalError("Seleccione un valor de vida.");
    if (!bandaValue.trim()) return setModalError("Ingrese la banda/diseño.");

    const body: Record<string, unknown> = { valor: selectedVida, banda: bandaValue.trim() };

    if (selectedVida.startsWith("reencauche")) {
      const n = parseFloat(costValue);
      if (isNaN(n) || n <= 0) return setModalError("Ingrese un costo válido (mayor a 0).");
      body.costo = n;
      if (selectedProveedor) body.proveedor = selectedProveedor.name;
      if (bandaMarcaValue.trim()) body.bandaMarca = bandaMarcaValue.trim();
    }

    if (selectedVida !== "fin") {
      const p = parseFloat(profValue);
      if (!profValue || isNaN(p) || p <= 0) return setModalError("Ingrese una profundidad inicial válida.");
      body.profundidadInicial = p;
    }

    if (selectedVida === "fin") {
      const mm = parseFloat(mmValue);
      if (!causalValue) return setModalError("Seleccione la causa de descarte.");
      if (causalValue === "otro" && !causalOtroValue.trim())
        return setModalError("Describa la causa de descarte.");
      if (isNaN(mm) || mm < 0) return setModalError("Ingrese los milímetros finales válidos.");
      body.desechos = {
        causales: causalValue === "otro" ? causalOtroValue.trim() : causalValue,
        milimetrosDesechados: mm,
      };
      body.imageUrls = desechoImages;
    }

    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/tires/${selectedTire.id}/vida`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error desconocido" }));
        throw new Error(err.message ?? "Error desconocido");
      }
      const updated: Tire = await res.json();
      setTires((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
            .sort((a, b) => (Number(a.posicion) || Infinity) - (Number(b.posicion) || Infinity))
      );
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={{ background: "white" }}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          {(["vida", "desechos"] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: viewMode === m ? "linear-gradient(135deg, #0A183A, #173D68)" : "white",
                color: viewMode === m ? "#fff" : "#173D68",
                border: viewMode === m ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)",
              }}>
              {m === "vida" ? "Cambiar Vida" : "Desecho Rapido"}
            </button>
          ))}
        </div>

        {viewMode === "desechos" ? (
          <Suspense fallback={<div className="py-10 text-center text-[#348CCB] text-sm">Cargando...</div>}>
            <FastModeDesechos onDone={() => setViewMode("vida")} />
          </Suspense>
        ) : (
        <>

        {/* -- Error banner ------------------------------------------------ */}
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* -- Search card ------------------------------------------------- */}
        <Card className="p-4 sm:p-5">
          <CardTitle icon={Search} title="Buscar Vehículo" sub="Ingrese la placa para cargar las llantas" />
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej. abc-123"
                className={`${inputCls} pl-10`} style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando…</>
                : <><Search className="w-4 h-4" /> Buscar</>
              }
            </button>
          </form>
        </Card>

        {/* -- Vehicle info ------------------------------------------------ */}
        {vehicle && (
          <Card className="p-4 sm:p-5">
            <CardTitle icon={CheckCircle} title="Vehículo Encontrado" />
            <div
              className="flex flex-wrap gap-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.12)" }}
            >
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Placa</p>
                <p className="text-sm font-black text-[#0A183A]">{vehicle.placa.toUpperCase()}</p>
              </div>
              {vehicle.tipovhc && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tipo</p>
                  <p className="text-sm font-black text-[#0A183A]">{vehicle.tipovhc}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Llantas</p>
                <p className="text-sm font-black text-[#0A183A]">{tires.length}</p>
              </div>
            </div>
          </Card>
        )}

        {/* -- Tire grid --------------------------------------------------- */}
        {tires.length > 0 && (
          <div>
            <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide mb-3">
              Llantas — {tires.length} encontrada{tires.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tires.map((tire) => {
                const vida = currentVida(tire);
                const opts = nextOptions(vida);
                return (
                  <Card key={tire.id} className="overflow-hidden">
                    {/* top stripe */}
                    <div
                      className="h-1"
                      style={{ background: vida === "fin" ? "#DC2626" : vida === "nueva" ? "#16a34a" : "#1E76B6" }}
                    />
                    <div className="p-4">
                      {/* header row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0A183A] truncate">{tire.placa}</p>
                          <p className="text-[10px] text-gray-400">{tire.marca}</p>
                        </div>
                        <span
                          className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{ background: "rgba(10,24,58,0.06)", color: "#173D68" }}
                        >
                          Pos. {tire.posicion ?? "—"}
                        </span>
                      </div>

                      {/* vida badge */}
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-black"
                          style={vidaBadgeStyle(vida)}
                        >
                          {VIDA_LABELS[vida] ?? vida}
                        </span>
                        {tire.diseno && (
                          <span className="text-[10px] text-gray-400 truncate">{tire.diseno}</span>
                        )}
                      </div>

                      {/* update button */}
                      <button
                        onClick={() => openModal(tire)}
                        disabled={opts.length === 0}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: opts.length === 0 ? "rgba(10,24,58,0.2)" : "linear-gradient(135deg, #173D68, #1E76B6)" }}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {opts.length === 0 ? "Fin de vida" : "Actualizar Vida"}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      {/* -- Modal ----------------------------------------------------------- */}
      {showModal && selectedTire && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,24,58,0.5)" }}
        >
          <Card className="w-full max-w-md">
            {/* Modal header */}
            <div
              className="px-5 py-4 flex items-center justify-between rounded-t-2xl"
              style={{ background: "linear-gradient(135deg, #0A183A, #173D68)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-black text-white">Actualizar Vida</p>
              </div>
              <button onClick={closeModal}>
                <X className="w-4 h-4 text-white/70 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tire summary */}
              <div
                className="px-4 py-3 rounded-xl text-xs space-y-1"
                style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.12)" }}
              >
                <p><span className="font-bold text-[#0A183A]">Placa:</span> <span className="text-[#173D68]">{selectedTire.placa}</span></p>
                <p><span className="font-bold text-[#0A183A]">Marca:</span> <span className="text-[#173D68]">{selectedTire.marca}</span></p>
                <p><span className="font-bold text-[#0A183A]">Posición:</span> <span className="text-[#173D68]">{selectedTire.posicion ?? "—"}</span></p>
                <p>
                  <span className="font-bold text-[#0A183A]">Vida actual:</span>{" "}
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-black"
                    style={vidaBadgeStyle(currentVida(selectedTire))}
                  >
                    {VIDA_LABELS[currentVida(selectedTire)] ?? currentVida(selectedTire)}
                  </span>
                </p>
              </div>

              {/* Modal error */}
              {modalError && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {modalError}
                </div>
              )}

              {/* Banda / diseño */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Banda / Diseño</label>
                <input
                  type="text" value={bandaValue}
                  onChange={(e) => setBandaValue(e.target.value)}
                  placeholder="Ej. REGIONAL RHS"
                  className={inputCls} style={inputStyle}
                />
              </div>

              {/* Marca de la banda — only on retread transitions.
                  Optional: empty means backend copies banda into marca. */}
              {selectedVida.startsWith("reencauche") && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Marca de la Banda</label>
                  <input
                    type="text" value={bandaMarcaValue}
                    onChange={(e) => setBandaMarcaValue(e.target.value)}
                    placeholder={bandaValue ? `Ej. Continental (vacío = "${bandaValue}")` : "Ej. Continental"}
                    className={inputCls} style={inputStyle}
                  />
                </div>
              )}

              {/* Nuevo valor de vida */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Nuevo Valor de Vida</label>
                <select
                  value={selectedVida}
                  onChange={(e) => setSelectedVida(e.target.value)}
                  className={inputCls} style={inputStyle}
                >
                  {nextOptions(currentVida(selectedTire)).map((opt) => (
                    <option key={opt} value={opt}>{VIDA_LABELS[opt] ?? opt}</option>
                  ))}
                </select>
              </div>

              {/* Costo (reencauche only) */}
              {selectedVida.startsWith("reencauche") && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Costo del Reencauche (COP)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="number" step="0.01" value={costValue}
                      onChange={(e) => setCostValue(e.target.value)}
                      placeholder="0.00"
                      className={`${inputCls} pl-10`} style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Proveedor (reencauche only) */}
              {selectedVida.startsWith("reencauche") && (
                <div className="relative space-y-1.5" data-proveedor-field>
                  <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">
                    Proveedor del Reencauche
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={proveedorQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProveedorQuery(v);
                        setSelectedProveedor(null);
                        searchProveedores(v);
                      }}
                      onFocus={() => proveedorQuery && setShowProvDropdown(true)}
                      placeholder="Buscar distribuidor o escribir nombre..."
                      className={`${inputCls} pl-10`}
                      style={inputStyle}
                      autoComplete="off"
                    />
                    {proveedorLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E76B6] animate-spin" />
                    )}
                  </div>

                  {/* Selected badge */}
                  {selectedProveedor && (
                    <div
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.25)", color: "#1E76B6" }}
                    >
                      <span>✓ {selectedProveedor.name}{selectedProveedor.id === null ? " (personalizado)" : ""}</span>
                      <button type="button" onClick={() => { setSelectedProveedor(null); setProveedorQuery(""); }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Dropdown */}
                  {showProvDropdown && !selectedProveedor && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                      style={{ background: "white", border: "1px solid rgba(52,140,203,0.25)" }}
                    >
                      {proveedorResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm text-[#0A183A] hover:bg-[#F0F7FF] transition-colors"
                          onClick={() => { setSelectedProveedor(r); setProveedorQuery(r.name); setShowProvDropdown(false); }}
                        >
                          {r.name}
                        </button>
                      ))}
                      {proveedorQuery.trim() && (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm font-semibold border-t hover:bg-[#F0F7FF] transition-colors"
                          style={{ color: "#1E76B6", borderColor: "rgba(52,140,203,0.15)" }}
                          onClick={() => { setSelectedProveedor({ id: null, name: proveedorQuery.trim() }); setShowProvDropdown(false); }}
                        >
                          + Usar "{proveedorQuery.trim()}" como proveedor
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Profundidad inicial (not fin) */}
              {selectedVida !== "fin" && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Profundidad Inicial (mm)</label>
                  <input
                    type="number" step="0.1" min="0" value={profValue}
                    onChange={(e) => setProfValue(e.target.value)}
                    placeholder="Ej. 12.0"
                    className={inputCls} style={inputStyle}
                  />
                </div>
              )}

              {/* Fin fields */}
              {selectedVida === "fin" && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Causal del Descarte</label>
                    <select
                      value={causalValue}
                      onChange={(e) => setCausalValue(e.target.value)}
                      className={inputCls} style={inputStyle}
                    >
                      <option value="">Seleccione una causa…</option>
                      {DESECHO_CAUSALES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {causalValue === "otro" && (
                      <input
                        type="text" value={causalOtroValue}
                        onChange={(e) => setCausalOtroValue(e.target.value)}
                        placeholder="Describa la causa"
                        className={inputCls} style={inputStyle}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Milímetros Finales</label>
                    <input
                      type="number" step="0.1" value={mmValue}
                      onChange={(e) => setMmValue(e.target.value)}
                      placeholder="Ej. 3.5"
                      className={inputCls} style={inputStyle}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">
                      Fotos del Descarte (máx. 3)
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {desechoImages.map((img, i) => (
                        <div
                          key={i}
                          className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                          style={{ border: "1px solid rgba(52,140,203,0.3)" }}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setDesechoImages(prev => prev.filter((_, j) => j !== i))}
                            className="absolute top-0.5 right-0.5 rounded-full p-0.5"
                            style={{ background: "rgba(255,255,255,0.85)" }}
                          >
                            <X className="w-3 h-3 text-[#0A183A]" />
                          </button>
                        </div>
                      ))}

                      {desechoImages.length < 3 && (
                        <label
                          className="w-20 h-20 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-colors hover:opacity-80 flex-shrink-0"
                          style={{ border: "1.5px dashed rgba(52,140,203,0.4)", background: "rgba(10,24,58,0.02)" }}
                        >
                          <Camera className="w-5 h-5 text-[#348CCB]" />
                          <span className="text-[10px] text-[#348CCB] mt-1 font-bold">Agregar</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () =>
                                setDesechoImages(prev => [...prev, reader.result as string]);
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: "rgba(10,24,58,0.05)", color: "#0A183A", border: "1px solid rgba(52,140,203,0.2)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving || !nextOptions(currentVida(selectedTire)).length}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                    : "Actualizar"
                  }
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
        </>
        )}
      </div>
    </div>
  );
};

export default VidaPage;