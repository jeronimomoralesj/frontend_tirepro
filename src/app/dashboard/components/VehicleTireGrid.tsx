"use client";

// -----------------------------------------------------------------------------
// Car-layout tire grid. Same axle/position structure that Inspeccion.tsx uses,
// but extracted so search pages (buscar, buscarDist) can render a vehicle's
// tires as a visual car diagram instead of a flat card grid. Tone (border /
// badge color) is plugged in by the caller so the component stays domain-
// agnostic — Inspeccion tones by capture progress; Buscar tones by semaforo
// urgency; anything else can follow the same shape.
//
// Layout rules:
//   - `configuracion` ("2-4", "2-4-4", …) drives the axle split when set.
//   - If not set, a sensible fallback based on highest `posicion` is used.
//   - Any tire whose posicion isn't covered by the picked layout is appended
//     as a trailing axle so it's still visible.
//   - Each axle row: left tires | axle bar | right tires.
//   - Position zero (tires without a slot assigned) is skipped — callers
//     should render those separately if they want to surface them.
// -----------------------------------------------------------------------------

import { useMemo } from "react";

export type GridTire = {
  id: string;
  posicion: number;
};

export type TireTone = {
  /** Main color used for the cell border + corner dot. */
  color: string;
  /** Short human label (for the optional legend). */
  label?: string;
};

export type TireToneFn<T extends GridTire> = (tire: T) => TireTone;

/** Default cell size (square). 52 is the buscar/buscarDist default; Inspeccion
 *  picks 56 when it uses this. Keep multiples of 4 so rounded corners land
 *  on pixel boundaries. */
const DEFAULT_CELL = 52;

export function VehicleTireGrid<T extends GridTire>({
  tires,
  configuracion,
  selectedId,
  onSelect,
  tone,
  cellSize = DEFAULT_CELL,
  renderCellExtra,
}: {
  tires: T[];
  configuracion?: string | null;
  selectedId?: string | null;
  onSelect?: (tire: T) => void;
  tone: TireToneFn<T>;
  cellSize?: number;
  /** Optional tiny caption rendered below the position number — e.g. a
   *  2-char marca abbreviation. Keep it short; the cell is ~52×52. */
  renderCellExtra?: (tire: T) => string | null;
}) {
  const { layout, tireMap } = useMemo(() => {
    const map: Record<number, T> = {};
    tires.forEach((t) => { if (t.posicion > 0) map[t.posicion] = t; });
    const maxPos = Math.max(0, ...tires.map((t) => t.posicion));

    let axles: number[][] = [];
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
    if (axles.length === 0) {
      if (maxPos <= 2)       axles = [[1, 2]];
      else if (maxPos <= 4)  axles = [[1, 2], [3, 4]];
      else if (maxPos <= 6)  axles = [[1, 2], [3, 4], [5, 6]];
      else if (maxPos <= 8)  axles = [[1, 2], [3, 4, 5, 6], [7, 8]];
      else if (maxPos <= 10) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10]];
      else if (maxPos <= 12) axles = [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10], [11, 12]];
      else {
        axles = [];
        for (let i = 1; i <= maxPos; i += 2) {
          axles.push(i + 1 <= maxPos ? [i, i + 1] : [i]);
        }
      }
    }
    // Append any positions the chosen layout missed so every real tire is
    // visible even when configuracion lies about the truck's shape.
    const covered = new Set<number>();
    axles.forEach((a) => a.forEach((p) => covered.add(p)));
    const leftover = tires
      .map((t) => t.posicion)
      .filter((p) => p > 0 && !covered.has(p))
      .sort((a, b) => a - b);
    for (let i = 0; i < leftover.length; i += 2) {
      axles.push(leftover.slice(i, i + 2));
    }
    return { layout: axles, tireMap: map };
  }, [tires, configuracion]);

  const clickable = !!onSelect;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {layout.map((axle, axleIdx) => {
        const mid = Math.ceil(axle.length / 2);
        const left = axle.slice(0, mid);
        const right = axle.slice(mid);
        return (
          <div key={axleIdx} className="flex items-center gap-0">
            <div className="flex items-center gap-1">
              {left.map((pos) => (
                <Cell
                  key={pos} pos={pos} tire={tireMap[pos]} tone={tone}
                  selectedId={selectedId} onSelect={onSelect}
                  cellSize={cellSize} renderExtra={renderCellExtra}
                  clickable={clickable}
                />
              ))}
            </div>
            <div className="h-4 mx-1.5 rounded-full flex items-center justify-center"
              style={{ background: "#0A183A", minWidth: 40, width: 50 }}>
              <div className="h-1 w-8 rounded-full" style={{ background: "#1E76B6" }} />
            </div>
            <div className="flex items-center gap-1">
              {right.map((pos) => (
                <Cell
                  key={pos} pos={pos} tire={tireMap[pos]} tone={tone}
                  selectedId={selectedId} onSelect={onSelect}
                  cellSize={cellSize} renderExtra={renderCellExtra}
                  clickable={clickable}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Cell<T extends GridTire>({
  pos, tire, tone, selectedId, onSelect, cellSize, renderExtra, clickable,
}: {
  pos: number;
  tire: T | undefined;
  tone: TireToneFn<T>;
  selectedId?: string | null;
  onSelect?: (tire: T) => void;
  cellSize: number;
  renderExtra?: (tire: T) => string | null;
  clickable: boolean;
}) {
  // Unfilled slot — shows as a dim outlined circle. No hover/click.
  const t: TireTone = tire ? tone(tire) : { color: "rgba(10,24,58,0.12)" };
  const isSelected = !!tire && tire.id === selectedId;
  const extra = tire && renderExtra ? renderExtra(tire) : null;
  return (
    <button
      type="button"
      onClick={() => { if (tire && onSelect) onSelect(tire); }}
      disabled={!tire || !clickable}
      aria-label={tire ? `Posición ${pos}` : `Posición ${pos} vacía`}
      className="relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 disabled:cursor-default disabled:opacity-40"
      style={{
        width: cellSize, height: cellSize,
        background: tire
          ? (isSelected ? `${t.color}33` : `${t.color}14`)
          : "rgba(10,24,58,0.02)",
        border: `2px solid ${isSelected ? "#1E76B6" : t.color}`,
        boxShadow: isSelected ? "0 0 12px rgba(30,118,182,0.3)" : "none",
      }}
    >
      <span className="text-xs font-black tabular-nums leading-none"
        style={{ color: isSelected ? "#1E76B6" : "#0A183A" }}>{pos}</span>
      {extra && (
        <span className="text-[7px] font-bold truncate mt-0.5"
          style={{ maxWidth: cellSize - 12, color: "#348CCB" }}>{extra}</span>
      )}
      {tire && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ background: t.color }} />
      )}
    </button>
  );
}

/** Helper: render a compact legend below the grid. Pass the same tones
 *  your `tone` function returns so colors line up. */
export function TireGridLegend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="flex items-center justify-center flex-wrap gap-3 mt-1">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
          <span className="text-[10px] text-gray-500 font-medium">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
