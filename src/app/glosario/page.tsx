// =============================================================================
// /glosario — entry point of the tire-glossary entity hub.
//
// Server-rendered list of all 30 glossary terms grouped by category, with
// DefinedTermSet JSON-LD that lets Google's knowledge-graph parser
// connect every entry as an entity in the same vocabulary. Each card
// links to /glosario/<slug> for the long-form definition + FAQ.
//
// Why this matters for SEO:
//   - "qué es CPK en llantas", "qué es reencauche", "indice de carga
//     llantas tabla" etc. are all very-low-competition Spanish queries
//     with steady search volume, especially from fleet operators
//     researching purchase decisions.
//   - DefinedTerm + DefinedTermSet schema is the canonical signal for
//     glossary content. Google rewards it with knowledge panels and AI
//     overview citations.
//   - Each term cross-links to the marketplace, so glossary traffic
//     funnels into commercial intent.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { MarketplaceNav, MarketplaceFooter } from "../../components/MarketplaceShell";
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES, type GlossaryCategory } from "./_lib/terms";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 86400; // glossary content is evergreen

export const metadata: Metadata = {
  title: "Glosario de llantas en Colombia | TirePro",
  description:
    "Glosario completo de términos sobre llantas en Colombia: reencauche, CPK, RTD, índice de carga, índice de velocidad, DOT, alineación, balanceo, TPMS y más. " +
    "Definiciones técnicas claras pensadas para flotas y conductores que quieren entender lo que están comprando.",
  keywords: [
    "glosario llantas",
    "diccionario llantas",
    "términos técnicos llantas",
    "qué es reencauche",
    "qué es cpk en llantas",
    "qué es rtd",
    "indice de carga llantas",
    "indice de velocidad llantas",
    "dot llantas fecha",
  ],
  alternates: { canonical: `${SITE}/glosario` },
  openGraph: {
    title: "Glosario de llantas — TirePro",
    description:
      "30 términos clave sobre llantas, reencauche, mantenimiento y compras de flota. Lenguaje claro para Colombia.",
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
  // Group by category, preserving the canonical order defined in terms.ts.
  const byCategory = (Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[])
    .map((cat) => ({
      category: cat,
      label: GLOSSARY_CATEGORIES[cat],
      terms: GLOSSARY_TERMS.filter((t) => t.category === cat),
    }))
    .filter((group) => group.terms.length > 0);

  // DefinedTermSet schema — this is the entity-hub signal for Google.
  // Each child is a DefinedTerm with @id pointing at its dedicated page.
  const definedTermSetLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE}/glosario#termset`,
    name: "Glosario de llantas TirePro",
    description: "Definiciones técnicas de llantas, reencauche y mantenimiento en español, contextualizadas a Colombia.",
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

  return (
    <>
      <Script id="glosario-set-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetLd) }} />
      <Script id="glosario-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="min-h-screen bg-[#f5f5f7]">
        <MarketplaceNav />

        {/* Hero — keyword-rich H1 + category nav anchors. */}
        <section
          style={{
            background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)",
            color: "#fff",
            padding: "56px 16px 40px",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7 }}>
              Recurso técnico
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: "8px 0 12px", lineHeight: 1.1 }}>
              Glosario de llantas
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.92, maxWidth: 720 }}>
              30 términos clave sobre llantas, reencauche, mantenimiento y compras de flota. Definiciones claras
              pensadas para conductores, flotas y compradores en Colombia.
            </p>
            <nav aria-label="Categorías del glosario" style={{ marginTop: 24 }}>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {byCategory.map((g) => (
                  <li key={g.category}>
                    <a
                      href={`#${g.category}`}
                      style={{
                        display: "inline-block",
                        padding: "8px 14px",
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      {g.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        {/* Terms by category. */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 16px 80px" }}>
          {byCategory.map((g) => (
            <div key={g.category} id={g.category} style={{ marginBottom: 40, scrollMarginTop: 80 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0A183A", marginBottom: 16 }}>
                {g.label}
              </h2>
              <ul
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {g.terms.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/glosario/${t.slug}`}
                      style={{
                        display: "block",
                        padding: 16,
                        background: "#fff",
                        border: "1px solid rgba(10,24,58,0.10)",
                        borderRadius: 14,
                        textDecoration: "none",
                        color: "inherit",
                        height: "100%",
                        transition: "transform 120ms ease",
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#0A183A", fontSize: 15, marginBottom: 6 }}>
                        {t.name}
                      </div>
                      <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
                        {t.shortDef}
                      </div>
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
