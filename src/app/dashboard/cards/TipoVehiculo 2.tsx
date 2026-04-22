"use client";

import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { HelpCircle, Activity } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

// Updated color palette to match PorVida
const BACKGROUND_COLORS = ["#0A183A", "#173D68", "#1E76B6", "#348CCB"];
const LIGHT_COLORS = ["#348CCB", "#cffafe", "#d1fae5", "#fef3c7", "#fce7f3"];

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

const TipoVehiculo: React.FC<TipoVehiculoProps> = ({ 
  vehicles, 
  onSelectTipo = () => {}, 
  selectedTipo = null 
}) => {
  // Group vehicles by type summing up tireCount
  const grouping = useMemo(() => {
    return vehicles.reduce((acc: { [tipo: string]: number }, vehicle) => {
      const tipo = vehicle.tipovhc ? vehicle.tipovhc.trim() : "Desconocido";
      acc[tipo] = (acc[tipo] || 0) + vehicle.tireCount;
      return acc;
    }, {});
  }, [vehicles]);

  const tipoTypes = Object.keys(grouping);
  const tipoLabels = tipoTypes.map(tipo => 
    tipo.charAt(0).toUpperCase() + tipo.slice(1)
  );

  // Filter data based on selection (similar to PorVida)
  const values = tipoTypes.map(tipo => 
    selectedTipo && tipo !== selectedTipo ? 0 : grouping[tipo]
  );
  const total = Object.values(grouping).reduce((a, b) => a + b, 0);
  const activeIndices = values.map((v, i) => (v > 0 ? i : -1)).filter((i) => i !== -1);

  const data = {
    labels: activeIndices.map((i) => tipoLabels[i]),
    datasets: [
      {
        data: activeIndices.map((i) => values[i]),
        backgroundColor: activeIndices.map((i) => BACKGROUND_COLORS[i % BACKGROUND_COLORS.length]),
        borderColor: "white",
        borderWidth: 4,
        cutout: "75%",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Add animation configuration for better print handling
    animation: {
      duration: 0, // Disable animations during print
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "white",
        titleColor: "#1e293b",
        bodyColor: "#334155",
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: "bold" },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        borderColor: "#e2e8f0",
        borderWidth: 1,
        callbacks: {
          label: (context: { raw: number; label: string }) => {
            const value = context.raw;
            const percent = total ? Math.round((value / total) * 100) : 0;
            return `${context.label}: ${value} llantas · ${percent}%`;
          },
        },
      },
    },
    onClick: (
      _: React.MouseEvent<HTMLCanvasElement>,
      elements: { index: number }[]
    ) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const tipo = tipoTypes[activeIndices[index]];
        onSelectTipo(tipo === selectedTipo ? null : tipo);
      }
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Llantas por Tipo de Vehículo</h2>
        <div className="group relative cursor-pointer print:hidden">
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
              Este gráfico muestra la distribución de llantas por tipo de
              vehículo. Cada sector representa un tipo de vehículo con su
              proporción de llantas.
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Chart container with improved positioning for print */}
        <div className="h-64 mb-4 relative print:h-48">
          {total === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Activity size={32} />
              <p>No hay datos de tipo de vehículo disponibles</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Canvas container with fixed positioning */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full max-w-64 max-h-64 print:max-w-48 print:max-h-48">
                  <Doughnut data={data} options={options} />
                </div>
              </div>
              {/* Center text with improved positioning */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <p className="text-3xl font-bold text-[#0A183A] print:text-2xl">{total}</p>
                <p className="text-sm text-gray-500 print:text-xs">llantas inspeccionadas</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Legend grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 print:gap-2 print:mt-4">
          {activeIndices.map((i) => (
            <div
              key={i}
              onClick={() => onSelectTipo(tipoTypes[i] === selectedTipo ? null : tipoTypes[i])}
              className={`p-3 rounded-xl border hover:shadow transition-all cursor-pointer print:cursor-default print:p-2 print:rounded-lg ${
                selectedTipo === tipoTypes[i] ? "bg-opacity-30 scale-105 print:scale-100" : ""
              }`}
              style={{
                backgroundColor: LIGHT_COLORS[i % LIGHT_COLORS.length],
              }}
            >
              <div className="flex items-center gap-3 print:gap-2">
                <div 
                  className="text-white p-2 rounded-full print:p-1" 
                  style={{ backgroundColor: BACKGROUND_COLORS[i % BACKGROUND_COLORS.length] }}
                >

                </div>
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">{tipoLabels[i]}</p>
                  <p className="text-lg font-bold text-gray-800 print:text-base">{grouping[tipoTypes[i]]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center mt-4 print:pt-2 print:mt-2">
          <div className="text-xs text-gray-500 print:text-xs">
            Total de tipos de vehículo: {activeIndices.length}
          </div>
          <div className="text-xs text-gray-500 print:text-xs">Estado actual de llantas</div>
        </div>
      </div>
    </div>
  );
};

export default TipoVehiculo;