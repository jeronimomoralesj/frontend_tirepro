"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, AlertTriangle, FileSpreadsheet, CheckCircle2, Search } from "lucide-react";

export type CostEntry = { valor: number; fecha: string; };
export type Inspection = {
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  fecha: string; cpk?: number; cpkProyectado?: number; kilometrosEstimados?: number;
};
export type Tire = {
  id: string; placa: string; marca: string; diseno: string;
  profundidadInicial: number; dimension: string; eje: string; posicion: number;
  kilometrosRecorridos: number; costo: CostEntry[];
  vida: { valor: string; fecha: string }[];
  inspecciones: Inspection[];
  primeraVida: unknown[];
  eventos: { valor: string; fecha: string }[];
  vehicleId?: string;
};

interface Vehicle { id: string; placa: string; }
interface DetallesLlantasProps { tires: Tire[]; vehicles: Vehicle[]; }

const T = {
  title: "Detalles de Todas las Llantas",
  exportExcel: "Excel",
  searchPlaceholder: "Buscar placa, marca, diseño, vehículo…",
  noResultsFound: "No se encontraron resultados.",
  noTiresAvailable: "No hay llantas disponibles",
  vehiclePlate: "Vehículo", tirePlate: "Llanta", brand: "Marca", design: "Diseño",
  dimension: "Dim.", axle: "Eje", position: "Pos", kmTraveled: "Km Rec.",
  kmProjected: "Km Proy.", currentLife: "Vida", lastInspection: "Inspección",
  cpk: "CPK", cpkProjected: "CPK Proy.", depthInt: "Int", depthCenter: "Cen",
  depthExt: "Ext", wear: "Desg.%", cost: "Costo", event: "Evento",
  results: "Resultados", of: "de", tires: "llantas",
  totalTires: "Total llantas", updated: "Actualizado",
  firstLife: "Primera Vida", lastCost: "Último Costo", lastEvent: "Último Evento",
};

function getKmProyectados(tire: Tire, insp: Inspection | undefined): number | "-" {
  if (!insp) return "-";
  const totalCost = Array.isArray(tire.costo) ? tire.costo.reduce((s, c) => s + (c?.valor ?? 0), 0) : 0;
  if (insp.cpkProyectado && insp.cpkProyectado > 0 && totalCost > 0) return Math.round(totalCost / insp.cpkProyectado);
  const depths = [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt];
  const minDepth = Math.min(...depths);
  if (tire.profundidadInicial > 0 && minDepth > 0 && tire.kilometrosRecorridos > 0) {
    const mmWorn = tire.profundidadInicial - minDepth;
    if (mmWorn > 0) {
      const kmPerMm = tire.kilometrosRecorridos / mmWorn;
      return Math.round(tire.kilometrosRecorridos + kmPerMm * Math.max(minDepth - 2, 0));
    }
  }
  return "-";
}

function getDesgastePct(tire: Tire, insp: Inspection | undefined): string {
  if (!insp) return "-";
  const minDepth = Math.min(insp.profundidadInt, insp.profundidadCen, insp.profundidadExt);
  if (tire.profundidadInicial <= 0) return "-";
  if (minDepth <= 0) return "100%";
  return ((1 - minDepth / tire.profundidadInicial) * 100).toFixed(1) + "%";
}

function fmt(v: number | string | "-") {
  if (v === "-") return "-";
  if (typeof v === "string") return v;
  return v.toLocaleString("es-CO");
}
function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);
}
function fmtCPK(v: number | undefined | null) {
  if (v == null || v === 0) return "-";
  return "$" + Math.round(v).toLocaleString("es-CO");
}

const DetallesLlantas: React.FC<DetallesLlantasProps> = ({ tires, vehicles }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);

  const searchFilteredTires = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tires.filter((tire) => {
      const vehPlaca = vehicles.find((v) => v.id === tire.vehicleId)?.placa?.toLowerCase() || "";
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

  const exportToExcel = () => {
    setExporting(true);
    try {
      const exportData = searchFilteredTires.map((tire) => {
        const vehPlaca = vehicles.find((v) => v.id === tire.vehicleId)?.placa || "-";
        const vida = tire.vida.at(-1)?.valor || "-";
        const insp = tire.inspecciones.at(-1);
        const costoRaw = tire.costo.at(-1)?.valor;
        const evento = tire.eventos.at(-1)?.valor || "-";
        return {
          [T.vehiclePlate]: vehPlaca, [T.tirePlate]: tire.placa, [T.brand]: tire.marca,
          [T.design]: tire.diseno, [T.dimension]: tire.dimension, [T.axle]: tire.eje,
          [T.position]: tire.posicion, [T.kmTraveled]: tire.kilometrosRecorridos,
          [T.kmProjected]: getKmProyectados(tire, insp),
          [T.currentLife]: vida,
          [T.lastInspection]: insp ? new Date(insp.fecha).toLocaleDateString("es-CO") : "-",
          [T.cpk]: insp?.cpk != null ? Math.round(insp.cpk) : "-",
          [T.cpkProjected]: insp?.cpkProyectado != null ? Math.round(insp.cpkProyectado) : "-",
          [T.depthInt]: insp?.profundidadInt ?? "-",
          [T.depthCenter]: insp?.profundidadCen ?? "-",
          [T.depthExt]: insp?.profundidadExt ?? "-",
          [T.wear]: getDesgastePct(tire, insp),
          [T.lastCost]: costoRaw != null ? costoRaw : "-",
          [T.lastEvent]: evento,
        };
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Llantas");
      XLSX.writeFile(wb, `detalles_llantas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  const headers = [
    T.vehiclePlate, T.tirePlate, T.brand, T.design, T.dimension,
    T.axle, T.position, T.kmTraveled, T.kmProjected, T.currentLife,
    T.lastInspection, T.cpk, T.cpkProjected, T.depthInt, T.depthCenter,
    T.depthExt, T.wear, T.cost, T.event,
  ];

  return (
    /*
     * CRITICAL: overflow + minWidth must both live in `style`, not className.
     * Tailwind's `overflow-hidden` class is applied during the CSS cascade
     * before the browser has finished measuring children — so it loses to
     * the table's intrinsic min-width. Putting it in `style` (inline) gives
     * it higher specificity and ensures it clips AFTER layout resolves.
     */
    <div
      className="bg-white rounded-2xl border border-gray-100"
      style={{
        boxShadow: "0 4px 24px rgba(10,24,58,0.07)",
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}
      >
        <h2 className="text-sm sm:text-base font-bold text-white truncate flex-1 min-w-0">
          {T.title}
        </h2>
        <button
          onClick={exportToExcel}
          disabled={exporting || searchFilteredTires.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
          style={{ background: "#1E76B6", minHeight: 34 }}
        >
          <Download size={14} />
          {exporting ? "…" : T.exportExcel}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
          <input
            type="text"
            placeholder={T.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {searchFilteredTires.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-500">
            {searchTerm ? (
              <>
                <AlertTriangle className="text-yellow-500" size={28} />
                <p className="text-xs text-center px-4">{T.noResultsFound}</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="text-green-500" size={28} />
                <p className="text-xs">{T.noTiresAvailable}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/*
             * This div is the scroll viewport. width:100% keeps it inside the
             * card; the table inside is wider than this div, so the browser
             * adds a scrollbar here instead of expanding the page.
             */}
            <div
              style={{
                width: "100%",
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "55vh",
                WebkitOverflowScrolling: "touch" as never,
                borderRadius: 8,
                border: "1px solid #f3f4f6",
              }}
            >
              <table
                className="border-collapse text-xs"
                style={{ minWidth: 960, width: "max-content" }}
              >
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left whitespace-nowrap font-semibold text-white"
                        style={{ background: "#173D68", fontSize: 11, position: "sticky", top: 0, zIndex: 10 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchFilteredTires.map((tire, idx) => {
                    const vehPlaca = vehicles.find((v) => v.id === tire.vehicleId)?.placa || "-";
                    const vida = tire.vida.at(-1)?.valor || "-";
                    const insp = tire.inspecciones.at(-1);
                    const costoRaw = tire.costo.at(-1)?.valor;
                    const evento = tire.eventos.at(-1)?.valor || "-";
                    const kmProyectados = getKmProyectados(tire, insp);
                    const desgastePct = getDesgastePct(tire, insp);
                    const desgasteNum = parseFloat(desgastePct);

                    return (
                      <tr
                        key={tire.id}
                        style={{ background: idx % 2 === 0 ? "white" : "rgba(240,247,255,0.4)" }}
                      >
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-[#0A183A]">{vehPlaca}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[#173D68]">{tire.placa}</td>
                        <td className="px-3 py-2 whitespace-nowrap capitalize">{tire.marca}</td>
                        <td className="px-3 py-2 whitespace-nowrap capitalize">{tire.diseno}</td>
                        <td className="px-3 py-2 whitespace-nowrap uppercase text-gray-600">{tire.dimension}</td>
                        <td className="px-3 py-2 whitespace-nowrap capitalize text-gray-600">{tire.eje}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{tire.posicion}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700">{fmt(tire.kilometrosRecorridos)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[#173D68]">{fmt(kmProyectados)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-full capitalize font-semibold"
                            style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6", fontSize: 10 }}
                          >
                            {vida}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                          {insp ? new Date(insp.fecha).toLocaleDateString("es-CO") : "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{fmtCPK(insp?.cpk)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtCPK(insp?.cpkProyectado)}</td>
                        <td className="px-3 py-2 text-center">{insp?.profundidadInt ?? "-"}</td>
                        <td className="px-3 py-2 text-center">{insp?.profundidadCen ?? "-"}</td>
                        <td className="px-3 py-2 text-center">{insp?.profundidadExt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className="font-semibold"
                            style={{
                              color: desgasteNum >= 80 ? "#dc2626" : desgasteNum >= 60 ? "#d97706" : "#16a34a",
                            }}
                          >
                            {desgastePct}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {costoRaw != null ? fmtCOP(costoRaw) : "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{evento}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <FileSpreadsheet size={13} className="flex-shrink-0 text-[#1E76B6]" />
                {searchTerm
                  ? `${T.results}: ${searchFilteredTires.length} ${T.of} ${tires.length} ${T.tires}`
                  : `${T.totalTires}: ${tires.length}`}
              </div>
              <div className="text-xs text-gray-400">
                {T.updated}: {new Date().toLocaleDateString("es-CO")}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DetallesLlantas;