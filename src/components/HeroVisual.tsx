"use client";

import {
  Camera,
  Cpu,
  TrendingUp,
  Disc,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import "./heroAnimations.css";

/**
 * Horizontal hero visual: [Camera] → [Tire + AI] → [Insights]
 */
export default function HeroVisual() {
  return (
    <div
      className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(10,24,58,0.6) 0%, rgba(23,61,104,0.4) 50%, rgba(30,118,182,0.3) 100%)",
        border: "1px solid rgba(52,140,203,0.2)",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,140,203,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(52,140,203,0.12) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(52,140,203,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-2 px-6 md:px-10 py-12 md:py-16">
        {/* LEFT: Camera */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl hv-pulse-ring"
              style={{
                background:
                  "linear-gradient(135deg, rgba(52,140,203,0.3), rgba(30,118,182,0.1))",
              }}
            />
            <div
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0A183A, #1E76B6)",
                border: "1px solid rgba(52,140,203,0.4)",
                boxShadow:
                  "0 8px 24px rgba(30,118,182,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <Camera
                size={42}
                className="text-white"
                strokeWidth={1.5}
                style={{ filter: "drop-shadow(0 0 12px rgba(52,140,203,0.6))" }}
              />
            </div>
          </div>
          <div className="mt-3 text-center">
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
              style={{ color: "#348CCB", letterSpacing: "0.16em" }}
            >
              Captura
            </p>
            <p className="text-xs text-white/60">Foto del neumático</p>
          </div>
        </div>

        {/* CENTER: Tire / AI */}
        <div className="flex flex-col items-center relative">
          <FlowConnector position="left" />

          <div className="relative">
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 200 200"
              style={{ overflow: "visible" }}
            >
              <circle
                cx="100"
                cy="100"
                r="95"
                fill="none"
                stroke="rgba(52,140,203,0.2)"
                strokeWidth="1"
                strokeDasharray="2 6"
                className="hv-spin-slow"
                style={{ transformOrigin: "100px 100px" }}
              />
              <circle
                cx="100"
                cy="100"
                r="78"
                fill="none"
                stroke="rgba(52,140,203,0.3)"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="hv-spin-reverse"
                style={{ transformOrigin: "100px 100px" }}
              />
            </svg>
            <div
              className="absolute inset-0 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(52,140,203,0.6) 0%, transparent 60%)",
              }}
            />
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center hv-spin-tire">
              <Disc
                className="w-full h-full text-[#348CCB]"
                strokeWidth={1.2}
                style={{ filter: "drop-shadow(0 0 24px rgba(52,140,203,0.7))" }}
              />
            </div>
            <div
              className="absolute -top-2 -right-2 px-2 py-1 rounded-full flex items-center gap-1 hv-bob"
              style={{
                background: "rgba(10,24,58,0.9)",
                border: "1px solid rgba(52,140,203,0.5)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              <Cpu size={10} className="text-[#348CCB]" />
              <span
                className="text-[9px] font-bold"
                style={{ color: "#348CCB", fontFamily: "monospace" }}
              >
                IA
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
              style={{ color: "#348CCB", letterSpacing: "0.16em" }}
            >
              Analiza
            </p>
            <p className="text-xs text-white/60">6 agentes de IA</p>
          </div>

          <FlowConnector position="right" />
        </div>

        {/* RIGHT: Insights */}
        <div className="flex flex-col items-center">
          <div className="space-y-2">
            {/* CPK card */}
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-2 hv-slide-in-1"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(52,140,203,0.4)",
                minWidth: "150px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #348CCB, #1E76B6)",
                }}
              >
                <TrendingUp size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[8px] font-bold tracking-widest text-[#348CCB]">
                  CPK
                </div>
                <div className="text-sm font-extrabold text-white">
                  $87 <span className="text-[9px] text-[#22c55e]">-23%</span>
                </div>
              </div>
            </div>

            {/* Vida útil card */}
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-2 hv-slide-in-2"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(34,197,94,0.4)",
                minWidth: "150px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.2)" }}
              >
                <CheckCircle2 size={14} className="text-[#22c55e]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[8px] font-bold tracking-widest text-[#22c55e]">
                  VIDA ÚTIL
                </div>
                <div className="text-sm font-extrabold text-white">42K km</div>
              </div>
            </div>

            {/* Mini chart card */}
            <div
              className="rounded-xl px-3 py-2 hv-slide-in-3"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(52,140,203,0.4)",
                minWidth: "150px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[8px] font-bold tracking-widest text-[#348CCB]">
                  DESGASTE
                </div>
                <Sparkles size={10} className="text-[#348CCB]" />
              </div>
              <svg className="w-full h-6" viewBox="0 0 120 24">
                <defs>
                  <linearGradient
                    id="heroChart"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#348CCB" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#348CCB" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,20 L15,18 L30,15 L45,16 L60,12 L75,10 L90,8 L105,6 L120,4 L120,24 L0,24 Z"
                  fill="url(#heroChart)"
                />
                <polyline
                  points="0,20 15,18 30,15 45,16 60,12 75,10 90,8 105,6 120,4"
                  fill="none"
                  stroke="#348CCB"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hv-draw-line"
                />
              </svg>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
              style={{ color: "#348CCB", letterSpacing: "0.16em" }}
            >
              Decide
            </p>
            <p className="text-xs text-white/60">Insights accionables</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Animated connector line between columns ─────────────────────────────────
function FlowConnector({ position }: { position: "left" | "right" }) {
  return (
    <div
      className="hidden md:block absolute top-1/2 h-px"
      style={{
        [position]: "100%",
        width: "60%",
        marginTop: "-12px",
        background:
          "linear-gradient(90deg, rgba(52,140,203,0.05), rgba(52,140,203,0.4), rgba(52,140,203,0.05))",
        overflow: "visible",
      }}
    >
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 w-12 rounded-full hv-flow-1"
        style={{
          background:
            "linear-gradient(90deg, transparent, #348CCB, transparent)",
          boxShadow: "0 0 12px #348CCB",
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 w-8 rounded-full hv-flow-2"
        style={{
          background:
            "linear-gradient(90deg, transparent, #348CCB, transparent)",
          boxShadow: "0 0 12px #348CCB",
        }}
      />
    </div>
  );
}
