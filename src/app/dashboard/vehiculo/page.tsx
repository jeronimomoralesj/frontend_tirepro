
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Database, Trash2, X, Truck, Link2 } from "lucide-react";

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  carga: string;
  pesoCarga: number;
  tipovhc: string;
  companyId: string;
  tireCount: number;
  union: string[];
  cliente: string | null;
};

// Translations
const translations = {
  es: {
    title: "Gestión de Vehículos",
    addVehicle: "Añadir Vehículo",
    vehicleList: "Lista de Vehículos",
    noVehicles: "No se encontraron vehículos.",
    connectedVehicles: "Vehículos Conectados",
    individualVehicles: "Vehículos Individuales",
    createVehicle: "Crear Vehículo",
    placa: "Placa",
    kilometraje: "Kilometraje",
    carga: "Carga",
    peso: "Peso",
    llantas: "Llantas",
    dueno: "Dueño",
    uniones: "Uniones",
    ninguna: "Ninguna",
    unir: "Unir",
    eliminar: "Eliminar",
    placaOtroVehiculo: "Placa del otro vehiculo",
    kilometrajeActual: "Kilometraje Actual",
    pesoCarga: "Peso de Carga (kg)",
    tipoVehiculo: "Tipo de Vehículo",
    duenoOpcional: "Dueño (opcional)",
    nombreCliente: "Nombre del cliente",
    cancelar: "Cancelar",
    crear: "Crear",
    eliminarVehiculo: "¿Eliminar {placa}?",
    eliminarConexion: "¿Eliminar conexión?",
    eliminarConexionConfirm: "¿Está seguro que desea eliminar esta conexión entre vehículos?",
    eliminarConexionBtn: "Eliminar Conexión",
    sinPlaca: "SIN PLACA",
    sinTipo: "Sin tipo",
    errorCompanyId: "No companyId found on user",
    errorParsingUser: "Error parsing user data",
    errorFetchVehicles: "Failed to fetch vehicles",
    errorCreateVehicle: "Failed to create vehicle",
    errorDeleteVehicle: "Failed to delete vehicle",
    errorAddUnion: "Fallo al añadir unión",
    errorRemoveUnion: "Fallo al eliminar unión",
    alertPlacaUnion: "Ingrese placa para unir",
    vehicleTypes: {
      "2_ejes": "Trailer 2 ejes",
      "2_ejes_cabezote": "Cabezote 2 ejes",
      "3_ejes": "Trailer 3 ejes",
      "3_ejes_cabezote": "Cabezote 3 ejes"
    }
  },
  en: {
    title: "Vehicle Management",
    addVehicle: "Add Vehicle",
    vehicleList: "Vehicle List",
    noVehicles: "No vehicles found.",
    connectedVehicles: "Connected Vehicles",
    individualVehicles: "Individual Vehicles",
    createVehicle: "Create Vehicle",
    placa: "License Plate",
    kilometraje: "Mileage",
    carga: "Load",
    peso: "Weight",
    llantas: "Tires",
    dueno: "Owner",
    uniones: "Connections",
    ninguna: "None",
    unir: "Connect",
    eliminar: "Delete",
    placaOtroVehiculo: "Other vehicle's plate",
    kilometrajeActual: "Current Mileage",
    pesoCarga: "Load Weight (kg)",
    tipoVehiculo: "Vehicle Type",
    duenoOpcional: "Owner (optional)",
    nombreCliente: "Client name",
    cancelar: "Cancel",
    crear: "Create",
    eliminarVehiculo: "Delete {placa}?",
    eliminarConexion: "Delete connection?",
    eliminarConexionConfirm: "Are you sure you want to delete this connection between vehicles?",
    eliminarConexionBtn: "Delete Connection",
    sinPlaca: "NO PLATE",
    sinTipo: "No type",
    errorCompanyId: "No companyId found on user",
    errorParsingUser: "Error parsing user data",
    errorFetchVehicles: "Failed to fetch vehicles",
    errorCreateVehicle: "Failed to create vehicle",
    errorDeleteVehicle: "Failed to delete vehicle",
    errorAddUnion: "Failed to add connection",
    errorRemoveUnion: "Failed to remove connection",
    alertPlacaUnion: "Enter plate to connect",
    vehicleTypes: {
      "2_ejes": "2-axle Trailer",
      "2_ejes_cabezote": "2-axle Truck",
      "3_ejes": "3-axle Trailer",
      "3_ejes_cabezote": "3-axle Truck"
    }
  }
};

export default function VehiculoPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [language, setLanguage] = useState<'en'|'es'>('es');

  // State for delete confirmation modal
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  
  // State for union deletion
  const [unionToDelete, setUnionToDelete] = useState<{
    sourceId: string;
    targetPlaca: string;
  } | null>(null);

  // Form state for creating a vehicle
  const [placa, setPlaca] = useState("");
  const [kilometrajeActual, setKilometrajeActual] = useState<number>(0);
  const [carga, setCarga] = useState("");
  const [pesoCarga, setPesoCarga] = useState<number>(0);
  const [tipovhc, setTipovhc] = useState("2_ejes");
  const [cliente, setCliente] = useState("");

  // Union placa inputs per vehicle
  const [plateInputs, setPlateInputs] = useState<{ [vehicleId: string]: string }>({});
  
  // Flag to show/hide union inputs
  const [showUnionInput, setShowUnionInput] = useState<{ [key: string]: boolean }>({});

  // Retrieve the companyId from stored user data
  const [companyId, setCompanyId] = useState<string>("");

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") 
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

  const t = translations[language];
  
  // Language detection
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
      } catch {}
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };
    detectAndSetLanguage();
  }, []);

  // Organize vehicles by their connections
  const organizedVehicles = useMemo(() => {
    const processed = new Set<string>();
    const groups: Vehicle[][] = [];
    
    vehicles.forEach(vehicle => {
      if (processed.has(vehicle.id)) return;
      
      const group: Vehicle[] = [vehicle];
      processed.add(vehicle.id);
      
      if (vehicle.union && Array.isArray(vehicle.union) && vehicle.union.length > 0) {
        vehicle.union.forEach(connectedPlaca => {
          const connectedVehicle = vehicles.find(v => v.placa === connectedPlaca);
          if (connectedVehicle && !processed.has(connectedVehicle.id)) {
            group.push(connectedVehicle);
            processed.add(connectedVehicle.id);
          }
        });
      }
      
      groups.push(group);
    });
    
    return groups;
  }, [vehicles]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.companyId) {
          setCompanyId(user.companyId);
          fetchVehicles(user.companyId);
        } else {
          setError(t.errorCompanyId);
        }
      } catch {
        setError(t.errorParsingUser);
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router, t]);

async function fetchVehicles(companyId: string) {
  setLoadingVehicles(true);
  setError("");
  try {
    const res = await fetch(`${API_BASE}/vehicles?companyId=${companyId}`);
    if (!res.ok) throw new Error(t.errorFetchVehicles);
    
    const data = await res.json();
    const safeData = data.map(vehicle => ({
      ...vehicle,
      union: Array.isArray(vehicle.union) ? vehicle.union : [],
    }));
    
    setVehicles(safeData);
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Unexpected error");
  } finally {
    setLoadingVehicles(false);
  }
}

async function handleCreateVehicle(e: FormEvent) {
  e.preventDefault();
  setError("");
  
  try {
    const res = await fetch(`${API_BASE}/vehicles/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placa,
        kilometrajeActual,
        carga,
        pesoCarga,
        tipovhc,
        companyId,
        cliente: cliente.trim() || null  
      }),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || t.errorCreateVehicle);
    }
    
    const responseData = await res.json();
    const newVehicle = responseData.vehicle;
    
    const safeVehicle = {
      ...newVehicle,
      union: Array.isArray(newVehicle.union) ? newVehicle.union : [],
    };
    
    setVehicles((prev) => [...prev, safeVehicle]);
    
    // reset form
    setPlaca("");
    setKilometrajeActual(0);
    setCarga("");
    setPesoCarga(0);
    setTipovhc("2_ejes");
    setCliente("");
    setIsFormOpen(false);
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Unexpected error");
  }
}

  async function handleDeleteVehicle(vehicleId: string) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t.errorDeleteVehicle);
      }
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  async function addUnion(vehicleId: string) {
    const placaUnion = plateInputs[vehicleId]?.trim();
    if (!placaUnion) return alert(t.alertPlacaUnion);
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/union/add`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaUnion }),
      });
      if (!res.ok) throw new Error(t.errorAddUnion);
      const { vehicle: updated } = await res.json();
      const safeVehicle = {
        ...updated,
        union: updated.union || []
      };
      setVehicles((vs) =>
        vs.map((v) => (v.id === safeVehicle.id ? safeVehicle : v))
      );
      setPlateInputs((prev) => ({ ...prev, [vehicleId]: "" }));
      setShowUnionInput((prev) => ({ ...prev, [vehicleId]: false }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function removeUnion(vehicleId: string, placaToRemove: string) {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/union/remove`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaToRemove }),
      });
      if (!res.ok) throw new Error(t.errorRemoveUnion);
      const { vehicle: updated } = await res.json();
      const safeVehicle = {
        ...updated,
        union: updated.union || []
      };
      setVehicles((vs) =>
        vs.map((v) => (v.id === safeVehicle.id ? safeVehicle : v))
      );
      setUnionToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  function toggleUnionInput(vehicleId: string) {
    setShowUnionInput(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
    
    if (!plateInputs[vehicleId]) {
      setPlateInputs(prev => ({
        ...prev,
        [vehicleId]: ""
      }));
    }
  }

  function handlePlateInputChange(vehicleId: string, value: string) {
    setPlateInputs(prev => ({
      ...prev,
      [vehicleId]: value
    }));
  }

const VehicleCard = ({ vehicle, isConnected = false, connectionIndex = 0, onRemoveConnection = null }) => (
  <div 
    className="relative border border-[#348CCB]/20 rounded-lg shadow-md p-4 flex flex-col justify-between bg-white max-w-xs w-full sm:w-72"
    style={{ zIndex: 5 }}
  >
    {isConnected && connectionIndex > 0 && onRemoveConnection && (
      <div 
        className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 w-4 md:w-6 h-1 bg-[#1E76B6] cursor-pointer hover:bg-[#0A183A]"
        onClick={onRemoveConnection}
      />
    )}
    
    <div className="space-y-2">
      <div className="flex justify-between items-center border-b pb-2">
        <span className="font-bold text-[#173D68]">{vehicle.placa?.toUpperCase() || t.sinPlaca}</span>
        <span className="bg-[#1E76B6]/10 text-[#1E76B6] px-2 py-1 rounded text-xs">
          {t.vehicleTypes[vehicle.tipovhc] || t.sinTipo}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
        <span>{t.kilometraje}:</span>
        <span className="text-right">{vehicle.kilometrajeActual || 0} km</span>
        <span>{t.carga}:</span>
        <span className="text-right">{vehicle.carga || "N/A"}</span>
        <span>{t.peso}:</span>
        <span className="text-right">{vehicle.pesoCarga || 0} kg</span>
        <span>{t.llantas}:</span>
        <span className="text-right">{vehicle.tireCount || 0}</span>
        <span>{t.dueno}:</span>
        <span className="text-right">
          {vehicle.cliente ? vehicle.cliente : "—"}
        </span>
        <span>{t.uniones}:</span>
        <span className="text-right">
          {vehicle.union && Array.isArray(vehicle.union) && vehicle.union.length > 0 
            ? vehicle.union.join(", ") 
            : t.ninguna}
        </span>
      </div>
    </div>

    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => toggleUnionInput(vehicle.id)}
          className="flex-1 bg-[#1E76B6]/10 text-[#1E76B6] px-3 py-2 rounded hover:bg-[#1E76B6]/20 flex items-center justify-center"
        >
          <Link2 className="w-4 h-4 mr-2" />
          {t.unir}
        </button>
        <button
          onClick={() => setVehicleToDelete(vehicle)}
          className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t.eliminar}
        </button>
      </div>

      {showUnionInput[vehicle.id] && (
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder={t.placaOtroVehiculo}
            value={plateInputs[vehicle.id] || ""}
            onChange={(e) => handlePlateInputChange(vehicle.id, e.target.value)}
            className="flex-1 px-2 py-1 border rounded-md"
          />
          <button
            onClick={() => addUnion(vehicle.id)}
            className="px-2 bg-[#1E76B6] text-white rounded hover:bg-[#173D68]"
          >
            ➕
          </button>
        </div>
      )}
    </div>
  </div>
);

  return (
    <div className="min-h-screen text-[#0A183A] antialiased bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="bg-[#1E76B6] text-white px-4 py-2 rounded-lg hover:bg-[#348CCB] flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t.addVehicle}
          </button>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <section className="bg-white shadow-lg rounded-lg border border-[#348CCB]/20">
          <div className="px-4 py-4 bg-[#173D68] text-white flex items-center rounded-t-lg">
            <Database className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-semibold">{t.vehicleList}</h2>
          </div>

          {loadingVehicles ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E76B6]"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Truck className="mx-auto h-12 w-12 text-[#348CCB]/50 mb-3" />
              <p>{t.noVehicles}</p>
            </div>
          ) : (
            <div className="p-4 space-y-8">
              {organizedVehicles.filter(group => group.length > 1).map((group, groupIndex) => (
                <div key={`connected-group-${groupIndex}`} className="mb-8">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">{t.connectedVehicles}</h3>
                  <div className="flex flex-row flex-nowrap overflow-x-auto pb-4">
                    {group.map((vehicle, vehicleIndex) => (
                      <div 
                        key={vehicle.id}
                        className={`${vehicleIndex > 0 ? 'ml-8' : ''} flex-shrink-0`}
                      >
                        <VehicleCard 
                          vehicle={vehicle} 
                          isConnected={true}
                          connectionIndex={vehicleIndex}
                          onRemoveConnection={vehicleIndex > 0 ? () => {
                            const currentVehicle = vehicle;
                            const previousVehicle = group[vehicleIndex - 1];
                            
                            if (previousVehicle.union && Array.isArray(previousVehicle.union) && 
                                previousVehicle.union.includes(currentVehicle.placa)) {
                              setUnionToDelete({
                                sourceId: previousVehicle.id,
                                targetPlaca: currentVehicle.placa
                              });
                            } else if (currentVehicle.union && Array.isArray(currentVehicle.union) && 
                                      currentVehicle.union.includes(previousVehicle.placa)) {
                              setUnionToDelete({
                                sourceId: currentVehicle.id,
                                targetPlaca: previousVehicle.placa
                              });
                            }
                          } : null}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {organizedVehicles.filter(group => group.length === 1).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">{t.individualVehicles}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {organizedVehicles
                      .filter(group => group.length === 1)
                      .map((group) => (
                        <VehicleCard key={`single-${group[0].id}`} vehicle={group[0]} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
              <div className="bg-[#173D68] text-white p-4 flex justify-between items-center rounded-t-lg">
                <h2>{t.createVehicle}</h2>
                <button onClick={() => setIsFormOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateVehicle} className="p-4 space-y-4">
                <div>
                  <label className="block mb-1">{t.placa}</label>
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.kilometrajeActual}</label>
                  <input
                    type="number"
                    value={kilometrajeActual}
                    onChange={(e) => setKilometrajeActual(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.carga}</label>
                  <input
                    type="text"
                    value={carga}
                    onChange={(e) => setCarga(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.pesoCarga}</label>
                  <input
                    type="number"
                    value={pesoCarga}
                    onChange={(e) => setPesoCarga(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.tipoVehiculo}</label>
                  <select
                    value={tipovhc}
                    onChange={(e) => setTipovhc(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="2_ejes">{t.vehicleTypes["2_ejes"]}</option>
                    <option value="2_ejes_cabezote">{t.vehicleTypes["2_ejes_cabezote"]}</option>
                    <option value="3_ejes">{t.vehicleTypes["3_ejes"]}</option>
                    <option value="3_ejes_cabezote">{t.vehicleTypes["3_ejes_cabezote"]}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">{t.duenoOpcional}</label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={e => setCliente(e.target.value)}
                    placeholder={t.nombreCliente}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 border px-4 py-2 rounded"
                  >
                    {t.cancelar}
                  </button>
                  <button type="submit" className="flex-1 bg-[#1E76B6] text-white px-4 py-2 rounded">
                    {t.crear}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {vehicleToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-lg mb-4">{t.eliminarVehiculo.replace('{placa}', vehicleToDelete.placa?.toUpperCase() || "este vehículo")}</h3>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setVehicleToDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  {t.cancelar}
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteVehicle(vehicleToDelete.id);
                    setVehicleToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  {t.eliminar}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Union Deletion Confirmation */}
        {unionToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-lg mb-4">{t.eliminarConexion}</h3>
              <p className="mb-4 text-gray-600">
                {t.eliminarConexionConfirm}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setUnionToDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  {t.cancelar}
                </button>
                <button
                  onClick={async () => {
                    if (unionToDelete) {
                      await removeUnion(unionToDelete.sourceId, unionToDelete.targetPlaca);
                    }
                  }}
                  className="px-4 py-2 bg-[#1E76B6] text-white rounded"
                >
                  {t.eliminarConexion}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}