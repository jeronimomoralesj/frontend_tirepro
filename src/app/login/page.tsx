"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthProvider";
import {
  Mail,
  Lock,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Menu,
  ArrowLeft,
  Shield,
  Zap,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/logo_text.png";
import logoTire from "../../../public/logo_tire.png"

// Language content object
const content = {
  en: {
    // Navigation
    platform: "Platform",
    blog: "Blog",
    plans: "Plans",
    contact: "Contact",
    login: "Login",
    getStarted: "Get Started",
    
    // Main content
    welcomeBack: "Welcome",
    back: "back!",
    loginSubtitle: "Sign in to access your control panel and manage your data intelligently",
    
    // Features
    secureDataHandling: "Secure data handling",
    endToEndEncryption: "End-to-end encryption",
    realTimeAnalysis: "Analyze your tires in real time",
    continuousMonitoring: "Continuous monitoring and smart alerts",
    support247: "24/7 Support",
    specializedTechnicalAssistance: "Specialized technical assistance",
    
    // Form
    backToHome: "Back to home",
    signIn: "Sign In",
    accessYourAccount: "Access your TirePro account",
    email: "Email",
    emailPlaceholder: "name@tirepro.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    forgotPassword: "Forgot my password",
    signingIn: "Signing in...",
    signInButton: "Sign In",
    
    // Errors
    invalidCredentials: "Invalid credentials",
    invalidCredentialsMessage: "Please verify your email and password.",
    authenticationError: "Authentication error",
    invalidCredentialsLong: "The entered credentials are invalid. Please verify your email and password.",
    understood: "Understood",
    unexpectedError: "An unexpected error occurred",
    
    // Registration
    noAccount: "Don't have an account?",
    registerCompany: "Register your company"
  },
  es: {
    // Navigation
    platform: "Plataforma",
    blog: "Blog",
    plans: "Planes",
    contact: "Contact",
    login: "Ingresar",
    getStarted: "Comenzar",
    
    // Main content
    welcomeBack: "Bienvenido",
    back: "de nuevo!",
    loginSubtitle: "Inicia sesión para acceder a tu panel de control y gestionar tus datos de manera inteligente",
    
    // Features
    secureDataHandling: "Manejo de datos seguro",
    endToEndEncryption: "Encriptación de extremo a extremo",
    realTimeAnalysis: "Analiza tus llantas en tiempo real",
    continuousMonitoring: "Monitoreo continuo y alertas inteligentes",
    support247: "Soporte 24/7",
    specializedTechnicalAssistance: "Asistencia técnica especializada",
    
    // Form
    backToHome: "Volver al inicio",
    signIn: "Inicia Sesión",
    accessYourAccount: "Accede a tu cuenta TirePro",
    email: "Correo Electrónico",
    emailPlaceholder: "nombre@tirepro.com",
    password: "Contraseña",
    passwordPlaceholder: "••••••••",
    forgotPassword: "Olvidé mi contraseña",
    signingIn: "Ingresando...",
    signInButton: "Iniciar Sesión",
    
    // Errors
    invalidCredentials: "Credenciales inválidas",
    invalidCredentialsMessage: "Por favor verifica tu correo y contraseña.",
    authenticationError: "Error de autenticación",
    invalidCredentialsLong: "Las credenciales ingresadas son inválidas. Por favor verifica tu correo y contraseña.",
    understood: "Entendido",
    unexpectedError: "Ocurrió un error inesperado",
    
    // Registration
    noAccount: "¿No tienes una cuenta?",
    registerCompany: "Registra tu empresa"
  }
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState("es"); // Default to Spanish
  const [isUSLocation, setIsUSLocation] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Get current content based on language
  const t = content[language];

  // Navigation items based on location
  const getNavItems = () => {
    const baseItems = [
      { key: 'platform', href: '/#platform' },
      { key: 'plans', href: '/#plans' },
      { key: 'contact', href: '/contact' }
    ];

    // Only add blog for non-US locations
    if (!isUSLocation) {
      baseItems.splice(1, 0, { key: 'blog', href: '/blog' });
    }

    return baseItems;
  };

  // Geolocation and language detection
  useEffect(() => {
    const detectLanguageFromLocation = async () => {
      try {
        // First, try to get user's position
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 300000 // Cache for 5 minutes
          });
        });

        // Use reverse geocoding to get country information
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
        );
        
        if (response.ok) {
          const data = await response.json();
          const countryCode = data.countryCode;
          
          // Set language and location based on country
          if (countryCode === 'US') {
            setLanguage('en');
            setIsUSLocation(true);
          } else {
            // Default to Spanish for all other countries
            setLanguage('es');
            setIsUSLocation(false);
          }
          
          console.log(`Location detected: ${data.countryName} (${countryCode}), Language set to: ${countryCode === 'US' ? 'English' : 'Spanish'}, US Location: ${countryCode === 'US'}`);
        }
      } catch (error) {
        console.log('Geolocation failed, using browser language as fallback:', error);
        
        // Fallback to browser language detection
        const browserLang = navigator.language || navigator.languages?.[0] || 'es';
        
        if (browserLang.startsWith('en')) {
          setLanguage('en');
          setIsUSLocation(true); // Assume US if English browser
        } else {
          setLanguage('es');
          setIsUSLocation(false);
        }
        
        console.log(`Browser language detected: ${browserLang}, Language set to: ${browserLang.startsWith('en') ? 'English' : 'Spanish'}, US Location: ${browserLang.startsWith('en')}`);
      }
    };

    detectLanguageFromLocation();
  }, []);

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
        setError(t.invalidCredentials);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.unexpectedError);
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
        {/* Mobile Menu Blur Overlay */}
      <div className={`fixed inset-0 z-40 transition-all duration-500 ${
        isMobileMenuOpen 
          ? 'backdrop-blur-3xl bg-black/60 opacity-100' 
          : 'opacity-0 pointer-events-none'
      }`} onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Enhanced Floating Liquid Glass Navbar */}
      <nav className={`fixed top-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] max-w-6xl z-50 transition-all duration-700 rounded-2xl ${
        isScrolled 
          ? 'backdrop-blur-2xl bg-gradient-to-r from-white/15 via-white/8 to-white/15 border border-white/30 shadow-2xl' 
          : 'backdrop-blur-xl bg-gradient-to-r from-white/8 via-transparent to-white/8 border border-white/20 shadow-xl'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/15 via-transparent to-[#348CCB]/15 opacity-60 rounded-2xl"></div>
        
        <div className="px-6 sm:px-8 lg:px-10 relative">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 relative z-10">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
                  <Link href="/"><div className="flex items-center space-x-2">
              <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
              <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
            </div></Link>
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 relative z-10">
              {getNavItems().map((item, i) => (
                <a 
                  key={i}
                  href={item.href} 
                  className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                  <span className="relative z-10">{t[item.key]}</span>
                </a>
              ))}
            </div>

            {/* CTA Buttons with Language Toggle */}
            <div className="hidden md:flex items-center space-x-3 relative z-10">
              
              <a href='/login'><button className="px-4 py-2 rounded-xl border border-[#348CCB]/60 text-black backdrop-blur-lg bg-white/10 hover:bg-[#348CCB]/20 hover:border-[#348CCB] transition-all duration-300 hover:shadow-lg">
                {t.login}
              </button></a>
              <a href='/companyregister'><button className="px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-xl backdrop-blur-sm hover:shadow-xl hover:shadow-[#348CCB]/30 transition-all duration-300 hover:scale-105">
                {t.getStarted}
              </button></a>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-1 rounded-xl backdrop-blur-lg bg-white/15 hover:bg-white/25 transition-all duration-300 relative z-50 border border-white/20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="relative">
                <Menu className={`w-6 h-6 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-45' : 'opacity-100'}`} />
                <X className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 -rotate-45'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced Floating Mobile Menu */}
        <div className={`md:hidden absolute top-full left-1/2 transform -translate-x-1/2 w-full mt-4 z-50 transition-all duration-500 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'
        }`}>
          <div className="mx-4 rounded-3xl backdrop-blur-3xl bg-gradient-to-br from-white/25 via-white/15 to-white/20 border-2 border-white/40 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 via-transparent to-[#1E76B6]/20 rounded-3xl"></div>
            
            <div className="relative p-5 space-y-6">
              {getNavItems().map((item, i) => (
                <a 
                  key={i}
                  href={item.href}
                  className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t[item.key]}
                </a>
              ))}
              
              <div className="pt-2 border-t border-white/30 space-y-4">
                <a href='/login'><button className="w-full py-2 px-6 rounded-2xl border-2 border-[#348CCB]/70 text-black font-semibold text-lg backdrop-blur-sm bg-white/15 hover:bg-[#348CCB]/20 transition-all duration-300 mb-3">
                  {t.login}
                </button></a>
                <a href='/registerCompany'><button className="w-full py-2 px-6 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-2xl backdrop-blur-sm hover:shadow-xl font-semibold text-lg transition-all duration-300">
                  {t.getStarted}
                </button></a>
              </div>
            </div>
          </div>
        </div>
      </nav>

        {/* Main Content - Enhanced responsive layout */}
        <div className="flex flex-col lg:flex-row min-h-screen pt-24 sm:pt-28">
          {/* Left Panel - Enhanced responsive branding */}
          <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center p-8 xl:p-16 relative">
            {/* Decorative Elements - Responsive sizing */}
            <div className="absolute top-20 right-20 w-24 h-24 xl:w-32 xl:h-32 bg-gradient-to-br from-[#348CCB]/10 to-purple-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-20 left-20 w-16 h-16 xl:w-24 xl:h-24 bg-gradient-to-br from-purple-500/10 to-[#348CCB]/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="mb-8 lg:mb-12">
                <div className="flex items-center space-x-3 mb-6 lg:mb-8">
                  <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-r from-[#348CCB]/20 to-purple-500/20 border border-[#173D68]/30">
                    <Link href="/"><Image src={logoTire} alt="TirePro" width={20}  className='lg:w-auto lg:h-6 filter brightness-0 invert'/></Link>
                  </div>
                  <Link href="/"><Image
                    src={logo}
                    alt="TirePro Logo"
                    className="w-auto lg:h-8 filter brightness-0 invert"
                    priority
                  /></Link>
                </div>
              </div>

              <h1 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold mb-4 lg:mb-6 leading-tight">
                {t.welcomeBack}{" "}
                <span className="bg-gradient-to-r from-[#348CCB] to-purple-400 bg-clip-text text-transparent">
                  {t.back}
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-gray-300 mb-8 lg:mb-12 leading-relaxed">
                {t.loginSubtitle}
              </p>

              {/* Enhanced Feature List - Responsive */}
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center space-x-3 lg:space-x-4 group">
                  <div className="rounded-xl bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 p-2 lg:p-3 border border-[#348CCB]/30 group-hover:border-[#348CCB]/50 transition-all">
                    <Shield size={16} className="lg:w-5 lg:h-5 text-[#348CCB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm lg:text-base">{t.secureDataHandling}</p>
                    <p className="text-xs lg:text-sm text-gray-400">{t.endToEndEncryption}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 lg:space-x-4 group">
                  <div className="rounded-xl bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 p-2 lg:p-3 border border-[#348CCB]/30 group-hover:border-[#348CCB]/50 transition-all">
                    <Zap size={16} className="lg:w-5 lg:h-5 text-[#348CCB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm lg:text-base">{t.realTimeAnalysis}</p>
                    <p className="text-xs lg:text-sm text-gray-400">{t.continuousMonitoring}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 lg:space-x-4 group">
                  <div className="rounded-xl bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 p-2 lg:p-3 border border-[#348CCB]/30 group-hover:border-[#348CCB]/50 transition-all">
                    <Users size={16} className="lg:w-5 lg:h-5 text-[#348CCB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm lg:text-base">{t.support247}</p>
                    <p className="text-xs lg:text-sm text-gray-400">{t.specializedTechnicalAssistance}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Fully responsive login form */}
          <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 min-h-screen lg:min-h-0">
            <div className="w-full max-w-md">
              {/* Back Button for Mobile - Enhanced */}
              <div className="lg:hidden mb-6 sm:mb-8">
                <Link href="/" className="inline-flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm">
                  <ArrowLeft size={18} />
                  <span>{t.backToHome}</span>
                </Link>
              </div>

              {/* Mobile Logo and Language Toggle - Responsive */}
              <div className="lg:hidden text-center mb-6 sm:mb-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-[#348CCB]/20 to-purple-500/20 border border-[#173D68]/30">
                      <Link href="/"><Image src={logoTire} alt="TirePro" height={20} className='sm:w-6 sm:h-6 filter brightness-0 invert'/></Link>
                    </div>
                    <Link href="/"><Image 
                      src={logo} 
                      alt="TirePro" 
                      width={100} 
                      className="sm:w-[120px] sm:h-[32px] filter brightness-0 invert"
                    /></Link>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {t.welcomeBack} <span className="text-[#348CCB]">{t.back}</span>
                </h1>
              </div>

              {/* Enhanced Form Container - Fully responsive with liquid glass effect */}
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#348CCB]/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur"></div>
                
                <div className="relative backdrop-blur-2xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 border-2 border-white/20 hover:border-white/30 transition-all duration-300">
                  {/* Liquid glass overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/5 via-transparent to-purple-500/5 rounded-3xl"></div>
                  
                  <div className="relative z-10">
                    <div className="text-center mb-6 sm:mb-8">
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                        {t.signIn}
                      </h2>
                      <p className="text-gray-300 text-sm">
                        {t.accessYourAccount}
                      </p>
                    </div>
                    
                    {/* Enhanced Error Alert - Responsive */}
                    {invalidCredentials && (
                      <div className="mb-4 sm:mb-6 p-3 sm:p-4 backdrop-blur-xl bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/30 rounded-2xl">
                        <div className="flex items-start text-red-300">
                          <div className="p-1 bg-red-500/20 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-0.5 backdrop-blur-sm">
                            <AlertCircle size={12} className="sm:w-3.5 sm:h-3.5" />
                          </div>
                          <div>
                            <p className="font-medium text-xs sm:text-sm">Credenciales inválidas</p>
                            <p className="text-xs text-red-200 mt-1 leading-relaxed">Por favor verifica tu correo y contraseña.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white flex items-center gap-2">
                          <Mail size={14} className="sm:w-4 sm:h-4 text-[#348CCB]" />
                          {t.email}
                        </label>
                        <div className="relative group">
                          <input
                            type="email"
                            placeholder="nombre@tirepro.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base backdrop-blur-xl bg-white/5 border ${
                              invalidCredentials ? "border-red-500/50" : "border-white/20"
                            } rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-[#348CCB]/60 focus:ring-1 focus:ring-[#348CCB]/30 transition-all group-hover:border-white/30 hover:bg-white/10`}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white flex items-center gap-2">
                          <Lock size={14} className="sm:w-4 sm:h-4 text-[#348CCB]" />
                          {t.password}
                        </label>
                        <div className="relative group">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base backdrop-blur-xl bg-white/5 border ${
                              invalidCredentials ? "border-red-500/50" : "border-white/20"
                            } rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-[#348CCB]/60 focus:ring-1 focus:ring-[#348CCB]/30 transition-all group-hover:border-white/30 hover:bg-white/10 pr-10 sm:pr-12`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-[#348CCB] transition-colors p-1 rounded-lg hover:bg-white/10 backdrop-blur-sm"
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
                          {t.forgotPassword}
                        </a>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#348CCB] to-[#1E76B6] hover:from-[#1E76B6] hover:to-[#348CCB] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl hover:shadow-[#348CCB]/25 disabled:opacity-70 disabled:cursor-not-allowed group backdrop-blur-sm border border-[#348CCB]/20 hover:scale-105"
                      >
                        {loading ? (
                          <>
                            <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Ingresando...</span>
                          </>
                        ) : (
                          <>
                            <span>{t.login}</span>
                            <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-6 sm:mt-8 text-center">
                      <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">
                        {t.noAccount}
                      </p>
                      <Link href="/companyregister" className="inline-flex items-center space-x-2 text-[#348CCB] hover:text-white transition-colors group text-sm">
                        <span>{t.registerCompany}</span>
                        <ChevronRight size={14} className="sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
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