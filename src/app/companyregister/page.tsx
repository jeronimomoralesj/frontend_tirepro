"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Users,
  Truck,
  Building2,
  Shield,
  Zap,
  ChevronRight,
  Sparkles,
  Lock,
} from "lucide-react";

type UserType = "fleet" | "distributor" | null;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : "https://api.tirepro.com.co/api";

export default function CompanyRegisterWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CompanyRegisterPage />
    </Suspense>
  );
}

function CompanyRegisterPage() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");

  // If plan param is set, skip the type selection
  const initialStep = planParam === "distribuidor" ? "passwordVerification" as const : planParam ? "companyDetails" as const : "userType" as const;
  const initialType = planParam === "distribuidor" ? "distributor" as UserType : planParam ? "fleet" as UserType : null;
  const initialPlan = planParam === "distribuidor" ? "distribuidor" : "pro";

  const [step, setStep] = useState<"userType" | "passwordVerification" | "companyDetails">(initialStep);
  const [userType, setUserType] = useState<UserType>(initialType);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState(initialPlan);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [distributorPassword, setDistributorPassword] = useState("");

  const router = useRouter();

  const userTypeOptions = [
    {
      id: "fleet" as UserType,
      title: "Empresa con Flota",
      subtitle: "Más de 5 vehículos",
      description: "Ideal para empresas con flotas medianas y grandes que buscan optimización",
      icon: Truck,
      plan: "pro",
      gradient: "from-blue-100 to-cyan-50",
      iconBg: "rgba(30,118,182,0.12)",
      iconColor: "#1E76B6",
      borderActive: "#1E76B6",
    },
    {
      id: "distributor" as UserType,
      title: "Distribuidor",
      subtitle: "Gestión para clientes",
      description: "Solución completa para distribuidores que manejan múltiples clientes",
      icon: Building2,
      plan: "distribuidor",
      gradient: "from-indigo-50 to-blue-50",
      iconBg: "rgba(23,61,104,0.12)",
      iconColor: "#173D68",
      borderActive: "#173D68",
    },
  ];

  const handleUserTypeSelection = (selectedType: UserType) => {
    setUserType(selectedType);
    const selectedOption = userTypeOptions.find((o) => o.id === selectedType);
    if (selectedOption) setPlan(selectedOption.plan);
    if (selectedType === "distributor") {
      setStep("passwordVerification");
    } else {
      setStep("companyDetails");
    }
  };

  const handlePasswordVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/verify-distributor-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: distributorPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("companyDetails");
        setDistributorPassword("");
      } else {
        setError("Contraseña incorrecta. Por favor, verifica e intenta nuevamente.");
      }
    } catch {
      setError("Error al verificar la contraseña. Intenta de nuevo.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBackToUserType = () => {
    setStep("userType");
    setError("");
    setDistributorPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Debes aceptar los términos y condiciones para continuar");
      return;
    }
    if (!name.trim()) {
      setError("El nombre de la empresa es obligatorio");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/companies/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), plan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al registrar la empresa");
      setCompanyId(data.companyId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(companyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const handleCreateUser = () => {
    router.push(`/registeruser?companyId=${companyId}`);
  };

  // -- Password Verification Step ---------------------------------------------

  if (step === "passwordVerification") {
    return (
      <div className="min-h-screen bg-white overflow-hidden">
        {/* Bg decorations */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #f0f6fb 0%, #ffffff 60%, #e8f3fa 100%)" }} />
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(23,61,104,0.07)" }} />

        <div className="relative z-10">
          <nav className="border-b border-gray-200 bg-white/90 backdrop-blur-xl shadow-sm">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
              <button
                onClick={handleBackToUserType}
                className="inline-flex items-center space-x-2 text-gray-500 transition-colors"
                onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
                onMouseLeave={e => (e.currentTarget.style.color = "")}
              >
                <ArrowLeft size={20} />
                <span>Volver a selección de perfil</span>
              </button>
            </div>
          </nav>

          <div className="max-w-md mx-auto px-6 lg:px-8 py-20">
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 border"
                style={{ backgroundColor: "rgba(23,61,104,0.08)", borderColor: "rgba(23,61,104,0.2)" }}
              >
                <Lock size={32} style={{ color: "#173D68" }} />
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: "#0A183A" }}>
                Acceso de Distribuidor
              </h1>
              <p className="text-xl text-gray-500">
                Ingresa la contraseña para continuar con el registro
              </p>
            </div>

            <div
              className="bg-white rounded-3xl border p-8 shadow-xl"
              style={{ borderColor: "rgba(30,118,182,0.15)", boxShadow: "0 8px 40px rgba(30,118,182,0.1)" }}
            >
              <form onSubmit={handlePasswordVerification} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                    Contraseña de Distribuidor *
                  </label>
                  <input
                    type="password"
                    required
                    value={distributorPassword}
                    onChange={(e) => setDistributorPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                    style={{ border: "1.5px solid rgba(30,118,182,0.2)", backgroundColor: "#f8fafd" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#1E76B6")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(30,118,182,0.2)")}
                    placeholder="Ingresa la contraseña"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#1E76B6" }}
                  onMouseEnter={e => { if (!verifying) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#173D68" }}
                  onMouseLeave={e => { if (!verifying) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1E76B6" }}
                >
                  {verifying ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    "Verificar y Continuar"
                  )}
                </button>

                {error && (
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- User Type Selection Step — redirect to /signup if no plan param --------

  if (step === "userType") {
    if (typeof window !== "undefined") { window.location.href = "/signup"; return null; }
    return (
      <div className="min-h-screen bg-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #f0f6fb 0%, #ffffff 50%, #e8f3fa 100%)" }} />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(30,118,182,0.07)" }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(23,61,104,0.05)" }} />

        <div className="relative z-10">
          <nav className="border-b border-gray-200 bg-white/90 backdrop-blur-xl shadow-sm">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 text-gray-500 transition-colors"
                onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
                onMouseLeave={e => (e.currentTarget.style.color = "")}
              >
                <ArrowLeft size={20} />
                <span>Volver al inicio</span>
              </Link>
            </div>
          </nav>

          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
            <div className="text-center mb-20">
              <div
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border mb-6"
                style={{ borderColor: "rgba(30,118,182,0.25)", backgroundColor: "rgba(30,118,182,0.06)" }}
              >
                <Sparkles size={16} style={{ color: "#1E76B6" }} />
                <span className="text-sm font-medium" style={{ color: "#173D68" }}>Comienza en menos de 2 minutos</span>
              </div>
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-tight"
                style={{ color: "#0A183A" }}
              >
                ¿Cuál es tu perfil?
              </h1>
              <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
                Selecciona la opción que mejor describe tu negocio para personalizar tu experiencia
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {userTypeOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.id}
                    onClick={() => handleUserTypeSelection(option.id)}
                    className="group relative cursor-pointer rounded-3xl border bg-white transition-all duration-300 hover:scale-105"
                    style={{
                      borderColor: "rgba(30,118,182,0.15)",
                      boxShadow: "0 2px 16px rgba(30,118,182,0.06)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = option.borderActive;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(30,118,182,0.15)`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(30,118,182,0.15)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px rgba(30,118,182,0.06)";
                    }}
                  >
                    <div className="p-8">
                      <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: option.iconBg }}
                      >
                        <IconComponent size={28} style={{ color: option.iconColor }} />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-semibold mb-2" style={{ color: "#0A183A" }}>
                            {option.title}
                          </h3>
                          <p className="font-semibold text-lg" style={{ color: option.iconColor }}>
                            {option.subtitle}
                          </p>
                        </div>
                        <p className="text-gray-500 leading-relaxed">{option.description}</p>

                        <div
                          className="flex items-center justify-between pt-4 border-t"
                          style={{ borderColor: "rgba(30,118,182,0.12)" }}
                        >
                          <div className="flex items-center space-x-2">
                            <Shield size={16} style={{ color: "#1E76B6" }} />
                            <span className="text-sm font-semibold capitalize" style={{ color: "#1E76B6" }}>
                              Plan {option.plan}
                            </span>
                          </div>
                          <ChevronRight
                            size={20}
                            className="transition-all duration-200 group-hover:translate-x-1"
                            style={{ color: "#1E76B6" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-20">
              <p className="text-gray-400 mb-4">¿Necesitas ayuda para decidir?</p>
              <Link
                href="/contact"
                className="inline-flex items-center space-x-2 font-semibold transition-colors"
                style={{ color: "#1E76B6" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#173D68")}
                onMouseLeave={e => (e.currentTarget.style.color = "#1E76B6")}
              >
                <span>Habla con nuestro equipo</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Company Details Step ---------------------------------------------------

  const selectedOption = userTypeOptions.find((opt) => opt.id === userType);
  const IconComponent = selectedOption?.icon || Users;

  const isDistributor = plan === "distribuidor";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/signup" className="flex justify-center mb-8">
          <img src="/logo_full.png" alt="TirePro" className="h-8 w-auto" />
        </Link>

        {!companyId ? (
          <>
            <h1 className="text-2xl font-black text-[#0A183A] text-center mb-1">
              {isDistributor ? "Registrar distribuidor" : "Registrar empresa"}
            </h1>
            <p className="text-sm text-gray-400 text-center mb-6">
              {isDistributor ? "Vende llantas y llega a flotas en Colombia" : "Controla tus llantas y reduce costos hasta 35%"}
            </p>

            <div className="mb-5 flex items-center justify-center gap-2">
              <span className="text-[10px] font-bold px-3 py-1 rounded-full"
                style={{ background: isDistributor ? "#f5f0ff" : "#f0f7ff", color: isDistributor ? "#8b5cf6" : "#1E76B6" }}>
                {isDistributor ? "Distribuidor" : "Plan Plus — Gratis"}
              </span>
              <Link href="/signup" className="text-[10px] text-gray-400 hover:text-[#1E76B6]">Cambiar</Link>
            </div>

            <div className="space-y-0">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-[#f5f5f7] border border-transparent focus:border-[#1E76B6]/20 focus:bg-white focus:shadow-sm focus:outline-none text-[#0A183A] placeholder-gray-400 transition-all"
                    placeholder="Nombre de la empresa"
                    maxLength={100}
                  />

                  {/* Terms */}
                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-[#1E76B6]" />
                    <span className="text-[11px] text-gray-400 leading-relaxed">
                      Acepto los <Link href="/legal" className="text-[#1E76B6] hover:underline">terminos de servicio</Link> y la <Link href="/legal" className="text-[#1E76B6] hover:underline">politica de privacidad</Link>
                    </span>
                  </label>

                  {/* Submit */}
                  <button type="submit" disabled={loading || !termsAccepted}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:shadow-lg"
                    style={{ background: "#1E76B6" }}>
                    {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Registrando...</span>
                      : isDistributor ? "Registrar distribuidor" : "Registrar empresa"}
                  </button>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                      {error}
                    </div>
                  )}
                </form>
              </div>

              <p className="text-xs text-gray-400 text-center mt-5">
                ¿Ya tienes cuenta? <Link href="/login" className="text-[#1E76B6] font-semibold hover:underline">Ingresar</Link>
              </p>
            </>
          ) : (
            /* Success State */
            <>
              <div className="text-center mb-12">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 border"
                  style={{ backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)" }}
                >
                  <Check size={36} style={{ color: "#10b981" }} />
                </div>
                <h1 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: "#0A183A" }}>
                  ¡Registro Exitoso!
                </h1>
                <p className="text-xl text-gray-500">
                  Tu empresa ha sido registrada correctamente en TirePro
                </p>
              </div>

              <div
                className="bg-white rounded-3xl border p-8 shadow-xl space-y-6"
                style={{ borderColor: "rgba(30,118,182,0.15)", boxShadow: "0 8px 40px rgba(30,118,182,0.1)" }}
              >
                <div
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">!</span>
                    </div>
                    <p className="text-amber-700 text-sm font-medium">
                      Guarda tu ID de empresa. Lo necesitarás para registrar usuarios.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={handleCopyId}
                    className="flex items-center justify-center space-x-2 px-6 py-4 rounded-xl border font-semibold transition-all"
                    style={{ borderColor: "rgba(30,118,182,0.2)", color: "#1E76B6", backgroundColor: "rgba(30,118,182,0.04)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,118,182,0.1)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,118,182,0.04)" }}
                  >
                    <Copy size={18} />
                    <span>{copied ? "¡Copiado!" : "Copiar ID"}</span>
                  </button>

                  <button
                    onClick={handleCreateUser}
                    className="flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg"
                    style={{ backgroundColor: "#1E76B6" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#173D68")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1E76B6")}
                  >
                    <Users size={18} />
                    <span>Crear Primer Usuario</span>
                  </button>
                </div>

                <div className="text-center pt-6 border-t" style={{ borderColor: "rgba(30,118,182,0.12)" }}>
                  <p className="text-sm text-gray-400 mb-2">Próximos pasos:</p>
                  <p className="text-sm text-gray-600">
                    Crea tu primer usuario administrador para comenzar a usar TirePro
                  </p>
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}