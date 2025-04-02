"use client";

import React, { useMemo } from "react";
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
import { BarChart3, HelpCircle } from "lucide-react";

// Register ChartJS components and plugins
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

interface PromedioEjeProps {
  tires: any[]; // Array of tire objects
  onSelectEje: (eje: string | null) => void;
  selectedEje: string | null;
}

const PromedioEje: React.FC<PromedioEjeProps> = ({ tires, onSelectEje, selectedEje }) => {
  // Compute the average minimal depth per 'eje'
  const averageDepthData = useMemo(() => {
    const ejeGroups: { [eje: string]: { totalDepth: number; count: number } } = {};

    tires.forEach((tire) => {
      // Ensure tire has inspections; if not, skip this tire.
      if (!tire.inspecciones || tire.inspecciones.length === 0) return;

      // Get the latest inspection (assuming the last element is the latest)
      const latestInspection = tire.inspecciones[tire.inspecciones.length - 1];
      if (!latestInspection) return;

      // Compute the smallest depth from the latest inspection.
      const minDepth = Math.min(
        latestInspection.profundidadInt,
        latestInspection.profundidadCen,
        latestInspection.profundidadExt
      );

      // Group by tire.eje (or "Desconocido" if missing)
      const eje = tire.eje || "Desconocido";

      if (!ejeGroups[eje]) {
        ejeGroups[eje] = { totalDepth: 0, count: 0 };
      }
      ejeGroups[eje].totalDepth += minDepth;
      ejeGroups[eje].count += 1;
    });

    return Object.entries(ejeGroups).map(([eje, data]) => ({
      eje,
      averageDepth: data.count ? parseFloat((data.totalDepth / data.count).toFixed(2)) : 0,
    }));
  }, [tires]);

  // Prepare data for the Bar chart.
  const chartData = {
    labels: averageDepthData.map((item) => item.eje),
    datasets: [
      {
        data: averageDepthData.map((item) => item.averageDepth),
        backgroundColor: averageDepthData.map((item) =>
          item.eje === selectedEje ? "#1E76B6" : "#173D68"
        ),
        borderRadius: 8,
        barPercentage: 0.6,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
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
          label: (context: any) => {
            const value = context.raw;
            const total = chartData.datasets[0].data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `Profundidad: ${value} mm · ${percentage}%`;
          },
          title: (tooltipItems: any[]) =>
            `Eje ${tooltipItems[0].label}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        color: "#475569",
        anchor: "end",
        align: "top",
        offset: 0,
        font: {
          family: "'Inter', sans-serif",
          size: 11,
          weight: "500",
        },
        formatter: (value: any) => `${value} mm`,
        padding: { top: 4 },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: "#64748b",
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2,
          color: "#94a3b8",
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 8,
        },
        grid: {
          color: "rgba(226, 232, 240, 0.6)",
          drawBorder: false,
          lineWidth: 1,
        },
        border: { display: false },
      },
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const eje = chartData.labels[index];
        onSelectEje(eje === selectedEje ? null : eje);
      }
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
  <h2 className="text-xl font-bold">Profundidad Media por Eje</h2>
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
      w-64 pointer-events-none
    ">
      <p>
        Este gráfico muestra el promedio de la menor profundidad de banda
        de rodamiento por eje. Ayuda a detectar desgaste irregular
        o ejes con mayor deterioro.
      </p>
    </div>
  </div>
</div>

      <div className="p-6">
        <div className="h-64 mb-4">
          <Bar data={chartData} options={options} />
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total de ejes: {averageDepthData.length}
          </div>
          <div className="text-xs text-gray-500">Medición en milímetros</div>
        </div>
      </div>
    </div>
  );
};

export default PromedioEje;