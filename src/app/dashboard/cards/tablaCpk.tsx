"use client";

import { HelpCircle } from "lucide-react";
import React, { useMemo } from "react";

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

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-auto">
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

      <div className="p-6 overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
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
            {sortedTires.map((tire) => (
              <tr key={tire.id}>
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

        {sortedTires.length === 0 && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            No hay datos de CPK disponibles.
          </p>
        )}
      </div>
    </div>
  );
};

export default TablaCpk;
