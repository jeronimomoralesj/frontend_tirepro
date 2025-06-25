"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, Search, TrendingUp, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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

// Language translations
const translations = {
  es: {
    title: "Sistema de Gestión de Llantas",
    criticalAnalysis: "Análisis de Llantas Críticas",
    plateAnalysis: "Análisis de Llantas por Placa",
    goToPlateAnalysis: "Ir a Análisis por Placa",
    viewCriticalTires: "Ver Llantas Críticas",
    loading: "Cargando...",
    searching: "Buscando...",
    search: "Buscar",
    noCompanyId: "No se encontró el companyId",
    errorFetchingTires: "Error al obtener las llantas",
    errorFetchingAnalysis: "Error al obtener el análisis",
    unexpectedError: "Error inesperado",
    enterPlate: "Por favor ingrese una placa de vehículo",
    vehiclePlate: "Placa del Vehículo",
    platePlaceholder: "Ej. abc-123",
    noCriticalTires: "No se encontraron llantas que requieran cambio inmediato.",
    allTiresSafe: "Todas las llantas están dentro de los parámetros seguros.",
    analysisResults: "Resultados del Análisis",
    tiresFound: "llantas encontradas",
    tireFound: "llanta encontrada",
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
    inspectionHistory: "Historial de Inspecciones",
    date: "Fecha",
    immediateChange: "🔴 Cambio inmediato: La llanta tiene un desgaste crítico y debe ser reemplazada.",
    frequentReview: "🟡 Revisión frecuente: Se recomienda monitorear esta llanta en cada inspección.",
    goodCondition: "🟢 En buen estado: La llanta está operando dentro de parámetros seguros."
  },
  en: {
    title: "Tire Management System",
    criticalAnalysis: "Critical Tire Analysis",
    plateAnalysis: "Tire Analysis by Plate",
    goToPlateAnalysis: "Go to Plate Analysis",
    viewCriticalTires: "View Critical Tires",
    loading: "Loading...",
    searching: "Searching...",
    search: "Search",
    noCompanyId: "Company ID not found",
    errorFetchingTires: "Error fetching tires",
    errorFetchingAnalysis: "Error fetching analysis",
    unexpectedError: "Unexpected error",
    enterPlate: "Please enter a vehicle plate",
    vehiclePlate: "Vehicle Plate",
    platePlaceholder: "Ex. abc-123",
    noCriticalTires: "No tires requiring immediate replacement were found.",
    allTiresSafe: "All tires are within safe parameters.",
    analysisResults: "Analysis Results",
    tiresFound: "tires found",
    tireFound: "tire found",
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
    inspectionHistory: "Inspection History",
    date: "Date",
    immediateChange: "🔴 Immediate replacement: Tire has critical wear and must be replaced.",
    frequentReview: "🟡 Frequent review: Monitor this tire at each inspection.",
    goodCondition: "🟢 Good condition: Tire is operating within safe parameters."
  }
};

