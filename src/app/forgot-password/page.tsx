"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle, Loader2 } from "lucide-react";
import logoTire from "../../../public/logo_tire.png";
import logo from "../../../public/logo_text.png";
import PublicNav from "../../components/PublicNav";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Por favor ingresa un correo válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      // Always show success — backend doesn't reveal whether the email exists
      if (res.ok) {
        setDone(true);
      } else {
        setError("No se pudo procesar tu solicitud. Intenta de nuevo.");
      }
    } catch {
      setError("Error de red. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F1F5F9" }}>
      <PublicNav />

      <main className="flex-1 flex items-center justify-center px-4 py-32">
        <div className="w-full max-w-md">
          {/* Card */}
          <div
            className="rounded-2xl bg-white p-8 sm:p-10"
            style={{ boxShadow: "0 8px 32px rgba(10,24,58,0.08)" }}
          >
            {/* Back to login */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold mb-6 transition-colors"
              style={{ color: "#64748B" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1E76B6")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
            >
              <ArrowLeft size={14} />
              VOLVER AL LOGIN
            </Link>

            {/* Logo */}
            <div className="flex items-center gap-2 mb-6">
              <Image src={logoTire} alt="" height={28}
                style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }} />
              <Image src={logo} alt="TirePro" height={28}
                style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }} />
            </div>

            {!done ? (
              <>
                <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0A183A", letterSpacing: "-0.4px" }}>
                  ¿Olvidaste tu contraseña?
                </h1>
                <p className="text-sm mb-6" style={{ color: "#64748B", lineHeight: 1.6 }}>
                  Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-2 tracking-wide" style={{ color: "#0A183A" }}>
                      CORREO ELECTRÓNICO
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        size={16}
                        style={{ color: "#94A3B8" }}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@empresa.com"
                        autoComplete="email"
                        autoFocus
                        disabled={submitting}
                        className="w-full pl-10 pr-3 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
                        style={{
                          background: "#F0F7FF",
                          border: "1.5px solid rgba(52,140,203,0.2)",
                          color: "#0A183A",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#1E76B6")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(52,140,203,0.2)")}
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      className="px-3 py-2.5 rounded-lg text-xs font-medium"
                      style={{
                        background: "rgba(239,68,68,0.06)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#dc2626",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Enviando...
                      </>
                    ) : (
                      "Enviar enlace de restablecimiento"
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs text-center" style={{ color: "#94A3B8" }}>
                    ¿Recordaste tu contraseña?{" "}
                    <Link href="/login" className="font-bold" style={{ color: "#1E76B6" }}>
                      Iniciar sesión
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                  style={{ background: "rgba(34,197,94,0.1)" }}
                >
                  <CheckCircle size={32} style={{ color: "#22c55e" }} />
                </div>
                <h1
                  className="text-2xl font-extrabold mb-3 text-center"
                  style={{ color: "#0A183A", letterSpacing: "-0.4px" }}
                >
                  Revisa tu correo
                </h1>
                <p className="text-sm text-center mb-6" style={{ color: "#64748B", lineHeight: 1.6 }}>
                  Si <span className="font-bold" style={{ color: "#0A183A" }}>{email}</span> está asociado a una
                  cuenta, te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <div
                  className="px-4 py-3 rounded-xl mb-6"
                  style={{
                    background: "#F0F7FF",
                    borderLeft: "3px solid #348CCB",
                  }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: "#0A183A" }}>
                    No olvides revisar:
                  </p>
                  <ul className="text-xs space-y-0.5" style={{ color: "#64748B" }}>
                    <li>• Tu bandeja de entrada</li>
                    <li>• La carpeta de spam o correo no deseado</li>
                    <li>• El enlace expira en 1 hora</li>
                  </ul>
                </div>

                <Link
                  href="/login"
                  className="block w-full text-center text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}
                >
                  Volver al login
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDone(false);
                    setEmail("");
                  }}
                  className="block w-full text-center mt-3 text-xs font-bold py-2 transition-colors"
                  style={{ color: "#64748B" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1E76B6")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                >
                  Enviar a otro correo
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
