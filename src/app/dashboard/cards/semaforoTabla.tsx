"use client";

import React, { useMemo, useState } from "react";
import { HelpCircle, Search, LayoutGrid, Truck } from "lucide-react";

export interface Vehicle {
  id: string;
  placa: string;
}

export interface Inspection {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
}

export interface Tire {
  id: string;
  vehicleId?: string | null;
  posicion: number;
  inspecciones?: Inspection[];
}

interface SemaforoTablaProps {
  vehicles: Vehicle[];
  tires:    Tire[];
}

const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const t = {
  title:    "Semáforo por Posición",
  tooltip:  "Muestra la profundidad mínima por posición en cada vehículo. Colores reflejan el estado actual del neumático.",
  placa:    "Placa",
  pos:      "P",
  search:   "Buscar placa…",
  noData:   "No hay datos disponibles",
  noResults:"Sin resultados",
  vehicles: "vehículos",
};

// Thresholds (mm of min depth across int/cen/ext):
// > 6 mm  → OK (green)
// 3-6 mm  → Watch (amber)
// ≤ 3 mm  → Critical (red)
const depthColor = (v: number | null) => {
  if (v === null) return { bg: "rgba(0,0,0,0.03)", color: "#94a3b8", border: "transparent" };
  if (v <= 3)     return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
  if (v <= 6)     return { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" };
  return           { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" };
};

type Row = {
  vehicleId: string;
  placa:     string;
  depths:    Record<number, number | null>;
  worst:     number | null;
  count:     number;
};

const SemaforoTabla: React.FC<SemaforoTablaProps> = ({ vehicles, tires }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const rows: Row[] = useMemo(() => {
    // Build a single pass index: vehicleId → position → minDepth.
    // The old implementation ran `tires.filter()` inside a loop over
    // every vehicle × every position — for a 500-vehicle, 16k-tire fleet
    // that was ~136 million comparisons per render. A single-pass index
    // cuts it to O(n) total (~16k comparisons + hash lookups).
    const minDepthByVehiclePos = new Map<string, Map<number, number>>();
    const vehicleHasTire = new Set<string>();

    for (const tire of tires) {
      if (!tire.vehicleId) continue;
      vehicleHasTire.add(tire.vehicleId);
      if (!tire.inspecciones || tire.inspecciones.length === 0) continue;
      const last = tire.inspecciones[tire.inspecciones.length - 1];
      const depth = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);

      let posMap = minDepthByVehiclePos.get(tire.vehicleId);
      if (!posMap) {
        posMap = new Map<number, number>();
        minDepthByVehiclePos.set(tire.vehicleId, posMap);
      }
      // If two tires share (vehicle, position) — unusual but legal — keep
      // the worst depth so the cell still reports the most urgent tire.
      const existing = posMap.get(tire.posicion);
      posMap.set(tire.posicion, existing !== undefined ? Math.min(existing, depth) : depth);
    }

    const vehiclesWithTires = vehicles
      .filter((v) => v.placa.toLowerCase() !== "fin")
      .filter((v) => vehicleHasTire.has(v.id));

    return vehiclesWithTires.map((vehicle): Row => {
      const posMap = minDepthByVehiclePos.get(vehicle.id);
      const depths: Record<number, number | null> = {};
      let worst: number | null = null;
      let count = 0;

      for (const pos of positions) {
        const m = posMap?.get(pos);
        if (m !== undefined) {
          depths[pos] = m;
          count++;
          if (worst === null || m < worst) worst = m;
        } else {
          depths[pos] = null;
        }
      }

      return { vehicleId: vehicle.id, placa: vehicle.placa, depths, worst, count };
    });
  }, [vehicles, tires]);

  const activePositions = useMemo(
    () => positions.filter((pos) => rows.some((r) => r.depths[pos] !== null)),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.placa.toLowerCase().includes(q));
  }, [rows, searchTerm]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col w-full min-w-0"
         style={{ boxShadow: "0 4px 24px rgba(10,24,58,0.06)" }}>
      {/* Header */}
      <div
        className="text-white px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2 shrink-0"
        style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.14)" }}>
            <LayoutGrid size={16} className="text-white" />
          </div>
          <h2 className="text-sm sm:text-base lg:text-lg font-bold truncate">{t.title}</h2>
        </div>
        <div className="group relative cursor-pointer flex-shrink-0">
          <HelpCircle className="text-white/80 hover:text-white transition-colors" size={18} />
          <div className="absolute z-20 top-full mt-2 right-0 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none shadow-xl">
            {t.tooltip}
          </div>
        </div>
      </div>

      {/* Controls: search + legend */}
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/40 focus:bg-white transition-all"
            style={{ border: "1px solid rgba(52,140,203,0.18)" }}
            aria-label="Buscar por placa"
          />
        </div>
        {/* Legend chips */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#d1fae5", color: "#065f46" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> &gt;6mm
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#92400e" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 3-6
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#991b1b" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> ≤3
          </span>
        </div>
      </div>

      {/* Body */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          {rows.length === 0 ? t.noData : t.noResults}
        </div>
      ) : (
        <>
          {/* Mobile / tablet: one card per vehicle with position chip grid.
              Avoids the 740px-wide sticky-column table that required
              aggressive horizontal scroll on 375px. */}
          <div className="lg:hidden overflow-y-auto flex-1 p-3 space-y-2.5" style={{ maxHeight: "60vh" }}>
            {filtered.map((row) => (
              <VehicleCard key={row.vehicleId} row={row} activePositions={activePositions} />
            ))}
          </div>

          {/* Desktop: the familiar table with sticky header + placa column */}
          <div
            className="hidden lg:block overflow-x-auto overflow-y-auto flex-1"
            style={{ maxHeight: "55vh", WebkitOverflowScrolling: "touch" }}
          >
            <table className="border-collapse text-xs" style={{ minWidth: "max-content", width: "100%" }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th
                    className="sticky left-0 z-20 px-3 py-2.5 text-left font-bold text-gray-700 whitespace-nowrap bg-gray-50 border-b border-r border-gray-200"
                    style={{ minWidth: 100, boxShadow: "2px 0 4px -1px rgba(0,0,0,0.06)" }}
                  >
                    {t.placa}
                  </th>
                  {activePositions.map((pos) => (
                    <th
                      key={pos}
                      className="px-2 py-2.5 text-center font-bold text-gray-700 whitespace-nowrap bg-gray-50 border-b border-gray-200"
                      style={{ minWidth: 44 }}
                    >
                      {t.pos}{pos}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.vehicleId} className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td
                      className="sticky left-0 z-10 bg-white px-3 py-2 whitespace-nowrap text-xs border-r border-gray-100"
                      style={{ minWidth: 100, boxShadow: "2px 0 4px -1px rgba(0,0,0,0.04)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0A183A] uppercase">{row.placa}</span>
                        {row.worst !== null && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: depthColor(row.worst).border }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </td>
                    {activePositions.map((pos) => {
                      const v = row.depths[pos];
                      const c = depthColor(v);
                      return (
                        <td key={pos} className="px-1.5 py-2 text-center" style={{ minWidth: 44 }}>
                          {v !== null ? (
                            <span
                              className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full tabular-nums"
                              style={{ background: c.bg, color: c.color, minWidth: 30 }}
                            >
                              {v}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs select-none">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between shrink-0">
            <span className="tabular-nums">
              {filtered.length} de {rows.length} {t.vehicles}
            </span>
            <span className="text-[10px] uppercase tracking-wider">Profundidad mínima (mm)</span>
          </div>
        </>
      )}
    </div>
  );
};

// --- Mobile sub-component ----------------------------------------------------

function VehicleCard({ row, activePositions }: { row: Row; activePositions: number[] }) {
  const [open, setOpen] = useState(false);
  const worstC = depthColor(row.worst);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "white",
        border: `1px solid ${row.worst !== null && row.worst <= 3
          ? "rgba(220,38,38,0.3)"
          : row.worst !== null && row.worst <= 6
          ? "rgba(245,158,11,0.3)"
          : "rgba(52,140,203,0.15)"}`,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 active:scale-[0.99] transition-transform"
        aria-expanded={open}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
          <Truck size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-black text-[#0A183A] uppercase truncate">{row.placa}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 tabular-nums">
            {row.count} posición{row.count === 1 ? "" : "es"}
            {row.worst !== null && (
              <>
                {" · "}
                <span className="font-bold" style={{ color: worstC.border }}>
                  mín {row.worst}mm
                </span>
              </>
            )}
          </p>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: worstC.bg, color: worstC.color }}
        >
          {row.worst === null ? "—" : row.worst <= 3 ? "Crítico" : row.worst <= 6 ? "Alerta" : "OK"}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1">
          <div
            className="grid gap-1.5"
            style={{
              // Responsive chip grid: as many as fit, min 44px each. For
              // 17 positions on a 360px screen this gives ~6 columns.
              gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
            }}
          >
            {activePositions.map((pos) => {
              const v = row.depths[pos];
              const c = depthColor(v);
              return (
                <div
                  key={pos}
                  className="flex flex-col items-center justify-center rounded-lg py-1.5"
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    color: c.color,
                  }}
                  aria-label={v !== null ? `Posición ${pos}: ${v} mm` : `Posición ${pos}: sin datos`}
                >
                  <span className="text-[9px] font-bold opacity-70 uppercase leading-none">P{pos}</span>
                  <span className="text-xs font-black tabular-nums mt-0.5">
                    {v === null ? "—" : v}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SemaforoTabla;
