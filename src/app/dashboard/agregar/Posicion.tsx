import React, { useState } from "react";
import axios from "axios";
import { Package, Search, ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useRouter } from "next/navigation";

// DND Item Types
const ItemTypes = {
  TIRE: "tire"
};

interface Tire {
  id: string;
  marca: string;
  posicion?: number | null;
}

interface DraggableTireProps {
  tire: Tire;
}

const DraggableTire: React.FC<DraggableTireProps> = ({ tire }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TIRE,
    item: { id: tire.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className="rounded-full border flex items-center justify-center bg-gradient-to-br from-[#1E76B6] to-[#348CCB] text-white cursor-move shadow-md transition-all duration-200 hover:shadow-lg"
      style={{ 
        width: "80px", 
        height: "80px",
        opacity: isDragging ? "0.5" : "1"
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
const TirePosition = ({ position, currentTire, moveTire }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop: (item) => moveTire(item.id, position),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200
      ${isOver ? "border-[#1E76B6] bg-[#348CCB]/10" : "border-gray-300"}
      ${currentTire ? "border-[#1E76B6] bg-[#348CCB]/10" : "bg-gray-50"}`}
      style={{ width: "80px", height: "80px" }}
    >
      {currentTire ? (
        <DraggableTire tire={currentTire} />
      ) : (
        <div className="text-xs text-gray-500 font-medium">Pos {position}</div>
      )}
    </div>
  );
};

// Inventory Drop Zone
const InventoryDropZone = ({ moveTire, inventoryTires, onRemoveTire }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop: (item) => moveTire(item.id, "none"),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div 
      ref={drop}
      className={`p-4 rounded-lg border-2 border-dashed transition-all duration-200 min-h-[10rem]
        ${isOver ? "border-[#1E76B6] bg-[#348CCB]/10" : "border-gray-300 bg-gray-50"}`}
    >
      <div className="flex items-center mb-3">
        <Package className="w-5 h-5 mr-2 text-[#1E76B6]" />
        <h3 className="text-lg font-semibold text-[#1E76B6]">Inventario</h3>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {inventoryTires.length > 0 ? (
          inventoryTires.map((tire) => (
            <div key={tire.id} className="relative">
              <DraggableTire tire={tire} />
              <button 
                onClick={() => onRemoveTire(tire.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                title="Quitar del inventario"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">Arrastre llantas aquí para almacenarlas</p>
        )}
      </div>
    </div>
  );
};

// Available Tires Tray Component
const TiresTray = ({ availableTires }) => {
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

// Improved Vehicle Visualization Component
const VehicleVisualization = ({ config, assignedTires, moveTire }) => {
  // Create a map of positions to tires for easier access
  const positionMap = {};
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
                      currentTire={positionMap[position]}
                      moveTire={moveTire}
                    />
                    {position < axis[axis.length / 2 - 1] && (
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
                      currentTire={positionMap[position]}
                      moveTire={moveTire}
                    />
                    {position < axis[axis.length - 1] && (
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
  const router = useRouter();
  const [placa, setPlaca] = useState("");
  const [vehicle, setVehicle] = useState(null);
  const [tires, setTires] = useState([]);
  const [assignedTires, setAssignedTires] = useState([]);
  const [availableTires, setAvailableTires] = useState([]);
  const [inventoryTires, setInventoryTires] = useState([]);
  const [vehicleConfig, setVehicleConfig] = useState(null);
  const [positions, setPositions] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [originalState, setOriginalState] = useState({});

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
        `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/vehicles/placa`,
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
        `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires/vehicle`,
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
      const assignedTiresArray = [];
      const availableTiresArray = [];
      const positionTracker = {};
      
      tiresResponse.data.forEach(tire => {
        const position = tire.posicion ? tire.posicion.toString() : null;
        
        if (position && !positionTracker[position]) {
          positionTracker[position] = tire.id;
          assignedTiresArray.push({ ...tire, position });
        } else {
          availableTiresArray.push({ ...tire, position: null });
        }
      });

      // Determine all possible position numbers
      const allPositionNumbers = tiresResponse.data
        .filter(t => t.posicion)
        .map(t => parseInt(t.posicion));
      
      const maxPosition = Math.max(...allPositionNumbers, 6); // At least 6 positions
      const allPositions = Array.from({ length: maxPosition }, (_, i) => (i + 1).toString());
      setPositions(allPositions);

      // Store original state for change detection
      const originalStateMap = {};
      [...assignedTiresArray, ...availableTiresArray].forEach(tire => {
        originalStateMap[tire.id] = tire.position;
      });
      
      setOriginalState(originalStateMap);
      setAssignedTires(assignedTiresArray);
      setAvailableTires(availableTiresArray);
      
      // Generate vehicle configuration
      const vehicleConfig = getVehicleConfig(vehicleResponse.data, tiresResponse.data.length);
      setVehicleConfig(vehicleConfig);
      
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage("Error al buscar los datos: " + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Determine vehicle configuration based on vehicle type and tire count
  const getVehicleConfig = (vehicle, tireCount) => {
    if (!vehicle) return null;

    const tipovhc = vehicle.tipovhc || "";
    
    // Extract axis count from vehicle type
    const axisMatch = tipovhc.match(/(\d+)_ejes/);
    const axisCount = axisMatch ? parseInt(axisMatch[1]) : 2; // Default to 2 axes
    
    const config = {
      axisCount,
      layout: []
    };

    // For 2 axis vehicles
    if (axisCount === 2) {
      if (tireCount <= 4) {
        // One tire per side on each axis
        config.layout = [
          [1, 2], // First axis: positions 1,2
          [3, 4]  // Second axis: positions 3,4
        ];
      } else if (tireCount <= 6) {
        // First axis: 1 per side, Second axis: 2 per side
        config.layout = [
          [1, 2],             // First axis: positions 1,2
          [3, 4, 5, 6]        // Second axis: positions 3,4,5,6
        ];
      } else {
        // 2 per side on both axes
        config.layout = [
          [1, 2, 3, 4],       // First axis: positions 1,2,3,4
          [5, 6, 7, 8]        // Second axis: positions 5,6,7,8
        ];
      }
    } 
    // For 3 axis vehicles
    else if (axisCount === 3) {
      if (tireCount <= 6) {
        // One tire per side on each axis
        config.layout = [
          [1, 2],             // First axis: positions 1,2
          [3, 4],             // Second axis: positions 3,4
          [5, 6]              // Third axis: positions 5,6
        ];
      } else if (tireCount <= 8) {
        // 1 per side on first two axes, 2 per side on third
        config.layout = [
          [1, 2],             // First axis: positions 1,2
          [3, 4],             // Second axis: positions 3,4
          [5, 6, 7, 8]        // Third axis: positions 5,6,7,8
        ];
      } else if (tireCount <= 10) {
        // 1 per side on first axis, 2 per side on second and third
        config.layout = [
          [1, 2],             // First axis: positions 1,2
          [3, 4, 5, 6],       // Second axis: positions 3,4,5,6
          [7, 8, 9, 10]       // Third axis: positions 7,8,9,10
        ];
      } else {
        // 2 per side on all axes
        config.layout = [
          [1, 2, 3, 4],       // First axis: positions 1,2,3,4
          [5, 6, 7, 8],       // Second axis: positions 5,6,7,8
          [9, 10, 11, 12]     // Third axis: positions 9,10,11,12
        ];
      }
    }
    
    return config;
  };

  // Move tire to new position, handle replacement if needed
  const moveTire = (tireId, newPosition) => {
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
      newAssignedTires.push(tireToMove);
    }
    
    // 4. Update state
    setAssignedTires(newAssignedTires);
    setAvailableTires(newAvailableTires);
    setInventoryTires(newInventoryTires);
    
    // 5. Check for changes
    const currentState = {};
    [...newAssignedTires, ...newAvailableTires, ...newInventoryTires].forEach(tire => {
      currentState[tire.id] = tire.position;
    });
    
    const hasAnyChanges = Object.keys(currentState).some(id => 
      currentState[id] !== originalState[id]
    );
    
    setHasChanges(hasAnyChanges);
  };

  // Remove tire from inventory
  const handleRemoveTireFromInventory = (tireId) => {
    const tireToMove = inventoryTires.find(t => t.id === tireId);
    if (!tireToMove) return;
    
    const newInventoryTires = inventoryTires.filter(t => t.id !== tireId);
    const newAvailableTires = [...availableTires, { ...tireToMove, position: null }];
    
    setInventoryTires(newInventoryTires);
    setAvailableTires(newAvailableTires);
    
    // Check for changes
    const currentState = {};
    [...assignedTires, ...newAvailableTires, ...newInventoryTires].forEach(tire => {
      currentState[tire.id] = tire.position;
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

      const updates = {};
      
      // Process assigned tires
      assignedTires.forEach(tire => {
        if (tire.position) {
          updates[tire.position] = tire.id;
        }
      });

      await axios.post(
        "http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires/update-positions",
        { 
          placa,
          updates
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update original state after successful save
      const updatedOriginalState = {};
      [...assignedTires, ...availableTires, ...inventoryTires].forEach(tire => {
        updatedOriginalState[tire.id] = tire.position;
      });
      
      setOriginalState(updatedOriginalState);
      setHasChanges(false);
      setSuccessMessage("Posiciones actualizadas exitosamente.");
    } catch (error) {
      console.error("Error updating positions:", error);
      setErrorMessage("Error al actualizar posiciones: " + (error.response?.data?.message || error.message));
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
              <ArrowLeft 
                className="mr-4 cursor-pointer hover:text-[#348CCB] transition-colors" 
                onClick={() => router.back()}
              />
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
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
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