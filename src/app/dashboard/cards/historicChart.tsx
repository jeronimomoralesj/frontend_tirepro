"use client";

import React, { useMemo, useState, useCallback } from "react";
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
  TooltipItem,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { HelpCircle } from "lucide-react";
import { eachDayOfInterval, format } from "date-fns";

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

type VariableType = "cpk" | "cpkProyectado" | "profundidadInt" | "profundidadCen" | "profundidadExt";

// Google Analytics tracking function
const trackEvent = (eventName: string, eventParams: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // @ts-expect-error - gtag may not be recognized by TypeScript
    window.gtag('event', eventName, eventParams);
  }
};

const HistoricChart: React.FC<HistoricChartProps> = ({ tires }) => {
  const [selectedVariable, setSelectedVariable] = useState<VariableType>("cpk");

  // Display name for the selected variable
  const variableDisplayName = useMemo(() => {
    switch(selectedVariable) {
      case "cpk": return "CPK";
      case "cpkProyectado": return "CPK Proyectado";
      case "profundidadInt": return "Profundidad Interior";
      case "profundidadCen": return "Profundidad Central";
      case "profundidadExt": return "Profundidad Exterior";
      default: return selectedVariable;
    }
  }, [selectedVariable]);

  // 1️⃣ Build the last 60 calendar days labels
  const days = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return eachDayOfInterval({ start, end: today }).map((d) =>
      format(d, "yyyy-MM-dd")
    );
  }, []);

  // 2️⃣ For each tire, create a map day→last-known value
  const tireMaps = useMemo(() => {
    const maps: Record<string, Record<string, number>> = {};
    tires.forEach((tire) => {
      const insps = (tire.inspecciones || [])
        .filter((i) => typeof i[selectedVariable] === "number")
        .sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

      let lastVal: number | undefined;
      const dateMap: Record<string, number> = {};

      days.forEach((day) => {
        const todayInsps = insps.filter(
          (i) => format(new Date(i.fecha), "yyyy-MM-dd") === day
        );
        if (todayInsps.length) {
          const lastOfDay = todayInsps.reduce((p, c) =>
            new Date(c.fecha) > new Date(p.fecha) ? c : p
          );
          lastVal = lastOfDay[selectedVariable] as number;
        }
        if (lastVal !== undefined) {
          dateMap[day] = lastVal;
        }
      });

      maps[tire.id] = dateMap;
    });
    return maps;
  }, [tires, days, selectedVariable]);

  // 3️⃣ Build chart data by averaging across tires per day
  const chartData = useMemo(() => {
    const data = days.map((day) => {
      let sum = 0;
      let cnt = 0;
      Object.values(tireMaps).forEach((dm) => {
        const v = dm[day];
        if (v !== undefined) {
          sum += v;
          cnt++;
        }
      });
      return cnt > 0 ? parseFloat((sum / cnt).toFixed(2)) : 0;
    });

    // Only show 3 visible point markers: first, middle, last
    const pointRadius = data.map((_, idx) => {
      if (idx === 0 || idx === Math.floor(days.length / 2) || idx === days.length - 1) {
        return 5;
      }
      return 0;
    });

    return {
      labels: days,
      datasets: [
        {
          label: variableDisplayName,
          data,
          borderColor: "#1E76B6",
          backgroundColor: "rgba(30,118,182,0.2)",
          fill: true,
          tension: 0.4,
          cubicInterpolationMode: "monotone",
          pointRadius,
          pointBackgroundColor: "#1E76B6",
          pointHoverRadius: 7,
        },
      ],
    };
  }, [days, tireMaps, selectedVariable, variableDisplayName]);

  // Track chart interactions
  const handleChartClick = useCallback(() => {
    trackEvent('historicc_interaction', {
      component: 'historic_chart',
      chart_type: 'line',
      variable: selectedVariable,
    });
  }, [selectedVariable]);

  // Track variable selection
  const handleVariableChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVariable = e.target.value as VariableType;
    
    // Track the selection change
    trackEvent('variable_historic', {
      component: 'historic_chart',
      variable: newVariable,
      previous_variable: selectedVariable
    });
    
    setSelectedVariable(newVariable);
  }, [selectedVariable]);

  // Track help icon clicks
  const handleHelpClick = useCallback(() => {
    trackEvent('help_historic_click', {
      component: 'historic_chart',
      section: 'header',
      context: 'inspecciones_historico'
    });
    
    // You can add the actual help functionality here
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick, // Track clicks on the chart
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
          title: (tooltipItems: TooltipItem<"line">[]) => `Fecha: ${tooltipItems[0].label}`,
          label: (tooltipItem: TooltipItem<"line">) => `${variableDisplayName}: ${tooltipItem.raw.toFixed(2)}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: { color: "#64748b" },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#94a3b8", padding: 8 },
        grid: {
          color: "rgba(226, 232, 240, 0.6)",
          drawBorder: false,
          lineWidth: 1,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
      data-analytics-component="historic-chart"
    >
      {/* Header */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleHelpClick}
            aria-label="Ayuda sobre el histórico de inspecciones"
            data-analytics-id="help-icon-historic"
          >
            <HelpCircle size={24} className="text-white" />
          </button>
          <h2 className="text-xl font-bold">Histórico de Inspecciones</h2>
        </div>
        <select
          value={selectedVariable}
          onChange={handleVariableChange}
          className="bg-white/10 text-white rounded p-2 text-sm"
          data-analytics-id="variable-selector"
        >
          <option value="cpk" className="text-black" data-analytics-option="cpk">
            CPK
          </option>
          <option value="cpkProyectado" className="text-black" data-analytics-option="cpk-proyectado">
            CPK Proyectado
          </option>
          <option value="profundidadInt" className="text-black" data-analytics-option="profundidad-int">
            Profundidad Int
          </option>
          <option value="profundidadCen" className="text-black" data-analytics-option="profundidad-cen">
            Profundidad Cen
          </option>
          <option value="profundidadExt" className="text-black" data-analytics-option="profundidad-ext">
            Profundidad Ext
          </option>
        </select>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div 
          className="h-64 mb-4"
          data-analytics-id="chart-container"
          data-analytics-variable={selectedVariable}
        >
          <Line data={chartData} options={options} />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total de Días: {days.length}
          </div>
          <div className="text-xs text-gray-500">
            Últimas {days.length} entradas
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricChart;