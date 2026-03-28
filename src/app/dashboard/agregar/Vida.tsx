"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  AlertCircle,
  RefreshCw,
  Truck,
  Circle,
  Tag,
  Layers,
  Gauge,
  DollarSign,
  MapPin,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Trash2,
  Camera,
} from "lucide-react";

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): HeadersInit {
  let token: string | null = null;
  try { token = localStorage.getItem("token"); } catch { /* ignore */ }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// =============================================================================
// Types
// =============================================================================

type VidaEntry = { fecha: string; valor: string };

type Tire = {
  id: string;
  placa: string;
  marca: string;
  vida?: VidaEntry[];
  eventos?: Array<{ tipo: string; notas?: string; fecha: string; metadata?: any }>;
  posicion?: string | number;
  diseno?: string;
  profundidadInicial?: number;
  desechos?: {
    causales: string;
    milimetrosDesechados: number;
    remanente: number;
  };
};

type Vehicle = {
  id: string;
  placa: string;
  tipovhc?: string;
};

// =============================================================================
// Helpers
// =============================================================================

const VIDA_SEQUENCE = ["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"] as const;
type VidaValue = typeof VIDA_SEQUENCE[number];

const VIDA_LABELS: Record<string, string> = {
  nueva:       "Nueva",
  reencauche1: "1° Reencauche",
  reencauche2: "2° Reencauche",
  reencauche3: "3° Reencauche",
  fin:         "Fin de Vida",
};

const VIDA_COLORS: Record<string, string> = {
  nueva:       "rgba(30,118,182,0.12)",
  reencauche1: "rgba(23,61,104,0.12)",
  reencauche2: "rgba(10,24,58,0.12)",
  reencauche3: "rgba(52,140,203,0.15)",
  fin:         "rgba(10,24,58,0.08)",
};

function getCurrentVida(tire: Tire): string {
  // Try events first (new backend model)
  if (Array.isArray(tire.eventos)) {
    const vidaEvents = tire.eventos
      .filter((e) => e.notas && VIDA_SEQUENCE.includes(e.notas as VidaValue))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    if (vidaEvents.length > 0) return vidaEvents[vidaEvents.length - 1].notas!;
  }
  // Fallback to vida array
  if (Array.isArray(tire.vida) && tire.vida.length > 0) {
    return tire.vida[tire.vida.length - 1].valor.toLowerCase();
  }
  return "nueva";
}

function getNextVidaOptions(current: string): VidaValue[] {
  const idx = VIDA_SEQUENCE.indexOf(current as VidaValue);
  const i   = idx === -1 ? 0 : idx;
  if (i === 0) return ["reencauche1", "fin"];
  if (i === 1) return ["reencauche2", "fin"];
  if (i === 2) return ["reencauche3", "fin"];
  if (i === 3) return ["fin"];
  return [];
}

// =============================================================================
// Shared design primitives
// =============================================================================

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

const selectCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all appearance-none";

function FieldLabel({ icon: Icon, label, required }: { icon: React.ElementType; label: string; required?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#173D68] uppercase tracking-wider mb-1.5">
      <Icon className="w-3.5 h-3.5 text-[#1E76B6]" />
      {label}
      {required && <span className="text-[#1E76B6] font-bold">*</span>}
    </label>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronRight className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#1E76B6] rotate-90" />
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.18)" }} />
      <span className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-[0.15em] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.18)" }} />
    </div>
  );
}

