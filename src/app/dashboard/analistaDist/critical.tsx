import React, { useMemo } from "react";
import { AlertTriangle, Brain, Shield, Eye, ChevronRight } from "lucide-react";

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
  loading: boolean;
  error: string;
}

const CriticalTires: React.FC<CriticalTiresProps> = ({
  tires,
  vehicles,
  loading,
  error
}) => {
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
      recomendaciones.push("🔴 Cambio inmediato: La llanta tiene un desgaste crítico y debe ser reemplazada.");
    } else if (promedio <= 4) {
      recomendaciones.push("🟡 Revisión frecuente: Se recomienda monitorear esta llanta en cada inspección.");
    } else {
      recomendaciones.push("🟢 En buen estado: La llanta está operando dentro de parámetros seguros.");
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
  }, [immediateTires]);

  const getRiskLevel = (average: number) => {
    if (average <= 2) return { level: 'critical', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' };
    if (average <= 4) return { level: 'warning', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { level: 'safe', color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' };
  };

  const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => (
    <span className="font-mono text-sm sm:text-base font-semibold">
      {value.toFixed(1)}{suffix}
    </span>
  );

  return (
    <div className="w-full">
      {/* Header Section - Fully Responsive */}
      <div className="relative mb-4 sm:mb-6 md:mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] opacity-10 blur-3xl"></div>
        <div className="relative backdrop-blur-sm bg-white/80 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 shadow-2xl border border-white/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black bg-gradient-to-r from-[#0A183A] to-[#1E76B6] bg-clip-text text-transparent mb-0.5 sm:mb-1 md:mb-2 break-words leading-tight">
                  Análisis de Llantas Críticas
                </h1>
                <p className="text-[#173D68]/70 text-xs sm:text-sm md:text-base lg:text-lg font-medium flex items-center">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                  <span className="truncate">Análisis Inteligente</span>
                </p>
              </div>
            </div>
            
            {/* Stats Badge */}
            <div className="flex items-center w-full sm:w-auto justify-end sm:justify-start">
              <div className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-lg sm:rounded-xl md:rounded-2xl px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-white shadow-lg">
                <div className="text-center">
                  <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{analyzedTires.length}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm opacity-90 whitespace-nowrap">llantas críticas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State - Responsive */}
      {loading && (
        <div className="relative">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
          <div className="relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl border border-white/50">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-6">
              <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-[#1E76B6] to-[#348CCB] animate-spin">
                  <div className="absolute inset-2 bg-white rounded-full"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-[#1E76B6] animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#0A183A] mb-1 sm:mb-2">Analizando datos...</h3>
                <p className="text-[#173D68]/70 text-xs sm:text-sm md:text-base">IA está procesando datos de llantas...</p>
              </div>
              <div className="flex space-x-1.5 sm:space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-[#1E76B6] animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State - Responsive */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 shadow-lg border border-red-200 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-start gap-1 md:gap-1.5 lg:gap-2
                text-[10px] md:text-xs lg:text-sm
                min-w-max">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl md:rounded-2xl bg-red-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-red-800 mb-0.5 sm:mb-1">Error de Análisis</h3>
              <p className="text-xs sm:text-sm md:text-base text-red-600 break-words">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Critical Tires State - Responsive */}
      {!loading && analyzedTires.length === 0 && (
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-blue-500/20 blur-3xl"></div>
          <div className="relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl border border-white/50 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-3 sm:mb-4 md:mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-xl">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
            </div>
            <h3 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold text-[#0A183A] mb-2 sm:mb-3 md:mb-4 px-2 sm:px-4">No se encontraron llantas que requieran cambio inmediato.</h3>
            <p className="text-[#173D68]/70 text-sm sm:text-base md:text-lg px-2 sm:px-4">Todas las llantas están dentro de los parámetros seguros.</p>
            <div className="mt-4 sm:mt-6 md:mt-8 inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-white font-medium shadow-lg text-xs sm:text-sm md:text-base">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span>Todos los Sistemas Seguros</span>
            </div>
          </div>
        </div>
      )}

      {/* Critical Tires Table - Responsive */}
      {analyzedTires.length > 0 && (
  <div className="relative overflow-hidden w-full max-w-full">
    <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 to-amber-500/10 blur-3xl"></div>
    <div className="relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl border border-white/50 overflow-hidden w-full">
            
            {/* Table Header - Responsive */}
            <div className="bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] p-3 sm:p-4 md:p-2 lg:p-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-2 md:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">Insights de IA</h3>
                    <p className="text-white/80 text-[10px] sm:text-xs md:text-sm">Resultados de análisis de llantas críticas</p>
                  </div>
                </div>
                <div className="bg-white/20 rounded-md sm:rounded-lg md:rounded-xl px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 self-end sm:self-auto">
                  <span className="text-white font-medium text-xs sm:text-sm md:text-base whitespace-nowrap">{analyzedTires.length} items</span>
                </div>
              </div>
            </div>

            {/* Desktop & Tablet Table - Hidden on Mobile */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px] w-full">
              <table className="w-full table-fixed">
                <thead className="bg-gradient-to-r from-slate-100 to-slate-50 sticky top-0 z-10">
                  <tr>
                    {[
                      { key: 'plate', label: 'Placa' },
                      { key: 'brand', label: 'Marca' },
                      { key: 'id', label: 'Id' },
                      { key: 'date', label: 'Fecha Inspección' },
                      { key: 'inner', label: 'Prof. Int (mm)' },
                      { key: 'center', label: 'Prof. Cen (mm)' },
                      { key: 'outer', label: 'Prof. Ext (mm)' },
                      { key: 'avg', label: 'Promedio (mm)' },
                      { key: 'rec', label: 'Recomendaciones' }
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4
                                  text-left text-[10px] md:text-xs lg:text-sm font-semibold
                                  text-[#0A183A] border-b border-slate-200 whitespace-nowrap"
                      >
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
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4">
                          <div className="max-w-[220px] overflow-x-auto">
                            <span className="font-medium text-[#0A183A]
                                        text-xs md:text-sm lg:text-base
                                        whitespace-nowrap min-w-max block">
                              {plateByVehicleId[tire.vehicleId!].toUpperCase() || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4 text-[#173D68] font-medium text-xs md:text-sm lg:text-base">
                          <span className="line-clamp-1">{tire.marca}</span>
                        </td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4 text-[#173D68] font-mono text-[10px] md:text-xs lg:text-sm">
                          <div className="max-w-[160px] overflow-x-auto">
                          <span className="font-mono whitespace-nowrap min-w-max block">
                            {tire.placa}
                          </span>
                        </div>
                        </td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4 text-[#173D68] text-[10px] md:text-xs lg:text-sm truncate max-w-[120px]">{tire.ultimaInspeccionFecha}</td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4">
                          <span className={`px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs lg:text-sm font-medium ${tire.profundidadInt <= 2 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'} inline-flex justify-center max-w-[80px]`}>
                            <AnimatedCounter value={tire.profundidadInt} suffix="mm" />
                          </span>
                        </td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4">
                          <span className={`px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs lg:text-sm font-medium ${tire.profundidadCen <= 2 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'} inline-flex justify-center max-w-[80px]`}>
                            <AnimatedCounter value={tire.profundidadCen} suffix="mm" />
                          </span>
                        </td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4">
                          <span className={`px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs lg:text-sm font-medium ${tire.profundidadExt <= 2 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'} inline-flex justify-center max-w-[80px]`}>
                            <AnimatedCounter value={tire.profundidadExt} suffix="mm" />
                          </span>
                        </td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4">
                          <div className={`inline-flex items-center px-1.5 md:px-2 lg:px-3 py-1 md:py-1.5 lg:py-2 rounded-md md:rounded-lg lg:rounded-xl font-bold text-[10px] md:text-xs lg:text-sm ${risk.bg} ${risk.color} ${risk.border} border whitespace-nowrap`}>
                            <AnimatedCounter value={tire.promedio} suffix="mm" />
                          </div>
                        </td>
                        <td className="px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4">
                          <div className="max-w-[340px] overflow-x-auto">
    <div className="min-w-max space-y-0.5 md:space-y-1">
      {tire.recomendaciones.map((rec, recIndex) => (
        <div
          key={recIndex}
          className="flex items-start gap-1 md:gap-1.5 lg:gap-2
                     text-[10px] md:text-xs lg:text-sm"
        >
          <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3
                                   text-[#1E76B6] mt-0.5 flex-shrink-0" />
          <span className="text-[#173D68] leading-tight whitespace-nowrap">
            {rec}
          </span>
        </div>
      ))}
    </div>
  </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - Only on Small Screens */}
            <div className="md:hidden p-2 sm:p-3 space-y-2 sm:space-y-3">
              {analyzedTires.map((tire, index) => {
                const risk = getRiskLevel(tire.promedio);
                return (
                  <div 
                    key={tire.id} 
                    className={`rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-lg border-2 ${risk.bg} ${risk.border} transition-all duration-300`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#1E76B6] to-[#348CCB] flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {(plateByVehicleId[tire.vehicleId!] || "—").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-[#0A183A] text-sm sm:text-base truncate">{plateByVehicleId[tire.vehicleId!] || "—"}</h4>
                          <p className="text-xs sm:text-sm text-[#173D68] truncate">{tire.marca}</p>
                        </div>
                      </div>
                      <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs sm:text-sm ${risk.color} flex-shrink-0`}>
                        <AnimatedCounter value={tire.promedio} suffix="mm" />
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="mb-2.5 sm:mb-3 pb-2.5 sm:pb-3 border-b border-slate-200">
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                        <div>
                          <span className="text-[#173D68]/70">ID: </span>
                          <span className="font-mono text-[#0A183A] font-medium">{tire.placa}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#173D68]/70">{tire.ultimaInspeccionFecha}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Depth Measurements Grid */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
                      <div className="text-center bg-white/50 rounded-md sm:rounded-lg p-1.5 sm:p-2">
                        <div className="text-[9px] sm:text-[10px] text-[#173D68] mb-0.5 sm:mb-1">Interior</div>
                        <div className={`font-mono font-semibold text-xs sm:text-sm ${tire.profundidadInt <= 2 ? 'text-red-600' : 'text-[#0A183A]'}`}>
                          {tire.profundidadInt.toFixed(1)}mm
                        </div>
                      </div>
                      <div className="text-center bg-white/50 rounded-md sm:rounded-lg p-1.5 sm:p-2">
                        <div className="text-[9px] sm:text-[10px] text-[#173D68] mb-0.5 sm:mb-1">Centro</div>
                        <div className={`font-mono font-semibold text-xs sm:text-sm ${tire.profundidadCen <= 2 ? 'text-red-600' : 'text-[#0A183A]'}`}>
                          {tire.profundidadCen.toFixed(1)}mm
                        </div>
                      </div>
                      <div className="text-center bg-white/50 rounded-md sm:rounded-lg p-1.5 sm:p-2">
                        <div className="text-[9px] sm:text-[10px] text-[#173D68] mb-0.5 sm:mb-1">Exterior</div>
                        <div className={`font-mono font-semibold text-xs sm:text-sm ${tire.profundidadExt <= 2 ? 'text-red-600' : 'text-[#0A183A]'}`}>
                          {tire.profundidadExt.toFixed(1)}mm
                        </div>
                      </div>
                    </div>
                    
                    {/* Recommendations */}
                    <div className="space-y-1.5 sm:space-y-2">
                      {tire.recomendaciones.map((rec, recIndex) => (
                        <div key={recIndex} className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs bg-white/50 rounded-md sm:rounded-lg p-1.5 sm:p-2">
                          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1E76B6] mt-0.5 flex-shrink-0" />
                          <span className="text-[#173D68] leading-snug flex-1">{rec}</span>
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
  );
};

export default CriticalTires;