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
  EyeOff
} from "lucide-react";


// Create a client component specifically for handling search params
function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("admin"); // Default to admin for first user
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();
  const [language, setLanguage] = useState<"en" | "es">("es");
const [isUSLocation, setIsUSLocation] = useState(false);


  // Use the URLSearchParams API safely on the client side
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const companyIdParam = params.get("companyId");
    if (companyIdParam) {
      setCompanyId(companyIdParam);
    }
  }, []);

  useEffect(() => {
  const detectLanguageFromLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 300000
        });
      });

      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
      );

      if (response.ok) {
        const data = await response.json();
        const countryCode = data.countryCode;

        if (countryCode === "US") {
          setLanguage("en");
          setIsUSLocation(true);
        } else {
          setLanguage("es");
          setIsUSLocation(false);
        }
      }
    } catch (error) {
      console.log("Geolocation failed, using browser language as fallback:", error);
      const browserLang = navigator.language || navigator.languages?.[0] || "es";
      if (browserLang.startsWith("en")) {
        setLanguage("en");
        setIsUSLocation(true);
      } else {
        setLanguage("es");
        setIsUSLocation(false);
      }
    }
  };

  detectLanguageFromLocation();
}, []);


const translations = {
  en: {
    backToHome: "Back to Home",
    registerUser: "Register User",
    fullName: "Full Name *",
    email: "Email *",
    password: "Password *",
    companyId: "Company ID *",
    role: "User Role",
    admin: "Admin",
    regular: "Regular User",
    terms: "I accept the",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    registering: "Registering user...",
    success: "Registration Successful!",
    successMessage: "Your user has been successfully registered in TirePro.",
    userId: "User ID",
    copy: "Copy ID",
    copied: "Copied!",
    login: "Go to Login",
    andThe: "and the",

    reminder: "Use your credentials to log in, but remember to activate your account first.",
    mustAcceptTerms: "You must accept the terms and conditions to continue",
  },
  es: {
    backToHome: "Volver al inicio",
    registerUser: "Registrar Usuario",
    fullName: "Nombre Completo *",
    email: "Correo Electrónico *",
    password: "Contraseña *",
    companyId: "ID de Empresa *",
    role: "Rol de Usuario",
    admin: "Administrador",
    regular: "Usuario Regular",
    terms: "Acepto los",
    termsOfService: "Términos de Servicio",
    andThe: "y la",
    privacyPolicy: "Política de Privacidad",
    registering: "Registrando usuario...",
    success: "¡Registro Exitoso!",
    successMessage: "Tu usuario ha sido registrado correctamente en TirePro.",
    userId: "ID de Usuario",
    copy: "Copiar ID",
    copied: "¡Copiado!",
    login: "Ir a iniciar sesión",
    reminder: "Usa tus credenciales para iniciar sesión, pero recuerda activar tu cuenta primero.",
    mustAcceptTerms: "Debes aceptar los términos y condiciones para continuar",
  }
};

