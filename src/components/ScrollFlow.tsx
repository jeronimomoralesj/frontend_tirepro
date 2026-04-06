"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Cpu,
  TrendingUp,
  ShoppingCart,
  Disc,
  Activity,
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
    title: "Inspecciona con tu teléfono",
    description:
      "Toma una foto del neumático desde tu celular. Sin manuales, sin Excel, sin demoras. La inspección queda guardada al instante con la profundidad, posición y estado.",
    icon: Camera,
  },
  {
    id: "analyze",
    label: "Analiza",
    title: "La IA lee la llanta",
    description:
      "Nuestros agentes de IA analizan profundidad, desgaste y patrón. Detectan alineación, presión baja y problemas mecánicos antes que tú, y te alertan en tiempo real.",
    icon: Cpu,
  },
  {
    id: "decide",
    label: "Decide y compra",
    title: "Insights y recomendaciones de compra",
    description:
      "Ves CPK proyectado, vida útil restante y ahorro en pesos. Cuando llegue el momento, compras llantas reales del mercado colombiano directamente en nuestro marketplace.",
    icon: ShoppingCart,
  },
];

export default function ScrollFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Continuous scroll listener: pick the step whose center is closest to
  // the viewport center. More reliable than IntersectionObserver and feels
  // smoother because it updates on every scroll event.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;

    const updateActive = () => {
      rafId = null;
      const viewportCenter = window.innerHeight / 2;
      let closestIdx = 0;
      let closestDist = Infinity;
      stepRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const dist = Math.abs(elCenter - viewportCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });
      setActiveStep(closestIdx);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(updateActive);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateActive(); // initial
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
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

      {/* ────────────────────────────────────────────────────────────────────
          DESKTOP: scroll-driven sticky layout (scroll to advance)
          ──────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-12 items-start">
          {/* LEFT: scrollable step list */}
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isActive = i === activeStep;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  ref={(el) => { stepRefs.current[i] = el; }}
                  className="min-h-[80vh] flex items-center"
                >
                  <div
                    className="w-full rounded-2xl p-8 transition-all duration-700"
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
                      opacity: isActive ? 1 : 0.35,
                      transform: isActive ? "translateX(0) scale(1)" : "translateX(-8px) scale(0.98)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700"
                        style={{
                          background: isActive
                            ? "linear-gradient(135deg, #1E76B6, #173D68)"
                            : "rgba(30,118,182,0.08)",
                          boxShadow: isActive
                            ? "0 8px 20px rgba(30,118,182,0.35)"
                            : "none",
                        }}
                      >
                        <Icon size={26} style={{ color: isActive ? "#fff" : "#1E76B6" }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-[11px] font-bold tracking-widest uppercase"
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
                            fontSize: isActive ? "clamp(1.6rem, 2.8vw, 2.1rem)" : "clamp(1.2rem, 1.9vw, 1.5rem)",
                            color: "#0A183A",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.15,
                          }}
                        >
                          {step.title}
                        </h3>
                        <p
                          className="text-base leading-relaxed transition-all duration-700"
                          style={{
                            color: "rgba(10,24,58,0.65)",
                            maxHeight: isActive ? "300px" : "0px",
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

          {/* RIGHT: sticky animated visual */}
          <div className="sticky top-24 self-start">
            <div className="flex items-center justify-center" style={{ minHeight: "70vh" }}>
              <FlowVisual activeStep={activeStep} />
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          MOBILE / TABLET: stacked cards with inline visuals (no sticky)
          Each step shows its text + its visual right below, in sequence.
          ──────────────────────────────────────────────────────────────────── */}
      <div className="lg:hidden max-w-2xl mx-auto px-4 sm:px-6 space-y-12">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="space-y-5">
              {/* Step label + title */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
                  style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.2)" }}>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                  >
                    <Icon size={14} className="text-white" />
                  </div>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-[#1E76B6]">
                    0{i + 1} · {step.label}
                  </span>
                </div>
                <h3 className="font-extrabold mb-2"
                  style={{
                    fontSize: "clamp(1.35rem, 5vw, 1.8rem)",
                    color: "#0A183A",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                  }}>
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed mx-auto max-w-md"
                  style={{ color: "rgba(10,24,58,0.65)" }}>
                  {step.description}
                </p>
              </div>

              {/* Inline visual */}
              <div className="flex items-center justify-center">
                <MobileVisual stepIndex={i} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Mobile renders a scaled-down version of FlowVisual showing the right step
function MobileVisual({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="w-full max-w-sm">
      <FlowVisual activeStep={stepIndex} />
    </div>
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
          {activeStep === 2 && <DecideAndBuyStep />}
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

// ── Step 2: AI Notifications panel (mirrors dashboard NotificacionesTab) ────
function AnalyzeStep() {
  // Mirror the real dashboard notification card style
  const notifs = [
    {
      severity: "critical",
      label: "Crítica",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      title: "Profundidad bajo límite",
      message: "Pos. 3 · Int 2.1 · Cen 1.8 · Ext 2.0 mm",
      delay: "0s",
    },
    {
      severity: "warning",
      label: "Urgente",
      color: "#f97316",
      bg: "rgba(249,115,22,0.12)",
      title: "Desgaste irregular detectado",
      message: "Posible problema de alineación",
      delay: "0.15s",
    },
    {
      severity: "info",
      label: "Atención",
      color: "#eab308",
      bg: "rgba(234,179,8,0.12)",
      title: "Programar rotación en 30 días",
      message: "CPK proyectado: $94 / km",
      delay: "0.3s",
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-4 sm:px-6 py-4 hv-pop-in">
      {/* Header — vehicle group like the real dashboard */}
      <div
        className="w-full max-w-[300px] rounded-xl px-3 py-2 flex items-center gap-2"
        style={{
          background: "linear-gradient(135deg, #0A183A, #173D68)",
          border: "1px solid rgba(52,140,203,0.3)",
        }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(52,140,203,0.25)" }}
        >
          <Cpu size={12} className="text-[#348CCB]" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] font-black tracking-wider text-white"
            style={{ fontFamily: "monospace" }}
          >
            ABC-123
          </div>
          <div className="text-[8px] text-white/50">3 alertas activas</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[8px] font-bold text-white/70">EN VIVO</span>
        </div>
      </div>

      {/* Notification cards — staggered slide-in */}
      {notifs.map((n, i) => (
        <div
          key={i}
          className="w-full max-w-[300px] rounded-xl p-2.5 flex items-start gap-2 hv-slide-in-1"
          style={{
            background: "rgba(255,255,255,0.95)",
            borderLeft: `3px solid ${n.color}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            animationDelay: n.delay,
          }}
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: n.bg }}
          >
            <Activity size={13} style={{ color: n.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
                style={{ background: n.bg, color: n.color }}
              >
                {n.label}
              </span>
            </div>
            <div className="text-[11px] font-bold text-[#0A183A] leading-tight">
              {n.title}
            </div>
            <div className="text-[9px] text-gray-500 mt-0.5 leading-tight">
              {n.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Step 3: Decide & Buy — marketplace-style cards ─────────────────────────
function DecideAndBuyStep() {
  const tires = [
    {
      brand: "Michelin",
      model: "XZE2+",
      dim: "295/80R22.5",
      price: "$1.850.000",
      cpk: "$87",
      best: true,
      delay: "0s",
    },
    {
      brand: "Bridgestone",
      model: "M729",
      dim: "295/80R22.5",
      price: "$1.620.000",
      cpk: "$94",
      best: false,
      delay: "0.15s",
    },
    {
      brand: "Continental",
      model: "HSU",
      dim: "295/80R22.5",
      price: "$1.740.000",
      cpk: "$91",
      best: false,
      delay: "0.3s",
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-4 sm:px-6 py-4 hv-pop-in">
      {/* Insights header strip */}
      <div className="w-full max-w-[300px] flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-[#348CCB]" />
          <span className="text-[10px] font-black tracking-widest text-[#348CCB]">
            INSIGHTS &amp; MARKETPLACE
          </span>
        </div>
        <span className="text-[9px] font-bold text-white/50">3 opciones</span>
      </div>

      {/* Mini metrics row */}
      <div className="w-full max-w-[300px] grid grid-cols-2 gap-2 mb-1">
        <div
          className="rounded-lg p-2"
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <div className="text-[8px] font-bold text-[#22c55e] tracking-wider">AHORRO</div>
          <div className="text-sm font-extrabold text-white leading-tight">$2.4M</div>
        </div>
        <div
          className="rounded-lg p-2"
          style={{
            background: "rgba(52,140,203,0.12)",
            border: "1px solid rgba(52,140,203,0.3)",
          }}
        >
          <div className="text-[8px] font-bold text-[#348CCB] tracking-wider">VIDA ÚTIL</div>
          <div className="text-sm font-extrabold text-white leading-tight">42K km</div>
        </div>
      </div>

      {/* Marketplace product cards */}
      {tires.map((t, i) => (
        <div
          key={i}
          className="w-full max-w-[300px] rounded-xl p-2.5 flex items-center gap-2.5 transition-all hover:scale-[1.02] hv-slide-in-1 relative"
          style={{
            background: "rgba(255,255,255,0.97)",
            border: t.best
              ? "1.5px solid #348CCB"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: t.best
              ? "0 8px 24px rgba(52,140,203,0.4), 0 0 0 4px rgba(52,140,203,0.1)"
              : "0 4px 12px rgba(0,0,0,0.15)",
            animationDelay: t.delay,
          }}
        >
          {/* Best badge */}
          {t.best && (
            <div
              className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black"
              style={{
                background: "linear-gradient(135deg, #1E76B6, #173D68)",
                color: "white",
                boxShadow: "0 2px 8px rgba(30,118,182,0.5)",
              }}
            >
              MEJOR CPK
            </div>
          )}

          {/* Tire image placeholder */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}
          >
            <Disc size={24} className="text-[#0A183A]" strokeWidth={1.4} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400">
              {t.brand}
            </div>
            <div className="text-xs font-bold text-[#0A183A] leading-tight truncate">
              {t.model}
            </div>
            <div className="text-[9px] text-gray-500">{t.dim}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="px-1 py-0.5 rounded text-[7px] font-bold"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                }}
              >
                CPK {t.cpk}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-black text-[#0A183A] leading-tight">
              {t.price}
            </div>
            <div className="text-[8px] text-gray-400">/unidad</div>
          </div>
        </div>
      ))}
    </div>
  );
}
