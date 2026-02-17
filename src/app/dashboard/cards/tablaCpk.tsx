"use client";

import { HelpCircle, Search } from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";

export type VidaEntry = {
  valor: string;
  fecha: string;
};

export type Inspection = {
  cpk: number;
  cpkProyectado: number;
  fecha: string;
  profundidadCen: number;
  profundidadExt: number;
  profundidadInt: number;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
  vida: VidaEntry[];
  inspecciones: Inspection[];
};

interface TablaCpkProps {
  tires: Tire[];
}

const translations = {
  es: {
    title: "Mejor CPK",
    helpTooltip:
      "Esta tabla hace un ranking histórico de tus llantas con mejor CPK",
    searchPlaceholder: "Buscar por placa o marca...",
    id: "Id",
    cpk: "CPK",
    cpkProjected: "CPK Proy",
    life: "Vida",
    position: "Pos",          // shortened for mobile
    brand: "Marca",
    noResults: "No se encontraron resultados para la búsqueda.",
    noData: "No hay datos de CPK disponibles.",
  },
};

const TablaCpk: React.FC<TablaCpkProps> = ({ tires }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState<"es">("es");

  useEffect(() => {
    setLanguage("es");
  }, []);

  const t = translations[language];

  const sortedTires = useMemo(() => {
    const tiresWithLastInspection = tires
      .map((tire) => {
        const lastInspection = tire.inspecciones?.at(-1);
        return lastInspection
          ? {
              id: tire.id,
              placa: tire.placa,
              marca: tire.marca,
              posicion: tire.posicion,
              vida: tire.vida?.at(-1)?.valor || "-",
              cpk: lastInspection.cpk,
              cpkProyectado: lastInspection.cpkProyectado,
            }
          : null;
      })
      .filter(Boolean) as {
      id: string;
      placa: string;
      marca: string;
      posicion: number;
      vida: string;
      cpk: number;
      cpkProyectado: number;
    }[];

    return tiresWithLastInspection.sort((a, b) => a.cpk - b.cpk);
  }, [tires]);

  const filteredTires = useMemo(() => {
    return sortedTires.filter(
      (tire) =>
        tire.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tire.marca.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedTires, searchTerm]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[#173D68] text-white px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-base sm:text-xl font-bold truncate">{t.title}</h2>
          <div className="group relative cursor-pointer flex-shrink-0">
            <HelpCircle
              className="text-white hover:text-gray-200 transition-colors"
              size={18}
            />
            <div
              className="
                absolute z-10 top-full mt-2 left-0
                sm:-top-2 sm:right-full sm:left-auto sm:top-auto sm:mt-0 sm:mr-2
                bg-[#0A183A] text-white
                text-xs p-3 rounded-lg
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                w-56 sm:w-60 pointer-events-none
                shadow-xl
              "
            >
              <p>{t.helpTooltip}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table — scrollable on small screens */}
      <div className="p-3 sm:p-6">
        <div className="overflow-x-auto overflow-y-auto max-h-80 sm:max-h-96 rounded-lg border border-gray-100">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <th className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                  {t.id}
                </th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                  {t.cpk}
                </th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                  {t.cpkProjected}
                </th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                  {t.life}
                </th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                  {t.position}
                </th>
                <th className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                  {t.brand}
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-100">
              {filteredTires.map((tire) => (
                <tr key={tire.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    {tire.placa}
                  </td>
                  <td className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                    {Math.round(tire.cpk)}
                  </td>
                  <td className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    {Math.round(tire.cpkProyectado)}
                  </td>
                  <td className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    {tire.vida}
                  </td>
                  <td className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    {tire.posicion}
                  </td>
                  <td className="py-2 px-3 sm:py-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    {tire.marca}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTires.length === 0 && (
            <p className="mt-4 mb-4 text-xs sm:text-sm text-gray-500 text-center">
              {searchTerm ? t.noResults : t.noData}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablaCpk;