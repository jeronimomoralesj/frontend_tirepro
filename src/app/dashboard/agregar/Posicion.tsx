import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Search, Clock, AlertTriangle } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// DND Item Types
const ItemTypes = {
  TIRE: "tire"
};

interface Tire {
  id: string;
  marca: string;
  posicion?: number | null;
  // Add a position field to extend the Tire type
  position?: string | null;
}

// Interface for Vehicle data
interface Vehicle {
  id: string;
  placa: string;
  tipovhc?: string;
}

// Error response interface
interface ErrorResponse {
  message?: string;
  data?: {
    message?: string;
  };
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface DraggableTireProps {
  tire: Tire;
}

const DraggableTire: React.FC<DraggableTireProps> = ({ tire }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.TIRE,
    item: { id: tire.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // 🔧 Attach dragRef to DOM
  useEffect(() => {
    if (ref.current) {
      dragRef(ref.current);
    }
  }, [dragRef]);

  return (
    <div
      ref={ref}
      className="rounded-full border flex items-center justify-center bg-gradient-to-br from-[#1E76B6] to-[#348CCB] text-white cursor-move shadow-md transition-all duration-200 hover:shadow-lg"
      style={{
        width: "80px",
        height: "80px",
        opacity: isDragging ? "0.5" : "1",
      }}
    >
      <div className="text-center">
        <div className="text-xs font-bold">{tire.marca}</div>
        <div className="text-xs">{tire.id.substring(0, 6)}</div>
      </div>
    </div>
  );
};

// Droppable Position Component
interface TirePositionProps {
  position: string;
  currentTire: Tire | null;
  moveTire: (id: string, position: string) => void;
}

const TirePosition: React.FC<TirePositionProps> = ({ position, currentTire, moveTire }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop: (item: { id: string }) => moveTire(item.id, position),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // 🔧 Attach dropRef to DOM
  useEffect(() => {
    if (ref.current) {
      dropRef(ref.current);
    }
  }, [dropRef]);

  return (
    <div
      ref={ref}
      className={`rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
        isOver ? "border-[#1E76B6] bg-[#348CCB]/10" : "border-gray-300"
      } ${currentTire ? "border-[#1E76B6] bg-[#348CCB]/10" : "bg-gray-50"}`}
      style={{ width: "80px", height: "80px" }}
    >
      {currentTire ? <DraggableTire tire={currentTire} /> : <div className="text-xs text-gray-500 font-medium">Pos {position}</div>}
    </div>
  );
};

// Inventory Drop Zone
interface InventoryDropZoneProps {
  moveTire: (id: string, position: string) => void;
  inventoryTires: Tire[];
  onRemoveTire: (id: string) => void;
}

const InventoryDropZone: React.FC<InventoryDropZoneProps> = ({ moveTire }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop: (item: { id: string }) => moveTire(item.id, "none"),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // 🔧 Attach dropRef to DOM
  useEffect(() => {
    if (ref.current) {
      dropRef(ref.current);
    }
  }, [dropRef]);

  return (
    <div
      ref={ref}
      className={`p-4 rounded-lg border-2 border-dashed transition-all duration-200 min-h-[10rem] ${
        isOver ? "border-[#1E76B6] bg-[#348CCB]/10" : "border-gray-300 bg-gray-50"
      }`}
    >
      {/* ... */}
    </div>
  );
};


// Available Tires Tray Component
interface TiresTrayProps {
  availableTires: Tire[];
}

const TiresTray: React.FC<TiresTrayProps> = ({ availableTires }) => {
  return (
    <div className="bg-gradient-to-r from-[#173D68]/10 to-[#348CCB]/10 p-4 rounded-lg border-l-4 border-[#1E76B6] mb-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-[#0A183A]">Llantas Disponibles</h3>
      <div className="flex flex-wrap gap-4">
        {availableTires.length > 0 ? (
          availableTires.map((tire) => (
            <DraggableTire key={tire.id} tire={tire} />
          ))
        ) : (
          <p className="text-gray-500 italic">No hay llantas disponibles</p>
        )}
      </div>
    </div>
  );
};

// Vehicle configuration interface
interface VehicleConfig {
  axisCount: number;
  layout: string[][];
}

// Improved Vehicle Visualization Component
interface VehicleVisualizationProps {
  config: VehicleConfig;
  assignedTires: Tire[];
  moveTire: (id: string, position: string) => void;
}

const VehicleVisualization: React.FC<VehicleVisualizationProps> = ({ config, assignedTires, moveTire }) => {
  // Create a map of positions to tires for easier access
  const positionMap: Record<string, Tire> = {};
  assignedTires.forEach(tire => {
    if (tire.position) {
      positionMap[tire.position] = tire;
    }
  });

  return (
    <div className="bg-gradient-to-r from-[#173D68]/10 to-[#348CCB]/10 p-6 rounded-lg border-l-4 border-[#1E76B6] mb-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-[#0A183A]">
        Configuración de Llantas ({config.axisCount} ejes)
      </h3>
      
      <div className="flex flex-col gap-8">
        {config.layout.map((axis, axisIndex) => (
          <div key={`axis-${axisIndex}`} className="flex flex-col items-center">
            <div className="text-sm font-medium text-[#173D68] mb-2">
              Eje {axisIndex + 1}
            </div>
            <div className="flex items-center justify-center w-full">
              {/* Vehicle body side representation */}
              <div className="h-4 w-3 bg-[#0A183A] rounded-l-lg"></div>
              
              {/* Left side tires */}
              <div className="flex items-center">
                {axis.slice(0, axis.length / 2).map((position) => (
                  <div key={`left-${position}`} className="m-1 flex flex-col items-center">
                    <TirePosition
                      position={position}
                      currentTire={positionMap[position] || null}
                      moveTire={moveTire}
                    />
                    {parseInt(position) < parseInt(axis[axis.length / 2 - 1]) && (
                      <div className="w-6 h-1 bg-[#348CCB] mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Axis representation */}
              <div className="bg-[#0A183A] h-6 flex-grow rounded-full mx-2 flex items-center justify-center">
                <div className="bg-[#1E76B6] h-2 w-10/12 rounded-full"></div>
              </div>
              
              {/* Right side tires */}
              <div className="flex items-center">
                {axis.slice(axis.length / 2).map((position) => (
                  <div key={`right-${position}`} className="m-1 flex flex-col items-center">
                    <TirePosition
                      position={position}
                      currentTire={positionMap[position] || null}
                      moveTire={moveTire}
                    />
                    {parseInt(position) < parseInt(axis[axis.length - 1]) && (
                      <div className="w-6 h-1 bg-[#348CCB] mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Vehicle body side representation */}
              <div className="h-4 w-3 bg-[#0A183A] rounded-r-lg"></div>
            </div>
          </div>
        ))}
        
        {/* Vehicle body representation connecting the axes */}
        <div className="relative mt-4">
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-4 bg-[#0A183A] rounded-full opacity-30"></div>
        </div>
      </div>
    </div>
  );
};

const Posicion = () => {
  const [placa, setPlaca] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<Tire[]>([]);
  const [assignedTires, setAssignedTires] = useState<Tire[]>([]);
  const [availableTires, setAvailableTires] = useState<Tire[]>([]);
  const [inventoryTires, setInventoryTires] = useState<Tire[]>([]);
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig | null>(null);
  // Removed unused positions state
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [originalState, setOriginalState] = useState<Record<string, string | null>>({});

  // Fetch tires & positions by vehicle plate
  const handleSearch = async () => {
    if (!placa.trim()) {
      setErrorMessage("Por favor ingrese una placa válida");
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoading(true);
      setAssignedTires([]);
      setAvailableTires([]);
      setInventoryTires([]);
      setHasChanges(false);

      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Usuario no identificado");
        setIsLoading(false);
        return;
      }

      // Updated to use the new endpoint for fetching vehicle by placa
      const vehicleResponse = await axios.get(
        `https://api.tirepro.com.co/api/vehicles/placa`,
        { 
          params: { placa },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );           

      if (!vehicleResponse.data) {
        setErrorMessage("No se encontró un vehículo con esta placa.");
        setIsLoading(false);
        return;
      }

      setVehicle(vehicleResponse.data);
      
      // Fetch tires by vehicle ID rather than placa now
      const vehicleId = vehicleResponse.data.id;
      const tiresResponse = await axios.get(
        `https://api.tirepro.com.co/api/tires/vehicle`,
        { 
          params: { vehicleId },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      if (!tiresResponse.data.length) {
        setErrorMessage("No se encontraron llantas asociadas a este vehículo.");
        setIsLoading(false);
        return;
      }

      setTires(tiresResponse.data);

      // Process tire positions directly from tire data
      // Use the posicion field from tire data instead of separate endpoint
      const assignedTiresArray: Tire[] = [];
      const availableTiresArray: Tire[] = [];
      const positionTracker: Record<string, string> = {};
      
      tiresResponse.data.forEach((tire: Tire) => {
        const positionValue = tire.posicion ? tire.posicion.toString() : null;
        
        if (positionValue && !positionTracker[positionValue]) {
          positionTracker[positionValue] = tire.id;
          // Add both the original posicion and the position property
          assignedTiresArray.push({ ...tire, position: positionValue });
        } else {
          availableTiresArray.push({ ...tire, position: null });
        }
      });

      // Store original state for change detection
      const originalStateMap: Record<string, string | null> = {};
      [...assignedTiresArray, ...availableTiresArray].forEach(tire => {
        // Fix for the undefined issue - ensure we always have a string or null
        originalStateMap[tire.id] = tire.position || null;
      });
      
      setOriginalState(originalStateMap);
      setAssignedTires(assignedTiresArray);
      setAvailableTires(availableTiresArray);
      
      // Generate vehicle configuration
      const vehicleConfig = getVehicleConfig(vehicleResponse.data, tiresResponse.data.length);
      setVehicleConfig(vehicleConfig);
      
      setHasChanges(false);
    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      const typedError = error as ErrorResponse;
      setErrorMessage("Error al buscar los datos: " + (typedError.response?.data?.message || typedError.message));
    } finally {
      setIsLoading(false);
    }
  };

// Determine vehicle configuration based on vehicle type and tire count
const getVehicleConfig = (vehicle: Vehicle, tireCount: number): VehicleConfig => {
  if (!vehicle) return { axisCount: 2, layout: [] };

  const tipovhc = vehicle.tipovhc || "";
  
  // Try to extract axis count from vehicle type if available
  const axisMatch = tipovhc.match(/(\d+)_ejes/);
  
  // Determine axes based on type or infer from tire count
  let axisCount = 2; // Default to 2 axes
  
  if (axisMatch) {
    // If we have a type with explicit axis count, use it
    axisCount = parseInt(axisMatch[1]);
  } else {
    // If no type is available, infer axes from tire count
    if (tireCount <= 4) {
      axisCount = 2; // For 4 or fewer tires, assume 2 axes
    } else if (tireCount <= 6) {
      // For 5-6 tires, could be 2 axes with dual rear wheels
      // or 3 axes with single wheels
      axisCount = tireCount % 2 === 0 ? (tireCount <= 6 ? 3 : 2) : 2;
    } else if (tireCount <= 10) {
      axisCount = 3; // For 7-10 tires, assume 3 axes
    } else {
      axisCount = Math.ceil(tireCount / 4); // Approximate for larger vehicles
    }
  }
  
  // Ensure we never have more than 5 axes (reasonable limit)
  axisCount = Math.min(axisCount, 5);
  
  // Initialize the configuration
  const config: VehicleConfig = {
    axisCount,
    layout: []
  };
  
  // Calculate how many tires per side per axis
  // First, try to distribute them evenly
  let remainingTires = tireCount;
  const maxTiresPerAxis = remainingTires >= axisCount * 4 ? 4 : 2;
  
  // Determine if we need mixed configurations (some axes with 2 tires, some with 4)
  const needMixedConfig = remainingTires > axisCount * 2 && remainingTires < axisCount * 4;
  
  // Calculate how many axes should have 4 tires (2 per side) in a mixed configuration
  const axesWithFourTires = needMixedConfig ? Math.floor((remainingTires - axisCount * 2) / 2) : 0;
  
  // Build the layout axis by axis
  for (let i = 0; i < axisCount; i++) {
    let tiresOnThisAxis: string[];
    const basePosition = i * maxTiresPerAxis + 1;
    
    if (needMixedConfig) {
      // In mixed configuration, start with single tires for the first axes
      if (i < axisCount - axesWithFourTires) {
        // This axis has 1 tire per side
        tiresOnThisAxis = [
          basePosition.toString(), 
          (basePosition + 1).toString()
        ];
        remainingTires -= 2;
      } else {
        // This axis has 2 tires per side
        tiresOnThisAxis = [
          basePosition.toString(),
          (basePosition + 1).toString(),
          (basePosition + 2).toString(),
          (basePosition + 3).toString()
        ];
        remainingTires -= 4;
      }
    } else if (remainingTires >= 4) {
      // Full complement of 2 tires per side
      tiresOnThisAxis = [
        basePosition.toString(),
        (basePosition + 1).toString(),
        (basePosition + 2).toString(),
        (basePosition + 3).toString()
      ];
      remainingTires -= 4;
    } else if (remainingTires >= 2) {
      // Single tire per side
      tiresOnThisAxis = [
        basePosition.toString(),
        (basePosition + 1).toString()
      ];
      remainingTires -= 2;
    } else {
      // Not enough tires left
      break;
    }
    
    config.layout.push(tiresOnThisAxis);
  }
  
  // Ensure positions are consecutive across all axes
  let positionCounter = 1;
  const finalLayout: string[][] = [];
  
  for (const axis of config.layout) {
    const newAxis = axis.map(() => (positionCounter++).toString());
    finalLayout.push(newAxis);
  }
  
  config.layout = finalLayout;
  return config;
}

  // Move tire to new position, handle replacement if needed
  const moveTire = (tireId: string, newPosition: string) => {
    // Find the tire object
    const tireToMove = [...assignedTires, ...availableTires, ...inventoryTires].find((t) => t.id === tireId);
    if (!tireToMove) return;

    // Clone the current state arrays
    const newAssignedTires = [...assignedTires];
    const newAvailableTires = [...availableTires];
    const newInventoryTires = [...inventoryTires];
    
    // 1. Remove the tire from its current location
    // Remove from assigned
    const assignedIndex = newAssignedTires.findIndex(t => t.id === tireId);
    if (assignedIndex !== -1) {
      newAssignedTires.splice(assignedIndex, 1);
    }
    
    // Remove from available
    const availableIndex = newAvailableTires.findIndex(t => t.id === tireId);
    if (availableIndex !== -1) {
      newAvailableTires.splice(availableIndex, 1);
    }
    
    // Remove from inventory
    const inventoryIndex = newInventoryTires.findIndex(t => t.id === tireId);
    if (inventoryIndex !== -1) {
      newInventoryTires.splice(inventoryIndex, 1);
    }
    
    // 2. Check if there's already a tire in the target position
    if (newPosition !== "none") {
      const existingTireIndex = newAssignedTires.findIndex(t => t.position === newPosition.toString());
      
      if (existingTireIndex !== -1) {
        // Get the displaced tire
        const displacedTire = newAssignedTires[existingTireIndex];
        // Remove the displaced tire from assigned
        newAssignedTires.splice(existingTireIndex, 1);
        // Move displaced tire to available
        displacedTire.position = null;
        newAvailableTires.push(displacedTire);
      }
    }
    
    // 3. Place the tire in its new location
    if (newPosition === "none") {
      // Move to inventory
      tireToMove.position = null;
      newInventoryTires.push(tireToMove);
    } else {
      // Move to specified position
      tireToMove.position = newPosition.toString();
      // Also update the original posicion property for consistency
      tireToMove.posicion = parseInt(newPosition);
      newAssignedTires.push(tireToMove);
    }
    
    // 4. Update state
    setAssignedTires(newAssignedTires);
    setAvailableTires(newAvailableTires);
    setInventoryTires(newInventoryTires);
    
    // 5. Check for changes
    const currentState: Record<string, string | null> = {};
    [...newAssignedTires, ...newAvailableTires, ...newInventoryTires].forEach(tire => {
      // Fix for the undefined issue - ensure we always have a string or null
      currentState[tire.id] = tire.position || null;
    });
    
    const hasAnyChanges = Object.keys(currentState).some(id => 
      currentState[id] !== originalState[id]
    );
    
    setHasChanges(hasAnyChanges);
  };

  // Remove tire from inventory
  const handleRemoveTireFromInventory = (tireId: string) => {
    const tireToMove = inventoryTires.find(t => t.id === tireId);
    if (!tireToMove) return;
    
    const newInventoryTires = inventoryTires.filter(t => t.id !== tireId);
    const newAvailableTires = [...availableTires, { ...tireToMove, position: null }];
    
    setInventoryTires(newInventoryTires);
    setAvailableTires(newAvailableTires);
    
    // Check for changes
    const currentState: Record<string, string | null> = {};
    [...assignedTires, ...newAvailableTires, ...newInventoryTires].forEach(tire => {
      // Fix for the undefined issue - ensure we always have a string or null
      currentState[tire.id] = tire.position || null;
    });
    
    const hasAnyChanges = Object.keys(currentState).some(id => 
      currentState[id] !== originalState[id]
    );
    
    setHasChanges(hasAnyChanges);
  };

  // Reset positions to original state
  const resetPositions = () => {
    handleSearch();
  };

  // Save updated positions to backend
  const handleUpdatePositions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      const updates: Record<string, string> = {};
      
      // Process assigned tires
      assignedTires.forEach(tire => {
        if (tire.position) {
          updates[tire.position] = tire.id;
        }
      });

      await axios.post(
        "https://api.tirepro.com.co/api/tires/update-positions",
        { 
          placa,
          updates
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update original state after successful save
      const updatedOriginalState: Record<string, string | null> = {};
      [...assignedTires, ...availableTires, ...inventoryTires].forEach(tire => {
        // Fix for the undefined issue - ensure we always have a string or null
        updatedOriginalState[tire.id] = tire.position || null;
      });
      
      setOriginalState(updatedOriginalState);
      setHasChanges(false);
      setSuccessMessage("Posiciones actualizadas exitosamente.");
    } catch (error: unknown) {
      console.error("Error updating positions:", error);
      const typedError = error as ErrorResponse;
      setErrorMessage("Error al actualizar posiciones: " + (typedError.response?.data?.message || typedError.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-4 md:p-6 shadow-md">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center">
              Asignar Posiciones de Llantas
            </h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {/* Status Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg flex items-start">
              <div className="flex-grow">{successMessage}</div>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-grow">{errorMessage}</div>
            </div>
          )}

          {/* Search Section */}
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#0A183A] mb-4">Buscar Vehículo</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ingrese placa del vehículo"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-3 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
              >
                {isLoading ? (
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
            </div>
          </div>

          {/* Vehicle Information */}
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
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">Llantas:</span> 
                  {tires.length}
                </p>
              </div>
            </div>
          )}

          {/* Available Tires Tray */}
          {tires.length > 0 && (
            <TiresTray availableTires={availableTires} />
          )}

          {/* Vehicle Visualization */}
          {vehicleConfig && (
            <VehicleVisualization 
              config={vehicleConfig} 
              assignedTires={assignedTires}
              moveTire={moveTire} 
            />
          )}

          {/* Inventory Zone */}
          {vehicle && (
            <div className="mb-6">
              <InventoryDropZone 
                moveTire={moveTire}
                inventoryTires={inventoryTires}
                onRemoveTire={handleRemoveTireFromInventory}
              />
            </div>
          )}

          {/* Action Buttons */}
          {vehicle && (
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleUpdatePositions}
                disabled={isLoading || !hasChanges}
                className={`py-2 px-6 rounded-lg font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] flex items-center justify-center gap-2
                  ${hasChanges 
                    ? "bg-[#0A183A] text-white hover:bg-[#173D68]" 
                    : "bg-gray-400 text-white cursor-not-allowed"
                  } transition-colors duration-200`}
              >
                {isLoading ? (
                  <>
                    <Clock className="animate-spin h-5 w-5" />
                    <span>Guardando...</span>
                  </>
                ) : "Guardar Cambios"}
              </button>
              
              {hasChanges && (
                <button 
                  onClick={resetPositions}
                  disabled={isLoading}
                  className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancelar Cambios
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </DndProvider>
  );
};

export default Posicion;