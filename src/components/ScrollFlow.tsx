"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Camera,
  Cpu,
  Disc,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import "./heroAnimations.css";

/**
 * "De una foto a un ahorro real en cuatro pasos"
 *
 * Scroll-driven sticky section. Inspired by llamaindex.ai / stripe-style
 * narrative scrolls. Auto-rotates on mobile (stacked), pin-locks on
 * desktop where the right visual swaps as the user scrolls past each
 * step on the left.
 *
 * 4 chapters:
 *   1. Captura      — phone + (optional) real video of inspecting a tire
 *   2. Analiza      — IA notifications
 *   3. Decide       — marketplace + insights
 *   4. Optimiza     — continuous improvement / accumulated savings
 *
 * Plus:
 *   • LiveStrip — ticker at top with vivid running numbers
 *   • Step progress bar — fills as you scroll through chapters
 *   • Per-step KPI chip on the visual frame
 */

const STEPS = [
  {
    id: "capture",
    label: "Captura",
    title: "Inspecciona con tu teléfono",
    description:
      "Toma una foto del neumático desde tu celular. Sin manuales, sin Excel, sin demoras. La inspección queda guardada al instante con la profundidad, posición y estado.",
    icon: Camera,
    kpi: "1 minuto por llanta",
    kpiTone: "#1E76B6",
  },
  {
    id: "analyze",
    label: "Analiza",
    title: "La IA lee la llanta",
    description:
      "Nuestros agentes de IA analizan profundidad, desgaste y patrón. Detectan alineación, presión baja y problemas mecánicos antes que tú, y te alertan en tiempo real.",
    icon: Cpu,
    kpi: "95% precisión",
    kpiTone: "#62b8f0",
  },
  {
    id: "decide",
    label: "Decide y compra",
    title: "Insights y recomendaciones de compra",
    description:
      "Ves CPK proyectado, vida útil restante y ahorro en pesos. Cuando llegue el momento, compras llantas reales del mercado colombiano directamente en nuestro marketplace.",
    icon: ShoppingCart,
    kpi: "−$118 / km",
    kpiTone: "#22c55e",
  },
  {
    id: "optimize",
    label: "Optimiza",
    title: "TirePro aprende con cada vida extra",
    description:
      "Cada inspección y cada compra alimentan los modelos. Tu flota suma vidas adicionales por llanta, baja CPK mes tras mes, y la plataforma se vuelve más precisa para tu operación.",
    icon: Sparkles,
    kpi: "+3 vidas / llanta",
    kpiTone: "#f59e0b",
  },
];

