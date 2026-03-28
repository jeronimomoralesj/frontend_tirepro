"use client";

import React, { useEffect, useState } from "react";
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
import { HelpCircle, ArrowDownUp, ArrowUpDown, ArrowUpAZ } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

type SortMode = "desc" | "asc" | "alpha";

const translations = {
  es: {
    title: "Llantas por banda",
    tooltip:
      "Este gráfico muestra como están distribuidas las llantas por banda, es decir la cantidad de llantas que hay por cada una de las bandas.",
    quantity: "Cantidad:",
    brand: "Banda:",
    sortDesc: "Mayor a menor",
    sortAsc: "Menor a mayor",
    sortAlpha: "Alfabético",
  },
};

interface PorBandaProps {
  groupData: { [diseno: string]: number };
}

const PorBanda: React.FC<PorBandaProps> = ({ groupData }) => {
  const [language, setLanguage] = useState<"es">("es");
  const [sortMode, setSortMode] = useState<SortMode>("desc");

  useEffect(() => {
    setLanguage("es");
  }, []);

  const t = translations[language];

  const sortedEntries = Object.entries(groupData).sort(([aKey, aVal], [bKey, bVal]) => {
    if (sortMode === "desc") return bVal - aVal;
    if (sortMode === "asc") return aVal - bVal;
    return aKey.localeCompare(bKey);
  });

  const sortedLabels = sortedEntries.map(([k]) => k);
  const sortedValues = sortedEntries.map(([, v]) => v);

  const entryCount = sortedEntries.length;
  const dynamicHeight = Math.max(200, entryCount * 48 + 60);

  const chartData = {
    labels: sortedLabels,
    datasets: [
      {
        data: sortedValues,
        backgroundColor: sortedLabels.map(() => "#173D68"),
        borderRadius: 8,
        barPercentage: 0.7,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { left: 0, right: 48, top: 8, bottom: 8 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "white",
        titleColor: "#1e293b",
        bodyColor: "#334155",
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: "bold" as const },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: { raw: number }) => {
            const value = context.raw;
            const total = sortedValues.reduce((s, v) => s + v, 0);
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
        font: { family: "'Inter', sans-serif", size: 11, weight: "600" as const },
        formatter: (value: number) => `${value}`,
        anchor: "center" as const,
        align: "center" as const,
        clamp: true,
      },
    },
    scales: {
      x: {
        display: true,
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { family: "'Inter', sans-serif", size: 11, weight: "500" as const },
        },
        grid: { display: true, color: "rgba(226, 232, 240, 0.3)", drawBorder: false },
        border: { display: false },
      },
      y: {
        display: true,
        ticks: {
          color: "#334155",
          font: { family: "'Inter', sans-serif", size: 11, weight: "500" as const },
          padding: 6,
        },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const sortOptions: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
    { mode: "desc",  label: t.sortDesc,  icon: <ArrowDownUp size={13} /> },
    { mode: "asc",   label: t.sortAsc,   icon: <ArrowUpDown size={13} /> },
    { mode: "alpha", label: t.sortAlpha, icon: <ArrowUpAZ size={13} /> },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-4 sm:p-5 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold">{t.title}</h2>
        <div className="group relative cursor-pointer shrink-0 ml-2" title="Informacion sobre el gráfico">
          <HelpCircle className="text-white hover:text-gray-200 transition-colors" size={22} />
          <div className="absolute z-20 -top-2 right-full mr-2 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-48 sm:w-56 pointer-events-none shadow-xl">
            <p>{t.tooltip}</p>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="px-4 sm:px-6 pt-4 flex gap-2 flex-wrap">
        {sortOptions.map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              sortMode === mode
                ? "bg-[#173D68] text-white border-[#173D68] shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#173D68] hover:text-[#173D68]"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="p-4 sm:p-6">
        <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div style={{ height: `${dynamicHeight}px`, minWidth: "260px" }}>
            <Bar data={chartData} options={options} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PorBanda;