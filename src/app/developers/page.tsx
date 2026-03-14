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
            Estimamos tener la primera versión pública durante el segundo semestre de 2025
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
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: 'rgba(30,118,182,0.15)' }}>
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>TirePro Developer Portal • En construcción • © 2026 TirePro Colombia</p>
          <p className="mt-2">
            <a href="/" className="text-[#1E76B6] hover:underline">Volver al sitio principal</a>
          </p>
        </div>
      </footer>
    </div>
  )
}