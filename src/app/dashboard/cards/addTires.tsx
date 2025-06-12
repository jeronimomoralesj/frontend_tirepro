"use client";

import React from "react";
import { X } from "lucide-react";
import AgregarPage from "../agregar/pageMini";

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

interface AddTiresProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  apiBase: string;
}

const AddTires: React.FC<AddTiresProps> = ({ isOpen, onClose, vehicle, apiBase }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#173D68] text-white p-5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Agregar Llanta</h2>
            <p className="text-sm text-gray-300">Vehículo: {vehicle.placa.toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors duration-200 flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <AgregarPage 
              vehicle={vehicle} 
              apiBase={apiBase}
              onSuccess={() => {
                // Optional: Add success callback
                setTimeout(() => {
                  onClose();
                }, 1500);
              }}
            />
          </div>
        </div>

        {/* Optional Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTires;