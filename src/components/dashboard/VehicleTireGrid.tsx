"use client";

// =============================================================================
// VehicleTireGrid — visual position picker for the "crear llanta" forms.
//
// When the user picks a vehicle in CrearLlanta, this grid renders every
// position the vehicle expects (1..tireCount) color-coded by occupancy:
//
//   • dashed grey  — empty position (this is what's missing a tire)
//   • solid green  — already has a tire
//   • brand blue   — currently selected for the new tire
//
// Clicking an empty position selects it. Clicking an occupied one
// opens a confirm modal asking whether to move the existing tire to
// the inventory bucket (vehicleId = null) so the new tire can take
// its place. This keeps the operator from blindly stacking two tires
// on the same position — a long-standing source of cleanup work.
//
// Used by both /dashboard/agregar/CrearLlanta and /dashboard/agregarDist/CrearLlanta.
// =============================================================================

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Disc } from "lucide-react";

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
  /** Position currently chosen for the new tire (1-based). 0 / "" means none. */
  selectedPosition: number | "";
  /** Called when the user picks a position (any position — empty or freed). */
  onSelectPosition: (pos: number) => void;
  /** Optional callback fired AFTER an existing tire is successfully moved
   *  to inventory, so the parent can refresh whatever cache it holds. */
  onTireMoved?: (movedTireId: string) => void;
}

export function VehicleTireGrid({
  vehicle, selectedPosition, onSelectPosition, onTireMoved,
}: Props) {
  const [tires, setTires] = useState<TireOnVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Confirm-move modal state. When the user clicks an occupied position
  // we stash both the tire there and the position the user is trying
  // to claim, so "Confirmar" can move + select in one action.
  const [moveTarget, setMoveTarget] = useState<{ tire: TireOnVehicle; position: number } | null>(null);
  const [moving, setMoving] = useState(false);

  // Fetch the vehicle's tires whenever the vehicle changes. cache: 'no-store'
  // matches the dashboard fetch pattern — backend invalidates on every
  // mutation and we want the freshest occupancy map every time.
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
        // Project down to just the fields the grid renders so the row
        // shape stays small and predictable.
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

  if (!vehicle) return null;

  const tireCount = vehicle.tireCount ?? vehicle._count?.tires ?? 0;
  // Defensive: if the vehicle has no declared capacity, fall back to
  // the number of tires currently mounted so we still render something
  // sensible (this happens with legacy vehicles created before tireCount
  // became required).
  const positions = Math.max(tireCount, tires.length);
  if (positions === 0) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-[#F0F7FF] border border-[#348CCB]/20 text-[12px] text-[#173D68]">
        Este vehículo no tiene cantidad de llantas configurada.
      </div>
    );
  }

  // Build a lookup: position → occupying tire (if any).
  const byPos = new Map<number, TireOnVehicle>();
  tires.forEach((t) => { if (t.posicion > 0) byPos.set(t.posicion, t); });
  const filled = byPos.size;

  function handleClick(position: number) {
    const occupying = byPos.get(position);
    if (occupying) {
      // Don't navigate the form yet — let the operator confirm whether
      // to displace the existing tire to inventory first.
      setMoveTarget({ tire: occupying, position });
      return;
    }
    onSelectPosition(position);
  }

  async function confirmMoveToInventory() {
    if (!moveTarget) return;
    setMoving(true);
    try {
      // PATCH the existing tire to detach it from the vehicle and zero
      // its posicion. editTire already invalidates the relevant caches
      // (company + vehicle) so the grid re-fetch below sees fresh data.
      const res = await fetch(`${API_BASE}/tires/${moveTarget.tire.id}/edit`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ vehicleId: null, posicion: 0 }),
      });
      if (!res.ok) throw new Error("No se pudo mover la llanta al inventario");
      // Optimistically clear the position so the new-tire selection
      // takes effect immediately; the next fetch will reconcile.
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
        <p className="text-[11px] font-black uppercase tracking-wider text-[#1E76B6]">
          Posiciones del vehículo
        </p>
        <p className="text-[11px] text-gray-500 tabular-nums">
          {filled}/{positions} ocupadas
        </p>
      </div>

      {/* Legend — quick mental map for the colour code. */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] text-gray-600">
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
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {Array.from({ length: positions }, (_, i) => i + 1).map((pos) => {
            const occupying = byPos.get(pos);
            const isSelected = selectedPosition === pos;
            // Three visual states. The styles are all inline so the
            // colour cascade can't be defeated by Tailwind purge or
            // a parent's prose class — these chips need to render
            // exactly the same on every viewport.
            const styles: React.CSSProperties = isSelected
              ? { background: "#1E76B6", borderColor: "#1E76B6", color: "white" }
              : occupying
                ? { background: "#10b981", borderColor: "#10b981", color: "white" }
                : { background: "white", borderColor: "#9ca3af", borderStyle: "dashed", color: "#6b7280" };
            return (
              <button
                key={pos}
                type="button"
                onClick={() => handleClick(pos)}
                className="relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-[11px] font-bold transition-transform active:scale-[0.97] hover:scale-[1.02]"
                style={styles}
                title={
                  occupying
                    ? `${occupying.placa} · ${occupying.marca} ${occupying.diseno}`
                    : "Posición vacía — haz click para seleccionar"
                }
              >
                <Disc className="w-3.5 h-3.5 mb-0.5 opacity-80" />
                <span className="tabular-nums leading-none">{pos}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-[11px] text-red-600 font-medium">{error}</p>
      )}

      {/* Confirm move-to-inventory modal */}
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
