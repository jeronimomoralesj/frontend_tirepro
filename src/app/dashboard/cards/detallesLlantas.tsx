'use client';

import React, { useState, useMemo } from "react";
import {
  Download,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Search,
} from "lucide-react";
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
  primeraVida: unknown[];
  eventos: { valor: string; fecha: string }[];
  vehicleId?: string;
};

interface Vehicle {
  id: string;
  placa: string;
}

interface DetallesLlantasProps {
  /** Neumáticos ya filtrados */
  tires: Tire[];
  /** Lista de vehículos para resolver placa via vehicleId */
  vehicles: Vehicle[];
}

const DetallesLlantas: React.FC<DetallesLlantasProps> = ({
  tires,
  vehicles,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar tanto por campos de neumático como por placa de vehículo
  const filteredTires = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tires.filter((t) => {
      const vehPlaca =
        vehicles.find((v) => v.id === t.vehicleId)?.placa?.toLowerCase() || "";
      return (
        t.placa.toLowerCase().includes(q) ||
        t.marca.toLowerCase().includes(q) ||
        t.diseno.toLowerCase().includes(q) ||
        t.dimension.toLowerCase().includes(q) ||
        t.eje.toLowerCase().includes(q) ||
        vehPlaca.includes(q)
      );
    });
  }, [tires, vehicles, searchTerm]);

  const exportToExcel = () => {
    const exportData = filteredTires.map((t) => {
      const vehPlaca =
        vehicles.find((v) => v.id === t.vehicleId)?.placa || "-";
      const vida = t.vida.at(-1)?.valor || "-";
      const insp = t.inspecciones.at(-1);
      const costo = t.costo.at(-1)?.valor ?? "-";
      const evento = t.eventos.at(-1)?.valor || "-";
      const primeraVida = t.primeraVida.at(-1);

      const depths = insp
        ? [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt]
        : [0, 0, 0];
      const minDepth = Math.min(...depths);

      const desgastePct =
        t.profundidadInicial > 0
          ? minDepth <= 0
            ? "100%"
            : ((1 - minDepth / t.profundidadInicial) * 100).toFixed(2) + "%"
          : "-";

      const kmProyectados =
        t.profundidadInicial > 0 && minDepth > 0
          ? Math.round(
              t.kilometrosRecorridos * (t.profundidadInicial / minDepth)
            )
          : "-";

      return {
        "Placa Vehículo": vehPlaca,
        "Placa Llanta": t.placa,
        Marca: t.marca,
        Diseño: t.diseno,
        Dimensión: t.dimension,
        Eje: t.eje,
        Posición: t.posicion,
        "Km Recorridos": t.kilometrosRecorridos,
        "Km Proyectados": kmProyectados,
        "Vida Actual": vida,
        "Última Inspección": insp
          ? new Date(insp.fecha).toLocaleDateString()
          : "-",
        CPK: insp?.cpk ?? "-",
        "CPK Proy": insp?.cpkProyectado ?? "-",
        "Profundidad Int": insp?.profundidadInt ?? "-",
        "Profundidad Cen": insp?.profundidadCen ?? "-",
        "Profundidad Ext": insp?.profundidadExt ?? "-",
        "Desgaste (%)": desgastePct,
        "Último Costo": costo,
        "Último Evento": evento,
        "Primera Vida": primeraVida ? JSON.stringify(primeraVida) : "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Llantas");
    XLSX.writeFile(wb, "detalles_llantas.xlsx");
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header + Export */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Detalles de Todas las Llantas</h2>
        <button
          onClick={exportToExcel}
          className="px-3 py-1.5 bg-[#1E76B6] text-white rounded hover:bg-[#0A183A] transition flex items-center text-sm"
        >
          <Download className="mr-1.5" size={16} /> Exportar Excel
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por placa, marca, diseño o vehículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      <div className="p-6">
        {filteredTires.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
            {searchTerm ? (
              <>
                <AlertTriangle className="text-yellow-500" size={32} />
                <p>No se encontraron resultados para la búsqueda.</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="text-green-500" size={32} />
                <p>No hay llantas disponibles</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto max-h-96 rounded-lg mb-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-[#173D68] text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Placa Vehículo</th>
                    <th className="px-4 py-2 text-left">Placa Llanta</th>
                    <th className="px-4 py-2 text-left">Marca</th>
                    <th className="px-4 py-2 text-left">Diseño</th>
                    <th className="px-4 py-2 text-left">Dimensión</th>
                    <th className="px-4 py-2 text-left">Eje</th>
                    <th className="px-4 py-2 text-left">Posición</th>
                    <th className="px-4 py-2 text-left">Km Recorridos</th>
                    <th className="px-4 py-2 text-left">Km Proyectados</th>
                    <th className="px-4 py-2 text-left">Vida</th>
                    <th className="px-4 py-2 text-left">Última Inspección</th>
                    <th className="px-4 py-2 text-left">CPK</th>
                    <th className="px-4 py-2 text-left">CPK Proy</th>
                    <th className="px-4 py-2 text-left">Profundidad Int</th>
                    <th className="px-4 py-2 text-left">Profundidad Cen</th>
                    <th className="px-4 py-2 text-left">Profundidad Ext</th>
                    <th className="px-4 py-2 text-left">Desgaste (%)</th>
                    <th className="px-4 py-2 text-left">Costo</th>
                    <th className="px-4 py-2 text-left">Evento</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTires.map((t) => {
                    const vehPlaca =
                      vehicles.find((v) => v.id === t.vehicleId)?.placa || "-";
                    const vida = t.vida.at(-1)?.valor || "-";
                    const insp = t.inspecciones.at(-1);
                    const costo = t.costo.at(-1)?.valor ?? "-";
                    const evento = t.eventos.at(-1)?.valor || "-";

                    const depths = insp
                      ? [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt]
                      : [0, 0, 0];
                    const minDepth = Math.min(...depths);

                    const desgastePct =
                      t.profundadInicial > 0
                        ? ((1 - minDepth / t.profundidadInicial) * 100).toFixed(2) + "%"
                        : "-";

                    const kmProyectados =
                      t.profundidadInicial > 0 && minDepth > 0
                        ? Math.round(
                            t.kilometrosRecorridos *
                              (t.profundidadInicial / minDepth)
                          )
                        : "-";

                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{vehPlaca}</td>
                        <td className="px-4 py-2">{t.placa}</td>
                        <td className="px-4 py-2">{t.marca}</td>
                        <td className="px-4 py-2">{t.diseno}</td>
                        <td className="px-4 py-2">{t.dimension}</td>
                        <td className="px-4 py-2">{t.eje}</td>
                        <td className="px-4 py-2">{t.posicion}</td>
                        <td className="px-4 py-2">{t.kilometrosRecorridos}</td>
                        <td className="px-4 py-2">{kmProyectados}</td>
                        <td className="px-4 py-2">{vida}</td>
                        <td className="px-4 py-2">
                          {insp
                            ? new Date(insp.fecha).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-2">{insp?.cpk ?? "-"}</td>
                        <td className="px-4 py-2">
                          {insp?.cpkProyectado ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {insp?.profundidadInt ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {insp?.profundidadCen ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {insp?.profundidadExt ?? "-"}
                        </td>
                        <td className="px-4 py-2">{desgastePct}</td>
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
                <FileSpreadsheet className="mr-1.5" size={14} />
                {searchTerm
                  ? `Resultados: ${filteredTires.length} de ${tires.length} llantas`
                  : `Total de llantas: ${tires.length}`}
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

export default DetallesLlantas;
