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
  /** Pre-computed insight text Otis "speaks" when clicked */
  insight?: string | null;
  /** Optional title shown in the popover header */
  title?: string;
  className?: string;
}

/**
 * OtisBadge — sits at the top edge of a card (above the header bar).
 * Hidden behind the card by default; on parent group-hover his head pops
 * out with a small bounce. Click to open the popover where he "talks"
 * the analysis with a typewriter effect.
 *
 * IMPORTANT: place this inside a parent that has the `group` class so the
 * peek animation triggers on hover.
 */
export function OtisBadge({
  cardKey,
  capability,
  insight,
  title,
  className = "",
}: OtisBadgeProps) {
  const { settings } = useOtisSettings();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Hide Otis entirely if the capability is disabled in settings.
  const enabled = !capability || settings[capability];

  // Typewriter effect — reveal Otis's analysis one character at a time
  // when the popover opens. Makes him feel like he's actually talking.
  useEffect(() => {
    if (!open) { setTyped(""); return; }
    const text = insight ?? "Otis aún no tiene suficientes datos para analizar esta tarjeta. Vuelve a intentarlo cuando tengas más inspecciones.";
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 2; // 2 chars per tick → ~30 ms feel
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 14);
    return () => clearInterval(id);
  }, [open, insight]);

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

  // The button sits at the top of its parent card. By default it's
  // translated down so only the top of his head sticks out. On parent
  // hover (group-hover, set on the CardWrap) it slides up and bounces.
  // When the popover is open, he stays fully visible regardless of hover.
  const peekClasses = open
    ? "translate-y-0 opacity-100"
    : "translate-y-[55%] opacity-90 group-hover:translate-y-0 group-hover:opacity-100";

  return (
    <>
      <div className={`pointer-events-none absolute -top-3 right-4 z-20 ${className}`}>
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          title="Pregúntale a Otis sobre esta tarjeta"
          data-otis-card={cardKey}
          className={`pointer-events-auto relative inline-flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-95 ${peekClasses}`}
          style={{
            background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)`,
            boxShadow: open
              ? `0 0 0 4px ${OTIS.glow}, 0 12px 28px rgba(10,24,58,0.3)`
              : "0 8px 18px rgba(10,24,58,0.22)",
            border: "2px solid white",
          }}
        >
          <Bot className="w-5 h-5 text-white" strokeWidth={2.4} />
          <span
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ background: "#fbbf24", boxShadow: "0 0 6px rgba(251,191,36,0.8)" }}
          />
          {/* Subtle "hi" speech indicator on hover, hidden when open */}
          {!open && (
            <span
              className="pointer-events-none absolute left-full ml-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: OTIS.color, boxShadow: "0 4px 10px rgba(10,24,58,0.2)" }}
            >
              Pregúntame
            </span>
          )}
        </button>
      </div>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999] w-80 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            top: pos.top,
            left: pos.left,
            background: "white",
            boxShadow: "0 24px 64px -16px rgba(10,24,58,0.4), 0 0 0 1px rgba(30,118,182,0.12)",
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

          {/* Body — typewriter speech bubble */}
          <div className="px-4 py-3 max-h-80 overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3" style={{ color: OTIS.color }} />
              <span className="text-[9px] font-black text-[#1E76B6] uppercase tracking-widest">
                Otis está hablando…
              </span>
            </div>
            <div
              className="rounded-2xl p-3 relative"
              style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.12)" }}
            >
              {/* Speech bubble pointer */}
              <span
                className="absolute -top-1.5 left-4 w-3 h-3 rotate-45"
                style={{ background: "rgba(30,118,182,0.06)", borderTop: "1px solid rgba(30,118,182,0.12)", borderLeft: "1px solid rgba(30,118,182,0.12)" }}
              />
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line min-h-[3rem]">
                {typed}
                <span
                  className="inline-block w-1.5 h-3 ml-0.5 align-middle animate-pulse"
                  style={{ background: OTIS.color, opacity: typed.length === (insight?.length ?? 0) && insight ? 0 : 1 }}
                />
              </p>
            </div>
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
