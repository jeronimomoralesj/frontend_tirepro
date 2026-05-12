// =============================================================================
// /mision — TirePro mission & vision manifesto page.
//
// Tesla-inspired editorial: massive display type, generous whitespace, one
// idea per vertical viewport, dark hero, stark contrast cuts. Server-only,
// no client JS — every section ships in the first byte.
// =============================================================================

import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import PublicNav from "../../components/PublicNav";
import { MarketplaceFooter } from "../../components/MarketplaceShell";

const SITE = "https://www.tirepro.com.co";

export const metadata: Metadata = {
  title: "Misión y visión — TirePro",
  description:
    "Acelerar la transición hacia una movilidad inteligente y segura a través de la tecnología aplicada al rodaje. Ser la infraestructura tecnológica que sostiene cada kilómetro del progreso humano.",
  alternates: { canonical: `${SITE}/mision` },
  openGraph: {
    type: "website",
    url: `${SITE}/mision`,
    siteName: "TirePro",
    locale: "es_CO",
    title: "Misión y visión — TirePro",
    description:
      "El rodaje es la frontera invisible del progreso. Esta es nuestra misión y nuestra visión.",
    images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: "TirePro" }],
  },
  robots: { index: true, follow: true },
};

const PILLARS = [
  {
    kicker: "Datos",
    title: "Cada llanta es un sensor.",
    body:
      "Convertimos cada rotación, cada milímetro de banda y cada kilómetro recorrido en información que predice el futuro de tu flota.",
  },
  {
    kicker: "Inteligencia",
    title: "La IA al servicio del operador.",
    body:
      "Modelos entrenados con millones de datos colombianos que anticipan fallas, optimizan el CPK y devuelven horas a quienes mueven el país.",
  },
  {
    kicker: "Seguridad",
    title: "Cero fallas evitables.",
    body:
      "El estándar es claro: ninguna llanta debería fallar en ruta. Construimos la tecnología para que ese estándar sea el mínimo, no la aspiración.",
  },
];

