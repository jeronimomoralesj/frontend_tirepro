"use client";

import React, { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { HelpCircle, Activity } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

const BACKGROUND_COLORS = ["#0A183A", "#173D68", "#1E76B6", "#348CCB"];
const LIGHT_COLORS = ["#dbeafe", "#cffafe", "#d1fae5", "#fef3c7"];

export interface VidaEntry { fecha: string; valor: string; }
export interface Tire { id: string; vida: VidaEntry[]; }

interface PorVidaProps {
  tires: Tire[];
  onSelectVida?: (vida: string | null) => void;
  selectedVida?: string | null;
}

const translations = {
  es: {
    title: "Llantas por Vida",
    tooltip: "Este gráfico muestra cómo están distribuidas las llantas según su vida útil, por ejemplo: nueva, reencauche1, reencauche2, etc.",
    noDataAvailable: "No hay datos de vida disponibles",
    inspectedTires: "llantas",
    totalLifeTypes: "Tipos de vida:",
    currentTireStatus: "Estado actual",
    tiresLabel: "llantas",
  },
};

const PorVida: React.FC<PorVidaProps> = ({
  tires,
  onSelectVida = () => {},
  selectedVida = null,
}) => {
  const t = translations["es"];

  const grouping = useMemo(() => {
    return tires.reduce((acc: { [key: string]: number }, tire) => {
      if (tire.vida && tire.vida.length > 0) {
        const vidaValue = tire.vida[tire.vida.length - 1].valor.toLowerCase();
        acc[vidaValue] = (acc[vidaValue] || 0) + 1;
      }
      return acc;
    }, {});
  }, [tires]);

  const vidaTypes = Object.keys(grouping);
  const vidaLabels = vidaTypes.map(
    (v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/(\d+)/, " $1")
  );

  const values = vidaTypes.map((vida) =>
    selectedVida && vida !== selectedVida ? 0 : grouping[vida]
  );
  const total = Object.values(grouping).reduce((a, b) => a + b, 0);
  const activeIndices = values.map((v, i) => (v > 0 ? i : -1)).filter((i) => i !== -1);

  const data = {
    labels: activeIndices.map((i) => vidaLabels[i]),
    datasets: [
      {
        data: activeIndices.map((i) => values[i]),
        backgroundColor: activeIndices.map((i) => BACKGROUND_COLORS[i % BACKGROUND_COLORS.length]),
        borderColor: "white",
        borderWidth: 3,
        cutout: "72%",
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
        titleColor: "#1e293b",
        bodyColor: "#334155",
        titleFont: { size: 12, weight: "bold" as const },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        borderColor: "#e2e8f0",
        borderWidth: 1,
        callbacks: {
          label: (context: { raw: number; label: string }) => {
            const value = context.raw;
            const percent = total ? Math.round((value / total) * 100) : 0;
            return `${context.label}: ${value} ${t.tiresLabel} · ${percent}%`;
          },
        },
      },
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const vida = vidaTypes[activeIndices[index]];
        onSelectVida(vida === selectedVida ? null : vida);
      }
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col w-full min-w-0">
      {/* Header */}
      <div className="bg-[#173D68] text-white px-4 py-3 flex items-center justify-between shrink-0 gap-2">
        <h2 className="text-base font-bold truncate">{t.title}</h2>
        <div className="group relative cursor-pointer shrink-0 print:hidden">
          <HelpCircle className="text-white hover:text-gray-200 transition-colors" size={20} />
          <div className="absolute z-10 top-full mt-2 right-0 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-52 pointer-events-none shadow-xl">
            <p>{t.tooltip}</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Donut chart — fixed square container, centered */}
        <div className="relative w-full" style={{ height: 200 }}>
          {total === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <Activity size={28} />
              <p className="text-xs text-center">{t.noDataAvailable}</p>
            </div>
          ) : (
            <>
              <Doughnut data={data} options={options} />
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-black text-[#0A183A]">{total}</p>
                <p className="text-xs text-gray-500">{t.inspectedTires}</p>
              </div>
            </>
          )}
        </div>

        {/* Legend grid — 2 cols always */}
        {activeIndices.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {activeIndices.map((i) => (
              <button
                key={i}
                onClick={() =>
                  onSelectVida(vidaTypes[i] === selectedVida ? null : vidaTypes[i])
                }
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedVida === vidaTypes[i] ? "ring-2 ring-[#1E76B6] scale-[1.02]" : "hover:shadow-sm"
                }`}
                style={{ backgroundColor: LIGHT_COLORS[i % LIGHT_COLORS.length] }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: BACKGROUND_COLORS[i % BACKGROUND_COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 truncate leading-tight">{vidaLabels[i]}</p>
                    <p className="text-sm font-bold text-gray-800">{grouping[vidaTypes[i]]}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">{t.totalLifeTypes} {activeIndices.length}</span>
          <span className="text-xs text-gray-500">{t.currentTireStatus}</span>
        </div>
      </div>
    </div>
  );
};

export default PorVida;