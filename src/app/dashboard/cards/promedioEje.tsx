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
  en: {
    title: "Average Depth by Axle",
    depth: "Depth",
    axle: "Axle",
    unknown: "Unknown",
    totalAxles: "Total axles",
    measurementUnit: "Measurement in millimeters",
    tooltipText: "This chart shows the average minimum tread depth by axle. It helps detect irregular wear or axles with greater deterioration."
  },
  es: {
    title: "Profundidad Media por Eje",
    depth: "Profundidad",
    axle: "Eje",
    unknown: "Desconocido",
    totalAxles: "Total de ejes",
    measurementUnit: "Medición en milímetros",
    tooltipText: "Este gráfico muestra el promedio de la menor profundidad de banda de rodamiento por eje. Ayuda a detectar desgaste irregular o ejes con mayor deterioro."
  }
};

const PromedioEje: React.FC<PromedioEjeProps> = ({
  tires,
  onSelectEje,
  selectedEje,
}) => {
  
  const [language, setLanguage] = useState<'en'|'es'>('es');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = localStorage.getItem('preferredLanguage') as 'en'|'es';
      if (saved) {
        setLanguage(saved);
        return;
      }
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject('no geo');
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        
        if (resp.ok) {
          const { countryCode } = await resp.json();
          const lang = (countryCode === 'US' || countryCode === 'CA') ? 'en' : 'es';
          setLanguage(lang);
          localStorage.setItem('preferredLanguage', lang);
          return;
        }
      } catch {
        // fallback to browser language detection
      }
      
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };

    detectAndSetLanguage();
  }, []);

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
      if (!ejeGroups[eje]) {
        ejeGroups[eje] = { totalDepth: 0, count: 0 };
      }
      ejeGroups[eje].totalDepth += minDepth;
      ejeGroups[eje].count += 1;
    });

    return Object.entries(ejeGroups).map(([eje, data]) => ({
      eje,
      averageDepth: data.count
        ? parseFloat((data.totalDepth / data.count).toFixed(2))
        : 0,
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
        borderRadius: 8,
        barPercentage: 0.65,
      },
    ],
  };

  interface ChartClickEvent {
    native?: Event;
    type: string;
    chart: ChartJS;
    x: number;
    y: number;
  }

  interface ChartElement {
    datasetIndex: number;
    index: number;
  }

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
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
          label: (context: { raw: number }) => {
            const value = context.raw;
            const total = chartData.datasets[0].data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `${t.depth}: ${value} mm · ${percentage}%`;
          },
          title: (tooltipItems: { label: string }[]) =>
            `${t.axle} ${tooltipItems[0].label}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
        caretPadding: 8,
      },
      datalabels: {
        color: "white",
        anchor: "center" as const,
        align: "center" as const,
        font: {
          family: "'Inter', sans-serif",
          size: 11,
          weight: "600" as const,
        },
        formatter: (value: number) => `${value} mm`,
        textShadow: "0px 1px 2px rgba(0,0,0,0.3)",
        display: (context: DatalabelsContext): boolean => {
          const { dataset, dataIndex } = context;
          const value = dataset.data[dataIndex];
          return value > 0.5;
        },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: "#64748b",
          font: { family: "'Inter', sans-serif", size: 10 },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2,
          color: "#94a3b8",
          font: { family: "'Inter', sans-serif", size: 10 },
          padding: 8,
        },
        grid: {
          color: "rgba(226, 232, 240, 0.4)",
          drawBorder: false,
          lineWidth: 1,
        },
        border: { display: false },
      },
    },
    onClick: (event: ChartClickEvent, elements: ChartElement[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const eje = chartData.labels[index];
        onSelectEje(eje === selectedEje ? null : eje);
      }
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-white/90" />
            <h2 className="text-base sm:text-lg font-semibold">{t.title}</h2>
          </div>
          <div className="relative">
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
                <p className="leading-relaxed">{t.tooltipText}</p>
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900/95 transform rotate-45 border-l border-t border-white/10"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-5">
        <div className="h-48 sm:h-56 mb-3">
          <Bar data={chartData} options={options} />
        </div>

        <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
            <BarChart3 size={14} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {t.totalAxles}: <span className="font-bold">{averageDepthData.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Ruler size={12} className="text-gray-400" />
            <span className="italic">{t.measurementUnit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromedioEje;