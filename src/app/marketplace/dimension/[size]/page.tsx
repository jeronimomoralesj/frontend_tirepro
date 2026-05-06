import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Package, Recycle, Truck, ShieldCheck, Search, Building2,
  Layers, MapPin, ChevronRight,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import {
  POPULAR_DIMENSIONS, dimensionFromSlug, toDimensionSlug,
  parseDimension, vehicleClass, describeDimension,
} from "../_lib/dimensions";
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
  cantidadDisponible?: number;
  distributor?: { id: string; slug?: string | null; name: string };
}

// 30 min ISR — listings churn but not minute-by-minute, and the SEO
// signal we care about is "page exists with fresh prices", not real-time.
export const revalidate = 1800;

// Top 25 dimensions get prerendered. New ones still hydrate on-demand
// via dynamicParams: true.
export async function generateStaticParams() {
  return POPULAR_DIMENSIONS.slice(0, 25).map((d) => ({ size: toDimensionSlug(d) }));
}
export const dynamicParams = true;

// =============================================================================
// Data fetch — backend already supports the `dimension` filter param;
// we just pull the first 24 listings sorted by price ascending. The
// price asc default makes the cheapest in-stock option visible above
// the fold, which converts better than relevance for high-intent
// dimension queries (the buyer already knows the size — they're price-
// shopping).
// =============================================================================

