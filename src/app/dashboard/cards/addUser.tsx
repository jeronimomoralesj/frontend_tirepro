"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthProvider";
import { useRouter } from "next/navigation";
import { 
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  AlertCircle, 
  Check, 
  Building2,
  Shield,
} from "lucide-react";
type CompanyInfo = {
  name: string;
  plan: "Basic" | "Pro" | string;
  userCount: number;
};
export default function AddUser() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "regular",
    companyId: user?.companyId || "",
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  
  useEffect(() => {
    if (!user?.companyId) return;

    async function fetchCompanyInfo() {
      try {
        const res = await fetch(`https://api.tirepro.com.co/api/companies/${user!.companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Empresa no encontrada");
        const data = await res.json();
        setCompanyInfo(data);
      } catch {
        setError("No se pudo obtener información de la empresa.");
        setCompanyInfo(null);
      }      
    }    

    fetchCompanyInfo();
  }, [user?.companyId, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!companyInfo) {
      setError("Error: No se pudo verificar la empresa.");
      setLoading(false);
      return;
    }

    const maxUsers = companyInfo.plan === "Basic" ? 10 : 50;
    if (companyInfo.userCount >= maxUsers) {
      setError(`Este plan solo permite ${maxUsers} usuarios.`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("https://api.tirepro.com.co/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fallo en el registro del usuario.");

      setSuccess("Usuario registrado exitosamente");
      setForm({
        ...form,
        name: "",
        email: "",
        password: ""
      });
      
      // Redirección después de un breve retraso
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      
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
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Barra de navegación/Encabezado */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0A183A]">Agregar Usuario</h1>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[#348CCB]">
            <Building2 className="h-5 w-5" />
            <span className="text-[#0A183A] text-sm font-medium">{companyInfo?.name || "Mi Empresa"}</span>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Panel izquierdo - Información */}
          
          
          {/* Panel derecho - Formulario */}
          <div className="md:col-span-3 bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] p-6">
              <h2 className="text-xl font-semibold text-white">Registro de Usuario</h2>
              <p className="text-[#348CCB]/90 mt-1 text-sm">Añade un nuevo miembro a tu equipo</p>
            </div>

            {/* Mensajes de Notificación */}
            {error && (
              <div className="mx-6 mt-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
                <AlertCircle className="text-red-500 h-5 w-5 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mx-6 mt-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                <Check className="text-green-500 h-5 w-5 flex-shrink-0" />
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-5">
                {/* Selección de Rol */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#173D68] block">Rol</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        form.role === "regular"
                          ? "border-[#348CCB] bg-[#348CCB]/5"
                          : "border-gray-200 hover:border-[#348CCB]/30"
                      }`}
                      onClick={() => setForm({ ...form, role: "regular" })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <User className="h-5 w-5 text-[#348CCB]" />
                        <div className={`w-4 h-4 rounded-full ${
                          form.role === "regular" 
                            ? "bg-[#348CCB]" 
                            : "border border-gray-300"
                        }`}></div>
                      </div>
                      <h3 className="text-[#0A183A] font-medium">Regular</h3>
                      <p className="text-[#173D68]/70 text-xs mt-1">Usuario estándar con acceso limitado</p>
                    </div>
                    
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        form.role === "admin"
                          ? "border-[#348CCB] bg-[#348CCB]/5"
                          : "border-gray-200 hover:border-[#348CCB]/30"
                      }`}
                      onClick={() => setForm({ ...form, role: "admin" })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Shield className="h-5 w-5 text-[#348CCB]" />
                        <div className={`w-4 h-4 rounded-full ${
                          form.role === "admin" 
                            ? "bg-[#348CCB]" 
                            : "border border-gray-300"
                        }`}></div>
                      </div>
                      <h3 className="text-[#0A183A] font-medium">Administrador</h3>
                      <p className="text-[#173D68]/70 text-xs mt-1">Acceso completo a todas las funciones</p>
                    </div>
                  </div>
                  
                  {/* Select oculto para mantener el valor del formulario */}
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="hidden"
                  >
                    <option value="regular">Regular</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Campo Nombre */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#173D68] block">Nombre Completo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User className="h-5 w-5 text-[#1E76B6]" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ingresa el nombre completo"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 text-[#0A183A] rounded-lg border border-gray-200 focus:border-[#348CCB] focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30 transition-colors placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Campo Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#173D68] block">Correo Electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-5 w-5 text-[#1E76B6]" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Ingresa el correo electrónico"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 text-[#0A183A] rounded-lg border border-gray-200 focus:border-[#348CCB] focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30 transition-colors placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#173D68] block">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-5 w-5 text-[#1E76B6]" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      placeholder="Ingresa una contraseña segura"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 text-[#0A183A] rounded-lg border border-gray-200 focus:border-[#348CCB] focus:outline-none focus:ring-1 focus:ring-[#348CCB]/30 transition-colors placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Botón de Envío */}
                <div className="pt-2 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#1E76B6] to-[#348CCB] text-white rounded-lg hover:from-[#348CCB] hover:to-[#1E76B6] transition-all duration-300 font-medium shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        <span>Registrar Usuario</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}