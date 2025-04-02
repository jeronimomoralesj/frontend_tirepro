"use client";

import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend as ChartLegend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { HelpCircle } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, ChartLegend, ChartDataLabels);

interface Vehicle {
  id: string;
  tipovhc: string;
  tireCount: number;
}

interface TipoVehiculoProps {
  vehicles: Vehicle[];
}

const TipoVehiculo: React.FC<TipoVehiculoProps> = ({ vehicles }) => {
  // Define a color palette using your specified colors.
  const PALETTE = ["#173D68", "#1E76B6", "#348CCB"];

  // Group vehicles by type summing up tireCount.
  const grouping = useMemo(() => {
    return vehicles.reduce((acc: { [tipo: string]: number }, vehicle) => {
      const tipo = vehicle.tipovhc || "Desconocido";
      acc[tipo] = (acc[tipo] || 0) + vehicle.tireCount;
      return acc;
    }, {});
  }, [vehicles]);

  // Prepare chart data.
  const chartData = useMemo(() => {
    const labels = Object.keys(grouping);
    const values = labels.map((label) => grouping[label]);
    const backgroundColors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          cutout: "70%",
        },
      ],
    };
  }, [grouping]);

  // Chart options (keep it simple)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // We'll render a custom legend below
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
            return `Cantidad: ${value} · ${percentage}%`;
          },
          title: (tooltipItems: any[]) => `Tipo ${tooltipItems[0].label}`,
        },
        borderColor: "#e2e8f0",
        borderWidth: 1,
      },
      datalabels: {
        display: false, // Hide in-chart labels for a cleaner donut
      },
    },
  };

  const totalVehicles = useMemo(
    () => Object.values(grouping).reduce((a, b) => a + b, 0),
    [grouping]
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Llantas por Tipo de Vehiculo</h2>
        <div
          className="group relative cursor-pointer"
          title="Información sobre el gráfico"
        >
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
              w-56 pointer-events-none
            "
          >
            <p>
              Este gráfico muestra la distribución de llantas por tipo de
              vehículo. Cada sector representa un tipo de vehículo con su
              proporción de llantas.
            </p>
          </div>
        </div>
      </div>
      {/* Chart */}
      <div className="p-6">
        <div className="h-64 mb-4 relative">
          <Doughnut data={chartData} options={chartOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold text-[#173D68]">{totalVehicles}</p>
            <p className="text-xs text-gray-500">llantas</p>
          </div>
        </div>
        {/* Custom Legend */}
        <div className="flex flex-wrap justify-center gap-4">
          {chartData.labels.map((label, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className="block w-4 h-4 rounded"
                style={{ backgroundColor: chartData.datasets[0].backgroundColor[index] }}
              ></span>
              <span className="text-xs text-gray-700">{label}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Total de tipos: {chartData.labels.length}
          </div>
          <div className="text-xs text-gray-500">Cantidad de llantas</div>
        </div>
      </div>
    </div>
  );
};

export default TipoVehiculo;
