"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Database, Trash2 } from "lucide-react";

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  carga: string;
  pesoCarga: number;
  tipovhc: string;
  companyId: string;
  tireCount: number;
};


export default function VehiculoPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // State for delete confirmation modal
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // Form state for creating a vehicle
  const [placa, setPlaca] = useState("");
  const [kilometrajeActual, setKilometrajeActual] = useState<number>(0);
  const [carga, setCarga] = useState("");
  const [pesoCarga, setPesoCarga] = useState<number>(0);
  // Initialize with a default value (e.g., "2_ejes")
  const [tipovhc, setTipovhc] = useState("2_ejes");

  // Retrieve the companyId from stored user data
  const [companyId, setCompanyId] = useState<string>("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.companyId) {
        setCompanyId(user.companyId);
        fetchVehicles(user.companyId);
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  async function fetchVehicles(companyId: string) {
    setLoadingVehicles(true);
    setError("");
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/vehicles?companyId=${companyId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data = await res.json();
      setVehicles(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error");
      }
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function handleCreateVehicle(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/create`
          : "https://api.tirepro.com.co/api/vehicles/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placa,
            kilometrajeActual,
            carga,
            pesoCarga,
            tipovhc,
            companyId,
          }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create vehicle");
      }
      const newVehicleResponse = await res.json();
      // Assuming the backend returns an object with the vehicle key:
      const newVehicle = newVehicleResponse.vehicle || newVehicleResponse;
      setVehicles((prev) => [...prev, newVehicle]);
      // Reset form fields and close the panel
      setPlaca("");
      setKilometrajeActual(0);
      setCarga("");
      setPesoCarga(0);
      setTipovhc("2_ejes"); // Reset to default option
      setIsFormOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error");
      }
    }
  }

  async function handleDeleteVehicle(vehicleId: string) {
    setError("");
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/${vehicleId}`
          : `https://api.tirepro.com.co/api/vehicles/${vehicleId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete vehicle");
      }
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error");
      }
    }
  }

  return (
    <div className="min-h-screen text-[#0A183A] antialiased">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestión de Vehículos</h1>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="bg-[#1E76B6] text-white px-4 py-2 rounded-lg hover:bg-[#348CCB] transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Añadir Vehículo</span>
          </button>
        </header>

        {/* Error Handling */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Vehicles List */}
        <section className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-[#173D68] text-white flex items-center">
            <Database className="w-6 h-6 mr-3" />
            <h2 className="text-xl font-semibold">Lista de Vehículos</h2>
          </div>
          {loadingVehicles ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#1E76B6]"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <p>No se encontraron vehículos.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white border border-[#348CCB]/20 rounded-lg shadow-md p-5 flex flex-col justify-between transition-all hover:shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1E76B6]">Placa:</span>
                      {/* Display placa in all caps */}
                      <span>{vehicle.placa.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1E76B6]">Kilometraje:</span>
                      <span>{vehicle.kilometrajeActual} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1E76B6]">Carga:</span>
                      <span>{vehicle.carga}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1E76B6]">Peso:</span>
                      <span>{vehicle.pesoCarga} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1E76B6]">Cantidad de llantas:</span>
                      <span>{vehicle.tireCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1E76B6]">Tipo VHC:</span>
                      {/* Now the type is fixed to the two options */}
                      <span>{vehicle.tipovhc}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setVehicleToDelete(vehicle)}
                    className="mt-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 inline-block mr-1" />
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create Vehicle Form (Sliding Panel) */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
              <div className="bg-[#173D68] text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
                <h2 className="text-xl font-semibold">Crear Nuevo Vehículo</h2>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-white hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A183A] mb-2">Placa</label>
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                    className="w-full px-3 py-2 border border-[#348CCB]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0A183A] mb-2">Kilometraje Actual</label>
                  <input
                    type="number"
                    value={kilometrajeActual}
                    onChange={(e) => setKilometrajeActual(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[#348CCB]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0A183A] mb-2">Carga</label>
                  <input
                    type="text"
                    value={carga}
                    onChange={(e) => setCarga(e.target.value)}
                    className="w-full px-3 py-2 border border-[#348CCB]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-black"
                    required
                    placeholder="Tipo de carga: seca, líquidos, etc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0A183A] mb-2">Peso de Carga</label>
                  <input
                    type="number"
                    value={pesoCarga}
                    onChange={(e) => setPesoCarga(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-[#348CCB]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-black"
                    required
                    placeholder="Peso en kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0A183A] mb-2">Tipo de VHC</label>
                  <select
                    value={tipovhc}
                    onChange={(e) => setTipovhc(e.target.value)}
                    className="w-full px-3 py-2 border border-[#348CCB]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-black"
                    required
                  >
                    <option value="2_ejes">2_ejes</option>
                    <option value="3_ejes">3_ejes</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1E76B6] text-white py-3 rounded-lg hover:bg-[#348CCB] transition-colors"
                >
                  Crear Vehículo
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {vehicleToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-xl font-semibold mb-4 text-[#0A183A]">
                Confirmar Eliminación
              </h3>
              <p className="mb-6">
                ¿Está seguro de que desea eliminar el vehículo con placa{" "}
                <span className="font-bold">{vehicleToDelete.placa.toUpperCase()}</span>?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setVehicleToDelete(null)}
                  className="px-4 py-2 border border-gray-300 text-[#0A183A] rounded hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteVehicle(vehicleToDelete.id);
                    setVehicleToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

