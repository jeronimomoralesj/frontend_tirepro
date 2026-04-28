import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Building2, Globe, Factory, Package, ArrowRight, Star, Award, ShieldCheck } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";

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
  const title = `Llantas ${brand.name} en Colombia — Precios, modelos e historia | TirePro`;
  const desc = `Compra llantas ${brand.name} en Colombia. ${brand.description ?? ""} Compara precios de distribuidores verificados, modelos disponibles y CPK estimado en TirePro Marketplace.`.slice(0, 300);
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

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brandSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: heroBackground }}>
        <div className="absolute inset-0 opacity-10" aria-hidden style={{
          backgroundImage: "radial-gradient(circle at 20% 0%, rgba(52,140,203,0.6), transparent 40%), radial-gradient(circle at 80% 100%, rgba(245,158,11,0.4), transparent 40%)",
        }} />
        <div className="relative max-w-5xl mx-auto px-3 sm:px-6 pt-5 pb-10">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-3 h-3" />
            Volver al marketplace
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 p-4"
              style={{ boxShadow: "0 20px 40px -8px rgba(10,24,58,0.5)" }}
            >
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={`${brand.name} logo`} className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-4xl font-black text-[#0A183A]">{brand.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
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
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.05] tracking-tight">{brand.name}</h1>
              {brand.tagline && (
                <p className="text-sm sm:text-base text-white/90 mt-2 font-bold">{brand.tagline}</p>
              )}
              <p className="text-xs sm:text-sm text-white/70 mt-2">
                {brand.total} producto{brand.total !== 1 ? "s" : ""} en el marketplace
                {brand.foundedYear && <> · desde {brand.foundedYear}</>}
                {brand.parentCompany && <> · {brand.parentCompany}</>}
              </p>
              {tier && (
                <div className="mt-3 flex items-center gap-2">
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
                  <span className="text-[11px] text-white/70 font-bold">{tier.sublabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-8 -mt-4 relative space-y-8">
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

        {/* Listings */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-1"
                style={{ color: PRIMARY }}
              >
                Catálogo
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-[#0A183A]">Llantas {brand.name} disponibles</h2>
            </div>
            {brand.total > brand.listings.length && (
              <Link
                href={`/marketplace?q=${encodeURIComponent(brand.name)}`}
                className="text-xs font-black hover:underline flex items-center gap-1 transition-colors"
                style={{ color: PRIMARY }}
              >
                Ver las {brand.total} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          {brand.listings.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center" style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}>
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-black text-[#0A183A]">Sin productos en este momento</p>
              <p className="text-xs text-gray-500 mt-1">Pronto publicaremos llantas {brand.name} en el marketplace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {brand.listings.map((l) => {
                const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
                const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                const price = hasPromo ? l.precioPromo! : l.precioCop;
                return (
                  <Link
                    key={l.id}
                    href={`/marketplace/product/${l.id}`}
                    className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group relative"
                    style={{ border: `1px solid ${rgba(PRIMARY, 0.1)}` }}
                  >
                    {/* Brand accent strip at the top of each card */}
                    <div
                      className="absolute top-0 left-0 right-0 h-0.5 opacity-40 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
                      aria-hidden
                    />
                    <div
                      className="aspect-square flex items-center justify-center overflow-hidden"
                      style={{
                        background: `radial-gradient(circle at 30% 20%, #ffffff, ${rgba(PRIMARY, 0.04)})`,
                      }}
                    >
                      {cover ? (
                        <img src={cover} alt={`${l.marca} ${l.modelo} ${l.dimension}`} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
                      ) : (
                        <Package className="w-10 h-10 text-gray-200" />
                      )}
                    </div>
                    <div className="p-3.5">
                      <p
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: PRIMARY }}
                      >
                        {l.marca}
                      </p>
                      <p className="text-sm font-black text-[#0A183A] leading-snug truncate mt-0.5">{l.modelo}</p>
                      <p className="text-[10px] text-gray-400">{l.dimension}</p>
                      <p className="text-base font-black text-[#0A183A] mt-1">{fmtCOP(price)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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
