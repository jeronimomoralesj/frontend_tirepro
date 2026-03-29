"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../lib/useCart";

export function MarketplaceNav() {
  const cart = useCart();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-4">
        <Link href="/marketplace" className="flex-shrink-0">
          <Image src="/logo_full.png" alt="TirePro" width={100} height={30} className="h-7 w-auto" />
        </Link>

        <div className="flex-1" />

        <Link href="/marketplace/cart" className="relative p-2 rounded-full hover:bg-gray-50 transition-colors">
          <ShoppingCart className="w-5 h-5 text-[#0A183A]" />
          {cart.count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 rounded-full bg-[#1E76B6] text-white text-[8px] font-black flex items-center justify-center" style={{ minWidth: 18, height: 18 }}>
              {cart.count}
            </span>
          )}
        </Link>

        <Link href="/login" className="hidden sm:block text-xs font-bold text-[#0A183A] hover:text-[#1E76B6] transition-colors">
          Ingresar
        </Link>
        <Link href="/companyregister"
          className="px-4 py-2 rounded-full text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
          Registrarse
        </Link>
      </div>
    </header>
  );
}

export function MarketplaceFooter() {
  return (
    <footer className="bg-[#0A183A] mt-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <Image src="/logo_full.png" alt="TirePro" width={90} height={27} className="h-6 w-auto brightness-0 invert mb-3" />
            <p className="text-xs text-white/40 leading-relaxed">
              La plataforma de llantas para flotas mas grande de Colombia.
              Encuentra las mejores ofertas de distribuidores verificados.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Enlaces</p>
            <div className="space-y-2">
              <Link href="/" className="block text-xs text-white/40 hover:text-white transition-colors">Inicio</Link>
              <Link href="/marketplace" className="block text-xs text-white/40 hover:text-white transition-colors">Marketplace</Link>
              <Link href="/blog" className="block text-xs text-white/40 hover:text-white transition-colors">Blog</Link>
              <Link href="/login" className="block text-xs text-white/40 hover:text-white transition-colors">Ingresar</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Distribuidores</p>
            <p className="text-xs text-white/40 leading-relaxed">
              ¿Vendes llantas? Registrate como distribuidor y publica tu catalogo.
            </p>
            <Link href="/companyregister" className="inline-block mt-3 px-4 py-2 rounded-full text-[10px] font-bold text-[#0A183A] bg-white hover:bg-gray-100 transition-colors">
              Registrar mi empresa
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] text-white/30">tirepro.com.co — Marketplace de llantas para flotas en Colombia</p>
        </div>
      </div>
    </footer>
  );
}

export function FloatingCartButton() {
  const cart = useCart();
  if (cart.count === 0) return null;

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  return (
    <Link href="/marketplace/cart"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
      style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)", boxShadow: "0 8px 32px rgba(10,24,58,0.35)" }}>
      <div className="relative">
        <ShoppingCart className="w-5 h-5 text-white" />
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-[#0A183A] text-[9px] font-black flex items-center justify-center">
          {cart.count}
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-xs font-bold text-white leading-none">Ver carrito</p>
        <p className="text-[10px] text-white/60 mt-0.5">{fmtCOP(cart.total)}</p>
      </div>
    </Link>
  );
}
