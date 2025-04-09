"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  carga: string;
  pesoCarga: number;
  tipovhc: string;
  companyId: string;
  tireCount: number;
};

export default function TirePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Tire form state
  const [tireForm, setTireForm] = useState({
    tirePlaca: "",
    marca: "",
    diseno: "",
    profundidadInicial: 0,
    dimension: "",
    eje: "",
    kilometrosRecorridos: 0,
    costo: 0,
    // Replace the Vida input with a dropdown value
    vida: "nueva",
    posicion: ""
  });

  // Company and vehicle selection state
  const [companyId, setCompanyId] = useState<string>("");
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Handle form input changes without losing focus
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTireForm(prev => ({
      ...prev,
      [name]: name === "profundidadInicial" ||
              name === "kilometrosRecorridos" ||
              name === "costo" 
                ? parseFloat(value) || 0 
                : value
    }));
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.companyId) {
        setCompanyId(user.companyId);
        fetchUserVehicles(user.companyId);
      } else {
        setError("No company assigned to user");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  async function fetchUserVehicles(companyId: string) {
    setLoadingVehicles(true);
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/vehicles?companyId=${companyId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data = await res.json();
      setUserVehicles(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error");
      }
    } finally {
      setLoadingVehicles(false);
    }    
  }

  function generateRandomString(length: number): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async function handleCreateTire(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const currentDate = new Date().toISOString();

    // If tirePlaca is empty, generate a random string
    const finalPlaca = tireForm.tirePlaca.trim() !== "" ? tireForm.tirePlaca : generateRandomString(8);

    // Build the payload. Notice that we convert the vida field to lowercase.
    const payload = {
      placa: finalPlaca.toLowerCase(),
      marca: tireForm.marca.toLowerCase(),
      diseno: tireForm.diseno.toLowerCase(),
      profundidadInicial: tireForm.profundidadInicial,
      dimension: tireForm.dimension.toLowerCase(),
      eje: tireForm.eje.toLowerCase(),
      kilometrosRecorridos: tireForm.kilometrosRecorridos,
      costo: [{ valor: tireForm.costo, fecha: currentDate }],
      vida: [{ valor: tireForm.vida.toLowerCase(), fecha: currentDate }],
      posicion: Number(tireForm.posicion),
      companyId,
      vehicleId: selectedVehicleId || null,
    };

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/create`
          : "https://api.tirepro.com.co/api/tires/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create tire");
      }
      const data = await res.json();
      setSuccess(data.message || "Neumático creado exitosamente");
      
      // Reset form fields
      setTireForm({
        tirePlaca: "",
        marca: "",
        diseno: "",
        profundidadInicial: 0,
        dimension: "",
        eje: "",
        kilometrosRecorridos: 0,
        costo: 0,
        // Set default vida to "nueva" in the dropdown
        vida: "nueva",
        posicion: ""
      });
      setSelectedVehicleId("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-[#348CCB]/10">
          <div className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] p-6 text-white">
            <h2 className="text-2xl font-bold">Crear Nueva Llanta</h2>
            <p className="opacity-80 mt-1">Complete el formulario para registrar una nueva llanta</p>
          </div>

          <form onSubmit={handleCreateTire} className="p-8 space-y-6">
            {/* Notification Messages */}
            {error && (
              <div className="flex items-center bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6 animate-appear">
                <AlertTriangle className="mr-3 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-6 animate-appear">
                <CheckCircle className="mr-3 flex-shrink-0 text-green-600" />
                <span>{success}</span>
              </div>
            )}

            {/* Vehicle Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccione Vehículo (Placa)
              </label>
              <div className="relative">
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] appearance-none transition-colors"
                  disabled={loadingVehicles}
                >
                  <option value="">-- Seleccione un vehículo (opcional) --</option>
                  {userVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa}
                    </option>
                  ))}
                </select>
                {loadingVehicles && (
                  <Loader2 className="absolute right-3 top-3 animate-spin text-gray-400" size={20} />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Seleccione un vehículo para asociar la llanta (opcional)
              </p>
            </div>

            {/* Form Grid for Multiple Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* ID de la Llanta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de la Llanta
                </label>
                <input
                  type="text"
                  name="tirePlaca"
                  value={tireForm.tirePlaca}
                  onChange={handleInputChange}
                  placeholder="Ingrese ID o déjelo en blanco para generar aleatorio"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Marca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="marca"
                  value={tireForm.marca}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Diseño */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diseño <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="diseno"
                  value={tireForm.diseno}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Profundidad Inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profundidad Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="profundidadInicial"
                  value={tireForm.profundidadInicial}
                  onChange={handleInputChange}
                  required
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Dimensión */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensión <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dimension"
                  value={tireForm.dimension}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Eje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eje <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="eje"
                  value={tireForm.eje}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Kilómetros Recorridos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kilómetros Recorridos
                </label>
                <input
                  type="number"
                  name="kilometrosRecorridos"
                  value={tireForm.kilometrosRecorridos}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Costo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="costo"
                  value={tireForm.costo}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* VIDA - Changed from input to Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vida <span className="text-red-500">*</span>
                </label>
                <select
                  name="vida"
                  value={tireForm.vida}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                          focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                          bg-white text-[#0A183A] transition-colors"
                >
                  <option value="nueva">Nueva</option>
                  <option value="reencauche1">Primer Reencauche</option>
                  <option value="reencauche2">Segundo Reencauche</option>
                  <option value="reencauche3">Tercer Reencauche</option>
                </select>
              </div>

              {/* Posición */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posición <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="posicion"
                  value={tireForm.posicion}
                  onChange={handleInputChange}
                  required
                  min={1}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-gray-400 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-lg
              hover:shadow-md transition-all duration-300 
              flex items-center justify-center font-medium
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  <span>Creando...</span>
                </>
              ) : (
                "Crear llanta"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
