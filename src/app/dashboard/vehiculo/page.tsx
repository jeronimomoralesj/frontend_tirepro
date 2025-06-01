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

export default function VehiculoPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

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
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") /* strip trailing slash */ 
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";
  
  // Organize vehicles by their connections
  const organizedVehicles = useMemo(() => {
    // Track vehicles that have been processed
    const processed = new Set<string>();
    
    // Result array: groups of connected vehicles
    const groups: Vehicle[][] = [];
    
    // Process each vehicle
    vehicles.forEach(vehicle => {
      // Skip if already processed
      if (processed.has(vehicle.id)) return;
      
      // Start a new group with this vehicle
      const group: Vehicle[] = [vehicle];
      processed.add(vehicle.id);
      
      // Find all connected vehicles
      // Check if union exists and is an array before accessing length property
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
          setError("No companyId found on user");
        }
      } catch {
        setError("Error parsing user data");
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

async function fetchVehicles(companyId: string) {
  setLoadingVehicles(true);
  setError("");
  try {
    const res = await fetch(`${API_BASE}/vehicles?companyId=${companyId}`);
    if (!res.ok) throw new Error("Failed to fetch vehicles");
    
    const data = await res.json();
    console.log("Vehicles from API:", data);
    
    // DEBUG: Check each vehicle's cliente field
    data.forEach((vehicle, index) => {
      console.log(`Vehicle ${index + 1} (${vehicle.placa}):`, {
        cliente: vehicle.cliente,
        clienteType: typeof vehicle.cliente,
        clienteValue: JSON.stringify(vehicle.cliente)
      });
    });
    
    // Only ensure union is an array, leave cliente as-is
    const safeData = data.map(vehicle => ({
      ...vehicle,
      union: Array.isArray(vehicle.union) ? vehicle.union : [],
    }));
    
    setVehicles(safeData);
  } catch (err: unknown) {
    console.error("Fetch vehicles error:", err);
    setError(err instanceof Error ? err.message : "Unexpected error");
  } finally {
    setLoadingVehicles(false);
  }
}
async function handleCreateVehicle(e: FormEvent) {
  e.preventDefault();
  setError("");
  
  console.log("Sending to API:", {
    placa,
    kilometrajeActual,
    carga,
    pesoCarga,
    tipovhc,
    companyId,
    cliente: cliente.trim() || null
  });
  
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
      throw new Error(err.message || "Failed to create vehicle");
    }
    
    const responseData = await res.json();
    console.log("Response from API:", responseData);
    
    const newVehicle = responseData.vehicle;
    
    // Only ensure union is an array, don't transform cliente
    const safeVehicle = {
      ...newVehicle,
      union: Array.isArray(newVehicle.union) ? newVehicle.union : [],
    };
    
    console.log("Processed vehicle:", safeVehicle);
    
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
    console.error("Create vehicle error:", err);
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
        throw new Error(err.message || "Failed to delete vehicle");
      }
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  // Patch union.add
  async function addUnion(vehicleId: string) {
    const placaUnion = plateInputs[vehicleId]?.trim();
    if (!placaUnion) return alert("Ingrese placa para unir");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/union/add`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaUnion }),
      });
      if (!res.ok) throw new Error("Fallo al añadir unión");
      const { vehicle: updated } = await res.json();
      // Ensure the updated vehicle has a union array
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

  // Patch union.remove
  async function removeUnion(vehicleId: string, placaToRemove: string) {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/union/remove`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaToRemove }),
      });
      if (!res.ok) throw new Error("Fallo al eliminar unión");
      const { vehicle: updated } = await res.json();
      // Ensure the updated vehicle has a union array
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
    
    // Initialize the plate input field if not yet set
    if (!plateInputs[vehicleId]) {
      setPlateInputs(prev => ({
        ...prev,
        [vehicleId]: ""
      }));
    }
  }

  // Handle input change without losing focus
  function handlePlateInputChange(vehicleId: string, value: string) {
    setPlateInputs(prev => ({
      ...prev,
      [vehicleId]: value
    }));
  }

  // Vehicle card component for reuse
const VehicleCard = ({ vehicle, isConnected = false, connectionIndex = 0, onRemoveConnection = null }) => (
  <div 
    className="relative border border-[#348CCB]/20 rounded-lg shadow-md p-4 flex flex-col justify-between bg-white max-w-xs w-full sm:w-72"
    style={{ zIndex: 5 }}
  >
    {/* Connector line between vehicles - only show for connected vehicles */}
    {isConnected && connectionIndex > 0 && onRemoveConnection && (
      <div 
        className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 w-4 md:w-6 h-1 bg-[#1E76B6] cursor-pointer hover:bg-[#0A183A]"
        onClick={onRemoveConnection}
      />
    )}
    
    {/* Vehicle Info */}
    <div className="space-y-2">
      <div className="flex justify-between items-center border-b pb-2">
        <span className="font-bold text-[#173D68]">{vehicle.placa?.toUpperCase() || "SIN PLACA"}</span>
        <span className="bg-[#1E76B6]/10 text-[#1E76B6] px-2 py-1 rounded text-xs">
          {vehicle.tipovhc?.replace("_", " ") || "Sin tipo"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
        <span>Kilometraje:</span>
        <span className="text-right">{vehicle.kilometrajeActual || 0} km</span>
        <span>Carga:</span>
        <span className="text-right">{vehicle.carga || "N/A"}</span>
        <span>Peso:</span>
        <span className="text-right">{vehicle.pesoCarga || 0} kg</span>
        <span>Llantas:</span>
        <span className="text-right">{vehicle.tireCount || 0}</span>
        <span>Dueño:</span>
<span className="text-right">
  {vehicle.cliente ? vehicle.cliente : "—"}
</span>
        <span>Uniones:</span>
        <span className="text-right">
          {vehicle.union && Array.isArray(vehicle.union) && vehicle.union.length > 0 
            ? vehicle.union.join(", ") 
            : "Ninguna"}
        </span>
      </div>
    </div>

    {/* Actions */}
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => toggleUnionInput(vehicle.id)}
          className="flex-1 bg-[#1E76B6]/10 text-[#1E76B6] px-3 py-2 rounded hover:bg-[#1E76B6]/20 flex items-center justify-center"
        >
          <Link2 className="w-4 h-4 mr-2" />
          Unir
        </button>
        <button
          onClick={() => setVehicleToDelete(vehicle)}
          className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </button>
      </div>

      {/* Union input field (conditionally shown) */}
      {showUnionInput[vehicle.id] && (
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Placa del otro vehiculo"
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
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Gestión de Vehículos</h1>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="bg-[#1E76B6] text-white px-4 py-2 rounded-lg hover:bg-[#348CCB] flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Añadir Vehículo
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Vehicles List */}
        <section className="bg-white shadow-lg rounded-lg border border-[#348CCB]/20">
          <div className="px-4 py-4 bg-[#173D68] text-white flex items-center rounded-t-lg">
            <Database className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-semibold">Lista de Vehículos</h2>
          </div>

          {loadingVehicles ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E76B6]"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Truck className="mx-auto h-12 w-12 text-[#348CCB]/50 mb-3" />
              <p>No se encontraron vehículos.</p>
            </div>
          ) : (
            <div className="p-4 space-y-8">
              {/* Groups with connected vehicles */}
              {organizedVehicles.filter(group => group.length > 1).map((group, groupIndex) => (
                <div key={`connected-group-${groupIndex}`} className="mb-8">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Vehículos Conectados</h3>
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
                            // Find the connection to break
                            const currentVehicle = vehicle;
                            const previousVehicle = group[vehicleIndex - 1];
                            
                            // Check which vehicle has the union referencing the other
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
              
              {/* Single vehicles (not connected) in a grid */}
              {organizedVehicles.filter(group => group.length === 1).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Vehículos Individuales</h3>
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

        {/* Create Vehicle Form */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
              <div className="bg-[#173D68] text-white p-4 flex justify-between items-center rounded-t-lg">
                <h2>Crear Vehículo</h2>
                <button onClick={() => setIsFormOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateVehicle} className="p-4 space-y-4">
                {/* placa, kilometraje, carga, peso, tipovhc inputs */}
                <div>
                  <label className="block mb-1">Placa</label>
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">Kilometraje Actual</label>
                  <input
                    type="number"
                    value={kilometrajeActual}
                    onChange={(e) => setKilometrajeActual(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">Carga</label>
                  <input
                    type="text"
                    value={carga}
                    onChange={(e) => setCarga(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">Peso de Carga (kg)</label>
                  <input
                    type="number"
                    value={pesoCarga}
                    onChange={(e) => setPesoCarga(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">Tipo de Vehículo</label>
                  <select
                    value={tipovhc}
                    onChange={(e) => setTipovhc(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="2_ejes">Trailer 2 ejes</option>
                    <option value="2_ejes_cabezote">Cabezote 2 ejes</option>
                    <option value="3_ejes">Trailer 3 ejes</option>
                    <option value="3_ejes_cabezote">Cabezote 3 ejes</option>
                  </select>
                </div>
                <div>
  <label className="block mb-1">Dueño (opcional)</label>
  <input
    type="text"
    value={cliente}
    onChange={e => setCliente(e.target.value)}
    placeholder="Nombre del cliente"
    className="w-full px-3 py-2 border rounded-md"
  />
</div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 border px-4 py-2 rounded"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 bg-[#1E76B6] text-white px-4 py-2 rounded">
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Vehicle Confirmation */}
        {vehicleToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-lg mb-4">¿Eliminar {vehicleToDelete.placa?.toUpperCase() || "este vehículo"}?</h3>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setVehicleToDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteVehicle(vehicleToDelete.id);
                    setVehicleToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Union Deletion Confirmation */}
        {unionToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-lg mb-4">¿Eliminar conexión?</h3>
              <p className="mb-4 text-gray-600">
                ¿Está seguro que desea eliminar esta conexión entre vehículos?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setUnionToDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (unionToDelete) {
                      await removeUnion(unionToDelete.sourceId, unionToDelete.targetPlaca);
                    }
                  }}
                  className="px-4 py-2 bg-[#1E76B6] text-white rounded"
                >
                  Eliminar Conexión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}