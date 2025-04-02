"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

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

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      setError("No se encontró el companyId");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
            : `http://localhost:6001/api/tires?companyId=${companyId}`
        );
        if (!res.ok) throw new Error("Error al obtener los datos de llantas");
        const data: Tire[] = await res.json();
        setTires(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const tiresWithExpiredInspections = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tires.filter((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return true;
      const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
      const inspectionDate = new Date(lastInspection.fecha).toISOString().slice(0, 10);
      return inspectionDate !== today;
    });
  }, [tires]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Inpección vencida</h2>
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
En este espacio encuentras las llantas que no se han inspeccionado en tu periodo seleccionada, es decir si seleccionaste diario las llantas no sean inspeccionado en el dia.
    </p>
  </div>
</div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#173D68]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-500 gap-2">
            <AlertTriangle size={32} />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto max-h-96 rounded-lg mb-4">
              {tiresWithExpiredInspections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
                  <CheckCircle2 size={32} className="text-green-500" />
                  <p>No hay llantas con inspección vencida</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#173D68] text-white sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Id Llanta</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Posición</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Marca</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Última Inspección</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tiresWithExpiredInspections.map((tire) => {
                      const lastInspection =
                        tire.inspecciones && tire.inspecciones.length > 0
                          ? tire.inspecciones[tire.inspecciones.length - 1]
                          : null;
                      return (
                        <tr key={tire.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{tire.placa}</td>
                          <td className="px-4 py-2 text-sm">{tire.posicion}</td>
                          <td className="px-4 py-2 text-sm">{tire.marca}</td>
                          <td className="px-4 py-2 text-sm">
                            {lastInspection
                              ? new Date(lastInspection.fecha).toLocaleDateString()
                              : "No inspecciones"}
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
                Total con inspección vencida: {tiresWithExpiredInspections.length}
              </div>
              <div className="text-xs text-gray-500">Actualizado: {new Date().toLocaleDateString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InspeccionVencidaPage;
