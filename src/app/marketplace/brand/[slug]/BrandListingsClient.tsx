"use client";

// Client-side filter + upgraded product grid for the brand page.
// The brand page itself stays a server component (good for SEO + initial
// HTML), and this component owns the interactive filter state.
//
// Filter axes:
//   - Use case (auto/camioneta · camión/tractomula · bus · reencauche)
//   - Tipo (nueva · reencauche · todas) — only renders when the brand
//     has both
//   - Dimension search (free-text contains)
//
// All three combine. URL stays the same — filtering is in-memory only,
// since the catalog block typically tops out around 30-50 products and
// pagination already lives at /marketplace?q=brand for the long tail.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Package, Recycle, Search, ShoppingCart, Tag, X } from "lucide-react";

export interface BrandListing {
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
  distributor?: { id: string; name: string };
}

interface Props {
  brandName: string;
  listings: BrandListing[];
  primary: string;
  accent: string;
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

// Hex → rgba with alpha. Lives in the client because functions can't
// cross the RSC boundary — the server page passes only color strings,
// and we recompute alpha tints here. Mirrors the page's helper exactly.
function toRgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(m)) return `rgba(30,118,182,${a})`;
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

// Use-case chips. Each maps to a set of rim diameters extracted from the
// dimension string. Reencauche is special — it filters by tipo, not rim.
type UseCase = "all" | "auto" | "truck" | "bus" | "retread";
const USE_CASES: Array<{ key: UseCase; label: string; rims?: number[]; tipo?: string }> = [
  { key: "all",     label: "Todas" },
  { key: "auto",    label: "Auto y camioneta", rims: [13, 14, 15, 16, 17, 18, 19, 20, 21] },
  { key: "truck",   label: "Camión y tractomula", rims: [17.5, 19.5, 22.5, 24.5] },
  { key: "bus",     label: "Bus", rims: [17.5, 19.5, 22.5] },
  { key: "retread", label: "Reencauche", tipo: "reencauche" },
];

