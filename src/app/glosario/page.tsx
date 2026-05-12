// =============================================================================
// /glosario — entry point of the tire-glossary entity hub.
//
// Server-rendered list of all glossary terms grouped by category, plus a
// curated "Preguntas más buscadas" section that maps the literal Spanish
// questions users type into Google to the canonical /glosario/<slug>
// pages. The search field is a small client island; the index itself
// stays SSR so Googlebot sees every entry on first byte.
//
// Schema emitted: DefinedTermSet + BreadcrumbList + ItemList of the
// popular-questions block (each entry's `name` is the literal user
// query, which AI search engines pick up as a citation source).
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../components/MarketplaceShell";
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES, type GlossaryCategory, termFromSlug } from "./_lib/terms";
import { POPULAR_QUESTIONS } from "./_lib/popular-questions";
import GlosarioSearch from "./GlosarioSearch";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Glosario de llantas Colombia — ¿Qué es el DOT, índice de carga, CPK? | TirePro",
  description:
    "Glosario completo de llantas en Colombia: qué es el DOT, cómo leer el índice de velocidad y de carga, qué es el CPK, el reencauche, la dimensión 205/55R16, alineación, balanceo, TPMS y más. Definiciones técnicas claras con ejemplos.",
  keywords: [
    "glosario llantas",
    "diccionario llantas",
    "qué es el dot en llantas",
    "cómo leer índice de velocidad llanta",
    "cuáles son los tipos de llantas",
    "qué es el cpk en llantas",
    "qué es el reencauche",
    "cómo leer la medida de una llanta",
    "qué presión deben tener mis llantas",
    "cada cuánto se alinea el carro",
  ],
  alternates: { canonical: `${SITE}/glosario` },
  openGraph: {
    title: "Glosario de llantas — TirePro Colombia",
    description:
      "Definiciones claras de los términos técnicos de las llantas: DOT, CPK, índice de carga, índice de velocidad, reencauche, alineación, balanceo y más.",
    url: `${SITE}/glosario`,
    siteName: "TirePro",
    locale: "es_CO",
    type: "website",
    images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: "Glosario de llantas TirePro" }],
  },
  twitter: { card: "summary_large_image", title: "Glosario de llantas — TirePro" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function GlosarioPage() {
  const byCategory = (Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[])
    .map((cat) => ({
      category: cat,
      label: GLOSSARY_CATEGORIES[cat],
      terms: GLOSSARY_TERMS.filter((t) => t.category === cat),
    }))
    .filter((group) => group.terms.length > 0);

  // Resolve popular questions → live terms (drops any that point to a
  // slug that's been removed, so the section is always valid).
  const popular = POPULAR_QUESTIONS
    .map((p) => ({ ...p, term: termFromSlug(p.slug) }))
    .filter((p): p is typeof p & { term: NonNullable<typeof p.term> } => !!p.term);

  // Search payload — minimal shape, lowercase synonyms.
  const searchableTerms = GLOSSARY_TERMS.map((t) => ({
    slug: t.slug,
    name: t.name,
    shortDef: t.shortDef,
    synonyms: t.synonyms ?? [],
  }));

  // ── Structured data ────────────────────────────────────────────────────
  const definedTermSetLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE}/glosario#termset`,
    name: "Glosario de llantas TirePro",
    description:
      "Definiciones técnicas de llantas, reencauche, mantenimiento y mediciones en español, contextualizadas a Colombia.",
    inLanguage: "es-CO",
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${SITE}/glosario/${t.slug}#definedterm`,
      name: t.name,
      description: t.shortDef,
      url: `${SITE}/glosario/${t.slug}`,
      inDefinedTermSet: `${SITE}/glosario#termset`,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro",   item: SITE },
      { "@type": "ListItem", position: 2, name: "Glosario",  item: `${SITE}/glosario` },
    ],
  };

  // ItemList of popular questions — gives AI overview / Perplexity /
  // ChatGPT browsing a clean (question, url) table when they ingest the
  // page. The name is the literal user query, which they cite verbatim.
  const popularQuestionsLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE}/glosario#popular-questions`,
    name: "Preguntas más buscadas sobre llantas en Colombia",
    itemListElement: popular.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/glosario/${p.slug}`,
      name: p.q,
    })),
  };

  return (
    <>
      <Script id="glosario-set-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetLd) }} />
      <Script id="glosario-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="glosario-popular-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(popularQuestionsLd) }} />

      <div className="min-h-screen bg-[#F5F5F7]">
        <MarketplaceNav />

        {/* HERO ------------------------------------------------------------- */}
        <section className="bg-gradient-to-br from-[#0A183A] via-[#173D68] to-[#1E76B6] text-white pt-14 pb-12 sm:pt-20 sm:pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/75">
              <Sparkles size={13} />
              Recurso técnico
            </div>
            <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
              Glosario de llantas
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-white/85 max-w-2xl leading-relaxed">
              Todo lo que aparece en el flanco de una llanta, explicado en lenguaje claro:
              DOT, índices de carga y velocidad, dimensión, CPK, reencauche y más.
              Pensado para conductores, flotas y compradores en Colombia.
            </p>

            {/* Category jump nav */}
            <nav aria-label="Categorías del glosario" className="mt-7">
              <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
                {byCategory.map((g) => (
                  <li key={g.category}>
                    <a
                      href={`#${g.category}`}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-white/12 border border-white/20 hover:bg-white/20 transition-colors"
                    >
                      {g.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        {/* SEARCH ----------------------------------------------------------- */}
        <section className="px-4 sm:px-6 -mt-8 pb-12 relative z-10">
          <GlosarioSearch terms={searchableTerms} />
        </section>

        {/* POPULAR QUESTIONS — the actual user queries in plain Spanish ----- */}
        {popular.length > 0 && (
          <section className="px-4 sm:px-6 pb-14">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-end justify-between mb-5">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A183A]">
                  Preguntas más buscadas
                </h2>
                <span className="text-xs text-gray-500 hidden sm:inline">
                  Lo que los conductores escriben en Google
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 list-none m-0 p-0">
                {popular.map((p) => (
                  <li key={p.q}>
                    <Link
                      href={`/glosario/${p.slug}`}
                      className="group flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-white border border-[#0A183A]/8 hover:border-[#1E76B6]/40 hover:shadow-[0_4px_18px_rgba(30,118,182,0.1)] transition-all"
                    >
                      <span className="text-sm font-semibold text-[#0A183A] leading-snug">
                        {p.q}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-[#1E76B6] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* TERMS BY CATEGORY ------------------------------------------------ */}
        <section className="px-4 sm:px-6 pb-20 max-w-5xl mx-auto">
          {byCategory.map((g) => (
            <div key={g.category} id={g.category} className="mb-12 scroll-mt-20">
              <div className="flex items-center gap-3 mb-5">
                <BookOpen className="w-4 h-4 text-[#1E76B6]" />
                <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] tracking-tight">
                  {g.label}
                </h2>
                <span className="text-xs text-gray-400 font-semibold">
                  {g.terms.length} {g.terms.length === 1 ? "término" : "términos"}
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 list-none m-0 p-0">
                {g.terms.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/glosario/${t.slug}`}
                      className="group block h-full p-5 bg-white rounded-2xl border border-[#0A183A]/8 hover:border-[#1E76B6]/35 hover:shadow-[0_8px_24px_rgba(30,118,182,0.1)] transition-all"
                    >
                      <h3 className="text-[15px] font-bold text-[#0A183A] mb-2 leading-snug">
                        {t.name}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                        {t.shortDef}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1E76B6] group-hover:text-[#0A183A] transition-colors">
                        Leer definición
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <MarketplaceFooter />
      </div>
    </>
  );
}
