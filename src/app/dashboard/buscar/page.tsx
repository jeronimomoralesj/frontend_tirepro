"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import Image from "next/image";

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk?: number;
  cpkProyectado?: number;
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
  primeraVida?: string[];
  kilometrosRecorridos: number;
  eventos?: { valor: string; fecha: string }[];
  tipovhc?: string;
  vida: { valor: string; fecha: string }[];
  companyId: string;
};

export type Vehicle = {
  id: string;
  placa: string;
  tipovhc?: string;
  carga: string;
};

const BuscarPage: React.FC = () => {
  const [searchMode, setSearchMode] = useState<"vehicle" | "tire">("vehicle");
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<Tire[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [showModal, setShowModal] = useState(false);

  const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = storedUser ? JSON.parse(storedUser) : null;
  const companyId = user?.companyId;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVehicle(null);
    setTires([]);
    setSelectedTire(null);
    if (!searchTerm.trim()) {
      setError("Por favor ingrese un valor para buscar");
      return;
    }
    if (!companyId) {
      setError("Información de la compañía no encontrada");
      return;
    }
    setLoading(true);
    try {
      if (searchMode === "vehicle") {
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
        const tiresRes = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${vehicleData.id}`
            : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${vehicleData.id}`
        );
        if (!tiresRes.ok) {
          throw new Error("Error al obtener los llantas");
        }
        const tiresData: Tire[] = await tiresRes.json();
        // Filter by companyId
        const validTires = tiresData.filter((t) => t.companyId === companyId);
        setTires(validTires);
      } else {
        const tiresRes = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires?companyId=${companyId}&placa=${encodeURIComponent(
                searchTerm.trim()
              )}`
            : `https://api.tirepro.com.co/api/tires?companyId=${companyId}&placa=${encodeURIComponent(
                searchTerm.trim()
              )}`
        );
        if (!tiresRes.ok) {
          throw new Error("Llanta no encontrada");
        }
        const tiresData: Tire[] = await tiresRes.json();
        setTires(tiresData);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado");
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

  // Calculate average tread depth from the latest inspection
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
    switch (status.toLowerCase()) {
      case "nueva":
        return { text: "Nueva", className: "bg-green-500 text-white" };
      case "reencauche1":
        return { text: "Primer Reencauche", className: "bg-blue-500 text-white" };
      case "reencauche2":
        return { text: "Segundo Reencauche", className: "bg-purple-500 text-white" };
      case "reencauche3":
        return { text: "Tercer Reencauche", className: "bg-indigo-500 text-white" };
      case "descarte":
        return { text: "Descartada", className: "bg-red-500 text-white" };
      default:
        return { text: status, className: "bg-gray-500 text-white" };
    }
  };

  const getCurrentVidaStatus = (tire: Tire) => {
    if (!tire.vida || tire.vida.length === 0) return "No Registrada";
    const currentStatus = tire.vida[tire.vida.length - 1].valor;
    return getVidaStatusLabel(currentStatus).text;
  };

  return (
    <div className="min-h-screen text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-10 border border-gray-100">
          <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white p-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Search className="w-6 h-6" />
              Buscar Llanta
            </h2>
            <p className="mt-2 text-gray-200">
              Busque por placa de vehículo o identificador de llanta
            </p>
          </div>
          <div className="p-8">
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modo de búsqueda
                  </label>
                  <div className="relative">
                    <select
                      value={searchMode}
                      onChange={(e) =>
                        setSearchMode(e.target.value as "vehicle" | "tire")
                      }
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg appearance-none text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent"
                    >
                      <option value="vehicle">Buscar por Placa de Vehículo</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {searchMode === "vehicle" ? "Placa de Vehículo" : "ID de Llanta"}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {searchMode === "vehicle" ? (
                          <Car className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={
                          searchMode === "vehicle"
                            ? "Ingrese la placa del vehículo"
                            : "Ingrese el id de la llanta"
                        }
                        value={searchTerm}
                        onChange={(e) =>
                          setSearchTerm(e.target.value.toLowerCase())
                        }
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-colors shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Search className="w-5 h-5" />
                      Buscar
                    </button>
                  </div>
                </div>
              </div>
            </form>
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-[#1E76B6] border-t-transparent rounded-full"></div>
                <p className="text-[#1E76B6] mt-3 font-medium">Cargando datos...</p>
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

        {/* We are now NOT displaying the Datos del Vehículo section */}

        {/* Tires List */}
        {tires.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-[#173D68] text-white p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Circle className="w-6 h-6" />
                {tires.length} {tires.length === 1 ? "Llanta Encontrada" : "Llantas Encontradas"}
              </h2>
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
                            Pos. {tire.posicion}
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
                            <span className="text-gray-600">Eje: {tire.eje}</span>
                          </div>
                          {tire.inspecciones && tire.inspecciones.length > 0 && (
                            <div className="flex items-center text-sm">
                              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                              <span className="text-gray-600">
                                Última inspección:{" "}
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
                          Ver Detalles
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

      {/* Modal Popup for Tire Details */}
      {showModal && selectedTire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto my-8">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Info className="w-6 h-6" />
                Detalles de la Llanta: {selectedTire.placa}
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
                  <p className="text-sm text-gray-600 font-medium">Marca</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.marca}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">Posición</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.posicion}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">Dimensión</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.dimension}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">Eje</p>
                  <p className="text-lg font-bold text-[#173D68]">{selectedTire.eje}</p>
                </div>
              </div>

              {/* Vida History */}
              {selectedTire.vida && selectedTire.vida.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-[#0A183A] pb-2 border-b border-gray-200 mb-4">
                    <span className="flex items-center gap-2">
                      <Repeat className="w-5 h-5" />
                      Historial de Vida
                    </span>
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">
                              Estado
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">
                              Fecha
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTire.vida.map((entry, idx) => {
                            const vidaStatus = getVidaStatusLabel(entry.valor);
                            return (
                              <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${vidaStatus.className}`}>
                                    {vidaStatus.text}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {new Date(entry.fecha).toLocaleDateString()}{" "}
                                  {new Date(entry.fecha).toLocaleTimeString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Information Tabs */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#0A183A] pb-2 border-b border-gray-200 mb-4">
                  Información Detallada
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-[#173D68] mb-3">Características</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Diseño:</p>
                        <p className="font-medium">{selectedTire.diseno}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Profundidad Inicial:</p>
                        <p className="font-medium">{selectedTire.profundidadInicial} mm</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Km Recorridos:</p>
                        <p className="font-medium">{selectedTire.kilometrosRecorridos.toLocaleString()} km</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Estado Actual:</p>
                        <p className="font-medium">{getCurrentVidaStatus(selectedTire)}</p>
                      </div>
                      {selectedTire.costo && selectedTire.costo.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Último Costo:</p>
                          <p className="font-medium">
                            ${selectedTire.costo[selectedTire.costo.length - 1].valor.toLocaleString()}{" "}
                            <span className="text-xs text-gray-500 ml-1">
                              (
                              {new Date(
                                selectedTire.costo[selectedTire.costo.length - 1].fecha
                              ).toLocaleDateString()}
                              )
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedTire.eventos && selectedTire.eventos.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-[#173D68] mb-3">Eventos Recientes</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <ul className="space-y-2">
                          {selectedTire.eventos.slice(0, 5).map((evento, index) => (
                            <li key={index} className="flex justify-between items-center">
                              <span className="text-gray-800">{evento.valor}</span>
                              <span className="text-sm text-gray-500">{new Date(evento.fecha).toLocaleDateString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Inspection Table - Sorted by most recent first */}
              {selectedTire.inspecciones && selectedTire.inspecciones.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-[#0A183A] pb-2 border-b border-gray-200 mb-4">
                    Historial de Inspecciones
                  </h3>
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Fecha</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Prof. Interior</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Prof. Central</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Prof. Exterior</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">CPK</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">CPK Proyectado</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Imagen</th>
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
                            <td className="px-4 py-3">
                              {insp.imageUrl ? (
                                <a href={insp.imageUrl} target="_blank" rel="noopener noreferrer">
                                  <Image
                                    src={insp.imageUrl}
                                    alt="Inspección"
                                    width={64}
                                    height={64}
                                    className="rounded-md shadow-sm border border-gray-200 object-cover hover:scale-105 transition-transform duration-200"
                                  />
                                </a>
                              ) : (
                                <span className="text-gray-400">No disponible</span>
                              )}
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
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: returns a Tailwind class and text for a given vida status
function getVidaStatusLabel(status: string): { text: string; className: string } {
  switch (status.toLowerCase()) {
    case "nueva":
      return { text: "Nueva", className: "bg-green-500 text-white" };
    case "reencauche1":
      return { text: "Primer Reencauche", className: "bg-blue-500 text-white" };
    case "reencauche2":
      return { text: "Segundo Reencauche", className: "bg-purple-500 text-white" };
    case "reencauche3":
      return { text: "Tercer Reencauche", className: "bg-indigo-500 text-white" };
    case "descarte":
      return { text: "Descartada", className: "bg-red-500 text-white" };
    default:
      return { text: status, className: "bg-gray-500 text-white" };
  }
}

// Helper: returns a Tailwind class for a given tread depth value
function getTreadStatusColor(depth: number): string {
  if (depth >= 6) return "bg-green-500";
  if (depth >= 3) return "bg-yellow-500";
  return "bg-red-500";
}

export default BuscarPage;
