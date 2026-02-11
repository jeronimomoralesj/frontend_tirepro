import React, { useState, useMemo } from "react";
import { eachMonthOfInterval, format } from "date-fns";
import { HelpCircle, ChevronDown, History, TrendingUp, Calendar } from "lucide-react";

export interface VidaEntry {
  valor: string;
  fecha: string;
}

export interface Tire {
  id: string;
  vida: VidaEntry[];
}

type ViewMode = "individual" | "acumulado";

interface ReencaucheHistoricoProps {
  tires: Tire[];
  language?: "es";
}

const translations = {
  es: {
    title: "Reencauche Histórico",
    individualView: "Vista Individual",
    cumulativeView: "Vista Acumulada",
    month: "Mes",
    retreadsQuantity: "Cantidad de Reencauches",
    cumulativeTotal: "Total Acumulado",
    tooltipIndividual: "Esta tabla muestra cuántos reencauches has tenido a lo largo de los últimos meses.",
    tooltipCumulative: " La vista acumulada acumula el total hasta cada mes.",
    totalRetreads: "Total Reencauches"
  }
};

const ReencaucheHistorico: React.FC<ReencaucheHistoricoProps> = ({ 
  tires, 
  language = "es"
}) => {
  const [mode, setMode] = useState<ViewMode>("individual");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const t = translations[language];

  const months = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    return eachMonthOfInterval({ start, end }).map((d) =>
      format(d, "MMM yyyy")
    );
  }, []);

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
  
  const totalRetreads = useMemo(() => {
    return Object.values(individualCounts).reduce((sum, val) => sum + val, 0);
  }, [individualCounts]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History size={20} className="text-white/90" />
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
                <p className="leading-relaxed">
                  {t.tooltipIndividual}
                  {mode === "acumulado" && t.tooltipCumulative}
                </p>
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900/95 transform rotate-45 border-l border-t border-white/10"></div>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            className="w-full bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg px-3 py-2 
                     border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 
                     transition-all flex items-center justify-between"
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span className="flex items-center gap-2">
              {mode === "individual" ? (
                <Calendar size={16} />
              ) : (
                <TrendingUp size={16} />
              )}
              {mode === "individual" ? t.individualView : t.cumulativeView}
            </span>
            <ChevronDown 
              size={16} 
              className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 left-0 mt-2 bg-white rounded-lg shadow-xl z-20 border border-gray-200 overflow-hidden">
                <button
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    mode === "individual"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => { setMode("individual"); setDropdownOpen(false); }}
                >
                  <Calendar size={16} />
                  {t.individualView}
                </button>
                <button
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    mode === "acumulado"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => { setMode("acumulado"); setDropdownOpen(false); }}
                >
                  <TrendingUp size={16} />
                  {t.cumulativeView}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-5 overflow-x-auto">
        <div className="min-w-full">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="pb-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t.month}
                </th>
                <th className="pb-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {mode === "individual" ? t.retreadsQuantity : t.cumulativeTotal}
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, idx) => (
                <tr 
                  key={m} 
                  className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                    idx === months.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="py-3 text-sm text-gray-700 font-medium">{m}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-lg text-sm font-bold ${
                      countsToShow[m] > 0 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'bg-gray-50 text-gray-400'
                    }`}>
                      {countsToShow[m] ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-100 p-4 sm:px-5 sm:py-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
            <History size={14} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {t.totalRetreads}: <span className="font-bold">{totalRetreads}</span>
            </span>
          </div>
          <div className="text-xs text-gray-500 italic">
            {t.month}: {months.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReencaucheHistorico;