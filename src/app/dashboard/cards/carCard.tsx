import React from "react";
import { Truck, Plus } from "lucide-react";

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

interface Inspection {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
}

type Tire = {
  id: string;
  marca: string;
  posicion?: number | null;
  position?: string | null;
  diseno?: string;
  inspecciones?: Inspection[];
};

interface CarCardProps {
  vehicle: Vehicle;
  tires: Tire[];
  isLoading: boolean;
  onAddTires: () => void;
  onEditTires: () => void;
}

// Tire Display Component with Apple-style design
const TireDisplay: React.FC<{ tire: Tire | null; position: string }> = ({ tire }) => {
  const getMinDepthAndColor = (tire: Tire | null) => {
    if (!tire || !tire.inspecciones || tire.inspecciones.length === 0) {
      return { 
        minDepth: null, 
        bgColor: "bg-gray-100",
        textColor: "text-gray-400",
        borderColor: "border-gray-200"
      };
    }

    const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
    const minDepth = Math.min(
      lastInspection.profundidadInt,
      lastInspection.profundidadCen,
      lastInspection.profundidadExt
    );

    let bgColor, textColor, borderColor;
    if (minDepth <= 3) {
      bgColor = "bg-red-50";
      textColor = "text-red-600";
      borderColor = "border-red-200";
    } else if (minDepth <= 6) {
      bgColor = "bg-orange-50";
      textColor = "text-orange-600";
      borderColor = "border-orange-200";
    } else {
      bgColor = "bg-green-50";
      textColor = "text-green-600";
      borderColor = "border-green-200";
    }

    return { minDepth, bgColor, textColor, borderColor };
  };

  const { minDepth, bgColor, textColor, borderColor } = getMinDepthAndColor(tire);

  return (
    <div className={`
      relative rounded-2xl border-2 ${borderColor} ${bgColor}
      flex flex-col items-center justify-center
      transition-all duration-300 ease-out
      hover:scale-105 hover:shadow-lg
      w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24
      backdrop-blur-sm
    `}>
      {tire ? (
        <div className="text-center px-1">
          <div className={`text-xs font-semibold ${textColor} truncate max-w-full`}>
            {tire.marca}
          </div>
          {tire.diseno && (
            <div className={`text-xs ${textColor} opacity-70 truncate`}>
              {tire.diseno}
            </div>
          )}
          {minDepth !== null && (
            <div className={`
              text-xs font-bold mt-1 px-1.5 py-0.5 rounded-md
              ${minDepth <= 3 ? 'bg-red-600 text-white' : 
                minDepth <= 6 ? 'bg-orange-600 text-white' : 
                'bg-green-600 text-white'}
            `}>
              {minDepth}mm
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-gray-200 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          </div>
          <div className="text-xs text-gray-400 font-medium">Vacío</div>
        </div>
      )}
    </div>
  );
};

// Vehicle Axis Component with refined styling
const VehicleAxis: React.FC<{
  axleIdx: number;
  positions: string[];
  tireMap: Record<string, Tire>;
}> = ({ axleIdx, positions, tireMap }) => {
  const middleIndex = Math.ceil(positions.length / 2);
  const leftTires = positions.slice(0, middleIndex);
  const rightTires = positions.slice(middleIndex);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-sm font-semibold text-gray-500 tracking-wide">
        EJE {axleIdx + 1}
      </div>
      
      <div className="flex items-center justify-center w-full max-w-4xl">
        {/* Left axle cap */}
        <div className="w-2 h-8 bg-gray-800 rounded-l-xl shadow-sm"></div>
        
        {/* Left tires */}
        <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4">
          {leftTires.map(pos => (
            <div key={pos} className="flex flex-col items-center space-y-2">
              <TireDisplay
                position={pos}
                tire={tireMap[pos] || null}
              />
              <div className="w-8 h-1 bg-blue-500 rounded-full opacity-60"></div>
            </div>
          ))}
        </div>

        {/* Axle body */}
        <div className="relative flex-grow min-w-0 mx-2 sm:mx-4 max-w-xs">
          <div className="h-6 bg-gray-800 rounded-full shadow-inner">
            <div className="h-full w-4/5 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full mx-auto flex items-center justify-center">
              <div className="w-8 h-1 bg-blue-400 rounded-full opacity-80"></div>
            </div>
          </div>
        </div>

        {/* Right tires */}
        <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4">
          {rightTires.map(pos => (
            <div key={pos} className="flex flex-col items-center space-y-2">
              <TireDisplay
                position={pos}
                tire={tireMap[pos] || null}
              />
              <div className="w-8 h-1 bg-blue-500 rounded-full opacity-60"></div>
            </div>
          ))}
        </div>

        {/* Right axle cap */}
        <div className="w-2 h-8 bg-gray-800 rounded-r-xl shadow-sm"></div>
      </div>
    </div>
  );
};

// Vehicle Visualization with clean Apple-style layout
const VehicleVisualization: React.FC<{
  tires: Tire[];
  vehicleId: string;
}> = ({ tires }) => {
  const layout = React.useMemo(() => {
    const activeTires = tires.filter(t => t.position && t.position !== "0");
    const count = activeTires.length || 4;
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
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200/60 rounded-3xl p-6 lg:p-8 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
          Configuración de Llantas
        </h3>
        <span className="text-sm text-gray-500 font-medium">
          {layout.length} eje{layout.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="flex flex-col space-y-8 lg:space-y-12 overflow-x-auto">
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

// Main CarCard Component with Apple aesthetic
const CarCard: React.FC<CarCardProps> = ({ 
  vehicle, 
  tires, 
  isLoading, 
  onAddTires, 
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-500 ease-out overflow-hidden">
      {/* Vehicle Header */}
      <div className="px-6 py-8 lg:px-8 lg:py-10 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-grow min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight break-words">
              {vehicle.placa?.toUpperCase() || "SIN PLACA"}
            </h2>
            <p className="text-gray-500 mt-2 text-sm font-medium">
              {vehicle.tipovhc?.replace("_", " ") || "Sin tipo"}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl text-sm font-semibold">
              <Truck size={16} className="mr-2" />
              Vehículo
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Content */}
      <div className="px-6 py-6 lg:px-8 lg:py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Cargando configuración...</p>
          </div>
        ) : tires.length > 0 ? (
          <VehicleVisualization 
            tires={tires}
            vehicleId={vehicle.id}
          />
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
              <Truck size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sin llantas asignadas
            </h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
              Agrega llantas para visualizar la configuración completa del vehículo
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={onAddTires}
            className="w-full bg-[#1E76B6] hover:bg-[#348CCB] active:bg-blue-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            <Plus size={20} className="mr-3" />
            Agregar Llanta
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarCard;