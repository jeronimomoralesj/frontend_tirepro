"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Tag, 
  Search, 
  Timer, 
  FileText, 
  Camera, 
  AlertTriangle 
} from "lucide-react";

export type UserData = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
  plates: string[];
};

type Vehicle = {
  id: string;
  placa: string;
  tipovhc: string;
  tireCount: number;
  kilometrajeActual: number;
};

type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
};

const UserPlateInspection: React.FC = () => {
  // User and Plates States
  const [user, setUser] = useState<UserData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState("");
  
  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Selected Plate State
  const [selectedPlate, setSelectedPlate] = useState<string>("");
  
  // Inspection States
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<Tire[]>([]);
  const [tireUpdates, setTireUpdates] = useState<{
    [id: string]: { 
      profundidadInt: number; 
      profundidadCen: number; 
      profundidadExt: number; 
      image: File | null 
    }
  }>({});
  const [newKilometraje, setNewKilometraje] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // This effect replicates the exact SingleLoggedUser logic:
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      try {
        // Assuming your auth flow stores the user as an object
        const parsedUser: UserData = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser.companyId) {
          fetchUsers(parsedUser.companyId);
        } else {
          setUserError("No company assigned to user");
          setUserLoading(false);
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        setUserError("Error parsing user data");
        setUserLoading(false);
      }
    } else {
      setUserError("User or token not found");
      setUserLoading(false);
      // Optionally, redirect to login here.
    }
  }, []);

  async function fetchUsers(companyId: string) {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/users?companyId=${companyId}`
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: UserData[] = await res.json();
      setUsers(data);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setUserLoading(false);
    }
  }

  // Helper function to convert File to base64 string
  function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  async function handlePlateSelection(plate: string) {
    setSelectedPlate(plate);
    await fetchVehicleData(plate);
  }

  async function fetchVehicleData(placa: string) {
    setError("");
    setVehicle(null);
    setTires([]);
    setTireUpdates({});
    setLoading(true);
    
    try {
      // Fetch vehicle by placa.
      const vehicleRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/placa?placa=${encodeURIComponent(placa.trim())}`
          : `https://api.tirepro.com.co/api/vehicles/placa?placa=${encodeURIComponent(placa.trim())}`
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
          : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${vehicleData.id}`
      );
      if (!tiresRes.ok) {
        throw new Error("Error al obtener los neumáticos");
      }
      const tiresData: Tire[] = await tiresRes.json();
      // Sort tires by posicion
      tiresData.sort((a, b) => a.posicion - b.posicion);
      setTires(tiresData);

      // Initialize tireUpdates state with default values.
      const initialUpdates: { [id: string]: { profundidadInt: number; profundidadCen: number; profundidadExt: number; image: File | null } } = {};
      tiresData.forEach((tire) => {
        initialUpdates[tire.id] = {
          profundidadInt: 0,
          profundidadCen: 0,
          profundidadExt: 0,
          image: null,
        };
      });
      setTireUpdates(initialUpdates);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado");
      }
    }
    finally {
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
            : ""
        };
  
        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/${tire.id}/inspection`
            : `https://api.tirepro.com.co/api/tires/${tire.id}/inspection`,
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
          throw new Error(`Error al actualizar el neumático ${tire.id}: ${errorBody}`);
        }
        return await res.json();
      });
      
      await Promise.all(updatePromises);
      alert("Inspecciones actualizadas exitosamente");

      // Clear inspection fields after successful update.
      if (tires.length > 0) {
        const initialUpdates: { [id: string]: { profundidadInt: number; profundidadCen: number; profundidadExt: number; image: File | null } } = {};
        tires.forEach((tire) => {
          initialUpdates[tire.id] = {
            profundidadInt: 0,
            profundidadCen: 0,
            profundidadExt: 0,
            image: null,
          };
        });
        setTireUpdates(initialUpdates);
      }
      // Optionally, reset the kilometraje field
      setNewKilometraje(0);
      // Go back to plate selection
      setSelectedPlate("");
      setVehicle(null);
      setTires([]);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Full error:", err);
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    }
    finally {
      setLoading(false);
    }
  }

  if (userLoading) return <p className="p-4">Cargando...</p>;
  if (userError) return <p className="p-4 text-red-500">Error: {userError}</p>;
  if (!user) return <p className="p-4">No se encontró el usuario</p>;

  // Filter the fetched users to include only the logged-in user (by email)
  const filteredUsers = users.filter((u) => u.email === user.email);
  // Get available plates and filter by search query
  const availablePlates = filteredUsers.length > 0 ? filteredUsers[0].plates || [] : [];
  const filteredPlates = searchQuery.trim() 
    ? availablePlates.filter(plate => 
        plate.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availablePlates;

  return (
    <div className="min-h-screen bg-gray-100">
      {!selectedPlate ? (
        // Plate Selection View with Search Bar
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Seleccione una Placa para Inspección</h1>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">No se encontró el usuario</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((u) => (
                <div key={u.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                    <div className="bg-blue-200 text-blue-600 p-2 rounded-full mr-3">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{u.name}</h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  
                  {/* Search Bar */}
                  {u.plates && u.plates.length > 0 && (
                    <div className="p-4 border-b border-gray-200">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Buscar placa..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Mis Placa</h4>
                    {u.plates && u.plates.length > 0 ? (
                      filteredPlates.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {filteredPlates.map((plate) => (
                            <button
                              key={plate}
                              onClick={() => handlePlateSelection(plate)}
                              className="flex items-center bg-gray-100 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                            >
                              <Tag className="h-4 w-4 mr-1 text-gray-500" />
                              <span className="text-sm text-gray-700">{plate}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No se encontraron placas que coincidan con "{searchQuery}"</p>
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">No hay placas asignadas</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Inspection View
        <div className="min-h-screen bg-white text-[#0A183A] font-sans">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back to Plates Button */}
            <button
              onClick={() => {
                setSelectedPlate("");
                setVehicle(null);
                setTires([]);
                setError("");
                setSearchQuery(""); // Reset search query when going back
              }}
              className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
            >
              ← Volver a mis placas
            </button>

            {/* Placa Selected Display */}
            <div className="bg-[#348CCB]/10 rounded-xl p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-[#1E76B6] p-2 rounded-full text-white mr-3">
                    <Tag className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    Placa seleccionada: <span className="text-[#1E76B6]">{selectedPlate}</span>
                  </h2>
                </div>
                {loading && (
                  <div className="text-sm text-gray-600">
                    <span className="animate-pulse">Cargando datos...</span>
                  </div>
                )}
              </div>
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
                            <p className="flex justify-baseline">
                              <span className="font-medium">ID: </span> 
                              <span>{tire.placa}</span>
                            </p>
                            <p className="flex justify-baseline">
                              <span className="font-medium">Marca: </span> 
                              <span>{tire.marca}</span>
                            </p>
                            <p className="flex justify-baseline">
                              <span className="font-medium">Posición: </span> 
                              <span>{tire.posicion}</span>
                            </p>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Mediciones de Profundidad</h3>
                          <div className="grid grid-cols-3 gap-3">
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
                                  value={tireUpdates[tire.id]?.[field as "profundidadInt" | "profundidadCen" | "profundidadExt"] || 0}
                                  onChange={(e) =>
                                    handleInputChange(
                                      tire.id,
                                      field as "profundidadInt" | "profundidadCen" | "profundidadExt",
                                      Number(e.target.value)
                                    )
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

            {/* No tires message */}
            {vehicle && tires.length === 0 && !loading && (
              <div className="text-center bg-[#348CCB]/10 p-6 rounded-xl">
                <p className="text-[#0A183A]">No se encontraron neumáticos para este vehículo.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPlateInspection;