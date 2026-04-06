"use client";

import {
  Camera,
  Cpu,
  Disc,
} from "lucide-react";
import "./heroAnimations.css";

/**
 * Horizontal hero visual: [Camera] → [Tire + AI] → [Insights]
 */
export default function HeroVisual() {
  return (
    <div
      className="relative w-full mx-auto rounded-3xl overflow-hidden"
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

      {/* Tire tread pattern decorations in the corners */}
      <CornerTreadDecoration position="top-left" />
      <CornerTreadDecoration position="top-right" />
      <CornerTreadDecoration position="bottom-left" />
      <CornerTreadDecoration position="bottom-right" />

      {/* Tire track lines crossing the panel */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <svg className="absolute top-1/2 left-0 w-full h-16 -translate-y-1/2 opacity-[0.06]" preserveAspectRatio="none" viewBox="0 0 1200 60">
          {/* Left tire track */}
          <g>
            {Array.from({ length: 60 }).map((_, i) => (
              <rect key={i} x={i * 22} y="14" width="14" height="6" rx="1" fill="#348CCB" />
            ))}
            {Array.from({ length: 60 }).map((_, i) => (
              <rect key={i} x={i * 22 + 4} y="40" width="14" height="6" rx="1" fill="#348CCB" />
            ))}
          </g>
        </svg>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-6 lg:gap-10 px-6 md:px-12 lg:px-16 py-12 md:py-16 lg:py-20">
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
              className="relative w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-2xl flex items-center justify-center"
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
            <div className="relative w-32 h-32 md:w-44 md:h-44 lg:w-52 lg:h-52 flex items-center justify-center hv-spin-tire">
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

        {/* RIGHT: Mini dashboard — replicates the main dashboard widgets */}
        <div className="flex flex-col items-center">
          <MiniDashboard />
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

// ── Corner tread decoration — tire tread pattern in panel corners ──────────
function CornerTreadDecoration({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const isTop = position.startsWith("top");
  const isLeft = position.endsWith("left");
  return (
    <div
      className="absolute pointer-events-none hidden md:block"
      style={{
        [isTop ? "top" : "bottom"]: "16px",
        [isLeft ? "left" : "right"]: "16px",
        width: "120px",
        height: "120px",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full"
        style={{
          transform: `${isLeft ? "" : "scaleX(-1)"} ${isTop ? "" : "scaleY(-1)"}`,
        }}
      >
        {/* Curved tire tread blocks fanning from the corner */}
        <g opacity="0.18">
          {/* Outer arc treads */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 90) / 8;
            const rad = (angle * Math.PI) / 180;
            const r = 88;
            const x1 = r * Math.cos(rad);
            const y1 = r * Math.sin(rad);
            return (
              <rect
                key={`outer-${i}`}
                x={x1 - 4}
                y={y1 - 9}
                width="8"
                height="18"
                rx="1.5"
                fill="#348CCB"
                transform={`rotate(${angle} ${x1} ${y1})`}
              />
            );
          })}
          {/* Middle arc treads */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * 90) / 6 + 7;
            const rad = (angle * Math.PI) / 180;
            const r = 64;
            const x1 = r * Math.cos(rad);
            const y1 = r * Math.sin(rad);
            return (
              <rect
                key={`mid-${i}`}
                x={x1 - 3}
                y={y1 - 7}
                width="6"
                height="14"
                rx="1.2"
                fill="#1E76B6"
                transform={`rotate(${angle} ${x1} ${y1})`}
              />
            );
          })}
          {/* Inner arc — small dots */}
          {Array.from({ length: 5 }).map((_, i) => {
            const angle = (i * 90) / 5 + 9;
            const rad = (angle * Math.PI) / 180;
            const r = 42;
            const x1 = r * Math.cos(rad);
            const y1 = r * Math.sin(rad);
            return (
              <circle key={`inner-${i}`} cx={x1} cy={y1} r="2" fill="#348CCB" />
            );
          })}
        </g>
        {/* Subtle corner glow */}
        <circle cx="0" cy="0" r="60" fill="url(#cornerGlow)" />
        <defs>
          <radialGradient id="cornerGlow">
            <stop offset="0%" stopColor="#348CCB" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#348CCB" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Mini dashboard — replicates the main resumen dashboard at small scale ──
function MiniDashboard() {
  return (
    <div
      className="rounded-2xl p-3 w-full"
      style={{
        background: "rgba(255,255,255,0.97)",
        border: "1px solid rgba(52,140,203,0.2)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        minWidth: "260px",
        maxWidth: "360px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-100">
        <div>
          <div className="text-[7px] font-bold tracking-widest text-gray-400 uppercase">Mi Resumen</div>
          <div className="text-[10px] font-black text-[#0A183A]">Flota Activa</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[7px] font-bold text-[#22c55e]">EN VIVO</span>
        </div>
      </div>

      {/* KPI row — 3 metrics */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5 hv-slide-in-1">
        <div
          className="rounded-lg p-1.5"
          style={{
            background: "linear-gradient(135deg, rgba(52,140,203,0.12), rgba(30,118,182,0.06))",
            border: "1px solid rgba(52,140,203,0.25)",
          }}
        >
          <div className="text-[6px] font-bold tracking-wider text-[#1E76B6] uppercase">CPK</div>
          <div className="text-sm font-black text-[#0A183A] leading-none mt-0.5">$12</div>
          <div className="text-[6px] text-[#22c55e] font-bold mt-0.5">▼ 23%</div>
        </div>
        <div
          className="rounded-lg p-1.5"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))",
            border: "1px solid rgba(34,197,94,0.25)",
          }}
        >
          <div className="text-[6px] font-bold tracking-wider text-[#22c55e] uppercase">Vida útil</div>
          <div className="text-sm font-black text-[#0A183A] leading-none mt-0.5">112K</div>
          <div className="text-[6px] text-gray-400 font-bold mt-0.5">km</div>
        </div>
        <div
          className="rounded-lg p-1.5"
          style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.04))",
            border: "1px solid rgba(249,115,22,0.25)",
          }}
        >
          <div className="text-[6px] font-bold tracking-wider text-[#f97316] uppercase">Ahorro</div>
          <div className="text-sm font-black text-[#0A183A] leading-none mt-0.5">$2.4M</div>
          <div className="text-[6px] text-gray-400 font-bold mt-0.5">/mes</div>
        </div>
      </div>

      {/* Row 1: CPK Evolution bar chart */}
      <div className="rounded-lg p-2 mb-2 hv-slide-in-2" style={{ background: "#f8fafd", border: "1px solid #f0f4f8" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[7px] font-bold text-[#0A183A] uppercase tracking-wider">CPK Proyectado</div>
          <div className="text-[6px] text-gray-400">12 meses</div>
        </div>
        <svg className="w-full h-10" viewBox="0 0 200 40" preserveAspectRatio="none">
          {/* Bars */}
          {[26, 22, 28, 24, 19, 21, 17, 16, 18, 14, 13, 12].map((v, i) => (
            <rect
              key={i}
              x={i * 17 + 2}
              y={40 - v * 1.4}
              width="13"
              height={v * 1.4}
              rx="1.5"
              fill={i === 11 ? "#1E76B6" : "rgba(52,140,203,0.4)"}
              className="hv-slide-in-1"
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </svg>
      </div>

      {/* Row 2: Two side-by-side mini widgets */}
      <div className="grid grid-cols-2 gap-1.5 mb-2 hv-slide-in-3">
        {/* Por Vida donut */}
        <div className="rounded-lg p-2" style={{ background: "#f8fafd", border: "1px solid #f0f4f8" }}>
          <div className="text-[7px] font-bold text-[#0A183A] uppercase tracking-wider mb-1">Por Vida</div>
          <div className="flex items-center gap-1.5">
            <svg width="32" height="32" viewBox="0 0 32 32">
              {/* Donut: nueva 60%, reencauche1 25%, reencauche2 15% */}
              <circle cx="16" cy="16" r="12" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke="#1E76B6" strokeWidth="6"
                strokeDasharray="45.2 75.4"
                strokeDashoffset="0"
                transform="rotate(-90 16 16)"
              />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke="#348CCB" strokeWidth="6"
                strokeDasharray="18.85 75.4"
                strokeDashoffset="-45.2"
                transform="rotate(-90 16 16)"
              />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke="#22c55e" strokeWidth="6"
                strokeDasharray="11.31 75.4"
                strokeDashoffset="-64.05"
                transform="rotate(-90 16 16)"
              />
            </svg>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-sm bg-[#1E76B6]" />
                <span className="text-[6px] text-gray-600">Nueva 60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-sm bg-[#348CCB]" />
                <span className="text-[6px] text-gray-600">Reenc. 25%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-sm bg-[#22c55e]" />
                <span className="text-[6px] text-gray-600">Otra 15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inversion mensual sparkline */}
        <div className="rounded-lg p-2" style={{ background: "#f8fafd", border: "1px solid #f0f4f8" }}>
          <div className="text-[7px] font-bold text-[#0A183A] uppercase tracking-wider mb-1">Inversion</div>
          <div className="text-[10px] font-black text-[#0A183A] leading-none">$8.4M</div>
          <div className="text-[6px] text-[#22c55e] font-bold mb-1">▼ 18% vs mes ant.</div>
          <svg className="w-full h-5" viewBox="0 0 80 20" preserveAspectRatio="none">
            <defs>
              <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E76B6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#1E76B6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,16 L10,14 L20,15 L30,11 L40,12 L50,8 L60,10 L70,6 L80,4 L80,20 L0,20 Z" fill="url(#invFill)" />
            <polyline
              points="0,16 10,14 20,15 30,11 40,12 50,8 60,10 70,6 80,4"
              fill="none" stroke="#1E76B6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              className="hv-draw-line"
            />
          </svg>
        </div>
      </div>

      {/* Row 3: Por marca horizontal bars */}
      <div className="rounded-lg p-2" style={{ background: "#f8fafd", border: "1px solid #f0f4f8" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[7px] font-bold text-[#0A183A] uppercase tracking-wider">Por Marca</div>
          <div className="text-[6px] text-gray-400">Top 3</div>
        </div>
        <div className="space-y-1">
          {[
            { name: "Michelin", pct: 78, color: "#1E76B6" },
            { name: "Bridgestone", pct: 56, color: "#348CCB" },
            { name: "Continental", pct: 42, color: "#22c55e" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[6px] font-bold text-gray-600 w-14 truncate">{b.name}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
                <div
                  className="h-full rounded-full hv-slide-in-1"
                  style={{
                    width: `${b.pct}%`,
                    background: b.color,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              </div>
              <span className="text-[6px] font-bold text-gray-500 w-5 text-right">{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
