"use client";

import { HelpCircle } from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";

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
  tires: Tire[];
}

const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const translations = {
  es: {
    title: "Semáforo Tabla",
    tooltip:
      "Este gráfico muestra tus llantas por posición en cada uno de sus vehículos y su profundidad actual.",
    placa: "Placa",
    pos: "P",
    noData: "No hay datos disponibles",
  },
};

const SemaforoTabla: React.FC<SemaforoTablaProps> = ({ vehicles, tires }) => {
  const [language, setLanguage] = useState<"es">("es");

  useEffect(() => {
    setLanguage("es");
  }, []);

  const t = translations[language];

  const filteredVehicles = useMemo(
    () => vehicles.filter((v) => v.placa.toLowerCase() !== "fin"),
    [vehicles]
  );

  const tableData = useMemo(() => {
    const vehiclesWithTires = filteredVehicles.filter((vehicle) =>
      tires.some((tire) => tire.vehicleId === vehicle.id)
    );

    return vehiclesWithTires.map((vehicle) => {
      const row: { placa: string; depths: { [pos: number]: number | null } } = {
        placa: vehicle.placa,
        depths: {},
      };

      positions.forEach((pos) => {
        const tiresForPos = tires.filter(
          (tire) =>
            tire.vehicleId === vehicle.id &&
            tire.posicion === pos &&
            tire.inspecciones &&
            tire.inspecciones.length > 0
        );

        if (tiresForPos.length > 0) {
          const depthValues = tiresForPos.map((tire) => {
            const last = tire.inspecciones![tire.inspecciones!.length - 1];
            return Math.min(
              last.profundidadInt,
              last.profundidadCen,
              last.profundidadExt
            );
          });
          row.depths[pos] = Math.min(...depthValues);
        } else {
          row.depths[pos] = null;
        }
      });

      return row;
    });
  }, [filteredVehicles, tires]);

  const activePositions = positions.filter((pos) =>
    tableData.some((row) => row.depths[pos] !== null)
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col w-full">
      {/* Header */}
      <div className="bg-[#173D68] text-white px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between shrink-0 gap-2">
        <h2 className="text-base sm:text-xl font-bold truncate">{t.title}</h2>
        <div className="group relative cursor-pointer shrink-0">
          <HelpCircle
            className="text-white hover:text-gray-200 transition-colors"
            size={20}
          />
          {/* Tooltip — drops below on mobile, goes left on sm+ */}
          <div
            className="
              absolute z-20 top-full mt-2 right-0
              sm:-top-2 sm:right-full sm:top-auto sm:mt-0 sm:mr-2
              bg-[#0A183A] text-white text-xs p-3 rounded-lg
              opacity-0 group-hover:opacity-100
              transition-opacity duration-300
              w-52 sm:w-60 pointer-events-none shadow-xl
            "
          >
            <p>{t.tooltip}</p>
          </div>
        </div>
      </div>

      {/* Legend — compact, always visible above the table */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 shrink-0 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" />
          &gt; 6 mm
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />
          3 – 6 mm
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />
          ≤ 3 mm
        </span>
      </div>

      {/* Scrollable table — both axes, capped height */}
      <div
        className="overflow-auto flex-1"
        style={{ maxHeight: "65vh" }}
      >
        {tableData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {t.noData}
          </div>
        ) : (
          <table
            className="border-collapse text-xs sm:text-sm"
            style={{ minWidth: "max-content", width: "100%" }}
          >
            <thead className="sticky top-0 z-10">
              <tr>
                {/* Sticky placa column header */}
                <th
                  className="
                    sticky left-0 z-20
                    px-3 sm:px-4 py-2
                    text-left
                    bg-gray-100 border-b border-gray-200
                    font-semibold text-gray-700 whitespace-nowrap
                    min-w-[90px] sm:min-w-[120px]
                    shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]
                  "
                >
                  {t.placa}
                </th>
                {activePositions.map((pos) => (
                  <th
                    key={pos}
                    className="
                      px-2 sm:px-3 py-2 text-center
                      bg-gray-100 border-b border-gray-200
                      font-semibold text-gray-700 whitespace-nowrap
                      min-w-[44px] sm:min-w-[64px]
                    "
                  >
                    {t.pos}{pos}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                >
                  {/* Sticky placa cell */}
                  <td
                    className="
                      sticky left-0 z-10 bg-white
                      px-3 sm:px-4 py-2
                      font-bold whitespace-nowrap
                      text-xs sm:text-sm
                      border-r border-gray-100
                      min-w-[90px] sm:min-w-[120px]
                      shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]
                    "
                  >
                    {row.placa.toUpperCase()}
                  </td>

                  {activePositions.map((pos) => {
                    const value = row.depths[pos];

                    let bg = "";
                    if (value === null) {
                      bg = "";
                    } else if (value <= 3) {
                      bg = "bg-red-100 text-red-800";
                    } else if (value <= 6) {
                      bg = "bg-yellow-100 text-yellow-800";
                    } else {
                      bg = "bg-green-100 text-green-800";
                    }

                    return (
                      <td
                        key={pos}
                        className="px-2 sm:px-3 py-2 text-center min-w-[44px] sm:min-w-[64px]"
                      >
                        {value !== null ? (
                          <span
                            className={`inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${bg} min-w-[28px]`}
                          >
                            {value}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs select-none">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SemaforoTabla;