"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Clock,
  FileText,
  Camera,
  AlertCircle,
  Download,
  X,
  Link2,
  Truck,
  Gauge,
  Milestone,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Circle,
  Wind,
  User,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import jsPDF from "jspdf";
import FastMode from "./FastMode";
import { AGENTS } from "../../../lib/agents";
import { useAuth } from "../../context/AuthProvider";
import TireInspectionModal, { type InspectionDraft } from "../../../components/TireInspectionModal";

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): HeadersInit {
  let token: string | null = null;
  try {
    if (typeof window !== "undefined") token = localStorage.getItem("token");
  } catch { /* SSR / blocked storage */ }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Vehicle axle configuration presets (must match the values used in the
// vehicle dashboard so editing here is consistent with editing there).
const CONFIGURACIONES: Record<string, string> = {
  "2-2":   "2-2 (Camión sencillo)",
  "2-4":   "2-4 (Sencillo con duales)",
  "4-4":   "4-4 (Dobletroque)",
  "2-4-4": "2-4-4 (Tractomula 3 ejes)",
  "6-4":   "6-4 (Tractomula 2 ejes)",
  "2-2-2": "2-2-2 (Bus 3 ejes)",
  "4-4-4": "4-4-4 (3 ejes con duales)",
};

function parseConfig(cfg: string): number[][] {
  const parts = cfg.split("-").map(Number).filter((n) => n > 0);
  const axles: number[][] = [];
  let pos = 1;
  for (const count of parts) {
    const a: number[] = [];
    for (let i = 0; i < count; i++) a.push(pos++);
    axles.push(a);
  }
  return axles;
}

// Compute every valid position the vehicle's grid currently shows. This is
// the same logic InspectionDiagram uses: start from configuracion (or a
// position-based fallback), then append extra slots so any tire whose
// position would otherwise be hidden is still visible. Used by the
// rotation pickers so empty slots are also offered as targets.
function computeAllPositions(
  tires: Array<{ posicion: number }>,
  configuracion?: string | null
): number[] {
  const maxPos = Math.max(0, ...tires.map((t) => t.posicion));
  let axles: number[][] = [];
  if (configuracion) axles = parseConfig(configuracion);
  if (axles.length === 0) {
    if (maxPos <= 2)       axles = [[1, 2]];
    else if (maxPos <= 4)  axles = [[1, 2], [3, 4]];
    else if (maxPos <= 6)  axles = [[1, 2], [3, 4], [5, 6]];
    else if (maxPos <= 8)  axles = [[1, 2], [3, 4, 5, 6], [7, 8]];
    else if (maxPos <= 10) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10]];
    else if (maxPos <= 12) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10], [11, 12]];
    else {
      axles = [];
      for (let i = 1; i <= maxPos; i += 2) axles.push(i + 1 <= maxPos ? [i, i + 1] : [i]);
    }
  }
  const covered = new Set<number>();
  axles.forEach((a) => a.forEach((p) => covered.add(p)));
  const leftover = tires
    .map((t) => t.posicion)
    .filter((p) => p > 0 && !covered.has(p))
    .sort((a, b) => a - b);
  for (let i = 0; i < leftover.length; i += 2) {
    const pair = leftover.slice(i, i + 2);
    pair.forEach((p) => covered.add(p));
  }
  return Array.from(covered).sort((a, b) => a - b);
}

// =============================================================================
// Types
// =============================================================================

type Vehicle = {
  id: string;
  placa: string;
  tipovhc: string;
  configuracion?: string | null; // e.g. "2-4", "2-4-4", "2-2-2"
  tireCount?: number;
  _count?: { tires: number };
  kilometrajeActual: number;
  union?: string[];
  companyId?: string;
};

type Inspeccion = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  imageUrl?: string;
  cpk?: number;
  cpkProyectado?: number;
  fecha: string;
};

type Costo = { valor: number; fecha: string };

type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
  profundidadInicial: number;
  kilometrosRecorridos: number;
  costo?: Costo[];
  costos?: Costo[];
  inspecciones?: Inspeccion[];
  vehicleId: string;
  // Optional metadata returned by the backend — used for hover details.
  diseno?: string;
  dimension?: string;
  eje?: string;
  diasAcumulados?: number;
  vida?: Array<{ valor: string; fecha: string }> | string[];
};

type TireUpdate = {
  profundidadInt:  number | "";
  profundidadCen:  number | "";
  profundidadExt:  number | "";
  presionPsi:      number | "";   // optional
  image:           File | null;
  imageUrls?:      string[];      // modal-captured photos (0–2)
};

type InspectionData = {
  vehicle: Vehicle;
  unionVehicle?: Vehicle;
  tires: Array<
    Tire & {
      updates: {
        profundidadInt:  number;
        profundidadCen:  number;
        profundidadExt:  number;
        presionPsi?:     number;
        image:           File | null;
      };
      avgDepth:      number;
      minDepth:      number;
      cpk:           string;
      cpkProyectado: string;
      projectedKm:   number;
    }
  >;
  date:           string;
  kmDiff:         number;
  inspectorName?: string;
};

// =============================================================================
// Helpers
// =============================================================================

function tireCount(v: Vehicle): number {
  return v._count?.tires ?? v.tireCount ?? 0;
}

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
}

function calculateCpk(tire: Tire, minDepth: number, kmDiff: number) {
  const costoArr   = tire.costos ?? tire.costo ?? [];
  const totalCost  = costoArr.reduce((s, c) => s + (c.valor ?? 0), 0);
  const totalKm        = (tire.kilometrosRecorridos || 0) + kmDiff;
  const cpk            = totalKm > 0 ? totalCost / totalKm : 0;
  const profInicial    = tire.profundidadInicial || 8;
  const denominator    = (totalKm / Math.max(profInicial - minDepth, 0.01)) * profInicial;
  const cpkProyectado  = denominator > 0 ? totalCost / denominator : 0;
  const minLegal       = 2;
  let projectedKm      = 0;
  if (minDepth > minLegal && totalKm > 0) {
    const mmWorn   = profInicial - minDepth;
    const wearRate = mmWorn > 0 ? totalKm / mmWorn : 0;
    if (wearRate > 0) projectedKm = Math.round((minDepth - minLegal) * wearRate);
  }
  return {
    cpk:           cpk.toFixed(3),
    cpkProyectado: cpkProyectado.toFixed(3),
    projectedKm,
  };
}

// =============================================================================
// Shared design primitives  (unchanged from original)
// =============================================================================

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.18)" }} />
      <span className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-[0.15em] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.18)" }} />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background:  "white",
        border:      "1px solid rgba(52,140,203,0.18)",
        boxShadow:   "0 4px 24px rgba(10,24,58,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
  subtitle,
  accent,
}: {
  icon:     React.ElementType;
  title:    string;
  subtitle?: string;
  accent?:  boolean;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="p-2 rounded-xl flex-shrink-0"
        style={{
          background: accent ? "rgba(30,118,182,0.18)" : "rgba(30,118,182,0.10)",
        }}
      >
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#0A183A] leading-none">{title}</p>
        {subtitle && <p className="text-xs text-[#348CCB] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Toast({
  type,
  message,
  onDismiss,
}: {
  type:      "error" | "success";
  message:   string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: type === "error" ? "rgba(10,24,58,0.06)" : "rgba(30,118,182,0.08)",
        border:     type === "error"
          ? "1px solid rgba(10,24,58,0.2)"
          : "1px solid rgba(30,118,182,0.3)",
      }}
    >
      {type === "error" ? (
        <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0 mt-0.5" />
      )}
      <span className="flex-1 text-[#0A183A]">{message}</span>
      <button onClick={onDismiss} className="text-[#348CCB] hover:text-[#0A183A] transition-colors ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// Depth input trio
// =============================================================================

function DepthInputs({
  tireId,
  updates,
  onChange,
}: {
  tireId:   string;
  updates:  TireUpdate;
  onChange: (id: string, field: keyof TireUpdate, value: number | File | null) => void;
}) {
  const fields: { key: "profundidadInt" | "profundidadCen" | "profundidadExt"; label: string }[] = [
    { key: "profundidadInt", label: "Interior" },
    { key: "profundidadCen", label: "Central"  },
    { key: "profundidadExt", label: "Exterior" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {fields.map(({ key, label }) => (
        <div key={key}>
          <label className="block text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider text-center mb-1">
            {label}
          </label>
          <input
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={updates[key] === "" ? "" : updates[key]}
            onChange={(e) =>
              onChange(tireId, key, e.target.value === "" ? 0 : Number(e.target.value))
            }
            placeholder="mm"
            className={`${inputCls} text-center`}
          />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Optional extras panel (pressure)
// =============================================================================

function ExtrasPanel({
  tireId,
  updates,
  onChange,
}: {
  tireId:   string;
  updates:  TireUpdate;
  onChange: (id: string, field: keyof TireUpdate, value: number | File | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const hasPressure = updates.presionPsi !== "" && updates.presionPsi !== 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px dashed rgba(52,140,203,0.35)" }}
    >
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
        style={{
          background: open
            ? "rgba(30,118,182,0.07)"
            : hasPressure
            ? "rgba(30,118,182,0.05)"
            : "rgba(240,247,255,0.6)",
        }}
      >
        <div className="flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-[#1E76B6]" />
          <span className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">
            Presión de neumático
          </span>
          {hasPressure && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: "rgba(30,118,182,0.15)", color: "#1E76B6" }}
            >
              {updates.presionPsi} PSI
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[#348CCB]">
          <span className="text-[10px] font-medium">
            {open ? "Ocultar" : "Opcional"}
          </span>
          {open ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-3 py-3" style={{ background: "rgba(240,247,255,0.5)" }}>
          <label className="block text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-1.5">
            Presión medida (PSI)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={updates.presionPsi === "" ? "" : updates.presionPsi}
              onChange={(e) =>
                onChange(
                  tireId,
                  "presionPsi",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="Ej: 110"
              className={`${inputCls} max-w-[140px]`}
            />
            <span className="text-xs font-semibold text-[#348CCB]">PSI</span>
            {updates.presionPsi !== "" && (
              <button
                type="button"
                onClick={() => onChange(tireId, "presionPsi", "")}
                className="ml-auto text-[#348CCB]/60 hover:text-[#0A183A] transition-colors"
                title="Limpiar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#93b8d4] mt-1.5 leading-snug">
            El sistema comparará con la presión recomendada para esta posición automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Vehicle diagram for inspection — click a position to inspect that tire
// =============================================================================

function InspectionDiagram({
  tires,
  tireUpdates,
  selectedTireId,
  onSelect,
  configuracion,
}: {
  tires: Tire[];
  tireUpdates: Record<string, TireUpdate>;
  selectedTireId: string | null;
  onSelect: (id: string) => void;
  configuracion?: string | null;
}) {
  // Build axle layout from vehicle configuracion or fallback to position-based
  const { layout, tireMap } = useMemo(() => {
    const map: Record<number, Tire> = {};
    tires.forEach((t) => { if (t.posicion > 0) map[t.posicion] = t; });
    const maxPos = Math.max(0, ...tires.map((t) => t.posicion));

    let axles: number[][] = [];

    // Use configuracion if available (e.g. "2-4", "2-4-4", "2-2-2")
    if (configuracion) {
      const parts = configuracion.split("-").map(Number).filter((n) => n > 0);
      if (parts.length > 0) {
        let pos = 1;
        for (const count of parts) {
          const axle: number[] = [];
          for (let i = 0; i < count; i++) axle.push(pos++);
          axles.push(axle);
        }
      }
    }

    // Fallback if no config or parsing failed
    if (axles.length === 0) {
      if (maxPos <= 2)       axles = [[1, 2]];
      else if (maxPos <= 4)  axles = [[1, 2], [3, 4]];
      else if (maxPos <= 6)  axles = [[1, 2], [3, 4], [5, 6]];
      else if (maxPos <= 8)  axles = [[1, 2], [3, 4, 5, 6], [7, 8]];
      else if (maxPos <= 10) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10]];
      else if (maxPos <= 12) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10], [11, 12]];
      else {
        axles = [];
        for (let i = 1; i <= maxPos; i += 2) axles.push(i + 1 <= maxPos ? [i, i + 1] : [i]);
      }
    }

    // CRITICAL: ensure every real tire is shown. If the chosen layout (from
    // configuracion or fallback) doesn't cover a tire's position, append it
    // as an extra axle so nothing is hidden.
    const covered = new Set<number>();
    axles.forEach((a) => a.forEach((p) => covered.add(p)));
    const leftover = tires
      .map((t) => t.posicion)
      .filter((p) => p > 0 && !covered.has(p))
      .sort((a, b) => a - b);
    for (let i = 0; i < leftover.length; i += 2) {
      const pair = leftover.slice(i, i + 2);
      axles.push(pair);
    }

    return { layout: axles, tireMap: map };
  }, [tires, configuracion]);

  function tireStatus(pos: number): "done" | "partial" | "empty" | "none" {
    const tire = tireMap[pos];
    if (!tire) return "none";
    const u = tireUpdates[tire.id];
    if (!u) return "empty";
    if (u.profundidadInt !== "" && u.profundidadCen !== "" && u.profundidadExt !== "") return "done";
    if (u.profundidadInt !== "" || u.profundidadCen !== "" || u.profundidadExt !== "") return "partial";
    return "empty";
  }

  const statusColor: Record<string, string> = {
    done: "#22c55e",
    partial: "#f97316",
    empty: "rgba(52,140,203,0.3)",
    none: "rgba(10,24,58,0.08)",
  };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {layout.map((axle, axleIdx) => {
        const mid = Math.ceil(axle.length / 2);
        const left = axle.slice(0, mid);
        const right = axle.slice(mid);
        return (
          <div key={axleIdx} className="flex items-center gap-0">
            {/* Left tires */}
            <div className="flex items-center gap-0.5">
              {left.map((pos) => {
                const tire = tireMap[pos];
                const status = tireStatus(pos);
                const isSelected = tire && tire.id === selectedTireId;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => tire && onSelect(tire.id)}
                    disabled={!tire}
                    className="relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-30"
                    style={{
                      width: 56, height: 56,
                      background: isSelected ? "rgba(30,118,182,0.15)" : "rgba(10,24,58,0.02)",
                      border: isSelected ? "2px solid #1E76B6" : `2px solid ${statusColor[status]}`,
                      boxShadow: isSelected ? "0 0 12px rgba(30,118,182,0.3)" : "none",
                    }}
                  >
                    <span className="text-[9px] font-black" style={{ color: isSelected ? "#1E76B6" : "#0A183A" }}>P{pos}</span>
                    {tire && <span className="text-[7px] font-bold truncate max-w-[44px]" style={{ color: "#348CCB" }}>{tire.marca}</span>}
                    {status === "done" && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />}
                    {status === "partial" && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-400 border-2 border-white" />}
                  </button>
                );
              })}
            </div>
            {/* Axle bar */}
            <div className="h-4 mx-1.5 rounded-full flex items-center justify-center" style={{ background: "#0A183A", minWidth: 40, width: 50 }}>
              <div className="h-1 w-8 rounded-full" style={{ background: "#1E76B6" }} />
            </div>
            {/* Right tires */}
            <div className="flex items-center gap-0.5">
              {right.map((pos) => {
                const tire = tireMap[pos];
                const status = tireStatus(pos);
                const isSelected = tire && tire.id === selectedTireId;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => tire && onSelect(tire.id)}
                    disabled={!tire}
                    className="relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-30"
                    style={{
                      width: 56, height: 56,
                      background: isSelected ? "rgba(30,118,182,0.15)" : "rgba(10,24,58,0.02)",
                      border: isSelected ? "2px solid #1E76B6" : `2px solid ${statusColor[status]}`,
                      boxShadow: isSelected ? "0 0 12px rgba(30,118,182,0.3)" : "none",
                    }}
                  >
                    <span className="text-[9px] font-black" style={{ color: isSelected ? "#1E76B6" : "#0A183A" }}>P{pos}</span>
                    {tire && <span className="text-[7px] font-bold truncate max-w-[44px]" style={{ color: "#348CCB" }}>{tire.marca}</span>}
                    {status === "done" && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />}
                    {status === "partial" && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-400 border-2 border-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-[9px] text-gray-400">Completa</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><span className="text-[9px] text-gray-400">Parcial</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(52,140,203,0.3)" }} /><span className="text-[9px] text-gray-400">Pendiente</span></div>
      </div>
    </div>
  );
}

// =============================================================================
// Mini axle preview — used inside the structure-edit popup
// =============================================================================

function MiniAxleDiagram({ config }: { config: string }) {
  const layout = useMemo(() => parseConfig(config), [config]);
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      {layout.map((axle, i) => {
        const mid = Math.ceil(axle.length / 2);
        const left = axle.slice(0, mid);
        const right = axle.slice(mid);
        const Tire = () => (
          <div
            className="rounded-md"
            style={{ width: 14, height: 14, background: "#1E76B6" }}
          />
        );
        return (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-0.5">
              {left.map((_, k) => <Tire key={`l${k}`} />)}
            </div>
            <div className="h-1 mx-1 rounded-full" style={{ background: "#0A183A", width: 28 }} />
            <div className="flex items-center gap-0.5">
              {right.map((_, k) => <Tire key={`r${k}`} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Edit-structure popup
// =============================================================================

function EditStructureModal({
  current,
  onClose,
  onSelect,
  saving,
}: {
  current: string | null | undefined;
  onClose: () => void;
  onSelect: (cfg: string) => void;
  saving: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#348CCB]/15">
          <div>
            <h3 className="text-base font-bold text-[#0A183A]">Editar estructura del vehículo</h3>
            <p className="text-[11px] text-[#93b8d4] mt-0.5">
              Elige la configuración de ejes que mejor represente este vehículo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F0F7FF] transition-colors"
          >
            <X className="w-4 h-4 text-[#1E76B6]" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
          {Object.entries(CONFIGURACIONES).map(([key, label]) => {
            const isCurrent = current === key;
            return (
              <button
                key={key}
                type="button"
                disabled={saving}
                onClick={() => onSelect(key)}
                className="relative flex flex-col items-center justify-between rounded-xl p-3 transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  border: isCurrent ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.25)",
                  background: isCurrent ? "rgba(30,118,182,0.08)" : "#fff",
                  boxShadow: isCurrent ? "0 4px 16px rgba(30,118,182,0.18)" : "0 1px 4px rgba(10,24,58,0.04)",
                  minHeight: 130,
                }}
              >
                {isCurrent && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: "#1E76B6" }}>
                    Actual
                  </span>
                )}
                <MiniAxleDiagram config={key} />
                <span className="text-[10px] font-semibold text-[#0A183A] text-center mt-2 leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {saving && (
          <div className="px-5 pb-4 flex items-center gap-2 text-[11px] text-[#1E76B6]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Guardando…
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Tire inspection card
// =============================================================================

function TireInspectionCard({
  tire,
  updates,
  onChange,
  isUnion,
}: {
  tire:     Tire;
  updates:  TireUpdate;
  onChange: (id: string, field: keyof TireUpdate, value: number | File | null) => void;
  isUnion:  boolean;
}) {
  const lastInsp   = (tire.inspecciones ?? [])[0];
  const prevDepths = lastInsp
    ? `${lastInsp.profundidadInt} / ${lastInsp.profundidadCen} / ${lastInsp.profundidadExt} mm`
    : "Sin inspecciones previas";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border:     isUnion
          ? "1px solid rgba(30,118,182,0.25)"
          : "1px solid rgba(52,140,203,0.18)",
        boxShadow: "0 2px 12px rgba(10,24,58,0.04)",
      }}
    >
      {/* Header strip */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: isUnion
            ? "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)"
            : "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <Circle className="w-3.5 h-3.5 text-white/70" />
          <span
            className="font-black tracking-widest text-white"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "15px" }}
          >
            {tire.placa.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
          >
            Pos. {tire.posicion}
          </span>
          <span className="text-xs font-medium text-white/70">{tire.marca}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4" style={{ background: "white" }}>

        {/* Previous depth info */}
        {lastInsp && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: "rgba(52,140,203,0.06)",
              border:     "1px solid rgba(52,140,203,0.15)",
            }}
          >
            <Clock className="w-3.5 h-3.5 text-[#348CCB] flex-shrink-0" />
            <span className="text-[#348CCB] font-medium">Última inspección:</span>
            <span className="text-[#0A183A] font-semibold">{prevDepths}</span>
          </div>
        )}

        {/* Depth inputs */}
        <div>
          <p className="text-xs font-bold text-[#173D68] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#1E76B6]" />
            Profundidad (mm)
          </p>
          <DepthInputs tireId={tire.id} updates={updates} onChange={onChange} />
        </div>

        {/* Optional: pressure */}
        <ExtrasPanel tireId={tire.id} updates={updates} onChange={onChange} />

        {/* Image upload */}
        <div>
          <p className="text-xs font-bold text-[#173D68] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#1E76B6]" />
            Foto del Neumático
          </p>
          <label
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium"
            style={{
              background: updates.image ? "rgba(30,118,182,0.08)" : "#F0F7FF",
              border:     "1px dashed rgba(52,140,203,0.4)",
              color:      "#1E76B6",
            }}
          >
            <Camera className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {updates.image ? updates.image.name : "Seleccionar imagen..."}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                onChange(tire.id, "image", e.target.files?.[0] ?? null)
              }
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Vehicle info banner
// =============================================================================

function VehicleBanner({
  vehicle,
  isUnion,
  tireCountNum,
}: {
  vehicle:      Vehicle;
  isUnion?:     boolean;
  tireCountNum: number;
}) {
  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: isUnion ? "rgba(30,118,182,0.06)" : "rgba(10,24,58,0.03)",
        border:     isUnion
          ? "1px solid rgba(30,118,182,0.2)"
          : "1px solid rgba(52,140,203,0.18)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {isUnion ? (
            <Link2 className="w-5 h-5 text-[#1E76B6]" />
          ) : (
            <Truck className="w-5 h-5 text-[#173D68]" />
          )}
          <div>
            <p
              className="font-black tracking-widest text-[#0A183A]"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px" }}
            >
              {vehicle.placa.toUpperCase()}
            </p>
            <p className="text-xs text-[#348CCB] mt-0.5">{vehicle.tipovhc}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-[#348CCB] uppercase tracking-wide">Llantas</p>
          <p className="text-2xl font-black text-[#0A183A]">{tireCountNum}</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Export modal
// =============================================================================

function ExportModal({
  onClose,
  onExport,
  loading,
}: {
  onClose:  () => void;
  onExport: () => void;
  loading:  boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
      >
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white text-sm tracking-wide uppercase">
              Inspección Guardada
            </h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-[#173D68] leading-relaxed">
            La inspección fue registrada exitosamente. Puede exportar un reporte en PDF con todos los datos, CPK y proyecciones.
          </p>
          <button
            onClick={onExport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando PDF…</>
            ) : (
              <><Download className="w-4 h-4" /> Exportar a PDF</>
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors"
          >
            Cerrar sin exportar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function InspeccionPage({ language }: { language?: string }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"normal" | "fast">("normal");
  const [placaInput,      setPlacaInput]      = useState("");
  const [newKilometraje,  setNewKilometraje]  = useState(0);
  const [inspectorName,   setInspectorName]   = useState("");   // NEW

  // Pre-fill the inspector name with the logged-in user's name the first
  // time it becomes available. Only fills when still empty so we never
  // overwrite a manual edit.
  useEffect(() => {
    if (user?.name) {
      setInspectorName(prev => (prev === "" ? user.name : prev));
    }
  }, [user?.name]);

  const [vehicle,       setVehicle]       = useState<Vehicle | null>(null);
  const [unionVehicle,  setUnionVehicle]  = useState<Vehicle | null>(null);
  const [tires,         setTires]         = useState<Tire[]>([]);
  const [unionTires,    setUnionTires]    = useState<Tire[]>([]);
  const [tireUpdates,   setTireUpdates]   = useState<Record<string, TireUpdate>>({});

  const [loading,         setLoading]         = useState(false);
  const [submitting,      setSubmitting]       = useState(false);
  const [pdfLoading,      setPdfLoading]       = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [showExport,      setShowExport]      = useState(false);
  const [selectedTireId,  setSelectedTireId]  = useState<string | null>(null);
  const [modalTireId,     setModalTireId]     = useState<string | null>(null);
  const [inspectedIds,    setInspectedIds]    = useState<Set<string>>(new Set());
  const [inspectionData,  setInspectionData]  = useState<InspectionData | null>(null);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [savingStructure,    setSavingStructure]    = useState(false);

  // -- Position rotation / free-tire pool ------------------------------------
  // Track each tire's original position so we can persist the diff on submit.
  const originalPositions = useRef<Record<string, number>>({});
  const [freeTires,        setFreeTires]      = useState<Tire[]>([]);
  const [freeActionTireId, setFreeActionTireId] = useState<string | null>(null);
  const [bucketData,       setBucketData]     = useState<{ disponible: number; buckets: { id: string; nombre: string; color?: string; icono?: string; tireCount: number }[] }>({ disponible: 0, buckets: [] });

  // Move the currently-selected tire onto a different position. The tire
  // that previously occupied that slot becomes "free" (lands in the
  // Llantas libres pool above the diagram).
  function rotateSelectedToPosition(targetPos: number) {
    if (!selectedTireId) return;
    setTires((prev) => {
      const moving = prev.find((t) => t.id === selectedTireId);
      if (!moving || moving.posicion === targetPos) return prev;
      const occupant = prev.find((t) => t.posicion === targetPos);
      const next = prev.map((t) => {
        if (t.id === moving.id) return { ...t, posicion: targetPos };
        if (occupant && t.id === occupant.id) return { ...t, posicion: 0 };
        return t;
      });
      if (occupant) {
        // Remove occupant from `tires` and push to free pool — the diagram
        // hides position-0 tires anyway, but keeping it out of `tires`
        // makes the free-pool the single source of truth.
        const filtered = next.filter((t) => t.id !== occupant.id);
        setFreeTires((fp) =>
          fp.find((t) => t.id === occupant.id) ? fp : [...fp, { ...occupant, posicion: 0 }]
        );
        return filtered;
      }
      return next;
    });
  }

  // Desmount the currently-selected tire: pull it off the vehicle into the
  // free pool and immediately open the bucket picker so the inspector can
  // route it to an inventory bucket. Used when the physical tire on the
  // vehicle does not match any of the registered positions.
  function desmountSelected() {
    if (!selectedTireId) return;
    const sel = tires.find((t) => t.id === selectedTireId);
    if (!sel) return;
    setTires((prev) => prev.filter((t) => t.id !== sel.id));
    setFreeTires((fp) =>
      fp.find((t) => t.id === sel.id) ? fp : [...fp, { ...sel, posicion: 0 }]
    );
    setSelectedTireId(null);
    setFreeActionTireId(sel.id);
  }

  // Place a previously-freed tire onto a vehicle position. If that slot is
  // currently occupied the occupant becomes free in turn.
  function assignFreeTireToPosition(freeTireId: string, targetPos: number) {
    const free = freeTires.find((t) => t.id === freeTireId);
    if (!free) return;
    setTires((prev) => {
      const occupant = prev.find((t) => t.posicion === targetPos);
      const cleaned = occupant ? prev.filter((t) => t.id !== occupant.id) : prev;
      if (occupant) {
        setFreeTires((fp) =>
          fp.find((t) => t.id === occupant.id)
            ? fp
            : [...fp.filter((t) => t.id !== freeTireId), { ...occupant, posicion: 0 }]
        );
      } else {
        setFreeTires((fp) => fp.filter((t) => t.id !== freeTireId));
      }
      return [...cleaned, { ...free, posicion: targetPos }];
    });
    // Make sure tireUpdates has an entry for the re-introduced tire.
    setTireUpdates((prev) =>
      prev[freeTireId]
        ? prev
        : { ...prev, [freeTireId]: { profundidadInt: "", profundidadCen: "", profundidadExt: "", presionPsi: "", image: null } }
    );
    setFreeActionTireId(null);
  }

  // Send a freed tire to one of the inventory buckets (or "disponible").
  // Persists immediately via /inventory-buckets/move and removes the tire
  // from the local pool.
  async function assignFreeTireToBucket(freeTireId: string, bucketId: string | null) {
    const cId = vehicle?.companyId;
    if (!cId) {
      setError("No se pudo determinar la empresa del vehículo");
      return;
    }
    try {
      // Detach from the vehicle first so the tire is not stuck on it.
      await fetch(`${API_BASE}/tires/unassign-vehicle`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tireIds: [freeTireId] }),
      });
      await fetch(`${API_BASE}/inventory-buckets/move`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tireId: freeTireId, bucketId, companyId: cId }),
      });
      setFreeTires((fp) => fp.filter((t) => t.id !== freeTireId));
      // Drop any pending inspection update for it — it's gone from this
      // vehicle now and shouldn't block submit.
      setTireUpdates((prev) => {
        const next = { ...prev };
        delete next[freeTireId];
        return next;
      });
      // Refresh bucket counts.
      try {
        const bRes = await fetch(`${API_BASE}/inventory-buckets?companyId=${cId}`, { headers: authHeaders() });
        if (bRes.ok) setBucketData(await bRes.json());
      } catch { /* ignore */ }
    } catch {
      setError("No se pudo mover la llanta al grupo seleccionado");
    } finally {
      setFreeActionTireId(null);
    }
  }

  async function handleUpdateStructure(cfg: string) {
    if (!vehicle) return;
    setSavingStructure(true);
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ configuracion: cfg || null }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la estructura");
      const updated = await res.json();
      setVehicle((v) => v ? { ...v, configuracion: updated.configuracion ?? cfg } : v);
      setShowStructureModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar estructura");
    } finally {
      setSavingStructure(false);
    }
  }

  // ===========================================================================
  // Search
  // ===========================================================================

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setVehicle(null);
    setUnionVehicle(null);
    setTires([]);
    setUnionTires([]);
    setTireUpdates({});

    const placa = placaInput.trim().toUpperCase();
    if (!placa) { setError("Por favor ingrese la placa del vehículo"); return; }

    setLoading(true);
    try {
      const vRes = await fetch(
        `${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(placa)}`,
        { headers: authHeaders() }
      );
      if (!vRes.ok) throw new Error("Vehículo no encontrado");
      const vData: Vehicle = await vRes.json();
      setVehicle(vData);
      setNewKilometraje(vData.kilometrajeActual);

      const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vData.id}`, {
        headers: authHeaders(),
      });
      if (!tRes.ok) throw new Error("Error al obtener las llantas");
      const tData: Tire[] = await tRes.json();
      tData.sort((a, b) => a.posicion - b.posicion);
      setTires(tData);

      // Snapshot original positions so we can persist any rotations on submit.
      const orig: Record<string, number> = {};
      tData.forEach((t) => { orig[t.id] = t.posicion; });
      originalPositions.current = orig;
      setFreeTires([]);

      // Load inventory buckets for the vehicle's company so the free-tire
      // pool can offer them as a destination.
      if (vData.companyId) {
        try {
          const bRes = await fetch(`${API_BASE}/inventory-buckets?companyId=${vData.companyId}`, { headers: authHeaders() });
          if (bRes.ok) setBucketData(await bRes.json());
        } catch { /* ignore */ }
      }

      const unionPlacas: string[] = Array.isArray(vData.union) ? vData.union : [];
      let uVehicle: Vehicle | null = null;
      let uTires:   Tire[]         = [];

      if (unionPlacas.length > 0) {
        try {
          const uRes = await fetch(
            `${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(unionPlacas[0])}`,
            { headers: authHeaders() }
          );
          if (uRes.ok) {
            uVehicle = await uRes.json();
            setUnionVehicle(uVehicle);
            const utRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${uVehicle!.id}`, {
              headers: authHeaders(),
            });
            if (utRes.ok) {
              uTires = await utRes.json();
              uTires.sort((a, b) => a.posicion - b.posicion);
              setUnionTires(uTires);
            }
          }
        } catch { /* non-fatal */ }
      }

      const allTires = [...tData, ...uTires];
      const init: Record<string, TireUpdate> = {};
      allTires.forEach((t) => {
        init[t.id] = {
          profundidadInt: "",
          profundidadCen: "",
          profundidadExt: "",
          presionPsi:     "",
          image:          null,
        };
      });
      setTireUpdates(init);
      // Auto-select the first tire for diagram mode
      const firstTire = [...tData, ...uTires].find((t) => t.posicion > 0) ?? tData[0] ?? uTires[0];
      if (firstTire) setSelectedTireId(firstTire.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  // ===========================================================================
  // Update handler
  // ===========================================================================

  function handleInputChange(
    id:    string,
    field: keyof TireUpdate,
    value: number | "" | File | null
  ) {
    setTireUpdates((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  // Optimistic per-tire save — fires as soon as the modal's "Guardar
  // inspección" button is clicked so the user isn't stuck at the end
  // waiting for a batch submit. Subsequent re-saves for the same tire
  // use the edit endpoint, which diffs old vs new photos on S3.
  async function submitSingleInspection(tireId: string, draft: InspectionDraft) {
    const tire = [...tires, ...unionTires].find((t) => t.id === tireId);
    if (!tire) throw new Error("Tire not found");
    const kmDelta = Math.max(Number(newKilometraje) - (vehicle?.kilometrajeActual ?? 0), 0);
    const payload: Record<string, unknown> = {
      profundidadInt: Number(draft.profundidadInt),
      profundidadCen: Number(draft.profundidadCen),
      profundidadExt: Number(draft.profundidadExt),
      newKilometraje: Number(newKilometraje) || undefined,
      kmDelta: kmDelta > 0 ? kmDelta : undefined,
      imageUrls: draft.imageUrls.slice(0, 3),
    };
    if (draft.presionPsi !== "") payload.presionPsi = Number(draft.presionPsi);
    if (inspectorName.trim()) {
      payload.inspeccionadoPorNombre = inspectorName.trim();
      if (user?.id && inspectorName.trim() === (user.name ?? "").trim()) {
        payload.inspeccionadoPorId = user.id;
      }
    }
    const res = await fetch(`${API_BASE}/tires/${tire.id}/inspection`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? "Error al guardar inspección");
    }
    // Sync local state so "Guardar todas" doesn't double-submit.
    setTireUpdates((prev) => ({
      ...prev,
      [tireId]: {
        ...(prev[tireId] ?? {}),
        profundidadInt: Number(draft.profundidadInt),
        profundidadCen: Number(draft.profundidadCen),
        profundidadExt: Number(draft.profundidadExt),
        presionPsi:     draft.presionPsi === "" ? 0 : Number(draft.presionPsi),
        imageUrls:      draft.imageUrls.slice(0, 3),
        image:          null,
      } as TireUpdate,
    }));
    setInspectedIds((prev) => {
      const next = new Set(prev);
      next.add(tireId);
      return next;
    });
  }

  // ===========================================================================
  // Submit inspections
  // ===========================================================================

  async function handleSubmitInspections(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const allTires = [...tires, ...unionTires];
    const emptyUpdate = { profundidadInt: "", profundidadCen: "", profundidadExt: "", presionPsi: "", image: null };
    const safeUpdate = (id: string) => tireUpdates[id] ?? emptyUpdate;
    // A tire is "inspeccionable" only when ALL three depth fields are filled.
    // Tires with partial fills are treated as not-inspecting-this-one and
    // are simply skipped on submit. Tires with no fills are also skipped.
    const isFull = (u: TireUpdate) =>
      u.profundidadInt !== "" && u.profundidadCen !== "" && u.profundidadExt !== "";
    const isPartial = (u: TireUpdate) =>
      !isFull(u) && (u.profundidadInt !== "" || u.profundidadCen !== "" || u.profundidadExt !== "");

    const partial = allTires.filter((t) => isPartial(safeUpdate(t.id)));
    if (partial.length > 0) {
      setError(`Completa las 3 profundidades en P${partial[0].posicion} o déjalas todas vacías para no inspeccionarla`);
      return;
    }

    // Skip tires already persisted via the modal's optimistic PATCH —
    // otherwise the batch path would create a duplicate inspection row.
    const inspectionTires = allTires.filter(
      (t) => isFull(safeUpdate(t.id)) && !inspectedIds.has(t.id),
    );

    // Detect whether the technician made a position change. Used together
    // with the inspection count to decide if there's anything to save.
    let positionsChanged = false;
    if (vehicle) {
      for (const t of tires) {
        if (originalPositions.current[t.id] !== t.posicion) { positionsChanged = true; break; }
      }
      if (!positionsChanged) {
        for (const id of Object.keys(originalPositions.current)) {
          if (freeTires.find((t) => t.id === id)) { positionsChanged = true; break; }
        }
      }
    }

    if (inspectionTires.length === 0 && !positionsChanged) {
      setError("Ingresa al menos una inspección o haz un cambio de posición");
      return;
    }

    const zeroCount = inspectionTires.reduce((n, t) => {
      const u = safeUpdate(t.id);
      return (
        n +
        (Number(u.profundidadInt) === 0 ? 1 : 0) +
        (Number(u.profundidadCen) === 0 ? 1 : 0) +
        (Number(u.profundidadExt) === 0 ? 1 : 0)
      );
    }, 0);
    if (
      zeroCount > 0 &&
      !window.confirm(`${zeroCount} campo(s) tienen valor 0. ¿Desea continuar?`)
    )
      return;

    setSubmitting(true);
    try {
      const kmDiff = vehicle ? Number(newKilometraje) - vehicle.kilometrajeActual : 0;

      // Persist any position rotations the technician made before recording
      // the inspections themselves. We only call the endpoint if something
      // actually changed compared to the snapshot taken on load.
      if (vehicle) {
        const updates: Record<string, string> = {};
        let changed = false;
        for (const t of tires) {
          if (t.posicion > 0) updates[String(t.posicion)] = t.id;
          if (originalPositions.current[t.id] !== t.posicion) changed = true;
        }
        // Tires that started on the vehicle but were freed and not placed
        // back also count as a change.
        for (const id of Object.keys(originalPositions.current)) {
          if (!tires.find((t) => t.id === id) && !freeTires.find((t) => t.id === id)) continue;
          if (freeTires.find((t) => t.id === id)) changed = true;
        }
        if (changed) {
          const res = await fetch(`${API_BASE}/tires/update-positions`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ placa: vehicle.placa.toLowerCase(), updates }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? "Error al actualizar las posiciones");
          }
          // Update snapshot so subsequent submits don't re-send the same diff.
          const newOrig: Record<string, number> = {};
          tires.forEach((t) => { newOrig[t.id] = t.posicion; });
          originalPositions.current = newOrig;
        }
      }

      // Only POST inspections for tires the technician actually filled.
      for (const tire of inspectionTires) {
        const upd      = safeUpdate(tire.id);
        const imageUrl = upd.image ? await convertFileToBase64(upd.image) : "";

        const payload: Record<string, unknown> = {
          profundidadInt: Number(upd.profundidadInt),
          profundidadCen: Number(upd.profundidadCen),
          profundidadExt: Number(upd.profundidadExt),
          newKilometraje: Number(newKilometraje),
          kmDelta:        kmDiff,
          imageUrl,
        };

        // Only include pressure when the technician actually typed a value
        if (upd.presionPsi !== "" && upd.presionPsi !== 0) {
          payload.presionPsi = Number(upd.presionPsi);
        }

        // Inspector — one value for the whole session. The id links to
        // the user account so KPIs can aggregate regardless of
        // typos/casing in the free-form name.
        if (inspectorName.trim()) {
          payload.inspeccionadoPorNombre = inspectorName.trim();
        }
        if (user?.id && inspectorName.trim() === (user.name ?? "").trim()) {
          payload.inspeccionadoPorId = user.id;
        }

        const res = await fetch(`${API_BASE}/tires/${tire.id}/inspection`, {
          method:  "PATCH",
          headers: authHeaders(),
          body:    JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `Error al actualizar llanta ${tire.placa}`);
        }
      }

      // Build PDF data
      const iData: InspectionData = {
        vehicle:       vehicle!,
        unionVehicle:  unionVehicle ?? undefined,
        inspectorName: inspectorName.trim() || undefined,
        // PDF only includes the tires that were actually inspected.
        tires: inspectionTires.map((tire) => {
          const upd      = safeUpdate(tire.id);
          const pInt     = Number(upd.profundidadInt);
          const pCen     = Number(upd.profundidadCen);
          const pExt     = Number(upd.profundidadExt);
          const avgDepth = (pInt + pCen + pExt) / 3;
          const minDepth = Math.min(pInt, pCen, pExt);
          const cpkData  = calculateCpk(tire, minDepth, kmDiff);
          return {
            ...tire,
            updates: {
              profundidadInt: pInt,
              profundidadCen: pCen,
              profundidadExt: pExt,
              presionPsi:     upd.presionPsi !== "" ? Number(upd.presionPsi) : undefined,
              image:          upd.image,
            },
            avgDepth,
            minDepth,
            ...cpkData,
          };
        }),
        date:   new Date().toISOString().split("T")[0],
        kmDiff,
      };

      setInspectionData(iData);
      setShowExport(true);
      setSuccess("Inspecciones actualizadas exitosamente");

      const reset: Record<string, TireUpdate> = {};
      allTires.forEach((t) => {
        reset[t.id] = {
          profundidadInt: "",
          profundidadCen: "",
          profundidadExt: "",
          presionPsi:     "",
          image:          null,
        };
      });
      setTireUpdates(reset);
      if (vehicle) setNewKilometraje(vehicle.kilometrajeActual);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  // ===========================================================================
  // PDF generation
  // ===========================================================================

  async function generatePDF() {
    if (!inspectionData || !vehicle) return;
    setPdfLoading(true);
    try {
      const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const navy = [10,  24,  58]  as [number, number, number];
      const blue = [30,  118, 182] as [number, number, number];
      const mid  = [23,  61,  104] as [number, number, number];
      const gray = [80,  80,  80]  as [number, number, number];

      const totalPages = Math.max(2, Math.ceil(inspectionData.tires.length / 4) + 1);
      let page         = 1;

      function addHeader() {
        doc.setFillColor(...navy);
        doc.rect(0, 0, 210, 22, "F");
        doc.setFillColor(...blue);
        doc.roundedRect(12, 4, 36, 14, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("TirePro", 30, 13, { align: "center" });
        doc.setFontSize(14);
        doc.text("Reporte de Inspección", 130, 13, { align: "center" });

        doc.setFillColor(240, 245, 255);
        doc.rect(0, 280, 210, 17, "F");
        doc.setTextColor(...gray);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Página ${page} de ${totalPages}`, 105, 289, { align: "center" });
        doc.text(`Fecha: ${inspectionData.date}`, 15, 289);
        return 30;
      }

      let y = addHeader();

      // Vehicle summary
      const veh = inspectionData.vehicle;
      doc.setFillColor(245, 248, 255);
      doc.roundedRect(12, y, 186, inspectionData.inspectorName ? 56 : 48, 3, 3, "F");
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...mid);
      doc.text("Vehículo Principal", 18, y + 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...gray);
      doc.text(`Placa: ${veh.placa.toUpperCase()}`,                                           18,  y + 18);
      doc.text(`Tipo: ${veh.tipovhc}`,                                                         18,  y + 26);
      doc.text(`Km anterior: ${veh.kilometrajeActual} km`,                                     18,  y + 34);
      doc.text(`Km actual: ${veh.kilometrajeActual + inspectionData.kmDiff} km`,               18,  y + 42);
      doc.text(`Distancia: +${inspectionData.kmDiff} km`,                                      110, y + 18);
      doc.text(`Llantas: ${tireCount(veh)}`,                                                   110, y + 26);
      if (inspectionData.inspectorName) {
        doc.text(`Inspector: ${inspectionData.inspectorName}`,                                 110, y + 34);
      }
      y += inspectionData.inspectorName ? 62 : 54;

      if (inspectionData.unionVehicle) {
        const uv = inspectionData.unionVehicle;
        doc.setFillColor(235, 245, 255);
        doc.roundedRect(12, y, 186, 40, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...blue);
        doc.text("Vehículo en Unión", 18, y + 9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        doc.text(`Placa: ${uv.placa.toUpperCase()}`, 18,  y + 18);
        doc.text(`Tipo: ${uv.tipovhc}`,              18,  y + 26);
        doc.text(`Llantas: ${tireCount(uv)}`,        110, y + 18);
        y += 46;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...navy);
      doc.text("Inspección de Neumáticos", 15, y);
      y += 8;

      for (const tire of inspectionData.tires) {
        const hasPressure = tire.updates.presionPsi !== undefined;
        const boxH        = hasPressure ? 62 : 54;

        if (y + boxH > 272) {
          doc.addPage();
          page++;
          y = addHeader();
        }

        const isUnion = !!inspectionData.unionVehicle && tire.vehicleId === inspectionData.unionVehicle.id;
        const bg: [number, number, number] = isUnion ? [235, 245, 255] : [245, 248, 255];
        doc.setFillColor(...bg);
        doc.roundedRect(12, y, 186, boxH, 3, 3, "F");

        doc.setFillColor(...(isUnion ? blue : navy));
        doc.roundedRect(12, y, 44, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`POSICIÓN ${tire.posicion}`, 34, y + 7, { align: "center" });

        y += 14;
        doc.setTextColor(...navy);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${tire.marca}  —  ${tire.placa.toUpperCase()}`, 18, y);

        y += 8;
        doc.setTextColor(...gray);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Int: ${tire.updates.profundidadInt} mm`, 18,  y);
        doc.text(`Cen: ${tire.updates.profundidadCen} mm`, 58,  y);
        doc.text(`Ext: ${tire.updates.profundidadExt} mm`, 98,  y);
        doc.text(`Prom: ${tire.avgDepth.toFixed(2)} mm`,   138, y);

        y += 8;
        doc.text(`CPK: ${tire.cpk}`,           18,  y);
        doc.text(`CPK Proy.: ${tire.cpkProyectado}`, 58,  y);
        if (tire.projectedKm > 0) doc.text(`Km restantes: ${tire.projectedKm.toLocaleString()}`, 110, y);

        if (hasPressure) {
          y += 8;
          doc.setTextColor(...blue);
          doc.text(`Presión medida: ${tire.updates.presionPsi} PSI`, 18, y);
          doc.setTextColor(...gray);
        }

        if (tire.updates.image) {
          try {
            const imgData = await convertFileToBase64(tire.updates.image);
            y += 6;
            doc.addImage(imgData, "JPEG", 130, y, 60, 30);
          } catch { /* skip */ }
        }

        y += 20;
      }

      const filename = inspectionData.unionVehicle
        ? `inspeccion_${veh.placa}_${inspectionData.unionVehicle.placa}_${inspectionData.date}.pdf`
        : `inspeccion_${veh.placa}_${inspectionData.date}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error(err);
      setError("Error al generar el PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  // ===========================================================================
  // JSX
  // ===========================================================================

  const allTires   = [...tires, ...unionTires];
  const hasVehicle = !!vehicle;
  const hasTires   = allTires.length > 0;
  const kmDiff     = vehicle ? Number(newKilometraje) - vehicle.kilometrajeActual : 0;

  return (
    <div style={{ background: "#ffffff" }}>
      <div className="max-w-3xl mx-auto space-y-4">

        {/* -- Mode toggle --------------------------------------------------- */}
        <div className="flex items-center gap-2">
          {(["normal", "fast"] as const).map((m) => {
            const isFast = m === "fast";
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: isActive
                    ? isFast ? `linear-gradient(135deg, ${AGENTS.campa.color}, #c2410c)` : "linear-gradient(135deg, #0A183A, #173D68)"
                    : "white",
                  color: isActive ? "#fff" : "#173D68",
                  border: isActive
                    ? isFast ? `1px solid ${AGENTS.campa.color}` : "1px solid #0A183A"
                    : "1px solid rgba(52,140,203,0.2)",
                }}
              >
                {isFast && <Zap className="w-3.5 h-3.5" />}
                {isFast ? "Modo Rápido" : "Normal"}
              </button>
            );
          })}
          {mode === "fast" && (
            <span className="text-[10px] font-bold ml-1" style={{ color: AGENTS.campa.color }}>
              {AGENTS.campa.role} &middot; Crea vehiculos y llantas sobre la marcha
            </span>
          )}
        </div>

        {mode === "fast" ? (
          <FastMode language={language ?? "es"} />
        ) : (
        <>

        {error   && <Toast type="error"   message={error}   onDismiss={() => setError("")}   />}
        {success && <Toast type="success" message={success} onDismiss={() => setSuccess("")} />}

        {/* -- Search ---------------------------------------------------------- */}
        <Card>
          <CardHeader icon={Search} title="Buscar Vehículo" subtitle="Ingrese la placa para cargar sus neumáticos" />
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={placaInput}
              onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
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
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Buscando…</>
              ) : (
                <><Search className="w-4 h-4" /> Buscar</>
              )}
            </button>
          </form>
        </Card>

        {/* -- Vehicle info ---------------------------------------------------- */}
        {hasVehicle && (
          <Card>
            <CardHeader
              icon={FileText}
              title="Información del Vehículo"
              subtitle="Datos cargados del sistema"
            />

            <div className="space-y-3">
              <VehicleBanner vehicle={vehicle!} tireCountNum={tireCount(vehicle!)} />
              {unionVehicle && (
                <VehicleBanner vehicle={unionVehicle} isUnion tireCountNum={tireCount(unionVehicle)} />
              )}
            </div>

            {/* Kilometraje */}
            <div className="mt-5">
              <SectionDivider label="Actualizar Kilometraje" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#173D68] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Milestone className="w-3.5 h-3.5 text-[#1E76B6]" />
                    Nuevo Kilometraje
                  </label>
                  <input
                    type="number"
                    value={newKilometraje}
                    onChange={(e) => setNewKilometraje(Number(e.target.value))}
                    min={vehicle?.kilometrajeActual}
                    className={inputCls}
                  />
                </div>
                <div
                  className="flex flex-col items-center justify-center rounded-2xl py-3 px-4"
                  style={{
                    background: kmDiff > 0 ? "rgba(30,118,182,0.08)" : "rgba(10,24,58,0.04)",
                    border:     "1px solid rgba(52,140,203,0.2)",
                  }}
                >
                  <span className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">
                    Diferencia
                  </span>
                  <span
                    className="text-2xl font-black mt-0.5"
                    style={{ color: kmDiff > 0 ? "#1E76B6" : "#0A183A" }}
                  >
                    +{kmDiff.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#348CCB]">km</span>
                </div>
              </div>
            </div>

            {/* -- Inspector name — NEW ---------------------------------------- */}
            <div className="mt-5">
              <SectionDivider label="Inspector (opcional)" />
              <div className="mt-4">
                <label className="block text-xs font-bold text-[#173D68] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#1E76B6]" />
                  Nombre del inspector
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="Nombre del inspector"
                  className={inputCls}
                />
                <p className="text-[10px] text-[#93b8d4] mt-1.5">
                  Se registrará en todas las inspecciones de esta sesión.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* -- Tire forms ------------------------------------------------------ */}
        {hasTires && (
          <form onSubmit={handleSubmitInspections} className="space-y-4">

            {tires.length > 0 && (
              <Card>
                <CardHeader
                  icon={Truck}
                  title="Neumáticos — Vehículo Principal"
                  subtitle={`${vehicle!.placa.toUpperCase()} · ${tires.length} llantas`}
                />

                {/* Llantas libres pool — tires displaced by rotations.
                   Click one to choose a destination (position or bucket). */}
                {freeTires.length > 0 && (
                  <div
                    className="rounded-xl p-3 mb-3"
                    style={{ background: "rgba(247,167,52,0.08)", border: "1px dashed rgba(247,167,52,0.4)" }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Circle className="w-3 h-3 text-[#f59e0b]" />
                      <p className="text-[10px] font-bold text-[#92400e] uppercase tracking-wider">
                        Llantas libres ({freeTires.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {freeTires.map((ft) => {
                        const vidaArr = ft.vida;
                        const vidaActual = Array.isArray(vidaArr) && vidaArr.length > 0
                          ? (typeof vidaArr[vidaArr.length - 1] === "string"
                              ? (vidaArr[vidaArr.length - 1] as string)
                              : (vidaArr[vidaArr.length - 1] as { valor: string }).valor)
                          : null;
                        return (
                          <div key={ft.id} className="relative group">
                            <button
                              type="button"
                              onClick={() => setFreeActionTireId(ft.id)}
                              className="flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 transition-all hover:scale-105"
                              style={{
                                background: "white",
                                border: "1.5px solid rgba(247,167,52,0.6)",
                                minWidth: 64,
                              }}
                            >
                              <span className="text-[9px] font-black text-[#0A183A]">{ft.marca}</span>
                              <span className="text-[8px] text-[#348CCB]">Sin pos</span>
                            </button>
                            {/* Hover details popover */}
                            <div
                              className="pointer-events-none absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 rounded-xl p-2.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150"
                              style={{
                                background: "#0A183A",
                                color: "white",
                                boxShadow: "0 12px 32px rgba(10,24,58,0.35)",
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              <p className="text-[10px] font-black uppercase tracking-wider text-[#348CCB] mb-1.5">
                                Detalles llanta
                              </p>
                              <div className="space-y-0.5 text-[10px]">
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">ID</span>
                                  <span className="font-mono truncate max-w-[140px]" title={ft.id}>{ft.id.slice(0, 10)}…</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">Marca</span>
                                  <span className="font-bold truncate">{ft.marca || "—"}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">Diseño</span>
                                  <span className="font-bold truncate">{ft.diseno || "—"}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">Dimensión</span>
                                  <span className="font-bold truncate">{ft.dimension || "—"}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">Eje</span>
                                  <span className="font-bold truncate">{ft.eje || "—"}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">Vida</span>
                                  <span className="font-bold truncate">{vidaActual || "—"}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">Prof. inicial</span>
                                  <span className="font-bold">{ft.profundidadInicial ?? "—"} mm</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-white/50">Km recorridos</span>
                                  <span className="font-bold">{ft.kilometrosRecorridos?.toLocaleString() ?? "—"}</span>
                                </div>
                                {typeof ft.diasAcumulados === "number" && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-white/50">Días</span>
                                    <span className="font-bold">{ft.diasAcumulados}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[9px] text-white/50 mt-1.5 pt-1.5 border-t border-white/10">
                                Click para asignar posición o inventario
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-[#92400e]/70 mt-2">
                      Haz clic en una llanta libre para asignarla a una posición o moverla a inventario.
                    </p>
                  </div>
                )}

                {/* Vehicle diagram — click to select. The inspection
                    modal is opened via an explicit "Inspeccionar llanta"
                    button below so users can pick a tire without being
                    forced straight into a form. */}
                <InspectionDiagram
                  tires={tires}
                  tireUpdates={tireUpdates}
                  selectedTireId={selectedTireId}
                  onSelect={setSelectedTireId}
                  configuracion={vehicle?.configuracion}
                />

                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => setShowStructureModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#1E76B6] border border-[#348CCB]/40 hover:bg-[#F0F7FF] transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Editar estructura del vehículo
                  </button>
                </div>

                {/* Selected tire inspection form */}
                {selectedTireId && tires.find((t) => t.id === selectedTireId) && (
                  <div className="mt-4 space-y-3">
                    {/* Mover de posición */}
                    {(() => {
                      const sel = tires.find((t) => t.id === selectedTireId)!;
                      const allPositions = computeAllPositions(tires, vehicle?.configuracion);
                      const otherPositions = allPositions.filter((p) => p !== sel.posicion);
                      return (
                        <div className="rounded-xl p-3" style={{ background: "rgba(30,118,182,0.05)", border: "1px solid rgba(30,118,182,0.18)" }}>
                          <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-1">Mover de posición</p>
                          <p className="text-[10px] text-[#173D68]/70 mb-2">
                            Selecciona una nueva posición o desmonta la llanta para enviarla al inventario.
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {otherPositions.map((p) => {
                              const occupant = tires.find((t) => t.posicion === p);
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => rotateSelectedToPosition(p)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                                  style={{
                                    background: "white",
                                    border: "1px solid rgba(30,118,182,0.4)",
                                    color: "#1E76B6",
                                  }}
                                  title={occupant ? `Actualmente: ${occupant.marca}` : "Posición vacía"}
                                >
                                  P{p}
                                  {occupant && <span className="text-[8px] text-[#348CCB] ml-1">({occupant.marca})</span>}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={desmountSelected}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-90 flex items-center gap-1"
                              style={{
                                background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                                color: "white",
                                border: "1px solid #b91c1c",
                              }}
                              title="Desmontar la llanta y enviarla al inventario"
                            >
                              <X className="w-3 h-3" />
                              Desmontar
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Primary CTA — big, high-contrast button so the
                        inspector can't miss it after picking a tire. */}
                    <button
                      type="button"
                      onClick={() => setModalTireId(selectedTireId)}
                      className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-base font-black text-white uppercase tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        background: "linear-gradient(135deg,#1E76B6,#173D68)",
                        boxShadow: "0 8px 24px rgba(30,118,182,0.35)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <Gauge className="w-5 h-5" />
                      {inspectedIds.has(selectedTireId) ? "Editar inspección" : "Inspeccionar llanta"}
                    </button>
                    {inspectedIds.has(selectedTireId) && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1.5 justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inspección guardada
                      </p>
                    )}
                  </div>
                )}

                {/* Idle state: prompt the user to pick a tire so the
                    modal can open. The old inline per-tire form grid
                    was removed in favor of the click → modal UX. */}
                {!selectedTireId && (
                  <p className="text-[11px] text-[#93b8d4] text-center mt-3">
                    Haz clic en una llanta del croquis para abrir la inspección.
                  </p>
                )}
              </Card>
            )}

            {unionVehicle && unionTires.length > 0 && (
              <Card>
                <CardHeader
                  icon={Link2}
                  title="Neumáticos — Vehículo en Unión"
                  subtitle={`${unionVehicle.placa.toUpperCase()} · ${unionTires.length} llantas`}
                  accent
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {unionTires.map((t) => {
                    const done = inspectedIds.has(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setModalTireId(t.id)}
                        className="rounded-xl px-3 py-3 text-left transition-all hover:shadow-md"
                        style={{
                          border: done ? "1px solid #10b981" : "1px solid rgba(52,140,203,0.25)",
                          background: done ? "rgba(16,185,129,0.05)" : "white",
                        }}
                      >
                        <p className="font-black tracking-widest text-[11px] text-[#0A183A] truncate">
                          {t.placa?.toUpperCase() ?? "—"}
                        </p>
                        <p className="text-[10px] text-[#348CCB] mt-0.5 truncate">
                          Pos. {t.posicion} · {t.marca ?? "—"}
                        </p>
                        {done && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Inspeccionada
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)",
                boxShadow:  "0 4px 20px rgba(30,118,182,0.3)",
              }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando Inspecciones…</>
              ) : (
                <><ChevronRight className="w-4 h-4" /> Guardar Inspecciones</>
              )}
            </button>
          </form>
        )}

        {/* Empty state */}
        {hasVehicle && !hasTires && !loading && (
          <Card>
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="p-5 rounded-3xl" style={{ background: "rgba(30,118,182,0.08)" }}>
                <Circle className="w-12 h-12 text-[#348CCB]/40" />
              </div>
              <p className="text-[#173D68] font-bold">Sin neumáticos registrados</p>
              <p className="text-[#348CCB] text-sm text-center">
                Este vehículo no tiene llantas asignadas en el sistema
              </p>
            </div>
          </Card>
        )}

      {showExport && (
        <ExportModal
          onClose={()  => setShowExport(false)}
          onExport={generatePDF}
          loading={pdfLoading}
        />
      )}

      {showStructureModal && vehicle && (
        <EditStructureModal
          current={vehicle.configuracion}
          onClose={() => setShowStructureModal(false)}
          onSelect={handleUpdateStructure}
          saving={savingStructure}
        />
      )}

      {/* Per-tire inspection modal — primary capture path */}
      {modalTireId && (() => {
        const t = [...tires, ...unionTires].find((x) => x.id === modalTireId);
        if (!t) return null;
        const u = tireUpdates[modalTireId];
        return (
          <TireInspectionModal
            tire={{
              id:       t.id,
              placa:    t.placa,
              marca:    t.marca,
              diseno:   t.diseno,
              dimension: t.dimension,
              posicion:  t.posicion,
              eje:       t.eje,
              profundidadInicial: t.profundidadInicial,
            }}
            initial={{
              profundidadInt: u?.profundidadInt !== undefined && u.profundidadInt !== "" ? String(u.profundidadInt) : "",
              profundidadCen: u?.profundidadCen !== undefined && u.profundidadCen !== "" ? String(u.profundidadCen) : "",
              profundidadExt: u?.profundidadExt !== undefined && u.profundidadExt !== "" ? String(u.profundidadExt) : "",
              presionPsi:     u?.presionPsi     !== undefined && u.presionPsi !== "" ? String(u.presionPsi) : "",
              imageUrls:      u?.imageUrls ?? [],
            }}
            onClose={() => setModalTireId(null)}
            onSave={async (draft) => { await submitSingleInspection(modalTireId, draft); }}
          />
        );
      })()}

      {/* Free-tire action picker — assign to position or to a bucket */}
      {freeActionTireId && (() => {
        const free = freeTires.find((t) => t.id === freeActionTireId);
        if (!free) return null;
        const occupiedPositions = new Set(tires.filter((t) => t.posicion > 0).map((t) => t.posicion));
        const allKnownPositions = computeAllPositions(tires, vehicle?.configuracion);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(10,24,58,0.55)" }}
            onClick={() => setFreeActionTireId(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ border: "1px solid rgba(52,140,203,0.2)" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#348CCB]/15">
                <div>
                  <h3 className="text-sm font-bold text-[#0A183A]">{free.marca} — sin posición</h3>
                  <p className="text-[11px] text-[#93b8d4] mt-0.5">Asígnale una nueva posición o muévela a inventario.</p>
                </div>
                <button type="button" onClick={() => setFreeActionTireId(null)} className="p-1.5 rounded-lg hover:bg-[#F0F7FF] transition-colors">
                  <X className="w-4 h-4 text-[#1E76B6]" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-2">Posiciones</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allKnownPositions.map((p) => {
                      const occupant = tires.find((t) => t.posicion === p);
                      const isOcc = occupiedPositions.has(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => assignFreeTireToPosition(free.id, p)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                          style={{
                            background: isOcc ? "rgba(247,167,52,0.08)" : "white",
                            border: isOcc ? "1px solid rgba(247,167,52,0.5)" : "1px solid rgba(30,118,182,0.4)",
                            color: "#1E76B6",
                          }}
                          title={occupant ? `Esta posición está ocupada por ${occupant.marca} — quedará libre` : "Posición vacía"}
                        >
                          P{p}
                          {occupant && <span className="text-[8px] text-[#92400e] ml-1">({occupant.marca})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-2">Inventario</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => assignFreeTireToBucket(free.id, null)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                      style={{ background: "white", border: "1px solid rgba(30,118,182,0.4)", color: "#1E76B6" }}
                    >
                      ✅ Disponible
                    </button>
                    {bucketData.buckets.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => assignFreeTireToBucket(free.id, b.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                        style={{ background: "white", border: `1px solid ${b.color || "rgba(30,118,182,0.4)"}`, color: b.color || "#1E76B6" }}
                      >
                        {b.icono ?? "📦"} {b.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

        </>
        )}

      </div>
    </div>
  );
}