"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, MessageSquare, Activity, Database, Download, Check } from 'lucide-react';
const landing = "/landing.png"; 
import Image from 'next/image';

const floatingElements = [
  { width: 250, height: 250, color: "#1E76B6", top: "10%", left: "20%", delay: "0s" },
  { width: 300, height: 300, color: "#348CCB", top: "30%", left: "50%", delay: "0.5s" },
  { width: 200, height: 200, color: "#1E76B6", top: "60%", left: "10%", delay: "1s" },
  { width: 280, height: 280, color: "#348CCB", top: "80%", left: "70%", delay: "1.5s" },
  { width: 220, height: 220, color: "#1E76B6", top: "50%", left: "90%", delay: "2s" },
];
const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return; // Ensure it runs only on client
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  

  const features = [
    { icon: <Activity className="w-8 h-8" />, title: "Monitoreo en tiempo real" },
    { icon: <MessageSquare className="w-8 h-8" />, title: "Chat IA integrado" },
    { icon: <Database className="w-8 h-8" />, title: "Gestión de datos" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A183A] to-[#173D68]">
      {/* Navigation - Now with gradient and blur effect */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollPosition > 50 ? 'bg-[#0A183A]/90 backdrop-blur-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex-shrink-0 flex items-center">
            <Image
  src="https://tirepro.com.co/static/media/logo_text.2391efedce2e8af16a32.png"
  alt="TirePro Logo"
  className="h-10 w-auto"
  style={{ filter: 'invert(1) brightness(2)' }}
/>

            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#funcionalidades" className="text-white/80 hover:text-white transition-colors">
                Funcionalidades
              </a>
              <a href="#precios" className="text-white/80 hover:text-white transition-colors">
                Precios
              </a>
              <a href="#nosotros" className="text-white/80 hover:text-white transition-colors">
                Nosotros
              </a>
              <a href='/login'><button className="px-6 py-2 text-white/90 rounded-full border border-[#1E76B6] hover:bg-[#1E76B6]/20 transition-all duration-300">
                Iniciar Sesión
              </button></a>
              <a href='/register'><button className="px-6 py-2 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-full hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 transform hover:scale-105">
                Quiero iniciar
              </button></a>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:text-[#1E76B6] transition-colors"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute w-full bg-[#0A183A]/95 backdrop-blur-lg">
            <div className="px-4 pt-2 pb-3 space-y-1">
              <a href="#funcionalidades" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-[#1E76B6]/20 rounded-lg transition-all duration-300">
                Funcionalidades
              </a>
              <a href="#precios" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-[#1E76B6]/20 rounded-lg transition-all duration-300">
                Precios
              </a>
              <a href="#nosotros" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-[#1E76B6]/20 rounded-lg transition-all duration-300">
                Nosotros
              </a>
              <a href='/login'><button className="block w-full text-left px-3 py-2 text-white/80 hover:text-white hover:bg-[#1E76B6]/20 rounded-lg transition-all duration-300">
                Iniciar Sesión
              </button></a>
              <button className="block w-full px-3 py-2 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-lg">
                Quiero iniciar
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with animated gradient background */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A183A] to-[#173D68] opacity-90"></div>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/api/placeholder/1920/1080')] opacity-10"></div>
        </div>
        
        {/* Animated circles in background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
  {floatingElements.map((el, i) => (
    <div
      key={i}
      className="absolute rounded-full mix-blend-overlay animate-float"
      style={{
        width: `${el.width}px`,
        height: `${el.height}px`,
        background: `radial-gradient(circle, ${el.color} 0%, transparent 70%)`,
        top: el.top,
        left: el.left,
        animationDelay: el.delay,
        opacity: 0.1
      }}
    />
  ))}
</div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-8 animate-fade-in">
              Gestión Inteligente de
              <span className="bg-gradient-to-r from-[#ffff] to-[#348CCB] text-transparent bg-clip-text">
                {" "}Llantas
              </span>
              {" "}para tu Flota
            </h1>
            <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto animate-fade-in-delayed">
              Optimice el rendimiento de sus llantas y reduzca costos operativos con nuestra plataforma integral de gestión de flotas.
            </p>

            <div className="relative w-full max-w-4xl mx-auto mb-12">
            <Image 
  src={landing}
  alt="Fleet Tire Management System"
  width={800}  // Set width and height explicitly
  height={500}
  className="rounded-xl shadow-2xl shadow-[#1E76B6]/20 transform hover:scale-105 transition-transform duration-500"
/>

              <div className="absolute inset-0 bg-gradient-to-t from-[#0A183A] via-transparent to-transparent opacity-40 rounded-xl"></div>
            </div>

            <button className="px-8 py-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-full text-lg font-semibold hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 transform hover:scale-105 inline-flex items-center group">
              Comenzar Ahora
              <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section with hover effects */}
      <section id="funcionalidades" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
  <div className="max-w-7xl mx-auto">
    <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
      Características Clave
    </h2>
    <p className="text-xl text-gray-600 text-center mb-16">
      Todo lo que necesita para maximizar la vida útil de sus llantas
    </p>

    <div className="grid md:grid-cols-3 gap-8">
      {features.map((feature, index) => (
        <div 
          key={index}
          className="group p-8 rounded-2xl bg-gradient-to-b from-gray-100 to-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-[#1E76B6] mb-6 group-hover:scale-110 transition-transform duration-300">
            {feature.icon}
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-gray-900">{feature.title}</h3>
          <p className="text-gray-600">Optimice el rendimiento y reduzca costos con TirePro.</p>
        </div>
      ))}
    </div>
  </div>
</section>


      {/* Pricing Section with modern cards */}
      <section id="precios" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A183A] to-[#173D68]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white">
              Planes
              <span className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
                {" "}Simples
              </span>
            </h2>
            <p className="text-xl text-white/80">
              Elija el plan perfecto para su flota
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="group">
              <div className="p-8 rounded-2xl bg-gradient-to-b from-[#173D68]/50 to-[#1E76B6]/20 backdrop-blur-sm border border-[#1E76B6]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#1E76B6]/20 transform hover:scale-105">
                <h3 className="text-2xl font-bold text-white mb-2">Básico</h3>
                <p className="text-white/70 mb-6">Perfecto para flotas pequeñas</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">$29,000</span>
                  <span className="text-white/70 ml-2">/llanta mes</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Hasta 10 Perfiles', 'Monitoreo', 'Reportes de inspección'].map((feature, index) => (
                    <li key={index} className="flex items-center text-white/80">
                      <Check className="w-5 h-5 text-[#348CCB] mr-3" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 px-4 rounded-xl border border-[#1E76B6] text-white hover:bg-[#1E76B6]/20 transition-all duration-300">
                  Seleccionar Plan
                </button>
              </div>
            </div>

            {/* Professional Plan */}
            <div className="group lg:-mt-4">
              <div className="p-8 rounded-2xl bg-gradient-to-b from-[#173D68] to-[#1E76B6]/40 backdrop-blur-sm border-2 border-[#348CCB] transition-all duration-300 hover:shadow-xl hover:shadow-[#1E76B6]/20 transform hover:scale-105">
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white shadow-lg">
                    Más Popular
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Profesional</h3>
                <p className="text-white/70 mb-6">Para flotas en crecimiento</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">$21,000</span>
                  <span className="text-white/70 ml-2">/llanta mes</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Todo lo del modelo Básico',
                    'Análisis predictivo',
                    'Hasta 50 Usuarios',
                    'Chat IA',
                    'Soporte prioritario'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center text-white/80">
                      <Check className="w-5 h-5 text-[#348CCB] mr-3" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300">
                  Seleccionar Plan
                </button>
              </div>
            </div>

{/* Enterprise Plan */}
<div className="group">
              <div className="p-8 rounded-2xl bg-gradient-to-b from-[#173D68]/50 to-[#1E76B6]/20 backdrop-blur-sm border border-[#1E76B6]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#1E76B6]/20 transform hover:scale-105">
                <h3 className="text-2xl font-bold text-white mb-2">Empresarial</h3>
                <p className="text-white/70 mb-6">Para grandes flotas</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">Personalizado</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Todo lo del modelo Profesional',
                    'Flotas ilimitadas',
                    'Connecciones externas',
                    'API dedicada',
                    'Gerente de cuenta dedicado'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center text-white/80">
                      <Check className="w-5 h-5 text-[#348CCB] mr-3" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 px-4 rounded-xl bg-[#0A183A] text-white border border-[#1E76B6] hover:bg-[#1E76B6]/20 transition-all duration-300">
                  Contactar Ventas
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Section with floating elements */}
<section className="relative py-24 overflow-hidden bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
    <div className="flex flex-col md:flex-row items-center gap-12">
      
      {/* Left Text Section */}
      <div className="md:w-1/2">
        <h2 className="text-4xl font-bold mb-6 text-gray-900">
          Lleve el Control en sus
          <span className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
            {" "}Manos
          </span>
        </h2>
        <p className="text-gray-700 mb-8 text-lg">
          Descargue nuestra aplicación móvil y gestione su flota desde cualquier lugar. 
          Acceda a información en tiempo real, reciba notificaciones importantes y tome 
          decisiones informadas al instante.
        </p>
        <button className="px-8 py-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-full inline-flex items-center hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 transform hover:scale-105">
          <Download className="mr-2" />
          Descargar App
        </button>
      </div>

      {/* Right Image Section */}
      <div className="md:w-1/2 relative">
        <div className="absolute -top-6 -right-6 w-72 h-72 bg-gradient-to-br from-[#1E76B6] to-[#348CCB] rounded-full opacity-10"></div>
        <Image
          src="https://tirepro.com.co/static/media/app.e7a330a1d91499ba0c49.png"
          alt="TirePro App"
          className="relative w-full max-w-sm mx-auto rounded-3xl shadow-xl transition-transform duration-500 hover:scale-105"
        />
      </div>
    </div>
  </div>
</section>


      {/* Team Section with hover effects */}
      <section id="nosotros" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#173D68] to-[#0A183A]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">
            Nuestros
            <span className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
              {" "}Fundadores
            </span>
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                name: "Mateo Morales",
                role: "CEO & Co-Fundador",
                bio: "Con 7 años de experiencia en consultoría en firmas líderes como Cap Gemini y Bain, Mateo aporta una sólida visión estratégica. Actualmente cursa un MBA en MIT y es economista graduado de Purdue.",
                image: "https://media.licdn.com/dms/image/v2/D4D03AQHCGd8UB9m2AA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1685477838438?e=1742428800&v=beta&t=axZdaXzmpLtmHFEhCdl_1us1r_jwWWDwQNeBcztGf2A"
              },
              {
                name: "Jeronimo Morales",
                role: "Product development & Co-Fundador",
                bio: "Estudiante de Administración de Empresas en el CESA y con experiencia en el sector de las llantas en Merquellantas. Jerónimo es el programador del equipo, con 6 años de experiencia en desarrollo.",
                image: "https://media.licdn.com/dms/image/v2/D4E03AQFM4BmS6dGm6Q/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1709150478233?e=1742428800&v=beta&t=X7fDQz4sJrPc4w2XvQWdkE63QREy-wFwbmIfSWCDNjs"
              }
            ].map((member, index) => (
              <div key={index} className="group">
                <div className="relative p-8 rounded-2xl bg-gradient-to-b from-[#173D68]/50 to-[#1E76B6]/20 backdrop-blur-sm border border-[#1E76B6]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#1E76B6]/20">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <div className="relative">
                    <Image 
                      src={member.image}
                      alt={member.name}
                      className="w-32 h-32 rounded-full mx-auto mb-6 object-cover border-4 border-[#1E76B6]/30 group-hover:border-[#348CCB] transition-colors"
                    />
                    <h3 className="text-2xl font-bold mb-2 text-white text-center">{member.name}</h3>
                    <p className="text-[#348CCB] mb-4 text-center">{member.role}</p>
                    <p className="text-white/70 text-center">
                      {member.bio}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer with gradient and blur effect */}
      <footer className="bg-[#0A183A] text-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E76B6]/10 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
                Links Importantes
              </h3>
              <ul className="space-y-4">
                {[
                  'Términos y Condiciones',
                  'Privacidad de Datos',
                  'Contáctanos',
                  'Eliminar Datos'
                ].map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-white/70 hover:text-[#348CCB] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
                Contacto
              </h3>
              <ul className="space-y-4">
                <li className="text-white/70">Correo TirePro</li>
                <li className="text-white/70">+57 310 660 5563</li>
                <li className="text-white/70">Bogotá, Colombia</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
                Síguenos
              </h3>
              <div className="flex space-x-4">
                {['Facebook', 'Twitter', 'LinkedIn'].map((social, index) => (
                  <a
                    key={index}
                    href="#"
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-[#1E76B6] to-[#348CCB] flex items-center justify-center hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 transform hover:scale-110"
                  >
                    <span className="sr-only">{social}</span>
                    <div className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-[#1E76B6]/30 text-center text-white/50">
            <p>© 2025 TirePro. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Animated scroll to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 right-8 p-4 rounded-full bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 transform hover:scale-110 ${
          scrollPosition > 100 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
        }`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </div>
  );
};

export default Home;