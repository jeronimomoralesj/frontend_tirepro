"use client";

import { HelpCircle, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

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

const TablaCpk: React.FC<TablaCpkProps> = ({ tires }) => {
  const [searchTerm, setSearchTerm] = useState("");

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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Mejor CPK</h2>
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
            <p>
              Esta tabla hace un ranking historico de tus llantas con mejor cpk
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Buscar por placa o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="p-6">
        <div className="overflow-y-auto max-h-96">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-left text-sm font-semibold text-gray-600">
                <th className="py-3 px-4">Placa</th>
                <th className="py-3 px-4">CPK</th>
                <th className="py-3 px-4">CPK Proy</th>
                <th className="py-3 px-4">Vida</th>
                <th className="py-3 px-4">Posición</th>
                <th className="py-3 px-4">Marca</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
              {filteredTires.map((tire) => (
                <tr key={tire.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{tire.placa}</td>
                  <td className="py-3 px-4">{Math.round(tire.cpk)}</td>
                  <td className="py-3 px-4">{Math.round(tire.cpkProyectado)}</td>
                  <td className="py-3 px-4">{tire.vida}</td>
                  <td className="py-3 px-4">{tire.posicion}</td>
                  <td className="py-3 px-4">{tire.marca}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTires.length === 0 && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              {searchTerm ? "No se encontraron resultados para la búsqueda." : "No hay datos de CPK disponibles."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablaCpk;