import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Factory, Package, ArrowRight, Star, ShieldCheck, ShoppingCart, Truck, BookOpen, PlayCircle, Sparkles, ChevronRight } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import BrandListingsClient from "./BrandListingsClient";
import { productHref } from "../../product/_lib/url";

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
  videoUrl?: string | null;
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
  // Lead with the bare brand keyword first ("Nexen Colombia | Llantas …") so
  // SERP shows the brand front-and-center for navigational queries like just
  // "nexen". The "Llantas …" qualifier still covers the long-tail intent.
  const title = `${brand.name} Colombia | Llantas ${brand.name}${titleFocus}${fromStr} — TirePro`;
  const desc = `${brand.name} Colombia: ${focusDesc} ${brand.name}${fromStr} con envío a Bogotá, Medellín, Cali, Barranquilla, Bucaramanga y todo el país. ${brand.total} producto${brand.total !== 1 ? "s" : ""} de distribuidores verificados${brand.country ? `. Marca ${brand.country.toLowerCase()}` : ""}${brand.foundedYear ? ` desde ${brand.foundedYear}` : ""}. Compara precios y compra online en TirePro.`.slice(0, 300);
  const url = `https://www.tirepro.com.co/marketplace/brand/${slug}`;
  const ogImage = brand.heroImageUrl || brand.logoUrl || "https://www.tirepro.com.co/og-image.png";
  return {
    title,
    description: desc,
    keywords: [
      brand.name,
      `${brand.name} colombia`,
      `${brand.name} bogota`, `${brand.name} medellin`, `${brand.name} cali`, `${brand.name} barranquilla`,
      `llantas ${brand.name}`,
      `llantas ${brand.name} colombia`,
      `llantas ${brand.name} bogota`, `llantas ${brand.name} medellin`,
      `comprar llantas ${brand.name}`, `comprar ${brand.name} colombia`,
      `precio llantas ${brand.name}`, `precio ${brand.name} colombia`,
      `${brand.name} precio`, `${brand.name} catalogo`,
      `distribuidor ${brand.name}`, `distribuidor ${brand.name} colombia`,
      `${brand.name} ${brand.country ?? ""}`,
      `catalogo ${brand.name}`,
      `modelos ${brand.name}`,
      `${brand.name} tractomula`, `${brand.name} camion`, `${brand.name} bus`, `${brand.name} camioneta`, `${brand.name} suv`, `${brand.name} 4x4`,
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

  // Hero background. The video (when present) sits on top of this, so when
  // we have a video we still want a dark base color — the video element
  // covers the whole layer and only shows when fully buffered.
  // Layered design:
  //   1. Solid base (PRIMARY/ACCENT gradient or default).
  //   2. Optional <video> on top (handled in JSX).
  //   3. Optional heroImageUrl as fallback for browsers that block autoplay.
  //   4. Color overlay tint to keep text legible.
  const hasVideo = !!brand.videoUrl;
  const heroBaseGradient = brand.primaryColor
    ? `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 55%, ${ACCENT} 100%)`
    : "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)";
  const heroBackground = hasVideo
    ? heroBaseGradient
    : brand.heroImageUrl
    ? `linear-gradient(135deg, ${rgba(ACCENT, 0.82)} 0%, ${rgba(PRIMARY, 0.55)} 100%), url(${brand.heroImageUrl}) center/cover`
    : heroBaseGradient;

  // Top models for the hero strip — pick the first 6 distinct models from
  // listings (already sorted by image quality, so these are the prettiest
  // results to lead with). Drives the "modelos destacados" rail in the hero.
  const seenModels = new Set<string>();
  const topModels: Array<{ id: string; marca: string; modelo: string; dimension: string; image: string | null; price: number }> = [];
  for (const l of brand.listings) {
    const key = (l.modelo || "").toLowerCase().trim();
    if (!key || seenModels.has(key)) continue;
    seenModels.add(key);
    const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
    const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
    const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
    topModels.push({ id: l.id, marca: l.marca, modelo: l.modelo, dimension: l.dimension, image: cover, price: hasPromo ? l.precioPromo! : l.precioCop });
    if (topModels.length >= 6) break;
  }

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
        url: `https://www.tirepro.com.co${productHref(l)}`,
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

  // FAQ — marketplace-only facts (counts, prices, cities, focus). We
  // deliberately don't make claims about the brand itself (warranty, origin
  // guarantees) because TirePro is the marketplace, not the manufacturer —
  // those answers belong on the brand's own site. Each Q&A has matching
  // visible copy below so the FAQPage JSON-LD passes Google's structured-
  // data validation.
  const cityFocus = "Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena, Pereira y resto del país";
  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `¿Dónde puedo comprar llantas ${brand.name} en Colombia?`,
      a: `En TirePro Marketplace encuentras ${brand.total} producto${brand.total !== 1 ? "s" : ""} ${brand.name} de distribuidores verificados con envío a ${cityFocus}. Compras 100% online y pagas con tarjeta, PSE o transferencia.`,
    },
    ...(fromPriceStr ? [{
      q: `¿Cuánto cuesta una llanta ${brand.name}?`,
      a: `Las llantas ${brand.name} en TirePro empiezan desde ${fromPriceStr}. El precio final depende de la medida, el modelo y el distribuidor — compara opciones directamente en el catálogo de la marca.`,
    }] : []),
    ...(productFocus === "both" ? [{
      q: `¿${brand.name} ofrece llantas nuevas y reencauche?`,
      a: `Sí. En TirePro encuentras tanto llantas nuevas ${brand.name} como soluciones de reencauche bajo la misma marca. Filtra por tipo en el catálogo para ver las opciones que aplican a tu vehículo.`,
    }] : productFocus === "new" ? [{
      q: `¿${brand.name} hace reencauche?`,
      a: `${brand.name} se especializa en llantas nuevas — no produce reencauche bajo su marca. Si buscas reencauche, explora otras marcas en el marketplace de TirePro.`,
    }] : productFocus === "retread" ? [{
      q: `¿${brand.name} vende llantas nuevas?`,
      a: `${brand.name} se enfoca en reencauche y bandas de rodamiento, no en llantas nuevas. Para llantas nuevas, explora otras marcas en TirePro Marketplace.`,
    }] : []),
    {
      q: `¿Hay distribuidores ${brand.name} cerca de mí?`,
      a: `TirePro reúne distribuidores ${brand.name} verificados en las principales ciudades de Colombia (${cityFocus}). El envío sale del distribuidor más cercano según tu dirección.`,
    },
    ...(brand.country || brand.foundedYear ? [{
      q: `¿De dónde es la marca ${brand.name}?`,
      a: `${brand.name} es una marca${tier ? ` ${tier.label.toLowerCase()}` : ""}${brand.country ? ` de origen ${brand.country.toLowerCase()}` : ""}${brand.foundedYear ? `, fundada en ${brand.foundedYear}` : ""}${brand.parentCompany ? `, parte de ${brand.parentCompany}` : ""}.`,
    }] : []),
  ];

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brandSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* HERO — full-bleed, asymmetric, video-friendly. Five layers:
          1. Brand-color base gradient.
          2. <video> autoplay loop (when admin set videoUrl).
          3. heroImageUrl as a fallback poster.
          4. Brand-tinted color wash to keep text legible regardless of media.
          5. Animated noise + radial mesh accents for depth.
          The two-column grid (5/7) breaks the centered template look — logo
          stack on the left feels like a brand mark, copy fills the right. */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: heroBackground }}
      >
        {/* Video background. Plays muted + looped; falls back to heroImageUrl
            poster + base gradient on autoplay block (iOS low-power mode). */}
        {hasVideo && (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={brand.heroImageUrl ?? undefined}
            aria-hidden
          >
            <source src={brand.videoUrl!} />
          </video>
        )}

        {/* Color wash on top of media. Slightly darker on the left so copy
            stays readable; thinner on the right so the video reads through. */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background: hasVideo || brand.heroImageUrl
              ? `linear-gradient(105deg, ${rgba(ACCENT, 0.92)} 0%, ${rgba(ACCENT, 0.7)} 35%, ${rgba(PRIMARY, 0.45)} 70%, ${rgba(PRIMARY, 0.25)} 100%)`
              : "transparent",
          }}
        />

        {/* Animated mesh accents — pure CSS so it's free at runtime. */}
        <div
          className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 18% 12%, ${rgba(PRIMARY, 0.55)}, transparent 38%), radial-gradient(circle at 82% 92%, rgba(245,158,11,0.35), transparent 40%), radial-gradient(circle at 50% 50%, ${rgba(ACCENT, 0.35)}, transparent 55%)`,
          }}
        />
        {/* Subtle grain. Inline SVG so it ships in the HTML without an extra request. */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          aria-hidden
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-5 pb-12 sm:pb-16 lg:pb-20">
          <div className="flex items-center justify-between mb-5">
            <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Marketplace
              <ChevronRight className="w-3 h-3 opacity-50" />
              <span className="text-white">{brand.name}</span>
            </Link>
            {hasVideo && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/85 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/15">
                <PlayCircle className="w-3 h-3" />
                Video
              </span>
            )}
          </div>

          {/* Asymmetric grid — kills the centered-template look. */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT: logo, country, tier ribbon */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start gap-4">
              <div className="relative">
                {/* Floating tier ribbon */}
                {tier && (
                  <span
                    className="absolute -top-3 -right-3 z-10 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl"
                    style={{ background: tier.bg, color: "white" }}
                  >
                    {tier.label}
                  </span>
                )}
                <div
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-[28px] bg-white flex items-center justify-center overflow-hidden p-5"
                  style={{ boxShadow: `0 30px 70px -15px ${rgba(ACCENT, 0.7)}` }}
                >
                  {brand.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={brand.logoUrl} alt={`Logo ${brand.name} — Llantas en Colombia`} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-6xl font-black text-[#0A183A]">{brand.name.charAt(0)}</span>
                  )}
                </div>
              </div>

              {/* Country + founding chip stack */}
              <div className="flex flex-col items-center lg:items-start gap-1.5 text-center lg:text-left">
                {brand.country && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/90">
                    <span className="text-base leading-none">{flag}</span>
                    Marca {brand.country.toLowerCase()}
                    {brand.foundedYear && <span className="text-white/60"> · desde {brand.foundedYear}</span>}
                  </span>
                )}
                {tier && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5"
                        fill={s <= tier.stars ? "#fbbf24" : "none"}
                        style={{ color: s <= tier.stars ? "#fbbf24" : "rgba(255,255,255,0.35)" }}
                      />
                    ))}
                    <span className="text-[10px] text-white/70 font-bold ml-1">{tier.sublabel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: H1 + value prop + CTA */}
            <div className="lg:col-span-8 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white bg-white/15 backdrop-blur-sm border border-white/20 uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3" />
                  Distribuidores verificados
                </span>
                {productFocus && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-white/10 border border-white/15">
                    {productFocus === "new" && "Llantas nuevas"}
                    {productFocus === "retread" && "Reencauche"}
                    {productFocus === "both" && "Nuevas + Reencauche"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white/90 bg-white/10 border border-white/15">
                  <Sparkles className="w-3 h-3" />
                  {brand.total} producto{brand.total !== 1 ? "s" : ""}
                </span>
              </div>

              {/* H1 — leads with bare brand for nav-intent queries (e.g. "nexen"),
                  followed by the long-tail qualifier. Two-line treatment makes
                  the brand word the dominant visual. */}
              {/* Trailing space inside the first span so the H1 reads as
                  "Nexen Llantas Nexen en Colombia…" when flattened — JSX
                  strips the newline between sibling spans, and Google /
                  social previews / screen readers see the whole H1 as a
                  single string. The `block` layout is unaffected. */}
              <h1 className="font-black text-white leading-[0.95] tracking-tight">
                <span className="block text-[44px] sm:text-[64px] lg:text-[88px]">{brand.name}{' '}</span>
                <span className="block text-[18px] sm:text-[24px] lg:text-[28px] font-bold text-white/85 mt-1">
                  Llantas {brand.name} en Colombia{fromPriceStr && <> · desde <span className="text-white">{fromPriceStr}</span></>}
                </span>
              </h1>

              {brand.tagline && (
                <p className="text-sm sm:text-base text-white/90 mt-4 font-medium max-w-2xl italic">
                  &ldquo;{brand.tagline}&rdquo;
                </p>
              )}

              <p className="text-[13px] sm:text-sm text-white/85 mt-4 max-w-2xl leading-relaxed">
                Compra {productNoun} <strong className="text-white">{brand.name}</strong> con envío a Bogotá,
                Medellín, Cali, Barranquilla, Bucaramanga, Cartagena, Pereira y todo el país. Compara precios
                de distribuidores verificados y paga online de forma segura.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <a
                  href="#catalogo"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-black bg-white hover:bg-white/95 transition-all hover:-translate-y-0.5"
                  style={{ color: ACCENT, boxShadow: "0 14px 30px -10px rgba(0,0,0,0.5)" }}
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
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/20"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Sitio oficial {brand.name}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Top-models rail — concrete proof there's a catalog, plus visual
              variety that breaks the static-card layout. Horizontal scroll
              on mobile; flex row on desktop. */}
          {topModels.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                  Modelos destacados {brand.name}
                </p>
                <a href="#catalogo" className="text-[10px] font-bold text-white/80 hover:text-white inline-flex items-center gap-1">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory">
                {topModels.map((m) => (
                  <Link
                    key={m.id}
                    href={productHref(m)}
                    className="snap-start flex-shrink-0 w-36 sm:w-44 bg-white/95 hover:bg-white rounded-2xl p-3 transition-all hover:-translate-y-1 group"
                    style={{ boxShadow: "0 12px 28px -10px rgba(0,0,0,0.4)" }}
                  >
                    <div
                      className="aspect-square w-full rounded-xl flex items-center justify-center overflow-hidden mb-2"
                      style={{ background: `radial-gradient(circle at 30% 20%, #fff, ${rgba(PRIMARY, 0.08)})` }}
                    >
                      {m.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.image}
                          alt={`${brand.name} ${m.modelo}`}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: PRIMARY }}>
                      {brand.name}
                    </p>
                    <p className="text-xs font-black text-[#0A183A] truncate">{m.modelo}</p>
                    <p className="text-[11px] font-black text-[#0A183A] mt-0.5">{fmtCOP(m.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-8 -mt-4 relative space-y-8">
        {/* BRAND PROFILE — replaces the old "stats grid + datos grid" pair.
            Editorial layout, magazine-style: a poster-sized country-flag
            panel on the left (the brand's heritage at a glance), a key-value
            dossier on the right, and a thin metric rail across the bottom
            with the marketplace numbers (productos / desde / envío /
            distribuidores). One unified surface — much less template-y than
            two stacked grids of icon cards. */}
        <section
          aria-labelledby="brand-profile"
          className="bg-white rounded-3xl overflow-hidden"
          style={{ boxShadow: "0 24px 60px -24px rgba(10,24,58,0.25)", border: `1px solid ${rgba(PRIMARY, 0.10)}` }}
        >
          <h2 id="brand-profile" className="sr-only">Perfil de la marca {brand.name}</h2>
          <div className="grid lg:grid-cols-12">
            {/* LEFT: oversized country panel. Big flag emoji rendered as a
                poster on a brand-colored gradient. The flag size scales
                from ~96px on mobile to ~160px on desktop so it reads as
                the dominant visual, not a tiny chip. */}
            <div
              className="lg:col-span-5 p-7 sm:p-9 relative overflow-hidden flex flex-col justify-center min-h-[260px]"
              style={{ background: `linear-gradient(140deg, ${ACCENT} 0%, ${PRIMARY} 100%)` }}
            >
              {/* Decorative concentric circles — depth without adding image weight */}
              <div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
                style={{ background: `radial-gradient(circle, ${rgba(PRIMARY, 0.6)}, transparent 70%)` }}
                aria-hidden
              />
              <div
                className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-15"
                style={{ background: `radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)` }}
                aria-hidden
              />

              <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-3">
                Origen
              </p>
              <div className="relative flex items-center gap-5">
                {/* Big flag block — fixed-width passport-card so the emoji
                    renders inside a defined frame instead of looking like
                    a stray chip. */}
                <div
                  className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/95 flex items-center justify-center shadow-2xl"
                  style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.35)" }}
                >
                  <span className="text-6xl sm:text-7xl leading-none" aria-hidden>{flag}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                    {brand.country ?? "Internacional"}
                  </p>
                  {brand.foundedYear && (
                    <p className="text-xs text-white/80 mt-1 font-medium">
                      Fundada en {brand.foundedYear}
                      {yearsActive ? ` · ${yearsActive} años en el mercado` : ""}
                    </p>
                  )}
                  {tier && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/85 mt-2">
                      Marca {tier.label}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: dossier + magazine stat rail */}
            <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col">
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: PRIMARY }}>
                  Perfil de marca
                </p>
                <span className="text-[10px] font-bold text-gray-400">{brand.name}</span>
              </div>

              {/* Definition list — editorial dossier. Drops icons entirely,
                  uses typography contrast to do the work. */}
              <dl className="divide-y divide-gray-100">
                {brand.headquarters && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 self-center">Sede</dt>
                    <dd className="col-span-2 text-sm font-bold text-[#0A183A]">{brand.headquarters}</dd>
                  </div>
                )}
                {brand.parentCompany && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 self-center">Empresa matriz</dt>
                    <dd className="col-span-2 text-sm font-bold text-[#0A183A]">{brand.parentCompany}</dd>
                  </div>
                )}
                {brand.foundedYear && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 self-center">Trayectoria</dt>
                    <dd className="col-span-2 text-sm font-bold text-[#0A183A]">
                      {brand.foundedYear}
                      {yearsActive ? <span className="text-gray-500 font-medium"> · {yearsActive} años activos</span> : null}
                    </dd>
                  </div>
                )}
                {brand.website && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 self-center">Sitio oficial</dt>
                    <dd className="col-span-2 text-sm font-bold">
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate inline-flex items-center gap-1"
                        style={{ color: PRIMARY }}
                      >
                        {(() => {
                          try { return new URL(brand.website).host.replace(/^www\./, ""); }
                          catch { return brand.website; }
                        })()}
                        <Globe className="w-3 h-3" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {/* Magazine-style metric rail. Numeric values get the big
                  display treatment; word-values (Nacional / Verificados)
                  drop a tier in size so they fit in one column on any
                  breakpoint. Each cell is min-w-0 + truncate so long
                  values stay within bounds. */}
              <div
                className="mt-6 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-5"
                style={{ borderTop: `1px solid ${rgba(PRIMARY, 0.12)}` }}
              >
                {(() => {
                  type Metric = { value: string; label: string; color?: string; size: "big" | "word" };
                  const metrics: Metric[] = [
                    { value: String(brand.total), label: brand.total === 1 ? "Producto" : "Productos", size: "big" },
                    ...(fromPriceStr ? [{ value: fromPriceStr, label: "Desde", color: PRIMARY, size: "big" as const }] : []),
                    { value: "Nacional", label: "Envío", size: "word" },
                    { value: "Verificados", label: "Distribuidores", size: "word" },
                  ];
                  return metrics.map((m) => (
                    <div key={m.label} className="min-w-0">
                      {/* whitespace-nowrap + a font size that fits the
                          longest expected value ("$ 1.234.567") inside
                          the ~120px column. We also bump the column up to
                          its content width via `w-fit` so the price never
                          gets clipped by truncate. */}
                      <p
                        className={`${m.size === "big" ? "text-lg sm:text-xl" : "text-sm sm:text-base"} font-black tracking-tight leading-none whitespace-nowrap`}
                        style={{ color: m.color ?? "#0A183A" }}
                        title={m.value}
                      >
                        {m.value}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2 truncate">
                        {m.label}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </section>

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

        {/* FAQ — marketplace-only facts so the FAQPage JSON-LD has
            matching visible text. Renders as native <details> for zero-JS
            accordion behaviour. Targets long-tail "{brand} colombia
            distribuidor", "{brand} precio", etc. */}
        {faqs.length > 0 && (
          <section
            aria-labelledby="brand-faq"
            className="bg-white rounded-3xl p-6 sm:p-8 relative overflow-hidden"
            style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
              aria-hidden
            />
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>
              Preguntas frecuentes
            </p>
            <h2 id="brand-faq" className="text-xl sm:text-2xl font-black text-[#0A183A] mb-5">
              Sobre llantas {brand.name} en Colombia
            </h2>
            <div className="divide-y divide-gray-100">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  className="group py-3"
                  open={i === 0}
                >
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                    <h3 className="text-sm font-black text-[#0A183A] flex-1">{f.q}</h3>
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-open:rotate-90"
                      style={{ background: rgba(PRIMARY, 0.1), color: PRIMARY }}
                      aria-hidden
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </summary>
                  <p className="text-xs text-gray-600 leading-relaxed mt-2 pr-9">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

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
