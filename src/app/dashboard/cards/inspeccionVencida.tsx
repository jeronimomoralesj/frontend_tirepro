"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

// Language translations
const translations = {
  es: {
    title: "Inspección vencida",
    tooltip: "En este espacio encuentras las llantas que no se han inspeccionado en tu periodo seleccionado, es decir si seleccionaste diario las llantas no se han inspeccionado en el día.",
    loading: "Cargando...",
    noCompanyId: "No se encontró el companyId",
    fetchError: "Error al obtener los datos de llantas",
    unknownError: "Error desconocido",
    noExpiredInspections: "No hay llantas con inspección vencida",
    tireId: "Id Llanta",
    position: "Posición",
    brand: "Marca",
    lastInspection: "Última Inspección",
    noInspections: "No inspecciones",
    totalExpired: "Total con inspección vencida:",
    updated: "Actualizado:"
  }
};

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
  inspecciones?: Inspection[];
  vehicle?: {
    placa: string;
  };
};

const InspeccionVencidaPage: React.FC = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<'es'>('es');

  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = 'es';
      setLanguage(saved);
    };

    detectAndSetLanguage();
  }, []);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      setError(translations[language].noCompanyId);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
            : `https://api.tirepro.com.co/api/tires?companyId=${companyId}`
        );
        if (!res.ok) throw new Error(translations[language].fetchError);
        const data: Tire[] = await res.json();
        setTires(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(translations[language].unknownError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [language]);

  const t = translations[language];

  const tiresWithExpiredInspections = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tires.filter((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return true;
      const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
      const inspectionDate = new Date(lastInspection.fecha).toISOString().slice(0, 10);
      return inspectionDate !== today;
    });
  }, [tires]);

  // Calculate dynamic height based on number of tires
  const tableHeight = Math.min(400, Math.max(200, tiresWithExpiredInspections.length * 50 + 100));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.title}</h2>
        <div className="group relative cursor-pointer">
          <HelpCircle
            className="text-white hover:text-gray-200 transition-colors"
            size={24}
          />
          <div className="
            absolute z-10 -top-2 right-full 
            bg-[#0A183A] text-white 
            text-xs p-3 rounded-lg 
            opacity-0 group-hover:opacity-100 
            transition-opacity duration-300 
            w-60 pointer-events-none
          ">
            <p>{t.tooltip}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#173D68]"></div>
            <span className="ml-3 text-gray-600">{t.loading}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-500 gap-2">
            <AlertTriangle size={32} />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div 
              className="overflow-auto rounded-lg mb-4 border border-gray-200"
              style={{ height: `${tableHeight}px` }}
            >
              {tiresWithExpiredInspections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                  <CheckCircle2 size={32} className="text-green-500" />
                  <p>{t.noExpiredInspections}</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#173D68] text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t.tireId}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t.position}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t.brand}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">{t.lastInspection}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tiresWithExpiredInspections.map((tire, index) => {
                      const lastInspection =
                        tire.inspecciones && tire.inspecciones.length > 0
                          ? tire.inspecciones[tire.inspecciones.length - 1]
                          : null;
                      return (
                        <tr 
                          key={tire.id} 
                          className={`hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{tire.placa}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{tire.posicion}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{tire.marca}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {lastInspection
                              ? new Date(lastInspection.fecha).toLocaleDateString(
                                )
                              : t.noInspections}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {t.totalExpired} {tiresWithExpiredInspections.length}
              </div>
              <div className="text-xs text-gray-500">
                {t.updated} {new Date().toLocaleDateString(
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InspeccionVencidaPage;