"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Disc,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import "./heroAnimations.css";

/**
 * Mock UI mirroring the analista recommendations table for the
 * "Sabe exactamente qué llanta cambiar..." feature card.
 */
export function RecomendacionesMock() {
  const tires = [
    {
      placa: "LL-1024",
      vehiculo: "ABC-123",
      pos: 3,
      depths: "2.1 / 1.8 / 2.0",
      severity: "critical" as const,
      label: "Crítico",
      action: "Cambiar inmediatamente",
      cpk: "$94",
    },
    {
      placa: "LL-1156",
      vehiculo: "XYZ-789",
      pos: 7,
      depths: "5.2 / 4.8 / 5.0",
      severity: "warning" as const,
      label: "Reencauche",
      action: "Programar en 15 días",
      cpk: "$67",
    },
    {
      placa: "LL-0892",
      vehiculo: "MNN-456",
      pos: 1,
      depths: "8.4 / 8.1 / 8.2",
      severity: "info" as const,
      label: "Atención",
      action: "Rotar posición",
      cpk: "$48",
    },
    {
      placa: "LL-2017",
      vehiculo: "TAO-519",
      pos: 4,
      depths: "12.3 / 12.0 / 12.1",
      severity: "ok" as const,
      label: "Apto",
      action: "Continuar uso",
      cpk: "$32",
    },
  ];

  const SEVERITY = {
    critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "#ef4444" },
    warning:  { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "#f97316" },
    info:     { color: "#eab308", bg: "rgba(234,179,8,0.12)", border: "#eab308" },
    ok:       { color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "#22c55e" },
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden h-full flex flex-col" style={{ minHeight: "440px" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Analista IA</div>
          <h4 className="text-lg font-black text-[#0A183A] leading-tight">Recomendaciones</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500">{tires.length} llantas</span>
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
        </div>
      </div>

      {/* Severity legend / filter chips */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        {[
          { key: "critical", label: "Crítico", count: 1 },
          { key: "warning",  label: "Reencauche", count: 1 },
          { key: "info",     label: "Atención", count: 1 },
          { key: "ok",       label: "Apto", count: 1 },
        ].map((c) => {
          const s = SEVERITY[c.key as keyof typeof SEVERITY];
          return (
            <div
              key={c.key}
              className="px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1.5"
              style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {c.label}
              <span className="opacity-70">{c.count}</span>
            </div>
          );
        })}
      </div>

      {/* Tire rows */}
      <div className="flex-1 overflow-hidden">
        {tires.map((t, i) => {
          const s = SEVERITY[t.severity];
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/70 transition-colors hv-slide-in-1"
              style={{
                borderLeft: `3px solid ${s.border}`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {/* Tire icon */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: s.bg }}
              >
                {t.severity === "ok" ? (
                  <CheckCircle2 size={16} style={{ color: s.color }} />
                ) : (
                  <AlertTriangle size={16} style={{ color: s.color }} />
                )}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-[#0A183A]">{t.placa}</span>
                  <span className="text-[9px] text-gray-400">·</span>
                  <span className="text-[10px] font-mono text-gray-500">{t.vehiculo}</span>
                  <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 py-0.5 rounded">P{t.pos}</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Int/Cen/Ext: <span className="font-mono">{t.depths}</span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="text-right flex-shrink-0">
                <div
                  className="text-[10px] font-black uppercase tracking-wider mb-0.5"
                  style={{ color: s.color }}
                >
                  {t.label}
                </div>
                <div className="text-[10px] text-gray-500 leading-tight max-w-[120px]">
                  {t.action}
                </div>
                <div className="text-[9px] text-gray-400 font-mono mt-0.5">CPK {t.cpk}</div>
              </div>

              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
        <div className="text-[10px] text-gray-500">
          Ahorro proyectado: <span className="font-black text-[#0A183A]">$2.4M</span>
        </div>
        <button
          className="text-[10px] font-bold text-white px-3 py-1.5 rounded-full inline-flex items-center gap-1"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          Ver todas <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}

/**
 * Mock UI for the "Compara tus llantas en uso con lo que tienes en bodega" feature.
 * Shows a side-by-side: en uso (necesidades) vs bodega (stock disponible).
 */
export function BodegaMock() {
  const necesidades = [
    { dim: "295/80R22.5", brand: "Michelin XZE2+", needed: 8, color: "#ef4444", critical: true },
    { dim: "11R22.5",     brand: "Bridgestone M729", needed: 4, color: "#f97316", critical: false },
    { dim: "275/70R22.5", brand: "Continental HSU", needed: 6, color: "#eab308", critical: false },
  ];
  const bodega = [
    { dim: "295/80R22.5", brand: "Michelin XZE2+", stock: 5, deficit: 3 },
    { dim: "11R22.5",     brand: "Bridgestone M729", stock: 6, deficit: 0 },
    { dim: "275/70R22.5", brand: "Continental HSU", stock: 0, deficit: 6 },
  ];

  return (
    <div className="bg-white rounded-2xl overflow-hidden h-full flex flex-col" style={{ minHeight: "440px" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Bodega vs. Flota</div>
          <h4 className="text-lg font-black text-[#0A183A] leading-tight">Inventario inteligente</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={14} className="text-[#1E76B6]" />
          <span className="text-[10px] font-bold text-[#1E76B6]">Sincronizado</span>
        </div>
      </div>

      {/* Two-column comparison */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-gray-100">
        {/* LEFT: necesidades */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle size={12} className="text-[#ef4444]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#ef4444]">
              Necesidades
            </span>
            <span className="text-[9px] text-gray-400 ml-auto">18 llantas</span>
          </div>
          <div className="space-y-2">
            {necesidades.map((n, i) => (
              <div
                key={i}
                className="rounded-lg p-2.5 hv-slide-in-1"
                style={{
                  background: "rgba(239,68,68,0.04)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderLeft: `2.5px solid ${n.color}`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Disc size={11} className="text-[#0A183A]" />
                  <span className="text-[10px] font-mono font-bold text-[#0A183A]">{n.dim}</span>
                </div>
                <div className="text-[9px] text-gray-500 truncate mb-1">{n.brand}</div>
                <div className="flex items-center justify-between">
                  <div className="text-[8px] font-bold text-gray-400 uppercase">Necesita</div>
                  <div
                    className="text-sm font-black"
                    style={{ color: n.color }}
                  >
                    {n.needed}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: bodega */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Package size={12} className="text-[#1E76B6]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1E76B6]">
              En bodega
            </span>
            <span className="text-[9px] text-gray-400 ml-auto">11 disp.</span>
          </div>
          <div className="space-y-2">
            {bodega.map((b, i) => {
              const ok = b.deficit === 0;
              return (
                <div
                  key={i}
                  className="rounded-lg p-2.5 hv-slide-in-1"
                  style={{
                    background: ok ? "rgba(34,197,94,0.05)" : "rgba(249,115,22,0.05)",
                    border: ok
                      ? "1px solid rgba(34,197,94,0.2)"
                      : "1px solid rgba(249,115,22,0.2)",
                    borderLeft: ok
                      ? "2.5px solid #22c55e"
                      : "2.5px solid #f97316",
                    animationDelay: `${i * 0.1 + 0.3}s`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Disc size={11} className="text-[#0A183A]" />
                    <span className="text-[10px] font-mono font-bold text-[#0A183A]">{b.dim}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 truncate mb-1">{b.brand}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-[8px] font-bold text-gray-400 uppercase">Stock</div>
                    <div className="text-sm font-black text-[#0A183A]">{b.stock}</div>
                  </div>
                  {!ok && (
                    <div
                      className="mt-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold inline-flex items-center gap-0.5"
                      style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}
                    >
                      <ShoppingCart size={8} />
                      Comprar {b.deficit}
                    </div>
                  )}
                  {ok && (
                    <div
                      className="mt-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold inline-flex items-center gap-0.5"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                    >
                      <CheckCircle2 size={8} />
                      Cubierto
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer summary */}
      <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-[#1E76B6]" />
          <div className="text-[10px] text-gray-500">
            Déficit total: <span className="font-black text-[#f97316]">9 llantas</span>
          </div>
        </div>
        <button
          className="text-[10px] font-bold text-white px-3 py-1.5 rounded-full inline-flex items-center gap-1"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          Comprar faltantes <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}
