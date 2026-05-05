import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import {
  ArrowLeft, Package, Truck, ShieldCheck, Search, ChevronRight, Recycle,
  X,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { productHref } from "../product/_lib/url";

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
  retailSource?: { isActive: boolean } | null;
}

// Server-rendered with 30-min ISR. The whole point of this route is
// that crawlers and AI bots see the actual filtered product list in
// the HTML payload — the existing /marketplace?q= path filters
// client-side and so AI engines that don't execute JS see only the
// generic shell. /marketplace/buscar fixes that gap for free-text
// long-tail queries that don't fit the dimension / city / category
// / brand hubs.
export const revalidate = 1800;
export const dynamic = "force-dynamic"; // params drive the response

interface SearchParams {
  q?: string;
  marca?: string;
  tipo?: string;
  dimension?: string;
  ciudad?: string;
  sortBy?: string;
}

async function fetchSearch(p: SearchParams): Promise<{ listings: Listing[]; total: number }> {
  try {
    const params = new URLSearchParams({ limit: "24" });
    if (p.q?.trim())         params.set("search", p.q.trim());
    if (p.marca?.trim())     params.set("marca", p.marca.trim());
    if (p.tipo?.trim())      params.set("tipo", p.tipo.trim());
    if (p.dimension?.trim()) params.set("dimension", p.dimension.trim());
    if (p.ciudad?.trim())    params.set("ciudad", p.ciudad.trim());
    params.set("sortBy", p.sortBy ?? "relevance");
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

function buildCanonical(p: SearchParams): string {
  // Canonical includes only the meaningful filters in a stable order
  // — we drop sortBy because it's UX-only and produces thin duplicates.
  const u = new URLSearchParams();
  if (p.q?.trim())         u.set("q", p.q.trim());
  if (p.marca?.trim())     u.set("marca", p.marca.trim());
  if (p.tipo?.trim())      u.set("tipo", p.tipo.trim());
  if (p.dimension?.trim()) u.set("dimension", p.dimension.trim());
  if (p.ciudad?.trim())    u.set("ciudad", p.ciudad.trim());
  const qs = u.toString();
  return qs ? `${SITE}/marketplace/buscar?${qs}` : `${SITE}/marketplace/buscar`;
}

function describeQuery(p: SearchParams): { title: string; h1: string } {
  const parts: string[] = [];
  if (p.q?.trim())         parts.push(`"${p.q.trim()}"`);
  if (p.marca?.trim())     parts.push(p.marca.trim());
  if (p.tipo?.trim())      parts.push(p.tipo.trim() === "reencauche" ? "reencauche" : "nuevas");
  if (p.dimension?.trim()) parts.push(p.dimension.trim());
  if (p.ciudad?.trim())    parts.push(`en ${p.ciudad.trim()}`);
  if (parts.length === 0) {
    return { title: "Buscar llantas en Colombia | TirePro Marketplace", h1: "Buscar llantas" };
  }
  const tail = parts.join(" ");
  return {
    title: `Llantas ${tail} en Colombia | TirePro Marketplace`,
    h1: `Llantas ${tail}`,
  };
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<SearchParams> },
): Promise<Metadata> {
  const sp = await searchParams;
  const { title, h1 } = describeQuery(sp);
  const canonical = buildCanonical(sp);

  // For empty searches we noindex (it's a generic shell, no value to
  // crawl). For populated queries we index aggressively.
  const isEmpty = !(sp.q?.trim() || sp.marca?.trim() || sp.tipo?.trim() || sp.dimension?.trim() || sp.ciudad?.trim());

  return {
    title,
    description: `Encuentra ${h1.toLowerCase()} en TirePro Marketplace. Compara precios de distribuidores verificados, marcas premium y reencauche con envío en toda Colombia.`,
    alternates: { canonical },
    openGraph: {
      title, url: canonical,
      siteName: "TirePro", locale: "es_CO", type: "website",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title },
    robots: isEmpty
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function BuscarPage(
  { searchParams }: { searchParams: Promise<SearchParams> },
) {
  const sp = await searchParams;
  const { listings, total } = await fetchSearch(sp);
  const { h1 } = describeQuery(sp);
  const canonical = buildCanonical(sp);

  // Server-side May-week check (1st–7th of May, server local time).
  // The page is ISR'd at revalidate=1800, so the May-week ✦ flickers
  // on within ~30 min of midnight on May 1st and back off within
  // ~30 min after May 7th. No SEO impact: the date check changes
  // nothing in metadata, structured data, or visible copy — just
  // adds a single `aria-hidden` decorative span on discount badges.
  const _now = new Date();
  const mayWeek = _now.getMonth() === 4 && _now.getDate() >= 1 && _now.getDate() <= 7;

  const prices = listings.map(effectivePrice).filter((p) => p > 0);
  const lowPrice  = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;

  // Active filter chips — each renders a server-rendered Link to a
  // version of the URL with that filter stripped, so a crawler can
  // follow the breadcrumb of filter combinations without JS.
  const stripParam = (key: keyof SearchParams) => {
    const next: SearchParams = { ...sp };
    delete next[key];
    return buildCanonical(next).replace(SITE, "");
  };

  const activeChips: Array<{ label: string; href: string }> = [];
  if (sp.q?.trim())         activeChips.push({ label: `"${sp.q.trim()}"`, href: stripParam("q") });
  if (sp.marca?.trim())     activeChips.push({ label: sp.marca.trim(), href: stripParam("marca") });
  if (sp.tipo?.trim())      activeChips.push({ label: sp.tipo.trim() === "reencauche" ? "Reencauche" : "Nuevas", href: stripParam("tipo") });
  if (sp.dimension?.trim()) activeChips.push({ label: sp.dimension.trim(), href: stripParam("dimension") });
  if (sp.ciudad?.trim())    activeChips.push({ label: sp.ciudad.trim(), href: stripParam("ciudad") });

  const collectionLd: any = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: h1,
    url: canonical,
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
      { "@type": "ListItem", position: 3, name: "Buscar",      item: canonical },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Script id="search-collection-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Script id="search-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <MarketplaceNav />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0A183A]/70 hover:text-[#0A183A] transition-colors">
          <ArrowLeft className="w-3 h-3" />
          Volver al marketplace
        </Link>
      </div>

      {/* Header */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Resultados</p>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] leading-tight">{h1}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {total} producto{total === 1 ? "" : "s"}
              {lowPrice && <> · desde <strong className="text-[#0A183A]">{fmtCOP(lowPrice)}</strong></>}
            </p>
          </div>
        </div>

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Filtros:</span>
            {activeChips.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#1E76B6] hover:bg-[#0A183A] transition-colors"
                aria-label={`Quitar filtro ${c.label}`}
              >
                {c.label}
                <X className="w-2.5 h-2.5" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Productos */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: "0 6px 16px -10px rgba(10,24,58,0.12)" }}>
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#0A183A]">Sin resultados</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Probamos con otros términos o explora el marketplace completo. El catálogo se actualiza diariamente.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
            >
              <Search className="w-4 h-4" />
              Ir al marketplace
            </Link>
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
                <Link key={l.id} href={productHref(l)}
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
                        {mayWeek && <span aria-hidden className="text-cyan-100 mr-0.5">✦</span>}
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
                    <p className="text-[9px] text-gray-400 leading-none mt-0.5">
                      + IVA · {l.retailSource?.isActive ? "Envío y recogida" : "Envío"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: ShieldCheck, title: "Distribuidores verificados", sub: "Validados por TirePro" },
            { icon: Truck,       title: "Envío nacional",             sub: "Cobertura en toda Colombia" },
            { icon: Search,      title: "Búsqueda inteligente",       sub: "Por marca, dimensión, ciudad o placa" },
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
