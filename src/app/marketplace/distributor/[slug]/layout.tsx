import type { Metadata } from "next";
import Script from "next/script";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchProfile(idOrSlug: string) {
  try {
    const res = await fetch(`${API_BASE}/marketplace/distributor/${idOrSlug}/profile`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/marketplace/listings?limit=500&sortBy=newest`);
    if (!res.ok) return [];
    const data = await res.json();
    const slugs = new Set<string>();
    for (const l of data.listings ?? []) {
      // Only pre-render real slug URLs. If a distributor is missing a slug
      // (or the backend hasn't deployed yet) we fall back to dynamic SSR for
      // its UUID URL — which lets page.tsx emit a 308 redirect to the slug
      // canonical instead of statically rendering the UUID page.
      if (l.distributor?.slug) slugs.add(l.distributor.slug);
    }
    return [...slugs].map((slug) => ({ slug }));
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await fetchProfile(slug);
  if (!d) return { title: "Distribuidor — TirePro Marketplace" };

  // Canonical always points to the slug URL — never the UUID — even if the
  // crawler arrived via UUID. Google then attributes all link equity to the
  // single canonical slug page instead of splitting it.
  const canonicalHandle = d.slug ?? slug;
  const canonical = `https://www.tirepro.com.co/marketplace/distributor/${canonicalHandle}`;

  // Lead the title with the brand name verbatim — search engines weight the
  // very first words heavily for brand-name queries.
  const cityTag = d.ciudad ? ` en ${d.ciudad}` : "";
  const title = `${d.name} — Distribuidor Oficial de Llantas${cityTag} | TirePro`;
  const description = `${d.name} es un distribuidor verificado de llantas${cityTag}. ${d._count?.listings ?? 0} productos disponibles en TirePro Marketplace. ${d.descripcion?.substring(0, 110) ?? "Llantas nuevas y reencauche con envío a toda Colombia."}`;
  const image = d.bannerImage || d.profileImage || "https://www.tirepro.com.co/og-image.png";
  const cobertura = Array.isArray(d.cobertura) ? d.cobertura : [];
  const cobCities = cobertura.map((c: any) => typeof c === "string" ? c : c.ciudad).filter(Boolean);

  return {
    title,
    description,
    keywords: [
      d.name,
      `${d.name} llantas`,
      `${d.name} ${d.ciudad ?? "Colombia"}`,
      `${d.name} distribuidor`,
      `${d.name} catálogo`,
      `${d.name} precios`,
      `comprar en ${d.name}`,
      `distribuidor llantas ${d.ciudad ?? "Colombia"}`,
      `comprar llantas ${d.ciudad ?? ""}`,
      "distribuidor verificado", "llantas Colombia",
      ...cobCities.map((c: string) => `llantas ${c}`),
      ...cobCities.map((c: string) => `distribuidor llantas ${c}`),
    ].filter(Boolean),
    openGraph: {
      title: `${d.name} — Llantas en ${d.ciudad ?? "Colombia"} | TirePro`,
      description,
      url: canonical,
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
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    other: {
      "og:see_also": d.sitioWeb || "",
    },
  };
}

export default async function DistributorLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await fetchProfile(slug);

  // All structured data points at the canonical slug URL, never a UUID.
  const canonicalHandle = d?.slug ?? slug;
  const canonical = `https://www.tirepro.com.co/marketplace/distributor/${canonicalHandle}`;

  const sameAs = [
    d?.sitioWeb,
    d?.facebookUrl,
    d?.instagramUrl,
    d?.linkedinUrl,
    d?.twitterUrl,
  ].filter(Boolean);

  const structuredData = d ? {
    "@context": "https://schema.org",
    "@type": ["Store", "LocalBusiness", "AutoPartsStore"],
    "@id": `${canonical}#org`,
    name: d.name,
    alternateName: [d.name, `${d.name} Llantas`, `${d.name} ${d.ciudad ?? ""}`].filter(Boolean),
    description: d.descripcion || `${d.name} es un distribuidor verificado de llantas en ${d.ciudad ?? "Colombia"}, con catálogo completo en TirePro Marketplace.`,
    url: canonical,
    image: d.bannerImage || d.profileImage || undefined,
    logo: d.profileImage || undefined,
    telephone: d.telefono || undefined,
    email: d.emailAtencion || undefined,
    ...(sameAs.length > 0 && { sameAs }),
    address: {
      "@type": "PostalAddress",
      addressLocality: d.ciudad || "Colombia",
      addressCountry: "CO",
      ...(d.direccion && { streetAddress: d.direccion }),
    },
    ...(d.latitude && d.longitude && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: d.latitude,
        longitude: d.longitude,
      },
    }),
    ...(d._count?.listings > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `Catálogo de llantas de ${d.name}`,
        numberOfItems: d._count.listings,
      },
      makesOffer: {
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          name: `Llantas de ${d.name}`,
          category: "Llantas para vehículos",
        },
      },
    }),
    areaServed: (Array.isArray(d.cobertura) && d.cobertura.length > 0)
      ? d.cobertura.map((c: any) => ({
          "@type": "City",
          name: typeof c === "string" ? c : c.ciudad,
        }))
      : { "@type": "Country", name: "Colombia" },
    priceRange: "$$",
    currenciesAccepted: "COP",
    paymentAccepted: "Credit Card, Debit Card, PSE, Nequi",
    isPartOf: { "@type": "WebSite", name: "TirePro", url: "https://www.tirepro.com.co" },
  } : null;

  const breadcrumbData = d ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Marketplace", item: "https://www.tirepro.com.co/marketplace" },
      { "@type": "ListItem", position: 2, name: d.name, item: canonical },
    ],
  } : null;

  const cityList = d && Array.isArray(d.cobertura)
    ? d.cobertura.map((c: any) => (typeof c === "string" ? c : c.ciudad)).filter(Boolean)
    : [];

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

      {d && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <h1>{d.name} — Distribuidor de Llantas{d.ciudad ? ` en ${d.ciudad}` : ""}</h1>
          <h2>Comprar llantas en {d.name}</h2>
          <p>
            {d.name} es un distribuidor verificado de llantas{d.ciudad ? ` ubicado en ${d.ciudad}` : ""} en TirePro Marketplace.
            {d._count?.listings ? ` Catálogo con ${d._count.listings} productos disponibles para flotas, camiones, tractomulas, buses y vehículos particulares.` : " Catálogo de llantas nuevas y reencauche."}
            {d.descripcion ? ` ${d.descripcion}` : ""}
          </p>
          {d.telefono && <p>Teléfono de contacto: {d.telefono}</p>}
          {d.emailAtencion && <p>Correo: {d.emailAtencion}</p>}
          {d.direccion && <p>Dirección: {d.direccion}{d.ciudad ? `, ${d.ciudad}` : ""}, Colombia</p>}
          {cityList.length > 0 && (
            <>
              <h3>Cobertura de {d.name}</h3>
              <p>{d.name} entrega llantas en: {cityList.join(", ")}.</p>
            </>
          )}
          <h3>Catálogo de {d.name}</h3>
          <p>
            Encuentra llantas nuevas y reencauche de {d.name} en TirePro Marketplace.
            Compra llantas para camión, tractomula, bus, camioneta y automóvil con envío en Colombia.
          </p>
        </div>
      )}

      {children}
    </>
  );
}
