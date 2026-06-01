"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
};

export type Tire = {
  id: string;
  profundidadInicial: number;
  inspecciones?: Inspection[];
};

interface TanqueMilimetroProps {
  tires: Tire[];
  language?: "es";
}

const translations = {
  es: {
    title: "Tanque por Milímetro",
    averageWear: "Desgaste Promedio",
    totalTires: "Total de Llantas",
    tooltipText:
      "Porcentaje de uso disponible de todas las llantas en la flota. Ejemplo: si queda un 30% restante, significa que solo queda un 30% de la vida útil en promedio de todas las llantas.",
  },
};

const TanqueMilimetro: React.FC<TanqueMilimetroProps> = ({
  tires,
  language = "es",
}) => {
  const t = translations[language];

  const progresses = tires.reduce((acc: number[], tire) => {
    if (tire.inspecciones && tire.inspecciones.length > 0) {
      const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
      const smallestDepth = Math.min(
        lastInspection.profundidadInt,
        lastInspection.profundidadCen,
        lastInspection.profundidadExt
      );
      const progress =
        1 -
        (tire.profundidadInicial - smallestDepth) / tire.profundidadInicial;
      acc.push(progress);
    }
    return acc;
  }, []);

  const averageProgress =
    progresses.length > 0
      ? progresses.reduce((sum, p) => sum + p, 0) / progresses.length
      : 0;

  const progressPercentage = (averageProgress * 100).toFixed(2);

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden w-full transition-all duration-200"
      style={{ border: '1px solid rgba(10,24,58,0.08)', boxShadow: '0 2px 12px -4px rgba(10,24,58,0.08)' }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid rgba(10,24,58,0.06)' }}>
        <h2 className="text-sm font-bold text-[#0A183A] leading-tight truncate">
          {t.title}
        </h2>
        <div className="group relative cursor-pointer flex-shrink-0">
          <HelpCircle className="text-[#173D68]/40 hover:text-[#173D68] transition-colors" size={18} />
          <div
            className="absolute z-10 top-full mt-2 right-0 bg-[#0A183A] text-white text-xs p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-56 pointer-events-none shadow-xl"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p>{t.tooltipText}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <div className="flex justify-between mb-2 gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
              {t.averageWear}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-gray-800 flex-shrink-0">
              {progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
            <div
              className="bg-[#1E76B6] h-3 sm:h-4 rounded-full transition-all duration-500"
              style={{ width: `${averageProgress * 100}%` }}
            />
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3 sm:pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {t.totalTires}:{" "}
            <span className="font-semibold text-gray-700">{tires.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TanqueMilimetro;