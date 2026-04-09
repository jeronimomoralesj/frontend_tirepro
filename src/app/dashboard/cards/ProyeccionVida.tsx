"use client";

import React, { useMemo } from "react";
import { HelpCircle, Clock, AlertTriangle, TrendingDown } from "lucide-react";
export type Tire = {
  id: string;
  profundidadInicial: number;
  inspecciones?: {
    profundidadInt: number;
    profundidadCen: number;
    profundidadExt: number;
    fecha: string;
  }[];
  projectedDateEOL?: string | null;
  projectedKmRemaining?: number | null;
  healthScore?: number | null;
  [key: string]: unknown;
};

interface ProyeccionVidaProps {
  tires: Tire[];
}

const OPTIMAL_MM = 3;

function urgencyLabel(days: number): { label: string; color: string; bg: string } {
  if (days <= 30) return { label: "Critico", color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  if (days <= 60) return { label: "Pronto", color: "#f97316", bg: "rgba(249,115,22,0.08)" };
  if (days <= 90) return { label: "Planificar", color: "#eab308", bg: "rgba(234,179,8,0.08)" };
  return { label: "Estable", color: "#22c55e", bg: "rgba(34,197,94,0.08)" };
}

const ProyeccionVida: React.FC<ProyeccionVidaProps> = ({ tires }) => {
  const data = useMemo(() => {
    const buckets = { critical: 0, soon: 0, plan: 0, stable: 0, unknown: 0 };
    const daysArr: number[] = [];

    tires.forEach((t) => {
      const insps = t.inspecciones ?? [];
      if (insps.length === 0) {
        buckets.unknown++;
        return;
      }

      let daysUntilEOL: number | null = null;

      if (t.projectedDateEOL) {
        const d = new Date(t.projectedDateEOL);
        daysUntilEOL = Math.max(0, Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      } else if (insps.length >= 2) {
        const sorted = [...insps].sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstMin = Math.min(first.profundidadInt, first.profundidadCen, first.profundidadExt);
        const lastMin = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
        const months = (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (months >= 0.5 && firstMin > lastMin) {
          const rate = (firstMin - lastMin) / months;
          const remaining = lastMin - OPTIMAL_MM;
          if (remaining > 0 && rate > 0) {
            daysUntilEOL = Math.max(0, Math.round((remaining / rate) * 30));
          }
        }
      }

      if (daysUntilEOL === null) {
        buckets.unknown++;
        return;
      }

      daysArr.push(daysUntilEOL);
      if (daysUntilEOL <= 30) buckets.critical++;
      else if (daysUntilEOL <= 60) buckets.soon++;
      else if (daysUntilEOL <= 90) buckets.plan++;
      else buckets.stable++;
    });

    const avgDays = daysArr.length > 0 ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length) : 0;
    return { buckets, avgDays, total: daysArr.length };
  }, [tires]);


  const bars = [
    { key: "critical", label: "< 30d", count: data.buckets.critical, color: "#ef4444" },
    { key: "soon", label: "30-60d", count: data.buckets.soon, color: "#f97316" },
    { key: "plan", label: "60-90d", count: data.buckets.plan, color: "#eab308" },
    { key: "stable", label: "> 90d", count: data.buckets.stable, color: "#22c55e" },
  ];
  const maxCount = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[#173D68] text-white px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-xl font-bold leading-tight truncate">
            Proyeccion de Vida
          </h2>
        </div>
        <div className="group relative cursor-pointer flex-shrink-0">
          <HelpCircle className="text-white hover:text-gray-200 transition-colors" size={20} />
          <div className="absolute z-10 top-full mt-2 right-0 sm:-top-2 sm:right-full sm:top-auto sm:mt-0 sm:mr-2 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-56 sm:w-60 pointer-events-none shadow-xl">
            <p>Dias estimados hasta alcanzar el punto de retiro optimo (3mm). Otis calcula esto usando la tasa de desgaste por inspeccion.</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6">
        {data.total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Sin datos suficientes para proyecciones.
          </p>
        ) : (
          <>
            {/* Average */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8b5cf6]" />
                <span className="text-xs font-medium text-gray-600">Vida promedio proyectada</span>
              </div>
              <span className="text-lg font-black text-[#173D68]">
                {data.avgDays > 0 ? `${data.avgDays} dias` : "—"}
              </span>
            </div>

            {/* Distribution bars */}
            <div className="space-y-2.5">
              {bars.map((bar) => (
                <div key={bar.key} className="flex items-center gap-3">
                  <span className="w-12 text-[10px] font-bold text-gray-500 text-right flex-shrink-0">
                    {bar.label}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max(bar.count > 0 ? 8 : 0, (bar.count / maxCount) * 100)}%`,
                        background: bar.color,
                      }}
                    >
                      {bar.count > 0 && (
                        <span className="text-[9px] font-black text-white">{bar.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
              <span>{data.total} llantas con proyeccion</span>
              {data.buckets.unknown > 0 && (
                <span>{data.buckets.unknown} sin datos suficientes</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProyeccionVida;
