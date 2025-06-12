"use client";

import React, { useState, FormEvent } from "react";
import { X } from "lucide-react";

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

interface AddCarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  apiBase: string;
}

const AddCar: React.FC<AddCarProps> = ({ isOpen, onClose, onAddVehicle, apiBase }) => {
  const [placa, setPlaca] = useState("");
  const [kilometrajeActual, setKilometrajeActual] = useState<number>(0);
  const [carga, setCarga] = useState("");
  const [pesoCarga, setPesoCarga] = useState<number>(0);
  const [tipovhc, setTipovhc] = useState("2_ejes");
  const [cliente, setCliente] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Get companyId from localStorage
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        throw new Error("No user data found");
      }

      const user = JSON.parse(storedUser);
      if (!user.companyId) {
        throw new Error("No companyId found");
      }

      const vehicleData = {
        placa: placa.toLowerCase(),
        kilometrajeActual,
        carga,
        pesoCarga,
        tipovhc,
        companyId: user.companyId,
        cliente: cliente.trim() || null
      };

      console.log("Sending to API:", vehicleData);

      const res = await fetch(`${apiBase}/vehicles/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create vehicle");
      }

      const responseData = await res.json();
      console.log("Response from API:", responseData);

      const newVehicle = responseData.vehicle;

      // Pass the new vehicle to parent component
      onAddVehicle(newVehicle);

      // Reset form
      setPlaca("");
      setKilometrajeActual(0);
      setCarga("");
      setPesoCarga(0);
      setTipovhc("2_ejes");
      setCliente("");
      
    } catch (err: unknown) {
      console.error("Create vehicle error:", err);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#173D68] text-white p-5 flex justify-between items-center">
          <h2 className="text-xl font-bold">Añadir Vehículo</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Placa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placa *
            </label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toLowerCase())}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6] transition-colors"
              placeholder="Ingrese la placa del vehículo"
            />
          </div>

          {/* Kilometraje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kilometraje Actual *
            </label>
            <input
              type="number"
              value={kilometrajeActual}
              onChange={(e) => setKilometrajeActual(parseInt(e.target.value) || 0)}
              required
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6] transition-colors"
              placeholder="Kilometraje actual"
            />
          </div>

          {/* Carga */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Carga *
            </label>
            <input
              type="text"
              value={carga}
              onChange={(e) => setCarga(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6] transition-colors"
              placeholder="Tipo de carga que transporta"
            />
          </div>

          {/* Peso de Carga */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peso de Carga (kg) *
            </label>
            <input
              type="number"
              value={pesoCarga}
              onChange={(e) => setPesoCarga(parseFloat(e.target.value) || 0)}
              required
              min="0"
              step="0.1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6] transition-colors"
              placeholder="Peso en kilogramos"
            />
          </div>

          {/* Tipo de Vehículo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Vehículo *
            </label>
            <select
              value={tipovhc}
              onChange={(e) => setTipovhc(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6] transition-colors bg-white"
            >
              <option value="2_ejes">Trailer 2 ejes</option>
              <option value="2_ejes_cabezote">Cabezote 2 ejes</option>
              <option value="3_ejes">Trailer 3 ejes</option>
              <option value="3_ejes_cabezote">Cabezote 3 ejes</option>
            </select>
          </div>

          {/* Dueño */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dueño (opcional)
            </label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6] transition-colors"
              placeholder="Nombre del propietario del vehículo"
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-[#1E76B6] text-white px-4 py-3 rounded-lg hover:bg-[#348CCB] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Creando...
                </div>
              ) : (
                "Crear Vehículo"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCar;