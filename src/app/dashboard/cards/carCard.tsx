import React from "react";
import { Truck, PlusCircle } from "lucide-react";

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

// Vehicle Visualization Components
const TireDisplay: React.FC<{ tire: Tire | null; position: string }> = ({ tire }) => {
  // Calculate minimum depth from last inspection if available
  const getMinDepthAndColor = (tire: Tire | null) => {
    if (!tire || !tire.inspecciones || tire.inspecciones.length === 0) {
      return { 
        minDepth: null, 
        bgColor: "bg-gradient-to-br from-gray-400 to-gray-500",
        textColor: "text-white"
      };
    }

    const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
    const minDepth = Math.min(
      lastInspection.profundidadInt,
      lastInspection.profundidadCen,
      lastInspection.profundidadExt
    );

    let bgColor, textColor;
    if (minDepth <= 3) {
      bgColor = "bg-red-600";
      textColor = "text-white";
    } else if (minDepth <= 6) {
      bgColor = "bg-ellow-600";
      textColor = "text-white";
    } else {
      bgColor = "bg-green-600";
      textColor = "text-white";
    }

    return { minDepth, bgColor, textColor };
  };

  const { minDepth, bgColor, textColor } = getMinDepthAndColor(tire);

  return (
    <div
      className={`rounded-full border flex items-center justify-center shadow-md ${bgColor} ${textColor} relative`}
      style={{ width: "80px", height: "80px" }}
    >
      <div className="text-center">
        {tire ? (
          <>
            <div className="text-xs font-bold">{tire.marca}</div>
            <div className="text-xs">{tire.diseno}</div>
            {minDepth !== null && (
              <div className="text-xs font-semibold mt-1 bg-black/20 px-1 rounded">
                {minDepth}mm
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-white/70 font-medium">Vacío</div>
        )}
      </div>
    </div>
  );
};

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
}> = ({ tires }) => {
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
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-[#0A183A]">
          Configuración de Llantas ({layout.length} eje{layout.length > 1 ? 's' : ''})
        </h3>
      </div>
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

const CarCard: React.FC<CarCardProps> = ({ 
  vehicle, 
  tires, 
  isLoading, 
  onAddTires, 
}) => {
  return (
    <div className="bg-gray-50 rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200">
      {/* Vehicle Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-300 pb-3 sm:pb-4 mb-3 sm:mb-4 gap-2 sm:gap-0">
        <h3 className="text-xl sm:text-2xl font-bold text-[#173D68] break-all">
          {vehicle.placa?.toUpperCase() || "SIN PLACA"}
        </h3>
        <span className="bg-[#1E76B6]/10 text-[#1E76B6] px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto whitespace-nowrap">
          {vehicle.tipovhc?.replace("_", " ") || "Sin tipo"}
        </span>
      </div>

      {/* Vehicle Visualization */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#173D68]"></div>
          <span className="ml-2 text-[#173D68]">Cargando configuración de llantas...</span>
        </div>
      ) : tires.length > 0 ? (
        <VehicleVisualization 
          tires={tires}
          vehicleId={vehicle.id}
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
          onClick={onAddTires}
          className="flex-1 bg-[#1E76B6] hover:bg-[#348CCB] text-white px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center font-medium text-sm sm:text-base"
        >
          <PlusCircle size={16} className="sm:w-5 sm:h-5 mr-2" />
          Agregar Llanta
        </button>
      </div>
    </div>
  );
};

export default CarCard;