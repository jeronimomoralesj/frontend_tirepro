"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import SemaforoTabla, { Vehicle, Tire } from "../cards/semaforoTabla";
import PorMarca from "../cards/porMarca";
import PorBanda from "../cards/porBanda";
import TablaCpk from "../cards/tablaCpk";
import type { Tire as TablaCpkTire } from "../cards/tablaCpk";
import DetallesLlantas from "../cards/detallesLlantas";
import type { Tire as DetallesLlantasTire } from "../cards/detallesLlantas";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import type { Tire as ReencaucheTire } from "../cards/reencaucheHistorico";
import HistoricChart from "../cards/historicChart";
import type { Tire as HistoricTire } from "../cards/historicChart";
import TanqueMilimetro from "../cards/tanqueMilimetro";
import type { Tire as TanqueTire } from "../cards/tanqueMilimetro";

// ─── Types ─────────────────────────────────────────────────────────────────────
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
  company: { id: string; name: string };
  vehicle?: { id: string; placa: string };
};

type Inspection = {
  cpk: number;
  cpkProyectado: number;
  cpt?: number;
  cptProyectado?: number;
};

type TireWithInspection = {
  id: string;
  inspecciones: Inspection[];
  vida?: { valor: string; fecha: string }[];
};

// ─── Icons ─────────────────────────────────────────────────────────────────────
const UsersIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const AlertIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const TrendingUpIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const PackageIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const BellIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const ChevronDownIcon = ({ open }: { open?: boolean }) => (
  <svg
    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// ─── Skeleton Loader ───────────────────────────────────────────────────────────
const LoadingCard = ({ label }: { label: string }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
    <div className="flex items-center justify-center gap-2">
      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-blue-600 text-sm font-medium">{label}</span>
    </div>
  </div>
);

// ─── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  iconColor?: string;
  bg: string;
  primary: string;
  secondary?: string;
  label: string;
  labelColor?: string;
  loading?: boolean;
  wide?: boolean;
}
const KpiCard = ({
  icon, iconColor = "text-white", bg,
  primary, secondary, label, labelColor = "text-white/70",
  loading, wide,
}: KpiCardProps) => (
  <div className={`flex items-center gap-3 ${bg} p-3 sm:p-4 lg:p-5 rounded-2xl shadow-lg ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
    <div className={`${iconColor} flex-shrink-0`}>{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-base sm:text-lg lg:text-2xl font-bold text-white leading-none truncate">
        {loading ? <span className="opacity-40">—</span> : primary}
      </p>
      {secondary && (
        <p className="text-[11px] sm:text-sm font-semibold text-blue-200 leading-none mt-0.5 truncate">
          {loading ? <span className="opacity-40">—</span> : secondary}
        </p>
      )}
      <p className={`text-[9px] sm:text-[10px] uppercase tracking-widest ${labelColor} mt-1 leading-tight font-medium`}>
        {label}
      </p>
    </div>
  </div>
);

// ─── ScrollableCard ────────────────────────────────────────────────────────────
// Wraps cards that contain inherently wide tables (SemaforoTabla = 17 positions,
// DetallesLlantas = 19 columns, TablaCpk = wide).
// On mobile a "swipe" hint strip is shown; the inner content scrolls horizontally.
const ScrollableCard = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100">
    {/* Swipe hint — only on small screens */}
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-gray-100 sm:hidden">
      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <span className="text-[10px] text-slate-400 font-medium">Desliza horizontalmente para ver más</span>
    </div>
    {/*
      overflow-x-auto  → horizontal scroll when the table is wider than the viewport
      overflow-y-visible → don't clip tooltips / dropdowns vertically
      The inner card keeps its own rounded corners via the parent clip above.
    */}
    <div className="overflow-x-auto">
      {children}
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DistribuidorPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("Todos");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeAlerts, setActiveAlerts] = useState(0);

  const [avgCpkProyectado, setAvgCpkProyectado] = useState<number>(0);
  const [avgCptProyectado, setAvgCptProyectado] = useState<number>(0);

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allTires, setAllTires] = useState<Tire[]>([]);
  const [loadingSemaforo, setLoadingSemaforo] = useState(false);
  const [marcaData, setMarcaData] = useState<{ [marca: string]: number }>({});
  const [bandaData, setBandaData] = useState<{ [banda: string]: number }>({});
  const [cpkTires, setCpkTires] = useState<TablaCpkTire[]>([]);
  const [detailTires, setDetailTires] = useState<DetallesLlantasTire[]>([]);
  const [reencaucheTires, setReencaucheTires] = useState<ReencaucheTire[]>([]);
  const [historicTires, setHistoricTires] = useState<HistoricTire[]>([]);
  const [tanqueTires, setTanqueTires] = useState<TanqueTire[]>([]);
  const [vidaStats, setVidaStats] = useState({
    nueva: 0, reencauche1: 0, reencauche2: 0, reencauche3: 0, total: 0,
  });
  const [totalClients, setTotalClients] = useState(0);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
      : "https://api.tirepro.com.co/api";

  // ── Fetch companies ──────────────────────────────────────────────────────────
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { setError("No se encontró token de autenticación"); return; }

      const res = await fetch(`${API_BASE}/companies/me/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error fetching companies");
      const data = await res.json();

      const companiesWithCounts = await Promise.all(
        data.map(async (access: any) => {
          try {
            const [vehiclesRes, tiresRes] = await Promise.all([
              fetch(`${API_BASE}/vehicles?companyId=${access.company.id}`, { headers: { Authorization: `Bearer ${token}` } }),
              fetch(`${API_BASE}/tires?companyId=${access.company.id}`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const vehicles = vehiclesRes.ok ? await vehiclesRes.json() : [];
            const tires = tiresRes.ok ? await tiresRes.json() : [];
            return {
              id: access.company.id, name: access.company.name,
              vehicleCount: vehicles.length, tireCount: tires.length,
            };
          } catch {
            return { id: access.company.id, name: access.company.name, vehicleCount: 0, tireCount: 0 };
          }
        })
      );

      setCompanies(companiesWithCounts);
      setTotalClients(companiesWithCounts.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  useEffect(() => {
    const storedUser = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null;
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.name || user.email || "Distribuidor");
    }
  }, []);

  const filteredCompanies = useMemo(() => {
    if (selectedClient === "Todos") return companies;
    return companies.filter((c) => c.name === selectedClient);
  }, [companies, selectedClient]);

  const filteredClientOptions = useMemo(() => {
    const all = ["Todos", ...companies.map((c) => c.name)];
    if (!clientSearchTerm.trim()) return all;
    return all.filter((o) => o.toLowerCase().includes(clientSearchTerm.toLowerCase()));
  }, [companies, clientSearchTerm]);

  // ── Fetch notifications ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchNotifications = async () => {
      if (filteredCompanies.length === 0) { setNotifications([]); setActiveAlerts(0); return; }
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API_BASE}/notifications/by-companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ companyIds: filteredCompanies.map((c) => c.id) }),
        });
        if (!res.ok) throw new Error("Error fetching notifications");
        const data: Notification[] = await res.json();
        setNotifications(data);
        setActiveAlerts(data.length);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    fetchNotifications();
  }, [filteredCompanies, API_BASE]);

  // ── Fetch tires for stats ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAllTires = async () => {
      if (filteredCompanies.length === 0) {
        setAvgCpkProyectado(0); setAvgCptProyectado(0);
        setVidaStats({ nueva: 0, reencauche1: 0, reencauche2: 0, reencauche3: 0, total: 0 });
        return;
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const allTiresData: TireWithInspection[] = [];
        await Promise.all(
          filteredCompanies.map(async (company) => {
            const res = await fetch(`${API_BASE}/tires?companyId=${company.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const tires: TireWithInspection[] = await res.json();
            allTiresData.push(...tires);
          })
        );

        let sumCpkProy = 0, sumCptProy = 0, countCpk = 0, countCpt = 0;
        allTiresData.forEach((tire) => {
          if (!tire.inspecciones?.length) return;
          const last = tire.inspecciones[tire.inspecciones.length - 1];
          if (last.cpkProyectado && !isNaN(last.cpkProyectado) && last.cpkProyectado > 0) {
            sumCpkProy += last.cpkProyectado; countCpk++;
          }
          if (last.cptProyectado && !isNaN(last.cptProyectado) && last.cptProyectado > 0) {
            sumCptProy += last.cptProyectado; countCpt++;
          }
        });
        setAvgCpkProyectado(countCpk > 0 ? Number((sumCpkProy / countCpk).toFixed(0)) : 0);
        setAvgCptProyectado(countCpt > 0 ? Number((sumCptProy / countCpt).toFixed(0)) : 0);

        let nueva = 0, r1 = 0, r2 = 0, r3 = 0;
        allTiresData.forEach((tire) => {
          if (!tire.vida?.length) return;
          const v = tire.vida[tire.vida.length - 1].valor.toLowerCase();
          if (v === "nueva") nueva++;
          else if (v.includes("reencauche 1") || v.includes("reencauche1")) r1++;
          else if (v.includes("reencauche 2") || v.includes("reencauche2")) r2++;
          else if (v.includes("reencauche 3") || v.includes("reencauche3")) r3++;
        });
        setVidaStats({ nueva, reencauche1: r1, reencauche2: r2, reencauche3: r3, total: nueva + r1 + r2 + r3 });
      } catch (e) {
        console.error("Error fetching distributor tires", e);
      }
    };
    fetchAllTires();
  }, [filteredCompanies, API_BASE]);

  // ── Fetch vehicles + tires for cards ────────────────────────────────────────
  useEffect(() => {
    const fetchVehiclesAndTires = async () => {
      if (filteredCompanies.length === 0) {
        setAllVehicles([]); setAllTires([]); setMarcaData({}); setBandaData({});
        setCpkTires([]); setLoadingSemaforo(false); return;
      }
      try {
        setLoadingSemaforo(true);
        const token = localStorage.getItem("token");
        if (!token) { setLoadingSemaforo(false); return; }

        const vehiclesData: Vehicle[] = [];
        const tiresData: Tire[] = [];

        await Promise.all(
          filteredCompanies.map(async (company) => {
            try {
              const [vRes, tRes] = await Promise.all([
                fetch(`${API_BASE}/vehicles?companyId=${company.id}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/tires?companyId=${company.id}`, { headers: { Authorization: `Bearer ${token}` } }),
              ]);
              if (vRes.ok) vehiclesData.push(...await vRes.json());
              if (tRes.ok) tiresData.push(...await tRes.json());
            } catch (err) {
              console.error(`Error fetching data for ${company.name}:`, err);
            }
          })
        );

        setAllVehicles(vehiclesData);
        setAllTires(tiresData);

        const marcaCount: Record<string, number> = {};
        const bandaCount: Record<string, number> = {};
        tiresData.forEach((tire: any) => {
          if (tire.marca?.trim()) marcaCount[tire.marca.trim()] = (marcaCount[tire.marca.trim()] || 0) + 1;
          if (tire.diseno?.trim()) bandaCount[tire.diseno.trim()] = (bandaCount[tire.diseno.trim()] || 0) + 1;
        });
        setMarcaData(marcaCount);
        setBandaData(bandaCount);

        const vehicleMap = new Map(vehiclesData.map((v) => [v.id, v.placa]));

        setCpkTires(tiresData.map((tire: any) => ({
          id: tire.id,
          placa: tire.vehicleId ? (vehicleMap.get(tire.vehicleId) || "N/A") : "N/A",
          marca: tire.marca || "N/A", posicion: tire.posicion || 0,
          vida: tire.vida || [], inspecciones: tire.inspecciones || [],
        })));

        setDetailTires(tiresData.map((tire: any) => ({
          id: tire.id, placa: tire.placa || "N/A", marca: tire.marca || "N/A",
          diseno: tire.diseno || "N/A", profundidadInicial: tire.profundidadInicial || 0,
          dimension: tire.dimension || "N/A", eje: tire.eje || "N/A",
          posicion: tire.posicion || 0, kilometrosRecorridos: tire.kilometrosRecorridos || 0,
          costo: tire.costo || [], vida: tire.vida || [], inspecciones: tire.inspecciones || [],
          primeraVida: tire.primeraVida || [], eventos: tire.eventos || [], vehicleId: tire.vehicleId,
        })));

        setReencaucheTires(tiresData.map((tire: any) => ({ id: tire.id, vida: tire.vida || [] })));
        setHistoricTires(tiresData.map((tire: any) => ({ id: tire.id, inspecciones: tire.inspecciones || [] })));
        setTanqueTires(tiresData.map((tire: any) => ({
          id: tire.id, profundidadInicial: tire.profundidadInicial || 0, inspecciones: tire.inspecciones || [],
        })));
      } catch (err) {
        console.error("Error fetching vehicles and tires:", err);
      } finally {
        setLoadingSemaforo(false);
      }
    };
    fetchVehiclesAndTires();
  }, [filteredCompanies, API_BASE]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const pct = (value: number) =>
    vidaStats.total > 0 ? ((value / vidaStats.total) * 100).toFixed(1) : "0.0";

  const totalReencauche = vidaStats.reencauche1 + vidaStats.reencauche2 + vidaStats.reencauche3;

  const fmtCOP = (n: number) =>
    n === 0
      ? "N/A"
      : new Intl.NumberFormat("es-CO", {
          style: "currency", currency: "COP",
          minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(n);

  const vidaBars = [
    { label: "Reencauche 1", value: vidaStats.reencauche1, color: "from-[#0A183A] to-[#1a3a7a]" },
    { label: "Reencauche 2", value: vidaStats.reencauche2, color: "from-[#1a3a7a] to-[#1E76B6]" },
    { label: "Reencauche 3", value: vidaStats.reencauche3, color: "from-[#1E76B6] to-[#3b9de0]" },
    { label: "Nueva",        value: vidaStats.nueva,       color: "from-[#3b9de0] to-[#7dc5f0]" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    /*
      ┌─────────────────────────────────────────────────────────────────┐
      │  LAYOUT CONTRACT                                                │
      │                                                                 │
      │  Mobile  : sidebar is a full-screen overlay. No shift needed.   │
      │            Mobile nav bar is ~72px tall (h-14 + top-4).         │
      │            → pt-[4.75rem] clears it.                            │
      │                                                                 │
      │  Desktop : sidebar is fixed-position, left-4, rounded.          │
      │            Collapsed  = w-16  (64px) + left-4 (16px) = 80px    │
      │            Expanded   = w-60 (240px) + left-4 (16px) = 256px   │
      │            We use lg:pl-24 (96px) as a safe collapsed default.  │
      │            To support expanded sidebar, pass a `sidebarOpen`    │
      │            boolean prop and toggle between lg:pl-24 / lg:pl-68. │
      └─────────────────────────────────────────────────────────────────┘
    */
    <div className="min-h-screen bg-slate-50">
      <div className="
        w-full max-w-[1600px] mx-auto
        px-3 pt-[4.75rem] pb-6
        sm:px-4 sm:pt-[5.25rem]
        lg:pl-24 lg:pr-6 lg:pt-6
        space-y-4 sm:space-y-5 lg:space-y-6
      ">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] rounded-2xl shadow-xl overflow-visible">
          <div className="p-4 sm:p-5 lg:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="text-white min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate leading-tight">
                Panel Distribuidor
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <span className="flex items-center gap-1 text-blue-200 text-xs">
                  <CalendarIcon />
                  {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                {userName && (
                  <span className="text-blue-200 text-xs">
                    Bienvenido, <span className="font-semibold text-white">{userName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Client selector dropdown */}
            <div className="relative w-full sm:w-auto sm:min-w-[200px] lg:min-w-[220px]">
              <button
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className="w-full px-4 py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium
                           border border-white/20 hover:bg-white/20 transition-all duration-200
                           flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {selectedClient === "Todos" ? "Todos los clientes" : selectedClient}
                </span>
                <ChevronDownIcon open={showClientDropdown} />
              </button>

              {showClientDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowClientDropdown(false)} />
                  <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-64
                                  bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                          <SearchIcon />
                        </span>
                        <input
                          type="text" autoFocus
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Buscar cliente..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredClientOptions.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-gray-500 text-center">Sin resultados</p>
                      ) : (
                        filteredClientOptions.map((client) => (
                          <button
                            key={client}
                            className={`block w-full text-left px-4 py-2.5 text-sm transition-colors
                              ${selectedClient === client
                                ? "bg-blue-50 text-blue-700 font-semibold"
                                : "text-gray-700 hover:bg-gray-50"
                              }`}
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDropdown(false);
                              setClientSearchTerm("");
                            }}
                          >
                            {client}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            bg="bg-[#0A183A]" icon={<UsersIcon />}
            primary={String(totalClients)} label="Clientes totales" loading={loading}
          />
          <KpiCard
            bg="bg-[#0d2257]" icon={<AlertIcon />} iconColor="text-yellow-400"
            primary={String(activeAlerts)} label="Alertas activas"
            labelColor="text-yellow-200/80" loading={loading}
          />
          {/* Wide card: spans full 2 cols on mobile, 1 on lg */}
          <KpiCard
            bg="bg-[#1E76B6]" icon={<TrendingUpIcon />}
            primary={fmtCOP(avgCpkProyectado)}
            secondary={fmtCOP(avgCptProyectado)}
            label="CPK Proy · CPT Proy" loading={loading} wide
          />
          <KpiCard
            bg="bg-[#0d2257]" icon={<PackageIcon />}
            primary={String(totalReencauche)}
            secondary={`/ ${vidaStats.nueva} nuevas`}
            label="Reencauche · Nueva" loading={loading}
          />
        </div>

        {/* ── SemaforoTabla ─────────────────────────────────────────────────── */}
        {/*
          SemaforoTabla renders positions 1-17, each min-w-[80px] = ~1360px minimum.
          ScrollableCard lets it scroll horizontally on narrow viewports safely.
        */}
        {loadingSemaforo ? (
          <LoadingCard label="Cargando datos de neumáticos..." />
        ) : (
          <ScrollableCard>
            <SemaforoTabla vehicles={allVehicles} tires={allTires} />
          </ScrollableCard>
        )}

        {/* ── Alerts + Vida Distribution ────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">

          {/* Alerts panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-500 flex-shrink-0"><BellIcon /></span>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                Alertas por Cliente
              </h2>
              {activeAlerts > 0 && (
                <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                  {activeAlerts}
                </span>
              )}
            </div>
            <div className="overflow-y-auto max-h-60 sm:max-h-72 space-y-2 pr-0.5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Sin alertas activas</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="border-l-4 border-red-400 bg-red-50 rounded-r-xl p-2.5 sm:p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{n.company.name}</p>
                        {n.vehicle && (
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                            Vehículo: {n.vehicle.placa.toUpperCase()}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-gray-800 mt-1 font-medium leading-snug">{n.title}</p>
                        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 line-clamp-2 leading-snug">{n.message}</p>
                      </div>
                      <time className="text-[9px] sm:text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap mt-0.5">
                        {new Date(n.timestamp).toLocaleDateString("es-CO")}
                      </time>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vida distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6 flex flex-col">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-4 leading-tight">
              Distribución de Neumáticos
            </h2>
            <div className="flex-1 space-y-3 sm:space-y-4">
              {vidaBars.map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{label}</span>
                    <span className="text-xs sm:text-sm font-bold text-gray-900">
                      {value}
                      <span className="font-normal text-gray-400 ml-1">({pct(value)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${color} h-full rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${pct(value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs sm:text-sm font-semibold text-gray-800">Total</span>
              <span className="text-xs sm:text-sm font-bold text-[#1E76B6]">{vidaStats.total} neumáticos</span>
            </div>
          </div>
        </div>

        {/* ── PorMarca + PorBanda ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
          <div className="min-w-0 w-full">
            {loadingSemaforo ? (
              <LoadingCard label="Cargando marcas..." />
            ) : Object.keys(marcaData).length > 0 ? (
              <PorMarca groupData={marcaData} />
            ) : (
              <LoadingCard label="Sin datos de marcas" />
            )}
          </div>
          <div className="min-w-0 w-full">
            {loadingSemaforo ? (
              <LoadingCard label="Cargando bandas..." />
            ) : Object.keys(bandaData).length > 0 ? (
              <PorBanda groupData={bandaData} />
            ) : (
              <LoadingCard label="Sin datos de bandas" />
            )}
          </div>
        </div>

        {/* ── TablaCpk ─────────────────────────────────────────────────────── */}
        {/* TablaCpk also has multiple columns — safe scroll wrapper */}
        {loadingSemaforo ? (
          <LoadingCard label="Cargando datos de CPK..." />
        ) : (
          <ScrollableCard>
            <TablaCpk tires={cpkTires} />
          </ScrollableCard>
        )}

        {/* ── TanqueMilimetro + ReencaucheHistorico + HistoricChart ──────────── */}
        {/*
          Chart cards are naturally responsive (maintainAspectRatio: false + fixed height).
          HistoricChart has h-48 / h-56 internally — fine as-is.
          Grid: 1col → 2col(sm) → 3col(xl).
          HistoricChart spans 2 cols on sm so the chart has enough horizontal room.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          <div className="min-w-0">
            {loadingSemaforo ? (
              <LoadingCard label="Cargando datos..." />
            ) : (
              <TanqueMilimetro tires={tanqueTires} language="es" />
            )}
          </div>
          <div className="min-w-0">
            {loadingSemaforo ? (
              <LoadingCard label="Cargando histórico..." />
            ) : (
              <ReencaucheHistorico tires={reencaucheTires} language="es" />
            )}
          </div>
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            {loadingSemaforo ? (
              <LoadingCard label="Cargando gráfico..." />
            ) : (
              <HistoricChart tires={historicTires} language="es" />
            )}
          </div>
        </div>

        {/* ── DetallesLlantas ───────────────────────────────────────────────── */}
        {/*
          DetallesLlantas has 19 columns; the component already does overflow-x-auto
          internally (max-h-96 scroll) but the outer card needs to not clip it.
          ScrollableCard adds the swipe hint on mobile and ensures the outer
          container doesn't break the page layout.
        */}
        {loadingSemaforo ? (
          <LoadingCard label="Cargando detalles de llantas..." />
        ) : (
          <ScrollableCard>
            <DetallesLlantas tires={detailTires} vehicles={allVehicles} />
          </ScrollableCard>
        )}

        {/* ── Client List ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">
              Listado de Clientes
            </h2>
            {filteredCompanies.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 font-medium flex-shrink-0">
                {filteredCompanies.length} cliente{filteredCompanies.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Cargando clientes...</span>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin clientes para mostrar</div>
          ) : (
            /* 1 col → 2 col (≥400px) → 3 col (md) → 4 col (xl) */
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  className="text-left border-2 border-gray-100 hover:border-[#1E76B6]/50
                             rounded-xl p-3 sm:p-4 hover:shadow-md transition-all duration-200
                             active:scale-[0.97] group focus:outline-none focus:ring-2
                             focus:ring-[#1E76B6]/30 w-full"
                  onClick={() => setSelectedClient(company.name)}
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl
                                  bg-gradient-to-br from-[#0A183A] to-[#1E76B6]
                                  flex items-center justify-center text-white font-bold text-sm
                                  mb-2 sm:mb-3 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate mb-1.5
                                 group-hover:text-[#1E76B6] transition-colors leading-snug">
                    {company.name}
                  </h3>
                  <div className="space-y-0.5">
                    <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                      <span>🚛</span>
                      <span><strong className="text-gray-800">{company.vehicleCount}</strong> vehículos</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                      <span>⚫</span>
                      <span><strong className="text-gray-800">{company.tireCount}</strong> neumáticos</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

      </div>
    </div>
  );
}