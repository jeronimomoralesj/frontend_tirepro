"use client";

// Listing-card CTA used across every marketplace surface (search, brand
// page, distributor storefront, horizontal carousels). Sits inside parent
// <Link> wrappers — handler stops click propagation + preventDefault so
// the cart add doesn't also trigger navigation to the product page.
//
// Two behaviours, picked by variant:
//
//   default | compact  →  "Comprar ya"  (add to cart + route to /cart)
//                         The buyer-facing express checkout. Single click
//                         takes them straight to the cart page where the
//                         Bold CTA lives. Matches the "less buttons, buy
//                         in no time" UX direction.
//
//   icon                →  Quick-add  (just addItem, no nav)
//                         Power users who want to add several items
//                         before reviewing the cart. The 36px round
//                         control fits in tight grids and shows a check
//                         flash on success.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Zap } from "lucide-react";
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
   *  - default : full pill, "Comprar ya" + adds & routes to /cart
   *  - compact : narrower pill, same behaviour
   *  - icon    : 36px round, quick-add only (no navigation) */
  variant?: "default" | "compact" | "icon";
  /** Override the gradient — used on the brand page where the
   *  page accent should win over the TirePro navy. Pass either a
   *  CSS color or a `linear-gradient(...)` string. */
  accent?: string;
  className?: string;
}

export function AddToCartButton({ listing, variant = "default", accent, className = "" }: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = listing.cantidadDisponible != null && listing.cantidadDisponible <= 0;
  const noDist = !listing.distributor;
  const disabled = outOfStock || noDist;
  const isIcon = variant === "icon";

  function handleClick(e: React.MouseEvent) {
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
    if (isIcon) {
      // Quick-add path: flash the check, no navigation, so the buyer
      // can keep scrolling and add more before opening the cart.
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
      return;
    }
    // Comprar ya path: send them straight to the cart page where the
    // Bold checkout button lives. The cart hook persists to
    // localStorage synchronously, so the cart page sees the new item
    // on first render even with this immediate navigation.
    router.push("/marketplace/cart");
  }

  const bg = disabled
    ? "#9ca3af"
    : added
      ? "linear-gradient(135deg,#16a34a,#22c55e)"
      : accent ?? "linear-gradient(135deg,#0A183A,#1E76B6)";

  if (isIcon) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={added ? "Agregado al carrito" : outOfStock ? "Agotado" : "Agregar al carrito"}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-white transition-all disabled:opacity-40 hover:scale-105 active:scale-95 ${className}`}
        style={{ background: bg }}
      >
        {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
      </button>
    );
  }

  const label = outOfStock ? "Agotado" : "Comprar ya";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 ${variant === "compact" ? "px-2.5 py-1.5" : "px-3 py-1.5"} rounded-full text-[11px] font-black text-white transition-all disabled:opacity-40 hover:opacity-95 active:scale-[0.97] ${className}`}
      style={{ background: bg }}
    >
      {/* Lightning bolt icon signals "fast / instant" — pairs with the
       *  "Comprar ya" copy to telegraph that this is the express path
       *  rather than a regular add-to-cart. */}
      <Zap className="w-3 h-3 flex-shrink-0" fill="currentColor" />
      <span className="truncate">{label}</span>
    </button>
  );
}
