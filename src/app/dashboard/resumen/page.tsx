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
import ChatbotWeb from "../chatBot/page";
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
  vida?: { valor: string; fecha: string }[];
};

export type Vehicle = {
  id: string;
  placa: string;
  cliente?: string;
};

export default function ResumenPage() {
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

  // language select
  const [language, setLanguage] = useState<'en'|'es'>('es');

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
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout:10000 });
      });

      const resp = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
      );
      if (resp.ok) {
        const { countryCode } = await resp.json();
        const lang = (countryCode==='US'||countryCode==='CA') ? 'en' : 'es';
        setLanguage(lang);
        localStorage.setItem('preferredLanguage', lang);
        return;
      }
    } catch {
      // fallback …
    }

    // Browser‐fallback
    const browser = navigator.language || navigator.languages?.[0] || 'es';
    const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  detectAndSetLanguage();
}, []);

  // Refs for dropdown components
  const dropdownRefs = useRef({
    marca: useRef<HTMLDivElement>(null),
    eje: useRef<HTMLDivElement>(null),
    semaforo: useRef<HTMLDivElement>(null),
    cliente: useRef<HTMLDivElement>(null),
    banda: useRef<HTMLDivElement>(null),
    vida: useRef<HTMLDivElement>(null),
  }).current;

const translations = {
  en: {
    summary: "My Summary",
    update: "Updated",
    welcome: "Welcome",
    investment: "investment",
    month: "monthly",
    total: "total",
    cpm: "CPM",
    average: "average",
    forecasted: "forecasted",
    filters: "filters",
    brand: "Brand",
    all: "All",
    allOption: "All",
    axis: "Axis",
    state: "State", 
    export: "export",
    banda: "tread",
    vida: "life",
    owner: "Owner",
    // Filter options
    filterOptions: {
      all: "All",
      optimal: "Optimal",
      days60: "60 Days",
      days30: "30 Days",
      urgent: "Urgent",
      noInspection: "No Inspection",
    }
  },
  es:{
    summary: "Mi resumen",
    update: "Actualizado",
    welcome: "Bienvenido",
    investment: "inversión",
    month: "mensual",
    total: "total",
    cpm: "CPK",
    average: "promedio",
    forecasted: "proyectado",
    filters: "filtros",
    brand: "Marca",
    all: "Todas",
    allOption: "Todos",
    axis: "Eje",
    state: "Estado", 
    export: "exportar",
    banda: "banda",
    vida: "vida",
    owner: "Dueño",
    // Filter options
    filterOptions: {
      all: "Todos",
      optimal: "Óptimo",
      days60: "60 Días",
      days30: "30 Días",
      urgent: "Urgente",
      noInspection: "Sin Inspección",
    }
  }
}

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
        
        /* Enhanced chart and canvas handling */
        canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
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

  const fetchVehicles = useCallback(
    async (companyId: string) => {
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
        
        // Extract unique cliente values
        const uniqueClientes = Array.from(
          new Set(data.map((vehicle) => vehicle.cliente || ""))
        );
        setClienteOptions([translations[language].filterOptions.all, ...uniqueClientes]);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unexpected error";
        setError((prev) => prev + " " + errorMessage);
      }
    },
    [language]
  );

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
    const allOption = language === 'en' ? 'All' : (language === 'es' ? 'Todas' : 'Todos');

    // Filter by marca
    if (selectedMarca !== allOption && selectedMarca !== '') {
      tempTires = tempTires.filter((tire) => tire.marca === selectedMarca);
    }

    // Filter by banda (diseno)
    if (selectedBanda !== translations[language].filterOptions.all && selectedBanda !== '') {
      tempTires = tempTires.filter((tire) => tire["diseno"] === selectedBanda);
    }

    // Filter by eje
    if (selectedEje !== translations[language].filterOptions.all && selectedEje !== '') {
      tempTires = tempTires.filter((tire) => tire.eje === selectedEje);
    }

    // Filter by vida
    if (selectedVida !== allOption && selectedVida !== '') {
      tempTires = tempTires.filter((tire) => {
        if (!Array.isArray(tire.vida) || tire.vida.length === 0) return false;
        const lastVida = tire.vida[tire.vida.length - 1].valor?.toLowerCase();
        return lastVida === selectedVida.toLowerCase();
      });
    }

    // Filter by cliente (owner)
    if (selectedCliente !== translations[language].filterOptions.all && selectedCliente !== '') {
      // Get vehicle IDs that match the selected cliente
      const filteredVehicleIds = vehicles
        .filter((vehicle) => vehicle.cliente === selectedCliente)
        .map((vehicle) => vehicle.id);
      
      // Filter tires that belong to these vehicles
      tempTires = tempTires.filter((tire) => 
        tire.vehicleId && filteredVehicleIds.includes(tire.vehicleId)
      );
    }

    // Filter by semáforo (condition)
    if (selectedSemaforo !== translations[language].filterOptions.all && selectedSemaforo !== '') {
      tempTires = tempTires.filter((tire) => {
        const condition = classifyCondition(tire);
        const filterMap = {
          [translations[language].filterOptions.optimal]: "optimo",
          [translations[language].filterOptions.days60]: "60_dias",
          [translations[language].filterOptions.days30]: "30_dias",
          [translations[language].filterOptions.urgent]: "urgente",
          [translations[language].filterOptions.noInspection]: "sin_inspeccion"
        };
        return condition === filterMap[selectedSemaforo];
      });
    }

    setFilteredTires(tempTires);
    calculateCpkAverages(tempTires);
  }, [tires, vehicles, selectedMarca, selectedEje, selectedCliente, selectedVida, selectedBanda, selectedSemaforo, calculateCpkAverages, language]);

