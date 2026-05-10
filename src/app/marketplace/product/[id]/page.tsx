import React from "react";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import ProductClient from "./ProductClient";
import { buildProductFaqs } from "./faq";
import { extractListingId, isCanonicalParam, productHref, productSlug } from "../_lib/url";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const SITE = "https://www.tirepro.com.co";

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/marketplace/listings?limit=1000&sortBy=newest`);
    if (!res.ok) return [];
    const data = await res.json();
    // Pre-render the canonical slug-id form so Google/Bing crawl the
    // SEO URL on first hit. The legacy bare-uuid form still works
    // (handled at runtime via permanentRedirect) but we don't pre-render
    // it — no need to ship two static pages per product.
    return (data.listings ?? []).map((l: any) => ({
      id: productSlug(l) ? `${productSlug(l)}-${l.id}` : l.id,
    }));
  } catch {
    return [];
  }
}

export const dynamicParams = true; // Allow on-demand ISR for pages not in generateStaticParams

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

async function fetchProduct(id: string) {
  try {
    const res = await fetch(`${API_BASE}/marketplace/product/${id}`, {
      next: { revalidate: 1800 },
    });
    if (res.ok) return await res.json();
    // Don't poison the 30-min ISR cache with a transient 5xx — retry once
    // with no-store so a temporary backend hiccup doesn't make the page
    // unreachable for half an hour. Real 404s fall through to null below.
    if (res.status >= 500) {
      try {
        const retry = await fetch(`${API_BASE}/marketplace/product/${id}`, { cache: "no-store" });
        if (retry.ok) return await retry.json();
      } catch { /* fall through */ }
    }
    return null;
  } catch {
    // Network error — try once more uncached before giving up.
    try {
      const retry = await fetch(`${API_BASE}/marketplace/product/${id}`, { cache: "no-store" });
      if (retry.ok) return await retry.json();
    } catch { /* */ }
    return null;
  }
}

function brandSlugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

async function fetchBrandInfo(marca: string | null | undefined) {
  if (!marca) return null;
  try {
    const res = await fetch(`${API_BASE}/marketplace/brands/${brandSlugify(marca)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name as string,
      slug: data.slug as string,
      logoUrl: (data.logoUrl ?? null) as string | null,
      country: (data.country ?? null) as string | null,
      tier: (data.tier ?? null) as "premium" | "mid" | "value" | null,
      foundedYear: (data.foundedYear ?? null) as number | null,
      // Editorial brand colors — admin-set per brand. Used to tint
      // accents on the product page so e.g. a Continental product has
      // an orange-red glow vs. Michelin's blue.
      primaryColor: (data.primaryColor ?? null) as string | null,
      accentColor:  (data.accentColor  ?? null) as string | null,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: param } = await params;
  // Param can be either "<uuid>" or "<slug>-<uuid>" — extract the real key.
  const realId = extractListingId(param);
  if (!realId) return { title: "Producto — TirePro Marketplace" };
  const product = await fetchProduct(realId);
  if (!product) return { title: "Producto — TirePro Marketplace" };

  const imgs = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const cover = imgs.length > 0 ? imgs[product.coverIndex ?? 0] ?? imgs[0] : null;
  const hasPromo = product.precioPromo != null && product.promoHasta && new Date(product.promoHasta) > new Date();
  const price = hasPromo ? product.precioPromo : product.precioCop;
  const tipoLabel = product.tipo === "reencauche" ? "Reencauche" : "Nueva";
  const sellerCity = product.distributor?.ciudad ? ` en ${product.distributor.ciudad}` : "";
  const sellerName = product.distributor?.name ?? "TirePro";

  // Title leads with the Spanish noun "Llanta" (matches voice queries like
  // "llantas 205/55R16") then brand+modelo+dimension. Price is intentionally
  // out — it changes more often than Google reindexes the title and the
  // SERP rewriter strips currency strings ~60% of the time anyway. Keeping
  // ~60 chars so it survives Google's truncation on mobile SERP.
  const title = product.tipo === "reencauche"
    ? `Llanta ${product.marca} ${product.modelo} ${product.dimension} reencauche | TirePro Colombia`
    : `Llanta ${product.marca} ${product.modelo} ${product.dimension} | Comprar en Colombia | TirePro`;
  // Description: first 150 chars are what Google shows on mobile. Front-
  // load "Llanta {marca} {modelo} {dimension}" + city/Colombia so the
  // snippet always carries the highest-intent keywords even when truncated.
  const description = `Llanta ${product.marca} ${product.modelo} ${product.dimension} ${tipoLabel.toLowerCase()} en Colombia. Precio ${fmtCOP(price)} con envío${sellerCity || " nacional"}. Distribuidor ${sellerName} verificado en TirePro Marketplace. ${product.descripcion?.substring(0, 80) ?? ""}`.slice(0, 300);
  // Canonical URL is always the slug-id form, regardless of how the page
  // was reached. Search engines de-duplicate to this URL.
  const url = `${SITE}${productHref(product)}`;
  const ogImage = cover || "https://www.tirepro.com.co/og-image.png";

  return {
    title,
    description,
    keywords: [
      `${product.marca} ${product.modelo}`,
      `${product.marca} ${product.modelo} ${product.dimension}`,
      `${product.marca} ${product.dimension}`,
      `llanta ${product.marca}`,
      `comprar ${product.marca} ${product.modelo}`,
      `precio ${product.marca} ${product.dimension}`,
      `llanta ${product.dimension}`,
      `llanta ${product.dimension} colombia`,
      `${product.marca} ${product.dimension} ${product.distributor?.ciudad ?? "colombia"}`,
      product.tipo === "reencauche" ? `reencauche ${product.dimension}` : `llanta nueva ${product.dimension}`,
    ].filter(Boolean),
    // Canonical + hreflang. es-CO is the primary locale; the bare `es`
    // tag picks up Spanish-speaking traffic from outside Colombia
    // (Mexican / Peruvian buyers shipping to CO addresses, etc.) so
    // Google routes them to the same canonical URL instead of guessing.
    alternates: {
      canonical: url,
      languages: {
        "es-CO": url,
        "es":    url,
        "x-default": url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "TirePro Marketplace",
      locale: "es_CO",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${product.marca} ${product.modelo} ${product.dimension}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.marca} ${product.modelo} ${product.dimension} | TirePro`,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    other: {
      "product:price:amount": String(price),
      "product:price:currency": "COP",
      "product:availability": product.cantidadDisponible > 0 ? "in stock" : "preorder",
      "product:condition": product.tipo === "reencauche" ? "refurbished" : "new",
      "product:brand": product.marca,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: param } = await params;
  const realId = extractListingId(param);
  if (!realId) {
    return <ProductClient initialProduct={null} />;
  }
  const product = await fetchProduct(realId);

  if (!product) {
    return <ProductClient initialProduct={null} />;
  }

  // 301 to the canonical slug-id URL when the visitor landed on the bare
  // UUID (legacy backlinks, old Google index entries, manual share links)
  // OR on a slug-id URL whose slug is stale (product renamed).
  if (!isCanonicalParam(param, product)) {
    permanentRedirect(productHref(product));
  }

  // Brand info — fetched in parallel-friendly way for the clickable brand pill
  const brandInfo = await fetchBrandInfo(product.marca);

  const imgs = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const cover = imgs.length > 0 ? imgs[product.coverIndex ?? 0] ?? imgs[0] : null;
  const hasPromo = product.precioPromo != null && product.promoHasta && new Date(product.promoHasta) > new Date();
  const price = hasPromo ? product.precioPromo : product.precioCop;
  const avgRating = product.reviews?.length > 0
    ? (product.reviews.reduce((s: number, r: any) => s + r.rating, 0) / product.reviews.length).toFixed(1)
    : null;

  // JSON-LD structured data — formatted for Google Merchant Center / free
  // product listings (Surfaces across Google) so the product can show in
  // Search, Shopping tab, Images and Lens.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.marca} ${product.modelo} ${product.dimension}`,
    description: product.descripcion || `Llanta ${product.marca} ${product.modelo} ${product.dimension} para flotas en Colombia. Disponible en TirePro Marketplace con envío nacional.`,
    image: imgs.length > 0 ? imgs : undefined,
    brand: { "@type": "Brand", name: product.marca },
    sku: product.id,
    mpn: product.id,
    productID: product.id,
    // Freshness signal — Google ranks recently-updated commerce
    // pages higher in QDF (Query Deserves Freshness) contexts like
    // promo periods. Falls back to current time so a listing without
    // updatedAt still gets a recent date.
    dateModified: (product.updatedAt ?? new Date().toISOString()),
    category: "Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Parts > Motor Vehicle Tires",
    // Voice-search hint — tells Google Assistant / Siri / Alexa which
    // parts of the page to read aloud when a user asks "Hey Google,
    // search for Michelin XZE2+ 295/80R22.5". Targets the H1 (brand +
    // model + dimension keyword phrase) plus the descriptive paragraph
    // in the SEO copy block (aria-labelledby="product-seo"). Both are
    // server-rendered so the snippets are present at first byte.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "[aria-labelledby='product-seo'] p"],
    },
    itemCondition: product.tipo === "reencauche"
      ? "https://schema.org/RefurbishedCondition"
      : "https://schema.org/NewCondition",
    size: product.dimension,
    offers: {
      "@type": "Offer",
      url: `${SITE}${productHref(product)}`,
      priceCurrency: "COP",
      price: price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: product.cantidadDisponible > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      itemCondition: product.tipo === "reencauche"
        ? "https://schema.org/RefurbishedCondition"
        : "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: product.distributor?.name,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 0,
          currency: "COP",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "CO",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 5, unitCode: "d" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 7, unitCode: "d" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "CO",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 15,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    ...(product.reviews?.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount: product.reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
      // Surface every review in JSON-LD (capped at 50 to keep the
      // payload under Google's 100KB structured-data soft limit on
      // products with hundreds of reviews — but well above the prior
      // arbitrary 5-review cap that left most data invisible).
      review: product.reviews.slice(0, 50).map((r: any) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.user?.name ?? "Usuario" },
        datePublished: r.createdAt,
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
        ...(r.comment && { reviewBody: r.comment }),
      })),
    }),
    additionalProperty: [
      ...(product.dimension ? [{ "@type": "PropertyValue", name: "Dimension", value: product.dimension }] : []),
      ...(product.catalog?.terreno ? [{ "@type": "PropertyValue", name: "Terreno", value: product.catalog.terreno }] : []),
      ...(product.catalog?.kmEstimadosReales ? [{ "@type": "PropertyValue", name: "Km Estimados", value: String(product.catalog.kmEstimadosReales) }] : []),
      ...(product.catalog?.psiRecomendado ? [{ "@type": "PropertyValue", name: "PSI Recomendado", value: String(product.catalog.psiRecomendado) }] : []),
    ],
  };

  // Breadcrumb structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Marketplace", item: "https://www.tirepro.com.co/marketplace" },
      { "@type": "ListItem", position: 2, name: product.distributor?.name, item: `https://www.tirepro.com.co/marketplace/distributor/${product.distributor?.slug ?? product.distributor?.id}` },
      { "@type": "ListItem", position: 3, name: `${product.marca} ${product.modelo}` },
    ],
  };

  // FAQPage structured data — same Q&A array the visible <Faq /> on
  // ProductClient renders, so what crawlers index always matches what
  // buyers see (Google penalises mismatched FAQ schema). Cite-ability
  // for AI search engines (Perplexity / Google AI Overview / ChatGPT
  // browsing) is the main payoff.
  const faqs = buildProductFaqs(product);
  const faqStructuredData = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f: { q: string; a: string }) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <>
      {/* SEO: structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      {faqStructuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      )}

      {/* SEO: server-rendered content for crawlers. The H1 lives in
          ProductClient as a *visible* element with the full keyword
          phrase (Llanta {marca} {modelo} {dimension}) — Google deranks
          pages whose only H1 is hidden, so we don't ship one here. */}
      <div className="sr-only" aria-hidden="false">
        <p>Comprar {product.marca} {product.modelo} {product.dimension} por {fmtCOP(price)} COP. {product.tipo === "reencauche" ? "Llanta reencauchada." : "Llanta nueva."} Distribuidor: {product.distributor?.name}{product.distributor?.ciudad ? `, ${product.distributor.ciudad}` : ""}. {product.descripcion ?? ""}</p>
        {product.catalog && (
          <ul>
            {product.catalog.terreno && <li>Terreno: {product.catalog.terreno}</li>}
            {product.catalog.kmEstimadosReales && <li>Km estimados: {product.catalog.kmEstimadosReales.toLocaleString()}</li>}
            {product.catalog.psiRecomendado && <li>PSI recomendado: {product.catalog.psiRecomendado}</li>}
            {product.catalog.reencauchable && <li>Reencauchable</li>}
          </ul>
        )}
        {avgRating && <p>Calificacion: {avgRating}/5 ({product.reviews.length} resenas)</p>}
        {product.totalSold != null && product.totalSold > 0 && <p>{product.totalSold} unidades vendidas</p>}
      </div>

      {/* Interactive client component */}
      <ProductClient initialProduct={product} brandInfo={brandInfo} />
    </>
  );
}
