import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Package, Truck, ShieldCheck, Search, ChevronRight, Recycle,
  Building2, MapPin, Car, Layers,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import {
  VEHICLES, vehicleFromSlug, vehiclesInCategory, categorySlugFor, type Vehicle,
} from "../_lib/vehicles";
import {
  POPULAR_DIMENSIONS, toDimensionSlug,
} from "../../dimension/_lib/dimensions";

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
  return VEHICLES.map((v) => ({ slug: v.slug }));
}
export const dynamicParams = false;

// =============================================================================
// Data — try each stock dimension in order until we find listings.
// Cars have multiple stock dimensions across trims/years; we want the
// page to populate even if the most-common dimension isn't in stock.
// =============================================================================

async function fetchListingsByDimension(dimension: string): Promise<{ listings: Listing[]; total: number }> {
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

async function fetchVehicleListings(v: Vehicle): Promise<{
  listings: Listing[];
  total: number;
  dimensionUsed: string | null;
}> {
  for (const dim of v.dimensions) {
    const { listings, total } = await fetchListingsByDimension(dim);
    if (listings.length > 0) return { listings, total, dimensionUsed: dim };
  }
  return { listings: [], total: 0, dimensionUsed: null };
}

function effectivePrice(l: Listing): number {
  const promoActive = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
  return promoActive ? l.precioPromo! : l.precioCop;
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const v = vehicleFromSlug(slug);
  if (!v) return { title: "Vehículo no encontrado · TirePro" };

  const { listings, total } = await fetchVehicleListings(v);
  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const fromPrice = prices.length > 0 ? Math.min(...prices) : null;
  const fromStr = fromPrice ? ` desde ${fmtCOP(fromPrice)}` : "";

  const title = `Llantas para ${v.make} ${v.model} en Colombia${fromStr} | TirePro`;
  const description =
    `Compra llantas para ${v.make} ${v.model} online en Colombia. ` +
    `Dimensión ${v.dimensions[0]}${v.dimensions.length > 1 ? ` (también ${v.dimensions.slice(1).join(", ")})` : ""}. ` +
    `${total} producto${total === 1 ? "" : "s"} de distribuidores verificados con envío nacional.`;

  const aliases = v.aliases ?? [];
  return {
    title,
    description: description.slice(0, 300),
    keywords: [
      `llantas para ${v.make} ${v.model}`,
      `llantas ${v.make} ${v.model}`,
      `llantas ${v.model.toLowerCase()}`,
      `medida llantas ${v.make} ${v.model}`,
      `qué llanta usa el ${v.make} ${v.model}`,
      `${v.make} ${v.model} llantas`,
      `${v.make} ${v.model} colombia`,
      `precio llantas ${v.make} ${v.model}`,
      ...v.dimensions.map((d) => `llantas ${d} ${v.model}`),
      ...aliases.map((a) => `llantas ${a}`),
    ],
    openGraph: {
      title,
      description,
      url: `${SITE}/marketplace/vehiculo/${v.slug}`,
      siteName: "TirePro",
      locale: "es_CO",
      type: "website",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `${SITE}/marketplace/vehiculo/${v.slug}` },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = vehicleFromSlug(slug);
  if (!v) notFound();

  const { listings, total, dimensionUsed } = await fetchVehicleListings(v);
  const url = `${SITE}/marketplace/vehiculo/${v.slug}`;

  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;

  const brandSet = new Set<string>();
  for (const l of listings) if (l.marca) brandSet.add(l.marca.trim());
  const stockedBrands = Array.from(brandSet).sort();

  // Sibling vehicles in the same category (excl. self), capped at 8.
  const siblings = vehiclesInCategory(v.category)
    .filter((x) => x.slug !== v.slug)
    .slice(0, 8);

  // Only cross-link to dimension pages we actually have. Anything else
  // falls back to the SSR /marketplace/buscar route (still indexable).
  const knownDimensions = new Set<string>(POPULAR_DIMENSIONS);
  const dimensionLinks = v.dimensions.map((d) => ({
    dim: d,
    href: knownDimensions.has(d as any)
      ? `/marketplace/dimension/${toDimensionSlug(d)}`
      : `/marketplace/buscar?dimension=${encodeURIComponent(d)}`,
    direct: knownDimensions.has(d as any),
  }));

  // ---------------------------------------------------------------------------
  // JSON-LD
  //   1. Vehicle schema (suggestedTire) — gives Google a strong
  //      semantic signal that this page is the canonical destination
  //      for tire queries about this vehicle.
  //   2. CollectionPage with the in-stock products as ItemList +
  //      AggregateOffer for SERP price-range snippets.
  //   3. BreadcrumbList.
  //   4. FAQPage with vehicle-specific Q&A.
  // ---------------------------------------------------------------------------

  const vehicleLd: any = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${v.make} ${v.model}`,
    brand: { "@type": "Brand", name: v.make },
    model: v.model,
    vehicleConfiguration: v.category,
    // suggestedTire is on Schema.org as a Product property; using
    // additionalProperty for tire dimensions is the most portable cross-
    // crawler way to express this without relying on a vendor extension.
    additionalProperty: v.dimensions.map((d) => ({
      "@type": "PropertyValue",
      name: "Dimensión de llanta",
      value: d,
    })),
  };

  const collectionLd: any = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Llantas para ${v.make} ${v.model}`,
    description: `Llantas en stock para ${v.make} ${v.model} en Colombia. Dimensión ${v.dimensions[0]}${v.dimensions.length > 1 ? ` (y otras: ${v.dimensions.slice(1).join(", ")})` : ""}.`,
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
      { "@type": "ListItem", position: 3, name: `Llantas para ${v.make} ${v.model}`, item: url },
    ],
  };

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `¿Qué medida de llantas usa el ${v.make} ${v.model}?`,
      a: v.dimensions.length === 1
        ? `El ${v.make} ${v.model} usa originalmente llantas de medida ${v.dimensions[0]}. Confirma siempre la medida exacta en la placa interior de la puerta del conductor o en el manual del vehículo, ya que algunas versiones pueden traer dimensiones distintas.`
        : `El ${v.make} ${v.model} usa varias medidas según versión y año, las más comunes son ${v.dimensions.join(", ")}. La principal es ${v.dimensions[0]}. Confirma la medida exacta en la placa interior de la puerta del conductor o en el manual del vehículo.${v.notes ? " " + v.notes : ""}`,
    },
    {
      q: `¿Cuánto cuestan las llantas para ${v.make} ${v.model} en Colombia?`,
      a: lowPrice
        ? `En TirePro Marketplace las llantas ${v.dimensions[0]} para ${v.make} ${v.model} están desde ${fmtCOP(lowPrice)} hasta ${fmtCOP(highPrice!)}, según marca, distribuidor y si es nueva o reencauche. Compara precios en tiempo real entre todos los distribuidores verificados con envío nacional.`
        : `Los precios de llantas para ${v.make} ${v.model} dependen de la marca, dimensión y si la llanta es nueva o reencauche. Consulta el catálogo actualizado en TirePro Marketplace para precios en tiempo real.`,
    },
    {
      q: `¿Qué marcas hay disponibles para ${v.make} ${v.model}?`,
      a: stockedBrands.length > 0
        ? `Para ${v.make} ${v.model} hay marcas como ${stockedBrands.slice(0, 8).join(", ")}${stockedBrands.length > 8 ? " y más" : ""} en stock con distribuidores verificados de TirePro Marketplace.`
        : `TirePro Marketplace agrupa marcas premium e intermedias del mercado colombiano: Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone, Yokohama y más, en las dimensiones que usa el ${v.make} ${v.model}.`,
    },
    {
      q: `¿Puedo cambiar la medida de llantas en mi ${v.make} ${v.model}?`,
      a: `No es recomendable cambiar la medida de fábrica del ${v.make} ${v.model} salvo upgrades documentados por el fabricante (típicamente entre versiones del mismo modelo). Cambiar la dimensión puede afectar la lectura del velocímetro, el comportamiento de la suspensión, el ABS, el ESP y la garantía del vehículo. Consulta con un técnico antes de modificar.`,
    },
    {
      q: `¿Cuántas llantas necesito para mi ${v.make} ${v.model}?`,
      a: `Tu ${v.make} ${v.model} usa 4 llantas. Lo ideal es cambiar las cuatro al tiempo o como mínimo el eje completo (las 2 delanteras o las 2 traseras juntas) con la misma marca, modelo y nivel de desgaste. Mezclar referencias diferentes en un mismo eje afecta la estabilidad y el frenado.`,
    },
    {
      q: `¿TirePro entrega llantas para ${v.make} ${v.model} en mi ciudad?`,
      a: `Sí. Los distribuidores verificados de TirePro Marketplace entregan llantas para ${v.make} ${v.model} en Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Cúcuta, Ibagué, Santa Marta, Villavicencio y demás ciudades principales del país.`,
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

  const vehicleNoun = v.category === "tractomula"
    ? "tractomula"
    : v.category === "camion"
    ? "camión"
    : v.category === "camioneta"
    ? "camioneta"
    : v.category === "suv"
    ? "SUV"
    : v.category === "bus"
    ? "bus"
    : "automóvil";

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Script id="vehicle-vehicle-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleLd) }} />
      <Script id="vehicle-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Script id="vehicle-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="vehicle-faq-jsonld" type="application/ld+json"
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
                <Car className="w-3 h-3" />
                Llantas para {vehicleNoun}
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.02] tracking-tight">
                Llantas para {v.make} {v.model}
                <span className="block text-base sm:text-xl font-bold text-white/70 mt-2">
                  en Colombia · TirePro Marketplace
                </span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
                Medida principal{" "}
                <strong className="text-white">{v.dimensions[0]}</strong>
                {v.dimensions.length > 1 && <> (también {v.dimensions.slice(1).join(", ")})</>}.
                {total > 0
                  ? <> {total} producto{total === 1 ? "" : "s"} de distribuidores verificados.{lowPrice && <> Desde <strong className="text-white">{fmtCOP(lowPrice)}</strong>.</>}</>
                  : <> Compara opciones de marcas premium e intermedias con envío en toda Colombia.</>
                }
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                <a href="#productos"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-black text-[#0A183A] bg-white hover:bg-white/95 transition-colors shadow-lg">
                  <Search className="w-4 h-4" />
                  Ver productos
                </a>
                <a href="#medidas"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold text-white bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20">
                  <Layers className="w-4 h-4" />
                  Ver medidas
                </a>
              </div>
            </div>

            <div className="lg:w-72 lg:flex-shrink-0">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-3">Tu vehículo</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Marca</dt>
                    <dd className="text-white font-bold">{v.make}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Modelo</dt>
                    <dd className="text-white font-bold">{v.model}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/70">Tipo</dt>
                    <dd className="text-white font-bold capitalize">{vehicleNoun}</dd>
                  </div>
                  {v.yearRange && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/70">Años</dt>
                      <dd className="text-white font-bold">{v.yearRange}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
                    <dt className="text-white/70">Medida principal</dt>
                    <dd className="text-white font-bold tabular-nums">{v.dimensions[0]}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Medidas — every stock dimension is a CTA. Linked to its
          dimension page when one exists, or to a /buscar fallback. */}
      <section id="medidas" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 scroll-mt-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Medidas</p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-1">
            Tamaños de llanta para {v.make} {v.model}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Confirma la medida exacta en la placa interior de la puerta del conductor de tu {v.model}.
            La principal aparece resaltada.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dimensionLinks.map((d, i) => (
              <Link
                key={d.dim}
                href={d.href}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#1E76B6]/8 hover:bg-[#1E76B6] hover:text-white transition-colors group"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#1E76B6] group-hover:text-white/80">
                    {i === 0 ? "Medida principal" : "Alternativa"}
                  </p>
                  <p className="text-lg font-black text-[#0A183A] tabular-nums group-hover:text-white">{d.dim}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#1E76B6] group-hover:text-white" />
              </Link>
            ))}
          </div>
          {v.notes && (
            <p className="text-xs text-gray-500 mt-4 italic">Nota: {v.notes}</p>
          )}
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
      <section id="productos" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 scroll-mt-20">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Productos</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">
              Llantas {dimensionUsed ?? v.dimensions[0]} en venta
            </h2>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.12)" }}>
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0A183A]">Sin stock disponible para {v.dimensions[0]}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Sin productos activos en este momento. Consulta otras dimensiones de tu {v.model} o vuelve más tarde — el catálogo se actualiza diariamente.
            </p>
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
                      <img src={cover} alt={`${l.marca} ${l.modelo} ${l.dimension} para ${v.make} ${v.model}`}
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
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-3">
            Comprar llantas para {v.make} {v.model} en Colombia
          </h2>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-3">
            <p>
              El <strong>{v.make} {v.model}</strong>{v.yearRange ? <> ({v.yearRange})</> : null} usa
              originalmente llantas <strong>{v.dimensions[0]}</strong>
              {v.dimensions.length > 1 && <>, con alternativas según versión: {v.dimensions.slice(1).join(", ")}</>}.
              En TirePro Marketplace puedes comparar marcas, precios y opciones de reencauche en
              cualquiera de las medidas que tu {v.model} acepta de fábrica.
            </p>
            <p>
              {stockedBrands.length > 0
                ? <>Las marcas en stock para tu {v.model} incluyen <strong>{stockedBrands.slice(0, 6).join(", ")}{stockedBrands.length > 6 ? " y más" : ""}</strong>. </>
                : <>Marcas premium e intermedias del mercado colombiano están disponibles. </>
              }
              Recibe en Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira y demás
              ciudades principales en 1–5 días hábiles, con pago en tarjeta, PSE o Nequi vía Wompi.
            </p>
            <p>
              {v.category === "auto" || v.category === "suv"
                ? <>Para tu {v.model}, considera el índice de carga (LI) y velocidad (SI) que indica el manual del fabricante. Si usas el {v.model} principalmente en ciudad, busca llantas de carretera con buen agarre en mojado; si haces viajes largos por carretera, prioriza llantas de larga vida útil.</>
                : v.category === "camioneta"
                ? <>Para tu {v.model}, evalúa el uso típico: si es trabajo pesado u off-road, llantas all-terrain o mud-terrain. Si es ciudad y carretera, llantas de uso mixto o carretera.</>
                : v.category === "tractomula" || v.category === "camion"
                ? <>Para tu {v.model}, el reencauche puede reducir el costo por kilómetro hasta 40% cuando el casco está en buen estado. La llanta nueva se recomienda en eje de dirección y cuando el casco no es retreadable.</>
                : null}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Preguntas frecuentes</p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-5">
            Sobre llantas para {v.make} {v.model}
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

      {/* Sibling vehicles + category cross-link */}
      {siblings.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Otros vehículos</p>
            <h2 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-4">
              Otras {vehicleNoun === "automóvil" ? "autos" : vehicleNoun + "s"} populares en Colombia
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {siblings.map((s) => (
                <Link key={s.slug}
                  href={`/marketplace/vehiculo/${s.slug}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-[#0A183A] bg-[#1E76B6]/8 hover:bg-[#1E76B6] hover:text-white transition-colors">
                  <Car className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{s.make} {s.model}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href={`/marketplace/categoria/${categorySlugFor(v.category)}`}
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#1E76B6] hover:underline"
              >
                Ver todas las llantas para {vehicleNoun === "automóvil" ? "auto" : vehicleNoun}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Trust */}
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
