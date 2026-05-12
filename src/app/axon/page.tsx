// =============================================================================
// /axon — AXON product announcement page.
//
// Sections (top to bottom):
//   1. Monumental hero with video + headline + waitlist countdown
//   2. "Intelligence on the Edge" intro narrative
//   3. Three feature pillars (Instant Deployment / Predictive Longevity /
//      TirePro Ecosystem)
//   4. Spec comparison vs. legacy TPMS (the "impossible specs" table)
//   5. Video showcase block
//   6. Waitlist CTA
// =============================================================================

import React from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Zap, Brain, Wifi, Check, X } from "lucide-react";
import PublicNav from "../../components/PublicNav";
import { MarketplaceFooter } from "../../components/MarketplaceShell";
import AxonWaitlistForm from "../../components/axon/AxonWaitlistForm";

const SITE = "https://www.tirepro.com.co";

export const metadata: Metadata = {
  title: "AXON by TirePro — The Pulse of the Road",
  description:
    "AXON es el TPMS de próxima generación: instalación de 60 segundos, BLE 5.4 Neural Mesh, predicción de vida útil con IA y telemetría en tiempo real. Lanzamiento septiembre 2026.",
  alternates: { canonical: `${SITE}/axon` },
  openGraph: {
    type: "website",
    url: `${SITE}/axon`,
    siteName: "TirePro",
    locale: "es_CO",
    title: "AXON by TirePro — The Pulse of the Road",
    description:
      "Intelligence on the Edge. Telemetría en tiempo real para cada llanta. Septiembre 2026.",
    images: [{ url: `${SITE}/axon/prototype.png`, width: 1200, height: 1200, alt: "AXON v0 prototype" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AXON by TirePro — The Pulse of the Road",
    description: "El TPMS de próxima generación. BLE 5.4. 60 segundos. Septiembre 2026.",
    images: [`${SITE}/axon/prototype.png`],
  },
  robots: { index: true, follow: true },
};

// JSON-LD — a forthcoming Product. Lets Google surface AXON in its
// product knowledge panel ahead of launch.
const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "AXON by TirePro",
  description:
    "TPMS de próxima generación con BLE 5.4 Neural Mesh, predicción de vida útil con IA, instalación universal en 60 segundos.",
  brand: { "@type": "Brand", name: "TirePro" },
  image: `${SITE}/axon/prototype.png`,
  url: `${SITE}/axon`,
  releaseDate: "2026-09-01",
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/PreOrder",
    priceCurrency: "COP",
    availabilityStarts: "2026-09-01",
    url: `${SITE}/axon#waitlist`,
    seller: { "@type": "Organization", name: "TirePro" },
  },
};

const FEATURES = [
  {
    icon: Zap,
    kicker: "60 segundos",
    title: "Instant Deployment",
    body:
      "Handshake de 60 segundos. Sin herramientas, sin talleres, sin fricción. Lo instala el conductor; está activo antes del primer kilómetro.",
  },
  {
    icon: Brain,
    kicker: "1% de precisión",
    title: "Predictive Longevity",
    body:
      "AXON no monitorea presión: analiza vibración de ruta y delta térmico para predecir la vida útil de la banda dentro de un margen del 1%.",
  },
  {
    icon: Wifi,
    kicker: "Ecosistema TirePro",
    title: "Mantenimiento automático",
    body:
      "Cada AXON se conecta directo con tu app TirePro: agenda mantenimiento, optimiza eficiencia y resuelve problemas antes de que los notes.",
  },
];

const SPECS = [
  { row: "Instalación",   axon: "60 segundos (DIY)",          legacy: "2 horas (taller)" },
  { row: "Conectividad",  axon: "BLE 5.4 Neural Mesh",         legacy: "RF de baja frecuencia" },
  { row: "Latencia",      axon: "Tiempo real (50 ms)",         legacy: "30–60 segundos" },
  { row: "Inteligencia",  axon: "IA · predicción de banda",    legacy: "Alerta simple alta/baja" },
  { row: "Compatibilidad", axon: "Universal (cualquier rin)",  legacy: "Bloqueado por marca" },
];

