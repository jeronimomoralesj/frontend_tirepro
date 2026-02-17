"use client";

import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { HelpCircle } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

const translations = {
  es: {
    title: "Llantas por Marca",
    tooltip:
      "Este gráfico muestra como están distribuidas las llantas por marca, es decir la cantidad de llantas que hay por cada una de las marcas.",
    totalBrands: "Total de marcas:",
    quantity: "Cantidad:",
    quantityLabel: "Cantidad de llantas",
    brand: "Marca",
  },
};

interface PorMarcaProps {
  groupData: { [marca: string]: number };
}

const PorMarca: React.FC<PorMarcaProps> = ({ groupData }) => {
  const [language, setLanguage] = useState<"es">("es");

  useEffect(() => {
    setLanguage("es");
  }, []);

  const t = translations[language];

  const entryCount = Object.keys(groupData).length;
  const dynamicHeight = Math.max(200, entryCount * 40 + 80);

  const chartData = {
    labels: Object.keys(groupData),
    datasets: [
      {
        data: Object.values(groupData),
        backgroundColor: Object.keys(groupData).map(() => "#173D68"),
        borderRadius: 8,
        barPercentage: 0.6,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { left: 0, right: 20, top: 8, bottom: 0 },
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
        callbacks: {
          label: (context: { raw: number }) => {
            const value = context.raw;
            const total = chartData.datasets[0].data.reduce((s: number, v: number) => s + v, 0);
            const pct = Math.round((value / total) * 100);
            return `${t.quantity} ${value} · ${pct}%`;
          },
          title: (items: { label: string }[]) => `${t.brand} ${items[0].label}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        color: "white",
        font: { family: "'Inter', sans-serif", size: 11, weight: "600" },
        formatter: (value: number) => `${value}`,
        anchor: "center",
        align: "center",
        clamp: true,
      },
    },
    scales: {
      x: {
        display: true,
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { family: "'Inter', sans-serif", size: 11, weight: "500" },
        },
        grid: { display: true, color: "rgba(226, 232, 240, 0.3)", drawBorder: false },
        border: { display: false },
      },
      y: {
        display: true,
        ticks: {
          color: "#94a3b8",
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 6,
          maxRotation: 0,
        },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-4 sm:p-5 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold">{t.title}</h2>
        <div className="group relative cursor-pointer shrink-0 ml-2" title="Información sobre el gráfico">
          <HelpCircle className="text-white hover:text-gray-200 transition-colors" size={22} />
          <div className="absolute z-20 -top-2 right-full mr-2 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-48 sm:w-56 pointer-events-none shadow-xl">
            <p>{t.tooltip}</p>
          </div>
        </div>
      </div>

      {/* Chart — scrollable when many brands */}
      <div className="p-4 sm:p-6">
        <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div style={{ height: `${dynamicHeight}px`, minWidth: "240px" }}>
            <Bar data={chartData} options={options} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-3 sm:pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mt-2">
          <div className="text-xs text-gray-500">
            {t.totalBrands} {entryCount}
          </div>
          <div className="text-xs text-gray-500">{t.quantityLabel}</div>
        </div>
      </div>
    </div>
  );
};

export default PorMarca;