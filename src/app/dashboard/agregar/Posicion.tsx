"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  X,
  Download,
  Package,
  Truck,
  Circle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Save,
  Plus,
  Eye,
} from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CroquisPdf from "./croquisPdf";

// =============================================================================
// Constants & Auth
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): Record<string, string> {
  let token: string | null = null;
  try { token = localStorage.getItem("token"); } catch { /* ignore */ }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const ItemTypes = { TIRE: "tire" };

// =============================================================================
// Types
// =============================================================================

interface Inspeccion {
  profundidadInt?: number;
  profundidadCen?: number;
  profundidadExt?: number;
  cpk?: number;
  kilometrosEstimados?: number;
  fecha?: string;
}

interface InventoryBucket {
  id:             string;
  nombre:         string;
  color:          string;
  icono:          string;
  excluirDeFlota: boolean;
  tireCount:      number;
}

interface BucketData {
  disponible: number;
  buckets:    InventoryBucket[];
}

interface Tire {
  id: string;
  marca: string;
  diseno: string;
  dimension?: string;
  eje?: string;
  kilometrosRecorridos?: number;
  posicion?: number | null;
  position?: string | null;
  inspecciones?: Inspeccion[];
  vida?: Array<{ valor: string; fecha: string }>;
  eventos?: Array<{ tipo: string; notas?: string; fecha: string }>;
  costo?: Array<{ valor: number; fecha: string }>;
  costos?: Array<{ valor: number; fecha: string }>;
  vehicleId?: string | null;
}

interface Vehicle {
  id: string;
  placa: string;
  tipovhc?: string;
}

interface TireChange {
  id: string;
  marca: string;
  originalPosition: string | null;
  newPosition: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

function getMinDepth(tire: Tire): string {
  const insps = tire.inspecciones ?? [];
  if (!insps.length) return "Nueva";
  const last = insps[insps.length - 1];
  const min = Math.min(
    last.profundidadInt ?? Infinity,
    last.profundidadCen ?? Infinity,
    last.profundidadExt ?? Infinity
  );
  return min === Infinity ? "Nueva" : `${min}mm`;
}

function getCurrentVida(tire: Tire): string {
  if (Array.isArray(tire.eventos)) {
    const vidaEvents = tire.eventos
      .filter((e) => e.notas && ["nueva","reencauche1","reencauche2","reencauche3","fin"].includes(e.notas))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    if (vidaEvents.length > 0) return vidaEvents[vidaEvents.length - 1].notas!;
  }
  if (Array.isArray(tire.vida) && tire.vida.length > 0) return tire.vida[tire.vida.length - 1].valor;
  return "nueva";
}

function getLastCosto(tire: Tire): number | null {
  const arr = tire.costos ?? tire.costo ?? [];
  if (!arr.length) return null;
  return arr[arr.length - 1].valor;
}

async function fetchInventoryTires(companyId: string): Promise<Tire[]> {
  try {
    const res = await fetch(`${API_BASE}/tires?companyId=${companyId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((t: Tire) => !t.vehicleId && getCurrentVida(t) !== "fin");
  } catch { return []; }
}

async function fetchBuckets(companyId: string): Promise<BucketData> {
  try {
    const res = await fetch(`${API_BASE}/inventory-buckets?companyId=${companyId}`, { headers: authHeaders() });
    if (!res.ok) return { disponible: 0, buckets: [] };
    return await res.json();
  } catch { return { disponible: 0, buckets: [] }; }
}

async function fetchTiresInBucket(companyId: string, bucketId: string): Promise<Tire[]> {
  try {
    const endpoint = bucketId === "disponible"
      ? `${API_BASE}/inventory-buckets/disponible/tires?companyId=${companyId}`
      : `${API_BASE}/inventory-buckets/${bucketId}/tires?companyId=${companyId}`;
    const res = await fetch(endpoint, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// =============================================================================
// Design primitives
// =============================================================================

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

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
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Circle className="w-3.5 h-3.5 text-[#1E76B6]" />
      <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-[0.15em]">{children}</p>
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.2)" }} />
      {count !== undefined && <span className="text-xs text-[#348CCB] font-medium">{count} total</span>}
    </div>
  );
}

// =============================================================================
// Tire tooltip
// =============================================================================

function TireTooltip({ tire }: { tire: Tire }) {
  const lastInsp = (tire.inspecciones ?? []).at(-1);
  const vida     = getCurrentVida(tire);
  const costo    = getLastCosto(tire);

  return (
    <div
      className="absolute z-50 bottom-[115%] left-1/2 -translate-x-1/2 w-56 text-white text-xs rounded-2xl shadow-2xl p-3 pointer-events-none"
      style={{ background: "#0A183A", border: "1px solid rgba(52,140,203,0.3)" }}
    >
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#0A183A]" />
      <p className="font-bold text-sm text-[#348CCB] mb-2 truncate">{tire.marca} — {tire.diseno}</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span className="text-white/50">Dimensión</span><span className="truncate">{tire.dimension ?? "—"}</span>
        <span className="text-white/50">Eje</span><span>{tire.eje ?? "—"}</span>
        <span className="text-white/50">Vida</span><span className="capitalize">{vida}</span>
        <span className="text-white/50">Costo</span><span>{costo ? `$${costo.toLocaleString()}` : "—"}</span>
        <span className="text-white/50">Km Rec.</span>
        <span>{tire.kilometrosRecorridos ? `${tire.kilometrosRecorridos.toLocaleString()} km` : "—"}</span>
      </div>
      {lastInsp && (
        <>
          <div className="border-t border-white/15 my-2" />
          <p className="text-[#348CCB] font-semibold mb-1">Última Inspección</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <span className="text-white/50">Int</span><span>{lastInsp.profundidadInt ?? "—"}mm</span>
            <span className="text-white/50">Cen</span><span>{lastInsp.profundidadCen ?? "—"}mm</span>
            <span className="text-white/50">Ext</span><span>{lastInsp.profundidadExt ?? "—"}mm</span>
            <span className="text-white/50">CPK</span><span>{lastInsp.cpk ? `$${lastInsp.cpk.toFixed(2)}` : "—"}</span>
            <span className="text-white/50">Fecha</span>
            <span>{lastInsp.fecha ? new Date(lastInsp.fecha).toLocaleDateString() : "—"}</span>
          </div>
        </>
      )}
      {!lastInsp && <p className="text-white/40 italic mt-1">Sin inspecciones registradas</p>}
    </div>
  );
}

// =============================================================================
// Draggable tire circle
// =============================================================================

function DraggableTire({ tire, variant = "vehicle" }: { tire: Tire; variant?: "vehicle" | "available" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [{ isDragging }, dragRef] = useDrag(
    () => ({ type: ItemTypes.TIRE, item: { id: tire.id }, collect: (m) => ({ isDragging: !!m.isDragging() }) }),
    [tire.id]
  );
  useEffect(() => { if (ref.current) dragRef(ref.current); }, [dragRef]);
  useEffect(() => { if (isDragging) setHovered(false); }, [isDragging]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-full flex flex-col items-center justify-center cursor-move select-none transition-all"
      style={{
        width: 78, height: 78,
        background: variant === "available"
          ? "linear-gradient(135deg, #1E76B6 0%, #348CCB 100%)"
          : "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: hovered ? "0 8px 24px rgba(10,24,58,0.25)" : "0 2px 8px rgba(10,24,58,0.15)",
        border: "2px solid rgba(52,140,203,0.3)",
      }}
    >
      {hovered && !isDragging && <TireTooltip tire={tire} />}
      <span
        className="text-white font-black text-[10px] tracking-wider text-center px-1 leading-tight"
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {tire.marca.toUpperCase().slice(0, 6)}
      </span>
      <span className="text-white/70 text-[9px] font-medium">{getMinDepth(tire)}</span>
    </div>
  );
}

// =============================================================================
// Inventory tile (rectangular)
// =============================================================================

function InventoryTile({ tire }: { tire: Tire }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [{ isDragging }, dragRef] = useDrag(
    () => ({ type: ItemTypes.TIRE, item: { id: tire.id }, collect: (m) => ({ isDragging: !!m.isDragging() }) }),
    [tire.id]
  );
  useEffect(() => { if (ref.current) dragRef(ref.current); }, [dragRef]);
  useEffect(() => { if (isDragging) setHovered(false); }, [isDragging]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col items-center justify-center rounded-2xl cursor-move select-none px-3 py-3 transition-all"
      style={{
        width: 90, height: 90,
        background: "linear-gradient(135deg, #173D68 0%, #1E76B6 100%)",
        opacity: isDragging ? 0.4 : 1,
        border: "1px solid rgba(52,140,203,0.3)",
        boxShadow: hovered ? "0 6px 20px rgba(10,24,58,0.2)" : "0 2px 8px rgba(10,24,58,0.1)",
      }}
    >
      {hovered && !isDragging && <TireTooltip tire={tire} />}
      <span className="text-white font-black text-[10px] tracking-wider text-center leading-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
        {tire.marca.toUpperCase().slice(0, 6)}
      </span>
      <span className="text-white/70 text-[9px] mt-1 truncate w-full text-center">{tire.diseno}</span>
      <span className="text-white/60 text-[9px] font-semibold">{getMinDepth(tire)}</span>
    </div>
  );
}

// =============================================================================
// Generic drop zone
// =============================================================================

function DropZone({ onDrop, children, className = "", style, activeStyle }: {
  onDrop: (tireId: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
}) {
  const [{ isOver }, dropRef] = useDrop(
    () => ({ accept: ItemTypes.TIRE, drop: (item: { id: string }) => onDrop(item.id), collect: (m) => ({ isOver: !!m.isOver() }) }),
    [onDrop]
  );
  return (
    <div
      ref={dropRef as React.Ref<HTMLDivElement>}
      className={`transition-all duration-200 ${className}`}
      style={{ ...(style ?? {}), ...(isOver ? (activeStyle ?? {}) : {}) }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Tire slot (vehicle position)
// =============================================================================

function TireSlot({ position, tire, onDrop }: { position: string; tire: Tire | null; onDrop: (tireId: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: ItemTypes.TIRE,
      drop: (item: { id: string }) => { if (item.id !== tire?.id) onDrop(item.id); },
      collect: (m) => ({ isOver: !!m.isOver() }),
    }),
    [tire?.id, onDrop]
  );
  useEffect(() => { if (ref.current) dropRef(ref.current); }, [dropRef]);

  return (
    <div
      ref={ref}
      className="rounded-full flex items-center justify-center transition-all duration-200"
      style={{
        width: 78, height: 78,
        background: isOver ? "rgba(30,118,182,0.15)" : tire ? "transparent" : "rgba(52,140,203,0.06)",
        border: isOver ? "2px solid #1E76B6" : tire ? "none" : "2px dashed rgba(52,140,203,0.35)",
      }}
    >
      {tire
        ? <DraggableTire tire={tire} variant="vehicle" />
        : <span className="text-[10px] font-bold text-[#348CCB]/60">{position}</span>}
    </div>
  );
}

// =============================================================================
// Vehicle axle
// =============================================================================

function VehicleAxle({ axleIdx, positions, tireMap, onTireDrop }: {
  axleIdx: number;
  positions: string[];
  tireMap: Record<string, Tire>;
  onTireDrop: (tireId: string, position: string) => void;
}) {
  const mid   = Math.ceil(positions.length / 2);
  const left  = positions.slice(0, mid);
  const right = positions.slice(mid);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-bold text-[#348CCB] uppercase tracking-widest">Eje {axleIdx + 1}</span>
      <div className="flex items-center">
        <div className="h-3 w-2.5 rounded-l-md" style={{ background: "#0A183A" }} />
        <div className="flex items-center gap-0.5">
          {left.map((pos) => (
            <div key={pos} className="flex flex-col items-center">
              <TireSlot position={pos} tire={tireMap[pos] ?? null} onDrop={(id) => onTireDrop(id, pos)} />
              <div className="w-5 h-0.5 mt-1.5" style={{ background: "rgba(52,140,203,0.4)" }} />
            </div>
          ))}
        </div>
        <div className="h-5 flex-grow mx-2 rounded-full flex items-center justify-center" style={{ background: "#0A183A", minWidth: 60 }}>
          <div className="h-1.5 w-10/12 rounded-full" style={{ background: "#1E76B6" }} />
        </div>
        <div className="flex items-center gap-0.5">
          {right.map((pos) => (
            <div key={pos} className="flex flex-col items-center">
              <TireSlot position={pos} tire={tireMap[pos] ?? null} onDrop={(id) => onTireDrop(id, pos)} />
              <div className="w-5 h-0.5 mt-1.5" style={{ background: "rgba(52,140,203,0.4)" }} />
            </div>
          ))}
        </div>
        <div className="h-3 w-2.5 rounded-r-md" style={{ background: "#0A183A" }} />
      </div>
    </div>
  );
}

// =============================================================================
// Vehicle visualization
// =============================================================================

function VehicleVisualization({ tires, onTireDrop, fixedLayout, onLayoutChange }: {
  tires: Tire[];
  onTireDrop: (tireId: string, position: string) => void;
  fixedLayout: string[][] | null;
  onLayoutChange: (layout: string[][]) => void;
}) {
  const computedLayout = React.useMemo(() => {
    const active = tires.filter((t) => t.position && t.position !== "0");
    if (active.length === 0) return [["1", "2"]];
    const maxPos = Math.max(...active.map((t) => parseInt(t.position!)));
    let axleSizes: number[];
    if      (maxPos <= 2)  axleSizes = [2];
    else if (maxPos <= 4)  axleSizes = [2, maxPos - 2];
    else if (maxPos <= 6)  axleSizes = [2, 2, maxPos - 4];
    else if (maxPos <= 8)  axleSizes = [2, Math.floor((maxPos - 2) / 2), maxPos - 2 - Math.floor((maxPos - 2) / 2)];
    else if (maxPos <= 10) axleSizes = [2, 4, maxPos - 6];
    else                   axleSizes = [4, 4, 4];
    axleSizes = axleSizes.slice(0, 3);
    let counter = 1;
    return axleSizes.map((size) => { const a = Array.from({ length: size }, (_, j) => (counter + j).toString()); counter += size; return a; });
  }, [tires]);

  const layout = React.useMemo(() => fixedLayout ?? computedLayout, [fixedLayout, computedLayout]);

  React.useEffect(() => {
    if (!fixedLayout && computedLayout.length > 0) onLayoutChange(computedLayout);
  }, [computedLayout, fixedLayout, onLayoutChange]);

  const layoutWithPositions = React.useMemo(() => {
    let counter = 1;
    return layout.map((axle) => { const p = axle.map((_, i) => (counter + i).toString()); counter += axle.length; return p; });
  }, [layout]);

  const tireMap = React.useMemo(() => {
    const map: Record<string, Tire> = {};
    tires.forEach((t) => { if (t.position && t.position !== "0") map[t.position] = t; });
    return map;
  }, [tires]);

  const addAxle = () => {
    if (layout.length >= 3) return;
    const last = layoutWithPositions.flat();
    const nextStart = last.length > 0 ? parseInt(last[last.length - 1]) + 1 : 1;
    onLayoutChange([...layout, [nextStart.toString(), (nextStart + 1).toString()]]);
  };

  const removeAxle = (idx: number) => {
    if (layout.length <= 1) return;
    onLayoutChange(layout.filter((_, i) => i !== idx));
  };

  const toggleDual = (axleIdx: number) => {
    const newLayout = layout.map((axle, i) => i !== axleIdx ? axle : axle.length === 2 ? [...axle, ...axle] : axle.slice(0, 2));
    let counter = 1;
    const rebuilt = newLayout.map((axle) => { const p = axle.map((_, j) => (counter + j).toString()); counter += axle.length; return p; });
    onLayoutChange(rebuilt);
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl" style={{ background: "rgba(30,118,182,0.10)" }}>
          <Truck className="w-4 h-4 text-[#1E76B6]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#0A183A] leading-none">Configuración — {layout.length} eje{layout.length > 1 ? "s" : ""}</p>
          <p className="text-xs text-[#348CCB] mt-0.5">Arrastra llantas a las posiciones para asignarlas</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 items-center">
        {layoutWithPositions.map((positions, idx) => (
          <div key={idx} className="w-full flex flex-col items-center gap-2">
            <VehicleAxle axleIdx={idx} positions={positions} tireMap={tireMap} onTireDrop={onTireDrop} />
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleDual(idx)}
                className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
              >
                {positions.length === 2 ? "→ Doble" : "→ Simple"}
              </button>
              {layout.length > 1 && (
                <button
                  onClick={() => removeAxle(idx)}
                  className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ background: "rgba(10,24,58,0.06)", color: "#173D68" }}
                >
                  Quitar eje
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {layout.length < 3 && (
        <button
          onClick={addAxle}
          className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
          style={{ border: "2px dashed rgba(52,140,203,0.35)", color: "#1E76B6", background: "transparent" }}
        >
          <Plus className="w-4 h-4" /> Agregar Eje
        </button>
      )}
    </Card>
  );
}

// =============================================================================
// Export modal
// =============================================================================

function ExportModal({ isOpen, onClose, onExport, changes, vehicle }: {
  isOpen: boolean; onClose: () => void; onExport: () => void;
  changes: TireChange[]; vehicle: Vehicle | null;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
        <div className="px-6 py-4 flex justify-between items-center" style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-white" />
            <h3 className="font-semibold text-white text-sm tracking-wide uppercase">Exportar Cambios</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#173D68]">
            <span className="font-bold">{changes.length}</span> cambio(s) para{" "}
            <span className="font-black tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>{vehicle?.placa.toUpperCase()}</span>
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.18)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "rgba(10,24,58,0.04)" }}>
                  <th className="text-left px-3 py-2 font-bold text-[#173D68]">Llanta</th>
                  <th className="text-left px-3 py-2 font-bold text-[#173D68]">Orig.</th>
                  <th className="text-left px-3 py-2 font-bold text-[#173D68]">Nueva</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}>
                    <td className="px-3 py-2 font-semibold text-[#0A183A]">{c.marca}</td>
                    <td className="px-3 py-2 text-[#348CCB]">{c.originalPosition === "0" ? "Inventario" : c.originalPosition ?? "—"}</td>
                    <td className="px-3 py-2 text-[#0A183A] font-medium">{c.newPosition === "0" ? "Inventario" : c.newPosition ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-[#348CCB]/30 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors">
              No exportar
            </button>
            <button onClick={onExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BucketInventoryPanel({
  companyId,
  bucketData,
  onTiresLoaded,
  refreshKey,
}: {
  companyId:    string;
  bucketData:   BucketData;
  onTiresLoaded: (tires: Tire[]) => void;
  refreshKey:   number;
}) {
  const [activeTab,   setActiveTab]   = useState<string>("disponible");
  const [tires,       setTires]       = useState<Tire[]>([]);
  const [loadingTab,  setLoadingTab]  = useState(false);
  const [search,      setSearch]      = useState("");

  // Load tires when tab changes or parent forces refresh
  useEffect(() => {
    if (!companyId) return;
    setLoadingTab(true);
    fetchTiresInBucket(companyId, activeTab)
      .then(t => {
        setTires(t);
        onTiresLoaded(t);   // ← ADD THIS
      })
      .finally(() => setLoadingTab(false));
  }, [companyId, activeTab, refreshKey]);

  const filtered = tires.filter(t =>
    t.marca.toLowerCase().includes(search.toLowerCase()) ||
    t.diseno.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: "disponible", nombre: "Disponible", color: "#1E76B6", icono: "✅", count: bucketData.disponible },
    ...bucketData.buckets.map(b => ({ id: b.id, nombre: b.nombre, color: b.color || "#1E76B6", icono: b.icono || "📦", count: b.tireCount })),
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-3.5 h-3.5 text-[#1E76B6]" />
        <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-[0.15em]">Inventario de la Empresa</p>
        <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.2)" }} />
        <span className="text-xs text-[#348CCB] font-medium">
          {tabs.reduce((s, t) => s + t.count, 0)} total
        </span>
      </div>

      {/* Bucket tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background:  activeTab === tab.id ? tab.color : "rgba(52,140,203,0.06)",
              color:       activeTab === tab.id ? "white"   : "#1E76B6",
              border:      activeTab === tab.id ? "none"    : "1px solid rgba(52,140,203,0.2)",
              boxShadow:   activeTab === tab.id ? `0 2px 8px ${tab.color}40` : "none",
            }}
          >
            <span>{tab.icono}</span>
            {tab.nombre}
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
              style={{
                background: activeTab === tab.id ? "rgba(255,255,255,0.25)" : "rgba(52,140,203,0.12)",
                color:      activeTab === tab.id ? "white" : "#1E76B6",
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Active bucket label */}
      {activeTabData && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
          style={{ background: `${activeTabData.color}10`, border: `1px solid ${activeTabData.color}30` }}
        >
          <span className="text-sm">{activeTabData.icono}</span>
          <p className="text-xs font-bold" style={{ color: activeTabData.color }}>{activeTabData.nombre}</p>
          <span className="text-[10px] text-gray-400 ml-1">— {filtered.length} llantas</span>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Filtrar por marca o referencia..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={`${inputCls} mb-3`}
      />

      {/* Tires grid */}
      {loadingTab ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#1E76B6]" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-wrap gap-3 max-h-64 overflow-y-auto">
          {filtered.map(tire => <InventoryTile key={tire.id} tire={tire} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Package className="w-8 h-8 text-[#348CCB]/30" />
          <p className="text-sm text-[#348CCB]/60 italic">
            {search ? "No se encontraron llantas con ese filtro." : "No hay llantas en este grupo."}
          </p>
        </div>
      )}

      <p className="text-xs text-[#348CCB] mt-3">
        Arrastra una llanta al diagrama del vehículo para asignarla.
      </p>
    </Card>
  );
}

// =============================================================================
// Company inventory modal
// =============================================================================

function CompanyInventoryModal({ tires, onClose }: { tires: Tire[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = tires.filter((t) =>
    t.marca.toLowerCase().includes(search.toLowerCase()) || t.diseno.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
        <div className="px-6 py-4 flex justify-between items-center" style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-white" />
            <h3 className="font-semibold text-white text-sm tracking-wide uppercase">Inventario ({tires.length})</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <input type="text" placeholder="Filtrar por marca o referencia..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} mb-4`} />
          <div className="flex flex-wrap gap-3 max-h-80 overflow-y-auto">
            {filtered.map((tire) => <InventoryTile key={tire.id} tire={tire} />)}
            {filtered.length === 0 && <p className="text-[#348CCB] text-sm italic">No se encontraron llantas.</p>}
          </div>
          <p className="text-xs text-[#348CCB] mt-4">Arrastra una llanta al diagrama del vehículo para asignarla.</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function PosicionPage() {
  const [placa,              setPlaca]              = useState("");
  const [vehicle,            setVehicle]            = useState<Vehicle | null>(null);
  const [allTires,           setAllTires]           = useState<Tire[]>([]);
  const [originalState,      setOriginalState]      = useState<Record<string, string | null>>({});
  const [companyId,          setCompanyId]          = useState<string>("");
  const [bucketData,         setBucketData]         = useState<BucketData>({ disponible: 0, buckets: [] });
  const [companyInventory,   setCompanyInventory]   = useState<Tire[]>([]);
  const [inventoryRefresh,   setInventoryRefresh]   = useState(0);
  const [fixedLayout,        setFixedLayout]        = useState<string[][] | null>(null);
  const [isExportOpen,       setIsExportOpen]       = useState(false);
  const [tireChanges,        setTireChanges]        = useState<TireChange[]>([]);
  const [pdfGenerator,       setPdfGenerator]       = useState<{ generatePDF: () => void } | null>(null);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");
  const [success,            setSuccess]            = useState("");

  const assignedTires  = allTires.filter((t) => t.position && t.position !== "0");
  const availableTires = allTires.filter((t) => !t.position || t.position === "0");
  const hasChanges =
    allTires.some((t) => (t.position ?? null) !== originalState[t.id]) ||
    Object.keys(originalState).some((id) => !allTires.find((t) => t.id === id)) ||
    allTires.some((t) => originalState[t.id] === undefined && t.position);

  useEffect(() => {
  try {
    const user = JSON.parse(localStorage.getItem("user") ?? "{}");
    if (user?.companyId) {
      setCompanyId(user.companyId);
      // Load flat list for drag compatibility + bucket data for the panel
      Promise.all([
        fetchInventoryTires(user.companyId),
        fetchBuckets(user.companyId),
      ]).then(([tires, buckets]) => {
        setCompanyInventory(tires);
        setBucketData(buckets);
      });
    }
  } catch { /* ignore */ }
}, []);

  function calculateChanges(): TireChange[] {
    return allTires
      .map((t) => ({ id: t.id, marca: t.marca, originalPosition: originalState[t.id] ?? null, newPosition: t.position ?? null }))
      .filter((c) => c.originalPosition !== c.newPosition);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (vehicle && allTires.length > 0) setPdfGenerator(CroquisPdf({ vehicle, changes: calculateChanges(), allTires }));
  }, [vehicle, allTires, originalState]);

  async function handleSearch() {
    if (!placa.trim()) return;
    setError(""); setSuccess(""); setVehicle(null); setAllTires([]); setOriginalState({}); setFixedLayout(null);
    setLoading(true);
    try {
      const vRes = await fetch(`${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(placa.trim().toLowerCase())}`, { headers: authHeaders() });
      if (!vRes.ok) throw new Error("Vehículo no encontrado");
      const vData: Vehicle = await vRes.json();
      setVehicle(vData);

      const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vData.id}`, { headers: authHeaders() });
      if (!tRes.ok) throw new Error("Error al obtener las llantas");
      const raw = await tRes.json();
      const tiresData: Tire[] = (Array.isArray(raw) ? raw : []).map((t: Tire) => ({
        ...t,
        position: t.posicion === 0 ? "0" : t.posicion ? t.posicion.toString() : null,
      }));

      const initState: Record<string, string | null> = {};
      tiresData.forEach((t) => { initState[t.id] = t.position ?? null; });
      setAllTires(tiresData);
      setOriginalState(initState);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const moveTire = useCallback((tireId: string, newPosition: string) => {
    setAllTires((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((t) => t.id === tireId);
      if (idx === -1) return prev;
      if (newPosition !== "none" && newPosition !== "0") {
        const existIdx = updated.findIndex((t) => t.position === newPosition);
        if (existIdx !== -1) updated[existIdx] = { ...updated[existIdx], position: null, posicion: null };
      }
      if (newPosition === "none")     updated[idx] = { ...updated[idx], position: null,         posicion: null };
      else if (newPosition === "0")   updated[idx] = { ...updated[idx], position: "0",          posicion: 0 };
      else                            updated[idx] = { ...updated[idx], position: newPosition,  posicion: parseInt(newPosition) };
      return updated;
    });
  }, []);

  const handleDrop = useCallback((tireId: string, newPosition: string) => {
    const invTire = companyInventory.find((t) => t.id === tireId);

    if (newPosition === "none") {
      const tire = allTires.find((t) => t.id === tireId) ?? invTire;
      if (tire) {
        setAllTires((prev) => prev.filter((t) => t.id !== tireId));
        setCompanyInventory((prev) => {
          if (prev.find((t) => t.id === tireId)) return prev;
          return [...prev, { ...tire, position: null, posicion: null, vehicleId: null }];
        });
      }
      return;
    }

    if (invTire) {
      const posicion = newPosition === "0" ? 0 : parseInt(newPosition);
      setAllTires((prev) => {
        const bumped  = prev.find((t) => t.position === newPosition && newPosition !== "0");
        const updated = prev.map((t) => t.position === newPosition && newPosition !== "0" ? { ...t, position: null, posicion: null } : t);
        if (bumped) {
          setCompanyInventory((ci) => {
            if (ci.find((t) => t.id === bumped.id)) return ci;
            return [...ci, { ...bumped, position: null, posicion: null, vehicleId: null }];
          });
        }
        return [...updated, { ...invTire, position: newPosition, posicion }];
      });
      setCompanyInventory((prev) => prev.filter((t) => t.id !== tireId));
      setOriginalState((prev) => ({ ...prev, [tireId]: null }));
    } else {
      moveTire(tireId, newPosition);
    }
  }, [allTires, companyInventory, moveTire]);

  async function handleSave() {
    if (!vehicle) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const removedIds = Object.keys(originalState).filter((id) => !allTires.find((t) => t.id === id));
      if (removedIds.length > 0) {
        await fetch(`${API_BASE}/tires/unassign-vehicle`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ tireIds: removedIds }) });
      }

      const external = allTires.filter((t) => !t.vehicleId || t.vehicleId !== vehicle.id);
      if (external.length > 0) {
        const aRes = await fetch(`${API_BASE}/tires/assign-vehicle`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ vehiclePlaca: placa.trim().toLowerCase(), tireIds: external.map((t) => t.id) }),
        });
        if (aRes.ok) setAllTires((prev) => prev.map((t) => external.find((e) => e.id === t.id) ? { ...t, vehicleId: vehicle.id } : t));
      }

      const updates: Record<string, string> = {};
      allTires.filter((t) => t.position && t.position !== "0").forEach((t) => { if (t.position) updates[t.position] = t.id; });

      const res = await fetch(`${API_BASE}/tires/update-positions`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ placa: placa.trim(), updates }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.message ?? "Error al actualizar posiciones"); }

      const newOriginal: Record<string, string | null> = {};
      allTires.forEach((t) => { newOriginal[t.id] = t.position ?? null; });
      setOriginalState(newOriginal);

      const changes = calculateChanges();
      setTireChanges(changes);
      setSuccess("Posiciones actualizadas exitosamente");
      setInventoryRefresh(r => r + 1);
      setIsExportOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ background: "#ffffff" }}>
        <div className="max-w-5xl mx-auto space-y-4">

          {error   && <Toast type="error"   message={error}   onDismiss={() => setError("")}   />}
          {success && <Toast type="success" message={success} onDismiss={() => setSuccess("")} />}

          {/* Search */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl" style={{ background: "rgba(30,118,182,0.10)" }}>
                <Search className="w-4 h-4 text-[#1E76B6]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A183A] leading-none">Buscar Vehículo</p>
                <p className="text-xs text-[#348CCB] mt-0.5">Ingrese la placa para cargar sus neumáticos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ej: ABC123"
                className={`${inputCls} flex-1`}
                style={{ textTransform: "uppercase" }}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando…</> : <><Search className="w-4 h-4" /> Buscar</>}
              </button>
            </div>
          </Card>

          {/* Vehicle banner */}
          {vehicle && (
            <div
              className="rounded-2xl px-5 py-4 flex items-center justify-between flex-wrap gap-4"
              style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.18)" }}
            >
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#173D68]" />
                <div>
                  <p className="font-black tracking-widest text-[#0A183A]" style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px" }}>
                    {vehicle.placa.toUpperCase()}
                  </p>
                  {vehicle.tipovhc && <p className="text-xs text-[#348CCB] mt-0.5">{vehicle.tipovhc}</p>}
                </div>
              </div>
              <div className="flex gap-6">
                {[["Total", allTires.length], ["Asignadas", assignedTires.length], ["Sin asignar", availableTires.length]].map(([label, val]) => (
                  <div key={label as string} className="text-center">
                    <p className="text-[10px] font-bold text-[#348CCB] uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-black text-[#0A183A]">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available tires */}
          {availableTires.length > 0 && (
            <Card>
              <SectionLabel count={availableTires.length}>Llantas Disponibles</SectionLabel>
              <div className="flex flex-wrap gap-3">
                {availableTires.map((t) => <DraggableTire key={t.id} tire={t} variant="available" />)}
              </div>
            </Card>
          )}

          {/* Company inventory */}
          {companyId && (
            <BucketInventoryPanel
              companyId={companyId}
              bucketData={bucketData}
              onTiresLoaded={(bucketTires) => {
                setCompanyInventory(prev => {
                  const existingIds = new Set(prev.map(t => t.id));
                  const newOnes = bucketTires.filter(t => !existingIds.has(t.id));
                  return newOnes.length ? [...prev, ...newOnes] : prev;
                });
              }}
              refreshKey={inventoryRefresh}
            />
          )}

          {/* Vehicle visualization */}
          {vehicle && (
            <VehicleVisualization tires={allTires} onTireDrop={handleDrop} fixedLayout={fixedLayout} onLayoutChange={setFixedLayout} />
          )}

          {/* Return to inventory zone */}
          {vehicle && (
            <DropZone
              onDrop={(tireId) => handleDrop(tireId, "none")}
              className="rounded-2xl p-6 flex flex-col items-center justify-center gap-2 min-h-[100px]"
              style={{ border: "2px dashed rgba(52,140,203,0.3)", background: "rgba(52,140,203,0.03)" }}
              activeStyle={{ borderColor: "#1E76B6", background: "rgba(30,118,182,0.08)" }}
            >
              <RotateCcw className="w-6 h-6 text-[#348CCB]/60 pointer-events-none" />
              <p className="font-semibold text-sm text-[#1E76B6] pointer-events-none">Devolver al Inventario</p>
              <p className="text-xs text-[#348CCB] pointer-events-none">Arrastra aquí una llanta para quitarla del vehículo</p>
            </DropZone>
          )}

          {/* Action buttons */}
          {vehicle && (
            <div className="flex flex-wrap gap-3 pb-4">
              <button
                onClick={handleSave}
                disabled={loading || !hasChanges}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
              </button>
              {hasChanges && (
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Cancelar Cambios
                </button>
              )}
            </div>
          )}
        </div>

        <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} onExport={() => { pdfGenerator?.generatePDF(); setIsExportOpen(false); }} changes={tireChanges} vehicle={vehicle} />
      </div>
    </DndProvider>
  );
}