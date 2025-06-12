"use client";

import React, { useState, useEffect } from "react";
import { X, Edit3, Trash2, Save, AlertTriangle } from "lucide-react";

type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
  vehicleId: string;
  companyId: string;
};

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

interface EditTiresProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  apiBase: string;
}

const EditTires: React.FC<EditTiresProps> = ({ isOpen, onClose, vehicle, apiBase }) => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingTire, setEditingTire] = useState<Tire | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Tire | null>(null);

  // Edit form states
  const [editMarca, setEditMarca] = useState("");
  const [editPosicion, setEditPosicion] = useState<number>(1);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTires();
    }
  }, [isOpen]);

  const fetchTires = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/tires?vehicleId=${vehicle.id}`);
      if (!res.ok) throw new Error("Failed to fetch tires");
      
      const data = await res.json();
      setTires(data);
    } catch (err: unknown) {
      console.error("Fetch tires error:", err);
      setError(err instanceof Error ? err.message : "Error al cargar las llantas");
    } finally {
      setLoading(false);
    }
  };

  const handleEditTire = (tire: Tire) => {
    setEditingTire(tire);
    setEditMarca(tire.marca);
    setEditPosicion(tire.posicion);
  };

  const handleSaveEdit = async () => {
    if (!editingTire) return;
    
    setEditLoading(true);
    setError("");
    setSuccess("");

    try {
      const updateData = {
        marca: editMarca,
        posicion: editPosicion,
        placa: `${vehicle.placa}-${editPosicion}` // Update placa if position changed
      };

      const res = await fetch(`${apiBase}/tires/${editingTire.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update tire");
      }

      const updatedTire = await res.json();
      
      // Update the tire in the local state
      setTires(prev => prev.map(tire => 
        tire.id === editingTire.id ? { ...tire, ...updatedTire } : tire
      ));

      setSuccess("Llanta actualizada exitosamente");
      setEditingTire(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (err: unknown) {
      console.error("Update tire error:", err);
      setError(err instanceof Error ? err.message : "Error al actualizar la llanta");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteTire = async (tire: Tire) => {
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${apiBase}/tires/${tire.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete tire");
      }

      // Remove tire from local state
      setTires(prev => prev.filter(t => t.id !== tire.id));
      setSuccess("Llanta eliminada exitosamente");
      setDeleteConfirm(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (err: unknown) {
      console.error("Delete tire error:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar la llanta");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#173D68] text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Editar Llantas</h2>
            <p className="text-sm text-gray-300">Vehículo: {vehicle.placa.toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          {/* Vehicle Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Información del Vehículo</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600">Placa:</span>
              <span className="font-medium">{vehicle.placa.toUpperCase()}</span>
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium">{vehicle.tipovhc.replace("_", " ")}</span>
              <span className="text-gray-600">Total llantas:</span>
              <span className="font-medium">{tires.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#173D68]"></div>
            </div>
          ) : tires.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
              <AlertTriangle size={32} />
              <p>No hay llantas registradas para este vehículo</p>
              <p className="text-sm">Usa Agregar Llanta para añadir llantas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tires.map((tire) => (
                <div key={tire.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {editingTire?.id === tire.id ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marca
                          </label>
                          <input
                            type="text"
                            value={editMarca}
                            onChange={(e) => setEditMarca(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Posición
                          </label>
                          <input
                            type="number"
                            value={editPosicion}
                            onChange={(e) => setEditPosicion(parseInt(e.target.value) || 1)}
                            min="1"
                            max="20"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">Nuevo ID:</span> {vehicle.placa}-{editPosicion}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={editLoading}
                          className="bg-[#1E76B6] text-white px-4 py-2 rounded-md hover:bg-[#348CCB] transition-colors disabled:opacity-50 flex items-center"
                        >
                          {editLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Save size={16} className="mr-2" />
                          )}
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingTire(null)}
                          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-sm text-gray-600">ID Llanta:</span>
                            <p className="font-mono text-sm font-medium">{tire.placa}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Marca:</span>
                            <p className="font-medium">{tire.marca}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Posición:</span>
                            <p className="font-medium">{tire.posicion}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditTire(tire)}
                          className="bg-blue-50 text-blue-600 p-2 rounded-md hover:bg-blue-100 transition-colors"
                          title="Editar llanta"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(tire)}
                          className="bg-red-50 text-red-600 p-2 rounded-md hover:bg-red-100 transition-colors"
                          title="Eliminar llanta"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-medium mb-4">¿Eliminar Llanta?</h3>
            <p className="text-gray-600 mb-4">
              ¿Está seguro que desea eliminar la llanta <strong>{deleteConfirm.placa}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTire(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTires;