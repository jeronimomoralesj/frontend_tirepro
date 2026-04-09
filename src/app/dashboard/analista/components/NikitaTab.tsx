"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2,
  Dog,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  Gauge,
  Calendar,
  ChevronDown,
  ChevronRight,
  Truck,
  Target,
} from "lucide-react";

// =============================================================================
// API
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

// =============================================================================
// Types
// =============================================================================

interface RawInsp {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
  cpk: number | null;
  cpkProyectado: number | null;
  kilometrosEstimados?: number | null;
}

interface RawTire {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension: string;
  eje: string;
  posicion: number;
  profundidadInicial: number;
  vehicleId: string | null;
  currentCpk: number | null;
  currentProfundidad: number | null;
  alertLevel: string | null;
  cpkTrend: number | null;
  projectedKmRemaining: number | null;
  projectedDateEOL: string | null;
  healthScore: number | null;
  vidaActual: string | null;
  inspecciones: RawInsp[];
  vehicle?: { placa: string; tipovhc?: string } | null;
}

interface TirePrediction {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension: string;
  eje: string;
  posicion: number;
  currentDepth: number;
  initialDepth: number;
  healthScore: number;
  projectedKmRemaining: number;
  projectedDateEOL: Date | null;
  daysUntilEOL: number | null;
  cpk: number;
  cpkTrend: number;
  alertLevel: string;
  wearRatePerMonth: number;
  lifePercent: number;
  vidaActual: string;
}

// =============================================================================
// Helpers
// =============================================================================

const OPTIMAL_RETIREMENT_MM = 3;

