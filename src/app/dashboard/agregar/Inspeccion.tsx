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

// =============================================================================
// Types
// =============================================================================

type Vehicle = {
  id: string;
  placa: string;
  tipovhc: string;
  tireCount?: number;
  _count?: { tires: number };
  kilometrajeActual: number;
  union?: string[];
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
};

type TireUpdate = {
  profundidadInt:  number | "";
  profundidadCen:  number | "";
  profundidadExt:  number | "";
  presionPsi:      number | "";   // optional
  image:           File | null;
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
}: {
  tires: Tire[];
  tireUpdates: Record<string, TireUpdate>;
  selectedTireId: string | null;
  onSelect: (id: string) => void;
}) {
  // Build axle layout from tire positions
  const { layout, tireMap } = useMemo(() => {
    const map: Record<number, Tire> = {};
    tires.forEach((t) => { if (t.posicion > 0) map[t.posicion] = t; });
    const maxPos = Math.max(0, ...tires.map((t) => t.posicion));

    let axles: number[][];
    if (maxPos <= 2)       axles = [[1, 2]];
    else if (maxPos <= 4)  axles = [[1, 2], [3, 4]];
    else if (maxPos <= 6)  axles = [[1, 2], [3, 4], [5, 6]];
    else if (maxPos <= 8)  axles = [[1, 2], [3, 4, 5, 6], [7, 8]];
    else if (maxPos <= 10) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10]];
    else if (maxPos <= 12) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10], [11, 12]];
    else {
      // Fallback: pairs of 2
      axles = [];
      for (let i = 1; i <= maxPos; i += 2) axles.push(i + 1 <= maxPos ? [i, i + 1] : [i]);
    }

    return { layout: axles, tireMap: map };
  }, [tires]);

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
  const [mode, setMode] = useState<"normal" | "fast">("normal");
  const [placaInput,      setPlacaInput]      = useState("");
  const [newKilometraje,  setNewKilometraje]  = useState(0);
  const [inspectorName,   setInspectorName]   = useState("");   // NEW

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
  const [inspectionData,  setInspectionData]  = useState<InspectionData | null>(null);

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

  // ===========================================================================
  // Submit inspections
  // ===========================================================================

  async function handleSubmitInspections(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const allTires = [...tires, ...unionTires];

    const missing = allTires.filter((t) => {
      const u = tireUpdates[t.id];
      return u.profundidadInt === "" || u.profundidadCen === "" || u.profundidadExt === "";
    });
    if (missing.length > 0) {
      setError("Por favor ingrese valores de profundidad para todos los neumáticos");
      return;
    }

    const zeroCount = allTires.reduce((n, t) => {
      const u = tireUpdates[t.id];
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

      for (const tire of allTires) {
        const upd      = tireUpdates[tire.id];
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

        // Inspector name — one value for the whole session
        if (inspectorName.trim()) {
          payload.inspeccionadoPorNombre = inspectorName.trim();
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
        tires: allTires.map((tire) => {
          const upd      = tireUpdates[tire.id];
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
          {(["normal", "fast"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: mode === m ? "linear-gradient(135deg, #0A183A, #173D68)" : "white",
                color: mode === m ? "#fff" : "#173D68",
                border: mode === m ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)",
              }}
            >
              {m === "fast" && <Zap className="w-3.5 h-3.5" />}
              {m === "normal" ? "Normal" : "Modo Rápido"}
            </button>
          ))}
          {mode === "fast" && (
            <span className="text-[10px] text-[#348CCB] ml-1">Crea vehículos y llantas sobre la marcha</span>
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
                  placeholder="Ej: Carlos Rodríguez  (dejar en blanco si no aplica)"
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

                {/* Vehicle diagram — click to select */}
                <InspectionDiagram
                  tires={tires}
                  tireUpdates={tireUpdates}
                  selectedTireId={selectedTireId}
                  onSelect={setSelectedTireId}
                />

                {/* Selected tire inspection form */}
                {selectedTireId && tires.find((t) => t.id === selectedTireId) && (
                  <div className="mt-4">
                    <TireInspectionCard
                      tire={tires.find((t) => t.id === selectedTireId)!}
                      updates={
                        tireUpdates[selectedTireId] ?? {
                          profundidadInt: "",
                          profundidadCen: "",
                          profundidadExt: "",
                          presionPsi:     "",
                          image:          null,
                        }
                      }
                      onChange={(id, field, value) => {
                        handleInputChange(id, field, value);
                        // Auto-advance to next tire when all 3 depths are filled
                        if (field === "profundidadExt" || field === "profundidadCen" || field === "profundidadInt") {
                          const updated = { ...tireUpdates[id], [field]: value };
                          if (updated.profundidadInt !== "" && updated.profundidadCen !== "" && updated.profundidadExt !== "") {
                            const currentIdx = tires.findIndex((t) => t.id === id);
                            if (currentIdx < tires.length - 1) {
                              setTimeout(() => setSelectedTireId(tires[currentIdx + 1].id), 300);
                            }
                          }
                        }
                      }}
                      isUnion={false}
                    />
                  </div>
                )}

                {/* Fallback: show all if no tire selected */}
                {!selectedTireId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {tires.map((t) => (
                      <TireInspectionCard
                        key={t.id}
                        tire={t}
                        updates={tireUpdates[t.id] ?? { profundidadInt: "", profundidadCen: "", profundidadExt: "", presionPsi: "", image: null }}
                        onChange={handleInputChange}
                        isUnion={false}
                      />
                    ))}
                  </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unionTires.map((t) => (
                    <TireInspectionCard
                      key={t.id}
                      tire={t}
                      updates={
                        tireUpdates[t.id] ?? {
                          profundidadInt: "",
                          profundidadCen: "",
                          profundidadExt: "",
                          presionPsi:     "",
                          image:          null,
                        }
                      }
                      onChange={handleInputChange}
                      isUnion
                    />
                  ))}
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

        </>
        )}

      </div>
    </div>
  );
}