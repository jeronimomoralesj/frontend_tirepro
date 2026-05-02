import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Package, Truck, ShieldCheck, Search, Building2, MapPin,
  ChevronRight, Store, Recycle,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import { CITIES, cityFromSlug, type City } from "../_lib/cities";

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

// =============================================================================
// Data — backend honors the `ciudad` filter by checking distributor
// cobertura. We pull a generous page (60) so the city page has both a
// products grid (top 24) AND a distributor list (de-duped from the
// same response). Saves a second API round-trip.
// =============================================================================

async function fetchCityData(city: City): Promise<{ listings: Listing[]; total: number }> {
  try {
    const res = await fetch(
      `${API_BASE}/marketplace/listings?ciudad=${encodeURIComponent(city.name)}&limit=60&sortBy=newest`,
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

  const title = `Llantas en ${c.name} — Compra Online en Colombia | TirePro Marketplace`;
  const description =
    `Compra llantas en ${c.name}, ${c.department}. ${total} producto${total === 1 ? "" : "s"} de ` +
    `${distinctDists.size} distribuidor${distinctDists.size === 1 ? "" : "es"} verificado${distinctDists.size === 1 ? "" : "s"} con envío local. ` +
    `Llantas para tractomula, camión, bus, camioneta y auto. Marcas Michelin, Bridgestone, Continental y más.`;

  return {
    title,
    description: description.slice(0, 300),
    keywords: [
      `llantas ${c.name.toLowerCase()}`,
      `llantas en ${c.name.toLowerCase()}`,
      `comprar llantas ${c.name.toLowerCase()}`,
      `donde comprar llantas en ${c.name.toLowerCase()}`,
      `distribuidor llantas ${c.name.toLowerCase()}`,
      `llantas baratas ${c.name.toLowerCase()}`,
      `llantas tractomula ${c.name.toLowerCase()}`,
      `llantas camión ${c.name.toLowerCase()}`,
      `llantas reencauche ${c.name.toLowerCase()}`,
      `precio llantas ${c.name.toLowerCase()}`,
      `tienda llantas ${c.name.toLowerCase()}`,
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

  // Distinct distributors from listings
  const distMap = new Map<string, NonNullable<Listing["distributor"]> & { count: number }>();
  for (const l of listings) {
    if (!l.distributor?.id) continue;
    const existing = distMap.get(l.distributor.id);
    if (existing) existing.count += 1;
    else distMap.set(l.distributor.id, { ...l.distributor, count: 1 });
  }
  const distributors = Array.from(distMap.values()).sort((a, b) => b.count - a.count);

  // Distinct brands stocked here
  const brandSet = new Set<string>();
  for (const l of listings) if (l.marca) brandSet.add(l.marca.trim());
  const stockedBrands = Array.from(brandSet).sort();

  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const productsTopGrid = listings.slice(0, 24);

  // Other cities, sorted by population descending. Skip current.
  const otherCities = CITIES.filter((x) => x.slug !== c.slug)
    .sort((a, b) => b.population - a.population)
    .slice(0, 9);

  // ---------------------------------------------------------------------------
  // JSON-LD
  //   1. CollectionPage — main entity is the products list.
  //   2. ItemList of distributors (LocalBusiness array) — each
  //      distributor in this city is a LocalBusiness with city in
  //      areaServed. This is the single biggest local-search signal.
  //   3. BreadcrumbList.
  //   4. FAQPage with city-specific Q&A.
  // ---------------------------------------------------------------------------

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
      itemListElement: productsTopGrid.slice(0, 20).map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/marketplace/product/${l.id}`,
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
      a: `TirePro Marketplace acepta tarjeta de crédito, débito, PSE y Nequi a través de Wompi. Algunos distribuidores ofrecen plazos de pago o crédito empresarial para flotas en ${c.name} — consulta directamente al solicitar cotización.`,
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
    <div className="min-h-screen bg-[#f5f5f7]">
      <Script id="city-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Script id="city-distributors-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(distributorsLd) }} />
      <Script id="city-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="city-faq-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <MarketplaceNav />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)" }}
      >
        <div className="absolute inset-0 opacity-15" aria-hidden style={{
          backgroundImage: "radial-gradient(circle at 15% 0%, rgba(52,140,203,0.55), transparent 45%), radial-gradient(circle at 85% 100%, rgba(245,158,11,0.4), transparent 45%)",
        }} />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Volver al marketplace
          </Link>

          <div className="mt-5 flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-white/10 text-white/90 uppercase tracking-widest mb-3 backdrop-blur-sm border border-white/15">
                <MapPin className="w-3 h-3" />
                {c.department}, Colombia
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.02] tracking-tight">
                Llantas en {c.name}
                <span className="block text-base sm:text-xl font-bold text-white/70 mt-2">
                  Compra online · TirePro Marketplace
                </span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
                {distributors.length > 0
                  ? <>
                      <strong className="text-white">{distributors.length} distribuidor{distributors.length === 1 ? "" : "es"}</strong> verificado{distributors.length === 1 ? "" : "s"} con cobertura en {c.name}, ofreciendo{" "}
                      <strong className="text-white">{total} producto{total === 1 ? "" : "s"}</strong>.
                      {lowPrice && <> Desde <strong className="text-white">{fmtCOP(lowPrice)}</strong>.</>}
                      {" "}Compara precios, marcas y reencauche con envío local.
                    </>
                  : <>
                      Compara llantas con envío a {c.name}. Distribuidores verificados, marcas premium y reencauche, todo en TirePro Marketplace.
                    </>
                }
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                <a href="#distribuidores"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-black text-[#0A183A] bg-white hover:bg-white/95 transition-colors shadow-lg">
                  <Store className="w-4 h-4" />
                  Ver distribuidores
                </a>
                <a href="#productos"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold text-white bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20">
                  <Search className="w-4 h-4" />
                  Ver productos
                </a>
              </div>
            </div>

            <div className="lg:w-72 lg:flex-shrink-0">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-3">{c.name} en cifras</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Distribuidores</dt>
                    <dd className="text-white font-bold">{distributors.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Productos</dt>
                    <dd className="text-white font-bold">{total}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Marcas</dt>
                    <dd className="text-white font-bold">{stockedBrands.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Departamento</dt>
                    <dd className="text-white font-bold">{c.department}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
                    <dt className="text-white/70">Población</dt>
                    <dd className="text-white font-bold">{(c.population / 1_000_000).toFixed(1)}M</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Distribuidores en la ciudad */}
      <section id="distribuidores" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 scroll-mt-20">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Distribuidores</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">
              Distribuidores verificados en {c.name}
            </h2>
          </div>
          {distributors.length > 6 && (
            <span className="text-[11px] text-gray-500 font-medium">{distributors.length} en total</span>
          )}
        </div>

        {distributors.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.12)" }}>
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0A183A]">Sin distribuidores activos en {c.name}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Los distribuidores con envío a {c.name} se actualizan diariamente. Consulta el marketplace para ver opciones nacionales.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {distributors.slice(0, 12).map((d) => (
              <Link
                key={d.id}
                href={`/marketplace/distributor/${d.slug ?? d.id}`}
                className="bg-white rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-xl transition-all border border-gray-100"
                style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.12)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1E76B6]/8 flex-shrink-0 overflow-hidden">
                  {d.profileImage && !d.profileImage.includes("logoFull.png") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.profileImage} alt={d.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Store className="w-5 h-5 text-[#1E76B6]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#0A183A] leading-tight truncate">{d.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{d.count} producto{d.count === 1 ? "" : "s"} con envío a {c.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Productos disponibles */}
      <section id="productos" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 scroll-mt-20">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Productos</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">
              Llantas con envío a {c.name}
            </h2>
          </div>
          <Link
            href={`/marketplace?ciudad=${encodeURIComponent(c.name)}`}
            className="text-xs font-bold text-[#1E76B6] hover:underline inline-flex items-center gap-1"
          >
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {productsTopGrid.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.12)" }}>
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0A183A]">Sin productos disponibles en {c.name}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {productsTopGrid.map((l) => {
              const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
              const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
              const promoActive = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
              const price = effectivePrice(l);
              const discount = promoActive ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;
              return (
                <Link
                  key={l.id}
                  href={`/marketplace/product/${l.id}`}
                  className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group block border border-gray-100"
                >
                  <div className="relative aspect-square flex items-center justify-center overflow-hidden"
                    style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={`${l.marca} ${l.modelo} ${l.dimension}`}
                        className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package className="w-10 h-10 text-gray-200" />
                    )}
                    {promoActive && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                        style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
                        -{discount}%
                      </span>
                    )}
                    {l.tipo === "reencauche" && (
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-[9px] font-black text-purple-700 bg-purple-100/90 backdrop-blur-sm flex items-center gap-0.5">
                        <Recycle className="w-2.5 h-2.5" /> Reenc.
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1E76B6]">{l.marca}</p>
                    <p className="text-sm font-black text-[#0A183A] leading-snug truncate mt-0.5">{l.modelo}</p>
                    <p className="text-[10px] text-gray-400">{l.dimension}</p>
                    <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-lg font-black text-[#0A183A]">{fmtCOP(price)}</span>
                      {promoActive && <span className="text-[10px] text-gray-400 line-through">{fmtCOP(l.precioCop)}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* SEO copy */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-3">
            Comprar llantas en {c.name} con TirePro Marketplace
          </h2>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-3">
            <p>
              <strong>{c.name}</strong> es {c.blurb}. En TirePro Marketplace conectamos a operadores
              de transporte, talleres, conductores particulares y flotas de la ciudad con distribuidores
              verificados que despachan a {c.name} y zonas aledañas en {c.department}.
            </p>
            <p>
              {distributors.length > 0
                ? <>Hay <strong>{distributors.length} distribuidor{distributors.length === 1 ? "" : "es"}</strong> activo{distributors.length === 1 ? "" : "s"} con cobertura en {c.name}, ofreciendo <strong>{total} referencia{total === 1 ? "" : "s"}</strong> entre llantas nuevas y reencauche.{" "}</>
                : <>Distribuidores con cobertura en {c.name} se conectan al marketplace continuamente. </>
              }
              Las marcas en stock incluyen{" "}
              {stockedBrands.length > 0
                ? <strong>{stockedBrands.slice(0, 6).join(", ")}{stockedBrands.length > 6 ? " y más" : ""}</strong>
                : <>marcas premium e intermedias del mercado colombiano</>
              }, en dimensiones para tractomula (295/80R22.5, 11R22.5), camión (12R22.5, 275/80R22.5),
              bus (215/75R17.5, 235/75R17.5), camioneta (265/70R16, 245/70R16), SUV y automóvil
              (205/55R16, 195/65R15, 185/65R15).
            </p>
            <p>
              Compra online con tarjeta, PSE o Nequi vía Wompi, recibe en {c.name} en 1–5 días hábiles
              y coordina la instalación con el distribuidor o un taller de tu confianza. Para flotas
              en {c.name}, TirePro ofrece además herramientas de gestión de inventario, predicción de
              fallas con IA y análisis de costo por kilómetro (CPK) — habla con nuestro equipo si
              quieres reducir el costo de llantas de tu operación.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Preguntas frecuentes</p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-5">Llantas en {c.name}</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-2xl bg-gray-50 px-4 py-3 open:bg-[#1E76B6]/5 open:ring-1 open:ring-[#1E76B6]/15 transition-colors">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                  <span className="text-sm font-bold text-[#0A183A] flex-1">{f.q}</span>
                  <ChevronRight className="w-4 h-4 text-[#1E76B6] flex-shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-sm text-gray-600 leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-links to other cities */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Otras ciudades</p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-4">Llantas en otras ciudades de Colombia</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {otherCities.map((x) => (
              <Link
                key={x.slug}
                href={`/marketplace/ciudad/${x.slug}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-[#0A183A] bg-[#1E76B6]/8 hover:bg-[#1E76B6] hover:text-white transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{x.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: ShieldCheck, title: "Distribuidores verificados", sub: "Validados por TirePro" },
            { icon: Truck,       title: `Envío a ${c.name}`,           sub: "1–5 días hábiles" },
            { icon: Building2,   title: "Compras al por mayor",       sub: "Precios para flotas y empresas" },
            { icon: MapPin,      title: "Cobertura nacional",          sub: "+15 ciudades activas" },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="bg-white rounded-2xl p-4 flex items-start gap-3"
                style={{ boxShadow: "0 6px 18px -10px rgba(10,24,58,0.12)", border: "1px solid rgba(10,24,58,0.05)" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#1E76B6]/10">
                  <Icon className="w-4 h-4 text-[#1E76B6]" />
                </div>
                <div>
                  <p className="text-[12px] font-black text-[#0A183A] leading-tight">{b.title}</p>
                  <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{b.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <MarketplaceFooter />
    </div>
  );
}
