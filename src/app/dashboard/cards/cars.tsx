"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, Truck, PlusCircle, Edit3 } from "lucide-react";
import AddCar from "./addCar";
import AddTires from "./addTires";
import EditTires from "./editTires";

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

// Vehicle Visualization Components
const TireDisplay: React.FC<{ tire: Tire | null; position: string }> = ({ tire, position }) => (
  <div
    className="rounded-full border flex items-center justify-center text-white shadow-md bg-gradient-to-br from-[#1E76B6] to-[#348CCB]"
    style={{ width: "80px", height: "80px" }}
  >
    <div className="text-center">
      {tire ? (
        <>
          <div className="text-xs font-bold">{tire.marca}</div>
          <div className="text-xs">{tire.diseno}</div>
        </>
      ) : (
        <div className="text-xs text-white/70 font-medium">Vacío</div>
      )}
    </div>
  </div>
);

const VehicleAxis: React.FC<{
  axleIdx: number;
  positions: string[];
  tireMap: Record<string, Tire>;
}> = ({ axleIdx, positions, tireMap }) => {
  const middleIndex = Math.ceil(positions.length / 2);
  const leftTires = positions.slice(0, middleIndex);
  const rightTires = positions.slice(middleIndex);

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-medium text-[#173D68] mb-2">Eje {axleIdx + 1}</div>
      <div className="flex items-center justify-center w-full">
        <div className="h-4 w-3 bg-[#0A183A] rounded-l-lg" />
        
        <div className="flex items-center">
          {leftTires.map(pos => (
            <div key={pos} className="m-1 flex flex-col items-center">
              <TireDisplay
                position={pos}
                tire={tireMap[pos] || null}
              />
              <div className="w-6 h-1 bg-[#348CCB] mt-2" />
            </div>
          ))}
        </div>

        <div className="bg-[#0A183A] h-6 flex-grow rounded-full mx-2 flex items-center justify-center">
          <div className="bg-[#1E76B6] h-2 w-10/12 rounded-full" />
        </div>

        <div className="flex items-center">
          {rightTires.map(pos => (
            <div key={pos} className="m-1 flex flex-col items-center">
              <TireDisplay
                position={pos}
                tire={tireMap[pos] || null}
              />
              <div className="w-6 h-1 bg-[#348CCB] mt-2" />
            </div>
          ))}
        </div>

        <div className="h-4 w-3 bg-[#0A183A] rounded-r-lg" />
      </div>
    </div>
  );
};

const VehicleVisualization: React.FC<{
  tires: Tire[];
  vehicleId: string;
}> = ({ tires, vehicleId }) => {
  const layout = React.useMemo(() => {
    const activeTires = tires.filter(t => t.position && t.position !== "0");
    const count = activeTires.length || 4; // Default to 4 if no tires assigned
    const axisCount = count <= 8 ? 2 : count <= 12 ? 3 : Math.ceil(count / 4);
    
    const axisLayout: string[][] = [];
    let positionCounter = 1;

    for (let i = 0; i < axisCount; i++) {
      const tiresPerSide = i === 0 ? 1 : count > 6 && i > 0 ? 2 : 1;
      const axle: string[] = [];
      
      for (let j = 0; j < tiresPerSide * 2; j++) {
        axle.push(positionCounter.toString());
        positionCounter++;
      }
      axisLayout.push(axle);
    }
    return axisLayout;
  }, [tires]);

  const tireMap = React.useMemo(() => {
    const map: Record<string, Tire> = {};
    tires.forEach(t => {
      if (t.position && t.position !== "0") {
        map[t.position] = t;
      }
    });
    return map;
  }, [tires]);

  return (
    <div className="bg-gradient-to-r from-[#173D68]/10 to-[#348CCB]/10 p-6 rounded-lg border-l-4 border-[#1E76B6] mb-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-[#0A183A]">
        Configuración de Llantas ({layout.length} eje{layout.length > 1 ? 's' : ''})
      </h3>
      <div className="flex flex-col gap-8">
        {layout.map((positions, idx) => (
          <VehicleAxis
            key={idx}
            axleIdx={idx}
            positions={positions}
            tireMap={tireMap}
          />
        ))}
      </div>
    </div>
  );
};

const CarsPage: React.FC = () => {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTires, setVehicleTires] = useState<Record<string, Tire[]>>({});
  const [loading, setLoading] = useState(true);
  const [tiresLoading, setTiresLoading] = useState<Record<string, boolean>>({});
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
    Authorization: `Bearer ${localStorage.getItem("token")}`
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
      
      // Fetch tires for each vehicle
      safeData.forEach((vehicle: Vehicle) => {
        fetchVehicleTires(vehicle.id);
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

  const handleAddVehicle = (newVehicle: Vehicle) => {
    const safeVehicle = {
      ...newVehicle,
      union: Array.isArray(newVehicle.union) ? newVehicle.union : [],
    };
    setVehicles((prev) => [...prev, safeVehicle]);
    setIsAddCarOpen(false);
    
    // Fetch tires for the new vehicle
    fetchVehicleTires(newVehicle.id);
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
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200">
                {/* Vehicle Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-300 pb-3 sm:pb-4 mb-3 sm:mb-4 gap-2 sm:gap-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#173D68] break-all">
                    {currentVehicle.placa?.toUpperCase() || "SIN PLACA"}
                  </h3>
                  <span className="bg-[#1E76B6]/10 text-[#1E76B6] px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto whitespace-nowrap">
                    {currentVehicle.tipovhc?.replace("_", " ") || "Sin tipo"}
                  </span>
                </div>

                {/* Vehicle Details Grid - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Kilometraje</p>
                    <p className="text-base sm:text-lg font-semibold text-[#173D68]">
                      {currentVehicle.kilometrajeActual?.toLocaleString() || 0} km
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Carga</p>
                    <p className="text-base sm:text-lg font-semibold text-[#173D68] break-words">
                      {currentVehicle.carga || "N/A"}
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Peso</p>
                    <p className="text-base sm:text-lg font-semibold text-[#173D68]">
                      {currentVehicle.pesoCarga?.toLocaleString() || 0} kg
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Llantas</p>
                    <p className="text-base sm:text-lg font-semibold text-[#173D68]">
                      {currentVehicleTires.length || 0}
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 sm:col-span-2 lg:col-span-1">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Uniones</p>
                    <p className="text-base sm:text-lg font-semibold text-[#173D68] break-words">
                      {currentVehicle.union && Array.isArray(currentVehicle.union) && currentVehicle.union.length > 0 
                        ? currentVehicle.union.join(", ") 
                        : "Ninguna"}
                    </p>
                  </div>
                </div>

                {/* Vehicle Visualization */}
                {isCurrentVehicleTiresLoading ? (
                  <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#173D68]"></div>
                    <span className="ml-2 text-[#173D68]">Cargando configuración de llantas...</span>
                  </div>
                ) : currentVehicleTires.length > 0 ? (
                  <VehicleVisualization 
                    tires={currentVehicleTires}
                    vehicleId={currentVehicle.id}
                  />
                ) : (
                  <div className="bg-gray-100 p-6 rounded-lg mb-4 text-center text-gray-500">
                    <Truck size={32} className="mx-auto mb-2 text-gray-400" />
                    <p>Sin llantas asignadas</p>
                    <p className="text-sm">Agrega llantas para ver la configuración del vehículo</p>
                  </div>
                )}

                {/* Action Buttons - Responsive Stack */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                  <button
                    onClick={() => setIsAddTiresOpen(true)}
                    className="flex-1 bg-[#1E76B6] hover:bg-[#348CCB] text-white px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center font-medium text-sm sm:text-base"
                  >
                    <PlusCircle size={16} className="sm:w-5 sm:h-5 mr-2" />
                    Agregar Llanta
                  </button>
                </div>

                {/* Navigation Arrows - Hidden on mobile, positioned for larger screens */}
                {vehicles.length > 1 && (
                  <>
                    <button
                      onClick={prevVehicle}
                      className="hidden sm:block absolute left-2 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 text-[#173D68] p-2 rounded-full shadow-lg border border-gray-200 transition-colors duration-200 z-10"
                    >
                      <ChevronLeft size={20} className="lg:w-6 lg:h-6" />
                    </button>
                    
                    <button
                      onClick={nextVehicle}
                      className="hidden sm:block absolute right-2 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 text-[#173D68] p-2 rounded-full shadow-lg border border-gray-200 transition-colors duration-200 z-10"
                    >
                      <ChevronRight size={20} className="lg:w-6 lg:h-6" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Navigation Buttons */}
            {vehicles.length > 1 && (
              <div className="flex sm:hidden justify-between mt-4 gap-3">
                <button
                  onClick={prevVehicle}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#173D68] py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  <ChevronLeft size={18} className="mr-1" />
                  Anterior
                </button>
                
                <button
                  onClick={nextVehicle}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#173D68] py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  Siguiente
                  <ChevronRight size={18} className="ml-1" />
                </button>
              </div>
            )}

            {/* Pagination Dots */}
            {vehicles.length > 1 && (
              <div className="flex justify-center mt-4 space-x-2 overflow-x-auto pb-2">
                <div className="flex space-x-2">
                  {vehicles.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors duration-200 shrink-0 ${
                        index === currentIndex
                          ? "bg-[#1E76B6]"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Footer - Responsive Text */}
            <div className="border-t border-gray-100 pt-3 sm:pt-4 mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0">
              <div className="text-xs text-gray-500">
                Total vehículos: {vehicles.length}
              </div>
              <div className="text-xs text-gray-500">
                Vehículo {currentIndex + 1} de {vehicles.length}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Car Modal */}
      {isAddCarOpen && (
        <AddCar
          isOpen={isAddCarOpen}
          onClose={() => setIsAddCarOpen(false)}
          onAddVehicle={handleAddVehicle}
          apiBase={API_BASE}
        />
      )}

      {/* Add Tires Modal */}
      {isAddTiresOpen && currentVehicle && (
        <AddTires
          isOpen={isAddTiresOpen}
          onClose={() => setIsAddTiresOpen(false)}
          vehicle={currentVehicle}
          apiBase={API_BASE}
        />
      )}

      {/* Edit Tires Modal */}
      {isEditTiresOpen && currentVehicle && (
        <EditTires
          isOpen={isEditTiresOpen}
          onClose={() => setIsEditTiresOpen(false)}
          vehicle={currentVehicle}
          apiBase={API_BASE}
        />
      )}
    </div>
  );
};

export default CarsPage;