async function fetchListings(dimension: string): Promise<{ listings: Listing[]; total: number }> {
  try {
    const res = await fetch(
      `${API_BASE}/marketplace/listings?dimension=${encodeURIComponent(dimension)}&limit=24&sortBy=price_asc`,
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
// Metadata — keyword-rich title + description targeting the dimension
// query. Title format chosen to win the SERP click: the dimension is
// the main keyword, then "en Colombia" for locale relevance, then
// "desde {price}" for shoppers scanning prices in the result snippet.
// =============================================================================

export async function generateMetadata(
  { params }: { params: Promise<{ size: string }> },
): Promise<Metadata> {
  const { size } = await params;
  const canonical = dimensionFromSlug(size);
  if (!canonical) return { title: "Dimensión no encontrada · TirePro" };

  const { listings, total } = await fetchListings(canonical);
  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const fromPrice = prices.length > 0 ? Math.min(...prices) : null;
  const fromStr = fromPrice ? ` desde ${fmtCOP(fromPrice)}` : "";

  const veh = parseDimension(canonical);
  const vehLabel = veh ? vehicleClass(veh.rim).primary : "vehículo";

  const title = `Llantas ${canonical} en Colombia${fromStr} | TirePro Marketplace`;
  const description =
    `Compra llantas ${canonical} online en Colombia. ${total} producto${total === 1 ? "" : "s"} de distribuidores verificados ` +
    `para ${vehLabel}. Compara precios, marcas y reencauche${fromStr}. Envío a todo el país.`;

  return {
    title,
    description: description.slice(0, 300),
    keywords: [
      `llantas ${canonical}`,
      `llanta ${canonical}`,
      `${canonical} colombia`,
      `${canonical} precio`,
      `comprar ${canonical}`,
      `llantas ${canonical} colombia`,
      `llantas ${canonical} bogota`,
      `llantas ${canonical} medellin`,
      `llantas ${canonical} reencauche`,
      `llantas ${canonical} nuevas`,
    ],
    openGraph: {
      title,
      description,
      url: `${SITE}/marketplace/dimension/${toDimensionSlug(canonical)}`,
      siteName: "TirePro",
      locale: "es_CO",
      type: "website",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `${SITE}/marketplace/dimension/${toDimensionSlug(canonical)}`,
    },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function DimensionPage({ params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const canonical = dimensionFromSlug(size);
  if (!canonical) notFound();

  const { listings, total } = await fetchListings(canonical);
  const slug = toDimensionSlug(canonical);
  const url = `${SITE}/marketplace/dimension/${slug}`;

  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;

  const nuevaCount    = listings.filter((l) => (l.tipo || "").toLowerCase() === "nueva").length;
  const retreadCount  = listings.filter((l) => (l.tipo || "").toLowerCase() === "reencauche").length;

  // Distinct brands stocking this dimension — for the "marcas que ofrecen
  // esta medida" section + cross-linking.
  const brandSet = new Set<string>();
  for (const l of listings) if (l.marca) brandSet.add(l.marca.trim());
  const stockedBrands = Array.from(brandSet).sort();

  const parsed = parseDimension(canonical);
  const veh = parsed ? vehicleClass(parsed.rim) : null;

  // Sibling dimensions for cross-linking. Same vehicle class wins
  // priority — a 295/80R22.5 page should link to other tractomula sizes,
  // not to a sedan size, because that's what an interested buyer will
  // also want to see.
  const sameClassDims = parsed
    ? POPULAR_DIMENSIONS.filter((d) => {
        if (d === canonical) return false;
        const p = parseDimension(d);
        return p && veh && vehicleClass(p.rim).category === veh.category;
      })
    : [];
  const otherDims = POPULAR_DIMENSIONS.filter((d) => d !== canonical && !sameClassDims.includes(d as any));
  const dimensionLinks = [...sameClassDims, ...otherDims].slice(0, 12);

  // ---------------------------------------------------------------------------
  // JSON-LD payloads. Three blocks:
  //   1. CollectionPage — wraps the page itself with a mainEntity ItemList
  //      of the products on display. AggregateOffer summarises the price
  //      range so SERPs can render "$800.000 – $2.300.000" snippets.
  //   2. BreadcrumbList — Marketplace → Dimensión → {canonical}.
  //   3. FAQPage — dimension-specific Q&A. Same content rendered visibly
  //      below; we mirror it 1:1 in JSON-LD for AI-citation accuracy.
  // ---------------------------------------------------------------------------

  const collectionLd: any = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Llantas ${canonical} en Colombia`,
    description: `Compra llantas ${canonical} online en Colombia. Distribuidores verificados, comparación de precios, envío nacional.`,
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
      { "@type": "ListItem", position: 3, name: `Llantas ${canonical}`, item: url },
    ],
  };

  const fromCop = lowPrice ? fmtCOP(lowPrice) : "consulta el marketplace";
  const vehNounSing = veh?.examples[0] ?? "vehículo";
  const cityList = "Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira y demás ciudades principales";

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `¿Cuánto cuesta una llanta ${canonical} en Colombia?`,
      a: lowPrice
        ? `Las llantas ${canonical} en TirePro Marketplace están desde ${fromCop} hasta ${fmtCOP(highPrice!)}, según marca, distribuidor y si es nueva o reencauche. Los precios se actualizan en tiempo real con cada distribuidor verificado.`
        : `Los precios de llantas ${canonical} dependen de la marca, el distribuidor y si es nueva o reencauche. Compara precios actualizados en TirePro Marketplace y elige la mejor opción para tu flota o vehículo.`,
    },
    {
      q: `¿Para qué tipo de vehículo es una llanta ${canonical}?`,
      a: veh
        ? `La llanta ${canonical} (${describeDimension(canonical)}) está indicada principalmente para ${veh.primary}, incluyendo ${veh.examples.join(", ")}. Confirma la dimensión recomendada en el manual del vehículo o búscala por placa en TirePro.`
        : `Confirma la compatibilidad con la dimensión recomendada por el fabricante de tu vehículo.`,
    },
    {
      q: `¿Hay llantas ${canonical} reencauchadas en Colombia?`,
      a: retreadCount > 0
        ? `Sí. En TirePro Marketplace hay ${retreadCount} referencia${retreadCount === 1 ? "" : "s"} reencauchada${retreadCount === 1 ? "" : "s"} para ${canonical} de distribuidores verificados, con garantía sobre el casco y el proceso de reencauche.`
        : `El reencauche de llantas ${canonical} aplica si el casco está en buen estado. Consulta en TirePro Marketplace los distribuidores que ofrecen reencauche para esta medida.`,
    },
    {
      q: `¿Qué marcas venden llantas ${canonical} en Colombia?`,
      a: stockedBrands.length > 0
        ? `En TirePro Marketplace puedes comparar llantas ${canonical} de ${stockedBrands.slice(0, 8).join(", ")}${stockedBrands.length > 8 ? " y más" : ""}, todas de distribuidores verificados con envío a ${cityList}.`
        : `TirePro Marketplace agrupa marcas premium e intermedias para llantas ${canonical}: Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook y más.`,
    },
    {
      q: `¿TirePro entrega llantas ${canonical} en Bogotá / Medellín / Cali?`,
      a: `Sí. Los distribuidores verificados de TirePro Marketplace entregan llantas ${canonical} en ${cityList}. La cobertura específica depende de cada distribuidor y se muestra en la página del producto.`,
    },
    {
      q: `¿Cómo elegir la llanta ${canonical} correcta para mi ${vehNounSing}?`,
      a: `Verifica que la dimensión coincida exactamente con la indicada por el fabricante del vehículo. Considera el uso (carretera, ciudad, mixto), la carga típica, el índice de carga (LI) y velocidad (SI), y si tu flota se beneficia más de llanta nueva o reencauchada según el costo por kilómetro (CPK). En TirePro puedes comparar todas estas variables antes de comprar.`,
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

  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Script id="dimension-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Script id="dimension-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="dimension-faq-jsonld" type="application/ld+json"
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

          <div className="mt-5 flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-10">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-white/10 text-white/90 uppercase tracking-widest mb-3 backdrop-blur-sm border border-white/15">
                <Layers className="w-3 h-3" />
                Medida
              </span>
              {/* Explicit {' '} so the H1 doesn't flatten as "…dimensionn
                  Colombia" without a space — JSX strips the newline
                  between expression and sibling tag. */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.02] tracking-tight">
                Llantas {canonical}{' '}
                <span className="block text-base sm:text-xl font-bold text-white/70 mt-2">
                  en Colombia · TirePro Marketplace
                </span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
                {total > 0
                  ? <>
                      <strong className="text-white">{total} producto{total === 1 ? "" : "s"}</strong> de distribuidores verificados
                      para <strong className="text-white">{veh?.primary ?? "vehículos"}</strong>.
                      {lowPrice && <> Desde <strong className="text-white">{fromCop}</strong>.</>}
                      {" "}Compara precios, marcas y reencauche en un solo lugar.
                    </>
                  : <>
                      Compra llantas {canonical} de distribuidores verificados en Colombia.
                      Compara marcas, precios y opciones de reencauche.
                    </>
                }
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                <a href="#productos"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-black text-[#0A183A] bg-white hover:bg-white/95 transition-colors shadow-lg">
                  <Search className="w-4 h-4" />
                  Ver productos
                </a>
                <Link href={`/marketplace?q=${encodeURIComponent(canonical)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold text-white bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20">
                  Buscar más opciones
                </Link>
              </div>
            </div>

            {/* Quick spec card */}
            <div className="lg:w-72 lg:flex-shrink-0">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-3">Ficha técnica</p>
                <dl className="space-y-2 text-sm">
                  {parsed && (
                    <>
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/70">Ancho</dt>
                        <dd className="text-white font-bold">
                          {parsed.profile != null ? `${parsed.width} mm` : `${parsed.width}"`}
                        </dd>
                      </div>
                      {parsed.profile != null && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-white/70">Perfil</dt>
                          <dd className="text-white font-bold">{parsed.profile}%</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/70">Rin</dt>
                        <dd className="text-white font-bold">{parsed.rim}″</dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Vehículo</dt>
                    <dd className="text-white font-bold capitalize">{veh?.category ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
                    <dt className="text-white/70">Disponibilidad</dt>
                    <dd className="text-white font-bold">{total} ref.</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand strip */}
      {stockedBrands.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2"
            style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.18)", border: "1px solid rgba(10,24,58,0.05)" }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-2">Marcas en stock</span>
            {stockedBrands.slice(0, 12).map((b) => (
              <Link
                key={b}
                href={`/marketplace/brand/${b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                className="text-[11px] font-bold text-[#0A183A] px-2.5 py-1 rounded-full bg-gray-50 hover:bg-[#1E76B6] hover:text-white transition-colors"
              >
                {b}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Productos */}
      <section id="productos" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 scroll-mt-20">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Productos</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">
              Llantas {canonical} en venta
            </h2>
          </div>
          <Link
            href={`/marketplace?q=${encodeURIComponent(canonical)}`}
            className="text-xs font-bold text-[#1E76B6] hover:underline inline-flex items-center gap-1"
          >
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center"
            style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.12)" }}
          >
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0A183A]">Sin stock disponible para {canonical}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Sin productos activos en este momento. Consulta otras medidas similares o vuelve más tarde — el catálogo se actualiza diariamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {listings.map((l) => {
              const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
              const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
              const promoActive = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
              const price = effectivePrice(l);
              const discount = promoActive
                ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100)
                : 0;
              return (
                <Link
                  key={l.id}
                  href={productHref(l)}
                  className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group block border border-gray-100"
                >
                  <div
                    className="relative aspect-square flex items-center justify-center overflow-hidden"
                    style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}
                  >
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
                    <p className="text-[13px] font-black text-[#1E76B6] tabular-nums tracking-tight mt-1 leading-none">{l.dimension}</p>
                    <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-lg font-black text-[#0A183A]">{fmtCOP(price)}</span>
                      {promoActive && <span className="text-[10px] text-gray-400 line-through">{fmtCOP(l.precioCop)}</span>}
                    </div>
                    {l.distributor?.name && (
                      <p className="text-[10px] text-gray-500 mt-1.5 truncate">
                        Vendido por <span className="font-bold text-[#0A183A]">{l.distributor.name}</span>
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* About this dimension — server-rendered prose for crawlers */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8"
          style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-3">
            Llantas {canonical} en Colombia — qué necesitas saber
          </h2>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-3">
            <p>
              La llanta <strong>{canonical}</strong> ({describeDimension(canonical)}) es una medida común en
              Colombia para <strong>{veh?.primary ?? "vehículos"}</strong>. Se usa habitualmente en{" "}
              {veh?.examples.join(", ")}. En TirePro Marketplace puedes comparar precios de distribuidores
              verificados, elegir entre llanta nueva y reencauche, y coordinar entrega en {cityList}.
            </p>
            <p>
              {nuevaCount > 0 && retreadCount > 0 && <>Tenemos <strong>{nuevaCount}</strong> referencia{nuevaCount === 1 ? "" : "s"} nueva{nuevaCount === 1 ? "" : "s"} y <strong>{retreadCount}</strong> reencauchada{retreadCount === 1 ? "" : "s"} en esta medida. </>}
              {nuevaCount > 0 && retreadCount === 0 && <>Disponemos de <strong>{nuevaCount}</strong> referencia{nuevaCount === 1 ? "" : "s"} nueva{nuevaCount === 1 ? "" : "s"} en esta medida. </>}
              {retreadCount > 0 && nuevaCount === 0 && <>Disponemos de <strong>{retreadCount}</strong> referencia{retreadCount === 1 ? "" : "s"} reencauchada{retreadCount === 1 ? "" : "s"} en esta medida. </>}
              Las marcas en stock incluyen{" "}
              {stockedBrands.length > 0
                ? <strong>{stockedBrands.slice(0, 6).join(", ")}{stockedBrands.length > 6 ? " y más" : ""}</strong>
                : <>marcas premium e intermedias del mercado colombiano</>
              }.
            </p>
            <p>
              {veh?.category === "truck" && <>Para flotas pesadas que ruedan {canonical}, el reencauche puede reducir el costo por kilómetro (CPK) hasta 40% cuando el casco está en buen estado. La llanta nueva en esta medida se recomienda en ejes de dirección o cuando el casco no es retreadable. </>}
              {veh?.category === "bus" && <>Buses intermunicipales y urbanos suelen rotar {canonical} entre ejes — combinar nueva en dirección y reencauche en tracción es la práctica más común para optimizar costos. </>}
              {veh?.category === "suv" && <>Para camionetas y SUV, la elección entre llanta carretera, mixta u off-road depende de tu uso típico. Compara perfil, índice de carga y diseño de banda en cada producto. </>}
              {veh?.category === "auto" && <>Para autos, prioriza el índice de carga (LI) y velocidad (SI) que indica el manual del vehículo. Las llantas {canonical} en esta página tienen ficha técnica completa para cada referencia. </>}
              Si no estás seguro de la medida correcta, busca por placa en TirePro y te recomendamos la dimensión exacta.
            </p>
          </div>

          {/* Sibling-dimension cross-links — same vehicle class first */}
          {dimensionLinks.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-3">
                Otras medidas populares
              </h3>
              <div className="flex flex-wrap gap-2">
                {dimensionLinks.map((d) => (
                  <Link
                    key={d}
                    href={`/marketplace/dimension/${toDimensionSlug(d)}`}
                    className="text-xs font-bold text-[#0A183A] px-3 py-1.5 rounded-full bg-[#1E76B6]/8 hover:bg-[#1E76B6] hover:text-white transition-colors"
                  >
                    {d}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8"
          style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Preguntas frecuentes</p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-5">
            Sobre llantas {canonical}
          </h2>
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

      {/* Trust strip */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: ShieldCheck, title: "Distribuidores verificados", sub: "Validados por TirePro" },
            { icon: Truck,       title: "Envío nacional",             sub: "Cobertura en toda Colombia" },
            { icon: Building2,   title: "Compras al por mayor",       sub: "Precios para flotas y empresas" },
            { icon: MapPin,      title: "Bogotá, Medellín, Cali…",   sub: "+15 ciudades activas" },
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
