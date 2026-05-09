"use client";

// =============================================================================
// VehicleTireGrid — visual position picker for the "crear llanta" forms.
//
// When the operator picks a vehicle in CrearLlanta, this grid renders the
// vehicle's actual axle layout (matching the visual style used in
// /dashboard/posicion + Inspeccion) and color-codes every position by
// occupancy:
//
//   • dashed grey  — empty position (this is what's missing a tire)
//   • solid green  — already mounted
//   • brand blue   — currently selected for the new tire
//
// The form's typed posicion <input> stays — clicking a slot just fills
// it. Clicking an occupied slot opens a confirm modal asking whether
// to move the existing tire to the inventory bucket (vehicleId=null,
// posicion=0) so the new tire can take its place.
//
// Used by both /dashboard/agregar/CrearLlanta and
// /dashboard/agregarDist/CrearLlanta.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Truck } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type GridVehicle = {
  id: string;
  placa: string;
  tipovhc?: string;
  /** "2-2", "2-4", "4-4", "2-4-4", "6-4", "2-2-2", "4-4-4" — same
   *  preset list used by /dashboard/posicion. */
  configuracion?: string | null;
  tireCount?: number;
  _count?: { tires: number };
};

type TireOnVehicle = {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  posicion: number;
};

interface Props {
  vehicle: GridVehicle | null;
  /** Position currently chosen for the new tire (1-based). 0 / "" = none. */
  selectedPosition: number | "";
  onSelectPosition: (pos: number) => void;
  onTireMoved?: (movedTireId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────
// Layout helpers — mirror /dashboard/agregar/Posicion's parseConfig so
// the same "2-4-4" string draws the same axle pattern everywhere.
// ─────────────────────────────────────────────────────────────────────

function parseConfig(cfg: string): number[][] {
  const parts = cfg.split("-").map(Number).filter((n) => n > 0);
  let pos = 1;
  return parts.map((count) => Array.from({ length: count }, () => pos++));
}

/** When the vehicle has no configuracion field, fall back to a sensible
 *  default based on tireCount. Same logic as Posicion's computedLayout. */
function defaultLayout(tireCount: number): number[][] {
  if (tireCount <= 0) return [];
  if (tireCount <= 2) return [[1, 2].slice(0, tireCount)];
  if (tireCount === 4) return parseConfig("2-2");
  if (tireCount === 6) return parseConfig("2-4");
  if (tireCount === 8) return parseConfig("4-4");
  if (tireCount === 10) return parseConfig("2-4-4");
  if (tireCount === 12) return parseConfig("4-4-4");
  // Fallback: 2 on the front axle, the rest split across 2 rear axles.
  const remaining = tireCount - 2;
  const a = Math.ceil(remaining / 2);
  const b = remaining - a;
  return parseConfig(`2-${a}-${b}`);
}

// ─────────────────────────────────────────────────────────────────────
// Visual primitives — single-tire chip + axle bar.
// ─────────────────────────────────────────────────────────────────────

function PositionChip({
  pos, occupying, isSelected, onClick,
}: {
  pos: number;
  occupying: TireOnVehicle | undefined;
  isSelected: boolean;
  onClick: () => void;
}) {
  const styles: React.CSSProperties = isSelected
    ? { background: "#1E76B6", borderColor: "#1E76B6", color: "white" }
    : occupying
      ? { background: "#10b981", borderColor: "#10b981", color: "white" }
      : { background: "white", borderColor: "#9ca3af", borderStyle: "dashed", color: "#6b7280" };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border-2 flex flex-col items-center justify-center text-[10px] font-black transition-transform active:scale-[0.94] hover:scale-[1.06]"
      style={{ ...styles, width: 52, height: 52, lineHeight: 1.05 }}
      title={
        occupying
          ? `${occupying.placa} · ${occupying.marca} ${occupying.diseno}`
          : "Posición vacía — haz click para seleccionar"
      }
    >
      <span className="tabular-nums">{pos}</span>
      {occupying && (
        <span className="text-[8px] font-semibold opacity-90 px-1 max-w-full truncate">
          {occupying.marca.slice(0, 6)}
        </span>
      )}
    </button>
  );
}

function AxleRow({
  axleIdx, positions, byPos, selectedPosition, onClick,
}: {
  axleIdx: number;
  positions: number[];
  byPos: Map<number, TireOnVehicle>;
  selectedPosition: number | "";
  onClick: (pos: number) => void;
}) {
  // Even split: left half / right half. Odd counts give the extra slot
  // to the right side (matches Posicion's Math.ceil(length / 2)).
  const mid = Math.ceil(positions.length / 2);
  const left  = positions.slice(0, mid);
  const right = positions.slice(mid);

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#348CCB]">
        Eje {axleIdx + 1}
      </span>
      <div className="flex items-center justify-center w-full">
        <div className="h-2.5 w-2 rounded-l-md flex-shrink-0" style={{ background: "#0A183A" }} />
        <div className="flex items-center gap-1.5">
          {left.map((p) => (
            <PositionChip
              key={p}
              pos={p}
              occupying={byPos.get(p)}
              isSelected={selectedPosition === p}
              onClick={() => onClick(p)}
            />
          ))}
        </div>
        <div className="h-3 mx-1.5 rounded-full flex items-center justify-center flex-grow"
          style={{ background: "#0A183A", minWidth: 32, maxWidth: 80 }}>
          <div className="h-1 w-9/12 rounded-full" style={{ background: "#1E76B6" }} />
        </div>
        <div className="flex items-center gap-1.5">
          {right.map((p) => (
            <PositionChip
              key={p}
              pos={p}
              occupying={byPos.get(p)}
              isSelected={selectedPosition === p}
              onClick={() => onClick(p)}
            />
          ))}
        </div>
        <div className="h-2.5 w-2 rounded-r-md flex-shrink-0" style={{ background: "#0A183A" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────

export function VehicleTireGrid({
  vehicle, selectedPosition, onSelectPosition, onTireMoved,
}: Props) {
  const [tires, setTires] = useState<TireOnVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moveTarget, setMoveTarget] = useState<{ tire: TireOnVehicle; position: number } | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!vehicle) { setTires([]); setError(""); return; }
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/tires/vehicle?vehicleId=${encodeURIComponent(vehicle.id)}`, {
      headers: authHeaders(),
      cache: "no-store",
    })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then((data: unknown) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        const mapped: TireOnVehicle[] = rows.map((t: any) => ({
          id:       String(t.id),
          placa:    String(t.placa ?? ""),
          marca:    String(t.marca ?? ""),
          diseno:   String(t.diseno ?? ""),
          posicion: Number(t.posicion ?? 0),
        }));
        setTires(mapped);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vehicle?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Layout: prefer vehicle.configuracion. If absent, derive from tireCount.
  // If even tireCount is missing (legacy vehicles), fall back to the highest
  // occupied position so we still draw something useful.
  const layout = useMemo<number[][]>(() => {
    if (!vehicle) return [];
    if (vehicle.configuracion) {
      const parsed = parseConfig(vehicle.configuracion);
      if (parsed.length > 0) return parsed;
    }
    const tireCount = vehicle.tireCount ?? vehicle._count?.tires ?? 0;
    if (tireCount > 0) return defaultLayout(tireCount);
    const maxPos = tires.reduce((m, t) => Math.max(m, t.posicion), 0);
    if (maxPos > 0) return defaultLayout(maxPos);
    return [];
  }, [vehicle, tires]);

  const positions = useMemo(() => layout.flat(), [layout]);
  const byPos = useMemo(() => {
    const m = new Map<number, TireOnVehicle>();
    tires.forEach((t) => { if (t.posicion > 0) m.set(t.posicion, t); });
    return m;
  }, [tires]);

  if (!vehicle) return null;

  if (positions.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-[#F0F7FF] border border-[#348CCB]/20 text-[12px] text-[#173D68]">
        Este vehículo no tiene cantidad de llantas configurada.
      </div>
    );
  }

  const filled = byPos.size;

  function handleClick(position: number) {
    const occupying = byPos.get(position);
    if (occupying) {
      setMoveTarget({ tire: occupying, position });
      return;
    }
    onSelectPosition(position);
  }

  async function confirmMoveToInventory() {
    if (!moveTarget) return;
    setMoving(true);
    try {
      const res = await fetch(`${API_BASE}/tires/${moveTarget.tire.id}/edit`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ vehicleId: null, posicion: 0 }),
      });
      if (!res.ok) throw new Error("No se pudo mover la llanta al inventario");
      setTires((prev) => prev.map((t) =>
        t.id === moveTarget.tire.id ? { ...t, posicion: 0 } : t,
      ));
      onTireMoved?.(moveTarget.tire.id);
      onSelectPosition(moveTarget.position);
      setMoveTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl p-4" style={{ background: "#F8FAFC", border: "1px solid rgba(52,140,203,0.18)" }}>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
          <p className="text-[11px] font-black uppercase tracking-wider text-[#1E76B6] truncate">
            Posiciones del vehículo
          </p>
        </div>
        <p className="text-[11px] text-gray-500 tabular-nums flex-shrink-0">
          {filled}/{positions.length} ocupadas
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          Ocupada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-dashed border-gray-400 bg-white" />
          Falta llanta
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: "#1E76B6" }} />
          Seleccionada
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-[#1E76B6]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="ml-2 text-xs">Cargando posiciones…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-5 items-center overflow-x-auto py-2">
          {layout.map((axle, idx) => (
            <AxleRow
              key={idx}
              axleIdx={idx}
              positions={axle}
              byPos={byPos}
              selectedPosition={selectedPosition}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-[11px] text-red-600 font-medium">{error}</p>
      )}

      {moveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,24,58,0.65)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !moving) setMoveTarget(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 sm:p-6 bg-white"
            style={{ boxShadow: "0 24px 48px -16px rgba(10,24,58,0.45)" }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(245,158,11,0.10)" }}
              >
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-base font-black text-[#0A183A] leading-tight">
                  Ya hay una llanta en esta posición
                </p>
                <p className="text-[12px] text-gray-500 mt-1">
                  Si quieres montar otra aquí, primero hay que mover la actual al inventario.
                </p>
              </div>
            </div>

            <div
              className="rounded-xl p-3 mb-4 text-[12px]"
              style={{ background: "#F8FAFC", border: "1px solid rgba(10,24,58,0.06)" }}
            >
              <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">
                Posición {moveTarget.position}
              </p>
              <p className="font-bold text-[#0A183A]">{moveTarget.tire.placa.toUpperCase()}</p>
              <p className="text-gray-600 truncate capitalize">
                {moveTarget.tire.marca} · {moveTarget.tire.diseno}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                disabled={moving}
                className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                style={{ border: "1px solid rgba(10,24,58,0.10)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmMoveToInventory}
                disabled={moving}
                className="px-4 py-2.5 rounded-xl text-[13px] font-black text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all hover:opacity-95"
                style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
              >
                {moving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                Mover al inventario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
