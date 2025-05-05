import React, { useState, useMemo } from "react";
import { eachMonthOfInterval, format } from "date-fns";
import { HelpCircle } from "lucide-react";

export interface VidaEntry {
  valor: string;       // e.g. "reencauche 1", "reencauche 2", …
  fecha: string;       // ISO date
}

export interface Tire {
  id: string;
  vida: VidaEntry[];
}

const ReencaucheHistorico: React.FC<{ tires: Tire[] }> = ({ tires }) => {
  // mode selector: per-month or cumulative
  const [mode, setMode] = useState<"individual" | "acumulado">("individual");

  // Build a sorted list of the last 6 months labels
  const months = useMemo(() => {
    const end = new Date();
    // change here: only 6 months back
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    return eachMonthOfInterval({ start, end }).map((d) =>
      format(d, "MMM yyyy")
    );
  }, []);

  // Count how many reencauches happened in each month
  const individualCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // initialize
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

  // Build a cumulative sum up to each month
  const acumuladoCounts = useMemo(() => {
    const result: Record<string, number> = {};
    let running = 0;
    months.forEach((m) => {
      running += individualCounts[m] || 0;
      result[m] = running;
    });
    return result;
  }, [individualCounts, months]);

  // Pick which to render
  const countsToShow = mode === "individual" ? individualCounts : acumuladoCounts;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Reencauche Histórico</h2>
        <div className="flex items-center gap-4">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "individual" | "acumulado")}
            className="bg-white text-[#173D68] rounded px-3 py-1 text-sm font-medium"
          >
            <option value="individual">Individual</option>
            <option value="acumulado">Acumulado</option>
          </select>
          <div className="group relative cursor-pointer">
            <HelpCircle
              className="text-white hover:text-gray-200 transition-colors"
              size={24}
            />
            <div className="absolute z-10 -top-2 right-full bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-60 pointer-events-none">
              <p>
                Esta tabla muestra cuántos reencauches has tenido a lo largo de los últimos meses.
                {mode === "acumulado" && " Vista acumulada muestra el total hasta cada mes."}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left text-sm font-medium text-gray-500 uppercase">Mes</th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500 uppercase">
                  {mode === "individual" ? "Cantidad de Reencauches" : "Total Acumulado"}
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-4 text-sm text-[#0A183A]">{m}</td>
                  <td className="py-4 text-right text-sm font-bold text-[#1E76B6]">
                    {countsToShow[m] || 0}
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
