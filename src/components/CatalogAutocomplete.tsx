"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, BarChart3, Users, TrendingUp } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

type CatalogItem = {
  marca: string;
  modelo: string;
  dimension: string;
  rtdMm: number | null;
  psiRecomendado: number | null;
  precioCop: number | null;
  kmEstimadosReales: number | null;
  terreno: string | null;
  skuRef: string;
  // Crowdsource fields
  fuente?: string | null;
  crowdSampleSize?: number;
  crowdCompanyCount?: number;
  crowdConfidence?: number;
  crowdAvgPrice?: number | null;
  crowdMedianPrice?: number | null;
  crowdAvgInitialDepth?: number | null;
  crowdMedianInitialDepth?: number | null;
  crowdAvgCpk?: number | null;
  crowdAvgWearRate?: number | null;
};

type CrowdStats = {
  sampleSize: number;
  companyCount: number;
  confidence: number;
  price?: { avg: number; median: number; n: number } | null;
  initialDepth?: { avg: number; median: number; n: number } | null;
  km?: { avg: number; median: number; n: number } | null;
  cpk?: { avg: number; median: number; n: number } | null;
  wearRate?: { avg: number; median: number; n: number } | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: CatalogItem) => void;
  onCrowdCreate?: (value: string, stats: CrowdStats | null) => void;
  field: "marca" | "dimension" | "modelo";
  filterMarca?: string;
  filterDimension?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

function ConfidenceBadge({ confidence, samples }: { confidence: number; samples: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    pct >= 40 ? "text-amber-600 bg-amber-50 border-amber-200" :
               "text-gray-500 bg-gray-50 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold border ${color}`}>
      <Users className="w-2.5 h-2.5" />
      {samples}
      <span className="mx-0.5">·</span>
      {pct}%
    </span>
  );
}

function CrowdStatsBadges({ item }: { item: CatalogItem }) {
  if (!item.crowdSampleSize || item.crowdSampleSize < 1) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      <ConfidenceBadge confidence={item.crowdConfidence ?? 0} samples={item.crowdSampleSize} />
      {item.crowdAvgCpk != null && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold text-[#1E76B6] bg-blue-50 border border-blue-200">
          <TrendingUp className="w-2.5 h-2.5" />
          CPK ${Math.round(item.crowdAvgCpk)}
        </span>
      )}
    </div>
  );
}

export default function CatalogAutocomplete({
  value, onChange, onSelect, onCrowdCreate, field, filterMarca, filterDimension,
  placeholder, required, className,
}: Props) {
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [crowdStats, setCrowdStats] = useState<CrowdStats | null>(null);
  const [loadingCrowd, setLoadingCrowd] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const fetchCrowdStats = useCallback(async (query: string) => {
    if (query.length < 2) { setCrowdStats(null); return; }
    setLoadingCrowd(true);
    try {
      const params = new URLSearchParams();
      if (field === "marca") params.set("marca", query);
      else if (field === "dimension") params.set("dimension", query);
      else if (field === "modelo") {
        if (filterMarca) params.set("marca", filterMarca);
        if (filterDimension) params.set("dimension", filterDimension);
        else params.set("marca", query); // fallback
        params.set("modelo", query);
      }
      // Need at least marca and dimension for crowd stats
      if (!params.has("marca") && filterMarca) params.set("marca", filterMarca);
      if (!params.has("dimension") && filterDimension) params.set("dimension", filterDimension);

      if (params.has("marca") && params.has("dimension")) {
        const res = await fetch(`${API_BASE}/catalog/crowd-stats?${params.toString()}`);
        if (res.ok) {
          const data: CrowdStats = await res.json();
          setCrowdStats(data.sampleSize > 0 ? data : null);
        }
      }
    } catch { /* */ }
    setLoadingCrowd(false);
  }, [field, filterMarca, filterDimension]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) { setSuggestions([]); setNoResults(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (field === "marca") params.set("q", query);
      else if (field === "dimension") params.set("dimension", query);
      else if (field === "modelo") params.set("q", query);

      if (filterMarca) params.set("marca", filterMarca);
      if (filterDimension) params.set("dimension", filterDimension);

      const res = await fetch(`${API_BASE}/catalog/search?${params.toString()}`);
      if (res.ok) {
        const data: CatalogItem[] = await res.json();
        setSuggestions(data);
        setNoResults(data.length === 0 && query.length >= 2);
        // If no results, fetch crowd stats to show what we know from real data
        if (data.length === 0 && query.length >= 2) {
          fetchCrowdStats(query);
        } else {
          setCrowdStats(null);
        }
      }
    } catch { /* */ }
    setLoading(false);
  }, [field, filterMarca, filterDimension, fetchCrowdStats]);

  function handleChange(val: string) {
    onChange(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  }

  function handleSelect(item: CatalogItem) {
    if (field === "marca") onChange(item.marca);
    else if (field === "dimension") onChange(item.dimension);
    else if (field === "modelo") onChange(item.modelo);
    setOpen(false);
    onSelect?.(item);
  }

  function handleCrowdCreate() {
    setOpen(false);
    onCrowdCreate?.(value, crowdStats);
  }

  // Deduplicate suggestions based on field
  const unique = (() => {
    if (field === "marca") {
      const seen = new Set<string>();
      return suggestions.filter((s) => {
        const k = s.marca.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    if (field === "dimension") {
      const seen = new Set<string>();
      return suggestions.filter((s) => {
        const k = s.dimension.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    return suggestions; // modelo — show all (includes dimension context)
  })();

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (value.length >= 1) { setOpen(true); fetchSuggestions(value); } }}
        placeholder={placeholder}
        required={required}
        className={className || inputCls}
      />

      {open && (unique.length > 0 || noResults) && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white"
          style={{ border: "1px solid rgba(52,140,203,0.25)", boxShadow: "0 8px 24px rgba(10,24,58,0.12)" }}
        >
          {/* Regular catalog results */}
          {unique.slice(0, 15).map((item, i) => (
            <button
              key={`${item.skuRef}-${i}`}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-[#F0F7FF] transition-colors"
              style={{ borderBottom: "1px solid rgba(52,140,203,0.08)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {field === "marca" && (
                    <p className="text-sm font-semibold text-[#0A183A] truncate">{item.marca}</p>
                  )}
                  {field === "dimension" && (
                    <>
                      <p className="text-sm font-semibold text-[#0A183A]">{item.dimension}</p>
                      <p className="text-[10px] text-[#348CCB] truncate">{item.marca} {item.modelo}</p>
                    </>
                  )}
                  {field === "modelo" && (
                    <>
                      <p className="text-sm font-semibold text-[#0A183A] truncate">{item.modelo}</p>
                      <p className="text-[10px] text-[#348CCB]">{item.marca} — {item.dimension}{item.terreno ? ` — ${item.terreno}` : ""}</p>
                    </>
                  )}
                  {/* Show crowd intelligence badges on catalog items that have them */}
                  {item.fuente === "crowdsource" && <CrowdStatsBadges item={item} />}
                </div>
                <div className="flex-shrink-0 text-right">
                  {item.rtdMm && <p className="text-[10px] font-bold text-[#1E76B6]">{item.rtdMm}mm</p>}
                  {item.precioCop && <p className="text-[9px] text-[#348CCB]">${Math.round(item.precioCop / 1000)}K</p>}
                  {item.fuente === "crowdsource" && (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 border border-violet-200 mt-0.5">
                      crowd
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* "Not found — add new" section */}
          {noResults && (
            <div className="border-t border-[#348CCB]/15">
              {/* Crowd data summary if available */}
              {crowdStats && crowdStats.sampleSize > 0 && (
                <div className="px-3 py-2 bg-gradient-to-r from-violet-50 to-blue-50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BarChart3 className="w-3 h-3 text-violet-600" />
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                      Datos de la comunidad TirePro
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {crowdStats.price && (
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase">Precio prom.</p>
                        <p className="text-xs font-bold text-[#0A183A]">
                          ${Math.round(crowdStats.price.median / 1000)}K
                          <span className="text-[9px] font-normal text-gray-400 ml-1">({crowdStats.price.n} datos)</span>
                        </p>
                      </div>
                    )}
                    {crowdStats.initialDepth && (
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase">Prof. inicial</p>
                        <p className="text-xs font-bold text-[#0A183A]">
                          {crowdStats.initialDepth.median}mm
                          <span className="text-[9px] font-normal text-gray-400 ml-1">({crowdStats.initialDepth.n} datos)</span>
                        </p>
                      </div>
                    )}
                    {crowdStats.km && (
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase">KM promedio</p>
                        <p className="text-xs font-bold text-[#0A183A]">
                          {Math.round(crowdStats.km.median / 1000)}K km
                          <span className="text-[9px] font-normal text-gray-400 ml-1">({crowdStats.km.n} datos)</span>
                        </p>
                      </div>
                    )}
                    {crowdStats.cpk && (
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase">CPK promedio</p>
                        <p className="text-xs font-bold text-[#0A183A]">
                          ${crowdStats.cpk.median}
                          <span className="text-[9px] font-normal text-gray-400 ml-1">({crowdStats.cpk.n} datos)</span>
                        </p>
                      </div>
                    )}
                    {crowdStats.wearRate && (
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase">Desgaste</p>
                        <p className="text-xs font-bold text-[#0A183A]">
                          {crowdStats.wearRate.median} mm/1Kkm
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ConfidenceBadge
                      confidence={crowdStats.confidence}
                      samples={crowdStats.sampleSize}
                    />
                    <span className="text-[8px] text-gray-400">
                      {crowdStats.companyCount} empresa{crowdStats.companyCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}

              {/* Add new button */}
              <button
                type="button"
                onClick={handleCrowdCreate}
                className="w-full text-left px-3 py-2.5 hover:bg-violet-50 transition-colors flex items-center gap-2"
              >
                <div className="p-1 rounded-lg bg-violet-100">
                  <Plus className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-violet-700">
                    Agregar &quot;{value}&quot; al catálogo
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {crowdStats && crowdStats.sampleSize > 0
                      ? `Se usarán datos reales de ${crowdStats.sampleSize} llanta${crowdStats.sampleSize !== 1 ? "s" : ""} en la red`
                      : "Se creará con los datos que ingrese — la comunidad lo enriquecerá"}
                  </p>
                </div>
              </button>
            </div>
          )}

          {loading && <p className="px-3 py-2 text-[10px] text-[#348CCB]">Buscando...</p>}
          {loadingCrowd && <p className="px-3 py-2 text-[10px] text-violet-500">Consultando datos de la comunidad...</p>}
        </div>
      )}
    </div>
  );
}
