"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, AlertCircle, Eye, EyeOff, Mail } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Auto-login was removed — the backend now creates accounts as
  // unverified, so the immediately-following login would fail with
  // "Please verify your email." Instead we show a success card telling
  // the user to check their inbox; they come back via the /verify link.
  const [registeredEmail, setRegisteredEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true); setError("");

    try {
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!regRes.ok) {
        const data = await regRes.json().catch(() => ({}));
        throw new Error(data.message ?? "Error al registrar");
      }
      setRegisteredEmail(form.email);
    } catch (err: any) {
      setError(err.message ?? "Error al registrar");
    }
    setLoading(false);
  }

  // Success state: account created, user must click the verification
  // link in their email within 48h or the auth-cleanup cron deletes it.
  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="flex justify-center mb-8">
            <Image src="/logo_full.png" alt="TirePro" width={120} height={36} className="h-8 w-auto" />
          </Link>

          <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: "rgba(30,118,182,0.10)" }}>
            <Mail className="w-7 h-7 text-[#1E76B6]" />
          </div>

          <h1 className="text-2xl font-black text-[#0A183A] mb-2">Revisa tu correo</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-1">
            Te enviamos un enlace de activación a
          </p>
          <p className="text-sm font-semibold text-[#0A183A] mb-6 break-all">{registeredEmail}</p>

          <div className="text-xs text-gray-400 leading-relaxed mb-8">
            Tienes <span className="font-semibold text-[#0A183A]">48 horas</span> para activar tu cuenta antes de que sea eliminada.
            Si no encuentras el correo, revisa la carpeta de spam.
          </div>

          <Link href="/login"
            className="block w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{ background: "#1E76B6" }}>
            Ir a inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm bg-[#f5f5f7] border border-transparent focus:border-[#1E76B6]/20 focus:bg-white focus:shadow-sm focus:outline-none text-[#0A183A] placeholder-gray-400 transition-all";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8">
          <Image src="/logo_full.png" alt="TirePro" width={120} height={36} className="h-8 w-auto" />
        </Link>

        <h1 className="text-2xl font-black text-[#0A183A] text-center mb-1">Crear cuenta</h1>
        <p className="text-sm text-gray-400 text-center mb-6">Accede al marketplace de llantas mas grande de Colombia</p>

        {error && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium mb-4">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre completo" required className={inputCls} />
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email" required className={inputCls} />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Contraseña (min. 6 caracteres)" required minLength={6} className={`${inputCls} pr-10`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A183A] transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:shadow-lg"
            style={{ background: "#1E76B6" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Crear cuenta gratis"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-5">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-[#1E76B6] font-semibold hover:underline">Ingresar</Link>
        </p>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] text-gray-400 uppercase tracking-wider">o</span></div>
        </div>

        <Link href="/companyregister"
          className="block w-full py-3 rounded-xl text-sm font-semibold text-[#0A183A] text-center border border-gray-200 hover:bg-[#f5f5f7] transition-colors">
          Registrar una empresa
        </Link>

        <p className="text-[10px] text-gray-300 text-center mt-6">
          Al crear una cuenta aceptas los <Link href="/legal" className="underline">terminos de servicio</Link>
        </p>
      </div>
    </div>
  );
}
