'use client'

import React, { useState, useEffect } from 'react'
import { 
  Code, 
  Construction, 
  ArrowRight, 
  ChevronRight,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react'
import Image from 'next/image'
import logo from '../../../public/logo_full.png' // ajusta la ruta según tu estructura

export default function DeveloperPager() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-white text-gray-900 min-h-screen overflow-x-hidden">

      {/* Navigation - igual que la landing principal */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-3">
              <a href="/" aria-label="Volver al inicio">
                <Image
                  src={logo}
                  height={50}
                  width={120}
                  alt="TirePro Logo"
                  className="h-10 sm:h-12 md:h-14 w-auto"
                  style={{ filter: 'brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)' }}
                />
              </a>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-sm text-gray-600 hover:text-[#0A183A] font-medium">Volver al sitio</a>
              <a href="/login" className="text-sm text-gray-600 hover:text-[#0A183A] font-medium">Ingresar</a>
              <a href="/companyregister">
                <button
                  className="text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: '#1E76B6' }}
                >
                  Comenzar gratis
                </button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero / Mensaje principal */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-[#1E76B6] text-sm font-medium mb-6">
            <Construction size={18} />
            <span>En desarrollo</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight mb-6" style={{ color: '#0A183A' }}>
            Página para Desarrolladores
            <br />
            <span style={{ color: '#1E76B6' }}>Próximamente disponible</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Estamos trabajando en nuestra área para desarrolladores con documentación completa de la API, 
            SDKs, ejemplos de código, webhooks y herramientas para integrar TirePro con tus sistemas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              disabled
              className="w-full sm:w-auto bg-gray-300 text-gray-600 px-8 py-4 rounded-full font-semibold cursor-not-allowed"
            >
              Documentación API (pronto)
            </button>
            
            <a 
              href="/contact" 
              className="w-full sm:w-auto border-2 border-[#1E76B6] text-[#1E76B6] hover:bg-[#1E76B6] hover:text-white px-8 py-4 rounded-full font-semibold transition-all flex items-center justify-center gap-2"
            >
              <span>Contactar equipo técnico</span>
              <ArrowRight size={18} />
            </a>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Estimamos tener la primera versión pública durante el segundo semestre de 2026
          </p>
        </div>
      </div>

      {/* Features que vendrán */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12" style={{ color: '#0A183A' }}>
            Lo que estamos preparando para desarrolladores
          </h2>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Code,
                title: "API REST + Webhooks",
                description: "Endpoints bien documentados, autenticación segura y notificaciones en tiempo real"
              },
              {
                icon: Zap,
                title: "SDKs oficiales",
                description: "Librerías para JavaScript/TypeScript, Python y posiblemente otros lenguajes populares"
              },
              {
                icon: Clock,
                title: "Ambientes de pruebas",
                description: "Sandbox completo con datos de prueba para que puedas experimentar sin riesgos"
              },
            ].map((item, i) => (
              <div 
                key={i}
                className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 hover:border-[#1E76B6]/40 transition-all hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E76B6] to-[#173D68] flex items-center justify-center mb-5">
                  <item.icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#0A183A' }}>{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-[#1E76B6]/30 shadow-sm">
              <AlertCircle size={20} className="text-[#1E76B6]" />
              <span className="text-gray-700 font-medium">
                Si necesitas acceso anticipado o tienes un caso de uso especial, 
                <a href="/contact" className="text-[#1E76B6] hover:underline ml-1">contáctanos</a>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer simplificado */}
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
    </div>
  )
}