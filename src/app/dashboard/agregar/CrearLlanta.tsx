"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Loader2, Search, ChevronDown, X } from "lucide-react";

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

  // Vehicle search state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  // Tire form state
  const [tireForm, setTireForm] = useState({
    tirePlaca: "",
    marca: "",
    diseno: "",
    profundidadInicial: 0,
    dimension: "",
    eje: "direccion",
    kilometrosRecorridos: 0,
    costo: 0,
    vida: "nueva",
    posicion: ""
  });

  // Company and vehicle selection state
  const [companyId, setCompanyId] = useState<string>("");
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Common input focus/blur handlers
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#1E76B6';
    e.target.style.boxShadow = '0 0 0 4px #1E76B633';
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#348CCB4D';
    e.target.style.boxShadow = 'none';
  };

  // Handle form input changes
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

  // Handle vehicle search
  const handleVehicleSearch = (searchValue: string) => {
    setVehicleSearch(searchValue);
    if (searchValue.trim() === "") {
      setFilteredVehicles(userVehicles);
    } else {
      const filtered = userVehicles.filter(vehicle =>
        vehicle.placa.toLowerCase().includes(searchValue.toLowerCase()) ||
        vehicle.tipovhc.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredVehicles(filtered);
    }
    setShowVehicleDropdown(true);
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleSearch(vehicle.placa);
    setShowVehicleDropdown(false);
  };

  // Clear vehicle selection
  const clearVehicleSelection = () => {
    setSelectedVehicle(null);
    setVehicleSearch("");
    setFilteredVehicles(userVehicles);
  };

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setShowVehicleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Update filtered vehicles when userVehicles changes
  useEffect(() => {
    setFilteredVehicles(userVehicles);
  }, [userVehicles]);

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
    const finalPlaca = tireForm.tirePlaca.trim() !== "" ? tireForm.tirePlaca : generateRandomString(8);

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
      vehicleId: selectedVehicle?.id || null,
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
        eje: "direccion",
        kilometrosRecorridos: 0,
        costo: 0,
        vida: "nueva",
        posicion: ""
      });
      clearVehicleSelection();
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
    <div 
      className="min-h-screen py-8"
      style={{

      }}
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <div 
          className="bg-white shadow-2xl rounded-3xl overflow-hidden border-2"
          style={{ borderColor: '#348CCB33' }}
        >
          {/* Header */}
          <div 
            className="p-8 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(to right, #0A183A, #173D68, #1E76B6)'
            }}
          >
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23348CCB' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            ></div>
            <div className="relative">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">Crear Nueva Llanta</h1>
              <p className="text-lg font-medium" style={{ color: '#348CCB' }}>Complete el formulario para registrar una nueva llanta en el sistema</p>
            </div>
          </div>

          <form onSubmit={handleCreateTire} className="p-8 space-y-8">
            {/* Notification Messages */}
            {error && (
              <div className="flex items-center bg-red-50 border-l-4 border-red-500 text-red-800 p-5 rounded-r-lg shadow-md animate-pulse">
                <AlertTriangle className="mr-3 flex-shrink-0 text-red-600" size={24} />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center bg-green-50 border-l-4 border-green-500 text-green-800 p-5 rounded-r-lg shadow-md animate-pulse">
                <CheckCircle className="mr-3 flex-shrink-0 text-green-600" size={24} />
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* Vehicle Search Section */}
            <div 
              className="p-6 rounded-2xl border"
              style={{
                background: 'linear-gradient(to right, #348CCB0A, #1E76B60A)',
                borderColor: '#348CCB33'
              }}
            >
              <label className="block text-lg font-semibold mb-3" style={{ color: '#0A183A' }}>
                Seleccione Vehículo (Placa)
              </label>
              <div className="relative" ref={vehicleDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10" style={{ color: '#173D68' }} size={20} />
                  <input
                    type="text"
                    value={vehicleSearch}
                    onChange={(e) => handleVehicleSearch(e.target.value)}
                    placeholder="Buscar vehículo por placa o tipo..."
                    className="w-full pl-12 pr-12 py-4 border-2 rounded-xl shadow-sm 
                    focus:outline-none focus:ring-4 transition-all duration-300
                    bg-white text-lg font-medium"
                    style={{
                      borderColor: '#348CCB4D',
                      color: '#0A183A'
                    }}
                    onFocus={(e) => {
                      setShowVehicleDropdown(true);
                      handleInputFocus(e);
                    }}
                    onBlur={handleInputBlur}
                    disabled={loadingVehicles}
                  />
                  {selectedVehicle && (
                    <button
                      type="button"
                      onClick={clearVehicleSelection}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:text-red-500 transition-colors"
                      style={{ color: '#173D68' }}
                    >
                      <X size={20} />
                    </button>
                  )}
                  {!selectedVehicle && (
                    <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2" style={{ color: '#173D68' }} size={20} />
                  )}
                  {loadingVehicles && (
                    <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-spin" style={{ color: '#1E76B6' }} size={20} />
                  )}
                </div>

                {/* Dropdown */}
                {showVehicleDropdown && !loadingVehicles && (
                  <div 
                    className="absolute z-50 w-full mt-2 bg-white border-2 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                    style={{ borderColor: '#348CCB4D' }}
                  >
                    {filteredVehicles.length === 0 ? (
                      <div className="p-4 text-center" style={{ color: '#173D68' }}>
                        No se encontraron vehículos
                      </div>
                    ) : (
                      <>
                        <div className="p-3 border-b" style={{ borderColor: '#348CCB33' }}>
                          <button
                            type="button"
                            onClick={clearVehicleSelection}
                            className="w-full text-left p-2 rounded-lg transition-colors hover:bg-gray-100"
                            style={{ color: '#173D68' }}
                          >
                            -- Sin vehículo (opcional) --
                          </button>
                        </div>
                        {filteredVehicles.map((vehicle) => (
                          <button
                            key={vehicle.id}
                            type="button"
                            onClick={() => handleVehicleSelect(vehicle)}
                            className="w-full text-left p-4 transition-colors border-b last:border-b-0 hover:bg-gray-100"
                            style={{ borderColor: '#348CCB1A' }}
                          >
                            <div className="font-semibold" style={{ color: '#0A183A' }}>{vehicle.placa}</div>
                            <div className="text-sm" style={{ color: '#173D68' }}>{vehicle.tipovhc} - {vehicle.carga}</div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              {selectedVehicle && (
                <div 
                  className="mt-3 p-3 rounded-lg border"
                  style={{
                    backgroundColor: '#1E76B61A',
                    borderColor: '#1E76B633'
                  }}
                >
                  <div className="text-sm" style={{ color: '#0A183A' }}>
                    <strong>Seleccionado:</strong> {selectedVehicle.placa} - {selectedVehicle.tipovhc}
                  </div>
                </div>
              )}
              <p className="text-sm mt-2" style={{ color: '#173D68' }}>
                Busque y seleccione un vehículo para asociar la llanta (opcional)
              </p>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ID de la Llanta */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold" style={{ color: '#0A183A' }}>
                  ID de la Llanta
                </label>
                <input
                  type="text"
                  name="tirePlaca"
                  value={tireForm.tirePlaca}
                  onChange={handleInputChange}
                  placeholder="Ingrese ID o déjelo en blanco para generar aleatorio"
                  className="w-full px-4 py-4 border-2 rounded-xl shadow-sm 
                  focus:outline-none transition-all duration-300
                  bg-white text-lg font-medium"
                  style={{
                    borderColor: '#348CCB4D',
                    color: '#0A183A'
                  }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              {/* Marca */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Marca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="marca"
                  value={tireForm.marca}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-[#173D68]/60 transition-all duration-300
                  text-lg font-medium"
                />
              </div>

              {/* Diseño */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Diseño <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="diseno"
                  value={tireForm.diseno}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-[#173D68]/60 transition-all duration-300
                  text-lg font-medium"
                />
              </div>

              {/* Profundidad Inicial */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Profundidad Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="profundidadInicial"
                  value={tireForm.profundidadInicial}
                  onChange={handleInputChange}
                  required
                  step="0.1"
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-[#173D68]/60 transition-all duration-300
                  text-lg font-medium"
                />
              </div>

              {/* Dimensión */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Dimensión <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dimension"
                  value={tireForm.dimension}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-[#173D68]/60 transition-all duration-300
                  text-lg font-medium"
                />
              </div>

              {/* Eje */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Eje <span className="text-red-500">*</span>
                </label>
                <select
                  name="eje"
                  value={tireForm.eje}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] transition-all duration-300 text-lg font-medium"
                >
                  <option value="direccion">Dirección</option>
                  <option value="traccion">Tracción</option>
                </select>
              </div>

              {/* Kilómetros Recorridos */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Kilómetros Recorridos
                </label>
                <input
                  type="number"
                  name="kilometrosRecorridos"
                  value={tireForm.kilometrosRecorridos}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-[#173D68]/60 transition-all duration-300
                  text-lg font-medium"
                />
              </div>

              {/* Costo */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Costo <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="costo"
                  value={tireForm.costo}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-[#173D68]/60 transition-all duration-300
                  text-lg font-medium"
                />
              </div>

              {/* Vida */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Vida <span className="text-red-500">*</span>
                </label>
                <select
                  name="vida"
                  value={tireForm.vida}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] transition-all duration-300 text-lg font-medium"
                >
                  <option value="nueva">Nueva</option>
                  <option value="reencauche1">Primer Reencauche</option>
                  <option value="reencauche2">Segundo Reencauche</option>
                  <option value="reencauche3">Tercer Reencauche</option>
                </select>
              </div>

              {/* Posición */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  Posición <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="posicion"
                  value={tireForm.posicion}
                  onChange={handleInputChange}
                  required
                  min={1}
                  className="w-full px-4 py-4 border-2 border-[#348CCB]/30 rounded-xl shadow-sm 
                  focus:outline-none focus:ring-4 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]
                  bg-white text-[#0A183A] placeholder-[#173D68]/60 transition-all duration-300
                  text-lg font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-5 px-6 text-white rounded-2xl
              hover:shadow-2xl hover:scale-105 transition-all duration-300 
              flex items-center justify-center text-xl font-bold tracking-wide
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              border-2"
              style={{
                background: 'linear-gradient(to right, #0A183A, #173D68, #1E76B6)',
                borderColor: '#348CCB4D'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-3" size={24} />
                  <span>Creando Llanta...</span>
                </>
              ) : (
                "Crear Nueva Llanta"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}