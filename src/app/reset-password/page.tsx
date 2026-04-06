"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import logoTire from "../../../public/logo_tire.png";
import logo from "../../../public/logo_text.png";
import PublicNav from "../../components/PublicNav";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      return;
    }
    fetch(`${API_BASE}/auth/validate-reset-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        setTokenValid(!!data.valid);
        if (data.email) setTokenEmail(data.email);
      })
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  // Password strength check
  const passwordStrength = (() => {
    if (password.length === 0) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score, label: "Débil", color: "#ef4444" };
    if (score <= 3) return { score, label: "Media", color: "#f97316" };
    return { score, label: "Fuerte", color: "#22c55e" };
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setError(data.message || "No se pudo restablecer la contraseña.");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (validating) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#F1F5F9" }}>
        <PublicNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-3" size={32} style={{ color: "#1E76B6" }} />
            <p className="text-sm font-medium" style={{ color: "#64748B" }}>
              Validando enlace...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Invalid token state ──────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#F1F5F9" }}>
        <PublicNav />
        <main className="flex-1 flex items-center justify-center px-4 py-32">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white p-8 sm:p-10"
              style={{ boxShadow: "0 8px 32px rgba(10,24,58,0.08)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                style={{ background: "rgba(239,68,68,0.1)" }}>
                <AlertCircle size={32} style={{ color: "#ef4444" }} />
              </div>
              <h1 className="text-2xl font-extrabold mb-3 text-center"
                style={{ color: "#0A183A", letterSpacing: "-0.4px" }}>
                Enlace inválido o expirado
              </h1>
              <p className="text-sm text-center mb-6" style={{ color: "#64748B", lineHeight: 1.6 }}>
                Este enlace de restablecimiento ya no es válido. Los enlaces expiran después de 1 hora
                o si ya fueron utilizados.
              </p>

              <Link href="/forgot-password"
                className="block w-full text-center text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg mb-3"
                style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}>
                Solicitar nuevo enlace
              </Link>
              <Link href="/login"
                className="block w-full text-center text-xs font-bold py-2"
                style={{ color: "#64748B" }}>
                Volver al login
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#F1F5F9" }}>
        <PublicNav />
        <main className="flex-1 flex items-center justify-center px-4 py-32">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white p-8 sm:p-10"
              style={{ boxShadow: "0 8px 32px rgba(10,24,58,0.08)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                style={{ background: "rgba(34,197,94,0.1)" }}>
                <CheckCircle size={32} style={{ color: "#22c55e" }} />
              </div>
              <h1 className="text-2xl font-extrabold mb-3 text-center"
                style={{ color: "#0A183A", letterSpacing: "-0.4px" }}>
                ¡Contraseña actualizada!
              </h1>
              <p className="text-sm text-center mb-6" style={{ color: "#64748B", lineHeight: 1.6 }}>
                Tu contraseña ha sido restablecida correctamente. Te redirigiremos al login en unos segundos.
              </p>
              <Link href="/login"
                className="block w-full text-center text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}>
                Ir al login ahora
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Reset form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F1F5F9" }}>
      <PublicNav />
      <main className="flex-1 flex items-center justify-center px-4 py-32">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-8 sm:p-10"
            style={{ boxShadow: "0 8px 32px rgba(10,24,58,0.08)" }}>

            <Link href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold mb-6 transition-colors"
              style={{ color: "#64748B" }}>
              <ArrowLeft size={14} />
              VOLVER AL LOGIN
            </Link>

            <div className="flex items-center gap-2 mb-6">
              <Image src={logoTire} alt="" height={28}
                style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }} />
              <Image src={logo} alt="TirePro" height={28}
                style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }} />
            </div>

            <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0A183A", letterSpacing: "-0.4px" }}>
              Crear nueva contraseña
            </h1>
            <p className="text-sm mb-6" style={{ color: "#64748B", lineHeight: 1.6 }}>
              {tokenEmail ? (
                <>Establece una nueva contraseña para <span className="font-bold" style={{ color: "#0A183A" }}>{tokenEmail}</span></>
              ) : (
                "Establece una nueva contraseña para tu cuenta."
              )}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div>
                <label className="block text-xs font-bold mb-2 tracking-wide" style={{ color: "#0A183A" }}>
                  NUEVA CONTRASEÑA
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "#94A3B8" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    autoFocus
                    disabled={submitting}
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
                    style={{
                      background: "#F0F7FF",
                      border: "1.5px solid rgba(52,140,203,0.2)",
                      color: "#0A183A",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#1E76B6")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(52,140,203,0.2)")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                    aria-label={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showPassword ? <EyeOff size={16} style={{ color: "#94A3B8" }} /> : <Eye size={16} style={{ color: "#94A3B8" }} />}
                  </button>
                </div>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            background: passwordStrength.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-bold mb-2 tracking-wide" style={{ color: "#0A183A" }}>
                  CONFIRMAR CONTRASEÑA
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "#94A3B8" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    disabled={submitting}
                    className="w-full pl-10 pr-3 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
                    style={{
                      background: "#F0F7FF",
                      border: confirm && confirm !== password
                        ? "1.5px solid rgba(239,68,68,0.4)"
                        : "1.5px solid rgba(52,140,203,0.2)",
                      color: "#0A183A",
                    }}
                  />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[11px] mt-1.5 font-medium" style={{ color: "#ef4444" }}>
                    Las contraseñas no coinciden
                  </p>
                )}
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
                disabled={submitting || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)" }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Actualizando...
                  </>
                ) : (
                  "Restablecer contraseña"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F1F5F9" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#1E76B6" }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
