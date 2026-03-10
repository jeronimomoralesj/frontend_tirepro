"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
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
  XCircle,
  Loader2,
  Building2,
  Link2,
  Link2Off,
} from "lucide-react";
import CambiarContrasena from "./CambiarContraseña";

// =============================================================================
// Types
// =============================================================================

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
  // The GET /:companyId/distributors endpoint returns access objects with nested distributor
  distributor?: DistributorCompany;
  distributorId?: string;
};

// =============================================================================
// Helpers
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

// =============================================================================
// Toast
// =============================================================================

type Toast = { id: number; message: string; type: "success" | "error" };

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto transition-all"
          style={{
            background: t.type === "success" ? "rgba(22,163,74,0.96)" : "rgba(220,38,38,0.96)",
            minWidth: 260, maxWidth: 360,
          }}
          onClick={() => onDismiss(t.id)}
        >
          {t.type === "success"
            ? <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />}
          <span className="text-white text-sm font-medium flex-1">{t.message}</span>
          <X className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Design-system micro-components
// =============================================================================

/** White panel card */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
    >
      {children}
    </div>
  );
}

/** Section heading row inside a card */
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h3>
    </div>
  );
}

/** Input field styled to brand */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = { background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" };

/** Brand gradient button */
function PrimaryBtn({ children, onClick, disabled, type = "button", className = "" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  type?: "button" | "submit"; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 ${className}`}
      style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
    >
      {children}
    </button>
  );
}

/** Ghost / outline button */
function GhostBtn({ children, onClick, className = "" }: {
  children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-gray-100 ${className}`}
      style={{ border: "1px solid rgba(10,24,58,0.12)", color: "#0A183A" }}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Tab nav definition
// =============================================================================

type TabId = "profile" | "company" | "users" | "addUser" | "distributors";

// =============================================================================
// Main Page
// =============================================================================

const AjustesPage: React.FC = () => {
  const router = useRouter();

  const [user,    setUser]    = useState<UserData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [users,   setUsers]   = useState<UserData[]>([]);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);
  const [toasts,  setToasts]  = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [showChange,   setShowChange]   = useState(false);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);

  const [newUserData, setNewUserData] = useState({ name: "", email: "", password: "", role: "regular" });
  const [plateInputs, setPlateInputs] = useState<Record<string, string>>({});
  const [savingUser,  setSavingUser]  = useState(false);

  // Distributor tab
  const [searchQuery,           setSearchQuery]           = useState("");
  const [searchResults,         setSearchResults]         = useState<DistributorCompany[]>([]);
  const [selectedDistributors,  setSelectedDistributors]  = useState<DistributorCompany[]>([]);
  const [connectedDistributors, setConnectedDistributors] = useState<DistributorCompany[]>([]);
  const [searchLoading,         setSearchLoading]         = useState(false);
  const [grantingAccess,        setGrantingAccess]        = useState(false);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const toast = useCallback((message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchCompany = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/companies/${companyId}`);
      if (!res.ok) throw new Error("Error al cargar empresa");
      setCompany(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  }, []);

  const fetchUsers = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/users?companyId=${companyId}`);
      if (!res.ok) throw new Error("Error al cargar usuarios");
      setUsers(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  }, []);

  const fetchConnectedDistributors = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/companies/${companyId}/distributors`);
      if (res.ok) setConnectedDistributors(await res.json());
    } catch { /* silent */ }
  }, []);

  // ── Auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser  = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (!storedUser || !storedToken) { localStorage.clear(); router.push("/login"); return; }
    const parsed: UserData = JSON.parse(storedUser);
    setUser(parsed);
    if (parsed.companyId) {
      fetchCompany(parsed.companyId);
      if (parsed.role === "admin") {
        fetchUsers(parsed.companyId);
        fetchConnectedDistributors(parsed.companyId);
      }
    } else {
      setError("No hay empresa asignada al usuario");
    }
    setLoading(false);
  }, [router, fetchCompany, fetchUsers, fetchConnectedDistributors]);

  // ── Distributor search (debounced) ────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      if (!user) return;
      setSearchLoading(true);
      try {
        const res = await authFetch(
          `${API_BASE}/companies/search/by-name?q=${encodeURIComponent(searchQuery)}&exclude=${user.companyId}`
        );
        if (!res.ok) throw new Error();
        const data: DistributorCompany[] = await res.json();
        setSearchResults(data.filter((c) => c.plan === "distribuidor"));
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, user]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      const res = await authFetch(`${API_BASE}/companies/${company.id}/logo`, {
        method: "PATCH", body: JSON.stringify({ imageBase64: base64 }),
      });
      if (!res.ok) { toast("Error al actualizar el logo", "error"); return; }
      setCompany(await res.json());
      toast("Logo actualizado exitosamente", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      toast("Complete todos los campos", "error"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserData.email)) {
      toast("Correo electrónico inválido", "error"); return;
    }
    if (newUserData.password.length < 6) {
      toast("La contraseña debe tener al menos 6 caracteres", "error"); return;
    }
    if (!user) return;
    setSavingUser(true);
    try {
      const res = await authFetch(`${API_BASE}/users/register`, {
        method: "POST",
        body: JSON.stringify({
          ...newUserData,
          companyId: user.companyId,
          email: newUserData.email.toLowerCase().trim(),
          name: newUserData.name.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al crear usuario");
      }
      const result = await res.json();
      toast(result.message || "Usuario creado exitosamente", "success");
      fetchUsers(user.companyId);
      setNewUserData({ name: "", email: "", password: "", role: "regular" });
      setActiveTab("users");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error inesperado", "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    try {
      const res = await authFetch(`${API_BASE}/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar usuario");
      toast("Usuario eliminado", "success");
      if (user) fetchUsers(user.companyId);
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  const handleAddPlate = async (userId: string) => {
    const plate = plateInputs[userId]?.trim();
    if (!plate) { toast("Ingrese una placa válida", "error"); return; }
    try {
      // Backend: PATCH /users/add-plate/:id  with body { plate }
      const res = await authFetch(`${API_BASE}/users/add-plate/${userId}`, {
        method: "PATCH", body: JSON.stringify({ plate }),
      });
      if (!res.ok) throw new Error("Error al agregar placa");
      const updated: UserData = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plates: updated.plates } : u));
      setPlateInputs((prev) => ({ ...prev, [userId]: "" }));
      toast("Placa agregada", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  const handleRemovePlate = async (userId: string, plate: string) => {
    try {
      // Backend: PATCH /users/remove-plate/:id  with body { plate }
      const res = await authFetch(`${API_BASE}/users/remove-plate/${userId}`, {
        method: "PATCH", body: JSON.stringify({ plate }),
      });
      if (!res.ok) throw new Error("Error al remover placa");
      const updated: UserData = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plates: updated.plates } : u));
      toast("Placa removida", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  // Distributor access
  const addToSelection = (d: DistributorCompany) =>
    setSelectedDistributors((prev) => prev.some((x) => x.id === d.id) ? prev : [...prev, d]);

  const removeFromSelection = (id: string) =>
    setSelectedDistributors((prev) => prev.filter((d) => d.id !== id));

  const handleGrantAccess = async () => {
    if (!selectedDistributors.length) { toast("Selecciona al menos un distribuidor", "error"); return; }
    setGrantingAccess(true);
    try {
      await Promise.all(selectedDistributors.map((d) =>
        authFetch(`${API_BASE}/companies/${user!.companyId}/distributors/${d.id}`, { method: "POST" })
      ));
      toast("Acceso otorgado exitosamente", "success");
      setSelectedDistributors([]); setSearchQuery(""); setSearchResults([]);
      fetchConnectedDistributors(user!.companyId);
    } catch { toast("Error al otorgar acceso", "error"); }
    finally { setGrantingAccess(false); }
  };

  const handleRevokeAccess = async (distributorId: string) => {
    if (!window.confirm("¿Revocar acceso a este distribuidor?")) return;
    try {
      const res = await authFetch(
        `${API_BASE}/companies/${user!.companyId}/distributors/${distributorId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Error al revocar acceso");
      toast("Acceso revocado exitosamente", "success");
      fetchConnectedDistributors(user!.companyId);
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean; hideForDistributor?: boolean }[] = [
    { id: "profile",      label: "Perfil",          icon: User                             },
    { id: "company",      label: "Empresa",         icon: Building                         },
    { id: "users",        label: "Usuarios",        icon: Users,    adminOnly: true        },
    { id: "addUser",      label: "Nuevo Usuario",   icon: UserPlus, adminOnly: true        },
    { id: "distributors", label: "Distribuidores",  icon: Link2,    adminOnly: true, hideForDistributor: true },
  ];

  // ==========================================================================
  // Render
  // ==========================================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#ffffff" }}>
        <div className="flex items-center gap-3 text-[#1E76B6]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Cargando ajustes…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none tracking-tight">Ajustes</h1>
            <p className="text-xs text-[#348CCB] mt-0.5">
              {user?.name ?? ""} · {company?.name ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-red-50"
          style={{ border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* ── Tab nav ── */}
        <Card className="p-1.5">
          <nav className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tabs.filter((t) => (!t.adminOnly || user?.role === "admin") && (!t.hideForDistributor || company?.plan !== "distribuidor")).length}, minmax(0,1fr))` }}>
            {tabs
              .filter((t) => (!t.adminOnly || user?.role === "admin") && (!t.hideForDistributor || company?.plan !== "distribuidor"))
              .map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
                    style={{
                      background: active ? "linear-gradient(135deg, #0A183A, #173D68)" : "transparent",
                      color: active ? "white" : "#6B7280",
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">{tab.label}</span>
                  </button>
                );
              })}
          </nav>
        </Card>

        {/* ================================================================ */}
        {/* PROFILE TAB                                                       */}
        {/* ================================================================ */}
        {activeTab === "profile" && user && (
          <div className="space-y-4">
            {/* User info card */}
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-[#0A183A] text-lg leading-tight truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <span
                    className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: user.role === "admin" ? "#0A183A" : "#1E76B6" }}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    {user.role === "admin" ? "Administrador" : "Usuario Regular"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Nombre", value: user.name },
                  { label: "Correo", value: user.email },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                    <div className="px-3 py-2.5 rounded-xl text-sm font-medium text-[#0A183A] break-all" style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.12)" }}>
                      {value}
                    </div>
                  </div>
                ))}

                {user.plates && user.plates.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Placas asignadas</p>
                    <div className="flex flex-wrap gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.12)" }}>
                      {user.plates.map((plate) => (
                        <span key={plate} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}>
                          <Tag className="w-2.5 h-2.5" />{plate}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Security card */}
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={Shield} title="Seguridad" />
              <button
                onClick={() => setShowChange(!showChange)}
                className="w-full flex items-center justify-between p-4 rounded-xl transition-all hover:bg-gray-50"
                style={{ border: "1px solid rgba(52,140,203,0.15)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#0A183A]">Cambiar Contraseña</p>
                    <p className="text-xs text-gray-500">Actualiza tu contraseña de acceso</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#1E76B6] transition-transform ${showChange ? "rotate-90" : ""}`} />
              </button>
              {showChange && (
                <div className="mt-3 p-4 rounded-xl" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                  <CambiarContrasena />
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================================================================ */}
        {/* COMPANY TAB                                                       */}
        {/* ================================================================ */}
        {activeTab === "company" && company && (
          <div className="space-y-4">
            {/* Logo + name */}
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Logo */}
                <div className="relative flex-shrink-0 group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(52,140,203,0.2)" }}>
                    <img
                      src={logoPreview || company.profileImage}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {user?.role === "admin" && (
                    <label className="absolute inset-0 flex items-center justify-center rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(10,24,58,0.5)" }}>
                      <Upload className="w-5 h-5 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-black text-[#0A183A] leading-tight">{company.name}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-black text-white"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Plan {company.plan}
                  </span>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Usuarios",   value: company.userCount,    icon: Users,     grad: "linear-gradient(135deg, #0A183A, #173D68)" },
                { label: "Vehículos",  value: company.vehicleCount, icon: Car,       grad: "linear-gradient(135deg, #173D68, #1E76B6)" },
                { label: "Llantas",    value: company.tireCount,    icon: Building2, grad: "linear-gradient(135deg, #1E76B6, #348CCB)" },
              ].map(({ label, value, icon: Icon, grad }) => (
                <Card key={label} className="p-4 sm:p-5 flex flex-col gap-2">
                  <div className="p-2 rounded-xl self-start" style={{ background: grad }}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-black leading-none">{value}cccc</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                </Card>
              ))}
            </div>

            {/* Admin config note */}
            {user?.role === "admin" && (
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}>
                <SectionTitle icon={Settings} title="" />
                <div className="flex items-center gap-3 mb-5">
                  <Settings className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="font-black text-white text-sm">Configuración adicional</p>
                    <p className="text-xs text-white/60 mt-0.5">Contacta a soporte para cambios en la empresa</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Shield, label: "Configuración de Seguridad", sub: "Permisos y acceso" },
                    { icon: Mail,   label: "Contactar Soporte",           sub: "Ayuda técnica" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Icon className="w-4 h-4 text-[#348CCB] flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">{label}</p>
                        <p className="text-[10px] text-white/50">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* USERS TAB                                                         */}
        {/* ================================================================ */}
        {activeTab === "users" && user?.role === "admin" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#0A183A]">{users.length} usuario{users.length !== 1 ? "s" : ""}</p>
              <PrimaryBtn onClick={() => setActiveTab("addUser")}>
                <UserPlus className="w-4 h-4" /> Nuevo
              </PrimaryBtn>
            </div>

            {users.length === 0 ? (
              <Card className="p-10 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-400">No hay usuarios aún</p>
              </Card>
            ) : (
              users.map((u) => (
                <Card key={u.id} className="overflow-hidden">
                  {/* User header */}
                  <div className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(52,140,203,0.1)", background: "rgba(10,24,58,0.02)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-[#0A183A] truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: u.role === "admin" ? "#0A183A" : "#1E76B6" }}>
                        <Shield className="w-2.5 h-2.5" />{u.role === "admin" ? "Admin" : "Regular"}
                      </span>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 rounded-xl transition-all hover:bg-red-50"
                        style={{ color: "#DC2626" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Plates section */}
                  <div className="p-4 sm:p-5">
                    <SectionTitle icon={Tag} title="Placas Asignadas" />
                    {u.plates?.length ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {u.plates.map((plate) => (
                          <span
                            key={plate}
                            className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-bold group"
                            style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.2)" }}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {plate}
                            <button
                              onClick={() => handleRemovePlate(u.id, plate)}
                              className="p-0.5 rounded-full hover:bg-red-100 transition-colors"
                              style={{ color: "#DC2626" }}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 mb-4 rounded-xl text-xs text-gray-400 font-medium" style={{ border: "2px dashed rgba(52,140,203,0.15)" }}>
                        Sin placas asignadas
                      </div>
                    )}

                    {/* Add plate form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nueva placa…"
                        value={plateInputs[u.id] ?? ""}
                        onChange={(e) => setPlateInputs((prev) => ({ ...prev, [u.id]: e.target.value.toUpperCase() }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAddPlate(u.id)}
                        className={`${inputCls} flex-1`}
                        style={inputStyle}
                      />
                      <PrimaryBtn onClick={() => handleAddPlate(u.id)}>
                        <PlusCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Agregar</span>
                      </PrimaryBtn>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* ADD USER TAB                                                      */}
        {/* ================================================================ */}
        {activeTab === "addUser" && user?.role === "admin" && (
          <Card className="p-5 sm:p-6 max-w-xl mx-auto">
            <SectionTitle icon={UserPlus} title="Nuevo Usuario" />
            <form onSubmit={handleAddUser} className="space-y-4">
              <Field label="Nombre" required>
                <input
                  type="text" value={newUserData.name} placeholder="Nombre completo"
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className={inputCls} style={inputStyle}
                />
              </Field>
              <Field label="Correo Electrónico" required>
                <input
                  type="email" value={newUserData.email} placeholder="usuario@ejemplo.com"
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className={inputCls} style={inputStyle}
                />
              </Field>
              <Field label="Contraseña" required>
                <input
                  type="password" value={newUserData.password} placeholder="Mínimo 6 caracteres"
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className={inputCls} style={inputStyle}
                />
              </Field>
              <Field label="Rol">
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className={inputCls} style={inputStyle}
                >
                  <option value="regular">Usuario Regular</option>
                  <option value="admin">Administrador</option>
                </select>
              </Field>
              <div className="pt-2 flex gap-2">
                <GhostBtn onClick={() => setActiveTab("users")} className="flex-1">Cancelar</GhostBtn>
                <PrimaryBtn type="submit" disabled={savingUser} className="flex-1">
                  {savingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando…</> : <><UserPlus className="w-4 h-4" /> Crear Usuario</>}
                </PrimaryBtn>
              </div>
            </form>
          </Card>
        )}

        {/* ================================================================ */}
        {/* DISTRIBUTORS TAB                                                  */}
        {/* ================================================================ */}
        {activeTab === "distributors" && user?.role === "admin" && company?.plan !== "distribuidor" && (
          <div className="space-y-4 max-w-2xl mx-auto">

            {/* Search */}
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={Search} title="Buscar Distribuidor" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`}
                  style={inputStyle}
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E76B6] animate-spin" />
                )}
              </div>

              {/* Search results */}
              {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                <p className="text-center text-sm text-gray-400 py-6">No se encontraron distribuidores</p>
              )}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => addToSelection(d)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all hover:bg-[#F0F7FF]"
                      style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={d.profileImage} alt={d.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0A183A] truncate">{d.name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#1E76B6" }}>Distribuidor</span>
                        </div>
                      </div>
                      <PlusCircle className="w-5 h-5 text-[#1E76B6] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Selected for granting */}
            {selectedDistributors.length > 0 && (
              <Card className="p-5 sm:p-6" style={{ background: "rgba(30,118,182,0.04)" } as React.CSSProperties}>
                <SectionTitle icon={Link2} title="Distribuidores Seleccionados" />
                <div className="space-y-2 mb-4">
                  {selectedDistributors.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={d.profileImage} alt={d.name} className="w-9 h-9 rounded-lg object-cover" />
                        <span className="text-sm font-bold text-[#0A183A] truncate">{d.name}</span>
                      </div>
                      <button onClick={() => removeFromSelection(d.id)} style={{ color: "#DC2626" }}>
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <PrimaryBtn onClick={handleGrantAccess} disabled={grantingAccess} className="w-full">
                  {grantingAccess
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Otorgando…</>
                    : <><CheckCircle className="w-4 h-4" /> Otorgar Acceso ({selectedDistributors.length})</>}
                </PrimaryBtn>
              </Card>
            )}

            {/* Connected distributors */}
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={Link2} title="Distribuidores Conectados" />
              {connectedDistributors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <Building2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No hay distribuidores conectados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connectedDistributors.map((access) => {
                    // Backend returns access objects with nested distributor
                    const dist = (access as DistributorCompany & { distributor?: DistributorCompany }).distributor ?? access;
                    const distId = (access as DistributorCompany & { distributorId?: string }).distributorId ?? dist.id;
                    return (
                      <div key={dist.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={dist.profileImage} alt={dist.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0A183A] truncate">{dist.name}</p>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-700">
                              <CheckCircle className="w-2.5 h-2.5" /> Conectado
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeAccess(distId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-red-50"
                          style={{ color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}
                        >
                          <Link2Off className="w-3.5 h-3.5" /> Revocar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default AjustesPage;