// =============================================================================
// /marketplace/categoria/[slug]
//
// Vehicle-class / tire-type landing page (auto, camioneta, suv, camion,
// tractomula, bus, volqueta, furgon, nueva, reencauche). Same pattern as
// /marketplace/ciudad/<slug> — keep the canonical URL + city-of-content
// JSON-LD on the server, then embed the full MarketplaceClient with the
// category pre-applied as a hard filter so users land in the actual
// shopping flow instead of an isolated bespoke layout.
// =============================================================================

import React from "react";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketplaceClient from "../../MarketplaceClient";
import { CATEGORIES, categoryFromSlug, type Category } from "../_lib/categories";
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
  distributor?: { id: string; slug?: string | null; name: string };
}

export const revalidate = 1800;

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ type: c.slug }));
}
export const dynamicParams = false;

// Fetch a small batch server-side just for the JSON-LD payloads.
// MarketplaceClient renders its own product grid client-side with the
// same filter applied via the initialCategory prop.
async function fetchCategoryListings(cat: Category): Promise<{ listings: Listing[]; total: number }> {
  try {
    const params = new URLSearchParams({ limit: "24", sortBy: "price_asc" });
    if (cat.kind === "tipo" && cat.tipo) params.set("tipo", cat.tipo);
    if (cat.kind === "rim"  && cat.rimSizes) params.set("rimSizes", cat.rimSizes.join(","));
    const res = await fetch(`${API_BASE}/marketplace/listings?${params.toString()}`, {
      next: { revalidate: 1800 },
    });
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
  { params }: { params: Promise<{ type: string }> },
): Promise<Metadata> {
  const { type } = await params;
  const cat = categoryFromSlug(type);
  if (!cat) return { title: "Categoría no encontrada · TirePro" };

  const { listings, total } = await fetchCategoryListings(cat);
  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const fromPrice = prices.length > 0 ? Math.min(...prices) : null;
  const fromStr = fromPrice ? ` desde ${fmtCOP(fromPrice)}` : "";

  const title = `Llantas ${cat.h1Suffix} en Colombia${fromStr} | TirePro Marketplace`;
  const description =
    `Compra llantas ${cat.h1Suffix} online en Colombia. ${total} producto${total === 1 ? "" : "s"} de ` +
    `distribuidores verificados. ${cat.blurb}`.slice(0, 300);

  const baseKw = [
    `llantas ${cat.h1Suffix}`,
    `llantas ${cat.h1Suffix} colombia`,
    `comprar llantas ${cat.h1Suffix}`,
    `precio llantas ${cat.h1Suffix}`,
    ...cat.vehicles.map((v) => `llantas ${v}`),
    ...cat.vehicles.map((v) => `llantas para ${v} colombia`),
  ];

  return {
    title,
    description,
    keywords: baseKw,
    openGraph: {
      title,
      description,
      url: `${SITE}/marketplace/categoria/${cat.slug}`,
      siteName: "TirePro",
      locale: "es_CO",
      type: "website",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `${SITE}/marketplace/categoria/${cat.slug}` },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function CategoryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const cat = categoryFromSlug(type);
  if (!cat) notFound();

  const { listings, total } = await fetchCategoryListings(cat);
  const url = `${SITE}/marketplace/categoria/${cat.slug}`;

  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;
  const fromCop = lowPrice ? fmtCOP(lowPrice) : null;

  const brandSet = new Set<string>();
  for (const l of listings) if (l.marca) brandSet.add(l.marca.trim());
  const stockedBrands = Array.from(brandSet).sort();

  // ---------------------------------------------------------------------------
  // JSON-LD
  // ---------------------------------------------------------------------------

  const collectionLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Llantas ${cat.h1Suffix} en Colombia`,
    description: cat.blurb,
    url,
    isPartOf: { "@type": "WebSite", name: "TirePro", url: SITE },
    inLanguage: "es-CO",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: listings.slice(0, 20).map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}${productHref(l)}`,
        name: `${l.marca} ${l.modelo} ${l.dimension}`.trim(),
      })),
    },
  };
  if (lowPrice && highPrice) {
    collectionLd.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "COP",
      lowPrice: Math.round(lowPrice),
      highPrice: Math.round(highPrice),
      offerCount: total,
      availability: "https://schema.org/InStock",
    };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro",     item: SITE },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: `${SITE}/marketplace` },
      { "@type": "ListItem", position: 3, name: `Llantas ${cat.h1Suffix}`, item: url },
    ],
  };

  const faqs: Array<{ q: string; a: string }> = cat.kind === "tipo" && cat.tipo === "reencauche"
    ? [
        { q: "¿Qué es una llanta reencauchada?",
          a: "El reencauche es un proceso industrial certificado que renueva la banda de rodamiento de una llanta cuyo casco está en buen estado. La llanta reencauchada se comporta y rinde como una nueva en muchas aplicaciones, a un costo significativamente menor." },
        { q: "¿Cuánto se ahorra con llantas reencauchadas?",
          a: "Para flotas pesadas (tractomula, camión, bus), el reencauche puede reducir el costo por kilómetro (CPK) de las llantas hasta un 40% comparado con llanta nueva equivalente, manteniendo el rendimiento operativo." },
        { q: "¿Qué garantía tienen las llantas reencauchadas en TirePro?",
          a: "Cada llanta reencauchada vendida en TirePro Marketplace cuenta con garantía sobre el proceso de reencauche y la integridad del casco, emitida por el distribuidor reencauchador certificado." },
        { q: "¿Cuándo conviene reencauchar y cuándo no?",
          a: "Conviene cuando el casco está estructuralmente sano (sin grietas, separaciones internas o daños mayores), tiene menos de 2 reencauches previos y la operación es de larga distancia. No conviene cuando el casco no es retreadable, en aplicaciones de muy alta velocidad o cuando se requiere máxima vida útil sostenida." },
        { q: "¿En qué dimensiones hay reencauche disponible?",
          a: `Las dimensiones más comunes en reencauche en Colombia son ${cat.commonDimensions?.join(", ")}. Consulta el catálogo para ver el stock actualizado.` },
      ]
    : cat.kind === "tipo" && cat.tipo === "nueva"
    ? [
        { q: "¿Qué garantía tiene una llanta nueva en TirePro?",
          a: "Las llantas nuevas vendidas en TirePro Marketplace cuentan con la garantía oficial del fabricante contra defectos de fábrica, además del soporte directo del distribuidor verificado que despacha el producto." },
        { q: "¿Las llantas nuevas vienen con DOT actualizado?",
          a: "Sí. Los distribuidores en TirePro Marketplace despachan llantas nuevas con DOT (fecha de fabricación) reciente. La fecha exacta del DOT aparece en la página del producto cuando el distribuidor la registra." },
        { q: "¿Qué marcas premium hay disponibles?",
          a: "TirePro Marketplace incluye marcas premium como Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Yokohama, Firestone, Dunlop y más, todas de distribuidores verificados." },
        { q: "¿Cómo elegir entre llanta nueva y reencauche?",
          a: "Para ejes de dirección, vehículos livianos y aplicaciones de alta velocidad se recomienda llanta nueva. Para flotas pesadas en ejes de tracción y arrastre, el reencauche suele ser más rentable cuando el casco está en buen estado. TirePro analiza tu CPK histórico y te recomienda la mejor opción." },
      ]
    : [
        { q: `¿Qué dimensión de llanta usa un ${cat.vehicles[0]}?`,
          a: cat.commonDimensions?.length
            ? `Las dimensiones más comunes para ${cat.vehicles.join(", ")} en Colombia son ${cat.commonDimensions.join(", ")}. La medida exacta depende del modelo y año del vehículo — confirma con el manual del fabricante o búscala por placa en TirePro.`
            : `La dimensión depende del modelo del vehículo. Confirma la medida en el manual del fabricante o búscala por placa en TirePro Marketplace.` },
        { q: `¿Cuánto cuestan las llantas ${cat.h1Suffix} en Colombia?`,
          a: lowPrice
            ? `En TirePro Marketplace las llantas ${cat.h1Suffix} están desde ${fromCop}, dependiendo de marca, dimensión y si es nueva o reencauche. Compara precios en tiempo real entre distribuidores verificados.`
            : `Los precios dependen de la marca, dimensión y condición. Compara opciones actualizadas al momento en el marketplace.` },
        { q: `¿Qué marcas hay para ${cat.vehicles.join(", ")}?`,
          a: stockedBrands.length > 0
            ? `Las marcas en stock para esta categoría incluyen ${stockedBrands.slice(0, 8).join(", ")}${stockedBrands.length > 8 ? " y más" : ""}. Todas con respaldo de distribuidores verificados.`
            : `TirePro agrupa marcas premium e intermedias del mercado colombiano para esta categoría: Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone y más.` },
        { q: `¿Hay opción de reencauche para ${cat.vehicles[0]}?`,
          a: cat.kind === "rim" && cat.rimSizes && cat.rimSizes.some((r) => r >= 17.5)
            ? `Sí. Para ${cat.vehicles.join(", ")}, el reencauche es una alternativa rentable cuando el casco está en buen estado. Consulta la sección de reencauche en TirePro Marketplace.`
            : `El reencauche es más común en flotas pesadas. Para ${cat.vehicles[0]} se recomienda llanta nueva.` },
        { q: `¿TirePro entrega en toda Colombia?`,
          a: `Sí. Los distribuidores verificados en TirePro entregan en Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Cúcuta, Ibagué, Santa Marta, Villavicencio y todas las ciudades principales del país.` },
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

  // Subtitle for the in-marketplace banner — concise context line under
  // the H1. Picks the most useful fact: stock + price for non-empty
  // catalogs, blurb otherwise.
  const subtitle = total > 0 && fromCop
    ? `${total} producto${total === 1 ? "" : "s"} disponible${total === 1 ? "" : "s"} desde ${fromCop}`
    : cat.blurb;

  return (
    <>
      {/* Structured data — drives category + breadcrumb + FAQ rich
          results. Loaded as <Script> so it ships in the initial HTML
          and bots see it without executing the marketplace's React tree. */}
      <Script id="cat-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Script id="cat-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="cat-faq-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Server-rendered SEO copy — invisible to users, indexable by
          crawlers. Matches the FAQPage JSON-LD verbatim so Google
          validates the structured data. */}
      <noscript>
        <h1>Llantas {cat.h1Suffix} en Colombia</h1>
        <p>{cat.blurb}{total > 0 && fromCop && ` ${total} producto${total === 1 ? "" : "s"} desde ${fromCop}.`}</p>
      </noscript>
      <div className="sr-only">
        <h1>Llantas {cat.h1Suffix} en Colombia — Marketplace TirePro</h1>
        <p>
          {cat.blurb} {total > 0 && fromCop && (
            <>Hay {total} producto{total === 1 ? "" : "s"} disponible{total === 1 ? "" : "s"} desde {fromCop} en TirePro Marketplace, de distribuidores verificados con envío a Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira y todas las ciudades principales de Colombia.</>
          )}
          {stockedBrands.length > 0 && <> Marcas en stock: {stockedBrands.slice(0, 8).join(", ")}{stockedBrands.length > 8 ? " y más" : ""}.</>}
          {cat.kind === "rim" && cat.commonDimensions && (
            <> Dimensiones comunes: {cat.commonDimensions.slice(0, 6).join(", ")}.</>
          )}
        </p>
        {faqs.map((f, i) => (
          <div key={i}>
            <h2>{f.q}</h2>
            <p>{f.a}</p>
          </div>
        ))}
      </div>

      {/* Full marketplace UX, category pre-applied as a hard filter via
          rimSizes (vehicle-class) or tipo (nueva / reencauche). Brings
          its own MarketplaceNav, search, filters, product grid, footer
          and assistant. */}
      <MarketplaceClient
        initialCategory={{
          label: cat.name,
          h1: `Llantas ${cat.h1Suffix} en Colombia`,
          subtitle,
          tipo: cat.kind === "tipo" ? (cat.tipo as 'nueva' | 'reencauche') : undefined,
          rimSizes: cat.kind === "rim" ? cat.rimSizes : undefined,
        }}
      />
    </>
  );
}
