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
import TablaCpk from "../cards/tablaCpk";
import Notificaciones from "../cards/Notificaciones";
import PorBanda from "../cards/porBanda";

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

export type VidaEntry = {
  valor: string;
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
  vehicleId?: string;
  vida?: VidaEntry[];
  diseno: string;
};

export type Vehicle = {
  id: string;
  placa: string;
  tireCount: number;
  cliente?: string;
  tipo?: string;
};

// Language translations
const translations = {
  es: {
    myFleet: "Mi Flota",
    updated: "Actualizado",
    export: "Exportar",
    exporting: "Exportando...",
    vehicles: "Vehículos",
    tires: "Llantas",
    avgCpk: "CPK Promedio",
    projectedCpk: "CPK Proyectado",
    filters: "Filtros",
    owner: "Dueño",
    brand: "Marca",
    axle: "Eje",
    status: "Estado",
    life: "Vida",
    tread: "Banda",
    all: "Todos",
    allBrands: "Todas",
    allAxles: "Todos",
    allOwners: "Todos",
    optimal: "Óptimo",
    days60: "60 Días",
    days30: "30 Días",
    urgent: "Urgente",
    noInspection: "Sin Inspección",
    loading: "Cargando neumáticos...",
    noMarca: "Sin marca",
    noOwner: "Sin dueño",
    noTread: "Sin Banda",
    noLife: "Sin vida"
  }
};

export default function FlotaPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredTires, setFilteredTires] = useState<Tire[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cpkPromedio, setCpkPromedio] = useState<number>(0);
  const [cpkProyectado, setCpkProyectado] = useState<number>(0);
  const [exporting, setExporting] = useState(false);
  const [vidaOptions, setVidaOptions] = useState<string[]>([]);
  const [selectedVida, setSelectedVida] = useState<string>("");
  const [bandaOptions, setBandaOptions] = useState<string[]>([]);
  const [selectedBanda, setSelectedBanda] = useState<string>("");

  // Ref for the content container
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Filter state
  const [marcasOptions, setMarcasOptions] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<string>("");
  
  // Eje filter options
  const [ejeOptions, setEjeOptions] = useState<string[]>([]);
  const [selectedEje, setSelectedEje] = useState<string>("");
  
  // Cliente filter options
  const [clienteOptions, setClienteOptions] = useState<string[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  
  // Semáforo filter options
  const [semaforoOptions, setSemaforoOptions] = useState<string[]>([]);
  const [selectedSemaforo, setSelectedSemaforo] = useState<string>("");
  
  // Dropdown visibility states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Language detection
  const [language, setLanguage] = useState<'es'>('es');
  const [userPlan, setUserPlan] = useState<string>("");

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = 'es';
      setLanguage(saved);
    };

    detectAndSetLanguage();
  }, []);

  // Get current translations
  const t = translations[language];

  // Update filter options when language changes
  useEffect(() => {
    setSemaforoOptions([
      t.all,
      t.optimal,
      t.days60,
      t.days30,
      t.urgent,
      t.noInspection,
    ]);
    
    // Reset selected values with translated strings
    if (selectedMarca === "" || selectedMarca === "Todas" || selectedMarca === "All") {
      setSelectedMarca(t.allBrands);
    }
    if (selectedEje === "" || selectedEje === "Todos" || selectedEje === "All") {
      setSelectedEje(t.allAxles);
    }
    if (selectedCliente === "" || selectedCliente === "Todos" || selectedCliente === "All") {
      setSelectedCliente(t.allOwners);
    }
    if (selectedSemaforo === "" || selectedSemaforo === "Todos" || selectedSemaforo === "All") {
      setSelectedSemaforo(t.all);
    }
    if (selectedVida === "" || selectedVida === "Todos" || selectedVida === "All") {
      setSelectedVida(t.all);
    }
    if (selectedBanda === "" || selectedBanda === "Todos" || selectedBanda === "All") {
      setSelectedBanda(t.all);
    }
  }, [language, t]);

const exportToPDF = () => {
  try {
    setExporting(true);

    // Create a print-specific stylesheet
    const style = document.createElement('style');
    style.type = 'text/css';
    style.id = 'print-style';
    
    // Enhanced print styles with better page break control and chart positioning
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
        
        /* Hide filter section in print */
        .print\\:hidden {
          display: none !important;
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
        
        /* Enhanced chart and canvas handling with proper positioning */
        canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
          position: relative !important;
        }
        
        /* Chart container positioning */
        .chart-container {
          position: relative !important;
          height: auto !important;
          min-height: 200px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
        }
        
        /* Ensure charts align to bottom of their containers */
        .chart-wrapper {
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
          height: 100% !important;
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
        
        /* Fix chart container sizing with bottom alignment */
        .h-64 {
          height: 12rem !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
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
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
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
    banda: useRef<HTMLDivElement>(null),
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
            .filter(vehicle => vehicle.cliente)
            .map(vehicle => vehicle.cliente || t.noOwner)
        )
      );
      
      setClienteOptions([t.allOwners, ...uniqueClientes]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [t.allOwners, t.noOwner]);

  // fetchCompany helper
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

  // Main useEffect for initial data loading
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
    fetchVehicles(user.companyId);
    fetchTires(user.companyId);
  }, [router, fetchTires, fetchVehicles, fetchCompany]);

  // Extract unique marca values for filter options
  useEffect(() => {
    if (tires.length > 0) {
      const uniqueMarcas = Array.from(new Set(tires.map(tire => tire.marca || t.noMarca)));
      setMarcasOptions([t.allBrands, ...uniqueMarcas]);
      
      // Extract unique eje values from tires or their latest inspections
      const uniqueEjes = new Set<string>();
      tires.forEach(tire => {
        if (tire.eje) {
          uniqueEjes.add(tire.eje);
        }
        else if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          if (lastInspection.eje) {
            uniqueEjes.add(lastInspection.eje);
          }
        }
      });
      setEjeOptions([t.allAxles, ...Array.from(uniqueEjes)]);

      // Extract unique banda values with translation
      const uniqueBandas = Array.from(
        new Set(tires.map(tire => tire.diseno || t.noTread))
      );
      setBandaOptions([t.all, ...uniqueBandas]);

      // Extract unique vida values with translation
      const uniqueVidas = Array.from(
        new Set(
          tires.flatMap(tire =>
            Array.isArray(tire.vida)
              ? tire.vida.map(v =>
                  v.valor
                    ? v.valor.trim().toLowerCase()
                    : t.noLife.toLowerCase()
                )
              : []
          )
        )
      ).map(v => v.charAt(0).toUpperCase() + v.slice(1)); // Capitalize

      setVidaOptions([t.all, ...uniqueVidas]);
      
      setFilteredTires(tires);
    }
  }, [tires, t.allBrands, t.noMarca, t.allAxles, t.all, t.noTread, t.noLife]);

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
    let tempTires = [...tires];
    
    // Apply cliente filter first
    if (selectedCliente !== t.allOwners) {
      const vehicleIds = vehicles
        .filter(vehicle => vehicle.cliente === selectedCliente)
        .map(vehicle => vehicle.id);
      
      tempTires = tempTires.filter(tire => 
        tire.vehicleId && vehicleIds.includes(tire.vehicleId)
      );
    }

    // Apply banda (diseno) filter
    if (selectedBanda !== t.all) {
      tempTires = tempTires.filter(tire => {
        const tireDesign = tire.diseno || t.noTread;
        return tireDesign === selectedBanda;
      });
    }
    
    // Apply marca filter
    if (selectedMarca !== t.allBrands) {
      tempTires = tempTires.filter(tire => tire.marca === selectedMarca);
    }

    // Apply vida filter
    if (selectedVida !== t.all) {
      tempTires = tempTires.filter(tire => {
        if (!Array.isArray(tire.vida) || tire.vida.length === 0) return false;
        const lastVida = tire.vida[tire.vida.length - 1].valor?.toLowerCase();
        return lastVida === selectedVida.toLowerCase();
      });
    }
    
    // Apply eje filter
    if (selectedEje !== t.allAxles) {
      tempTires = tempTires.filter(tire => {
        if (tire.eje === selectedEje) {
          return true;
        }
        
        if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          return lastInspection.eje === selectedEje;
        }
        
        return false;
      });
    }

    // Apply semáforo (Estado) filter
    if (selectedSemaforo !== t.all) {
      tempTires = tempTires.filter(tire => {
        const condition = classifyCondition(tire);
        switch (selectedSemaforo) {
          case t.optimal:
            return condition === "optimo";
          case t.days60:
            return condition === "60_dias";
          case t.days30:
            return condition === "30_dias";
          case t.urgent:
            return condition === "urgente";
          case t.noInspection:
            return condition === "sin_inspeccion";
          default:
            return true;
        }
      });
    }

    setFilteredTires(tempTires);
    setFilteredVehicles(vehicles);
    
    // Update metrics based on filtered data
    calculateCpkAverages(tempTires);
  }, [selectedMarca, selectedEje, selectedSemaforo, selectedVida, selectedCliente, selectedBanda, tires, vehicles, t]);

  // Apply filters whenever filter selections change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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

  function calculateCpkAverages(tires: Tire[]) {
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

  // compute group data for tire by banda
  const tiresGroupByBanda = filteredTires.reduce((acc: { [diseno: string]: number }, tire) => {
  const banda = tire.diseno || "Sin Banda";
  acc[banda] = (acc[banda] || 0) + 1;
  return acc;
}, {});


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h2 className="text-2xl font-bold">{t.myFleet}</h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                {t.updated}: {new Date().toLocaleDateString()}
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
                    {exporting ? t.exporting : t.export}
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
                <p className="text-sm uppercase tracking-wider" style={{ color: "#348CCB" }}>{t.vehicles}</p>
              </div>
            </div>

            {/* Llantas Card */}
            <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
              <Layers className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-2xl font-bold text-white">{filteredTires.length}</p>
                <p className="text-sm uppercase tracking-wider" style={{ color: "#FCD34D" }}>{t.tires}</p>
              </div>
            </div>

            {/* CPK Promedio Card */}
            <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
              <PieChart className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-2xl font-bold text-white">
                  {loading ? "Cargando..." : cpkPromedio.toLocaleString()}
                </p>
                <p className="text-sm uppercase tracking-wider text-white">{t.avgCpk}</p>
              </div>
            </div>

            {/* CPK Proyectado Card */}
            <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
              <TrendingUpIcon className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-2xl font-bold text-white">
                  {loading ? "Cargando..." : cpkProyectado.toLocaleString()}
                </p>
                <p className="text-sm uppercase tracking-wider text-white">{t.projectedCpk}</p>
              </div>
            </div>
          </div>

          {/* Filter Section (will be hidden in print by the CSS) */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-800">{t.filters}</h3>
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
                label={t.brand}
                options={marcasOptions}
                selected={selectedMarca}
                onChange={setSelectedMarca}
              />
              
              <FilterDropdown
                id="eje"
                label={t.axle}
                options={ejeOptions}
                selected={selectedEje}
                onChange={setSelectedEje}
              />
              
              <FilterDropdown
                id="semaforo"
                label={t.status}
                options={semaforoOptions}
                selected={selectedSemaforo}
                onChange={setSelectedSemaforo}
              />
              <FilterDropdown
  id="vida"
  label="Vida"
  options={vidaOptions}
  selected={selectedVida}
  onChange={setSelectedVida}
/>

<FilterDropdown
  id="banda"
  label="Banda"
  options={bandaOptions}
  selected={selectedBanda}
  onChange={setSelectedBanda}
/>


            </div>
          </div>

          <main className="container mx-auto max-w-6xl px-4 py-8">
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
              <PorVida tires={filteredTires} />
              <PromedioEje tires={filteredTires} onSelectEje={(eje) => setSelectedEje(eje || "Todos")} selectedEje={selectedEje} />
            </div>
            <br />
            <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-6">
                <PorBanda groupData={tiresGroupByBanda}/>
            </div>
            <br />
            <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-6">
              <PorMarca groupData={tiresGroupByMarca} />
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