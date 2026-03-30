import type { Metadata } from "next";
import Script from "next/script";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

async function fetchProfile(id: string) {
  try {
    const res = await fetch(`${API_BASE}/marketplace/distributor/${id}/profile`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/marketplace/listings?limit=500&sortBy=newest`);
    if (!res.ok) return [];
    const data = await res.json();
    const ids = new Set<string>();
    for (const l of data.listings ?? []) {
      if (l.distributor?.id) ids.add(l.distributor.id);
    }
    return [...ids].map((id) => ({ id }));
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = await fetchProfile(id);
  if (!d) return { title: "Distribuidor — TirePro Marketplace" };

  const title = `${d.name} — Distribuidor de Llantas${d.ciudad ? ` en ${d.ciudad}` : ""} | TirePro`;
  const description = `Compra llantas de ${d.name}${d.ciudad ? ` en ${d.ciudad}` : ""}, distribuidor verificado en TirePro. ${d._count?.listings ?? 0} productos disponibles. ${d.descripcion?.substring(0, 120) ?? "Llantas nuevas y reencauche con envio a toda Colombia."}`;
  const image = d.bannerImage || d.profileImage || "https://tirepro.com.co/og-image.png";
  const cobertura = Array.isArray(d.cobertura) ? d.cobertura : [];
  const cobCities = cobertura.map((c: any) => typeof c === "string" ? c : c.ciudad).filter(Boolean);

  return {
    title,
    description,
    keywords: [
      d.name, `${d.name} llantas`, `distribuidor llantas ${d.ciudad ?? "Colombia"}`,
      `comprar llantas ${d.ciudad ?? ""}`, "distribuidor verificado", "llantas Colombia",
      ...cobCities.map((c: string) => `llantas ${c}`),
      ...cobCities.map((c: string) => `distribuidor llantas ${c}`),
    ].filter(Boolean),
    openGraph: {
      title: `${d.name} — Llantas en ${d.ciudad ?? "Colombia"}`,
      description,
      url: `https://tirepro.com.co/marketplace/distributor/${id}`,
      siteName: "TirePro Marketplace",
      locale: "es_CO",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: `${d.name} — distribuidor de llantas` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${d.name} — Llantas | TirePro`,
      description,
      images: [image],
    },
    alternates: { canonical: `https://tirepro.com.co/marketplace/distributor/${id}` },
  };
}

export default async function DistributorLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await fetchProfile(id);

  const structuredData = d ? {
    "@context": "https://schema.org",
    "@type": "Store",
    name: d.name,
    description: d.descripcion || `Distribuidor verificado de llantas en Colombia`,
    url: `https://tirepro.com.co/marketplace/distributor/${id}`,
    image: d.bannerImage || d.profileImage || undefined,
    logo: d.profileImage || undefined,
    telephone: d.telefono || undefined,
    email: d.emailAtencion || undefined,
    ...(d.sitioWeb && { sameAs: [d.sitioWeb] }),
    address: {
      "@type": "PostalAddress",
      addressLocality: d.ciudad || "Colombia",
      addressCountry: "CO",
      ...(d.direccion && { streetAddress: d.direccion }),
    },
    ...(d._count?.listings > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `Catalogo de llantas de ${d.name}`,
        numberOfItems: d._count.listings,
      },
    }),
    areaServed: (Array.isArray(d.cobertura) && d.cobertura.length > 0)
      ? d.cobertura.map((c: any) => ({
          "@type": "City",
          name: typeof c === "string" ? c : c.ciudad,
        }))
      : { "@type": "Country", name: "Colombia" },
    priceRange: "$",
    currenciesAccepted: "COP",
    paymentAccepted: "Credit Card, Debit Card, PSE, Nequi",
    isPartOf: { "@type": "WebSite", name: "TirePro", url: "https://tirepro.com.co" },
  } : null;

  const breadcrumbData = d ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Marketplace", item: "https://tirepro.com.co/marketplace" },
      { "@type": "ListItem", position: 2, name: d.name },
    ],
  } : null;

  return (
    <>
      {structuredData && (
        <Script id="distributor-jsonld" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      )}
      {breadcrumbData && (
        <Script id="distributor-breadcrumb" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      )}
      {children}
    </>
  );
}
