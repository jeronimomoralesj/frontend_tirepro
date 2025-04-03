"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Timer, 
  FileText, 
  Camera, 
  AlertTriangle 
} from "lucide-react";

export default function InspeccionPage() {
  const router = useRouter();
  
  // Input states
  const [placaInput, setPlacaInput] = useState("");
  const [newKilometraje, setNewKilometraje] = useState<number>(0);
  
  // Data states
  const [vehicle, setVehicle] = useState<any>(null);
  const [tires, setTires] = useState<any[]>([]);
  const [tireUpdates, setTireUpdates] = useState<{
    [id: string]: { profundidadInt: number; profundidadCen: number; profundidadExt: number; image: File | null }
  }>({});

  // UI states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper function to convert File to base64 string
  function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVehicle(null);
    setTires([]);
    setTireUpdates({});
    if (!placaInput.trim()) {
      setError("Por favor ingrese la placa del vehículo");
      return;
    }
    setLoading(true);
    try {
      // Fetch vehicle by placa.
      const vehicleRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/placa?placa=${encodeURIComponent(placaInput.trim())}`
          : `http://localhost:6001/api/vehicles/placa?placa=${encodeURIComponent(placaInput.trim())}`
      );
      if (!vehicleRes.ok) {
        throw new Error("Vehículo no encontrado");
      }
      const vehicleData = await vehicleRes.json();
      setVehicle(vehicleData);
      setNewKilometraje(vehicleData.kilometrajeActual);

      // Fetch tires by vehicle id.
      const tiresRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${vehicleData.id}`
          : `http://localhost:6001/api/tires/vehicle?vehicleId=${vehicleData.id}`
      );
      if (!tiresRes.ok) {
        throw new Error("Error al obtener los neumáticos");
      }
      let tiresData = await tiresRes.json();
      // Sort tires by posicion
      tiresData.sort((a: any, b: any) => a.posicion - b.posicion);
      setTires(tiresData);

      // Initialize tireUpdates state with default values.
      const initialUpdates: { [id: string]: { profundidadInt: number; profundidadCen: number; profundidadExt: number; image: File | null } } = {};
      tiresData.forEach((tire: any) => {
        initialUpdates[tire.id] = {
          profundidadInt: 0,
          profundidadCen: 0,
          profundidadExt: 0,
          image: null,
        };
      });
      setTireUpdates(initialUpdates);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(
    tireId: string,
    field: "profundidadInt" | "profundidadCen" | "profundidadExt" | "image",
    value: number | File | null
  ) {
    setTireUpdates((prev) => ({
      ...prev,
      [tireId]: {
        ...prev[tireId],
        [field]: value,
      },
    }));
  }

  async function handleSubmitInspections(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Validate inputs before submission
      const invalidTires = tires.filter(tire => {
        const update = tireUpdates[tire.id];
        return (
          isNaN(update.profundidadInt) || 
          isNaN(update.profundidadCen) || 
          isNaN(update.profundidadExt)
        );
      });
  
      if (invalidTires.length > 0) {
        throw new Error("Por favor ingrese valores numéricos válidos para todas las profundidades");
      }
  
      // Update vehicle's kilometraje if needed.
      if (vehicle && newKilometraje !== vehicle.kilometrajeActual) {
        const vehicleRes = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/${vehicle.id}/kilometraje`
            : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/vehicles/${vehicle.id}/kilometraje`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kilometrajeActual: newKilometraje }),
          }
        );
        if (!vehicleRes.ok) {
          throw new Error("Error al actualizar el kilometraje del vehículo");
        }
      }
  
      // Loop over tires and send updates
      const updatePromises = tires.map(async (tire) => {
        const updateData = tireUpdates[tire.id];
        
        // Prepare the payload to match the UpdateInspectionDto
        const payload = {
          profundidadInt: Number(updateData.profundidadInt),
          profundidadCen: Number(updateData.profundidadCen),
          profundidadExt: Number(updateData.profundidadExt),
          newKilometraje: Number(newKilometraje),
          imageUrl: updateData.image 
            ? await convertFileToBase64(updateData.image) 
            : ""  // Send empty string instead of undefined
        };
  
        console.log(`Payload for tire ${tire.id}:`, payload);  // Debug logging
  
        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/${tire.id}/inspection`
            : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires/${tire.id}/inspection`,
          {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(payload),
          }
        );
        
        if (!res.ok) {
          const errorBody = await res.text();
          console.error(`Error response for tire ${tire.id}:`, errorBody);
          throw new Error(`Error al actualizar el neumático ${tire.id}: ${errorBody}`);
        }
        return await res.json();
      });
      
      await Promise.all(updatePromises);
      alert("Inspecciones actualizadas exitosamente");
    } catch (err: any) {
      console.error("Full error:", err);
      setError(err.message || "Error al actualizar inspecciones");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#0A183A] font-sans">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Search Section */}
        <div className="bg-[#348CCB]/10 rounded-xl p-6 mb-6 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <input
                type="text"
                placeholder="Ingrese la placa del vehículo"
                value={placaInput}
                onChange={(e) => setPlacaInput(e.target.value)}
                className="w-full px-4 py-3 pl-10 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1E76B6]" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-[#0A183A] text-white rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">Buscando...</span>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Buscar
                </>
              )}
            </button>
          </form>
          {error && (
            <div className="mt-4 flex items-center text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="mr-3 text-red-600" />
              {error}
            </div>
          )}
        </div>

        {/* Vehicle Details */}
        {vehicle && (
          <div className="bg-[#173D68]/5 rounded-xl p-6 mb-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#1E76B6]" />
                  Datos del Vehículo
                </h2>
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="font-medium">Placa:</span> 
                    <span>{vehicle.placa}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Tipo VHC:</span> 
                    <span>{vehicle.tipovhc}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Cantidad de Llantas:</span> 
                    <span>{vehicle.tireCount}</span>
                  </p>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Timer className="w-6 h-6 text-[#1E76B6]" />
                  Kilometraje
                </h2>
                <div className="relative">
                  <input
                    type="number"
                    value={newKilometraje}
                    onChange={(e) => setNewKilometraje(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">km</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tire Inspections */}
        {tires.length > 0 && (
          <form onSubmit={handleSubmitInspections}>
            <div className="space-y-6">
              {tires.map((tire) => (
                <div 
                  key={tire.id} 
                  className="bg-[#173D68]/5 rounded-xl p-6 shadow-sm border-l-4 border-[#1E76B6]"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-[#1E76B6]" />
                        Detalles del Neumático
                      </h3>
                      <div className="space-y-2">
                        <p className="flex justify-between">
                          <span className="font-medium">ID:</span> 
                          <span>{tire.placa}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="font-medium">Marca:</span> 
                          <span>{tire.marca}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="font-medium">Posición:</span> 
                          <span>{tire.posicion}</span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Mediciones de Profundidad</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Profundidad Inputs */}
                        {['profundidadInt', 'profundidadCen', 'profundidadExt'].map((field) => (
                          <div key={field}>
                            <label className="block text-sm font-medium mb-1 text-center">
                              {field === 'profundidadInt' ? 'Interior' : 
                               field === 'profundidadCen' ? 'Central' : 'Exterior'}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={tireUpdates[tire.id]?.[field as keyof typeof tireUpdates[string]] || 0}
                              onChange={(e) =>
                                handleInputChange(tire.id, field as any, Number(e.target.value))
                              }
                              className="w-full px-3 py-2 border-2 border-[#1E76B6]/30 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-1">Imagen del Neumático</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleInputChange(
                              tire.id,
                              "image",
                              e.target.files ? e.target.files[0] : null
                            )
                          }
                          className="w-full file:mr-4 file:rounded-lg file:border-0 file:bg-[#1E76B6] file:text-white file:px-4 file:py-2 hover:file:bg-[#173D68]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-[#0A183A] text-white py-3 rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">Actualizando...</span>
              ) : (
                "Actualizar Inspecciones"
              )}
            </button>
          </form>
        )}

        {vehicle && tires.length === 0 && !loading && (
          <div className="text-center bg-[#348CCB]/10 p-6 rounded-xl">
            <p className="text-[#0A183A]">No se encontraron neumáticos para este vehículo.</p>
          </div>
        )}
      </div>
    </div>
  );
}