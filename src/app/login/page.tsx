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
import logoTire from "../../../public/logo_tire.png";

// Language content object
const content = {
  es: {
    // Navigation
    platform: "Plataforma",
    blog: "Blog",
    plans: "Planes",
    contact: "Contacto",
    login: "Ingresar",
    getStarted: "Comenzar",
    developers: "Desarrolladores",
    
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
  const [language, setLanguage] = useState("es");
  const auth = useAuth();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const t = content[language];

  const getNavItems = () => {
    const baseItems = [
      { key: 'platform', href: '/#platform' },
      { key: 'plans', href: '/#plans' },
      { key: 'contact', href: '/contact' }
    ];
    return baseItems;
  };

  useEffect(() => {
    const detectLanguageFromLocation = async () => {
      setLanguage('es');
    };

    detectLanguageFromLocation();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      await auth.login(email, password);
    } catch (err: unknown) {
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
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-transparent to-blue-900/20"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Navbar */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
        }`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link href="/" className="flex items-center space-x-2">
                <Image src={logoTire} alt="TirePro" height={25} className='filter brightness-0 invert'/>
                <Image src={logo} height={25} alt='logo' className='filter brightness-0 invert'/>
              </Link>

              <div className="hidden md:flex items-center space-x-8">
                {getNavItems().map((item) => (
                  <a 
                    key={item.key}
                    href={item.href} 
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {t[item.key]}
                  </a>
                ))}
                <a href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">{t.login}</a>
                <a href="/developers" className="text-sm text-gray-400 hover:text-white transition-colors">{t.developers}</a>
                <a href="/companyregister">
                  <button className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-all">
                    {t.getStarted}
                  </button>
                </a>
              </div>

              <button 
                className="md:hidden p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden bg-black border-t border-white/10">
              <div className="px-6 py-4 space-y-4">
                {getNavItems().map((item) => (
                  <a 
                    key={item.key}
                    href={item.href} 
                    className="block text-gray-400 hover:text-white transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t[item.key]}
                  </a>
                ))}
                <a href="/login" className="block text-gray-400 hover:text-white transition-colors">{t.login}</a>
                <a href="/developers" className="block text-gray-400 hover:text-white transition-colors">{t.developers}</a>
                <a href="/companyregister">
                  <button className="w-full bg-white text-black px-6 py-3 rounded-full text-sm font-medium">
                    {t.getStarted}
                  </button>
                </a>
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row min-h-screen pt-20">
          {/* Left Panel - Feature Showcase */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 relative">
            <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 max-w-xl">
              <h1 className="text-5xl font-semibold mb-6 leading-tight">
                {t.welcomeBack}{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {t.back}
                </span>
              </h1>
              
              <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                {t.loginSubtitle}
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4 group">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10 group-hover:border-white/20 transition-all">
                    <Shield size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{t.secureDataHandling}</p>
                    <p className="text-sm text-gray-400">{t.endToEndEncryption}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 group">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10 group-hover:border-white/20 transition-all">
                    <Zap size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{t.realTimeAnalysis}</p>
                    <p className="text-sm text-gray-400">{t.continuousMonitoring}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 group">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10 group-hover:border-white/20 transition-all">
                    <Users size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{t.support247}</p>
                    <p className="text-sm text-gray-400">{t.specializedTechnicalAssistance}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
            <div className="w-full max-w-md">
              {/* Mobile Back Button */}
              <div className="lg:hidden mb-8">
                <Link href="/" className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft size={18} />
                  <span>{t.backToHome}</span>
                </Link>
              </div>

              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-8">
                <Link href="/" className="inline-flex items-center justify-center space-x-2 mb-4">
                  <Image src={logoTire} alt="TirePro" width={32} height={32} className='filter brightness-0 invert'/>
                  <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
                </Link>
                <h1 className="text-2xl font-bold">
                  {t.welcomeBack} <span className="text-blue-400">{t.back}</span>
                </h1>
              </div>

              {/* Form Container */}
              <div className="bg-white/5 rounded-3xl border border-white/10 backdrop-blur-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {t.signIn}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {t.accessYourAccount}
                  </p>
                </div>
                
                {/* Error Alert */}
                {invalidCredentials && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start text-red-400">
                      <AlertCircle size={18} className="mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{t.invalidCredentials}</p>
                        <p className="text-xs text-red-300 mt-1">{t.invalidCredentialsMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <Mail size={16} className="text-blue-400" />
                      {t.email}
                    </label>
                    <input
                      type="email"
                      placeholder={t.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-4 py-3 bg-white/5 border ${
                        invalidCredentials ? "border-red-500/50" : "border-white/10"
                      } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <Lock size={16} className="text-blue-400" />
                      {t.password}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={t.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full px-4 py-3 bg-white/5 border ${
                          invalidCredentials ? "border-red-500/50" : "border-white/10"
                        } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-12`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <a
                      href="mailto:jeronimo.morales@merquellantas.com?subject=Olvide%20Mi%20contrase%C3%B1a&body=Querido%20equipo%20tirepro%2C%0A%0ASolicito%20un%20link%20de%20restablecer%20contrase%C3%B1a%20para%20mi%20cuenta%20con%20el%20siguiente%20correo%3A%20"
                      className="text-sm text-blue-400 hover:text-white transition-colors"
                    >
                      {t.forgotPassword}
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                        <span>{t.signingIn}</span>
                      </>
                    ) : (
                      <>
                        <span>{t.signInButton}</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-400 text-sm mb-4">
                    {t.noAccount}
                  </p>
                  <Link href="/companyregister" className="inline-flex items-center space-x-2 text-blue-400 hover:text-white transition-colors">
                    <span>{t.registerCompany}</span>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-black/90 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-red-500/30 max-w-sm w-full">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  {t.authenticationError}
                </h2>
              </div>
              <button 
                onClick={() => setShowErrorPopup(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-300 text-sm mb-6">
              {invalidCredentials ? t.invalidCredentialsLong : error}
            </p>
            
            <button
              onClick={() => setShowErrorPopup(false)}
              className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-medium"
            >
              {t.understood}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}