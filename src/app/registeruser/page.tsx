"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  User,
  Mail,
  Lock,
  Building2,
  Shield,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : "https://api.tirepro.com.co/api";

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [companyIdFromUrl, setCompanyIdFromUrl] = useState(false);
  const [role, setRole] = useState("admin");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("companyId");
    if (id) {
      setCompanyId(id);
      setCompanyIdFromUrl(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) { setError("Debes aceptar los términos y condiciones para continuar"); return; }
    if (!name.trim()) { setError("El nombre del usuario es obligatorio"); return; }
    if (!email.trim()) { setError("El correo electrónico es obligatorio"); return; }
    if (!password || password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (!companyId.trim()) { setError("El ID de la empresa es obligatorio"); return; }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, companyId, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al registrar el usuario");
      setUserId(data.user.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { console.error("Failed to copy"); }
  };

  // -- Shared nav ------------------------------------------------------------

  const NavBar = ({ children }: { children?: React.ReactNode }) => (
    <nav className="border-b border-gray-200 bg-white/90 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children ?? (
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-gray-500 transition-colors"
            onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
            onMouseLeave={e => (e.currentTarget.style.color = "")}
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Volver al inicio</span>
          </Link>
        )}
      </div>
    </nav>
  );

  // -- Success state ---------------------------------------------------------

  if (userId) {
    return (
      <div className="min-h-screen bg-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #f0f6fb 0%, #ffffff 60%, #e8f3fa 100%)" }} />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(30,118,182,0.07)" }} />

        <div className="relative z-10">
          <NavBar />

          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
            <div className="text-center mb-8 sm:mb-12">
              <div
                className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mb-4 sm:mb-6 border"
                style={{ backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)" }}
              >
                <Check size={28} style={{ color: "#10b981" }} />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: "#0A183A" }}>
                ¡Registro Exitoso!
              </h1>
              <p className="text-gray-500 text-sm sm:text-base px-4">
                Tu usuario ha sido registrado correctamente en TirePro.
              </p>
            </div>

            <div
              className="bg-white rounded-2xl border p-6 sm:p-8 shadow-xl space-y-6"
              style={{ borderColor: "rgba(30,118,182,0.15)", boxShadow: "0 8px 40px rgba(30,118,182,0.1)" }}
            >
              <div
                className="p-4 rounded-xl border"
                style={{ backgroundColor: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1" style={{ color: "#059669" }}>¡Perfecto!</h4>
                    <p className="text-sm" style={{ color: "#047857" }}>
                      Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleCopyId}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border font-semibold transition-all"
                  style={{ borderColor: "rgba(30,118,182,0.2)", color: "#1E76B6", backgroundColor: "rgba(30,118,182,0.04)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,118,182,0.1)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,118,182,0.04)" }}
                >
                  <Copy size={16} />
                  <span>{copied ? "¡Copiado!" : "Copiar ID"}</span>
                </button>

                <button
                  onClick={() => router.push("/login")}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg"
                  style={{ backgroundColor: "#1E76B6" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#173D68")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1E76B6")}
                >
                  <User size={16} />
                  <span>Ir a iniciar sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Registration form -----------------------------------------------------

  const inputStyle = {
    border: "1.5px solid rgba(30,118,182,0.2)",
    backgroundColor: "#f8fafd",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "#1E76B6");
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "rgba(30,118,182,0.2)");

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #f0f6fb 0%, #ffffff 60%, #e8f3fa 100%)" }} />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(30,118,182,0.07)" }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(23,61,104,0.05)" }} />

      <div className="relative z-10">
        <NavBar />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <div
              className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mb-4 sm:mb-6 border"
              style={{ backgroundColor: "rgba(30,118,182,0.08)", borderColor: "rgba(30,118,182,0.2)" }}
            >
              <User size={28} style={{ color: "#1E76B6" }} />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: "#0A183A" }}>
              Crear Usuario
            </h1>
            <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6 px-4">
              Complete los datos para crear su cuenta de usuario
            </p>

            {companyIdFromUrl && (
              <div
                className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full border"
                style={{ backgroundColor: "rgba(30,118,182,0.06)", borderColor: "rgba(30,118,182,0.2)" }}
              >
                <Building2 size={14} style={{ color: "#1E76B6", marginRight: "0.5rem" }} />
                <span className="text-xs sm:text-sm font-medium" style={{ color: "#173D68" }}>
                  Empresa detectada automáticamente
                </span>
              </div>
            )}
          </div>

          <div
            className="bg-white rounded-2xl border p-6 sm:p-8 shadow-xl"
            style={{ borderColor: "rgba(30,118,182,0.15)", boxShadow: "0 8px 40px rgba(30,118,182,0.1)" }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                  <div className="flex items-center space-x-2">
                    <User size={16} style={{ color: "#1E76B6" }} />
                    <span>Nombre Completo *</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="Nombre Completo"
                  maxLength={100}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                  <div className="flex items-center space-x-2">
                    <Mail size={16} style={{ color: "#1E76B6" }} />
                    <span>Correo Electrónico *</span>
                  </div>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="ejemplo@correo.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                  <div className="flex items-center space-x-2">
                    <Lock size={16} style={{ color: "#1E76B6" }} />
                    <span>Contraseña *</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#1E76B6" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#173D68")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#1E76B6")}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Company ID */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                  <div className="flex items-center space-x-2">
                    <Building2 size={16} style={{ color: "#1E76B6" }} />
                    <span>ID de Empresa *</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  readOnly={companyIdFromUrl}
                  className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                  style={{
                    ...inputStyle,
                    opacity: companyIdFromUrl ? 0.7 : 1,
                    cursor: companyIdFromUrl ? "not-allowed" : "text",
                  }}
                  onFocus={companyIdFromUrl ? undefined : inputFocus}
                  onBlur={companyIdFromUrl ? undefined : inputBlur}
                  placeholder="Ingresa el ID de la empresa"
                />
                {companyIdFromUrl && (
                  <p className="mt-2 text-xs flex items-center space-x-1" style={{ color: "#1E76B6" }}>
                    <Check size={12} />
                    <span>ID de empresa detectado automáticamente</span>
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                  <div className="flex items-center space-x-2">
                    <Shield size={16} style={{ color: "#1E76B6" }} />
                    <span>Rol de Usuario</span>
                  </div>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-gray-900 transition-all outline-none"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                >
                  <option value="admin">Administrador</option>
                  <option value="viewer">Visualizador</option>
                  <option value="technician">Técnico</option>
                </select>
                {companyIdFromUrl && (
                  <p className="mt-2 text-xs flex items-center space-x-1" style={{ color: "#1E76B6" }}>
                    <UserCheck size={12} />
                    <span>Primer usuario registrado como administrador por defecto</span>
                  </p>
                )}
              </div>

              {/* Terms */}
              <div
                className="flex items-start space-x-3 p-4 rounded-xl border"
                style={{ backgroundColor: "rgba(30,118,182,0.04)", borderColor: "rgba(30,118,182,0.15)" }}
              >
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded"
                  style={{ accentColor: "#1E76B6" }}
                />
                <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                  Acepto los{" "}
                  <Link href="/legal#terms-section" style={{ color: "#1E76B6" }} className="hover:underline">
                    Términos de Servicio
                  </Link>{" "}
                  y la{" "}
                  <Link href="/legal#privacy-section" style={{ color: "#1E76B6" }} className="hover:underline">
                    Política de Privacidad
                  </Link>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 text-white shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                style={{ backgroundColor: termsAccepted && !loading ? "#1E76B6" : "#d1d5db", color: termsAccepted && !loading ? "white" : "#9ca3af" }}
                onMouseEnter={e => { if (termsAccepted && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#173D68" }}
                onMouseLeave={e => { if (termsAccepted && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1E76B6" }}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registrando usuario...</span>
                  </div>
                ) : (
                  "Registrar Usuario"
                )}
              </button>

              {error && (
                <div
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}
                >
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex justify-center items-center" style={{ background: "linear-gradient(135deg, #f0f6fb 0%, #ffffff 100%)" }}>
      <div className="text-center">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 border-4 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: "rgba(30,118,182,0.2)", borderTopColor: "#1E76B6" }}
        />
        <p className="text-gray-400 text-sm">Cargando formulario...</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RegisterUserPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegisterForm />
    </Suspense>
  );
}