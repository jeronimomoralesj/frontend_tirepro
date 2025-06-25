"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// Translations
const translations = {
  en: {
    title: "Change Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    changeButton: "Change Password",
    saving: "Saving...",
    success: "Password updated successfully.",
    loginRequired: "You must log in again",
    passwordMismatch: "New password and confirmation do not match.",
    unexpectedError: "Unexpected error",
    passwordChangeError: "Error changing password",
    showPassword: "Show password",
    hidePassword: "Hide password"
  },
  es: {
    title: "Cambiar Contraseña",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar nueva contraseña",
    changeButton: "Cambiar Contraseña",
    saving: "Guardando...",
    success: "Contraseña actualizada con éxito.",
    loginRequired: "Debe iniciar sesión de nuevo",
    passwordMismatch: "La nueva contraseña y su confirmación no coinciden.",
    unexpectedError: "Error inesperado",
    passwordChangeError: "Error cambiando la contraseña",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña"
  }
};

export default function CambiarContrasena() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en'|'es'>('es');

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = storedUser ? JSON.parse(storedUser) : null;

  const t = translations[language];

  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = localStorage.getItem('preferredLanguage') as 'en'|'es';
      if (saved) {
        setLanguage(saved);
        return;
      }
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject('no geo');
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        if (resp.ok) {
          const { countryCode } = await resp.json();
          const lang = (countryCode === 'US' || countryCode === 'CA') ? 'en' : 'es';
          setLanguage(lang);
          localStorage.setItem('preferredLanguage', lang);
          return;
        }
      } catch {
        // fallback to browser language
      }
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };
    detectAndSetLanguage();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.id || !token) {
      setError(t.loginRequired);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : "https://api.tirepro.com.co/api";
      const res = await fetch(
        `${API_BASE}/users/${encodeURIComponent(user.id)}/change-password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || t.passwordChangeError);
      }
      setSuccess(t.success);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t.unexpectedError;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ 
    id, 
    label, 
    value, 
    onChange, 
    show, 
    toggleShow 
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    show: boolean;
    toggleShow: () => void;
  }) => (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="w-full pr-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all"
          required
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-[#1E76B6] transition-colors"
          aria-label={show ? t.hidePassword : t.showPassword}
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-[#0A183A] text-center">
        {t.title}
      </h2>

      <div aria-live="polite" className="min-h-[1.5em] mb-6">
        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
            {success}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PasswordInput
          id="oldPassword"
          label={t.currentPassword}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          show={showOld}
          toggleShow={() => setShowOld((v) => !v)}
        />

        <PasswordInput
          id="newPassword"
          label={t.newPassword}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          show={showNew}
          toggleShow={() => setShowNew((v) => !v)}
        />

        <PasswordInput
          id="confirmPassword"
          label={t.confirmPassword}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          show={showConfirm}
          toggleShow={() => setShowConfirm((v) => !v)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1E76B6] text-white py-3 px-4 rounded-lg font-medium 
                   hover:bg-[#348CCB] disabled:opacity-50 transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-[#173D68] focus:ring-offset-2
                   text-base md:text-lg shadow-md"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t.saving}
            </span>
          ) : (
            t.changeButton
          )}
        </button>
      </form>
    </div>
  );
}