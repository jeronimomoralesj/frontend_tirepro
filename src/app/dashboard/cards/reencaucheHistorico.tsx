"use client";

import { HelpCircle } from "lucide-react";
import React, { useMemo } from "react";

export type VidaEntry = {
  valor: string;
  fecha: string;
};

export type Tire = {
  id: string;
  vida: VidaEntry[];
};

interface ReencaucheHistoricoProps {
  tires: Tire[];
}

const ReencaucheHistorico: React.FC<ReencaucheHistoricoProps> = ({ tires }) => {
  const lastFiveMonths = useMemo(() => {
    const months: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(currentYear, currentMonth);
      const label = date.toLocaleString("default", { month: "short", year: "numeric" });
      months.unshift({ year: date.getFullYear(), month: date.getMonth(), label });
      
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
    }
    return months;
  }, []);

  const reencaucheCounts = useMemo(() => {
    const counts: { [label: string]: number } = {};
    lastFiveMonths.forEach((m) => {
      counts[m.label] = 0;
    });

    tires.forEach((tire) => {
      // Find all reencauche entries
      const reencaucheEntries = tire.vida.filter((entry) =>
        entry.valor.toLowerCase().includes("reencauche")
      );
      
      if (reencaucheEntries.length === 0) return;
      
      // Process each reencauche entry
      reencaucheEntries.forEach(entry => {
        const entryDate = new Date(entry.fecha);
        const entryMonth = entryDate.getMonth();
        const entryYear = entryDate.getFullYear();
        
        // Find matching month and increment count
        lastFiveMonths.forEach((m) => {
          if (m.month === entryMonth && m.year === entryYear) {
            counts[m.label]++;
          }
        });
      });
    });

    return counts;
  }, [tires, lastFiveMonths]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Reencauche Histórico</h2>
        <div className="group relative cursor-pointer">
          <HelpCircle
            className="text-white hover:text-gray-200 transition-colors"
            size={24}
          />
          <div className="absolute z-10 -top-2 right-full bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-60 pointer-events-none">
            <p>
              Esta tabla muestra cuántos reencauches has tenido a lo largo de los últimos meses.
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left text-sm font-medium text-gray-500 uppercase">Mes</th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500 uppercase">Cantidad de Reencauches</th>
              </tr>
            </thead>
            <tbody>
              {lastFiveMonths.map((m) => (
                <tr key={m.label} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-4 text-sm text-[#0A183A]">{m.label}</td>
                  <td className="py-4 text-right text-sm font-bold text-[#1E76B6]">
                    {reencaucheCounts[m.label]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReencaucheHistorico;