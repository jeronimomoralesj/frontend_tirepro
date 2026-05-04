"use client";

// =============================================================================
// MayWeekBanner — auto-shows for the first week of May (1st–7th, any year),
// hides everywhere else. A subtle wink at the unofficial fan calendar that
// sits on May 4th, but with ZERO trademarked content:
//
//   - No franchise names, character names, ship names, weapon names,
//     planet names, or quotes (verbatim OR paraphrased — paraphrasing a
//     famous trademarked line in a commercial context is the most common
//     way to step on IP, so we don't echo any of them).
//   - Visuals are generic-sci-fi: dark navy gradient, CSS dot starfield,
//     and an asterism glyph (✦ — a universal typographic star, not from
//     any IP). No lightsabers, no logos, no costumes.
//   - Copy uses only universal Spanish vocabulary tied to the actual
//     product (agarre, kilómetros, llantas) plus the calendar date and
//     the everyday word "galaxia". The banner reads as a normal tire
//     promo to anyone — fans recognise the date wink without us having
//     to make any branded reference.
//   - Dismissible per year via localStorage (key bumped if the design
//     ever changes).
// =============================================================================

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Bump this suffix whenever the banner copy changes so previously-
// dismissed users see the new version on its first day.
const DISMISS_KEY = "may-week-banner-dismissed-v1";

function isMayWeek(d: Date = new Date()): boolean {
  // 1st–7th of May, inclusive. Local time — the banner's a courtesy
  // detail, not something a 1-day timezone slip will hurt.
  return d.getMonth() === 4 && d.getDate() >= 1 && d.getDate() <= 7;
}

export function MayWeekBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isMayWeek()) return;
    try {
      const year = String(new Date().getFullYear());
      if (localStorage.getItem(DISMISS_KEY) === year) return;
    } catch { /* localStorage blocked — show anyway */ }
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(new Date().getFullYear()));
    } catch { /* ignore */ }
    setShow(false);
  }

  return (
    <div
      className="relative overflow-hidden border-b border-white/10 text-white"
      style={{ background: "linear-gradient(90deg, #050922 0%, #0f1947 50%, #050922 100%)" }}
    >
      {/* CSS-only starfield. Multiple radial-gradient stops at slight
          opacities + a wider tile so the pattern doesn't loop visibly
          on a 1400px-wide banner. Pointer-events-none keeps it from
          eating the dismiss-button click. */}
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 30%, rgba(255,255,255,0.9), transparent), " +
            "radial-gradient(1px 1px at 32% 70%, rgba(255,255,255,0.7), transparent), " +
            "radial-gradient(1.5px 1.5px at 55% 20%, rgba(186,230,253,0.95), transparent), " +
            "radial-gradient(1px 1px at 72% 55%, rgba(255,255,255,0.6), transparent), " +
            "radial-gradient(1px 1px at 88% 35%, rgba(255,255,255,0.85), transparent), " +
            "radial-gradient(1.5px 1.5px at 47% 85%, rgba(165,243,252,0.85), transparent), " +
            "radial-gradient(1px 1px at 95% 75%, rgba(255,255,255,0.6), transparent)",
          backgroundSize: "320px 100%",
          backgroundRepeat: "repeat-x",
        }}
      />

      {/* Soft cyan glow on the left so the asterism reads as a "twinkle". */}
      <div
        className="absolute inset-y-0 left-0 w-40 opacity-40 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at left center, rgba(103, 232, 249, 0.45), transparent 70%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Universal asterism — typographic star, not franchise art. */}
          <span className="text-base sm:text-lg text-cyan-200" aria-hidden>✦</span>
          <p className="text-[12px] sm:text-sm font-bold truncate">
            <span className="text-cyan-100">Semana 4 de mayo</span>
            <span className="hidden sm:inline text-white/40 mx-2">·</span>
            <span className="hidden sm:inline text-white/90">
              El mejor agarre, en cualquier galaxia
            </span>
            <span className="sm:hidden text-white/80 ml-2 text-[11px]">
              agarre intergaláctico
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="text-white/50 hover:text-white p-1 -m-1 flex-shrink-0 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
