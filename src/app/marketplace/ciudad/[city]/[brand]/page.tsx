// =============================================================================
// /marketplace/ciudad/[city]/[brand] — city × brand landing page.
//
// Pre-renders 96 pages (8 cities × 12 brands) targeting stacked-intent
// queries like "Michelin en Bogotá", "comprar Bridgestone Medellín",
// "distribuidor Continental Cali". Each combination is a unique URL
// with its own canonical, JSON-LD entity stack, and product grid
// pre-filtered server-side.
//
// JSON-LD: CollectionPage + Brand + LocalBusiness array (for the
// distributors with cobertura in the city) + AggregateOffer + FAQPage
// + BreadcrumbList. The Brand reference points back to the canonical
// /marketplace/brand/<slug> entity so Google merges the citation.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Package, ShieldCheck, Star, MapPin } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../../components/MarketplaceShell";
import { CITY_BRAND_PAIRS, brandFromSlug, TOP_BRANDS } from "../../_lib/city-brand-pairs";
import { cityFromSlug } from "../../_lib/cities";
import { productHref } from "../../../product/_lib/url";

const SITE = "https://www.tirepro.com.co";
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

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
  cantidadDisponible: number | null;
  distributor?: { id: string; slug?: string | null; name: string; profileImage?: string | null; ciudad?: string | null };
}

const TIER_LABEL: Record<string, string> = {
  premium: "Premium",
  mid: "Intermedia",
  value: "Económica",
};
const TIER_COLOR: Record<string, string> = {
  premium: "#f59e0b",
  mid: "#1E76B6",
  value: "#64748b",
};

export const revalidate = 1800;

export async function generateStaticParams() {
  return CITY_BRAND_PAIRS.map((p) => ({ city: p.citySlug, brand: p.brandSlug }));
}
// Allow runtime rendering of any (city, brand) combination not in the
// pre-rendered set — the page falls back to notFound() if either side
// is invalid, so we don't accept random slugs.
export const dynamicParams = true;

