"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthProvider";
import {
  Mail,
  Lock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  X,
  Menu,
  ArrowLeft,
  Shield,
  Zap,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/logo_text.png";
import logoTire from "../../../public/logo_tire.png"

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Handle scroll for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect when the auth context's user is set.
  useEffect(() => {
    if (auth.user) {
      router.push("/dashboard");
    }
  }, [auth.user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInvalidCredentials(false);
    setLoading(true);

    try {
      // Delegate login to the auth provider.
      await auth.login(email, password);
      // (Redirection will occur via the useEffect when auth.user is set.)
    } catch (err: unknown) {
      // Check specifically for "Invalid credentials" error
      if (err instanceof Error && err.message === "Invalid credentials") {
        setInvalidCredentials(true);
        setError("Credenciales inválidas");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado");
      }
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Background Effects - Optimized for all screen sizes */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A183A]/40 via-transparent to-[#173D68]/20"></div>
      <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-[#348CCB]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] lg:w-[800px] lg:h-[800px] bg-gradient-to-r from-[#348CCB]/3 to-purple-500/3 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Enhanced Navigation - Fully responsive */}
        <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#030712]/95 backdrop-blur-md border-b border-[#0A183A]' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <a href="/"><div className="flex items-center space-x-2">
              <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
              <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
            </div></a>

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

        {/* Main Content - Enhanced responsive layout */}
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Left Panel - Enhanced responsive branding */}
          <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center p-8 xl:p-16 relative">
            {/* Decorative Elements - Responsive sizing */}
            <div className="absolute top-20 right-20 w-24 h-24 xl:w-32 xl:h-32 bg-gradient-to-br from-[#348CCB]/10 to-purple-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-20 left-20 w-16 h-16 xl:w-24 xl:h-24 bg-gradient-to-br from-purple-500/10 to-[#348CCB]/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="mb-8 lg:mb-12">
                <div className="flex items-center space-x-3 mb-6 lg:mb-8">
                  <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-r from-[#348CCB]/20 to-purple-500/20 border border-[#173D68]/30">
                    <a href="/"><Image src={logoTire} alt="TirePro" width={20}  className='lg:w-auto lg:h-6 filter brightness-0 invert'/></a>
                  </div>
                  <a href="/"><Image
                    src={logo}
                    alt="TirePro Logo"
                    className="w-auto lg:h-8 filter brightness-0 invert"
                    priority
                  /></a>
                </div>
              </div>

              <h1 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold mb-4 lg:mb-6 leading-tight">
                Bienvenido{" "}
                <span className="bg-gradient-to-r from-[#348CCB] to-purple-400 bg-clip-text text-transparent">
                  de nuevo!
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-gray-300 mb-8 lg:mb-12 leading-relaxed">
                Inicia sesión para acceder a tu panel de control y gestionar tus datos de manera inteligente
              </p>

              {/* Enhanced Feature List - Responsive */}
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center space-x-3 lg:space-x-4 group">
                  <div className="rounded-xl bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 p-2 lg:p-3 border border-[#348CCB]/30 group-hover:border-[#348CCB]/50 transition-all">
                    <Shield size={16} className="lg:w-5 lg:h-5 text-[#348CCB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm lg:text-base">Manejo de datos seguro</p>
                    <p className="text-xs lg:text-sm text-gray-400">Encriptación de extremo a extremo</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 lg:space-x-4 group">
                  <div className="rounded-xl bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 p-2 lg:p-3 border border-[#348CCB]/30 group-hover:border-[#348CCB]/50 transition-all">
                    <Zap size={16} className="lg:w-5 lg:h-5 text-[#348CCB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm lg:text-base">Analiza tus llantas en tiempo real</p>
                    <p className="text-xs lg:text-sm text-gray-400">Monitoreo continuo y alertas inteligentes</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 lg:space-x-4 group">
                  <div className="rounded-xl bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 p-2 lg:p-3 border border-[#348CCB]/30 group-hover:border-[#348CCB]/50 transition-all">
                    <Users size={16} className="lg:w-5 lg:h-5 text-[#348CCB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm lg:text-base">Soporte 24/7</p>
                    <p className="text-xs lg:text-sm text-gray-400">Asistencia técnica especializada</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Fully responsive login form */}
          <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 pt-20 sm:pt-24 lg:pt-12 min-h-screen lg:min-h-0">
            <div className="w-full max-w-md">
              {/* Back Button for Mobile - Enhanced */}
              <div className="lg:hidden mb-6 sm:mb-8">
                <Link href="/" className="inline-flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm">
                  <ArrowLeft size={18} />
                  <span>Volver al inicio</span>
                </Link>
              </div>

              {/* Mobile Logo - Responsive */}
              <div className="lg:hidden text-center mb-6 sm:mb-8">
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-[#348CCB]/20 to-purple-500/20 border border-[#173D68]/30">
                    <a href="/"><Image src={logoTire} alt="TirePro" height={20} className='sm:w-6 sm:h-6 filter brightness-0 invert'/></a>
                  </div>
                  <a href="/"><Image 
                    src={logo} 
                    alt="TirePro" 
                    width={100} 
                    className="sm:w-[120px] sm:h-[32px] filter brightness-0 invert"
                  /></a>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Bienvenido <span className="text-[#348CCB]">de nuevo!</span>
                </h1>
              </div>

              {/* Enhanced Form Container - Fully responsive */}
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#348CCB]/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur"></div>
                
                <div className="relative bg-gradient-to-br from-[#0A183A]/80 to-[#173D68]/40 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 border border-[#173D68]/30">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Inicia Sesión
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Accede a tu cuenta TirePro
                    </p>
                  </div>
                  
                  {/* Enhanced Error Alert - Responsive */}
                  {invalidCredentials && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
                      <div className="flex items-start text-red-400">
                        <div className="p-1 bg-red-500/20 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-0.5">
                          <AlertCircle size={12} className="sm:w-3.5 sm:h-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-xs sm:text-sm">Credenciales inválidas</p>
                          <p className="text-xs text-red-300 mt-1 leading-relaxed">Por favor verifica tu correo y contraseña.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        <Mail size={14} className="sm:w-4 sm:h-4 text-[#348CCB]" />
                        Correo Electrónico
                      </label>
                      <div className="relative group">
                        <input
                          type="email"
                          placeholder="nombre@tirepro.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#0A183A]/40 border ${
                            invalidCredentials ? "border-red-500/50" : "border-[#173D68]/30"
                          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-all group-hover:border-[#173D68]/50`}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        <Lock size={14} className="sm:w-4 sm:h-4 text-[#348CCB]" />
                        Contraseña
                      </label>
                      <div className="relative group">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#0A183A]/40 border ${
                            invalidCredentials ? "border-red-500/50" : "border-[#173D68]/30"
                          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-all group-hover:border-[#173D68]/50 pr-10 sm:pr-12`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#348CCB] transition-colors p-1"
                        >
                          {showPassword ? <EyeOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <a
                        href="mailto:jeronimo.morales@merquellantas.com?subject=Olvide%20Mi%20contrase%C3%B1a&body=Querido%20equipo%20tirepro%2C%0A%0ASolicito%20un%20link%20de%20restablecer%20contrase%C3%B1a%20para%20mi%20cuenta%20con%20el%20siguiente%20correo%3A%20"
                        className="text-xs sm:text-sm text-[#348CCB] hover:text-white transition-colors hover:underline"
                      >
                        Olvidé mi contraseña
                      </a>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#348CCB] to-[#1E76B6] hover:from-[#1E76B6] hover:to-[#348CCB] text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-[#348CCB]/25 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                      {loading ? (
                        <>
                          <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Ingresando...</span>
                        </>
                      ) : (
                        <>
                          <span>Iniciar Sesión</span>
                          <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                      ¿No tienes una cuenta?
                    </p>
                    <Link href="/companyregister" className="inline-flex items-center space-x-2 text-[#348CCB] hover:text-white transition-colors group text-sm">
                      <span>Registra tu empresa</span>
                      <ChevronRight size={14} className="sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Error Popup - Fully responsive */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-2xl blur"></div>
            
            <div className="relative bg-gradient-to-br from-[#0A183A]/90 to-[#173D68]/60 backdrop-blur-lg p-5 sm:p-6 rounded-2xl shadow-2xl border border-red-500/30">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-full">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Error de autenticación
                  </h2>
                </div>
                <button 
                  onClick={() => setShowErrorPopup(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </button>
              </div>
              
              <p className="text-gray-300 text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed">
                {invalidCredentials 
                  ? "Las credenciales ingresadas son inválidas. Por favor verifica tu correo y contraseña." 
                  : error
                }
              </p>
              
              <button
                onClick={() => setShowErrorPopup(false)}
                className="w-full px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-lg transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}