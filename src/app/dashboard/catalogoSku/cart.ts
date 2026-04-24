"use client";

// -----------------------------------------------------------------------------
// Catalog cart — lets a sales rep stack multiple tires into one quote PDF.
// Persisted to localStorage so navigating between SKU detail pages keeps
// the selection. A lightweight React hook exposes the cart + mutators and
// broadcasts changes via a `storage`-like custom event so badges on
// other mounted components (e.g. the list header's count pill) stay in
// sync without polling.
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  catalogId:  string;
  marca:      string;
  modelo:     string;
  dimension:  string;
  categoria:  string | null;
  terreno:    string | null;
  ejeTirePro: string | null;
  imageUrl:   string | null;
  // Full ficha snapshot — captured at add-time so the quote PDF can
  // render any ficha-técnica field the rep toggles on without having
  // to round-trip to the backend at generate time. Everything is
  // optional; missing fields simply don't render.
  indiceCarga?:     string | null;
  indiceVelocidad?: string | null;
  rtdMm?:           number | null;
  psiRecomendado?:  number | null;
  pesoKg?:          number | null;
  cinturones?:      string | null;
  pr?:              string | null;
  reencauchable?:   boolean | null;
  tipoBanda?:       string | null;
  construccion?:    string | null;
  segmento?:        string | null;
  tipo?:            string | null;
  // Per-line editable values — seed with catalog defaults, user tunes
  // on the quote page.
  quantity:     number;
  unitPriceCop: number | null;
};

const STORAGE_KEY = "catalogoSku:cart";
const CHANGE_EVENT = "catalogoSku:cart-change";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Broadcast so every mounted hook re-reads. CustomEvent avoids the
  // `storage` event restriction where same-tab writes don't fire.
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function useCatalogCart() {
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    const onChange = () => setItems(readCart());
    window.addEventListener(CHANGE_EVENT, onChange);
    // Also listen to cross-tab updates.
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) onChange();
    });
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  const add = useCallback((item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    const current = readCart();
    const existing = current.findIndex((c) => c.catalogId === item.catalogId);
    if (existing >= 0) {
      // Already in the cart — bump the quantity instead of duplicating.
      current[existing] = {
        ...current[existing],
        quantity: current[existing].quantity + (item.quantity ?? 1),
      };
    } else {
      current.push({ ...item, quantity: item.quantity ?? 1 });
    }
    writeCart(current);
  }, []);

  const remove = useCallback((catalogId: string) => {
    writeCart(readCart().filter((c) => c.catalogId !== catalogId));
  }, []);

  const update = useCallback((catalogId: string, patch: Partial<CartItem>) => {
    writeCart(readCart().map((c) =>
      c.catalogId === catalogId ? { ...c, ...patch } : c
    ));
  }, []);

  const clear = useCallback(() => writeCart([]), []);

  const has = useCallback((catalogId: string) =>
    items.some((c) => c.catalogId === catalogId),
  [items]);

  return { items, add, remove, update, clear, has, count: items.length };
}
