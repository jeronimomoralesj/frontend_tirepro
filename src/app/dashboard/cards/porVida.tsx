"use client";

import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { HelpCircle } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);
const COLORS = ["#173D68", "#1E76B6", "#348CCB", "#173D68", "#1E76B6"];

export interface VidaEntry {
  fecha: string;
  valor: string;
}

export interface Tire {
  id: string;
  vida: VidaEntry[];
}

interface PorVidaProps {
  tires: Tire[];
}

const PorVida: React.FC<PorVidaProps> = ({ tires }) => {
  // Group tires by the latest vida entry.
  // For each tire, if there is at least one vida entry, we take the last one.
  const grouping = useMemo(() => {
    return tires.reduce((acc: { [key: string]: number }, tire) => {
      if (tire.vida && tire.vida.length > 0) {
        const latestEntry = tire.vida[tire.vida.length - 1];
        const vidaValue = latestEntry.valor.toLowerCase(); // e.g. "reencauche1"
        acc[vidaValue] = (acc[vidaValue] || 0) + 1;
      }
      return acc;
    }, {});
  }, [tires]);

  // Prepare chart data.
  const chartData = useMemo(() => {
    const labels = Object.keys(grouping);
    const values = labels.map((label) => grouping[label]);
    const backgroundColors = labels.map((_, index) => COLORS[index % COLORS.length]);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          cutout: "70%",
        },
      ],
    };
  }, [grouping]);

  // Chart options – keep it simple and similar to PromedioEje.
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll render a custom legend below
      },
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
        callbacks: {
          label: (context: { raw: number; label: string }) => {
            const value = context.raw;
            const total = chartData.datasets[0].data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `Cantidad: ${value} · ${percentage}%`;
          },
          title: () => "Distribución por Vida",
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        display: false,
      },
    },
  };

  const totalTires = useMemo(
    () => Object.values(grouping).reduce((a, b) => a + b, 0),
    [grouping]
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Llantas por Vida</h2>
        <div className="group relative cursor-pointer">
          <HelpCircle
            className="text-white hover:text-gray-200 transition-colors"
            size={24}
          />
          <div
            className="
              absolute z-10 -top-2 right-full 
              bg-[#0A183A] text-white 
              text-xs p-3 rounded-lg 
              opacity-0 group-hover:opacity-100 
              transition-opacity duration-300 
              w-60 pointer-events-none
            "
          >
            <p>
              Este gráfico muestra cómo están distribuidas las llantas según su vida
              útil, por ejemplo: nueva, reencauche1, reencauche2, etc.
            </p>
          </div>
        </div>
      </div>
      {/* Chart */}
      <div className="p-6">
        <div className="h-64 mb-4 relative">
          {totalTires === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              No hay datos de vida disponibles
            </div>
          ) : (
            <>
              <Doughnut data={chartData} options={chartOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-[#0A183A]">{totalTires}</p>
                <p className="text-xs text-gray-400">llantas</p>
              </div>
            </>
          )}
        </div>
        {/* Custom Legend with quantities */}
        <div className="flex flex-wrap justify-center gap-4">
          {chartData.labels.map((label, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className="block w-4 h-4 rounded"
                style={{ backgroundColor: chartData.datasets[0].backgroundColor[index] }}
              ></span>
              <span className="text-xs text-gray-700 uppercase">
                {label} ({chartData.datasets[0].data[index]})
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total de tipos de vida: {chartData.labels.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PorVida;
