"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, Search, TrendingUp, AlertCircle, Sparkles, Zap, Brain, Activity, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CriticalTires from "./critical";
import Desechos from "./desechos";

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
  cpk?: number;
  cpkProyectado?: number;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion?: string;
  inspecciones?: Inspection[];
  vehicleId?: string;
};

interface Vehicle {
  id: string;
  placa: string;
}

// Language translations
const translations = {
  es: {
    title: "Sistema de Gestión de Llantas",
    aiSubtitle: "Análisis Inteligente Predictivo",
    criticalAnalysis: "Análisis de Llantas Críticas",
    plateAnalysis: "Análisis de Llantas por Placa",
    wasteAnalysis: "Gestión de Desechos",
    goToPlateAnalysis: "Ir a Análisis por Placa",
    viewCriticalTires: "Ver Llantas Críticas",
    viewWaste: "Ver Análisis de Desechos",
    loading: "Cargando...",
    searching: "Analizando...",
    search: "Analizar",
    noCompanyId: "No se encontró el companyId",
    errorFetchingTires: "Error al obtener las llantas",
    errorFetchingAnalysis: "Error al obtener el análisis",
    unexpectedError: "Error inesperado",
    enterPlate: "Por favor ingrese una placa de vehículo",
    vehiclePlate: "Placa del Vehículo",
    platePlaceholder: "Ej. abc-123",
    analysisResults: "Resultados del Análisis",
    tiresFound: "llantas encontradas",
    tireFound: "llanta encontrada",
    id: "Id",
    position: "Posición",
    recommendations: "Recomendaciones",
    inspectionHistory: "Historial de Inspecciones",
    date: "Fecha",
    aiInsights: "Insights de IA",
    predictiveAnalysis: "Análisis Predictivo",
    immediateChange: "🔴 Cambio inmediato: La llanta tiene un desgaste crítico y debe ser reemplazada.",
    frequentReview: "🟡 Revisión frecuente: Se recomienda monitorear esta llanta en cada inspección.",
    goodCondition: "🟢 En buen estado: La llanta está operando dentro de parámetros seguros."
  },
  en: {
    title: "Tire Management System",
    aiSubtitle: "Predictive Intelligence Analysis",
    criticalAnalysis: "Critical Tire Analysis",
    plateAnalysis: "Tire Analysis by Plate",
    wasteAnalysis: "Waste Management",
    goToPlateAnalysis: "Go to Plate Analysis",
    viewCriticalTires: "View Critical Tires",
    viewWaste: "View Waste Analysis",
    loading: "Loading...",
    searching: "Analyzing...",
    search: "Analyze",
    noCompanyId: "Company ID not found",
    errorFetchingTires: "Error fetching tires",
    errorFetchingAnalysis: "Error fetching analysis",
    unexpectedError: "Unexpected error",
    enterPlate: "Please enter a vehicle plate",
    vehiclePlate: "Vehicle Plate",
    platePlaceholder: "Ex. abc-123",
    analysisResults: "Analysis Results",
    tiresFound: "tires found",
    tireFound: "tire found",
    id: "Id",
    position: "Position",
    recommendations: "Recommendations",
    inspectionHistory: "Inspection History",
    date: "Date",
    aiInsights: "AI Insights",
    predictiveAnalysis: "Predictive Analysis",
    immediateChange: "🔴 Immediate replacement: Tire has critical wear and must be replaced.",
    frequentReview: "🟡 Frequent review: Monitor this tire at each inspection.",
    goodCondition: "🟢 Good condition: Tire is operating within safe parameters."
  }
};

const IntegratedAnalysisPage: React.FC = () => {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'plate' | 'critical' | 'waste'>('plate');

  // Language detection
  const [language, setLanguage] = useState<'en'|'es'>('es');

  // Analysis search states
  const [placa, setPlaca] = useState("");
  type TireAnalysisResponse = {
    tires: {
      placa: string;
      posicion: string;
      profundidadActual: number;
      recomendaciones: string[];
      inspecciones: Inspection[];
    }[];
  };
  
  const [analysis, setAnalysis] = useState<TireAnalysisResponse | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const t = translations[language];

  // Language detection effect
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

  // Fetch tires and vehicles from backend
  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      setError(t.noCompanyId);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [tiresRes, vehiclesRes] = await Promise.all([
          fetch(
            process.env.NEXT_PUBLIC_API_URL
              ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
              : `https://api.tirepro.com.co/api/tires?companyId=${companyId}`
          ),
          fetch(
            process.env.NEXT_PUBLIC_API_URL
              ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
              : `https://api.tirepro.com.co/api/vehicles?companyId=${companyId}`
          )
        ]);

        if (!tiresRes.ok) {
          throw new Error(t.errorFetchingTires);
        }

        const tiresData: Tire[] = await tiresRes.json();
        setTires(tiresData);

        if (vehiclesRes.ok) {
          const vehiclesData: Vehicle[] = await vehiclesRes.json();
          setVehicles(vehiclesData);
        }

      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t.unexpectedError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, t]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setAnalysis(null);

    if (!placa.trim()) {
      setSearchError(t.enterPlate);
      return;
    }

    setSearchLoading(true);
    try {
      const lowerPlaca = placa.trim().toLowerCase();
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/analyze?placa=${encodeURIComponent(lowerPlaca)}`
          : `https://api.tirepro.com.co/api/tires/analyze?placa=${encodeURIComponent(lowerPlaca)}`
      );
      if (!res.ok) {
        throw new Error(t.errorFetchingAnalysis);
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      if (err instanceof Error) {
        setSearchError(err.message);
      } else {
        setSearchError(t.unexpectedError);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleViewChange = (view: 'plate' | 'critical' | 'waste') => {
    setCurrentView(view);
    if (view !== 'plate') {
      setAnalysis(null);
      setPlaca("");
      setSearchError("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header Navigation */}
      <header className="relative bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] rounded-xl text-white py-8 px-6 shadow-2xl overflow-hidden ">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPGcgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjAzIj4KPGNpcmNsZSBjeD0iMjkiIGN5PSIyOSIgcj0iMiIvPgo8L2c+CjwvZz4KPC9zdmc+')] opacity-40"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-blue-100/80 text-sm md:text-base flex items-center gap-2 mt-1">
                  <Sparkles className="w-4 h-4" />
                  {t.aiSubtitle}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleViewChange('plate')}
                className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                  currentView === 'plate' 
                    ? 'bg-white/20 backdrop-blur-sm text-white' 
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-3">
                  <Search className="w-5 h-5" />
                  <span className="font-medium">{t.goToPlateAnalysis}</span>
                </div>
              </button>

              <button 
                onClick={() => handleViewChange('critical')}
                className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                  currentView === 'critical' 
                    ? 'bg-white/20 backdrop-blur-sm text-white' 
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">{t.viewCriticalTires}</span>
                </div>
              </button>

              <button 
                onClick={() => handleViewChange('waste')}
                className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                  currentView === 'waste' 
                    ? 'bg-white/20 backdrop-blur-sm text-white' 
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-3">
                  <Trash2 className="w-5 h-5" />
                  <span className="font-medium">{t.viewWaste}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 relative z-10">
        <div className="backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 pointer-events-none"></div>
          
          <div className="relative z-10">
            {currentView === 'critical' && (
              <CriticalTires 
                tires={tires}
                vehicles={vehicles}
                language={language}
                loading={loading}
                error={error}
              />
            )}

            {currentView === 'waste' && (
              <Desechos 
                tires={tires}
                vehicles={vehicles}
                language={language}
                loading={loading}
                error={error}
              />
            )}

            {currentView === 'plate' && (
              <div>
                {/* Analysis by Plate View */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-[#1E76B6] to-[#348CCB] rounded-2xl shadow-lg">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-[#0A183A]">
                        {t.plateAnalysis}
                      </h2>
                      <p className="text-[#173D68]/70 flex items-center gap-2 mt-1">
                        <Zap className="w-4 h-4" />
                        {t.aiInsights}
                      </p>
                    </div>
                  </div>

                  {/* Search Form */}
                  <form 
                    onSubmit={handleSearch} 
                    className="mb-8 p-8 bg-gradient-to-br from-white/80 via-blue-50/30 to-indigo-50/30 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30"
                  >
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                      <div className="flex-1 space-y-2">
                        <label htmlFor="placa" className="block text-sm font-semibold text-[#0A183A] flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          {t.vehiclePlate}
                        </label>
                        <input
                          id="placa"
                          type="text"
                          placeholder={t.platePlaceholder}
                          value={placa}
                          onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                          className="w-full px-6 py-4 bg-white/80 backdrop-blur-sm border-2 border-[#1E76B6]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-300 text-lg placeholder-gray-400 shadow-inner"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searchLoading}
                        className="group relative px-8 py-4 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white rounded-2xl hover:from-[#1E76B6] hover:to-[#348CCB] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 w-full md:w-auto shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center gap-3">
                          {searchLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              <span className="font-medium">{t.searching}</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-5 h-5" />
                              <span className="font-medium">{t.search}</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </form>

                  {/* Error Message */}
                  {searchError && (
                    <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-2xl flex items-center border border-red-200/50 shadow-sm">
                      <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="font-medium">{searchError}</span>
                    </div>
                  )}

                  {/* Analysis Results */}
                  {analysis && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-[#173D68]">
                            {t.analysisResults}
                          </h3>
                          <p className="text-[#1E76B6] font-medium">
                            {analysis.tires.length} {analysis.tires.length === 1 ? t.tireFound : t.tiresFound}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {analysis.tires.map((tireAnalysis, index) => (
                          <div
                            key={`${tireAnalysis.placa}-${index}`}
                            className="group relative p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden"
                          >
                            {/* Animated border */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6]/20 via-transparent to-[#348CCB]/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="relative z-10">
                              <div className="flex justify-between items-start mb-6">
                                <div className="space-y-2">
                                  <h4 className="font-bold text-xl text-[#0A183A] flex items-center gap-2">
                                    <span className="text-[#1E76B6]">{t.id}:</span>
                                    {tireAnalysis.placa}
                                  </h4>
                                  <p className="text-[#173D68] flex items-center gap-2">
                                    <span className="font-medium">{t.position}:</span>
                                    <span className="px-3 py-1 bg-blue-100/60 text-blue-800 rounded-full text-sm font-medium">
                                      {tireAnalysis.posicion}
                                    </span>
                                  </p>
                                </div>
                                
                                {tireAnalysis.profundidadActual !== null && (
                                  <div className={`text-center px-4 py-2 rounded-2xl font-bold shadow-sm ${
                                    tireAnalysis.profundidadActual <= 2 
                                      ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200" 
                                      : tireAnalysis.profundidadActual <= 4 
                                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-200"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200"
                                  }`}>
                                    {tireAnalysis.profundidadActual.toFixed(1)} mm
                                  </div>
                                )}
                              </div>

                              <div className="mb-6">
                                <h5 className="font-semibold text-[#173D68] mb-3 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4" />
                                  {t.recommendations}
                                </h5>
                                <div className="space-y-2">
                                  {tireAnalysis.recomendaciones.map((rec: string, recIndex: number) => (
                                    <div key={recIndex} className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-100/50">
                                      <div className="w-2 h-2 bg-[#1E76B6] rounded-full mt-2 flex-shrink-0"></div>
                                      <span className="text-[#0A183A] text-sm leading-relaxed">{rec}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {tireAnalysis.inspecciones.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-[#173D68] mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    {t.inspectionHistory}
                                  </h5>
                                  <div className="overflow-hidden bg-white/60 backdrop-blur-sm rounded-xl border border-white/30">
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-sm">
                                        <thead className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white">
                                          <tr>
                                            <th className="py-3 px-4 text-left font-medium">{t.date}</th>
                                            <th className="py-3 px-4 text-right font-medium">Int (mm)</th>
                                            <th className="py-3 px-4 text-right font-medium">Cen (mm)</th>
                                            <th className="py-3 px-4 text-right font-medium">Ext (mm)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/50">
                                          {tireAnalysis.inspecciones.map((insp, idx: number) => (
                                            <tr key={idx} className={`transition-colors duration-200 ${idx % 2 === 0 ? "bg-white/40" : "bg-gray-50/40"} hover:bg-blue-50/50`}>
                                              <td className="py-3 px-4 font-medium text-[#0A183A]">
                                                {new Date(insp.fecha).toLocaleDateString()}
                                              </td>
                                              <td className={`py-3 px-4 text-right font-mono ${insp.profundidadInt <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadInt}
                                              </td>
                                              <td className={`py-3 px-4 text-right font-mono ${insp.profundidadCen <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadCen}
                                              </td>
                                              <td className={`py-3 px-4 text-right font-mono ${insp.profundidadExt <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadExt}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedAnalysisPage;