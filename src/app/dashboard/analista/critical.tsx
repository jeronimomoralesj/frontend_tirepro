import React, { useMemo } from "react";
import { AlertTriangle, Brain, Zap, Shield, TrendingUp, Eye, ChevronRight } from "lucide-react";

// Mock types based on the original component
interface Vehicle {
  id: string;
  placa: string;
}

interface Inspection {
  fecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
}

interface Tire {
  id: string;
  marca: string;
  placa: string;
  posicion?: string;
  vehicleId?: string;
  inspecciones: Inspection[];
}

type TireAnalysis = {
  id: string;
  marca: string;
  placa: string;
  posicion?: string;
  vehicleId?: string;
  ultimaInspeccionFecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  promedio: number;
  recomendaciones: string[];
  inspecciones: Inspection[];
};

interface CriticalTiresProps {
  tires: Tire[];
  vehicles: Vehicle[];
  language: 'en' | 'es';
  loading: boolean;
  error: string;
}

// Language translations
const translations = {
  es: {
    criticalAnalysis: "Análisis de Llantas Críticas",
    aiAnalysis: "Análisis Inteligente",
    noCriticalTires: "No se encontraron llantas que requieran cambio inmediato.",
    allTiresSafe: "Todas las llantas están dentro de los parámetros seguros.",
    plate: "Placa",
    brand: "Marca",
    id: "Id",
    inspectionDate: "Fecha Inspección",
    position: "Posición",
    profInt: "Prof. Int (mm)",
    profCen: "Prof. Cen (mm)",
    profExt: "Prof. Ext (mm)",
    average: "Promedio (mm)",
    recommendations: "Recomendaciones",
    immediateChange: "🔴 Cambio inmediato: La llanta tiene un desgaste crítico y debe ser reemplazada.",
    frequentReview: "🟡 Revisión frecuente: Se recomienda monitorear esta llanta en cada inspección.",
    goodCondition: "🟢 En buen estado: La llanta está operando dentro de parámetros seguros.",
    criticalTires: "llantas críticas",
    analyzing: "Analizando datos...",
    aiInsights: "Insights de IA"
  },
  en: {
    criticalAnalysis: "Critical Tire Analysis",
    aiAnalysis: "AI Analysis",
    noCriticalTires: "No tires requiring immediate replacement were found.",
    allTiresSafe: "All tires are within safe parameters.",
    plate: "Plate",
    brand: "Brand",
    id: "Id",
    inspectionDate: "Inspection Date",
    position: "Position",
    profInt: "Inner Depth (mm)",
    profCen: "Center Depth (mm)",
    profExt: "Outer Depth (mm)",
    average: "Average (mm)",
    recommendations: "Recommendations",
    immediateChange: "🔴 Immediate replacement: Tire has critical wear and must be replaced.",
    frequentReview: "🟡 Frequent review: Monitor this tire at each inspection.",
    goodCondition: "🟢 Good condition: Tire is operating within safe parameters.",
    criticalTires: "critical tires",
    analyzing: "Analyzing data...",
    aiInsights: "AI Insights"
  }
};

