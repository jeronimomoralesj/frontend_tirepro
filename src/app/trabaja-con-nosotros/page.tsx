// =============================================================================
// /trabaja-con-nosotros — TirePro careers page.
//
// Three curated dummy openings. Replace the JOBS array with real listings
// when hiring opens. Each card links to /contact?role=<slug> until we wire
// in an applicant tracker.
// =============================================================================

import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Clock, Briefcase } from "lucide-react";
import PublicNav from "../../components/PublicNav";
import { MarketplaceFooter } from "../../components/MarketplaceShell";

const SITE = "https://www.tirepro.com.co";

export const metadata: Metadata = {
  title: "Trabaja con nosotros — TirePro",
  description:
    "Únete al equipo que construye la infraestructura tecnológica del rodaje. Posiciones abiertas en ingeniería, diseño y customer success — desde Bogotá y remoto en Latinoamérica.",
  alternates: { canonical: `${SITE}/trabaja-con-nosotros` },
  openGraph: {
    type: "website",
    url: `${SITE}/trabaja-con-nosotros`,
    siteName: "TirePro",
    locale: "es_CO",
    title: "Trabaja con nosotros — TirePro",
    description:
      "Construimos la tecnología que mueve a Colombia. Ingenieros, diseñadores y operadores: este es el lugar.",
    images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: "TirePro careers" }],
  },
  robots: { index: true, follow: true },
};

interface Job {
  slug: string;
  title: string;
  team: string;
  location: string;
  type: string;
  blurb: string;
  bullets: string[];
}

const JOBS: Job[] = [
  {
    slug: "senior-backend-engineer",
    title: "Senior Backend Engineer",
    team: "Plataforma",
    location: "Bogotá · Remoto LatAm",
    type: "Tiempo completo",
    blurb:
      "Construye la plataforma que sigue cada kilómetro de las flotas más grandes de Colombia. NestJS sobre Postgres y AWS, escala probada de millones de inspecciones al mes.",
    bullets: [
      "5+ años en backend con TypeScript / Node, Postgres a escala",
      "Experiencia con sistemas event-driven y observabilidad seria",
      "Te entusiasma optimizar consultas y reducir latencia P99",
    ],
  },
  {
    slug: "product-designer",
    title: "Product Designer",
    team: "Producto",
    location: "Bogotá · Remoto LatAm",
    type: "Tiempo completo",
    blurb:
      "Diseña cómo un técnico en un patio en Cali, un gerente de flota en Medellín y un comprador en Barranquilla deciden qué llanta comprar y cuándo retirarla. Producto cargado de fricción real.",
    bullets: [
      "Portafolio con productos B2B complejos en producción",
      "Comodidad investigando con usuarios no-tech en campo",
      "Sistemas de diseño escalables, no solo pantallas bonitas",
    ],
  },
  {
    slug: "customer-success-bogota",
    title: "Customer Success Manager",
    team: "Operaciones",
    location: "Bogotá",
    type: "Tiempo completo",
    blurb:
      "Acompaña a flotas que mueven Colombia desde el día uno: implementación, capacitación en campo, expansión de cuenta. El puesto de mayor contacto con el cliente y el más decisivo para que el software cumpla su promesa.",
    bullets: [
      "3+ años en customer success, account management o consultoría",
      "Cómodo en patios de tractomulas, no solo en oficinas",
      "Castellano nativo; inglés conversacional para sincronía con producto",
    ],
  },
];

