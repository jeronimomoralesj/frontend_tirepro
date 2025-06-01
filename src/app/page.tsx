'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  Calendar, 
  BarChart3, 
  Clock, 
  FileText, 
  MapPin, 
  Users,
  Menu,
  X
} from 'lucide-react'
import logo from "../../public/logo_text.png"
import logoTire from "../../public/logo_tire.png"
import landingImage from "../../public/landing.png"
import driver from "../../public/driver.png"
import mini from "../../public/mini.png"
import pro from "../../public/pro.png"
import retail from "../../public/retail.png"

const TireProLanding = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-carousel effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 6)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const features = [
    {
      title: "Inspecciones Digitales",
      description: "Testimonials are short quotes from people who love your brand. It's a great way to convince customers to try your services.",
      icon: Calendar
    },
    {
      title: "Costos y CPK en un Click", 
      description: "Automatiza el seguimiento del costo por kilómetro y mantén visibilidad total sobre tu inversión en llantas",
      icon: BarChart3
    },
    {
      title: "Control de Posiciones",
      description: "Asigna, mueve y reorganiza llantas por vehículo y eje con una interfaz visual. Asegura un montaje eficiente.",
      icon: MapPin
    },
    {
      title: "Análisis Predictivo",
      description: "Identifica cuándo cambiar una llanta antes de que falle. Usa IA para tomar decisiones basadas en datos.",
      icon: Clock
    },
    {
      title: "Reportes Visuales", 
      description: "Dashboards de semáforo, vida útil y distribución que resumen el estado actual de tu flota con claridad.",
      icon: FileText
    },
    {
      title: "Onboarding y Personalización",
      description: "Crea tu cuenta, carga tu flota y empieza en minutos. Personaliza campos, métricas y estructura.",
      icon: Users
    }
  ]

  const plans = [
    {
      name: "Mini",
      subtitle: "Para los Uno a Uno",
      features: [
        "Análisis con IA",
        "Un usuario", 
        "Tarjetas básicas",
        "Llantas ilimitadas"
      ],
      highlighted: false
    },
    {
      name: "Pro",
      subtitle: "Para grandes flotas", 
      features: [
        "Análisis con IA",
        "Usuarios ilimitados",
        "Tarjetas detalladas", 
        "Llantas ilimitadas"
      ],
      highlighted: true
    },
    {
      name: "Retail",
      subtitle: "Para los distribuidores",
      features: [
        "Todo lo del plan Pro",
        "Crea tus Clientes",
        "Análisis por Cliente"
      ],
      highlighted: false
    }
  ]

  const companyLogos = [
    "https://ii.ct-stc.com/1/logos/empresas/2022/12/15/comercializadora-internacional-de-llantas-sa-FF32AF4270DB2733202139250thumbnail.png",
    "https://pbs.twimg.com/profile_images/1139913736137977856/HJ3rueq4_400x400.png",
    "https://www.cmodistribuciones.com/wp-content/uploads/2022/02/ctc-1-249x233-2.png",
    "https://media.licdn.com/dms/image/v2/C4E0BAQFZkpMWoNQU1w/company-logo_200_200/company-logo_200_200/0/1630609548810?e=2147483647&v=beta&t=kVePfprWik91OQyyu6sgafGDp8uFGurAk0wG23Wac2Y",
    "https://brand.mit.edu/sites/default/files/styles/image_text_2x/public/2023-08/MIT-lockup-3line-red.png?itok=MJP9Djff",
    "https://assets-002.noviams.com/novi-file-uploads/ceo/members/aws.png",
    "https://media.licdn.com/dms/image/v2/C4D0BAQH84rmxPm2jew/company-logo_200_200/company-logo_200_200/0/1630536981682?e=2147483647&v=beta&t=v9LJy8REXCzrlwzoqnc3okTQr4yjr24JIzj2z8gf-c8",
  ]

  return (
    <div className="bg-[#030712] text-white min-h-screen">
      {/* Sticky Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#030712]/95 backdrop-blur-md border-b border-[#0A183A]' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
              <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#platform" className="text-gray-300 hover:text-white transition-colors">
                Plataforma
              </a>
              <a href="/blog" className="text-gray-300 hover:text-white transition-colors">
                Blog
              </a>
              <a href="#plans" className="text-gray-300 hover:text-white transition-colors">
                Planes
              </a>
              <a href="/contact" className="text-gray-300 hover:text-white transition-colors">
                Contacto
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <a href='/login'><button className="px-4 py-2 text-[#348CCB] border border-[#348CCB] rounded-lg hover:bg-[#348CCB] hover:text-white transition-all">
                Ingresar
              </button></a>
              <a href='/companyregister'><button className="px-4 py-2 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all">
                Quiero Iniciar
              </button></a>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#030712]/95 backdrop-blur-md border-t border-[#0A183A]">
            <div className="px-4 py-4 space-y-4">
              <a href="#platform" className="block text-gray-300 hover:text-white">
                Plataforma
              </a>
              <a href="/blog" className="block text-gray-300 hover:text-white">
                Blog
              </a>
              <a href="#plans" className="block text-gray-300 hover:text-white">
                Planes
              </a>
              <a href="/contact" className="block text-gray-300 hover:text-white">
                Contacto
              </a>
              <div className="flex flex-col space-y-2 pt-4 border-t border-[#0A183A]">
                <a href='/login'><button className="px-4 py-2 text-[#348CCB] border border-[#348CCB] rounded-lg">
                  Acceso
                </button></a>
                <a href='/companyregister'><button className="px-4 py-2 bg-[#348CCB] text-white rounded-lg">
                  Quiero Iniciar
                </button></a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with Gradient */}
      <section id="hero" className="relative min-h-screen flex items-center">
        {/* Enhanced Gradient Background */}
        <div className="
    absolute inset-0
    bg-no-repeat bg-center
    bg-[radial-gradient(ellipse_at_top,_#136eb2_0%,_rgba(19,110,178,0.4)_40%,_transparent_60%)]
  "></div>
                 
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent">
                Reduce hasta un 25% tus costos en llantas cada mes
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed">
                Una plataforma con IA que analiza el desgaste, anticipa fallas y te recomienda qué llanta comprar, cuándo rotarla y cómo extender su vida útil.
              </p>
              <button className="bg-[#348CCB] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#1E76B6] transition-all transform hover:scale-105">
                Empieza Ahora
              </button>
            </div>
             
            {/* Dashboard Preview */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#0A183A]">
                <Image
                   src={landingImage}
                   alt="TirePro Dashboard"
                   width={800}
                   height={600}
                  className="w-full h-auto"
                />
              </div>
              {/* Floating elements for extra flair */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#348CCB] rounded-full opacity-60"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-[#1E76B6] rounded-full opacity-40"></div>
            </div>
          </div>
        </div>
      </section>

{/* Enhanced Trust Section with Carousel */}
<section className="py-20 bg-gradient-to-b from-transparent via-[#0A183A]/10 to-[#0A183A]/20 relative overflow-hidden">
  {/* Background decorative elements */}
  <div className="absolute inset-0 opacity-30">
    <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-[#348CCB]/20 to-[#1E76B6]/20 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-gradient-to-l from-[#1E76B6]/20 to-[#348CCB]/20 rounded-full blur-2xl"></div>
  </div>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    {/* Enhanced Header */}
    <div className="text-center mb-16">
      
      
      <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent">
        Contamos con el apoyo de grandes líderes
      </h2>
      <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
        Empresas líderes confían en nuestra tecnología para optimizar sus flotas
      </p>
    </div>
    
    {/* Enhanced Carousel Container */}
    <div className="relative">
      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none"></div>
      
      {/* Main carousel track */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A183A]/30 via-[#0A183A]/20 to-[#0A183A]/30 border border-[#173D68]/30 backdrop-blur-sm">
        <div 
          className="flex transition-transform duration-700 ease-out py-8"
          style={{ 
            transform: `translateX(-${currentSlide * (100 / 7)}%)`,
            width: `${(companyLogos.length * 2 * 100) / 7}%`
          }}
        >
          {companyLogos.concat(companyLogos).map((logoUrl, index) => (
            <div
              key={index}
              className="flex-shrink-0 px-3 lg:px-4"
              style={{ width: `${100 / (companyLogos.length * 2)}%` }}
            >
              {/* Enhanced logo container */}
              <div className="group relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm"></div>
                
                {/* Main logo card */}
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 h-24 flex items-center justify-center border border-[#173D68]/40 hover:border-[#348CCB]/60 transition-all duration-500 group-hover:transform group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-[#348CCB]/20">
                  
                  {/* Logo image with enhanced styling */}
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="max-h-12 max-w-full object-contain filter brightness-90 contrast-110 group-hover:brightness-110 group-hover:contrast-125 transition-all duration-500 drop-shadow-sm"
                    style={{
                      filter: 'brightness(0.9) contrast(1.1) saturate(0.8) hue-rotate(0deg)',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.filter = 'brightness(1.1) contrast(1.25) saturate(1.2) hue-rotate(0deg)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.filter = 'brightness(0.9) contrast(1.1) saturate(0.8) hue-rotate(0deg)';
                    }}
                  />
                  
                  {/* Corner accent */}
                  <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-br from-[#348CCB] to-[#1E76B6] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 delay-200"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {/* Enhanced Navigation dots */}
    <div className="flex justify-center mt-10 space-x-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <button
          key={index}
          onClick={() => setCurrentSlide(index)}
          className={`relative group transition-all duration-300 ${
            index === currentSlide ? 'transform scale-125' : 'hover:scale-110'
          }`}
          aria-label={`Go to slide ${index + 1}`}
        >
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            index === currentSlide 
              ? 'bg-gradient-to-r from-[#348CCB] to-[#1E76B6] shadow-lg shadow-[#348CCB]/50' 
              : 'bg-[#173D68] group-hover:bg-[#348CCB]/60'
          }`}></div>
          
          {/* Active indicator ring */}
          {index === currentSlide && (
            <div className="absolute inset-0 w-5 h-5 -m-1 border-2 border-[#348CCB]/40 rounded-full animate-pulse"></div>
          )}
        </button>
      ))}
    </div>
  </div>
</section>

{/* Features Section with Floating Cards */}
<section className="py-8 sm:py-12 lg:py-16 bg-gradient-to-b from-[#0A183A]/20 to-transparent relative overflow-hidden">
  {/* Background Pattern */}
  <div className="absolute inset-0 opacity-10">
    <div className="absolute top-10 left-10 w-32 h-32 bg-[#348CCB] rounded-full blur-3xl"></div>
    <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#1E76B6] rounded-full blur-3xl"></div>
  </div>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    {/* Header */}
    <div className="text-center mb-6 sm:mb-8 lg:mb-12">
      <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-[#348CCB]">
        Automatiza tu gestión de llantas con IA
      </h2>
      <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
        Tecnología avanzada que optimiza cada aspecto de tu flota
      </p>
    </div>

    {/* Main Content Grid */}
    <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
      
      {/* Left Feature Cards */}
      <div className="lg:col-span-3 space-y-4 sm:space-y-6">
        
        {/* Desgaste eficiente */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/20 to-transparent rounded-2xl blur-sm group-hover:blur-none transition-all duration-300"></div>
          <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-4 sm:p-5 lg:p-6 rounded-2xl border border-[#348CCB]/40 shadow-2xl hover:shadow-[#348CCB]/20 hover:border-[#348CCB]/60 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#348CCB] to-[#1E76B6] rounded-xl flex items-center justify-center shadow-lg">
                <Calendar size={20} className="text-white" />
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-green-400/60 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-green-400/30 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-2">
              Desgaste eficiente
            </h3>
          </div>
        </div>

        {/* Compra optimizada */}
        <div className="group relative lg:ml-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6]/20 to-transparent rounded-2xl blur-sm group-hover:blur-none transition-all duration-300"></div>
          <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-4 sm:p-5 lg:p-6 rounded-2xl border border-[#1E76B6]/40 shadow-2xl hover:shadow-[#1E76B6]/20 hover:border-[#1E76B6]/60 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#1E76B6] to-[#348CCB] rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 size={20} className="text-white" />
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-amber-400/60 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-amber-400/30 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-2">
              Compra optimizada
            </h3>
          </div>
        </div>
        
      </div>

      {/* Central Image */}
      <div className="lg:col-span-6 flex justify-center">
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/30 via-[#1E76B6]/20 to-[#348CCB]/30 rounded-3xl blur-2xl group-hover:blur-xl transition-all duration-500"></div>
          
          {/* Main image container */}
          <div className="relative bg-gradient-to-br from-[#0A183A]/50 to-[#173D68]/30 backdrop-blur-sm p-2 sm:p-3 lg:p-4 rounded-3xl border border-[#348CCB]/30">
            <Image
              src={driver}
              alt="TirePro Dashboard"
              className="w-64 h-auto sm:w-80 md:w-96 lg:w-full lg:max-w-md xl:max-w-lg rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>
          
          {/* Floating elements around image */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#348CCB] rounded-full animate-bounce delay-0"></div>
          <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-[#1E76B6] rounded-full animate-bounce delay-500"></div>
          <div className="absolute top-1/4 -left-4 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-4 w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-700"></div>
        </div>
      </div>

      {/* Right Feature Cards */}
      <div className="lg:col-span-3 space-y-4 sm:space-y-6">
        
        {/* Mantenimiento predictivo */}
        <div className="group relative lg:mr-6">
          <div className="absolute inset-0 bg-gradient-to-l from-[#348CCB]/20 to-transparent rounded-2xl blur-sm group-hover:blur-none transition-all duration-300"></div>
          <div className="relative bg-gradient-to-bl from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-4 sm:p-5 lg:p-6 rounded-2xl border border-[#348CCB]/40 shadow-2xl hover:shadow-[#348CCB]/20 hover:border-[#348CCB]/60 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-bl from-[#348CCB] to-[#1E76B6] rounded-xl flex items-center justify-center shadow-lg">
                <FileText size={20} className="text-white" />
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-blue-400/30 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-2">
              Mantenimiento predictivo
            </h3>
          </div>
        </div>

        {/* Mejor seguridad */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-l from-[#1E76B6]/20 to-transparent rounded-2xl blur-sm group-hover:blur-none transition-all duration-300"></div>
          <div className="relative bg-gradient-to-bl from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-4 sm:p-5 lg:p-6 rounded-2xl border border-[#1E76B6]/40 shadow-2xl hover:shadow-[#1E76B6]/20 hover:border-[#1E76B6]/60 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-bl from-[#1E76B6] to-[#348CCB] rounded-xl flex items-center justify-center shadow-lg">
                <Users size={20} className="text-white" />
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-emerald-400/60 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-emerald-400/30 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-2">
              Mejor seguridad
            </h3>
          </div>
        </div>
        
      </div>
      
    </div>
  </div>
</section>
      {/* Features Section */}
      <section id="platform" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Cómo Funciona TirePro?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-[#0A183A]/40 to-[#173D68]/20 p-8 rounded-2xl border border-[#173D68]/30 hover:border-[#348CCB]/50 transition-all duration-300 hover:transform hover:scale-105"
                >
                  <div className="bg-[#348CCB] p-3 rounded-xl w-fit mb-6">
                    <IconComponent size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
<section id="plans" className="py-20 bg-gradient-to-b from-[#0A183A]/20 to-transparent">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-[#348CCB] via-[#4A9FDB] to-[#5CB3E8] bg-clip-text text-transparent">
        Planes TirePro
      </h2>
      <p className="text-xl text-gray-300">
        TirePro es gratuito para flotas que quieren tomar decisiones inteligentes sin inversión inicial
      </p>
    </div>
    
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {plans.map((plan, index) => {
        const images = [
          mini.src,
          pro.src,
          retail.src
        ];
        
        return (
          <div
            key={index}
            className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:transform hover:scale-105 overflow-hidden ${
              plan.highlighted
                ? 'border-[#348CCB] shadow-lg shadow-[#348CCB]/20'
                : 'border-[#173D68]/30 hover:border-[#348CCB]/50'
            }`}
          >
            
            {/* Full width image */}
            <div className="w-full h-48 overflow-hidden">
              <img 
                src={images[index]} 
                alt={`Plan ${plan.name}`}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <h3 className={`text-2xl font-bold mb-2 ${
                  plan.highlighted ? 'text-[#348CCB]' : 'text-white'
                }`}>
                  {plan.name}
                </h3>
                <p className="text-gray-400">{plan.subtitle}</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <div className="w-2 h-2 bg-[#348CCB] rounded-full mr-3 flex-shrink-0"></div>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <a href='/companyregister'><button className={`w-full py-3 rounded-lg font-semibold transition-all ${
                plan.highlighted
                  ? 'bg-[#348CCB] text-white hover:bg-[#1E76B6]'
                  : 'border border-[#348CCB] text-[#348CCB] hover:bg-[#348CCB] hover:text-white'
              }`}>
                Comenzar
              </button></a>
            </div>
          </div>
        );
      })}
    </div>
  </div>
</section>

      {/* Footer */}
      <footer className="bg-[#0A183A]/30 border-t border-[#173D68]/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-1 filter brightness-0 invert'/>
                <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
              </div>
              <p className="text-gray-400 mb-4">
                Plataforma inteligente para la gestión y optimización de flotas de vehículos.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Links Importantes</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/legal#terms-section" className="hover:text-[#348CCB] transition-colors">Términos y Condiciones</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-[#348CCB] transition-colors">Privacidad de Datos</a></li>
                <li><a href="/contacto" className="hover:text-[#348CCB] transition-colors">Contáctanos</a></li>
                <li><a href="/delete" className="hover:text-[#348CCB] transition-colors">Eliminar Datos</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contacto</h4>
              <ul className="space-y-2 text-gray-400">
                <li>info@tirepro.com.co</li>
                <li>+57 310 660 5563</li>
                <li>Bogotá, Colombia</li>
              </ul>
              
              <div className="flex space-x-4 mt-6">
                <div className="w-8 h-8 bg-[#348CCB] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">in</span>
                </div>
                <div className="w-8 h-8 bg-[#348CCB] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">ig</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#173D68]/30 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 TirePro. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default TireProLanding