import React from "react";
import ProductClient from "./ProductClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/marketplace/listings?limit=500&sortBy=newest`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.listings ?? []).map((l: any) => ({ id: l.id }));
  } catch {
    return [];
  }
}

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

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return <ProductClient initialProduct={null} />;
  }

  const imgs = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const cover = imgs.length > 0 ? imgs[product.coverIndex ?? 0] ?? imgs[0] : null;
  const hasPromo = product.precioPromo != null && product.promoHasta && new Date(product.promoHasta) > new Date();
  const price = hasPromo ? product.precioPromo : product.precioCop;
  const avgRating = product.reviews?.length > 0
    ? (product.reviews.reduce((s: number, r: any) => s + r.rating, 0) / product.reviews.length).toFixed(1)
    : null;

  // JSON-LD structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.marca} ${product.modelo}`,
    description: product.descripcion || `Llanta ${product.marca} ${product.modelo} ${product.dimension} para flotas en Colombia.`,
    image: imgs.length > 0 ? imgs : undefined,
    brand: { "@type": "Brand", name: product.marca },
    sku: product.id,
    mpn: product.dimension,
    category: product.tipo === "reencauche" ? "Llantas Reencauchadas" : "Llantas Nuevas",
    offers: {
      "@type": "Offer",
      url: `https://tirepro.com.co/marketplace/product/${id}`,
      priceCurrency: "COP",
      price: price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: product.cantidadDisponible > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      seller: {
        "@type": "Organization",
        name: product.distributor?.name,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
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
      { "@type": "ListItem", position: 1, name: "Marketplace", item: "https://tirepro.com.co/marketplace" },
      { "@type": "ListItem", position: 2, name: product.distributor?.name, item: `https://tirepro.com.co/marketplace/distributor/${product.distributor?.id}` },
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
      <ProductClient initialProduct={product} />
    </>
  );
}
