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
import { X, Sparkles } from "lucide-react";

// Otis avatar — drop a square ottis.png into /public to use a custom face.
const OTIS_AVATAR = "/otis-avatar.webp";

export function OtisFace({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      role="img"
      aria-label="Otis"
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        backgroundImage: `url(${OTIS_AVATAR})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
      }}
    />
  );
}

// =============================================================================
// OtisFloatingButton — fixed bottom-right Otis that analyzes the whole page
// =============================================================================

export interface OtisAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
  icon?: React.ComponentType<{ className?: string }>;
}

interface OtisFloatingButtonProps {
  pageKey: string;
  capability?: OtisCapability;
  insight?: string | null;
  title?: string;
  actions?: OtisAction[];
  /** Override default `bottom-6 right-6`. Values are pixels. */
  offset?: { bottom?: number; right?: number };
}

export function OtisFloatingButton({ pageKey, capability, insight, title, actions, offset }: OtisFloatingButtonProps) {
  const { settings } = useOtisSettings();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const popRef = useRef<HTMLDivElement | null>(null);

  const enabled = !capability || settings[capability];

  // Typewriter
  useEffect(() => {
    if (!open) { setTyped(""); return; }
    const text = insight ?? "Otis aún no tiene un análisis para esta vista. Vuelve cuando haya más datos.";
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 14);
    return () => clearInterval(id);
  }, [open, insight]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!enabled) return null;

  const btnBottom = offset?.bottom ?? 24;
  const btnRight  = offset?.right  ?? 24;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        title="Pregúntale a Otis sobre esta página"
        data-otis-page={pageKey}
        className="fixed z-[9990] flex items-center justify-center w-16 h-16 rounded-full transition-all hover:scale-110 active:scale-95"
        style={{
          bottom: btnBottom,
          right: btnRight,
          background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)`,
          boxShadow: open
            ? `0 0 0 5px ${OTIS.glow}, 0 18px 40px rgba(10,24,58,0.4)`
            : "0 14px 32px rgba(10,24,58,0.35)",
          border: "3px solid white",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <OtisFace size={56} />
        <span
          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full animate-pulse"
          style={{ background: "#fbbf24", boxShadow: "0 0 10px rgba(251,191,36,0.9)" }}
        />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999] rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            bottom: btnBottom + 80,
            right: btnRight,
            width: 340,
            background: "white",
            boxShadow: "0 32px 80px -16px rgba(10,24,58,0.5), 0 0 0 1px rgba(30,118,182,0.14)",
          }}
        >
          {/* Header */}
          <div className="relative" style={{ background: `linear-gradient(135deg, ${OTIS.color} 0%, #173D68 50%, #0A183A 100%)` }}>
            <div
              className="absolute inset-0 opacity-25"
              aria-hidden
              style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.4), transparent 50%)" }}
            />
            <div className="relative px-5 pt-5 pb-12">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-0.5">Hola, soy</p>
                  <p className="text-xl font-black text-white tracking-tight leading-none">{OTIS.name}</p>
                  <p className="text-[11px] text-white/70 mt-1">{title ?? OTIS.tagline}</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors flex-shrink-0">
                  <X className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-7">
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)`,
                  border: "3px solid white",
                  boxShadow: "0 12px 28px rgba(10,24,58,0.35)",
                }}
              >
                <OtisFace size={50} />
              </div>
              <span
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse"
                style={{ background: "#fbbf24", boxShadow: "0 0 8px rgba(251,191,36,0.9)" }}
              />
            </div>
          </div>

          {/* Body */}
          <div className="px-5 pt-10 pb-4 max-h-[26rem] overflow-y-auto">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <Sparkles className="w-3 h-3" style={{ color: OTIS.color }} />
              <span className="text-[9px] font-black text-[#1E76B6] uppercase tracking-widest">
                Análisis de la página
              </span>
            </div>
            <div
              className="rounded-2xl px-4 py-3.5 relative"
              style={{
                background: "linear-gradient(135deg, rgba(30,118,182,0.06), rgba(52,140,203,0.04))",
                border: "1px solid rgba(30,118,182,0.14)",
              }}
            >
              <p className="text-[13px] text-[#0A183A] leading-relaxed whitespace-pre-line min-h-[4rem]">
                {typed || (insight === null || insight === undefined ? "Otis aún no tiene un análisis para esta vista." : "")}
                {insight && typed.length < insight.length && (
                  <span
                    className="inline-block w-[3px] h-3.5 ml-0.5 align-middle animate-pulse"
                    style={{ background: OTIS.color }}
                  />
                )}
              </p>
            </div>

            {actions && actions.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {actions.map((a, i) => {
                  const isPrimary = (a.variant ?? "primary") === "primary";
                  const Icon = a.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { a.onClick(); setOpen(false); }}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-[12px] font-black transition-all hover:opacity-90 active:scale-[0.98]"
                      style={
                        isPrimary
                          ? { background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)`, color: "white", boxShadow: "0 8px 18px rgba(10,24,58,0.25)" }
                          : { background: "white", color: OTIS.color, border: "1.5px solid rgba(30,118,182,0.25)" }
                      }
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {a.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-2.5 flex items-center justify-between gap-2"
            style={{ background: "rgba(30,118,182,0.04)", borderTop: "1px solid rgba(30,118,182,0.1)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: OTIS.color }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: OTIS.color }}>
                Otis · TirePro AI
              </span>
            </div>
            <span className="text-[9px] text-gray-400">Powered by TirePro</span>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

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
 * OtisWrapper — drop-in `<div>` that wraps any card (CardWrap, PorVida,
 * PorMarca, an inline div…) and gives it the Otis peek-and-talk badge
 * without forcing the wrapped component to know about Otis.
 *
 * Usage:
 *   <OtisWrapper cardKey="resumen.por-marca" capability="orders" insight={...} title="Por Marca">
 *     <PorMarca groupData={...} />
 *   </OtisWrapper>
 */
export function OtisWrapper({
  cardKey,
  capability,
  insight,
  title,
  className = "",
  children,
}: OtisBadgeProps & { children: React.ReactNode }) {
  // Named group `group/otis` so nested cards (PorVida, PorMarca, etc.)
  // can keep their own `group/group-hover` description tooltips without
  // colliding with the Otis peek animation.
  // `isolation: isolate` creates a fresh stacking context so Otis (z-0)
  // is reliably layered behind the card body (z-10) inside it.
  return (
    <div
      className={`group/otis relative ${className}`}
      style={{ overflow: "visible", isolation: "isolate" }}
    >
      <OtisBadge cardKey={cardKey} capability={capability} insight={insight} title={title} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * OtisBadge — sits BEHIND the card by default. On parent group-hover his
 * head slides up above the card edge with a bouncy spring. Click to open
 * the speech-bubble popover.
 *
 * IMPORTANT: the parent must have `group relative` and visible overflow.
 * Wrap inside `<OtisWrapper>` if you don't want to manage that yourself.
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
    const popH = 360;
    const popW = 340;
    // Prefer opening upward whenever the badge sits in the bottom 40% of
    // the viewport — more often than not this avoids the popover landing
    // off screen at the bottom.
    const inBottomHalf = rect.bottom > window.innerHeight * 0.5;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const goUp = (inBottomHalf && spaceAbove >= 200) || (spaceBelow < popH && spaceAbove > spaceBelow);
    // position: fixed → use VIEWPORT coords, do NOT add scrollY/scrollX.
    setPos({
      top: goUp
        ? Math.max(8, rect.top - popH - 12)
        : Math.min(window.innerHeight - popH - 8, rect.bottom + 12),
      left: Math.max(8, Math.min(rect.right - popW + 22, window.innerWidth - popW - 8)),
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

  // Default: Otis sits BEHIND the card body (z-0) and is translated DOWN
  // so almost his whole avatar is hidden under the card. On named group
  // hover (group-hover/otis) he lifts fully above the card top with a
  // bouncy spring. When the popover is open we keep him fully visible.
  const peekClasses = open
    ? "-translate-y-full opacity-100"
    : "translate-y-[55%] opacity-90 group-hover/otis:-translate-y-full group-hover/otis:opacity-100";

  return (
    <>
      {/* Outer container is absolute, z-0 → BEHIND the card body which is
          z-10 inside the OtisWrapper's stacking context.
          pointer-events-none so the hidden portion never blocks card
          content; the button itself re-enables pointer events. */}
      <div
        className={`pointer-events-none absolute top-0 right-5 sm:right-6 ${className}`}
        style={{ zIndex: 0 }}
        aria-hidden={!open}
      >
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          title="Pregúntale a Otis sobre esta tarjeta"
          data-otis-card={cardKey}
          className={`pointer-events-auto relative inline-flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-95 ${peekClasses}`}
          style={{
            background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)`,
            boxShadow: open
              ? `0 0 0 4px ${OTIS.glow}, 0 14px 32px rgba(10,24,58,0.35)`
              : "0 10px 22px rgba(10,24,58,0.28)",
            border: "3px solid white",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <OtisFace size={48} />
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse"
            style={{ background: "#fbbf24", boxShadow: "0 0 8px rgba(251,191,36,0.9)" }}
          />
          {!open && (
            <span
              className="pointer-events-none absolute right-full mr-2 px-2.5 py-1 rounded-full text-[10px] font-black text-white whitespace-nowrap opacity-0 -translate-x-1 group-hover/otis:opacity-100 group-hover/otis:translate-x-0 transition-all duration-200"
              style={{ background: OTIS.color, boxShadow: "0 6px 14px rgba(10,24,58,0.25)" }}
            >
              ¿Preguntas?
            </span>
          )}
        </button>
      </div>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999] rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: pos.top,
            left: pos.left,
            width: 340,
            background: "white",
            boxShadow: "0 32px 80px -16px rgba(10,24,58,0.45), 0 0 0 1px rgba(30,118,182,0.14)",
          }}
        >
          {/* Top accent bar with avatar overhang */}
          <div className="relative" style={{ background: `linear-gradient(135deg, ${OTIS.color} 0%, #173D68 50%, #0A183A 100%)` }}>
            <div
              className="absolute inset-0 opacity-25"
              aria-hidden
              style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.4), transparent 50%)" }}
            />
            <div className="relative px-5 pt-5 pb-12">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-0.5">Hola, soy</p>
                  <p className="text-xl font-black text-white tracking-tight leading-none">{OTIS.name}</p>
                  <p className="text-[11px] text-white/70 mt-1">{title ?? OTIS.tagline}</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors flex-shrink-0">
                  <X className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
            {/* Otis avatar — overlaps the gradient and the bubble */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-7">
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${OTIS.color}, #0A183A)`,
                  border: "3px solid white",
                  boxShadow: "0 12px 28px rgba(10,24,58,0.35)",
                }}
              >
                <OtisFace size={50} />
              </div>
              <span
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse"
                style={{ background: "#fbbf24", boxShadow: "0 0 8px rgba(251,191,36,0.9)" }}
              />
            </div>
          </div>

          {/* Speech bubble body */}
          <div className="px-5 pt-10 pb-4 max-h-[26rem] overflow-y-auto">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <Sparkles className="w-3 h-3" style={{ color: OTIS.color }} />
              <span className="text-[9px] font-black text-[#1E76B6] uppercase tracking-widest">
                Análisis instantáneo
              </span>
            </div>
            <div
              className="rounded-2xl px-4 py-3.5 relative"
              style={{
                background: "linear-gradient(135deg, rgba(30,118,182,0.06), rgba(52,140,203,0.04))",
                border: "1px solid rgba(30,118,182,0.14)",
              }}
            >
              <p className="text-[13px] text-[#0A183A] leading-relaxed whitespace-pre-line min-h-[4rem]">
                {typed || (insight === null || insight === undefined ? "Otis aún no tiene suficientes datos para analizar esta tarjeta. Vuelve cuando tengas más inspecciones." : "")}
                {insight && typed.length < insight.length && (
                  <span
                    className="inline-block w-[3px] h-3.5 ml-0.5 align-middle animate-pulse"
                    style={{ background: OTIS.color }}
                  />
                )}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-2.5 flex items-center justify-between gap-2"
            style={{ background: "rgba(30,118,182,0.04)", borderTop: "1px solid rgba(30,118,182,0.1)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: OTIS.color }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: OTIS.color }}>
                Otis · TirePro AI
              </span>
            </div>
            <span className="text-[9px] text-gray-400">Powered by TirePro</span>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
