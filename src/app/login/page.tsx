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

const NAV_ITEMS = [
  { label: "Plataforma", href: "/#platform" },
  { label: "Planes",     href: "/#plans" },
  { label: "Contacto",   href: "/contact" },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Manejo de datos seguro",
    subtitle: "Encriptación de extremo a extremo",
  },
  {
    icon: Zap,
    title: "Analiza tus llantas en tiempo real",
    subtitle: "Monitoreo continuo y alertas inteligentes",
  },
  {
    icon: Users,
    title: "Soporte 24/7",
    subtitle: "Asistencia técnica especializada",
  },
];

export default function LoginPage() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [isScrolled, setIsScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);

  const auth   = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.user) {
      const user = auth.user as any;
      if (user.companyId) {
        router.push("/dashboard");
      } else {
        router.push("/marketplace");
      }
    }
  }, [auth.user, router]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.login(email, password);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Background decorations */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #f0f6fb 0%, #ffffff 60%, #e8f3fa 100%)" }}
      />
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "rgba(30,118,182,0.07)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "rgba(23,61,104,0.05)" }}
      />

      <div className="relative z-10">
        {/* -- Navbar -- */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            isScrolled
              ? "bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src={logoTire}
                  alt="TirePro"
                  height={25}
                  style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }}
                />
                <Image
                  src={logo}
                  alt="TirePro"
                  height={25}
                  style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }}
                />
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center space-x-8">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-gray-600 transition-colors"
                    style={{}}
                    onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
                    onMouseLeave={e => (e.currentTarget.style.color = "")}
                  >
                    {item.label}
                  </a>
                ))}
                <a
                  href="/blog"
                  className="text-sm font-medium text-gray-600 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
                  onMouseLeave={e => (e.currentTarget.style.color = "")}
                >
                  Blog
                </a>
                <a href="/companyregister">
                  <button
                    className="text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                    style={{ backgroundColor: "#1E76B6" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#173D68")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1E76B6")}
                  >
                    Comenzar
                  </button>
                </a>
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-lg transition-colors"
                style={{ color: "#0A183A" }}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
              <div className="px-6 py-4 space-y-4">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block text-sm font-medium text-gray-600 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <a href="/developers" className="block text-sm font-medium text-gray-600 transition-colors">
                  Desarrolladores
                </a>
                <a href="/companyregister">
                  <button
                    className="w-full mt-2 text-white px-6 py-3 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: "#1E76B6" }}
                  >
                    Comenzar
                  </button>
                </a>
              </div>
            </div>
          )}
        </nav>

        {/* -- Main -- */}
        <div className="flex flex-col lg:flex-row min-h-screen pt-20">

          {/* Left panel — feature showcase (desktop only) */}
          <div
            className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 relative"
            style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}
          >
            {/* Decorative blobs */}
            <div
              className="absolute top-20 right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ backgroundColor: "rgba(30,118,182,0.25)" }}
            />
            <div
              className="absolute bottom-20 left-20 w-32 h-32 rounded-full blur-2xl pointer-events-none"
              style={{ backgroundColor: "rgba(30,118,182,0.15)" }}
            />

            <div className="relative z-10 max-w-xl">
              <h1 className="text-5xl font-semibold mb-6 leading-tight text-white">
                Bienvenido{" "}
                <span style={{ color: "#1E76B6" }}>de nuevo!</span>
              </h1>

              <p className="text-xl mb-12 leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Inicia sesión para acceder a tu panel de control y gestionar tus datos de manera inteligente
              </p>

              <div className="space-y-6">
                {FEATURES.map(({ icon: Icon, title, subtitle }) => (
                  <div key={title} className="flex items-start space-x-4 group">
                    <div
                      className="rounded-xl p-3 border transition-all flex-shrink-0"
                      style={{
                        backgroundColor: "rgba(30,118,182,0.15)",
                        borderColor: "rgba(30,118,182,0.3)",
                      }}
                    >
                      <Icon size={20} style={{ color: "#1E76B6" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">{title}</p>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
            <div className="w-full max-w-md">

              {/* Mobile back */}
              <div className="lg:hidden mb-8">
                <Link
                  href="/"
                  className="inline-flex items-center space-x-2 text-gray-500 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
                  onMouseLeave={e => (e.currentTarget.style.color = "")}
                >
                  <ArrowLeft size={18} />
                  <span>Volver al inicio</span>
                </Link>
              </div>

              {/* Mobile logo */}
              <div className="lg:hidden text-center mb-8">
                <Link href="/" className="inline-flex items-center justify-center space-x-2 mb-4">
                  <Image
                    src={logoTire}
                    alt="TirePro"
                    width={32}
                    height={32}
                    style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }}
                  />
                  <Image
                    src={logo}
                    alt="TirePro"
                    width={120}
                    height={32}
                    style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }}
                  />
                </Link>
                <h1 className="text-2xl font-bold" style={{ color: "#0A183A" }}>
                  Bienvenido <span style={{ color: "#1E76B6" }}>de nuevo!</span>
                </h1>
              </div>

              {/* Form card */}
              <div
                className="bg-white rounded-3xl border p-8 shadow-xl"
                style={{
                  borderColor: "rgba(30,118,182,0.15)",
                  boxShadow: "0 8px 40px rgba(30,118,182,0.1)",
                }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold mb-2" style={{ color: "#0A183A" }}>
                    Inicia Sesión
                  </h2>
                  <p className="text-sm text-gray-500">Accede a tu cuenta TirePro</p>
                </div>

                {/* Error banner */}
                {error && (
                  <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <div className="flex items-start justify-between text-red-500">
                      <div className="flex items-start space-x-3">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{error}</p>
                      </div>
                      <button
                        onClick={() => setError("")}
                        className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold flex items-center gap-2"
                      style={{ color: "#0A183A" }}
                    >
                      <Mail size={16} style={{ color: "#1E76B6" }} />
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="nombre@tirepro.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                      style={{
                        border: `1.5px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(30,118,182,0.2)"}`,
                        backgroundColor: "#f8fafd",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#1E76B6")}
                      onBlur={e => (e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.4)" : "rgba(30,118,182,0.2)")}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold flex items-center gap-2"
                      style={{ color: "#0A183A" }}
                    >
                      <Lock size={16} style={{ color: "#1E76B6" }} />
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                        style={{
                          border: `1.5px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(30,118,182,0.2)"}`,
                          backgroundColor: "#f8fafd",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "#1E76B6")}
                        onBlur={e => (e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.4)" : "rgba(30,118,182,0.2)")}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: "#1E76B6" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#173D68")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#1E76B6")}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot password */}
                  <div className="flex justify-end">
                    <a
                      href="mailto:jeronimo.morales@merquellantas.com?subject=Olvide%20Mi%20contrase%C3%B1a&body=Querido%20equipo%20tirepro%2C%0A%0ASolicito%20un%20link%20de%20restablecer%20contrase%C3%B1a%20para%20mi%20cuenta%20con%20el%20siguiente%20correo%3A%20"
                      className="text-sm font-medium transition-colors"
                      style={{ color: "#1E76B6" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#173D68")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#1E76B6")}
                    >
                      Olvidé mi contraseña
                    </a>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-white shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#1E76B6" }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#173D68" }}
                    onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1E76B6" }}
                  >
                    {loading ? (
                      <>
                        <div
                          className="h-5 w-5 border-2 rounded-full animate-spin"
                          style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
                        />
                        <span>Ingresando...</span>
                      </>
                    ) : (
                      <>
                        <span>Iniciar Sesión</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-500 text-sm mb-4">¿No tienes una cuenta?</p>
                  <Link
                    href="/companyregister"
                    className="inline-flex items-center space-x-2 font-semibold transition-colors"
                    style={{ color: "#1E76B6" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#173D68")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#1E76B6")}
                  >
                    <span>Registra tu empresa</span>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}