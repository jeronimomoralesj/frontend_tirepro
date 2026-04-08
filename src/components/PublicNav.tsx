"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import logo from "../../public/logo_full.png";

const NAV_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Plataforma",  href: "/#producto" },
  { label: "Blog",        href: "/blog" },
];

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const isLanding = pathname === "/";

  // On the landing page: transparent at top, white on scroll.
  // On other pages: always white (content starts at top).
  const showWhiteBg = scrolled || !isLanding;

  function isActive(href: string) {
    if (href.startsWith("/#")) return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showWhiteBg
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "bg-transparent"
      }`}
      role="navigation"
      aria-label="Navegacion principal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">

          {/* ── Logo ── */}
          <Link href="/" aria-label="TirePro — Inicio" className="flex-shrink-0">
            <Image
              src={logo}
              height={36}
              width={116}
              alt="TirePro"
              priority
              className="h-9 sm:h-10 md:h-11 w-auto transition-all duration-300"
              style={{
                filter: showWhiteBg
                  ? "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)"
                  : "brightness(0) invert(1)",
              }}
            />
          </Link>

          {/* ── Desktop links ── */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3 xl:px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? "text-[#1E76B6] bg-[#1E76B6]/[0.06]"
                      : showWhiteBg
                        ? "text-gray-500 hover:text-[#0A183A] hover:bg-gray-50"
                        : "text-white/70 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            <div className="w-px h-5 mx-2 bg-gray-200/60" />

            <Link
              href="/login"
              className={`px-3 xl:px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                pathname === "/login"
                  ? "text-[#1E76B6]"
                  : showWhiteBg
                    ? "text-gray-500 hover:text-[#0A183A] hover:bg-gray-50"
                    : "text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              Ingresar
            </Link>

            <Link
              href="/signup"
              className="ml-2 inline-flex items-center gap-1.5 text-white px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}
            >
              Comenzar Gratis
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="lg:hidden p-2 -mr-1 rounded-xl transition-colors"
            style={{ color: showWhiteBg ? "#0A183A" : "#fff" }}
            onClick={() => setOpen(!open)}
            aria-label={open ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white border-t border-gray-100 shadow-xl">
          <div className="px-5 py-5 space-y-1">
            {NAV_LINKS.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                    active
                      ? "text-[#1E76B6] bg-[#1E76B6]/[0.06]"
                      : "text-gray-600 hover:text-[#0A183A] hover:bg-gray-50 active:bg-gray-100"
                  }`}
                  role="menuitem"
                >
                  {label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E76B6]" />
                  )}
                </Link>
              );
            })}

            <div className="h-px bg-gray-100 my-2" />

            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={`flex items-center px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                pathname === "/login"
                  ? "text-[#1E76B6] bg-[#1E76B6]/[0.06]"
                  : "text-gray-600 hover:text-[#0A183A] hover:bg-gray-50"
              }`}
              role="menuitem"
            >
              Ingresar
            </Link>

            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full mt-3 text-white px-6 py-3.5 rounded-2xl text-[15px] font-semibold shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}
              role="menuitem"
            >
              Comenzar Gratis
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
