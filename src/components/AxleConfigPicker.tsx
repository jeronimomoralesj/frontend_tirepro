"use client";

import React, { useMemo } from "react";

// =============================================================================
// Canonical axle configurations.
//
// Superset of the variants used across the fleet creation flows (normal
// and distributor). A fleet that doesn't need a given config just
// ignores it — harmless. Order matches typical progression from simple
// 4-wheel vehicles up to double-trailer rigs.
// =============================================================================

export interface AxleConfig {
  value:       string;   // empty string = "Sin definir"
  label:       string;
  description: string;
}

export const AXLE_CONFIGS: AxleConfig[] = [
  { value: "",        label: "Sin definir",  description: "Elegir más tarde" },
  { value: "2-2",     label: "2-2",          description: "Auto · 4 llantas" },
  { value: "2-4",     label: "2-4",          description: "Camión 2 ejes · 6 llantas" },
  { value: "4-4",     label: "4-4",          description: "Dobletroque · 8 llantas" },
  { value: "2-2-2",   label: "2-2-2",        description: "Bus 3 ejes · 6 llantas" },
  { value: "2-2-4",   label: "2-2-4",        description: "Camión 3 ejes · 8 llantas" },
  { value: "6-4",     label: "6-4",          description: "Tractomula 2 ejes · 10 llantas" },
  { value: "2-4-4",   label: "2-4-4",        description: "Tractomula 3 ejes · 10 llantas" },
  { value: "4-4-4",   label: "4-4-4",        description: "3 ejes con duales · 12 llantas" },
  { value: "2-4-4-4", label: "2-4-4-4",      description: "Tractomula + trailer · 14 llantas" },
  { value: "2-4-4-4-4", label: "2-4-4-4-4",  description: "Doble trailer · 18 llantas" },
];

export function describeAxleConfig(value: string | null | undefined): string {
  if (!value) return "Sin definir";
  return AXLE_CONFIGS.find((c) => c.value === value)?.description ?? value;
}

// =============================================================================
// MiniAxleDiagram — renders a small stylised truck layout for the given
// dash-separated config ("2-4-4").
// =============================================================================

function parseConfig(cfg: string): number[] {
  return cfg.split("-").map(Number).filter((n) => n > 0);
}

export function MiniAxleDiagram({
  config,
  color = "#1E76B6",
  axleColor = "#0A183A",
  tireSize = 14,
  axleWidth = 28,
}: {
  config: string;
  color?: string;
  axleColor?: string;
  tireSize?: number;
  axleWidth?: number;
}) {
  const axles = useMemo(() => parseConfig(config), [config]);
  if (axles.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-[11px] text-gray-400 italic">
        Sin estructura
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      {axles.map((count, i) => {
        const mid = Math.ceil(count / 2);
        const left = count > 0 ? Array.from({ length: mid }) : [];
        const right = count > 0 ? Array.from({ length: count - mid }) : [];
        const Tire = () => (
          <div
            className="rounded-md"
            style={{ width: tireSize, height: tireSize, background: color }}
          />
        );
        return (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-0.5">
              {left.map((_, k) => <Tire key={`l${k}`} />)}
            </div>
            <div
              className="h-1 mx-1 rounded-full"
              style={{ background: axleColor, width: axleWidth }}
            />
            <div className="flex items-center gap-0.5">
              {right.map((_, k) => <Tire key={`r${k}`} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// AxleConfigPicker — grid of cards, one per config, with a live
// MiniAxleDiagram and description. Inline (not a modal). Used by the
// vehicle creation / edit forms for both normal fleet and distributor.
// =============================================================================

export function AxleConfigPicker({
  value,
  onChange,
  disabled,
  includeSinDefinir = true,
  className = "",
}: {
  value: string | null | undefined;
  onChange: (next: string) => void;
  disabled?: boolean;
  includeSinDefinir?: boolean;
  className?: string;
}) {
  const options = includeSinDefinir
    ? AXLE_CONFIGS
    : AXLE_CONFIGS.filter((c) => c.value !== "");
  const normalizedValue = value ?? "";

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 ${className}`}>
      {options.map((cfg) => {
        const isCurrent = normalizedValue === cfg.value;
        return (
          <button
            key={cfg.value || "none"}
            type="button"
            disabled={disabled}
            onClick={() => onChange(cfg.value)}
            className="relative flex flex-col items-center justify-between rounded-xl p-2.5 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              border: isCurrent ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.25)",
              background: isCurrent ? "rgba(30,118,182,0.08)" : "#fff",
              boxShadow: isCurrent
                ? "0 4px 16px rgba(30,118,182,0.18)"
                : "0 1px 4px rgba(10,24,58,0.04)",
              minHeight: 130,
            }}
          >
            {isCurrent && (
              <span
                className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full"
                style={{ background: "#1E76B6" }}
              >
                Actual
              </span>
            )}
            <div className="flex-1 flex items-center justify-center w-full">
              <MiniAxleDiagram config={cfg.value} />
            </div>
            <div className="text-center mt-1.5">
              <p className="text-[11px] font-bold text-[#0A183A] leading-none">
                {cfg.label}
              </p>
              <p className="text-[9px] text-[#93b8d4] mt-1 leading-tight">
                {cfg.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
