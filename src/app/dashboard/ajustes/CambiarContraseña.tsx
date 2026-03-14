"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";

// =============================================================================
// Translations
// =============================================================================
const T = {
  es: {
    title:               "Cambiar Contraseña",
    currentPassword:     "Contraseña actual",
    newPassword:         "Nueva contraseña",
    confirmPassword:     "Confirmar nueva contraseña",
    changeButton:        "Cambiar Contraseña",
    saving:              "Guardando…",
    success:             "Contraseña actualizada con éxito.",
    loginRequired:       "Debe iniciar sesión de nuevo",
    passwordMismatch:    "La nueva contraseña y su confirmación no coinciden.",
    unexpectedError:     "Error inesperado",
    passwordChangeError: "Error cambiando la contraseña",
  }
};

// =============================================================================
// Helpers
// =============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

// =============================================================================
// Password input — brand styled
// =============================================================================
const inputCls =
  "w-full pr-10 pl-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = {
  background: "rgba(10,24,58,0.03)",
  border: "1px solid rgba(52,140,203,0.2)",
  color: "#0A183A",
};

function PasswordField({
  id, label, value, onChange, show, onToggle,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
          required
          autoComplete={id === "oldPassword" ? "current-password" : "new-password"}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-[#1E76B6] transition-colors"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================
export default function CambiarContrasena() {
  const [oldPassword,     setOldPassword]     = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld,         setShowOld]         = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [loading,         setLoading]         = useState(false);
  const [lang,            setLang]            = useState<"es">("es");

  const t = T[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    if (!user?.id) { setError(t.loginRequired); return; }
    if (newPassword !== confirmPassword) { setError(t.passwordMismatch); return; }
    if (newPassword.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }

    setLoading(true);
    try {
      // Backend: PATCH /users/:id/change-password  { oldPassword, newPassword }
      const res = await authFetch(`${API_BASE}/users/${encodeURIComponent(user.id)}/change-password`, {
        method: "PATCH",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || t.passwordChangeError);
      setSuccess(t.success);
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  // Strength indicator (simple)
  const strength = newPassword.length === 0 ? 0
    : newPassword.length < 6 ? 1
    : newPassword.length < 10 ? 2
    : 3;
  const strengthColors = ["", "#DC2626", "#D97706", "#16A34A"];
  const strengthLabels = ["", "Débil", "Media", "Fuerte"];

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
          <Shield className="w-4 h-4 text-[#1E76B6]" />
        </div>
        <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{t.title}</h3>
      </div>

      {/* Feedback banners */}
      {(error || success) && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: success ? "rgba(22,163,74,0.07)" : "rgba(220,38,38,0.07)",
            border: `1px solid ${success ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.2)"}`,
          }}
        >
          {success
            ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
          <span style={{ color: success ? "#166534" : "#991B1B" }}>{success || error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordField
          id="oldPassword"
          label={t.currentPassword}
          value={oldPassword}
          onChange={setOldPassword}
          show={showOld}
          onToggle={() => setShowOld((v) => !v)}
        />

        <div className="space-y-1.5">
          <PasswordField
            id="newPassword"
            label={t.newPassword}
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
          />
          {/* Strength bar */}
          {newPassword.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{ background: i <= strength ? strengthColors[strength] : "rgba(10,24,58,0.08)" }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold" style={{ color: strengthColors[strength] }}>
                {strengthLabels[strength]}
              </span>
            </div>
          )}
        </div>

        <PasswordField
          id="confirmPassword"
          label={t.confirmPassword}
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
        />

        {/* Match indicator */}
        {confirmPassword.length > 0 && (
          <p
            className="text-[10px] font-bold"
            style={{ color: newPassword === confirmPassword ? "#16A34A" : "#DC2626" }}
          >
            {newPassword === confirmPassword ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />{t.saving}</>
            : <><Shield className="w-4 h-4" />{t.changeButton}</>}
        </button>
      </form>
    </div>
  );
}