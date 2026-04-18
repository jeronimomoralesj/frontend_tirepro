"use client";

import React, { useMemo, useState } from "react";
import {
  HelpCircle, ArrowDownUp, ArrowUpDown, ArrowUpAZ, Tag, ChevronDown,
} from "lucide-react";

type SortMode = "desc" | "asc" | "alpha";

const translations = {
  es: {
    title: "Llantas por Marca",
    tooltip:
      "Distribución de tus llantas por marca. Ordena por cantidad o alfabéticamente.",
    totalBrands: "marcas",
    quantity: "llantas",
    sortDesc:  "Mayor",
    sortAsc:   "Menor",
    sortAlpha: "A-Z",
    showAll:   "Ver todas",
    showLess:  "Ver menos",
    noData:    "Sin datos de marca",
  },
};

interface PorMarcaProps {
  groupData: { [marca: string]: number };
}

// When there are many brands, start with this many visible. The user can
// expand to see all. Keeps mobile compact and prevents 40-brand card bombs.
const INITIAL_VISIBLE = 10;

const PorMarca: React.FC<PorMarcaProps> = ({ groupData }) => {
  const [sortMode, setSortMode] = useState<SortMode>("desc");
  const [expanded, setExpanded] = useState(false);
  const t = translations.es;

  const sorted = useMemo(() => {
    const entries = Object.entries(groupData);
    entries.sort(([aK, aV], [bK, bV]) => {
      if (sortMode === "desc") return bV - aV;
      if (sortMode === "asc")  return aV - bV;
      return aK.localeCompare(bK);
    });
    return entries;
  }, [groupData, sortMode]);

  const total = useMemo(
    () => sorted.reduce((s, [, v]) => s + v, 0),
    [sorted],
  );
  const max = sorted.length > 0 ? sorted[0][1] : 0;

  const canCollapse = sorted.length > INITIAL_VISIBLE;
  const visible = canCollapse && !expanded
    ? sorted.slice(0, INITIAL_VISIBLE)
    : sorted;

  const sortOptions: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
    { mode: "desc",  label: t.sortDesc,  icon: <ArrowDownUp size={12} /> },
    { mode: "asc",   label: t.sortAsc,   icon: <ArrowUpDown size={12} /> },
    { mode: "alpha", label: t.sortAlpha, icon: <ArrowUpAZ   size={12} /> },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden w-full"
         style={{ boxShadow: "0 4px 24px rgba(10,24,58,0.06)" }}>
      {/* Header */}
      <div
        className="text-white px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2"
        style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg flex-shrink-0"
               style={{ background: "rgba(255,255,255,0.14)" }}>
            <Tag size={16} className="text-white" />
          </div>
          <h2 className="text-sm sm:text-base lg:text-lg font-bold truncate">{t.title}</h2>
        </div>
        <div className="group relative cursor-pointer flex-shrink-0">
          <HelpCircle className="text-white/80 hover:text-white transition-colors" size={18} />
          <div className="absolute z-20 top-full mt-2 right-0 bg-[#0A183A] text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none shadow-xl">
            {t.tooltip}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-3 sm:px-5 py-3 flex items-center gap-1.5 border-b border-gray-100">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 overflow-x-auto"
             style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
          {sortOptions.map(({ mode, label, icon }) => {
            const active = sortMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                aria-pressed={active}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: active ? "linear-gradient(135deg, #0A183A, #1E76B6)" : "transparent",
                  color: active ? "white" : "#64748b",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-[11px] text-gray-500 font-semibold tabular-nums flex-shrink-0">
          {sorted.length} {t.totalBrands}
        </div>
      </div>

      {/* List of horizontal bars — CSS-native, no chart.js. Scales from
          375px to 1920px without a fixed min-width. Each row is always
          readable because the bar width uses the container, not a px value. */}
      <div className="p-3 sm:p-4">
        {sorted.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-xs">
            {t.noData}
          </div>
        ) : (
          <>
            <ul className="space-y-2" role="list">
              {visible.map(([label, value], idx) => {
                const pct  = total > 0 ? (value / total) * 100 : 0;
                const rel  = max > 0   ? (value / max)   * 100 : 0;
                return (
                  <li key={label} className="group">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-black text-gray-400 tabular-nums w-5 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs sm:text-[13px] font-semibold text-[#0A183A] truncate capitalize">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-shrink-0 tabular-nums">
                        <span className="text-sm font-black text-[#173D68]">
                          {value.toLocaleString("es-CO")}
                        </span>
                        <span className="text-[10px] text-gray-400 w-10 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden relative"
                      style={{ background: "rgba(10,24,58,0.05)" }}
                      role="progressbar"
                      aria-valuenow={value}
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-label={`${label}: ${value} llantas`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${rel}%`,
                          background:
                            "linear-gradient(90deg, #0A183A 0%, #1E76B6 60%, #348CCB 100%)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {canCollapse && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-black text-[#1E76B6] transition-all hover:bg-[rgba(30,118,182,0.06)]"
                style={{ border: "1px solid rgba(30,118,182,0.2)" }}
              >
                <ChevronDown
                  size={13}
                  className={expanded ? "rotate-180 transition-transform" : "transition-transform"}
                />
                {expanded ? t.showLess : `${t.showAll} (${sorted.length - INITIAL_VISIBLE} más)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PorMarca;
