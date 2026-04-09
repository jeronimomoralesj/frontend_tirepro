import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Building2, Globe, Factory, Package, ArrowRight } from "lucide-react";
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
  plants?: Array<{ city?: string; country?: string }> | null;
  total: number;
  listings: Array<{
    id: string; marca: string; modelo: string; dimension: string;
    tipo: string; precioCop: number; precioPromo: number | null;
    promoHasta: string | null; imageUrls: string[] | null; coverIndex: number;
    distributor?: { id: string; name: string };
  }>;
}

async function fetchBrand(slug: string): Promise<BrandPageData | null> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/brands/${slug}`, { next: { revalidate: 1800 } });
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
  return {
    title,
    description: desc,
    alternates: { canonical: `https://tirepro.com.co/marketplace/brand/${slug}` },
    openGraph: {
      title,
      description: desc,
      url: `https://tirepro.com.co/marketplace/brand/${slug}`,
      type: "website",
      locale: "es_CO",
      images: brand.logoUrl ? [{ url: brand.logoUrl, alt: `${brand.name} logo` }] : undefined,
    },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) notFound();

  const facts: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = [];
  if (brand.foundedYear)   facts.push({ icon: Calendar,  label: "Fundada en",     value: String(brand.foundedYear) });
  if (brand.country)       facts.push({ icon: MapPin,    label: "País de origen", value: brand.country });
  if (brand.headquarters)  facts.push({ icon: Building2, label: "Sede",           value: brand.headquarters });
  if (brand.parentCompany) facts.push({ icon: Factory,   label: "Empresa matriz", value: brand.parentCompany });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: brand.name,
    description: brand.description,
    logo: brand.logoUrl,
    url: `https://tirepro.com.co/marketplace/brand/${brand.slug}`,
    ...(brand.website && { sameAs: [brand.website] }),
    ...(brand.foundedYear && { foundingDate: String(brand.foundedYear) }),
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)" }}>
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
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 p-3"
              style={{ boxShadow: "0 12px 32px -8px rgba(10,24,58,0.4)" }}
            >
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={`${brand.name} logo`} className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-3xl font-black text-[#0A183A]">{brand.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white bg-white/15 backdrop-blur-sm border border-white/20 uppercase tracking-widest mb-2">
                Marca verificada
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.05] tracking-tight">{brand.name}</h1>
              <p className="text-xs sm:text-sm text-white/70 mt-2">
                {brand.total} producto{brand.total !== 1 ? "s" : ""} en el marketplace
                {brand.country && <> · {brand.country}</>}
                {brand.foundedYear && <> · desde {brand.foundedYear}</>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-8 -mt-4 relative space-y-8">
        {/* Facts grid */}
        {facts.length > 0 && (
          <section className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-3">Sobre la marca</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl p-3" style={{
                  background: "linear-gradient(135deg,rgba(30,118,182,0.06),rgba(52,140,203,0.04))",
                  border: "1px solid rgba(30,118,182,0.12)",
                }}>
                  <Icon className="w-4 h-4 text-[#1E76B6] mb-1.5" />
                  <p className="text-[9px] font-black text-[#1E76B6] uppercase tracking-widest">{label}</p>
                  <p className="text-xs font-black text-[#0A183A] mt-0.5 leading-tight">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Description */}
        {brand.description && (
          <section className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}>
            <h2 className="text-lg font-black text-[#0A183A] mb-3">Historia de {brand.name}</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{brand.description}</p>
            {brand.website && (
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-black text-[#1E76B6] hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                Sitio oficial
              </a>
            )}
          </section>
        )}

        {/* Plants */}
        {Array.isArray(brand.plants) && brand.plants.length > 0 && (
          <section className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}>
            <h2 className="text-lg font-black text-[#0A183A] mb-3">Plantas de producción</h2>
            <div className="flex flex-wrap gap-2">
              {brand.plants.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#1E76B6]/10 text-[#1E76B6]">
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
              <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Catálogo</p>
              <h2 className="text-xl sm:text-2xl font-black text-[#0A183A]">Llantas {brand.name} disponibles</h2>
            </div>
            {brand.total > brand.listings.length && (
              <Link
                href={`/marketplace?q=${encodeURIComponent(brand.name)}`}
                className="text-xs font-black text-[#1E76B6] hover:underline flex items-center gap-1"
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
                    className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group border border-gray-100"
                  >
                    <div className="aspect-square flex items-center justify-center overflow-hidden" style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}>
                      {cover ? (
                        <img src={cover} alt={`${l.marca} ${l.modelo} ${l.dimension}`} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
                      ) : (
                        <Package className="w-10 h-10 text-gray-200" />
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="text-[10px] text-[#1E76B6] font-black uppercase tracking-widest">{l.marca}</p>
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
