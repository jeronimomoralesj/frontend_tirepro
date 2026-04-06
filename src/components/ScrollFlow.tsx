"use client";

import { useState, useEffect, useRef } from "react";
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
import "./heroAnimations.css";

/**
 * Tab-based "How it works" section, inspired by llamaindex.ai.
 * Auto-rotates every 6s, can also be clicked manually. Each tab swaps
 * the right-side animated visual.
 */

const STEPS = [
  {
    id: "capture",
    label: "Captura",
    title: "Inspecciona con tu telefono",
    description:
      "Toma una foto del neumatico desde tu cel. Sin manuales, sin Excel, sin demoras. La inspeccion queda guardada al instante.",
    icon: Camera,
  },
  {
    id: "analyze",
    label: "Analiza",
    title: "La IA lee la llanta",
    description:
      "Nuestros agentes de IA analizan profundidad, desgaste y patron. Detectan alineacion, presion baja y problemas mecanicos antes que tu.",
    icon: Cpu,
  },
  {
    id: "insights",
    label: "Decide",
    title: "Recibes insights accionables",
    description:
      "Ves CPK proyectado, vida util restante, ahorro en pesos y la recomendacion exacta: cambio, reencauche o rotacion.",
    icon: TrendingUp,
  },
  {
    id: "buy",
    label: "Reemplaza",
    title: "Compra en el marketplace",
    description:
      "Cuando llegue el momento, TirePro te muestra opciones reales del mercado colombiano con precios actualizados. Compras directo, sin intermediarios.",
    icon: ShoppingCart,
  },
];

