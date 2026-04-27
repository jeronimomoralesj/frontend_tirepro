"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

// Three terminal states surfaced to the user:
//   • success  — account is now active, click → /login.
//   • expired  — token's 48-hour window passed (or the auth-cleanup cron
//                already deleted the row). User must register again.
//   • invalid  — generic failure (token never existed, network error, etc.)
type State = "loading" | "success" | "expired" | "invalid";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setMessage("Enlace de verificación inválido o incompleto.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/users/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok) {
          setState("success");
          setMessage(data?.message ?? "Correo verificado con éxito.");
          // Auto-redirect after a short pause so the user can see the
          // confirmation. Cleared if the component unmounts first.
          const t = setTimeout(() => router.push("/login"), 2500);
          return () => clearTimeout(t);
        }

        // Backend signals "expired" with the literal string in the message.
        // The verify endpoint also returns 400 for genuinely-bad tokens —
        // the message is the only differentiator, so check it explicitly.
        const msg = String(data?.message ?? "");
        if (/expired|expirad/i.test(msg)) {
          setState("expired");
          setMessage("Tu enlace de verificación ya expiró. Vuelve a registrarte para obtener uno nuevo.");
        } else {
          setState("invalid");
          setMessage(msg || "El enlace de verificación es inválido.");
        }
      } catch {
        if (cancelled) return;
        setState("invalid");
        setMessage("No pudimos contactar el servidor. Intenta de nuevo más tarde.");
      }
    })();

    return () => { cancelled = true; };
  }, [token, router]);

  // Visual variant per state — single source of truth for icon + accent color.
  const variant = {
    loading:  { icon: Loader2,      color: "#1E76B6", title: "Verificando…",            spin: true  },
    success:  { icon: CheckCircle2, color: "#22c55e", title: "Cuenta verificada",       spin: false },
    expired:  { icon: Clock,        color: "#f59e0b", title: "Enlace expirado",         spin: false },
    invalid:  { icon: AlertCircle,  color: "#ef4444", title: "Enlace no válido",        spin: false },
  }[state];
  const Icon = variant.icon;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="flex justify-center mb-8">
          <Image src="/logo_full.png" alt="TirePro" width={120} height={36} className="h-8 w-auto" />
        </Link>

        <div
          className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
          style={{ background: variant.color + "1a" }}
        >
          <Icon
            className={`w-7 h-7 ${variant.spin ? "animate-spin" : ""}`}
            style={{ color: variant.color }}
          />
        </div>

        <h1 className="text-2xl font-black text-[#0A183A] mb-3">{variant.title}</h1>

        {message && (
          <p className="text-sm text-gray-500 leading-relaxed mb-6 px-2">
            {message}
          </p>
        )}

        {state === "success" && (
          <Link href="/login"
            className="block w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{ background: "#1E76B6" }}>
            Iniciar sesión
          </Link>
        )}

        {state === "expired" && (
          <Link href="/register"
            className="block w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{ background: "#1E76B6" }}>
            Volver a registrarme
          </Link>
        )}

        {state === "invalid" && (
          <div className="space-y-2">
            <Link href="/login"
              className="block w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
              style={{ background: "#1E76B6" }}>
              Ir a inicio de sesión
            </Link>
            <Link href="/register"
              className="block w-full py-3 rounded-xl text-sm font-semibold text-[#0A183A] border border-gray-200 hover:bg-[#f5f5f7] transition-colors">
              Crear una cuenta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-[#1E76B6] animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
