"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  Truck,
  Plus,
  X,
  ChevronDown,
  Search,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Car,
  Circle,
  ArrowRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────
type Client = {
  id: string;
  name: string;
  profileImage: string;
  plan: string;
  vehicleCount: number;
  tireCount: number;
  userCount?: number;
};

type Notification = {
  id: string;
  message: string;
  type: "success" | "error";
};

// ─── Toast Notification ─────────────────────────────────────────────────────────
const Toast = ({
  notifications,
  onRemove,
}: {
  notifications: Notification[];
  onRemove: (id: string) => void;
}) => (
  <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
    {notifications.map((n) => (
      <div
        key={n.id}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium pointer-events-auto transition-all duration-300
          ${
            n.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
      >
        {n.type === "success" ? (
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
        <span>{n.message}</span>
        <button
          onClick={() => onRemove(n.id)}
          className="ml-1 opacity-60 hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
  </div>
);

// ─── Modal Shell ───────────────────────────────────────────────────────────────
const Modal = ({
  open,
  onClose,
  children,
  title,
  subtitle,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] px-6 py-5 rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-white">
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {subtitle && (
                <p className="text-blue-200 text-xs mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ─── Field ─────────────────────────────────────────────────────────────────────
const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/40 focus:border-[#1E76B6] transition-all bg-gray-50 focus:bg-white";

// ─── Client Card ───────────────────────────────────────────────────────────────
const ClientCard = ({
  client,
  onAddUser,
}: {
  client: Client;
  onAddUser: (client: Client) => void;
}) => (
  <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#1E76B6]/8 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
    {/* Card Top Accent */}
    <div className="h-1.5 bg-gradient-to-r from-[#0A183A] via-[#1E76B6] to-[#348CCB]" />

    <div className="p-5">
      {/* Logo + Name */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm bg-gradient-to-br from-[#0A183A]/5 to-[#1E76B6]/10">
            {client.profileImage &&
            client.profileImage.startsWith("data:") ? (
              <img
                src={client.profileImage}
                alt={client.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0A183A] to-[#1E76B6]">
                <span className="text-white font-bold text-xl">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#0A183A] text-base leading-tight truncate group-hover:text-[#1E76B6] transition-colors">
            {client.name}
          </h3>
          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-[#1E76B6]/10 text-[#1E76B6] text-[10px] font-semibold rounded-full uppercase tracking-wide">
            <Circle className="w-1.5 h-1.5 fill-current" />
            {client.plan}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
          <Car className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
          <div>
            <p className="text-[11px] text-gray-500 leading-none">Vehículos</p>
            <p className="text-sm font-bold text-[#0A183A] mt-0.5">
              {client.vehicleCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
          <svg
            className="w-4 h-4 text-[#1E76B6] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <div>
            <p className="text-[11px] text-gray-500 leading-none">Neumáticos</p>
            <p className="text-sm font-bold text-[#0A183A] mt-0.5">
              {client.tireCount}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAddUser(client)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white text-xs font-semibold rounded-xl hover:shadow-lg hover:shadow-[#1E76B6]/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Agregar Usuario
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl border border-gray-200 transition-colors">
          <Eye className="w-3.5 h-3.5" />
          Ver
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [toasts, setToasts] = useState<Notification[]>([]);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Create Company form
  const [companyName, setCompanyName] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

  // Create User form (after company created OR for existing client)
  const [showUserStep, setShowUserStep] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState("admin");
  const [userLoading, setUserLoading] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
      ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
      : "https://api.tirepro.com.co/api";

  const getToken = () => localStorage.getItem("token") ?? "";
  const getDistributorId = () => {
    const u = localStorage.getItem("user");
    if (!u) return "";
    return JSON.parse(u).companyId ?? "";
  };

  // ── Toast helpers ────────────────────────────────────────────────────────────
  const addToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000
    );
  };
  const removeToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch clients ────────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch(`${API_BASE}/companies/me/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const enriched: Client[] = await Promise.all(
        data.map(async (access: any) => {
          try {
            const [vRes, tRes] = await Promise.all([
              fetch(`${API_BASE}/vehicles?companyId=${access.company.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
              fetch(`${API_BASE}/tires?companyId=${access.company.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
            ]);
            const vehicles = vRes.ok ? await vRes.json() : [];
            const tires = tRes.ok ? await tRes.json() : [];
            return {
              id: access.company.id,
              name: access.company.name,
              profileImage: access.company.profileImage ?? "",
              plan: access.company.plan ?? "pro",
              vehicleCount: vehicles.length,
              tireCount: tires.length,
            };
          } catch {
            return {
              id: access.company.id,
              name: access.company.name,
              profileImage: "",
              plan: "pro",
              vehicleCount: 0,
              tireCount: 0,
            };
          }
        })
      );
      setClients(enriched);
    } catch {
      addToast("Error al cargar los clientes", "error");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Grant distributor access ─────────────────────────────────────────────────
  const grantDistributorAccess = async (
    clientCompanyId: string
  ): Promise<void> => {
    const distributorId = getDistributorId();
    const token = getToken();
    const res = await fetch(
      `${API_BASE}/companies/${clientCompanyId}/distributors/${distributorId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) throw new Error("No se pudo otorgar acceso distribuidor");
  };

  // ── Create Company ───────────────────────────────────────────────────────────
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      addToast("El nombre de la empresa es obligatorio", "error");
      return;
    }
    try {
      setCompanyLoading(true);
      const res = await fetch(`${API_BASE}/companies/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim(), plan: "pro", userType: "fleet" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al crear empresa");

      const newCompanyId = data.companyId;

      // Immediately grant this distributor access
      await grantDistributorAccess(newCompanyId);

      setCreatedCompanyId(newCompanyId);
      setTargetCompanyId(newCompanyId);
      addToast(`Empresa "${companyName}" creada y vinculada`, "success");
      setShowUserStep(true);
      fetchClients();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Error desconocido",
        "error"
      );
    } finally {
      setCompanyLoading(false);
    }
  };

  // ── Create User ──────────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
      addToast("Completa todos los campos", "error");
      return;
    }
    if (userPassword.length < 6) {
      addToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    try {
      setUserLoading(true);
      const token = getToken();
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: userName.trim(),
          email: userEmail.trim().toLowerCase(),
          password: userPassword,
          companyId: targetCompanyId,
          role: userRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al crear usuario");

      addToast("Usuario creado exitosamente", "success");
      resetUserForm();
      setShowCreateModal(false);
      setShowAddUserModal(false);
      setSelectedClient(null);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Error desconocido",
        "error"
      );
    } finally {
      setUserLoading(false);
    }
  };

  const resetUserForm = () => {
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    setUserRole("admin");
    setShowPassword(false);
    setShowUserStep(false);
    setCreatedCompanyId(null);
    setTargetCompanyId("");
    setCompanyName("");
  };

  // ── Open Add User for existing client ────────────────────────────────────────
  const openAddUser = (client: Client) => {
    setSelectedClient(client);
    setTargetCompanyId(client.id);
    setShowAddUserModal(true);
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <Toast notifications={toasts} onRemove={removeToast} />

      <div className="w-full px-0 pt-[4.75rem] pb-8 sm:pt-[5.25rem] lg:pt-0 space-y-5">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] rounded-2xl shadow-xl overflow-hidden">
          <div className="p-5 lg:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                Gestión de Clientes
              </h1>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">
                {clients.length} cliente{clients.length !== 1 ? "s" : ""}{" "}
                vinculados
              </p>
            </div>
            <button
              onClick={() => {
                resetUserForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0A183A] text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </header>

        {/* ── Search ─────────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/40 focus:border-[#1E76B6] shadow-sm"
          />
        </div>

        {/* ── Grid ───────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-[#1E76B6]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Cargando clientes...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0A183A]/10 to-[#1E76B6]/10 flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-[#1E76B6]/40" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              {searchTerm ? "Sin resultados" : "Aún no tienes clientes"}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {searchTerm
                ? `No se encontraron clientes para "${searchTerm}"`
                : "Crea tu primer cliente para comenzar"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  resetUserForm();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-[#1E76B6]/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                Crear Primer Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onAddUser={openAddUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Create Company (+ optional user step) ──────────────────── */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetUserForm();
        }}
        title={showUserStep ? "Crear Usuario" : "Nuevo Cliente"}
        subtitle={
          showUserStep
            ? `Para la empresa recién creada`
            : "Registra una empresa y asóciala automáticamente"
        }
        icon={
          showUserStep ? (
            <UserPlus className="w-5 h-5" />
          ) : (
            <Building2 className="w-5 h-5" />
          )
        }
      >
        {!showUserStep ? (
          /* Step 1: Company */
          <form onSubmit={handleCreateCompany} className="space-y-5">
            <Field
              label="Nombre de la empresa"
              hint="Se creará en plan Pro y quedará vinculada a tu cuenta"
            >
              <input
                type="text"
                className={inputCls}
                placeholder="Ej. Transportes Bogotá S.A.S."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                maxLength={100}
              />
            </Field>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Al crear esta empresa, se otorgará automáticamente acceso de
                distribuidor para que puedas verla en tu panel.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetUserForm();
                }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={companyLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-[#1E76B6]/30 transition-all disabled:opacity-60"
              >
                {companyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    Crear Empresa
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: User (optional) */
          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  Empresa creada exitosamente
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  ID: <span className="font-mono">{createdCompanyId}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Opcionalmente, crea el primer usuario administrador para esta
              empresa.
            </p>

            <Field label="Nombre completo">
              <input
                type="text"
                className={inputCls}
                placeholder="Juan Pérez"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </Field>

            <Field label="Correo electrónico">
              <input
                type="email"
                className={inputCls}
                placeholder="usuario@empresa.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </Field>

            <Field label="Contraseña" hint="Mínimo 6 caracteres">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={inputCls + " pr-10"}
                  placeholder="••••••••"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </Field>

            <Field label="Rol">
              <div className="relative">
                <select
                  className={inputCls + " appearance-none pr-8"}
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                >
                  <option value="admin">Administrador</option>
                  <option value="regular">Usuario Regular</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetUserForm();
                }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Omitir
              </button>
              <button
                type="submit"
                disabled={userLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-[#1E76B6]/30 transition-all disabled:opacity-60"
              >
                {userLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Crear Usuario
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: Add User to Existing Client ───────────────────────────── */}
      <Modal
        open={showAddUserModal}
        onClose={() => {
          setShowAddUserModal(false);
          setSelectedClient(null);
          resetUserForm();
        }}
        title="Agregar Usuario"
        subtitle={selectedClient?.name}
        icon={<UserPlus className="w-5 h-5" />}
      >
        <form onSubmit={handleCreateUser} className="space-y-5">
          {selectedClient && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#0A183A] to-[#1E76B6] flex items-center justify-center">
                {selectedClient.profileImage?.startsWith("data:") ? (
                  <img
                    src={selectedClient.profileImage}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {selectedClient.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A183A]">
                  {selectedClient.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedClient.vehicleCount} vehículos ·{" "}
                  {selectedClient.tireCount} neumáticos
                </p>
              </div>
            </div>
          )}

          <Field label="Nombre completo">
            <input
              type="text"
              className={inputCls}
              placeholder="Juan Pérez"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </Field>

          <Field label="Correo electrónico">
            <input
              type="email"
              className={inputCls}
              placeholder="usuario@empresa.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Contraseña" hint="Mínimo 6 caracteres">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={inputCls + " pr-10"}
                placeholder="••••••••"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </Field>

          <Field label="Rol">
            <div className="relative">
              <select
                className={inputCls + " appearance-none pr-8"}
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              >
                <option value="admin">Administrador</option>
                <option value="regular">Usuario Regular</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </Field>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddUserModal(false);
                setSelectedClient(null);
                resetUserForm();
              }}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={userLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-[#1E76B6]/30 transition-all disabled:opacity-60"
            >
              {userLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear Usuario
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}