"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Loader2, Search, ChevronDown, X, Building2 } from "lucide-react";

type Company = {
  id: string;
  name: string;
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
};

// Translation object
const translations = {
  es: {
    title: "Crear Nueva Llanta",
    subtitle: "Complete el formulario para registrar una nueva llanta en el sistema",
    selectClient: "Cliente",
    allClients: "Todos",
    selectVehicle: "Seleccione Vehículo (Placa)",
    searchVehiclePlaceholder: "Buscar vehículo por placa o tipo...",
    noVehicleOption: "-- Sin vehículo (opcional) --",
    noVehiclesFound: "No se encontraron vehículos",
    selected: "Seleccionado",
    searchHelp: "Busque y seleccione un vehículo para asociar la llanta (opcional)",
    tireId: "ID de la Llanta",
    tireIdPlaceholder: "Ingrese ID o déjelo en blanco para generar aleatorio",
    brand: "Marca",
    design: "Diseño",
    initialDepth: "Profundidad Inicial",
    dimension: "Dimensión",
    axis: "Eje",
    axisDirection: "Dirección",
    axisTraction: "Tracción",
    kilometersRun: "Kilómetros Recorridos",
    cost: "Costo",
    life: "Vida",
    lifeNew: "Nueva",
    lifeRetread1: "Primer Reencauche",
    lifeRetread2: "Segundo Reencauche",
    lifeRetread3: "Tercer Reencauche",
    position: "Posición",
    createButton: "Crear Nueva Llanta",
    creatingButton: "Creando Llanta...",
    createSuccess: "Neumático creado exitosamente",
    required: "*",
    errorUnknown: "Error desconocido",
    pleaseSelectClient: "Por favor seleccione un cliente"
  },
};

export default function TirePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Language detection state
  const [language, setLanguage] = useState<'es'>('es');

  // Company/Client state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("Todos");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

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

  // Vehicle selection state
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Get current translations
  const t = translations[language];

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = 'es';
      setLanguage(saved);
    };

    detectAndSetLanguage();
  }, []);

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

  // Fetch companies
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Update filtered vehicles when userVehicles changes
  useEffect(() => {
    setFilteredVehicles(userVehicles);
  }, [userVehicles]);

  // Fetch vehicles when selected company changes
  useEffect(() => {
    if (selectedCompany !== "Todos") {
      const company = companies.find(c => c.name === selectedCompany);
      if (company) {
        fetchVehiclesForCompany(company.id);
      }
    } else {
      // Fetch all vehicles from all companies
      fetchAllVehicles();
    }
  }, [selectedCompany, companies]);

  async function fetchCompanies() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No se encontró token de autenticación");
        return;
      }

      const res = await fetch(
        `https://api.tirepro.com.co/api/companies/me/clients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Error fetching companies");

      const data = await res.json();

      const companyList: Company[] = data.map((access: any) => ({
        id: access.company.id,
        name: access.company.name,
      }));

      setCompanies(companyList);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchVehiclesForCompany(companyId: string) {
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
      clearVehicleSelection();
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

  async function fetchAllVehicles() {
    setLoadingVehicles(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || companies.length === 0) {
        setLoadingVehicles(false);
        return;
      }

      const allVehicles: Vehicle[] = [];

      await Promise.all(
        companies.map(async (company) => {
          const res = await fetch(
            process.env.NEXT_PUBLIC_API_URL
              ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles?companyId=${company.id}`
              : `https://api.tirepro.com.co/api/vehicles?companyId=${company.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (res.ok) {
            const vehicles: Vehicle[] = await res.json();
            allVehicles.push(...vehicles);
          }
        })
      );

      setUserVehicles(allVehicles);
      clearVehicleSelection();
    } catch (err) {
      console.error("Error fetching all vehicles", err);
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

    // Validate company selection
    if (selectedCompany === "Todos") {
      setError(t.pleaseSelectClient);
      return;
    }

    setLoading(true);

    const currentDate = new Date().toISOString();
    const finalPlaca = tireForm.tirePlaca.trim() !== "" ? tireForm.tirePlaca : generateRandomString(8);

    // Get the selected company ID
    const company = companies.find(c => c.name === selectedCompany);
    if (!company) {
      setError("Company not found");
      setLoading(false);
      return;
    }

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
      companyId: company.id,
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
      setSuccess(data.message || t.createSuccess);
      
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
        setError(t.errorUnknown);
      }
    } finally {
      setLoading(false);
    }
  }

  const companyOptions = [t.allClients, ...companies.map(c => c.name)];

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
          {/* Header with Company Filter */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-600 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-white">
                <h2 className="text-3xl font-bold">{t.title}</h2>
                <p className="text-blue-100 mt-1 text-sm">{t.subtitle}</p>
              </div>
              
              {/* Company Filter */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  className="px-4 py-2.5 bg-black bg-opacity-10 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-opacity-20 transition-colors flex items-center gap-2 min-w-[200px] justify-between"
                >
                  <span>{t.selectClient}: {selectedCompany}</span>
                  <ChevronDown size={16} />
                </button>
                {showCompanyDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 z-10 max-h-80 overflow-y-auto">
                    {companyOptions.map((company) => (
                      <button
                        key={company}
                        type="button"
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedCompany === company ? "bg-blue-50 text-blue-700 font-medium" : ""
                        }`}
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowCompanyDropdown(false);
                        }}
                      >
                        {company}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                {t.selectVehicle}
              </label>
              <div className="relative" ref={vehicleDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10" style={{ color: '#173D68' }} size={20} />
                  <input
                    type="text"
                    value={vehicleSearch}
                    onChange={(e) => handleVehicleSearch(e.target.value)}
                    placeholder={t.searchVehiclePlaceholder}
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
                        {t.noVehiclesFound}
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
                            {t.noVehicleOption}
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
                    <strong>{t.selected}:</strong> {selectedVehicle.placa} - {selectedVehicle.tipovhc}
                  </div>
                </div>
              )}
              <p className="text-sm mt-2" style={{ color: '#173D68' }}>
                {t.searchHelp}
              </p>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ID de la Llanta */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold" style={{ color: '#0A183A' }}>
                  {t.tireId}
                </label>
                <input
                  type="text"
                  name="tirePlaca"
                  value={tireForm.tirePlaca}
                  onChange={handleInputChange}
                  placeholder={t.tireIdPlaceholder}
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
                  {t.brand} <span className="text-red-500">{t.required}</span>
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
                  {t.design} <span className="text-red-500">{t.required}</span>
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
                  {t.initialDepth} <span className="text-red-500">{t.required}</span>
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
                  {t.dimension} <span className="text-red-500">{t.required}</span>
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
                  {t.axis} <span className="text-red-500">{t.required}</span>
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
                  <option value="direccion">{t.axisDirection}</option>
                  <option value="traccion">{t.axisTraction}</option>
                </select>
              </div>

              {/* Kilómetros Recorridos */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  {t.kilometersRun}
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
                  {t.cost} <span className="text-red-500">{t.required}</span>
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
                  {t.life} <span className="text-red-500">{t.required}</span>
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
                  <option value="nueva">{t.lifeNew}</option>
                  <option value="reencauche1">{t.lifeRetread1}</option>
                  <option value="reencauche2">{t.lifeRetread2}</option>
                  <option value="reencauche3">{t.lifeRetread3}</option>
                </select>
              </div>


              {/* Posición */}
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-[#0A183A]">
                  {t.position} <span className="text-red-500">*</span>
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
                  <span>{t.creatingButton}...</span>
                </>
              ) : (
                t.createButton
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}