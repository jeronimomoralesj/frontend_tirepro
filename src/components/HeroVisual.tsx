"use client";

// Hero visual — data-flow narrative: tire → phone → dashboard.
//
// Three connected stages on one horizontal track:
//   1. Tire   — data points leave the tread (depth, pressure, km)
//   2. Phone  — receives those points, registers the inspection
//   3. Cloud/Dashboard — stores the data, updates the chart, ships an alert
//
// Connector "wires" between stages have traveling pulses that move in sync,
// so it actually reads as one signal flowing from sensor → app → cloud.
// Stages also have internal motion (tire spins, phone pings, chart line
// extends). Stacks on mobile.

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Disc,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import "./heroAnimations.css";

// ─── reduced-motion hook ──────────────────────────────────────────────────
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

// ─── intersection observer ────────────────────────────────────────────────
function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════

export default function HeroVisual() {
  const { ref, visible } = useInView<HTMLDivElement>(0.2);

  return (
    <div
      ref={ref}
      className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(10,24,58,0.7) 0%, rgba(23,61,104,0.5) 50%, rgba(30,118,182,0.35) 100%)",
        border: "1px solid rgba(98,184,240,0.22)",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Background — dot grid + radial cyan glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,140,203,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(52,140,203,0.10) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, #000 35%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 35%, transparent 80%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(52,140,203,0.20) 0%, transparent 65%)",
        }}
      />

      {/* Stage labels — small caption row at top */}
      <div className="relative grid grid-cols-3 gap-2 px-6 sm:px-12 pt-6 sm:pt-10 text-center">
        <StageLabel num="01" tag="Sensor" desc="Llanta" />
        <StageLabel num="02" tag="App"    desc="Inspección" />
        <StageLabel num="03" tag="IA"     desc="Decisión" />
      </div>

      {/* Stages row + connectors */}
      <div className="relative px-6 sm:px-12 py-8 sm:py-12">
        {/* Connector wires — desktop only */}
        <Connector visible={visible} from="left"  fraction={0.33} />
        <Connector visible={visible} from="left"  fraction={0.66} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-3 lg:gap-4 items-center relative z-10">
          <StageTire     visible={visible} />
          <StagePhone    visible={visible} />
          <StageDashboard visible={visible} />
        </div>
      </div>

      {/* Footer status row */}
      <div className="relative px-6 sm:px-12 pb-5 flex items-center justify-between flex-wrap gap-2 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[10px] font-mono text-white/55 tracking-wider">
            EN VIVO · 142 vehículos · LATAM
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-[#62b8f0]" />
          <span className="text-[10px] font-mono text-white/55">
            6 agentes IA · sincronizado ahora
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SHARED PIECES
// ════════════════════════════════════════════════════════════════════════

function StageLabel({ num, tag, desc }: { num: string; tag: string; desc: string }) {
  return (
    <div>
      <p className="text-[9px] font-mono tracking-[0.2em] text-white">
        {num}
      </p>
      <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase mt-0.5" style={{ color: "#62b8f0" }}>
        {tag}
      </p>
      <p className="text-[10px] text-white/55 mt-0.5 hidden sm:block">{desc}</p>
    </div>
  );
}

// ─── Connector wire with traveling pulses ─────────────────────────────────
//
// SVG path between consecutive stages with three offset pulses traveling
// along it. The pulses use motion-along-path so they curve naturally.

function Connector({
  visible,
  fraction,
}: {
  visible: boolean;
  from: "left" | "right";
  fraction: number;
}) {
  const reduced = useReducedMotion();
  // The wire arcs slightly so the pulses "feel" like they're traveling
  // through the air rather than a straight HDMI cable.
  return (
    <div
      aria-hidden
      className="hidden md:block absolute pointer-events-none"
      style={{
        top: "50%",
        left: `calc(${fraction * 100}% - 60px)`,
        width: 120,
        height: 60,
        transform: "translateY(-50%)",
      }}
    >
      <svg viewBox="0 0 120 60" className="w-full h-full" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`wire-${fraction}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#62b8f0" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#62b8f0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#62b8f0" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* The wire itself */}
        <path
          id={`wirePath-${fraction}`}
          d="M0,30 Q60,10 120,30"
          fill="none"
          stroke={`url(#wire-${fraction})`}
          strokeWidth="1.5"
          strokeDasharray="3 4"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease-out 0.3s",
          }}
        />

        {/* Three pulses traveling along the path, offset in time */}
        {!reduced && [0, 0.33, 0.66].map((delay, i) => (
          <circle key={i} r="3" fill="#62b8f0" style={{ filter: "drop-shadow(0 0 6px #62b8f0)" }}>
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              begin={`${delay * 2.4}s`}
              path="M0,30 Q60,10 120,30"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2.4s"
              repeatCount="indefinite"
              begin={`${delay * 2.4}s`}
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 1 — TIRE
// ════════════════════════════════════════════════════════════════════════

function StageTire({ visible }: { visible: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 lg:w-52 lg:h-52 transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.9)",
        }}
      >
        {/* Concentric rings */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 200"
          style={{ overflow: "visible" }}
        >
          <circle
            cx="100" cy="100" r="95"
            fill="none"
            stroke="rgba(98,184,240,0.20)"
            strokeWidth="1"
            strokeDasharray="2 6"
            className={reduced ? undefined : "hv-spin-slow"}
            style={{ transformOrigin: "100px 100px" }}
          />
          <circle
            cx="100" cy="100" r="78"
            fill="none"
            stroke="rgba(98,184,240,0.30)"
            strokeWidth="1"
            strokeDasharray="4 4"
            className={reduced ? undefined : "hv-spin-reverse"}
            style={{ transformOrigin: "100px 100px" }}
          />
          {/* Single sweeping ping arc — gives the feel of an active sensor */}
          <circle
            cx="100" cy="100" r="62"
            fill="none"
            stroke="#62b8f0"
            strokeWidth="1.5"
            strokeDasharray="14 360"
            className={reduced ? undefined : "hv-spin-slow"}
            style={{
              transformOrigin: "100px 100px",
              filter: "drop-shadow(0 0 6px #62b8f0)",
              animationDuration: "5s",
            }}
          />
        </svg>

        {/* Glow */}
        <div
          className="absolute inset-0 blur-2xl"
          style={{
            background: "radial-gradient(circle, rgba(98,184,240,0.55) 0%, transparent 60%)",
          }}
        />

        {/* The tire itself */}
        <div
          className={`relative w-full h-full flex items-center justify-center ${reduced ? "" : "hv-spin-tire"}`}
          style={{ animationDuration: "32s" }}
        >
          <Disc
            className="w-full h-full text-[#62b8f0]"
            strokeWidth={1.1}
            style={{ filter: "drop-shadow(0 0 24px rgba(98,184,240,0.85))" }}
          />
        </div>

        {/* Floating measurement chips emitted FROM the tire — these are the
            "data leaving the sensor". Each chip animates outward and fades. */}
        {!reduced && (
          <>
            <DataChip text="12.5 mm"  delay="0s"   from="top" />
            <DataChip text="114 PSI"  delay="0.7s" from="right" />
            <DataChip text="Pos. 3"   delay="1.4s" from="bottom" />
            <DataChip text="142.318 km" delay="2.1s" from="left" />
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs sm:text-sm font-bold text-white">Llanta · LL-1024</p>
        <p className="text-[10px] text-white/45 font-mono">ABC-123 · eje 2</p>
      </div>
    </div>
  );
}

function DataChip({
  text,
  delay,
  from,
}: {
  text: string;
  delay: string;
  from: "top" | "right" | "bottom" | "left";
}) {
  // Each chip uses a unique keyframe to drift in a different direction
  // away from the tire, then fade out. Loops every 2.8s.
  const cls = `chip-${from}`;
  return (
    <div
      className={`absolute px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${cls}`}
      style={{
        background: "rgba(10,24,58,0.92)",
        border: "1px solid rgba(98,184,240,0.55)",
        color: "#62b8f0",
        backdropFilter: "blur(6px)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        animationDelay: delay,
      }}
    >
      {text}
      <style jsx>{`
        .chip-top {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          animation: emitTop 2.8s ease-out infinite;
        }
        .chip-right {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          animation: emitRight 2.8s ease-out infinite;
        }
        .chip-bottom {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          animation: emitBottom 2.8s ease-out infinite;
        }
        .chip-left {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          animation: emitLeft 2.8s ease-out infinite;
        }
        @keyframes emitTop {
          0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          15%  { transform: translate(-50%, -90%) scale(1);   opacity: 1; }
          70%  { transform: translate(-50%, -160%) scale(1);  opacity: 0.9; }
          100% { transform: translate(-50%, -200%) scale(0.95); opacity: 0; }
        }
        @keyframes emitRight {
          0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          15%  { transform: translate(0%, -50%) scale(1);     opacity: 1; }
          70%  { transform: translate(60%, -50%) scale(1);    opacity: 0.9; }
          100% { transform: translate(110%, -50%) scale(0.95); opacity: 0; }
        }
        @keyframes emitBottom {
          0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          15%  { transform: translate(-50%, -10%) scale(1);   opacity: 1; }
          70%  { transform: translate(-50%, 60%)  scale(1);   opacity: 0.9; }
          100% { transform: translate(-50%, 110%) scale(0.95); opacity: 0; }
        }
        @keyframes emitLeft {
          0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          15%  { transform: translate(-100%, -50%) scale(1);  opacity: 1; }
          70%  { transform: translate(-160%, -50%) scale(1);  opacity: 0.9; }
          100% { transform: translate(-210%, -50%) scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 2 — PHONE
// ════════════════════════════════════════════════════════════════════════

function StagePhone({ visible }: { visible: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transitionDelay: "150ms",
        }}
      >
        <div
          className="relative rounded-[26px] overflow-hidden"
          style={{
            width: 158,
            height: 296,
            background: "linear-gradient(180deg, #0A183A, #173D68)",
            border: "3px solid rgba(255,255,255,0.18)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.50)",
          }}
        >
          {/* Notch */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-3.5 rounded-b-2xl"
            style={{ background: "#000" }}
          />

          {/* Screen — mirrors real Inspeccion.tsx layout: header, vehicle pill,
              3-column profundidad grid (INT/CEN/EXT), presión row, photo
              tile, save button. White on a near-white background like the
              actual app, not a dark mock. */}
          <div className="absolute inset-2 mt-4 rounded-2xl overflow-hidden flex flex-col"
               style={{ background: "#f6f8fb" }}>
            {/* Status bar */}
            <div className="flex items-center justify-between px-2.5 py-1 bg-white">
              <span className="text-[7px] font-mono text-[#0A183A]/70 font-bold">10:42</span>
              <span className="text-[7px] font-mono text-[#0A183A]/40">●●●● 5G</span>
            </div>

            {/* App header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border-b border-gray-100">
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-md flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg,#1E76B6,#62b8f0)" }}>
                  <Disc size={8} className="text-white" />
                </div>
                <span className="text-[8px] font-black text-[#0A183A] tracking-wider">TIREPRO</span>
              </div>
              <span className="text-[7px] font-mono text-[#1E76B6]/60">Inspección</span>
            </div>

            {/* Vehicle pill */}
            <div className="px-2.5 py-2">
              <div className="rounded-md px-2 py-1 flex items-center justify-between"
                   style={{ background: "rgba(30,118,182,0.07)", border: "1px solid rgba(30,118,182,0.20)" }}>
                <div>
                  <p className="text-[7px] font-mono tracking-wider text-[#1E76B6]/70 uppercase">Vehículo</p>
                  <p className="text-[9px] font-black text-[#0A183A] leading-tight">ABC-123 · P3</p>
                </div>
                <span className="text-[7px] font-mono font-bold text-[#1E76B6]">LL-1024</span>
              </div>
            </div>

            {/* Profundidad — 3 columns: INT / CEN / EXT, like the real app */}
            <div className="px-2.5">
              <p className="text-[7px] font-bold tracking-widest uppercase text-[#1E76B6] mb-1">
                Profundidad · mm
              </p>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { lab: "INT", val: "8.4", delay: "0.5s"  },
                  { lab: "CEN", val: "8.1", delay: "0.95s" },
                  { lab: "EXT", val: "8.2", delay: "1.4s"  },
                ].map((f) => (
                  <div key={f.lab} className="text-center">
                    <p className="text-[6px] font-bold tracking-wider text-[#1E76B6]/60 uppercase mb-0.5">
                      {f.lab}
                    </p>
                    <div
                      className="rounded-md py-1 hv-slide-in-1"
                      style={{
                        background: "white",
                        border: "1px solid rgba(30,118,182,0.25)",
                        boxShadow: "0 1px 2px rgba(10,24,58,0.04)",
                        animationDelay: f.delay,
                      }}
                    >
                      <span className="text-[10px] font-black text-[#0A183A] tabular-nums">
                        {f.val}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Presión row */}
            <div className="px-2.5 mt-2">
              <div
                className="rounded-md px-2 py-1 flex items-center justify-between hv-slide-in-1"
                style={{
                  background: "white",
                  border: "1px solid rgba(30,118,182,0.20)",
                  animationDelay: "1.85s",
                }}
              >
                <span className="text-[7px] font-bold tracking-wider text-[#1E76B6] uppercase">
                  Presión
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-[#0A183A] tabular-nums">114</span>
                  <span className="text-[6px] font-mono text-[#0A183A]/45">PSI</span>
                  <CheckCircle2 size={9} className="text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Photo tile */}
            <div className="px-2.5 mt-2">
              <div
                className="rounded-md py-1.5 flex items-center justify-center gap-1 hv-slide-in-1"
                style={{
                  background: "rgba(30,118,182,0.05)",
                  border: "1px dashed rgba(30,118,182,0.40)",
                  animationDelay: "2.3s",
                }}
              >
                <span className="text-[7px] font-bold text-[#1E76B6]/70 uppercase tracking-wider">
                  + Foto
                </span>
              </div>
            </div>

            {/* Save CTA pinned to the bottom */}
            <div className="mt-auto px-2.5 pb-2.5 pt-2">
              <div
                className="rounded-md py-1.5 text-center hv-slide-in-1"
                style={{
                  background: "linear-gradient(135deg, #1E76B6, #62b8f0)",
                  boxShadow: "0 4px 14px -4px rgba(98,184,240,0.6)",
                  animationDelay: "2.7s",
                }}
              >
                <span className="text-[8px] font-black text-white tracking-wider">
                  GUARDAR INSPECCIÓN
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Receiving indicator — pulsing dot at the top of the phone */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full flex items-center gap-1 hv-bob"
          style={{
            background: "rgba(34,197,94,0.18)",
            border: "1px solid rgba(34,197,94,0.45)",
            color: "#22c55e",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[8px] font-bold tracking-wider">RECIBIENDO</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs sm:text-sm font-bold text-white">App TirePro</p>
        <p className="text-[10px] text-white/45 font-mono">Inspección · 1 min</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 3 — DASHBOARD
// ════════════════════════════════════════════════════════════════════════

function StageDashboard({ visible }: { visible: boolean }) {
  // Mini animated chart — line draws on view, last point pulses, alert
  // slides in.
  const points = [56, 50, 45, 41, 36, 32, 28, 24];
  const W = 200, H = 80, PAD = 10;
  const min = Math.min(...points), max = Math.max(...points);
  const pts = points.map((v, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2);
    return { x, y };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const last = pts[pts.length - 1];
  const areaPath = `${path} L${last.x},${H - PAD} L${pts[0].x},${H - PAD} Z`;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative w-full max-w-[260px] rounded-2xl overflow-hidden transition-all duration-700"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(98,184,240,0.25)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transitionDelay: "300ms",
        }}
      >
        {/* Mini browser chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06]">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
          <div className="ml-2 text-[7px] font-mono text-white/40">tirepro/dashboard</div>
        </div>

        <div className="p-3 space-y-2.5">
          {/* CPK card */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[7px] font-mono tracking-wider text-white/45 uppercase">
                CPK · 8 meses
              </span>
              <div className="flex items-center gap-1">
                <TrendingDown size={8} className="text-emerald-400" />
                <span className="text-[8px] font-mono font-bold text-emerald-400">
                  −28%
                </span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#22c55e" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0"   />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill="url(#dashArea)"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: "opacity 1s ease-out 1s",
                }}
              />
              <path
                d={path}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 800,
                  strokeDashoffset: visible ? 0 : 800,
                  transition: "stroke-dashoffset 1.6s ease-out 0.8s",
                }}
              />
              {/* Last-point arriving dot — the new datapoint that just
                  came in from the phone */}
              <circle
                cx={last.x}
                cy={last.y}
                r="6"
                fill="#22c55e"
                opacity={visible ? "0.25" : "0"}
                style={{ transition: "opacity 0.4s ease-out 2.2s" }}
              >
                <animate
                  attributeName="r"
                  values="6;9;6"
                  dur="2.2s"
                  repeatCount="indefinite"
                  begin="2.4s"
                />
              </circle>
              <circle
                cx={last.x}
                cy={last.y}
                r="3"
                fill="#22c55e"
                stroke="#0a1426"
                strokeWidth="1.2"
                opacity={visible ? "1" : "0"}
                style={{ transition: "opacity 0.4s ease-out 2.4s" }}
              />
            </svg>
          </div>

          {/* Alert card sliding in — IA's reaction to the new datapoint */}
          <div
            className="rounded-md p-2 flex items-start gap-1.5 hv-slide-in-1"
            style={{
              background: "rgba(239,68,68,0.10)",
              borderLeft: "2px solid #ef4444",
              animationDelay: "2.4s",
            }}
          >
            <AlertTriangle size={11} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold text-white truncate">
                Reemplazo en 14 días
              </p>
              <p className="text-[7px] text-white/45 font-mono">
                LL-1024 · ±600 km · CPK $94/km
              </p>
            </div>
          </div>

          {/* Recommendation card */}
          <div
            className="rounded-md p-2 flex items-start gap-1.5 hv-slide-in-1"
            style={{
              background: "rgba(34,197,94,0.10)",
              borderLeft: "2px solid #22c55e",
              animationDelay: "3.0s",
            }}
          >
            <Cpu size={11} className="text-[#22c55e] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold text-white truncate">
                Reencauche recomendado
              </p>
              <p className="text-[7px] text-white/45 font-mono">
                Vipal VRL1 · ahorro $2.4M
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs sm:text-sm font-bold text-white">Plataforma · IA</p>
        <p className="text-[10px] text-white/45 font-mono">Decisión en segundos</p>
      </div>
    </div>
  );
}
