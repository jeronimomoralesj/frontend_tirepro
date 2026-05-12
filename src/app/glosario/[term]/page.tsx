// =============================================================================
// /glosario/[term] — long-form glossary entry.
//
// SEO surfaces emitted server-side:
//   - DefinedTerm   (canonical entity signal — Google Knowledge Graph)
//   - FAQPage       (each entry's faqs array drives an FAQ rich result)
//   - BreadcrumbList
//   - SpeakableSpecification on the DefinedTerm so Google Assistant /
//     Siri / Alexa read the H1 + lead paragraph aloud for voice queries
//     like "OK Google, qué es el DOT en llantas".
//
// Title + H1 prefer the term-level `seoTitle` / `h1Question` overrides
// when present (high-volume terms have them tuned to the literal
// question users type — "¿Qué es el DOT en una llanta y cómo se lee?").
// Falls back to a "¿Qué es {name}?" template otherwise.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES, termFromSlug } from "../_lib/terms";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 86400;

export async function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({ term: t.slug }));
}
export const dynamicParams = false;

export async function generateMetadata(
  { params }: { params: Promise<{ term: string }> },
): Promise<Metadata> {
  const { term } = await params;
  const t = termFromSlug(term);
  if (!t) return { title: "Término no encontrado · TirePro" };

  // Prefer the hand-tuned title for high-volume terms; fall back to a
  // question-form template so even the long tail gets a query-shaped
  // <title> instead of just the bare term name.
  const title = t.seoTitle ?? `¿Qué es ${t.name}? — Glosario de llantas | TirePro Colombia`;
  const description =
    t.metaDescription ??
    `${t.shortDef} Definición completa, ejemplos y términos relacionados en el glosario de llantas TirePro.`;
  const url = `${SITE}/glosario/${t.slug}`;

  return {
    title,
    description: description.slice(0, 300),
    keywords: [
      t.name.toLowerCase(),
      `qué es ${t.name.toLowerCase()}`,
      `${t.name.toLowerCase()} llantas`,
      `${t.name.toLowerCase()} colombia`,
      ...(t.synonyms ?? []).map((s) => s.toLowerCase()),
      "glosario llantas",
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "TirePro",
      locale: "es_CO",
      type: "article",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: t.name }],
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function GlossaryTermPage(
  { params }: { params: Promise<{ term: string }> },
) {
  const { term } = await params;
  const t = termFromSlug(term);
  if (!t) notFound();

  const url = `${SITE}/glosario/${t.slug}`;
  const h1 = t.h1Question ?? `¿Qué es ${t.name}?`;
  const related = (t.relatedTerms ?? [])
    .map((s) => GLOSSARY_TERMS.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => !!x);

  // ── Structured data ────────────────────────────────────────────────────
  const definedTermLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${url}#definedterm`,
    name: t.name,
    alternateName: t.synonyms ?? undefined,
    description: t.definition,
    url,
    inDefinedTermSet: `${SITE}/glosario#termset`,
    inLanguage: "es-CO",
    // SpeakableSpecification — selectors to the H1 + lead paragraph so
    // voice assistants (Google, Siri, Alexa) read the question + the
    // short definition aloud for voice queries.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "[data-speakable-lead]"],
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro",  item: SITE },
      { "@type": "ListItem", position: 2, name: "Glosario", item: `${SITE}/glosario` },
      { "@type": "ListItem", position: 3, name: t.name,     item: url },
    ],
  };

  const faqLd = (t.faqs && t.faqs.length > 0)
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: t.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <Script id="glos-term-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermLd) }} />
      <Script id="glos-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && (
        <Script id="glos-faq-jsonld" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      <div className="min-h-screen bg-[#F5F5F7]">
        <MarketplaceNav />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
          {/* Breadcrumb back-link */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              href="/glosario"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A183A]/60 hover:text-[#0A183A] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Glosario de llantas
            </Link>
          </nav>

          {/* Eyebrow with category + canonical term name */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1E76B6]">
              {GLOSSARY_CATEGORIES[t.category]}
            </span>
            <span className="text-[11px] text-gray-400">·</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {t.name}
            </span>
          </div>

          {/* H1 — question form, exactly what users type into Google */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.08] tracking-tight text-[#0A183A] mb-5">
            {h1}
          </h1>

          {/* Lead — flagged as speakable so voice assistants read it */}
          <p
            data-speakable-lead
            className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-10"
          >
            {t.shortDef}
          </p>

          {/* Long-form definition */}
          <article className="bg-white rounded-2xl border border-[#0A183A]/8 p-6 sm:p-8 mb-6 shadow-[0_2px_16px_rgba(10,24,58,0.04)]">
            <h2 className="text-base font-extrabold uppercase tracking-wider text-[#0A183A] mb-4">
              Definición técnica
            </h2>
            <div className="text-[15px] sm:text-base leading-[1.75] text-gray-800 whitespace-pre-wrap">
              {t.definition}
            </div>
          </article>

          {/* Synonyms */}
          {t.synonyms && t.synonyms.length > 0 && (
            <article className="bg-white rounded-2xl border border-[#0A183A]/8 p-6 sm:p-7 mb-6 shadow-[0_2px_16px_rgba(10,24,58,0.04)]">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A183A] mb-3">
                También se conoce como
              </h2>
              <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
                {t.synonyms.map((s) => (
                  <li
                    key={s}
                    className="px-3 py-1.5 rounded-full bg-[#F0F7FF] border border-[#1E76B6]/15 text-[#0A183A] text-xs font-semibold"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {/* Examples */}
          {t.examples && t.examples.length > 0 && (
            <article className="bg-white rounded-2xl border border-[#0A183A]/8 p-6 sm:p-7 mb-6 shadow-[0_2px_16px_rgba(10,24,58,0.04)]">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A183A] mb-4">
                Ejemplos
              </h2>
              <ul className="space-y-2 m-0 p-0 list-none">
                {t.examples.map((ex, i) => (
                  <li
                    key={i}
                    className="px-4 py-3 rounded-lg bg-[#F8FAFC] border-l-[3px] border-[#1E76B6] text-[#0A183A] text-sm leading-relaxed"
                  >
                    {ex}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {/* FAQ — visible Q&A mirrors the FAQPage JSON-LD */}
          {t.faqs && t.faqs.length > 0 && (
            <article className="bg-white rounded-2xl border border-[#0A183A]/8 p-6 sm:p-7 mb-6 shadow-[0_2px_16px_rgba(10,24,58,0.04)]">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A183A] mb-4">
                Preguntas frecuentes
              </h2>
              <div className="space-y-2">
                {t.faqs.map((f, i) => (
                  <details
                    key={i}
                    className="group bg-[#F8FAFC] border border-[#0A183A]/8 rounded-xl overflow-hidden transition-colors hover:border-[#1E76B6]/30"
                  >
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-3 px-4 py-3 font-bold text-[#0A183A] text-sm">
                      <span>{f.q}</span>
                      <ChevronDown
                        className="w-4 h-4 text-[#1E76B6] flex-shrink-0 transition-transform group-open:rotate-180 mt-0.5"
                      />
                    </summary>
                    <p className="px-4 pb-4 pt-0 text-gray-700 leading-relaxed text-sm">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </article>
          )}

          {/* Related terms — internal-link mesh */}
          {related.length > 0 && (
            <article className="bg-white rounded-2xl border border-[#0A183A]/8 p-6 sm:p-7 mb-6 shadow-[0_2px_16px_rgba(10,24,58,0.04)]">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A183A] mb-4">
                Términos relacionados
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 m-0 p-0 list-none">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/glosario/${r.slug}`}
                      className="group flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-[#F0F7FF] border border-[#1E76B6]/12 hover:bg-[#1E76B6] hover:border-[#1E76B6] transition-colors"
                    >
                      <span className="text-sm font-bold text-[#0A183A] group-hover:text-white truncate">
                        {r.name}
                      </span>
                      <ArrowRight
                        className="w-3.5 h-3.5 flex-shrink-0 text-[#1E76B6] group-hover:text-white"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {/* Marketplace CTAs */}
          {t.marketplaceLinks && t.marketplaceLinks.length > 0 && (
            <article className="rounded-2xl p-6 sm:p-8 mb-6 text-white bg-gradient-to-br from-[#0A183A] via-[#173D68] to-[#1E76B6] shadow-[0_4px_24px_rgba(10,24,58,0.15)]">
              <h2 className="flex items-center gap-2 text-base font-extrabold mb-2">
                <BookOpen className="w-4 h-4" />
                Continuar en el marketplace
              </h2>
              <p className="text-sm leading-relaxed text-white/85 mb-5">
                Aplica este conocimiento eligiendo entre los productos disponibles en TirePro.
              </p>
              <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
                {t.marketplaceLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-colors"
                    >
                      {l.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </main>

        <MarketplaceFooter />
      </div>
    </>
  );
}
