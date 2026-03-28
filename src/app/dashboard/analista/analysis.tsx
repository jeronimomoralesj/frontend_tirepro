"use client";

import React, { useState } from "react";
import {
  Search, TrendingUp, AlertCircle, Sparkles, Brain,
  Activity, Loader2, X,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
  cpk?: number;
  cpkProyectado?: number;
};

type TireAnalysisResult = {
  placa: string;
  posicion: string;
  profundidadActual: number | null;
  recomendaciones: string[];
  inspecciones: Inspection[];
};

type AnalysisResponse = { tires: TireAnalysisResult[] };

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

// =============================================================================
// Helpers
// =============================================================================

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function depthColor(d: number): string {
  if (d <= 2) return "#DC2626";
  if (d <= 4) return "#D97706";
  return "#22c55e";
}

function depthBg(d: number): string {
  if (d <= 2) return "rgba(220,38,38,0.08)";
  if (d <= 4) return "rgba(217,119,6,0.08)";
  return "rgba(34,197,94,0.08)";
}

function depthLabel(d: number): string {
  if (d <= 2) return "Crítico";
  if (d <= 4) return "Precaución";
  return "OK";
}

// =============================================================================
// Design-system micro-components (matching VidaPage)
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

function CardTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <div>
        <p className="text-sm font-black text-[#0A183A] leading-none">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl text-sm font-medium text-[#0A183A] bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = { border: "1.5px solid rgba(52,140,203,0.2)" };

// =============================================================================
// Tire analysis card
// =============================================================================

function TireCard({ tire, index }: { tire: TireAnalysisResult; index: number }) {
  const depth = tire.profundidadActual;

  return (
    <Card className="overflow-hidden">
      {/* Top stripe */}
      <div
        className="h-1"
        style={{ background: depth !== null ? depthColor(depth) : "rgba(52,140,203,0.3)" }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">ID</span>
              <p className="font-black text-[#0A183A] text-sm leading-tight truncate">{tire.placa}</p>
            </div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
            >
              Pos. {tire.posicion}
            </span>
          </div>

          {depth !== null && (
            <div
              className="flex-shrink-0 rounded-xl px-3 py-2 text-center"
              style={{ background: depthBg(depth), border: `1.5px solid ${depthColor(depth)}30` }}
            >
              <p className="text-lg font-black leading-none" style={{ color: depthColor(depth) }}>
                {depth.toFixed(1)}
              </p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: depthColor(depth) }}>mm</p>
              <p className="text-[9px] font-black uppercase tracking-wide mt-0.5" style={{ color: depthColor(depth) }}>
                {depthLabel(depth)}
              </p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-md" style={{ background: "rgba(30,118,182,0.08)" }}>
              <Sparkles className="w-3 h-3 text-[#1E76B6]" />
            </div>
            <p className="text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Recomendaciones</p>
          </div>
          <div className="space-y-1.5">
            {tire.recomendaciones.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(52,140,203,0.1)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                  style={{ background: "#1E76B6" }}
                />
                <span className="text-[#0A183A] leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inspection history */}
        {(tire.inspecciones?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded-md" style={{ background: "rgba(10,24,58,0.06)" }}>
                <Activity className="w-3 h-3 text-[#173D68]" />
              </div>
              <p className="text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Historial</p>
            </div>
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "rgba(10,24,58,0.03)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                    {["Fecha", "Int", "Cen", "Ext"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-black text-[#0A183A] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(tire.inspecciones ?? []).map((insp, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid rgba(52,140,203,0.07)",
                        background: idx % 2 === 0 ? "rgba(10,24,58,0.01)" : "white",
                      }}
                    >
                      <td className="px-3 py-2 font-medium text-[#0A183A] whitespace-nowrap">
                        {new Date(insp.fecha).toLocaleDateString("es-CO")}
                      </td>
                      {[insp.profundidadInt, insp.profundidadCen, insp.profundidadExt].map((d, di) => (
                        <td key={di} className="px-3 py-2">
                          <span
                            className="px-1.5 py-0.5 rounded-md font-bold"
                            style={{ background: depthBg(d), color: depthColor(d) }}
                          >
                            {d}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Main component
// =============================================================================

const IntegratedAnalysisPage: React.FC = () => {
  const [placa,         setPlaca]         = useState("");
  const [analysis,      setAnalysis]      = useState<AnalysisResponse | null>(null);
  const [searchError,   setSearchError]   = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // -- Search -----------------------------------------------------------------
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(""); setAnalysis(null);
    if (!placa.trim()) { setSearchError("Ingrese una placa de vehículo."); return; }

    setSearchLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE}/tires/analyze?placa=${encodeURIComponent(placa.trim())}`
      );
      if (!res.ok) throw new Error("Vehículo no encontrado o sin llantas registradas.");
      setAnalysis(await res.json());
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSearchLoading(false);
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen" style={{ background: "white" }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-5">

        {/* -- Page header ------------------------------------------------- */}
        <div
          className="px-4 sm:px-6 py-5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
            boxShadow: "0 8px 32px rgba(10,24,58,0.22)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none tracking-tight">
                Análisis Inteligente
              </h1>
              <p className="text-xs text-white/60 mt-0.5">
                Diagnóstico predictivo por vehículo · IA
              </p>
            </div>
          </div>
        </div>

        {/* -- Search card ------------------------------------------------- */}
        <Card className="p-4 sm:p-5">
          <CardTitle
            icon={Activity}
            title="Análisis por Placa"
            sub="Diagnóstico detallado de todas las llantas de un vehículo"
          />
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Ej. abc-123"
                value={placa}
                onChange={e => setPlaca(e.target.value)}
                className={`${inputCls} pl-10`}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
            >
              {searchLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analizando…</>
                : <><Brain className="w-4 h-4" />Analizar</>
              }
            </button>
          </form>

          {searchError && (
            <div
              className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{searchError}</span>
              <button onClick={() => setSearchError("")}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </Card>

        {/* -- Results ----------------------------------------------------- */}
        {analysis && (
          <div className="space-y-4">
            {/* Results header */}
            <div
              className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(52,140,203,0.15)" }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                  <TrendingUp className="w-4 h-4 text-[#1E76B6]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0A183A]">Resultados del Análisis</p>
                  <p className="text-[11px] text-[#1E76B6] font-bold">
                    {analysis.tires.length} {analysis.tires.length === 1 ? "llanta" : "llantas"} analizadas
                  </p>
                </div>
              </div>

              {/* Summary badges */}
              <div className="flex gap-2 flex-wrap">
                {(() => {
                  const critical = analysis.tires.filter(t => t.profundidadActual !== null && t.profundidadActual <= 2).length;
                  const warn     = analysis.tires.filter(t => t.profundidadActual !== null && t.profundidadActual > 2 && t.profundidadActual <= 4).length;
                  const ok       = analysis.tires.filter(t => t.profundidadActual !== null && t.profundidadActual > 4).length;
                  return (
                    <>
                      {critical > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black"
                          style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
                          {critical} crítico{critical !== 1 ? "s" : ""}
                        </span>
                      )}
                      {warn > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black"
                          style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}>
                          {warn} precaución
                        </span>
                      )}
                      {ok > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black"
                          style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                          {ok} OK
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Tire cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...analysis.tires]
                .sort((a, b) => (Number(a.posicion) || 0) - (Number(b.posicion) || 0))
                .map((tire, idx) => (
                  <TireCard key={`${tire.placa}-${idx}`} tire={tire} index={idx} />
                ))}
            </div>
          </div>
        )}

        {/* -- Empty state ------------------------------------------------- */}
        {!analysis && !searchLoading && (
          <Card className="p-10 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-2xl mb-4" style={{ background: "rgba(30,118,182,0.06)" }}>
              <Brain className="w-8 h-8 text-[#1E76B6] opacity-60" />
            </div>
            <p className="text-sm font-bold text-[#0A183A] mb-1">Ingrese una placa para comenzar</p>
            <p className="text-xs text-gray-400 max-w-xs">
              El sistema analizará todas las llantas del vehículo y generará recomendaciones automáticas basadas en los datos de inspección.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default IntegratedAnalysisPage;