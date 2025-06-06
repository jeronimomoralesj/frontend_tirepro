"use client";

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Tooltip, 
  Legend 
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { HelpCircle } from 'lucide-react';

// Register ChartJS components and plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface PorMarcaProps {
  groupData: { [marca: string]: number };
}

const PorMarca: React.FC<PorMarcaProps> = ({ groupData }) => {
  // Prepare data for the Bar chart
  const chartData = {
    labels: Object.keys(groupData),
    datasets: [
      {
        data: Object.values(groupData),
        backgroundColor: Object.keys(groupData).map(() => "#173D68"),
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
          label: (context: { raw: number }) => {
            const value = context.raw;
            const total = chartData.datasets[0].data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `Cantidad: ${value} · ${percentage}%`;
          },
          title: (tooltipItems: { label: string }[]) =>
            `Marca ${tooltipItems[0].label}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        color: "white", // Changed to white for better contrast
        font: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: "600" // Made slightly bolder
        },
        formatter: (value: number) => `${value}`,
        // Center the label within each bar
        anchor: "center",
        align: "center",
        // Add a slight text shadow for better visibility against the blue background
        textShadow: "0px 1px 2px rgba(0,0,0,0.3)",
        // Ensure labels are always visible inside the bars
        clamp: true
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
          stepSize: 1,
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
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Llantas por Marca</h2>
        <div 
          className="group relative cursor-pointer"
          title="Información sobre el gráfico"
        >
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
            w-56 pointer-events-none
          ">
            <p>Este gráfico muestra como están distribuidas las llantas por marca,
              es decir la cantidad de llantas que hay por cada una de las marcas.
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
            Total de marcas: {Object.keys(groupData).length}
          </div>
          <div className="text-xs text-gray-500">Cantidad de llantas</div>
        </div>
      </div>
    </div>
  );
};

export default PorMarca;