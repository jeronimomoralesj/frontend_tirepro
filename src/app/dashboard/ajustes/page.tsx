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
    // Apple-style notification
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
  
  // Enhanced validation
  if (!newUserData.name || !newUserData.email || !newUserData.password) {
    showNotification(t.completeAllFields, "error");
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newUserData.email)) {
    showNotification("Please enter a valid email address", "error");
    return;
  }

  // Password validation
  if (newUserData.password.length < 6) {
    showNotification("Password must be at least 6 characters long", "error");
    return;
  }

  if (!user) return;

  // Get the token from localStorage
  const token = localStorage.getItem("token");
  if (!token) {
    showNotification("Authentication token missing. Please log in again.", "error");
    localStorage.clear();
    router.push("/login");
    return;
  }

  const payload = { 
    ...newUserData, 
    companyId: user.companyId,
    // Ensure email is lowercase
    email: newUserData.email.toLowerCase().trim(),
    name: newUserData.name.trim()
  };

  try {
    setLoading(true);
    
    console.log("Sending payload:", payload); // Debug log
    
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/register`
        : `https://api.tirepro.com.co/api/users/register`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Add authentication
        },
        body: JSON.stringify(payload),
      }
    );

    // Log the response for debugging
    console.log("Response status:", res.status);
    
    if (!res.ok) {
      // Try to get error details from response
      let errorMessage = t.errorCreatingUser;
      try {
        const errorData = await res.json();
        console.log("Error response:", errorData); // Debug log
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch{
        // If response is not JSON, use default message
        console.log("Could not parse error response");
      }
      throw new Error(errorMessage);
    }
    
    const result = await res.json();
    console.log("Success response:", result); // Debug log
    
    showNotification(result.message || "User created successfully", "success");
    fetchUsers(user.companyId);
    setNewUserData({ name: "", email: "", password: "", role: "regular" });
    
  } catch (err) {
    console.error("Error creating user:", err); // Debug log
    const errorMessage = err instanceof Error ? err.message : t.errorCreatingUser;
    showNotification(errorMessage, "error");
    setError(errorMessage);
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
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={toggleMobileMenu} />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t.menu}</h2>
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
                {t.dashboard}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                {t.logout}
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
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">{t.settings}</h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                {t.accountInfo}
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
              <nav className="grid grid-cols-2 sm:grid-cols-4 gap-1" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center justify-center px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                    activeTab === "profile"
                      ? "bg-gradient-to-r from-[#0A183A] to-[#173D68] text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <User className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{t.profile}</span>
                  <span className="sm:hidden">Profile</span>
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
                  <span className="hidden sm:inline">{t.company}</span>
                  <span className="sm:hidden">Company</span>
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
                      <span className="hidden sm:inline">{t.users}</span>
                      <span className="sm:hidden">Users</span>
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
                      <span className="hidden lg:inline">{t.newUser}</span>
                      <span className="lg:hidden">+</span>
                    </button>
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
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t.userInfo}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">{t.fullName}</label>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <p className="text-gray-900 text-sm sm:text-base">{user.name}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">{t.email}</label>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <p className="text-gray-900 text-sm sm:text-base break-all">{user.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">{t.userRole}</label>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            user.role === "admin" 
                              ? "bg-[#0A183A] text-white" 
                              : "bg-[#1E76B6] text-white"
                          }`}>
                            <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {user.role === "admin" ? t.administrator : t.regularUser}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">{t.assignedPlates}</label>
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
                            <p className="text-gray-500 text-sm">{t.noPlatesAssigned}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#0A183A] mb-4 sm:mb-6">{t.accountSecurity}</h3>
                    <button
                      onClick={() => setShowChange(!showChange)}
                      className="flex items-center justify-between w-full p-3 sm:p-4 lg:p-5 bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-[#348CCB] hover:bg-gray-50 transition-all duration-300 group"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4">
                          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium sm:font-semibold text-[#0A183A] text-sm sm:text-base">{t.changePassword}</p>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">Update your password</p>
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
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mx-auto mb-4 sm:mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] rounded-3xl transform rotate-3 opacity-20"></div>
                    <div className="relative w-full h-full bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={company.profileImage}
                        alt={`${company.name} Logo`}
                        className="w-3/4 h-3/4 object-cover rounded-2xl"
                      />
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A] mb-2 sm:mb-3">{company.name}</h2>
                  <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-full text-sm sm:text-base font-semibold shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                    {company.plan} Plan
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
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">{t.users}</div>
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
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">{t.vehicles}</div>
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
                        <div className="text-xs sm:text-sm text-gray-500 font-medium">{t.tires}</div>
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
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">{t.additionalConfig}</h3>
                          <p className="text-gray-300 text-sm sm:text-base">{t.contactSupport}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center mb-2 sm:mb-3">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-[#348CCB] mr-2" />
                          <span className="text-sm sm:text-base font-medium">Security Settings</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400">Manage access and permissions</p>
                      </div>
                      <div className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center mb-2 sm:mb-3">
                          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-[#348CCB] mr-2" />
                          <span className="text-sm sm:text-base font-medium">Contact Support</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400">Get help with configuration</p>
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
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A] mb-2 sm:mb-3">{t.userManagement}</h2>
                  <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto px-4">{t.manageUsers}</p>
                </div>

                {users.length === 0 ? (
                  <div className="text-center py-12 sm:py-16 lg:py-20">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                      <Users className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-gray-300" />
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0A183A] mb-3 sm:mb-4">{t.noUsers}</h3>
                    <p className="text-gray-600 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto px-4">{t.startAddingUser}</p>
                    <button
                      onClick={() => setActiveTab("addUser")}
                      className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white font-semibold rounded-xl sm:rounded-2xl hover:shadow-2xl hover:shadow-[#1E76B6]/25 transition-all duration-300 transform hover:-translate-y-1 text-sm sm:text-base"
                    >
                      <UserPlus className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                      {t.addUser}
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
                                  {u.role === "admin" ? t.administrator : t.regularUser}
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
                              {t.assignedPlatesLabel}
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
                                <p className="text-gray-500 font-medium text-sm sm:text-base">{t.noPlatesAssignedUser}</p>
                              </div>
                            )}
                          </div>

                          {/* Add Plate */}
                          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <h5 className="text-sm sm:text-base font-semibold text-[#0A183A] mb-3 sm:mb-4 flex items-center">
                              <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#348CCB]" />
                              Add New Plate
                            </h5>
                            <div className="flex flex-col sm:flex-row gap-3">
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
                                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-white text-sm sm:text-base"
                              />
                              <button
                                onClick={() => handleAddPlate(u.id)}
                                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white font-semibold rounded-xl sm:rounded-2xl hover:shadow-lg hover:shadow-[#1E76B6]/25 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center"
                              >
                                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                                <span className="hidden sm:inline">Add</span>
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
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A183A] mb-2 sm:mb-3">{t.addNewUser}</h2>
                  <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto px-4">Complete the form to add a new user to your organization</p>
                </div>

                {/* Form */}
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleAddUser} className="p-6 sm:p-8 lg:p-10">
                      <div className="space-y-4 sm:space-y-6">
                        {/* Name Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            {t.name} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newUserData.name}
                            onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                            placeholder="Enter full name"
                          />
                        </div>

                        {/* Email Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            {t.email} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={newUserData.email}
                            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                            placeholder="user@example.com"
                          />
                        </div>

                        {/* Password Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            {t.password} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={newUserData.password}
                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                            placeholder="Secure password"
                          />
                        </div>

                        {/* Role Field */}
                        <div>
                          <label className="block text-sm sm:text-base font-semibold text-[#0A183A] mb-2">
                            {t.role} <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newUserData.role}
                            onChange={(e) =>
                              setNewUserData({ ...newUserData, role: e.target.value })
                            }
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base"
                          >
                            <option value="regular">{t.regularUser}</option>
                            <option value="admin">{t.administrator}</option>
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
                              Creating...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                              {t.createUser}
                            </div>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
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