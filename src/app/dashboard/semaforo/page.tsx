"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {  
  DollarSign,
  Calendar,
  Download,
  Bell,
  Truck 
} from "lucide-react";
import SemaforoPie from "../cards/semaforoPie";
import PromedioEje from "../cards/promedioEje";
import SemaforoTabla from "../cards/semaforoTabla";
import PorVida from "../cards/porVida";
import DetallesLlantas from "../cards/detallesLlantas";

export type CostEntry = {
  valor: number;
  fecha: string;
};

export type Tire = {
  id: string;
  costo: CostEntry[];
  inspecciones?: {
    cpk?: number;
    cpkProyectado?: number;
    profundidadInt: number;
    profundidadCen: number;
    profundidadExt: number;
    fecha: string;
  }[];
  marca: string;
  eje: string;
  // ...other tire fields if needed
};

export type Vehicle = {
  id: string;
  placa: string;
  tireCount: number;
  // ...other vehicle fields if needed
};

export default function SemaforoPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gastoTotal, setGastoTotal] = useState<number>(0);
  const [gastoMes, setGastoMes] = useState<number>(0);
  const [companyId, setCompanyId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [cpkPromedio, setCpkPromedio] = useState<number>(0);
  const [cpkProyectado, setCpkProyectado] = useState<number>(0);

  // Filters for the tires (for PromedioEje, etc.)
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [ejeFilter, setEjeFilter] = useState<string>("");

  // Placeholder value for extra bubble
  const inspeccionVencida = 5;

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.companyId) {
        setCompanyId(user.companyId);
        setUserName(user.name || user.email || "User");
        fetchTires(user.companyId);
        fetchVehicles(user.companyId);
      } else {
        setError("No company assigned to user");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  async function fetchTires(companyId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires?companyId=${companyId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch tires");
      }
      const data: Tire[] = await res.json();
      setTires(data);
      calculateTotals(data);
      calculateCpkAverages(data);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchVehicles(companyId: string) {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/vehicles?companyId=${companyId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data: Vehicle[] = await res.json();
      setVehicles(data);
    } catch (err: any) {
      console.error(err);
    }
  }

  function calculateTotals(tires: Tire[]) {
    let total = 0;
    let totalMes = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    tires.forEach((tire) => {
      tire.costo.forEach((entry) => {
        total += entry.valor;
        const entryDate = new Date(entry.fecha);
        if (entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth) {
          totalMes += entry.valor;
        }
      });
    });

    setGastoTotal(total);
    setGastoMes(totalMes);
  }

  function calculateCpkAverages(tires: Tire[]) {
    let totalCpk = 0;
    let totalCpkProyectado = 0;
    let validTireCount = 0;

    tires.forEach((tire) => {
      if (tire.inspecciones && tire.inspecciones.length > 0) {
        // Get the last inspection for each tire
        const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
        
        // Make sure the CPK values exist and are valid numbers
        if (lastInspection.cpk && !isNaN(lastInspection.cpk)) {
          totalCpk += lastInspection.cpk;
          validTireCount++;
        }
        
        if (lastInspection.cpkProyectado && !isNaN(lastInspection.cpkProyectado)) {
          totalCpkProyectado += lastInspection.cpkProyectado;
        }
      }
    });

    // Calculate averages if we have valid tires
    if (validTireCount > 0) {
      setCpkPromedio(Math.round(totalCpk / validTireCount));
      setCpkProyectado(Math.round(totalCpkProyectado / validTireCount));
    } else {
      setCpkPromedio(0);
      setCpkProyectado(0);
    }
  }

  // Filtered tires based on brand and eje filters.
  const filteredTires = useMemo(() => {
    return tires.filter((tire) => {
      const matchesBrand = brandFilter
        ? tire.marca.toLowerCase().includes(brandFilter.toLowerCase())
        : true;
      const matchesEje = ejeFilter
        ? tire.eje.toLowerCase() === ejeFilter.toLowerCase()
        : true;
      return matchesBrand && matchesEje;
    });
  }, [tires, brandFilter, ejeFilter]);

  // Update CPK values when filters change
  useEffect(() => {
    if (filteredTires.length > 0) {
      calculateCpkAverages(filteredTires);
    }
  }, [filteredTires]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h2 className="text-2xl font-bold">Mi Resumen</h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Actualizado: {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <button 
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
                <button 
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Inversión del Mes Card */}
          <div className="flex items-center space-x-2 bg-[#0A183A] p-4 rounded-xl shadow-2xl">
            <DollarSign className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : `$${gastoMes.toLocaleString()}`}
              </p>
              <p className="text-sm uppercase tracking-wider" style={{ color: "#348CCB" }}>
                Inversión del Mes
              </p>
            </div>
          </div>

          {/* Inversión Total Card */}
          <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
            <DollarSign className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : `$${gastoTotal.toLocaleString()}`}
              </p>
              <p className="text-sm uppercase tracking-wider" style={{ color: "#FCD34D" }}>
                Inversión Total
              </p>
            </div>
          </div>

          {/* CPK Promedio Card */}
          <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
            <Truck className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkPromedio.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">CPK Promedio</p>
            </div>
          </div>

          {/* CPK Proyectado Card */}
          <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
            <Download className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkProyectado.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">CPK Proyectado</p>
            </div>
          </div>
        </div>
        <br />

                {/* Filter Section */}
                <div className="mb-6 bg-white rounded-xl shadow-md p-4 border border-gray-200">
          <h3 className="text-lg font-bold text-[#0A183A] mb-2">Filtrar Datos</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Marca</label>
              <input
                type="text"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                placeholder="Filtrar por marca"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Eje</label>
              <input
                type="text"
                value={ejeFilter}
                onChange={(e) => setEjeFilter(e.target.value)}
                placeholder="Filtrar por eje"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
            <SemaforoTabla vehicles={vehicles} tires={tires} />
            <PromedioEje tires={tires} onSelectEje={() => {}} selectedEje={null} />
          </div>
          <br />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PorVida tires={tires} />
            <SemaforoPie tires={tires} />
            <PromedioEje tires={tires} />
          </div>
          <br/>
          <div className="grid md:grid-cols-0 lg:grid-cols-1 gap-6">
            <DetallesLlantas tires={tires} />
          </div>
          <br />


          {/* Loading & Error states */}
          {loading && (
            <div className="text-center py-4 text-[#1E76B6] animate-pulse">
              Cargando neumáticos...
            </div>
          )}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}