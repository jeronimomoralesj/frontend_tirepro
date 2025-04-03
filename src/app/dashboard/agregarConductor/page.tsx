"use client";

import React, { useState } from "react";
import { Loader2, Search, AlertCircle, CheckCircle, Activity, Truck, Ruler, Car, Gauge, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthProvider";

interface Tire {
  id: string;
  posicion: number; // Changed from string to number to match your backend
  marca: string;
  kilometros_recorridos: number;
}

interface InspectionData {
  profundidad_int: string;
  profundidad_cen: string;
  profundidad_ext: string;
}

export default function AgregarInspeccion() {
  const [placa, setPlaca] = useState("");
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inspectionImages, setInspectionImages] = useState<Record<string, File | null>>({});
  const [inspectionData, setInspectionData] = useState<Record<string, InspectionData>>({});
  const [vehicleKilometraje, setVehicleKilometraje] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Use the auth context
  const auth = useAuth();

  const handleImageChange = (tireId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    setInspectionImages((prev) => ({
      ...prev,
      [tireId]: file,
    }));
  };

  const handleSearch = async () => {
    if (!placa.trim()) {
      setError("Por favor ingrese una placa válida");
      return;
    }
  
    // ✅ Restrict search to only placas in user's placas array
    if (!auth?.user?.placas?.includes(placa.toUpperCase())) {
      setError("No tienes permiso para inspeccionar este vehículo.");
      return;
    }
  
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires/placa/${placa}`, {
        headers: {
          "Authorization": `Bearer ${auth?.token}`,
          "Content-Type": "application/json"
        }
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "No se encontraron llantas con esta placa.");
      }
  
      const data = await response.json();
      setTires(data);
  
      // Initialize inspection data structure
      const newInspectionData: Record<string, InspectionData> = {};
      data.forEach((tire: Tire) => {
        newInspectionData[tire.id] = {
          profundidad_int: "",
          profundidad_cen: "",
          profundidad_ext: "",
        };
      });
      setInspectionData(newInspectionData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado");
      }
      setTires([]);
    }
     finally {
      setLoading(false);
    }
  };
  

  const handleInputChange = (tireId: string, field: string, value: string) => {
    setInspectionData((prev) => ({
      ...prev,
      [tireId]: {
        ...prev[tireId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!vehicleKilometraje) {
      setError("Por favor, ingrese el kilometraje actual del vehículo.");
      return;
    }
    
    if (!auth?.user || !auth?.token) {
      setError("Usuario no autenticado. Por favor, inicie sesión.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
  
    try {
      const results = await Promise.all(
        tires.map(async (tire) => {
          const { profundidad_int, profundidad_cen, profundidad_ext } = inspectionData[tire.id];
          const imageFile = inspectionImages[tire.id];
  
          if (!profundidad_int || !profundidad_cen || !profundidad_ext) {
            throw new Error(`Debe ingresar todas las profundidades para la llanta en posición ${tire.posicion}.`);
          }
  
          const formData = new FormData();
          formData.append('profundidad_int', profundidad_int);
          formData.append('profundidad_cen', profundidad_cen);
          formData.append('profundidad_ext', profundidad_ext);
          formData.append('vehicleKilometraje', vehicleKilometraje);
          formData.append('userId', auth.user.id);
          
          if (imageFile) {
            formData.append('image', imageFile);
          }
  
          console.log(`Submitting for tire ${tire.id}:`, {
            profundidad_int,
            profundidad_cen,
            profundidad_ext,
            vehicleKilometraje,
            userId: auth.user.id,
            hasImage: !!imageFile
          });
  
          const response = await fetch(`http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires/${tire.id}/inspeccion`, {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${auth.token}`,
              // Do NOT set Content-Type when using FormData with files
              // The browser will set the correct content type with boundary
            },
            body: formData,
          });
  
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(errorData.message || `Error en la inspección de la llanta en posición ${tire.posicion}`);
          }
          
          return await response.json();
        })
      );
  
      console.log("All inspections completed successfully:", results);
      setSuccess("Inspección guardada exitosamente y puntos agregados al usuario");
      setPlaca("");
      setTires([]);
      setInspectionData({});
      setVehicleKilometraje("");
      setInspectionImages({});
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error submitting inspections:", error);
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    }
     finally {
      setSubmitting(false);
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e76b6]/10 p-6">
            <h2 className="text-2xl font-bold text-black flex items-center gap-3">
              <Activity className="h-6 w-6" />
              Inspección de Llantas
            </h2>
            <p className="text-[#348CCB]/90 mt-1">Registre mediciones de profundidad para monitorear el desgaste</p>
          </div>

          {/* Search Section */}
          <div className="p-6">
            <div className="bg-[#173D68]/5 p-4 rounded-lg border border-[#173D68]/10">
              <h3 className="text-[#0A183A] font-medium mb-3 flex items-center gap-2">
                <Car className="h-5 w-5 text-[#1E76B6]" />
                Buscar Vehículo
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Ingrese la placa del vehículo"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#348CCB] focus:border-transparent transition-all bg-white"
                  />
                  <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#1E76B6]" />
                </div>
                <button 
                  onClick={handleSearch} 
                  disabled={loading}
                  className="px-4 py-3 bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white rounded-lg hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 whitespace-nowrap"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      <span>Buscar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center animate-fadeIn">
                <AlertCircle className="h-5 w-5 mr-3 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center animate-fadeIn">
                <CheckCircle className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Loading Indicator (Center) */}
            {loading && !error && (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-[#1E76B6] mx-auto" />
                  <p className="mt-4 text-[#173D68]">Buscando llantas...</p>
                </div>
              </div>
            )}

            {/* Tires Found */}
            {tires.length > 0 && (
              <div className="mt-6 space-y-6">
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-lg font-bold text-[#0A183A] flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-[#1E76B6]" />
                    Registro de Profundidades
                  </h3>
                  <p className="text-sm text-gray-600">Se encontraron {tires.length} llantas para inspeccionar</p>
                </div>

                {/* Vehicle Kilometraje - Moved up for better UX */}
                <div className="bg-[#0A183A]/5 p-4 rounded-lg border border-[#0A183A]/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-[#1E76B6]" />
                      <h3 className="text-[#0A183A] font-medium">Kilometraje Actual</h3>
                    </div>
                    <div className="relative flex-grow">
                      <input
                        type="number"
                        placeholder="Odómetro del vehículo"
                        value={vehicleKilometraje}
                        onChange={(e) => setVehicleKilometraje(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#348CCB] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tires.map((tire) => (
                    <div key={tire.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="bg-[#1E76B6]/10 p-3 border-b border-[#1E76B6]/20">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-[#0A183A]">Posición {tire.posicion}</h4>
                          <span className="text-sm font-medium text-[#173D68] bg-[#348CCB]/10 px-2 py-1 rounded">
                            {tire.marca}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-[#0A183A]">Interna</label>
                            <input
                              type="number"
                              step="0.1"
                              name="profundidad_int"
                              placeholder="mm"
                              value={inspectionData[tire.id]?.profundidad_int || ""}
                              onChange={(e) => handleInputChange(tire.id, "profundidad_int", e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#348CCB] focus:border-transparent"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-[#0A183A]">Central</label>
                            <input
                              type="number"
                              step="0.1"
                              name="profundidad_cen"
                              placeholder="mm"
                              value={inspectionData[tire.id]?.profundidad_cen || ""}
                              onChange={(e) => handleInputChange(tire.id, "profundidad_cen", e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#348CCB] focus:border-transparent"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-[#0A183A]">Externa</label>
                            <input
                              type="number"
                              step="0.1"
                              name="profundidad_ext"
                              placeholder="mm"
                              value={inspectionData[tire.id]?.profundidad_ext || ""}
                              onChange={(e) => handleInputChange(tire.id, "profundidad_ext", e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#348CCB] focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Image upload section */}
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-[#0A183A] flex items-center gap-1">
                            <Camera className="h-4 w-4 text-[#1E76B6]" />
                            Imagen
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(tire.id, e)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#348CCB] focus:border-transparent"
                          />
                          {inspectionImages[tire.id] && (
                            <p className="text-xs text-green-600">
                              Imagen seleccionada: {inspectionImages[tire.id]?.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-3 bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Guardar Inspección</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}