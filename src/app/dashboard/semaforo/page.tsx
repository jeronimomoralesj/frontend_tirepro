"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {  
  DollarSign,
  Calendar,
  Download,
  Filter,
  ChevronDown,
  PieChart,
  TrendingUpIcon,
} from "lucide-react";
import SemaforoPie from "../cards/semaforoPie";
import PromedioEje from "../cards/promedioEje";
import SemaforoTabla from "../cards/semaforoTabla";
import PorVida from "../cards/porVida";
import DetallesLlantas from "../cards/detallesLlantas";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import Notificaciones from "../cards/Notificaciones";

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
  vehicleId?: string;
};

export type Vehicle = {
  id: string;
  placa: string;
  tireCount: number;
  cliente?: string;
};

// Translation object
const translations = {
  es: {
    // Header
    title: "Mi Semáforo",
    updated: "Actualizado",
    user: "Usuario",
    export: "Exportar",
    exporting: "Exportando...",
    
    // Metrics
    monthlyInvestment: "Inversión del Mes",
    totalInvestment: "Inversión Total",
    averageCpk: "CPK Promedio",
    projectedCpk: "CPK Proyectado",
    
    // Filters
    filters: "Filtros",
    owner: "Dueño",
    brand: "Marca",
    axis: "Eje",
    status: "Estado",
    all: "Todos",
    allBrands: "Todas",
    allAxes: "Todos",
    allOwners: "Todos",
    
    // Status options
    optimal: "Óptimo",
    sixtyDays: "60 Días",
    thirtyDays: "30 Días",
    urgent: "Urgente",
    noInspection: "Sin Inspección",
    
    // Loading and errors
    loading: "Cargando...",
    loadingTires: "Cargando neumáticos...",
    printError: "Error al generar la impresión. Por favor intente de nuevo.",
    
    // Other
    noOwner: "Sin dueño",
    noBrand: "Sin marca",
    noAxis: "Sin eje"
  },
  en: {
    // Header
    title: "Stop Light",
    updated: "Updated",
    user: "User",
    export: "Export",
    exporting: "Exporting...",
    
    // Metrics
    monthlyInvestment: "Monthly Investment",
    totalInvestment: "Total Investment",
    averageCpk: "Average CPM",
    projectedCpk: "Forecasted CPM",
    
    // Filters
    filters: "Filters",
    owner: "Owner",
    brand: "Brand",
    axis: "Axis",
    status: "Status",
    all: "All",
    allBrands: "All",
    allAxes: "All",
    allOwners: "All",
    
    // Status options
    optimal: "Optimal",
    sixtyDays: "60 Days",
    thirtyDays: "30 Days",
    urgent: "Urgent",
    noInspection: "No Inspection",
    
    // Loading and errors
    loading: "Loading...",
    loadingTires: "Loading tires...",
    printError: "Error generating print. Please try again.",
    
    // Other
    noOwner: "No owner",
    noBrand: "No brand",
    noAxis: "No axis"
  }
};

export default function SemaforoPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
  
  // Language select
  const [language, setLanguage] = useState<'en'|'es'>('es');

  // Get current translations
  const t = translations[language];

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = localStorage.getItem('preferredLanguage') as 'en'|'es';
      if (saved) {
        setLanguage(saved);
        return;
      }

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject('no geo');
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });

        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        if (resp.ok) {
          const { countryCode } = await resp.json();
          const lang = (countryCode === 'US' || countryCode === 'CA') ? 'en' : 'es';
          setLanguage(lang);
          localStorage.setItem('preferredLanguage', lang);
          return;
        }
      } catch {
        // fallback to browser language
      }

      // Browser fallback
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };

    detectAndSetLanguage();
  }, []);

  // Update filter options when language changes
  useEffect(() => {
    setSemaforoOptions([
      t.all,
      t.optimal,
      t.sixtyDays,
      t.thirtyDays,
      t.urgent,
      t.noInspection,
    ]);
    
    // Reset selections to translated values
    setSelectedSemaforo(t.all);
    setSelectedMarca(t.allBrands);
    setSelectedEje(t.allAxes);
    setSelectedCliente(t.allOwners);
  }, [language, t]);

  // Refs for dropdown components
  const dropdownRefs = useRef({
    marca: useRef<HTMLDivElement>(null),
    eje: useRef<HTMLDivElement>(null),
    semaforo: useRef<HTMLDivElement>(null),
    cliente: useRef<HTMLDivElement>(null)
  }).current;

  // Updated exportToPDF function
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
          
          body {
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
      alert(t.printError);
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

    setGastoTotal(total);
    setGastoMes(totalMes);
  }, []);

  const calculateCpkAverages = useCallback((tires: Tire[]) => {
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
  }, []);

  function classifyCondition(tire: Tire): string {
    if (!tire.inspecciones || tire.inspecciones.length === 0) return "sin_inspeccion";
    const last = tire.inspecciones[tire.inspecciones.length - 1];
    const min = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
    if (min > 7) return "optimo";
    if (min > 6) return "60_dias";
    if (min > 5) return "30_dias";
    return "urgente";
  }

  // Apply filters whenever filter selections change
  const applyFilters = useCallback(() => {
    // First, filter tires based on cliente selection
    let tiresForCliente = [...tires];
    
    // Apply cliente filter first
    if (selectedCliente !== t.allOwners && selectedCliente !== t.all) {
      // Get all vehicle IDs that belong to the selected cliente
      const vehicleIds = vehicles
        .filter(vehicle => vehicle.cliente === selectedCliente)
        .map(vehicle => vehicle.id);
      
      // Filter tires to only include those from the matching vehicles
      tiresForCliente = tiresForCliente.filter(tire => 
        tire.vehicleId && vehicleIds.includes(tire.vehicleId)
      );
    }
    
    // Then apply other filters
    let tempTires = [...tiresForCliente];
    
    // Apply marca filter
    if (selectedMarca !== t.allBrands && selectedMarca !== t.all) {
      tempTires = tempTires.filter(tire => tire.marca === selectedMarca);
    }
    
    // Apply eje filter
    if (selectedEje !== t.allAxes && selectedEje !== t.all) {
      tempTires = tempTires.filter(tire => tire.eje === selectedEje);
    }
    
    // Apply semáforo filter
    if (selectedSemaforo !== t.all) {
      tempTires = tempTires.filter(tire => {
        const condition = classifyCondition(tire);
        switch (selectedSemaforo) {
          case t.optimal:
            return condition === "optimo";
          case t.sixtyDays:
            return condition === "60_dias";
          case t.thirtyDays:
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
    
    // Update metrics based on filtered data
    calculateCpkAverages(tempTires);
    calculateTotals(tempTires);
  }, [tires, vehicles, selectedMarca, selectedEje, selectedSemaforo, selectedCliente, calculateCpkAverages, calculateTotals, t]);

  const fetchTires = useCallback(async (cId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${cId}`
          : `https://api.tirepro.com.co/api/tires?companyId=${cId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch tires");
      }
      const data: Tire[] = await res.json();
      
      // Ensure all necessary properties exist and are in the correct format
      const sanitizedData = data.map(tire => ({
        ...tire,
        inspecciones: Array.isArray(tire.inspecciones) ? tire.inspecciones : [],
        costo: Array.isArray(tire.costo) ? tire.costo.map(c => ({
          valor: typeof c.valor === 'number' ? c.valor : 0,
          fecha: typeof c.fecha === 'string' ? c.fecha : new Date().toISOString()
        })) : [],
        // Ensure vida is an array
        vida: Array.isArray(tire.vida) ? tire.vida : []
      }));
      
      // Filter out tires whose last vida entry is "fin"
      const activeTires = sanitizedData.filter(tire => {
        if (tire.vida && tire.vida.length > 0) {
          const lastVida = tire.vida[tire.vida.length - 1].valor?.toLowerCase();
          return lastVida !== "fin";
        }
        return true; // Keep tires without vida entries
      });
      
      setTires(activeTires);
      setFilteredTires(activeTires);
      calculateTotals(activeTires);
      calculateCpkAverages(activeTires);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [calculateTotals, calculateCpkAverages]);

  const fetchVehicles = useCallback(async (cId: string) => {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${cId}`
          : `https://api.tirepro.com.co/api/vehicles?companyId=${cId}`
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
            .map(vehicle => vehicle.cliente || t.noOwner)
        )
      );
      
      setClienteOptions([t.allOwners, ...uniqueClientes]);
    } catch (err: unknown) {
      console.error(err);
    }
  }, [t.allOwners, t.noOwner]);

  const [userPlan, setUserPlan] = useState<string>("");

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

  // Main effect for user initialization
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

    // Load company data and other resources
    fetchCompany(user.companyId);
    fetchVehicles(user.companyId);
    fetchTires(user.companyId);
  }, [router, fetchTires, fetchVehicles, fetchCompany]);

  // Extract unique marca and eje values for filter options
  useEffect(() => {
    if (tires.length > 0) {
      const uniqueMarcas = Array.from(new Set(tires.map(tire => tire.marca || t.noBrand)));
      setMarcasOptions([t.allBrands, ...uniqueMarcas]);
      
      const uniqueEjes = Array.from(new Set(tires.map(tire => tire.eje || t.noAxis)));
      setEjeOptions([t.allAxes, ...uniqueEjes]);
    }
  }, [tires, t.allBrands, t.allAxes, t.noBrand, t.noAxis]);

  // Apply filters when filter selections change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Handle clicking outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeDropdown) {
        const currentRef = dropdownRefs[activeDropdown as keyof typeof dropdownRefs];
        if (currentRef && currentRef.current && !(currentRef.current).contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown, dropdownRefs]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={contentRef}>
        {/* Header Section */}
        <div className="mb-8 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h2 className="text-2xl font-bold">{t.title}</h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                {t.updated}: {new Date().toLocaleDateString()}
              </p>
              {userName && <p className="text-blue-100 mt-1 text-sm">{t.user}: {userName}</p>}
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

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Inversión del Mes Card */}
          <div className="flex items-center space-x-2 bg-[#0A183A] p-4 rounded-xl shadow-2xl">
            <DollarSign className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? t.loading : `$${gastoMes.toLocaleString()}`}
              </p>
              <p className="text-sm uppercase tracking-wider" style={{ color: "#348CCB" }}>
                {t.monthlyInvestment}
              </p>
            </div>
          </div>

          {/* Inversión Total Card */}
          <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
            <DollarSign className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? t.loading : `$${gastoTotal.toLocaleString()}`}
              </p>
              <p className="text-sm uppercase tracking-wider" style={{ color: "#FCD34D" }}>
                {t.totalInvestment}
              </p>
            </div>
          </div>

          {/* CPK Promedio Card */}
          <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
            <PieChart className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? t.loading : cpkPromedio.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">{t.averageCpk}</p>
            </div>
          </div>

          {/* CPK Proyectado Card */}
          <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
            <TrendingUpIcon className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? t.loading : cpkProyectado.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">{t.projectedCpk}</p>
            </div>
          </div>
        </div>

        {/* Filter Section - Hide in print with CSS */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 print:hidden z-999999999999">
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
              label={t.axis}
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
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
            <SemaforoTabla vehicles={vehicles} tires={filteredTires} />
            <PromedioEje 
              tires={filteredTires} 
              onSelectEje={(eje) => setSelectedEje(eje || "Todos")} 
              selectedEje={selectedEje}
            />
          </div>
          <br />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PorVida tires={filteredTires} />
            <SemaforoPie tires={filteredTires} language={language}  />
            <ReencaucheHistorico tires={filteredTires} language={language}  />
          </div>
          <br/>
          <div className="grid md:grid-cols-0 lg:grid-cols-1 gap-6">
            <DetallesLlantas tires={filteredTires} vehicles={vehicles} />
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