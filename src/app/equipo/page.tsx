'use client'
import React, { useState, useEffect } from 'react'
import {
  Menu,
  X,
  ChevronRight,
  ArrowRight,
  Linkedin,
} from 'lucide-react'
import Image from 'next/image'
import logo from "../../../public/logo_full.png"

const founders = [
  {
    name: "Mateo Morales",
    title: "Fundador & CEO",
    role: "Estrategia",
    desc: "Estrategia, consultor Bain Co.",
    image: "https://media.licdn.com/dms/image/v2/D4E03AQGV6aVl5fgjNw/profile-displayphoto-crop_800_800/B4EZfwpmZQHIAI-/0/1752089127058?e=1775088000&v=beta&t=rM-GIGwhDxoF2euJkHw3afiGQgb5W7kWuKIB82K0c2g",
    linkedin: "https://www.linkedin.com/in/mateomoralesj/",
    color: "#1E76B6",
  },
  {
    name: "Sebastian Garcia",
    title: "Fundador & COO",
    role: "Operaciones",
    desc: "Lidera operaciones, gerente de ventas Remax.",
    image: "https://media.licdn.com/dms/image/v2/C4E03AQGOxCi9k5VsgA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1580691869054?e=1775088000&v=beta&t=wCtMlaFlHdV_sLM5EiLWJbeWxnOSmc9NAazx6YdxprA",
    linkedin: "https://www.linkedin.com/in/sebastian-garcia-taborda-b9112b19b/",
    color: "#0A183A",
  },
  {
    name: "Jeronimo Morales",
    title: "Fundador & CTO",
    role: "Tecnología",
    desc: "Director de tecnología e infrastructura.",
    image: "https://media.licdn.com/dms/image/v2/D4E03AQFM4BmS6dGm6Q/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1709150478233?e=1775088000&v=beta&t=yJaa387LmWxoAZw4n-q2E8Do6tzxQCd3R2F41jy7k0A",
    linkedin: "https://www.linkedin.com/in/jeronimo-morales/",
    color: "#173D68",
  },
]

export default function Equipo() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-white text-gray-900 min-h-screen overflow-x-hidden w-full">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm'
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-3 min-w-0">
              <a href="/" aria-label="TirePro - Inicio">
                <Image
                  src={logo}
                  height={50}
                  width={120}
                  alt="TirePro - Software de Gestión de Llantas con IA"
                  className="h-10 sm:h-12 md:h-14 w-auto"
                  style={{ filter: 'brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)' }}
                />
              </a>
            </div>
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <a href="#producto" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Producto</a>
              <a href="#beneficios" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Beneficios</a>
              <a href="#planes" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Planes</a>
              <a href="#preguntas" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Preguntas</a>
              <a href="/blog" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Blog</a>
              <a href="/login" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Ingresar</a>
              <a href="/companyregister">
                <button
                  className="text-white px-4 xl:px-6 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#1E76B6' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E76B6')}
                >
                  Comenzar Gratis
                </button>
              </a>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg transition-colors flex-shrink-0"
              style={{ color: '#0A183A' }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú de navegación"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg" role="menu">
            <div className="px-4 sm:px-6 py-4 space-y-3">
              <a href="#producto" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Producto</a>
              <a href="#beneficios" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Beneficios</a>
              <a href="#planes" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Planes</a>
              <a href="#preguntas" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Preguntas</a>
              <a href="/login" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Ingresar</a>
              <a href="/companyregister">
                <button
                  className="w-full text-white px-6 py-3 rounded-full text-sm font-semibold mt-2"
                  style={{ backgroundColor: '#1E76B6' }}
                >
                  Comenzar Gratis
                </button>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <header className="pt-32 sm:pt-36 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 w-full bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-gray-400 mb-10">
            <a href="/" className="hover:text-[#1E76B6] transition-colors">Inicio</a>
            <ChevronRight size={14} />
            <span className="text-gray-500 font-medium">Equipo</span>
          </nav>

          {/* Label chip */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-[#1E76B6] text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#1E76B6] rounded-full"></span>
            Nuestro equipo
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-[#0A183A] mb-6">
            Más de 30 años de historia llantera<br />
            <span className="text-[#1E76B6]">en nuestros hombros</span>
          </h1>
        </div>
      </header>

      {/* ── FUNDADORES ────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 w-full bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {founders.map((founder, i) => (
              <article
                key={founder.name}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {/* Photo */}
                <div className="relative aspect-[4/4] overflow-hidden bg-gray-100">
                  <Image
                    src={founder.image}
                    alt={`Foto de ${founder.name}, ${founder.title} en TirePro`}
                    fill
                    className="object-cover object-top transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {/* Role badge */}
                  <div
                    className="absolute top-4 left-4 text-white text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: founder.color }}
                  >
                    {founder.role}
                  </div>
                </div>

                {/* Content */}
                <div className="p-7 flex flex-col flex-1">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[#0A183A] mb-1 tracking-tight">
                      {founder.name}
                    </h3>
                    <p className="text-[#1E76B6] text-sm font-semibold tracking-wide uppercase mb-4">
                      {founder.title}
                    </p>
                    <p className="text-gray-500 text-base leading-relaxed">
                      {founder.desc}
                    </p>
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                    <span className="text-xs text-gray-300 font-medium">TirePro</span>
                    <a
                      href={founder.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-400 hover:text-[#1E76B6] transition-colors text-sm font-medium group"
                      aria-label={`Ver perfil de LinkedIn de ${founder.name}`}
                    >
                      <span className="group-hover:underline">LinkedIn</span>
                      <div className="w-8 h-8 rounded-full border border-gray-200 group-hover:border-[#1E76B6] group-hover:bg-blue-50 flex items-center justify-center transition-all">
                        <Linkedin size={15} />
                      </div>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 w-full bg-[#0A183A]">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            ¿Quieres calcular el CPK<br />
            <span className="text-[#1E76B6]">automáticamente para toda tu flota?</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-base leading-relaxed">
            TirePro conecta inspecciones, compras y reencauches en un solo lugar. Con un clic sabes qué llanta es la más rentable para tu operación.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a href="/companyregister">
              <button className="bg-[#1E76B6] hover:bg-[#173D68] text-white px-8 py-3.5 rounded-full font-semibold transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl">
                Prueba TirePro Gratis
                <ArrowRight size={18} />
              </button>
            </a>
          </div>
          <p className="text-xs text-gray-600">Sin tarjeta de crédito · Plan gratuito para siempre</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer
        className="border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full"
        style={{ borderColor: 'rgba(30,118,182,0.15)', backgroundColor: '#0A183A' }}
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className="font-semibold text-white">TirePro</span>
              </div>
              <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Software de optimización inteligente de llantas para flotas de vehículos en Colombia
              </p>
              <nav aria-label="Redes sociales">
                <div className="flex space-x-4">
                  {[
                    { label: 'Facebook',link: "https://www.instagram.com/tirepro.app/", path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                    { label: 'Instagram',link: "https://www.instagram.com/tirepro.app/", path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                    { label: 'LinkedIn', link: "https://tr.ee/NHqhS82dFR",path: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z' },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href={social.link}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1E76B6'; (e.currentTarget as HTMLAnchorElement).style.color = 'white' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)' }}
                      aria-label={social.label}
                    >
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d={social.path}/></svg>
                    </a>
                  ))}
                </div>
              </nav>
            </div>
            <nav aria-labelledby="product-nav">
              <h4 id="product-nav" className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Producto</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="#producto" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/equipo" className="hover:text-white transition-colors">Nosotros</a></li>
                <li><a href="/developers" className="hover:text-white transition-colors">Desarrolladores</a></li>
              </ul>
            </nav>
            <nav aria-labelledby="legal-nav">
              <h4 id="legal-nav" className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="/delete" className="hover:text-white transition-colors">Eliminar datos</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </nav>
            <address className="not-italic">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Contacto TirePro</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="mailto:info@tirepro.com.co" className="hover:text-white transition-colors">info@tirepro.com.co</a></li>
                <li><a href="tel:+573151349122" className="hover:text-white transition-colors">+57 315 134 9122</a></li>
                <li>Bogotá, Colombia</li>
              </ul>
            </address>
          </div>
          <div
            className="pt-6 sm:pt-8 border-t flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm gap-4"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}
          >
            <p>© 2025 TirePro Colombia. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ en Colombia</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp */}
      <a
        href="https://wa.me/3151349122?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20TirePro"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50"
        aria-label="Contáctanos por WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
      </a>
    </div>
  )
}