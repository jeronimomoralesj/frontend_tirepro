"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Car,
  LogOut,
  User,
  X,
  Building,
  UserPlus,
  Trash2,
  AlertCircle,
  Tag,
  Mail,
  Shield,
  Users,
  PlusCircle,
  ChevronRight,
  Upload,
  Search,
  CheckCircle,
  XCircle
} from "lucide-react";
import CambiarContrasena from "./CambiarContraseña";

// Define the types for User and Company
export type UserData = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
  plates: string[];
};

export type CompanyData = {
  id: string;
  name: string;
  profileImage: string;
  periodicity: number;
  userCount: number;
  tireCount: number;
  plan: string;
  vehicleCount: number;
};

export type DistributorCompany = {
  id: string;
  name: string;
  plan: string;
  profileImage: string;
};

const AjustesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showChange, setShowChange] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    role: "regular",
  });
  const [plateInputs, setPlateInputs] = useState<{ [userId: string]: string }>({});
  
  // Distributor search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DistributorCompany[]>([]);
  const [selectedDistributors, setSelectedDistributors] = useState<DistributorCompany[]>([]);
  const [connectedDistributors, setConnectedDistributors] = useState<DistributorCompany[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [grantingAccess, setGrantingAccess] = useState(false);

  function showNotification(message: string, type: "success" | "error") {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 min-w-80 max-w-md p-4 rounded-2xl shadow-2xl transition-all duration-500 transform translate-x-full ${
      type === 'success' 
        ? 'bg-green-50 border border-green-200 text-green-800' 
        : 'bg-red-50 border border-red-200 text-red-800'
    }`;
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0 mr-3">
          ${type === 'success' 
            ? '<div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>'
            : '<div class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>'
          }
        </div>
        <div class="text-sm font-medium">${message}</div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      const parsedUser: UserData = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.companyId) {
        fetchCompany(parsedUser.companyId);
        if (parsedUser.role === "admin") {
          fetchUsers(parsedUser.companyId);
          fetchConnectedDistributors(parsedUser.companyId);
        }
      } else {
        setError("No company assigned to user");
      }
    } else {
      localStorage.clear();
      router.push("/login");
    }
    setLoading(false);
  }, [router]);

  // Debounced search for distributors
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchCompanies(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function searchCompanies(query: string) {
    if (!user) return;
    
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setSearchLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/search/by-name?q=${encodeURIComponent(query)}&exclude=${user.companyId}`
          : `https://api.tirepro.com.co/api/companies/search/by-name?q=${encodeURIComponent(query)}&exclude=${user.companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Error al buscar distribuidores");
      
      const data = await res.json();
      // Filter only distributors
      const distributors = data.filter(
  (c: DistributorCompany) => c.plan === 'distribuidor'
);
      setSearchResults(distributors);
    } catch (err) {
      console.error("Error searching companies:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function fetchConnectedDistributors(companyId: string) {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${companyId}/distributors`
          : `https://api.tirepro.com.co/api/companies/${companyId}/distributors`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setConnectedDistributors(data);
      }
    } catch (err) {
      console.error("Error fetching connected distributors:", err);
    }
  }

  function addDistributor(distributor: DistributorCompany) {
    setSelectedDistributors(prev =>
      prev.some(d => d.id === distributor.id)
        ? prev
        : [...prev, distributor]
    );
  }

  function removeDistributor(distributorId: string) {
    setSelectedDistributors(prev => prev.filter(d => d.id !== distributorId));
  }

  async function grantAccess(distributorId: string) {
  if (!user) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch(
    process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${user.companyId}/distributors/${distributorId}`
      : `https://api.tirepro.com.co/api/companies/${user.companyId}/distributors/${distributorId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to grant distributor access');
  }
}
  async function handleGrantAccess() {
    if (selectedDistributors.length === 0) {
      showNotification("Selecciona al menos un distribuidor", "error");
      return;
    }

    try {
      setGrantingAccess(true);
      await Promise.all(
        selectedDistributors.map(d => grantAccess(d.id))
      );
      
      showNotification("Acceso otorgado exitosamente", "success");
      setSelectedDistributors([]);
      setSearchQuery("");
      setSearchResults([]);
      
      if (user) {
        fetchConnectedDistributors(user.companyId);
      }
    } catch (err) {
      showNotification("Error al otorgar acceso", "error");
    } finally {
      setGrantingAccess(false);
    }
  }

  async function revokeAccess(distributorId: string) {
  if (!user) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${user.companyId}/distributors/${distributorId}`
        : `https://api.tirepro.com.co/api/companies/${user.companyId}/distributors/${distributorId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to revoke distributor access');
    }

    showNotification("Acceso revocado exitosamente", "success");
    fetchConnectedDistributors(user.companyId);
  } catch (err) {
    console.error(err);
    showNotification("Error al revocar acceso", "error");
  }
}

  async function handleDeleteUser(userId: string) {
    try {
      setLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`
          : `https://api.tirepro.com.co/api/users/${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Error al eliminar el usuario");
      showNotification("Usuario eliminado exitosamente", "success");
      if (user) fetchUsers(user.companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCompany(companyId: string) {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${companyId}`
          : `https://api.tirepro.com.co/api/companies/${companyId}`
      );
      if (!res.ok) throw new Error("Failed to fetch company data");
      const data = await res.json();
      setCompany(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }    
  }

  async function fetchUsers(companyId: string) {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users?companyId=${companyId}`
          : `https://api.tirepro.com.co/api/users?companyId=${companyId}`
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }    
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      showNotification("Complete todos los campos para crear un usuario", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserData.email)) {
      showNotification("Ingrese un correo electrónico válido", "error");
      return;
    }

    if (newUserData.password.length < 6) {
      showNotification("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }

    if (!user) return;

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Token de autenticación faltante. Por favor inicie sesión nuevamente.", "error");
      localStorage.clear();
      router.push("/login");
      return;
    }

    const payload = { 
      ...newUserData, 
      companyId: user.companyId,
      email: newUserData.email.toLowerCase().trim(),
      name: newUserData.name.trim()
    };

    try {
      setLoading(true);
      
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/register`
          : `https://api.tirepro.com.co/api/users/register`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (!res.ok) {
        let errorMessage = "Error al crear el usuario";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      showNotification(result.message || "Usuario creado exitosamente", "success");
      fetchUsers(user.companyId);
      setNewUserData({ name: "", email: "", password: "", role: "regular" });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear el usuario";
      showNotification(errorMessage, "error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPlate(userId: string) {
    const plate = plateInputs[userId];
    if (!plate || plate.trim() === "") {
      showNotification("Ingrese una placa válida.", "error");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/add-plate/${userId}`
          : `https://api.tirepro.com.co/api/users/add-plate/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plate: plate.trim() }),
        }
      );
      if (!res.ok) throw new Error("Error al agregar la placa");
      const updatedUser = await res.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, plates: updatedUser.plates } : u
        )
      );
      setPlateInputs((prev) => ({ ...prev, [userId]: "" }));
      showNotification("Placa agregada exitosamente", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePlate(userId: string, plate: string) {
    try {
      setLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/remove-plate/${userId}`
          : `https://api.tirepro.com.co/api/users/remove-plate/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plate }),
        }
      );
      if (!res.ok) throw new Error("Error al remover la placa");
      const updatedUser = await res.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, plates: updatedUser.plates } : u
        )
      );
      showNotification("Placa removida exitosamente", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);

      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${company.id}/logo`
          : `https://api.tirepro.com.co/api/companies/${company.id}/logo`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageBase64: base64 }),
        }
      );

      if (!res.ok) {
        showNotification("Error al actualizar el logo de la empresa", "error");
        return;
      }

      const updatedCompany = await res.json();
      setCompany(updatedCompany);
      showNotification("Logo actualizado exitosamente", "success");
    };

    reader.readAsDataURL(file);
  };

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={toggleMobileMenu} />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <Link
                href="/dashboard"
                className="flex items-center px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                onClick={toggleMobileMenu}
              >
                <LayoutDashboard className="h-5 w-5 mr-3" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="py-6 sm:py-8 lg:py-10">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">Ajustes</h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Administra la información de tu cuenta y empresa
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
              <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center justify-center px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                    activeTab === "profile"
                      ? "bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <User className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Perfil</span>
                </button>
                <button
                  onClick={() => setActiveTab("company")}
                  className={`flex items-center justify-center px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                    activeTab === "company"
                      ? "bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Building className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Empresa</span>
                </button>
                {user?.role === "admin" && (
                  <>
                    <button
                      onClick={() => setActiveTab("users")}
                      className={`flex items-center justify-center px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                        activeTab === "users"
                          ? "bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white shadow-lg"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <Users className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Usuarios</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("addUser")}
                      className={`flex items-center justify-center px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                        activeTab === "addUser"
                          ? "bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white shadow-lg"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden lg:inline">Nuevo Usuario</span>
                      <span className="lg:hidden">+</span>
                    </button>
                    {company?.plan !== "distribuidor" && (
                    <button
                      onClick={() => setActiveTab("distributors")}
                      className={`flex items-center justify-center px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                        activeTab === "distributors"
                          ? "bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white shadow-lg"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <Search className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Distribuidores</span>
                    </button>
                    )}
                  </>
                )}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {/* Profile Tab */}
            {activeTab === "profile" && user && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{user.name}</h2>
                  <p className="text-sm sm:text-base text-gray-600">{user.email}</p>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* User Details */}
                  <div className="bg-gray-50 rounded-2xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Información de Usuario</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <p className="text-gray-900 text-sm sm:text-base">{user.name}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Correo Electrónico</label>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <p className="text-gray-900 text-sm sm:text-base break-all">{user.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Rol del Usuario</label>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            user.role === "admin" 
                              ? "bg-[#0A183A] text-white" 
                              : "bg-[#1E76B6] text-white"
                          }`}>
                            <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {user.role === "admin" ? "Administrador" : "Usuario Regular"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Placas de Vehículos Asignadas</label>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 min-h-12">
                          {user.plates && user.plates.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {user.plates.map((plate) => (
                                <span
                                  key={plate}
                                  className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-100 text-gray-800"
                                >
                                  <Tag className="h-3 w-3 mr-1" />
                                  {plate}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No hay placas de vehículos asignadas</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#0A183A] mb-4 sm:mb-6">Seguridad de la Cuenta</h3>
                    <button
                      onClick={() => setShowChange(!showChange)}
                      className="flex items-center justify-between w-full p-3 sm:p-4 lg:p-5 bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-[#348CCB] hover:bg-gray-50 transition-all duration-300 group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4">
                          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium sm:font-semibold text-[#0A183A] text-sm sm:text-base">Cambiar Contraseña</p>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">Actualiza tu contraseña</p>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 sm:h-6 sm:w-6 text-gray-400 transition-transform duration-300 ${showChange ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {showChange && (
                      <div className="mt-4 sm:mt-6 p-3 sm:p-4 lg:p-6 bg-white rounded-xl sm:rounded-2xl border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                        <CambiarContrasena />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Company tab */}
            {activeTab === "company" && company && (
              <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
                {/* Header Section */}
                <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mx-auto mb-4 sm:mb-6 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-3xl transform rotate-3 opacity-20"></div>

                    <div className="relative w-full h-full bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={logoPreview || company.profileImage}
                        alt={`${company.name} Logo`}
                        className="w-3/4 h-3/4 object-cover rounded-2xl"
                      />

                      {user?.role === "admin" && (
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                          <Upload className="h-6 w-6 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A] mb-2 sm:mb-3">
                    {company.name}
                  </h2>

                  <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-full text-sm sm:text-base font-semibold shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                    Plan {company.plan}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 lg:mb-12">
                  {/* Users Card */}
                  <div className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-[#1E76B6]/10 transition-all duration-500 hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-xl sm:rounded-2xl shadow-lg">
                        <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A]">{company.userCount}</div>
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">Usuarios</div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-full w-4/5 transition-all duration-1000"></div>
                    </div>
                  </div>

                  {/* Vehicles Card */}
                  <div className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-[#173D68]/10 transition-all duration-500 hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-[#173D68] to-[#1E76B6] rounded-xl sm:rounded-2xl shadow-lg">
                        <Car className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A]">{company.vehicleCount}</div>
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">Vehículos</div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#173D68] to-[#1E76B6] rounded-full w-3/5 transition-all duration-1000"></div>
                    </div>
                  </div>

                  {/* Tires Card */}
                  <div className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-[#348CCB]/10 transition-all duration-500 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] rounded-xl sm:rounded-2xl shadow-lg">
                        <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A]">{company.tireCount}</div>
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">Llantas</div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#348CCB] to-[#1E76B6] rounded-full w-5/6 transition-all duration-1000"></div>
                    </div>
                  </div>
                </div>

                {/* Additional Configuration */}
                {user?.role === "admin" && (
                  <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center mb-6 sm:mb-8">
                      <div className="flex items-center mb-4 sm:mb-0">
                        <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl mr-3 sm:mr-4">
                          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">Configuración adicional</h3>
                          <p className="text-gray-300 text-sm sm:text-base">Para cambiar la configuración de la empresa, contacta a soporte técnico.</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center mb-2 sm:mb-3">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-[#348CCB] mr-2" />
                          <span className="text-sm sm:text-base font-medium">Configuración de Seguridad</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400">Administrar acceso y permisos</p>
                      </div>
                      <div className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center mb-2 sm:mb-3">
                          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-[#348CCB] mr-2" />
                          <span className="text-sm sm:text-base font-medium">Contactar Soporte</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400">Obtener ayuda con la configuración</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Users tab (Admin only) */}
            {activeTab === "users" && user?.role === "admin" && (
              <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                    <Users className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A] mb-2 sm:mb-3">Gestión de Usuarios</h2>
                  <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto px-4">Administra los usuarios de tu empresa</p>
                </div>

                {users.length === 0 ? (
                  <div className="text-center py-12 sm:py-16 lg:py-20">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                      <Users className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-gray-300" />
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0A183A] mb-3 sm:mb-4">No hay usuarios</h3>
                    <p className="text-gray-600 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto px-4">Comienza agregando un nuevo usuario a tu empresa.</p>
                    <button
                      onClick={() => setActiveTab("addUser")}
                      className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white font-semibold rounded-xl sm:rounded-2xl hover:shadow-2xl hover:shadow-[#1E76B6]/25 transition-all duration-300 transform hover:-translate-y-1 text-sm sm:text-base"
                    >
                      <UserPlus className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                      Agregar Usuario
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {users.map((u) => (
                      <div key={u.id} className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-500/10 transition-all duration-500">
                        {/* User Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-6 shadow-lg">
                                <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg sm:text-xl font-bold text-[#0A183A] mb-1">{u.name}</h3>
                                <p className="text-gray-600 text-sm sm:text-base mb-2 break-all">{u.email}</p>
                                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                                  u.role === "admin" 
                                    ? "bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white" 
                                    : "bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white"
                                }`}>
                                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  {u.role === "admin" ? "Administrador" : "Usuario Regular"}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 sm:p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl sm:rounded-2xl transition-all duration-200 group self-start sm:self-center"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        </div>

                        {/* User Content */}
                        <div className="p-4 sm:p-6 lg:p-8">
                          {/* Assigned Plates */}
                          <div className="mb-4 sm:mb-6">
                            <h4 className="text-base sm:text-lg font-semibold text-[#0A183A] mb-3 sm:mb-4 flex items-center">
                              <Tag className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#1E76B6]" />
                              Placas Asignadas
                            </h4>
                            {u.plates && u.plates.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                {u.plates.map((plate) => (
                                  <div key={plate} className="group flex items-center bg-gray-50 hover:bg-gray-100 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-200 border border-gray-200">
                                    <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-[#1E76B6] flex-shrink-0" />
                                    <span className="font-medium text-[#0A183A] text-sm sm:text-base flex-1 truncate">{plate}</span>
                                    <button
                                      onClick={() => handleRemovePlate(u.id, plate)}
                                      className="ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-full hover:bg-red-50 flex-shrink-0"
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200">
                                <Tag className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                                <p className="text-gray-500 font-medium text-sm sm:text-base">No hay placas asignadas</p>
                              </div>
                            )}
                          </div>

                          {/* Add Plate */}
                          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <h5 className="text-sm sm:text-base font-semibold text-[#0A183A] mb-3 sm:mb-4 flex items-center">
                              <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#348CCB]" />
                              Agregar Nueva Placa
                            </h5>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <input
                                type="text"
                                placeholder="Nueva placa"
                                value={plateInputs[u.id] || ""}
                                onChange={(e) =>
                                  setPlateInputs((prev) => ({
                                    ...prev,
                                    [u.id]: e.target.value.toUpperCase(),
                                  }))
                                }
                                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-white text-sm sm:text-base"
                              />
                              <button
                                onClick={() => handleAddPlate(u.id)}
                                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white font-semibold rounded-xl sm:rounded-2xl hover:shadow-lg hover:shadow-[#1E76B6]/25 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center"
                              >
                                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                                <span className="hidden sm:inline">Agregar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add User tab (Admin only) */}
            {activeTab === "addUser" && user?.role === "admin" && (
              <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                    <UserPlus className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A] mb-2 sm:mb-3">Agregar Nuevo Usuario</h2>
                  <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto px-4">Complete el formulario para agregar un nuevo usuario a su organización</p>
                </div>

                {/* Form */}
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleAddUser} className="p-6 sm:p-8 lg:p-10">
                      <div className="space-y-4 sm:space-y-6">
                        {/* Name Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            Nombre <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newUserData.name}
                            onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                            placeholder="Ingrese el nombre completo"
                          />
                        </div>

                        {/* Email Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            Correo Electrónico <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={newUserData.email}
                            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                            placeholder="usuario@ejemplo.com"
                          />
                        </div>

                        {/* Password Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            Contraseña <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={newUserData.password}
                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                            placeholder="Contraseña segura"
                          />
                        </div>

                        {/* Role Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            Rol <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newUserData.role}
                            onChange={(e) =>
                              setNewUserData({ ...newUserData, role: e.target.value })
                            }
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                          >
                            <option value="regular">Usuario Regular</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white font-semibold rounded-xl sm:rounded-2xl hover:shadow-2xl hover:shadow-[#1E76B6]/25 transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
                        >
                          {loading ? (
                            <div className="flex items-center justify-center">
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Creando...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                              Crear Usuario
                            </div>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Distributors tab (Admin only) */}
            {activeTab === "distributors" && user?.role === "admin" && company?.plan !== "distribuidor" && (
              <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                    <Search className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A] mb-2 sm:mb-3">Buscar Distribuidor</h2>
                  <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto px-4">Encuentra y otorga acceso a distribuidores</p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-8">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar distribuidor por nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-white text-sm sm:text-base"
                    />
                    {searchLoading && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-[#1E76B6] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && searchResults.length > 0 && (
                  <div className="max-w-2xl mx-auto mb-8">
                    <h3 className="text-lg font-semibold text-[#0A183A] mb-4">Resultados de Búsqueda</h3>
                    <div className="space-y-3">
                      {searchResults.map((distributor) => (
                        <div
                          key={distributor.id}
                          onClick={() => addDistributor(distributor)}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#1E76B6] hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex items-center">
                            <img
                              src={distributor.profileImage}
                              alt={distributor.name}
                              className="w-12 h-12 rounded-xl object-cover mr-4"
                            />
                            <div>
                              <h4 className="font-semibold text-[#0A183A]">{distributor.name}</h4>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#1E76B6] text-white mt-1">
                                Distribuidor
                              </span>
                            </div>
                          </div>
                          <PlusCircle className="h-6 w-6 text-[#1E76B6]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                  <div className="text-center py-12 max-w-2xl mx-auto">
                    <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron distribuidores</p>
                  </div>
                )}

                {/* Selected Distributors */}
                {selectedDistributors.length > 0 && (
                  <div className="max-w-2xl mx-auto mb-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-[#0A183A] mb-4">Distribuidores Seleccionados</h3>
                      <div className="space-y-3 mb-6">
                        {selectedDistributors.map((distributor) => (
                          <div
                            key={distributor.id}
                            className="flex items-center justify-between p-4 bg-white rounded-xl"
                          >
                            <div className="flex items-center">
                              <img
                                src={distributor.profileImage}
                                alt={distributor.name}
                                className="w-10 h-10 rounded-lg object-cover mr-3"
                              />
                              <span className="font-medium text-[#0A183A]">{distributor.name}</span>
                            </div>
                            <button
                              onClick={() => removeDistributor(distributor.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleGrantAccess}
                        disabled={grantingAccess}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#1E76B6]/25 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {grantingAccess ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Otorgando Acceso...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Otorgar Acceso ({selectedDistributors.length})
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Connected Distributors */}
<div className="max-w-2xl mx-auto">
  <h3 className="text-lg font-semibold text-[#0A183A] mb-4">
    Distribuidores Conectados
  </h3>

  {connectedDistributors.length > 0 ? (
    <div className="space-y-3">
      {connectedDistributors.map((access) => {
        const company = access.distributor;

        return (
          <div
            key={company.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl"
          >
            <div className="flex items-center">
              <img
                src={company.profileImage}
                alt={company.name}
                className="w-12 h-12 rounded-xl object-cover mr-4"
              />

              <div>
                <h4 className="font-semibold text-[#0A183A]">
                  {company.name}
                </h4>

                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                revokeAccess(access.distributorId)
              }
              className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
            >
              Revocar Acceso
            </button>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 font-medium">
        No hay distribuidores conectados
      </p>
      <p className="text-gray-400 text-sm mt-2">
        Busca y otorga acceso a distribuidores arriba
      </p>
    </div>
  )}
</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjustesPage;