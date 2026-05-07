// =============================================================================
// /guias/[topic] — long-form buying guide.
//
// Server-rendered article with Article + HowTo + FAQPage +
// BreadcrumbList JSON-LD. Each guide is one specific buying decision
// answered end-to-end with sections, optional how-to steps, FAQ
// accordion, glossary cross-links and marketplace CTAs.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, BookOpen, Calendar } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { GUIDES, guideFromSlug } from "../_lib/guides";
import { GUIDE_CATEGORIES } from "../_lib/types";
import { GLOSSARY_TERMS } from "../../glosario/_lib/terms";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 86400;

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ topic: g.slug }));
}
export const dynamicParams = false;

export async function generateMetadata(
  { params }: { params: Promise<{ topic: string }> },
): Promise<Metadata> {
  const { topic } = await params;
  const g = guideFromSlug(topic);
  if (!g) return { title: "Guía no encontrada · TirePro" };

  const title = `${g.title} | Guías TirePro Colombia`;
  const url = `${SITE}/guias/${g.slug}`;

  return {
    title,
    description: g.shortDescription,
    alternates: { canonical: url },
    openGraph: {
      title: g.title,
      description: g.shortDescription,
      url,
      siteName: "TirePro",
      locale: "es_CO",
      type: "article",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: g.title }],
    },
    twitter: { card: "summary_large_image", title: g.title, description: g.shortDescription },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function GuidePage(
  { params }: { params: Promise<{ topic: string }> },
) {
  const { topic } = await params;
  const g = guideFromSlug(topic);
  if (!g) notFound();

  const url = `${SITE}/guias/${g.slug}`;

  const relatedTerms = (g.relatedTerms ?? [])
    .map((s) => GLOSSARY_TERMS.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const relatedGuides = (g.relatedGuides ?? [])
    .map((s) => GUIDES.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => !!x);

  // ── JSON-LD ────────────────────────────────────────────────────────
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: g.title,
    description: g.shortDescription,
    datePublished: g.updatedDate,
    dateModified: g.updatedDate,
    author: { "@type": "Organization", name: "TirePro", url: SITE },
    publisher: { "@type": "Organization", name: "TirePro", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/logo_full.png` } },
    inLanguage: "es-CO",
    mainEntityOfPage: url,
    articleSection: GUIDE_CATEGORIES[g.category],
  };

  const howToLd = (g.howToSteps && g.howToSteps.length > 0)
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: g.title,
        description: g.shortDescription,
        step: g.howToSteps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      }
    : null;

  const faqLd = (g.faqs && g.faqs.length > 0)
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: g.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro", item: SITE },
      { "@type": "ListItem", position: 2, name: "Guías",   item: `${SITE}/guias` },
      { "@type": "ListItem", position: 3, name: g.title,   item: url },
    ],
  };

  return (
    <>
      <Script id="guide-article-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <Script id="guide-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {howToLd && (
        <Script id="guide-howto-jsonld" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />
      )}
      {faqLd && (
        <Script id="guide-faq-jsonld" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      <div className="min-h-screen bg-[#f5f5f7]">
        <MarketplaceNav />

        <article style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px 80px" }}>
          <Link
            href="/guias"
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: 12, color: "#0A183A99", fontWeight: 700, textDecoration: "none", marginBottom: 16 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Guías
          </Link>

          <p style={{ fontSize: 11, fontWeight: 800, color: "#1E76B6", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            {GUIDE_CATEGORIES[g.category]}
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#0A183A", lineHeight: 1.15, marginBottom: 14 }}>
            {g.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#64748b", fontSize: 13, marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Clock className="w-3.5 h-3.5" />
              {g.readMinutes} min
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Calendar className="w-3.5 h-3.5" />
              Actualizado {new Date(g.updatedDate).toLocaleDateString("es-CO", { year: "numeric", month: "long" })}
            </span>
          </div>

          <p style={{ fontSize: 18, color: "#0A183A", lineHeight: 1.6, marginBottom: 28, fontWeight: 500 }}>
            {g.intro}
          </p>

          {g.sections.map((s, i) => (
            <section key={i} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                {s.heading}
              </h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} style={{ color: "#1f2937", lineHeight: 1.7, fontSize: 15, marginBottom: 12 }}>
                  {p}
                </p>
              ))}
            </section>
          ))}

          {g.howToSteps && g.howToSteps.length > 0 && (
            <section style={{ marginBottom: 28, background: "#fff", border: "1px solid rgba(10,24,58,0.08)", borderRadius: 14, padding: "20px 22px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 14 }}>
                Paso a paso
              </h2>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {g.howToSteps.map((s, i) => (
                  <li key={i} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                    <span
                      style={{
                        flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
                        background: "#1E76B6", color: "#fff", fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0A183A", fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                      <div style={{ color: "#334155", fontSize: 14, lineHeight: 1.6 }}>{s.text}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {g.faqs && g.faqs.length > 0 && (
            <section style={{ marginBottom: 28, background: "#fff", border: "1px solid rgba(10,24,58,0.08)", borderRadius: 14, padding: "20px 22px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                Preguntas frecuentes
              </h2>
              {g.faqs.map((f, i) => (
                <details
                  key={i}
                  style={{ background: "#F8FAFC", border: "1px solid rgba(10,24,58,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: 700, color: "#0A183A", fontSize: 14 }}>
                    {f.q}
                  </summary>
                  <p style={{ color: "#334155", lineHeight: 1.6, marginTop: 8, marginBottom: 0, fontSize: 14 }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </section>
          )}

          {relatedTerms.length > 0 && (
            <section style={{ marginBottom: 28, background: "#fff", border: "1px solid rgba(10,24,58,0.08)", borderRadius: 14, padding: "20px 22px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                Términos relacionados del glosario
              </h2>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {relatedTerms.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/glosario/${t.slug}`}
                      style={{
                        display: "block", padding: "10px 14px", background: "#F8FAFC",
                        border: "1px solid rgba(10,24,58,0.08)", borderRadius: 10,
                        color: "#0A183A", textDecoration: "none", fontWeight: 700, fontSize: 13,
                      }}
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {g.marketplaceLinks && g.marketplaceLinks.length > 0 && (
            <section
              style={{
                marginBottom: 28,
                background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)",
                color: "#fff", borderRadius: 14, padding: "22px 24px",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <BookOpen className="w-4 h-4" />
                Continúa en el marketplace
              </h2>
              <p style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.5, marginBottom: 14 }}>
                Aplica esta guía explorando el catálogo en tiempo real.
              </p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {g.marketplaceLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "10px 14px", background: "rgba(255,255,255,0.15)",
                        color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13,
                        borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)",
                      }}
                    >
                      {l.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {relatedGuides.length > 0 && (
            <section style={{ background: "#fff", border: "1px solid rgba(10,24,58,0.08)", borderRadius: 14, padding: "20px 22px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                Continúa leyendo
              </h2>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                {relatedGuides.map((rg) => (
                  <li key={rg.slug}>
                    <Link
                      href={`/guias/${rg.slug}`}
                      style={{
                        display: "block", padding: "12px 14px", background: "#F8FAFC",
                        border: "1px solid rgba(10,24,58,0.08)", borderRadius: 10,
                        color: "#0A183A", textDecoration: "none",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{rg.title}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{rg.readMinutes} min · {GUIDE_CATEGORIES[rg.category]}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <MarketplaceFooter />
      </div>
    </>
  );
}