export default function ScrollFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // IntersectionObserver: track which step is in the middle of the viewport
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observers: IntersectionObserver[] = [];
    stepRefs.current.forEach((el, idx) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(idx);
        },
        {
          // Trigger when step crosses the middle horizontal band of the viewport
          rootMargin: "-45% 0px -45% 0px",
          threshold: 0,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <section
      id="producto"
      className="relative w-full pt-20 sm:pt-28 md:pt-36 pb-20"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #f7fafd 100%)" }}
      aria-labelledby="flow-heading"
    >
      {/* Section heading */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 sm:mb-20">
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: "#1E76B6", letterSpacing: "0.18em" }}
          >
            COMO FUNCIONA
          </p>
          <h2
            id="flow-heading"
            className="font-extrabold leading-tight mb-5"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              color: "#0A183A",
              letterSpacing: "-0.03em",
            }}
          >
            De una foto a un ahorro real
            <br />
            <span style={{ color: "#1E76B6" }}>en cuatro pasos</span>
          </h2>
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto"
            style={{ color: "rgba(10,24,58,0.55)" }}
          >
            Cada llanta cuenta una historia. TirePro la lee, la analiza y te
            dice exactamente que hacer.
          </p>
        </div>
      </div>

      {/* Scroll-driven layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* LEFT: scrollable step list — each step takes a viewport of scroll */}
          <div className="lg:order-1 space-y-0">
            {STEPS.map((step, i) => {
              const isActive = i === activeStep;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  ref={(el) => { stepRefs.current[i] = el; }}
                  className="min-h-[70vh] flex items-center"
                >
                  <div
                    className="w-full rounded-2xl p-6 sm:p-8 transition-all duration-700"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, rgba(30,118,182,0.08), rgba(52,140,203,0.03))"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(30,118,182,0.25)"
                        : "1px solid rgba(10,24,58,0.06)",
                      boxShadow: isActive
                        ? "0 12px 32px rgba(30,118,182,0.1)"
                        : "none",
                      opacity: isActive ? 1 : 0.4,
                      transform: isActive ? "translateX(0) scale(1)" : "translateX(-8px) scale(0.98)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-700"
                        style={{
                          background: isActive
                            ? "linear-gradient(135deg, #1E76B6, #173D68)"
                            : "rgba(30,118,182,0.08)",
                          boxShadow: isActive
                            ? "0 8px 20px rgba(30,118,182,0.35)"
                            : "none",
                        }}
                      >
                        <Icon size={22} style={{ color: isActive ? "#fff" : "#1E76B6" }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-bold tracking-widest uppercase"
                            style={{
                              color: isActive ? "#1E76B6" : "rgba(10,24,58,0.4)",
                              letterSpacing: "0.16em",
                            }}
                          >
                            0{i + 1} · {step.label}
                          </span>
                        </div>
                        <h3
                          className="font-extrabold mb-3 transition-all duration-700"
                          style={{
                            fontSize: isActive ? "clamp(1.4rem, 2.5vw, 1.85rem)" : "clamp(1.1rem, 1.8vw, 1.35rem)",
                            color: "#0A183A",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.2,
                          }}
                        >
                          {step.title}
                        </h3>
                        <p
                          className="text-sm sm:text-base leading-relaxed transition-all duration-700"
                          style={{
                            color: "rgba(10,24,58,0.65)",
                            maxHeight: isActive ? "200px" : "0px",
                            opacity: isActive ? 1 : 0,
                            overflow: "hidden",
                          }}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: sticky animated visual that stays pinned while user scrolls steps */}
          <div className="hidden lg:block lg:order-2 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
              <FlowVisual activeStep={activeStep} />
            </div>
          </div>
        </div>

        {/* Mobile: show one fixed visual at the top of the section */}
        <div className="lg:hidden flex items-center justify-center mt-12">
          <FlowVisual activeStep={activeStep} />
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Flow visual — animated panel that changes per step
// ═══════════════════════════════════════════════════════════════════════════
function FlowVisual({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative w-full max-w-md aspect-square">
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #0A183A 0%, #173D68 50%, #1E76B6 100%)",
          boxShadow:
            "0 30px 80px rgba(10,24,58,0.3), 0 0 0 1px rgba(52,140,203,0.2)",
        }}
      >
        {/* Grid */}
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

        <div className="absolute inset-0 flex items-center justify-center" key={activeStep}>
          {activeStep === 0 && <CaptureStep />}
          {activeStep === 1 && <AnalyzeStep />}
          {activeStep === 2 && <InsightsStep />}
          {activeStep === 3 && <BuyStep />}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Phone capture ───────────────────────────────────────────────────
function CaptureStep() {
  return (
    <div className="relative w-full h-full flex items-center justify-center hv-pop-in">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-2xl" style={{ background: "#000" }} />
        <div className="absolute inset-2 mt-5 rounded-2xl bg-[#F1F5F9] flex flex-col">
          <div className="flex-1 m-2 rounded-xl overflow-hidden relative" style={{ background: "#0A183A" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Disc size={80} className="text-[#348CCB] animate-pulse" strokeWidth={1.5} />
            </div>
            <div className="absolute left-0 right-0 h-0.5 hv-scan" style={{ background: "linear-gradient(90deg, transparent, #348CCB, transparent)", boxShadow: "0 0 12px #348CCB" }} />
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#348CCB]" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#348CCB]" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#348CCB]" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#348CCB]" />
          </div>
          <div className="flex items-center justify-center pb-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#1E76B6] flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-[#1E76B6]" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-8 -right-4 px-3 py-1.5 rounded-full text-[10px] font-bold hv-float-1"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.4)", color: "#348CCB" }}>
        12.5 mm
      </div>
      <div className="absolute bottom-16 -left-2 px-3 py-1.5 rounded-full text-[10px] font-bold hv-float-2"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.4)", color: "#348CCB" }}>
        Pos. 3
      </div>

    </div>
  );
}

// ── Step 2: AI brain ────────────────────────────────────────────────────────
function AnalyzeStep() {
  return (
    <div className="relative w-full h-full flex items-center justify-center hv-pop-in">
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full hv-ping-1" style={{ background: "rgba(52,140,203,0.15)" }} />
        <div className="absolute inset-4 rounded-full hv-ping-2" style={{ background: "rgba(52,140,203,0.2)" }} />
        <div className="absolute inset-8 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #348CCB, #1E76B6)", boxShadow: "0 0 40px rgba(52,140,203,0.6), inset 0 2px 12px rgba(255,255,255,0.2)" }}>
          <Cpu size={42} className="text-white" strokeWidth={1.5} />
        </div>
      </div>

      <div className="absolute top-4 left-4 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 hv-fade-loop"
        style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
        <Activity size={10} /> Profundidad OK
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 hv-fade-loop-2"
        style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
        <Activity size={10} /> Alineacion
      </div>
      <div className="absolute bottom-4 left-4 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 hv-fade-loop-3"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.3)", color: "#348CCB" }}>
        <Sparkles size={10} /> CPK calc
      </div>
      <div className="absolute bottom-4 right-4 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 hv-fade-loop"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.3)", color: "#348CCB", animationDelay: "1.5s" }}>
        <Cpu size={10} /> 6 agentes
      </div>

    </div>
  );
}

