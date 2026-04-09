"use client";

import React, { useMemo, useState, useEffect } from "react";
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
import { HelpCircle, BarChart3, Ruler } from "lucide-react";
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

interface Inspeccion {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
}

interface Tire {
  eje?: string;
  inspecciones?: Inspeccion[];
}

interface PromedioEjeProps {
  tires: Tire[];
  onSelectEje: (eje: string | null) => void;
  selectedEje: string | null;
}

type DatalabelsContext = {
  dataset: { data: number[] };
  dataIndex: number;
};

const translations = {
  es: {
    title: "Profundidad Media por Eje",
    depth: "Profundidad",
    axle: "Eje",
    unknown: "Desconocido",
    totalAxles: "Ejes",
    measurementUnit: "Medición en mm",
    tooltipText:
      "Este gráfico muestra el promedio de la menor profundidad de banda de rodamiento por eje. Ayuda a detectar desgaste irregular o ejes con mayor deterioro.",
  },
};

const PromedioEje: React.FC<PromedioEjeProps> = ({ tires, onSelectEje, selectedEje }) => {
  const [language] = useState<"es">("es");
  const [showTooltip, setShowTooltip] = useState(false);
  const t = translations[language];

  const averageDepthData = useMemo(() => {
    const ejeGroups: { [eje: string]: { totalDepth: number; count: number } } = {};

    tires.forEach((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return;
      const latestInspection = tire.inspecciones[tire.inspecciones.length - 1];
      if (!latestInspection) return;
      const minDepth = Math.min(
        latestInspection.profundidadInt,
        latestInspection.profundidadCen,
        latestInspection.profundidadExt
      );
      const eje = tire.eje || t.unknown;
      if (!ejeGroups[eje]) ejeGroups[eje] = { totalDepth: 0, count: 0 };
      ejeGroups[eje].totalDepth += minDepth;
      ejeGroups[eje].count += 1;
    });

    return Object.entries(ejeGroups).map(([eje, data]) => ({
      eje,
      averageDepth: data.count ? parseFloat((data.totalDepth / data.count).toFixed(2)) : 0,
      count: data.count,
    }));
  }, [tires, t.unknown]);


  const chartData = {
    labels: averageDepthData.map((item) => item.eje),
    datasets: [
      {
        data: averageDepthData.map((item) => item.averageDepth),
        backgroundColor: averageDepthData.map((item) =>
          item.eje === selectedEje ? "#1E76B6" : "#173D68"
        ),
        hoverBackgroundColor: averageDepthData.map((item) =>
          item.eje === selectedEje ? "#1565A0" : "#1E76B6"
        ),
        borderRadius: 6,
        barPercentage: 0.65,
      },
    ],
  };

  // Dynamically calculate chart height based on number of axes
  const chartHeight = Math.max(160, averageDepthData.length * 44);

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(255,255,255,0.98)",
        titleColor: "#1e293b",
        bodyColor: "#334155",
        titleFont: { family: "'Inter', sans-serif", size: 12, weight: "600" as const },
        bodyFont: { family: "'Inter', sans-serif", size: 11 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: { raw: number }) => {
            const value = context.raw;
            const total = chartData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = Math.round((value / total) * 100);
            return `${t.depth}: ${value} mm · ${percentage}%`;
          },
          title: (tooltipItems: { label: string }[]) => `${t.axle} ${tooltipItems[0].label}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        color: "white",
        anchor: "center" as const,
        align: "center" as const,
        font: { family: "'Inter', sans-serif", size: 10, weight: "600" as const },
        formatter: (value: number) => `${value} mm`,
        display: (context: DatalabelsContext): boolean => {
          const { dataset, dataIndex } = context;
          return dataset.data[dataIndex] > 0.5;
        },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: { color: "#64748b", font: { size: 10 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 2, color: "#94a3b8", font: { size: 10 }, padding: 6 },
        grid: { color: "rgba(226,232,240,0.4)", lineWidth: 1 },
        border: { display: false },
      },
    },
    onClick: (_event: unknown, elements: { index: number }[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const eje = chartData.labels[index];
        onSelectEje(eje === selectedEje ? null : eje);
      }
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col w-full min-w-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-semibold truncate leading-tight">{t.title}</h2>
          </div>
          <div className="relative shrink-0">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              aria-label="Ayuda"
            >
              <HelpCircle size={17} className="text-white/90" />
            </button>
            {showTooltip && (
              <div className="absolute z-20 right-0 top-full mt-2 w-56 bg-gray-900/95 text-white text-xs p-3 rounded-lg shadow-xl border border-white/10">
                <p className="leading-relaxed">{t.tooltipText}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart — scrollable container so it never gets squished */}
      <div className="flex-1 p-3 sm:p-4 overflow-hidden">
        <div
          className="w-full overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: "50vh" }}
        >
          <div style={{ height: chartHeight, minHeight: 160 }}>
            <Bar data={chartData} options={options} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-2.5 mt-3 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg">
            <BarChart3 size={13} className="text-blue-600 shrink-0" />
            <span className="text-xs font-medium text-blue-700">
              {t.totalAxles}: <span className="font-bold">{averageDepthData.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Ruler size={11} className="text-gray-400 shrink-0" />
            <span className="italic">{t.measurementUnit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromedioEje;