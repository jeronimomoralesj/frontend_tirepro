// =============================================================================
// /guias — index of long-form tire-buying guides.
//
// Entry point of the buying-guide hub. Lists every Guide entry as a
// large card with category badge + read time + intro. Internal-link
// mesh that distributes PageRank into each long-form article.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../components/MarketplaceShell";
import { GUIDES } from "./_lib/guides";
import { GUIDE_CATEGORIES } from "./_lib/types";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Guías de compra de llantas en Colombia | TirePro",
  description:
    "Guías técnicas para elegir llantas en Colombia: cómo elegir llantas para tractomula, cuándo reencauchar, llanta nueva vs reencauche, " +
    "cómo extender la vida útil, alineación y balanceo, presión de inflado y más.",
  keywords: [
    "guia compra llantas",
    "como elegir llantas",
    "guia de llantas",
    "cuando cambiar llantas",
    "como elegir llantas tractomula",
    "guia mantenimiento llantas",
  ],
  alternates: { canonical: `${SITE}/guias` },
  openGraph: {
    title: "Guías de compra de llantas — TirePro",
    description: "Guías técnicas para elegir y mantener llantas en Colombia.",
    url: `${SITE}/guias`,
    siteName: "TirePro",
    locale: "es_CO",
    type: "website",
    images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: "Guías de compra de llantas TirePro" }],
  },
  twitter: { card: "summary_large_image", title: "Guías de compra de llantas — TirePro" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function GuiasIndexPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Guías de compra de llantas TirePro",
    inLanguage: "es-CO",
    numberOfItems: GUIDES.length,
    itemListElement: GUIDES.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/guias/${g.slug}`,
      name: g.title,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro", item: SITE },
      { "@type": "ListItem", position: 2, name: "Guías",   item: `${SITE}/guias` },
    ],
  };

  return (
    <>
      <Script id="guias-list-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <Script id="guias-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="min-h-screen bg-[#f5f5f7]">
        <MarketplaceNav />

        <section
          style={{
            background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)",
            color: "#fff",
            padding: "48px 16px 40px",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Recursos técnicos
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: "8px 0 12px", lineHeight: 1.1 }}>
              Guías de compra de llantas
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.92, maxWidth: 720 }}>
              Guías técnicas escritas para flotas y conductores en Colombia. Decisiones de compra, mantenimiento,
              seguridad y rentabilidad — explicadas por TirePro.
            </p>
          </div>
        </section>

        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 16px 64px" }}>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guias/${g.slug}`}
                  style={{
                    display: "block",
                    padding: "20px 22px",
                    background: "#fff",
                    border: "1px solid rgba(10,24,58,0.08)",
                    borderRadius: 14,
                    textDecoration: "none",
                    color: "inherit",
                    height: "100%",
                    boxShadow: "0 8px 24px -16px rgba(10,24,58,0.18)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#1E76B6",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      {GUIDE_CATEGORIES[g.category]}
                    </span>
                    <span style={{ color: "#cbd5e1" }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
                      <Clock className="w-3 h-3" />
                      {g.readMinutes} min
                    </span>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 8, lineHeight: 1.3 }}>
                    {g.title}
                  </h2>
                  <p style={{ color: "#475569", fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
                    {g.shortDescription}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <MarketplaceFooter />
      </div>
    </>
  );
}