// ── Step 3: Insights ────────────────────────────────────────────────────────
function InsightsStep() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 px-6 hv-pop-in">
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
        <svg className="w-full h-8" viewBox="0 0 200 32">
          <defs>
            <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#348CCB" />
              <stop offset="100%" stopColor="#348CCB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points="0,28 25,22 50,24 75,18 100,16 125,12 150,14 175,8 200,4" fill="none" stroke="#348CCB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hv-draw-chart" />
        </svg>
      </div>

      <div className="flex gap-3 w-full max-w-[280px]">
        <div className="flex-1 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle2 size={11} className="text-[#22c55e]" />
            <span className="text-[9px] font-bold text-[#22c55e]">VIDA UTIL</span>
          </div>
          <div className="text-lg font-extrabold text-white">42K km</div>
          <div className="text-[9px] text-white/50">restantes</div>
        </div>
        <div className="flex-1 rounded-xl p-3" style={{ background: "rgba(52,140,203,0.12)", border: "1px solid rgba(52,140,203,0.3)" }}>
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp size={11} className="text-[#348CCB]" />
            <span className="text-[9px] font-bold text-[#348CCB]">AHORRO</span>
          </div>
          <div className="text-lg font-extrabold text-white">$2.4M</div>
          <div className="text-[9px] text-white/50">este mes</div>
        </div>
      </div>

      <div className="rounded-full px-4 py-2 flex items-center gap-2 hv-pulse-soft"
        style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", boxShadow: "0 4px 16px rgba(30,118,182,0.4)" }}>
        <Sparkles size={14} className="text-white" />
        <span className="text-xs font-bold text-white">Programar reencauche en 30 dias</span>
      </div>

    </div>
  );
}

// ── Step 4: Marketplace ─────────────────────────────────────────────────────
function BuyStep() {
  const tires = [
    { brand: "Michelin", model: "XZE2+", price: "$1.85M", best: true },
    { brand: "Bridgestone", model: "M729", price: "$1.62M", best: false },
    { brand: "Continental", model: "HSU", price: "$1.74M", best: false },
  ];
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-6 hv-pop-in">
      <div className="flex items-center gap-2 mb-2">
        <Wifi size={14} className="text-[#348CCB]" />
        <span className="text-[10px] font-bold tracking-widest text-[#348CCB]">RECOMENDADAS PARA TI</span>
      </div>

      {tires.map((t, i) => (
        <div
          key={i}
          className="w-full max-w-[300px] rounded-xl p-3 flex items-center gap-3 transition-all hover:scale-[1.02] hv-slide-in-1"
          style={{
            background: t.best ? "rgba(52,140,203,0.15)" : "rgba(255,255,255,0.06)",
            border: t.best ? "1px solid rgba(52,140,203,0.5)" : "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            animationDelay: `${i * 0.15}s`,
          }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(52,140,203,0.2)" }}>
            <Disc size={18} className="text-[#348CCB]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">{t.brand}</span>
              {t.best && (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: "#22c55e", color: "white" }}>
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

      <button className="mt-2 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 hv-pulse-soft"
        style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", color: "white", boxShadow: "0 4px 16px rgba(30,118,182,0.4)" }}>
        <ShoppingCart size={12} />
        Comprar ahora
        <ArrowRight size={12} />
      </button>

    </div>
  );
}
