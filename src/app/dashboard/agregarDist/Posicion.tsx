"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Search, X, AlertTriangle, Loader2, CheckCircle,
  MapPin, Package, Save, RotateCcw, Download, ChevronRight,
  Gauge,
} from "lucide-react";

// =============================================================================
// Types — aligned with backend schema
// =============================================================================

interface TireEvento {
  id: string;
  tipo: string;
  fecha: string;
  notas?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface TireCosto {
  id: string;
  valor: number;
  fecha: string;
}

interface Inspeccion {
  id: string;
  fecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk?: number | null;
  kmActualVehiculo?: number | null;
  kilometrosEstimados?: number | null;
}

interface Tire {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension?: string;
  eje?: string;
  posicion: number;
  vehicleId?: string | null;
  companyId?: string;
  // Cached analytics
  currentCpk?: number | null;
  currentProfundidad?: number | null;
  alertLevel?: string;
  healthScore?: number | null;
  kilometrosRecorridos?: number;
  // Relations
  inspecciones?: Inspeccion[];
  costos?: TireCosto[];
  eventos?: TireEvento[];
  // UI-only
  position?: string | null; // string form of posicion for DnD
}

interface Vehicle {
  id: string;
  placa: string;
  tipovhc?: string;
  kilometrajeActual?: number;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

const ItemTypes = { TIRE: "tire" };

const VIDA_ORDER = ["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"] as const;

// =============================================================================
// Helpers
// =============================================================================

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } });
}

/** Get current vida from TireEvento[] (backend stores vida in eventos.notas) */
function currentVidaFromEventos(eventos?: TireEvento[]): string {
  if (!eventos?.length) return "nueva";
  const vidaEventos = eventos.filter(
    (e) => e.notas && VIDA_ORDER.includes(e.notas.toLowerCase() as typeof VIDA_ORDER[number])
  );
  if (!vidaEventos.length) return "nueva";
  return vidaEventos[vidaEventos.length - 1].notas!.toLowerCase();
}

function alertColor(level?: string): string {
  if (level === "critical") return "#DC2626";
  if (level === "warning")  return "#D97706";
  if (level === "watch")    return "#2563EB";
  return "#16a34a";
}

function alertBg(level?: string): string {
  if (level === "critical") return "rgba(220,38,38,0.12)";
  if (level === "warning")  return "rgba(217,119,6,0.12)";
  if (level === "watch")    return "rgba(37,99,235,0.12)";
  return "rgba(22,163,74,0.12)";
}

function latestInsp(tire: Tire): Inspeccion | null {
  const insps = tire.inspecciones;
  if (!insps?.length) return null;
  return [...insps].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
}

function totalCosto(tire: Tire): number {
  return tire.costos?.reduce((s, c) => s + c.valor, 0) ?? 0;
}

// =============================================================================
// Design-system micro-components (matching VidaPage)
// =============================================================================

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.15)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
        ...style,
      }}
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
// Tire tooltip
// =============================================================================

const TireTooltip: React.FC<{ tire: Tire }> = ({ tire }) => {
  const insp   = latestInsp(tire);
  const vida   = currentVidaFromEventos(tire.eventos);
  const costo  = totalCosto(tire);

  return (
    <div
      className="absolute z-[100] bottom-[110%] left-1/2 -translate-x-1/2 w-56 text-white text-xs rounded-xl shadow-2xl p-3 pointer-events-none"
      style={{ background: "#0A183A", minWidth: 200 }}
    >
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
        style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #0A183A" }} />

      <div className="font-bold text-sm text-[#348CCB] mb-2 truncate">
        {tire.marca} — {tire.diseno}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span className="text-gray-400">Dimensión</span><span className="truncate">{tire.dimension || "—"}</span>
        <span className="text-gray-400">Eje</span><span>{tire.eje || "—"}</span>
        <span className="text-gray-400">Vida</span><span className="capitalize">{vida}</span>
        <span className="text-gray-400">Costo</span><span>{costo ? `$${costo.toLocaleString()}` : "—"}</span>
        <span className="text-gray-400">Km Rec.</span><span>{tire.kilometrosRecorridos ? `${tire.kilometrosRecorridos.toLocaleString()} km` : "—"}</span>
        {tire.currentCpk != null && <><span className="text-gray-400">CPK</span><span>${tire.currentCpk.toFixed(0)}</span></>}
        {tire.healthScore != null && <><span className="text-gray-400">Health</span><span>{tire.healthScore}/100</span></>}
      </div>

      {insp && (
        <>
          <div className="border-t border-white/20 my-2" />
          <div className="text-[#348CCB] font-semibold mb-1">Última Inspección</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <span className="text-gray-400">Prof. Int</span><span>{insp.profundidadInt ?? "—"}mm</span>
            <span className="text-gray-400">Prof. Cen</span><span>{insp.profundidadCen ?? "—"}mm</span>
            <span className="text-gray-400">Prof. Ext</span><span>{insp.profundidadExt ?? "—"}mm</span>
            <span className="text-gray-400">Fecha</span><span>{new Date(insp.fecha).toLocaleDateString()}</span>
          </div>
        </>
      )}
      {!insp && <div className="text-gray-400 italic mt-1">Sin inspecciones</div>}
    </div>
  );
};

// =============================================================================
// Draggable Tire Circle
// =============================================================================

const DraggableTire: React.FC<{ tire: Tire; variant?: "vehicle" | "available" | "inventory" }> = ({
  tire, variant = "vehicle",
}) => {
  const ref    = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.TIRE,
    item: { id: tire.id },
    collect: (m) => ({ isDragging: !!m.isDragging() }),
  }), [tire.id]);

  useEffect(() => { if (ref.current) dragRef(ref.current); }, [dragRef]);
  useEffect(() => { if (isDragging) setHovered(false); }, [isDragging]);

  const bgMap = {
    vehicle:   "linear-gradient(135deg, #173D68, #1E76B6)",
    available: "linear-gradient(135deg, #0A183A, #173D68)",
    inventory: "linear-gradient(135deg, #065f46, #059669)",
  };

  const level = tire.alertLevel;
  const size  = variant === "inventory" ? 88 : 80;

  return (
    <div
      ref={ref}
      className="relative flex flex-col items-center justify-center cursor-move select-none transition-all duration-200"
      style={{
        width: size, height: size,
        opacity: isDragging ? 0.4 : 1,
        borderRadius: "50%",
        background: bgMap[variant],
        boxShadow: `0 4px 16px rgba(10,24,58,0.25), 0 0 0 2px ${alertColor(level)}44`,
        transform: isDragging ? "scale(0.95)" : hovered ? "scale(1.06)" : "scale(1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && !isDragging && <TireTooltip tire={tire} />}

      {/* Alert dot */}
      {level && level !== "ok" && (
        <div
          className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
          style={{ background: alertColor(level), boxShadow: `0 0 6px ${alertColor(level)}` }}
        />
      )}

      <div className="text-center text-white px-1">
        <div className="text-[10px] font-black truncate" style={{ maxWidth: 60 }}>{tire.marca}</div>
        <div className="text-[9px] opacity-70 truncate" style={{ maxWidth: 60 }}>{tire.diseno}</div>
        {variant !== "available" && (
          <div className="text-[10px] font-bold mt-0.5 opacity-90">
            {variant === "inventory" ? "INV" : `P${tire.posicion || "—"}`}
          </div>
        )}
        {tire.currentProfundidad != null && (
          <div className="text-[9px] opacity-60">{tire.currentProfundidad.toFixed(1)}mm</div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Drop target for a specific vehicle position
// =============================================================================

const TireSlot: React.FC<{
  position: string;
  tire: Tire | null;
  onDrop: (tireId: string) => void;
}> = ({ position, tire, onDrop }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop:   (item: { id: string }) => { if (item.id !== tire?.id) onDrop(item.id); },
    collect: (m) => ({ isOver: !!m.isOver() }),
  }), [tire?.id, onDrop]);

  useEffect(() => { if (ref.current) dropRef(ref.current); }, [dropRef]);

  return (
    <div
      ref={ref}
      className="flex items-center justify-center transition-all duration-200"
      style={{
        width: 80, height: 80,
        borderRadius: "50%",
        border: isOver
          ? "2px solid #1E76B6"
          : "2px dashed rgba(52,140,203,0.35)",
        background: isOver ? "rgba(30,118,182,0.08)" : "rgba(10,24,58,0.02)",
        boxShadow: isOver ? "0 0 0 4px rgba(30,118,182,0.12)" : "none",
      }}
    >
      {tire
        ? <DraggableTire tire={tire} variant="vehicle" />
        : (
          <span className="text-[10px] font-bold text-gray-400 pointer-events-none">
            P{position}
          </span>
        )
      }
    </div>
  );
};

// =============================================================================
// Unassign drop zone
// =============================================================================

const UnassignZone: React.FC<{ onDrop: (id: string) => void }> = ({ onDrop }) => {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop:   (item: { id: string }) => onDrop(item.id),
    collect: (m) => ({ isOver: !!m.isOver() }),
  }), [onDrop]);

  return (
    <div
      ref={dropRef as any}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200 min-h-28"
      style={{
        border: `2px dashed ${isOver ? "#f97316" : "rgba(249,115,22,0.35)"}`,
        background: isOver ? "rgba(249,115,22,0.08)" : "rgba(249,115,22,0.02)",
        boxShadow: isOver ? "0 0 0 4px rgba(249,115,22,0.1)" : "none",
      }}
    >
      <Package className="w-7 h-7" style={{ color: isOver ? "#f97316" : "rgba(249,115,22,0.5)" }} />
      <p className="text-sm font-black" style={{ color: isOver ? "#ea580c" : "rgba(249,115,22,0.7)" }}>
        Devolver al Inventario
      </p>
      <p className="text-xs" style={{ color: "rgba(249,115,22,0.55)" }}>
        Arrastra una llanta aquí para quitarla del vehículo
      </p>
    </div>
  );
};

