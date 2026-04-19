'use client';

import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, X, Search, ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  AdvancedCondition,
  FIELD_META,
  OP_LABELS,
  NumericField,
  Operator,
  newCondition,
} from '@/shared/advancedFilters';

/* -- Filter config ---------------------------------------------------------- */

export interface FilterOption {
  key: string;
  label: string;
  options: string[];
}

interface FilterFabProps {
  /** Named filter dropdowns (marca, eje, vida, etc.) */
  filters: FilterOption[];
  /** Current selected values — key: selected value */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Optional search */
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  /** Optional advanced (numeric comparison) conditions */
  advancedConditions?: AdvancedCondition[];
  onAdvancedChange?: (next: AdvancedCondition[]) => void;
}

const ALL = 'Todos';

export default function FilterFab({
  filters,
  values,
  onChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  advancedConditions,
  onAdvancedChange,
}: FilterFabProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const advEnabled = Array.isArray(advancedConditions) && !!onAdvancedChange;
  const adv = advancedConditions ?? [];

  const activeCount =
    Object.values(values).filter((v) => v && v !== ALL).length
    + (search?.trim() ? 1 : 0)
    + adv.length;

  function updateAdv(next: AdvancedCondition[]) {
    onAdvancedChange?.(next);
  }
  function patchAdv(id: string, patch: Partial<AdvancedCondition>) {
    updateAdv(adv.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeAdv(id: string) {
    updateAdv(adv.filter((c) => c.id !== id));
  }
  function addAdv() {
    updateAdv([...adv, newCondition()]);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function clearAll() {
    filters.forEach((f) => onChange(f.key, ALL));
    onSearchChange?.('');
    if (advEnabled) onAdvancedChange?.([]);
  }

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #1E76B6, #0A183A)',
          boxShadow: '0 8px 32px rgba(10,24,58,0.3)',
        }}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtros
        {activeCount > 0 && (
          <span
            className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black"
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Active filter badges (shown when panel is closed and filters active) */}
      {!open && activeCount > 0 && (
        <div className="fixed bottom-20 right-6 z-40 flex flex-wrap gap-1.5 max-w-xs justify-end">
          {filters
            .filter((f) => values[f.key] && values[f.key] !== ALL)
            .map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white"
                style={{ background: 'rgba(30,118,182,0.9)', backdropFilter: 'blur(8px)' }}
              >
                {values[f.key]}
                <button
                  onClick={(e) => { e.stopPropagation(); onChange(f.key, ALL); }}
                  className="hover:opacity-70"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          {search?.trim() && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white"
              style={{ background: 'rgba(30,118,182,0.9)', backdropFilter: 'blur(8px)' }}
            >
              &quot;{search}&quot;
              <button
                onClick={(e) => { e.stopPropagation(); onSearchChange?.(''); }}
                className="hover:opacity-70"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Filter panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-6 right-6 z-50 w-80 max-h-[70vh] bg-white rounded-xl shadow-sm overflow-hidden flex flex-col"
          style={{ border: '1px solid rgba(52,140,203,0.15)' }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(52,140,203,0.1)' }}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#1E76B6]" />
              <span className="text-sm font-black text-[#0A183A]">Filtros</span>
              {activeCount > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(30,118,182,0.1)', color: '#1E76B6' }}
                >
                  {activeCount} activo{activeCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] font-semibold text-[#1E76B6] hover:opacity-70 transition-opacity"
                >
                  Limpiar
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Search */}
            {onSearchChange && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB]/30 transition-all"
                />
              </div>
            )}

            {/* Filter dropdowns */}
            {filters.map((f) => {
              const current = values[f.key] || ALL;
              const isActive = current !== ALL;
              return (
                <div key={f.key}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    {f.label}
                  </label>
                  <div className="relative">
                    <select
                      value={current}
                      onChange={(e) => onChange(f.key, e.target.value)}
                      className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30"
                      style={{
                        background: isActive ? 'rgba(30,118,182,0.06)' : '#f9fafb',
                        border: isActive
                          ? '1px solid rgba(30,118,182,0.3)'
                          : '1px solid #e5e7eb',
                        color: isActive ? '#1E76B6' : '#0A183A',
                      }}
                    >
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              );
            })}

            {/* Advanced numeric conditions */}
            {advEnabled && (
              <div className="pt-3" style={{ borderTop: '1px solid rgba(52,140,203,0.1)' }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Filtros avanzados
                    {adv.length > 0 && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(30,118,182,0.1)', color: '#1E76B6' }}>
                        {adv.length}
                      </span>
                    )}
                  </label>
                  <button
                    onClick={addAdv}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#1E76B6] hover:opacity-70 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar
                  </button>
                </div>

                {adv.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic mb-1">
                    Ej. CPK menor que 50, Km mayor que 40 000…
                  </p>
                ) : (
                  <div className="space-y-2">
                    {adv.map((cond) => {
                      const meta = FIELD_META[cond.field];
                      return (
                        <div
                          key={cond.id}
                          className="p-2 rounded-xl"
                          style={{
                            background: 'rgba(30,118,182,0.04)',
                            border: '1px solid rgba(30,118,182,0.15)',
                          }}
                        >
                          {/* Row 1: field + operator + remove */}
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1 min-w-0">
                              <select
                                value={cond.field}
                                onChange={(e) => patchAdv(cond.id, { field: e.target.value as NumericField })}
                                className="w-full appearance-none px-2 py-1.5 pr-7 rounded-lg text-[11px] font-semibold bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30"
                                style={{ color: '#0A183A' }}
                              >
                                {(Object.keys(FIELD_META) as NumericField[]).map((f) => (
                                  <option key={f} value={f}>{FIELD_META[f].label}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="relative w-24">
                              <select
                                value={cond.op}
                                onChange={(e) => patchAdv(cond.id, { op: e.target.value as Operator })}
                                className="w-full appearance-none px-2 py-1.5 pr-6 rounded-lg text-[11px] font-bold bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30"
                                style={{ color: '#1E76B6' }}
                              >
                                {(Object.keys(OP_LABELS) as Operator[]).map((o) => (
                                  <option key={o} value={o}>
                                    {o === 'gt' ? '>' : o === 'lt' ? '<' : o === 'gte' ? '≥'
                                      : o === 'lte' ? '≤' : o === 'eq' ? '=' : 'entre'}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>
                            <button
                              onClick={() => removeAdv(cond.id)}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              aria-label="Eliminar condición"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>

                          {/* Row 2: value input(s) + unit */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="flex-1 relative">
                              <input
                                type="number"
                                value={cond.value}
                                onChange={(e) => patchAdv(cond.id, { value: parseFloat(e.target.value) || 0 })}
                                placeholder={meta.placeholder}
                                className="w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30"
                                style={{ color: '#0A183A' }}
                              />
                            </div>
                            {cond.op === 'between' && (
                              <>
                                <span className="text-[10px] text-gray-400 font-bold">y</span>
                                <div className="flex-1 relative">
                                  <input
                                    type="number"
                                    value={cond.value2 ?? ''}
                                    onChange={(e) => patchAdv(cond.id, { value2: parseFloat(e.target.value) || 0 })}
                                    placeholder={meta.placeholder}
                                    className="w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30"
                                    style={{ color: '#0A183A' }}
                                  />
                                </div>
                              </>
                            )}
                            {meta.unit && (
                              <span className="text-[10px] text-gray-400 font-bold w-10 text-right">
                                {meta.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
