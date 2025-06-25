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

// Language translations
const translations = {
  es: {
    settings: "Ajustes",
    dashboard: "Dashboard",
    logout: "Cerrar Sesión",
    menu: "Menú",
    loading: "Cargando...",
    profile: "Perfil",
    myProfile: "Mi Perfil",
    company: "Empresa",
    users: "Usuarios",
    newUser: "Nuevo Usuario",
    new: "Nuevo",
    userInfo: "Información de Usuario",
    personalData: "Tus datos personales y acceso",
    userId: "ID de Usuario",
    fullName: "Nombre Completo",
    email: "Correo Electrónico",
    userRole: "Rol del Usuario",
    assignedPlates: "Placas de Vehículos Asignadas",
    noPlatesAssigned: "No hay placas de vehículos asignadas",
    accountSecurity: "Seguridad de la Cuenta",
    changePassword: "Cambiar Contraseña",
    hideChangePassword: "Ocultar Cambio de Contraseña",
    administrator: "Administrador",
    regularUser: "Usuario Regular",
    companyInfo: "Información de Empresa",
    organizationData: "Datos de tu organización",
    plan: "Plan",
    vehicles: "Vehículos",
    tires: "Llantas",
    additionalConfig: "Configuración adicional",
    contactSupport: "Para cambiar la configuración de la empresa, contacta a soporte técnico.",
    userManagement: "Gestión de Usuarios",
    manageUsers: "Administra los usuarios de tu empresa",
    noUsers: "No hay usuarios",
    startAddingUser: "Comienza agregando un nuevo usuario a tu empresa.",
    addUser: "Agregar Usuario",
    assignedPlatesLabel: "Placas Asignadas",
    noPlatesAssignedUser: "No hay placas asignadas",
    newPlate: "Nueva placa",
    addPlate: "Agregar Placa",
    addNewUser: "Agregar Nuevo Usuario",
    name: "Nombre",
    password: "Contraseña",
    role: "Rol",
    createUser: "Crear Usuario",
    completeAllFields: "Complete todos los campos para crear un usuario",
    errorCreatingUser: "Error al crear el usuario",
    errorDeletingUser: "Error al eliminar el usuario",
    userDeletedSuccess: "Usuario eliminado exitosamente",
    enterValidPlate: "Ingrese una placa válida.",
    errorAddingPlate: "Error al agregar la placa",
    plateAddedSuccess: "Placa agregada exitosamente",
    errorRemovingPlate: "Error al remover la placa",
    plateRemovedSuccess: "Placa removida exitosamente",
    accountInfo: "Administra la información de tu cuenta y empresa"
  },
  en: {
    settings: "Settings",
    dashboard: "Dashboard",
    logout: "Sign Out",
    menu: "Menu",
    loading: "Loading...",
    profile: "Profile",
    myProfile: "My Profile",
    company: "Company",
    users: "Users",
    newUser: "New User",
    new: "New",
    userInfo: "User Information",
    personalData: "Your personal data and access",
    userId: "User ID",
    fullName: "Full Name",
    email: "Email Address",
    userRole: "User Role",
    assignedPlates: "Assigned Vehicle Plates",
    noPlatesAssigned: "No vehicle plates assigned",
    accountSecurity: "Account Security",
    changePassword: "Change Password",
    hideChangePassword: "Hide Change Password",
    administrator: "Administrator",
    regularUser: "Regular User",
    companyInfo: "Company Information",
    organizationData: "Your organization data",
    plan: "Plan",
    vehicles: "Vehicles",
    tires: "Tires",
    additionalConfig: "Additional Configuration",
    contactSupport: "To change company settings, contact technical support.",
    userManagement: "User Management",
    manageUsers: "Manage your company users",
    noUsers: "No users",
    startAddingUser: "Start by adding a new user to your company.",
    addUser: "Add User",
    assignedPlatesLabel: "Assigned Plates",
    noPlatesAssignedUser: "No plates assigned",
    newPlate: "New plate",
    addPlate: "Add Plate",
    addNewUser: "Add New User",
    name: "Name",
    password: "Password",
    role: "Role",
    createUser: "Create User",
    completeAllFields: "Complete all fields to create a user",
    errorCreatingUser: "Error creating user",
    errorDeletingUser: "Error deleting user",
    userDeletedSuccess: "User deleted successfully",
    enterValidPlate: "Enter a valid plate.",
    errorAddingPlate: "Error adding plate",
    plateAddedSuccess: "Plate added successfully",
    errorRemovingPlate: "Error removing plate",
    plateRemovedSuccess: "Plate removed successfully",
    accountInfo: "Manage your account and company information"
  }
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
  const [language, setLanguage] = useState<'en'|'es'>('es');

  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    role: "regular",
  });
  const [plateInputs, setPlateInputs] = useState<{ [userId: string]: string }>({});

  const t = translations[language];

  // Language detection
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = localStorage.getItem('preferredLanguage') as 'en'|'es';
      if (saved) {
        setLanguage(saved);
        return;
      }
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject('no geo');
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout:10000 });
        });
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        if (resp.ok) {
          const { countryCode } = await resp.json();
          const lang = (countryCode==='US'||countryCode==='CA') ? 'en' : 'es';
          setLanguage(lang);
          localStorage.setItem('preferredLanguage', lang);
          return;
        }
      } catch {
        // fallback
      }
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };
    detectAndSetLanguage();
  }, []);

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

  async function handleDeleteUser(userId: string) {
    try {
      setLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`
          : `https://api.tirepro.com.co/api/users/${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(t.errorDeletingUser);
      showNotification(t.userDeletedSuccess, "success");
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
      showNotification(t.completeAllFields, "error");
      return;
    }
    if (!user) return;
    const payload = { ...newUserData, companyId: user.companyId };
    try {
      setLoading(true);
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/register`
          : `https://api.tirepro.com.co/api/users/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(t.errorCreatingUser);
      const result = await res.json();
      showNotification(result.message, "success");
      fetchUsers(user.companyId);
      setNewUserData({ name: "", email: "", password: "", role: "regular" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPlate(userId: string) {
    const plate = plateInputs[userId];
    if (!plate || plate.trim() === "") {
      showNotification(t.enterValidPlate, "error");
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
      if (!res.ok) throw new Error(t.errorAddingPlate);
      const updatedUser = await res.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, plates: updatedUser.plates } : u
        )
      );
      setPlateInputs((prev) => ({ ...prev, [userId]: "" }));
      showNotification(t.plateAddedSuccess, "success");
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
      if (!res.ok) throw new Error(t.errorRemovingPlate);
      const updatedUser = await res.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, plates: updatedUser.plates } : u
        )
      );
      showNotification(t.plateRemovedSuccess, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top navigation bar for mobile */}
      <div className="fixed top-0 left-0 w-full bg-white shadow-lg z-30 lg:hidden border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6] rounded-md p-1"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <span className="ml-3 text-lg font-bold text-[#0A183A]">{t.settings}</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center text-[#0A183A] hover:text-red-500 transition-colors p-2 rounded-md hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobileMenu}></div>
          <div className="fixed top-0 left-0 h-full w-80 max-w-xs bg-white shadow-xl transform transition-transform z-50">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0A183A]">{t.menu}</h2>
                <button onClick={toggleMobileMenu} className="text-[#0A183A] hover:text-[#1E76B6] p-1 rounded-md">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <nav className="p-6">
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/dashboard" 
                    className="flex items-center p-3 text-[#0A183A] hover:bg-[#1E76B6] hover:text-white rounded-lg transition-colors"
                    onClick={toggleMobileMenu}
                  >
                    <LayoutDashboard className="h-5 w-5 mr-3" />
                    {t.dashboard}
                  </Link>
                </li>
                <li>
                  <div className="flex items-center p-3 bg-[#1E76B6] text-white rounded-lg">
                    <Settings className="h-5 w-5 mr-3" />
                    {t.settings}
                  </div>
                </li>
                <li>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center p-3 text-[#0A183A] hover:bg-red-500 hover:text-white rounded-lg w-full transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    {t.logout}
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full max-w-7xl mx-auto pt-20 lg:pt-8 px-4 sm:px-6 lg:px-8">
        <main className="flex-1">
          <div className="py-6 lg:py-8">
            {/* Settings header */}
            <div className="mb-8">
              <div className="text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A]">{t.settings}</h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">{t.accountInfo}</p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-[#1E76B6] border-b-[#1E76B6] border-l-transparent border-r-transparent mx-auto"></div>
                  <p className="mt-4 text-center text-[#0A183A] font-medium">{t.loading}</p>
                </div>
              </div>
            )}

            {/* Settings tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex overflow-x-auto" aria-label="Tabs">
                <div className="flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max px-1">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center transition-colors ${
                      activeTab === "profile"
                        ? "border-[#1E76B6] text-[#1E76B6]"
                        : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                    }`}
                  >
                    <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">{t.profile}</span>
                    <span className="sm:hidden">{t.myProfile}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("company")}
                    className={`whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center transition-colors ${
                      activeTab === "company"
                        ? "border-[#1E76B6] text-[#1E76B6]"
                        : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                    }`}
                  >
                    <Building className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {t.company}
                  </button>
                  {user?.role === "admin" && (
                    <>
                      <button
                        onClick={() => setActiveTab("users")}
                        className={`whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center transition-colors ${
                          activeTab === "users"
                            ? "border-[#1E76B6] text-[#1E76B6]"
                            : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                        }`}
                      >
                        <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        {t.users}
                      </button>
                      <button
                        onClick={() => setActiveTab("addUser")}
                        className={`whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center transition-colors ${
                          activeTab === "addUser"
                            ? "border-[#1E76B6] text-[#1E76B6]"
                            : "border-transparent text-gray-500 hover:text-[#348CCB] hover:border-gray-300"
                        }`}
                      >
                        <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline">{t.newUser}</span>
                        <span className="sm:hidden">{t.new}</span>
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </div>

            {/* Tab content */}
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              {/* Profile Tab */}
              {activeTab === "profile" && user && (
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row items-center mb-6 lg:mb-8">
                    <div className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white p-3 sm:p-4 rounded-full mr-0 sm:mr-6 mb-4 sm:mb-0">
                      <User className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0A183A]">{t.userInfo}</h2>
                      <p className="text-sm sm:text-base text-gray-600 mt-1">{t.personalData}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{t.userId}</p>
                      <div className="text-sm sm:text-base text-[#0A183A] bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 break-all">
                        {user.id}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{t.fullName}</p>
                      <div className="text-sm sm:text-base text-[#0A183A] bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 flex items-center">
                        <User className="h-4 w-4 text-[#1E76B6] mr-3 flex-shrink-0" />
                        <span className="truncate">{user.name}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{t.email}</p>
                      <div className="text-sm sm:text-base text-[#0A183A] bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 flex items-center">
                        <Mail className="h-4 w-4 text-[#1E76B6] mr-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{t.userRole}</p>
                      <div className="text-sm sm:text-base text-[#0A183A] bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 flex items-center">
                        <Shield className="h-4 w-4 text-[#1E76B6] mr-3 flex-shrink-0" />
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            user.role === "admin"
                              ? "bg-[#173D68] text-white"
                              : "bg-[#348CCB] text-white"
                          }`}
                        >
                          {user.role === "admin" ? t.administrator : t.regularUser}
                        </span>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-2">
                      <p className="text-sm font-medium text-gray-600">{t.assignedPlates}</p>
                      <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 min-h-16">
                        {user.plates && user.plates.length > 0 ? (
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            {user.plates.map((plate) => (
                              <span
                                key={plate}
                                className="inline-flex items-center px-3 py-2 rounded-full text-xs sm:text-sm font-medium bg-[#1E76B6] text-white"
                              >
                                <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                {plate}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">{t.noPlatesAssigned}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-gray-200">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#0A183A] mb-4">{t.accountSecurity}</h3>
                    <button
                      onClick={() => setShowChange((v) => !v)}
                      className="w-full sm:w-auto px-6 py-3 bg-[#1E76B6] text-white rounded-xl hover:bg-[#348CCB] transition-colors font-medium"
                    >
                      {showChange ? t.hideChangePassword : t.changePassword}
                    </button>

                    {showChange && (
                      <div className="mt-6 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
                       <CambiarContrasena />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Company tab */}
              {activeTab === "company" && company && (
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row items-center mb-6 lg:mb-8">
                    <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-3 sm:p-4 rounded-full mr-0 sm:mr-6 mb-4 sm:mb-0">
                      <Building className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0A183A]">Información de Empresa</h2>
                      <p className="text-sm sm:text-base text-gray-600 mt-1">Datos de tu organización</p>
                    </div>
                  </div>
                  
                  {/* Company details card */}
                  <div className="flex flex-col sm:flex-row items-center mb-8 bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-[#1E76B6] mb-4 sm:mb-0 sm:mr-6 flex-shrink-0">
                      <img
                        src={company.profileImage}
                        alt={`${company.name} Logo`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <h3 className="text-lg sm:text-2xl font-bold text-[#0A183A] mb-2">{company.name}</h3>
                      <div className="flex justify-center sm:justify-start">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-[#348CCB] text-white">
                          Plan: {company.plan}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {user?.role === "admin" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mt-6 lg:mt-8">
                        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-[#0A183A]">{t.users}</h4>
                            <div className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] p-2 rounded-lg">
                              <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex items-baseline">
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A]">{company.userCount}</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-500 font-medium">usuarios</span>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-[#0A183A]">{t.vehicles}</h4>
                            <div className="bg-gradient-to-r from-[#173D68] to-[#1E76B6] p-2 rounded-lg">
                              <Car className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex items-baseline">
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A]">{company.vehicleCount}</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-500 font-medium">vehículos</span>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-[#0A183A]">{t.tires}</h4>
                            <div className="bg-gradient-to-r from-[#348CCB] to-[#1E76B6] p-2 rounded-lg">
                              <svg className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="2" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex items-baseline">
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A]">{company.tireCount}</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-500 font-medium">llantas</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 lg:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                        <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] rounded-xl p-4 sm:p-6 lg:p-8">
                          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2">{t.additionalConfig}</h3>
                          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                            {t.contactSupport}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Users tab (Admin only) */}
              {activeTab === "users" && user?.role === "admin" && (
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 sm:mb-6">
                    <div className="bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white p-2 sm:p-3 rounded-xl mr-0 sm:mr-4 mb-3 sm:mb-0">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0A183A]">{t.userManagement}</h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">{t.manageUsers}</p>
                    </div>
                  </div>
                  
                  {users.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 lg:py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                      <div className="bg-gray-50 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4">
                        <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-[#0A183A] mb-2">{t.noUsers}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-sm mx-auto px-4">
                        {t.startAddingUser}
                      </p>
                      <button
                        onClick={() => setActiveTab("addUser")}
                        className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white text-xs sm:text-sm font-medium rounded-xl hover:from-[#0A183A] hover:to-[#173D68] transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        {t.addUser}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {users.map((u) => (
                        <div key={u.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                          <div className="bg-gray-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                              <div className="flex items-center mb-3 sm:mb-0">
                                <div className="bg-gradient-to-r from-[#1E76B6] to-[#348CCB] bg-opacity-10 text-[#1E76B6] p-2 sm:p-3 rounded-xl mr-3 flex-shrink-0">
                                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <div>
                                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-[#0A183A]">{u.name}</h3>
                                  <p className="text-xs sm:text-sm text-gray-500 break-all">{u.email}</p>
                                  <span className={`inline-flex items-center px-2 py-1 mt-1 text-xs font-medium rounded-full ${
                                    u.role === "admin" 
                                      ? "bg-[#0A183A] text-white" 
                                      : "bg-[#348CCB] text-white"
                                  }`}>
                                    <Shield className="h-3 w-3 mr-1" />
                                    {u.role === "admin" ? t.administrator : t.regularUser}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="self-end sm:self-center text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-200"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-3 sm:p-4 lg:p-6">
                            <div className="mb-4">
                              <h4 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 flex items-center">
                                <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                {t.assignedPlatesLabel}
                              </h4>
                              {u.plates && u.plates.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {u.plates.map((plate) => (
                                    <div key={plate} className="flex items-center bg-gray-100 hover:bg-gray-200 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-colors group">
                                      <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-[#1E76B6]" />
                                      <span className="text-xs sm:text-sm font-medium text-[#0A183A]">{plate}</span>
                                      <button
                                        onClick={() => handleRemovePlate(u.id, plate)}
                                        className="ml-1 sm:ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                      >
                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-xs sm:text-sm italic bg-gray-50 p-2 sm:p-3 rounded-lg">{t.noPlatesAssignedUser}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2 sm:space-y-3">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  placeholder={t.newPlate}
                                  value={plateInputs[u.id] || ""}
                                  onChange={(e) =>
                                    setPlateInputs((prev) => ({
                                      ...prev,
                                      [u.id]: e.target.value.toUpperCase(),
                                    }))
                                  }
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200"
                                />
                                <button
                                  onClick={() => handleAddPlate(u.id)}
                                  className="w-full sm:w-auto inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white text-xs sm:text-sm font-medium rounded-lg hover:from-[#1E76B6] hover:to-[#0A183A] transition-all duration-300 shadow-sm hover:shadow-md"
                                >
                                  <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  {t.addPlate}
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
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 sm:mb-6">
                    <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white p-2 sm:p-3 rounded-xl mr-0 sm:mr-4 mb-3 sm:mb-0">
                      <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0A183A]">{t.addNewUser}</h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Completa el formulario para agregar un nuevo usuario</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <form onSubmit={handleAddUser} className="p-4 sm:p-6 lg:p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-semibold text-[#0A183A]">
                            {t.name} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newUserData.name}
                            onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200"
                            placeholder="Nombre completo del usuario"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-semibold text-[#0A183A]">
                            {t.email} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={newUserData.email}
                            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200"
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-semibold text-[#0A183A]">
                            {t.password} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={newUserData.password}
                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200"
                            placeholder="Contraseña segura"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-semibold text-[#0A183A]">
                            {t.role} <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newUserData.role}
                            onChange={(e) =>
                              setNewUserData({ ...newUserData, role: e.target.value })
                            }
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200"
                          >
                            <option value="regular">{t.regularUser}</option>
                            <option value="admin">{t.administrator}</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white text-sm sm:text-base font-semibold rounded-xl hover:from-[#0A183A] hover:to-[#173D68] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <UserPlus className="inline-block mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          {t.createUser}
                        </button>
                      </div>
                    </form>
                  </div>
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