"use client";

// Quick-add-to-cart pill used inside listing cards across every
// marketplace surface (search, brand page, distributor storefront,
// horizontal carousels). Sits inside parent <Link> wrappers so it
// must stop click propagation + preventDefault to keep the cart
// add from also triggering navigation to the product page.

import React, { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "../../lib/useCart";

export interface AddToCartListing {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  tipo: string;
  precioCop: number;
  precioPromo: number | null;
  promoHasta: string | null;
  imageUrls?: string[] | null;
  coverIndex?: number | null;
  distributor?: { id: string; name: string } | null;
  cantidadDisponible?: number | null;
}

interface Props {
  listing: AddToCartListing;
  /** Visual variant — pick what fits the surrounding card.
   *  - default : full pill ("Agregar al carrito")
   *  - compact : narrower pill ("Agregar"), good for grid cards
   *  - icon    : 36px round, icon-only — for the tightest layouts */
  variant?: "default" | "compact" | "icon";
  /** Override the gradient — used on the brand page where the
   *  page accent should win over the TirePro navy. Pass either a
   *  CSS color or a `linear-gradient(...)` string. */
  accent?: string;
  className?: string;
}

export function AddToCartButton({ listing, variant = "default", accent, className = "" }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = listing.cantidadDisponible != null && listing.cantidadDisponible <= 0;
  const noDist = !listing.distributor;
  const disabled = outOfStock || noDist;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || added) return;
    const imgs = Array.isArray(listing.imageUrls) ? listing.imageUrls : [];
    addItem({
      listingId:       listing.id,
      marca:           listing.marca,
      modelo:          listing.modelo,
      dimension:       listing.dimension,
      precioCop:       listing.precioCop,
      precioPromo:     listing.precioPromo,
      promoHasta:      listing.promoHasta,
      tipo:            listing.tipo,
      imageUrl:        imgs.length > 0 ? imgs[listing.coverIndex ?? 0] ?? imgs[0] : null,
      distributorId:   listing.distributor!.id,
      distributorName: listing.distributor!.name,
    }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const bg = disabled
    ? "#9ca3af"
    : added
      ? "linear-gradient(135deg,#16a34a,#22c55e)"
      : accent ?? "linear-gradient(135deg,#0A183A,#1E76B6)";

  const label = added
    ? "Agregado"
    : outOfStock
      ? "Agotado"
      : variant === "default"
        ? "Agregar al carrito"
        : "Agregar";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        aria-label={added ? "Agregado al carrito" : outOfStock ? "Agotado" : "Agregar al carrito"}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-white transition-all disabled:opacity-40 hover:scale-105 active:scale-95 ${className}`}
        style={{ background: bg }}
      >
        {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 ${variant === "compact" ? "px-2.5 py-1.5" : "px-3 py-1.5"} rounded-full text-[11px] font-black text-white transition-all disabled:opacity-40 hover:opacity-95 active:scale-[0.97] ${className}`}
      style={{ background: bg }}
    >
      {added ? <Check className="w-3 h-3 flex-shrink-0" /> : <ShoppingCart className="w-3 h-3 flex-shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}
