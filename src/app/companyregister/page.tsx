"use client";

import { useState, useEffect } from "react";
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
  ChevronRight
} from "lucide-react";

type UserType = "individual" | "fleet" | "distributor" | null;
type Language = "en" | "es";

// Translations object
const translations = {
  en: {
    // User Type Selection
    backToHome: "Back to Home",
    whatIsYourProfile: "What's Your Profile?",
    selectOptionDescription: "Select the option that best describes your business to personalize your experience",
    individual: {
      title: "Individual Owner",
      subtitle: "1-5 vehicles",
      description: "Perfect for individual owners or small fleets",
      plan: "mini"
    },
    fleet: {
      title: "Fleet Company",
      subtitle: "Multiple vehicles",
      description: "Ideal for companies with medium and large fleets seeking optimization",
      plan: "pro"
    },
    distributor: {
      title: "Retail",
      subtitle: "Client management",
      description: "Complete solution for distributors managing multiple clients",
      plan: "retail"
    },
    needHelp: "Need help deciding?",
    talkToTeam: "Talk to our team",
    
    // Company Details
    changeProfileType: "Change profile type",
    registerCompany: "Register Company",
    completeDataDescription: "Complete the information to create your business account",
    companyName: "Company Name",
    companyNamePlaceholder: "Enter your company name",
    selectedPlan: "Selected Plan",
    acceptTerms: "I accept the",
    termsOfService: "Terms of Service",
    and: "and",
    privacyPolicy: "Privacy Policy",
    registeringCompany: "Registering company...",
    registerCompanyButton: "Register Company",
    
    // Success State
    successfulRegistration: "Successful Registration!",
    companyRegisteredSuccess: "Your company has been successfully registered in TirePro",
    companyId: "Company ID",
    important: "Important!",
    saveIdWarning: "Save this company ID in a safe place. You'll need it to create the first user and access your account.",
    copyId: "Copy ID",
    copied: "Copied!",
    createFirstUser: "Create First User",
    nextSteps: "Next steps:",
    createAdminDescription: "Create your first admin user to start using TirePro",
    
    // Error messages
    mustAcceptTerms: "You must accept the terms and conditions to continue",
    companyNameRequired: "Company name is required",
    registrationError: "Error registering company",
    unexpectedError: "An unexpected error occurred"
  },
  es: {
    // User Type Selection
    backToHome: "Volver al inicio",
    whatIsYourProfile: "¿Cuál es tu perfil?",
    selectOptionDescription: "Selecciona la opción que mejor describe tu negocio para personalizar tu experiencia",
    individual: {
      title: "Propietario Individual",
      subtitle: "1-5 vehículos",
      description: "Perfecto para propietarios individuales o pequeñas flotas",
      plan: "mini"
    },
    fleet: {
      title: "Empresa con Flota",
      subtitle: "Más de 5 vehículos",
      description: "Ideal para empresas con flotas medianas y grandes que buscan optimización",
      plan: "pro"
    },
    distributor: {
      title: "Distribuidor",
      subtitle: "Gestión para clientes",
      description: "Solución completa para distribuidores que manejan múltiples clientes",
      plan: "retail"
    },
    needHelp: "¿Necesitas ayuda para decidir?",
    talkToTeam: "Habla con nuestro equipo",
    
    // Company Details
    changeProfileType: "Cambiar tipo de perfil",
    registerCompany: "Registrar Empresa",
    completeDataDescription: "Complete los datos para crear su cuenta empresarial",
    companyName: "Nombre de la Empresa",
    companyNamePlaceholder: "Ingresa el nombre de tu empresa",
    selectedPlan: "Plan Seleccionado",
    acceptTerms: "Acepto los",
    termsOfService: "Términos de Servicio",
    and: "y la",
    privacyPolicy: "Política de Privacidad",
    registeringCompany: "Registrando empresa...",
    registerCompanyButton: "Registrar Empresa",
    
    // Success State
    successfulRegistration: "¡Registro Exitoso!",
    companyRegisteredSuccess: "Tu empresa ha sido registrada correctamente en TirePro",
    companyId: "ID de Empresa",
    important: "¡Importante!",
    saveIdWarning: "Guarda este ID de empresa en un lugar seguro. Lo necesitarás para crear el primer usuario y acceder a tu cuenta.",
    copyId: "Copiar ID",
    copied: "¡Copiado!",
    createFirstUser: "Crear Primer Usuario",
    nextSteps: "Próximos pasos:",
    createAdminDescription: "Crea tu primer usuario administrador para comenzar a usar TirePro",
    
    // Error messages
    mustAcceptTerms: "Debes aceptar los términos y condiciones para continuar",
    companyNameRequired: "El nombre de la empresa es obligatorio",
    registrationError: "Error al registrar la empresa",
    unexpectedError: "Ocurrió un error inesperado"
  }
};

export default function CompanyRegisterPage() {
  const [step, setStep] = useState<"userType" | "companyDetails">("userType");
  const [userType, setUserType] = useState<UserType>(null);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("Pro");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<Language>("es");
  const [locationDetected, setLocationDetected] = useState(false);

  const router = useRouter();

  // Language detection based on location
  useEffect(() => {
    const detectLanguageFromLocation = async () => {
      try {
        // First, try to get user's position
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 300000 // Cache for 5 minutes
          });
        });

        // Use reverse geocoding to get country information
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
        );

        if (response.ok) {
          const data = await response.json();
          const countryCode = data.countryCode;

          // Set language based on country
          if (countryCode === 'US' || countryCode === 'CA') {
            setLanguage('en');
          } else {
            // Default to Spanish for all other American countries and worldwide
            setLanguage('es');
          }

          setLocationDetected(true);
          console.log(`Location detected: ${data.countryName} (${countryCode}), Language set to: ${countryCode === 'US' || countryCode === 'CA' ? 'English' : 'Spanish'}`);
        }
      } catch (error) {
        console.log('Geolocation failed, using browser language as fallback:', error);

        // Fallback to browser language detection
        const browserLang = navigator.language || navigator.languages?.[0] || 'es';

        if (browserLang.startsWith('en')) {
          setLanguage('en');
        } else {
          setLanguage('es'); // Default to Spanish
        }

        setLocationDetected(true);
        console.log(`Browser language detected: ${browserLang}, Language set to: ${browserLang.startsWith('en') ? 'English' : 'Spanish'}`);
      }
    };

    detectLanguageFromLocation();
  }, []);

  const t = translations[language];

  const userTypeOptions = [
    {
      id: "individual" as UserType,
      title: t.individual.title,
      subtitle: t.individual.subtitle,
      description: t.individual.description,
      icon: Users,
      plan: t.individual.plan,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/30 hover:border-emerald-400/60"
    },
    {
      id: "fleet" as UserType,
      title: t.fleet.title,
      subtitle: t.fleet.subtitle,
      description: t.fleet.description,
      icon: Truck,
      plan: t.fleet.plan,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30 hover:border-blue-400/60"
    },
    {
      id: "distributor" as UserType,
      title: t.distributor.title,
      subtitle: t.distributor.subtitle,
      description: t.distributor.description,
      icon: Building2,
      plan: t.distributor.plan,
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
    setStep("companyDetails");
  };

  const handleBackToUserType = () => {
    setStep("userType");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      setError(t.mustAcceptTerms);
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      if (!name.trim()) {
        throw new Error(t.companyNameRequired);
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
        throw new Error(data.message || t.registrationError);
      }

      setCompanyId(data.companyId); 
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.unexpectedError);
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

  // Show loading state while detecting language
  if (!locationDetected) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#348CCB]/30 border-t-[#348CCB] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // User Type Selection Step
  if (step === "userType") {
    return (
      <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A183A]/40 via-transparent to-[#173D68]/20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#348CCB]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="border-b border-[#173D68]/30 bg-[#030712]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Link href="/" className="inline-flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <ArrowLeft size={20} />
                <span>{t.backToHome}</span>
              </Link>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent">
                {t.whatIsYourProfile}
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                {t.selectOptionDescription}
              </p>
            </div>

            {/* User Type Cards */}
            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {userTypeOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.id}
                    onClick={() => handleUserTypeSelection(option.id)}
                    className={`group relative cursor-pointer rounded-2xl bg-gradient-to-br ${option.gradient} border ${option.borderColor} backdrop-blur-lg transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-[#348CCB]/20`}
                  >
                    {/* Glow effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#348CCB]/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur"></div>
                    
                    <div className="relative bg-gradient-to-br from-[#0A183A]/80 to-[#173D68]/40 rounded-2xl p-8 border border-[#173D68]/30">
                      {/* Icon */}
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/30 border border-[#173D68]/30 mb-6 ${option.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent size={28} />
                      </div>

                      {/* Content */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2 group-hover:text-[#348CCB] transition-colors">
                            {option.title}
                          </h3>
                          <p className="text-[#348CCB] font-semibold text-lg">
                            {option.subtitle}
                          </p>
                        </div>

                        <p className="text-gray-300 leading-relaxed">
                          {option.description}
                        </p>

                        {/* Plan Badge */}
                        <div className="flex items-center justify-between pt-4 border-t border-[#173D68]/30">
                          <div className="flex items-center space-x-2">
                            <Shield size={16} className="text-[#348CCB]" />
                            <span className="text-sm font-medium text-[#348CCB]">
                               {option.plan.charAt(0).toUpperCase() + option.plan.slice(1)}
                            </span>
                          </div>
                          <ChevronRight className="text-gray-400 group-hover:text-[#348CCB] group-hover:translate-x-1 transition-all" size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <div className="text-center mt-16">
              <p className="text-gray-400 mb-4">{t.needHelp}</p>
              <Link href="/contact" className="inline-flex items-center space-x-2 text-[#348CCB] hover:text-white transition-colors">
                <span>{t.talkToTeam}</span>
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
    <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A183A]/40 via-transparent to-[#173D68]/20"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#348CCB]/5 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-[#173D68]/30 bg-[#030712]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={handleBackToUserType}
              className="inline-flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>{t.changeProfileType}</span>
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {!companyId ? (
            <>
              {/* Form Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/30 border border-[#173D68]/30 mb-6">
                  <IconComponent size={32} className={selectedOption?.iconColor} />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
                  {t.registerCompany}
                </h1>
                <p className="text-gray-300 mb-6">
                  {t.completeDataDescription}
                </p>
                
                {selectedOption && (
                  <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0A183A]/60 to-[#173D68]/30 rounded-full border border-[#173D68]/30">
                    <IconComponent size={16} className={`mr-2 ${selectedOption.iconColor}`} />
                    <span className="text-sm">
                      {selectedOption.title} - Plan <span className="font-semibold text-[#348CCB]">{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/40 rounded-2xl border border-[#173D68]/30 backdrop-blur-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      {t.companyName} *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-1 focus:ring-[#348CCB] transition-colors"
                      placeholder={t.companyNamePlaceholder}
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      {t.selectedPlan}
                    </label>
                    <div className="px-4 py-3 bg-[#0A183A]/20 border border-[#173D68]/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/30 flex items-center justify-center ${selectedOption?.iconColor}`}>
                            <IconComponent size={16} />
                          </div>
                          <div>
                            <span className="text-white font-medium capitalize">{plan}</span>
                            <p className="text-sm text-gray-400">{selectedOption?.subtitle}</p>
                          </div>
                        </div>
                        <Zap className="text-[#348CCB]" size={20} />
                      </div>
                    </div>
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
                      {t.acceptTerms}{" "}
                      <Link href="/legal#terms-section" className="text-[#348CCB] hover:underline">
                        {t.termsOfService}
                      </Link>{" "}
                      {t.and}{" "}
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
                        <span>{t.registeringCompany}</span>
                      </div>
                    ) : (
                      t.registerCompanyButton
                    )}
                  </button>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
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
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-6">
                  <Check size={32} className="text-emerald-400" />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-transparent">
                  {t.successfulRegistration}
                </h1>
                <p className="text-gray-300">
                  {t.companyRegisteredSuccess}
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/40 rounded-2xl border border-[#173D68]/30 backdrop-blur-lg p-8 space-y-6">
                {/* Company ID */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">{t.companyId}</h3>
                  <div className="bg-[#0A183A]/60 rounded-lg p-4 border border-[#173D68]/30">
                    <p className="text-2xl font-mono font-bold text-[#348CCB] break-all select-all">
                      {companyId}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#030712] text-xs font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-1">{t.important}</h4>
                      <p className="text-amber-300 text-sm">
                        {t.saveIdWarning}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleCopyId}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white hover:bg-[#0A183A]/60 hover:border-[#348CCB]/30 transition-all"
                  >
                    <Copy size={16} />
                    <span>{copied ? t.copied : t.copyId}</span>
                  </button>
                  
                  <button
                    onClick={handleCreateUser}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] rounded-lg text-white hover:from-[#1E76B6] hover:to-[#348CCB] transition-all shadow-lg hover:shadow-[#348CCB]/25"
                  >
                    <Users size={16} />
                    <span>{t.createFirstUser}</span>
                  </button>
                </div>

                {/* Next Steps */}
                <div className="text-center pt-4 border-t border-[#173D68]/30">
                  <p className="text-sm text-gray-400 mb-2">{t.nextSteps}</p>
                  <p className="text-sm text-gray-300">
                    {t.createAdminDescription}
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