function computeWearRate(inspections: RawInsp[]): number {
  if (inspections.length < 2) return 0;
  const sorted = [...inspections].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstMin = Math.min(first.profundidadInt, first.profundidadCen, first.profundidadExt);
  const lastMin = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
  const months =
    (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  if (months < 0.5) return 0;
  return (firstMin - lastMin) / months;
}

function processTire(raw: RawTire): TirePrediction | null {
  const insps = raw.inspecciones ?? [];
  if (insps.length === 0) return null;

  const sorted = [...insps].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  const last = sorted[sorted.length - 1];
  const currentDepth = Math.min(
    last.profundidadInt,
    last.profundidadCen,
    last.profundidadExt
  );

  const wearRate = computeWearRate(sorted);

  // Projected EOL: use backend value if available, else compute locally
  let projectedDateEOL: Date | null = null;
  let daysUntilEOL: number | null = null;

  if (raw.projectedDateEOL) {
    projectedDateEOL = new Date(raw.projectedDateEOL);
    daysUntilEOL = Math.max(
      0,
      Math.round(
        (projectedDateEOL.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
  } else if (wearRate > 0 && currentDepth > OPTIMAL_RETIREMENT_MM) {
    const mmRemaining = currentDepth - OPTIMAL_RETIREMENT_MM;
    const monthsRemaining = mmRemaining / wearRate;
    daysUntilEOL = Math.max(0, Math.round(monthsRemaining * 30));
    projectedDateEOL = new Date(Date.now() + daysUntilEOL * 24 * 60 * 60 * 1000);
  }

  const lifePercent =
    raw.profundidadInicial > 0
      ? Math.max(0, Math.min(100, (currentDepth / raw.profundidadInicial) * 100))
      : 0;

  return {
    id: raw.id,
    placa: raw.vehicle?.placa ?? raw.placa ?? "—",
    marca: raw.marca,
    diseno: raw.diseno,
    dimension: raw.dimension,
    eje: raw.eje,
    posicion: raw.posicion,
    currentDepth,
    initialDepth: raw.profundidadInicial,
    healthScore: raw.healthScore ?? Math.round(lifePercent),
    projectedKmRemaining: raw.projectedKmRemaining ?? 0,
    projectedDateEOL,
    daysUntilEOL,
    cpk: raw.currentCpk ?? last.cpk ?? 0,
    cpkTrend: raw.cpkTrend ?? 0,
    alertLevel: raw.alertLevel ?? "none",
    wearRatePerMonth: Math.round(wearRate * 100) / 100,
    lifePercent,
    vidaActual: raw.vidaActual ?? "nueva",
  };
}

function urgencyColor(days: number | null): { bg: string; text: string; label: string } {
  if (days === null) return { bg: "rgba(100,116,139,0.08)", text: "#64748b", label: "Sin datos" };
  if (days <= 30) return { bg: "rgba(239,68,68,0.08)", text: "#ef4444", label: "Critico" };
  if (days <= 60) return { bg: "rgba(249,115,22,0.08)", text: "#f97316", label: "Pronto" };
  if (days <= 90) return { bg: "rgba(234,179,8,0.08)", text: "#eab308", label: "Planificar" };
  return { bg: "rgba(34,197,94,0.08)", text: "#22c55e", label: "Estable" };
}

function healthColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

// =============================================================================
// Component
// =============================================================================

export default function NikitaTab() {
  const [tires, setTires] = useState<TirePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaca, setExpandedPlaca] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"eol" | "health" | "cpk">("eol");

  // Fetch data
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    let user: { companyId?: string };
    try {
      user = JSON.parse(stored);
    } catch {
      return;
    }
    if (!user.companyId) return;

    setLoading(true);
    authFetch(`${API_BASE}/tires?companyId=${user.companyId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: RawTire[]) => {
        const processed = raw
          .filter((t) => (t.vidaActual ?? "nueva") !== "fin")
          .map(processTire)
          .filter(Boolean) as TirePrediction[];
        setTires(processed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by vehicle placa
  const grouped = useMemo(() => {
    const map: Record<string, TirePrediction[]> = {};
    tires.forEach((t) => {
      const key = t.placa;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tires]);

  // Sort vehicles by most urgent tire
  const sortedPlacas = useMemo(() => {
    const entries = Object.entries(grouped);
    entries.sort(([, a], [, b]) => {
      const minA = Math.min(
        ...a.map((t) =>
          sortBy === "eol"
            ? t.daysUntilEOL ?? 9999
            : sortBy === "health"
            ? t.healthScore
            : t.cpk
        )
      );
      const minB = Math.min(
        ...b.map((t) =>
          sortBy === "eol"
            ? t.daysUntilEOL ?? 9999
            : sortBy === "health"
            ? t.healthScore
            : t.cpk
        )
      );
      return minA - minB;
    });
    return entries;
  }, [grouped, sortBy]);

  // KPIs
  const kpis = useMemo(() => {
    if (tires.length === 0)
      return { critical: 0, avgHealth: 0, avgDaysEOL: 0, avgCpk: 0, totalTires: 0 };
    const withEOL = tires.filter((t) => t.daysUntilEOL !== null);
    const critical = tires.filter(
      (t) => t.daysUntilEOL !== null && t.daysUntilEOL <= 30
    ).length;
    const avgHealth = Math.round(
      tires.reduce((s, t) => s + t.healthScore, 0) / tires.length
    );
    const avgDaysEOL =
      withEOL.length > 0
        ? Math.round(
            withEOL.reduce((s, t) => s + (t.daysUntilEOL ?? 0), 0) / withEOL.length
          )
        : 0;
    const avgCpk = Math.round(
      tires.reduce((s, t) => s + t.cpk, 0) / tires.length
    );
    return { critical, avgHealth, avgDaysEOL, avgCpk, totalTires: tires.length };
  }, [tires]);

  // Dynamic Nikita insight
  const nikitaInsight = useMemo(() => {
    if (tires.length === 0) return "";
    const lines: string[] = [];

    if (kpis.critical > 0) {
      lines.push(
        `${kpis.critical} llanta${kpis.critical > 1 ? "s" : ""} llegara${kpis.critical > 1 ? "n" : ""} a retiro optimo (3mm) en menos de 30 dias. Accion inmediata requerida para preservar cascos.`
      );
    }

    const soon60 = tires.filter(
      (t) => t.daysUntilEOL !== null && t.daysUntilEOL > 30 && t.daysUntilEOL <= 60
    ).length;
    if (soon60 > 0) {
      lines.push(
        `${soon60} llanta${soon60 > 1 ? "s" : ""} necesitara${soon60 > 1 ? "n" : ""} reemplazo o reencauche en los proximos 60 dias. Momento ideal para cotizar.`
      );
    }

    lines.push(
      `Salud promedio de la flota: ${kpis.avgHealth}%. CPK promedio: $${kpis.avgCpk.toLocaleString("es-CO")}/km.`
    );

    if (kpis.avgDaysEOL > 0) {
      lines.push(
        `Vida promedio restante estimada: ${kpis.avgDaysEOL} dias (~${Math.round(kpis.avgDaysEOL / 30)} meses).`
      );
    }

    const declining = tires.filter((t) => t.cpkTrend > 0).length;
    if (declining > tires.length * 0.3) {
      lines.push(
        `${declining} llantas muestran CPK en aumento (deterioro). Considere aumentar frecuencia de inspeccion.`
      );
    }

    return lines.join("\n\n");
  }, [tires, kpis]);

  const togglePlaca = useCallback(
    (placa: string) =>
      setExpandedPlaca((prev) => (prev === placa ? null : placa)),
    []
  );

  // =========================================================================
  // Render
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-[#8b5cf6]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-medium">Otis analizando predicciones...</span>
      </div>
    );
  }

  if (tires.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Dog className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Sin datos de inspeccion para generar predicciones.</p>
        <p className="text-xs mt-1">Registra inspecciones para activar el análisis predictivo de Otis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent header bar */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #0A183A, #173D68)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-white font-black text-base tracking-tight">
              Predicciones de Flota
            </h2>
            <p className="text-white/50 text-[10px] uppercase tracking-wider font-bold">
              Análisis predictivo &middot; {tires.length} llantas activas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#1E76B6" }}
          />
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: "#1E76B6" }}
          >
            Otis
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Critical */}
        <div
          className="rounded-xl px-4 py-3 border"
          style={{
            background: kpis.critical > 0 ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.05)",
            borderColor: kpis.critical > 0 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle
              className="w-3.5 h-3.5"
              style={{ color: kpis.critical > 0 ? "#ef4444" : "#22c55e" }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Criticas (&lt;30d)
            </span>
          </div>
          <p
            className="text-2xl font-black"
            style={{ color: kpis.critical > 0 ? "#ef4444" : "#22c55e" }}
          >
            {kpis.critical}
          </p>
        </div>

        {/* Avg Health */}
        <div
          className="rounded-xl px-4 py-3 border"
          style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.15)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Gauge className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Salud Promedio
            </span>
          </div>
          <p className="text-2xl font-black" style={{ color: healthColor(kpis.avgHealth) }}>
            {kpis.avgHealth}%
          </p>
        </div>

        {/* Avg Days EOL */}
        <div
          className="rounded-xl px-4 py-3 border"
          style={{ background: "rgba(52,140,203,0.05)", borderColor: "rgba(52,140,203,0.15)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-[#348CCB]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Vida Promedio
            </span>
          </div>
          <p className="text-2xl font-black text-[#173D68]">
            {kpis.avgDaysEOL > 0 ? `${kpis.avgDaysEOL}d` : "—"}
          </p>
        </div>

        {/* Avg CPK */}
        <div
          className="rounded-xl px-4 py-3 border"
          style={{ background: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.15)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              CPK Promedio
            </span>
          </div>
          <p className="text-2xl font-black text-[#173D68]">
            ${kpis.avgCpk.toLocaleString("es-CO")}
          </p>
        </div>
      </div>

      {/* Sort control */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Ordenar por:
        </span>
        {(
          [
            { key: "eol", label: "Dias restantes" },
            { key: "health", label: "Salud" },
            { key: "cpk", label: "CPK" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
            style={{
              background: sortBy === opt.key ? "#0A183A" : "transparent",
              color: sortBy === opt.key ? "#fff" : "#173D68",
              border:
                sortBy === opt.key
                  ? "1px solid #0A183A"
                  : "1px solid rgba(52,140,203,0.2)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Vehicle groups */}
      <div className="space-y-3">
        {sortedPlacas.map(([placa, vehicleTires]) => {
          const isExpanded = expandedPlaca === placa;
          const worstDays = Math.min(
            ...vehicleTires.map((t) => t.daysUntilEOL ?? 9999)
          );
          const avgVehicleHealth = Math.round(
            vehicleTires.reduce((s, t) => s + t.healthScore, 0) /
              vehicleTires.length
          );
          const urg = urgencyColor(worstDays < 9999 ? worstDays : null);

          return (
            <div
              key={placa}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ borderColor: "rgba(52,140,203,0.12)" }}
            >
              {/* Vehicle header */}
              <button
                onClick={() => togglePlaca(placa)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#173D68]">
                  <Truck className="w-4 h-4 text-white" />
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-[#0A183A]">{placa}</p>
                  <p className="text-[10px] text-gray-400">
                    {vehicleTires.length} llanta{vehicleTires.length > 1 ? "s" : ""} &middot;
                    Salud {avgVehicleHealth}%
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase"
                  style={{ background: urg.bg, color: urg.text }}
                >
                  {worstDays < 9999 ? `${worstDays}d` : "—"} &middot; {urg.label}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Tire details */}
              {isExpanded && (
                <div className="border-t" style={{ borderColor: "rgba(52,140,203,0.08)" }}>
                  <div className="divide-y divide-gray-100">
                    {vehicleTires
                      .sort((a, b) => (a.daysUntilEOL ?? 9999) - (b.daysUntilEOL ?? 9999))
                      .map((tire) => {
                        const turg = urgencyColor(tire.daysUntilEOL);
                        return (
                          <div key={tire.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            {/* Left: tire info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-[#0A183A]">
                                  P{tire.posicion}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase">
                                  {tire.eje}
                                </span>
                                <span className="text-[10px] font-medium text-gray-600 truncate">
                                  {tire.marca} {tire.diseno}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {tire.dimension}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                {/* Depth bar */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[9px] text-gray-400 w-8 flex-shrink-0">
                                    {tire.currentDepth.toFixed(1)}mm
                                  </span>
                                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${tire.lifePercent}%`,
                                        background: healthColor(tire.lifePercent),
                                      }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-gray-400 flex-shrink-0">
                                    {tire.lifePercent.toFixed(0)}%
                                  </span>
                                </div>
                                {/* Wear rate */}
                                {tire.wearRatePerMonth > 0 && (
                                  <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                    <TrendingDown className="w-2.5 h-2.5" />
                                    {tire.wearRatePerMonth}mm/mes
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: predictions */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Health */}
                              <div className="text-center">
                                <p
                                  className="text-sm font-black"
                                  style={{ color: healthColor(tire.healthScore) }}
                                >
                                  {tire.healthScore}%
                                </p>
                                <p className="text-[8px] text-gray-400 uppercase">Salud</p>
                              </div>

                              {/* CPK + Trend */}
                              <div className="text-center">
                                <div className="flex items-center gap-0.5 justify-center">
                                  <p className="text-sm font-black text-[#173D68]">
                                    ${tire.cpk.toLocaleString("es-CO")}
                                  </p>
                                  {tire.cpkTrend !== 0 && (
                                    <span
                                      className="w-3 h-3"
                                      style={{
                                        color: tire.cpkTrend > 0 ? "#ef4444" : "#22c55e",
                                      }}
                                    >
                                      {tire.cpkTrend > 0 ? (
                                        <TrendingUp className="w-3 h-3" />
                                      ) : (
                                        <TrendingDown className="w-3 h-3" />
                                      )}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[8px] text-gray-400 uppercase">CPK</p>
                              </div>

                              {/* EOL */}
                              <div className="text-center min-w-[60px]">
                                <span
                                  className="inline-block px-2 py-0.5 rounded text-[10px] font-black"
                                  style={{ background: turg.bg, color: turg.text }}
                                >
                                  {tire.daysUntilEOL !== null
                                    ? `${tire.daysUntilEOL}d`
                                    : "—"}
                                </span>
                                {tire.projectedDateEOL && (
                                  <p className="text-[8px] text-gray-400 mt-0.5 flex items-center gap-0.5 justify-center">
                                    <Calendar className="w-2 h-2" />
                                    {tire.projectedDateEOL.toLocaleDateString("es-CO", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </p>
                                )}
                                <p className="text-[8px] text-gray-400 uppercase">Retiro</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div
        className="rounded-xl px-4 py-3 text-center"
        style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)" }}
      >
        <p className="text-[10px] text-gray-400">
          <span className="font-bold" style={{ color: "#1E76B6" }}>Otis</span>
          {" "}analizo {tires.length} llantas en {Object.keys(grouped).length} vehiculos &middot;
          Retiro optimo: {OPTIMAL_RETIREMENT_MM}mm para preservar cascos
        </p>
      </div>
    </div>
  );
}
