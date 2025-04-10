"use client";

import React, { useState } from "react";
import { Search, X, AlertTriangle, ArrowLeft, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

// --- Types ---
export type VidaEntry = {
  fecha: string;
  valor: string;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  vida: VidaEntry[];
  posicion?: string | number;
};

export type Vehicle = {
  id: string;
  placa: string;
  tipovhc?: string;
  // ... any other vehicle fields
};

// --- Allowed values in order ---
const allowedVida = ["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"];

const VidaPage: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<Tire[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // For the modal update
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [selectedVida, setSelectedVida] = useState("");
  const [modalError, setModalError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // --- Search for a vehicle by plate, then load its tires ---
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVehicle(null);
    setTires([]);
    if (!searchTerm.trim()) {
      setError("Por favor ingrese la placa del vehículo");
      return;
    }
    setLoading(true);
    try {
      // Fetch vehicle by plate
      const vehicleRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/placa?placa=${encodeURIComponent(
              searchTerm.trim()
            )}`
          : `https://api.tirepro.com.co/api/vehicles/placa?placa=${encodeURIComponent(
              searchTerm.trim()
            )}`
      );
      if (!vehicleRes.ok) {
        throw new Error("Vehículo no encontrado");
      }
      const vehicleData: Vehicle = await vehicleRes.json();
      setVehicle(vehicleData);

      // Fetch tires for that vehicle
      const tiresRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${vehicleData.id}`
          : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${vehicleData.id}`
      );
      if (!tiresRes.ok) {
        throw new Error("Error al obtener los llantas");
      }
      const tiresData: Tire[] = await tiresRes.json();
      
      // Sort tires by posicion
      const sortedTires = [...tiresData].sort((a, b) => {
        // Handle both string and number positions
        const posA = a.posicion !== undefined ? Number(a.posicion) : Infinity;
        const posB = b.posicion !== undefined ? Number(b.posicion) : Infinity;
        
        // If any conversion resulted in NaN, put those items last
        const numA = isNaN(posA) ? Infinity : posA;
        const numB = isNaN(posB) ? Infinity : posB;
        
        return numA - numB;
      });
      
      setTires(sortedTires);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Error inesperado");
      } else {
        setError("Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  // --- Open Modal to update vida for a tire ---
  function openModal(tire: Tire) {
    setSelectedTire(tire);
    setModalError("");
    // If the tire has no vida data, assume current value is "nueva"
    let lastIndex = 0;
    if (tire.vida && tire.vida.length > 0) {
      const lastValue = tire.vida[tire.vida.length - 1].valor.toLowerCase();
      lastIndex = allowedVida.indexOf(lastValue);
      if (lastIndex === -1) {
        lastIndex = 0;
      }
    }
    let options: string[] = [];
    if (lastIndex === 0) {
      // From "nueva", allow only "reencauche1" and "fin"
      options = [allowedVida[1], allowedVida[allowedVida.length - 1]];
    } else if (lastIndex === 1) {
      // From "reencauche1", allow only "reencauche2" and "fin"
      options = [allowedVida[2], allowedVida[allowedVida.length - 1]];
    } else if (lastIndex === 2) {
      // From "reencauche2", allow only "reencauche3" and "fin"
      options = [allowedVida[3], allowedVida[allowedVida.length - 1]];
    } else if (lastIndex === 3) {
      // From "reencauche3", only "fin" remains.
      options = [allowedVida[4]];
    } else {
      options = [];
    }
    if (options.length === 0) {
      setModalError("No se pueden agregar más entradas. La vida ya está en 'fin'.");
      setSelectedVida("");
    } else {
      setSelectedVida(options[0]);
    }
    setShowModal(true);
  }

  // --- Close the modal ---
  function closeModal() {
    setShowModal(false);
    setSelectedTire(null);
    setSelectedVida("");
    setModalError("");
  }

  // --- Call backend to update vida ---
  async function handleUpdateVida() {
    if (!selectedTire) return;
    if (!selectedVida) {
      setModalError("Seleccione un valor válido.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/${selectedTire.id}/vida`
          : `https://api.tirepro.com.co/api/tires/${selectedTire.id}/vida`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ valor: selectedVida }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const updatedTire: Tire = await res.json();
      // Update tires state with the updated tire data, maintaining the sort order
      setTires((prev) => {
        const updated = prev.map((t) => (t.id === updatedTire.id ? updatedTire : t));
        return updated.sort((a, b) => {
          const posA = a.posicion !== undefined ? Number(a.posicion) : Infinity;
          const posB = b.posicion !== undefined ? Number(b.posicion) : Infinity;
          
          const numA = isNaN(posA) ? Infinity : posA;
          const numB = isNaN(posB) ? Infinity : posB;
          
          return numA - numB;
        });
      });
      setShowModal(false);
      setSelectedTire(null);
      setSelectedVida("");
    } catch (err) {
      if (err instanceof Error) {
        setModalError(err.message || "Error al actualizar vida");
      } else {
        setModalError("Error al actualizar vida");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-4 md:p-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <ArrowLeft 
              className="mr-4 cursor-pointer hover:text-[#348CCB] transition-colors" 
              onClick={() => router.back()}
            />
            Actualizar Vida 
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#0A183A] mb-4">Buscar Vehículo</h2>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ingrese la placa del vehículo"
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
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Buscar</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Vehicle Info */}
        {vehicle && (
          <div className="mb-6 p-4 md:p-6 bg-gradient-to-r from-[#173D68]/10 to-[#348CCB]/10 rounded-lg border-l-4 border-[#1E76B6] shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-[#0A183A]">Datos del Vehículo</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <p className="flex items-center">
                <span className="font-semibold text-[#173D68] mr-2">Placa:</span> 
                <span className="bg-[#1E76B6] text-white px-3 py-1 rounded-md">{vehicle.placa}</span>
              </p>
              {vehicle.tipovhc && (
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">Tipo:</span> 
                  {vehicle.tipovhc}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tires List */}
        {tires.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-[#0A183A] border-b border-gray-200 pb-2">
              Llantas Encontrados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tires.map((tire) => (
                <div
                  key={tire.id}
                  className="p-4 bg-white rounded-lg shadow-md border border-gray-200 hover:border-[#1E76B6] transition-all hover:shadow-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-[#0A183A]">Placa: {tire.placa}</p>
                    <div className="bg-[#173D68] text-white text-sm px-2 py-1 rounded">
                      Pos: {tire.posicion || "N/A"}
                    </div>
                  </div>
                  
                  <div className="mb-3 pb-3 border-b border-gray-100">
                    <p className="text-gray-700">
                      <span className="font-semibold text-[#173D68]">Marca:</span> {tire.marca}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold text-[#173D68]">ID:</span> {tire.id.substring(0, 6)}...
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold text-[#173D68]">Vida Actual:</span>{" "}
                      <span className="inline-block bg-[#348CCB]/20 text-[#0A183A] px-2 py-0.5 rounded font-medium">
                        {tire.vida && tire.vida.length > 0
                          ? tire.vida[tire.vida.length - 1].valor
                          : "Ninguna"}
                      </span>
                    </p>
                  </div>
                  
                  <button
                    onClick={() => openModal(tire)}
                    className="w-full mt-2 px-4 py-2 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-all flex items-center justify-center gap-2"
                  >
                    <Clock size={18} />
                    <span>Actualizar Vida</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal for updating vida */}
        {showModal && selectedTire && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                <h2 className="text-xl font-bold text-[#0A183A]">Actualizar Vida</h2>
                <button 
                  onClick={closeModal}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-[#0A183A]" />
                </button>
              </div>
              
              <div className="bg-[#173D68]/10 rounded-lg p-3 mb-4">
                <p className="text-sm text-[#173D68]">
                  <span className="font-semibold">Placa:</span> {selectedTire.placa}
                </p>
                <p className="text-sm text-[#173D68]">
                  <span className="font-semibold">Marca:</span> {selectedTire.marca}
                </p>
                <p className="text-sm text-[#173D68]">
                  <span className="font-semibold">Posición:</span> {selectedTire.posicion || "N/A"}
                </p>
                <p className="text-sm text-[#173D68]">
                  <span className="font-semibold">Último valor de vida:</span>{" "}
                  <span className="font-medium">
                    {selectedTire.vida && selectedTire.vida.length > 0
                      ? selectedTire.vida[selectedTire.vida.length - 1].valor
                      : "Ninguna"}
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
                  Seleccione nuevo valor
                </label>
                <select
                  value={selectedVida}
                  onChange={(e) => setSelectedVida(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all"
                >
                  {(() => {
                    let lastIndex = 0;
                    if (selectedTire.vida && selectedTire.vida.length > 0) {
                      const lastValue = selectedTire.vida[selectedTire.vida.length - 1].valor.toLowerCase();
                      const idx = allowedVida.indexOf(lastValue);
                      lastIndex = idx === -1 ? 0 : idx;
                    }
                    let options: string[] = [];
                    if (lastIndex === 0) {
                      // From "nueva", allow only "reencauche1" and "fin"
                      options = [allowedVida[1], allowedVida[allowedVida.length - 1]];
                    } else if (lastIndex === 1) {
                      // From "reencauche1", allow only "reencauche2" and "fin"
                      options = [allowedVida[2], allowedVida[allowedVida.length - 1]];
                    } else if (lastIndex === 2) {
                      // From "reencauche2", allow only "reencauche3" and "fin"
                      options = [allowedVida[3], allowedVida[allowedVida.length - 1]];
                    } else if (lastIndex === 3) {
                      // From "reencauche3", only "fin" remains.
                      options = [allowedVida[4]];
                    }
                    return options.map((option) => (
                      <option key={option} value={option}>
                        {option.toUpperCase()}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-[#0A183A] rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateVida}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#0A183A] text-white rounded-lg hover:bg-[#173D68] transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Clock className="animate-spin h-4 w-4" />
                      <span>Guardando...</span>
                    </>
                  ) : "Actualizar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VidaPage;