// =============================================================================
// Vehicle axle diagram
// =============================================================================

function buildAxleLayout(tires: Tire[]): string[][] {
  const active = tires.filter(t => t.position && t.position !== "0");
  if (!active.length) return [["1", "2"]];
  const maxPos = Math.max(...active.map(t => parseInt(t.position!)));

  let sizes: number[];
  if (maxPos <= 2)       sizes = [maxPos];
  else if (maxPos <= 4)  sizes = [2, maxPos - 2];
  else if (maxPos <= 6)  sizes = [2, 2, maxPos - 4];
  else if (maxPos <= 8)  { const r = maxPos - 2; sizes = [2, Math.floor(r/2), r - Math.floor(r/2)]; }
  else if (maxPos <= 10) sizes = [2, 4, maxPos - 6];
  else                   sizes = [4, 4, 4];

  sizes = sizes.slice(0, 3);
  const layout: string[][] = [];
  let counter = 1;
  for (const s of sizes) {
    const axle: string[] = [];
    for (let j = 0; j < s; j++) { axle.push(String(counter++)); }
    layout.push(axle);
  }
  return layout;
}

const VehicleAxle: React.FC<{
  axleIdx: number;
  positions: string[];
  tireMap: Record<string, Tire>;
  onDrop: (tireId: string, pos: string) => void;
}> = ({ axleIdx, positions, tireMap, onDrop }) => {
  const half = Math.ceil(positions.length / 2);
  const left  = positions.slice(0, half);
  const right = positions.slice(half);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">
        Eje {axleIdx + 1}
      </span>
      <div className="flex items-center">
        {/* Left cap */}
        <div className="w-3 h-5 rounded-l-lg" style={{ background: "#0A183A" }} />

        {/* Left tires */}
        <div className="flex items-center gap-1">
          {left.map(pos => (
            <div key={pos} className="flex flex-col items-center gap-1">
              <TireSlot position={pos} tire={tireMap[pos] ?? null} onDrop={(id) => onDrop(id, pos)} />
              <div className="w-5 h-1 rounded-full" style={{ background: "rgba(30,118,182,0.4)" }} />
            </div>
          ))}
        </div>

        {/* Axle bar */}
        <div
          className="h-5 flex-grow mx-2 rounded-full flex items-center justify-center"
          style={{ background: "#0A183A", minWidth: 48 }}
        >
          <div className="h-2 rounded-full" style={{ background: "#1E76B6", width: "80%" }} />
        </div>

        {/* Right tires */}
        <div className="flex items-center gap-1">
          {right.map(pos => (
            <div key={pos} className="flex flex-col items-center gap-1">
              <TireSlot position={pos} tire={tireMap[pos] ?? null} onDrop={(id) => onDrop(id, pos)} />
              <div className="w-5 h-1 rounded-full" style={{ background: "rgba(30,118,182,0.4)" }} />
            </div>
          ))}
        </div>

        {/* Right cap */}
        <div className="w-3 h-5 rounded-r-lg" style={{ background: "#0A183A" }} />
      </div>
    </div>
  );
};

