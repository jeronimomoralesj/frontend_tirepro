"use client";

import { useState, useEffect, useCallback } from "react";
import SemaforoTabla, { Vehicle, Tire } from "../cards/semaforoTabla";
import PorMarca from "../cards/porMarca";
import PorBanda from "../cards/porBanda";

type Company = {
  id: string;
  name: string;
  vehicleCount: number;
  tireCount: number;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical";
  timestamp: string;
  company: {
    id: string;
    name: string;
  };
  vehicle?: {
    id: string;
    placa: string;
  };
};

type Inspection = {
  cpk: number;
  cpkProyectado: number;
};

type TireWithInspection = {
  id: string;
  inspecciones: Inspection[];
  vida?: { valor: string; fecha: string }[];
};

// SVG Icons
const UsersIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const PackageIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function DistribuidorPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("Todos");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [avgCpk, setAvgCpk] = useState<number>(0);
  const [avgCpt, setAvgCpt] = useState<number>(0);
  
  // State for SemaforoTabla
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allTires, setAllTires] = useState<Tire[]>([]);
  const [loadingSemaforo, setLoadingSemaforo] = useState(false);
  
  // State for PorMarca and PorBanda charts
  const [marcaData, setMarcaData] = useState<{ [marca: string]: number }>({});
  const [bandaData, setBandaData] = useState<{ [banda: string]: number }>({});

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") 
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
      : "https://api.tirepro.com.co/api";

  const [vidaStats, setVidaStats] = useState({
    nueva: 0,
    reencauche1: 0,
    reencauche2: 0,
    reencauche3: 0,
    total: 0,
  });

  const [totalClients, setTotalClients] = useState(0);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("No se encontró token de autenticación");
        return;
      }

      const res = await fetch(
        `${API_BASE}/companies/me/clients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Error fetching companies");
      const data = await res.json();

      console.log("Raw API response:", data);

      // Fetch real counts for each company
      const companiesWithCounts = await Promise.all(
        data.map(async (access: any) => {
          try {
            // Fetch vehicles count
            const vehiclesRes = await fetch(
              `${API_BASE}/vehicles?companyId=${access.company.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const vehicles = vehiclesRes.ok ? await vehiclesRes.json() : [];

            // Fetch tires count
            const tiresRes = await fetch(
              `${API_BASE}/tires?companyId=${access.company.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const tires = tiresRes.ok ? await tiresRes.json() : [];

            return {
              id: access.company.id,
              name: access.company.name,
              vehicleCount: vehicles.length,
              tireCount: tires.length,
            };
          } catch (err) {
            console.error(`Error fetching counts for ${access.company.name}:`, err);
            return {
              id: access.company.id,
              name: access.company.name,
              vehicleCount: 0,
              tireCount: 0,
            };
          }
        })
      );

      console.log("Companies with counts:", companiesWithCounts);
      setCompanies(companiesWithCounts);
      setTotalClients(companiesWithCounts.length);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem("user") : null;
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.name || user.email || "Distribuidor");
    }
  }, []);

  const clientOptions = ["Todos", ...companies.map(c => c.name)];

  const filteredCompanies = selectedClient === "Todos" 
    ? companies 
    : companies.filter(c => c.name === selectedClient);

  const fetchNotifications = useCallback(async (companies: Company[]) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || companies.length === 0) return;

      const companyIds = companies.map(c => c.id);

      const res = await fetch(`${API_BASE}/notifications/by-companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companyIds }),
      });

      if (!res.ok) throw new Error("Error fetching notifications");

      const data: Notification[] = await res.json();

      setNotifications(data);
      setActiveAlerts(data.length);

    } catch (err) {
      console.error(err);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (filteredCompanies.length > 0) {
      fetchNotifications(filteredCompanies);
    }
  }, [filteredCompanies, fetchNotifications]);

  const fetchAllTires = useCallback(async (companies: Company[]) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || companies.length === 0) return;

      const allTiresData: TireWithInspection[] = [];

      await Promise.all(
        companies.map(async (company) => {
          const res = await fetch(
            `${API_BASE}/tires?companyId=${company.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok) return;

          const tires: TireWithInspection[] = await res.json();
          allTiresData.push(...tires);
        })
      );

      calculateGlobalCpk(allTiresData);
      calculateVidaDistribution(allTiresData);
    } catch (e) {
      console.error("Error fetching distributor tires", e);
    }
  }, [API_BASE]);

  const calculateGlobalCpk = (tires: TireWithInspection[]) => {
    let totalCpk = 0;
    let totalCpt = 0;
    let count = 0;

    tires.forEach((tire) => {
      if (!tire.inspecciones || tire.inspecciones.length === 0) return;

      const last = tire.inspecciones[tire.inspecciones.length - 1];

      if (!isNaN(last.cpk)) {
        totalCpk += last.cpk;
        totalCpt += last.cpkProyectado || 0;
        count++;
      }
    });

    if (count > 0) {
      setAvgCpk(Number((totalCpk / count).toFixed(2)));
      setAvgCpt(Number((totalCpt / count).toFixed(2)));
    } else {
      setAvgCpk(0);
      setAvgCpt(0);
    }
  };

  const calculateVidaDistribution = (tires: TireWithInspection[]) => {
    let nueva = 0;
    let r1 = 0;
    let r2 = 0;
    let r3 = 0;

    tires.forEach((tire) => {
      if (!tire.vida || tire.vida.length === 0) return;

      const lastVida = tire.vida[tire.vida.length - 1].valor.toLowerCase();

      if (lastVida === "nueva") nueva++;
      else if (lastVida.includes("reencauche 1") || lastVida.includes("reencauche1")) r1++;
      else if (lastVida.includes("reencauche 2") || lastVida.includes("reencauche2")) r2++;
      else if (lastVida.includes("reencauche 3") || lastVida.includes("reencauche3")) r3++;
    });

    const total = nueva + r1 + r2 + r3;

    setVidaStats({
      nueva,
      reencauche1: r1,
      reencauche2: r2,
      reencauche3: r3,
      total,
    });
  };

  useEffect(() => {
    if (filteredCompanies.length > 0) {
      fetchAllTires(filteredCompanies);
    }
  }, [filteredCompanies, fetchAllTires]);

  // Fetch vehicles and tires for SemaforoTabla
  const fetchVehiclesAndTires = useCallback(async (companies: Company[]) => {
    try {
      setLoadingSemaforo(true);
      const token = localStorage.getItem("token");
      if (!token || companies.length === 0) {
        setAllVehicles([]);
        setAllTires([]);
        setMarcaData({});
        setBandaData({});
        return;
      }

      const vehiclesData: Vehicle[] = [];
      const tiresData: Tire[] = [];

      await Promise.all(
        companies.map(async (company) => {
          try {
            // Fetch vehicles
            const vehiclesRes = await fetch(
              `${API_BASE}/vehicles?companyId=${company.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (vehiclesRes.ok) {
              const vehicles = await vehiclesRes.json();
              vehiclesData.push(...vehicles);
            }

            // Fetch tires
            const tiresRes = await fetch(
              `${API_BASE}/tires?companyId=${company.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (tiresRes.ok) {
              const tires = await tiresRes.json();
              tiresData.push(...tires);
            }
          } catch (err) {
            console.error(`Error fetching data for company ${company.name}:`, err);
          }
        })
      );

      setAllVehicles(vehiclesData);
      setAllTires(tiresData);
      
      // Calculate marca and banda distributions
      calculateMarcaAndBandaData(tiresData);
    } catch (err) {
      console.error("Error fetching vehicles and tires:", err);
    } finally {
      setLoadingSemaforo(false);
    }
  }, [API_BASE]);

  const calculateMarcaAndBandaData = (tires: Tire[]) => {
    const marcaCount: { [marca: string]: number } = {};
    const bandaCount: { [banda: string]: number } = {};

    tires.forEach((tire: any) => {
      // Count by marca
      if (tire.marca) {
        const marca = tire.marca.trim();
        if (marca) {
          marcaCount[marca] = (marcaCount[marca] || 0) + 1;
        }
      }

      // Count by banda (diseno)
      if (tire.diseno) {
        const banda = tire.diseno.trim();
        if (banda) {
          bandaCount[banda] = (bandaCount[banda] || 0) + 1;
        }
      }
    });

    setMarcaData(marcaCount);
    setBandaData(bandaCount);
  };

  useEffect(() => {
    if (filteredCompanies.length > 0) {
      fetchVehiclesAndTires(filteredCompanies);
    }
  }, [filteredCompanies, fetchVehiclesAndTires]);

  const pct = (value: number) =>
    vidaStats.total > 0
      ? ((value / vidaStats.total) * 100).toFixed(1)
      : "0.0";

  const totalReencauche =
    vidaStats.reencauche1 +
    vidaStats.reencauche2 +
    vidaStats.reencauche3;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-900 to-blue-600 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h2 className="text-3xl font-bold">Panel Distribuidor</h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <span className="mr-2"><CalendarIcon /></span>
                Actualizado: {new Date().toLocaleDateString()}
              </p>
              {userName && (
                <p className="text-blue-100 mt-2 text-lg">
                  Bienvenido, {userName}
                </p>
              )}
            </div>
            
            {/* Client Filter */}
            <div className="relative">
              <button
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className="px-4 py-2.5 bg-black bg-opacity-10 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-opacity-20 transition-colors flex items-center gap-2 min-w-[200px] justify-between"
              >
                <span>Cliente: {selectedClient}</span>
                <ChevronDownIcon />
              </button>
              {showClientDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 z-10 max-h-80 overflow-y-auto">
                  {clientOptions.map((client) => (
                    <button
                      key={client}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        selectedClient === client ? "bg-blue-50 text-blue-700 font-medium" : ""
                      }`}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowClientDropdown(false);
                      }}
                    >
                      {client}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-3 bg-blue-900 p-5 rounded-xl shadow-lg">
            <div className="text-white"><UsersIcon /></div>
            <div className="text-left">
              <p className="text-3xl font-bold text-white">{totalClients}</p>
              <p className="text-sm uppercase tracking-wider text-blue-300">
                Clientes Totales
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-blue-800 p-5 rounded-xl shadow-lg">
            <div className="text-yellow-400"><AlertIcon /></div>
            <div className="text-left">
              <p className="text-3xl font-bold text-white">
                {loading ? "..." : activeAlerts}
              </p>
              <p className="text-sm uppercase tracking-wider text-yellow-200">
                Alertas Activas
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-blue-600 p-5 rounded-xl shadow-lg">
            <div className="text-white"><TrendingUpIcon /></div>
            <div className="text-left">
              <p className="text-3xl font-bold text-white">
                {loading ? "..." : `${avgCpk} / ${avgCpt}`}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">
                CPK / CPT Promedio
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-blue-800 p-5 rounded-xl shadow-lg">
            <div className="text-white">
              <PackageIcon />
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold text-white">
                {loading
                  ? "..."
                  : `${totalReencauche} / ${vidaStats.nueva}`}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">
                Reencauche / Nueva
              </p>
            </div>
          </div>
        </div>

        {/* SemaforoTabla Card - Full Width */}
        <div className="mb-6">
          {loadingSemaforo ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="text-center text-blue-600 animate-pulse">
                Cargando datos de neumáticos...
              </div>
            </div>
          ) : (
            <SemaforoTabla vehicles={allVehicles} tires={allTires} />
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Client Alerts List */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-red-500"><BellIcon /></div>
              <h3 className="text-lg font-semibold text-gray-800">Alertas por Cliente</h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay alertas para mostrar
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="border-l-4 border-red-500 bg-red-50 p-3 rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {n.company.name}
                        </p>
                        {n.vehicle && (
                          <p className="text-xs text-gray-500">
                            Vehículo: {n.vehicle.placa.toUpperCase()}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 mt-1">
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {n.message}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(n.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tire Type Distribution */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Distribución de Neumáticos
            </h3>
            <div className="space-y-4">
              {/* Reencauche 1 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Reencauche 1
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {vidaStats.reencauche1} ({pct(vidaStats.reencauche1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-900 to-blue-800 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct(vidaStats.reencauche1)}%` }}
                  />
                </div>
              </div>

              {/* Reencauche 2 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Reencauche 2
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {vidaStats.reencauche2} ({pct(vidaStats.reencauche2)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-800 to-blue-700 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct(vidaStats.reencauche2)}%` }}
                  />
                </div>
              </div>

              {/* Reencauche 3 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Reencauche 3
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {vidaStats.reencauche3} ({pct(vidaStats.reencauche3)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-700 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct(vidaStats.reencauche3)}%` }}
                  />
                </div>
              </div>

              {/* Nueva */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Nueva
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {vidaStats.nueva} ({pct(vidaStats.nueva)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct(vidaStats.nueva)}%` }}
                  />
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    Total
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {vidaStats.total} neumáticos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand and Design Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* PorMarca Chart */}
          <div>
            {loadingSemaforo ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <div className="text-center text-blue-600 animate-pulse">
                  Cargando datos de marcas...
                </div>
              </div>
            ) : Object.keys(marcaData).length > 0 ? (
              <PorMarca groupData={marcaData} />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <div className="text-center text-gray-500">
                  No hay datos de marcas para mostrar
                </div>
              </div>
            )}
          </div>

          {/* PorBanda Chart */}
          <div>
            {loadingSemaforo ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <div className="text-center text-blue-600 animate-pulse">
                  Cargando datos de bandas...
                </div>
              </div>
            ) : Object.keys(bandaData).length > 0 ? (
              <PorBanda groupData={bandaData} />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <div className="text-center text-gray-500">
                  No hay datos de bandas para mostrar
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client List */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Listado de Clientes</h3>
          {loading ? (
            <div className="text-center py-8 text-blue-600 animate-pulse">
              Cargando clientes...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay clientes para mostrar
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="border-2 border-gray-200 hover:border-blue-300 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedClient(company.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{company.name}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>🚛 {company.vehicleCount} vehículos</p>
                        <p>⚫ {company.tireCount} neumáticos</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}