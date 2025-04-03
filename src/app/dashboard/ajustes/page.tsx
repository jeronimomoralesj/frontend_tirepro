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
  Menu,
  X,
  Building,
  UserPlus,
  Trash2,
  AlertCircle,
  Tag,
  Mail,
  Shield,
  Users,
  PlusCircle
} from "lucide-react";
import Image from "next/image";

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

const AjustesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'company' | 'users' | 'addUser'
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    role: "regular",
  });
  const [plateInputs, setPlateInputs] = useState<{ [userId: string]: string }>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Notification function (simple alert for now)
  function showNotification(message: string, type: "success" | "error") {
    alert(`${type.toUpperCase()}: ${message}`);
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

  async function fetchCompany(companyId: string) {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${companyId}`
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/companies/${companyId}`
      );
      if (!res.ok) throw new Error("Failed to fetch company data");
      const data = await res.json();
      setCompany(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Mensaje de error desconocido");
      } else {
        setError("Ocurrió un error inesperado");
      }
    }    
  }

  async function fetchUsers(companyId: string) {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users?companyId=${companyId}`
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/users?companyId=${companyId}`
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Mensaje de error desconocido");
      } else {
        setError("Ocurrió un error inesperado");
      }
    }    
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      showNotification("Complete todos los campos para crear un usuario", "error");
      return;
    }
    if (!user) return;
    const payload = {
      ...newUserData,
      companyId: user.companyId,
    };
    try {
      setLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/register`
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/users/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        throw new Error("Error al crear el usuario");
      }
      const result = await res.json();
      showNotification(result.message, "success");
      // Refresh the users list
      fetchUsers(user.companyId);
      setNewUserData({ name: "", email: "", password: "", role: "regular" });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Mensaje de error desconocido");
      } else {
        setError("Ocurrió un error inesperado");
      }
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
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/users/add-plate/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plate: plate.trim() }),
        }
      );
      if (!res.ok) {
        throw new Error("Error al agregar la placa");
      }
      const updatedUser = await res.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, plates: updatedUser.plates } : u
        )
      );
      setPlateInputs((prev) => ({ ...prev, [userId]: "" }));
      showNotification("Placa agregada exitosamente", "success");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Mensaje de error desconocido");
      } else {
        setError("Ocurrió un error inesperado");
      }
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
          : `http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/users/remove-plate/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plate }),
        }
      );
      if (!res.ok) {
        throw new Error("Error al remover la placa");
      }
      const updatedUser = await res.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, plates: updatedUser.plates } : u
        )
      );
      showNotification("Placa removida exitosamente", "success");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Mensaje de error desconocido");
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  }


  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen">
      {/* Top navigation bar for mobile */}
      <div className="fixed top-0 left-0 w-full bg-white shadow-md z-30 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 focus:outline-none"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <span className="ml-3 text-lg font-bold text-[#0A183A]">Ajustes</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-700 hover:text-red-500"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50" onClick={toggleMobileMenu}>
          <div 
            className="absolute top-0 left-0 h-full w-3/4 max-w-xs bg-white shadow-xl transform transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#0A183A]">Menu</h2>
            </div>
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="flex items-center p-2 text-gray-700 hover:bg-[#1E76B6] hover:text-white rounded-md">
                    <LayoutDashboard className="h-5 w-5 mr-3" />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="flex items-center p-2 bg-[#1E76B6] text-white rounded-md">
                    <Settings className="h-5 w-5 mr-3" />
                    Ajustes
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center p-2 text-gray-700 hover:bg-red-500 hover:text-white rounded-md w-full"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full max-w-6xl mx-auto pt-16 md:pt-6 px-4 sm:px-6 lg:px-8">
        <main className="flex-1">
          <div className="py-8">
            {/* Settings header */}
            <div className="md:flex md:items-center md:justify-between mb-8">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-[#0A183A] text-center md:text-left">Ajustes</h1>
                <p className="mt-1 text-sm text-gray-500 text-center md:text-left">
                  Administra la información de tu cuenta y empresa
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-100 text-red-800 p-4 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#1E76B6] mx-auto"></div>
                  <p className="mt-4 text-center text-[#0A183A] font-medium">Cargando...</p>
                </div>
              </div>
            )}

            {/* Settings tabs - scrollable on mobile */}
            <div className="mb-6 border-b border-gray-200 overflow-x-auto">
              <nav className="-mb-px flex space-x-4 md:space-x-8 p-1" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === "profile"
                      ? "border-[#1E76B6] text-[#1E76B6]"
                      : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                  }`}
                >
                  <User className="mr-2 h-5 w-5" />
                  Perfil
                </button>
                <button
                  onClick={() => setActiveTab("company")}
                  className={`whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === "company"
                      ? "border-[#1E76B6] text-[#1E76B6]"
                      : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                  }`}
                >
                  <Building className="mr-2 h-5 w-5" />
                  Empresa
                </button>
                {user?.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("users")}
                    className={`whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm flex items-center transition-colors ${
                      activeTab === "users"
                        ? "border-[#1E76B6] text-[#1E76B6]"
                        : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                    }`}
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Usuarios
                  </button>
                )}
                {user?.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("addUser")}
                    className={`whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm flex items-center transition-colors ${
                      activeTab === "addUser"
                        ? "border-[#1E76B6] text-[#1E76B6]"
                        : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                    }`}
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Nuevo Usuario
                  </button>
                )}
              </nav>
            </div>

            {/* Tab content with improved card styling */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
              {/* Profile tab */}
              {activeTab === "profile" && user && (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center mb-6">
                    <div className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white p-3 rounded-full mr-0 sm:mr-4 mb-3 sm:mb-0">
                      <User className="h-8 w-8" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl font-bold text-[#0A183A]">Información de Usuario</h2>
                      <p className="text-sm text-gray-500">Tus datos personales y acceso</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">ID</p>
                      <p className="text-base text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 overflow-auto">
                        {user.id}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Nombre</p>
                      <p className="text-base text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center">
                        <User className="h-4 w-4 text-[#1E76B6] mr-2 flex-shrink-0" />
                        {user.name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-base text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center overflow-hidden">
                        <Mail className="h-4 w-4 text-[#1E76B6] mr-2 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Rol</p>
                      <p className="text-base text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center">
                        <Shield className="h-4 w-4 text-[#1E76B6] mr-2 flex-shrink-0" />
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === "admin"
                              ? "bg-[#173D68] text-white"
                              : "bg-[#348CCB] text-white"
                          }`}
                        >
                          {user.role === "admin" ? "Administrador" : "Usuario Regular"}
                        </span>
                      </p>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <p className="text-sm font-medium text-gray-500">Placas Asignadas</p>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-12">
                        {user.plates && user.plates.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {user.plates.map((plate) => (
                              <span
                                key={plate}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#1E76B6] text-white"
                              >
                                <Tag className="h-4 w-4 mr-1" />
                                {plate}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No hay placas asignadas</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-[#0A183A]">Cambiar Contraseña</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Para cambiar tu contraseña, contacta al administrador del sistema.
                    </p>
                  </div>
                </div>
              )}

              {/* Company tab */}
              {activeTab === "company" && company && (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center mb-6">
                    <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-3 rounded-full mr-0 sm:mr-4 mb-3 sm:mb-0">
                      <Building className="h-8 w-8" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl font-bold text-[#0A183A]">Información de Empresa</h2>
                      <p className="text-sm text-gray-500">Datos de tu organización</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#1E76B6] mb-4 sm:mb-0 sm:mr-6 flex-shrink-0">
                      <Image
                        src={company.profileImage}
                        alt={`${company.name} Logo`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-2xl font-bold text-[#0A183A]">{company.name}</h3>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#348CCB] text-white">
                          Plan: {company.plan}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {user?.role === "admin" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 rounded-lg bg-gradient-to-r from-[#0A183A] to-[#173D68] p-4 sm:p-6 text-white">
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
                          <h4 className="text-lg font-medium text-black">Usuarios</h4>
                          <div className="flex items-center mt-2">
                            <Users className="h-8 w-8 mr-3 text-[#348CCB]" />
                            <span className="text-3xl font-bold text-black">{company.userCount}</span>
                          </div>
                        </div>
                        
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
                          <h4 className="text-lg font-medium text-black">Vehículos</h4>
                          <div className="flex items-center mt-2">
                            <Car className="h-8 w-8 mr-3 text-[#348CCB]" />
                            <span className="text-3xl font-bold text-black">{company.vehicleCount}</span>
                          </div>
                        </div>
                        
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
                          <h4 className="text-lg font-medium text-black">Llantas</h4>
                          <div className="flex items-center mt-2">
                            <svg className="h-8 w-8 mr-3 text-[#348CCB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="2" />
                            </svg>
                            <span className="text-3xl font-bold text-black">{company.tireCount}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-[#0A183A]">Configuración adicional</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Para cambiar la configuración de la empresa, contacta a soporte técnico.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Users tab (Admin only) */}
              {activeTab === "users" && user?.role === "admin" && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="bg-[#348CCB] text-white p-3 rounded-full mr-4">
                      <Users className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#0A183A]">Gestión de Usuarios</h2>
                      <p className="text-sm text-gray-500">Administra los usuarios de tu empresa</p>
                    </div>
                  </div>
                  
                  {users.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Users className="h-12 w-12 mx-auto text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Comienza agregando un nuevo usuario a tu empresa.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={() => setActiveTab("addUser")}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#1E76B6] hover:bg-[#348CCB]"
                        >
                          <UserPlus className="mr-2 h-5 w-5" />
                          Agregar Usuario
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((u) => (
                        <div key={u.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center">
                            <div className="flex items-center">
                              <div className="bg-[#1E76B6] bg-opacity-20 text-[#1E76B6] p-2 rounded-full mr-3">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-base font-medium text-[#0A183A]">{u.name}</h3>
                                <p className="text-sm text-gray-500">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center mt-2 sm:mt-0">
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                u.role === "admin" 
                                  ? "bg-purple-100 text-purple-800" 
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {u.role === "admin" ? "Administrador" : "Usuario Regular"}
                              </span>
                              <button
                                onClick={() => setConfirmDelete(u.id)}
                                className="ml-4 text-red-600 hover:text-red-800 focus:outline-none"
                              >
                                <Trash2 className="w-6 h-6" />
                              </button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Placas Asignadas</h4>
                            {u.plates && u.plates.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {u.plates.map((plate) => (
                                  <div key={plate} className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                                    <Tag className="h-4 w-4 mr-1 text-gray-500" />
                                    <span className="text-sm text-gray-700">{plate}</span>
                                    <button
                                      onClick={() => handleRemovePlate(u.id, plate)}
                                      className="ml-1 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No hay placas asignadas</p>
                            )}
                            <div className="mt-2">
                              <input
                                type="text"
                                placeholder="Nueva placa"
                                value={plateInputs[u.id] || ""}
                                onChange={(e) =>
                                  setPlateInputs((prev) => ({
                                    ...prev,
                                    [u.id]: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                              <button
                                onClick={() => handleAddPlate(u.id)}
                                className="mt-2 w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                              >
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Agregar Placa
                              </button>
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
                <div className="p-6">
                  <h2 className="text-xl font-bold text-[#0A183A] mb-4">Agregar Nuevo Usuario</h2>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Nombre</label>
                      <input
                        type="text"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <input
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Contraseña</label>
                      <input
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Rol</label>
                      <select
                        value={newUserData.role}
                        onChange={(e) =>
                          setNewUserData({ ...newUserData, role: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="regular">Usuario Regular</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-[#1E76B6] text-white rounded-md hover:bg-[#348CCB] transition-colors"
                    >
                      Crear Usuario
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AjustesPage;
