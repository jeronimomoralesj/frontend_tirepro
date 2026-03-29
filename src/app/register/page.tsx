"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true); setError("");

    try {
      // Register
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!regRes.ok) {
        const data = await regRes.json().catch(() => ({}));
        throw new Error(data.message ?? "Error al registrar");
      }

      // Auto-login
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!loginRes.ok) throw new Error("Registro exitoso. Por favor inicia sesion.");
      const { access_token, user } = await loginRes.json();

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect based on whether they have a company
      if (user.companyId) {
        router.push("/dashboard/resumen");
      } else {
        router.push("/marketplace");
      }
    } catch (err: any) {
      setError(err.message ?? "Error al registrar");
    }
    setLoading(false);
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
          <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Contraseña (min. 6 caracteres)" required minLength={6} className={inputCls} />

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
