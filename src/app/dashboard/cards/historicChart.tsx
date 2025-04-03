"use client";

import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { HelpCircle } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Types for inspection and tire data.
export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk?: number;
  cpkProyectado?: number;
  fecha: string;
};

export type Tire = {
  id: string;
  inspecciones?: Inspection[];
};

interface HistoricChartProps {
  tires: Tire[];
}

const HistoricChart: React.FC<HistoricChartProps> = ({ tires }) => {
  const [selectedVariable, setSelectedVariable] = useState<
    "cpk" | "cpkProyectado" | "profundidadInt" | "profundidadCen" | "profundidadExt"
  >("cpk");

  // Combine all inspections from all tires and sort by date (ascending).
  const allInspections = useMemo(() => {
    const grouped: { [key: string]: Inspection } = {}; // key = `${tire.id}-${YYYY-MM-DD}`
  
    tires.forEach((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return;
  
      tire.inspecciones.forEach((insp) => {
        const dayKey = new Date(insp.fecha).toISOString().slice(0, 10);
        const uniqueKey = `${tire.id}-${dayKey}`;
        if (
          !grouped[uniqueKey] ||
          new Date(insp.fecha).getTime() > new Date(grouped[uniqueKey].fecha).getTime()
        ) {
          grouped[uniqueKey] = insp;
        }
      });
    });
  
    const sorted = Object.values(grouped).sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
  
    return sorted;
  }, [tires]);
  

  // Group inspections by day (YYYY-MM-DD) and average the selected variable.
  const chartData = useMemo(() => {
    const groups: { [day: string]: { sum: number; count: number } } = {};

    allInspections.forEach((insp) => {
      const dayKey = new Date(insp.fecha).toISOString().slice(0, 10);
      let value: number | undefined = undefined;
      if (selectedVariable === "cpk") {
        value = insp.cpk;
      } else if (selectedVariable === "cpkProyectado") {
        value = insp.cpkProyectado;
      } else if (selectedVariable === "profundidadInt") {
        value = insp.profundidadInt;
      } else if (selectedVariable === "profundidadCen") {
        value = insp.profundidadCen;
      } else if (selectedVariable === "profundidadExt") {
        value = insp.profundidadExt;
      }
      if (value !== undefined && !isNaN(value)) {
        if (!groups[dayKey]) {
          groups[dayKey] = { sum: 0, count: 0 };
        }
        groups[dayKey].sum += value;
        groups[dayKey].count += 1;
      }
    });

    const sortedDays = Object.keys(groups).sort();
    // Only take the last 60 days.
    const last60Days = sortedDays.slice(-60);
    const labels = last60Days;
    const data = last60Days.map((day) => {
      const avg = groups[day].sum / groups[day].count;
      return parseFloat(avg.toFixed(2));
    });

    return {
      labels,
      datasets: [
        {
          label: selectedVariable,
          data,
          borderColor: "#1E76B6",
          backgroundColor: "rgba(30, 118, 182, 0.2)", // Fill color for area under the line
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#1E76B6",
        },
      ],
    };
  }, [allInspections, selectedVariable]);

  const options = {
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
          title: (tooltipItems: { label: string }[]) => `Fecha: ${tooltipItems[0].label}`,
          label: (tooltipItem: { raw: number }) =>          
            `${selectedVariable}: ${tooltipItem.raw.toFixed(2)}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        color: "#475569",
        anchor: "end",
        align: "top",
        offset: 0,
        font: { family: "'Inter', sans-serif", size: 11, weight: "500" },
        formatter: (value: number) => `${value}`,
        padding: { top: 4 },
      },
    },
    scales: {
      x: {
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
          color: "#94a3b8",
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 8,
        },
        grid: { color: "rgba(226, 232, 240, 0.6)", drawBorder: false, lineWidth: 1 },
        border: { display: false },
      },
    },
    onClick: () => {
      // Optionally add an onClick handler if needed.
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <div className="flex items-center">
        <div className="group relative cursor-pointer">
    <HelpCircle
      className="text-white hover:text-gray-200 transition-colors"
      size={24}
    />
    <div className="
      absolute z-10 -top-2 left-full 
      bg-[#0A183A] text-white 
      text-xs p-3 rounded-lg 
      opacity-0 group-hover:opacity-100 
      transition-opacity duration-300 
      w-64 pointer-events-none
    ">
      <p>
        Este gráfico muestra los datos promedios historicos de tus llantas agrupados por día.
      </p>
    </div>
  </div>
          <h2 className="text-xl font-bold">Histórico de Inspecciones</h2>
        </div>
        <select
          value={selectedVariable}
          onChange={(e) =>
            setSelectedVariable(e.target.value as
              | "cpk"
              | "cpkProyectado"
              | "profundidadInt"
              | "profundidadCen"
              | "profundidadExt")
          }
          className="bg-white/10 text-white rounded p-2 text-sm"
        >
          <option value="cpk" className="text-black">
            CPK
          </option>
          <option value="cpkProyectado" className="text-black">
            CPK Proyectado
          </option>
          <option value="profundidadInt" className="text-black">
            Profundidad Int
          </option>
          <option value="profundidadCen" className="text-black">
            Profundidad Cen
          </option>
          <option value="profundidadExt" className="text-black">
            Profundidad Ext
          </option>
        </select>
      </div>
      <div className="p-6">
        <div className="h-64 mb-4">
          <Line data={chartData} options={options} />
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total de Inspecciones: {allInspections.length}
          </div>
          <div className="text-xs text-gray-500">Últimas 60 entradas</div>
        </div>
      </div>
    </div>
  );
};

export default HistoricChart;