const IntegratedAnalysisPage: React.FC = () => {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCriticalTires, setShowCriticalTires] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

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

  // Fetch tires from backend
  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      setError(t.noCompanyId);
      return;
    }

    const fetchTires = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
            : `https://api.tirepro.com.co/api/tires?companyId=${companyId}`
        );
        if (!res.ok) {
          throw new Error(t.errorFetchingTires);
        }
        const data: Tire[] = await res.json();
        setTires(data);

        const resV = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
            : `https://api.tirepro.com.co/api/vehicles?companyId=${companyId}`
        );
        if (resV.ok) {
          const vehData: Vehicle[] = await resV.json();
          setVehicles(vehData);
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

    fetchTires();
  }, [router, t]);

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

  const toggleView = () => {
    setShowCriticalTires(!showCriticalTires);
    if (!showCriticalTires) {
      setAnalysis(null);
      setPlaca("");
      setSearchError("");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header Navigation */}
      <header className="bg-[#0A183A] text-white py-4 px-6 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <button 
            onClick={toggleView} 
            className="flex items-center gap-2 bg-[#1E76B6] text-white px-4 py-2 rounded-md hover:bg-[#348CCB] transition-all transform hover:scale-105"
          >
            <span>{showCriticalTires ? t.goToPlateAnalysis : t.viewCriticalTires}</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {showCriticalTires ? (
            /* Critical Tires View */
            <>
              <h2 className="text-3xl font-bold mb-6 text-[#0A183A] border-b-2 border-[#1E76B6]/20 pb-3">
                {t.criticalAnalysis}
              </h2>

              {loading && (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E76B6]"></div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center my-4 border border-red-200">
                  <AlertTriangle className="mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && analyzedTires.length === 0 && (
                <div className="bg-blue-50 rounded-lg p-8 text-center">
                  <p className="text-lg text-[#173D68]">{t.noCriticalTires}</p>
                  <p className="text-sm text-[#1E76B6] mt-2">{t.allTiresSafe}</p>
                </div>
              )}

              {analyzedTires.length > 0 && (
                <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-[#173D68] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.plate}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.brand}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.id}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.inspectionDate}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.profInt}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.profCen}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.profExt}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.average}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t.recommendations}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyzedTires.map((tire, index) => (
                        <tr 
                          key={tire.id} 
                          className={`border-b hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3 text-sm">
                            {plateByVehicleId[tire.vehicleId!] || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm">{tire.marca}</td>
                          <td className="px-4 py-3 text-sm">{tire.placa}</td>
                          <td className="px-4 py-3 text-sm">{tire.ultimaInspeccionFecha}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={tire.profundidadInt <= 2 ? "text-red-600 font-semibold" : ""}>
                              {tire.profundidadInt} mm
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={tire.profundidadCen <= 2 ? "text-red-600 font-semibold" : ""}>
                              {tire.profundidadCen} mm
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={tire.profundidadExt <= 2 ? "text-red-600 font-semibold" : ""}>
                              {tire.profundidadExt} mm
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span 
                              className={`font-medium ${
                                tire.promedio <= 2 
                                  ? "text-red-600" 
                                  : tire.promedio <= 4 
                                  ? "text-amber-600" 
                                  : "text-green-600"
                              }`}
                            >
                              {tire.promedio.toFixed(2)} mm
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <ul className="list-disc list-inside text-sm">
                              {tire.recomendaciones.map((rec, recIndex) => (
                                <li key={recIndex}>{rec}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            /* Analysis by Plate View */
            <>
              <h2 className="text-3xl font-bold mb-6 text-[#0A183A] border-b-2 border-[#1E76B6]/20 pb-3">
                {t.plateAnalysis}
              </h2>

              {/* Search Form */}
              <form 
                onSubmit={handleSearch} 
                className="mb-8 p-6 bg-gradient-to-r from-[#173D68]/5 to-[#1E76B6]/5 rounded-lg shadow-sm"
              >
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label htmlFor="placa" className="block text-sm font-medium text-[#0A183A] mb-2">
                      {t.vehiclePlate}
                    </label>
                    <input
                      id="placa"
                      type="text"
                      placeholder={t.platePlaceholder}
                      value={placa}
                      onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                      className="w-full px-4 py-3 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="px-6 py-3 bg-[#0A183A] text-white rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full md:w-auto"
                  >
                    {searchLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t.searching}
                      </span>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        {t.search}
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Error Message */}
              {searchError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center border border-red-200">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Analysis Results */}
              {analysis && (
                <div className="animate-fadeIn">
                  <h3 className="text-2xl font-bold mb-4 text-[#173D68]">
                    {t.analysisResults}
                    <span className="ml-2 text-[#1E76B6]">
                      {analysis.tires.length} {analysis.tires.length === 1 ? t.tireFound : t.tiresFound}
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analysis.tires.map((tireAnalysis, index) => (
                      <div
                        key={`${tireAnalysis.placa}-${index}`}
                        className="p-6 bg-white rounded-lg shadow-md border-l-4 border-[#1E76B6] hover:shadow-lg transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-lg text-[#0A183A]">
                              {t.id}: {tireAnalysis.placa}
                            </h4>
                            <p className="text-[#173D68]">
                              {t.position}: <span className="font-medium">{tireAnalysis.posicion}</span>
                            </p>
                          </div>
                          
                          {tireAnalysis.profundidadActual !== null && (
                            <div className={`text-center px-3 py-1 rounded-full font-bold ${
                              tireAnalysis.profundidadActual <= 2 
                                ? "bg-red-100 text-red-600" 
                                : tireAnalysis.profundidadActual <= 4 
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-green-100 text-green-600"
                            }`}>
                              {tireAnalysis.profundidadActual.toFixed(1)} mm
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <h5 className="font-semibold text-[#173D68] mb-2 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            {t.recommendations}
                          </h5>
                          <ul className="space-y-1 text-sm bg-gray-50 p-3 rounded-md">
                            {tireAnalysis.recomendaciones.map((rec: string, recIndex: number) => (
                              <li key={recIndex} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {tireAnalysis.inspecciones.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-[#173D68] mb-2">{t.inspectionHistory}</h5>
                            <div className="overflow-x-auto bg-gray-50 p-2 rounded-md">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-300">
                                    <th className="py-2 px-2 text-left">{t.date}</th>
                                    <th className="py-2 px-2 text-right">Int (mm)</th>
                                    <th className="py-2 px-2 text-right">Cen (mm)</th>
                                    <th className="py-2 px-2 text-right">Ext (mm)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tireAnalysis.inspecciones.map((insp, idx: number) => (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                      <td className="py-1 px-2">
                                        {new Date(insp.fecha).toLocaleDateString()}
                                      </td>
                                      <td className={`py-1 px-2 text-right ${insp.profundidadInt <= 2 ? "text-red-600 font-semibold" : ""}`}>
                                        {insp.profundidadInt}
                                      </td>
                                      <td className={`py-1 px-2 text-right ${insp.profundidadCen <= 2 ? "text-red-600 font-semibold" : ""}`}>
                                        {insp.profundidadCen}
                                      </td>
                                      <td className={`py-1 px-2 text-right ${insp.profundidadExt <= 2 ? "text-red-600 font-semibold" : ""}`}>
                                        {insp.profundidadExt}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegratedAnalysisPage;