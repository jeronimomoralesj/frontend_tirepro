"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar,
  Download,
  Layers, 
  Truck,
  Filter,
  ChevronDown,
  PieChart,
  TrendingUpIcon,
} from "lucide-react";
import PorMarca from "../cards/porMarca";
import PorVida from "../cards/porVida";
import PromedioEje from "../cards/promedioEje";
import InspeccionVencidaPage from "../cards/inspeccionVencida";
import TablaCpk from "../cards/tablaCpk";
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
  vida?: string;
  eje?: string;
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
  vehicleId?: string;
};

export type Vehicle = {
  id: string;
  placa: string;
  tireCount: number;
  cliente?: string;
};

export default function FlotaPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [filteredTires, setFilteredTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  
  // Add exporting state
  const [exporting, setExporting] = useState(false);
  // Add content ref for print targeting
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Keeping track of counts but not using them directly in UI yet
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cpkPromedio, setCpkPromedio] = useState<number>(0);
  const [cpkProyectado, setCpkProyectado] = useState<number>(0);

  // Filter state
  const [marcasOptions, setMarcasOptions] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<string>("Todas");

  // Cliente filter options - ADD THIS
  const [clienteOptions, setClienteOptions] = useState<string[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("Todos");
  
  // Not used but keeping for potential future use - removing state setters that are unused
  const [selectedTipoVehiculo] = useState<string>("Todos");
  const [selectedPeriodo] = useState<string>("Todo");
  const [selectedCpkRange] = useState<string>("Todos");
  
  // Eje filter options
  const [ejeOptions, setEjeOptions] = useState<string[]>([]);
  const [selectedEje, setSelectedEje] = useState<string>("Todos");

  // Semáforo filter options (Estado)
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

const exportToPDF = () => {
  try {
    setExporting(true);

    // Create a print-specific stylesheet
    const style = document.createElement('style');
    style.type = 'text/css';
    style.id = 'print-style';
    
    // Enhanced print styles with better page break control
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
        
        /* Enhanced chart and canvas handling */
        canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
        }
        
        /* Control page breaks */
        .page-break-before {
          page-break-before: always !important;
        }
        
        .page-break-after {
          page-break-after: always !important;
        }
        
        .avoid-break {
          page-break-inside: avoid !important;
        }
        
        /* Specific component avoidance */
        .grid {
          break-inside: avoid !important;
        }
        
        /* First row of content should stay together */
        .grid.md\\:grid-cols-1.lg\\:grid-cols-2 {
          page-break-inside: avoid !important;
        }
        
        /* Second row needs separate handling */
        .grid.md\\:grid-cols-2.lg\\:grid-cols-3 {
          page-break-before: always !important;
          page-break-inside: avoid !important;
        }
        
        /* Table row should be on its own page */
        .grid.md\\:grid-cols-1.lg\\:grid-cols-1 {
          page-break-before: always !important;
        }
        
        /* Scale down components slightly to fit better */
        .grid.md\\:grid-cols-1.lg\\:grid-cols-2 > div,
        .grid.md\\:grid-cols-2.lg\\:grid-cols-3 > div {
          transform: scale(0.95);
          transform-origin: top left;
        }
        
        /* Ensure proper positioning for chart containers */
        .relative {
          position: relative !important;
        }
        
        .absolute {
          position: absolute !important;
        }
        
        /* Fix chart container sizing */
        .h-64 {
          height: 12rem !important;
        }
        
        /* Ensure center text is properly positioned */
        .inset-0 {
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          left: 0 !important;
        }
        
        .z-10 {
          z-index: 10 !important;
        }
        
        /* Hide interactive elements */
        .print\\:hidden {
          display: none !important;
        }
        
        /* Adjust spacing for print */
        .print\\:gap-2 {
          gap: 0.5rem !important;
        }
        
        .print\\:mt-4 {
          margin-top: 1rem !important;
        }
        
        .print\\:p-2 {
          padding: 0.5rem !important;
        }
        
        .print\\:text-xs {
          font-size: 0.75rem !important;
        }
        
        .print\\:text-base {
          font-size: 1rem !important;
        }
        
        .print\\:w-4 {
          width: 1rem !important;
        }
        
        .print\\:h-4 {
          height: 1rem !important;
        }
        
        .print\\:h-48 {
          height: 12rem !important;
        }
        
        .print\\:max-w-48 {
          max-width: 12rem !important;
        }
        
        .print\\:max-h-48 {
          max-height: 12rem !important;
        }
      }
    `;
    
    // Add the style to the document head
    document.head.appendChild(style);
    
    // Add temporary ID to content container
    if (contentRef.current) {
      contentRef.current.id = 'content-to-print';
      
      // Add page break control classes
      const gridContainers = contentRef.current.querySelectorAll('.grid');
      gridContainers.forEach((container) => {
  container.classList.add('avoid-break');
});
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
            
            // Remove added classes
            const gridContainers = contentRef.current.querySelectorAll('.grid');
            gridContainers.forEach((container) => {
              container.classList.remove('avoid-break');
            });
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

  // Refs for dropdown components
  const dropdownRefs = useRef({
    marca: useRef<HTMLDivElement>(null),
    eje: useRef<HTMLDivElement>(null),
    semaforo: useRef<HTMLDivElement>(null),
    tipoVehiculo: useRef<HTMLDivElement>(null),
    periodo: useRef<HTMLDivElement>(null),
    cpkRange: useRef<HTMLDivElement>(null),
    vida: useRef<HTMLDivElement>(null),
    cliente: useRef<HTMLDivElement>(null),
  }).current;

  const fetchTires = useCallback(async (companyId: string) => {
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
  
      // Sanitize the data
      const sanitizedData = data.map(tire => ({
        ...tire,
        inspecciones: Array.isArray(tire.inspecciones) ? tire.inspecciones : [],
        costo: Array.isArray(tire.costo)
          ? tire.costo.map(c => ({
              valor: typeof c.valor === 'number' ? c.valor : 0,
              fecha: typeof c.fecha === 'string' ? c.fecha : new Date().toISOString()
            }))
          : []
      }));
  
      // Filter out tires whose latest vida is "fin"
      const activeTires = sanitizedData.filter(tire => {
        if (Array.isArray(tire.vida) && tire.vida.length > 0) {
          const lastVida = tire.vida[tire.vida.length - 1].valor;
          return lastVida.toLowerCase() !== "fin";
        }
        return true;
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
  }, []);
  

  const fetchVehicles = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/vehicles?companyId=${companyId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data: Vehicle[] = await res.json();
      setVehicles(data);
      // Extract unique cliente values for the filter dropdown
      const uniqueClientes = Array.from(
        new Set(
          data
            .filter(vehicle => vehicle.cliente) // Filter out vehicles with no cliente
            .map(vehicle => vehicle.cliente || "Sin dueño")
        )
      );
      
      setClienteOptions(["Todos", ...uniqueClientes]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

const [userPlan, setUserPlan] = useState<string>("");

// 2) fetchCompany helper
const fetchCompany = useCallback(async (companyId: string) => {
  try {
    const url = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${companyId}`
      : `https://api.tirepro.com.co/api/companies/${companyId}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch company");
    const company = await res.json();
    setUserPlan(company.plan);
  } catch (err) {
    console.error(err);
    setError("No se pudo cargar la configuración de la compañía");
  }
}, []);

// 3) in your existing useEffect, call fetchCompany
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
  fetchCompany(user.companyId);

  // your existing loads:
  fetchVehicles(user.companyId);
  fetchTires(user.companyId);
}, [router, fetchTires, fetchVehicles, fetchCompany]);
  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.companyId) {
        // Using a local variable instead of the state since we're not using it elsewhere
        const currentCompanyId = user.companyId;
        
        // Execute fetch operations with the local variables
        fetchTires(currentCompanyId);
        fetchVehicles(currentCompanyId);
      } else {
        setError("No company assigned to user");
      }
    } else {
      router.push("/login");
    }
  }, [router, fetchTires, fetchVehicles]);

  // Extract unique marca values for filter options
  useEffect(() => {
    if (tires.length > 0) {
      const uniqueMarcas = Array.from(new Set(tires.map(tire => tire.marca || "Sin marca")));
      setMarcasOptions(["Todas", ...uniqueMarcas]);
      
      // Extract unique vida values from tires or their latest inspections
      const uniqueVidas = new Set<string>();
      tires.forEach(tire => {
        // Try to get vida from tire directly
        if (tire.vida) {
          uniqueVidas.add(tire.vida);
        }
        // Also check the latest inspection for vida
        else if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          if (lastInspection.vida) {
            uniqueVidas.add(lastInspection.vida);
          }
        }
      });
      
      // Extract unique eje values from tires or their latest inspections
      const uniqueEjes = new Set<string>();
      tires.forEach(tire => {
        // Try to get eje from tire directly
        if (tire.eje) {
          uniqueEjes.add(tire.eje);
        }
        // Also check the latest inspection for eje
        else if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          if (lastInspection.eje) {
            uniqueEjes.add(lastInspection.eje);
          }
        }
      });
      setEjeOptions(["Todos", ...Array.from(uniqueEjes)]);
      
      setFilteredTires(tires);
    }
  }, [tires]);

  // Extract unique vehicle types for filter options
  useEffect(() => {
    if (vehicles.length > 0) {
      setFilteredVehicles(vehicles);
    }
  }, [vehicles]);

  function classifyCondition(tire: Tire): string {
    if (!tire.inspecciones || tire.inspecciones.length === 0) return "sin_inspeccion";
    const last = tire.inspecciones[tire.inspecciones.length - 1];
    const min = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
    if (min > 7) return "optimo";
    if (min > 6) return "60_dias";
    if (min > 5) return "30_dias";
    return "urgente";
  }

  const applyFilters = useCallback(() => {
    // Filter tires based on selected filters
    let tempTires = [...tires];
    // Apply cliente filter first
    if (selectedCliente !== "Todos") {
      // Get all vehicle IDs that belong to the selected cliente
      const vehicleIds = vehicles
        .filter(vehicle => vehicle.cliente === selectedCliente)
        .map(vehicle => vehicle.id);
      
      // Filter tires to only include those from the matching vehicles
      tempTires = tempTires.filter(tire => 
        tire.vehicleId && vehicleIds.includes(tire.vehicleId)
      );
    }
    
    // Apply marca filter
    if (selectedMarca !== "Todas") {
      tempTires = tempTires.filter(tire => tire.marca === selectedMarca);
    }
    
    // Apply eje filter
    if (selectedEje !== "Todos") {
      tempTires = tempTires.filter(tire => {
        // Check eje at tire level
        if (tire.eje === selectedEje) {
          return true;
        }
        
        // Check eje in the latest inspection
        if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          return lastInspection.eje === selectedEje;
        }
        
        return false;
      });
    }

    // Apply semáforo (Estado) filter
    if (selectedSemaforo !== "Todos") {
      tempTires = tempTires.filter(tire => {
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

    // Apply CPK filter
    if (selectedCpkRange !== "Todos") {
      tempTires = tempTires.filter(tire => {
        if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          const cpk = lastInspection.cpk;
          
          switch (selectedCpkRange) {
            case "< 1,000":
              return cpk < 1000;
            case "1,000 - 5,000":
              return cpk >= 1000 && cpk <= 5000;
            case "5,000 - 10,000":
              return cpk > 5000 && cpk <= 10000;
            case "> 10,000":
              return cpk > 10000;
            default:
              return true;
          }
        }
        return false;
      });
    }

    // Apply period filter to both tires and vehicles
    if (selectedPeriodo !== "Todo") {
      const currentDate = new Date();
      const compareDate = new Date();
      
      switch (selectedPeriodo) {
        case "Último mes":
          compareDate.setMonth(currentDate.getMonth() - 1);
          break;
        case "Últimos 3 meses":
          compareDate.setMonth(currentDate.getMonth() - 3);
          break;
        case "Últimos 6 meses":
          compareDate.setMonth(currentDate.getMonth() - 6);
          break;
        case "Último año":
          compareDate.setFullYear(currentDate.getFullYear() - 1);
          break;
      }

      // Filter tires based on the last inspection date
      tempTires = tempTires.filter(tire => {
        if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          const inspectionDate = new Date(lastInspection.fecha);
          return inspectionDate >= compareDate;
        }
        return false;
      });
    }

    // Apply tipo vehicle filter to vehicles
    let tempVehicles = [...vehicles];
    if (selectedTipoVehiculo !== "Todos") {
      tempVehicles = tempVehicles.filter(vehicle => vehicle.tipo === selectedTipoVehiculo);
    }

    setFilteredTires(tempTires);
    setFilteredVehicles(tempVehicles);
    
    // Update metrics based on filtered data
    calculateTotals(tempTires);
    calculateCpkAverages(tempTires);
  }, [selectedMarca, selectedTipoVehiculo, selectedPeriodo, selectedCpkRange, selectedEje, selectedSemaforo, selectedCliente, tires, vehicles]);

  // Apply filters whenever filter selections change
  useEffect(() => {
    applyFilters();
  }, [selectedMarca, selectedTipoVehiculo, selectedPeriodo, selectedCpkRange, selectedEje, selectedSemaforo, selectedCliente, tires, vehicles, applyFilters]);

  // Handle clicking outside dropdowns
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

  function calculateTotals(tires: Tire[]) {
    let total = 0;
    let totalMes = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // zero-indexed

    tires.forEach((tire) => {
      if (Array.isArray(tire.costo)) {
        tire.costo.forEach((entry) => {
          // Make sure entry.valor is a number
          const valor = typeof entry.valor === 'number' ? entry.valor : 0;
          total += valor;
          
          if (typeof entry.fecha === 'string') {
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

    // Using local variables instead of state since we're not displaying these values yet
    const currentGastoTotal = total;
    const currentGastoMes = totalMes;
    
    // We might use these values in future calculations
    return { currentGastoTotal, currentGastoMes };
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
      setCpkPromedio(Number((totalCpk / validTireCount).toFixed(2)));
      setCpkProyectado(Number((totalCpkProyectado / validTireCount).toFixed(2)));
    } else {
      setCpkPromedio(0);
      setCpkProyectado(0);
    }
  }

  // Toggle dropdown visibility
  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Custom dropdown component
  const FilterDropdown = ({ 
    id,
    label, 
    options, 
    selected, 
    onChange
  }: { 
    id: string;
    label: string; 
    options: string[]; 
    selected: string; 
    onChange: (value: string) => void;
  }) => {
    const isOpen = activeDropdown === id;
    
    return (
      <div 
        className="relative" 
        ref={dropdownRefs[id as keyof typeof dropdownRefs]}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown(id);
          }}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-between w-full"
        >
          <span className="truncate">{label}: {selected}</span>
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

  // Compute group data for tires by marca for PorMarca
  const tiresGroupByMarca = filteredTires.reduce((acc: { [marca: string]: number }, tire) => {
    const marca = tire.marca || "Sin marca";
    acc[marca] = (acc[marca] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h2 className="text-2xl font-bold">Mi Flota</h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Actualizado: {new Date().toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <button
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                  onClick={exportToPDF}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {exporting ? "Exportando..." : "Exportar"}
                  </span>
                </button>
                <Notificaciones />
              </div>
            </div>
          </div>
        </div>

        {/* Content that will be printed */}
        <div ref={contentRef}>
          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Vehículos Card */}
            <div className="flex items-center space-x-2 bg-[#0A183A] p-4 rounded-xl shadow-2xl">
              <Truck className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-2xl font-bold text-white">{filteredVehicles.length}</p>
                <p className="text-sm uppercase tracking-wider" style={{ color: "#348CCB" }}>Vehículos</p>
              </div>
            </div>

            {/* Llantas Card */}
            <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
              <Layers className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-2xl font-bold text-white">{filteredTires.length}</p>
                <p className="text-sm uppercase tracking-wider" style={{ color: "#FCD34D" }}>Llantas</p>
              </div>
            </div>

            {/* CPK Promedio Card */}
            <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
              <PieChart className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-2xl font-bold text-white">
                  {loading ? "Cargando..." : cpkPromedio.toLocaleString()}
                </p>
                <p className="text-sm uppercase tracking-wider text-white">CPK Promedio</p>
              </div>
            </div>

            {/* CPK Proyectado Card */}
            <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
              <TrendingUpIcon className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-2xl font-bold text-white">
                  {loading ? "Cargando..." : cpkProyectado.toLocaleString()}
                </p>
                <p className="text-sm uppercase tracking-wider text-white">CPK Proyectado</p>
              </div>
            </div>
          </div>

          {/* Filter Section (will be hidden in print by the CSS) */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-800">Filtros</h3>
            </div>
                      <div
  className={`
    grid
    grid-cols-1
    sm:grid-cols-2
    ${userPlan === "retail" ? "lg:grid-cols-4" : "lg:grid-cols-3"}
    gap-3
  `}
>
  {userPlan === "retail" && (
    <FilterDropdown
      id="cliente"
      label="Dueño"
      options={clienteOptions}
      selected={selectedCliente}
      onChange={setSelectedCliente}
    />
  )}
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
              <PorMarca groupData={tiresGroupByMarca} />
              <PorVida tires={filteredTires} />
            </div>
            <br />
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
              <PromedioEje tires={filteredTires} onSelectEje={(eje) => setSelectedEje(eje || "Todos")} selectedEje={selectedEje} />
              <InspeccionVencidaPage tires={filteredTires} />
            </div>
            <br />
            <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-6">
              <TablaCpk tires={filteredTires} />
            </div>

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
    </div>
  );
}