function rimOf(dim: string): number | null {
  const m = dim.toUpperCase().match(/R\s*(\d{2}(?:\.\d)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

export default function BrandListingsClient({
  brandName, listings, primary, accent,
}: Props) {
  const [useCase, setUseCase] = useState<UseCase>("all");
  const [tipo, setTipo] = useState<"all" | "nueva" | "reencauche">("all");
  const [size, setSize] = useState("");

  // Derived: does this brand have both nueva + reencauche? Drives whether
  // the tipo filter renders.
  const tipoMix = useMemo(() => {
    let n = 0, r = 0;
    for (const l of listings) {
      const t = (l.tipo || "").toLowerCase();
      if (t === "nueva") n++;
      else if (t === "reencauche") r++;
    }
    return { hasNueva: n > 0, hasRetread: r > 0 };
  }, [listings]);
  const showTipoFilter = tipoMix.hasNueva && tipoMix.hasRetread;

  // Filtered listings.
  const filtered = useMemo(() => {
    const sizeQ = size.trim().toUpperCase().replace(/\s+/g, "");
    return listings.filter((l) => {
      // Tipo filter
      if (tipo !== "all" && (l.tipo || "").toLowerCase() !== tipo) return false;

      // Use-case filter
      if (useCase !== "all") {
        const cfg = USE_CASES.find((c) => c.key === useCase);
        if (cfg?.tipo && (l.tipo || "").toLowerCase() !== cfg.tipo) return false;
        if (cfg?.rims) {
          const r = rimOf(l.dimension);
          if (r == null || !cfg.rims.includes(r)) return false;
        }
      }

      // Size search — fuzzy contains, normalized
      if (sizeQ) {
        const dimNorm = (l.dimension || "").toUpperCase().replace(/\s+/g, "");
        if (!dimNorm.includes(sizeQ)) return false;
      }

      return true;
    });
  }, [listings, useCase, tipo, size]);

  const empty = filtered.length === 0;
  const showActiveFilters = useCase !== "all" || tipo !== "all" || size.trim().length > 0;

  function clearAll() {
    setUseCase("all");
    setTipo("all");
    setSize("");
  }

  return (
    <section id="catalogo" aria-labelledby="brand-catalog-heading" className="scroll-mt-24">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: primary }}>
            Catálogo
          </p>
          <h2 id="brand-catalog-heading" className="text-xl sm:text-2xl font-black text-[#0A183A]">
            Llantas {brandName} disponibles
          </h2>
        </div>
        <p className="text-xs text-gray-500 hidden sm:block">
          {filtered.length} de {listings.length} producto{listings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filter bar */}
      <div
        className="bg-white rounded-2xl p-3 sm:p-4 mb-4 sticky top-2 z-10"
        style={{ boxShadow: "0 6px 20px -10px rgba(10,24,58,0.18)", border: `1px solid ${toRgba(primary, 0.12)}` }}
      >
        {/* Use case chips */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {USE_CASES.map((c) => {
            // Hide the retread chip when the brand has zero retread listings.
            if (c.key === "retread" && !tipoMix.hasRetread) return null;
            const active = useCase === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setUseCase(c.key)}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: active ? `linear-gradient(135deg, ${accent}, ${primary})` : "white",
                  color: active ? "white" : "#0A183A",
                  border: active ? "1px solid transparent" : `1px solid ${toRgba(primary, 0.18)}`,
                  boxShadow: active ? `0 4px 12px ${toRgba(primary, 0.25)}` : "none",
                }}
              >
                {c.key === "retread" && <Recycle className="w-3 h-3" />}
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Size search */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fafafa] border border-gray-100 focus-within:border-[#1E76B6]">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Buscar medida (ej. 295/80R22.5)"
              className="flex-1 bg-transparent outline-none text-[12px] text-[#0A183A] placeholder-gray-400 min-w-0"
            />
            {size && (
              <button onClick={() => setSize("")} className="p-0.5 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Tipo filter — only when both are present */}
          {showTipoFilter && (
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-white border text-[#0A183A] cursor-pointer flex-shrink-0"
              style={{ borderColor: toRgba(primary, 0.2) }}
            >
              <option value="all">Todas</option>
              <option value="nueva">Nueva</option>
              <option value="reencauche">Reencauche</option>
            </select>
          )}
        </div>

        {showActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[10px] font-bold mt-2 hover:underline"
            style={{ color: primary }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid */}
      {empty ? (
        <div
          className="bg-white rounded-3xl p-8 text-center"
          style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)" }}
        >
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-black text-[#0A183A]">
            {listings.length === 0
              ? `Sin productos ${brandName} en este momento`
              : "Sin coincidencias para tus filtros"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {listings.length === 0
              ? `Pronto publicaremos llantas ${brandName} en el marketplace.`
              : "Prueba otra categoría o limpia los filtros."}
          </p>
          {listings.length > 0 && (
            <button
              onClick={clearAll}
              className="mt-4 px-4 py-2 rounded-full text-[11px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, ${primary})` }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((l) => {
            const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
            const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
            const hasPromo =
              l.precioPromo != null &&
              l.promoHasta &&
              new Date(l.promoHasta) > new Date();
            const price = hasPromo ? l.precioPromo! : l.precioCop;
            const discount = hasPromo
              ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100)
              : 0;
            const isReencauche = (l.tipo || "").toLowerCase() === "reencauche";
            return (
              <Link
                key={l.id}
                href={`/marketplace/product/${l.id}`}
                className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group relative flex flex-col"
                style={{ border: `1px solid ${toRgba(primary, 0.1)}` }}
              >
                {/* Brand accent strip — strengthens on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-40 group-hover:opacity-100 transition-opacity z-10"
                  style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }}
                  aria-hidden
                />

                {/* Image */}
                <div
                  className="relative aspect-square flex items-center justify-center overflow-hidden"
                  style={{ background: `radial-gradient(circle at 30% 20%, #ffffff, ${toRgba(primary, 0.04)})` }}
                >
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover}
                      alt={`Llanta ${l.marca} ${l.modelo} ${l.dimension}${isReencauche ? " reencauche" : ""} — Comprar en Colombia`}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-gray-200" />
                  )}

                  {/* Discount badge */}
                  {hasPromo && discount > 0 && (
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-md flex items-center gap-1"
                      style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      -{discount}%
                    </span>
                  )}

                  {/* Reencauche chip */}
                  {isReencauche && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black text-purple-700 bg-purple-100/90 backdrop-blur-sm flex items-center gap-1">
                      <Recycle className="w-2.5 h-2.5" />
                      Reenc.
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3.5 flex flex-col flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: primary }}>
                    {l.marca}
                  </p>
                  <p className="text-sm font-black text-[#0A183A] leading-snug truncate mt-0.5">{l.modelo}</p>
                  <p className="text-[10px] text-gray-400">{l.dimension}</p>

                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-base font-black text-[#0A183A]">{fmtCOP(price)}</span>
                    {hasPromo && (
                      <span className="text-[10px] text-gray-400 line-through">{fmtCOP(l.precioCop)}</span>
                    )}
                  </div>

                  {l.distributor?.name && (
                    <p className="text-[10px] text-gray-500 mt-1 truncate">
                      Vende: <span className="font-bold text-[#0A183A]">{l.distributor.name}</span>
                    </p>
                  )}

                  {/* CTA — visible on hover, always present on mobile */}
                  <span
                    className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black text-white transition-opacity opacity-90 group-hover:opacity-100"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${primary})` }}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Ver y comprar
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
