"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, BarChart3, Users, TrendingUp } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

// A row returned by /catalog/search — used by the crowd-data fallback.
export type CatalogItem = {
  marca: string;
  modelo: string;
  dimension: string;
  rtdMm: number | null;
  psiRecomendado: number | null;
  precioCop: number | null;
  kmEstimadosReales: number | null;
  terreno: string | null;
  skuRef: string;
  categoria?: string | null;
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

// A row returned by /catalog/autocomplete/{brands|models|dimensions}.
// Carries a "sample" SKU so selecting a row can still autofill price/RTD.
type AutocompleteRow = {
  marca?: string;
  modelo?: string;
  dimension?: string;
  count: number;
  sample: {
    marca: string;
    modelo: string;
    dimension: string;
    skuRef: string;
    rtdMm: number | null;
    psiRecomendado: number | null;
    precioCop: number | null;
    kmEstimadosReales: number | null;
    terreno: string | null;
    categoria: string | null;
  };
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
  // Chained filters — each field narrows the list using the ones above it
  // in the picking order (marca → modelo → dimension).
  filterMarca?: string;
  filterModelo?: string;
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

// -----------------------------------------------------------------------------
// Row-to-CatalogItem bridge — autocomplete rows become CatalogItems so the
// existing onSelect contract (used by tire creation forms to autofill
// rtdMm/precioCop) stays intact.
// -----------------------------------------------------------------------------

function toCatalogItem(row: AutocompleteRow, field: Props["field"]): CatalogItem {
  const s = row.sample;
  return {
    marca:     field === "marca"     ? (row.marca     ?? s.marca)     : s.marca,
    modelo:    field === "modelo"    ? (row.modelo    ?? s.modelo)    : s.modelo,
    dimension: field === "dimension" ? (row.dimension ?? s.dimension) : s.dimension,
    skuRef:    s.skuRef,
    rtdMm:     s.rtdMm,
    psiRecomendado:    s.psiRecomendado,
    precioCop:         s.precioCop,
    kmEstimadosReales: s.kmEstimadosReales,
    terreno:           s.terreno,
    categoria:         s.categoria,
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function CatalogAutocomplete({
  value, onChange, onSelect, onCrowdCreate, field, filterMarca, filterModelo, filterDimension,
  placeholder, required, className,
}: Props) {
  const [rows, setRows] = useState<AutocompleteRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [crowdStats, setCrowdStats] = useState<CrowdStats | null>(null);
  const [loadingCrowd, setLoadingCrowd] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reqIdRef = useRef(0);

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
        else params.set("marca", query);
        params.set("modelo", query);
      }
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

  // Decide whether we can fetch for this field. Modelo needs a marca and
  // dimension (when chained after modelo) benefits from it too. Without a
  // parent filter AND without a typed query there's nothing useful to show.
  const canFetch = useCallback((query: string) => {
    if (field === "modelo" && !filterMarca) {
      return query.trim().length > 0;
    }
    if (field === "dimension" && !filterMarca && query.trim().length === 0) {
      return false;
    }
    return true;
  }, [field, filterMarca]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!canFetch(query)) {
      setRows([]); setNoResults(false); return;
    }
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    try {
      let url = "";
      if (field === "marca") {
        const p = new URLSearchParams();
        if (query.trim()) p.set("q", query.trim());
        url = `${API_BASE}/catalog/autocomplete/brands?${p.toString()}`;
      } else if (field === "modelo") {
        const p = new URLSearchParams();
        p.set("marca", filterMarca ?? "");
        if (filterDimension) p.set("dimension", filterDimension);
        if (query.trim())    p.set("q", query.trim());
        url = `${API_BASE}/catalog/autocomplete/models?${p.toString()}`;
      } else {
        // dimension
        const p = new URLSearchParams();
        if (filterMarca)  p.set("marca",  filterMarca);
        if (filterModelo) p.set("modelo", filterModelo);
        if (query.trim()) p.set("q", query.trim());
        url = `${API_BASE}/catalog/autocomplete/dimensions?${p.toString()}`;
      }

      const res = await fetch(url);
      let data: AutocompleteRow[] = [];
      if (res.ok) data = await res.json();

      // Only apply if this is still the latest request — avoids a slow
      // response overwriting the user's newer input.
      if (reqIdRef.current !== myReqId) return;

      setRows(data);
      const emptyAndTyped = data.length === 0 && query.trim().length >= 2;
      setNoResults(emptyAndTyped);
      if (emptyAndTyped) {
        fetchCrowdStats(query);
      } else {
        setCrowdStats(null);
      }
    } catch { /* */ }
    setLoading(false);
  }, [field, filterMarca, filterModelo, filterDimension, canFetch, fetchCrowdStats]);

  function handleChange(val: string) {
    onChange(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  }

  function handleFocus() {
    // Open the dropdown and populate immediately. Modelo and dimension
    // show "all options for the parent context" even when empty.
    setOpen(true);
    fetchSuggestions(value);
  }

  function handleSelect(row: AutocompleteRow) {
    const label =
      field === "marca"     ? (row.marca     ?? row.sample.marca) :
      field === "dimension" ? (row.dimension ?? row.sample.dimension) :
                              (row.modelo    ?? row.sample.modelo);
    onChange(label);
    setOpen(false);
    onSelect?.(toCatalogItem(row, field));
  }

  function handleCrowdCreate() {
    setOpen(false);
    onCrowdCreate?.(value, crowdStats);
  }

  const displayRows = rows.slice(0, 20);

  // Hint text shown when the dropdown is empty but a parent filter is set
  // (e.g. modelo without a brand yet).
  const hint = (() => {
    if (field === "modelo" && !filterMarca) return "Seleccione una marca primero";
    if (field === "dimension" && displayRows.length === 0) {
      if (!filterMarca) return "Seleccione marca y banda para ver dimensiones";
      if (!filterModelo) return "Seleccione banda para ver dimensiones de esta marca";
    }
    return null;
  })();

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        className={className || inputCls}
        autoComplete="off"
      />

      {open && (displayRows.length > 0 || noResults || hint) && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl bg-white"
          style={{ border: "1px solid rgba(52,140,203,0.25)", boxShadow: "0 8px 24px rgba(10,24,58,0.12)" }}
        >
          {hint && displayRows.length === 0 && !noResults && (
            <p className="px-3 py-2 text-[11px] text-[#93b8d4]">{hint}</p>
          )}

          {displayRows.map((row, i) => {
            const label =
              field === "marca"     ? (row.marca     ?? row.sample.marca) :
              field === "dimension" ? (row.dimension ?? row.sample.dimension) :
                                      (row.modelo    ?? row.sample.modelo);
            const s = row.sample;
            const categoria = s.categoria?.toLowerCase();
            return (
              <button
                key={`${label}-${i}`}
                type="button"
                onClick={() => handleSelect(row)}
                className="w-full text-left px-3 py-2 hover:bg-[#F0F7FF] transition-colors"
                style={{ borderBottom: "1px solid rgba(52,140,203,0.08)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A183A] truncate">{label}</p>
                    <p className="text-[10px] text-[#348CCB] truncate">
                      {field !== "marca"     && <span>{s.marca}</span>}
                      {field !== "marca" && field !== "modelo" && <span> · </span>}
                      {field !== "modelo"    && field !== "dimension" && null}
                      {field !== "modelo" && (field === "marca" || field === "dimension") && null}
                      {field === "marca"     && row.count > 1 && <span>{row.count} SKUs</span>}
                      {field === "modelo"    && <span>{s.marca}{s.dimension ? ` · ${s.dimension}` : ""}</span>}
                      {field === "dimension" && <span>{s.marca}{s.modelo ? ` · ${s.modelo}` : ""}</span>}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right flex flex-col items-end gap-0.5">
                    {categoria && (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          categoria === "reencauche"
                            ? "text-amber-700 bg-amber-50 border border-amber-200"
                            : "text-emerald-700 bg-emerald-50 border border-emerald-200"
                        }`}
                      >
                        {categoria}
                      </span>
                    )}
                    {s.rtdMm && (
                      <p className="text-[10px] font-bold text-[#1E76B6]">{s.rtdMm}mm</p>
                    )}
                    {s.precioCop && (
                      <p className="text-[9px] text-[#348CCB]">${Math.round(s.precioCop / 1000)}K</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* "Not found — add new" section */}
          {noResults && (
            <div className="border-t border-[#348CCB]/15">
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
