"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Calendar,
  Download,
  Filter,
  ChevronDown,
  PieChart,
  TrendingUp,
} from "lucide-react";
import SemaforoPie from "../cards/semaforoPie";
import PromedioEje from "../cards/promedioEje";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import TanqueMilimetro from "../cards/tanqueMilimetro";
import HistoricChart from "../cards/historicChart";
import Notificaciones from "../cards/Notificaciones";

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
};

export default function ResumenPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [filteredTires, setFilteredTires] = useState<Tire[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gastoTotal, setGastoTotal] = useState<number>(0);
  const [gastoMes, setGastoMes] = useState<number>(0);
  const [userName, setUserName] = useState<string>("");
  const [cpkPromedio, setCpkPromedio] = useState<number>(0);
  const [cpkProyectado, setCpkProyectado] = useState<number>(0);
  const [exporting, setExporting] = useState(false);


  // Ref for the content container
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [marcasOptions, setMarcasOptions] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<string>("Todas");

  // Eje filter options
  const [ejeOptions, setEjeOptions] = useState<string[]>([]);
  const [selectedEje, setSelectedEje] = useState<string>("Todos");

  // Semáforo filter options
  const [semaforoOptions] = useState<string[]>([
    "Todos",
    "Óptimo",
    "60 Días",
    "30 Días",
    "Urgente",
    "Sin Inspección",
  ]);
  const [selectedSemaforo, setSelectedSemaforo] = useState<string>("Todos");

  // Dropdown visibility states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Refs for dropdown components
  const dropdownRefs = useRef({
    marca: useRef<HTMLDivElement>(null),
    eje: useRef<HTMLDivElement>(null),
    semaforo: useRef<HTMLDivElement>(null),
  }).current;

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
          
          .bg-\\[\\#173D68\\] {
            background-color: #173D68 !important;
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
          
          /* Ensure charts are visible */
          canvas {
            max-width: 100%;
            height: auto !important;
          }
        }
      `;
      
      // Add the style to the document head
      document.head.appendChild(style);
      
      // Add temporary ID to content container
      if (contentRef.current) {
        contentRef.current.id = 'content-to-print';
      }
      
      // Short delay to ensure styles are applied
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
      }, 500);
      
    } catch (error) {
      console.error('Error during print:', error);
      alert('Error al generar la impresión. Por favor intente de nuevo.');
      setExporting(false);
    }
  };
  

  const calculateTotals = useCallback((tires: Tire[]) => {
    let total = 0;
    let totalMes = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    tires.forEach((tire) => {
      if (Array.isArray(tire.costo)) {
        tire.costo.forEach((entry) => {
          const valor = typeof entry.valor === "number" ? entry.valor : 0;
          total += valor;
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

    setGastoTotal(total);
    setGastoMes(totalMes);
  }, []);

  const calculateCpkAverages = useCallback((tires: Tire[]) => {
    let totalCpk = 0;
    let totalCpkProyectado = 0;
    let validTireCount = 0;

    tires.forEach((tire) => {
      if (tire.inspecciones && tire.inspecciones.length > 0) {
        const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
        if (lastInspection.cpk && !isNaN(lastInspection.cpk)) {
          totalCpk += lastInspection.cpk;
          validTireCount++;
        }
        if (lastInspection.cpkProyectado && !isNaN(lastInspection.cpkProyectado)) {
          totalCpkProyectado += lastInspection.cpkProyectado;
        }
      }
    });

    if (validTireCount > 0) {
      setCpkPromedio(Number((totalCpk / validTireCount).toFixed(2)));
      setCpkProyectado(Number((totalCpkProyectado / validTireCount).toFixed(2)));
    } else {
      setCpkPromedio(0);
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
          // Ensure vida is an array
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
        calculateCpkAverages(activeTires);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unexpected error";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [calculateTotals, calculateCpkAverages]
  );

  const applyFilters = useCallback(() => {
    let tempTires = [...tires];

    if (selectedMarca !== "Todas") {
      tempTires = tempTires.filter((tire) => tire.marca === selectedMarca);
    }

    if (selectedEje !== "Todos") {
      tempTires = tempTires.filter((tire) => tire.eje === selectedEje);
    }

    if (selectedSemaforo !== "Todos") {
      tempTires = tempTires.filter((tire) => {
        const condition = classifyCondition(tire);
        switch (selectedSemaforo) {
          case "Óptimo":
            return condition === "optimo";
          case "60 Días":
            return condition === "60_dias";
          case "30 Días":
            return condition === "30_dias";
          case "Urgente":
            return condition === "urgente";
          case "Sin Inspección":
            return condition === "sin_inspeccion";
          default:
            return true;
        }
      });
    }

    setFilteredTires(tempTires);
    calculateCpkAverages(tempTires);
  }, [tires, selectedMarca, selectedEje, selectedSemaforo, calculateCpkAverages]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.companyId) {
        setUserName(user.name || user.email || "User");
        fetchTires(user.companyId);
      } else {
        setError("No company assigned to user");
      }
    } else {
      router.push("/login");
    }
  }, [router, fetchTires]);

  useEffect(() => {
    if (tires.length > 0) {
      const uniqueMarcas = Array.from(new Set(tires.map((tire) => tire.marca || "Sin marca")));
      setMarcasOptions(["Todas", ...uniqueMarcas]);

      const uniqueEjes = Array.from(new Set(tires.map((tire) => tire.eje || "Sin eje")));
      setEjeOptions(["Todos", ...uniqueEjes]);

      setFilteredTires(tires);
    }
  }, [tires]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeDropdown) {
        const currentRef = dropdownRefs[activeDropdown as keyof typeof dropdownRefs];
        if (currentRef && currentRef.current && !currentRef.current.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown, dropdownRefs]);

  function classifyCondition(tire: Tire): string {
    if (!tire.inspecciones || tire.inspecciones.length === 0) return "sin_inspeccion";
    const last = tire.inspecciones[tire.inspecciones.length - 1];
    const min = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
    if (min > 7) return "optimo";
    if (min > 6) return "60_dias";
    if (min > 5) return "30_dias";
    return "urgente";
  }

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const FilterDropdown = ({
    id,
    label,
    options,
    selected,
    onChange,
  }: {
    id: string;
    label: string;
    options: string[];
    selected: string;
    onChange: (value: string) => void;
  }) => {
    const isOpen = activeDropdown === id;
    return (
      <div className="relative" ref={dropdownRefs[id as keyof typeof dropdownRefs]}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown(id);
          }}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-between w-full"
        >
          <span className="truncate">
            {label}: {selected}
          </span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  selected === option ? "bg-blue-50 text-blue-700 font-medium" : ""
                }`}
                onClick={() => {
                  onChange(option);
                  setActiveDropdown(null);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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
              <div className="flex gap-2">
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
                <Notificaciones />
              </div>
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
            <PieChart className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkPromedio.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">CPK Promedio</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
            <TrendingUp className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkProyectado.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">CPK Proyectado</p>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-800">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
            <FilterDropdown
              id="marca"
              label="Marca"
              options={marcasOptions}
              selected={selectedMarca}
              onChange={setSelectedMarca}
            />
            <FilterDropdown
              id="eje"
              label="Eje"
              options={ejeOptions}
              selected={selectedEje}
              onChange={setSelectedEje}
            />
            <FilterDropdown
              id="semaforo"
              label="Estado"
              options={semaforoOptions}
              selected={selectedSemaforo}
              onChange={setSelectedSemaforo}
            />
          </div>
        </div>

        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
            <HistoricChart tires={filteredTires} />
            <PromedioEje
              tires={filteredTires}
              onSelectEje={(eje) => setSelectedEje(eje || "Todos")}
              selectedEje={selectedEje}
            />
          </div>
          <br />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SemaforoPie tires={filteredTires} />
            <ReencaucheHistorico tires={filteredTires} />
            <TanqueMilimetro tires={filteredTires} />
          </div>

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