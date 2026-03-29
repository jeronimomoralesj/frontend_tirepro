"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  listingId: string;
  marca: string;
  modelo: string;
  dimension: string;
  precioCop: number;
  precioPromo: number | null;
  promoHasta: string | null;
  tipo: string;
  imageUrl: string | null;
  distributorId: string;
  distributorName: string;
  quantity: number;
}

const CART_KEY = "tirepro_cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"); } catch { return []; }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => { setItems(readCart()); }, []);

  const sync = useCallback((next: CartItem[]) => { setItems(next); writeCart(next); }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    const current = readCart();
    const idx = current.findIndex((c) => c.listingId === item.listingId);
    if (idx >= 0) {
      current[idx].quantity += qty;
    } else {
      current.push({ ...item, quantity: qty });
    }
    sync(current);
  }, [sync]);

  const updateQty = useCallback((listingId: string, qty: number) => {
    const current = readCart();
    if (qty <= 0) {
      sync(current.filter((c) => c.listingId !== listingId));
    } else {
      sync(current.map((c) => c.listingId === listingId ? { ...c, quantity: qty } : c));
    }
  }, [sync]);

  const removeItem = useCallback((listingId: string) => {
    sync(readCart().filter((c) => c.listingId !== listingId));
  }, [sync]);

  const clearCart = useCallback(() => { sync([]); }, [sync]);

  const total = items.reduce((s, c) => {
    const hasPromo = c.precioPromo != null && c.promoHasta && new Date(c.promoHasta) > new Date();
    const price = hasPromo ? c.precioPromo! : c.precioCop;
    return s + price * c.quantity;
  }, 0);

  const count = items.reduce((s, c) => s + c.quantity, 0);

  return { items, count, total, addItem, updateQty, removeItem, clearCart };
}
