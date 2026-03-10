"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function CompanyRegisterPage() {
  const [step, setStep] = useState<"userType" | "passwordVerification" | "companyDetails">("userType");
  const [userType, setUserType] = useState<UserType>(null);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("pro");
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

  // ── Password Verification Step ─────────────────────────────────────────────

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

  // ── User Type Selection Step ───────────────────────────────────────────────

  if (step === "userType") {
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

  // ── Company Details Step ───────────────────────────────────────────────────

  const selectedOption = userTypeOptions.find((opt) => opt.id === userType);
  const IconComponent = selectedOption?.icon || Users;

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #f0f6fb 0%, #ffffff 60%, #e8f3fa 100%)" }} />
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(30,118,182,0.07)" }} />

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
              <span>Cambiar tipo de perfil</span>
            </button>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-6 lg:px-8 py-20">
          {!companyId ? (
            <>
              <div className="text-center mb-12">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 border"
                  style={{ backgroundColor: selectedOption?.iconBg ?? "rgba(30,118,182,0.1)", borderColor: "rgba(30,118,182,0.2)" }}
                >
                  <IconComponent size={32} style={{ color: selectedOption?.iconColor ?? "#1E76B6" }} />
                </div>
                <h1 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: "#0A183A" }}>
                  Registrar Empresa
                </h1>
                <p className="text-xl text-gray-500 mb-6">
                  Complete los datos para crear su cuenta empresarial
                </p>
                {selectedOption && (
                  <div
                    className="inline-flex items-center px-6 py-3 rounded-full border"
                    style={{ backgroundColor: "rgba(30,118,182,0.06)", borderColor: "rgba(30,118,182,0.2)" }}
                  >
                    <IconComponent size={16} style={{ color: selectedOption.iconColor, marginRight: "0.5rem" }} />
                    <span className="text-sm text-gray-700">
                      {selectedOption.title} — Plan{" "}
                      <span className="font-semibold capitalize" style={{ color: "#1E76B6" }}>{plan}</span>
                    </span>
                  </div>
                )}
              </div>

              <div
                className="bg-white rounded-3xl border p-8 shadow-xl"
                style={{ borderColor: "rgba(30,118,182,0.15)", boxShadow: "0 8px 40px rgba(30,118,182,0.1)" }}
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company name */}
                  <div>
                    <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                      Nombre de la Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
                      style={{ border: "1.5px solid rgba(30,118,182,0.2)", backgroundColor: "#f8fafd" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#1E76B6")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(30,118,182,0.2)")}
                      placeholder="Ingresa el nombre de tu empresa"
                      maxLength={100}
                    />
                  </div>

                  {/* Plan display */}
                  <div>
                    <label className="block text-sm font-semibold mb-3" style={{ color: "#0A183A" }}>
                      Plan Seleccionado
                    </label>
                    <div
                      className="px-4 py-3 rounded-xl border"
                      style={{ backgroundColor: "#f8fafd", borderColor: "rgba(30,118,182,0.15)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: selectedOption?.iconBg ?? "rgba(30,118,182,0.1)" }}
                          >
                            <IconComponent size={20} style={{ color: selectedOption?.iconColor ?? "#1E76B6" }} />
                          </div>
                          <div>
                            <span className="font-semibold capitalize" style={{ color: "#0A183A" }}>Plan {plan}</span>
                            <p className="text-sm text-gray-500">{selectedOption?.subtitle}</p>
                          </div>
                        </div>
                        <Zap size={20} style={{ color: "#1E76B6" }} />
                      </div>
                    </div>
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
                    className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 text-white shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                    style={{ backgroundColor: termsAccepted && !loading ? "#1E76B6" : "#d1d5db", color: termsAccepted && !loading ? "white" : "#9ca3af" }}
                    onMouseEnter={e => { if (termsAccepted && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#173D68" }}
                    onMouseLeave={e => { if (termsAccepted && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1E76B6" }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Registrando empresa...</span>
                      </div>
                    ) : (
                      "Registrar Empresa"
                    )}
                  </button>

                  {error && (
                    <div className="p-4 rounded-xl border" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}>
                      <p className="text-red-500 text-sm">{error}</p>
                    </div>
                  )}
                </form>
              </div>
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
    </div>
  );
}