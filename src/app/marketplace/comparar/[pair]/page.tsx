// =============================================================================
// /marketplace/comparar/[pair] — head-to-head brand comparison.
//
// Server-rendered side-by-side comparison page with:
//   - Hero with both brand names + tier badges
//   - At-a-glance comparison table (tier, country, year founded,
//     listing count, price range, AggregateRating, dimensions covered)
//   - Use-case recommendation matrix (auto, camioneta, camion,
//     tractomula, bus, off-road)
//   - Cross-link to each brand's dedicated landing page
//   - JSON-LD: WebPage + 2 Brand entities + ItemList + FAQPage +
//     BreadcrumbList
//
// SEO design: Targets queries like "michelin vs bridgestone",
// "comparativa goodyear pirelli", "cual es mejor continental o
// michelin" — high commercial intent, very low competition in es-CO.
// =============================================================================

import React from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Star, ShieldCheck, Globe2, Calendar, Package } from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import { BRAND_PAIRS, pairSlug, pairFromSlug, type BrandPair } from "../_lib/brand-pairs";

const SITE = "https://www.tirepro.com.co";
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface BrandData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  foundedYear: number | null;
  description: string | null;
  tier: "premium" | "mid" | "value" | null;
  total: number;
  listings: Array<{
    id: string; marca: string; modelo: string; dimension: string;
    tipo: string; precioCop: number; precioPromo: number | null;
    promoHasta: string | null;
    _count?: { reviews?: number };
    reviews?: Array<{ rating: number }>;
  }>;
}

const TIER_LABEL: Record<string, string> = {
  premium: "Premium",
  mid:     "Intermedia",
  value:   "Económica",
};

const TIER_COLOR: Record<string, string> = {
  premium: "#f59e0b",
  mid:     "#1E76B6",
  value:   "#64748b",
};

export const revalidate = 86400; // brand metadata changes rarely

export async function generateStaticParams() {
  return BRAND_PAIRS.map((p) => ({ pair: pairSlug(p) }));
}
// dynamicParams=true so reverse permutations
// (bridgestone-vs-michelin instead of michelin-vs-bridgestone) are
// caught at runtime and 308-redirected to the canonical URL.
export const dynamicParams = true;

async function fetchBrand(slug: string): Promise<BrandData | null> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/brands/${slug}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function effectivePrice(l: BrandData["listings"][number]): number {
  const promoActive = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
  return promoActive ? l.precioPromo! : l.precioCop;
}

function aggregateRating(brand: BrandData): { avg: number; count: number } | null {
  let sum = 0, samples = 0, total = 0;
  for (const l of brand.listings) {
    for (const r of (l.reviews ?? [])) { sum += r.rating; samples += 1; }
    total += l._count?.reviews ?? 0;
  }
  if (total === 0 || samples === 0) return null;
  return { avg: sum / samples, count: total };
}

