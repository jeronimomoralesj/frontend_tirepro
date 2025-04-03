"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle } from "lucide-react";

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

  // Tire form state
  const [tirePlaca, setTirePlaca] = useState(""); 
  const [marca, setMarca] = useState("");
  const [diseno, setDiseno] = useState("");
  const [profundidadInicial, setProfundidadInicial] = useState<number>(0);
  const [dimension, setDimension] = useState("");
  const [eje, setEje] = useState("");
  const [kilometrosRecorridos, setKilometrosRecorridos] = useState<number>(0);
  const [costo, setCosto] = useState<number>(0);
  const [vida, setVida] = useState("");
  const [posicion, setPosicion] = useState<string>("");

  // Company and vehicle selection state
  const [companyId, setCompanyId] = useState<string>("");
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

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
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${companyId}`
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/vehicles?companyId=${companyId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data = await res.json();
      setUserVehicles(data);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
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
    const finalPlaca = tirePlaca.trim() !== "" ? tirePlaca : generateRandomString(8);

    // Convert all string inputs to lowercase
    const payload = {
      placa: finalPlaca.toLowerCase(),
      marca: marca.toLowerCase(),
      diseno: diseno.toLowerCase(),
      profundidadInicial,
      dimension: dimension.toLowerCase(),
      eje: eje.toLowerCase(),
      kilometrosRecorridos,
      costo: [{ valor: costo, fecha: currentDate }],
      vida: [{ valor: vida.toLowerCase(), fecha: currentDate }],
      posicion: Number(posicion),
      companyId,
      vehicleId: selectedVehicleId || null,
    };

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/create`
          : "http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/tires/create",
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
      setTirePlaca("");
      setMarca("");
      setDiseno("");
      setProfundidadInicial(0);
      setDimension("");
      setEje("");
      setKilometrosRecorridos(0);
      setCosto(0);
      setVida("");
      setPosicion("");
      setSelectedVehicleId("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Custom input component for consistent styling
  const InputField = ({ 
    label, 
    type = "text", 
    value, 
    onChange, 
    required = false, 
    placeholder = "",
    min
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
        focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent 
        bg-white text-[#0A183A] placeholder-gray-400"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-[#0A183A]">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-[#348CCB]/20">

          <form onSubmit={handleCreateTire} className="p-6 space-y-4">
            {/* Error and Success Messages */}
            {error && (
              <div className="flex items-center bg-red-50 border border-red-200 text-red-800 p-3 rounded-md mb-4">
                <AlertTriangle className="mr-3 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center bg-green-50 border border-green-200 text-green-800 p-3 rounded-md mb-4">
                <CheckCircle className="mr-3 text-green-600" />
                <span>{success}</span>
              </div>
            )}

            {/* Vehicle Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccione Vehículo (Placa)
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => {
                  const vehicleId = e.target.value;
                  setSelectedVehicleId(vehicleId);
                  const vehicle = userVehicles.find((v) => v.id === vehicleId);
                  if (vehicle && tirePlaca.trim() === "") {
                    setTirePlaca(vehicle.placa);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent 
                bg-white text-[#0A183A]"
              >
                <option value="">-- Seleccione un vehículo (opcional) --</option>
                {userVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Si selecciona un vehículo, se autocompletará la placa. Puede editarla si desea.
              </p>
            </div>

            {/* Input Fields */}
            <InputField
              label="Id de la Llanta"
              value={tirePlaca}
              onChange={(e) => setTirePlaca(e.target.value)}
              placeholder="Ingrese placa o déjelo en blanco para generar aleatoria"
            />

            <InputField
              label="Marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              required
            />

            <InputField
              label="Diseño"
              value={diseno}
              onChange={(e) => setDiseno(e.target.value)}
              required
            />

            <InputField
              label="Profundidad Inicial"
              type="number"
              value={profundidadInicial}
              onChange={(e) => setProfundidadInicial(parseFloat(e.target.value))}
              required
            />

            <InputField
              label="Dimensión"
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              required
            />

            <InputField
              label="Eje"
              value={eje}
              onChange={(e) => setEje(e.target.value)}
              required
            />

            <InputField
              label="Kilómetros Recorridos"
              type="number"
              value={kilometrosRecorridos}
              onChange={(e) => setKilometrosRecorridos(parseInt(e.target.value))}
            />

            <InputField
              label="Costo"
              type="number"
              value={costo}
              onChange={(e) => setCosto(parseFloat(e.target.value))}
              required
            />

            <InputField
              label="Vida"
              value={vida}
              onChange={(e) => setVida(e.target.value)}
              required
            />

            <InputField
              label="Posición"
              type="number"
              value={posicion}
              onChange={(e) => setPosicion(e.target.value)}
              required
              min={1}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E76B6] text-white rounded-md 
              hover:bg-[#348CCB] transition-colors duration-300 
              flex items-center justify-center space-x-2
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando..." : "Crear llanta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}