function Toast({ type, message, onDismiss }: { type: "error" | "success"; message: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-4"
      style={{
        background: type === "error" ? "rgba(10,24,58,0.06)" : "rgba(30,118,182,0.08)",
        border: type === "error" ? "1px solid rgba(10,24,58,0.2)" : "1px solid rgba(30,118,182,0.3)",
      }}
    >
      {type === "error"
        ? <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
        : <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0 mt-0.5" />}
      <span className="flex-1 text-[#0A183A]">{message}</span>
      <button onClick={onDismiss} className="text-[#348CCB] hover:text-[#0A183A] transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.18)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Vida badge
// =============================================================================

function VidaBadge({ vida }: { vida: string }) {
  const label = VIDA_LABELS[vida] ?? vida;
  const bg    = VIDA_COLORS[vida]  ?? "rgba(52,140,203,0.1)";
  const isFin = vida === "fin";

  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-lg"
      style={{
        background: bg,
        color: isFin ? "#0A183A" : "#1E76B6",
        border: `1px solid ${isFin ? "rgba(10,24,58,0.15)" : "rgba(30,118,182,0.2)"}`,
      }}
    >
      {label}
    </span>
  );
}

// =============================================================================
// Tire card
// =============================================================================

function TireCard({ tire, onUpdate }: { tire: Tire; onUpdate: (t: Tire) => void }) {
  const currentVida = getCurrentVida(tire);
  const nextOptions = getNextVidaOptions(currentVida);
  const isFin       = currentVida === "fin";

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: "1px solid rgba(52,140,203,0.18)",
        boxShadow: "0 2px 12px rgba(10,24,58,0.04)",
        opacity: isFin ? 0.7 : 1,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: isFin
            ? "linear-gradient(135deg, #0A183A 0%, #0A183A 100%)"
            : "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <Circle className="w-3.5 h-3.5 text-white/60" />
          <span
            className="font-black tracking-widest text-white"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "15px", letterSpacing: "0.1em" }}
          >
            {tire.placa.toUpperCase()}
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
        >
          Pos. {tire.posicion ?? "—"}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1" style={{ background: "white" }}>
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div>
            <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">Marca</p>
            <p className="text-sm font-semibold text-[#0A183A]">{tire.marca}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">Diseño</p>
            <p className="text-sm font-semibold text-[#0A183A] truncate">{tire.diseno || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">Prof. Inicial</p>
            <p className="text-sm font-semibold text-[#0A183A]">
              {tire.profundidadInicial ? `${tire.profundidadInicial} mm` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">Vida Actual</p>
            <VidaBadge vida={currentVida} />
          </div>
        </div>

        {/* Desechos info if fin */}
        {isFin && tire.desechos && (
          <div
            className="rounded-xl px-3 py-2 text-xs"
            style={{ background: "rgba(10,24,58,0.04)", border: "1px solid rgba(10,24,58,0.1)" }}
          >
            <p className="font-bold text-[#0A183A] mb-1 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Desechado
            </p>
            <p className="text-[#348CCB]">Causal: {tire.desechos.causales}</p>
            <p className="text-[#348CCB]">Remanente: {tire.desechos.remanente} mm</p>
          </div>
        )}

        {/* CTA */}
        {!isFin && nextOptions.length > 0 && (
          <button
            onClick={() => onUpdate(tire)}
            className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar Vida
          </button>
        )}
        {isFin && (
          <div
            className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(10,24,58,0.06)", color: "#173D68" }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Llanta desechada
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Update modal
// =============================================================================

function UpdateModal({
  tire,
  onClose,
  onSuccess,
}: {
  tire: Tire;
  onClose: () => void;
  onSuccess: (updated: Tire) => void;
}) {
  const currentVida = getCurrentVida(tire);
  const nextOptions = getNextVidaOptions(currentVida);

  const [selectedVida,    setSelectedVida]    = useState<string>(nextOptions[0] ?? "");
  const [bandaValue,      setBandaValue]      = useState(tire.diseno ?? "");
  const [costValue,       setCostValue]       = useState("");
  const [profValue,       setProfValue]       = useState(
    tire.profundidadInicial && tire.profundidadInicial > 0 ? String(tire.profundidadInicial) : ""
  );
  const [causalValue,     setCausalValue]     = useState("");
  const [milimetrosValue, setMilimetrosValue] = useState("");
  const [modalError,      setModalError]      = useState("");
  const [saving,          setSaving]          = useState(false);
  const [desechoImages, setDesechoImages] = useState<string[]>([]);
  const [proveedorQuery,    setProveedorQuery]    = useState("");
  const [proveedorResults,  setProveedorResults]  = useState<Array<{id:string; name:string}>>([]);
  const [selectedProveedor, setSelectedProveedor] = useState<{id:string|null; name:string} | null>(null);
  const [proveedorLoading,  setProveedorLoading]  = useState(false);
  const [showDropdown,      setShowDropdown]      = useState(false);

  useEffect(() => {
      function handleClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-proveedor-field]')) {
          setShowDropdown(false);
        }
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, []);

  const isReencauche = selectedVida.startsWith("reencauche");
  const isFin        = selectedVida === "fin";

  async function searchProveedores(q: string) {
  if (!q.trim()) { setProveedorResults([]); setShowDropdown(false); return; }
  setProveedorLoading(true);
  try {
    const companyId = (() => { try { return JSON.parse(atob(localStorage.getItem("token")!.split(".")[1])).companyId; } catch { return ""; } })();
    const res = await fetch(
      `${API_BASE}/companies/search/by-name?q=${encodeURIComponent(q)}&distributorsOnly=true${companyId ? `&exclude=${companyId}` : ""}`,
      { headers: authHeaders() }
    );
    if (!res.ok) throw new Error();
    const data: Array<{id: string; name: string}> = await res.json();
    setProveedorResults(data);
    setShowDropdown(true);
  } catch {
    setProveedorResults([]);
    setShowDropdown(true); // still show "add custom" option
  } finally {
    setProveedorLoading(false);
  }
}

  async function handleSubmit() {
    setModalError("");

    if (!selectedVida)          return setModalError("Seleccione un valor de vida");
    if (!bandaValue.trim())     return setModalError("Ingrese la banda/diseño");

    if (isReencauche) {
      const n = parseFloat(costValue);
      if (isNaN(n) || n <= 0)   return setModalError("Ingrese un costo válido mayor a 0");
    }

    if (!isFin) {
      const p = parseFloat(profValue);
      if (!profValue || isNaN(p) || p <= 0) return setModalError("Ingrese una profundidad inicial válida");
    }

    if (isFin) {
      if (!causalValue.trim())  return setModalError("Ingrese la causa del descarte");
      const mm = parseFloat(milimetrosValue);
      if (isNaN(mm) || mm < 0)  return setModalError("Ingrese los milímetros finales válidos");
    }

    const body: Record<string, unknown> = {
      valor: selectedVida,
      banda: bandaValue.trim(),
    };

    if (isReencauche)         body.costo             = parseFloat(costValue);
    if (isReencauche && selectedProveedor)   body.proveedor          = selectedProveedor.name;
    if (!isFin)               body.profundidadInicial = parseFloat(profValue);
    if (isFin) {
      const mm      = parseFloat(milimetrosValue);
      body.desechos = {
        causales:             causalValue.trim(),
        milimetrosDesechados: mm,
      };
      body.imageUrls = desechoImages;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/tires/${tire.id}/vida`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al actualizar vida");
      }
      const updated: Tire = await res.json();
      onSuccess(updated);
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
      >
        {/* Modal header */}
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-white" />
            <h2 className="font-semibold text-white text-sm tracking-wide uppercase">Actualizar Vida</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Tire summary */}
          <div
            className="rounded-2xl px-4 py-3 flex items-start justify-between"
            style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.15)" }}
          >
            <div>
              <p
                className="font-black tracking-widest text-[#0A183A]"
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "17px" }}
              >
                {tire.placa.toUpperCase()}
              </p>
              <p className="text-xs text-[#348CCB] mt-0.5">{tire.marca} · Pos. {tire.posicion ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider mb-1">Vida actual</p>
              <VidaBadge vida={currentVida} />
            </div>
          </div>

          {/* Modal error */}
          {modalError && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(10,24,58,0.06)", border: "1px solid rgba(10,24,58,0.2)" }}
            >
              <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0" />
              <span className="text-[#0A183A]">{modalError}</span>
            </div>
          )}

          {/* Banda / Diseño */}
          <div>
            <FieldLabel icon={Layers} label="Banda / Diseño" required />
            <input
              type="text"
              value={bandaValue}
              onChange={(e) => setBandaValue(e.target.value)}
              placeholder="ej: XDS2"
              className={inputCls}
            />
          </div>

          {/* Nueva vida */}
          <div>
            <FieldLabel icon={RefreshCw} label="Nueva Vida" required />
            <SelectWrapper>
              <select
                value={selectedVida}
                onChange={(e) => setSelectedVida(e.target.value)}
                className={selectCls}
              >
                {nextOptions.map((opt) => (
                  <option key={opt} value={opt}>{VIDA_LABELS[opt] ?? opt}</option>
                ))}
              </select>
            </SelectWrapper>
          </div>

          {/* Conditional fields */}
          {isReencauche && (
          <div className="relative" data-proveedor-field>
            <FieldLabel icon={MapPin} label="Proveedor del Reencauche" />
            <div className="relative">
              <input
                type="text"
                value={proveedorQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setProveedorQuery(v);
                  setSelectedProveedor(null);
                  searchProveedores(v);
                }}
                onFocus={() => proveedorQuery && setShowDropdown(true)}
                placeholder="Buscar distribuidor o escribir nombre..."
                className={inputCls}
                autoComplete="off"
              />
              {proveedorLoading && (
                <Loader2 className="absolute right-3 top-3 w-4 h-4 text-[#1E76B6] animate-spin" />
              )}
            </div>

            {/* Selected badge */}
            {selectedProveedor && (
              <div
                className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.25)", color: "#1E76B6" }}
              >
                <span>✓ {selectedProveedor.name}{selectedProveedor.id === null ? " (personalizado)" : ""}</span>
                <button type="button" onClick={() => { setSelectedProveedor(null); setProveedorQuery(""); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dropdown */}
            {showDropdown && !selectedProveedor && (
              <div
                className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                style={{ background: "white", border: "1px solid rgba(52,140,203,0.25)" }}
              >
                {proveedorResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-[#0A183A] hover:bg-[#F0F7FF] transition-colors"
                    onClick={() => {
                      setSelectedProveedor(r);
                      setProveedorQuery(r.name);
                      setShowDropdown(false);
                    }}
                  >
                    {r.name}
                  </button>
                ))}

                {/* Always show "use custom name" option */}
                {proveedorQuery.trim() && (
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold border-t transition-colors hover:bg-[#F0F7FF]"
                    style={{ color: "#1E76B6", borderColor: "rgba(52,140,203,0.15)" }}
                    onClick={() => {
                      setSelectedProveedor({ id: null, name: proveedorQuery.trim() });
                      setShowDropdown(false);
                    }}
                  >
                    + Usar "{proveedorQuery.trim()}" como proveedor
                  </button>
                )}

                {proveedorResults.length === 0 && !proveedorQuery.trim() && (
                  <p className="px-4 py-3 text-xs text-[#348CCB]">Escriba para buscar distribuidores</p>
                )}
              </div>
            )}
          </div>
          )}

          {/* Costo (reencauche only) */}
          {isReencauche && (
            <div>
              <FieldLabel icon={DollarSign} label="Costo del Reencauche (COP)" required />
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-3.5 h-3.5 text-[#1E76B6] pointer-events-none" />
                <input
                  type="number"
                  step="0.01"
                  value={costValue}
                  onChange={(e) => setCostValue(e.target.value)}
                  placeholder="0.00"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          )}

          {!isFin && (
            <div>
              <FieldLabel icon={Gauge} label="Profundidad Inicial (mm)" required />
              <input
                type="number"
                step="0.1"
                min="0"
                value={profValue}
                onChange={(e) => setProfValue(e.target.value)}
                placeholder="ej: 12.0"
                className={inputCls}
              />
            </div>
          )}

          {isFin && (
            <>
              <SectionDivider label="Datos de Descarte" />
              <div>
                <FieldLabel icon={Tag} label="Causal del descarte" required />
                <input
                  type="text"
                  value={causalValue}
                  onChange={(e) => setCausalValue(e.target.value)}
                  placeholder="ej: Pinchazo irreparable"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel icon={Gauge} label="Milímetros finales" required />
                <input
                  type="number"
                  step="0.1"
                  value={milimetrosValue}
                  onChange={(e) => setMilimetrosValue(e.target.value)}
                  placeholder="ej: 3.5"
                  className={inputCls}
                />
              </div>
              <div>
              <FieldLabel icon={Camera} label="Fotos del descarte (máx. 3)" />
              <div className="flex gap-2 flex-wrap mt-1">
                {desechoImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-xl overflow-hidden"
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
                    className="w-20 h-20 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-colors hover:bg-[#F0F7FF]"
                    style={{ border: "1.5px dashed rgba(52,140,203,0.4)" }}
                  >
                    <Camera className="w-5 h-5 text-[#348CCB]" />
                    <span className="text-[10px] text-[#348CCB] mt-1 font-medium">Agregar</span>
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
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#348CCB]/30 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || nextOptions.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                : <><CheckCircle2 className="w-4 h-4" /> Actualizar</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

// Lazy import to avoid circular deps
const FastModeDesechos = React.lazy(() => import("../../dashboard/desechos/FastModeDesechos"));

export default function VidaPage() {
  const [viewMode, setViewMode] = useState<"vida" | "desechos">("vida");
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicle,    setVehicle]    = useState<Vehicle | null>(null);
  const [tires,      setTires]      = useState<Tire[]>([]);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [modalTire,  setModalTire]  = useState<Tire | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setVehicle(null);
    setTires([]);

    const placa = searchTerm.trim().toUpperCase();
    if (!placa) { setError("Por favor ingrese la placa del vehículo"); return; }

    setLoading(true);
    try {
      const vRes = await fetch(
        `${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(placa.toLowerCase())}`,
        { headers: authHeaders() }
      );
      if (!vRes.ok) throw new Error("Vehículo no encontrado");
      const vData: Vehicle = await vRes.json();
      setVehicle(vData);

      const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vData.id}`, {
        headers: authHeaders(),
      });
      if (!tRes.ok) throw new Error("Error al obtener las llantas");
      const tData: Tire[] = await tRes.json();

      tData.sort((a, b) => {
        const posA = isNaN(Number(a.posicion)) ? Infinity : Number(a.posicion);
        const posB = isNaN(Number(b.posicion)) ? Infinity : Number(b.posicion);
        return posA - posB;
      });

      setTires(tData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function handleUpdateSuccess(updated: Tire) {
    setTires((prev) =>
      prev
        .map((t) => (t.id === updated.id ? updated : t))
        .sort((a, b) => (Number(a.posicion) || Infinity) - (Number(b.posicion) || Infinity))
    );
    setModalTire(null);
    setSuccess("Vida actualizada exitosamente");
  }

  return (
    <div style={{ background: "#ffffff" }}>
      <div className="max-w-5xl mx-auto space-y-4">

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
          {viewMode === "desechos" && (
            <span className="text-[10px] text-[#348CCB] ml-1">Deseche multiples llantas a la vez</span>
          )}
        </div>

        {viewMode === "desechos" ? (
          <React.Suspense fallback={<div className="py-10 text-center text-[#348CCB] text-sm">Cargando...</div>}>
            <FastModeDesechos onDone={() => setViewMode("vida")} />
          </React.Suspense>
        ) : (
        <>

        {/* Notifications */}
        {error   && <Toast type="error"   message={error}   onDismiss={() => setError("")}   />}
        {success && <Toast type="success" message={success} onDismiss={() => setSuccess("")} />}

        {/* Search card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "white",
            border: "1px solid rgba(52,140,203,0.18)",
            boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: "rgba(30,118,182,0.10)" }}>
              <Search className="w-4 h-4 text-[#1E76B6]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0A183A] leading-none">Buscar Vehículo</p>
              <p className="text-xs text-[#348CCB] mt-0.5">Ingrese la placa para cargar sus neumáticos</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123"
              className={`${inputCls} flex-1`}
              style={{ textTransform: "uppercase" }}
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando…</>
                : <><Search className="w-4 h-4" /> Buscar</>
              }
            </button>
          </form>
        </div>

        {/* Vehicle banner */}
        {vehicle && (
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{
              background: "rgba(10,24,58,0.03)",
              border: "1px solid rgba(52,140,203,0.18)",
            }}
          >
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-[#173D68]" />
              <div>
                <p
                  className="font-black tracking-widest text-[#0A183A]"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px" }}
                >
                  {vehicle.placa.toUpperCase()}
                </p>
                {vehicle.tipovhc && (
                  <p className="text-xs text-[#348CCB] mt-0.5">{vehicle.tipovhc}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">Llantas</p>
              <p className="text-2xl font-black text-[#0A183A]">{tires.length}</p>
            </div>
          </div>
        )}

        {/* Tires grid */}
        {tires.length > 0 && (
          <div>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-4">
              <Circle className="w-3.5 h-3.5 text-[#1E76B6]" />
              <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-[0.15em]">Neumáticos</p>
              <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.2)" }} />
              <span className="text-xs text-[#348CCB] font-medium">{tires.length} total</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tires.map((tire) => (
                <TireCard key={tire.id} tire={tire} onUpdate={setModalTire} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {vehicle && tires.length === 0 && !loading && (
          <div
            className="rounded-2xl p-5 flex flex-col items-center py-14 gap-3"
            style={{
              background: "white",
              border: "1px solid rgba(52,140,203,0.18)",
            }}
          >
            <div className="p-5 rounded-3xl" style={{ background: "rgba(30,118,182,0.08)" }}>
              <Circle className="w-12 h-12 text-[#348CCB]/40" />
            </div>
            <p className="text-[#173D68] font-bold">Sin neumáticos registrados</p>
            <p className="text-[#348CCB] text-sm">Este vehículo no tiene llantas asignadas</p>
          </div>
        )}

      {/* Update modal */}
      {modalTire && (
        <UpdateModal
          tire={modalTire}
          onClose={() => setModalTire(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
        </>
        )}

      </div>
    </div>
  );
}