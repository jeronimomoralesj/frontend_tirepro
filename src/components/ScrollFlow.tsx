"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Cpu,
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  Disc,
  Sparkles,
  Activity,
  CheckCircle2,
  Wifi,
} from "lucide-react";

/**
 * Scroll-driven flow that explains the TirePro process visually.
 * Uses sticky scroll + IntersectionObserver to fade/slide steps into view.
 *
 * Steps:
 *  1. User snaps a tire photo on the phone
 *  2. AI analyzes the image
 *  3. Insights appear (CPK, alerts, projections)
 *  4. Marketplace recommends what to buy
 *  5. One-click purchase
 */

const STEPS = [
  {
    id: "capture",
    label: "Captura",
    title: "Inspecciona con tu telefono",
    description:
      "Toma una foto del neumatico desde tu cel. Sin manuales, sin Excel, sin demoras. La inspeccion queda guardada al instante.",
    icon: Camera,
    accent: "#348CCB",
  },
  {
    id: "analyze",
    label: "Analiza",
    title: "La IA lee la llanta",
    description:
      "Nuestros agentes de IA analizan profundidad, desgaste y patron. Detectan alineacion, presion baja y problemas mecanicos antes que tu.",
    icon: Cpu,
    accent: "#1E76B6",
  },
  {
    id: "insights",
    label: "Decide",
    title: "Recibes insights accionables",
    description:
      "Ves CPK proyectado, vida util restante, ahorro en pesos y la recomendacion exacta: cambio, reencauche o rotacion.",
    icon: TrendingUp,
    accent: "#173D68",
  },
  {
    id: "buy",
    label: "Reemplaza",
    title: "Compra en el marketplace",
    description:
      "Cuando llegue el momento, TirePro te muestra opciones reales del mercado colombiano con precios actualizados. Compras directo, sin intermediarios.",
    icon: ShoppingCart,
    accent: "#0A183A",
  },
];

export default function ScrollFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Track scroll position relative to the sticky container
  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      // Progress: 0 when top hits viewport top, 1 when bottom hits viewport bottom
      const scrolled = -rect.top;
      const pct = Math.max(0, Math.min(1, scrolled / total));
      setProgress(pct);
      // Map progress to step (0..STEPS.length-1)
      const step = Math.min(STEPS.length - 1, Math.floor(pct * STEPS.length * 0.999));
      setActiveStep(step);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="producto"
      className="relative w-full"
      style={{ background: "#ffffff" }}
      aria-labelledby="flow-heading"
    >
      {/* Section heading */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-12 text-center">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-4"
          style={{ color: "#1E76B6", letterSpacing: "0.18em" }}
        >
          COMO FUNCIONA
        </p>
        <h2
          id="flow-heading"
          className="font-extrabold leading-tight mb-5"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", color: "#0A183A", letterSpacing: "-0.03em" }}
        >
          De una foto a un ahorro real
          <br />
          <span style={{ color: "#1E76B6" }}>en cuatro pasos</span>
        </h2>
        <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "rgba(10,24,58,0.55)" }}>
          Cada llanta cuenta una historia. TirePro la lee, la analiza y te dice exactamente que hacer.
        </p>
      </div>

      {/* Sticky scroll container — height controls how long the animation lasts */}
      <div ref={containerRef} className="relative" style={{ height: `${STEPS.length * 90}vh` }}>
        <div className="sticky top-0 h-screen flex items-center overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

              {/* Left: Step list with progress bar */}
              <div className="order-2 lg:order-1">
                {/* Vertical progress line */}
                <div className="relative pl-8">
                  <div
                    className="absolute left-3 top-2 bottom-2 w-[2px] rounded-full"
                    style={{ background: "rgba(30,118,182,0.12)" }}
                  />
                  <div
                    className="absolute left-3 top-2 w-[2px] rounded-full transition-all duration-500 ease-out"
                    style={{
                      background: "linear-gradient(180deg, #348CCB, #1E76B6)",
                      height: `${((activeStep + 1) / STEPS.length) * 100}%`,
                      boxShadow: "0 0 12px rgba(30,118,182,0.4)",
                    }}
                  />

                  {STEPS.map((step, i) => {
                    const isActive = i === activeStep;
                    const isPast = i < activeStep;
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.id}
                        className="relative mb-10 last:mb-0 transition-all duration-500"
                        style={{
                          opacity: isActive ? 1 : isPast ? 0.5 : 0.3,
                          transform: isActive ? "translateX(0)" : "translateX(-4px)",
                        }}
                      >
                        {/* Dot */}
                        <div
                          className="absolute -left-[24px] w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500"
                          style={{
                            background: isActive || isPast
                              ? "linear-gradient(135deg, #348CCB, #1E76B6)"
                              : "#ffffff",
                            border: `2px solid ${isActive || isPast ? "transparent" : "rgba(30,118,182,0.3)"}`,
                            boxShadow: isActive ? "0 0 0 4px rgba(30,118,182,0.15)" : "none",
                          }}
                        >
                          {(isActive || isPast) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>

                        {/* Step content */}
                        <div className="pl-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="text-[10px] font-bold tracking-widest uppercase"
                              style={{ color: isActive ? "#1E76B6" : "rgba(10,24,58,0.4)", letterSpacing: "0.16em" }}
                            >
                              0{i + 1} · {step.label}
                            </span>
                          </div>
                          <h3
                            className="font-extrabold mb-2 transition-all duration-500"
                            style={{
                              fontSize: isActive ? "clamp(1.5rem, 2.5vw, 2rem)" : "clamp(1.1rem, 1.8vw, 1.4rem)",
                              color: "#0A183A",
                              letterSpacing: "-0.02em",
                              lineHeight: 1.15,
                            }}
                          >
                            {step.title}
                          </h3>
                          {isActive && (
                            <p
                              className="text-sm sm:text-base leading-relaxed animate-fade-in"
                              style={{ color: "rgba(10,24,58,0.65)", maxWidth: "440px" }}
                            >
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Animated visual */}
              <div className="order-1 lg:order-2 flex items-center justify-center">
                <FlowVisual activeStep={activeStep} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Flow visual — changes per step
// ═══════════════════════════════════════════════════════════════════════════
function FlowVisual({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative w-full max-w-md aspect-square">
      {/* Background grid */}
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0A183A 0%, #173D68 50%, #1E76B6 100%)",
          boxShadow: "0 20px 60px rgba(10,24,58,0.25), 0 0 0 1px rgba(52,140,203,0.2)",
        }}
      >
        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(52,140,203,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(52,140,203,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(52,140,203,0.25) 0%, transparent 60%)",
          }}
        />

        {/* Step layers — only the active one is visible */}
        <div className="absolute inset-0 flex items-center justify-center">
          {activeStep === 0 && <CaptureStep />}
          {activeStep === 1 && <AnalyzeStep />}
          {activeStep === 2 && <InsightsStep />}
          {activeStep === 3 && <BuyStep />}
        </div>
      </div>

      {/* Floating tire icons in background */}
      <FloatingTires />
    </div>
  );
}

// ── Step 1: Capture (phone with camera) ────────────────────────────────────
function CaptureStep() {
  return (
    <div className="relative w-full h-full flex items-center justify-center animate-pop-in">
      {/* Phone frame */}
      <div
        className="relative rounded-[28px] overflow-hidden"
        style={{
          width: "180px",
          height: "320px",
          background: "linear-gradient(180deg, #0A183A, #1E76B6)",
          border: "3px solid rgba(255,255,255,0.15)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-2xl"
          style={{ background: "#000" }}
        />

        {/* Screen content */}
        <div className="absolute inset-2 mt-5 rounded-2xl bg-[#F1F5F9] flex flex-col">
          {/* Camera viewfinder */}
          <div className="flex-1 m-2 rounded-xl overflow-hidden relative" style={{ background: "#0A183A" }}>
            {/* Tire silhouette */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Disc size={80} className="text-[#348CCB] animate-pulse" strokeWidth={1.5} />
            </div>
            {/* Scan line */}
            <div
              className="absolute left-0 right-0 h-0.5 animate-scan"
              style={{
                background: "linear-gradient(90deg, transparent, #348CCB, transparent)",
                boxShadow: "0 0 12px #348CCB",
              }}
            />
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#348CCB]" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#348CCB]" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#348CCB]" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#348CCB]" />
          </div>
          {/* Capture button */}
          <div className="flex items-center justify-center pb-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#1E76B6] flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-[#1E76B6]" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating data labels */}
      <div className="absolute top-8 -right-4 px-3 py-1.5 rounded-full text-[10px] font-bold animate-float-1"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.4)", color: "#348CCB" }}>
        12.5 mm
      </div>
      <div className="absolute bottom-16 -left-2 px-3 py-1.5 rounded-full text-[10px] font-bold animate-float-2"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.4)", color: "#348CCB" }}>
        Pos. 3
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 8%; }
          50% { top: 92%; }
          100% { top: 8%; }
        }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .animate-scan { animation: scan 2.5s ease-in-out infinite; }
        .animate-pop-in { animation: pop-in 0.5s ease-out; }
        .animate-float-1 { animation: float-1 3s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 3.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Step 2: AI analyzes ─────────────────────────────────────────────────────
function AnalyzeStep() {
  return (
    <div className="relative w-full h-full flex items-center justify-center animate-pop-in">
      {/* Central AI brain */}
      <div className="relative w-40 h-40">
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full animate-ping-slow"
          style={{ background: "rgba(52,140,203,0.15)" }} />
        <div className="absolute inset-4 rounded-full animate-ping-slow-2"
          style={{ background: "rgba(52,140,203,0.2)" }} />

        {/* Core */}
        <div className="absolute inset-8 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #348CCB, #1E76B6)",
            boxShadow: "0 0 40px rgba(52,140,203,0.6), inset 0 2px 12px rgba(255,255,255,0.2)",
          }}>
          <Cpu size={42} className="text-white" strokeWidth={1.5} />
        </div>

        {/* Orbiting data points */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-[#348CCB] animate-orbit"
            style={{
              boxShadow: "0 0 12px #348CCB",
              transform: `rotate(${deg}deg) translateX(80px)`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Data flowing lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.6 }}>
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#348CCB" stopOpacity="0" />
            <stop offset="50%" stopColor="#348CCB" stopOpacity="1" />
            <stop offset="100%" stopColor="#348CCB" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" className="animate-dash" />
        <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" className="animate-dash-reverse" />
        <line x1="0%" y1="70%" x2="100%" y2="70%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" className="animate-dash" />
      </svg>

      {/* Status badges */}
      <div className="absolute top-4 left-4 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 animate-fade-loop"
        style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
        <Activity size={10} /> Profundidad OK
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 animate-fade-loop-2"
        style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
        <Activity size={10} /> Alineacion
      </div>
      <div className="absolute bottom-4 left-4 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 animate-fade-loop-3"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.3)", color: "#348CCB" }}>
        <Sparkles size={10} /> CPK calc
      </div>

      <style jsx>{`
        @keyframes ping-slow { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.4); opacity: 0; } }
        @keyframes orbit { from { transform: rotate(0deg) translateX(80px) rotate(0deg); } to { transform: rotate(360deg) translateX(80px) rotate(-360deg); } }
        @keyframes dash { to { stroke-dashoffset: -16; } }
        @keyframes pop-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes fade-loop { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .animate-ping-slow { animation: ping-slow 2s ease-out infinite; }
        .animate-ping-slow-2 { animation: ping-slow 2s ease-out infinite 0.6s; }
        .animate-orbit { animation: orbit 6s linear infinite; transform-origin: -80px center; }
        .animate-dash { animation: dash 1s linear infinite; }
        .animate-dash-reverse { animation: dash 1.5s linear infinite reverse; }
        .animate-pop-in { animation: pop-in 0.5s ease-out; }
        .animate-fade-loop { animation: fade-loop 2s ease-in-out infinite; }
        .animate-fade-loop-2 { animation: fade-loop 2s ease-in-out infinite 0.5s; }
        .animate-fade-loop-3 { animation: fade-loop 2s ease-in-out infinite 1s; }
      `}</style>
    </div>
  );
}

// ── Step 3: Insights dashboard ───────────────────────────────────────────────
function InsightsStep() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 px-6 animate-pop-in">
      {/* Header card */}
      <div className="w-full max-w-[280px] rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold tracking-widest text-[#348CCB]">CPK PROYECTADO</span>
          <span className="text-[9px] font-bold text-white/40">vs flota</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-white">$87</span>
          <span className="text-xs font-bold text-[#22c55e]">-23%</span>
        </div>
        {/* Mini chart */}
        <svg className="w-full h-8" viewBox="0 0 200 32">
          <polyline
            points="0,28 25,22 50,24 75,18 100,16 125,12 150,14 175,8 200,4"
            fill="none"
            stroke="#348CCB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw"
          />
          <polyline
            points="0,28 25,22 50,24 75,18 100,16 125,12 150,14 175,8 200,4"
            fill="url(#chartFill)"
            stroke="none"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#348CCB" />
              <stop offset="100%" stopColor="#348CCB" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Two metrics side by side */}
      <div className="flex gap-3 w-full max-w-[280px]">
        <div className="flex-1 rounded-xl p-3"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle2 size={11} className="text-[#22c55e]" />
            <span className="text-[9px] font-bold text-[#22c55e]">VIDA UTIL</span>
          </div>
          <div className="text-lg font-extrabold text-white">42K km</div>
          <div className="text-[9px] text-white/50">restantes</div>
        </div>
        <div className="flex-1 rounded-xl p-3"
          style={{ background: "rgba(52,140,203,0.12)", border: "1px solid rgba(52,140,203,0.3)" }}>
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp size={11} className="text-[#348CCB]" />
            <span className="text-[9px] font-bold text-[#348CCB]">AHORRO</span>
          </div>
          <div className="text-lg font-extrabold text-white">$2.4M</div>
          <div className="text-[9px] text-white/50">este mes</div>
        </div>
      </div>

      {/* Recommendation chip */}
      <div className="rounded-full px-4 py-2 flex items-center gap-2 animate-pulse-soft"
        style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", boxShadow: "0 4px 16px rgba(30,118,182,0.4)" }}>
        <Sparkles size={14} className="text-white" />
        <span className="text-xs font-bold text-white">Programar reencauche en 30 dias</span>
      </div>

      <style jsx>{`
        @keyframes pop-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes draw { from { stroke-dasharray: 400; stroke-dashoffset: 400; } to { stroke-dasharray: 400; stroke-dashoffset: 0; } }
        @keyframes pulse-soft { 0%, 100% { box-shadow: 0 4px 16px rgba(30,118,182,0.4); } 50% { box-shadow: 0 4px 28px rgba(30,118,182,0.7); } }
        .animate-pop-in { animation: pop-in 0.5s ease-out; }
        .animate-draw { animation: draw 1.5s ease-out forwards; }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Step 4: Marketplace cards ───────────────────────────────────────────────
function BuyStep() {
  const tires = [
    { brand: "Michelin", model: "XZE2+", price: "$1.85M", best: true },
    { brand: "Bridgestone", model: "M729", price: "$1.62M", best: false },
    { brand: "Continental", model: "HSU", price: "$1.74M", best: false },
  ];
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-6 animate-pop-in">
      <div className="flex items-center gap-2 mb-2">
        <Wifi size={14} className="text-[#348CCB]" />
        <span className="text-[10px] font-bold tracking-widest text-[#348CCB]">RECOMENDADAS PARA TI</span>
      </div>

      {tires.map((t, i) => (
        <div
          key={i}
          className="w-full max-w-[300px] rounded-xl p-3 flex items-center gap-3 transition-all hover:scale-[1.02] animate-slide-in"
          style={{
            background: t.best ? "rgba(52,140,203,0.15)" : "rgba(255,255,255,0.06)",
            border: t.best ? "1px solid rgba(52,140,203,0.5)" : "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            animationDelay: `${i * 0.15}s`,
          }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(52,140,203,0.2)" }}>
            <Disc size={18} className="text-[#348CCB]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">{t.brand}</span>
              {t.best && (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                  style={{ background: "#22c55e", color: "white" }}>
                  MEJOR CPK
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/50">{t.model} · 295/80R22.5</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-extrabold text-white">{t.price}</div>
            <div className="text-[9px] text-white/40">unidad</div>
          </div>
        </div>
      ))}

      <button className="mt-2 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse-soft"
        style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", color: "white", boxShadow: "0 4px 16px rgba(30,118,182,0.4)" }}>
        <ShoppingCart size={12} />
        Comprar ahora
        <ArrowRight size={12} />
      </button>

      <style jsx>{`
        @keyframes pop-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse-soft { 0%, 100% { box-shadow: 0 4px 16px rgba(30,118,182,0.4); } 50% { box-shadow: 0 4px 28px rgba(30,118,182,0.7); } }
        .animate-pop-in { animation: pop-in 0.5s ease-out; }
        .animate-slide-in { animation: slide-in 0.5s ease-out forwards; opacity: 0; }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Floating tire decorations ────────────────────────────────────────────────
function FloatingTires() {
  return (
    <>
      <div className="absolute -top-6 -left-6 animate-spin-slow opacity-20 pointer-events-none">
        <Disc size={48} className="text-[#348CCB]" strokeWidth={1.2} />
      </div>
      <div className="absolute -bottom-4 -right-4 animate-spin-slow-reverse opacity-20 pointer-events-none">
        <Disc size={56} className="text-[#348CCB]" strokeWidth={1.2} />
      </div>
      <div className="absolute top-1/2 -right-8 animate-bob opacity-15 pointer-events-none">
        <Disc size={32} className="text-[#1E76B6]" strokeWidth={1.5} />
      </div>

      <style jsx>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-slow-reverse { animation: spin-slow 28s linear infinite reverse; }
        .animate-bob { animation: bob 4s ease-in-out infinite; }
      `}</style>
    </>
  );
}
