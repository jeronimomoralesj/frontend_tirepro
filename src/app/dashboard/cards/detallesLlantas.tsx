"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Download, AlertTriangle, FileSpreadsheet, CheckCircle2, Search,
  Table2, ChevronRight, ChevronDown,
} from "lucide-react";

export type CostEntry = { valor: number; fecha: string };
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

// Mobile pagination: 20k-tire tenants would DOM-bomb if all cards rendered.
const INITIAL_MOBILE_PAGE = 40;

const T = {
  title:              "Detalles de Todas las Llantas",
  exportExcel:        "Excel",
  searchPlaceholder:  "Buscar placa, marca, diseño, vehículo…",
  noResultsFound:     "No se encontraron resultados.",
  noTiresAvailable:   "No hay llantas disponibles",
  vehiclePlate: "Vehículo", tirePlate: "Llanta", brand: "Marca", design: "Diseño",
  dimension: "Dim.", axle: "Eje", position: "Pos", kmTraveled: "Km Rec.",
  kmProjected: "Km Proy.", currentLife: "Vida", lastInspection: "Inspección",
  cpk: "CPK", cpkProjected: "CPK Proy.", depthInt: "Int", depthCenter: "Cen",
  depthExt: "Ext", wear: "Desg.%", cost: "Costo", event: "Evento",
  results: "Resultados", of: "de", tires: "llantas",
  totalTires: "Total llantas", updated: "Actualizado",
  firstLife: "Primera Vida", lastCost: "Último Costo", lastEvent: "Último Evento",
  loadMore: "Cargar más",
  showing: "Mostrando",
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

function wearColor(pct: number): string {
  if (pct >= 80) return "#dc2626";
  if (pct >= 60) return "#d97706";
  return "#16a34a";
}

const DetallesLlantas: React.FC<DetallesLlantasProps> = ({ tires, vehicles }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(INITIAL_MOBILE_PAGE);

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    vehicles.forEach((v) => { m[v.id] = v.placa; });
    return m;
  }, [vehicles]);

  const searchFilteredTires = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const base = !q
      ? tires
      : tires.filter((tire) => {
          const vehPlaca = tire.vehicleId ? (vehicleMap[tire.vehicleId] ?? "").toLowerCase() : "";
          return (
            tire.placa.toLowerCase().includes(q) ||
            tire.marca.toLowerCase().includes(q) ||
            tire.diseno.toLowerCase().includes(q) ||
            tire.dimension.toLowerCase().includes(q) ||
            tire.eje.toLowerCase().includes(q) ||
            vehPlaca.includes(q)
          );
        });

    // Sort by vehicle placa (A→Z), then by posicion (1→N). Keeps all tires
    // from the same vehicle together so the user can read down a truck
    // without hunting. Tires with no vehicle (inventory / free pool) sink
    // to the bottom so the fleet rows come first.
    return [...base].sort((a, b) => {
      const pa = a.vehicleId ? (vehicleMap[a.vehicleId] ?? "") : "";
      const pb = b.vehicleId ? (vehicleMap[b.vehicleId] ?? "") : "";
      // Empty placa always sorts last
      if (!pa && pb) return 1;
      if (pa && !pb) return -1;
      if (pa !== pb) return pa.localeCompare(pb, "es", { numeric: true, sensitivity: "base" });
      return (a.posicion ?? 0) - (b.posicion ?? 0);
    });
  }, [tires, vehicleMap, searchTerm]);

  // Reset mobile pagination when the filter changes.
  React.useEffect(() => { setMobileVisible(INITIAL_MOBILE_PAGE); }, [searchTerm]);

  const mobileSlice = useMemo(
    () => searchFilteredTires.slice(0, mobileVisible),
    [searchFilteredTires, mobileVisible],
  );
  const hasMoreMobile = searchFilteredTires.length > mobileVisible;

  const exportToExcel = () => {
    setExporting(true);
    try {
      const exportData = searchFilteredTires.map((tire) => {
        const vehPlaca = tire.vehicleId ? (vehicleMap[tire.vehicleId] ?? "-") : "-";
        const vida = tire.vida.at(-1)?.valor || "-";
        const insp = tire.inspecciones.at(-1);
        const costoRaw = tire.costo.at(-1)?.valor;
        const evento = tire.eventos.at(-1)?.valor || "-";
        return {
          [T.vehiclePlate]:   vehPlaca,
          [T.tirePlate]:      tire.placa,
          [T.brand]:          tire.marca,
          [T.design]:         tire.diseno,
          [T.dimension]:      tire.dimension,
          [T.axle]:           tire.eje,
          [T.position]:       tire.posicion,
          [T.kmTraveled]:     tire.kilometrosRecorridos,
          [T.kmProjected]:    getKmProyectados(tire, insp),
          [T.currentLife]:    vida,
          [T.lastInspection]: insp ? new Date(insp.fecha).toLocaleDateString("es-CO") : "-",
          [T.cpk]:            insp?.cpk != null          ? Math.round(insp.cpk)          : "-",
          [T.cpkProjected]:   insp?.cpkProyectado != null ? Math.round(insp.cpkProyectado) : "-",
          [T.depthInt]:       insp?.profundidadInt ?? "-",
          [T.depthCenter]:    insp?.profundidadCen ?? "-",
          [T.depthExt]:       insp?.profundidadExt ?? "-",
          [T.wear]:           getDesgastePct(tire, insp),
          [T.lastCost]:       costoRaw ?? "-",
          [T.lastEvent]:      evento,
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
    <div
      className="bg-white rounded-2xl border border-gray-100 w-full min-w-0"
      style={{
        boxShadow: "0 4px 24px rgba(10,24,58,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2"
        style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)" }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.14)" }}>
            <Table2 size={16} className="text-white" />
          </div>
          <h2 className="text-sm sm:text-base lg:text-lg font-bold text-white truncate">{T.title}</h2>
        </div>
        <button
          onClick={exportToExcel}
          disabled={exporting || searchFilteredTires.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-[#0A183A] bg-white transition-all hover:bg-blue-50 disabled:opacity-50 active:scale-95 flex-shrink-0"
          style={{ minHeight: 34 }}
          aria-label="Exportar a Excel"
        >
          <Download size={14} />
          <span className="hidden sm:inline">{exporting ? "…" : T.exportExcel}</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          <input
            type="text"
            placeholder={T.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/40 focus:bg-white transition-all"
            style={{ border: "1px solid rgba(52,140,203,0.18)" }}
            aria-label="Buscar llantas"
          />
        </div>
      </div>

      {/* Empty states */}
      {searchFilteredTires.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-500 px-4">
          {searchTerm ? (
            <>
              <AlertTriangle className="text-yellow-500" size={28} />
              <p className="text-xs text-center">{T.noResultsFound}</p>
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
          {/* ---------- Mobile / tablet: card list (<lg) ---------- */}
          <div className="lg:hidden p-3 space-y-2.5" style={{ maxHeight: "62vh", overflowY: "auto" }}>
            {mobileSlice.map((tire) => (
              <TireCard
                key={tire.id}
                tire={tire}
                vehiclePlaca={tire.vehicleId ? (vehicleMap[tire.vehicleId] ?? "-") : "-"}
              />
            ))}
            {hasMoreMobile && (
              <button
                onClick={() => setMobileVisible((v) => v + INITIAL_MOBILE_PAGE)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)",
                  boxShadow: "0 4px 12px -2px rgba(30,118,182,0.35)",
                }}
              >
                <ChevronDown size={13} />
                {T.loadMore} ({Math.min(INITIAL_MOBILE_PAGE, searchFilteredTires.length - mobileVisible)})
              </button>
            )}
          </div>

          {/* ---------- Desktop: full table (≥lg) ---------- */}
          <div className="hidden lg:block p-4">
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
                        className="px-3 py-2.5 text-left whitespace-nowrap font-bold text-white"
                        style={{ background: "#173D68", fontSize: 11, position: "sticky", top: 0, zIndex: 10 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchFilteredTires.map((tire, idx) => {
                    const vehPlaca = tire.vehicleId ? (vehicleMap[tire.vehicleId] ?? "-") : "-";
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
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-[#0A183A] uppercase">{vehPlaca}</td>
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
                            className="px-2 py-0.5 rounded-full capitalize font-bold"
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
                            className="font-bold"
                            style={{ color: wearColor(desgasteNum) }}
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
          </div>

          {/* Footer */}
          <div className="flex flex-wrap justify-between items-center gap-2 px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <FileSpreadsheet size={13} className="flex-shrink-0 text-[#1E76B6]" />
              <span className="tabular-nums">
                {searchTerm
                  ? `${T.results}: ${searchFilteredTires.length} ${T.of} ${tires.length}`
                  : `${T.totalTires}: ${tires.length}`}
              </span>
            </div>
            <div className="text-[11px] text-gray-400">
              {T.updated}: {new Date().toLocaleDateString("es-CO")}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- Mobile card ------------------------------------------------------------

function TireCard({ tire, vehiclePlaca }: { tire: Tire; vehiclePlaca: string }) {
  const [open, setOpen] = useState(false);
  const insp = tire.inspecciones.at(-1);
  const vida = tire.vida.at(-1)?.valor || "-";
  const desgastePct = getDesgastePct(tire, insp);
  const desgasteNum = parseFloat(desgastePct);
  const kmProyectados = getKmProyectados(tire, insp);
  const costoRaw = tire.costo.at(-1)?.valor;
  const evento = tire.eventos.at(-1)?.valor;
  const depthMin = insp
    ? Math.min(insp.profundidadInt, insp.profundidadCen, insp.profundidadExt)
    : null;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left active:scale-[0.995] transition-transform"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          {/* Position badge */}
          <div
            className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
          >
            <span className="text-[8px] text-white/70 uppercase font-bold leading-none">Pos</span>
            <span className="text-sm font-black text-white leading-tight">{tire.posicion}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="text-sm font-black text-[#0A183A] truncate capitalize">{tire.marca}</p>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider flex-shrink-0"
                style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
              >
                {vida}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              <span className="font-mono text-[#173D68] font-bold">{tire.placa}</span>
              <span className="mx-1.5">·</span>
              <span className="uppercase">{vehiclePlaca}</span>
            </p>
          </div>

          {/* Wear % with icon */}
          <div className="flex flex-col items-end flex-shrink-0">
            <span
              className="text-sm font-black tabular-nums leading-none"
              style={{ color: wearColor(desgasteNum) }}
            >
              {desgastePct}
            </span>
            <span className="text-[9px] text-gray-400 mt-1">desgaste</span>
          </div>
          <ChevronRight
            size={14}
            className={`text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </div>

        {/* Inline compact secondary row */}
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <MiniStat label="Int/Cen/Ext" value={
            insp
              ? `${insp.profundidadInt}/${insp.profundidadCen}/${insp.profundidadExt}`
              : "—"
          } />
          <MiniStat label="CPK" value={fmtCPK(insp?.cpkProyectado ?? insp?.cpk)} />
          <MiniStat label="Km" value={fmt(tire.kilometrosRecorridos)} />
        </div>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <KV label="Diseño" value={tire.diseno || "—"} />
            <KV label="Dimensión" value={tire.dimension?.toUpperCase() || "—"} />
            <KV label="Eje" value={tire.eje || "—"} />
            <KV label="Prof. inicial" value={`${tire.profundidadInicial}`} />
            <KV label="Prof. mín" value={depthMin != null ? `${depthMin}` : "—"} />
            <KV label="Km proyectados" value={fmt(kmProyectados)} />
            <KV label="Último costo" value={costoRaw != null ? fmtCOP(costoRaw) : "—"} />
            <KV label="Última inspección"
                value={insp ? new Date(insp.fecha).toLocaleDateString("es-CO") : "—"} />
            {evento && <KV label="Último evento" value={evento} />}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1 min-w-0 px-2 py-1 rounded-lg" style={{ background: "rgba(10,24,58,0.03)" }}>
      <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold truncate leading-none">{label}</p>
      <p className="text-[11px] font-black text-[#0A183A] truncate mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-2.5 py-1.5 rounded-lg min-w-0"
      style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.08)" }}
    >
      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold leading-none">{label}</p>
      <p className="text-[11px] font-bold text-[#0A183A] mt-0.5 truncate tabular-nums">{value}</p>
    </div>
  );
}

export default DetallesLlantas;