const [userPlan, setUserPlan] = useState<string>("");

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
    fetchCompany(user.companyId);
    fetchVehicles(user.companyId);
    fetchTires(user.companyId);
  }, [router, fetchTires, fetchVehicles, fetchCompany]);

  // Update filter options when language changes
  useEffect(() => {
    if (tires.length > 0) {
      const allOption = language === 'en' ? 'All' : (language === 'es' ? 'Todas' : 'Todos');
      
      const uniqueMarcas = Array.from(new Set(tires.map((tire) => tire.marca || "Sin marca")));
      setMarcasOptions([allOption, ...uniqueMarcas]);

      const uniqueEjes = Array.from(new Set(tires.map((tire) => tire.eje || "Sin eje")));
      setEjeOptions([translations[language].filterOptions.all, ...uniqueEjes]);

      const uniqueBandas = Array.from(
        new Set(
          tires.map((tire) => tire["diseno"] || "Sin banda")
        )
      );
      setBandaOptions([translations[language].filterOptions.all, ...uniqueBandas]);

      const uniqueVidas = Array.from(
        new Set(
          tires.flatMap((tire) =>
            Array.isArray(tire.vida)
              ? tire.vida.map((v) =>
                  v.valor
                    ? v.valor.trim().toLowerCase()
                    : "sin vida"
                )
              : []
          )
        )
      ).map(
        (v) => v.charAt(0).toUpperCase() + v.slice(1) // Capitalize for display
      );
      setVidaOptions([allOption, ...uniqueVidas]);

      // Set semaforo options with translations
      setSemaforoOptions([
        translations[language].filterOptions.all,
        translations[language].filterOptions.optimal,
        translations[language].filterOptions.days60,
        translations[language].filterOptions.days30,
        translations[language].filterOptions.urgent,
        translations[language].filterOptions.noInspection,
      ]);

      // Reset selected filters to translated values when language changes
      if (selectedMarca === "" || selectedMarca === "Todas" || selectedMarca === "All") {
        setSelectedMarca(allOption);
      }
      if (selectedEje === "" || selectedEje === "Todos" || selectedEje === "All") {
        setSelectedEje(translations[language].filterOptions.all);
      }
      if (selectedBanda === "" || selectedBanda === "Todos" || selectedBanda === "All") {
        setSelectedBanda(translations[language].filterOptions.all);
      }
      if (selectedVida === "" || selectedVida === "Todas" || selectedVida === "All") {
        setSelectedVida(allOption);
      }
      if (selectedSemaforo === "" || selectedSemaforo === "Todos" || selectedSemaforo === "All") {
        setSelectedSemaforo(translations[language].filterOptions.all);
      }
      if (selectedCliente === "" || selectedCliente === "Todos" || selectedCliente === "All") {
        setSelectedCliente(translations[language].filterOptions.all);
      }

      setFilteredTires(tires);
    }
  }, [tires, language]);

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
              <h2 className="text-2xl font-bold">{translations[language].summary}</h2>
              <p className="text-blue-100 mt-1 flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                {translations[language].update}: {new Date().toLocaleDateString()}
              </p>
              {userName && (
                <p className="text-blue-100 mt-1 text-sm">
                  {translations[language].welcome}, {userName}
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
      <span className="hidden sm:inline">{translations[language].export}...</span>
    </>
  ) : (
    <>
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">{translations[language].export[0].toUpperCase() + translations[language].export.slice(1)}</span>
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
                {translations[language].month} {translations[language].investment}
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
                {translations[language].total} {translations[language].investment}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
            <PieChart className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkPromedio.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">{translations[language].average} {translations[language].cpm}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
            <TrendingUp className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkProyectado.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider text-white">{translations[language].forecasted} {translations[language].cpm}</p>
            </div>
          </div>
        </div>

{/* Filter Section */}
<div className="bg-white rounded-xl shadow-md p-4 mb-6">
  <div className="flex items-center gap-2 mb-3">
    <Filter className="h-5 w-5 text-gray-500" />
    <h3 className="text-lg font-medium text-gray-800">{translations[language].filters[0].toUpperCase() + translations[language].filters.slice(1)}</h3>
  </div>
  <div className={`
    grid
    grid-cols-1
    sm:grid-cols-2
    ${userPlan === "retail" ? "lg:grid-cols-4" : "lg:grid-cols-3"}
    gap-3
  `}>
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
      label={translations[language].brand}
      options={marcasOptions}
      selected={selectedMarca}
      onChange={setSelectedMarca}
    />
    <FilterDropdown
      id="eje"
      label={translations[language].axis}
      options={ejeOptions}
      selected={selectedEje}
      onChange={setSelectedEje}
    />
    <FilterDropdown
      id="semaforo"
      label={translations[language].state}
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
            <HistoricChart tires={filteredTires} language={language}  />
            <PromedioEje
              tires={filteredTires}
              onSelectEje={(eje) => setSelectedEje(eje || "Todos")}
              selectedEje={selectedEje}
              language={language} 
            />
          </div>
          <br />
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            <SemaforoPie tires={filteredTires} language={language}  />
            <ReencaucheHistorico tires={filteredTires} language={language} />
            
          </div>
          <br />
        <TanqueMilimetro tires={filteredTires} language={language} />
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
      <ChatbotWeb />
    </div>
  );
}