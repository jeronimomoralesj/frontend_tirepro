"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Car,
  X,
  Info,
  ChevronDown,
  Eye,
  Circle,
  BarChart3,
  Calendar,
  Ruler,
  Repeat,
  Trash2Icon,
  Building2,
} from "lucide-react";

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk?: number;
  cpkProyectado?: number;
  cpt?: number;
  cptProyectado?: number;
  imageUrl?: string;
  fecha: string;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  profundidadInicial: number;
  dimension: string;
  eje: string;
  costo: { valor: number; fecha: string }[];
  posicion: number;
  inspecciones?: Inspection[];
  primeraVida?: Array<{ cpk?: number }>;
  kilometrosRecorridos: number;
  eventos?: { valor: string; fecha: string }[];
  tipovhc?: string;
  vida: { valor: string; fecha: string }[];
  companyId: string;
  fechaInstalacion?: string;
  diasAcumulados?: number;
};

export type Vehicle = {
  id: string;
  placa: string;
  tipovhc?: string;
  carga: string;
  companyId: string;
};

interface Company {
  id: string;
  name: string;
}

// Language texts
const texts = {
  es: {
    searchTire: "Buscar Llanta",
    searchDescription: "Busque por cliente y placa de vehículo",
    selectClient: "Seleccionar Cliente",
    allClients: "Todos los Clientes",
    vehiclePlate: "Placa de Vehículo",
    enterPlate: "Ingrese la placa del vehículo",
    search: "Buscar",
    loading: "Cargando datos...",
    enterValue: "Por favor seleccione un cliente e ingrese una placa",
    pleaseSelectClient: "Por favor seleccione un cliente",
    companyNotFound: "No se encontraron clientes",
    vehicleNotFound: "Vehículo no encontrado en este cliente",
    tireNotFound: "No se encontraron llantas",
    errorTires: "Error al obtener las llantas",
    unexpectedError: "Error inesperado",
    tireFound: "Llanta Encontrada",
    tiresFound: "Llantas Encontradas",
    viewDetails: "Ver Detalles",
    tireDetails: "Detalles de la Llanta",
    brand: "Marca",
    position: "Posición",
    dimension: "Dimensión",
    axis: "Eje",
    lifeHistory: "Historial de Vida",
    lifePhases: "Fases de Vida",
    detailedInfo: "Información Detallada",
    characteristics: "Características",
    costAnalysis: "Análisis de costos",
    design: "Diseño",
    initialDepth: "Profundidad Inicial",
    kmTraveled: "Km Recorridos",
    currentStatus: "Estado Actual",
    projectedKm: "Kilometraje proyectado",
    lastCost: "Último Costo",
    recentEvents: "Eventos Recientes",
    inspectionHistory: "Historial de Inspecciones",
    date: "Fecha",
    innerDepth: "Prof. Interior",
    centerDepth: "Prof. Central",
    outerDepth: "Prof. Exterior",
    image: "Imagen",
    notAvailable: "No disponible",
    close: "Cerrar",
    deleteConfirm: "¿Estás seguro que quieres borrar esta inspección?",
    deleteError: "No se pudo eliminar la inspección",
    lastInspection: "Última inspección",
    new: "Nueva",
    retread1: "Primer Reencauche",
    retread2: "Segundo Reencauche",
    retread3: "Tercer Reencauche",
    discard: "Descartada",
    notRegistered: "No Registrada",
    cpk: "CPK",
    projectedCpk: "CPK Proyectado",
    client: "Cliente",
  }
};

const BuscarDist: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tires, setTires] = useState<Tire[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [language] = useState<'es'>('es');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const t = texts[language];

  // Fetch companies (clients) on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const res = await fetch(
        `https://api.tirepro.com.co/api/companies/me/clients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        console.error("Error fetching companies");
        return;
      }

      const data = await res.json();

      const companyList: Company[] = data.map((access: any) => ({
        id: access.company.id,
        name: access.company.name,
      }));

      setCompanies(companyList);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTires([]);
    setSelectedTire(null);

    if (!searchTerm.trim()) {
      setError(t.enterValue);
      return;
    }

    if (!selectedCompany || selectedCompany === t.allClients) {
      setError(t.pleaseSelectClient);
      return;
    }

    // Get the selected company ID
    const company = companies.find(c => c.name === selectedCompany);
    if (!company) {
      setError(t.companyNotFound);
      return;
    }

    setLoading(true);
    try {
      // Search for vehicle in the selected client's company
      const vehicleRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/placa?placa=${encodeURIComponent(
              searchTerm.trim()
            )}&companyId=${company.id}`
          : `https://api.tirepro.com.co/api/vehicles/placa?placa=${encodeURIComponent(
              searchTerm.trim()
            )}&companyId=${company.id}`
      );

      if (!vehicleRes.ok) {
        throw new Error(t.vehicleNotFound);
      }

      const vehicleData: Vehicle = await vehicleRes.json();

      // Get tires for that vehicle
      const tiresRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${vehicleData.id}`
          : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${vehicleData.id}`
      );

      if (!tiresRes.ok) {
        throw new Error(t.errorTires);
      }

      const tiresData: Tire[] = await tiresRes.json();
      const validTires = tiresData
        .filter((t) => t.companyId === company.id)
        .sort((a, b) => a.posicion - b.posicion);
      
      setTires(validTires);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.unexpectedError);
      }
    } finally {
      setLoading(false);
    }
  }

  const openModal = (tire: Tire) => {
    setSelectedTire(tire);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedTire(null);
    setShowModal(false);
  };

  const getProjectedKilometraje = (tire: Tire): string => {
    if (!tire.inspecciones || tire.inspecciones.length === 0) return "N/A";
    const latest = tire.inspecciones[tire.inspecciones.length - 1];
    const minProf = Math.min(
      latest.profundidadInt,
      latest.profundidadCen,
      latest.profundidadExt
    );
    const initial = tire.profundidadInicial;
    const usedDepth = initial - minProf;
    if (usedDepth <= 0) return "∞";
    const projected = (tire.kilometrosRecorridos / usedDepth) * initial;
    return Math.round(projected).toLocaleString();
  };

  const calculateAvgTreadDepth = (tire: Tire) => {
    if (!tire.inspecciones || tire.inspecciones.length === 0) return "N/A";
    const latestInspection = tire.inspecciones[tire.inspecciones.length - 1];
    const avg =
      (latestInspection.profundidadInt +
        latestInspection.profundidadCen +
        latestInspection.profundidadExt) /
      3;
    return avg.toFixed(1);
  };

  const getTreadStatusColor = (depth: number) => {
    if (depth >= 6) return "bg-green-500";
    if (depth >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getVidaStatusLabel = (status: string) => {
    const statusMap = {
      nueva: { text: t.new, className: "bg-green-500 text-white" },
      reencauche1: { text: t.retread1, className: "bg-blue-500 text-white" },
      reencauche2: { text: t.retread2, className: "bg-purple-500 text-white" },
      reencauche3: { text: t.retread3, className: "bg-indigo-500 text-white" },
      descarte: { text: t.discard, className: "bg-red-500 text-white" },
    };
    return statusMap[status.toLowerCase() as keyof typeof statusMap] || 
           { text: status, className: "bg-gray-500 text-white" };
  };

  const getCurrentVidaStatus = (tire: Tire) => {
    if (!tire.vida || tire.vida.length === 0) return t.notRegistered;
    const currentStatus = tire.vida[tire.vida.length - 1].valor;
    return getVidaStatusLabel(currentStatus).text;
  };

  const handleDeleteInspection = async (fecha: string) => {
    if (!selectedTire) return;
    if (!window.confirm(t.deleteConfirm)) return;
    
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.tirepro.com.co'}/api/tires/${selectedTire.id}/inspection?fecha=${encodeURIComponent(fecha)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Error al eliminar");
      const updatedInsps = (selectedTire.inspecciones || [])
        .filter(i => i.fecha !== fecha);
      const updatedTire = { ...selectedTire, inspecciones: updatedInsps };
      setSelectedTire(updatedTire);
      setTires(ts => ts.map(t => t.id === updatedTire.id ? updatedTire : t));
    } catch (err) {
      console.error(err);
      alert(t.deleteError);
    }
  };

  const companyOptions = [t.allClients, ...companies.map(c => c.name)];

  return (
    <div className="min-h-screen text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-10 border border-gray-100">
          <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white p-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Search className="w-6 h-6" />
              {t.searchTire}
            </h2>
            <p className="mt-2 text-gray-200">
              {t.searchDescription}
            </p>
          </div>
          <div className="p-8 z-99999">
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 z-99999">
                {/* Client Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 z-99999">
                    {t.selectClient}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <span>{selectedCompany || t.allClients}</span>
                      </div>
                      <ChevronDown className="text-gray-500" />
                    </button>
                    {showCompanyDropdown && (
                        <div className="absolute left-0 right-0 z-[100] mt-1 w-full bg-white rounded-lg shadow-2xl py-2 max-h-60 overflow-y-auto border border-gray-200">                        {companyOptions.map((company) => (
                          <button
                            key={company}
                            type="button"
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                              selectedCompany === company ? "bg-blue-50 text-blue-700 font-medium" : ""
                            }`}
                            onClick={() => {
                              setSelectedCompany(company);
                              setShowCompanyDropdown(false);
                            }}
                          >
                            {company}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Plate Input */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.vehiclePlate}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Car className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder={t.enterPlate}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-colors shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Search className="w-5 h-5" />
                      {t.search}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-[#1E76B6] border-t-transparent rounded-full"></div>
                <p className="text-[#1E76B6] mt-3 font-medium">{t.loading}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                <div className="flex">
                  <X className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tires List */}
        {tires.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-[#173D68] text-white p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Circle className="w-6 h-6" />
                {tires.length} {tires.length === 1 ? t.tireFound : t.tiresFound}
              </h2>
              <p className="text-sm text-gray-200 mt-1">
                {t.client}: {selectedCompany}
              </p>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tires.map((tire) => {
                  const avgDepth = parseFloat(calculateAvgTreadDepth(tire));
                  const statusColor = !isNaN(avgDepth)
                    ? getTreadStatusColor(avgDepth)
                    : "bg-gray-300";
                  return (
                    <div
                      key={tire.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1E76B6] text-white">
                            {t.position}. {tire.posicion}
                          </span>
                          {!isNaN(avgDepth) && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${statusColor}`}>
                              {avgDepth} mm
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-[#0A183A] mb-1">{tire.placa}</h3>
                        <p className="text-gray-600 mb-4">{tire.marca} {tire.diseno}</p>
                        {tire.vida && tire.vida.length > 0 && (
                          <div className="mb-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVidaStatusLabel(tire.vida[tire.vida.length - 1].valor).className}`}>
                              {getVidaStatusLabel(tire.vida[tire.vida.length - 1].valor).text}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center text-sm">
                            <Ruler className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="text-gray-600">{tire.dimension}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="text-gray-600">{t.axis}: {tire.eje}</span>
                          </div>
                          {tire.inspecciones && tire.inspecciones.length > 0 && (
                            <div className="flex items-center text-sm">
                              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                              <span className="text-gray-600">
                                {t.lastInspection}:{" "}
                                {new Date(tire.inspecciones[tire.inspecciones.length - 1].fecha).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => openModal(tire)}
                          className="w-full px-4 py-2 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {t.viewDetails}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedTire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto my-8">
            <div className="sticky top-0 z-50 bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Info className="w-6 h-6" />
                {t.tireDetails}: {selectedTire.placa}
              </h2>
              <button
                onClick={closeModal}
                className="text-white hover:text-[#348CCB] transition-colors rounded-full p-1 hover:bg-white hover:bg-opacity-10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 sm:p-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">{t.brand}</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.marca}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">{t.position}</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.posicion}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">{t.dimension}</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.dimension}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">{t.axis}</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.eje}</p>
                </div>
              </div>

              {/* Life History */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#0A183A] pb-2 border-b border-gray-200 mb-4">
                  <span className="flex items-center gap-2">
                    <Repeat className="w-5 h-5" />
                    {t.lifeHistory}
                  </span>
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-[#173D68] mb-3">{t.lifePhases}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {selectedTire.vida.map((entry, index) => {
                        const label = getVidaStatusLabel(entry.valor);
                        const formattedDate = new Date(entry.fecha).toLocaleDateString();
                        const isNueva = entry.valor?.toLowerCase?.() === "nueva";
                        const cpk = isNueva && selectedTire.primeraVida?.[0]?.cpk
                          ? selectedTire.primeraVida[0].cpk.toFixed(2)
                          : null;

                        return (
                          <div key={index} className="border-b pb-2 last:border-b-0">
                            <p className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-1 ${label.className}`}>
                              {label.text}
                              {cpk && (
                                <span className="ml-2 text-gray-100 font-normal">
                                  · CPK: {cpk}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{formattedDate}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Info */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#0A183A] pb-2 border-b border-gray-200 mb-4">
                  {t.detailedInfo}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-[#173D68] mb-3">{t.characteristics}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t.design}:</p>
                        <p className="font-medium">{selectedTire.diseno}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t.initialDepth}:</p>
                        <p className="font-medium">{selectedTire.profundidadInicial} mm</p>
                      </div>
                      {selectedTire.fechaInstalacion && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Fecha instalación:</p>
                          <p className="font-medium">{selectedTire.fechaInstalacion}</p>
                        </div>
                      )}
                      {selectedTire.diasAcumulados && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Días rodando:</p>
                          <p className="font-medium">{selectedTire.diasAcumulados}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t.kmTraveled}:</p>
                        <p className="font-medium">{selectedTire.kilometrosRecorridos.toLocaleString()} Km</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t.currentStatus}:</p>
                        <p className="font-medium">{getCurrentVidaStatus(selectedTire)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t.projectedKm}:</p>
                        <p className="font-medium">{getProjectedKilometraje(selectedTire)} Km</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-[#173D68] mb-3">{t.costAnalysis}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {selectedTire?.costo?.length > 0 ? (
                        selectedTire.costo.map((entry, idx) => {
                          const formattedDate = new Date(entry.fecha).toLocaleString(language, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          });

                          return (
                            <div key={idx}>
                              <p className="text-sm font-medium text-gray-500">Fecha: {formattedDate}</p>
                              <p className="font-medium">Valor: ${entry.valor.toLocaleString()}</p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">{t.notAvailable}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspection Table */}
              {selectedTire.inspecciones && selectedTire.inspecciones.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-[#0A183A] pb-2 border-b border-gray-200 mb-4">
                    {t.inspectionHistory}
                  </h3>
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">{t.date}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">{t.innerDepth}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">{t.centerDepth}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">{t.outerDepth}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">{t.cpk}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">{t.projectedCpk}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">CPT</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">CPT Proyectada</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">{t.image}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedTire.inspecciones]
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .map((insp, idx) => (
                            <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">{new Date(insp.fecha).toLocaleDateString()}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getTreadStatusColor(insp.profundidadInt)}`}>
                                  {insp.profundidadInt} mm
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getTreadStatusColor(insp.profundidadCen)}`}>
                                  {insp.profundidadCen} mm
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getTreadStatusColor(insp.profundidadExt)}`}>
                                  {insp.profundidadExt} mm
                                </span>
                              </td>
                              <td className="px-4 py-3">{insp.cpk ?? "N/A"}</td>
                              <td className="px-4 py-3">{insp.cpkProyectado ?? "N/A"}</td>
                              <td className="px-4 py-3">{insp.cpt ?? "N/A"}</td>
                              <td className="px-4 py-3">{insp.cptProyectado ?? "N/A"}</td>
                              <td className="px-4 py-3">
                                {insp.imageUrl ? (
                                  <a href={insp.imageUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={insp.imageUrl}
                                      alt="Inspección"
                                      className="rounded-md shadow-sm border border-gray-200 object-cover hover:scale-105 transition-transform duration-200"
                                      style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 4,
                                        objectFit: 'cover',
                                      }}
                                    />
                                  </a>
                                ) : (
                                  <span className="text-gray-400">No disponible</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  title="Eliminar inspección"
                                  onClick={() => handleDeleteInspection(insp.fecha)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <Trash2Icon className="w-4 h-4"/>
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuscarDist;