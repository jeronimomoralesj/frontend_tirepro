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
import { HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

// Register ChartJS components and plugins
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

// Define proper types for Inspeccion and Tire.
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
  tires: Tire[]; // List of tires to process
  onSelectEje: (eje: string | null) => void;
  selectedEje: string | null;
}

// Define a type for the context parameter in the datalabels display callback.
type DatalabelsContext = {
  dataset: { data: number[] };
  dataIndex: number;
};

// Translation object
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
  const router = useRouter();
  
  // Language detection state
  const [language, setLanguage] = useState<'en'|'es'>('es');

  // Language detection effect
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
      
      // Browser fallback
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };

    detectAndSetLanguage();
  }, []);

  // Get current translations
  const t = translations[language];

  // Compute the average minimal depth per 'eje'
  const averageDepthData = useMemo(() => {
    const ejeGroups: { [eje: string]: { totalDepth: number; count: number } } =
      {};

    tires.forEach((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return;
      const latestInspection =
        tire.inspecciones[tire.inspecciones.length - 1];
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

  // Prepare data for the Bar chart.
  const chartData = {
    labels: averageDepthData.map((item) => item.eje),
    datasets: [
      {
        data: averageDepthData.map((item) => item.averageDepth),
        backgroundColor: averageDepthData.map((item) =>
          item.eje === selectedEje ? "#173D68" : "#173D68"
        ),
        hoverBackgroundColor: averageDepthData.map((item) =>
          item.eje === selectedEje ? "#173D68" : "#173D68"
        ),
        borderRadius: 8,
        barPercentage: 0.7,
      },
    ],
  };

  // Define types for chart click event and element, if needed.
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
      },
      datalabels: {
        color: "white",
        anchor: "center",
        align: "center",
        font: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: "600",
        },
        formatter: (value: number) => `${value} mm`,
        textShadow: "0px 1px 2px rgba(0,0,0,0.25)",
        // Only show labels for bars that have enough space.
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
    onClick: (event: ChartClickEvent, elements: ChartElement[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const eje = chartData.labels[index];
        onSelectEje(eje === selectedEje ? null : eje);
      }
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.title}</h2>
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
            w-64 pointer-events-none
          "
          >
            <p>{t.tooltipText}</p>
          </div>
        </div>
      </div>
      {/* Chart */}
      <div className="p-6">
        <div className="h-64 mb-4">
          <Bar data={chartData} options={options} />
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {t.totalAxles}: {averageDepthData.length}
          </div>
          <div className="text-xs text-gray-500">{t.measurementUnit}</div>
        </div>
      </div>
    </div>
  );
};

export default PromedioEje;