export default function ScrollFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress]     = useState(0); // 0..1 across the whole section
  const stepRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // Continuous scroll listener: pick the step whose center is closest to
  // the viewport center, plus compute overall scroll progress for the bar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      const vh = window.innerHeight;
      const vCenter = vh / 2;

      // Closest step
      let closestIdx  = 0;
      let closestDist = Infinity;
      stepRefs.current.forEach((el, idx) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - vCenter);
        if (d < closestDist) {
          closestDist = d;
          closestIdx  = idx;
        }
      });
      setActiveStep(closestIdx);

      // Section progress
      if (sectionRef.current) {
        const r = sectionRef.current.getBoundingClientRect();
        const total = r.height + vh;
        const traveled = vh - r.top;
        setProgress(Math.max(0, Math.min(1, traveled / total)));
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="producto"
      ref={sectionRef}
      className="relative w-full pt-20 sm:pt-28 md:pt-36 pb-20"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #f7fafd 100%)" }}
      aria-labelledby="flow-heading"
    >
      {/* ───────────────── Heading + live ticker + step bar ───────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
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
            Cada llanta cuenta una historia. TirePro la lee, la analiza y te dice exactamente qué hacer.
          </p>
        </div>

        <LiveStrip />
        <StepProgress
          activeStep={activeStep}
          steps={STEPS}
          fill={progress}
        />
      </div>

      {/* ───────────────── DESKTOP scroll-pinned layout ───────────────── */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
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
                        ? "0 12px 32px rgba(30,118,182,0.10)"
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
                          {/* Inline KPI chip — appears only when step is active */}
                          {isActive && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider hv-pop-in"
                              style={{
                                background: `${step.kpiTone}1f`,
                                color: step.kpiTone,
                                border: `1px solid ${step.kpiTone}33`,
                              }}
                            >
                              {step.kpi}
                            </span>
                          )}
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

          {/* RIGHT: sticky animated visual.
              Container locks to the viewport height (minus the top offset)
              so the square mock can never overflow vertically — that was
              the "too big" feeling the user reported. We size FlowVisual
              with min(28rem, viewport-minus-chrome) so it scales down on
              shorter laptop screens without us hard-coding a number. */}
          <div className="sticky top-24 self-start">
            <div
              className="flex items-center justify-center"
              style={{ height: "calc(100vh - 8rem)" }}
            >
              <FlowVisual activeStep={activeStep} />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── MOBILE / TABLET stacked ───────────────── */}
      <div className="lg:hidden max-w-2xl mx-auto px-4 sm:px-6 space-y-12 mt-10">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="space-y-5">
              <div className="text-center">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
                  style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.2)" }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                  >
                    <Icon size={14} className="text-white" />
                  </div>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-[#1E76B6]">
                    0{i + 1} · {step.label}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
                    style={{
                      background: `${step.kpiTone}1f`,
                      color: step.kpiTone,
                      border: `1px solid ${step.kpiTone}33`,
                    }}
                  >
                    {step.kpi}
                  </span>
                </div>
                <h3
                  className="font-extrabold mb-2"
                  style={{
                    fontSize: "clamp(1.35rem, 5vw, 1.8rem)",
                    color: "#0A183A",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm sm:text-base leading-relaxed mx-auto max-w-md"
                  style={{ color: "rgba(10,24,58,0.65)" }}
                >
                  {step.description}
                </p>
              </div>

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

// ═══════════════════════════════════════════════════════════════════════════
// LiveStrip — small ticker showing pulsing operational numbers
// ═══════════════════════════════════════════════════════════════════════════

function LiveStrip() {
  // Lightweight tick: increments inspections counter by 1-3 every 1.5s so the
  // section *feels* live without burning CPU.
  const [insp, setInsp] = useState(184217);
  useEffect(() => {
    const id = setInterval(() => {
      setInsp((n) => n + Math.floor(1 + Math.random() * 3));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const items = [
    { label: "INSPECCIONES MES",   value: insp.toLocaleString("es-CO"), live: true,  color: "#22c55e" },
    { label: "LLANTAS VIGILADAS",  value: "95.412",                     live: false, color: "#1E76B6" },
    { label: "ALERTAS HOY",        value: "1.284",                      live: true,  color: "#f97316" },
    { label: "AHORRO ACUMULADO",   value: "$2.4 B COP",                 live: false, color: "#62b8f0" },
  ];

  return (
    <div
      className="relative max-w-5xl mx-auto rounded-2xl px-4 sm:px-6 py-3 sm:py-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
        boxShadow: "0 16px 36px -16px rgba(10,24,58,0.35)",
        border: "1px solid rgba(98,184,240,0.15)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(98,184,240,0.20) 1px, transparent 1px), linear-gradient(90deg, rgba(98,184,240,0.20) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
        }}
      />
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            {it.live && (
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
                  style={{ background: it.color }}
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ background: it.color }}
                />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] font-bold tracking-widest uppercase text-white/45">
                {it.label}
              </p>
              <p className="text-sm sm:text-base font-black text-white tabular-nums leading-tight truncate">
                {it.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// StepProgress — segmented bar that fills as you scroll the section
// ═══════════════════════════════════════════════════════════════════════════

function StepProgress({
  activeStep,
  steps,
  fill,
}: {
  activeStep: number;
  steps: typeof STEPS;
  fill: number;
}) {
  // We use `fill` (0..1) so the active segment grows smoothly while you
  // scroll between chapters; future segments stay empty until reached.
  const segments = steps.length;
  const segmentSize = 1 / segments;
  return (
    <div className="hidden sm:block max-w-5xl mx-auto mt-6">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${segments}, 1fr)` }}>
        {steps.map((s, i) => {
          const start = i * segmentSize;
          const local = Math.max(0, Math.min(1, (fill - start) / segmentSize));
          const isActive = i === activeStep;
          return (
            <div key={s.id} className="flex flex-col gap-1.5">
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(10,24,58,0.08)" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-200 ease-out"
                  style={{
                    width: `${local * 100}%`,
                    background: isActive
                      ? `linear-gradient(90deg, ${s.kpiTone}, #62b8f0)`
                      : "linear-gradient(90deg, #1E76B6, #62b8f0)",
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[9px] font-mono tracking-wider"
                  style={{ color: i <= activeStep ? "#1E76B6" : "rgba(10,24,58,0.35)" }}
                >
                  0{i + 1}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: isActive ? "#0A183A" : "rgba(10,24,58,0.4)" }}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobile renders a scaled-down version of FlowVisual showing the right step
// ═══════════════════════════════════════════════════════════════════════════
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
  // Square mock sized off the smaller of: 28rem OR (viewport - chrome).
  // On shorter laptops this prevents the bottom of the panel from being
  // chopped off by the sticky offset.
  return (
    <div
      className="relative aspect-square w-full max-w-md max-h-full"
      style={{ width: "min(28rem, calc(100vh - 10rem))" }}
    >
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
        {/* Step KPI floating chip — top-right of every visual frame */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider hv-pop-in"
            style={{
              background: "rgba(255,255,255,0.92)",
              color: STEPS[activeStep]?.kpiTone ?? "#1E76B6",
              boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            }}
            key={`kpi-${activeStep}`}
          >
            {STEPS[activeStep]?.kpi}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center" key={activeStep}>
          {activeStep === 0 && <CaptureStep />}
          {activeStep === 1 && <AnalyzeStep />}
          {activeStep === 2 && <DecideAndBuyStep />}
          {activeStep === 3 && <OptimizeStep />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 1 — Capture. Renders a real video of someone taking a tire photo
// when /public/tire-capture.mp4 exists; otherwise falls back to the existing
// animated phone illustration.
// ═══════════════════════════════════════════════════════════════════════════
function CaptureStep() {
  const [videoOk, setVideoOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Probe the video element on mount; if it fails (404 or codec mismatch),
  // hide it and let the animated phone take over. This keeps the UX
  // smooth before the user provides the asset.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onError = () => setVideoOk(false);
    v.addEventListener("error", onError);
    return () => v.removeEventListener("error", onError);
  }, []);

  if (videoOk) {
    return (
      <div className="relative w-full h-full flex items-center justify-center hv-pop-in">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            width: "76%",
            aspectRatio: "9/16",
            border: "3px solid rgba(255,255,255,0.18)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            background: "#0A183A",
          }}
        >
          <video
            ref={videoRef}
            // ⚠️  Drop a short looped clip at /public/tire-capture.mp4
            // (someone holding a phone, pointing at a tire, the inspection
            // form filling in). 8-12s, 720x1280, mp4 H.264. The video will
            // auto-play silently, loop, and gracefully fall back to the
            // animated phone if it doesn't exist.
            src="/tire-capture.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setVideoOk(false)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Subtle bottom gradient + caption */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.55))" }}
          />
          <div className="absolute left-3 bottom-3 right-3">
            <p className="text-[10px] font-mono tracking-widest text-white/70 uppercase">EN VIVO · APP TIREPRO</p>
            <p className="text-sm font-black text-white leading-tight mt-0.5">Inspección · 30s</p>
          </div>
        </div>

        {/* Floating callouts */}
        <div
          className="absolute top-8 -right-4 px-3 py-1.5 rounded-full text-[10px] font-bold hv-float-1"
          style={{ background: "rgba(52,140,203,0.18)", border: "1px solid rgba(52,140,203,0.45)", color: "#62b8f0" }}
        >
          12.5 mm
        </div>
        <div
          className="absolute bottom-16 -left-2 px-3 py-1.5 rounded-full text-[10px] font-bold hv-float-2"
          style={{ background: "rgba(52,140,203,0.18)", border: "1px solid rgba(52,140,203,0.45)", color: "#62b8f0" }}
        >
          Pos. 3
        </div>
      </div>
    );
  }

  // Fallback — original animated phone illustration
  return <AnimatedPhone />;
}

function AnimatedPhone() {
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
            <div
              className="absolute left-0 right-0 h-0.5 hv-scan"
              style={{ background: "linear-gradient(90deg, transparent, #348CCB, transparent)", boxShadow: "0 0 12px #348CCB" }}
            />
            <div className="absolute top-2 left-2  w-4 h-4 border-t-2 border-l-2 border-[#348CCB]" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#348CCB]" />
            <div className="absolute bottom-2 left-2  w-4 h-4 border-b-2 border-l-2 border-[#348CCB]" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#348CCB]" />
          </div>
          <div className="flex items-center justify-center pb-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#1E76B6] flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-[#1E76B6]" />
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute top-8 -right-4 px-3 py-1.5 rounded-full text-[10px] font-bold hv-float-1"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.4)", color: "#348CCB" }}
      >
        12.5 mm
      </div>
      <div
        className="absolute bottom-16 -left-2 px-3 py-1.5 rounded-full text-[10px] font-bold hv-float-2"
        style={{ background: "rgba(52,140,203,0.15)", border: "1px solid rgba(52,140,203,0.4)", color: "#348CCB" }}
      >
        Pos. 3
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 2 — AI Notifications (mirrors dashboard NotificacionesTab)
// ═══════════════════════════════════════════════════════════════════════════
function AnalyzeStep() {
  const notifs = [
    { severity: "critical", label: "Crítica", color: "#ef4444", bg: "rgba(239,68,68,0.12)", title: "Profundidad bajo límite", message: "Pos. 3 · Int 2.1 · Cen 1.8 · Ext 2.0 mm",  delay: "0s"    },
    { severity: "warning",  label: "Urgente", color: "#f97316", bg: "rgba(249,115,22,0.12)", title: "Desgaste irregular detectado", message: "Posible problema de alineación",  delay: "0.15s" },
    { severity: "info",     label: "Atención",color: "#eab308", bg: "rgba(234,179,8,0.12)",  title: "Programar rotación en 30 días",message: "CPK proyectado: $94 / km",        delay: "0.3s"  },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-4 sm:px-6 py-4 hv-pop-in">
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
          <div className="text-[10px] font-black tracking-wider text-white" style={{ fontFamily: "monospace" }}>
            ABC-123
          </div>
          <div className="text-[8px] text-white/50">3 alertas activas</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[8px] font-bold text-white/70">EN VIVO</span>
        </div>
      </div>

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
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: n.bg }}>
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
            <div className="text-[11px] font-bold text-[#0A183A] leading-tight">{n.title}</div>
            <div className="text-[9px] text-gray-500 mt-0.5 leading-tight">{n.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3 — Decide & Buy (marketplace cards)
// ═══════════════════════════════════════════════════════════════════════════
function DecideAndBuyStep() {
  const tires = [
    { brand: "Michelin",    model: "XZE2+", dim: "295/80R22.5", price: "$1.850.000", cpk: "$87", best: true,  delay: "0s"    },
    { brand: "Bridgestone", model: "M729",  dim: "295/80R22.5", price: "$1.620.000", cpk: "$94", best: false, delay: "0.15s" },
    { brand: "Continental", model: "HSU",   dim: "295/80R22.5", price: "$1.740.000", cpk: "$91", best: false, delay: "0.3s"  },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-4 sm:px-6 py-4 hv-pop-in">
      <div className="w-full max-w-[300px] flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-[#348CCB]" />
          <span className="text-[10px] font-black tracking-widest text-[#348CCB]">
            INSIGHTS &amp; MARKETPLACE
          </span>
        </div>
        <span className="text-[9px] font-bold text-white/50">3 opciones</span>
      </div>

      <div className="w-full max-w-[300px] grid grid-cols-2 gap-2 mb-1">
        <div
          className="rounded-lg p-2"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
        >
          <div className="text-[8px] font-bold text-[#22c55e] tracking-wider">AHORRO</div>
          <div className="text-sm font-extrabold text-white leading-tight">$2.4M</div>
        </div>
        <div
          className="rounded-lg p-2"
          style={{ background: "rgba(52,140,203,0.12)", border: "1px solid rgba(52,140,203,0.3)" }}
        >
          <div className="text-[8px] font-bold text-[#348CCB] tracking-wider">VIDA ÚTIL</div>
          <div className="text-sm font-extrabold text-white leading-tight">42K km</div>
        </div>
      </div>

      {tires.map((t, i) => (
        <div
          key={i}
          className="w-full max-w-[300px] rounded-xl p-2.5 flex items-center gap-2.5 transition-all hover:scale-[1.02] hv-slide-in-1 relative"
          style={{
            background: "rgba(255,255,255,0.97)",
            border: t.best ? "1.5px solid #348CCB" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: t.best
              ? "0 8px 24px rgba(52,140,203,0.4), 0 0 0 4px rgba(52,140,203,0.1)"
              : "0 4px 12px rgba(0,0,0,0.15)",
            animationDelay: t.delay,
          }}
        >
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
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}
          >
            <Disc size={24} className="text-[#0A183A]" strokeWidth={1.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400">{t.brand}</div>
            <div className="text-xs font-bold text-[#0A183A] leading-tight truncate">{t.model}</div>
            <div className="text-[9px] text-gray-500">{t.dim}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="px-1 py-0.5 rounded text-[7px] font-bold"
                style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}
              >
                CPK {t.cpk}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-black text-[#0A183A] leading-tight">{t.price}</div>
            <div className="text-[8px] text-gray-400">/unidad</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 4 — Optimiza. CPK trend chart + accumulated savings counter
// ═══════════════════════════════════════════════════════════════════════════
function OptimizeStep() {
  // Mini line chart: CPK descending month-over-month. SVG-based so it stays
  // crisp at any size. Uses the same y-shape as a real CPK reduction curve.
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
  const cpk    = [142, 128, 119, 108, 99, 94];
  const minCpk = Math.min(...cpk);
  const maxCpk = Math.max(...cpk);
  const points = cpk.map((v, i) => {
    const x = (i / (cpk.length - 1)) * 280 + 10;
    const y = 70 - ((v - minCpk) / (maxCpk - minCpk)) * 50;
    return { x, y, v };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x},70 L${points[0].x},70 Z`;

  // Counters that animate when this step lands.
  const [savings, setSavings] = useState(0);
  const [vidas,   setVidas]   = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const target = { s: 248_000_000, v: 3.4 };
    const dur = 1300;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setSavings(Math.round(target.s * e));
      setVidas(Math.round(target.v * 10 * e) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 px-4 sm:px-6 py-4 hv-pop-in">
      {/* Header */}
      <div className="w-full max-w-[300px] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingDown size={12} className="text-[#22c55e]" />
          <span className="text-[10px] font-black tracking-widest text-[#22c55e]">
            CPK · ÚLTIMOS 6 MESES
          </span>
        </div>
        <span className="text-[9px] font-bold text-white/50">−$48 / km</span>
      </div>

      {/* SVG chart */}
      <div
        className="w-full max-w-[300px] rounded-xl px-3 py-3"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(98,184,240,0.20)",
        }}
      >
        <svg viewBox="0 0 300 90" className="w-full h-auto">
          {/* Area fill */}
          <defs>
            <linearGradient id="cpkArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0"   />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#cpkArea)" />
          {/* Line */}
          <path
            d={path}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 600,
              strokeDashoffset: 600,
              animation: "drawLine 1.4s ease-out forwards",
            }}
          />
          {/* Final dot */}
          {(() => {
            const last = points[points.length - 1];
            return (
              <g>
                <circle cx={last.x} cy={last.y} r="6" fill="#22c55e" opacity="0.25" />
                <circle cx={last.x} cy={last.y} r="3" fill="#22c55e" />
              </g>
            );
          })()}
          {/* Month labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={86}
              textAnchor="middle"
              fontSize="7"
              fill="rgba(255,255,255,0.45)"
              fontFamily="monospace"
            >
              {months[i]}
            </text>
          ))}
        </svg>
      </div>

      {/* Counter cards */}
      <div className="w-full max-w-[300px] grid grid-cols-2 gap-2">
        <div
          className="rounded-xl p-3 hv-slide-in-1"
          style={{
            background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.30)",
            animationDelay: "0.1s",
          }}
        >
          <div className="text-[8px] font-bold text-[#22c55e] tracking-wider">AHORRO ACUMULADO</div>
          <div className="text-base font-black text-white leading-tight tabular-nums">
            ${(savings / 1_000_000).toFixed(0)}M
          </div>
          <div className="text-[8px] text-white/50">flota completa, este año</div>
        </div>
        <div
          className="rounded-xl p-3 hv-slide-in-1"
          style={{
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.30)",
            animationDelay: "0.25s",
          }}
        >
          <div className="text-[8px] font-bold text-[#f59e0b] tracking-wider">VIDAS POR LLANTA</div>
          <div className="text-base font-black text-white leading-tight tabular-nums">
            +{vidas.toFixed(1)}
          </div>
          <div className="text-[8px] text-white/50">promedio vs. inicio</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
