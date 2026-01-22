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
  Lock
} from "lucide-react";

type UserType = "fleet" | "distributor" | null;

export default function CompanyRegisterPage() {
  const [step, setStep] = useState<"userType" | "passwordVerification" | "companyDetails">("userType");
  const [userType, setUserType] = useState<UserType>(null);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("Pro");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
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
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30 hover:border-blue-400/60"
    },
    {
      id: "distributor" as UserType,
      title: "Distribuidor",
      subtitle: "Gestión para clientes",
      description: "Solución completa para distribuidores que manejan múltiples clientes",
      icon: Building2,
      plan: "distribuidor",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30 hover:border-purple-400/60"
    }
  ];

  const handleUserTypeSelection = (selectedType: UserType) => {
    setUserType(selectedType);
    const selectedOption = userTypeOptions.find(option => option.id === selectedType);
    if (selectedOption) {
      setPlan(selectedOption.plan);
    }
    
    // If distributor is selected, go to password verification
    if (selectedType === "distributor") {
      setStep("passwordVerification");
    } else {
      setStep("companyDetails");
    }
  };

  const handlePasswordVerification = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (distributorPassword === "jms20251") {
      setStep("companyDetails");
      setError("");
      setDistributorPassword("");
    } else {
      setError("Contraseña incorrecta. Por favor, verifica e intenta nuevamente.");
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
    
    setLoading(true);
    setError("");

    try {
      if (!name.trim()) {
        throw new Error("El nombre de la empresa es obligatorio");
      }

      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/register`
          : "https://api.tirepro.com.co/api/companies/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            plan: plan,
            userType: userType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al registrar la empresa");
      }

      setCompanyId(data.companyId); 
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

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(companyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateUser = () => {
    router.push(`/registeruser?companyId=${companyId}`);
  };

  // Password Verification Step
  if (step === "passwordVerification") {
    return (
      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-transparent to-purple-900/20"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* Header */}
          <nav className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
              <button
                onClick={handleBackToUserType}
                className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Volver a selección de perfil</span>
              </button>
            </div>
          </nav>

          <div className="max-w-md mx-auto px-6 lg:px-8 py-20">
            {/* Password Form Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6">
                <Lock size={32} className="text-purple-400" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-semibold mb-4">
                Acceso de Distribuidor
              </h1>
              <p className="text-xl text-gray-400">
                Ingresa la contraseña para continuar con el registro
              </p>
            </div>

            {/* Password Form */}
            <div className="bg-white/5 rounded-3xl border border-white/10 backdrop-blur-lg p-8">
              <form onSubmit={handlePasswordVerification} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Contraseña de Distribuidor *
                  </label>
                  <input
                    type="password"
                    required
                    value={distributorPassword}
                    onChange={(e) => setDistributorPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="Ingresa la contraseña"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-xl font-semibold bg-white text-black hover:bg-gray-100 shadow-lg transition-all duration-200"
                >
                  Verificar y Continuar
                </button>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User Type Selection Step
  if (step === "userType") {
    return (
      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-transparent to-blue-900/20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* Header */}
          <nav className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
              <Link href="/" className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
                <span>Volver al inicio</span>
              </Link>
            </div>
          </nav>

          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
            {/* Hero Section */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 mb-6">
                <Sparkles size={16} className="text-blue-400" />
                <span className="text-sm text-gray-300">Comienza en menos de 2 minutos</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-tight">
                ¿Cuál es tu perfil?
              </h1>
              <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Selecciona la opción que mejor describe tu negocio para personalizar tu experiencia
              </p>
            </div>

            {/* User Type Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {userTypeOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.id}
                    onClick={() => handleUserTypeSelection(option.id)}
                    className="group relative cursor-pointer rounded-3xl border border-white/10 hover:border-white/20 backdrop-blur-lg transition-all duration-500 hover:scale-105 bg-white/5 hover:bg-white/10"
                  >
                    <div className="p-8">
                      {/* Icon */}
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${option.gradient} border ${option.borderColor} mb-6 ${option.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent size={28} />
                      </div>

                      {/* Content */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-semibold mb-2 group-hover:text-white transition-colors">
                            {option.title}
                          </h3>
                          <p className={`${option.iconColor} font-medium text-lg`}>
                            {option.subtitle}
                          </p>
                        </div>

                        <p className="text-gray-400 leading-relaxed">
                          {option.description}
                        </p>

                        {/* Plan Badge */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex items-center space-x-2">
                            <Shield size={16} className="text-blue-400" />
                            <span className="text-sm font-medium text-blue-400 capitalize">
                              Plan {option.plan}
                            </span>
                          </div>
                          <ChevronRight className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <div className="text-center mt-20">
              <p className="text-gray-500 mb-4">¿Necesitas ayuda para decidir?</p>
              <Link href="/contact" className="inline-flex items-center space-x-2 text-blue-400 hover:text-white transition-colors">
                <span>Habla con nuestro equipo</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Company Details Step
  const selectedOption = userTypeOptions.find(opt => opt.id === userType);
  const IconComponent = selectedOption?.icon || Users;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-transparent to-blue-900/20"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Header */}
        <nav className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <button
              onClick={handleBackToUserType}
              className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Cambiar tipo de perfil</span>
            </button>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-6 lg:px-8 py-20">
          {!companyId ? (
            <>
              {/* Form Header */}
              <div className="text-center mb-12">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedOption?.gradient} border ${selectedOption?.borderColor} mb-6`}>
                  <IconComponent size={32} className={selectedOption?.iconColor} />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-semibold mb-4">
                  Registrar Empresa
                </h1>
                <p className="text-xl text-gray-400 mb-6">
                  Complete los datos para crear su cuenta empresarial
                </p>
                
                {selectedOption && (
                  <div className="inline-flex items-center px-6 py-3 bg-white/5 rounded-full border border-white/10">
                    <IconComponent size={16} className={`mr-2 ${selectedOption.iconColor}`} />
                    <span className="text-sm">
                      {selectedOption.title} - Plan <span className="font-semibold text-blue-400 capitalize">{plan}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="bg-white/5 rounded-3xl border border-white/10 backdrop-blur-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Nombre de la Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      placeholder="Ingresa el nombre de tu empresa"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Plan Seleccionado
                    </label>
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedOption?.gradient} flex items-center justify-center ${selectedOption?.iconColor}`}>
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <span className="text-white font-medium capitalize">Plan {plan}</span>
                            <p className="text-sm text-gray-400">{selectedOption?.subtitle}</p>
                          </div>
                        </div>
                        <Zap className="text-blue-400" size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed">
                      Acepto los{" "}
                      <Link href="/legal#terms-section" className="text-blue-400 hover:underline">
                        Términos de Servicio
                      </Link>{" "}
                      y la{" "}
                      <Link href="/legal#privacy-section" className="text-blue-400 hover:underline">
                        Política de Privacidad
                      </Link>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !termsAccepted}
                    className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                      termsAccepted && !loading
                        ? "bg-white text-black hover:bg-gray-100 shadow-lg"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                        <span>Registrando empresa...</span>
                      </div>
                    ) : (
                      "Registrar Empresa"
                    )}
                  </button>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                </form>
              </div>
            </>
          ) : (
            /* Success State */
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 mb-6">
                  <Check size={36} className="text-green-400" />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-semibold mb-4">
                  ¡Registro Exitoso!
                </h1>
                <p className="text-xl text-gray-400">
                  Tu empresa ha sido registrada correctamente en TirePro
                </p>
              </div>

              <div className="bg-white/5 rounded-3xl border border-white/10 backdrop-blur-lg p-8 space-y-6">
                {/* Company ID */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4 text-gray-300">ID de Empresa</h3>
                  <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                    <p className="text-3xl font-mono font-bold text-blue-400 break-all select-all">
                      {companyId}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-black text-sm font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-2 text-lg">¡Importante!</h4>
                      <p className="text-amber-300/90 text-sm leading-relaxed">
                        Guarda este ID de empresa en un lugar seguro. Lo necesitarás para crear el primer usuario y acceder a tu cuenta.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid sm:grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={handleCopyId}
                    className="flex items-center justify-center space-x-2 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    <Copy size={18} />
                    <span className="font-medium">{copied ? "¡Copiado!" : "Copiar ID"}</span>
                  </button>
                  
                  <button
                    onClick={handleCreateUser}
                    className="flex items-center justify-center space-x-2 px-6 py-4 bg-white rounded-xl text-black hover:bg-gray-100 transition-all font-medium shadow-lg"
                  >
                    <Users size={18} />
                    <span>Crear Primer Usuario</span>
                  </button>
                </div>

                {/* Next Steps */}
                <div className="text-center pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-500 mb-2">Próximos pasos:</p>
                  <p className="text-sm text-gray-300">
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