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
} from "lucide-react";
import Image from "next/image";
import logo from "../../../public/logo_text.png";

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
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-[#0A183A] to-[#173D68]">
      {/* Left Panel - Branding / Info */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 text-white">
        <div className="mb-8">
          <Image
            src={logo}
            alt="TirePro Logo"
            className="w-auto h-12 filter brightness-0 invert"
            priority
          />
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
          Bienvenido <span className="text-[#348CCB]">de nuevo!</span>
        </h1>
        <p className="text-lg md:text-xl opacity-80 mb-8">
          Inicia sesión para manejar tus datos
        </p>
        <div className="hidden md:block">
          <div className="flex items-center space-x-4 mb-6">
            <div className="rounded-full bg-[#1E76B6]/20 p-2">
              <CheckCircle size={20} className="text-[#348CCB]" />
            </div>
            <p className="opacity-90">Manejo de datos seguro</p>
          </div>
          <div className="flex items-center space-x-4 mb-6">
            <div className="rounded-full bg-[#1E76B6]/20 p-2">
              <CheckCircle size={20} className="text-[#348CCB]" />
            </div>
            <p className="opacity-90">Analiza tus llantas en tiempo real</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-[#1E76B6]/20 p-2">
              <CheckCircle size={20} className="text-[#348CCB]" />
            </div>
            <p className="opacity-90">Soporte 24/7</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-10 w-full max-w-md border border-white/10">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Inicia Sesión
          </h2>
          
          {/* Error Alert */}
          {invalidCredentials && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
              <div className="flex items-center text-red-400">
                <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                <p>Credenciales inválidas. Por favor verifica tu correo y contraseña.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#348CCB] flex items-center gap-2">
                <Mail size={16} />
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="nombre@tirepro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    invalidCredentials ? "border-red-500" : "border-[#348CCB]/30"
                  } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all`}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#348CCB] flex items-center gap-2">
                <Lock size={16} />
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    invalidCredentials ? "border-red-500" : "border-[#348CCB]/30"
                  } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a
                href="mailto:jeronimo.morales@merquellantas.com?subject=Olvide%20Mi%20contrase%C3%B1a&body=Querido%20equipo%20tirepro%2C%0A%0ASolicito%20un%20link%20de%20restablecer%20contrase%C3%B1a%20para%20mi%20cuenta%20con%20el%20siguiente%20correo%3A%20"
                className="text-sm text-[#348CCB] hover:text-[#1E76B6] transition-colors"
              >
                Olvidé mi contraseña
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] hover:from-[#348CCB] hover:to-[#1E76B6] text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <p className="text-white/70 text-sm">
              ¿No tienes una cuenta?{" "}
              <a href="/companyregister" className="text-[#348CCB] hover:underline">
                Regístrate
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center text-red-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                Error de autenticación
              </h2>
              <button onClick={() => setShowErrorPopup(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {invalidCredentials ? (
              <p className="mt-4">Las credenciales ingresadas son inválidas. Por favor verifica tu correo y contraseña.</p>
            ) : (
              <p className="mt-4">{error}</p>
            )}
            <button
              onClick={() => setShowErrorPopup(false)}
              className="mt-4 px-4 py-2 bg-[#1E76B6] text-white rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}