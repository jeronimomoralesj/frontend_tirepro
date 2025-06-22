"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Calendar,
  Download,
  TrendingUp,
} from "lucide-react";
import CarsPage from "../cards/cars";
import InspeccionVencida from "../cards/inspeccionVencida";
import CuponesPage from "../cupones/page";

export type CostEntry = {
  valor: number;
  fecha: string;
};

export type Inspection = {
  cpk: number;
  cpkProyectado: number;
  fecha: string;
  imageUrl: string;
  profundidadCen: number;
  profundidadExt: number;
  profundidadInt: number;
};

export type Tire = {
  id: string;
  costo: CostEntry[];
  inspecciones: Inspection[];
  marca: string;
  eje: string;
  vehicleId?: string;
  vida?: Array<{ valor: string; fecha: string }>;
};

export type Vehicle = {
  id: string;
  placa: string;
  cliente?: string;
};

export type Extra = {
  id: string;
  vehicleId: string;
  type: string;
  brand: string;
  purchaseDate: string;
  cost: number;
  notes?: string;
};

export default function ResumenMiniPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicleExtras, setVehicleExtras] = useState<Record<string, Extra[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [gastoMes, setGastoMes] = useState<number>(0);
  const [userName, setUserName] = useState<string>("");
  const [cpkProyectado, setCpkProyectado] = useState<number>(0);
  const [exporting, setExporting] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Ref for the content container
  const contentRef = useRef<HTMLDivElement>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
      : "https://api.tirepro.com.co/api";

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    'Content-Type': 'application/json'
  });

  const exportToPDF = () => {
    try {
      setExporting(true);

      // Create a print-specific stylesheet
      const style = document.createElement('style');
      style.type = 'text/css';
      style.id = 'print-style';
      
      // Hide everything except the content we want to print
      style.innerHTML = `
        @media print {
          @page { 
            size: A4 portrait;
            margin: 10mm; 
          }
          
          body * {
            visibility: hidden;
          }
          
          .min-h-screen {
            min-height: initial !important;
          }
          
          #content-to-print,
          #content-to-print * {
            visibility: visible;
          }
          
          #content-to-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Fix potential color issues */
          .bg-gradient-to-r {
            background: linear-gradient(to right, #0A183A, #1E76B6) !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .bg-\\[\\#0A183A\\] {
            background-color: #0A183A !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .bg-\\[\\#348CCB\\] {
            background-color: #348CCB !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .text-white {
            color: white !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* Enhanced chart and canvas handling */
          canvas {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
          }
        }
      `;
      
      // Add the style to the document head
      document.head.appendChild(style);
      
      // Add temporary ID to content container
      if (contentRef.current) {
        contentRef.current.id = 'content-to-print';
      }
      
      // Wait for charts to render properly before printing
      setTimeout(() => {
        // Force chart re-render for print
        window.dispatchEvent(new Event('resize'));
        
        // Additional delay for chart rendering
        setTimeout(() => {
          // Trigger browser print dialog
          window.print();
          
          // Clean up
          setTimeout(() => {
            document.head.removeChild(style);
            if (contentRef.current) {
              contentRef.current.removeAttribute('id');
            }
            setExporting(false);
          }, 500);
        }, 300);
      }, 500);
      
    } catch (error) {
      console.error('Error during print:', error);
      alert('Error al generar la impresión. Por favor intente de nuevo.');
      setExporting(false);
    }
  };

  // Stable calculation functions - moved outside of useCallback to prevent recreations
  const calculateTotals = (tires: Tire[], allExtras: Extra[]) => {
    let totalMes = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Calculate tire costs
    tires.forEach((tire) => {
      if (Array.isArray(tire.costo)) {
        tire.costo.forEach((entry) => {
          const valor = typeof entry.valor === "number" ? entry.valor : 0;
          if (typeof entry.fecha === "string") {
            const entryDate = new Date(entry.fecha);
            if (
              entryDate.getFullYear() === currentYear &&
              entryDate.getMonth() === currentMonth
            ) {
              totalMes += valor;
            }
          }
        });
      }
    });

    // Calculate vehicle extras costs
    allExtras.forEach((extra) => {
      const extraDate = new Date(extra.purchaseDate);
      if (
        extraDate.getFullYear() === currentYear &&
        extraDate.getMonth() === currentMonth
      ) {
        totalMes += extra.cost;
      }
    });

    return totalMes;
  };

  const calculateCpkProjected = (tires: Tire[]) => {
    let totalCpkProyectado = 0;
    let validTireCount = 0;

    tires.forEach((tire) => {
      if (tire.inspecciones && tire.inspecciones.length > 0) {
        const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
        if (lastInspection.cpkProyectado && !isNaN(lastInspection.cpkProyectado)) {
          totalCpkProyectado += lastInspection.cpkProyectado;
          validTireCount++;
        }
      }
    });

    if (validTireCount > 0) {
      return Number((totalCpkProyectado / validTireCount).toFixed(2));
    } else {
      return 0;
    }
  };

  // Update calculations when data changes
  useEffect(() => {
    if (dataLoaded) {
      const allExtras = Object.values(vehicleExtras).flat();
      const newGastoMes = calculateTotals(tires, allExtras);
      const newCpkProyectado = calculateCpkProjected(tires);
      
      setGastoMes(newGastoMes);
      setCpkProyectado(newCpkProyectado);
    }
  }, [tires, vehicleExtras, dataLoaded]);

  const fetchVehicleExtras = useCallback(async (vehicleId: string): Promise<Extra[]> => {
    try {
      const response = await fetch(`${API_BASE}/vehicles/${vehicleId}/extras`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const extrasData = await response.json();
        return extrasData;
      } else {
        console.warn(`Failed to fetch extras for vehicle ${vehicleId}:`, response.status);
        return [];
      }
    } catch (err) {
      console.error("Error fetching extras for vehicle:", vehicleId, err);
      return [];
    }
  }, [API_BASE]);

  // Main data fetching function
  const fetchAllData = useCallback(async (companyId: string) => {
    setLoading(true);
    setExtrasLoading(true);
    setError("");

    try {
      // Fetch vehicles
      const vehiclesRes = await fetch(`${API_BASE}/vehicles?companyId=${companyId}`);
      if (!vehiclesRes.ok) throw new Error("Failed to fetch vehicles");
      
      const vehiclesData = await vehiclesRes.json();
      const safeVehiclesData = vehiclesData.map((vehicle: Vehicle) => ({
        ...vehicle,
      }));

      // Fetch tires
      const tiresRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/tires?companyId=${companyId}`
      );
      if (!tiresRes.ok) {
        throw new Error("Failed to fetch tires");
      }
      const tiresData: Tire[] = await tiresRes.json();

      const sanitizedTiresData = tiresData.map((tire) => ({
        ...tire,
        inspecciones: Array.isArray(tire.inspecciones) ? tire.inspecciones : [],
        costo: Array.isArray(tire.costo)
          ? tire.costo.map((c) => ({
              valor: typeof c.valor === "number" ? c.valor : 0,
              fecha: typeof c.fecha === "string" ? c.fecha : new Date().toISOString(),
            }))
          : [],
        vida: Array.isArray(tire.vida) ? tire.vida : [],
      }));

      // Filter out tires whose last vida entry is "fin"
      const activeTires = sanitizedTiresData.filter((tire) => {
        if (tire.vida && tire.vida.length > 0) {
          const lastVida = tire.vida[tire.vida.length - 1].valor.toLowerCase();
          return lastVida !== "fin";
        }
        return true; // Include tires with no vida entries
      });

      setTires(activeTires);

      // Fetch extras for all vehicles
      const extrasPromises = safeVehiclesData.map(async (vehicle: Vehicle) => {
        const extras = await fetchVehicleExtras(vehicle.id);
        return { vehicleId: vehicle.id, extras };
      });
      
      const extrasResults = await Promise.all(extrasPromises);
      const newVehicleExtras: Record<string, Extra[]> = {};
      
      extrasResults.forEach(({ vehicleId, extras }) => {
        newVehicleExtras[vehicleId] = extras;
      });
      
      setVehicleExtras(newVehicleExtras);
      setDataLoaded(true);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      setExtrasLoading(false);
    }
  }, [API_BASE, fetchVehicleExtras]);

  // Initialize data on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    if (!user.companyId) {
      setError("No company assigned to user");
      return;
    }

    setUserName(user.name || user.email || "User");
    
    // Only fetch data once when component mounts
    if (!dataLoaded) {
      fetchAllData(user.companyId);
    }
  }, [router, fetchAllData, dataLoaded]);

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={contentRef}>
        {/* Header Section */}
        <div className="mb-8 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h2 className="text-2xl font-bold">Mi Resumen</h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Actualizado: {new Date().toLocaleDateString()}
              </p>
              {userName && (
                <p className="text-blue-100 mt-1 text-sm">
                  Bienvenido, {userName}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                onClick={exportToPDF}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full" />
                    <span className="hidden sm:inline">Exportando...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Metrics Grid - Only 2 metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center space-x-2 bg-[#0A183A] p-4 rounded-xl shadow-2xl">
            <DollarSign className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading || extrasLoading ? "Cargando..." : `$${gastoMes.toLocaleString()}`}
              </p>
              <p className="text-sm uppercase tracking-wider" style={{ color: "#348CCB" }}>
                Inversión del Mes
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
            <TrendingUp className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkProyectado.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">CPK Proyectado</p>
            </div>
          </div>
        </div>

        {/* Main Content - Only InspeccionVencida */}
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 gap-6">
            <InspeccionVencida tires={tires} />
          </div>
          <br />
          <CarsPage />
          <br />
          <CuponesPage />

          {(loading || extrasLoading) && (
            <div className="text-center py-4 text-[#1E76B6] animate-pulse">
              Cargando datos...
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