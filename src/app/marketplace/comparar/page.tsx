// =============================================================================
// /marketplace/comparar — index of all brand-vs-brand comparison pages.
//
// Pure server-rendered hub that lists every BRAND_PAIRS entry as an
// internal link, grouped by tier-vs-tier matchup. Drives the
// internal-link mesh that distributes PageRank across the 50 pair
// pages.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { BRAND_PAIRS, pairSlug } from "./_lib/brand-pairs";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Comparativas de marcas de llantas en Colombia | TirePro",
  description:
    "Comparativas head-to-head entre marcas de llantas: Michelin vs Bridgestone, Goodyear vs Pirelli, Hankook vs Sailun y 50 pares más. " +
    "Precios, calificaciones reales, dimensiones y aplicaciones recomendadas para Colombia.",
  keywords: [
    "comparativa llantas",
    "comparar llantas",
    "michelin vs bridgestone",
    "goodyear vs pirelli",
    "hankook vs michelin",
    "cual es mejor llanta",
    "cual marca de llanta es mejor",
  ],
  alternates: { canonical: `${SITE}/marketplace/comparar` },
  openGraph: {
    title: "Comparativas de marcas de llantas — TirePro",
    description:
      "50 comparativas entre marcas de llantas en Colombia, con precio, calificación y aplicación recomendada.",
    url: `${SITE}/marketplace/comparar`,
    siteName: "TirePro",
    locale: "es_CO",
    type: "website",
    images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: "Comparativas de marcas TirePro" }],
  },
  twitter: { card: "summary_large_image", title: "Comparativas de llantas — TirePro" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function CompararIndexPage() {
  // ItemList JSON-LD — every pair as a structured ListItem with the
  // canonical comparison URL. Helps Google index the hub as a series
  // of related comparison entities.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Comparativas de marcas de llantas TirePro",
    inLanguage: "es-CO",
    numberOfItems: BRAND_PAIRS.length,
    itemListElement: BRAND_PAIRS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/marketplace/comparar/${pairSlug(p)}`,
      name: `${p.nameA} vs ${p.nameB}`,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro",     item: SITE },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: `${SITE}/marketplace` },
      { "@type": "ListItem", position: 3, name: "Comparativas", item: `${SITE}/marketplace/comparar` },
    ],
  };

  return (
    <>
      <Script id="comp-list-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <Script id="comp-list-breadcrumb-jsonld" type="application/ld+json"
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
              Recurso de compra
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: "8px 0 12px", lineHeight: 1.1 }}>
              Comparativas de marcas de llantas
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.92, maxWidth: 720 }}>
              {BRAND_PAIRS.length} comparativas head-to-head entre las marcas más vendidas en Colombia.
              Precios, calificaciones reales y aplicación recomendada para cada par.
            </p>
          </div>
        </section>

        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 16px 64px" }}>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 10,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {BRAND_PAIRS.map((p) => (
              <li key={pairSlug(p)}>
                <Link
                  href={`/marketplace/comparar/${pairSlug(p)}`}
                  style={{
                    display: "block",
                    padding: 16,
                    background: "#fff",
                    border: "1px solid rgba(10,24,58,0.10)",
                    borderRadius: 14,
                    textDecoration: "none",
                    color: "inherit",
                    height: "100%",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#0A183A", fontSize: 16, marginBottom: 6 }}>
                    {p.nameA} <span style={{ color: "#64748b", fontWeight: 600, fontSize: 14 }}>vs</span> {p.nameB}
                  </div>
                  <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
                    {p.hook}
                  </div>
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