export default function TrabajaPage() {
  return (
    <div className="bg-white text-[#0A183A]">
      <PublicNav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8"
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, #173D68 0%, #0A183A 60%, #050d20 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(98,184,240,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(98,184,240,0.4) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="relative max-w-6xl mx-auto pt-32 sm:pt-40 pb-24 sm:pb-32">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-[#62b8f0] mb-7">
            Equipo TirePro
          </p>
          <h1
            id="hero-heading"
            className="font-black text-white leading-[0.98] tracking-tight"
            style={{ fontSize: "clamp(2.4rem, 7vw, 6rem)" }}
          >
            Mueve a Colombia.
            <br />
            <span className="text-[#62b8f0]">Empieza por la llanta.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-white/70 leading-relaxed text-lg">
            Construimos la tecnología que mueve flotas de camiones, buses y
            tractomulas. Si te apasiona el rodaje, los datos y los problemas reales,
            este es el lugar.
          </p>
        </div>
      </section>

      {/* ── VALUES STRIP ─────────────────────────────────────────────────── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              t: "Trabaja en lo que de verdad rueda.",
              d: "No optimizamos engagement. Optimizamos kilómetros y vidas. Cada feature toca operación real, no métricas vanidad.",
            },
            {
              t: "Datos reales, escala real.",
              d: "Millones de inspecciones, miles de vehículos, decenas de marcas. Los problemas son grandes y los benchmarks no existen — los inventamos.",
            },
            {
              t: "Equipo pequeño, decisiones grandes.",
              d: "Cada persona tiene impacto directo sobre el producto. Sin capas innecesarias, sin comités, sin diluir las ideas buenas.",
            },
          ].map((v) => (
            <div key={v.t}>
              <h3 className="text-xl sm:text-2xl font-black text-[#0A183A] leading-tight mb-3 tracking-tight">
                {v.t}
              </h3>
              <p className="text-[15px] text-gray-600 leading-relaxed">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── JOBS ──────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="jobs-heading"
        className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-[#F5F5F7]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.32em] text-[#1E76B6] mb-4">
                Posiciones abiertas
              </p>
              <h2
                id="jobs-heading"
                className="font-black text-[#0A183A] tracking-tight leading-[1.05]"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
              >
                {JOBS.length} {JOBS.length === 1 ? "rol" : "roles"} en camino.
              </h2>
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Si encajas en alguno, escríbenos.
            </span>
          </div>

          <ul className="space-y-4 m-0 p-0 list-none">
            {JOBS.map((job) => (
              <li key={job.slug}>
                <article className="group bg-white rounded-2xl border border-[#0A183A]/8 hover:border-[#1E76B6]/35 hover:shadow-[0_18px_48px_rgba(10,24,58,0.08)] transition-all overflow-hidden">
                  <div className="p-7 sm:p-9">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1E76B6] mb-3">
                          {job.team}
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black text-[#0A183A] tracking-tight leading-tight">
                          {job.title}
                        </h3>

                        <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {job.type}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" />
                            {job.team}
                          </span>
                        </div>

                        <p className="mt-5 text-[15px] text-gray-700 leading-relaxed">
                          {job.blurb}
                        </p>

                        <ul className="mt-5 space-y-1.5 m-0 p-0 list-none">
                          {job.bullets.map((b) => (
                            <li
                              key={b}
                              className="pl-4 text-[14px] text-gray-600 leading-relaxed relative before:absolute before:left-0 before:top-[10px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E76B6]"
                            >
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Link
                        href={`/contact?role=${job.slug}`}
                        className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0A183A] hover:bg-[#1E76B6] text-white text-sm font-bold transition-colors"
                      >
                        Postular
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FALLBACK CTA — no role for you? ──────────────────────────────── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-black text-[#0A183A] tracking-tight leading-[1.1]"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)" }}
          >
            ¿No ves tu rol?
          </h2>
          <p className="mt-5 text-gray-600 text-base sm:text-lg leading-relaxed">
            Si crees que tienes algo que aportar a la infraestructura del rodaje,
            escríbenos. Las mejores contrataciones que hemos hecho no estaban en un
            aviso.
          </p>
          <Link
            href="/contact?role=spontaneous"
            className="mt-10 inline-flex items-center gap-2 px-9 py-4 rounded-full bg-[#1E76B6] hover:bg-[#0A183A] text-white font-bold text-base transition-colors shadow-[0_8px_28px_rgba(30,118,182,0.25)]"
          >
            Escríbenos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <MarketplaceFooter />
    </div>
  );
}
