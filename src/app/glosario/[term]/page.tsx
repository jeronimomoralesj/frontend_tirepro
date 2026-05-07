// =============================================================================
// /glosario/[term] — long-form glossary entry.
//
// Server-rendered with three pieces of structured data:
//   - DefinedTerm (the canonical signal — Google maps this to its
//     knowledge graph as a vocabulary entity).
//   - FAQPage (each entry's faqs array drives an FAQ rich result).
//   - BreadcrumbList (TirePro → Glosario → <term>).
//
// Each entry visibly renders the long-form definition body, examples,
// related-terms grid (mesh-of-internal-links), and marketplace CTAs
// that funnel research traffic into commercial intent.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES, termFromSlug } from "../_lib/terms";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 86400; // glossary copy is evergreen

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

  const title = `${t.name} — Glosario de llantas | TirePro Colombia`;
  const description = `${t.shortDef} Definición completa, ejemplos y términos relacionados en el glosario de llantas TirePro.`;
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
  const related = (t.relatedTerms ?? [])
    .map((s) => GLOSSARY_TERMS.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => !!x);

  // ── Structured data ─────────────────────────────────────────────────
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

      <div className="min-h-screen bg-[#f5f5f7]">
        <MarketplaceNav />

        <section style={{ maxWidth: 820, margin: "0 auto", padding: "32px 16px 80px" }}>
          <Link
            href="/glosario"
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: 12, color: "#0A183A99", fontWeight: 700, textDecoration: "none", marginBottom: 16 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Glosario
          </Link>

          <p style={{ fontSize: 11, fontWeight: 800, color: "#1E76B6", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            {GLOSSARY_CATEGORIES[t.category]}
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#0A183A", lineHeight: 1.1, marginBottom: 16 }}>
            {t.name}
          </h1>
          <p style={{ fontSize: 18, color: "#334155", lineHeight: 1.6, marginBottom: 24 }}>
            {t.shortDef}
          </p>

          {/* Long-form definition. Whitespace-pre-wrap so paragraph breaks
              encoded as \n\n in the data file render correctly. */}
          <article
            style={{
              background: "#fff",
              border: "1px solid rgba(10,24,58,0.08)",
              borderRadius: 16,
              padding: "24px 24px",
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
              Definición completa
            </h2>
            <div style={{ color: "#1f2937", lineHeight: 1.7, fontSize: 15, whiteSpace: "pre-wrap" }}>
              {t.definition}
            </div>
          </article>

          {t.synonyms && t.synonyms.length > 0 && (
            <article
              style={{
                background: "#fff",
                border: "1px solid rgba(10,24,58,0.08)",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 10 }}>
                También se conoce como
              </h2>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {t.synonyms.map((s) => (
                  <li
                    key={s}
                    style={{
                      padding: "6px 12px",
                      background: "#F1F5F9",
                      color: "#0A183A",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {t.examples && t.examples.length > 0 && (
            <article
              style={{
                background: "#fff",
                border: "1px solid rgba(10,24,58,0.08)",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                Ejemplos
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {t.examples.map((ex, i) => (
                  <li
                    key={i}
                    style={{
                      padding: "10px 12px",
                      background: "#F8FAFC",
                      borderLeft: "3px solid #1E76B6",
                      borderRadius: 6,
                      marginBottom: 8,
                      color: "#0A183A",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {ex}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {t.faqs && t.faqs.length > 0 && (
            <article
              style={{
                background: "#fff",
                border: "1px solid rgba(10,24,58,0.08)",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                Preguntas frecuentes
              </h2>
              {t.faqs.map((f, i) => (
                <details
                  key={i}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid rgba(10,24,58,0.08)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 8,
                  }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: 700, color: "#0A183A", fontSize: 14 }}>
                    {f.q}
                  </summary>
                  <p style={{ color: "#334155", lineHeight: 1.6, marginTop: 8, marginBottom: 0, fontSize: 14 }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </article>
          )}

          {related.length > 0 && (
            <article
              style={{
                background: "#fff",
                border: "1px solid rgba(10,24,58,0.08)",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                Términos relacionados
              </h2>
              <ul
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/glosario/${r.slug}`}
                      style={{
                        display: "block",
                        padding: "10px 14px",
                        background: "#F1F5F9",
                        borderRadius: 10,
                        color: "#0A183A",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {r.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {t.marketplaceLinks && t.marketplaceLinks.length > 0 && (
            <article
              style={{
                background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)",
                color: "#fff",
                borderRadius: 16,
                padding: "24px 24px",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <BookOpen className="w-4 h-4" />
                Continuar en el marketplace
              </h2>
              <p style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.5, marginBottom: 14 }}>
                Aplica este conocimiento eligiendo entre los productos disponibles en TirePro.
              </p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {t.marketplaceLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.15)",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.25)",
                      }}
                    >
                      {l.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </section>

        <MarketplaceFooter />
      </div>
    </>
  );
}
