"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { HelpCircle, Activity } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

// Updated color palette to distinguish from SemaforoPie
const BACKGROUND_COLORS = ["#0A183A", "#173D68", "#1E76B6", "#348CCB"];
const LIGHT_COLORS = ["#348CCB", "#cffafe", "#d1fae5", "#fef3c7", "#fce7f3"];

export interface VidaEntry {
  fecha: string;
  valor: string;
}

export interface Tire {
  id: string;
  vida: VidaEntry[];
}

interface PorVidaProps {
  tires: Tire[];
  onSelectVida?: (vida: string | null) => void;
  selectedVida?: string | null;
}

// Translations
const translations = {
  es: {
    title: "Llantas por Vida",
    tooltip: "Este gráfico muestra cómo están distribuidas las llantas según su vida útil, por ejemplo: nueva, reencauche1, reencauche2, etc.",
    noDataAvailable: "No hay datos de vida disponibles",
    inspectedTires: "llantas inspeccionadas",
    totalLifeTypes: "Total de tipos de vida:",
    currentTireStatus: "Estado actual de llantas",
    tiresLabel: "llantas"
  },
  en: {
    title: "Tires by Life",
    tooltip: "This chart shows how tires are distributed according to their useful life, for example: new, retread1, retread2, etc.",
    noDataAvailable: "No life data available",
    inspectedTires: "inspected tires",
    totalLifeTypes: "Total life types:",
    currentTireStatus: "Current tire status",
    tiresLabel: "tires"
  }
};

const PorVida: React.FC<PorVidaProps> = ({ 
  tires, 
  onSelectVida = () => {}, 
  selectedVida = null 
}) => {
  
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

  // Group tires by the latest vida entry
  const grouping = useMemo(() => {
    return tires.reduce((acc: { [key: string]: number }, tire) => {
      if (tire.vida && tire.vida.length > 0) {
        const latestEntry = tire.vida[tire.vida.length - 1];
        const vidaValue = latestEntry.valor.toLowerCase();
        acc[vidaValue] = (acc[vidaValue] || 0) + 1;
      }
      return acc;
    }, {});
  }, [tires]);

  const vidaTypes = Object.keys(grouping);
  const vidaLabels = vidaTypes.map(vida => 
    vida.charAt(0).toUpperCase() + vida.slice(1).replace(/(\d+)/, ' $1')
  );

  // Filter data based on selection (similar to SemaforoPie)
  const values = vidaTypes.map(vida => 
    selectedVida && vida !== selectedVida ? 0 : grouping[vida]
  );
  const total = Object.values(grouping).reduce((a, b) => a + b, 0);
  const activeIndices = values.map((v, i) => (v > 0 ? i : -1)).filter((i) => i !== -1);

  const data = {
    labels: activeIndices.map((i) => vidaLabels[i]),
    datasets: [
      {
        data: activeIndices.map((i) => values[i]),
        backgroundColor: activeIndices.map((i) => BACKGROUND_COLORS[i % BACKGROUND_COLORS.length]),
        borderColor: "white",
        borderWidth: 4,
        cutout: "75%",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Add animation configuration for better print handling
    animation: {
      duration: 0, // Disable animations during print
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
        borderColor: "#e2e8f0",
        borderWidth: 1,
        callbacks: {
          label: (context: { raw: number; label: string }) => {
            const value = context.raw;
            const percent = total ? Math.round((value / total) * 100) : 0;
            return `${context.label}: ${value} ${t.tiresLabel} · ${percent}%`;
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
        const vida = vidaTypes[activeIndices[index]];
        onSelectVida(vida === selectedVida ? null : vida);
      }
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.title}</h2>
        <div className="group relative cursor-pointer print:hidden">
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
            w-60 pointer-events-none
          ">
            <p>
              {t.tooltip}
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Chart container with improved positioning for print */}
        <div className="h-64 mb-4 relative print:h-48">
          {total === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Activity size={32} />
              <p>{t.noDataAvailable}</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Canvas container with fixed positioning */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full max-w-64 max-h-64 print:max-w-48 print:max-h-48">
                  <Doughnut data={data} options={options} />
                </div>
              </div>
              {/* Center text with improved positioning */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <p className="text-3xl font-bold text-[#0A183A] print:text-2xl">{total}</p>
                <p className="text-sm text-gray-500 print:text-xs">{t.inspectedTires}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Legend grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 print:gap-2 print:mt-4">
          {activeIndices.map((i) => (
            <div
              key={i}
              onClick={() => onSelectVida(vidaTypes[i] === selectedVida ? null : vidaTypes[i])}
              className={`p-3 rounded-xl border hover:shadow transition-all cursor-pointer print:cursor-default print:p-2 print:rounded-lg ${
                selectedVida === vidaTypes[i] ? "bg-opacity-30 scale-105 print:scale-100" : ""
              }`}
              style={{
                backgroundColor: LIGHT_COLORS[i % LIGHT_COLORS.length],
              }}
            >
              <div className="flex items-center gap-3 print:gap-2">
                <div 
                  className="text-white p-2 rounded-full print:p-1" 
                  style={{ backgroundColor: BACKGROUND_COLORS[i % BACKGROUND_COLORS.length] }}
                >

                </div>
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">{vidaLabels[i]}</p>
                  <p className="text-lg font-bold text-gray-800 print:text-base">{grouping[vidaTypes[i]]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center mt-4 print:pt-2 print:mt-2">
          <div className="text-xs text-gray-500 print:text-xs">
            {t.totalLifeTypes} {activeIndices.length}
          </div>
          <div className="text-xs text-gray-500 print:text-xs">{t.currentTireStatus}</div>
        </div>
      </div>
    </div>
  );
};

export default PorVida;