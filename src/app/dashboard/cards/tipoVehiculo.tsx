"use client";

import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { HelpCircle, Activity, Truck } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

// Extended palette — previous version only had 4 core colors, which wrapped
// visibly when a fleet had >4 vehicle types. With 10+ types the donut turned
// into 4 big bands of repeated color. 10 distinct colors cover all real-world
// fleets; anything beyond gets grouped into "Otros".
const PALETTE = [
  "#0A183A", "#173D68", "#1E76B6", "#348CCB", "#5BA3D5",
  "#7DC5F0", "#166E74", "#0F9B8E", "#5FBFAF", "#94A3B8",
];
const OTROS_COLOR = "#64748b";

// After this many entries in the legend we collapse the long tail into
// "Otros" to keep the visual parseable. Top N are shown individually,
// everything else is aggregated.
const TOP_N = 8;

export interface Vehicle {
  id: string;
  tipovhc: string;
  tireCount: number;
}

interface TipoVehiculoProps {
  vehicles: Vehicle[];
  onSelectTipo?: (tipo: string | null) => void;
  selectedTipo?: string | null;
}

type Bucket = { key: string; label: string; value: number; color: string; isOtros: boolean };

const TipoVehiculo: React.FC<TipoVehiculoProps> = ({
  vehicles,
  onSelectTipo = () => {},
  selectedTipo = null,
}) => {
  // Group vehicles by type, summing tireCount. "Desconocido" fills in missing.
  const buckets = useMemo<Bucket[]>(() => {
    const grouping = vehicles.reduce<Record<string, number>>((acc, v) => {
      const tipo = v.tipovhc?.trim() || "Desconocido";
      acc[tipo] = (acc[tipo] || 0) + v.tireCount;
      return acc;
    }, {});

    // Sort descending by tire count so the most important types win the
    // top-N slots and get real colors. Everything past the threshold is
    // collapsed into a single "Otros" bucket.
    const sorted = Object.entries(grouping)
      .sort(([, a], [, b]) => b - a)
      .map(([key, value]) => ({ key, value }));

    const top = sorted.slice(0, TOP_N);
    const tail = sorted.slice(TOP_N);
    const tailSum = tail.reduce((s, x) => s + x.value, 0);

    const result: Bucket[] = top.map((b, i) => ({
      key: b.key,
      label: b.key.charAt(0).toUpperCase() + b.key.slice(1),
      value: b.value,
      color: PALETTE[i % PALETTE.length],
      isOtros: false,
    }));

    if (tail.length > 0) {
      result.push({
        key: "__otros__",
        label: `Otros (${tail.length})`,
        value: tailSum,
        color: OTROS_COLOR,
        isOtros: true,
      });
    }
    return result;
  }, [vehicles]);

  const total = useMemo(
    () => buckets.reduce((s, b) => s + b.value, 0),
    [buckets],
  );

  // When a type is selected, dim others by excluding from the donut. The
  // center text shows the selected type's value instead of the total.
  const visibleBuckets = selectedTipo
    ? buckets.filter((b) => b.key === selectedTipo)
    : buckets;
  const visibleTotal = visibleBuckets.reduce((s, b) => s + b.value, 0);

  const data = {
    labels: visibleBuckets.map((b) => b.label),
    datasets: [
      {
        data: visibleBuckets.map((b) => b.value),
        backgroundColor: visibleBuckets.map((b) => b.color),
        borderColor: "white",
        borderWidth: 3,
        cutout: "72%",
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "white",
        titleColor: "#0A183A",
        bodyColor: "#334155",
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: "bold" as const },
        bodyFont:  { family: "'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        borderColor: "#e2e8f0",
        borderWidth: 1,
        callbacks: {
          label: (ctx: { raw: number; label: string }) => {
            const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
            return `${ctx.label}: ${ctx.raw.toLocaleString("es-CO")} · ${pct}%`;
          },
        },
      },
    },
    onClick: (
      _: React.MouseEvent<HTMLCanvasElement>,
      elements: { index: number }[],
    ) => {
      if (elements.length > 0) {
        const clicked = visibleBuckets[elements[0].index];
        if (!clicked || clicked.isOtros) return;
        onSelectTipo(clicked.key === selectedTipo ? null : clicked.key);
      }
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300"
         style={{ boxShadow: "0 4px 24px rgba(10,24,58,0.06)" }}>
      {/* Header */}
      <div
        className="text-white px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2"
        style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg flex-shrink-0"
               style={{ background: "rgba(255,255,255,0.14)" }}>
            <Truck size={16} className="text-white" />
          </div>
          <h2 className="text-sm sm:text-base lg:text-lg font-bold truncate">
            Llantas por Tipo de Vehículo
          </h2>
        </div>
        <div className="group relative cursor-pointer flex-shrink-0 print:hidden">
          <HelpCircle className="text-white/80 hover:text-white transition-colors" size={18} />
          <div className="absolute z-20 top-full mt-2 right-0 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none shadow-xl">
            Distribución de llantas por tipo de vehículo. Los sectores muestran la proporción; toca uno para filtrar el resto del tablero.
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2 p-4">
          <Activity size={28} />
          <p className="text-xs">No hay datos de tipo de vehículo disponibles</p>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          {/* Responsive layout:
              - < sm: donut on top, legend stacks below (list)
              - ≥ sm: donut left, scrollable legend right (parallel) */}
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 sm:gap-5">
            {/* Donut */}
            <div className="relative mx-auto w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] lg:w-[220px] lg:h-[220px] flex-shrink-0">
              <Doughnut data={data} options={options as never} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold leading-none">
                  {selectedTipo ? "Seleccionado" : "Total"}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-[#0A183A] mt-1 leading-none tabular-nums">
                  {visibleTotal.toLocaleString("es-CO")}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">llantas</p>
              </div>
            </div>

            {/* Legend — scrollable when many types */}
            <div className="flex-1 min-w-0">
              <div
                className="space-y-1.5 sm:space-y-2 overflow-y-auto pr-1"
                style={{ maxHeight: "260px" }}
              >
                {buckets.map((b) => {
                  const pct = total ? (b.value / total) * 100 : 0;
                  const isSelected = selectedTipo === b.key;
                  const isDimmed = selectedTipo != null && !isSelected;
                  const clickable = !b.isOtros;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      disabled={!clickable}
                      onClick={() =>
                        clickable && onSelectTipo(b.key === selectedTipo ? null : b.key)
                      }
                      className="w-full text-left group/row"
                      aria-label={`${b.label}: ${b.value} llantas, ${Math.round(pct)} por ciento`}
                      aria-pressed={isSelected}
                      style={{
                        opacity: isDimmed ? 0.4 : 1,
                        cursor: clickable ? "pointer" : "default",
                        transition: "opacity 200ms",
                      }}
                    >
                      <div
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors"
                        style={{
                          background: isSelected ? `${b.color}10` : "transparent",
                          border: isSelected
                            ? `1px solid ${b.color}40`
                            : "1px solid transparent",
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: b.color }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs sm:text-[13px] font-semibold text-[#0A183A] truncate">
                              {b.label}
                            </span>
                            <span className="text-[11px] font-bold text-[#173D68] tabular-nums flex-shrink-0">
                              {b.value.toLocaleString("es-CO")}
                            </span>
                          </div>
                          {/* Mini percentage bar — visual anchor for scannability */}
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="flex-1 h-1 rounded-full overflow-hidden"
                              style={{ background: "rgba(10,24,58,0.06)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: b.color,
                                  transition: "width 300ms ease",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 tabular-nums w-9 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-[11px] text-gray-500">
                <span>
                  {buckets.length} tipo{buckets.length === 1 ? "" : "s"}
                  {buckets.some((b) => b.isOtros) && " (top 8 + otros)"}
                </span>
                {selectedTipo && (
                  <button
                    onClick={() => onSelectTipo(null)}
                    className="text-[#1E76B6] font-semibold hover:underline"
                  >
                    Limpiar filtro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TipoVehiculo;
