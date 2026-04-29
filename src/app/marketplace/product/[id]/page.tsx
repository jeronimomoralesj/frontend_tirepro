import React from "react";
import type { Metadata } from "next";
import ProductClient from "./ProductClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/marketplace/listings?limit=1000&sortBy=newest`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.listings ?? []).map((l: any) => ({ id: l.id }));
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
    if (!res.ok) return null;
    return await res.json();
  } catch {
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
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) return { title: "Producto — TirePro Marketplace" };

  const imgs = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const cover = imgs.length > 0 ? imgs[product.coverIndex ?? 0] ?? imgs[0] : null;
  const hasPromo = product.precioPromo != null && product.promoHasta && new Date(product.promoHasta) > new Date();
  const price = hasPromo ? product.precioPromo : product.precioCop;
  const tipoLabel = product.tipo === "reencauche" ? "Reencauche" : "Nueva";
  const sellerCity = product.distributor?.ciudad ? ` en ${product.distributor.ciudad}` : "";
  const sellerName = product.distributor?.name ?? "TirePro";

  // Title leads with brand+modelo+dimension — these are the highest-intent
  // keywords for product queries (e.g. "Michelin XZE2+ 295/80R22.5 precio").
  const title = `${product.marca} ${product.modelo} ${product.dimension} — ${fmtCOP(price)} | ${tipoLabel} | TirePro`;
  const description = `Compra ${product.marca} ${product.modelo} ${product.dimension} (${tipoLabel.toLowerCase()}) por ${fmtCOP(price)} COP de ${sellerName}${sellerCity}. Envio en Colombia. ${product.descripcion?.substring(0, 100) ?? "Distribuidor verificado en TirePro Marketplace."}`.slice(0, 300);
  const url = `https://www.tirepro.com.co/marketplace/product/${id}`;
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
    alternates: { canonical: url },
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
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return <ProductClient initialProduct={null} />;
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
    category: "Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Parts > Motor Vehicle Tires",
    itemCondition: product.tipo === "reencauche"
      ? "https://schema.org/RefurbishedCondition"
      : "https://schema.org/NewCondition",
    size: product.dimension,
    offers: {
      "@type": "Offer",
      url: `https://www.tirepro.com.co/marketplace/product/${id}`,
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
      review: product.reviews.slice(0, 5).map((r: any) => ({
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

  return (
    <>
      {/* SEO: structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />

      {/* SEO: server-rendered content for crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>{product.marca} {product.modelo} — {product.dimension} | Comprar en TirePro</h1>
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
