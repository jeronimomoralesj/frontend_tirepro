"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type State = "idle" | "submitting" | "success" | "error";

interface Props {
  // Where on the site the user signed up — feeds into the backend log so
  // we can attribute waitlist growth per surface.
  source: "landing-teaser" | "marketplace-teaser" | "axon-page";
  // Visual variant. "monumental" → full-viewport hero treatment; "compact"
  // → inline band treatment used on the marketplace teaser.
  variant?: "monumental" | "compact";
}

export default function AxonWaitlistForm({ source, variant = "monumental" }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Ingresa un correo válido");
      return;
    }
    setState("submitting");
    try {
      const res = await fetch("/api/axon/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No pudimos registrar tu correo");
      }
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  const isMonumental = variant === "monumental";

  if (state === "success") {
    return (
      <div
        className={`mx-auto inline-flex items-center gap-3 rounded-full border border-[#62b8f0]/40 bg-[#62b8f0]/10 text-white backdrop-blur-md ${
          isMonumental ? "px-7 py-4" : "px-5 py-3"
        }`}
      >
        <Check className="w-5 h-5 text-[#62b8f0]" />
        <span className={`font-bold ${isMonumental ? "text-base" : "text-sm"}`}>
          Estás en la lista. Te avisaremos antes que a nadie.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`mx-auto w-full ${isMonumental ? "max-w-xl" : "max-w-md"}`}
      noValidate
    >
      <div
        className={`relative flex items-center rounded-full border bg-white/[0.04] backdrop-blur-md transition-all ${
          state === "error"
            ? "border-red-400/60 shadow-[0_0_0_4px_rgba(248,113,113,0.12)]"
            : "border-white/15 focus-within:border-[#62b8f0]/60 focus-within:shadow-[0_0_0_4px_rgba(98,184,240,0.18)]"
        } ${isMonumental ? "p-1.5" : "p-1"}`}
      >
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          aria-label="Correo electrónico"
          className={`flex-1 bg-transparent text-white placeholder-white/30 outline-none font-medium ${
            isMonumental ? "px-5 py-3 text-base" : "px-4 py-2 text-sm"
          }`}
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className={`inline-flex items-center gap-2 rounded-full bg-white text-[#0A183A] font-black uppercase tracking-wider transition-transform active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#62b8f0] hover:text-[#0A183A] ${
            isMonumental ? "px-6 py-3 text-xs" : "px-4 py-2 text-[11px]"
          }`}
        >
          {state === "submitting" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Enviando
            </>
          ) : (
            <>
              Avísame
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {error && (
        <p className={`mt-3 text-center text-red-300 ${isMonumental ? "text-sm" : "text-xs"}`}>
          {error}
        </p>
      )}

      <p
        className={`mt-3 text-center text-white/40 ${
          isMonumental ? "text-xs" : "text-[10px]"
        }`}
      >
        Sin spam. Solo el aviso de lanzamiento.
      </p>
    </form>
  );
}