const CriticalTires: React.FC<CriticalTiresProps> = ({
  tires,
  vehicles,
  language,
  loading,
  error
}) => {
  const t = translations[language];

  const plateByVehicleId = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v.placa])),
    [vehicles]
  );

  const immediateTires = useMemo(() => {
    return tires.filter((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return false;
      const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
      return (
        lastInspection.profundidadInt <= 2 ||
        lastInspection.profundidadCen <= 2 ||
        lastInspection.profundidadExt <= 2
      );
    });
  }, [tires]);

  const analyzeTire = (tire: Tire): TireAnalysis | null => {
    if (!tire.inspecciones || tire.inspecciones.length === 0) {
      return null;
    }
    
    const lastInspections = [...tire.inspecciones]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 3);
    const latest = lastInspections[0];

    const profundidadInt = Number(latest.profundidadInt) || 0;
    const profundidadCen = Number(latest.profundidadCen) || 0;
    const profundidadExt = Number(latest.profundidadExt) || 0;
    const promedio = (profundidadInt + profundidadCen + profundidadExt) / 3;

    const recomendaciones: string[] = [];
    if (promedio <= 2) {
      recomendaciones.push(t.immediateChange);
    } else if (promedio <= 4) {
      recomendaciones.push(t.frequentReview);
    } else {
      recomendaciones.push(t.goodCondition);
    }

    return {
      id: tire.id,
      marca: tire.marca,
      placa: tire.placa,
      vehicleId: tire.vehicleId,
      posicion: tire.posicion,
      ultimaInspeccionFecha: new Date(latest.fecha).toLocaleDateString(),
      profundidadInt,
      profundidadCen,
      profundidadExt,
      promedio,
      recomendaciones,
      inspecciones: lastInspections
    };
  };

  const analyzedTires = useMemo(() => {
    return immediateTires
      .map((tire) => analyzeTire(tire))
      .filter((x) => x !== null) as TireAnalysis[];
  }, [immediateTires, t]);

  const getRiskLevel = (average: number) => {
    if (average <= 2) return { level: 'critical', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' };
    if (average <= 4) return { level: 'warning', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { level: 'safe', color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' };
  };

  const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => (
    <span className="font-mono text-lg font-semibold animate-pulse">
      {value.toFixed(1)}{suffix}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="relative mb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] opacity-10 blur-3xl"></div>
          <div className="relative backdrop-blur-sm bg-white/80 rounded-3xl p-8 shadow-2xl border border-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E76B6] to-[#348CCB] flex items-center justify-center shadow-xl">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-[#0A183A] to-[#1E76B6] bg-clip-text text-transparent mb-2">
                    {t.criticalAnalysis}
                  </h1>
                  <p className="text-[#173D68]/70 text-lg font-medium flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    {t.aiAnalysis}
                  </p>
                </div>
              </div>
              
              {/* Stats Badge */}
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-2xl px-6 py-3 text-white shadow-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analyzedTires.length}</div>
                    <div className="text-sm opacity-90">{t.criticalTires}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="relative">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50">
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#1E76B6] to-[#348CCB] animate-spin">
                    <div className="absolute inset-2 bg-white rounded-full"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-[#1E76B6] animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-[#0A183A] mb-2">{t.analyzing}</h3>
                  <p className="text-[#173D68]/70">AI is processing tire data...</p>
                </div>
                <div className="flex space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-3 h-3 rounded-full bg-[#1E76B6] animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-3xl p-6 shadow-lg border border-red-200 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Analysis Error</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Critical Tires State */}
        {!loading && analyzedTires.length === 0 && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-blue-500/20 blur-3xl"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-xl">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-[#0A183A] mb-4">{t.noCriticalTires}</h3>
              <p className="text-[#173D68]/70 text-lg">{t.allTiresSafe}</p>
              <div className="mt-8 inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full px-6 py-3 text-white font-medium shadow-lg">
                <Shield className="w-5 h-5" />
                <span>All Systems Safe</span>
              </div>
            </div>
          </div>
        )}

        {/* Critical Tires Table */}
        {analyzedTires.length > 0 && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 to-amber-500/10 blur-3xl"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
              
              {/* Table Header */}
              <div className="bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.aiInsights}</h3>
                      <p className="text-white/80">Critical tire analysis results</p>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-xl px-4 py-2">
                    <span className="text-white font-medium">{analyzedTires.length} items</span>
                  </div>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
                    <tr>
                      {[
                        { key: 'plate', label: t.plate },
                        { key: 'brand', label: t.brand },
                        { key: 'id', label: t.id },
                        { key: 'date', label: t.inspectionDate },
                        { key: 'inner', label: t.profInt },
                        { key: 'center', label: t.profCen },
                        { key: 'outer', label: t.profExt },
                        { key: 'avg', label: t.average },
                        { key: 'rec', label: t.recommendations }
                      ].map((col) => (
                        <th key={col.key} className="px-6 py-4 text-left text-sm font-semibold text-[#0A183A] border-b border-slate-200">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyzedTires.map((tire, index) => {
                      const risk = getRiskLevel(tire.promedio);
                      return (
                        <tr 
                          key={tire.id} 
                          className="hover:bg-slate-50/50 transition-all duration-300 group"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E76B6] to-[#348CCB] flex items-center justify-center text-white font-bold text-sm">
                                {(plateByVehicleId[tire.vehicleId!] || "—").slice(0, 2)}
                              </div>
                              <span className="font-medium text-[#0A183A]">
                                {plateByVehicleId[tire.vehicleId!] || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#173D68] font-medium">{tire.marca}</td>
                          <td className="px-6 py-4 text-[#173D68] font-mono text-sm">{tire.placa}</td>
                          <td className="px-6 py-4 text-[#173D68] text-sm">{tire.ultimaInspeccionFecha}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${tire.profundidadInt <= 2 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                              <AnimatedCounter value={tire.profundidadInt} suffix="mm" />
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${tire.profundidadCen <= 2 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                              <AnimatedCounter value={tire.profundidadCen} suffix="mm" />
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${tire.profundidadExt <= 2 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                              <AnimatedCounter value={tire.profundidadExt} suffix="mm" />
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center px-3 py-2 rounded-xl font-bold text-sm ${risk.bg} ${risk.color} ${risk.border} border`}>
                              <AnimatedCounter value={tire.promedio} suffix="mm" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {tire.recomendaciones.map((rec, recIndex) => (
                                <div key={recIndex} className="flex items-center space-x-2 text-sm">
                                  <ChevronRight className="w-3 h-3 text-[#1E76B6]" />
                                  <span className="text-[#173D68]">{rec}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden p-6 space-y-4">
                {analyzedTires.map((tire, index) => {
                  const risk = getRiskLevel(tire.promedio);
                  return (
                    <div 
                      key={tire.id} 
                      className={`rounded-2xl p-6 shadow-lg border-2 ${risk.bg} ${risk.border} transition-all duration-300 hover:shadow-xl`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E76B6] to-[#348CCB] flex items-center justify-center text-white font-bold">
                            {(plateByVehicleId[tire.vehicleId!] || "—").slice(0, 2)}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#0A183A]">{plateByVehicleId[tire.vehicleId!] || "—"}</h4>
                            <p className="text-sm text-[#173D68]">{tire.marca}</p>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl font-bold ${risk.color}`}>
                          <AnimatedCounter value={tire.promedio} suffix="mm" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <div className="text-xs text-[#173D68] mb-1">Inner</div>
                          <div className={`font-mono font-semibold ${tire.profundidadInt <= 2 ? 'text-red-600' : 'text-[#0A183A]'}`}>
                            {tire.profundidadInt}mm
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-[#173D68] mb-1">Center</div>
                          <div className={`font-mono font-semibold ${tire.profundidadCen <= 2 ? 'text-red-600' : 'text-[#0A183A]'}`}>
                            {tire.profundidadCen}mm
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-[#173D68] mb-1">Outer</div>
                          <div className={`font-mono font-semibold ${tire.profundidadExt <= 2 ? 'text-red-600' : 'text-[#0A183A]'}`}>
                            {tire.profundidadExt}mm
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {tire.recomendaciones.map((rec, recIndex) => (
                          <div key={recIndex} className="flex items-start space-x-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-[#1E76B6] mt-0.5 flex-shrink-0" />
                            <span className="text-[#173D68]">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CriticalTires;