"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Download } from 'lucide-react';
const landing = "/landing.png"; 
import Image from 'next/image';
import logo from "../../public/logo_text.png"
import analisis from "../../public/analisis.png"
import rotacion from "../../public/rotacion.png"
import inspecciones from "../../public/inspecciones.png"
import cpk from "../../public/cpk.png"
import onboarding from "../../public/onboarding.png"
import reporte from "../../public/reporte.png"
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

  const FeatureCard = ({
    title,
    description,
    image,
    iconPath,
    extraClass = "",
  }: {
    title: string;
    description: string;
    image: string;
    iconPath: string;
    extraClass?: string;
  }) => (
    <div className={`group bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 relative overflow-hidden ${extraClass}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#1E76B6]/10 to-[#348CCB]/10 rounded-full -mr-16 -mt-16"></div>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#1E76B6] to-[#348CCB] flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform duration-300">
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d={iconPath} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-2xl font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <div className="relative h-48 rounded-xl overflow-hidden mb-4 transform transition-all duration-500 group-hover:scale-105">
        <Image src={image} alt={title} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A183A] via-transparent to-transparent opacity-30"></div>
      </div>
    </div>
  );
  

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
  src={logo}
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
              <a href='/login'><button className="px-6 py-2 text-white/90 rounded-full border border-[#1E76B6] hover:bg-[#1E76B6]/20 transition-all duration-300">
                Iniciar Sesión
              </button></a>
              <a href='/companyregister'><button className="px-6 py-2 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-full hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 transform hover:scale-105">
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
            <img 
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


{/* Features Section with interactive cards and animations */}
<section id="funcionalidades" className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-5">
    <div className="absolute rounded-full bg-gradient-to-r from-[#1E76B6] to-[#348CCB]" style={{width: '400px', height: '400px', top: '-100px', left: '-100px'}}></div>
    <div className="absolute rounded-full bg-gradient-to-r from-[#348CCB] to-[#1E76B6]" style={{width: '300px', height: '300px', bottom: '-50px', right: '-50px'}}></div>
  </div>

  <div className="max-w-7xl mx-auto relative">
    <div className="text-center mb-16">
      <h2 className="text-4xl font-bold mb-4 text-gray-900">
        Características 
        <span className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text"> Inteligentes</span>
      </h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
        Una plataforma todo-en-uno para gestionar, analizar y optimizar el estado y rendimiento de tus llantas
      </p>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
      {/* Feature 1 */}
      <FeatureCard
        title="Inspecciones Digitales"
        description="Registra profundidad, imagen y kilometraje con solo unos clics. Visualiza el historial de inspecciones en tiempo real."
        image={inspecciones}
        iconPath="M12 2V6M12 18V22..."
      />

      {/* Feature 2 */}
      <FeatureCard
        title="Costos y CPK en un Click"
        description="Automatiza el seguimiento del costo por kilómetro y mantén visibilidad total sobre tu inversión en llantas."
        image={cpk}
        iconPath="M12 8V12L15 15..."
        extraClass="md:translate-y-12"
      />

      {/* Feature 3 */}
      <FeatureCard
        title="Control de Posiciones"
        description="Asigna, mueve y reorganiza llantas por vehículo y eje con una interfaz visual. Asegura un montaje eficiente."
        image={rotacion}
        iconPath="M3 12L5 10M5 10L12 3..."
      />

      {/* Feature 4 */}
      <FeatureCard
        title="Análisis Predictivo"
        description="Identifica cuándo cambiar una llanta antes de que falle. Usa IA para tomar decisiones basadas en datos."
        image={analisis}
        iconPath="M9 19V13C9 11.8954..."
      />

      {/* Feature 5 */}
      <FeatureCard
        title="Reportes Visuales"
        description="Dashboards de semáforo, vida útil y distribución que resumen el estado actual de tu flota con claridad."
        image={reporte}
        iconPath="M12 15C13.6569 15 15..."
        extraClass="md:translate-y-12"
      />

      {/* Feature 6 */}
      <FeatureCard
        title="Onboarding y Personalización"
        description="Crea tu cuenta, carga tu flota y empieza en minutos. Personaliza campos, métricas y estructura."
        image={onboarding}
        iconPath="M20 4H4C2.89543 4..."
      />
    </div>
  </div>
</section>



{/* Pricing Section with modern cards - Updated with two options */}
<section id="precios" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A183A] to-[#173D68] overflow-hidden">
  <div className="max-w-6xl mx-auto">
    <div className="text-center mb-12 md:mb-16">
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
        Planes
        <span className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
          {" "}Simples
        </span>
      </h2>
      <p className="text-lg md:text-xl text-white/80">
        Elija el plan perfecto para su flota
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
      {/* Mini Plan */}
      <div className="group transform transition-all duration-300 hover:scale-105">
        <div className="h-full p-6 md:p-8 rounded-2xl bg-gradient-to-b from-[#173D68]/50 to-[#1E76B6]/20 backdrop-blur-sm border border-[#1E76B6]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#1E76B6]/20 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Mini</h3>
            <p className="text-white/70 mb-6">Para los Uno a Uno</p>
            <ul className="space-y-4 mb-8">
              {[
                'Análisis con IA',
                'Un usuario',
                'Tarjetas básicas',
                'Llantas ilimitadas'
              ].map((feature, index) => (
                <li key={index} className="flex items-start text-white/80">
                  <span className="mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#348CCB]">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <button className="w-full py-3 px-4 rounded-xl border border-[#1E76B6] text-white hover:bg-[#1E76B6]/20 transition-all duration-300 mt-auto">
            En desarollo...
          </button>
        </div>
      </div>

      {/* Pro Plan */}
      <div className="group transform transition-all duration-300 hover:scale-105">
        <div className="h-full p-6 md:p-8 rounded-2xl bg-gradient-to-b from-[#173D68] to-[#1E76B6]/40 backdrop-blur-sm border-2 border-[#348CCB] transition-all duration-300 hover:shadow-xl hover:shadow-[#1E76B6]/20 relative flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
            <p className="text-white/70 mb-6">Para grandes flotas</p>
            <ul className="space-y-4 mb-8">
              {[
                'Análisis con IA',
                'Usuarios ilimitados',
                'Tarjetas detalladas',
                'Llantas ilimitadas',
              ].map((feature, index) => (
                <li key={index} className="flex items-start text-white/80">
                  <span className="mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#348CCB]">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <button className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 mt-auto">
            Seleccionar Pro
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
        <img
          src="https://tirepro.com.co/static/media/app.e7a330a1d91499ba0c49.png"
          alt="TirePro App"
          className="relative w-full max-w-sm mx-auto rounded-3xl shadow-xl transition-transform duration-500 hover:scale-105"
        />
      </div>
    </div>
  </div>
</section>



      {/* Footer with gradient and blur effect */}
      <footer className="bg-[#0A183A] text-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-[#1E76B6]/10 to-transparent"></div>

  <div className="max-w-7xl mx-auto relative">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
      {/* Links */}
      <div>
        <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
          Links Importantes
        </h3>
        <ul className="space-y-4">
          <li>
            <a href="/legal#terms-section" className="text-white/70 hover:text-[#348CCB] transition-colors">
              Términos y Condiciones
            </a>
          </li>
          <li>
            <a href="/legal#privacy-section" className="text-white/70 hover:text-[#348CCB] transition-colors">
              Privacidad de Datos
            </a>
          </li>
          <li>
            <a href="/contacto" className="text-white/70 hover:text-[#348CCB] transition-colors">
              Contáctanos
            </a>
          </li>
          <li>
            <a href="#" className="text-white/70 hover:text-[#348CCB] transition-colors">
              Eliminar Datos
            </a>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
          Contacto
        </h3>
        <ul className="space-y-4">
          <a href='mailto:jeronimo.morales@merquellantas.com?subject=Consulta%20TirePro'><li className="text-white/70">Correo TirePro</li></a>
          <li className="text-white/70">+57 310 660 5563</li>
          <li className="text-white/70">Bogotá, Colombia</li>
        </ul>
      </div>

      {/* Social */}
      <div>
        <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-transparent bg-clip-text">
          Síguenos
        </h3>
        <div className="flex space-x-4">
          {[
            { name: 'Facebook', href: '#' },
            { name: 'Twitter', href: '#' },
            { name: 'LinkedIn', href: '#' },
          ].map((social, index) => (
            <a
              key={index}
              href={social.href}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-[#1E76B6] to-[#348CCB] flex items-center justify-center hover:shadow-lg hover:shadow-[#1E76B6]/50 transition-all duration-300 transform hover:scale-110"
            >
              <span className="sr-only">{social.name}</span>
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