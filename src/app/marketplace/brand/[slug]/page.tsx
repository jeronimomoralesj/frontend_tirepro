import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Building2, Globe, Factory, Package, ArrowRight, Star, Award, ShieldCheck, ShoppingCart, Truck, Shield, BookOpen } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import BrandListingsClient from "./BrandListingsClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface BrandPageData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  website: string | null;
  description: string | null;
  parentCompany: string | null;
  tier: "premium" | "mid" | "value" | null;
  plants?: Array<{ city?: string; country?: string }> | null;
  sourceUrl?: string | null;
  // Admin-editable customization (see backend BrandInfo)
  primaryColor?: string | null;
  accentColor?: string | null;
  heroImageUrl?: string | null;
  tagline?: string | null;
  published?: boolean;
  total: number;
  listings: Array<{
    id: string; marca: string; modelo: string; dimension: string;
    tipo: string; precioCop: number; precioPromo: number | null;
    promoHasta: string | null; imageUrls: string[] | null; coverIndex: number;
    distributor?: { id: string; name: string };
  }>;
}

// Best-effort country → ISO-2 → flag emoji. Wikipedia returns the country
// name in either Spanish or English; we map the most common tire-producing
// countries.
const COUNTRY_FLAGS: Record<string, string> = {
  "francia": "🇫🇷", "france": "🇫🇷",
  "italia": "🇮🇹", "italy": "🇮🇹",
  "alemania": "🇩🇪", "germany": "🇩🇪",
  "estados unidos": "🇺🇸", "united states": "🇺🇸", "usa": "🇺🇸",
  "japón": "🇯🇵", "japon": "🇯🇵", "japan": "🇯🇵",
  "corea del sur": "🇰🇷", "south korea": "🇰🇷", "korea": "🇰🇷",
  "china": "🇨🇳",
  "taiwán": "🇹🇼", "taiwan": "🇹🇼",
  "españa": "🇪🇸", "spain": "🇪🇸",
  "reino unido": "🇬🇧", "united kingdom": "🇬🇧", "uk": "🇬🇧",
  "india": "🇮🇳",
  "brasil": "🇧🇷", "brazil": "🇧🇷",
  "argentina": "🇦🇷",
  "colombia": "🇨🇴",
  "méxico": "🇲🇽", "mexico": "🇲🇽",
  "canadá": "🇨🇦", "canada": "🇨🇦",
  "rusia": "🇷🇺", "russia": "🇷🇺",
  "tailandia": "🇹🇭", "thailand": "🇹🇭",
  "vietnam": "🇻🇳",
  "indonesia": "🇮🇩",
};

function flagFor(country: string | null): string {
  if (!country) return "🌍";
  const k = country.toLowerCase().replace(/\([^)]*\)/g, "").trim();
  for (const [name, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (k.includes(name)) return flag;
  }
  return "🌍";
}

