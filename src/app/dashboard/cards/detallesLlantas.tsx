'use client';

import React, { useState, useMemo, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Search,
} from "lucide-react";

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
  kilometrosEstimados?: number;
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
  tires: Tire[];
  vehicles: Vehicle[];
}

const translations = {
  es: {
    title: "Detalles de Todas las Llantas",
    exportExcel: "Exportar Excel",
    searchPlaceholder: "Buscar por placa, marca, diseño o vehículo...",
    noResultsFound: "No se encontraron resultados para la búsqueda.",
    noTiresAvailable: "No hay llantas disponibles",
    vehiclePlate: "Placa Vehículo",
    tirePlate: "Placa Llanta",
    brand: "Marca",
    design: "Diseño",
    dimension: "Dimensión",
    axle: "Eje",
    position: "Posición",
    kmTraveled: "Km Recorridos",
    kmProjected: "Km Proyectados",
    life: "Vida",
    lastInspection: "Última Inspección",
    cpk: "CPK",
    cpkProjected: "CPK Proyectado",
    depthInt: "Prof. Int",
    depthCenter: "Prof. Cen",
    depthExt: "Prof. Ext",
    wear: "Desgaste (%)",
    cost: "Costo",
    event: "Evento",
    results: "Resultados",
    of: "de",
    tires: "llantas",
    totalTires: "Total de llantas",
    updated: "Actualizado",
    firstLife: "Primera Vida",
    lastCost: "Último Costo",
    lastEvent: "Último Evento",
    currentLife: "Vida Actual",
  },
};

// ─────────────────────────────────────────────
// CORE HELPERS
// ─────────────────────────────────────────────

/**
 * Derive projected KM from stored inspection data.
 *
 * Priority:
 *  1. If cpkProyectado > 0 and totalCost > 0  → totalCost / cpkProyectado
 *  2. If kmProyectados is stored directly on the inspection  → use it
 *  3. Fallback: depth-ratio formula as last resort
 */
function getKmProyectados(
  tire: Tire,
  insp: Inspection | undefined
): number | "-" {
  if (!insp) return "-";

  const totalCost = Array.isArray(tire.costo)
    ? tire.costo.reduce((s, c) => s + (c?.valor ?? 0), 0)
    : 0;

  // 1. Derive from CPK proyectado (most accurate — comes from the backend formula)
  if (insp.cpkProyectado && insp.cpkProyectado > 0 && totalCost > 0) {
    return Math.round(totalCost / insp.cpkProyectado);
  }

  // 2. If the inspection stores it explicitly
  if ((insp as any).kmProyectados && (insp as any).kmProyectados > 0) {
    return Math.round((insp as any).kmProyectados);
  }

  // 3. Last resort depth-ratio (only when we have no CPK data at all)
  const depths = [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt];
  const minDepth = Math.min(...depths);
  if (tire.profundidadInicial > 0 && minDepth > 0 && tire.kilometrosRecorridos > 0) {
    const mmWorn = tire.profundidadInicial - minDepth;
    if (mmWorn > 0) {
      const kmPerMm = tire.kilometrosRecorridos / mmWorn;
      const mmLeft = Math.max(minDepth - 2, 0);
      return Math.round(tire.kilometrosRecorridos + kmPerMm * mmLeft);
    }
  }

  return "-";
}

/**
 * Calculate wear percentage. Returns formatted string or "-".
 */
function getDesgastePct(tire: Tire, insp: Inspection | undefined): string {
  if (!insp) return "-";
  const depths = [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt];
  const minDepth = Math.min(...depths);
  if (tire.profundidadInicial <= 0) return "-";
  if (minDepth <= 0) return "100%";
  return ((1 - minDepth / tire.profundidadInicial) * 100).toFixed(1) + "%";
}

/** Format numbers with thousand separators */
function fmt(value: number | string | "-"): string {
  if (value === "-") return "-";
  if (typeof value === "string") return value;
  return value.toLocaleString("es-CO");
}

/** Format currency in COP */
function fmtCOP(value: number | string | "-"): string {
  if (value === "-") return "-";
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format CPK – round to 0 decimals and add $ sign */
function fmtCPK(value: number | undefined | null): string {
  if (value == null || value === 0) return "-";
  return "$" + Math.round(value).toLocaleString("es-CO");
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const DetallesLlantas: React.FC<DetallesLlantasProps> = ({ tires, vehicles }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [language] = useState<"es">("es");
  const contentRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  // ── Search filter ──────────────────────────
  const searchFilteredTires = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tires.filter((tire) => {
      const vehPlaca =
        vehicles.find((v) => v.id === tire.vehicleId)?.placa?.toLowerCase() || "";
      return (
        tire.placa.toLowerCase().includes(q) ||
        tire.marca.toLowerCase().includes(q) ||
        tire.diseno.toLowerCase().includes(q) ||
        tire.dimension.toLowerCase().includes(q) ||
        tire.eje.toLowerCase().includes(q) ||
        vehPlaca.includes(q)
      );
    });
  }, [tires, vehicles, searchTerm]);

  // ── Excel export ───────────────────────────
  const exportToExcel = () => {
    setExporting(true);

    try {
      const exportData = searchFilteredTires.map((tire) => {
        const vehPlaca =
          vehicles.find((v) => v.id === tire.vehicleId)?.placa || "-";
        const vida = tire.vida.at(-1)?.valor || "-";
        const insp = tire.inspecciones.at(-1);
        const costoRaw = tire.costo.at(-1)?.valor;
        const costo = costoRaw != null ? costoRaw : "-";
        const evento = tire.eventos.at(-1)?.valor || "-";
        const primeraVida = tire.primeraVida.at(-1);
        const kmProyectados = getKmProyectados(tire, insp);
        const desgastePct = getDesgastePct(tire, insp);

        return {
          [t.vehiclePlate]: vehPlaca,
          [t.tirePlate]: tire.placa,
          [t.brand]: tire.marca,
          [t.design]: tire.diseno,
          [t.dimension]: tire.dimension,
          [t.axle]: tire.eje,
          [t.position]: tire.posicion,
          [t.kmTraveled]: tire.kilometrosRecorridos,
          [t.kmProjected]: kmProyectados === "-" ? "-" : kmProyectados,
          [t.currentLife]: vida,
          [t.lastInspection]: insp
            ? new Date(insp.fecha).toLocaleDateString("es-CO")
            : "-",
          [t.cpk]: insp?.cpk != null ? Math.round(insp.cpk) : "-",
          [t.cpkProjected]:
            insp?.cpkProyectado != null ? Math.round(insp.cpkProyectado) : "-",
          [t.depthInt]: insp?.profundidadInt ?? "-",
          [t.depthCenter]: insp?.profundidadCen ?? "-",
          [t.depthExt]: insp?.profundidadExt ?? "-",
          [t.wear]: desgastePct,
          [t.lastCost]: costo,
          [t.lastEvent]: evento,
          [t.firstLife]: primeraVida ? JSON.stringify(primeraVida) : "-",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
        wch: Math.max(
          key.length,
          ...exportData.map((row) => String((row as any)[key] ?? "").length)
        ) + 2,
      }));
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Llantas");
      XLSX.writeFile(wb, `detalles_llantas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.title}</h2>
        <button
          onClick={exportToExcel}
          disabled={exporting || searchFilteredTires.length === 0}
          className="px-3 py-1.5 bg-[#1E76B6] text-white rounded hover:bg-[#0A183A] transition flex items-center text-sm disabled:opacity-50"
        >
          <Download className="mr-1.5" size={16} />
          {exporting ? "Exportando..." : t.exportExcel}
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
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table / Empty state */}
      <div className="p-6" ref={contentRef}>
        {searchFilteredTires.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
            {searchTerm ? (
              <>
                <AlertTriangle className="text-yellow-500" size={32} />
                <p>{t.noResultsFound}</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="text-green-500" size={32} />
                <p>{t.noTiresAvailable}</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto max-h-96 rounded-lg mb-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-[#173D68] text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.vehiclePlate}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.tirePlate}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.brand}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.design}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.dimension}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.axle}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.position}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.kmTraveled}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.kmProjected}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.life}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.lastInspection}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.cpk}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.cpkProjected}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.depthInt}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.depthCenter}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.depthExt}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.wear}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.cost}</th>
                    <th className="px-4 py-2 text-left whitespace-nowrap">{t.event}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchFilteredTires.map((tire) => {
                    const vehPlaca =
                      vehicles.find((v) => v.id === tire.vehicleId)?.placa || "-";
                    const vida = tire.vida.at(-1)?.valor || "-";
                    const insp = tire.inspecciones.at(-1);
                    const costoRaw = tire.costo.at(-1)?.valor;
                    const evento = tire.eventos.at(-1)?.valor || "-";
                    const kmProyectados = getKmProyectados(tire, insp);
                    const desgastePct = getDesgastePct(tire, insp);

                    return (
                      <tr key={tire.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{vehPlaca}</td>
                        <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{tire.placa}</td>
                        <td className="px-4 py-2 whitespace-nowrap capitalize">{tire.marca}</td>
                        <td className="px-4 py-2 whitespace-nowrap capitalize">{tire.diseno}</td>
                        <td className="px-4 py-2 whitespace-nowrap uppercase">{tire.dimension}</td>
                        <td className="px-4 py-2 whitespace-nowrap capitalize">{tire.eje}</td>
                        <td className="px-4 py-2 text-center">{tire.posicion}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {fmt(tire.kilometrosRecorridos)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-[#173D68]">
                          {fmt(kmProyectados)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 capitalize">
                            {vida}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                          {insp ? new Date(insp.fecha).toLocaleDateString("es-CO") : "-"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">
                          {fmtCPK(insp?.cpk)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">
                          {fmtCPK(insp?.cpkProyectado)}
                        </td>
                        <td className="px-4 py-2 text-center">{insp?.profundidadInt ?? "-"}</td>
                        <td className="px-4 py-2 text-center">{insp?.profundidadCen ?? "-"}</td>
                        <td className="px-4 py-2 text-center">{insp?.profundidadExt ?? "-"}</td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`font-medium ${
                              parseFloat(desgastePct) >= 80
                                ? "text-red-600"
                                : parseFloat(desgastePct) >= 60
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {desgastePct}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          {costoRaw != null ? fmtCOP(costoRaw) : "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                          {evento}
                        </td>
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
                  ? `${t.results}: ${searchFilteredTires.length} ${t.of} ${tires.length} ${t.tires}`
                  : `${t.totalTires}: ${tires.length}`}
              </div>
              <div className="text-xs text-gray-500">
                {t.updated}: {new Date().toLocaleDateString("es-CO")}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DetallesLlantas;