async function fetchListings(cityName: string, brandName: string): Promise<{ listings: Listing[]; total: number }> {
  try {
    const params = new URLSearchParams({
      ciudad: cityName,
      marca: brandName,
      limit: "60",
      sortBy: "newest",
    });
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
  { params }: { params: Promise<{ city: string; brand: string }> },
): Promise<Metadata> {
  const { city: citySlug, brand: brandSlug } = await params;
  const city = cityFromSlug(citySlug);
  const brand = brandFromSlug(brandSlug);
  if (!city || !brand) return { title: "Página no encontrada · TirePro" };

  const url = `${SITE}/marketplace/ciudad/${citySlug}/${brandSlug}`;
  const title = `Llantas ${brand.name} en ${city.name} | Comprar online — TirePro`;
  const description =
    `Comprar llantas ${brand.name} en ${city.name}, ${city.department}. ` +
    `Distribuidores verificados con envío local, precios actualizados y catálogo completo de ` +
    `${brand.name}${brand.country ? ` (${brand.country})` : ""} en TirePro Marketplace.`;

  return {
    title,
    description: description.slice(0, 300),
    keywords: [
      `${brand.name.toLowerCase()} ${city.name.toLowerCase()}`,
      `${brand.name.toLowerCase()} en ${city.name.toLowerCase()}`,
      `comprar ${brand.name.toLowerCase()} ${city.name.toLowerCase()}`,
      `comprar ${brand.name.toLowerCase()} en ${city.name.toLowerCase()}`,
      `distribuidor ${brand.name.toLowerCase()} ${city.name.toLowerCase()}`,
      `llantas ${brand.name.toLowerCase()} ${city.name.toLowerCase()}`,
      `llantas ${brand.name.toLowerCase()} en ${city.name.toLowerCase()}`,
      `precio llantas ${brand.name.toLowerCase()} ${city.name.toLowerCase()}`,
      `${brand.name.toLowerCase()} ${city.department.toLowerCase()}`,
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "TirePro",
      locale: "es_CO",
      type: "website",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function CityBrandPage(
  { params }: { params: Promise<{ city: string; brand: string }> },
) {
  const { city: citySlug, brand: brandSlug } = await params;
  const city = cityFromSlug(citySlug);
  const brand = brandFromSlug(brandSlug);
  if (!city || !brand) notFound();

  const { listings, total } = await fetchListings(city.name, brand.name);
  const url = `${SITE}/marketplace/ciudad/${citySlug}/${brandSlug}`;

  // ── Computed facts ───────────────────────────────────────────────────
  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;
  const fromPriceStr = lowPrice ? fmtCOP(lowPrice) : null;

  // Distinct distributors with cobertura in this city
  const distMap = new Map<string, NonNullable<Listing["distributor"]> & { count: number }>();
  for (const l of listings) {
    if (!l.distributor?.id) continue;
    const existing = distMap.get(l.distributor.id);
    if (existing) existing.count += 1;
    else distMap.set(l.distributor.id, { ...l.distributor, count: 1 });
  }
  const distributors = Array.from(distMap.values()).sort((a, b) => b.count - a.count);

  // Top dimensions for this brand-in-this-city
  const dimCounts = new Map<string, number>();
  for (const l of listings) if (l.dimension) dimCounts.set(l.dimension, (dimCounts.get(l.dimension) ?? 0) + 1);
  const topDims = Array.from(dimCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d]) => d);

  // ── JSON-LD ─────────────────────────────────────────────────────────
  const collectionLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    name: `Llantas ${brand.name} en ${city.name}`,
    description: `Catálogo de llantas ${brand.name} disponibles en ${city.name}, ${city.department}. ${total} producto${total === 1 ? "" : "s"} de distribuidores verificados con envío local.`,
    url,
    inLanguage: "es-CO",
    isPartOf: { "@type": "WebSite", name: "TirePro", url: SITE },
    spatialCoverage: {
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "AdministrativeArea", name: city.department, addressCountry: "CO" },
      geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lng },
    },
    about: {
      "@type": "Brand",
      "@id": `${SITE}/marketplace/brand/${brand.slug}#brand`,
      name: brand.name,
      url: `${SITE}/marketplace/brand/${brand.slug}`,
    },
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

  const distributorsLd = distributors.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Distribuidores de ${brand.name} en ${city.name}`,
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
            areaServed: { "@type": "City", name: city.name },
            address: { "@type": "PostalAddress", addressLocality: city.name, addressRegion: city.department, addressCountry: "CO" },
          },
        })),
      }
    : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro",     item: SITE },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: `${SITE}/marketplace` },
      { "@type": "ListItem", position: 3, name: city.name,     item: `${SITE}/marketplace/ciudad/${citySlug}` },
      { "@type": "ListItem", position: 4, name: brand.name,    item: url },
    ],
  };

  const faqs = [
    {
      q: `¿Dónde comprar llantas ${brand.name} en ${city.name}?`,
      a: distributors.length > 0
        ? `En TirePro Marketplace puedes comprar llantas ${brand.name} en ${city.name} de ${distributors.length} distribuidor${distributors.length === 1 ? "" : "es"} verificado${distributors.length === 1 ? "" : "s"} con envío local: ${distributors.slice(0, 5).map((d) => d.name).join(", ")}${distributors.length > 5 ? " y más" : ""}. Compara precios y catálogo en línea.`
        : `TirePro Marketplace conecta a compradores en ${city.name} con distribuidores verificados de ${brand.name}. Consulta la disponibilidad y solicita envío a ${city.name}.`,
    },
    {
      q: `¿Cuánto cuestan las llantas ${brand.name} en ${city.name}?`,
      a: fromPriceStr
        ? `Los precios de ${brand.name} en ${city.name} parten desde ${fromPriceStr}, dependiendo del modelo, dimensión y si es nueva o reencauche. ${total} producto${total === 1 ? "" : "s"} disponible${total === 1 ? "" : "s"} con precios actualizados al momento.`
        : `Los precios varían según modelo y dimensión. Consulta el catálogo en línea para precios actualizados.`,
    },
    {
      q: `¿En qué dimensiones hay disponibilidad de ${brand.name} en ${city.name}?`,
      a: topDims.length > 0
        ? `Las dimensiones más comunes de ${brand.name} en ${city.name} son ${topDims.slice(0, 6).join(", ")}. El catálogo se actualiza diariamente con nuevos lotes de los distribuidores con cobertura local.`
        : `Las dimensiones disponibles dependen del distribuidor. Consulta el catálogo en línea.`,
    },
    {
      q: `¿${brand.name} es una buena marca para mi vehículo?`,
      a: brand.tier === "premium"
        ? `${brand.name} es una marca premium${brand.country ? ` ${brand.country.toLowerCase()}` : ""}, recomendada para aplicaciones donde la durabilidad y el rendimiento justifican un precio más alto: ejes de dirección de pasajero, autopistas con velocidad sostenida, flotas pesadas con carga frecuente.`
        : brand.tier === "mid"
        ? `${brand.name} es una marca intermedia${brand.country ? ` ${brand.country.toLowerCase()}` : ""}, con buena relación precio-rendimiento. Apropiada para uso diario, flotas con CPK presionado y aplicaciones donde el premium no se paga.`
        : `${brand.name} es una marca económica${brand.country ? ` ${brand.country.toLowerCase()}` : ""}, enfocada en optimizar CPK. Apropiada para flotas con presupuesto ajustado, ejes de remolque y aplicaciones donde el reemplazo frecuente es aceptable.`,
    },
    {
      q: `¿Cómo recibo mi pedido de ${brand.name} en ${city.name}?`,
      a: `Una vez completes la compra, el distribuidor coordina el despacho a la dirección que registres en ${city.name}. Los tiempos típicos van de 1 a 5 días hábiles. Algunos distribuidores ofrecen también recogida en sus puntos físicos.`,
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

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <>
      <Script id="cb-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      {distributorsLd && (
        <Script id="cb-distributors-jsonld" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(distributorsLd) }} />
      )}
      <Script id="cb-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="cb-faq-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="min-h-screen bg-[#f5f5f7]">
        <MarketplaceNav />

        {/* HERO */}
        <section
          style={{
            background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)",
            color: "#fff",
            padding: "44px 16px 36px",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.7, marginBottom: 14 }}>
              <Link href="/marketplace" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontWeight: 600 }}>
                Marketplace
              </Link>
              <span>›</span>
              <Link href={`/marketplace/ciudad/${citySlug}`} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontWeight: 600 }}>
                {city.name}
              </Link>
            </div>
            <p style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
              Marca en ciudad
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, lineHeight: 1.1 }}>
              Llantas {brand.name} en {city.name}
            </h1>
            <p style={{ fontSize: 15, opacity: 0.92, marginTop: 10, maxWidth: 720, lineHeight: 1.55 }}>
              {total} producto{total === 1 ? "" : "s"} de {brand.name} disponible{total === 1 ? "" : "s"} en {city.name}, {city.department}
              {fromPriceStr ? `, desde ${fromPriceStr}` : ""}, de {distributors.length} distribuidor{distributors.length === 1 ? "" : "es"} verificado{distributors.length === 1 ? "" : "s"} con envío local.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.15)", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                <ShieldCheck className="w-3 h-3" style={{ color: TIER_COLOR[brand.tier] }} />
                {TIER_LABEL[brand.tier]}{brand.country ? ` · ${brand.country}` : ""}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.15)", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                <MapPin className="w-3 h-3" />
                {city.name}, {city.department}
              </span>
            </div>
          </div>
        </section>

        {/* PRODUCT GRID */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 16px 40px" }}>
          {listings.length === 0 ? (
            <div
              style={{
                background: "#fff", borderRadius: 14, padding: "32px 24px",
                textAlign: "center", border: "1px solid rgba(10,24,58,0.08)",
              }}
            >
              <Package className="w-10 h-10" style={{ margin: "0 auto 12px", color: "#cbd5e1" }} />
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 6 }}>
                Sin stock actual de {brand.name} en {city.name}
              </h2>
              <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>
                Consulta el catálogo completo de {brand.name} o explora el marketplace de {city.name}.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href={`/marketplace/brand/${brand.slug}`}
                  style={{
                    padding: "10px 16px", background: "#0A183A", color: "#fff",
                    borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 13,
                  }}
                >
                  Catálogo {brand.name}
                </Link>
                <Link
                  href={`/marketplace/ciudad/${citySlug}`}
                  style={{
                    padding: "10px 16px", background: "#fff", color: "#0A183A",
                    borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 13,
                    border: "1px solid rgba(10,24,58,0.12)",
                  }}
                >
                  Llantas en {city.name}
                </Link>
              </div>
            </div>
          ) : (
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 14,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {listings.slice(0, 24).map((l) => {
                const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                const cover = imgs[l.coverIndex ?? 0] ?? imgs[0] ?? null;
                const promoActive = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                const price = promoActive ? l.precioPromo! : l.precioCop;
                return (
                  <li key={l.id}>
                    <Link
                      href={productHref(l)}
                      style={{
                        display: "flex", flexDirection: "column",
                        background: "#fff", border: "1px solid rgba(10,24,58,0.08)",
                        borderRadius: 14, textDecoration: "none", color: "inherit",
                        height: "100%", overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", aspectRatio: "1", background: "#F8FAFC" }}>
                        {cover ? (
                          <Image
                            src={cover}
                            alt={`${l.marca} ${l.modelo} ${l.dimension}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                            style={{ objectFit: "contain", padding: 16 }}
                          />
                        ) : (
                          <Package className="w-10 h-10" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#cbd5e1" }} />
                        )}
                      </div>
                      <div style={{ padding: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#1E76B6", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                          {l.marca}
                        </p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0A183A", marginBottom: 6, lineHeight: 1.3 }}>
                          {l.modelo} {l.dimension}
                        </p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: "#0A183A" }}>
                          {fmtCOP(Math.round(price * 1.19))}
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginLeft: 4 }}>IVA inc.</span>
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {total > 24 && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link
                href={`/marketplace?q=${encodeURIComponent(brand.name)}&ciudad=${encodeURIComponent(city.name)}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", background: "#0A183A", color: "#fff",
                  borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 13,
                }}
              >
                Ver los {total} productos de {brand.name} en {city.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* DISTRIBUTORS WITH COVERAGE */}
        {distributors.length > 0 && (
          <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px 32px" }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", border: "1px solid rgba(10,24,58,0.08)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
                Distribuidores que entregan {brand.name} en {city.name}
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
                {distributors.slice(0, 12).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/marketplace/distributor/${d.slug ?? d.id}`}
                      style={{
                        display: "block", padding: "10px 14px",
                        background: "#F8FAFC", border: "1px solid rgba(10,24,58,0.08)",
                        borderRadius: 10, color: "#0A183A", textDecoration: "none",
                        fontWeight: 600, fontSize: 13.5,
                      }}
                    >
                      {d.name}
                      <span style={{ color: "#64748b", fontWeight: 400, marginLeft: 6 }}>
                        · {d.count} producto{d.count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px 32px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", border: "1px solid rgba(10,24,58,0.08)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
              Preguntas frecuentes sobre {brand.name} en {city.name}
            </h2>
            {faqs.map((f, i) => (
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
          </div>
        </section>

        {/* CROSS-LINK MESH: other brands in the same city */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px 64px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", border: "1px solid rgba(10,24,58,0.08)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 10 }}>
              Otras marcas disponibles en {city.name}
            </h2>
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 8,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {TOP_BRANDS.filter((b) => b.slug !== brand.slug).map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/marketplace/ciudad/${citySlug}/${b.slug}`}
                    style={{
                      display: "block", padding: "10px 14px",
                      background: "#F8FAFC", border: "1px solid rgba(10,24,58,0.08)",
                      borderRadius: 10, color: "#0A183A", textDecoration: "none",
                      fontWeight: 700, fontSize: 13.5, textAlign: "center",
                    }}
                  >
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <MarketplaceFooter />
      </div>
    </>
  );
}
