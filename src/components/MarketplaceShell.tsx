"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, MapPin, User, Menu, X, Truck, Package, Store } from "lucide-react";
import { useCart } from "../lib/useCart";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOPShort = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Suggestion {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  precioCop: number;
  tipo: string;
  imageUrls: string[] | null;
  coverIndex: number;
  distributor: { id: string; name: string };
}

// =============================================================================
// NAVBAR — Amazon/MercadoLibre style
// =============================================================================

export function MarketplaceNav({ initialSearch, onSearch }: { initialSearch?: string; onSearch?: (q: string) => void }) {
  const cart = useCart();
  const router = useRouter();
  const [q, setQ] = useState(initialSearch ?? "");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auth state
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (token && user.name) { setUserName(user.name); setIsLoggedIn(true); }
    } catch { /* guest */ }
  }, []);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search suggestions
  useEffect(() => {
    if (q.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/marketplace/listings?search=${encodeURIComponent(q)}&limit=6&sortBy=price_asc`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.listings ?? []);
          setShowSuggestions(true);
        }
      } catch { /* */ }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/marketplace${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    }
  }

  function selectSuggestion(s: Suggestion) {
    setShowSuggestions(false);
    router.push(`/marketplace/product/${s.id}`);
  }

  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}>
        {/* Main row */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 sm:h-16 gap-4">
            {/* Hamburger (mobile) */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden text-[#0A183A] hover:text-[#1E76B6] transition-colors flex-shrink-0 -ml-1">
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link href="/marketplace" className="flex-shrink-0">
              <Image src="/logo_full.png" alt="TirePro" width={100} height={30} className="h-6 sm:h-7 w-auto" />
            </Link>

            {/* Desktop search */}
            <div ref={wrapperRef} className="hidden sm:block flex-1 max-w-xl relative min-w-0 mx-auto">
              <form onSubmit={handleSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Buscar llantas, marcas, distribuidores..."
                  className="w-full pl-11 pr-12 py-2.5 rounded-full text-[13px] bg-[#f5f5f7] border border-transparent focus:border-[#0A183A]/15 focus:bg-white focus:shadow-lg focus:outline-none text-[#0A183A] placeholder-gray-400 transition-all"
                />
                <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0A183A] flex items-center justify-center hover:bg-[#173D68] transition-colors">
                  <Search className="w-3.5 h-3.5 text-white" />
                </button>
              </form>

              {/* Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-black/5 overflow-hidden z-[60]">
                  {suggestions.map((s) => {
                    const imgs = Array.isArray(s.imageUrls) ? s.imageUrls : [];
                    const cover = imgs.length > 0 ? imgs[s.coverIndex ?? 0] ?? imgs[0] : null;
                    return (
                      <button key={s.id} onClick={() => selectSuggestion(s)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7] transition-colors text-left">
                        <div className="w-11 h-11 rounded-xl bg-[#f5f5f7] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {cover ? <img src={cover} alt="" className="w-full h-full object-contain p-1.5" /> : <Package className="w-4 h-4 text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#0A183A] truncate"><span className="font-semibold">{s.marca}</span> {s.modelo}</p>
                          <p className="text-[11px] text-gray-400">{s.dimension} · {s.distributor.name}</p>
                        </div>
                        <span className="text-[13px] font-semibold text-[#0A183A] flex-shrink-0">{fmtCOPShort(s.precioCop)}</span>
                      </button>
                    );
                  })}
                  <button onClick={(e) => { handleSubmit(e as any); }}
                    className="w-full px-4 py-3 text-[12px] font-semibold text-[#1E76B6] hover:bg-[#f5f5f7] transition-colors text-center" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                    Ver todos los resultados para &quot;{q}&quot;
                  </button>
                </div>
              )}
            </div>

            {/* Mobile search icon */}
            <button onClick={() => setMobileSearch(!mobileSearch)} className="sm:hidden text-[#0A183A] hover:text-[#1E76B6] p-1 flex-shrink-0 ml-auto transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Right actions */}
            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
              {isLoggedIn ? (
                <Link href="/dashboard/ajustes" className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#f5f5f7] transition-colors">
                  <User className="w-4 h-4 text-[#0A183A]" />
                  <span className="text-[12px] font-medium text-[#0A183A]">{userName?.split(" ")[0]}</span>
                </Link>
              ) : (
                <Link href="/login" className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#f5f5f7] transition-colors">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-[12px] font-medium text-[#0A183A]">Ingresar</span>
                </Link>
              )}

              <Link href="/marketplace/cart" className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#f5f5f7] transition-colors relative">
                <ShoppingCart className="w-5 h-5 text-[#0A183A]" />
                {cart.count > 0 && (
                  <span className="absolute top-0.5 left-6 w-[18px] h-[18px] rounded-full bg-[#0A183A] text-white text-[9px] font-bold flex items-center justify-center">
                    {cart.count}
                  </span>
                )}
                <span className="hidden lg:block text-[12px] font-medium text-[#0A183A]">Carrito</span>
              </Link>
            </div>

            {/* Mobile cart */}
            <Link href="/marketplace/cart" className="sm:hidden relative flex-shrink-0 p-1">
              <ShoppingCart className="w-5 h-5 text-[#0A183A]" />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0A183A] text-white text-[8px] font-bold flex items-center justify-center">
                  {cart.count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        {mobileSearch && (
          <div className="sm:hidden px-4 pb-3 border-t border-black/5" ref={wrapperRef}>
            <form onSubmit={(e) => { handleSubmit(e); setMobileSearch(false); }} className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setShowSuggestions(true); }} autoFocus
                placeholder="Buscar llantas..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm bg-[#f5f5f7] border-0 focus:outline-none text-[#0A183A] placeholder-gray-400" />
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-2 bg-white rounded-xl shadow-xl border border-black/5 overflow-hidden">
                {suggestions.slice(0, 4).map((s) => (
                  <button key={s.id} onClick={() => { selectSuggestion(s); setMobileSearch(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#f5f5f7] text-left transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#0A183A] truncate"><span className="font-semibold">{s.marca}</span> {s.modelo}</p>
                      <p className="text-[10px] text-gray-400">{s.dimension}</p>
                    </div>
                    <span className="text-[13px] font-semibold text-[#0A183A]">{fmtCOPShort(s.precioCop)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories strip */}
        <div className="border-t border-black/[0.04]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-0.5 py-2 overflow-x-auto scrollbar-hide">
              {[
                { href: "/marketplace", label: "Todo" },
                { href: "/marketplace?tipo=nueva", label: "Nuevas" },
                { href: "/marketplace?tipo=reencauche", label: "Reencauche" },
                { href: "/marketplace", label: "Distribuidores", icon: true },
                { href: "/companyregister", label: "Vender" },
              ].map((item) => (
                <Link key={item.label} href={item.href}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-medium text-gray-600 hover:text-[#0A183A] hover:bg-[#f5f5f7] transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                  {item.icon && <Truck className="w-3 h-3" />}
                  {item.label}
                </Link>
              ))}
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
              {isLoggedIn ? (
                <Link href="/dashboard/ajustes" className="flex items-center gap-2 text-white">
                  <User className="w-5 h-5" />
                  <span className="text-sm font-bold">Hola, {userName?.split(" ")[0]}</span>
                </Link>
              ) : (
                <Link href="/login" className="flex items-center gap-2 text-white">
                  <User className="w-5 h-5" />
                  <span className="text-sm font-bold">Hola, ingresa</span>
                </Link>
              )}
            </div>
            <div className="p-4 space-y-1">
              {isLoggedIn && (
                <>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Mi cuenta</p>
                  <Link href="/dashboard/resumen" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Mi Dashboard</Link>
                  <Link href="/dashboard/analista" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Mis Pedidos</Link>
                  <div className="h-px bg-gray-100 my-2" />
                </>
              )}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Categorias</p>
              <Link href="/marketplace" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Todo</Link>
              <Link href="/marketplace?tipo=nueva" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Llantas Nuevas</Link>
              <Link href="/marketplace?tipo=reencauche" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A183A] hover:bg-gray-50">Reencauche</Link>
              <div className="h-px bg-gray-100 my-2" />
              {!isLoggedIn && (
                <Link href="/login" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E76B6] hover:bg-blue-50">Ingresar</Link>
              )}
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