function topDimensions(brand: BrandData, n: number): string[] {
  const counts = new Map<string, number>();
  for (const l of brand.listings) {
    if (!l.dimension) continue;
    counts.set(l.dimension, (counts.get(l.dimension) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([d]) => d);
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata(
  { params }: { params: Promise<{ pair: string }> },
): Promise<Metadata> {
  const { pair } = await params;
  const resolved = pairFromSlug(pair);
  if (!resolved) return { title: "Comparativa no encontrada · TirePro" };
  const p = resolved.pair;

  const title = `${p.nameA} vs ${p.nameB} — ¿Cuál llanta es mejor? | TirePro Colombia`;
  const description =
    `Comparativa ${p.nameA} vs ${p.nameB}: precios, dimensiones, calificaciones de compradores, ` +
    `aplicaciones recomendadas y catálogo disponible en Colombia. ${p.hook}`.slice(0, 300);
  const url = `${SITE}/marketplace/comparar/${pairSlug(p)}`;

  return {
    title,
    description,
    keywords: [
      `${p.nameA.toLowerCase()} vs ${p.nameB.toLowerCase()}`,
      `${p.nameB.toLowerCase()} vs ${p.nameA.toLowerCase()}`,
      `${p.nameA.toLowerCase()} o ${p.nameB.toLowerCase()}`,
      `comparativa ${p.nameA.toLowerCase()} ${p.nameB.toLowerCase()}`,
      `cual es mejor ${p.nameA.toLowerCase()} o ${p.nameB.toLowerCase()}`,
      `diferencia entre ${p.nameA.toLowerCase()} y ${p.nameB.toLowerCase()}`,
      `comparar llantas ${p.nameA.toLowerCase()} ${p.nameB.toLowerCase()}`,
      `${p.nameA.toLowerCase()} llantas`,
      `${p.nameB.toLowerCase()} llantas`,
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "TirePro",
      locale: "es_CO",
      type: "article",
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

// =============================================================================
// Page
// =============================================================================

export default async function ComparePage(
  { params }: { params: Promise<{ pair: string }> },
) {
  const { pair } = await params;
  const resolved = pairFromSlug(pair);
  if (!resolved) notFound();

  // 308-redirect reverse permutations so each pair has exactly one
  // canonical URL — important for backlink consolidation and to
  // avoid duplicate-content penalties.
  if (resolved.reversed) {
    redirect(`/marketplace/comparar/${pairSlug(resolved.pair)}`);
  }

  const p = resolved.pair;
  const [brandA, brandB] = await Promise.all([fetchBrand(p.a), fetchBrand(p.b)]);
  if (!brandA || !brandB) notFound();

  const url = `${SITE}/marketplace/comparar/${pairSlug(p)}`;

  // ── Computed comparison facts ─────────────────────────────────────────
  const pricesA = brandA.listings.map(effectivePrice).filter((x) => x > 0);
  const pricesB = brandB.listings.map(effectivePrice).filter((x) => x > 0);
  const lowA = pricesA.length > 0 ? Math.min(...pricesA) : null;
  const lowB = pricesB.length > 0 ? Math.min(...pricesB) : null;
  const ratingA = aggregateRating(brandA);
  const ratingB = aggregateRating(brandB);
  const dimsA = topDimensions(brandA, 6);
  const dimsB = topDimensions(brandB, 6);

  // ── Use-case recommendation matrix ───────────────────────────────────
  // Heuristic: tier + country signals are good proxies for typical
  // application strengths in the Colombian market. Override with
  // brand-specific knowledge where available.
  type Application = "auto" | "camioneta" | "camion" | "tractomula" | "bus" | "offroad";
  const applicationLabels: Record<Application, string> = {
    auto:       "Auto / Pasajero",
    camioneta:  "Camioneta / SUV",
    camion:     "Camión",
    tractomula: "Tractomula",
    bus:        "Bus",
    offroad:    "Off-road / 4×4",
  };

  function recommendForApplication(brand: BrandData, app: Application): "preferred" | "good" | "ok" {
    const tier = brand.tier;
    if (tier === "premium") {
      if (app === "auto" || app === "camioneta") return "preferred";
      return "good";
    }
    if (tier === "mid") {
      if (app === "tractomula" || app === "bus") return "preferred";
      return "good";
    }
    if (tier === "value") {
      if (app === "tractomula" || app === "bus") return "good";
      return "ok";
    }
    return "ok";
  }

  const applications: Application[] = ["auto", "camioneta", "camion", "tractomula", "bus", "offroad"];

  // ── FAQ generated for this specific pair ─────────────────────────────
  const faqs = [
    {
      q: `¿Cuál es mejor, ${p.nameA} o ${p.nameB}?`,
      a: `Depende de la aplicación y el presupuesto. ${brandA.tier === "premium" ? `${p.nameA} es marca premium ${brandA.country ?? ""}: máxima durabilidad y rendimiento, precio más alto.` : brandA.tier === "mid" ? `${p.nameA} es marca intermedia con buena relación calidad-precio.` : `${p.nameA} es marca económica enfocada en optimizar CPK.`} ${brandB.tier === "premium" ? `${p.nameB} es marca premium ${brandB.country ?? ""}: máxima durabilidad y rendimiento, precio más alto.` : brandB.tier === "mid" ? `${p.nameB} es marca intermedia con buena relación calidad-precio.` : `${p.nameB} es marca económica enfocada en optimizar CPK.`} Para aplicaciones de pasajero y dirección de tractomula generalmente conviene la opción premium; para tracción/remolque o flotas presupuesto-conscientes la opción intermedia o económica puede dar mejor CPK.`
    },
    {
      q: `¿Qué diferencia hay entre llantas ${p.nameA} y ${p.nameB} en Colombia?`,
      a: `Las dos marcas se distinguen por país de origen, tier comercial y catálogo disponible. ${p.nameA}${brandA.country ? ` (${brandA.country})` : ""} tiene ${brandA.total} producto${brandA.total === 1 ? "" : "s"} en TirePro Marketplace${lowA ? `, desde ${fmtCOP(lowA)}` : ""}. ${p.nameB}${brandB.country ? ` (${brandB.country})` : ""} tiene ${brandB.total} producto${brandB.total === 1 ? "" : "s"}${lowB ? ` desde ${fmtCOP(lowB)}` : ""}.`
    },
    {
      q: `¿Cuál marca tiene mejor calificación entre compradores en TirePro?`,
      a: ratingA && ratingB
        ? `${p.nameA} promedia ${ratingA.avg.toFixed(1)}/5 con ${ratingA.count} reseña${ratingA.count === 1 ? "" : "s"}; ${p.nameB} promedia ${ratingB.avg.toFixed(1)}/5 con ${ratingB.count} reseña${ratingB.count === 1 ? "" : "s"}. ${ratingA.avg > ratingB.avg ? `${p.nameA} lidera por ahora.` : ratingA.avg < ratingB.avg ? `${p.nameB} lidera por ahora.` : "Ambas marcas tienen calificación promedio similar."}`
        : ratingA
        ? `${p.nameA} promedia ${ratingA.avg.toFixed(1)}/5 con ${ratingA.count} reseña${ratingA.count === 1 ? "" : "s"}. ${p.nameB} aún no tiene suficientes reseñas para comparar.`
        : ratingB
        ? `${p.nameB} promedia ${ratingB.avg.toFixed(1)}/5 con ${ratingB.count} reseña${ratingB.count === 1 ? "" : "s"}. ${p.nameA} aún no tiene suficientes reseñas para comparar.`
        : "Aún no hay suficientes reseñas en TirePro para comparar las dos marcas. Consulta el catálogo y revisa las reseñas individuales por producto."
    },
    {
      q: `¿En qué dimensiones hay disponibilidad de cada marca?`,
      a: `Las dimensiones más comunes de ${p.nameA} en TirePro son ${dimsA.join(", ")}${dimsA.length > 0 ? "." : "(sin stock actual)"}. Para ${p.nameB}: ${dimsB.join(", ")}${dimsB.length > 0 ? "." : "(sin stock actual)"} El catálogo se actualiza diariamente con nuevos lotes de los distribuidores verificados.`
    },
    {
      q: `¿Dónde puedo comparar precios reales de ${p.nameA} y ${p.nameB}?`,
      a: `En TirePro Marketplace cada listing muestra el precio neto, IVA y precio total que cobra el distribuidor en Colombia. Consulta las páginas de marca de ${p.nameA} y ${p.nameB} para ver el catálogo completo en tiempo real, o usa el buscador del marketplace filtrando por marca + dimensión.`
    },
  ];

  // ── JSON-LD ──────────────────────────────────────────────────────────

  const brandLdA = {
    "@type": "Brand",
    "@id": `${SITE}/marketplace/brand/${brandA.slug}#brand`,
    name: brandA.name,
    url: `${SITE}/marketplace/brand/${brandA.slug}`,
    logo: brandA.logoUrl || undefined,
    ...(brandA.foundedYear && { foundingDate: String(brandA.foundedYear) }),
    ...(ratingA && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: ratingA.avg.toFixed(1),
        reviewCount: ratingA.count,
        bestRating: "5",
        worstRating: "1",
      },
    }),
  };
  const brandLdB = { ...brandLdA, "@id": `${SITE}/marketplace/brand/${brandB.slug}#brand`, name: brandB.name, url: `${SITE}/marketplace/brand/${brandB.slug}`, logo: brandB.logoUrl || undefined, ...(brandB.foundedYear && { foundingDate: String(brandB.foundedYear) }), ...(ratingB && { aggregateRating: { "@type": "AggregateRating", ratingValue: ratingB.avg.toFixed(1), reviewCount: ratingB.count, bestRating: "5", worstRating: "1" } }) };

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    name: `${p.nameA} vs ${p.nameB} — Comparativa de llantas`,
    description: p.hook,
    url,
    inLanguage: "es-CO",
    isPartOf: { "@type": "WebSite", name: "TirePro", url: SITE },
    about: [brandLdA, brandLdB],
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro",     item: SITE },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: `${SITE}/marketplace` },
      { "@type": "ListItem", position: 3, name: "Comparativas", item: `${SITE}/marketplace/comparar` },
      { "@type": "ListItem", position: 4, name: `${p.nameA} vs ${p.nameB}`, item: url },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // ── Render helper for the at-a-glance row ───────────────────────────
  function Row({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 2fr",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: "1px solid rgba(10,24,58,0.08)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0A183A", paddingRight: 16 }}>{a}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0A183A" }}>{b}</div>
      </div>
    );
  }

  return (
    <>
      <Script id="comp-webpage-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <Script id="comp-breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Script id="comp-faq-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="min-h-screen bg-[#f5f5f7]">
        <MarketplaceNav />

        {/* HERO */}
        <section
          style={{
            background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)",
            color: "#fff",
            padding: "48px 16px 56px",
          }}
        >
          <div style={{ maxWidth: 980, margin: "0 auto" }}>
            <Link href="/marketplace" style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              ← Marketplace
            </Link>
            <p style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 14, marginBottom: 6 }}>
              Comparativa de marcas
            </p>
            <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.05, margin: 0 }}>
              {p.nameA} <span style={{ opacity: 0.6, fontSize: 28, fontWeight: 700 }}>vs</span> {p.nameB}
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.92, marginTop: 12, maxWidth: 720 }}>
              {p.hook}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <Link
                href={`/marketplace/brand/${brandA.slug}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 16px", background: "rgba(255,255,255,0.15)",
                  borderRadius: 999, color: "#fff", textDecoration: "none",
                  fontWeight: 700, fontSize: 13, border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                Ver catálogo {p.nameA} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/marketplace/brand/${brandB.slug}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 16px", background: "rgba(255,255,255,0.15)",
                  borderRadius: 999, color: "#fff", textDecoration: "none",
                  fontWeight: 700, fontSize: 13, border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                Ver catálogo {p.nameB} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* BODY */}
        <section style={{ maxWidth: 980, margin: "0 auto", padding: "32px 16px 64px" }}>
          {/* At-a-glance */}
          <article style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 12px 40px -16px rgba(10,24,58,0.18)", marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0A183A", marginBottom: 4 }}>
              De un vistazo
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Datos de catálogo y reseñas reales de TirePro Marketplace, actualizados hoy.
            </p>
            <div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 2fr 2fr",
                padding: "10px 0", borderBottom: "2px solid #0A183A",
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}> </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0A183A" }}>{p.nameA}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0A183A" }}>{p.nameB}</span>
              </div>
              <Row
                label="Tier"
                a={
                  brandA.tier ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: TIER_COLOR[brandA.tier] }} />
                      {TIER_LABEL[brandA.tier]}
                    </span>
                  ) : "—"
                }
                b={
                  brandB.tier ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: TIER_COLOR[brandB.tier] }} />
                      {TIER_LABEL[brandB.tier]}
                    </span>
                  ) : "—"
                }
              />
              <Row
                label="País"
                a={brandA.country ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Globe2 className="w-3.5 h-3.5" />{brandA.country}</span> : "—"}
                b={brandB.country ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Globe2 className="w-3.5 h-3.5" />{brandB.country}</span> : "—"}
              />
              <Row
                label="Fundada"
                a={brandA.foundedYear ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Calendar className="w-3.5 h-3.5" />{brandA.foundedYear}</span> : "—"}
                b={brandB.foundedYear ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Calendar className="w-3.5 h-3.5" />{brandB.foundedYear}</span> : "—"}
              />
              <Row
                label="Productos en stock"
                a={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Package className="w-3.5 h-3.5" />{brandA.total}</span>}
                b={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Package className="w-3.5 h-3.5" />{brandB.total}</span>}
              />
              <Row
                label="Precio desde"
                a={lowA ? fmtCOP(lowA) : "—"}
                b={lowB ? fmtCOP(lowB) : "—"}
              />
              <Row
                label="Calificación"
                a={
                  ratingA ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Star className="w-3.5 h-3.5" style={{ color: "#F59E0B", fill: "#F59E0B" }} />
                      {ratingA.avg.toFixed(1)} <span style={{ color: "#64748b", fontWeight: 400 }}>({ratingA.count})</span>
                    </span>
                  ) : "Sin reseñas"
                }
                b={
                  ratingB ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Star className="w-3.5 h-3.5" style={{ color: "#F59E0B", fill: "#F59E0B" }} />
                      {ratingB.avg.toFixed(1)} <span style={{ color: "#64748b", fontWeight: 400 }}>({ratingB.count})</span>
                    </span>
                  ) : "Sin reseñas"
                }
              />
              <Row
                label="Dimensiones top"
                a={dimsA.length > 0 ? dimsA.slice(0, 4).join(" · ") : "—"}
                b={dimsB.length > 0 ? dimsB.slice(0, 4).join(" · ") : "—"}
              />
            </div>
          </article>

          {/* Use-case matrix */}
          <article style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 12px 40px -16px rgba(10,24,58,0.18)", marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0A183A", marginBottom: 4 }}>
              Recomendación por aplicación
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Generada a partir del tier comercial y catálogo disponible. Para flotas, valida con TirePro la disponibilidad y CPK histórico.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #0A183A", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Aplicación</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #0A183A", color: "#0A183A" }}>{p.nameA}</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #0A183A", color: "#0A183A" }}>{p.nameB}</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const recA = recommendForApplication(brandA, app);
                    const recB = recommendForApplication(brandB, app);
                    const cell = (rec: typeof recA) => {
                      const map = { preferred: { txt: "Recomendado", bg: "#dcfce7", color: "#15803d" }, good: { txt: "Buena opción", bg: "#dbeafe", color: "#1e40af" }, ok: { txt: "Aceptable", bg: "#f1f5f9", color: "#475569" } };
                      const m = map[rec];
                      return <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: m.bg, color: m.color, fontSize: 12, fontWeight: 700 }}>{m.txt}</span>;
                    };
                    return (
                      <tr key={app}>
                        <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(10,24,58,0.06)", fontWeight: 600, color: "#0A183A" }}>{applicationLabels[app]}</td>
                        <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(10,24,58,0.06)" }}>{cell(recA)}</td>
                        <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(10,24,58,0.06)" }}>{cell(recB)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          {/* Brand summaries */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[brandA, brandB].map((brand) => (
              <article
                key={brand.slug}
                style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", boxShadow: "0 12px 40px -16px rgba(10,24,58,0.18)" }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 6 }}>
                  Sobre {brand.name}
                </h3>
                <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6 }}>
                  {brand.description ?? `${brand.name} es una marca de llantas disponible en TirePro Marketplace Colombia.`}
                </p>
                <div style={{ marginTop: 14 }}>
                  <Link
                    href={`/marketplace/brand/${brand.slug}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", background: "#0A183A", color: "#fff",
                      borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 13,
                    }}
                  >
                    Ver llantas {brand.name} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* FAQ — visible accordion + structured data */}
          <article style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", boxShadow: "0 12px 40px -16px rgba(10,24,58,0.18)", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A183A", marginBottom: 12 }}>
              Preguntas frecuentes
            </h2>
            {faqs.map((f, i) => (
              <details
                key={i}
                style={{ background: "#F8FAFC", border: "1px solid rgba(10,24,58,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 700, color: "#0A183A", fontSize: 14 }}>
                  {f.q}
                </summary>
                <p style={{ color: "#334155", lineHeight: 1.6, marginTop: 8, marginBottom: 0, fontSize: 14 }}>
                  {f.a}
                </p>
              </details>
            ))}
          </article>

          {/* Other comparisons — internal-link mesh */}
          <article style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", boxShadow: "0 12px 40px -16px rgba(10,24,58,0.18)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0A183A", marginBottom: 10 }}>
              Otras comparativas populares
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6, listStyle: "none", padding: 0, margin: 0 }}>
              {BRAND_PAIRS.filter((q) => q.a !== p.a || q.b !== p.b).slice(0, 12).map((q) => (
                <li key={pairSlug(q)}>
                  <Link
                    href={`/marketplace/comparar/${pairSlug(q)}`}
                    style={{
                      display: "block", padding: "8px 12px", background: "#F8FAFC",
                      border: "1px solid rgba(10,24,58,0.08)", borderRadius: 10,
                      color: "#0A183A", textDecoration: "none", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {q.nameA} <span style={{ color: "#64748b" }}>vs</span> {q.nameB}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <MarketplaceFooter />
      </div>
    </>
  );
}
