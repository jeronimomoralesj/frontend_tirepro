import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  // "hero" → full viewport, used at the top of the landing.
  // "band" → contained section, used at the bottom of /marketplace.
  variant: "hero" | "band";
}

// AXON announcement teaser. The same content appears in both placements;
// the variant prop adjusts proportions and headline weight. Asset paths
// are /public/axon/prototype.{png,mp4}.
export default function AxonTeaser({ variant }: Props) {
  const isHero = variant === "hero";

  return (
    <section
      aria-label="AXON — lanzamiento septiembre 2026"
      className={`relative w-full overflow-hidden text-white ${
        isHero ? "min-h-[100vh]" : "py-20 sm:py-28"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at 25% 15%, #173D68 0%, #0A183A 50%, #050d20 100%)",
      }}
    >
      {/* Grid texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(98,184,240,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(98,184,240,0.4) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* Glow */}
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/4 w-[640px] h-[640px] rounded-full pointer-events-none opacity-30"
        style={{ background: "radial-gradient(circle, #1E76B6 0%, transparent 65%)" }}
      />

      <div
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center ${
          isHero ? "min-h-[100vh] pt-28 pb-20 sm:pt-32 sm:pb-24" : ""
        }`}
      >
        {/* ── Copy ───────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#62b8f0]/30 bg-[#62b8f0]/10 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#62b8f0] animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#62b8f0]">
              Lanzamiento · Septiembre 2026
            </span>
          </div>

          <h2
            className="mt-7 font-black leading-[0.92] tracking-tight"
            style={{
              fontSize: isHero
                ? "clamp(2.8rem, 8vw, 7rem)"
                : "clamp(2.2rem, 5.5vw, 4.5rem)",
            }}
          >
            Inteligencia
            <br />
            <span className="text-[#62b8f0]">que rueda.</span>
          </h2>

          <p
            className={`mt-7 text-white/65 leading-relaxed ${
              isHero ? "max-w-xl text-lg" : "max-w-lg text-base"
            }`}
          >
            <span className="text-white font-bold">AXON · de TirePro.</span> Una
            actualización digital al mundo físico: telemetría en tiempo real para
            cada llanta, antes reservada a los equipos de Fórmula 1.
          </p>

          {/* Mini-spec strip */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            {[
              { label: "Instalación", value: "60s" },
              { label: "Latencia", value: "50ms" },
              { label: "BLE", value: "5.4" },
            ].map((s) => (
              <div key={s.label} className="border-l-2 border-[#62b8f0]/40 pl-3">
                <p className="text-2xl sm:text-3xl font-black text-white">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/45 mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link
              href="/axon"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#0A183A] font-black text-sm hover:bg-[#62b8f0] transition-colors"
            >
              Conoce AXON
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/axon#waitlist"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/20 text-white/85 hover:bg-white/10 hover:border-white/40 font-semibold text-sm transition-colors"
            >
              Unirme a la lista
            </Link>
          </div>

          <p className="mt-8 text-[10px] uppercase tracking-[0.32em] text-white/35">
            El pulso del camino
          </p>
        </div>

        {/* ── Product visual ─────────────────────────────────────────────── */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="relative aspect-square max-w-md mx-auto">
            {/* Halo behind the product */}
            <div
              aria-hidden="true"
              className="absolute inset-4 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(98,184,240,0.4) 0%, transparent 65%)",
                filter: "blur(40px)",
              }}
            />
            <Image
              src="/axon/prototype.png"
              alt="AXON v0 prototype — TPMS BLE 5.4"
              width={840}
              height={840}
              priority={isHero}
              className="relative w-full h-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
            />
            <span className="absolute top-3 left-3 px-2 py-1 rounded text-[9px] font-extrabold uppercase tracking-widest text-[#62b8f0] bg-black/60 border border-[#62b8f0]/30">
              V0 Prototype
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
