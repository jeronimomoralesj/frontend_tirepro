"use client";

import React, { useState, useMemo } from "react";
import { eachMonthOfInterval, format } from "date-fns";
import { HelpCircle, ChevronDown, History, TrendingUp, Calendar } from "lucide-react";

export interface VidaEntry { valor: string; fecha: string; }
export interface Tire { id: string; vida: VidaEntry[]; }

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
    retreadsQuantity: "Reencauches",
    cumulativeTotal: "Total Acum.",
    tooltipIndividual: "Esta tabla muestra cuántos reencauches has tenido a lo largo de los últimos meses.",
    tooltipCumulative: " La vista acumulada acumula el total hasta cada mes.",
    totalRetreads: "Total",
  },
};

const ReencaucheHistorico: React.FC<ReencaucheHistoricoProps> = ({ tires, language = "es" }) => {
  const [mode, setMode] = useState<ViewMode>("individual");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const t = translations[language];

  const months = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    return eachMonthOfInterval({ start, end }).map((d) => format(d, "MMM yyyy"));
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

  const totalRetreads = useMemo(
    () => Object.values(individualCounts).reduce((sum, val) => sum + val, 0),
    [individualCounts]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col w-full min-w-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white px-4 py-3">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <History size={17} className="text-white/90 shrink-0" />
            <h2 className="text-sm font-semibold truncate">{t.title}</h2>
          </div>
          <div className="relative shrink-0">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip((v) => !v)}
              className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              aria-label="Ayuda"
            >
              <HelpCircle size={17} className="text-white/90" />
            </button>
            {showTooltip && (
              <div className="absolute z-20 right-0 top-full mt-2 w-52 bg-gray-900/95 text-white text-xs p-3 rounded-lg shadow-xl border border-white/10">
                <p className="leading-relaxed">
                  {t.tooltipIndividual}
                  {mode === "acumulado" && t.tooltipCumulative}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* View-mode dropdown */}
        <div className="relative">
          <button
            className="w-full bg-white/10 text-white text-xs rounded-lg px-3 py-2 border border-white/20 flex items-center justify-between gap-2"
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span className="flex items-center gap-2 min-w-0">
              {mode === "individual"
                ? <Calendar size={13} className="shrink-0" />
                : <TrendingUp size={13} className="shrink-0" />}
              <span className="truncate">
                {mode === "individual" ? t.individualView : t.cumulativeView}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 shrink-0 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-xl z-20 border border-gray-200 overflow-hidden">
                {(["individual", "acumulado"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 transition-colors ${
                      mode === m ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => { setMode(m); setDropdownOpen(false); }}
                  >
                    {m === "individual"
                      ? <><Calendar size={13} />{t.individualView}</>
                      : <><TrendingUp size={13} />{t.cumulativeView}</>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4" style={{ maxHeight: "42vh" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t.month}
              </th>
              <th className="pb-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {mode === "individual" ? t.retreadsQuantity : t.cumulativeTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, idx) => (
              <tr
                key={m}
                className={`transition-colors hover:bg-gray-50 ${idx < months.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <td className="py-2 text-xs text-gray-700 font-medium">{m}</td>
                <td className="py-2 text-right">
                  <span
                    className={`inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-lg text-xs font-bold ${
                      countsToShow[m] > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {countsToShow[m] ?? 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg">
          <History size={12} className="text-blue-600 shrink-0" />
          <span className="text-xs font-medium text-blue-700">
            {t.totalRetreads}: <span className="font-bold">{totalRetreads}</span>
          </span>
        </div>
        <span className="text-xs text-gray-500 italic shrink-0">{months.length} meses</span>
      </div>
    </div>
  );
};

export default ReencaucheHistorico;