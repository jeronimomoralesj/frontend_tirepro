import React, { useState, useRef, useEffect } from "react";
import { Search, Clock, AlertTriangle, Download, X, Package } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CroquisPdf from './croquisPdf';
// Types
interface Tire {
  id: string;
  marca: string;
  posicion?: number | null;
  position?: string | null;
}

interface Vehicle {
  id: string;
  placa: string;
  tipovhc?: string;
}

interface TireChange {
  id: string;
  marca: string;
  originalPosition: string | null;
  newPosition: string | null;
}

// Constants
const ItemTypes = { TIRE: "tire" };
const API_BASE = "https://api.tirepro.com.co/api";

// Utility Functions
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`
});

const getErrorMessage = (error: unknown): string => {
  return error?.response?.data?.message || error?.message || "Error desconocido";
};

// Hooks
const useApiCall = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

const apiCall = async (fn: () => Promise<unknown>) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      return await fn();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, success: success, setSuccess, apiCall };
};

// Components
const DraggableTire: React.FC<{ tire: Tire; isInventory?: boolean }> = ({ tire, isInventory = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.TIRE,
    item: { id: tire.id },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  useEffect(() => {
    if (ref.current) dragRef(ref.current);
  }, [dragRef]);

  return (
    <div
      ref={ref}
      className={`rounded-full border flex items-center justify-center text-white cursor-move shadow-md transition-all duration-200 hover:shadow-lg ${
        isInventory 
          ? "bg-gradient-to-br from-gray-500 to-gray-600" 
          : "bg-gradient-to-br from-[#1E76B6] to-[#348CCB]"
      }`}
      style={{ width: "80px", height: "80px", opacity: isDragging ? "0.5" : "1" }}
    >
      <div className="text-center">
        <div className="text-xs font-bold">{tire.marca}</div>
        {isInventory ? (
          <div className="text-xs">INV</div>
        ) : (
          <div className="text-xs">{tire.posicion}</div>
        )}
      </div>
    </div>
  );
};

const DropZone: React.FC<{
  onDrop: (tireId: string) => void;
  isOver?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ onDrop, children, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop: (item: { id: string }) => onDrop(item.id),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  useEffect(() => {
    if (ref.current) dropRef(ref.current);
  }, [dropRef]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-200 ${
        isOver ? "border-[#1E76B6] bg-[#348CCB]/10" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

const TirePosition: React.FC<{
  position: string;
  tire: Tire | null;
  onDrop: (tireId: string) => void;
}> = ({ position, tire, onDrop }) => (
  <DropZone
    onDrop={onDrop}
    className="rounded-full border-2 border-dashed flex items-center justify-center border-gray-300 bg-gray-50"
    style={{ width: "80px", height: "80px" }}
  >
    {tire ? (
      <DraggableTire tire={tire} />
    ) : (
      <div className="text-xs text-gray-500 font-medium">Pos {position}</div>
    )}
  </DropZone>
);

const TiresTray: React.FC<{ tires: Tire[]; title: string; isInventory?: boolean }> = ({ 
  tires, 
  title, 
  isInventory = false 
}) => (
  <div className={`p-4 rounded-lg border-l-4 mb-6 shadow-sm ${
    isInventory 
      ? "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-500"
      : "bg-gradient-to-r from-[#173D68]/10 to-[#348CCB]/10 border-[#1E76B6]"
  }`}>
    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
      isInventory ? "text-gray-700" : "text-[#0A183A]"
    }`}>
      {isInventory && <Package className="h-5 w-5" />}
      {title}
      <span className="text-sm font-normal">({tires.length})</span>
    </h3>
    <div className="flex flex-wrap gap-4">
      {tires.length > 0 ? (
        tires.map((tire) => (
          <DraggableTire key={tire.id} tire={tire} isInventory={isInventory} />
        ))
      ) : (
        <p className={`italic ${isInventory ? "text-gray-400" : "text-gray-500"}`}>
          {isInventory ? "No hay llantas en inventario" : "No hay llantas"}
        </p>
      )}
    </div>
  </div>
);

const VehicleAxis: React.FC<{
  axleIdx: number;
  positions: string[];
  tireMap: Record<string, Tire>;
  onTireDrop: (tireId: string, position: string) => void;
}> = ({ axleIdx, positions, tireMap, onTireDrop }) => {
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
              <TirePosition
                position={pos}
                tire={tireMap[pos] || null}
                onDrop={(tireId) => onTireDrop(tireId, pos)}
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
              <TirePosition
                position={pos}
                tire={tireMap[pos] || null}
                onDrop={(tireId) => onTireDrop(tireId, pos)}
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
  onTireDrop: (tireId: string, position: string) => void;
}> = ({ tires, onTireDrop }) => {
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
            onTireDrop={onTireDrop}
          />
        ))}
      </div>
    </div>
  );
};

