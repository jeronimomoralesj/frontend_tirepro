"use client";

import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { AlertOctagon, Timer, CheckCircle2, RotateCcw, HelpCircle, Activity } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
};

export type Tire = {
  id: string;
  inspecciones: Inspection[];
};

const translations = {
  en: {
    title: "Status",
    tooltip:
      "This donut chart shows how many tires are in each condition bucket.",
    noData: "No inspections available",
    inspected: "tires inspected",
    totalConditions: "Total conditions",
    footerText: "Current tire status",
    tire: "tires",
    labels: {
      buenEstado: "Optimal",
      dias60: "60 Days",
      dias30: "30 Days",
      cambioInmediato: "Urgent",
    },
  },
  es: {
    title: "Semáforo",
    tooltip:
      "Esta gráfica en dona muestra las proyecciones de cambio de sus llantas.",
    noData: "No hay inspecciones disponibles",
    inspected: "llantas inspeccionadas",
    totalConditions: "Total de condiciones",
    tire: "llantas",
    footerText: "Estado actual de llantas",
    labels: {
      buenEstado: "Óptimo",
      dias60: "60 Días",
      dias30: "30 Días",
      cambioInmediato: "Urgente",
    },
  },
};

interface SemaforoPieProps {
  tires: Tire[];
  onSelectCondition?: (condition: string | null) => void;
  selectedCondition?: string | null;
  language: "en" | "es";
}

const SemaforoPie: React.FC<SemaforoPieProps> = ({ 
  tires, 
  onSelectCondition = () => {}, 
  selectedCondition = null,
  language 
}) => {
  const t = translations[language]; 
  const [showTooltip, setShowTooltip] = useState(false);
  const [tireCounts, setTireCounts] = useState({
    buenEstado: 0,
    dias60: 0,
    dias30: 0,
    cambioInmediato: 0,
  });

  useEffect(() => {
    const counts = { buenEstado: 0, dias60: 0, dias30: 0, cambioInmediato: 0 };

    tires.forEach((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return;
      const last = tire.inspecciones.at(-1);
      if (!last) return;

      const minDepth = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);

      if (minDepth > 7) counts.buenEstado++;
      else if (minDepth > 6) counts.dias60++;
      else if (minDepth > 3) counts.dias30++;
      else counts.cambioInmediato++;
    });

    setTireCounts(counts);
  }, [tires]);

  const conditions = ["buenEstado", "dias60", "dias30", "cambioInmediato"] as const;
  const conditionLabels = conditions.map((key) => t.labels[key]);
  const backgroundColors = ["#22c55e", "#2D95FF", "#f97316", "#ef4444"];
  const lightColors = ["#bbf7d0", "#bfdbfe", "#fed7aa", "#fecaca"];
  const icons = [
    <CheckCircle2 size={18} key="check" />,
    <Timer size={18} key="timer" />,
    <AlertOctagon size={18} key="alert" />,
    <RotateCcw size={18} key="rotate" />
  ];

  const values = conditions.map((c) => (selectedCondition && c !== selectedCondition ? 0 : tireCounts[c]));
  const total = Object.values(tireCounts).reduce((a, b) => a + b, 0);
  const activeIndices = values.map((v, i) => (v > 0 ? i : -1)).filter((i) => i !== -1);

  const data = {
    labels: activeIndices.map((i) => conditionLabels[i]),
    datasets: [
      {
        data: activeIndices.map((i) => values[i]),
        backgroundColor: activeIndices.map((i) => backgroundColors[i]),
        borderColor: "white",
        borderWidth: 3,
        cutout: "75%",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
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
        borderColor: "#e2e8f0",
        borderWidth: 1,
        caretPadding: 8,
        callbacks: {
          label: (context: { raw: number; label: string }) => {
            const value = context.raw;
            const percent = total ? Math.round((value / total) * 100) : 0;
            return `${context.label}: ${value} ${t.tire} · ${percent}%`;
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
        const condition = conditions[activeIndices[index]];
        onSelectCondition(condition === selectedCondition ? null : condition);
      }
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col print:shadow-none print:border-gray-300">
      <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-white/90" />
            <h2 className="text-base sm:text-lg font-semibold">{t.title}</h2>
          </div>
          <div className="relative print:hidden">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              aria-label="Ayuda"
            >
              <HelpCircle size={18} className="text-white/90" />
            </button>
            {showTooltip && (
              <div className="absolute z-20 right-0 top-full mt-2 w-64 bg-gray-900/95 backdrop-blur-sm text-white text-xs p-3 rounded-lg shadow-xl border border-white/10">
                <p className="leading-relaxed">{t.tooltip}</p>
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900/95 transform rotate-45 border-l border-t border-white/10"></div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 sm:p-5">
        <div className="h-48 sm:h-52 mb-4 relative print:h-40">
          {total === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <AlertOctagon size={32} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{t.noData}</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full max-w-52 max-h-52 print:max-w-40 print:max-h-40">
                  <Doughnut data={data} options={options} />
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <p className="text-3xl sm:text-4xl font-bold text-[#173D68] print:text-2xl">{total}</p>
                <p className="text-xs sm:text-sm text-gray-500 print:text-xs mt-1">{t.inspected}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 print:gap-2">
          {activeIndices.map((i) => (
            <button
              key={i}
              onClick={() => onSelectCondition(conditions[i] === selectedCondition ? null : conditions[i])}
              className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 print:cursor-default print:p-2 ${
                selectedCondition === conditions[i] 
                  ? "scale-105 shadow-md print:scale-100 border-current" 
                  : "hover:scale-102 hover:shadow-sm border-transparent"
              }`}
              style={{
                backgroundColor: lightColors[i],
                borderColor: selectedCondition === conditions[i] ? backgroundColors[i] : 'transparent',
              }}
            >
              <div className="flex items-center gap-2 print:gap-1.5">
                <div 
                  className="text-white p-1.5 sm:p-2 rounded-lg print:p-1 flex-shrink-0" 
                  style={{ backgroundColor: backgroundColors[i] }}
                >
                  {React.cloneElement(icons[i], { size: 16, className: "print:w-3 print:h-3" })}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-xs text-gray-600 truncate print:text-xs">{conditionLabels[i]}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-800 print:text-base">{tireCounts[conditions[i]]}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 print:pt-2">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
            <Activity size={14} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {t.totalConditions}: <span className="font-bold">{activeIndices.length}</span>
            </span>
          </div>
          <div className="text-xs text-gray-500 italic print:text-xs">{t.footerText}</div>
        </div>
      </div>
    </div>
  );
};

export default SemaforoPie;