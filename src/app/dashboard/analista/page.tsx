"use client";

import React, { useEffect, useState } from "react";
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

const IntegratedAnalysisPage: React.FC = () => {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'plate' | 'critical' | 'waste'>('plate');

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

  // Fetch tires and vehicles from backend
  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      setError("No se encontró el companyId");
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
          throw new Error("Error al obtener las llantas");
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
          setError("Error inesperado");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setAnalysis(null);

    if (!placa.trim()) {
      setSearchError("Por favor ingrese una placa de vehículo");
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
        throw new Error("Error al obtener el análisis");
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      if (err instanceof Error) {
        setSearchError(err.message);
      } else {
        setSearchError("Error inesperado");
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

      {/* Header Navigation - Fully Responsive */}
      <header className="relative bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] rounded-xl text-white py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPGcgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjAzIj4KPGNpcmNsZSBjeD0iMjkiIGN5PSIyOSIgcj0iMiIvPgo8L2c+CjwvZz4KPC9zdmc+')] opacity-40"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Title (hidden on mobile, shown on larger screens) */}
            <div className="hidden sm:block">
              <p className="text-blue-100/80 text-xs sm:text-sm md:text-base flex items-center gap-2">
                Análisis Inteligente Predictivo
              </p>
            </div>
            
            {/* Navigation Buttons - Responsive */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={() => handleViewChange('plate')}
                className={`group relative flex items-center justify-center sm:justify-start gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl text-xs sm:text-sm md:text-base ${
                  currentView === 'plate' 
                    ? 'bg-white/20 backdrop-blur-sm text-white' 
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2 sm:gap-3">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">Análisis por Placa</span>
                </div>
              </button>

              <button 
                onClick={() => handleViewChange('critical')}
                className={`group relative flex items-center justify-center sm:justify-start gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl text-xs sm:text-sm md:text-base ${
                  currentView === 'critical' 
                    ? 'bg-white/20 backdrop-blur-sm text-white' 
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2 sm:gap-3">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">Llantas Críticas</span>
                </div>
              </button>

              <button 
                onClick={() => handleViewChange('waste')}
                className={`group relative flex items-center justify-center sm:justify-start gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl text-xs sm:text-sm md:text-base ${
                  currentView === 'waste' 
                    ? 'bg-white/20 backdrop-blur-sm text-white' 
                    : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2 sm:gap-3">
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">Desechos</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 relative z-10">
        <div className="backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 pointer-events-none"></div>
          
          <div className="relative z-10">
            {currentView === 'critical' && (
              <CriticalTires 
                tires={tires}
                vehicles={vehicles}
                loading={loading}
                error={error}
              />
            )}

            {currentView === 'waste' && (
              <Desechos 
                tires={tires}
                vehicles={vehicles}
                loading={loading}
                error={error}
              />
            )}

            {currentView === 'plate' && (
              <div>
                {/* Analysis by Plate View - Fully Responsive */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-[#1E76B6] to-[#348CCB] rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0A183A] truncate">
                        Análisis de Llantas por Placa
                      </h2>
                      <p className="text-[#173D68]/70 flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">Insights de IA</span>
                      </p>
                    </div>
                  </div>

                  {/* Search Form - Fully Responsive */}
                  <form 
                    onSubmit={handleSearch} 
                    className="mb-6 sm:mb-8 p-4 sm:p-6 md:p-8 bg-gradient-to-br from-white/80 via-blue-50/30 to-indigo-50/30 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/30"
                  >
                    <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-stretch md:items-end">
                      <div className="flex-1 space-y-1.5 sm:space-y-2">
                        <label htmlFor="placa" className="block text-xs sm:text-sm font-semibold text-[#0A183A] flex items-center gap-1.5 sm:gap-2">
                          <Search className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>Placa del Vehículo</span>
                        </label>
                        <input
                          id="placa"
                          type="text"
                          placeholder="Ej. abc-123"
                          value={placa}
                          onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                          className="w-full px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 bg-white/80 backdrop-blur-sm border-2 border-[#1E76B6]/20 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-300 text-sm sm:text-base md:text-lg placeholder-gray-400 shadow-inner"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searchLoading}
                        className="group relative px-4 sm:px-6 md:px-8 py-3 sm:py-3.5 md:py-4 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white rounded-xl sm:rounded-2xl hover:from-[#1E76B6] hover:to-[#348CCB] transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center gap-2 sm:gap-3">
                          {searchLoading ? (
                            <>
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              <span className="font-medium whitespace-nowrap">Analizando...</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                              <span className="font-medium whitespace-nowrap">Analizar</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </form>

                  {/* Error Message - Responsive */}
                  {searchError && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-xl sm:rounded-2xl flex items-start sm:items-center gap-2 sm:gap-3 border border-red-200/50 shadow-sm">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <span className="font-medium text-xs sm:text-sm md:text-base">{searchError}</span>
                    </div>
                  )}

                  {/* Analysis Results - Fully Responsive */}
                  {analysis && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#173D68] truncate">
                            Resultados del Análisis
                          </h3>
                          <p className="text-[#1E76B6] font-medium text-xs sm:text-sm md:text-base">
                            {analysis.tires.length} {analysis.tires.length === 1 ? 'llanta encontrada' : 'llantas encontradas'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                        {analysis.tires.map((tireAnalysis, index) => (
                          <div
                            key={`${tireAnalysis.placa}-${index}`}
                            className="group relative p-4 sm:p-5 md:p-6 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden"
                          >
                            {/* Animated border */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6]/20 via-transparent to-[#348CCB]/20 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="relative z-10">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                                  <h4 className="font-bold text-base sm:text-lg md:text-xl text-[#0A183A] flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-[#1E76B6]">Id:</span>
                                    <span className="break-all">{tireAnalysis.placa}</span>
                                  </h4>
                                  <p className="text-[#173D68] flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
                                    <span className="font-medium">Posición:</span>
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100/60 text-blue-800 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                                      {tireAnalysis.posicion}
                                    </span>
                                  </p>
                                </div>
                                
                                {tireAnalysis.profundidadActual !== null && (
                                  <div className={`text-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold shadow-sm text-sm sm:text-base flex-shrink-0 ${
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

                              <div className="mb-4 sm:mb-6">
                                <h5 className="font-semibold text-[#173D68] mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span>Recomendaciones</span>
                                </h5>
                                <div className="space-y-1.5 sm:space-y-2">
                                  {tireAnalysis.recomendaciones.map((rec: string, recIndex: number) => (
                                    <div key={recIndex} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg sm:rounded-xl border border-blue-100/50">
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#1E76B6] rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                                      <span className="text-[#0A183A] text-xs sm:text-sm leading-relaxed flex-1">{rec}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {tireAnalysis.inspecciones.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-[#173D68] mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span>Historial de Inspecciones</span>
                                  </h5>
                                  <div className="overflow-hidden bg-white/60 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs sm:text-sm">
                                        <thead className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white">
                                          <tr>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-left font-medium whitespace-nowrap">Fecha</th>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium whitespace-nowrap">Int (mm)</th>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium whitespace-nowrap">Cen (mm)</th>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium whitespace-nowrap">Ext (mm)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/50">
                                          {tireAnalysis.inspecciones.map((insp, idx: number) => (
                                            <tr key={idx} className={`transition-colors duration-200 ${idx % 2 === 0 ? "bg-white/40" : "bg-gray-50/40"} hover:bg-blue-50/50`}>
                                              <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-[#0A183A] whitespace-nowrap text-[10px] sm:text-xs">
                                                {new Date(insp.fecha).toLocaleDateString()}
                                              </td>
                                              <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-mono ${insp.profundidadInt <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadInt}
                                              </td>
                                              <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-mono ${insp.profundidadCen <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadCen}
                                              </td>
                                              <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-mono ${insp.profundidadExt <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
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