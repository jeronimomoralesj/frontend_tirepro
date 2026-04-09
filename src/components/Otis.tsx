"use client";

/**
 * OTIS — TirePro's single AI agent.
 *
 * Replaces the previous 6-agent setup (sentinel, nikita, nexus, campa,
 * guardian, linex). Otis is contextual: drop an <OtisBadge cardKey="..."
 * insight={...} /> next to any card and the user gets a small floating
 * Otis icon they can click to "ask" Otis to analyze that specific card.
 *
 * Capabilities (each one toggleable in /settings under Otis):
 *   - wear        — depth / wear analysis (was sentinel)
 *   - prediction  — replacement prediction & CPK projection (was nikita)
 *   - orders      — order recommendations (was nexus)
 *   - field       — fast field-mode helpers (was campa)
 *   - drivers     — driver alerts (was guardian)
 *   - waste       — disposal / waste tracking (was linex)
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bot, X, Sparkles } from "lucide-react";

export type OtisCapability =
  | "wear"
  | "prediction"
  | "orders"
  | "field"
  | "drivers"
  | "waste";

export const OTIS = {
  name: "Otis",
  tagline: "Tu copiloto de flota",
  color: "#1E76B6",
  glow: "rgba(30,118,182,0.25)",
  bg: "rgba(30,118,182,0.08)",
};

export const OTIS_CAPABILITIES: Record<OtisCapability, { label: string; description: string }> = {
  wear:       { label: "Análisis de desgaste",  description: "Detecta sobreinflado, desgaste irregular y tiempos críticos por profundidad." },
  prediction: { label: "Predicción y CPK",      description: "Proyecta vida útil restante, fecha de retiro óptimo y CPK futuro." },
  orders:     { label: "Recomendación de compras", description: "Cruza tus necesidades con el catálogo y propone órdenes." },
  field:      { label: "Modo de campo",         description: "Acelera registros e inspecciones en terreno." },
  drivers:    { label: "Alertas a conductores", description: "Envía recomendaciones por WhatsApp con confirmación." },
  waste:      { label: "Rastreo de desechos",   description: "Monitorea descartes y cuantifica el dinero perdido por mm sobrante." },
};

const STORAGE_KEY = "otis_capabilities";

export type OtisSettings = Record<OtisCapability, boolean>;

const DEFAULT_SETTINGS: OtisSettings = {
  wear: true, prediction: true, orders: true,
  field: true, drivers: true, waste: true,
};

export function loadOtisSettings(): OtisSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveOtisSettings(s: OtisSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  // Notify subscribers in the same tab
  window.dispatchEvent(new CustomEvent("otis-settings-changed"));
}

export function useOtisSettings() {
  const [settings, setSettings] = useState<OtisSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setSettings(loadOtisSettings());
    const onChange = () => setSettings(loadOtisSettings());
    window.addEventListener("otis-settings-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("otis-settings-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return { settings, setSettings: (next: OtisSettings) => { saveOtisSettings(next); setSettings(next); } };
}

// =============================================================================
// OtisBadge — small floating Otis icon attached to any card
// =============================================================================

interface OtisBadgeProps {
  /** Stable key identifying which card Otis is on (for analytics later) */
  cardKey: string;
  /** Capability this card relates to. Otis only appears if the capability is enabled. */
  capability?: OtisCapability;
  /** Pre-computed insight text to show when Otis is clicked */
  insight?: string | null;
  /** Optional title shown above the insight */
  title?: string;
  /** Floating offset from the parent's top-right corner. Defaults are sensible. */
  className?: string;
}

export function OtisBadge({
  cardKey,
  capability,
  insight,
  title,
  className = "",
}: OtisBadgeProps) {
  const { settings } = useOtisSettings();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Hide Otis entirely if the capability is disabled in settings.
  const enabled = !capability || settings[capability];

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popH = 320;
    const popW = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const goUp = spaceBelow < popH && rect.top > popH;
    setPos({
      top: goUp ? rect.top + window.scrollY - popH - 8 : rect.bottom + window.scrollY + 8,
      left: Math.max(8, Math.min(rect.right + window.scrollX - popW, window.innerWidth - popW - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onScroll() { reposition(); }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  if (!enabled) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title="Pregúntale a Otis sobre esta tarjeta"
        data-otis-card={cardKey}
        className={`group relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110 active:scale-95 ${className}`}
        style={{
          background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)`,
          boxShadow: open
            ? `0 0 0 4px ${OTIS.glow}, 0 8px 24px rgba(10,24,58,0.25)`
            : "0 6px 16px rgba(10,24,58,0.18)",
        }}
      >
        <Bot className="w-4 h-4 text-white" strokeWidth={2.4} />
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ background: "#fbbf24", boxShadow: "0 0 6px rgba(251,191,36,0.7)" }}
        />
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999] w-80 rounded-2xl overflow-hidden"
          style={{
            top: pos.top,
            left: pos.left,
            background: "white",
            boxShadow: "0 24px 64px -16px rgba(10,24,58,0.35), 0 0 0 1px rgba(30,118,182,0.1)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)` }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5 text-white" strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-none">{OTIS.name}</p>
                <p className="text-[10px] text-white/70 mt-0.5">{title ?? OTIS.tagline}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-white/15 transition-colors">
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 max-h-80 overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3" style={{ color: OTIS.color }} />
              <span className="text-[9px] font-black text-[#1E76B6] uppercase tracking-widest">
                Análisis Otis
              </span>
            </div>
            {insight ? (
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{insight}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Otis aún no tiene suficientes datos para analizar esta tarjeta. Vuelve a intentarlo cuando tengas más inspecciones.
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2 flex items-center gap-2"
            style={{ background: "rgba(30,118,182,0.04)", borderTop: "1px solid rgba(30,118,182,0.1)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: OTIS.color }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: OTIS.color }}>
              Otis · TirePro AI
            </span>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