export default function AxonPage() {
  return (
    <div className="bg-[#050d20] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <PublicNav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative w-full min-h-[100vh] flex items-center px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, #173D68 0%, #0A183A 50%, #050d20 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(98,184,240,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(98,184,240,0.4) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-40 -right-40 w-[640px] h-[640px] rounded-full pointer-events-none opacity-40"
          style={{ background: "radial-gradient(circle, #1E76B6 0%, transparent 60%)" }}
        />

        <div className="relative max-w-7xl mx-auto pt-28 sm:pt-32 pb-20 grid lg:grid-cols-12 gap-12 items-center w-full">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#62b8f0]/30 bg-[#62b8f0]/10 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#62b8f0] animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#62b8f0]">
                Lanzamiento · Septiembre 2026
              </span>
            </div>
            <h1
              id="hero-heading"
              className="mt-7 font-black leading-[0.92] tracking-tight"
              style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)" }}
            >
              Intelligence
              <br />
              <span className="text-[#62b8f0]">on the Edge.</span>
            </h1>
            <p className="mt-7 max-w-xl text-white/65 leading-relaxed text-lg">
              <span className="text-white font-bold">AXON by TirePro.</span> El sensor
              que convierte cada llanta en parte del sistema nervioso digital del
              vehículo. Telemetría en tiempo real, antes reservada a equipos de
              Fórmula 1.
            </p>
            <p className="mt-8 text-[10px] uppercase tracking-[0.32em] text-white/40">
              The Pulse of the Road
            </p>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="relative aspect-square max-w-md mx-auto">
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
                priority
                className="relative w-full h-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
              />
              <span className="absolute top-3 left-3 px-2 py-1 rounded text-[9px] font-extrabold uppercase tracking-widest text-[#62b8f0] bg-black/60 border border-[#62b8f0]/30">
                V0 Prototype
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── NARRATIVE ────────────────────────────────────────────────────── */}
      <section className="relative w-full px-4 sm:px-6 lg:px-8 py-28 sm:py-40 bg-[#050d20]">
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-10">
            La llanta deja de ser una caja negra
          </p>
          <h2
            className="font-black leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            Por más de un siglo, la llanta ha sido la única parte del vehículo que
            toca la tierra,{" "}
            <span className="text-[#62b8f0]">
              y la única que no entendemos.
            </span>{" "}
            Hoy eso cambia.
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 gap-8 text-white/65 leading-relaxed text-base">
            <p>
              AXON no es un sensor. Es un upgrade digital al mundo físico. Combina
              MEMS de grado aeroespacial con un protocolo BLE 5.4 Neural Mesh de
              desarrollo propio, midiendo presión, temperatura, vibración y delta
              térmico a 50 ms.
            </p>
            <p>
              La era de la &ldquo;llanta tonta&rdquo; se acabó. Cada AXON se conecta
              al ecosistema TirePro y resuelve problemas antes de que tú sepas que
              existen — agendando mantenimiento, optimizando eficiencia, prediciendo
              fallas.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURE PILLARS ──────────────────────────────────────────────── */}
      <section className="relative w-full px-4 sm:px-6 lg:px-8 py-24 sm:py-32 border-t border-white/8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-5">
              Tres pilares
            </p>
            <h2
              className="font-black leading-[1.08] tracking-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Construido para que la llanta deje de fallar en silencio.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="group rounded-3xl p-8 lg:p-10 border border-white/8 bg-white/[0.02] backdrop-blur-sm hover:border-[#62b8f0]/35 hover:bg-white/[0.04] transition-all"
                >
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#62b8f0]/15 border border-[#62b8f0]/30 mb-6">
                    <Icon className="w-5 h-5 text-[#62b8f0]" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#62b8f0] mb-3">
                    {f.kicker}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-black leading-tight mb-4">
                    {f.title}
                  </h3>
                  <p className="text-[15px] text-white/60 leading-relaxed">{f.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SPEC TABLE ────────────────────────────────────────────────────── */}
      <section className="relative w-full px-4 sm:px-6 lg:px-8 py-24 sm:py-32 border-t border-white/8 bg-[#0a1430]">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-5">
              Specs imposibles
            </p>
            <h2
              className="font-black leading-[1.08] tracking-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              AXON vs. TPMS heredado.
            </h2>
            <p className="mt-4 text-white/55 text-base">
              Cada fila es una decisión de ingeniería que la industria ha aceptado por
              décadas y nosotros no.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-3 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider bg-white/[0.04]">
              <div className="p-5 text-white/45">Característica</div>
              <div className="p-5 text-[#62b8f0] border-l border-white/10">AXON</div>
              <div className="p-5 text-white/45 border-l border-white/10">Legacy TPMS</div>
            </div>
            {SPECS.map((s, i) => (
              <div
                key={s.row}
                className={`grid grid-cols-3 text-xs sm:text-sm border-t border-white/8 ${
                  i % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                }`}
              >
                <div className="p-5 font-bold text-white/85">{s.row}</div>
                <div className="p-5 border-l border-white/10 flex items-center gap-2 text-white">
                  <Check className="w-3.5 h-3.5 text-[#62b8f0] flex-shrink-0" />
                  <span className="font-semibold">{s.axon}</span>
                </div>
                <div className="p-5 border-l border-white/10 flex items-center gap-2 text-white/40">
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{s.legacy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VIDEO SHOWCASE ────────────────────────────────────────────────── */}
      <section className="relative w-full px-4 sm:px-6 lg:px-8 py-24 sm:py-32 border-t border-white/8">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-5">
              Prototipo v0 — en mano
            </p>
            <h2
              className="font-black leading-[1.08] tracking-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Hardware aeroespacial. Tamaño de tuerca.
            </h2>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black aspect-video shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
            <video
              src="/axon/prototype.mp4"
              autoPlay
              muted
              loop
              playsInline
              poster="/axon/prototype.png"
              className="absolute inset-0 w-full h-full object-cover"
              aria-label="AXON v0 prototype demo"
            />
          </div>
        </div>
      </section>

      {/* ── WAITLIST CTA ──────────────────────────────────────────────────── */}
      <section
        id="waitlist"
        className="relative w-full px-4 sm:px-6 lg:px-8 py-28 sm:py-40 overflow-hidden scroll-mt-20 border-t border-white/8"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(30,118,182,0.35) 0%, transparent 65%), #050d20",
        }}
      >
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-7">
            Septiembre 2026
          </p>
          <h2
            className="font-black leading-[0.98] tracking-tight"
            style={{ fontSize: "clamp(2.2rem, 6vw, 5rem)" }}
          >
            Sé el primero en
            <br />
            <span className="text-[#62b8f0]">sentir el pulso.</span>
          </h2>
          <p className="mt-7 text-white/60 leading-relaxed text-base sm:text-lg max-w-xl mx-auto">
            La lista de espera abre el lanzamiento global. Los primeros AXON salen de
            fábrica en septiembre — y los reciben antes quienes están en la lista.
          </p>

          <div className="mt-12">
            <AxonWaitlistForm source="axon-page" variant="monumental" />
          </div>

          <div className="mt-16 inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] uppercase tracking-[0.28em] text-white/35">
            <span>· BLE 5.4 ·</span>
            <span>· IP67 ·</span>
            <span>· 60s install ·</span>
            <span>· 50ms latency ·</span>
          </div>
        </div>

        {/* CTA link to TirePro ecosystem */}
        <div className="relative max-w-3xl mx-auto text-center mt-16">
          <a
            href="/companyregister"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white transition-colors"
          >
            Mientras tanto, empieza con la plataforma TirePro
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      <MarketplaceFooter />
    </div>
  );
}