const t = translations[language];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      setError("Debes aceptar los términos y condiciones para continuar");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // Validate input
      if (!name.trim()) {
        throw new Error("El nombre del usuario es obligatorio");
      }
      if (!email.trim()) {
        throw new Error("El correo electrónico es obligatorio");
      }
      if (!password.trim() || password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }
      if (!companyId.trim()) {
        throw new Error("El ID de la empresa es obligatorio");
      }

      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/register`
          : "https://api.tirepro.com.co/api/users/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password, companyId, role, preferredLanguage: language }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al registrar el usuario");
      }

      // Assuming the backend returns an object with a "user" property
      setUserId(data.user.id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/login");
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Check if we're in the browser to use URL params
  const hasCompanyIdParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has("companyId");

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A183A]/40 via-transparent to-[#173D68]/20"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#348CCB]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-[#173D68]/30 bg-[#030712]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <Link href="/" className="inline-flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">{t.backToHome}</span>
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          {!userId ? (
            <>
              {/* Form Header */}
              <div className="text-center mb-8 sm:mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/30 border border-[#173D68]/30 mb-4 sm:mb-6">
                  <User size={28} className="text-[#348CCB]" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
                  Crear Usuario
                </h1>
                <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6 px-4">
                  Complete los datos para crear su cuenta de usuario
                </p>
                
                {hasCompanyIdParam && (
                  <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-[#0A183A]/60 to-[#173D68]/30 rounded-full border border-[#173D68]/30">
                    <Building2 size={14} className="mr-2 text-[#348CCB]" />
                    <span className="text-xs sm:text-sm">
                      Empresa detectada automáticamente
                    </span>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/40 rounded-2xl border border-[#173D68]/30 backdrop-blur-lg p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-[#348CCB]" />
                        <span>{t.fullName}</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-colors"
                      placeholder={t.fullName}
                      maxLength={100}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      <div className="flex items-center space-x-2">
                        <Mail size={16} className="text-[#348CCB]" />
                        <span>{t.email}</span>
                      </div>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-colors"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      <div className="flex items-center space-x-2">
                        <Lock size={16} className="text-[#348CCB]" />
                        <span>{t.password}</span>
                      </div>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-colors"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#348CCB] transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Company ID */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      <div className="flex items-center space-x-2">
                        <Building2 size={16} className="text-[#348CCB]" />
                        <span>{t.companyId}</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Ingresa el ID de la empresa"
                      readOnly={hasCompanyIdParam}
                    />
                    {hasCompanyIdParam && (
                      <p className="mt-2 text-xs text-[#348CCB] flex items-center space-x-1">
                        <Check size={12} />
                        <span>ID de empresa detectado automáticamente</span>
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      <div className="flex items-center space-x-2">
                        <Shield size={16} className="text-[#348CCB]" />
                        <span>{t.role}</span>
                      </div>
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-colors"
                    >
                      <option value="admin">{t.admin}</option>
                      <option value="regular">{t.regular}</option>
                    </select>
                    {hasCompanyIdParam && (
                      <p className="mt-2 text-xs text-[#348CCB] flex items-center space-x-1">
                        <UserCheck size={12} />
                        <span>Primer usuario registrado como administrador por defecto</span>
                      </p>
                    )}
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start space-x-3">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-[#173D68]/30 bg-[#0A183A]/40 text-[#348CCB] focus:ring-[#348CCB] focus:ring-offset-0"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed">
                      {t.terms}{" "}
                      <Link href="/legal#terms-section" className="text-[#348CCB] hover:underline">
                        {t.termsOfService}
                      </Link>{" "}
                      {t.andThe}{" "}
                      <Link href="/legal#privacy-section" className="text-[#348CCB] hover:underline">
                        {t.privacyPolicy}
                      </Link>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !termsAccepted}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      termsAccepted && !loading
                        ? "bg-gradient-to-r from-[#348CCB] to-[#1E76B6] hover:from-[#1E76B6] hover:to-[#348CCB] text-white shadow-lg hover:shadow-[#348CCB]/25"
                        : "bg-gray-600 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>{t.registering}</span>
                      </div>
                    ) : (
                      t.registerUser
                    )}
                  </button>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </>
          ) : (
            /* Success State */
            <>
              <div className="text-center mb-8 sm:mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-4 sm:mb-6">
                  <Check size={28} className="text-emerald-400" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-transparent">
                  {t.success}
                </h1>
                <p className="text-gray-300 text-sm sm:text-base px-4">
                  {t.successMessage}
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/40 rounded-2xl border border-[#173D68]/30 backdrop-blur-lg p-6 sm:p-8 space-y-6">
                {/* User ID */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">{t.userId}</h3>
                  <div className="bg-[#0A183A]/60 rounded-lg p-4 border border-[#173D68]/30">
                    <p className="text-xl sm:text-2xl font-mono font-bold text-[#348CCB] break-all select-all">
                      {userId}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-400 mb-1">¡Perfecto!</h4>
                      <p className="text-emerald-300 text-sm">
                        Tu cuenta ha sido creada exitosamente. Recibiras un correo de TirePro en el cual se te pedira verificar tu cuenta para poder proceder.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleCopyId}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white hover:bg-[#0A183A]/60 hover:border-[#348CCB]/30 transition-all"
                  >
                    <Copy size={16} />
                    <span>{copied ? t.copied : t.copy}</span>
                  </button>
                  
                  <button
                    onClick={handleGoToDashboard}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] rounded-lg text-white hover:from-[#1E76B6] hover:to-[#348CCB] transition-all shadow-lg hover:shadow-[#348CCB]/25"
                  >
                    <User size={16} />
                    <span>{t.login} </span>
                  </button>
                </div>

                {/* Next Steps */}
                <div className="text-center pt-4 border-t border-[#173D68]/30">
                  <p className="text-sm text-gray-300">
                    {t.reminder}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#030712] flex justify-center items-center">
      <div className="text-center">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-[#348CCB]/30 border-t-[#348CCB] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 text-sm">Cargando formulario...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function RegisterUserPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegisterForm />
    </Suspense>
  );
}