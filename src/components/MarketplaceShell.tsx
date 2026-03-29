"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, MapPin, User, Menu, X, Truck } from "lucide-react";
import { useCart } from "../lib/useCart";

// =============================================================================
// NAVBAR — Amazon/MercadoLibre style
// =============================================================================

export function MarketplaceNav({ initialSearch, onSearch }: { initialSearch?: string; onSearch?: (q: string) => void }) {
  const cart = useCart();
  const router = useRouter();
  const [q, setQ] = useState(initialSearch ?? "");
  const [mobileMenu, setMobileMenu] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/marketplace${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    }
  }

  return (
    <>
      {/* Main nav bar */}
      <header className="sticky top-0 z-50" style={{ background: "#0A183A" }}>
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-2.5">
            {/* Mobile menu */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden text-white/70 hover:text-white p-1">
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link href="/marketplace" className="flex-shrink-0 mr-1">
              <Image src="/logo_full.png" alt="TirePro" width={90} height={27} className="h-6 sm:h-7 w-auto brightness-0 invert" />
            </Link>

            {/* Search bar */}
            <form onSubmit={handleSubmit} className="flex-1 flex max-w-2xl">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar llantas, marcas, distribuidores..."
                className="flex-1 px-4 py-2 sm:py-2.5 rounded-l-full text-sm bg-white border-0 focus:outline-none text-[#0A183A] placeholder-gray-400"
              />
              <button type="submit"
                className="px-4 sm:px-5 rounded-r-full flex items-center justify-center transition-colors"
                style={{ background: "#1E76B6" }}>
                <Search className="w-4 h-4 text-white" />
              </button>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Account */}
              <Link href="/login" className="hidden sm:flex flex-col items-start px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-[9px] text-white/50 leading-none">Hola, ingresa</span>
                <span className="text-[11px] font-bold text-white leading-tight">Cuenta</span>
              </Link>

              {/* Orders */}
              <Link href="/marketplace" className="hidden md:flex flex-col items-start px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-[9px] text-white/50 leading-none">Tus</span>
                <span className="text-[11px] font-bold text-white leading-tight">Pedidos</span>
              </Link>

              {/* Cart */}
              <Link href="/marketplace/cart" className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors relative">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-white" />
                  {cart.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 rounded-full text-[9px] font-black flex items-center justify-center"
                      style={{ background: "#f97316", color: "white", minWidth: 18, height: 18 }}>
                      {cart.count}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-[11px] font-bold text-white">Carrito</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar — categories */}
        <div style={{ background: "#173D68" }}>
          <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-hide text-[11px]">
              <Link href="/marketplace" className="px-3 py-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap font-medium">
                Todo
              </Link>
              <Link href="/marketplace?tipo=nueva" className="px-3 py-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap font-medium">
                Llantas Nuevas
              </Link>
              <Link href="/marketplace?tipo=reencauche" className="px-3 py-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap font-medium">
                Reencauche
              </Link>
              <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
              <Link href="/marketplace" className="px-3 py-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap font-medium flex items-center gap-1">
                <Truck className="w-3 h-3" /> Distribuidores
              </Link>
              <Link href="/companyregister" className="px-3 py-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap font-medium">
                Vender en TirePro
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenu(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto">
            <div className="p-5" style={{ background: "#0A183A" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-bold text-sm">Menu</span>
                <button onClick={() => setMobileMenu(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <Link href="/login" className="flex items-center gap-2 text-white">
                <User className="w-5 h-5" />
                <span className="text-sm font-bold">Hola, ingresa a tu cuenta</span>
              </Link>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Categorias</p>
              <Link href="/marketplace" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Todo</Link>
              <Link href="/marketplace?tipo=nueva" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Llantas Nuevas</Link>
              <Link href="/marketplace?tipo=reencauche" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Reencauche</Link>
              <div className="h-px bg-gray-100 my-2" />
              <Link href="/companyregister" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E76B6] hover:bg-blue-50">Vender en TirePro</Link>
              <Link href="/" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50">Ir a tirepro.com.co</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// FOOTER
// =============================================================================

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

// =============================================================================
// FLOATING CART BUTTON
// =============================================================================

export function FloatingCartButton() {
  const cart = useCart();
  if (cart.count === 0) return null;

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  return (
    <Link href="/marketplace/cart"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
      style={{ background: "#f97316", boxShadow: "0 8px 32px rgba(249,115,22,0.35)" }}>
      <div className="relative">
        <ShoppingCart className="w-5 h-5 text-white" />
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-[#f97316] text-[9px] font-black flex items-center justify-center">
          {cart.count}
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-xs font-bold text-white leading-none">Ver carrito</p>
        <p className="text-[10px] text-white/70 mt-0.5">{fmtCOP(cart.total)}</p>
      </div>
    </Link>
  );
}
