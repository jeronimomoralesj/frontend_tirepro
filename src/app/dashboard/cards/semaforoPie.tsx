"use client";

import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { AlertOctagon, Timer, CheckCircle2, RotateCcw, HelpCircle } from "lucide-react";

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

interface SemaforoPieProps {
  tires: Tire[];
  onSelectCondition?: (condition: string | null) => void;
  selectedCondition?: string | null;
}

const SemaforoPie: React.FC<SemaforoPieProps> = ({ tires, onSelectCondition = () => {}, selectedCondition = null }) => {
  const [tireCounts, setTireCounts] = useState({
    buenEstado: 0,
    dias60: 0,
    dias30: 0,
    cambioInmediato: 0,
  });
 // const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const counts = { buenEstado: 0, dias60: 0, dias30: 0, cambioInmediato: 0 };

    tires.forEach((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return;
      const last = tire.inspecciones.at(-1);
      if (!last) return;

      const minDepth = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);

      if (minDepth > 7) counts.buenEstado++;
      else if (minDepth > 6) counts.dias60++;
      else if (minDepth > 5) counts.dias30++;
      else counts.cambioInmediato++;
    });

    setTireCounts(counts);
  }, [tires]);

  const conditions = ["buenEstado", "dias60", "dias30", "cambioInmediato"];
  const conditionLabels = ["Óptimo", "60 Días", "30 Días", "Urgente"];
  const backgroundColors = ["#22c55e", "#2D95FF", "#f97316", "#ef4444"];
  const lightColors = ["#bbf7d0", "#bfdbfe", "#fed7aa", "#fecaca"];
  const icons = [
    <CheckCircle2 size={20} key="check" />,
    <Timer size={20} key="timer" />,
    <AlertOctagon size={20} key="alert" />,
    <RotateCcw size={20} key="rotate" />
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
        borderWidth: 4,
        cutout: "75%",
      },
    ],
  };

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
        borderColor: "#e2e8f0",
        borderWidth: 1,
        callbacks: {
          label: (context: { raw: number; label: string }) => {
            const value = context.raw;
            const percent = total ? Math.round((value / total) * 100) : 0;
            return `${context.label}: ${value} llantas · ${percent}%`;
          },
        },
      },
    },
    onClick: (
      _: React.MouseEvent<HTMLCanvasElement>,
      elements: { index: number }[]
    ) => {
      if (elements.length > 0) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
        const index = elements[0].index;
        const condition = conditions[activeIndices[index]];
        onSelectCondition(condition === selectedCondition ? null : condition);
      }
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Semáforo</h2>
        <div className="group relative cursor-pointer">
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
      Esta gráfica en dono muestra las proyecciones de cambio de sus llantas.
    </p>
  </div>
</div>

      </div>
      <div className="p-6">
        <div className="h-64 mb-4 relative">
          {total === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <AlertOctagon size={32} />
              <p>No hay inspecciones disponibles</p>
            </div>
          ) : (
            <>
              <Doughnut data={data} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-[#0A183A]">{total}</p>
                <p className="text-sm text-gray-500">llantas inspeccionadas</p>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {activeIndices.map((i) => (
            <div
              key={i}
              onClick={() => onSelectCondition(conditions[i] === selectedCondition ? null : conditions[i])}
              className={`p-3 rounded-xl border hover:shadow transition-all cursor-pointer ${
                selectedCondition === conditions[i] ? "bg-opacity-30 scale-105" : ""
              }`}
              style={{
                backgroundColor: lightColors[i],
              }}
            >
              <div className="flex items-center gap-3">
                <div className="text-white p-2 rounded-full" style={{ backgroundColor: backgroundColors[i] }}>
                  {icons[i]}
                </div>
                <div>
                  <p className="text-sm text-gray-600">{conditionLabels[i]}</p>
                  <p className="text-lg font-bold text-gray-800">{tireCounts[conditions[i]]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center mt-4">
          <div className="text-xs text-gray-500">
            Total de condiciones: {activeIndices.length}
          </div>
          <div className="text-xs text-gray-500">Estado actual de llantas</div>
        </div>
      </div>
    </div>
  );
};

export default SemaforoPie;