"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import AddCar from "./addCar";
import AddTires from "./addTires";
import EditTires from "./editTires";
import CarCard from "./carCard";
import ExtrasCard from "./extrasCard";

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

type Tire = {
  id: string;
  marca: string;
  posicion?: number | null;
  position?: string | null;
};

type Extra = {
  id: string;
  vehicleId: string;
  type: string;
  brand: string;
  purchaseDate: string;
  cost: number;
  notes?: string;
};

const CarsPage: React.FC = () => {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTires, setVehicleTires] = useState<Record<string, Tire[]>>({});
  const [vehicleExtras, setVehicleExtras] = useState<Record<string, Extra[]>>({});
  const [loading, setLoading] = useState(true);
  const [tiresLoading, setTiresLoading] = useState<Record<string, boolean>>({});
  const [extrasLoading, setExtrasLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [isAddTiresOpen, setIsAddTiresOpen] = useState(false);
  const [isEditTiresOpen, setIsEditTiresOpen] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
      : "https://api.tirepro.com.co/api";

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.companyId) {
          fetchVehicles(user.companyId);
        } else {
          setError("No companyId found on user");
          setLoading(false);
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
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      
      const data = await res.json();
      const safeData = data.map((vehicle: Vehicle) => ({
        ...vehicle,
        union: Array.isArray(vehicle.union) ? vehicle.union : [],
      }));
      
      setVehicles(safeData);
      
      // Fetch tires and extras for each vehicle
      safeData.forEach((vehicle: Vehicle) => {
        fetchVehicleTires(vehicle.id);
        fetchVehicleExtras(vehicle.id);
      });
    } catch (err: unknown) {
      console.error("Fetch vehicles error:", err);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchVehicleTires(vehicleId: string) {
    setTiresLoading(prev => ({ ...prev, [vehicleId]: true }));
    try {
      const response = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicleId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const tiresData = await response.json();
        const processedTires = tiresData.map((tire: Tire) => ({
          ...tire,
          position: tire.posicion === 0 ? "0" : tire.posicion ? tire.posicion.toString() : null
        }));
        
        setVehicleTires(prev => ({
          ...prev,
          [vehicleId]: processedTires
        }));
      }
    } catch (err) {
      console.error("Error fetching tires for vehicle:", vehicleId, err);
    } finally {
      setTiresLoading(prev => ({ ...prev, [vehicleId]: false }));
    }
  }

  async function fetchVehicleExtras(vehicleId: string) {
    setExtrasLoading(prev => ({ ...prev, [vehicleId]: true }));
    try {
      const response = await fetch(`${API_BASE}/vehicles/${vehicleId}/extras`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const extrasData = await response.json();
        setVehicleExtras(prev => ({
          ...prev,
          [vehicleId]: extrasData
        }));
      } else {
        console.warn(`Failed to fetch extras for vehicle ${vehicleId}:`, response.status);
        setVehicleExtras(prev => ({
          ...prev,
          [vehicleId]: []
        }));
      }
    } catch (err) {
      console.error("Error fetching extras for vehicle:", vehicleId, err);
      setVehicleExtras(prev => ({
        ...prev,
        [vehicleId]: []
      }));
    } finally {
      setExtrasLoading(prev => ({ ...prev, [vehicleId]: false }));
    }
  }

  async function createExtra(vehicleId: string, extraData: Omit<Extra, 'id' | 'vehicleId'>) {
    try {
      const response = await fetch(`${API_BASE}/vehicles/${vehicleId}/extras`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: extraData.type,
          brand: extraData.brand,
          purchaseDate: extraData.purchaseDate,
          cost: extraData.cost,
          notes: extraData.notes || undefined
        })
      });

      if (response.ok) {
        const newExtra = await response.json();
        setVehicleExtras(prev => ({
          ...prev,
          [vehicleId]: [...(prev[vehicleId] || []), newExtra]
        }));
        return newExtra;
      } else {
        throw new Error(`Failed to create extra: ${response.status}`);
      }
    } catch (err) {
      console.error("Error creating extra:", err);
      throw err;
    }
  }

  const handleAddVehicle = (newVehicle: Vehicle) => {
    const safeVehicle = {
      ...newVehicle,
      union: Array.isArray(newVehicle.union) ? newVehicle.union : [],
    };
    setVehicles((prev) => [...prev, safeVehicle]);
    setIsAddCarOpen(false);
    
    // Fetch tires and extras for the new vehicle
    fetchVehicleTires(newVehicle.id);
    fetchVehicleExtras(newVehicle.id);
  };

  const nextVehicle = () => {
    setCurrentIndex((prev) => 
      prev === vehicles.length - 1 ? 0 : prev + 1
    );
  };

  const prevVehicle = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? vehicles.length - 1 : prev - 1
    );
  };

  const currentVehicle = vehicles[currentIndex];
  const currentVehicleTires = currentVehicle ? vehicleTires[currentVehicle.id] || [] : [];
  const isCurrentVehicleTiresLoading = currentVehicle ? tiresLoading[currentVehicle.id] || false : false;
  const currentExtras = currentVehicle ? vehicleExtras[currentVehicle.id] || [] : [];
  const isCurrentExtrasLoading = currentVehicle ? extrasLoading[currentVehicle.id] || false : false;

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-3 sm:p-4 lg:p-5 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold">Vehículos</h2>
        <button
          onClick={() => setIsAddCarOpen(true)}
          className="bg-[#1E76B6] hover:bg-[#348CCB] text-white p-2 rounded-lg transition-colors duration-200 flex items-center justify-center shrink-0"
          title="Añadir Vehículo"
        >
          <Plus size={18} className="sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-[#173D68]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-red-500 gap-2">
            <Truck size={24} className="sm:w-8 sm:h-8" />
            <p className="text-sm sm:text-base text-center px-4">{error}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-gray-500 gap-2">
            <Truck size={24} className="sm:w-8 sm:h-8" />
            <p className="text-sm sm:text-base">No hay vehículos registrados</p>
            <button
              onClick={() => setIsAddCarOpen(true)}
              className="mt-4 bg-[#1E76B6] hover:bg-[#348CCB] text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base"
            >
              Añadir primer vehículo
            </button>
          </div>
        ) : (
          <>
            {/* Vehicle Card */}
            <div className="relative">
              <CarCard
                vehicle={currentVehicle}
                tires={currentVehicleTires}
                isLoading={isCurrentVehicleTiresLoading}
                onAddTires={() => setIsAddTiresOpen(true)}
                onEditTires={() => setIsEditTiresOpen(true)}
              />

              {/* Kilometraje Box */}
              <div className="mt-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500 text-white p-2 rounded-lg">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 text-sm">Kilometraje</h3>
                      <p className="text-blue-700 font-bold text-lg">
                        {currentVehicle.kilometrajeActual.toLocaleString()} km
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extras Card */}
              <ExtrasCard
                vehicleId={currentVehicle.id}
                extras={currentExtras}
                isLoading={isCurrentExtrasLoading}
                onCreateExtra={createExtra}
              />

              {/* Navigation Arrows */}
              {vehicles.length > 1 && (
                <>
                  <button
                    onClick={prevVehicle}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 shadow-lg rounded-full p-2 transition-colors duration-200 border border-gray-200 z-10"
                    title="Vehículo anterior"
                  >
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <button
                    onClick={nextVehicle}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 shadow-lg rounded-full p-2 transition-colors duration-200 border border-gray-200 z-10"
                    title="Siguiente vehículo"
                  >
                    <ChevronRight size={20} className="text-gray-600" />
                  </button>
                </>
              )}
            </div>

            {/* Vehicle Counter */}
            {vehicles.length > 1 && (
              <div className="flex justify-center mt-4">
                <div className="bg-gray-100 rounded-full px-4 py-2">
                  <span className="text-sm text-gray-600">
                    {currentIndex + 1} de {vehicles.length}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isAddCarOpen && (
        <AddCar
          onClose={() => setIsAddCarOpen(false)}
          onAddVehicle={handleAddVehicle}
        />
      )}

      {isAddTiresOpen && currentVehicle && (
        <AddTires
          vehicleId={currentVehicle.id}
          tireCount={currentVehicle.tireCount}
          onClose={() => setIsAddTiresOpen(false)}
          onTiresAdded={() => {
            fetchVehicleTires(currentVehicle.id);
            setIsAddTiresOpen(false);
          }}
        />
      )}

      {isEditTiresOpen && currentVehicle && (
        <EditTires
          vehicleId={currentVehicle.id}
          tires={currentVehicleTires}
          onClose={() => setIsEditTiresOpen(false)}
          onTiresUpdated={() => {
            fetchVehicleTires(currentVehicle.id);
            setIsEditTiresOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default CarsPage;