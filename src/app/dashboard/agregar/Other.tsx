"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, AlertTriangle, Eye, Clock, CheckCircle } from "lucide-react";

export type Vehicle = {
  id: string;
  placa: string;
  tipovhc?: string;
};

export type EventoEntry = {
  valor: string;
  fecha: string;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion?: string;
  eventos?: EventoEntry[];
  vida?: { valor: string; fecha: string }[];
};

// Language translations
const translations = {
  es: {
    title: "Agrega un Eventos Personalizado",
    searchVehicle: "Buscar Vehículo",
    enterPlate: "Ingrese la placa del vehículo",
    searching: "Buscando...",
    search: "Buscar",
    vehicleNotFound: "Vehículo no encontrado",
    errorGettingTires: "Error al obtener los neumáticos",
    enterPlateError: "Por favor ingrese la placa del vehículo",
    vehicleData: "Datos del Vehículo",
    plate: "Placa:",
    type: "Tipo:",
    tiresFound: "Neumáticos Encontrados",
    brand: "Marca:",
    position: "Posición:",
    currentLife: "Vida Actual:",
    none: "Ninguna",
    lastEvent: "Último evento:",
    addEvent: "Agregar Evento",
    eventDetail: "Detalle del evento",
    describe: "Describa el evento...",
    cancel: "Cancelar",
    saving: "Guardando...",
    eventAddedSuccess: "Evento agregado exitosamente",
    enterEventText: "Ingrese el texto del evento",
    lifeState: "Estado de vida:"
  },
};

const EventosPage: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState([]);
  const [filteredTires, setFilteredTires] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gastoTotal, setGastoTotal] = useState(0);
  const [gastoMes, setGastoMes] = useState(0);
  const [userName, setUserName] = useState("");
  const [cpkPromedio, setCpkPromedio] = useState(0);
  const [cpkProyectado, setCpkProyectado] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const contentRef = useRef(null);

  // Language detection
  const [language, setLanguage] = useState<'es'>('es');

  // Modal states
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [newEventText, setNewEventText] = useState("");
  const [modalError, setModalError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = 'es';
      if (saved) {
        setLanguage(saved);
        return;
      }
    };
    
    detectAndSetLanguage();
  }, []);

  const t = translations[language];

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVehicle(null);
    setTires([]);
    setSuccessMessage("");
    
    if (!searchTerm.trim()) {
      setError(t.enterPlateError);
      return;
    }
    
    setLoading(true);
    try {
      const vehicleRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/placa?placa=${encodeURIComponent(searchTerm.trim())}`
          : `https://api.tirepro.com.co/api/vehicles/placa?placa=${encodeURIComponent(searchTerm.trim())}`
      );
      
      if (!vehicleRes.ok) {
        throw new Error(t.vehicleNotFound);
      }
      
      const vehicleData: Vehicle = await vehicleRes.json();
      setVehicle(vehicleData);

      const tiresRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${vehicleData.id}`
          : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${vehicleData.id}`
      );
      
      if (!tiresRes.ok) {
        throw new Error(t.errorGettingTires);
      }
      
      const tiresData: Tire[] = await tiresRes.json();
      setTires(tiresData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  function openModal(tire: Tire) {
    setSelectedTire(tire);
    setNewEventText("");
    setModalError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedTire(null);
    setNewEventText("");
    setModalError("");
  }

  async function handleAddEvent() {
    if (!newEventText.trim()) {
      setModalError(t.enterEventText);
      return;
    }
    if (!selectedTire) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/${selectedTire.id}/eventos`
          : `https://api.tirepro.com.co/api/tires/${selectedTire.id}/eventos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ valor: newEventText.trim() }),
        }
      );
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      
      const updatedTire: Tire = await res.json();
      setTires((prevTires) =>
        prevTires.map((t) => (t.id === updatedTire.id ? updatedTire : t))
      );
      
      setSuccessMessage(t.eventAddedSuccess);
      setTimeout(() => setSuccessMessage(""), 5000);
      closeModal();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError("Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  // Suppress warnings for unused variables that might be needed later
  void router;
  void vehicles;
  void filteredTires;
  void gastoTotal;
  void gastoMes;
  void userName;
  void cpkPromedio;
  void cpkProyectado;
  void exporting;
  void contentRef;
  void setVehicles;
  void setFilteredTires;
  void setGastoTotal;
  void setGastoMes;
  void setUserName;
  void setCpkPromedio;
  void setCpkProyectado;
  void setExporting;

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#0A183A] mb-4">{t.searchVehicle}</h2>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t.enterPlate}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
            >
              {loading ? (
                <>
                  <Clock className="animate-spin h-5 w-5" />
                  <span>{t.searching}</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>{t.search}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {vehicle && (
          <div className="mb-6 p-4 md:p-6 bg-gradient-to-r from-[#173D68]/10 to-[#348CCB]/10 rounded-lg border-l-4 border-[#1E76B6] shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-[#0A183A]">{t.vehicleData}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <p className="flex items-center">
                <span className="font-semibold text-[#173D68] mr-2">{t.plate}</span> 
                <span className="bg-[#1E76B6] text-white px-3 py-1 rounded-md">{vehicle.placa}</span>
              </p>
              {vehicle.tipovhc && (
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">{t.type}</span> 
                  {vehicle.tipovhc}
                </p>
              )}
            </div>
          </div>
        )}

        {tires.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-[#0A183A] border-b border-gray-200 pb-2">
              {t.tiresFound}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tires.map((tire) => (
                <div
                  key={tire.id}
                  className="p-4 bg-white rounded-lg shadow-md border border-gray-200 hover:border-[#1E76B6] transition-all hover:shadow-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-[#0A183A]">{t.plate} {tire.placa}</p>
                    <div className="bg-[#173D68] text-white text-sm px-2 py-1 rounded">
                      ID: {tire.id.substring(0, 6)}...
                    </div>
                  </div>
                  
                  <div className="mb-3 pb-3 border-b border-gray-100">
                    <p className="text-gray-700">
                      <span className="font-semibold text-[#173D68]">{t.brand}</span> {tire.marca}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold text-[#173D68]">{t.position}</span> {tire.posicion}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold text-[#173D68]">{t.currentLife}</span>{" "}
                      <span className="inline-block bg-[#348CCB]/20 text-[#0A183A] px-2 py-0.5 rounded font-medium">
                        {tire.vida && tire.vida.length > 0
                          ? tire.vida[tire.vida.length - 1].valor
                          : t.none}
                      </span>
                    </p>
                  </div>
                  
                  {tire.eventos && tire.eventos.length > 0 && (
                    <div className="mb-3">
                      <p className="font-semibold text-[#173D68] mb-1">{t.lastEvent}</p>
                      <div className="bg-gray-50 rounded p-2 text-sm">
                        <p className="text-gray-500 text-xs mb-1">
                          {new Date(tire.eventos[tire.eventos.length - 1].fecha).toLocaleDateString()}
                        </p>
                        <p className="text-[#0A183A]">{tire.eventos[tire.eventos.length - 1].valor}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => openModal(tire)}
                    className="w-full mt-2 px-4 py-2 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-all flex items-center justify-center gap-2"
                  >
                    <Eye size={18} />
                    <span>{t.addEvent}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showModal && selectedTire && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                <h2 className="text-xl font-bold text-[#0A183A]">{t.addEvent}</h2>
                <button 
                  onClick={closeModal}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-[#0A183A]" />
                </button>
              </div>
              
              <div className="bg-[#173D68]/10 rounded-lg p-3 mb-4">
                <p className="text-sm text-[#173D68]">
                  <span className="font-semibold">{t.plate}</span> {selectedTire.placa}
                </p>
                <p className="text-sm text-[#173D68]">
                  <span className="font-semibold">{t.brand}</span> {selectedTire.marca}
                </p>
                <p className="text-sm text-[#173D68]">
                  <span className="font-semibold">{t.lifeState}</span>{" "}
                  <span className="font-medium">
                    {selectedTire.vida && selectedTire.vida.length > 0
                      ? selectedTire.vida[selectedTire.vida.length - 1].valor
                      : t.none}
                  </span>
                </p>
              </div>
              
              {modalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {modalError}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#0A183A] mb-2">
                  {t.eventDetail}
                </label>
                <textarea
                  value={newEventText}
                  onChange={(e) => setNewEventText(e.target.value)}
                  placeholder={t.describe}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all min-h-24"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-[#0A183A] rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#0A183A] text-white rounded-lg hover:bg-[#173D68] transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Clock className="animate-spin h-4 w-4" />
                      <span>{t.saving}</span>
                    </>
                  ) : t.addEvent}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventosPage;