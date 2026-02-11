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
import { HelpCircle, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

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
  language: "es";
}

const translations = {
  es: {
    title:          "Histórico de Inspecciones",
    noData:         "No hay datos de inspección disponibles para",
    totalDays:      "Total de Días",
    footerNote:     "Mostrando solo días con inspecciones",
    cpk:            "CPK",
    cpkProjected:   "CPK Proyectado",
    profundidadInt: "Profundidad Int",
    profundidadCen: "Profundidad Cen",
    profundidadExt: "Profundidad Ext",
    tooltipDate:    "Fecha",
    tooltipValue:   (label: string, value: number) => `${label}: ${value.toFixed(2)}`,
    selectVariable: "Seleccionar métrica",
  }
};

type VariableType = "cpk" | "cpkProyectado" | "profundidadInt" | "profundidadCen" | "profundidadExt";

const trackEvent = (eventName: string, eventParams: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // @ts-expect-error - gtag may not be recognized by TypeScript
    window.gtag('event', eventName, eventParams);
  }
};

const HistoricChart: React.FC<HistoricChartProps> = ({ tires, language }) => {
  const t = translations[language];
  const [selectedVariable, setSelectedVariable] = useState<VariableType>("cpk");

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

  const { inspectionDays, dailyAverages } = useMemo(() => {
    const dateValueMap: Record<string, number[]> = {};
    
    tires.forEach(tire => {
      if (!tire.inspecciones?.length) return;
      
      tire.inspecciones.forEach(inspection => {
        const value = inspection[selectedVariable];
        if (value === undefined || value === null) return;
        
        const dateKey = format(new Date(inspection.fecha), "yyyy-MM-dd");
        
        if (!dateValueMap[dateKey]) {
          dateValueMap[dateKey] = [];
        }
        dateValueMap[dateKey].push(value as number);
      });
    });
    
    const inspectionDays = Object.keys(dateValueMap).sort();
    
    const dailyAverages = inspectionDays.map(day => {
      const values = dateValueMap[day];
      const sum = values.reduce((acc, val) => acc + val, 0);
      return parseFloat((sum / values.length).toFixed(2));
    });
    
    return { inspectionDays, dailyAverages };
  }, [tires, selectedVariable]);

  const chartData = useMemo(() => {
    const pointRadius = dailyAverages.map((_, idx) => {
      if (idx === 0 || idx === Math.floor(inspectionDays.length / 2) || idx === inspectionDays.length - 1) {
        return 5;
      }
      return 0;
    });

    return {
      labels: inspectionDays,
      datasets: [
        {
          label: variableDisplayName,
          data: dailyAverages,
          borderColor: "#1E76B6",
          backgroundColor: "rgba(30,118,182,0.1)",
          fill: true,
          tension: 0.4,
          cubicInterpolationMode: "monotone" as const,
          pointRadius,
          pointBackgroundColor: "#1E76B6",
          pointHoverRadius: 7,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverBorderWidth: 3,
          borderWidth: 2.5,
        },
      ],
    };
  }, [inspectionDays, dailyAverages, variableDisplayName]);

  const handleChartClick = useCallback(() => {
    trackEvent('historicc_interaction', {
      component: 'historic_chart',
      chart_type: 'line',
      variable: selectedVariable,
    });
  }, [selectedVariable]);

  const handleVariableChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVariable = e.target.value as VariableType;
    
    trackEvent('variable_historic', {
      component: 'historic_chart',
      variable: newVariable,
      previous_variable: selectedVariable
    });
    
    setSelectedVariable(newVariable);
  }, [selectedVariable]);

  const handleHelpClick = useCallback(() => {
    trackEvent('help_historic_click', {
      component: 'historic_chart',
      section: 'header',
      context: 'inspecciones_historico'
    });
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        titleColor: "#1e293b",
        bodyColor: "#334155",
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: "600" as const },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          title: (tooltipItems: TooltipItem<"line">[]) => `${t.tooltipDate}: ${tooltipItems[0].label}`,
          label: (tooltipItem: TooltipItem<"line">) => `${variableDisplayName}: ${Number(tooltipItem.raw).toFixed(2)}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
        caretPadding: 8,
      },
      datalabels: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: { 
          color: "#64748b",
          font: { size: 10 },
          maxTicksLimit: 6,
          callback: function (
            this: { getLabelForValue(value: string | number): string },
            val: string | number,
            index: number
          ): string {
            return index % Math.ceil(inspectionDays.length / 6) === 0
              ? this.getLabelForValue(val)
              : "";
          },        
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { 
          color: "#94a3b8", 
          padding: 8,
          font: { size: 10 },
        },
        grid: {
          color: "rgba(226, 232, 240, 0.4)",
          drawBorder: false,
          lineWidth: 1,
        },
        border: { display: false },
      },
    },
  };

  if (inspectionDays.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-white/90" />
              <h2 className="text-base sm:text-lg font-semibold">{t.title}</h2>
            </div>
            <button 
              onClick={handleHelpClick} 
              className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              aria-label="Ayuda sobre el histórico de inspecciones"
            >
              <HelpCircle size={18} className="text-white/90" />
            </button>
          </div>
          <div className="relative">
            <select
              value={selectedVariable}
              onChange={handleVariableChange}
              className="w-full bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg px-3 py-2 
                       border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 
                       transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="cpk" className="text-gray-800 bg-white">{t.cpk}</option>
              <option value="cpkProyectado" className="text-gray-800 bg-white">{t.cpkProjected}</option>
              <option value="profundidadInt" className="text-gray-800 bg-white">{t.profundidadInt}</option>
              <option value="profundidadCen" className="text-gray-800 bg-white">{t.profundidadCen}</option>
              <option value="profundidadExt" className="text-gray-800 bg-white">{t.profundidadExt}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Calendar size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">{t.noData}</p>
            <p className="text-gray-400 text-xs mt-1">{variableDisplayName}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col"
      data-analytics-component="historic-chart"
    >
      <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-white/90" />
            <h2 className="text-base sm:text-lg font-semibold">{t.title}</h2>
          </div>
          <button
            onClick={handleHelpClick}
            className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            aria-label="Ayuda sobre el histórico de inspecciones"
            data-analytics-id="help-icon-historic"
          >
            <HelpCircle size={18} className="text-white/90" />
          </button>
        </div>
        <div className="relative">
          <select
            value={selectedVariable}
            onChange={handleVariableChange}
            className="w-full bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg px-3 py-2 
                     border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 
                     transition-all cursor-pointer appearance-none pr-8"
            data-analytics-id="variable-selector"
          >
            <option value="cpk" className="text-gray-800 bg-white" data-analytics-option="cpk">
              {t.cpk}
            </option>
            <option value="cpkProyectado" className="text-gray-800 bg-white" data-analytics-option="cpk-proyectado">
              {t.cpkProjected}
            </option>
            <option value="profundidadInt" className="text-gray-800 bg-white" data-analytics-option="profundidad-int">
              {t.profundidadInt}
            </option>
            <option value="profundidadCen" className="text-gray-800 bg-white" data-analytics-option="profundidad-cen">
              {t.profundidadCen}
            </option>
            <option value="profundidadExt" className="text-gray-800 bg-white" data-analytics-option="profundidad-ext">
              {t.profundidadExt}
            </option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-5">
        <div 
          className="h-48 sm:h-56 mb-3"
          data-analytics-id="chart-container"
          data-analytics-variable={selectedVariable}
        >
          <Line data={chartData} options={options} />
        </div>

        <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
            <Calendar size={14} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {t.totalDays}: <span className="font-bold">{inspectionDays.length}</span>
            </span>
          </div>
          <div className="text-xs text-gray-500 italic">
            {t.footerNote}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricChart;