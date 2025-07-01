"use client";

import React, { useEffect, useState } from 'react'
import { Bar } from "react-chartjs-2"
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Tooltip, 
  Legend 
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { HelpCircle, HelpCircleIcon } from 'lucide-react';

// Register ChartJS components and plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

const translations = {
    es:{
        title: "Llantas por banda",
        tooltip: "Este gráfico muestra como están distribuidas las llantas por banda, es decir la cantidad de llantas que hay por cada una de las bandas.",
    },
    en: {
        title: "Tire by tread",
        tooltip: "This chart shows how tires are distributed by tread, that is, the number of tires for each tread.",
    }
}

interface PorBandaProps{
    groupData: { [diseno: String]: number }
}

const PorBanda: React.FC<PorBandaProps> = ({ groupData }) => {
  const [language, setLanguage] = useState<'en'|'es'>('es');

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
         
      }
      
      // Browser fallback
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };

    detectAndSetLanguage();
  }, []);

  const t = translations[language];

  //calculate the dynamic height
  const dynamicHeight = Math.max(300, Object.keys(groupData).length*40 + 100);

  // Prepare data for the bar chart
  const chartData = {
    labels: Object.keys(groupData),
    datasets: [
        {
            data: Object.values(groupData),
            backgroundColor: Object.keys(groupData).map(() => "#173D68"),
            borderRadius: 8,
            barPercentage: 0.6,
        }
    ]
  }

  // Data for the chart

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout:{
        padding: {
            left: 0,
            right: 20,
            top: 10,
            bottom: 0,
        }
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
        callbacks: {
          label: (context: { raw: number }) => {
            const value = context.raw;
            const total = chartData.datasets[0].data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `${t.quantity} ${value} · ${percentage}%`;
          },
          title: (tooltipItems: { label: string }[]) =>
            `${t.brand} ${tooltipItems[0].label}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        color: "white",
        font: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: "600"
        },
        formatter: (value: number) => `${value}`,
        anchor: "center",
        align: "center",
        textShadow: "0px 1px 2px rgba(0,0,0,0.3)",
        clamp: true
      },
    },
    scales: {
      y: {
        display: true,
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
        grid: { 
          display: true,
          color: "rgba(226, 232, 240, 0.3)",
          drawBorder: false,
        },
        border: { display: false },
      },
      x: {
        display: true,
        ticks: {
          color: "#94a3b8",
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 8,
          maxRotation: 0,
        },
        grid: {
          display: false,
        },
        border: { display: false },
      },
    },
  }

  return (
    <div className='bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden'>
        <div className='bg-[#173D68] text-white p-5 flex items-center justify-between'>
            <h2 className='text-xl font-bold'>{t.title}</h2>
            <div
                className='group relative cursor-pointer'
                title = "Informacion sobre el gráfico"
            >
                <HelpCircleIcon 
                    className='text-white hover:text-gray-200 transition-colors'
                    size={24}
                />
                <div
                    className="
                        absolute z-10 -top-2 right-full
                        bg-[#0A183A] text-white 
                        text-xs p-3 rounded-lg 
                        opacity-0 group-hover:opacity-100 
                        transition-opacity duration-300 
                        w-56 pointer-events-none
                    "
                >
                    <p>{t.tooltip}</p>
                </div>
            </div>
        </div>
        <div className='p-6'>
            <div style={{ height: `${dynamicHeight}px` }} className='mb-4'>
                <Bar data={chartData} options={options}/>
            </div>

        </div>
    </div>
  )
}

export default PorBanda;