"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

// Define the structure of an inspection entry.
export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
};

// Define the structure of a tire.
export type Tire = {
  id: string;
  profundidadInicial: number;
  inspecciones?: Inspection[];
};

interface TanqueMilimetroProps {
  tires: Tire[];
}

const TanqueMilimetro: React.FC<TanqueMilimetroProps> = ({ tires }) => {
  // Calculate progress for each tire (only if there is at least one inspection)
  const progresses = tires.reduce((acc: number[], tire) => {
    if (tire.inspecciones && tire.inspecciones.length > 0) {
      const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
      const smallestDepth = Math.min(
        lastInspection.profundidadInt,
        lastInspection.profundidadCen,
        lastInspection.profundidadExt
      );
      const progress = (tire.profundidadInicial - smallestDepth) / tire.profundidadInicial;
      acc.push(progress);
    }
    return acc;
  }, []);

  // Calculate the average progress across all tires with inspection data.
  const averageProgress =
    progresses.length > 0
      ? progresses.reduce((sum, p) => sum + p, 0) / progresses.length
      : 0;
  
  // Convert to percentage and round to two decimal places
  const progressPercentage = (averageProgress * 100).toFixed(2);
  const initialDepth = tires.length > 0 
    ? tires[0].profundidadInicial.toFixed(2) 
    : '0.00';

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Tanque por Milímetro</h2>
        <div className="group relative cursor-pointer">
  <HelpCircle
    className="text-white hover:text-gray-200 transition-colors"
    size={24}
  />
  <div className="
    absolute z-10 -top-2 right-full 
    bg-[#0A183A] text-white 
    text-xs p-3 rounded-lg 
    opacity-0 group-hover:opacity-100 
    transition-opacity duration-300 
    w-60 pointer-events-none
  ">
    <p>
    Porcentaje de uso disponible de todas las llantas en la flota. Ejemplo: si queda un 30% restante, significa que solo queda un 30% de la vida útil en promedio de todas las llantas.
    </p>
  </div>
</div>

      </div>
      <div className="p-6">
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Desgaste Promedio</span>
            <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-[#1E76B6] h-4 rounded-full"
              style={{ width: `${averageProgress * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total de Llantas: {tires.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TanqueMilimetro;