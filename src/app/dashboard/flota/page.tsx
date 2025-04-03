"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar,
  Download,
  Bell,
  Info, 
  Layers, 
  Clock, 
  Truck,
  Filter,
  ChevronDown
} from "lucide-react";
import SemaforoPie from "../cards/semaforoPie";
import PorMarca from "../cards/porMarca";
import TipoVehiculo from "../cards/tipoVehiculo";
import PorVida from "../cards/porVida";
import PromedioEje from "../cards/promedioEje";
import InspeccionVencidaPage from "../cards/inspeccionVencida";
import TablaCpk from "../cards/tablaCpk";

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
  inspecciones: Inspection[];
  marca: string;
  vida?: string;
  eje?: string;
};

type Vehicle = {
  id: string;
  tipo: string;
  [key: string]: any;
};

export default function ResumenPage() {
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);
  const [filteredTires, setFilteredTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [vehiculosCount, setVehiculosCount] = useState<number>(0);
  const [llantasCount, setLlantasCount] = useState<number>(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gastoTotal, setGastoTotal] = useState<number>(0);
  const [gastoMes, setGastoMes] = useState<number>(0);
  const [cpkPromedio, setCpkPromedio] = useState<number>(0);
  const [cpkProyectado, setCpkProyectado] = useState<number>(0);

  const [companyId, setCompanyId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  // Filter state
  const [marcasOptions, setMarcasOptions] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<string>("Todas");
  const [tipoVehiculoOptions, setTipoVehiculoOptions] = useState<string[]>([]);
  const [selectedTipoVehiculo, setSelectedTipoVehiculo] = useState<string>("Todos");
  const [periodoOptions] = useState<string[]>(["Último mes", "Últimos 3 meses", "Últimos 6 meses", "Último año", "Todo"]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("Todo");
  const [cpkRangeOptions] = useState<string[]>(["Todos", "< 1,000", "1,000 - 5,000", "5,000 - 10,000", "> 10,000"]);
  const [selectedCpkRange, setSelectedCpkRange] = useState<string>("Todos");
  
  // Vida filter options
  const [vidaOptions, setVidaOptions] = useState<string[]>([]);
  const [selectedVida, setSelectedVida] = useState<string>("Todas");
  
  // Eje filter options
  const [ejeOptions, setEjeOptions] = useState<string[]>([]);
  const [selectedEje, setSelectedEje] = useState<string>("Todos");

  // Dropdown visibility states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Refs for dropdown components
  const dropdownRefs = {
    marca: useRef<HTMLDivElement>(null),
    tipoVehiculo: useRef<HTMLDivElement>(null),
    periodo: useRef<HTMLDivElement>(null),
    cpkRange: useRef<HTMLDivElement>(null),
    vida: useRef<HTMLDivElement>(null),
    eje: useRef<HTMLDivElement>(null)
  };

  // For tracking expired inspections
  const [inspeccionVencida, setInspeccionVencida] = useState(0);

  const fetchTires = useCallback(async (companyId: string) => {
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
      
      // Ensure all necessary properties exist and are in the correct format
      const sanitizedData = data.map(tire => ({
        ...tire,
        inspecciones: Array.isArray(tire.inspecciones) ? tire.inspecciones : [],
        costo: Array.isArray(tire.costo) ? tire.costo.map(c => ({
          valor: typeof c.valor === 'number' ? c.valor : 0,
          fecha: typeof c.fecha === 'string' ? c.fecha : new Date().toISOString()
        })) : []
      }));
      
      setTires(sanitizedData);
      setLlantasCount(sanitizedData.length);
      calculateTotals(sanitizedData);
      calculateCpkAverages(sanitizedData);
      calculateExpiredInspections(sanitizedData);
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
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/vehicles?companyId=${companyId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data = await res.json();
      setVehicles(data);
      setVehiculosCount(data.length);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get user from localStorage
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
      setVidaOptions(["Todas", ...Array.from(uniqueVidas)]);
      
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
      const uniqueTipos = Array.from(new Set(vehicles.map(vehicle => vehicle.tipo || "Sin tipo")));
      setTipoVehiculoOptions(["Todos", ...uniqueTipos]);
      setFilteredVehicles(vehicles);
    }
  }, [vehicles]);

  const applyFilters = useCallback(() => {
    // Filter tires based on selected filters
    let tempTires = [...tires];
    
    // Apply marca filter
    if (selectedMarca !== "Todas") {
      tempTires = tempTires.filter(tire => tire.marca === selectedMarca);
    }

    // Apply vida filter
    if (selectedVida !== "Todas") {
      tempTires = tempTires.filter(tire => {
        // Check vida at tire level
        if (tire.vida === selectedVida) {
          return true;
        }
        
        // Check vida in the latest inspection
        if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          return lastInspection.vida === selectedVida;
        }
        
        return false;
      });
    }
    
    // Apply eje filter
    if (selectedEje !== "Todos") {
      tempTires = tempTires.filter(tire => {
        // Check eje at tire level
        if (tire.eje === selectedEje) {
          return true;
        }
        
        // Check vida in the latest inspection
        if (tire.inspecciones && tire.inspecciones.length > 0) {
          const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
          return lastInspection.eje === selectedEje;
        }
        
        return false;
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
  }, [selectedMarca, selectedTipoVehiculo, selectedPeriodo, selectedCpkRange, selectedVida, selectedEje, tires, vehicles]);

  // Apply filters whenever filter selections change
  useEffect(() => {
    applyFilters();
  }, [selectedMarca, selectedTipoVehiculo, selectedPeriodo, selectedCpkRange, selectedVida, selectedEje, tires, vehicles, applyFilters]);

  // Calculate expired inspections
  useEffect(() => {
    calculateExpiredInspections(filteredTires);
  }, [filteredTires]);

  // Handle clicking outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeDropdown) {
        const currentRef = dropdownRefs[activeDropdown as keyof typeof dropdownRefs];
        if (currentRef && currentRef.current && !(currentRef.current as HTMLElement).contains(event.target as Node)) {
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

  function calculateExpiredInspections(tires: Tire[]) {
    const currentDate = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
    
    let expiredCount = 0;
    
    tires.forEach(tire => {
      if (tire.inspecciones && tire.inspecciones.length > 0) {
        const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
        if (typeof lastInspection.fecha === 'string') {
          const inspectionDate = new Date(lastInspection.fecha);
          if (inspectionDate < threeMonthsAgo) {
            expiredCount++;
          }
        }
      }
    });
    
    setInspeccionVencida(expiredCount);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Vehículos Card */}
          <div className="flex items-center space-x-2 bg-[#0A183A] p-4 rounded-xl shadow-2xl">
            <Info className="w-5 h-5 text-white" />
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

          {/* Inspección Vencida Card */}
          <div className="flex items-center space-x-2 bg-[#1E76B6] p-4 rounded-xl shadow-2xl">
            <Clock className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">{inspeccionVencida}</p>
              <p className="text-sm uppercase tracking-wider">Inspección Vencida</p>
            </div>
          </div>

          {/* CPK Promedio Card */}
          <div className="flex items-center space-x-2 bg-[#348CCB] p-4 rounded-xl shadow-2xl">
            <Truck className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkPromedio.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider">CPK Promedio</p>
            </div>
          </div>

          {/* CPK Proyectado Card */}
          <div className="flex items-center space-x-2 bg-[#173D68] p-4 rounded-xl shadow-2xl">
            <Download className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {loading ? "Cargando..." : cpkProyectado.toLocaleString()}
              </p>
              <p className="text-sm uppercase tracking-wider">CPK Proyectado</p>
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
            
            {/* Vida Filter */}
            <FilterDropdown
              id="vida"
              label="Vida"
              options={vidaOptions}
              selected={selectedVida}
              onChange={setSelectedVida}
            />
            
            {/* Eje Filter */}
            <FilterDropdown
              id="eje"
              label="Eje"
              options={ejeOptions}
              selected={selectedEje}
              onChange={setSelectedEje}
            />
          </div>
        </div>

        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
            <PorMarca groupData={tiresGroupByMarca} />
            <PorVida tires={filteredTires} />
          </div>
          <br />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PromedioEje tires={filteredTires} onSelectEje={(eje) => setSelectedEje(eje || "Todos")} selectedEje={selectedEje} />
            <InspeccionVencidaPage tires={filteredTires} />
            <TipoVehiculo vehicles={filteredVehicles} />
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
  );
}