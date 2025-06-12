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

export default function ResumenMiniPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gastoMes, setGastoMes] = useState<number>(0);
  const [userName, setUserName] = useState<string>("");
  const [cpkProyectado, setCpkProyectado] = useState<number>(0);
  const [exporting, setExporting] = useState(false);

  // Ref for the content container
  const contentRef = useRef<HTMLDivElement>(null);

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

  const calculateTotals = useCallback((tires: Tire[]) => {
    let totalMes = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

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

    setGastoMes(totalMes);
  }, []);

  const calculateCpkProjected = useCallback((tires: Tire[]) => {
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
      setCpkProyectado(Number((totalCpkProyectado / validTireCount).toFixed(2)));
    } else {
      setCpkProyectado(0);
    }
  }, []);

  const fetchTires = useCallback(
    async (companyId: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}`
            : `https://api.tirepro.com.co/api/tires?companyId=${companyId}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch tires");
        }
        const data: Tire[] = await res.json();

        const sanitizedData = data.map((tire) => ({
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
        const activeTires = sanitizedData.filter((tire) => {
          if (tire.vida && tire.vida.length > 0) {
            const lastVida = tire.vida[tire.vida.length - 1].valor.toLowerCase();
            return lastVida !== "fin";
          }
          return true; // Include tires with no vida entries
        });

        setTires(activeTires);
        calculateTotals(activeTires);
        calculateCpkProjected(activeTires);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unexpected error";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [calculateTotals, calculateCpkProjected]
  );

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
    fetchTires(user.companyId);
  }, [router, fetchTires]);

  return (
    <div className="min-h-screen bg-slate-50">
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
                {loading ? "Cargando..." : `$${gastoMes.toLocaleString()}`}
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
          <CuponesPage />

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