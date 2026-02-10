"use client";

import React, { useState, useEffect, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Database, Trash2, X, Truck, Link2, ChevronDown, Edit } from "lucide-react";

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
  union: string[];
  cliente: string | null;
};

// Translations
const t = {
  title: "Gestión de Vehículos",
  addVehicle: "Añadir Vehículo",
  vehicleList: "Lista de Vehículos",
  noVehicles: "No se encontraron vehículos.",
  connectedVehicles: "Vehículos Conectados",
  individualVehicles: "Vehículos Individuales",
  createVehicle: "Crear Vehículo",
  editVehicle: "Editar Vehículo",
  selectClient: "Cliente",
  allClients: "Todos",
  selectClientForVehicle: "Seleccionar Cliente",
  selectClientPlaceholder: "Seleccione un cliente para el vehículo",
  placa: "Placa",
  kilometraje: "Kilometraje",
  carga: "Carga",
  peso: "Peso",
  llantas: "Llantas",
  dueno: "Dueño",
  uniones: "Uniones",
  ninguna: "Ninguna",
  unir: "Unir",
  editar: "Editar",
  eliminar: "Eliminar",
  placaOtroVehiculo: "Placa del otro vehiculo",
  kilometrajeActual: "Kilometraje Actual",
  pesoCarga: "Peso de Carga (kg)",
  tipoVehiculo: "Tipo de Vehículo",
  duenoOpcional: "Dueño (opcional)",
  nombreCliente: "Nombre del cliente",
  cancelar: "Cancelar",
  crear: "Crear",
  guardarCambios: "Guardar Cambios",
  eliminarVehiculo: "¿Eliminar {placa}?",
  eliminarConexion: "¿Eliminar conexión?",
  eliminarConexionConfirm: "¿Está seguro que desea eliminar esta conexión entre vehículos?",
  eliminarConexionBtn: "Eliminar Conexión",
  sinPlaca: "SIN PLACA",
  sinTipo: "Sin tipo",
  noSeEditaManualmente: "No se puede editar manualmente",
  errorCompanyId: "No companyId found on user",
  errorParsingUser: "Error parsing user data",
  errorFetchVehicles: "Failed to fetch vehicles",
  errorCreateVehicle: "Failed to create vehicle",
  errorUpdateVehicle: "Failed to update vehicle",
  errorDeleteVehicle: "Failed to delete vehicle",
  errorAddUnion: "Fallo al añadir unión",
  errorRemoveUnion: "Fallo al eliminar unión",
  alertPlacaUnion: "Ingrese placa para unir",
  pleaseSelectClient: "Por favor seleccione un cliente",
  vehicleTypes: {
    "2_ejes_trailer": "Trailer 2 ejes",
    "2_ejes_cabezote": "Cabezote 2 ejes",
    "3_ejes_trailer": "Trailer 3 ejes",
    "1_eje_cabezote": "Cabezote 1 eje"
  }
};

export default function VehiculoPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Company/Client state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("Todos");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // State for delete confirmation modal
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  
  // State for union deletion
  const [unionToDelete, setUnionToDelete] = useState<{
    sourceId: string;
    targetPlaca: string;
  } | null>(null);

  // State for editing
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [editFormData, setEditFormData] = useState<{
    placa: string;
    kilometrajeActual: number;
    carga: string;
    pesoCarga: number;
    tipovhc: string;
    cliente: string;
  }>({
    placa: "",
    kilometrajeActual: 0,
    carga: "",
    pesoCarga: 0,
    tipovhc: "2_ejes_trailer",
    cliente: ""
  });

  // Form state for creating a vehicle
  const [placa, setPlaca] = useState("");
  const [kilometrajeActual, setKilometrajeActual] = useState<number>();
  const [carga, setCarga] = useState("");
  const [pesoCarga, setPesoCarga] = useState<number>();
  const [tipovhc, setTipovhc] = useState("2_ejes");
  const [cliente, setCliente] = useState("");
  const [formSelectedCompany, setFormSelectedCompany] = useState<string>("");

  // Union placa inputs per vehicle
  const [plateInputs, setPlateInputs] = useState<{ [vehicleId: string]: string }>({});
  
  // Flag to show/hide union inputs
  const [showUnionInput, setShowUnionInput] = useState<{ [key: string]: boolean }>({});

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") 
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";
  
  // Organize vehicles by their connections
  const organizedVehicles = useMemo(() => {
    const processed = new Set<string>();
    const groups: Vehicle[][] = [];
    
    vehicles.forEach(vehicle => {
      if (processed.has(vehicle.id)) return;
      
      const group: Vehicle[] = [vehicle];
      processed.add(vehicle.id);
      
      if (vehicle.union && Array.isArray(vehicle.union) && vehicle.union.length > 0) {
        vehicle.union.forEach(connectedPlaca => {
          const connectedVehicle = vehicles.find(v => v.placa === connectedPlaca);
          if (connectedVehicle && !processed.has(connectedVehicle.id)) {
            group.push(connectedVehicle);
            processed.add(connectedVehicle.id);
          }
        });
      }
      
      groups.push(group);
    });
    
    return groups;
  }, [vehicles]);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch vehicles when selected company changes
  useEffect(() => {
    if (selectedCompany !== "Todos") {
      const company = companies.find(c => c.name === selectedCompany);
      if (company) {
        fetchVehicles(company.id);
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
        `${API_BASE}/companies/me/clients`,
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
      setError(err instanceof Error ? err.message : "Error fetching companies");
    }
  }

  async function fetchVehicles(companyId: string) {
    setLoadingVehicles(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles?companyId=${companyId}`);
      if (!res.ok) throw new Error(t.errorFetchVehicles);
      
      const data = await res.json();
      const safeData = data.map(vehicle => ({
        ...vehicle,
        union: Array.isArray(vehicle.union) ? vehicle.union : [],
      }));
      
      setVehicles(safeData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function fetchAllVehicles() {
    setLoadingVehicles(true);
    setError("");
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
            `${API_BASE}/vehicles?companyId=${company.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (res.ok) {
            const vehicles: Vehicle[] = await res.json();
            const safeVehicles = vehicles.map(vehicle => ({
              ...vehicle,
              union: Array.isArray(vehicle.union) ? vehicle.union : [],
            }));
            allVehicles.push(...safeVehicles);
          }
        })
      );

      setVehicles(allVehicles);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function handleCreateVehicle(e: FormEvent) {
    e.preventDefault();
    setError("");
    
    // Validate company selection
    if (!formSelectedCompany) {
      setError(t.pleaseSelectClient);
      return;
    }

    // Get the selected company ID
    const company = companies.find(c => c.name === formSelectedCompany);
    if (!company) {
      setError("Company not found");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/vehicles/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placa,
          kilometrajeActual,
          carga,
          pesoCarga,
          tipovhc,
          companyId: company.id,
          cliente: cliente.trim() || null  
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t.errorCreateVehicle);
      }
      
      const responseData = await res.json();
      const newVehicle = responseData.vehicle;
      
      const safeVehicle = {
        ...newVehicle,
        union: Array.isArray(newVehicle.union) ? newVehicle.union : [],
      };
      
      setVehicles((prev) => [...prev, safeVehicle]);
      
      // reset form
      setPlaca("");
      setKilometrajeActual(0);
      setCarga("");
      setPesoCarga(0);
      setTipovhc("2_ejes");
      setCliente("");
      setFormSelectedCompany("");
      setIsFormOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  async function handleEditVehicle(e: FormEvent) {
    e.preventDefault();
    if (!vehicleToEdit) return;
    
    setError("");
    
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placa: editFormData.placa,
          kilometrajeActual: editFormData.kilometrajeActual,
          carga: editFormData.carga,
          pesoCarga: editFormData.pesoCarga,
          tipovhc: editFormData.tipovhc,
          cliente: editFormData.cliente.trim() || null
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t.errorUpdateVehicle);
      }
      
      const responseData = await res.json();
      const updatedVehicle = responseData.vehicle;
      
      const safeVehicle = {
        ...updatedVehicle,
        union: Array.isArray(updatedVehicle.union) ? updatedVehicle.union : [],
      };
      
      setVehicles((prev) => prev.map(v => v.id === safeVehicle.id ? safeVehicle : v));
      setVehicleToEdit(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  function openEditModal(vehicle: Vehicle) {
    setVehicleToEdit(vehicle);
    setEditFormData({
      placa: vehicle.placa,
      kilometrajeActual: vehicle.kilometrajeActual,
      carga: vehicle.carga,
      pesoCarga: vehicle.pesoCarga,
      tipovhc: vehicle.tipovhc,
      cliente: vehicle.cliente || ""
    });
  }

  async function handleDeleteVehicle(vehicleId: string) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t.errorDeleteVehicle);
      }
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  async function addUnion(vehicleId: string) {
    const placaUnion = plateInputs[vehicleId]?.trim();
    if (!placaUnion) return alert(t.alertPlacaUnion);
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/union/add`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaUnion }),
      });
      if (!res.ok) throw new Error(t.errorAddUnion);
      const { vehicle: updated } = await res.json();
      const safeVehicle = {
        ...updated,
        union: updated.union || []
      };
      setVehicles((vs) =>
        vs.map((v) => (v.id === safeVehicle.id ? safeVehicle : v))
      );
      setPlateInputs((prev) => ({ ...prev, [vehicleId]: "" }));
      setShowUnionInput((prev) => ({ ...prev, [vehicleId]: false }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function removeUnion(vehicleId: string, placaToRemove: string) {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/union/remove`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaToRemove }),
      });
      if (!res.ok) throw new Error(t.errorRemoveUnion);
      const { vehicle: updated } = await res.json();
      const safeVehicle = {
        ...updated,
        union: updated.union || []
      };
      setVehicles((vs) =>
        vs.map((v) => (v.id === safeVehicle.id ? safeVehicle : v))
      );
      setUnionToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  function toggleUnionInput(vehicleId: string) {
    setShowUnionInput(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
    
    if (!plateInputs[vehicleId]) {
      setPlateInputs(prev => ({
        ...prev,
        [vehicleId]: ""
      }));
    }
  }

  function handlePlateInputChange(vehicleId: string, value: string) {
    setPlateInputs(prev => ({
      ...prev,
      [vehicleId]: value
    }));
  }

  const VehicleCard = ({ vehicle, isConnected = false, connectionIndex = 0, onRemoveConnection = null }) => (
    <div 
      className="relative border border-[#348CCB]/20 rounded-lg shadow-md p-4 flex flex-col justify-between bg-white max-w-xs w-full "
      style={{ zIndex: 5 }}
    >
      {isConnected && connectionIndex > 0 && onRemoveConnection && (
        <div 
          className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 w-4 md:w-6 h-1 bg-[#1E76B6] cursor-pointer hover:bg-[#0A183A]"
          onClick={onRemoveConnection}
        />
      )}
      
      <div className="space-y-2">
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-bold text-[#173D68]">{vehicle.placa?.toUpperCase() || t.sinPlaca}</span>
          <span className="bg-[#1E76B6]/10 text-[#1E76B6] px-2 py-1 rounded text-xs">
            {vehicle.tipovhc || t.sinTipo}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
          <span>{t.kilometraje}:</span>
          <span className="text-right">{vehicle.kilometrajeActual} km</span>
          <span>{t.carga}:</span>
          <span className="text-right">{vehicle.carga || "N/A"}</span>
          <span>{t.peso}:</span>
          <span className="text-right">{vehicle.pesoCarga} kg</span>
          <span>{t.llantas}:</span>
          <span className="text-right">{vehicle.tireCount}</span>
          <span>{t.dueno}:</span>
          <span className="text-right">
            {vehicle.cliente ? vehicle.cliente : "Propio"}
          </span>
          <span>{t.uniones}:</span>
          <span className="text-right">
            {vehicle.union && Array.isArray(vehicle.union) && vehicle.union.length > 0 
              ? vehicle.union.join(", ") 
              : t.ninguna}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(vehicle)}
            className="flex-1 bg-[#348CCB]/10 text-[#348CCB] px-3 py-2 rounded hover:bg-[#348CCB]/20 flex items-center justify-center text-sm"
          >
            <Edit className="w-4 h-4 mr-1" />
            {t.editar}
          </button>
          <button
            onClick={() => toggleUnionInput(vehicle.id)}
            className="flex-1 bg-[#1E76B6]/10 text-[#1E76B6] px-3 py-2 rounded hover:bg-[#1E76B6]/20 flex items-center justify-center text-sm"
          >
            {t.unir}
          </button>
          <button
            onClick={() => setVehicleToDelete(vehicle)}
            className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 flex items-center justify-center text-sm"
          >
            {t.eliminar}
          </button>
        </div>

        {showUnionInput[vehicle.id] && (
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder={t.placaOtroVehiculo}
              value={plateInputs[vehicle.id] || ""}
              onChange={(e) => handlePlateInputChange(vehicle.id, e.target.value)}
              className="flex-1 px-2 py-1 border rounded-md"
            />
            <button
              onClick={() => addUnion(vehicle.id)}
              className="px-2 bg-[#1E76B6] text-white rounded hover:bg-[#173D68]"
            >
              ➕
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const companyOptions = [t.allClients, ...companies.map(c => c.name)];

  return (
    <div className="min-h-screen text-[#0A183A] antialiased bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
          <div className="flex gap-3 items-center">
            {/* Company Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                className="px-4 py-2 bg-white border-2 border-[#348CCB]/30 text-[#0A183A] rounded-lg hover:bg-gray-50 flex items-center gap-2 min-w-[200px] justify-between"
              >
                <span className="text-sm font-medium">{t.selectClient}: {selectedCompany}</span>
                <ChevronDown size={16} />
              </button>
              {showCompanyDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 z-10 max-h-80 overflow-y-auto border-2 border-[#348CCB]/30">
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
            
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-[#1E76B6] text-white px-4 py-2 rounded-lg hover:bg-[#348CCB] flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t.addVehicle}
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <section className="bg-white shadow-lg rounded-lg border border-[#348CCB]/20">
          <div className="px-4 py-4 bg-[#173D68] text-white flex items-center rounded-t-lg">
            <h2 className="text-lg font-semibold">{t.vehicleList}</h2>
          </div>

          {loadingVehicles ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E76B6]"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Truck className="mx-auto h-12 w-12 text-[#348CCB]/50 mb-3" />
              <p>{t.noVehicles}</p>
            </div>
          ) : (
            <div className="p-4 space-y-8">
              {organizedVehicles.filter(group => group.length > 1).map((group, groupIndex) => (
                <div key={`connected-group-${groupIndex}`} className="mb-8">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">{t.connectedVehicles}</h3>
                  <div className="flex flex-row flex-nowrap overflow-x-auto pb-4">
                    {group.map((vehicle, vehicleIndex) => (
                      <div 
                        key={vehicle.id}
                        className={`${vehicleIndex > 0 ? 'ml-8' : ''} flex-shrink-0`}
                      >
                        <VehicleCard 
                          vehicle={vehicle} 
                          isConnected={true}
                          connectionIndex={vehicleIndex}
                          onRemoveConnection={vehicleIndex > 0 ? () => {
                            const currentVehicle = vehicle;
                            const previousVehicle = group[vehicleIndex - 1];
                            
                            if (previousVehicle.union && Array.isArray(previousVehicle.union) && 
                                previousVehicle.union.includes(currentVehicle.placa)) {
                              setUnionToDelete({
                                sourceId: previousVehicle.id,
                                targetPlaca: currentVehicle.placa
                              });
                            } else if (currentVehicle.union && Array.isArray(currentVehicle.union) && 
                                      currentVehicle.union.includes(previousVehicle.placa)) {
                              setUnionToDelete({
                                sourceId: currentVehicle.id,
                                targetPlaca: previousVehicle.placa
                              });
                            }
                          } : null}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {organizedVehicles.filter(group => group.length === 1).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">{t.individualVehicles}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organizedVehicles
                      .filter(group => group.length === 1)
                      .map((group) => (
                        <VehicleCard key={`single-${group[0].id}`} vehicle={group[0]} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Create Vehicle Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
              <div className="bg-[#173D68] text-white p-4 flex justify-between items-center rounded-t-lg">
                <h2>{t.createVehicle}</h2>
                <button onClick={() => setIsFormOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateVehicle} className="p-4 space-y-4">
                {/* Client Selection */}
                <div>
                  <label className="block mb-1 font-semibold">{t.selectClientForVehicle} <span className="text-red-500">*</span></label>
                  <select
                    value={formSelectedCompany}
                    onChange={(e) => setFormSelectedCompany(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-[#348CCB]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6]"
                  >
                    <option value="">{t.selectClientPlaceholder}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1">{t.placa}</label>
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toLowerCase())}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.kilometrajeActual}</label>
                  <input
                    type="number"
                    value={kilometrajeActual}
                    onChange={(e) => setKilometrajeActual(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.carga}</label>
                  <input
                    type="text"
                    value={carga}
                    onChange={(e) => setCarga(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.pesoCarga}</label>
                  <input
                    type="number"
                    value={pesoCarga}
                    onChange={(e) => setPesoCarga(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.tipoVehiculo}</label>
                  <select
                    value={tipovhc}
                    onChange={(e) => setTipovhc(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="2_ejes_trailer">{t.vehicleTypes["2_ejes_trailer"]}</option>
                    <option value="1_eje_cabezote">{t.vehicleTypes["1_eje_cabezote"]}</option>
                    <option value="3_ejes_trailer">{t.vehicleTypes["3_ejes_trailer"]}</option>
                    <option value="2_ejes_cabezote">{t.vehicleTypes["2_ejes_cabezote"]}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">{t.duenoOpcional}</label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={e => setCliente(e.target.value)}
                    placeholder={t.nombreCliente}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 border px-4 py-2 rounded"
                  >
                    {t.cancelar}
                  </button>
                  <button type="submit" className="flex-1 bg-[#1E76B6] text-white px-4 py-2 rounded">
                    {t.crear}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Vehicle Modal */}
        {vehicleToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
              <div className="bg-[#348CCB] text-white p-4 flex justify-between items-center rounded-t-lg">
                <h2>{t.editVehicle}</h2>
                <button onClick={() => setVehicleToEdit(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditVehicle} className="p-4 space-y-4">
                <div>
                  <label className="block mb-1">{t.placa}</label>
                  <input
                    type="text"
                    value={editFormData.placa}
                    onChange={(e) => setEditFormData({ ...editFormData, placa: e.target.value.toLowerCase() })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.kilometrajeActual}</label>
                  <input
                    type="number"
                    value={editFormData.kilometrajeActual}
                    onChange={(e) => setEditFormData({ ...editFormData, kilometrajeActual: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.carga}</label>
                  <input
                    type="text"
                    value={editFormData.carga}
                    onChange={(e) => setEditFormData({ ...editFormData, carga: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.pesoCarga}</label>
                  <input
                    type="number"
                    value={editFormData.pesoCarga}
                    onChange={(e) => setEditFormData({ ...editFormData, pesoCarga: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block mb-1">{t.tipoVehiculo}</label>
                  <select
                    value={editFormData.tipovhc}
                    onChange={(e) => setEditFormData({ ...editFormData, tipovhc: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="2_ejes_trailer">{t.vehicleTypes["2_ejes_trailer"]}</option>
                    <option value="1_eje_cabezote">{t.vehicleTypes["1_eje_cabezote"]}</option>
                    <option value="3_ejes_trailer">{t.vehicleTypes["3_ejes_trailer"]}</option>
                    <option value="2_ejes_cabezote">{t.vehicleTypes["2_ejes_cabezote"]}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">{t.duenoOpcional}</label>
                  <input
                    type="text"
                    value={editFormData.cliente}
                    onChange={(e) => setEditFormData({ ...editFormData, cliente: e.target.value })}
                    placeholder={t.nombreCliente}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{t.llantas}:</span>
                    <span className="font-semibold text-gray-900">{vehicleToEdit.tireCount || 0}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t.noSeEditaManualmente}</p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setVehicleToEdit(null)}
                    className="flex-1 border px-4 py-2 rounded"
                  >
                    {t.cancelar}
                  </button>
                  <button type="submit" className="flex-1 bg-[#348CCB] text-white px-4 py-2 rounded hover:bg-[#1E76B6]">
                    {t.guardarCambios}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Vehicle Modal */}
        {vehicleToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-lg mb-4">{t.eliminarVehiculo.replace('{placa}', vehicleToDelete.placa?.toUpperCase() || "este vehículo")}</h3>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setVehicleToDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  {t.cancelar}
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteVehicle(vehicleToDelete.id);
                    setVehicleToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  {t.eliminar}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Union Deletion Confirmation */}
        {unionToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-lg mb-4">{t.eliminarConexion}</h3>
              <p className="mb-4 text-gray-600">
                {t.eliminarConexionConfirm}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setUnionToDelete(null)}
                  className="px-4 py-2 border rounded"
                >
                  {t.cancelar}
                </button>
                <button
                  onClick={async () => {
                    if (unionToDelete) {
                      await removeUnion(unionToDelete.sourceId, unionToDelete.targetPlaca);
                    }
                  }}
                  className="px-4 py-2 bg-[#1E76B6] text-white rounded"
                >
                  {t.eliminarConexion}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}