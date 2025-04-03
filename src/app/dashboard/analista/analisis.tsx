"use client";

import React, { useState } from "react";
import { Search, AlertCircle, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

const AnalisisPage: React.FC = () => {
  const [placa, setPlaca] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAnalysis(null);

    if (!placa.trim()) {
      setError("Por favor ingrese una placa de vehículo");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/analyze?placa=${encodeURIComponent(placa.trim())}`
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires/analyze?placa=${encodeURIComponent(placa.trim())}`
      );
      if (!res.ok) {
        throw new Error("Error al obtener el análisis");
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <header className="bg-[#0A183A] text-white py-4 px-6 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Sistema de Gestión de Llantas</h1>
          <Link 
            href="/analista" 
            className="flex items-center gap-2 bg-[#1E76B6] text-white px-4 py-2 rounded-md hover:bg-[#348CCB] transition-all transform hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Análisis Críticos</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-[#0A183A] border-b-2 border-[#1E76B6]/20 pb-3">
            Análisis de Llantas por Placa
          </h2>

          {/* Search Form */}
          <form 
            onSubmit={handleSearch} 
            className="mb-8 p-6 bg-gradient-to-r from-[#173D68]/5 to-[#1E76B6]/5 rounded-lg shadow-sm"
          >
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="placa" className="block text-sm font-medium text-[#0A183A] mb-2">
                  Placa del Vehículo
                </label>
                <input
                  id="placa"
                  type="text"
                  placeholder="Ej. ABC-123"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#0A183A] text-white rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full md:w-auto"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Buscando...
                  </span>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Buscar
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center border border-red-200">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="animate-fadeIn">
              <h3 className="text-2xl font-bold mb-4 text-[#173D68]">
                Resultados del Análisis
                <span className="ml-2 text-[#1E76B6]">
                  {analysis.tires.length} {analysis.tires.length === 1 ? "llanta" : "llantas"} encontradas
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.tires.map((tireAnalysis: any, index: number) => (
                  <div
                    key={`${tireAnalysis.placa}-${index}`}
                    className="p-6 bg-white rounded-lg shadow-md border-l-4 border-[#1E76B6] hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-[#0A183A]">
                          ID: {tireAnalysis.placa}
                        </h4>
                        <p className="text-[#173D68]">
                          Posición: <span className="font-medium">{tireAnalysis.posicion}</span>
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
                        Recomendaciones
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
                        <h5 className="font-semibold text-[#173D68] mb-2">Historial de Inspecciones</h5>
                        <div className="overflow-x-auto bg-gray-50 p-2 rounded-md">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-300">
                                <th className="py-2 px-2 text-left">Fecha</th>
                                <th className="py-2 px-2 text-right">Int (mm)</th>
                                <th className="py-2 px-2 text-right">Cen (mm)</th>
                                <th className="py-2 px-2 text-right">Ext (mm)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tireAnalysis.inspecciones.map((insp: any, idx: number) => (
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
        </div>
      </div>
    </div>
  );
};

export default AnalisisPage;