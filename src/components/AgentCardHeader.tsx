"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AGENTS } from "../lib/agents";
import type { AgentId } from "../lib/agents";
import { useAgentSettings, isAgentOn } from "../lib/useAgentSettings";

type Props = {
  agent: AgentId;
  insight?: string;
};

export default function AgentCardHeader({ agent, insight }: Props) {
  const settings = useAgentSettings();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position the portal popover relative to the button
  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popH = 280; // approximate max height
    const spaceBelow = window.innerHeight - rect.bottom;
    const goUp = spaceBelow < popH && rect.top > popH;

    setPos({
      top: goUp ? rect.top + window.scrollY - popH - 8 : rect.bottom + window.scrollY + 8,
      left: Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 328)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    function handleClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleScroll() { reposition(); }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  if (settings.loading || !isAgentOn(settings, agent)) return null;

  const a = AGENTS[agent];
  const Icon = a.icon;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 group transition-all hover:scale-105 active:scale-95"
        title={`${a.codename} - Toca para ver analisis`}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-shadow group-hover:shadow-lg"
          style={{ background: a.color, boxShadow: open ? `0 0 12px ${a.glow}` : "none" }}
        >
          <Icon className="w-3 h-3 text-white" />
        </div>
        <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">
          {a.codename}
        </span>
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999] w-80 rounded-xl overflow-hidden shadow-2xl animate-in fade-in duration-150"
          style={{
            top: pos.top,
            left: pos.left,
            border: `1px solid ${a.color}30`,
            background: "white",
            position: "absolute",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)` }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white tracking-wide" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {a.codename}
                </p>
                <p className="text-[9px] text-white/60 uppercase tracking-wider">{a.role}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-white/20 transition-colors">
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 max-h-60 overflow-y-auto">
            {insight ? (
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{insight}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Sin datos suficientes para generar analisis.</p>
            )}
            <div className="flex items-center gap-1.5 mt-3 pt-2" style={{ borderTop: `1px solid ${a.color}10` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: a.color }} />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: a.color }}>{a.status}</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