const VehicleDiagram: React.FC<{
  tires: Tire[];
  onDrop: (tireId: string, pos: string) => void;
}> = ({ tires, onDrop }) => {
  const layout = React.useMemo(() => buildAxleLayout(tires), [tires]);
  const tireMap = React.useMemo(() => {
    const m: Record<string, Tire> = {};
    tires.forEach(t => { if (t.position && t.position !== "0") m[t.position] = t; });
    return m;
  }, [tires]);

  const hasActive = tires.some(t => t.position && t.position !== "0");

  return (
    <Card className="p-5">
      <CardTitle icon={MapPin} title="Diagrama del Vehículo" sub={`${layout.length} eje${layout.length > 1 ? "s" : ""} · ${tires.filter(t => t.position && t.position !== "0").length} llantas asignadas`} />
      {!hasActive && (
        <p className="text-xs text-[#1E76B6] italic mb-4">
          Diagrama por defecto — arrastra llantas a las posiciones para asignarlas.
        </p>
      )}
      <div className="flex flex-col gap-8 overflow-x-auto pb-2">
        {layout.map((positions, idx) => (
          <VehicleAxle key={idx} axleIdx={idx} positions={positions} tireMap={tireMap} onDrop={onDrop} />
        ))}
      </div>
    </Card>
  );
};

// =============================================================================
// Stat badge
// =============================================================================

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
    <span className="text-sm font-black text-[#0A183A]">{value}</span>
  </div>
);

// =============================================================================
// Main component
// =============================================================================

const Posicion: React.FC = () => {
  const [searchTerm, setSearchTerm]       = useState("");
  const [vehicle,    setVehicle]          = useState<Vehicle | null>(null);
  const [allTires,   setAllTires]         = useState<Tire[]>([]);
  const [originalState, setOriginalState] = useState<Record<string, string | null>>({});
  const [companyInventory, setCompanyInventory] = useState<Tire[]>([]);
  const [showInventory, setShowInventory] = useState(false);

  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  // -- Inventory fetch on mount -----------------------------------------------
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      const companyId = user?.companyId;
      if (!companyId) return;

      authFetch(`${API_BASE}/tires?companyId=${companyId}`)
        .then(r => r.json())
        .then((data: Tire[]) => {
          if (!Array.isArray(data)) return;
          const filtered = data.filter(t => {
            const vida = currentVidaFromEventos(t.eventos);
            return !t.vehicleId && vida !== "fin";
          });
          setCompanyInventory(filtered);
        })
        .catch(console.error);
    } catch (e) {
      console.error("Could not read user from localStorage", e);
    }
  }, []);

  // -- Search -----------------------------------------------------------------
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setError(""); setSuccess(""); setVehicle(null); setAllTires([]);
    if (!searchTerm.trim()) { setError("Por favor ingrese la placa del vehículo."); return; }

    setLoading(true);
    try {
      const vRes = await authFetch(
        `${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(searchTerm.trim().toLowerCase())}`
      );
      if (!vRes.ok) throw new Error("Vehículo no encontrado");
      const vData: Vehicle = await vRes.json();
      setVehicle(vData);

      const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${vData.id}`);
      if (!tRes.ok) throw new Error("Error al obtener las llantas");
      const tData: Tire[] = await tRes.json();

      const processed = tData.map(t => ({
        ...t,
        position: t.posicion === 0 ? null : t.posicion ? String(t.posicion) : null,
      }));

      const orig: Record<string, string | null> = {};
      processed.forEach(t => { orig[t.id] = t.position; });

      setAllTires(processed);
      setOriginalState(orig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  // -- Computed ---------------------------------------------------------------
  const assigned   = allTires.filter(t => t.position && t.position !== "0");
  const unassigned = allTires.filter(t => !t.position || t.position === "0");

  const hasChanges = allTires.some(t => (t.position ?? null) !== originalState[t.id]) ||
    Object.keys(originalState).some(id => !allTires.find(t => t.id === id));

  // -- Drop handler ----------------------------------------------------------
  const handleDrop = useCallback((tireId: string, newPosition: string) => {
    const fromInventory = companyInventory.find(t => t.id === tireId);

    if (newPosition === "none") {
      // Unassign — remove from vehicle list, push back to company inventory
      const tire = allTires.find(t => t.id === tireId) ?? fromInventory;
      if (!tire) return;
      setAllTires(prev => prev.filter(t => t.id !== tireId));
      setCompanyInventory(prev => {
        if (prev.find(t => t.id === tireId)) return prev;
        return [...prev, { ...tire, position: null, posicion: 0, vehicleId: null }];
      });
      return;
    }

    if (fromInventory) {
      // Pull from company inventory into vehicle
      const posInt = newPosition === "0" ? 0 : parseInt(newPosition);
      setAllTires(prev => {
        // Bump existing tire at that position back to company inventory
        const bumped = prev.find(t => t.position === newPosition && newPosition !== "0");
        let next = prev.map(t =>
          t.position === newPosition && newPosition !== "0"
            ? { ...t, position: null, posicion: 0 }
            : t
        );
        if (bumped) {
          setCompanyInventory(ci =>
            ci.find(t => t.id === bumped.id) ? ci : [...ci, { ...bumped, position: null, posicion: 0, vehicleId: null }]
          );
        }
        return [...next, { ...fromInventory, position: newPosition, posicion: posInt }];
      });
      setCompanyInventory(prev => prev.filter(t => t.id !== tireId));
      setOriginalState(prev => ({ ...prev, [tireId]: null }));
    } else {
      // Rearrange within vehicle
      setAllTires(prev => {
        const idx = prev.findIndex(t => t.id === tireId);
        if (idx === -1) return prev;
        const next = [...prev];
        // Swap occupant if any
        if (newPosition !== "0") {
          const occupantIdx = next.findIndex(t => t.position === newPosition);
          if (occupantIdx !== -1) {
            next[occupantIdx] = {
              ...next[occupantIdx],
              position: next[idx].position,
              posicion: next[idx].posicion,
            };
          }
        }
        next[idx] = {
          ...next[idx],
          position: newPosition,
          posicion: newPosition === "0" ? 0 : parseInt(newPosition),
        };
        return next;
      });
    }
  }, [allTires, companyInventory]);

  // -- Save ------------------------------------------------------------------
  async function handleSave() {
    if (!vehicle) return;
    setSaving(true); setError(""); setSuccess("");

    try {
      // 1. Unassign tires that were removed
      const removedIds = Object.keys(originalState).filter(
        id => originalState[id] !== undefined && !allTires.find(t => t.id === id)
      );
      if (removedIds.length) {
        await authFetch(`${API_BASE}/tires/unassign-vehicle`, {
          method: "POST",
          body: JSON.stringify({ tireIds: removedIds }),
        });
      }

      // 2. Assign new tires from company inventory
      const newTires = allTires.filter(t => !t.vehicleId || t.vehicleId !== vehicle.id);
      if (newTires.length) {
        const res = await authFetch(`${API_BASE}/tires/assign-vehicle`, {
          method: "POST",
          body: JSON.stringify({ vehiclePlaca: vehicle.placa, tireIds: newTires.map(t => t.id) }),
        });
        if (res.ok) {
          setAllTires(prev => prev.map(t =>
            newTires.find(n => n.id === t.id) ? { ...t, vehicleId: vehicle.id } : t
          ));
        }
      }

      // 3. Update positions
      const updates: Record<string, string> = {};
      allTires
        .filter(t => t.position && t.position !== "0")
        .forEach(t => { updates[t.position!] = t.id; });

      const res = await authFetch(`${API_BASE}/tires/update-positions`, {
        method: "POST",
        body: JSON.stringify({ placa: vehicle.placa, updates }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Error al actualizar posiciones");
      }

      // Commit new original state
      const newOrig: Record<string, string | null> = {};
      allTires.forEach(t => { newOrig[t.id] = t.position ?? null; });
      setOriginalState(newOrig);
      setSuccess("Posiciones actualizadas exitosamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  // -- Cancel -----------------------------------------------------------------
  function handleCancel() { handleSearch(); }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ background: "white" }}>
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">

          {/* -- Alerts ---------------------------------------------------- */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="flex-1 text-red-700">{error}</span>
              <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="flex-1 text-green-700">{success}</span>
              <button onClick={() => setSuccess("")}><X className="w-4 h-4 text-green-400" /></button>
            </div>
          )}

          {/* -- Search ---------------------------------------------------- */}
          <Card className="p-4 sm:p-5">
            <CardTitle icon={Search} title="Buscar Vehículo" sub="Ingrese la placa para cargar las llantas" />
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text" value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
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
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Buscando…</>
                  : <><Search className="w-4 h-4" />Buscar</>
                }
              </button>
            </form>
          </Card>

          {/* -- Vehicle info ----------------------------------------------- */}
          {vehicle && (
            <Card className="p-4 sm:p-5">
              <CardTitle icon={CheckCircle} title="Vehículo Encontrado" />
              <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl"
                style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.12)" }}>
                <Stat label="Placa"    value={vehicle.placa.toUpperCase()} />
                {vehicle.tipovhc && <Stat label="Tipo" value={vehicle.tipovhc} />}
                <Stat label="Total Llantas" value={allTires.length} />
                <Stat label="Asignadas"     value={assigned.length} />
                <Stat label="Sin Posición"  value={unassigned.length} />
                {vehicle.kilometrajeActual != null && (
                  <Stat label="Km Actual" value={vehicle.kilometrajeActual.toLocaleString()} />
                )}
              </div>
            </Card>
          )}

          {/* -- Available tires (unassigned vehicle tires) ---------------- */}
          {unassigned.length > 0 && (
            <Card className="p-4 sm:p-5">
              <CardTitle icon={Package} title="Llantas Sin Posición" sub="Arrastra al diagrama para asignar" />
              <div className="flex flex-wrap gap-3">
                {unassigned.map(tire => (
                  <DraggableTire key={tire.id} tire={tire} variant="available" />
                ))}
              </div>
            </Card>
          )}

          {/* -- Company inventory ------------------------------------------ */}
          {companyInventory.length > 0 && (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <CardTitle
                  icon={Package}
                  title="Inventario de la Empresa"
                  sub={`${companyInventory.length} llanta${companyInventory.length !== 1 ? "s" : ""} disponibles`}
                />
                {companyInventory.length > 8 && (
                  <button
                    onClick={() => setShowInventory(v => !v)}
                    className="flex items-center gap-1 text-xs font-bold text-[#1E76B6] hover:opacity-70 transition-opacity"
                  >
                    {showInventory ? "Mostrar menos" : `Ver todas (${companyInventory.length})`}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showInventory ? "rotate-90" : ""}`} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {(showInventory ? companyInventory : companyInventory.slice(0, 8)).map(tire => (
                  <DraggableTire key={tire.id} tire={tire} variant="inventory" />
                ))}
                {!showInventory && companyInventory.length > 8 && (
                  <button
                    onClick={() => setShowInventory(true)}
                    className="flex items-center justify-center text-xs font-bold rounded-full transition-all hover:opacity-80"
                    style={{
                      width: 80, height: 80,
                      border: "2px dashed rgba(5,150,105,0.4)",
                      color: "#059669",
                      background: "rgba(5,150,105,0.04)",
                    }}
                  >
                    +{companyInventory.length - 8}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                Arrastra una llanta verde al diagrama del vehículo para asignarla.
              </p>
            </Card>
          )}

          {/* -- Vehicle diagram -------------------------------------------- */}
          {vehicle && (
            <VehicleDiagram tires={allTires} onDrop={(id, pos) => handleDrop(id, pos)} />
          )}

          {/* -- Unassign zone ---------------------------------------------- */}
          {vehicle && (
            <Card className="p-4 sm:p-5">
              <UnassignZone onDrop={(id) => handleDrop(id, "none")} />
            </Card>
          )}

          {/* -- Alert legend ----------------------------------------------- */}
          {allTires.some(t => t.alertLevel && t.alertLevel !== "ok") && (
            <Card className="p-4 sm:p-5">
              <CardTitle icon={Gauge} title="Leyenda de Alertas" />
              <div className="flex flex-wrap gap-3">
                {(["ok","watch","warning","critical"] as const).map(lvl => (
                  <div key={lvl} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: alertBg(lvl), color: alertColor(lvl), border: `1px solid ${alertColor(lvl)}44` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: alertColor(lvl) }} />
                    {lvl === "ok" ? "Bien" : lvl === "watch" ? "Vigilar" : lvl === "warning" ? "Precaución" : "Crítico"}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* -- Action buttons --------------------------------------------- */}
          {vehicle && (
            <div className="flex flex-wrap gap-3 pb-6">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: hasChanges ? "linear-gradient(135deg, #0A183A, #1E76B6)" : "rgba(10,24,58,0.15)" }}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
                  : <><Save className="w-4 h-4" />Guardar Cambios</>
                }
              </button>

              {hasChanges && (
                <button
                  onClick={handleCancel}
                  disabled={loading || saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: "rgba(10,24,58,0.04)",
                    color: "#0A183A",
                    border: "1px solid rgba(52,140,203,0.2)",
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Cancelar Cambios
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
};

export default Posicion;