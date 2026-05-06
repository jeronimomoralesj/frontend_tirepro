// =============================================================================
// /marketplace/ciudad/[slug]
//
// City landing page. The URL stays as the SEO entry point (Google sends
// "comprar llantas bogotá" → here), but the visible UX is the FULL marketplace
// experience with the city pre-applied as a hard filter — no bespoke product
// grid, no isolated layout. This way:
//   - Search engines still crawl a clean canonical URL with city-specific
//     metadata + JSON-LD (CollectionPage, ItemList of distributors as
//     LocalBusiness, BreadcrumbList, FAQPage).
//   - Users land in the same shopping flow as /marketplace, just localized
//     to their city. No second navigation step required.
//
// MarketplaceClient renders its own MarketplaceNav + city banner +
// MarketplaceFooter. This page only adds the SEO metadata + structured-data
// payloads on top.
// =============================================================================

import React from "react";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketplaceClient from "../../MarketplaceClient";
import { CITIES, cityFromSlug, type City } from "../_lib/cities";
import { productHref } from "../../product/_lib/url";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const SITE = "https://www.tirepro.com.co";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Listing {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  tipo: string;
  precioCop: number;
  precioPromo: number | null;
  promoHasta: string | null;
  imageUrls: string[] | null;
  coverIndex: number;
  distributor?: { id: string; slug?: string | null; name: string; profileImage?: string | null };
}

export const revalidate = 1800;

export async function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}
export const dynamicParams = false;

// Server-fetch a small batch just for the JSON-LD payloads. The rendered
// product grid lives inside MarketplaceClient — fetched client-side.
async function fetchCityData(city: City): Promise<{ listings: Listing[]; total: number }> {
  try {
    const res = await fetch(
      `${API_BASE}/marketplace/listings?ciudad=${encodeURIComponent(city.name)}&limit=40&sortBy=newest`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return { listings: [], total: 0 };
    const data = await res.json();
    return { listings: data.listings ?? [], total: data.total ?? 0 };
  } catch {
    return { listings: [], total: 0 };
  }
}

function effectivePrice(l: Listing): number {
  const promoActive = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
  return promoActive ? l.precioPromo! : l.precioCop;
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata(
  { params }: { params: Promise<{ city: string }> },
): Promise<Metadata> {
  const { city } = await params;
  const c = cityFromSlug(city);
  if (!c) return { title: "Ciudad no encontrada · TirePro" };

  const { listings, total } = await fetchCityData(c);
  const distinctDists = new Set(listings.map((l) => l.distributor?.id).filter(Boolean));
  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const fromPrice = prices.length > 0 ? Math.min(...prices) : null;

  const title = `Llantas en ${c.name} | Comprar Online en ${c.department} — TirePro`;
  const description =
    `Compra llantas en ${c.name}, ${c.department}. ${total} producto${total === 1 ? "" : "s"} ` +
    `de ${distinctDists.size} distribuidor${distinctDists.size === 1 ? "" : "es"} verificado${distinctDists.size === 1 ? "" : "s"} con envío local` +
    `${fromPrice ? `, desde ${fmtCOP(fromPrice)}` : ""}. ` +
    `Llantas para tractomula, camión, bus, camioneta y auto. Marcas Michelin, Bridgestone, Continental y más.`;

  return {
    title,
    description: description.slice(0, 300),
    keywords: [
      `llantas ${c.name.toLowerCase()}`,
      `llantas en ${c.name.toLowerCase()}`,
      `comprar llantas ${c.name.toLowerCase()}`,
      `comprar llantas en ${c.name.toLowerCase()}`,
      `donde comprar llantas en ${c.name.toLowerCase()}`,
      `distribuidor llantas ${c.name.toLowerCase()}`,
      `tienda llantas ${c.name.toLowerCase()}`,
      `llantas baratas ${c.name.toLowerCase()}`,
      `llantas tractomula ${c.name.toLowerCase()}`,
      `llantas camión ${c.name.toLowerCase()}`,
      `llantas reencauche ${c.name.toLowerCase()}`,
      `precio llantas ${c.name.toLowerCase()}`,
    ],
    openGraph: {
      title,
      description,
      url: `${SITE}/marketplace/ciudad/${c.slug}`,
      siteName: "TirePro",
      locale: "es_CO",
      type: "website",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `${SITE}/marketplace/ciudad/${c.slug}` },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const c = cityFromSlug(city);
  if (!c) notFound();

  const { listings, total } = await fetchCityData(c);
  const url = `${SITE}/marketplace/ciudad/${c.slug}`;

  // Distinct distributors from listings — for the LocalBusiness JSON-LD,
  // which is the strongest signal for local-search ranking.
  const distMap = new Map<string, NonNullable<Listing["distributor"]> & { count: number }>();
  for (const l of listings) {
    if (!l.distributor?.id) continue;
    const existing = distMap.get(l.distributor.id);
    if (existing) existing.count += 1;
    else distMap.set(l.distributor.id, { ...l.distributor, count: 1 });
  }
  const distributors = Array.from(distMap.values()).sort((a, b) => b.count - a.count);

  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Llantas en ${c.name}`,
    description: `Compra llantas en ${c.name} de distribuidores verificados con envío local. ${c.blurb}.`,
    url,
    isPartOf: { "@type": "WebSite", name: "TirePro", url: SITE },
    inLanguage: "es-CO",
    spatialCoverage: {
      "@type": "City",
      name: c.name,
      containedInPlace: { "@type": "AdministrativeArea", name: c.department, addressCountry: "CO" },
      geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
    },
    mainEntity: {
      "@type": "ItemList",
      name: `Productos disponibles en ${c.name}`,
      numberOfItems: total,
      itemListElement: listings.slice(0, 20).map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}${productHref(l)}`,
        name: `${l.marca} ${l.modelo} ${l.dimension}`.trim(),
      })),
    },
  };

  const distributorsLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Distribuidores de llantas en ${c.name}`,
    itemListElement: distributors.slice(0, 20).map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": ["LocalBusiness", "AutoPartsStore"],
        "@id": `${SITE}/marketplace/distributor/${d.slug ?? d.id}#localBusiness`,
        name: d.name,
        url: `${SITE}/marketplace/distributor/${d.slug ?? d.id}`,
        image: d.profileImage ?? undefined,
        priceRange: "$$",
        currenciesAccepted: "COP",
        areaServed: { "@type": "City", name: c.name },
        address: { "@type": "PostalAddress", addressLocality: c.name, addressRegion: c.department, addressCountry: "CO" },
      },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro",     item: SITE },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: `${SITE}/marketplace` },
      { "@type": "ListItem", position: 3, name: `Llantas en ${c.name}`, item: url },
    ],
  };

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `¿Dónde comprar llantas en ${c.name}?`,
      a: distributors.length > 0
        ? `En TirePro Marketplace puedes comprar llantas en ${c.name} de ${distributors.length} distribuidor${distributors.length === 1 ? "" : "es"} verificado${distributors.length === 1 ? "" : "s"} con envío local: ${distributors.slice(0, 5).map((d) => d.name).join(", ")}${distributors.length > 5 ? " y más" : ""}. Compara precios, marcas y elige la mejor opción para tu vehículo o flota.`
        : `TirePro Marketplace conecta a compradores en ${c.name} con distribuidores verificados de toda Colombia. Consulta el catálogo actualizado y solicita envío a ${c.name}.`,
    },
    {
      q: `¿Cuánto cuestan las llantas en ${c.name}?`,
      a: lowPrice
        ? `Los precios en ${c.name} parten desde ${fmtCOP(lowPrice)} dependiendo de la marca, dimensión y si la llanta es nueva o reencauche. En TirePro Marketplace puedes comparar precios en tiempo real entre todos los distribuidores que entregan en ${c.name}.`
        : `Los precios varían según marca, dimensión y tipo (nueva o reencauche). Consulta el catálogo en línea para precios actualizados al momento.`,
    },
    {
      q: `¿Hay distribuidores de llantas verificados en ${c.name}?`,
      a: `Sí. Todos los distribuidores listados en TirePro Marketplace han pasado un proceso de verificación que incluye validación de RUT, dirección física, catálogo y procesos de despacho. ${distributors.length > 0 ? `Actualmente hay ${distributors.length} distribuidor${distributors.length === 1 ? "" : "es"} activo${distributors.length === 1 ? "" : "s"} con cobertura en ${c.name}.` : ""}`,
    },
    {
      q: `¿TirePro entrega llantas reencauchadas en ${c.name}?`,
      a: `Sí. El reencauche es una alternativa más económica y sostenible para flotas pesadas. En TirePro puedes elegir entre llantas nuevas y reencauchadas con garantía sobre el casco y el proceso de reencauche, todas con envío a ${c.name}.`,
    },
    {
      q: `¿Cómo recibo mi pedido en ${c.name}?`,
      a: `Una vez completes la compra, el distribuidor coordina el despacho a la dirección que registres en ${c.name}. Los tiempos típicos de entrega van de 1 a 5 días hábiles, dependiendo del distribuidor y la disponibilidad del producto. Algunos distribuidores ofrecen recogida en sus puntos físicos también.`,
    },
    {
      q: `¿Puedo pagar contraentrega o a crédito en ${c.name}?`,
      a: `TirePro Marketplace acepta tarjeta de crédito, débito, PSE y Nequi a través de Bold. Algunos distribuidores ofrecen plazos de pago o crédito empresarial para flotas en ${c.name} — consulta directamente al solicitar cotización.`,
    },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      {/* Structured data — drives city + distributor + breadcrumb + FAQ
          rich results. Loaded as <Script> so it ships in the initial HTML
          and bots see it without executing the marketplace's React tree. */}
      <Script id="city-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Script id="city-distributors-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(distributorsLd) }} />
      <Script id="city-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="city-faq-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Server-rendered FAQ copy — matches the FAQPage JSON-LD verbatim
          so Google validates the structured data. Hidden visually
          (collapsed details) but fully indexable. Lives ABOVE the
          marketplace so crawlers hit the city-specific copy on the first
          screen of HTML, before the heavy MarketplaceClient bundle. */}
      <noscript>
        <h1>Llantas en {c.name}, {c.department}</h1>
        <p>{distributors.length > 0 ? `${distributors.length} distribuidor${distributors.length === 1 ? "" : "es"} verificado${distributors.length === 1 ? "" : "s"} con envío a ${c.name}.` : ""} {total} producto{total === 1 ? "" : "s"} disponible{total === 1 ? "" : "s"}{lowPrice ? ` desde ${fmtCOP(lowPrice)}` : ""}.</p>
      </noscript>
      <div className="sr-only">
        <h1>Llantas en {c.name}, {c.department} — Comprar online en TirePro Marketplace</h1>
        <p>
          Comprar llantas en {c.name}: {total} producto{total === 1 ? "" : "s"} de {distributors.length} distribuidor{distributors.length === 1 ? "" : "es"} verificado{distributors.length === 1 ? "" : "s"}
          {lowPrice ? `, desde ${fmtCOP(lowPrice)}` : ""}. Llantas para tractomula, camión, bus, camioneta y auto, marcas Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook y más, con envío a {c.name}, {c.department}.
        </p>
        {faqs.map((f, i) => (
          <div key={i}>
            <h2>{f.q}</h2>
            <p>{f.a}</p>
          </div>
        ))}
      </div>

      {/* Full marketplace UX, city pre-applied. Brings its own MarketplaceNav,
          city hero banner, search, filters, product grid, footer and
          assistant. */}
      <MarketplaceClient initialCiudad={c.name} />
    </>
  );
}