export default function MisionPage() {
  return (
    <div className="bg-white text-[#0A183A]">
      <PublicNav />

      {/* ── HERO — full viewport, dark, monumental type ───────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative w-full min-h-[88vh] flex items-center px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, #173D68 0%, #0A183A 55%, #050d20 100%)",
        }}
      >
        {/* Subtle grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(98,184,240,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(98,184,240,0.4) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Glow */}
        <div
          aria-hidden="true"
          className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full pointer-events-none opacity-40"
          style={{ background: "radial-gradient(circle, #1E76B6 0%, transparent 60%)" }}
        />

        <div className="relative max-w-6xl mx-auto pt-24 sm:pt-32 pb-20 w-full">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-8">
            Manifiesto · 2026
          </p>
          <h1
            id="hero-heading"
            className="font-black text-white leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.6rem, 8vw, 7rem)" }}
          >
            El rodaje es
            <br />
            <span className="text-[#62b8f0]">la frontera invisible</span>
            <br />
            del progreso.
          </h1>
          <p
            className="mt-10 max-w-2xl text-white/70 leading-relaxed"
            style={{ fontSize: "clamp(1rem, 1.4vw, 1.25rem)" }}
          >
            Cada camión que mueve carga, cada bus que mueve personas, cada flota que
            mueve una economía depende de un sistema que rueda en silencio. Lo hacemos
            visible.
          </p>
        </div>
      </section>

      {/* ── MISIÓN — big white slab, single sentence ──────────────────────── */}
      <section
        aria-labelledby="mision-heading"
        className="relative w-full px-4 sm:px-6 lg:px-8 py-28 sm:py-40 md:py-56 bg-white"
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-[#1E76B6] mb-10">
            Nuestra misión
          </p>
          <h2
            id="mision-heading"
            className="font-black tracking-tight leading-[1.05] text-[#0A183A]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}
          >
            Acelerar la transición hacia una{" "}
            <span className="text-[#1E76B6]">movilidad inteligente y segura</span>{" "}
            a través de la tecnología aplicada al rodaje.
          </h2>
        </div>
      </section>

      {/* ── VISIÓN — dark slab, monumental statement ──────────────────────── */}
      <section
        aria-labelledby="vision-heading"
        className="relative w-full px-4 sm:px-6 lg:px-8 py-28 sm:py-40 md:py-56 overflow-hidden"
        style={{ background: "#0A183A" }}
      >
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 w-[560px] h-[560px] rounded-full pointer-events-none opacity-30"
          style={{ background: "radial-gradient(circle, #1E76B6 0%, transparent 70%)" }}
        />
        <div className="relative max-w-5xl mx-auto">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-10">
            Nuestra visión
          </p>
          <h2
            id="vision-heading"
            className="font-black text-white tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4.5rem)" }}
          >
            Ser la <span className="text-[#62b8f0]">infraestructura tecnológica</span>{" "}
            que sostiene cada kilómetro del progreso humano.
          </h2>
        </div>
      </section>

      {/* ── PILARES — three cards, light background ───────────────────────── */}
      <section
        aria-labelledby="pillars-heading"
        className="relative w-full px-4 sm:px-6 lg:px-8 py-24 sm:py-32 bg-[#F5F5F7]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-[#1E76B6] mb-5">
              Cómo lo construimos
            </p>
            <h2
              id="pillars-heading"
              className="font-black tracking-tight leading-[1.08] text-[#0A183A]"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Tres principios que guían cada decisión.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PILLARS.map((p) => (
              <article
                key={p.kicker}
                className="group bg-white rounded-3xl p-8 lg:p-10 border border-[#0A183A]/8 hover:border-[#1E76B6]/35 hover:shadow-[0_24px_60px_rgba(10,24,58,0.08)] transition-all"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#1E76B6] mb-5">
                  {p.kicker}
                </p>
                <h3 className="text-xl sm:text-2xl font-black text-[#0A183A] leading-tight mb-4">
                  {p.title}
                </h3>
                <p className="text-[15px] text-gray-600 leading-relaxed">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── COUNTER LINE — kilometer reference, simple emphasis ───────────── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-24 sm:py-32 bg-white border-t border-[#0A183A]/6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-[#1E76B6] mb-6">
            Por qué importa
          </p>
          <p
            className="font-black text-[#0A183A] tracking-tight leading-[1.1]"
            style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}
          >
            Mil millones de kilómetros se recorren cada día en Colombia. Cada uno{" "}
            <span className="text-[#1E76B6]">deja datos</span>. Cada uno{" "}
            <span className="text-[#1E76B6]">salva una vida</span> o{" "}
            <span className="text-[#1E76B6]">cuesta una</span>. Esa es la frontera en
            la que trabajamos.
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section
        className="relative w-full px-4 sm:px-6 lg:px-8 py-24 sm:py-32 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #0A183A 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(30,118,182,0.3) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2
            className="font-black text-white leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          >
            Únete al rodaje.
          </h2>
          <p className="mt-6 text-white/65 text-base sm:text-lg max-w-xl mx-auto">
            Construimos esto con flotas, distribuidores, ingenieros y operadores que
            no aceptan que la ruta sea lo que siempre ha sido.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/companyregister"
              className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full bg-[#1E76B6] hover:bg-[#2485cc] text-white font-bold text-base transition-colors shadow-[0_8px_32px_rgba(30,118,182,0.4)]"
            >
              Crear cuenta gratis
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/trabaja-con-nosotros"
              className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full border border-white/25 text-white/85 hover:bg-white/10 hover:border-white/45 font-semibold text-base transition-colors"
            >
              Trabaja con nosotros
            </Link>
          </div>
        </div>
      </section>

      <MarketplaceFooter />
    </div>
  );
}