const TIER_META: Record<string, { label: string; sublabel: string; stars: number; bg: string; color: string }> = {
  premium: { label: "Premium", sublabel: "Marca de gama alta",   stars: 5, bg: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#92400e" },
  mid:     { label: "Intermedia", sublabel: "Marca de gama media", stars: 4, bg: "linear-gradient(135deg,#1E76B6,#348CCB)", color: "#0A183A" },
  value:   { label: "Económica",  sublabel: "Marca de gama de valor", stars: 3, bg: "linear-gradient(135deg,#64748b,#94a3b8)", color: "#1e293b" },
};

// Brand info changes rarely (and the backend caches it for 15 min),
// but we keep the frontend ISR window short — 5 min — so freshly scraped
// data lands quickly without forcing a full Vercel deploy.
export const revalidate = 300;

async function fetchBrand(slug: string): Promise<BrandPageData | null> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/brands/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) return { title: "Marca no encontrada · TirePro" };

  const prices = brand.listings
    .map((l) => (l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date() ? l.precioPromo! : l.precioCop))
    .filter((p) => p > 0);
  const fromPrice = prices.length > 0 ? Math.min(...prices) : null;
  const fromStr = fromPrice ? ` desde ${fmtCOP(fromPrice)}` : "";

  const nuevaCnt    = brand.listings.filter((l) => (l.tipo || "").toLowerCase() === "nueva").length;
  const retreadCnt  = brand.listings.filter((l) => (l.tipo || "").toLowerCase() === "reencauche").length;
  const focusLabel =
    nuevaCnt > 0 && retreadCnt === 0    ? "Nuevas"
    : retreadCnt > 0 && nuevaCnt === 0   ? "Reencauchadas"
    : nuevaCnt > 0 && retreadCnt > 0     ? "Nuevas y Reencauche"
    : null;
  const focusDesc =
    nuevaCnt > 0 && retreadCnt === 0    ? "llantas nuevas"
    : retreadCnt > 0 && nuevaCnt === 0   ? "llantas reencauchadas"
    : nuevaCnt > 0 && retreadCnt > 0     ? "llantas nuevas y de reencauche"
    : "llantas";

  const titleFocus = focusLabel ? ` ${focusLabel}` : "";
  const title = `Llantas ${brand.name}${titleFocus} en Colombia${fromStr} — Comprar Online | TirePro`;
  const desc = `Compra ${focusDesc} ${brand.name}${fromStr} en Bogotá, Medellín, Cali, Barranquilla y toda Colombia. ${brand.total} producto${brand.total !== 1 ? "s" : ""} de distribuidores verificados${brand.country ? ` — marca ${brand.country.toLowerCase()}` : ""}. Compara precios y opciones en TirePro Marketplace.`.slice(0, 300);
  const url = `https://www.tirepro.com.co/marketplace/brand/${slug}`;
  const ogImage = brand.heroImageUrl || brand.logoUrl || "https://www.tirepro.com.co/og-image.png";
  return {
    title,
    description: desc,
    keywords: [
      brand.name,
      `llantas ${brand.name}`,
      `llantas ${brand.name} colombia`,
      `comprar llantas ${brand.name}`,
      `precio llantas ${brand.name}`,
      `distribuidor ${brand.name}`,
      `distribuidor ${brand.name} colombia`,
      `${brand.name} colombia`,
      `${brand.name} ${brand.country ?? ""}`,
      `catalogo ${brand.name}`,
      `modelos ${brand.name}`,
      `${brand.name} tractomula`, `${brand.name} camion`, `${brand.name} bus`, `${brand.name} camioneta`,
    ].filter(Boolean),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: "TirePro Marketplace",
      locale: "es_CO",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Llantas ${brand.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Llantas ${brand.name} | TirePro`,
      description: desc,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) notFound();
  if (brand.published === false) notFound();

  const tier = brand.tier && TIER_META[brand.tier] ? TIER_META[brand.tier] : null;
  const flag = flagFor(brand.country);
  const yearsActive = brand.foundedYear ? new Date().getFullYear() - brand.foundedYear : null;

  // Detect brand product focus from current listings. Drives copy in title,
  // description, FAQ and SEO content so e.g. Hankook (new-tire-only) is never
  // described as a retread brand. Brands without listings get null and fall
  // back to generic copy.
  const nuevaCount    = brand.listings.filter((l) => (l.tipo || "").toLowerCase() === "nueva").length;
  const reencaucheCount = brand.listings.filter((l) => (l.tipo || "").toLowerCase() === "reencauche").length;
  type ProductFocus = "new" | "retread" | "both" | null;
  const productFocus: ProductFocus =
    nuevaCount > 0 && reencaucheCount === 0
      ? "new"
      : reencaucheCount > 0 && nuevaCount === 0
      ? "retread"
      : nuevaCount > 0 && reencaucheCount > 0
      ? "both"
      : null;

  // ─── Brand palette ────────────────────────────────────────────────────────
  // Every accent color on this page derives from the brand's own colors so
  // the page feels owned by the brand — not just a generic TirePro page with
  // a different logo. Falls back to TirePro defaults when a brand hasn't
  // been customized.
  const PRIMARY = brand.primaryColor ?? "#1E76B6";
  const ACCENT  = brand.accentColor  ?? "#0A183A";
  // Hex → rgba with alpha. Tolerates #rgb, #rrggbb, or anything non-hex
  // (falls through to PRIMARY to stay safe).
  const rgba = (hex: string, a: number): string => {
    const m = hex.replace("#", "");
    if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(m)) return `rgba(30,118,182,${a})`;
    const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  // Hero: image over a brand-colored tint when both exist, else pure brand
  // gradient, else TirePro default. The dark overlay keeps text readable
  // regardless of the image lightness.
  const heroBackground = brand.heroImageUrl
    ? `linear-gradient(135deg, ${rgba(ACCENT, 0.82)} 0%, ${rgba(PRIMARY, 0.55)} 100%), url(${brand.heroImageUrl}) center/cover`
    : brand.primaryColor
    ? `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 55%, ${ACCENT} 100%)`
    : "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)";

  const facts: Array<{ icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string; sub?: string }> = [];
  if (brand.country)       facts.push({ icon: MapPin,    label: "País de origen", value: `${flag} ${brand.country}` });
  if (brand.foundedYear)   facts.push({ icon: Calendar,  label: "Fundada en",     value: String(brand.foundedYear), sub: yearsActive ? `${yearsActive} años en el mercado` : undefined });
  if (brand.headquarters)  facts.push({ icon: Building2, label: "Sede",           value: brand.headquarters });
  if (brand.parentCompany) facts.push({ icon: Factory,   label: "Empresa matriz", value: brand.parentCompany });

  const brandUrl = `https://www.tirepro.com.co/marketplace/brand/${brand.slug}`;

  // Price summary for AggregateOffer — drives "from $X" rich snippets on SERPs.
  const priceList = brand.listings
    .map((l) => (l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date() ? l.precioPromo! : l.precioCop))
    .filter((p) => p > 0);
  const lowPrice = priceList.length > 0 ? Math.min(...priceList) : null;
  const highPrice = priceList.length > 0 ? Math.max(...priceList) : null;

  // Wikipedia link — lets Google's Knowledge Graph connect the brand entity.
  const wikiSameAs = brand.website ? [brand.website] : [];
  if (brand.name) wikiSameAs.push(`https://es.wikipedia.org/wiki/${encodeURIComponent(brand.name)}`);

  const brandSchema = {
    "@context": "https://schema.org",
    "@type": "Brand",
    "@id": `${brandUrl}#brand`,
    name: brand.name,
    alternateName: [`Llantas ${brand.name}`, `${brand.name} Colombia`],
    description: brand.description || `${brand.name} es una marca de llantas disponible en TirePro Marketplace Colombia.`,
    logo: brand.logoUrl || undefined,
    image: brand.heroImageUrl || brand.logoUrl || undefined,
    url: brandUrl,
    slogan: brand.tagline || undefined,
    sameAs: wikiSameAs,
    ...(brand.foundedYear && { foundingDate: String(brand.foundedYear) }),
    ...(brand.headquarters && {
      address: { "@type": "PostalAddress", addressLocality: brand.headquarters, addressCountry: brand.country || undefined },
    }),
    ...(brand.parentCompany && {
      parentOrganization: { "@type": "Organization", name: brand.parentCompany },
    }),
  };

  // CollectionPage with AggregateOffer — tells Google "this page lists N
  // products of brand X with prices from A to B", enabling price-range
  // rich snippets for brand queries.
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": brandUrl,
    name: `Llantas ${brand.name} en Colombia`,
    description: `Catálogo de llantas ${brand.name} en TirePro Marketplace con ${brand.total} producto${brand.total !== 1 ? "s" : ""} de distribuidores verificados en Colombia.`,
    url: brandUrl,
    inLanguage: "es-CO",
    isPartOf: { "@type": "WebSite", name: "TirePro", url: "https://www.tirepro.com.co" },
    about: { "@id": `${brandUrl}#brand` },
    ...(lowPrice != null && highPrice != null && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "COP",
        lowPrice: String(lowPrice),
        highPrice: String(highPrice),
        offerCount: brand.total,
        availability: "https://schema.org/InStock",
      },
    }),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: brand.listings.length,
      itemListElement: brand.listings.slice(0, 20).map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://www.tirepro.com.co/marketplace/product/${l.id}`,
        name: `${l.marca} ${l.modelo} ${l.dimension}`,
      })),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro", item: "https://www.tirepro.com.co" },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: "https://www.tirepro.com.co/marketplace" },
      { "@type": "ListItem", position: 3, name: brand.name, item: brandUrl },
    ],
  };

  const fromPriceStr = lowPrice != null ? fmtCOP(lowPrice) : null;

  // Product-focus aware copy. Every reference to "nueva o reencauche" only
  // shows up when the brand actually offers both. A new-tire-only brand like
  // Hankook never gets retread mentions, and vice versa for retread houses.
  const productNoun =
    productFocus === "new"     ? "llantas nuevas"
    : productFocus === "retread" ? "llantas reencauchadas"
    : productFocus === "both"    ? "llantas nuevas y de reencauche"
    : "llantas";

  // FAQ block was removed — guarantee/origin claims about a third-party
  // brand belong on the manufacturer's site, and rendering FAQPage JSON-LD
  // without the matching visible Q&A risks a structured-data penalty.

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brandSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* HERO — conversion-focused. H1 leads with the high-intent target
          phrase ("Compra llantas {Brand} en Colombia"), price hook in a
          chip, primary CTA jumps to #catalogo and a secondary trust line
          with envío + verificado + tier. Brand color reads as background
          accent only — type stays high-contrast white for legibility. */}
      <div className="relative overflow-hidden" style={{ background: heroBackground }}>
        <div className="absolute inset-0 opacity-10" aria-hidden style={{
          backgroundImage: "radial-gradient(circle at 20% 0%, rgba(52,140,203,0.6), transparent 40%), radial-gradient(circle at 80% 100%, rgba(245,158,11,0.4), transparent 40%)",
        }} />
        <div className="relative max-w-5xl mx-auto px-3 sm:px-6 pt-5 pb-10 sm:pb-14">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-3 h-3" />
            Volver al marketplace
          </Link>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10">
            {/* Logo card — bigger on desktop so the brand reads first */}
            <div
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 p-4 mx-auto lg:mx-0"
              style={{ boxShadow: "0 24px 60px -12px rgba(10,24,58,0.55)" }}
            >
              {brand.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={brand.logoUrl} alt={`Logo ${brand.name} — Llantas en Colombia`} className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-5xl font-black text-[#0A183A]">{brand.name.charAt(0)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Trust pills */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white bg-white/15 backdrop-blur-sm border border-white/20 uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3" />
                  Marca verificada
                </span>
                {tier && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                    style={{ background: tier.bg, color: "white", boxShadow: "0 6px 14px rgba(0,0,0,0.2)" }}
                  >
                    <Award className="w-3 h-3" />
                    {tier.label}
                  </span>
                )}
                {brand.country && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-white/10 border border-white/15">
                    <span className="text-sm leading-none">{flag}</span>
                    {brand.country}
                  </span>
                )}
                {productFocus && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-white/10 border border-white/15">
                    {productFocus === "new" && "Llantas nuevas"}
                    {productFocus === "retread" && "Reencauche"}
                    {productFocus === "both" && "Nuevas + Reencauche"}
                  </span>
                )}
              </div>

              {/* H1 — target keyword. Single line; tagline (when present)
                  carries the brand voice below. */}
              <h1 className="text-[32px] sm:text-[48px] lg:text-[56px] font-black text-white leading-[1.05] tracking-tight">
                Llantas {brand.name}
              </h1>

              {brand.tagline && (
                <p className="text-sm sm:text-base text-white/90 mt-3 font-medium max-w-xl">{brand.tagline}</p>
              )}

              {/* Value-prop sub-line — only the claims TirePro can make
                  globally for any seller. Per-listing extras (instalación,
                  garantía) are surfaced on the product page, not here, so
                  we don't mis-set expectations on the brand landing. */}
              <p className="text-[12px] sm:text-sm text-white/85 mt-3 max-w-xl">
                Distribuidores verificados en toda Colombia. Envío nacional y pago seguro.
                {fromPriceStr && <>{" "}Desde <strong className="text-white">{fromPriceStr}</strong>.</>}
              </p>

              {/* CTA row */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <a
                  href="#catalogo"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black bg-white hover:bg-white/95 transition-all"
                  style={{ color: ACCENT, boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)" }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Ver catálogo
                  {fromPriceStr && (
                    <span
                      className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: rgba(PRIMARY, 0.12), color: ACCENT }}
                    >
                      desde {fromPriceStr}
                    </span>
                  )}
                </a>
                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-white bg-white/10 hover:bg-white/15 transition-colors backdrop-blur-sm border border-white/20"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Sitio oficial
                  </a>
                )}
              </div>

              {tier && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-4 h-4"
                        fill={s <= tier.stars ? "#fbbf24" : "none"}
                        style={{ color: s <= tier.stars ? "#fbbf24" : "rgba(255,255,255,0.3)" }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-white/80 font-bold">{tier.sublabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-8 -mt-4 relative space-y-8">
        {/* STATS STRIP — at-a-glance trust metrics that elevate the page
            from "product list" to "marketplace landing". 4 cards on
            desktop / 2x2 on mobile. The strip sits visually anchored on
            the hero via the negative margin above. */}
        <section
          aria-labelledby="brand-stats"
          className="bg-white rounded-3xl p-4 sm:p-5"
          style={{ boxShadow: "0 24px 60px -24px rgba(10,24,58,0.25)", border: `1px solid ${rgba(PRIMARY, 0.10)}` }}
        >
          <h2 id="brand-stats" className="sr-only">Métricas de {brand.name} en TirePro</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                icon: Package,
                label: "Productos",
                value: String(brand.total),
                sub: brand.total === 1 ? "disponible" : "disponibles",
              },
              ...(fromPriceStr ? [{
                icon: ShoppingCart,
                label: "Desde",
                value: fromPriceStr,
                sub: "precio más bajo",
              }] : []),
              {
                icon: Truck,
                label: "Envío",
                value: "Nacional",
                sub: "Bogotá, Medellín, Cali +",
              },
              {
                icon: ShieldCheck,
                label: "Distribuidores",
                value: "Verificados",
                sub: "filtro de calidad TirePro",
              },
            ].slice(0, 4).map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: rgba(PRIMARY, 0.08), border: `1px solid ${rgba(PRIMARY, 0.15)}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: PRIMARY }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: PRIMARY }}>
                      {s.label}
                    </p>
                    <p className="text-[15px] font-black text-[#0A183A] leading-tight truncate">{s.value}</p>
                    <p className="text-[10px] text-gray-500 leading-snug">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Facts grid */}
        {facts.length > 0 && (
          <section
            className="bg-white rounded-3xl p-5 sm:p-6 relative overflow-hidden"
            style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
          >
            {/* Brand-colored top rail so each card feels owned by the brand. */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
              aria-hidden
            />
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-4"
              style={{ color: PRIMARY }}
            >
              Datos de la marca
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {facts.map(({ icon: Icon, label, value, sub }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4"
                  style={{
                    background: `linear-gradient(135deg, ${rgba(PRIMARY, 0.07)}, ${rgba(PRIMARY, 0.03)})`,
                    border: `1px solid ${rgba(PRIMARY, 0.14)}`,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl bg-white flex items-center justify-center mb-2.5"
                    style={{ border: `1px solid ${rgba(PRIMARY, 0.18)}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: PRIMARY }} />
                  </div>
                  <p
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{ color: PRIMARY }}
                  >
                    {label}
                  </p>
                  <p className="text-sm font-black text-[#0A183A] mt-0.5 leading-tight">{value}</p>
                  {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Description — with a brand-colored left accent bar. */}
        {brand.description && (
          <section
            className="bg-white rounded-3xl p-6 relative overflow-hidden"
            style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
          >
            <div
              className="absolute top-0 bottom-0 left-0 w-1.5"
              style={{ background: `linear-gradient(180deg, ${PRIMARY}, ${ACCENT})` }}
              aria-hidden
            />
            <div className="pl-4">
              <h2 className="text-lg font-black text-[#0A183A] mb-3">Historia de {brand.name}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{brand.description}</p>
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-xs font-black hover:underline transition-colors"
                  style={{ color: PRIMARY }}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Sitio oficial
                </a>
              )}
            </div>
          </section>
        )}

        {/* Plants */}
        {Array.isArray(brand.plants) && brand.plants.length > 0 && (
          <section className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}>
            <h2 className="text-lg font-black text-[#0A183A] mb-3">Plantas de producción</h2>
            <div className="flex flex-wrap gap-2">
              {brand.plants.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: rgba(PRIMARY, 0.1), color: PRIMARY }}
                >
                  <Factory className="w-3 h-3" />
                  {[p.city, p.country].filter(Boolean).join(", ")}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Catálogo — client filter + upgraded grid */}
        <BrandListingsClient
          brandName={brand.name}
          listings={brand.listings}
          primary={PRIMARY}
          accent={ACCENT}
        />
        {brand.total > brand.listings.length && (
          <div className="text-center -mt-4">
            <Link
              href={`/marketplace?q=${encodeURIComponent(brand.name)}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black text-white transition-all hover:opacity-95"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${PRIMARY})` }}
            >
              Ver los {brand.total} productos en el marketplace
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* SEO content — server-rendered Spanish copy crawlers can read on first
            request. Targets long-tail queries like "comprar llantas {brand}
            bogotá", "{brand} precio colombia", "{brand} para tractomula". */}
        <section
          aria-labelledby="brand-seo-overview"
          className="bg-white rounded-3xl p-6 sm:p-8"
          style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
        >
          <h2
            id="brand-seo-overview"
            className="text-xl sm:text-2xl font-black text-[#0A183A] mb-4"
          >
            Comprar {productNoun} {brand.name} en Colombia
          </h2>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-3">
            <p>
              <strong>{productNoun.charAt(0).toUpperCase() + productNoun.slice(1)} {brand.name}</strong>
              {fromPriceStr && <> desde <strong>{fromPriceStr}</strong></>}
              {" "}en TirePro Marketplace. {brand.total} producto{brand.total !== 1 ? "s" : ""} disponible
              {brand.total !== 1 ? "s" : ""} de distribuidores verificados con envío a{" "}
              <strong>Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena, Pereira</strong>{" "}
              y todo el país. Compara precios, dimensiones y opciones de distribuidores en una sola plataforma.
            </p>
            {productFocus === "new" && (
              <p>
                <strong>{brand.name} se especializa en llantas nuevas</strong> — no
                produce reencauche bajo su marca. Si buscas opciones de reencauche,
                explora otras marcas en el marketplace de TirePro o consulta nuestras
                guías sobre reencauche certificado.
              </p>
            )}
            {productFocus === "retread" && (
              <p>
                <strong>{brand.name} se especializa en reencauche y bandas de
                rodamiento</strong> — su catálogo está enfocado en extender la vida
                útil de tus cascos. Para llantas nuevas, explora otras marcas en el
                marketplace de TirePro.
              </p>
            )}
            {productFocus === "both" && (
              <p>
                <strong>{brand.name} ofrece tanto llantas nuevas como soluciones
                de reencauche</strong> — eliges según presupuesto, aplicación y vida
                útil esperada del casco.
              </p>
            )}
            <p>
              Encuentra {productNoun} {brand.name} para <strong>tractomula y camión</strong>{" "}
              (medidas comunes 295/80R22.5, 11R22.5, 315/80R22.5),{" "}
              <strong>SUV y camioneta</strong> (265/70R16, 285/60R18),{" "}
              <strong>bus</strong> y <strong>automóvil</strong> (195/65R15, 205/55R16),
              con instalación disponible en servitecas aliadas.
            </p>
            {brand.country && (
              <p>
                {brand.name} es una marca{tier ? ` ${tier.label.toLowerCase()}` : ""} de origen{" "}
                <strong>{brand.country}</strong>
                {brand.foundedYear && <> fundada en {brand.foundedYear}</>}
                {brand.parentCompany && <>, parte de {brand.parentCompany}</>}.
                {" "}En TirePro encuentras los modelos más vendidos en Colombia
                de distribuidores verificados.
              </p>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 className="text-sm font-black text-[#0A183A] mb-2">
                {productNoun.charAt(0).toUpperCase() + productNoun.slice(1)} {brand.name} por uso
              </h3>
              <ul className="grid grid-cols-1 gap-1.5 text-xs text-gray-600">
                <li>{brand.name} para tractomula y camión</li>
                <li>{brand.name} para bus y transporte de pasajeros</li>
                <li>{brand.name} para SUV y camioneta 4x4</li>
                <li>{brand.name} para automóvil y carro familiar</li>
                {productFocus === "both" && <li>{brand.name} reencauchadas</li>}
                {productFocus === "retread" && <li>{brand.name} bandas de rodamiento</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0A183A] mb-2">
                Ciudades con envío
              </h3>
              <ul className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
                <li>Bogotá D.C.</li>
                <li>Medellín</li>
                <li>Cali</li>
                <li>Barranquilla</li>
                <li>Bucaramanga</li>
                <li>Cartagena</li>
                <li>Pereira</li>
                <li>Cúcuta</li>
                <li>Ibagué</li>
                <li>Manizales</li>
              </ul>
            </div>
          </div>
        </section>

        {/* BUYING GUIDE — long-form value content. Targets long-tail
            "guía de compra de llantas {brand}" + answers buyer questions
            inline so the user doesn't bounce to a competitor blog. */}
        <section
          aria-labelledby="brand-guide"
          className="bg-white rounded-3xl p-6 sm:p-8"
          style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
        >
          <div className="flex items-start gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: rgba(PRIMARY, 0.1), border: `1px solid ${rgba(PRIMARY, 0.2)}` }}
            >
              <BookOpen className="w-5 h-5" style={{ color: PRIMARY }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: PRIMARY }}>
                Guía de compra
              </p>
              <h2 id="brand-guide" className="text-xl sm:text-2xl font-black text-[#0A183A] leading-tight">
                Cómo elegir tus llantas {brand.name}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <h3 className="text-sm font-black text-[#0A183A] mb-2">1. Identifica tu medida</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Revisa el costado de tu llanta actual. La medida sigue el formato{" "}
                <strong>ancho/perfil R rin</strong> — ej. 295/80R22.5 (tractomula),
                265/70R16 (camioneta), 195/65R15 (auto).
              </p>
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0A183A] mb-2">2. Define el uso</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {brand.name} fabrica llantas para distintos ejes y aplicaciones:
                dirección, tracción y remolque para flota, urbano vs. carretera para
                auto. Filtra arriba por categoría.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0A183A] mb-2">3. Mira más allá del precio</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                El precio inicial no cuenta toda la historia. Considera la
                vida útil estimada, si la llanta es <strong>reencauchable</strong>{" "}
                y la calidad del fabricante — son los factores que terminan
                marcando el costo total.
              </p>
            </div>
          </div>

          {/* Benefits row — claims TirePro can make for any seller. We
              don't promise garantía here because that's defined per
              listing by each distribuidor (some honor the manufacturer
              warranty, some run their own). The product page is the
              right place to surface that detail. */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                title: "Distribuidores verificados",
                sub: `Cada vendedor de ${brand.name} en TirePro pasa nuestro proceso de verificación.`,
                icon: ShieldCheck,
              },
              {
                title: "Compara y compra",
                sub: `Precios, dimensiones y opciones de cada modelo ${brand.name} disponible.`,
                icon: ShoppingCart,
              },
              {
                title: "Envío a toda Colombia",
                sub: "Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena y resto del país.",
                icon: Truck,
              },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="flex items-start gap-2.5 p-3 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${rgba(PRIMARY, 0.06)}, ${rgba(PRIMARY, 0.02)})`,
                    border: `1px solid ${rgba(PRIMARY, 0.12)}`,
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: PRIMARY }} />
                  <div>
                    <p className="text-[12px] font-black text-[#0A183A]">{b.title}</p>
                    <p className="text-[10px] text-gray-600 leading-snug mt-0.5">{b.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* INTERNAL LINKS — boosts SEO authority for sibling brand pages,
            popular dimensions, and use-case queries. Other brands + popular
            sizes live in two columns; reserves a third row for cities so
            the city × brand long-tail is well covered. */}
        <section
          aria-labelledby="brand-explore"
          className="bg-white rounded-3xl p-6 sm:p-8"
          style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
        >
          <h2 id="brand-explore" className="text-xl sm:text-2xl font-black text-[#0A183A] mb-5">
            Explora más en TirePro Marketplace
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>
                Otras marcas
              </h3>
              <ul className="space-y-1.5">
                {[
                  { slug: "michelin",    name: "Michelin" },
                  { slug: "bridgestone", name: "Bridgestone" },
                  { slug: "continental", name: "Continental" },
                  { slug: "goodyear",    name: "Goodyear" },
                  { slug: "hankook",     name: "Hankook" },
                  { slug: "pirelli",     name: "Pirelli" },
                  { slug: "yokohama",    name: "Yokohama" },
                  { slug: "firestone",   name: "Firestone" },
                ]
                  .filter((b) => b.slug !== brand.slug)
                  .slice(0, 7)
                  .map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/marketplace/brand/${b.slug}`}
                        className="text-xs text-gray-600 hover:underline"
                        style={{ ["--hover-color" as never]: PRIMARY }}
                      >
                        Llantas {b.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>
                Medidas populares
              </h3>
              <ul className="space-y-1.5">
                {["295/80R22.5", "11R22.5", "315/80R22.5", "265/70R16", "285/60R18", "205/55R16", "195/65R15", "225/45R17"].map((d) => (
                  <li key={d}>
                    <Link
                      href={`/marketplace?q=${encodeURIComponent(d)}`}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Llantas {d}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>
                {brand.name} en tu ciudad
              </h3>
              <ul className="space-y-1.5">
                {["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Cartagena", "Pereira", "Cúcuta"].map((c) => (
                  <li key={c}>
                    <Link
                      href={`/marketplace?q=${encodeURIComponent(brand.name + " " + c)}`}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Llantas {brand.name} en {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {brand.sourceUrl && (
          <p className="text-[10px] text-gray-400 text-center">
            Datos editoriales: <a href={brand.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Wikipedia</a>
          </p>
        )}
      </main>

      <MarketplaceFooter />
    </div>
  );
}
