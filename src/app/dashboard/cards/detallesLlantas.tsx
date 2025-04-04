"use client";

import React, { useEffect, useState } from "react";
import { Download, AlertTriangle, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

export type CostEntry = {
  valor: number;
  fecha: string;
};

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
  diseno: string;
  profundidadInicial: number;
  dimension: string;
  eje: string;
  posicion: number;
  kilometrosRecorridos: number;
  costo: CostEntry[];
  vida: { valor: string; fecha: string }[];
  inspecciones: Inspection[];
  primeraVida: unknown[]; // Changed from any[] to unknown[]
  eventos: { valor: string; fecha: string }[];
  vehicle?: {
    placa: string;
  };
};

// Interface for vehicle data
interface Vehicle {
  id: string;
  placa: string;
}

const DetallesLlantasPage: React.FC = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Define fetchTires as a separate function to use in useEffect
  const fetchTires = async () => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      setError("No se encontró el companyId");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/tires?companyId=${companyId}`
      );
      if (!res.ok) throw new Error("Error al obtener las llantas");
      const data: Tire[] = await res.json();

      // Fetch all related vehicles
      const vehiclesRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/vehicles?companyId=${companyId}`
      );
      const vehicles = await vehiclesRes.json();

      // Attach vehicle placa to each tire
      const tiresWithVehicle = data.map((t) => {
        const v = (vehicles as Vehicle[]).find((veh) => veh.id === (t as { vehicleId?: string }).vehicleId);
        return { ...t, vehicle: v ? { placa: v.placa } : undefined };
      });

      setTires(tiresWithVehicle);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTires();
  }, []);  // Added fetchTires to dependencies below

  const exportToExcel = () => {
    const exportData = tires.map(t => {
      const vida = t.vida.at(-1)?.valor || "-";
      const inspeccion = t.inspecciones.at(-1);
      const costo = t.costo.at(-1)?.valor || "-";
      const evento = t.eventos.at(-1)?.valor || "-";
      const primeraVida = t.primeraVida.at(-1);

      return {
        "Placa Vehículo": t.vehicle?.placa || "-",
        "Placa Llanta": t.placa,
        Marca: t.marca,
        Diseño: t.diseno,
        Dimensión: t.dimension,
        Eje: t.eje,
        Posición: t.posicion,
        "Km Recorridos": t.kilometrosRecorridos,
        "Vida Actual": vida,
        "Última Inspección": inspeccion ? new Date(inspeccion.fecha).toLocaleDateString() : "-",
        CPK: inspeccion?.cpk || "-",
        "CPK Proy": inspeccion?.cpkProyectado || "-",
        "Último Costo": costo,
        "Último Evento": evento,
        "Primera Vida": primeraVida ? JSON.stringify(primeraVida) : "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Llantas");
    XLSX.writeFile(wb, "detalles_llantas.xlsx");
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Detalles de Todas las Llantas</h2>
        <button
          onClick={exportToExcel}
          className="px-3 py-1.5 bg-[#1E76B6] text-white rounded hover:bg-[#0A183A] transition flex items-center text-sm"
        >
          <Download className="mr-1.5" size={16} /> Exportar Excel
        </button>
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
        ) : tires.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
            <CheckCircle2 size={32} className="text-green-500" />
            <p>No hay llantas disponibles</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-96 rounded-lg mb-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-[#173D68] text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Placa Vehículo</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Placa Llanta</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Marca</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Diseño</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Dimensión</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Eje</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Posición</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Km Recorridos</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Vida</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Última Inspección</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">CPK</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">CPK Proy</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Costo</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Evento</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tires.map((tire) => {
                    const vida = tire.vida.at(-1)?.valor || "-";
                    const inspeccion = tire.inspecciones.at(-1);
                    const costo = tire.costo.at(-1)?.valor || "-";
                    const evento = tire.eventos.at(-1)?.valor || "-";
                    
                    return (
                      <tr key={tire.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{tire.vehicle?.placa || "-"}</td>
                        <td className="px-4 py-2">{tire.placa}</td>
                        <td className="px-4 py-2">{tire.marca}</td>
                        <td className="px-4 py-2">{tire.diseno}</td>
                        <td className="px-4 py-2">{tire.dimension}</td>
                        <td className="px-4 py-2">{tire.eje}</td>
                        <td className="px-4 py-2">{tire.posicion}</td>
                        <td className="px-4 py-2">{tire.kilometrosRecorridos}</td>
                        <td className="px-4 py-2">{vida}</td>
                        <td className="px-4 py-2">{inspeccion ? new Date(inspeccion.fecha).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-2">{inspeccion?.cpk ?? "-"}</td>
                        <td className="px-4 py-2">{inspeccion?.cpkProyectado ?? "-"}</td>
                        <td className="px-4 py-2">{costo}</td>
                        <td className="px-4 py-2">{evento}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
              <div className="text-xs text-gray-500 flex items-center">
                <FileSpreadsheet size={14} className="mr-1.5" />
                Total de llantas: {tires.length}
              </div>
              <div className="text-xs text-gray-500">
                Actualizado: {new Date().toLocaleDateString()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DetallesLlantasPage;