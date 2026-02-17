import React, { useState, useRef, useEffect } from "react";
import { Search, Clock, AlertTriangle, Download, X, Package } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CroquisPdf from './croquisPdf';

// Types
interface Tire {
  id: string;
  marca: string;
  diseno: string;
  posicion?: number | null;
  position?: string | null;
  inspecciones?: any[];
  vida?: any[];
  vehicleId?: string | null;
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

interface Translation {
  title: string;
  searchVehicle: string;
  enterPlate: string;
  search: string;
  searching: string;
  vehicleData: string;
  plate: string;
  type: string;
  totalTires: string;
  assigned: string;
  inventory: string;
  availableTires: string;
  inventoryTires: string;
  tireConfig: string;
  axis: string;
  pos: string;
  inventoryZone: string;
  dragToInventory: string;
  inventoryPos: string;
  availableZone: string;
  saveChanges: string;
  saving: string;
  cancelChanges: string;
  exportChanges: string;
  changesFor: string;
  tire: string;
  orig: string;
  new: string;
  noExport: string;
  exportPDF: string;
  noTires: string;
  noInventoryTires: string;
  noVehicleFound: string;
  noTiresFound: string;
  positionsUpdated: string;
  updateError: string;
  unknownError: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Language translations
const translations: Record<'es', Translation> = {
  es: {
    title: "Asignar Posiciones de Llantas",
    searchVehicle: "Buscar Vehículo",
    enterPlate: "Ingrese placa del vehículo",
    search: "Buscar",
    searching: "Buscando...",
    vehicleData: "Datos del Vehículo",
    plate: "Placa:",
    type: "Tipo:",
    totalTires: "Total Llantas:",
    assigned: "Asignadas:",
    inventory: "Inventario:",
    availableTires: "Llantas Disponibles",
    inventoryTires: "Llantas en Inventario",
    tireConfig: "Configuración de Llantas",
    axis: "Eje",
    pos: "Pos",
    inventoryZone: "Zona de Inventario",
    dragToInventory: "Arrastra aquí las llantas para enviarlas a inventario",
    inventoryPos: "Las llantas en inventario tendrán posición 0",
    availableZone: "Zona de Llantas Disponibles - Arrastra aquí las llantas sin asignar",
    saveChanges: "Guardar Cambios",
    saving: "Guardando...",
    cancelChanges: "Cancelar Cambios",
    exportChanges: "Exportar Cambios",
    changesFor: "cambio(s) para",
    tire: "Llanta",
    orig: "Orig.",
    new: "Nueva",
    noExport: "No exportar",
    exportPDF: "Exportar PDF",
    noTires: "No hay llantas",
    noInventoryTires: "No hay llantas en inventario",
    noVehicleFound: "No se encontró un vehículo con esta placa.",
    noTiresFound: "No se encontraron llantas asociadas a este vehículo.",
    positionsUpdated: "Posiciones actualizadas exitosamente.",
    updateError: "Error al actualizar posiciones",
    unknownError: "Error desconocido"
  },
};

// Constants
const ItemTypes = { TIRE: "tire" };
const API_BASE = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api`
      : `https://api.tirepro.com.co/api`;

// Utility Functions
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`
});

const getErrorMessage = (error: unknown): string => {
  const apiError = error as ApiError;
  return apiError?.response?.data?.message || apiError?.message || "Error desconocido";
};

const fetchInventoryTires = async (companyId: string): Promise<Tire[]> => {
  try {
    const response = await fetch(
      `${API_BASE}/tires?companyId=${companyId}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      console.error("fetchInventoryTires: HTTP", response.status);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("fetchInventoryTires: expected array, got", typeof data, data);
      return [];
    }
    return data.filter((t: any) => {
      const vida = Array.isArray(t.vida) ? t.vida : [];
      const lastVida = vida.length ? vida[vida.length - 1]?.valor?.toLowerCase() : null;
      return !t.vehicleId && lastVida !== 'fin';
    });
  } catch (err) {
    console.error("fetchInventoryTires error:", err);
    return [];
  }
};

const getMinDepth = (tire: Tire): string => {
  const inspections = tire.inspecciones || [];
  if (!inspections.length) return "Nueva";
  const last = inspections[inspections.length - 1];
  const min = Math.min(
    last.profundidadInt ?? Infinity,
    last.profundidadCen ?? Infinity,
    last.profundidadExt ?? Infinity
  );
  return min === Infinity ? "Nueva" : `${min}mm`;
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

  return { loading, error, success, setSuccess, apiCall };
};

// Components
const DraggableTire: React.FC<{ tire: Tire; isInventory?: boolean; t: Translation }> = ({ tire, isInventory = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.TIRE,
    item: { id: tire.id },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [tire.id]); // 👈 dependency array is critical

  useEffect(() => {
    if (ref.current) dragRef(ref.current);
  }, [dragRef]);

  useEffect(() => {
  if (isDragging) setHovered(false);
}, [isDragging]);

  return (
    <div
  ref={ref}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  className={`relative rounded-full border flex items-center justify-center text-white cursor-move shadow-md transition-all duration-200 hover:shadow-lg ${
    isInventory
      ? "bg-gradient-to-br from-gray-500 to-gray-600"
      : "bg-gradient-to-br from-[#1E76B6] to-[#348CCB]"
  }`}
  style={{ width: "80px", height: "80px", opacity: isDragging ? 0.5 : 1 }}
>
  {hovered && (
  <div style={{ display: isDragging ? "none" : "block" }}>
    <TireTooltip tire={tire} />
  </div>
)}
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

const TireTooltip: React.FC<{ tire: Tire }> = ({ tire }) => {
  const inspections = tire.inspecciones || [];
  const lastInsp = inspections.length ? inspections[inspections.length - 1] : null;
  const vida = Array.isArray(tire.vida) && tire.vida.length
    ? (tire.vida[tire.vida.length - 1] as any)?.valor
    : null;
  const costo = Array.isArray(tire.costo) && tire.costo.length
    ? (tire.costo[tire.costo.length - 1] as any)?.valor
    : null;

  return (
    <div className="absolute z-50 bottom-[110%] left-1/2 -translate-x-1/2 w-56 bg-[#0A183A] text-white text-xs rounded-xl shadow-2xl p-3 pointer-events-none">
      {/* Arrow */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#0A183A]" />

      <div className="font-bold text-sm text-[#348CCB] mb-2 truncate">{tire.marca} — {tire.diseno}</div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span className="text-gray-400">Dimensión</span>
        <span className="truncate">{tire.dimension || "—"}</span>

        <span className="text-gray-400">Eje</span>
        <span>{tire.eje || "—"}</span>

        <span className="text-gray-400">Vida</span>
        <span className="capitalize">{vida || "—"}</span>

        <span className="text-gray-400">Costo</span>
        <span>{costo ? `$${costo.toLocaleString()}` : "—"}</span>

        <span className="text-gray-400">Km Rec.</span>
        <span>{tire.kilometrosRecorridos ? `${tire.kilometrosRecorridos.toLocaleString()} km` : "—"}</span>
      </div>

      {lastInsp && (
        <>
          <div className="border-t border-white/20 my-2" />
          <div className="text-[#348CCB] font-semibold mb-1">Última Inspección</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <span className="text-gray-400">Prof. Int</span>
            <span>{lastInsp.profundidadInt ?? "—"}mm</span>

            <span className="text-gray-400">Prof. Cen</span>
            <span>{lastInsp.profundidadCen ?? "—"}mm</span>

            <span className="text-gray-400">Prof. Ext</span>
            <span>{lastInsp.profundidadExt ?? "—"}mm</span>

            <span className="text-gray-400">CPK</span>
            <span>{lastInsp.cpk ? `$${lastInsp.cpk.toFixed(2)}` : "—"}</span>

            <span className="text-gray-400">KM Est.</span>
            <span>{lastInsp.kilometrosEstimados ? `${lastInsp.kilometrosEstimados.toLocaleString()}` : "—"}</span>

            <span className="text-gray-400">Fecha</span>
            <span>{lastInsp.fecha ? new Date(lastInsp.fecha).toLocaleDateString() : "—"}</span>
          </div>
        </>
      )}

      {!lastInsp && (
        <div className="text-gray-400 italic mt-1">Sin inspecciones registradas</div>
      )}
    </div>
  );
};

const CompanyInventoryTire: React.FC<{ tire: Tire }> = ({ tire }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.TIRE,
    item: { id: tire.id },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [tire.id]); // 👈 missing in your current code

  useEffect(() => {
    if (ref.current) dragRef(ref.current);
  }, [dragRef]);

  // Hide tooltip as soon as drag starts
  useEffect(() => {
    if (isDragging) setHovered(false);
  }, [isDragging]);

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="relative flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl p-3 w-24 h-24 cursor-move shadow-md hover:shadow-lg transition-all"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && !isDragging && <TireTooltip tire={tire} />}
      <div className="text-xs font-bold truncate w-full text-center">{tire.marca}</div>
      <div className="text-xs truncate w-full text-center opacity-80">{tire.diseno}</div>
      <div className="text-xs mt-1 font-semibold">{getMinDepth(tire)}</div>
    </div>
  );
};

const DropZone: React.FC<{
  onDrop: (tireId: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ onDrop, children, className = "", style }) => {
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
    <div ref={ref} style={style} className={`transition-all duration-200 ${isOver ? "border-[#1E76B6] bg-[#348CCB]/10" : ""} ${className}`}>
      {children}
    </div>
  );
};

const TirePosition: React.FC<{
  position: string;
  tire: Tire | null;
  onDrop: (tireId: string) => void;
  t: Translation;
}> = ({ position, tire, onDrop, t }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TIRE,
    drop: (item: { id: string }) => {
      // Don't re-drop onto itself
      if (item.id !== tire?.id) onDrop(item.id);
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }), [tire?.id, onDrop]);

  useEffect(() => {
    if (ref.current) dropRef(ref.current);
  }, [dropRef]);

  return (
    <div
      ref={ref}
      className={`rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
        isOver ? "border-[#1E76B6] bg-[#348CCB]/10" : "border-gray-300 bg-gray-50"
      }`}
      style={{ width: "80px", height: "80px" }}
    >
      {tire ? (
        // ✅ No pointer-events wrapper here — tire is fully interactive
        <DraggableTire tire={tire} t={t} />
      ) : (
        <div className="text-xs text-gray-500 font-medium pointer-events-none">
          {t.pos} {position}
        </div>
      )}
    </div>
  );
};

const TiresTray: React.FC<{ tires: Tire[]; title: string; isInventory?: boolean; t: Translation }> = ({
  tires,
  title,
  isInventory = false,
  t
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
          <DraggableTire key={tire.id} tire={tire} isInventory={isInventory} t={t} />
        ))
      ) : (
        <p className={`italic ${isInventory ? "text-gray-400" : "text-gray-500"}`}>
          {isInventory ? t.noInventoryTires : t.noTires}
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
  t: Translation;
}> = ({ axleIdx, positions, tireMap, onTireDrop, t }) => {
  const middleIndex = Math.ceil(positions.length / 2);
  const leftTires = positions.slice(0, middleIndex);
  const rightTires = positions.slice(middleIndex);

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-medium text-[#173D68] mb-2">{t.axis} {axleIdx + 1}</div>
      <div className="flex items-center justify-center w-full">
        <div className="h-4 w-3 bg-[#0A183A] rounded-l-lg" />

        <div className="flex items-center">
          {leftTires.map(pos => (
            <div key={pos} className="m-1 flex flex-col items-center">
              <TirePosition
                position={pos}
                tire={tireMap[pos] || null}
                onDrop={(tireId) => onTireDrop(tireId, pos)}
                t={t}
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
                t={t}
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
  t: Translation;
}> = ({ tires, onTireDrop, t }) => {
  const layout = React.useMemo(() => {
    const activeTires = tires.filter(t => t.position && t.position !== "0");
    const count = activeTires.length || 0;

    // Default: 2 axles, 2 tires total (1 per axle)
    if (count === 0) {
      return [["1"], ["2"]];
    }

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
      <h3 className="text-lg font-semibold mb-1 text-[#0A183A]">
        {t.tireConfig} ({layout.length} eje{layout.length > 1 ? 's' : ''})
      </h3>
      {tires.filter(t => t.position && t.position !== "0").length === 0 && (
        <p className="text-sm text-[#1E76B6] mb-4 italic">
          Diagrama por defecto — arrastra llantas a las posiciones para asignarlas.
        </p>
      )}
      <div className="flex flex-col gap-8">
        {layout.map((positions, idx) => (
          <VehicleAxis
            key={idx}
            axleIdx={idx}
            positions={positions}
            tireMap={tireMap}
            onTireDrop={onTireDrop}
            t={t}
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
  t: Translation;
}> = ({ isOpen, onClose, onExport, changes, vehicle, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{t.exportChanges}</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <p className="mb-4">
          {changes.length} {t.changesFor} <strong>{vehicle?.placa}</strong>
        </p>
        <div className="max-h-48 overflow-y-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">{t.tire}</th>
                <th className="text-left">{t.orig}</th>
                <th className="text-left">{t.new}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i} className="border-t">
                  <td>{c.marca}</td>
                  <td>{c.originalPosition === "0" ? t.inventory : c.originalPosition || "—"}</td>
                  <td>{c.newPosition === "0" ? t.inventory : c.newPosition || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            {t.noExport}
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-1"
          >
            <Download /> {t.exportPDF}
          </button>
        </div>
      </div>
    </div>
  );
};

// Company Inventory Modal — receives onClose and the tire list only; dragging works via DnD context
const CompanyInventoryModal: React.FC<{
  tires: Tire[];
  onClose: () => void;
}> = ({ tires, onClose }) => {
  const [search, setSearch] = useState("");
  const filtered = tires.filter(t =>
    t.marca.toLowerCase().includes(search.toLowerCase()) ||
    t.diseno.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#0A183A]">
            Inventario de Llantas ({tires.length})
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X />
          </button>
        </div>
        <input
          type="text"
          placeholder="Filtrar por marca o referencia..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
        />
        <div className="flex flex-wrap gap-3 max-h-96 overflow-y-auto">
          {filtered.map(tire => (
            <CompanyInventoryTire key={tire.id} tire={tire} />
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-400 italic">No se encontraron llantas.</p>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Arrastra una llanta al diagrama del vehículo para asignarla.
        </p>
      </div>
    </div>
  );
};

// Main Component
const Posicion = () => {
  const [language] = useState<'es'>('es');
  const [placa, setPlaca] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allTires, setAllTires] = useState<Tire[]>([]);
  const [originalState, setOriginalState] = useState<Record<string, string | null>>({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [tireChanges, setTireChanges] = useState<TireChange[]>([]);
  const [pdfGenerator, setPdfGenerator] = useState<{ generatePDF: () => void } | null>(null);

  // Company inventory state — lives here so handleVehicleDrop can access it
  const [companyInventory, setCompanyInventory] = useState<Tire[]>([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  const { loading, error, success, setSuccess, apiCall } = useApiCall();

  const t = translations[language];

  // Computed states
  const assignedTires = allTires.filter(t => t.position && t.position !== "0");
  const availableTires = allTires.filter(t => !t.position);
  const hasChanges = (() => {
    // Changed if any tire moved position
    const positionChanged = allTires.some(t => (t.position || null) !== originalState[t.id]);
    // Changed if any tire was removed from allTires (unassigned)
    const tireRemoved = Object.keys(originalState).some(id => !allTires.find(t => t.id === id));
    // Changed if any tire was added from company inventory
    const tireAdded = allTires.some(t => originalState[t.id] === null && t.position);
    return positionChanged || tireRemoved || tireAdded;
  })();

  // Fetch company inventory on mount — reads user object from localStorage same as dashboard
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const companyId = user?.companyId;
      if (!companyId) {
        console.warn("No companyId found in user object");
        return;
      }
      fetchInventoryTires(companyId)
        .then(setCompanyInventory)
        .catch(console.error);
    } catch (e) {
      console.error("Error reading user from localStorage", e);
    }
  }, []);

  // PDF generator
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

      if (!vehicleData) throw new Error(t.noVehicleFound);

      setVehicle(vehicleData);

      const tiresResponse = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicleData.id}`, {
        headers: getAuthHeaders()
      });
      const tiresRaw = await tiresResponse.json();
      const tiresData = Array.isArray(tiresRaw) ? tiresRaw : [];

      if (!tiresData.length) {
        setAllTires([]);
        setOriginalState({});
        return;
      }

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

  // Move a tire that's already in allTires
  const moveTire = (tireId: string, newPosition: string) => {
    setAllTires(prevTires => {
      const updatedTires = [...prevTires];
      const tireIndex = updatedTires.findIndex(t => t.id === tireId);

      if (tireIndex === -1) return prevTires;

      if (newPosition !== "none" && newPosition !== "0") {
        const existingTireIndex = updatedTires.findIndex(t => t.position === newPosition);
        if (existingTireIndex !== -1) {
          updatedTires[existingTireIndex] = { ...updatedTires[existingTireIndex], position: null, posicion: null };
        }
      }

      if (newPosition === "none") {
        updatedTires[tireIndex] = { ...updatedTires[tireIndex], position: null, posicion: null };
      } else if (newPosition === "0") {
        updatedTires[tireIndex] = { ...updatedTires[tireIndex], position: "0", posicion: 0 };
      } else {
        updatedTires[tireIndex] = { ...updatedTires[tireIndex], position: newPosition, posicion: parseInt(newPosition) };
      }

      return updatedTires;
    });
  };

  // Unified drop handler — handles both vehicle-owned tires and company inventory tires
  const handleDrop = (tireId: string, newPosition: string) => {
    const isCompanyTire = companyInventory.find(t => t.id === tireId);

    if (newPosition === "none") {
      // Tire is being unassigned — remove from allTires and return to company inventory
      const tire = allTires.find(t => t.id === tireId) || isCompanyTire;
      if (tire) {
        setAllTires(prev => prev.filter(t => t.id !== tireId));
        setCompanyInventory(prev => {
          // Avoid duplicates if it was already there
          if (prev.find(t => t.id === tireId)) return prev;
          return [...prev, { ...tire, position: null, posicion: null, vehicleId: null }];
        });
        // Track this as a change: original had a position, now it's gone
        setOriginalState(prev => {
          if (prev[tireId] === undefined) return prev; // was a company tire all along, no change needed
          return { ...prev };
        });
      }
      return;
    }

    if (isCompanyTire) {
      // Move tire from company inventory into this vehicle's tire list
      const posicion = newPosition === "0" ? 0 : parseInt(newPosition);
      const position = newPosition;

      setAllTires(prev => {
        // If a tire already occupies the target position, bump it back to company inventory
        const bumped = prev.find(t => t.position === newPosition && newPosition !== "0");
        const updated = prev.map(t =>
          t.position === newPosition && newPosition !== "0"
            ? { ...t, position: null, posicion: null }
            : t
        );
        if (bumped) {
          setCompanyInventory(ci => {
            if (ci.find(t => t.id === bumped.id)) return ci;
            return [...ci, { ...bumped, position: null, posicion: null, vehicleId: null }];
          });
        }
        return [...updated, { ...isCompanyTire, position, posicion }];
      });

      setCompanyInventory(prev => prev.filter(t => t.id !== tireId));
      setOriginalState(prev => ({ ...prev, [tireId]: null }));
    } else {
      moveTire(tireId, newPosition);
    }
  };

  const handleUpdatePositions = async () => {
    await apiCall(async () => {
      if (!vehicle) throw new Error(t.updateError);

      // Tires that were originally part of this vehicle but are no longer in allTires
      // (they were dragged to the unassign zone) — we need to clear their vehicleId on backend
      const originalTireIds = Object.keys(originalState);
      const currentTireIds = new Set(allTires.map(t => t.id));
      const unassignedTireIds = originalTireIds.filter(
        id => originalState[id] !== undefined && !currentTireIds.has(id)
      );

      // Step 1: Unassign removed tires from vehicle on backend
      if (unassignedTireIds.length > 0) {
        const unassignResponse = await fetch(`${API_BASE}/tires/unassign-vehicle`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ tireIds: unassignedTireIds })
        });
        if (!unassignResponse.ok) {
          const errData = await unassignResponse.json().catch(() => ({}));
          console.warn("unassign-vehicle failed:", errData);
        }
      }

      // Step 2: Assign any new tires (from company inventory) to this vehicle
      const externalTires = allTires.filter(
        tire => !tire.vehicleId || tire.vehicleId !== vehicle.id
      );

      if (externalTires.length > 0) {
        const assignResponse = await fetch(`${API_BASE}/tires/assign-vehicle`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehiclePlaca: placa,
            tireIds: externalTires.map(t => t.id)
          })
        });
        if (!assignResponse.ok) {
          const errData = await assignResponse.json().catch(() => ({}));
          console.warn("assign-vehicle failed:", errData);
        } else {
          setAllTires(prev =>
            prev.map(tire =>
              externalTires.find(e => e.id === tire.id)
                ? { ...tire, vehicleId: vehicle.id }
                : tire
            )
          );
        }
      }

      // Step 3: Build updates map — only assigned tires with a real position
      const updates: Record<string, string> = {};
      allTires.filter(t => t.position && t.position !== "0").forEach(tire => {
        if (tire.position) updates[tire.position] = tire.id;
      });

      const response = await fetch(`${API_BASE}/tires/update-positions`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa, updates })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.message || t.updateError);
      }

      const updatedOriginalState: Record<string, string | null> = {};
      allTires.forEach(tire => {
        updatedOriginalState[tire.id] = tire.position || null;
      });

      setOriginalState(updatedOriginalState);
      setSuccess(t.positionsUpdated);

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
        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {success && <StatusMessage message={success} type="success" />}
          {error && <StatusMessage message={error} type="error" />}

          {/* Search */}
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#0A183A] mb-4">{t.searchVehicle}</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.enterPlate}
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
                    <span>{t.searching}</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>{t.search}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Vehicle Info */}
          {vehicle && (
            <div className="mb-6 p-4 md:p-6 bg-gradient-to-r from-[#173D68]/10 to-[#348CCB]/10 rounded-lg border-l-4 border-[#1E76B6] shadow-sm">
              <h2 className="text-xl font-bold mb-2 text-[#0A183A]">{t.vehicleData}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <p className="flex items-center">
                  <span className="font-semibold text-[#173D68] mr-2">{t.plate}</span>
                  <span className="bg-[#1E76B6] text-white px-3 py-1 rounded-md">{vehicle.placa}</span>
                </p>
                {vehicle.tipovhc && (
                  <p>
                    <span className="font-semibold text-[#173D68] mr-2">{t.type}</span>
                    {vehicle.tipovhc}
                  </p>
                )}
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">{t.totalTires}</span>
                  {allTires.length}
                </p>
                <p>
                  <span className="font-semibold text-[#173D68] mr-2">{t.assigned}</span>
                  {assignedTires.length}
                </p>
              </div>
            </div>
          )}

          {/* Available Tires (currently unassigned from this vehicle) */}
          {availableTires.length > 0 && (
            <TiresTray tires={availableTires} title={t.availableTires} t={t} />
          )}

          {/* Company Inventory Tray */}
          {companyInventory.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-emerald-500 rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventario de la Empresa
                  <span className="text-sm font-normal text-emerald-600">({companyInventory.length})</span>
                </h3>
                {companyInventory.length > 8 && (
                  <button
                    onClick={() => setShowInventoryModal(true)}
                    className="text-sm text-emerald-700 underline hover:text-emerald-900 transition-colors"
                  >
                    Ver todas
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {companyInventory.slice(0, 8).map(tire => (
                  <CompanyInventoryTire key={tire.id} tire={tire} />
                ))}
                {companyInventory.length > 8 && (
                  <button
                    onClick={() => setShowInventoryModal(true)}
                    className="w-24 h-24 border-2 border-dashed border-emerald-400 rounded-xl text-emerald-600 text-xs font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center"
                  >
                    +{companyInventory.length - 8} más
                  </button>
                )}
              </div>
              <p className="text-xs text-emerald-600 mt-3">
                Arrastra una llanta al diagrama del vehículo para asignarla.
              </p>
            </div>
          )}

          {/* Vehicle Visualization — uses handleDrop so company tires can be dropped here */}
          {vehicle && (
            <VehicleVisualization
              tires={allTires}
              onTireDrop={handleDrop}
              t={t}
            />
          )}

          {/* Unassign Zone */}
          {vehicle && (
            <DropZone
              onDrop={(tireId) => handleDrop(tireId, "none")}
              className="p-6 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 min-h-[10rem] mb-6 hover:border-orange-400 hover:bg-orange-100 transition-colors"
            >
              <div className="text-center text-orange-600 flex flex-col items-center gap-2">
                {/* Removed pointer-events-none */}
                <Package className="h-8 w-8 text-orange-400" />
                <div className="font-semibold text-base">Devolver al Inventario</div>
                <div className="text-sm text-orange-500">Arrastra aquí una llanta para quitarla del vehículo</div>
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
                    <span>{t.saving}</span>
                  </>
                ) : t.saveChanges}
              </button>

              {hasChanges && (
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {t.cancelChanges}
                </button>
              )}
            </div>
          )}
        </main>

        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={generateFancyPDF}
          changes={tireChanges}
          vehicle={vehicle}
          t={t}
        />

        {showInventoryModal && (
          <CompanyInventoryModal
            tires={companyInventory}
            onClose={() => setShowInventoryModal(false)}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default Posicion;