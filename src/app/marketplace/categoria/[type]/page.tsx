import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Package, Truck, ShieldCheck, Search, ChevronRight, Recycle,
  Building2, MapPin, Layers,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import { CATEGORIES, categoryFromSlug, type Category } from "../_lib/categories";
import { toDimensionSlug } from "../../dimension/_lib/dimensions";

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

  const brandSet = new Set<string>();
  for (const l of listings) if (l.marca) brandSet.add(l.marca.trim());
  const stockedBrands = Array.from(brandSet).sort();

  const otherCategories = CATEGORIES.filter((x) => x.slug !== cat.slug).slice(0, 8);

  // ---------------------------------------------------------------------------
  // JSON-LD
  // ---------------------------------------------------------------------------

  const collectionLd: any = {
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
        url: `${SITE}/marketplace/product/${l.id}`,
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

  const fromCop = lowPrice ? fmtCOP(lowPrice) : "consulta el marketplace";

  const faqs: Array<{ q: string; a: string }> = cat.kind === "tipo" && cat.tipo === "reencauche"
    ? [
        {
          q: "¿Qué es una llanta reencauchada?",
          a: "El reencauche es un proceso industrial certificado que renueva la banda de rodamiento de una llanta cuyo casco está en buen estado. La llanta reencauchada se comporta y rinde como una nueva en muchas aplicaciones, a un costo significativamente menor.",
        },
        {
          q: "¿Cuánto se ahorra con llantas reencauchadas?",
          a: "Para flotas pesadas (tractomula, camión, bus), el reencauche puede reducir el costo por kilómetro (CPK) de las llantas hasta un 40% comparado con llanta nueva equivalente, manteniendo el rendimiento operativo.",
        },
        {
          q: "¿Qué garantía tienen las llantas reencauchadas en TirePro?",
          a: "Cada llanta reencauchada vendida en TirePro Marketplace cuenta con garantía sobre el proceso de reencauche y la integridad del casco, emitida por el distribuidor reencauchador certificado.",
        },
        {
          q: "¿Cuándo conviene reencauchar y cuándo no?",
          a: "Conviene cuando el casco está estructuralmente sano (sin grietas, separaciones internas o daños mayores), tiene menos de 2 reencauches previos y la operación es de larga distancia. No conviene cuando el casco no es retreadable, en aplicaciones de muy alta velocidad o cuando se requiere máxima vida útil sostenida.",
        },
        {
          q: "¿En qué dimensiones hay reencauche disponible?",
          a: `Las dimensiones más comunes en reencauche en Colombia son ${cat.commonDimensions?.join(", ")}. Consulta el catálogo para ver el stock actualizado.`,
        },
      ]
    : cat.kind === "tipo" && cat.tipo === "nueva"
    ? [
        {
          q: "¿Qué garantía tiene una llanta nueva en TirePro?",
          a: "Las llantas nuevas vendidas en TirePro Marketplace cuentan con la garantía oficial del fabricante contra defectos de fábrica, además del soporte directo del distribuidor verificado que despacha el producto.",
        },
        {
          q: "¿Las llantas nuevas vienen con DOT actualizado?",
          a: "Sí. Los distribuidores en TirePro Marketplace despachan llantas nuevas con DOT (fecha de fabricación) reciente. La fecha exacta del DOT aparece en la página del producto cuando el distribuidor la registra.",
        },
        {
          q: "¿Qué marcas premium hay disponibles?",
          a: "TirePro Marketplace incluye marcas premium como Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Yokohama, Firestone, Dunlop y más, todas de distribuidores verificados.",
        },
        {
          q: "¿Cómo elegir entre llanta nueva y reencauche?",
          a: "Para ejes de dirección, vehículos livianos y aplicaciones de alta velocidad se recomienda llanta nueva. Para flotas pesadas en ejes de tracción y arrastre, el reencauche suele ser más rentable cuando el casco está en buen estado. TirePro analiza tu CPK histórico y te recomienda la mejor opción.",
        },
      ]
    : [
        {
          q: `¿Qué dimensión de llanta usa un ${cat.vehicles[0]}?`,
          a: cat.commonDimensions?.length
            ? `Las dimensiones más comunes para ${cat.vehicles.join(", ")} en Colombia son ${cat.commonDimensions.join(", ")}. La medida exacta depende del modelo y año del vehículo — confirma con el manual del fabricante o búscala por placa en TirePro.`
            : `La dimensión depende del modelo del vehículo. Confirma la medida en el manual del fabricante o búscala por placa en TirePro Marketplace.`,
        },
        {
          q: `¿Cuánto cuestan las llantas ${cat.h1Suffix} en Colombia?`,
          a: lowPrice
            ? `En TirePro Marketplace las llantas ${cat.h1Suffix} están desde ${fromCop}, dependiendo de marca, dimensión y si es nueva o reencauche. Compara precios en tiempo real entre distribuidores verificados.`
            : `Los precios dependen de la marca, dimensión y condición. Compara opciones actualizadas al momento en el marketplace.`,
        },
        {
          q: `¿Qué marcas hay para ${cat.vehicles.join(", ")}?`,
          a: stockedBrands.length > 0
            ? `Las marcas en stock para esta categoría incluyen ${stockedBrands.slice(0, 8).join(", ")}${stockedBrands.length > 8 ? " y más" : ""}. Todas con respaldo de distribuidores verificados.`
            : `TirePro agrupa marcas premium e intermedias del mercado colombiano para esta categoría: Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone y más.`,
        },
        {
          q: `¿Hay opción de reencauche para ${cat.vehicles[0]}?`,
          a: cat.kind === "rim" && cat.rimSizes && cat.rimSizes.some((r) => r >= 17.5)
            ? `Sí. Para ${cat.vehicles.join(", ")}, el reencauche es una alternativa rentable cuando el casco está en buen estado. Consulta la sección de reencauche en TirePro Marketplace.`
            : `El reencauche es más común en flotas pesadas. Para ${cat.vehicles[0]} se recomienda llanta nueva.`,
        },
        {
          q: `¿TirePro entrega en toda Colombia?`,
          a: `Sí. Los distribuidores verificados en TirePro entregan en Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Cúcuta, Ibagué, Santa Marta, Villavicencio y todas las ciudades principales del país.`,
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
      <Script id="cat-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Script id="cat-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="cat-faq-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <MarketplaceNav />

      {/* Hero */}
      <section className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)" }}>
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
                {cat.kind === "tipo" ? <Recycle className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                Categoría
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.02] tracking-tight">
                Llantas {cat.h1Suffix}
                <span className="block text-base sm:text-xl font-bold text-white/70 mt-2">
                  en Colombia · TirePro Marketplace
                </span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
                {cat.blurb}
                {total > 0 && lowPrice && <> Desde <strong className="text-white">{fromCop}</strong>, con <strong className="text-white">{total} producto{total === 1 ? "" : "s"}</strong> en stock.</>}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                <a href="#productos"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-black text-[#0A183A] bg-white hover:bg-white/95 transition-colors shadow-lg">
                  <Search className="w-4 h-4" />
                  Ver productos
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand strip */}
      {stockedBrands.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2"
            style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.18)", border: "1px solid rgba(10,24,58,0.05)" }}>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-2">Marcas en stock</span>
            {stockedBrands.slice(0, 12).map((b) => (
              <Link key={b}
                href={`/marketplace/brand/${b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                className="text-[11px] font-bold text-[#0A183A] px-2.5 py-1 rounded-full bg-gray-50 hover:bg-[#1E76B6] hover:text-white transition-colors">
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
              {cat.name} en venta
            </h2>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.12)" }}>
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0A183A]">Sin productos en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {listings.map((l) => {
              const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
              const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
              const promoActive = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
              const price = effectivePrice(l);
              const discount = promoActive ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;
              return (
                <Link key={l.id} href={`/marketplace/product/${l.id}`}
                  className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group block border border-gray-100">
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

      {/* Common dimensions cross-link */}
      {cat.commonDimensions && cat.commonDimensions.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Dimensiones populares</p>
            <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-4">
              Medidas más buscadas {cat.h1Suffix}
            </h2>
            <div className="flex flex-wrap gap-2">
              {cat.commonDimensions.map((d) => (
                <Link key={d}
                  href={`/marketplace/dimension/${toDimensionSlug(d)}`}
                  className="text-sm font-bold text-[#0A183A] px-3 py-1.5 rounded-full bg-[#1E76B6]/8 hover:bg-[#1E76B6] hover:text-white transition-colors">
                  {d}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEO copy */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-3">
            Llantas {cat.h1Suffix} en Colombia
          </h2>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-3">
            <p>{cat.blurb}</p>
            <p>
              En TirePro Marketplace puedes comparar precios entre distribuidores verificados en toda
              Colombia (Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira y demás
              ciudades principales). {cat.kind === "rim" && cat.commonDimensions ? <>Las dimensiones más comunes en esta categoría son <strong>{cat.commonDimensions.slice(0, 5).join(", ")}</strong>. </> : null}
              {stockedBrands.length > 0 && <>Las marcas en stock incluyen <strong>{stockedBrands.slice(0, 6).join(", ")}{stockedBrands.length > 6 ? " y más" : ""}</strong>.</>}
            </p>
            <p>
              Compra online con tarjeta, PSE o Nequi vía Wompi y recibe en 1–5 días hábiles. Para flotas,
              TirePro ofrece análisis de costo por kilómetro (CPK), recomendaciones automáticas de compra
              y gestión de inventario en una sola plataforma.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Preguntas frecuentes</p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-5">Sobre llantas {cat.h1Suffix}</h2>
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

      {/* Cross-links to other categories */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Otras categorías</p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-4">Explora más en TirePro</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {otherCategories.map((x) => (
              <Link key={x.slug}
                href={`/marketplace/categoria/${x.slug}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-[#0A183A] bg-[#1E76B6]/8 hover:bg-[#1E76B6] hover:text-white transition-colors">
                {x.kind === "tipo" ? <Recycle className="w-3.5 h-3.5 flex-shrink-0" /> : <Layers className="w-3.5 h-3.5 flex-shrink-0" />}
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
            { icon: Truck,       title: "Envío nacional",             sub: "Cobertura en toda Colombia" },
            { icon: Building2,   title: "Compras al por mayor",       sub: "Precios para flotas y empresas" },
            { icon: MapPin,      title: "+15 ciudades activas",       sub: "Bogotá, Medellín, Cali…" },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="bg-white rounded-2xl p-4 flex items-start gap-3"
                style={{ boxShadow: "0 6px 18px -10px rgba(10,24,58,0.12)", border: "1px solid rgba(10,24,58,0.05)" }}>
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