const StatusMessage: React.FC<{ message: string; type: 'success' | 'error' }> = ({ message, type }) => (
  <div className={`mb-6 p-4 rounded-lg flex items-start border-l-4 ${
    type === 'success' 
      ? 'bg-green-50 border-green-500 text-green-700'
      : 'bg-red-50 border-red-500 text-red-700'
  }`}>
    {type === 'error' && <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />}
    <div className="flex-grow">{message}</div>
  </div>
);

const ExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  changes: TireChange[];
  vehicle: Vehicle | null;
}> = ({ isOpen, onClose, onExport, changes, vehicle }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Exportar Cambios</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <p className="mb-4">
          {changes.length} cambio(s) para <strong>{vehicle?.placa}</strong>
        </p>
        <div className="max-h-48 overflow-y-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Llanta</th>
                <th className="text-left">Orig.</th>
                <th className="text-left">Nueva</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i} className="border-t">
                  <td>{c.marca}</td>
                  <td>{c.originalPosition === "0" ? "Inventario" : c.originalPosition || "—"}</td>
                  <td>{c.newPosition === "0" ? "Inventario" : c.newPosition || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            No exportar
          </button>
          <button 
            onClick={onExport} 
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-1"
          >
            <Download /> Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const Posicion = () => {
  const [placa, setPlaca] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allTires, setAllTires] = useState<Tire[]>([]);
  const [originalState, setOriginalState] = useState<Record<string, string | null>>({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [tireChanges, setTireChanges] = useState<TireChange[]>([]);
  const [pdfGenerator, setPdfGenerator] = useState<{ generatePDF: () => void } | null>(null);
  const { loading, error, success, setSuccess, apiCall } = useApiCall();

  // Computed states
  const assignedTires = allTires.filter(t => t.position && t.position !== "0");
  const inventoryTires = allTires.filter(t => t.position === "0");
  const availableTires = allTires.filter(t => !t.position);
  const hasChanges = allTires.some(t => (t.position || null) !== originalState[t.id]);


  // Create PDF generator instance
React.useEffect(() => {
  if (vehicle && allTires.length > 0) {
    const croquisPdf = CroquisPdf({ 
  vehicle, 
  changes: calculateChanges(), 
  allTires 
});
    setPdfGenerator(croquisPdf);
  }
}, [vehicle, allTires, originalState]);

  const calculateChanges = (): TireChange[] => {
    return allTires
      .map(t => ({
        id: t.id,
        marca: t.marca,
        originalPosition: originalState[t.id] || null,
        newPosition: t.position || null,
      }))
      .filter(c => c.originalPosition !== c.newPosition);
  };

  const handleSearch = async () => {
    if (!placa.trim()) return;

    await apiCall(async () => {
      const vehicleResponse = await fetch(`${API_BASE}/vehicles/placa?placa=${placa}`, {
        headers: getAuthHeaders()
      });
      const vehicleData = await vehicleResponse.json();
      
      if (!vehicleData) throw new Error("No se encontró un vehículo con esta placa.");
      
      setVehicle(vehicleData);
      
      const tiresResponse = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicleData.id}`, {
        headers: getAuthHeaders()
      });
      const tiresData = await tiresResponse.json();
      
      if (!tiresData.length) throw new Error("No se encontraron llantas asociadas a este vehículo.");

      const processedTires = tiresData.map((tire: Tire) => ({
        ...tire,
        position: tire.posicion === 0 ? "0" : tire.posicion ? tire.posicion.toString() : null
      }));

      const originalStateMap: Record<string, string | null> = {};
      processedTires.forEach((tire: Tire) => {
        originalStateMap[tire.id] = tire.position || null;
      });

      setAllTires(processedTires);
      setOriginalState(originalStateMap);
    });
  };

  const moveTire = (tireId: string, newPosition: string) => {
    setAllTires(prevTires => {
      const updatedTires = [...prevTires];
      const tireIndex = updatedTires.findIndex(t => t.id === tireId);
      
      if (tireIndex === -1) return prevTires;

      // Handle position swapping (only for non-inventory positions)
      if (newPosition !== "none" && newPosition !== "0") {
        const existingTireIndex = updatedTires.findIndex(t => t.position === newPosition);
        if (existingTireIndex !== -1) {
          updatedTires[existingTireIndex].position = null;
          updatedTires[existingTireIndex].posicion = null;
        }
      }

      // Update tire position
      if (newPosition === "none") {
        updatedTires[tireIndex].position = null;
        updatedTires[tireIndex].posicion = null;
      } else if (newPosition === "0") {
        updatedTires[tireIndex].position = "0";
        updatedTires[tireIndex].posicion = 0;
      } else {
        updatedTires[tireIndex].position = newPosition;
        updatedTires[tireIndex].posicion = parseInt(newPosition);
      }

      return updatedTires;
    });
  };

  const handleUpdatePositions = async () => {
    await apiCall(async () => {
      const updates: Record<string, string> = {};
      
      // Include assigned tires (position > 0)
      assignedTires.forEach(tire => {
        if (tire.position) updates[tire.position] = tire.id;
      });
      
      // Include inventory tires (position = 0)
      inventoryTires.forEach(tire => {
        updates["0"] = tire.id; // This will handle multiple inventory tires
      });

      const response = await fetch(`${API_BASE}/tires/update-positions`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa, updates })
      });

      if (!response.ok) throw new Error('Error al actualizar posiciones');

      const updatedOriginalState: Record<string, string | null> = {};
      allTires.forEach(tire => {
        updatedOriginalState[tire.id] = tire.position || null;
      });
      
      setOriginalState(updatedOriginalState);
      setSuccess("Posiciones actualizadas exitosamente.");
      
      const changes = calculateChanges();
      setTireChanges(changes);
      setIsExportModalOpen(true);
    });
  };
const generateFancyPDF = () => {
  if (pdfGenerator) {
    pdfGenerator.generatePDF();
    setIsExportModalOpen(false);
  } else {
    console.error('PDF generator not initialized');
  }
};

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-white">
        <header className="bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-4 md:p-6 shadow-md">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold">
              Asignar Posiciones de Llantas
            </h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {success && <StatusMessage message={success} type="success" />}
          {error && <StatusMessage message={error} type="error" />}

          {/* Search */}
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
            </div>
          </div>

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
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">Total Llantas:</span> 
                  {allTires.length}
                </p>
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">Asignadas:</span> 
                  {assignedTires.length}
                </p>
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">Inventario:</span> 
                  {inventoryTires.length}
                </p>
              </div>
            </div>
          )}

          {/* Available Tires */}
          {availableTires.length > 0 && (
            <TiresTray tires={availableTires} title="Llantas Disponibles" />
          )}

          {/* Inventory Tires */}
          {inventoryTires.length > 0 && (
            <TiresTray tires={inventoryTires} title="Llantas en Inventario" isInventory={true} />
          )}

          {/* Vehicle Visualization */}
          {vehicle && allTires.length > 0 && (
            <VehicleVisualization 
              tires={allTires}
              onTireDrop={moveTire}
            />
          )}

          {/* Inventory Zone */}
          {vehicle && (
            <DropZone
              onDrop={(tireId) => moveTire(tireId, "0")}
              className="p-6 rounded-lg border-2 border-dashed border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100 min-h-[12rem] mb-6 hover:border-gray-500 transition-colors"
            >
              <div className="text-center text-gray-600 flex flex-col items-center gap-2">
                <Package className="h-8 w-8 text-gray-400" />
                <div className="font-medium">Zona de Inventario</div>
                <div className="text-sm">Arrastra aquí las llantas para enviarlas a inventario</div>
                <div className="text-xs text-gray-500">Las llantas en inventario tendrán posición 0</div>
              </div>
            </DropZone>
          )}

          {/* Available Tires Zone */}
          {vehicle && (
            <DropZone
              onDrop={(tireId) => moveTire(tireId, "none")}
              className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 min-h-[8rem] mb-6"
            >
              <div className="text-center text-gray-500">
                Zona de Llantas Disponibles - Arrastra aquí las llantas sin asignar
              </div>
            </DropZone>
          )}

          {/* Action Buttons */}
          {vehicle && (
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleUpdatePositions}
                disabled={loading || !hasChanges}
                className={`py-2 px-6 rounded-lg font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] flex items-center justify-center gap-2 transition-colors duration-200 ${
                  hasChanges 
                    ? "bg-[#0A183A] text-white hover:bg-[#173D68]" 
                    : "bg-gray-400 text-white cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <Clock className="animate-spin h-5 w-5" />
                    <span>Guardando...</span>
                  </>
                ) : "Guardar Cambios"}
              </button>
              
              {hasChanges && (
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancelar Cambios
                </button>
              )}
            </div>
          )}
        </main>

        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
onExport={() => {
  generateFancyPDF();
  setIsExportModalOpen(false);
}}
          changes={tireChanges}
          vehicle={vehicle}
        />
      </div>
    </DndProvider>
  );
};

export default Posicion;