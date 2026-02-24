"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  AlertTriangle, Search, TrendingUp, AlertCircle, Sparkles,
  Zap, Brain, Activity, Trash2, ChevronDown, Users, Building2
} from "lucide-react";
import { useRouter } from "next/navigation";
import CriticalTires from "./critical";

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
  posicion?: string;
  inspecciones?: Inspection[];
  vehicleId?: string;
};

interface Vehicle {
  id: string;
  placa: string;
}

interface Company {
  id: string;
  name: string;
}

// ─── Client Selector ──────────────────────────────────────────────────────────
interface ClientSelectorProps {
  companies: Company[];
  selectedClient: string;
  onSelect: (name: string) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ companies, selectedClient, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const opts = ["Todos", ...companies.map((c) => c.name)];
    if (!search.trim()) return opts;
    return opts.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  }, [companies, search]);

  return (
    <div className="relative w-full sm:w-auto sm:min-w-[220px]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium
                   border border-white/20 hover:bg-white/20 transition-all duration-200
                   flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 flex-shrink-0 opacity-70" />
          <span className="truncate">
            {selectedClient === "Todos" ? "Todos los clientes" : selectedClient}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-64
                          bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-500 text-center">Sin resultados</p>
              ) : (
                filtered.map((client) => (
                  <button
                    key={client}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${selectedClient === client
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                      }`}
                    onClick={() => {
                      onSelect(client);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    {client === "Todos" ? (
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 opacity-60" /> Todos los clientes
                      </span>
                    ) : client}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const IntegratedAnalysisPageDist: React.FC = () => {
  const router = useRouter();

  // ── Company / client state ────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("Todos");

  // ── Tire / vehicle state ──────────────────────────────────────────────────
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── View state ────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<"plate" | "critical" | "waste">("plate");

  // ── Plate-analysis state ──────────────────────────────────────────────────
  const [placa, setPlaca] = useState("");
  type TireAnalysisResponse = {
    tires: {
      placa: string;
      posicion: string;
      profundidadActual: number;
      recomendaciones: string[];
      inspecciones: Inspection[];
    }[];
  };
  const [analysis, setAnalysis] = useState<TireAnalysisResponse | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
      : "https://api.tirepro.com.co/api";

  // ── Filtered companies ────────────────────────────────────────────────────
  const filteredCompanies = useMemo(() => {
    if (selectedClient === "Todos") return companies;
    return companies.filter((c) => c.name === selectedClient);
  }, [companies, selectedClient]);

  // ── Fetch companies on mount ──────────────────────────────────────────────
  useEffect(() => {
    const fetchCompanies = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/companies/me/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCompanies(
          data.map((access: any) => ({
            id: access.company.id,
            name: access.company.name,
          }))
        );
      } catch (e) {
        console.error("Error fetching companies", e);
      }
    };
    fetchCompanies();
  }, [API_BASE]);

  // ── Fetch tires + vehicles whenever filtered companies change ─────────────
  useEffect(() => {
    if (filteredCompanies.length === 0) {
      setTires([]);
      setVehicles([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        const allTires: Tire[] = [];
        const allVehicles: Vehicle[] = [];

        await Promise.all(
          filteredCompanies.map(async (company) => {
            try {
              const [tiresRes, vehiclesRes] = await Promise.all([
                fetch(`${API_BASE}/tires?companyId=${company.id}`, { headers }),
                fetch(`${API_BASE}/vehicles?companyId=${company.id}`, { headers }),
              ]);
              if (tiresRes.ok) allTires.push(...(await tiresRes.json()));
              if (vehiclesRes.ok) allVehicles.push(...(await vehiclesRes.json()));
            } catch {
              // individual company failure — continue
            }
          })
        );

        setTires(allTires);
        setVehicles(allVehicles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filteredCompanies, API_BASE]);

  // ── Plate search ──────────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setAnalysis(null);

    if (!placa.trim()) {
      setSearchError("Por favor ingrese una placa de vehículo");
      return;
    }

    setSearchLoading(true);
    try {
      const lowerPlaca = placa.trim().toLowerCase();
      const res = await fetch(
        `${API_BASE}/tires/analyze?placa=${encodeURIComponent(lowerPlaca)}`
      );
      if (!res.ok) throw new Error("Error al obtener el análisis");
      setAnalysis(await res.json());
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleViewChange = (view: "plate" | "critical" | "waste") => {
    setCurrentView(view);
    if (view !== "plate") {
      setAnalysis(null);
      setPlaca("");
      setSearchError("");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] rounded-xl text-white py-4 sm:py-5 px-3 sm:px-4 md:px-6 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

        <div className="container mx-auto relative z-10 flex flex-col gap-3 sm:gap-4">
          {/* Top row: subtitle + client selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-blue-100/80 text-xs sm:text-sm flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Análisis Inteligente Predictivo — Vista Distribuidor
            </p>

            {/* Client selector */}
            <ClientSelector
              companies={companies}
              selectedClient={selectedClient}
              onSelect={setSelectedClient}
            />
          </div>

          {/* Client badge */}
          {selectedClient !== "Todos" && (
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full border border-white/30 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                {selectedClient}
                <button
                  onClick={() => setSelectedClient("Todos")}
                  className="ml-1 hover:text-red-300 transition-colors text-white/70"
                  aria-label="Limpiar filtro"
                >
                  ×
                </button>
              </span>
              <span className="text-white/60 text-xs">
                {tires.length} llantas · {vehicles.length} vehículos
              </span>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {(
              [
                { key: "plate", icon: <Search className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />, label: "Análisis por Placa" },
                { key: "critical", icon: <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />, label: "Llantas Críticas" },
              ] as const
            ).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => handleViewChange(key)}
                className={`group relative flex items-center justify-center sm:justify-start gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl text-xs sm:text-sm ${
                  currentView === key
                    ? "bg-white/20 backdrop-blur-sm text-white"
                    : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2 sm:gap-3">
                  {icon}
                  <span className="font-medium whitespace-nowrap">{label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 relative z-10">
        <div className="backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 pointer-events-none" />

          <div className="relative z-10">
            {/* ── Critical Tires View ────────────────────────────────────── */}
            {currentView === "critical" && (
              <CriticalTires
                tires={tires}
                vehicles={vehicles}
                loading={loading}
                error={error}
              />
            )}

            {/* ── Plate Analysis View ────────────────────────────────────── */}
            {currentView === "plate" && (
              <div>
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-[#1E76B6] to-[#348CCB] rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0A183A] truncate">
                        Análisis de Llantas por Placa
                      </h2>
                      <p className="text-[#173D68]/70 flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>
                          Insights de IA
                          {selectedClient !== "Todos" && (
                            <span className="ml-2 text-[#1E76B6] font-medium">
                              · {selectedClient}
                            </span>
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Search Form */}
                  <form
                    onSubmit={handleSearch}
                    className="mb-6 sm:mb-8 p-4 sm:p-6 md:p-8 bg-gradient-to-br from-white/80 via-blue-50/30 to-indigo-50/30 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/30"
                  >
                    <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-stretch md:items-end">
                      <div className="flex-1 space-y-1.5 sm:space-y-2">
                        <label
                          htmlFor="placa"
                          className="block text-xs sm:text-sm font-semibold text-[#0A183A] flex items-center gap-1.5 sm:gap-2"
                        >
                          <Search className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>Placa del Vehículo</span>
                        </label>
                        <input
                          id="placa"
                          type="text"
                          placeholder="Ej. abc-123"
                          value={placa}
                          onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                          className="w-full px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 bg-white/80 backdrop-blur-sm border-2 border-[#1E76B6]/20 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-300 text-sm sm:text-base md:text-lg placeholder-gray-400 shadow-inner"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searchLoading}
                        className="group relative px-4 sm:px-6 md:px-8 py-3 sm:py-3.5 md:py-4 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white rounded-xl sm:rounded-2xl hover:from-[#1E76B6] hover:to-[#348CCB] transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative flex items-center gap-2 sm:gap-3">
                          {searchLoading ? (
                            <>
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              <span className="font-medium whitespace-nowrap">Analizando...</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                              <span className="font-medium whitespace-nowrap">Analizar</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </form>

                  {/* Error */}
                  {searchError && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-xl sm:rounded-2xl flex items-start sm:items-center gap-2 sm:gap-3 border border-red-200/50 shadow-sm">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <span className="font-medium text-xs sm:text-sm md:text-base">{searchError}</span>
                    </div>
                  )}

                  {/* Results */}
                  {analysis && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#173D68] truncate">
                            Resultados del Análisis
                          </h3>
                          <p className="text-[#1E76B6] font-medium text-xs sm:text-sm md:text-base">
                            {analysis.tires.length}{" "}
                            {analysis.tires.length === 1 ? "llanta encontrada" : "llantas encontradas"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                        {[...analysis.tires]
                          .sort((a, b) => {
                            const numA = Number(a.posicion) || 0;
                            const numB = Number(b.posicion) || 0;
                            return numA - numB;
                          })
                          .map((tireAnalysis, index) => (
                          <div
                            key={`${tireAnalysis.placa}-${index}`}
                            className="group relative p-4 sm:p-5 md:p-6 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6]/20 via-transparent to-[#348CCB]/20 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative z-10">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                                  <h4 className="font-bold text-base sm:text-lg md:text-xl text-[#0A183A] flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-[#1E76B6]">Id:</span>
                                    <span className="break-all">{tireAnalysis.placa}</span>
                                  </h4>
                                  <p className="text-[#173D68] flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
                                    <span className="font-medium">Posición:</span>
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100/60 text-blue-800 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                                      {tireAnalysis.posicion}
                                    </span>
                                  </p>
                                </div>

                                {tireAnalysis.profundidadActual !== null && (
                                  <div
                                    className={`text-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold shadow-sm text-sm sm:text-base flex-shrink-0 ${
                                      tireAnalysis.profundidadActual <= 2
                                        ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200"
                                        : tireAnalysis.profundidadActual <= 4
                                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-200"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200"
                                    }`}
                                  >
                                    {tireAnalysis.profundidadActual.toFixed(1)} mm
                                  </div>
                                )}
                              </div>

                              {/* Recommendations */}
                              <div className="mb-4 sm:mb-6">
                                <h5 className="font-semibold text-[#173D68] mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span>Recomendaciones</span>
                                </h5>
                                <div className="space-y-1.5 sm:space-y-2">
                                  {tireAnalysis.recomendaciones.map((rec: string, recIndex: number) => (
                                    <div
                                      key={recIndex}
                                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg sm:rounded-xl border border-blue-100/50"
                                    >
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#1E76B6] rounded-full mt-1.5 sm:mt-2 flex-shrink-0" />
                                      <span className="text-[#0A183A] text-xs sm:text-sm leading-relaxed flex-1">{rec}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Inspection history */}
                              {tireAnalysis.inspecciones.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-[#173D68] mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span>Historial de Inspecciones</span>
                                  </h5>
                                  <div className="overflow-hidden bg-white/60 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs sm:text-sm">
                                        <thead className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white">
                                          <tr>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-left font-medium whitespace-nowrap">Fecha</th>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium whitespace-nowrap">Int (mm)</th>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium whitespace-nowrap">Cen (mm)</th>
                                            <th className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium whitespace-nowrap">Ext (mm)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/50">
                                          {tireAnalysis.inspecciones.map((insp, idx: number) => (
                                            <tr
                                              key={idx}
                                              className={`transition-colors duration-200 ${idx % 2 === 0 ? "bg-white/40" : "bg-gray-50/40"} hover:bg-blue-50/50`}
                                            >
                                              <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-[#0A183A] whitespace-nowrap text-[10px] sm:text-xs">
                                                {new Date(insp.fecha).toLocaleDateString()}
                                              </td>
                                              <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-mono ${insp.profundidadInt <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadInt}
                                              </td>
                                              <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-mono ${insp.profundidadCen <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadCen}
                                              </td>
                                              <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-mono ${insp.profundidadExt <= 2 ? "text-red-600 font-bold" : "text-[#173D68]"}`}>
                                                {insp.profundidadExt}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedAnalysisPageDist;