import React, { useState, useMemo } from "react";
import { eachMonthOfInterval, format } from "date-fns";
import { HelpCircle, ChevronDown } from "lucide-react";

export interface VidaEntry {
  valor: string;       // e.g. "reencauche 1", "reencauche 2", …
  fecha: string;       // ISO date
}

export interface Tire {
  id: string;
  vida: VidaEntry[];
}

type ViewMode = "individual" | "acumulado";

interface ReencaucheHistoricoProps {
  tires: Tire[];
  language?: "en" | "es"; // Language prop
}

// Translation object
const translations = {
  en: {
    title: "Retreading History",
    individualView: "Individual View",
    cumulativeView: "Cumulative View",
    month: "Month",
    retreadsQuantity: "Number of Retreads",
    cumulativeTotal: "Cumulative Total",
    tooltipIndividual: "This table shows how many retreads you have had over the last months.",
    tooltipCumulative: " The cumulative view accumulates the total up to each month."
  },
  es: {
    title: "Reencauche Histórico",
    individualView: "Vista Individual",
    cumulativeView: "Vista Acumulada",
    month: "Mes",
    retreadsQuantity: "Cantidad de Reencauches",
    cumulativeTotal: "Total Acumulado",
    tooltipIndividual: "Esta tabla muestra cuántos reencauches has tenido a lo largo de los últimos meses.",
    tooltipCumulative: " La vista acumulada acumula el total hasta cada mes."
  }
};

const ReencaucheHistorico: React.FC<ReencaucheHistoricoProps> = ({ 
  tires, 
  language = "es" // Default to Spanish
}) => {
  const [mode, setMode] = useState<ViewMode>("individual");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const t = translations[language];

  // Last 6 months labels, e.g. ["May 2024", "Jun 2024", …]
  const months = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    return eachMonthOfInterval({ start, end }).map((d) =>
      format(d, "MMM yyyy")
    );
  }, []);

  // Count per-month "reencauche" events
  const individualCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    months.forEach((m) => (counts[m] = 0));

    tires.forEach((tire) => {
      tire.vida
        .filter((v) => v.valor.toLowerCase().startsWith("reencauche"))
        .forEach((v) => {
          const m = format(new Date(v.fecha), "MMM yyyy");
          if (counts[m] !== undefined) counts[m]++;
        });
    });

    return counts;
  }, [tires, months]);

  // Build running total
  const acumuladoCounts = useMemo(() => {
    const result: Record<string, number> = {};
    let running = 0;
    months.forEach((m) => {
      running += individualCounts[m] || 0;
      result[m] = running;
    });
    return result;
  }, [individualCounts, months]);

  const countsToShow = mode === "individual" ? individualCounts : acumuladoCounts;

  return (
    <div className="bg-white rounded-2xl shadow-lg border-gray-100 overflow-hidden border">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.title}</h2>
        <div className="flex items-center gap-4">
          <div className="relative inline-block">
            <button
              className="bg-white text-[#173D68] rounded px-4 py-2 text-sm font-medium flex items-center"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              {mode === "individual" ? t.individualView : t.cumulativeView}
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border">
                <button
                  className={`w-full text-left px-4 py-2 text-sm ${
                    mode === "individual"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => { setMode("individual"); setDropdownOpen(false); }}
                >
                  {t.individualView}
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm ${
                    mode === "acumulado"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => { setMode("acumulado"); setDropdownOpen(false); }}
                >
                  {t.cumulativeView}
                </button>
              </div>
            )}
          </div>

          <div className="group relative cursor-pointer">
            <HelpCircle size={20} className="text-white hover:text-gray-200" />
            <div className="absolute z-10 top-full right-0 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-60 pointer-events-none mt-2">
              <p>
                {t.tooltipIndividual}
                {mode === "acumulado" && t.tooltipCumulative}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 text-left text-sm font-medium text-gray-500 uppercase">
                {t.month}
              </th>
              <th className="pb-3 text-right text-sm font-medium text-gray-500 uppercase">
                {mode === "individual" ? t.retreadsQuantity : t.cumulativeTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m} className="border-b last:border-b-0 border-gray-100">
                <td className="py-4 text-sm text-[#0A183A]">{m}</td>
                <td className="py-4 text-right text-sm font-bold text-[#1E76B6]">
                  {countsToShow[m] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReencaucheHistorico;