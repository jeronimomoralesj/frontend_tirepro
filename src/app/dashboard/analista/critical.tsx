import React, { useMemo } from "react";
import { AlertTriangle, Brain, Shield, ChevronRight, Loader2 } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Vehicle {
  id: string;
  placa: string;
}

interface Inspection {
  fecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
}

interface Tire {
  id: string;
  marca: string;
  placa: string;
  posicion?: string;
  vehicleId?: string;
  inspecciones: Inspection[];
}

type TireAnalysis = {
  id: string;
  marca: string;
  placa: string;
  posicion?: string;
  vehicleId?: string;
  ultimaInspeccionFecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  promedio: number;
  recomendaciones: string[];
  inspecciones: Inspection[];
};

interface CriticalTiresProps {
  tires: Tire[];
  vehicles: Vehicle[];
  loading: boolean;
  error: string;
}

// =============================================================================
// Helpers
// =============================================================================

function depthColor(d: number): string {
  if (d <= 2) return "#DC2626";
  if (d <= 4) return "#D97706";
  return "#16a34a";
}

function depthBg(d: number): string {
  if (d <= 2) return "rgba(220,38,38,0.08)";
  if (d <= 4) return "rgba(217,119,6,0.08)";
  return "rgba(22,163,74,0.08)";
}

function depthBorder(d: number): string {
  if (d <= 2) return "rgba(220,38,38,0.25)";
  if (d <= 4) return "rgba(217,119,6,0.25)";
  return "rgba(22,163,74,0.25)";
}

function depthLabel(d: number): string {
  if (d <= 2) return "Crítico";
  if (d <= 4) return "Precaución";
  return "OK";
}

// =============================================================================
// Design-system micro-components
// =============================================================================

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.15)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function DepthBadge({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: depthBg(value), color: depthColor(value), border: `1px solid ${depthBorder(value)}` }}
    >
      {value.toFixed(1)} mm
    </span>
  );
}

// =============================================================================
// Main component
// =============================================================================

const CriticalTires: React.FC<CriticalTiresProps> = ({ tires, vehicles, loading, error }) => {
  const plateByVehicleId = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v.placa])),
    [vehicles]
  );

  const immediateTires = useMemo(() => tires.filter((tire) => {
    if (!tire.inspecciones?.length) return false;
    const last = tire.inspecciones[tire.inspecciones.length - 1];
    return last.profundidadInt <= 2 || last.profundidadCen <= 2 || last.profundidadExt <= 2;
  }), [tires]);

  const analyzeTire = (tire: Tire): TireAnalysis | null => {
    if (!tire.inspecciones?.length) return null;
    const sorted = [...tire.inspecciones]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 3);
    const latest = sorted[0];
    const profundidadInt = Number(latest.profundidadInt) || 0;
    const profundidadCen = Number(latest.profundidadCen) || 0;
    const profundidadExt = Number(latest.profundidadExt) || 0;
    const promedio = (profundidadInt + profundidadCen + profundidadExt) / 3;
    const recomendaciones: string[] = [];
    if (promedio <= 2)      recomendaciones.push("🔴 Cambio inmediato: La llanta tiene un desgaste crítico y debe ser reemplazada.");
    else if (promedio <= 4) recomendaciones.push("🟡 Revisión frecuente: Se recomienda monitorear esta llanta en cada inspección.");
    else                    recomendaciones.push("🟢 En buen estado: La llanta está operando dentro de parámetros seguros.");
    return {
      id: tire.id, marca: tire.marca, placa: tire.placa,
      vehicleId: tire.vehicleId, posicion: tire.posicion,
      ultimaInspeccionFecha: new Date(latest.fecha).toLocaleDateString("es-CO"),
      profundidadInt, profundidadCen, profundidadExt, promedio,
      recomendaciones, inspecciones: sorted,
    };
  };

  const analyzedTires = useMemo(() =>
    immediateTires.map(analyzeTire).filter(Boolean) as TireAnalysis[],
    [immediateTires]
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E76B6]" />
        <p className="text-sm font-bold text-[#0A183A]">Analizando datos…</p>
        <p className="text-xs text-gray-400">IA procesando llantas…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
        style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
      >
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-red-700">Error de Análisis</p>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">

      {/* ── Summary header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
            <Brain className="w-4 h-4 text-[#1E76B6]" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0A183A] leading-none">Análisis de Llantas Críticas</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Llantas con profundidad ≤ 2 mm</p>
          </div>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-black"
          style={{ background: analyzedTires.length > 0 ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)", color: analyzedTires.length > 0 ? "#DC2626" : "#16a34a" }}
        >
          {analyzedTires.length} crítica{analyzedTires.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── All-clear state ─────────────────────────────────────────────── */}
      {analyzedTires.length === 0 && (
        <Card className="py-14 flex flex-col items-center justify-center text-center px-6">
          <div
            className="p-4 rounded-2xl mb-4"
            style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }}
          >
            <Shield className="w-8 h-8" style={{ color: "#16a34a" }} />
          </div>
          <p className="text-sm font-black text-[#0A183A] mb-1">No hay llantas críticas</p>
          <p className="text-xs text-gray-400 mb-4">Todas las llantas están dentro de parámetros seguros.</p>
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}
          >
            <Shield className="w-3.5 h-3.5" />
            Todos los sistemas seguros
          </span>
        </Card>
      )}

      {/* ── Desktop table ───────────────────────────────────────────────── */}
      {analyzedTires.length > 0 && (
        <>
          <Card className="overflow-hidden hidden md:block">
            {/* Table header */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                  <Brain className="w-3.5 h-3.5 text-[#1E76B6]" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#0A183A]">Insights de IA</p>
                  <p className="text-[10px] text-gray-400">Resultados de análisis de llantas críticas</p>
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}
              >
                {analyzedTires.length} items
              </span>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10" style={{ background: "rgba(10,24,58,0.03)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                  <tr>
                    {["Placa", "Marca", "ID", "Fecha Insp.", "Int", "Cen", "Ext", "Promedio", "Recomendación"].map((h) => (
                      <th key={h} className="px-3 py-3 text-left font-black text-[#0A183A] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyzedTires.map((tire, i) => (
                    <tr
                      key={tire.id}
                      style={{
                        borderBottom: "1px solid rgba(52,140,203,0.07)",
                        background: i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(30,118,182,0.04)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white"; }}
                    >
                      <td className="px-3 py-3 font-black text-[#0A183A] whitespace-nowrap">
                        {(plateByVehicleId[tire.vehicleId!] ?? "—").toUpperCase()}
                      </td>
                      <td className="px-3 py-3 font-medium text-[#173D68]">{tire.marca}</td>
                      <td className="px-3 py-3 font-mono text-[#173D68]">{tire.placa}</td>
                      <td className="px-3 py-3 text-[#173D68] whitespace-nowrap">{tire.ultimaInspeccionFecha}</td>
                      <td className="px-3 py-3"><DepthBadge value={tire.profundidadInt} /></td>
                      <td className="px-3 py-3"><DepthBadge value={tire.profundidadCen} /></td>
                      <td className="px-3 py-3"><DepthBadge value={tire.profundidadExt} /></td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black"
                          style={{ background: depthBg(tire.promedio), color: depthColor(tire.promedio), border: `1.5px solid ${depthBorder(tire.promedio)}` }}
                        >
                          {tire.promedio.toFixed(1)} mm · {depthLabel(tire.promedio)}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-xs">
                        {tire.recomendaciones.map((rec, ri) => (
                          <div key={ri} className="flex items-start gap-1.5 text-[11px] text-[#173D68]">
                            <ChevronRight className="w-3 h-3 text-[#1E76B6] mt-0.5 flex-shrink-0" />
                            <span className="leading-snug">{rec}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Mobile cards ────────────────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {analyzedTires.map((tire) => (
              <Card key={tire.id} className="overflow-hidden">
                {/* depth-colored top stripe */}
                <div className="h-1" style={{ background: depthColor(tire.promedio) }} />
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                        >
                          {(plateByVehicleId[tire.vehicleId!] ?? "—").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-sm text-[#0A183A] leading-none">
                            {(plateByVehicleId[tire.vehicleId!] ?? "—").toUpperCase()}
                          </p>
                          <p className="text-[11px] text-[#173D68]">{tire.marca}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{tire.placa} · {tire.ultimaInspeccionFecha}</p>
                    </div>
                    <span
                      className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-black text-center"
                      style={{ background: depthBg(tire.promedio), color: depthColor(tire.promedio), border: `1.5px solid ${depthBorder(tire.promedio)}` }}
                    >
                      <p className="text-base leading-none">{tire.promedio.toFixed(1)}</p>
                      <p className="text-[9px] uppercase tracking-wide">mm</p>
                    </span>
                  </div>

                  {/* Depth measurements */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[["Interior", tire.profundidadInt], ["Centro", tire.profundidadCen], ["Exterior", tire.profundidadExt]].map(([label, val]) => (
                      <div key={label as string} className="text-center px-2 py-2 rounded-xl" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.1)" }}>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-sm font-black" style={{ color: depthColor(val as number) }}>{(val as number).toFixed(1)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-1.5">
                    {tire.recomendaciones.map((rec, ri) => (
                      <div
                        key={ri}
                        className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(52,140,203,0.1)" }}
                      >
                        <ChevronRight className="w-3 h-3 text-[#1E76B6] mt-0.5 flex-shrink-0" />
                        <span className="text-[#173D68] leading-snug">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CriticalTires;