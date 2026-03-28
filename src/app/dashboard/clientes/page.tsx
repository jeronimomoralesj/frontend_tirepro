"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, Users, Plus, X, ChevronDown, Search,
  UserPlus, Eye, EyeOff, CheckCircle, AlertCircle,
  Loader2, Car, Circle, ArrowRight,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

type Client = {
  id: string;
  name: string;
  profileImage: string;
  plan: string;
  vehicleCount: number;
  tireCount: number;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

// FIX: UserRole must match the Prisma enum exactly — no "regular" value exists.
// Valid values: admin | viewer | technician
type UserRole = "admin" | "viewer" | "technician";

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

// =============================================================================
// Helpers
// =============================================================================

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getDistributorId(): string {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "{}").companyId ?? "";
  } catch { return ""; }
}

// =============================================================================
// Design-system micro-components
// =============================================================================

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.15)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
      }}
    >
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm text-[#0A183A] placeholder-gray-400 " +
  "bg-white focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/40 focus:border-[#1E76B6] transition-all";
const inputStyle = { border: "1.5px solid rgba(52,140,203,0.2)" };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-black text-[#0A183A] uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

// =============================================================================
// Toast
// =============================================================================

function Toasts({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(n => (
        <div
          key={n.id}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium pointer-events-auto"
          style={{
            background: n.type === "success" ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
            border: n.type === "success" ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(220,38,38,0.2)",
            color: n.type === "success" ? "#15803d" : "#DC2626",
          }}
        >
          {n.type === "success"
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          <span>{n.message}</span>
          <button onClick={() => onRemove(n.id)} className="ml-1 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Modal
// =============================================================================

function Modal({
  open, onClose, children, title, subtitle, icon,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode;
  title: string; subtitle?: string; icon: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div
          className="sticky top-0 px-6 py-5 rounded-t-3xl"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              {icon}
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-none">{title}</h2>
              {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Client Card
// =============================================================================

function ClientCard({ client, onAddUser }: { client: Client; onAddUser: (c: Client) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ background: "linear-gradient(90deg, #0A183A, #1E76B6, #348CCB)" }} />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <div
              className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
            >
              {client.profileImage && client.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                <img src={client.profileImage} alt={client.name} className="max-w-full max-h-full object-contain p-1" />
              ) : (
                <span className="text-white font-black text-lg">{client.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-[#0A183A] text-sm leading-tight truncate">{client.name}</h3>
            <span
              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
            >
              <Circle className="w-1.5 h-1.5 fill-current" />
              {client.plan}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { icon: Car, label: "Vehículos", value: client.vehicleCount },
            { icon: null, label: "Llantas", value: client.tireCount },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.1)" }}>
              {Icon
                ? <Icon className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
                : (
                  <svg className="w-4 h-4 text-[#1E76B6] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )
              }
              <div>
                <p className="text-[10px] text-gray-400 leading-none">{label}</p>
                <p className="text-sm font-black text-[#0A183A] mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onAddUser(client)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Agregar Usuario
        </button>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function ClientesPage() {
  const [clients,     setClients]     = useState<Client[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [toasts,      setToasts]      = useState<Toast[]>([]);

  // Modal state
  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedClient,   setSelectedClient]   = useState<Client | null>(null);

  // Create company form
  const [companyName,      setCompanyName]      = useState("");
  const [companyLoading,   setCompanyLoading]   = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [showUserStep,     setShowUserStep]     = useState(false);

  // Create user form
  const [userName,        setUserName]        = useState("");
  const [userEmail,       setUserEmail]       = useState("");
  const [userPassword,    setUserPassword]    = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  // FIX: default to "admin" which IS a valid UserRole enum value
  const [userRole,        setUserRole]        = useState<UserRole>("admin");
  const [userLoading,     setUserLoading]     = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState("");

  // ── Toast helpers ────────────────────────────────────────────────────────────
  function addToast(message: string, type: "success" | "error") {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }

  // ── Fetch clients ────────────────────────────────────────────────────────────
  // FIX: Use GET /companies/:companyId which returns _count: { users, tires, vehicles }
  // instead of making two extra fetches per client for vehicles and tires.
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/companies/me/clients`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar los clientes");
      const data = await res.json();

      // Load list instantly from /me/clients — no extra API calls per client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: Client[] = data
        .filter((access: any) => access.company?.id)
        .map((access: any) => ({
          id:           access.company.id,
          name:         access.company.name,
          profileImage: access.company.profileImage ?? "",
          plan:         access.company.plan ?? "basic",
          vehicleCount: 0,
          tireCount:    0,
        }));

      setClients(list);

      // Fetch counts in background (non-blocking, batched in small groups)
      const BATCH = 10;
      for (let i = 0; i < list.length; i += BATCH) {
        const batch = list.slice(i, i + BATCH);
        Promise.all(
          batch.map(async (client) => {
            try {
              const detailRes = await fetch(`${API_BASE}/companies/${client.id}`, { headers: authHeaders() });
              if (!detailRes.ok) return null;
              const detail = await detailRes.json();
              return {
                id: client.id,
                vehicleCount: detail._count?.vehicles ?? 0,
                tireCount: detail._count?.tires ?? 0,
              };
            } catch { return null; }
          })
        ).then((results) => {
          const updates = results.filter(Boolean) as { id: string; vehicleCount: number; tireCount: number }[];
          if (updates.length > 0) {
            setClients((prev) =>
              prev.map((c) => {
                const u = updates.find((r) => r.id === c.id);
                return u ? { ...c, vehicleCount: u.vehicleCount, tireCount: u.tireCount } : c;
              })
            );
          }
        });
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error inesperado", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── Create Company ───────────────────────────────────────────────────────────
  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) { addToast("El nombre de la empresa es obligatorio", "error"); return; }

    setCompanyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/companies/register`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: companyName.trim(), plan: "pro" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al crear empresa");

      const newCompanyId: string = data.companyId ?? data.id ?? data.company?.id;
      if (!newCompanyId) throw new Error("El servidor no devolvió el ID de la empresa");

      // Grant distributor access so it appears in our panel
      const distributorId = getDistributorId();
      if (distributorId) {
        const grantRes = await fetch(
          `${API_BASE}/companies/${newCompanyId}/distributors/${distributorId}`,
          { method: "POST", headers: authHeaders() }
        );
        if (!grantRes.ok) {
          const grantData = await grantRes.json().catch(() => ({}));
          console.warn("Grant distributor access failed:", grantData.message);
        }
      }

      setCreatedCompanyId(newCompanyId);
      setTargetCompanyId(newCompanyId);
      addToast(`Empresa "${companyName}" creada y vinculada`, "success");
      setShowUserStep(true);
      fetchClients();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error desconocido", "error");
    } finally {
      setCompanyLoading(false);
    }
  }

  // ── Create User ──────────────────────────────────────────────────────────────
  // FIX: role is now typed as UserRole ("admin" | "viewer" | "technician"),
  // matching the Prisma enum. "regular" was never a valid value and caused
  // a 400 Bad Request from the ValidationPipe with forbidNonWhitelisted:true.
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
      addToast("Completa todos los campos", "error"); return;
    }
    if (userPassword.length < 6) {
      addToast("La contraseña debe tener al menos 6 caracteres", "error"); return;
    }
    if (!targetCompanyId) {
      addToast("No se encontró la empresa destino", "error"); return;
    }

    setUserLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name:      userName.trim(),
          email:     userEmail.trim().toLowerCase(),
          password:  userPassword,
          companyId: targetCompanyId,
          role:      userRole, // "admin" | "viewer" | "technician" — all valid enum values
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al crear usuario");

      addToast("Usuario creado exitosamente", "success");
      resetAll();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error desconocido", "error");
    } finally {
      setUserLoading(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function resetUserForm() {
    setUserName(""); setUserEmail(""); setUserPassword("");
    setUserRole("admin"); setShowPassword(false);
  }

  function resetAll() {
    resetUserForm();
    setShowUserStep(false); setCreatedCompanyId(null); setTargetCompanyId("");
    setCompanyName(""); setShowCreateModal(false); setShowAddUserModal(false);
    setSelectedClient(null);
  }

  function openAddUser(client: Client) {
    resetUserForm();
    setSelectedClient(client);
    setTargetCompanyId(client.id);
    setShowAddUserModal(true);
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen" style={{ background: "white" }}>
      <Toasts toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-5">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 py-5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
            boxShadow: "0 8px 32px rgba(10,24,58,0.22)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-black text-white text-lg leading-none tracking-tight">
                  Gestión de Clientes
                </h1>
                <p className="text-xs text-white/60 mt-0.5">
                  {clients.length} cliente{clients.length !== 1 ? "s" : ""} vinculados
                </p>
              </div>
            </div>
            <button
              onClick={() => { resetAll(); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-[#0A183A] bg-white hover:bg-blue-50 transition-all"
              style={{ boxShadow: "0 2px 12px rgba(10,24,58,0.15)" }}
            >
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {/* ── Search ─────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar clientes…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`${inputCls} pl-11`}
            style={inputStyle}
          />
        </div>

        {/* ── Grid / states ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-[#1E76B6]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Cargando clientes…</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-2xl mb-4" style={{ background: "rgba(30,118,182,0.06)" }}>
              <Building2 className="w-8 h-8 text-[#1E76B6] opacity-50" />
            </div>
            <p className="text-sm font-black text-[#0A183A] mb-1">
              {searchTerm ? "Sin resultados" : "Aún no tienes clientes"}
            </p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs">
              {searchTerm
                ? `No se encontraron clientes para "${searchTerm}"`
                : "Crea tu primer cliente para comenzar a gestionarlo"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => { resetAll(); setShowCreateModal(true); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
              >
                <Plus className="w-4 h-4" />
                Crear Primer Cliente
              </button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredClients.map(client => (
              <ClientCard key={client.id} client={client} onAddUser={openAddUser} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Create Company + optional user step ─────────────────── */}
      <Modal
        open={showCreateModal}
        onClose={resetAll}
        title={showUserStep ? "Crear Usuario" : "Nuevo Cliente"}
        subtitle={showUserStep ? "Opcional — para la empresa recién creada" : "Registra una empresa y vincúlala a tu cuenta"}
        icon={showUserStep ? <UserPlus className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
      >
        {!showUserStep ? (
          // ── Step 1: Company ──────────────────────────────────────────────
          <form onSubmit={handleCreateCompany} className="space-y-5">
            <Field label="Nombre de la empresa" hint="Se creará en plan Pro y quedará vinculada a tu cuenta">
              <input
                type="text"
                className={inputCls}
                style={inputStyle}
                placeholder="Ej. Transportes Bogotá S.A.S."
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required maxLength={100}
              />
            </Field>

            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs text-[#1E76B6]"
              style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.2)" }}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Al crear esta empresa, se otorgará automáticamente acceso de distribuidor para que aparezca en tu panel.</span>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={resetAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0A183A] border border-gray-200 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={companyLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                {companyLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creando…</>
                  : <>Crear Empresa<ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          </form>
        ) : (
          // ── Step 2: User (optional) ───────────────────────────────────────
          <form onSubmit={handleCreateUser} className="space-y-5">
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs"
              style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", color: "#15803d" }}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black">Empresa creada exitosamente</p>
                <p className="mt-0.5 text-[10px] font-mono opacity-70">{createdCompanyId}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400">Crea el primer usuario administrador para esta empresa (opcional).</p>

            <UserFormFields
              userName={userName} setUserName={setUserName}
              userEmail={userEmail} setUserEmail={setUserEmail}
              userPassword={userPassword} setUserPassword={setUserPassword}
              showPassword={showPassword} setShowPassword={setShowPassword}
              userRole={userRole} setUserRole={setUserRole}
            />

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={resetAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0A183A] border border-gray-200 hover:bg-gray-50 transition-colors">
                Omitir
              </button>
              <button type="submit" disabled={userLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                {userLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creando…</>
                  : <><UserPlus className="w-4 h-4" />Crear Usuario</>
                }
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: Add User to Existing Client ──────────────────────────── */}
      <Modal
        open={showAddUserModal}
        onClose={() => { setShowAddUserModal(false); setSelectedClient(null); resetUserForm(); }}
        title="Agregar Usuario"
        subtitle={selectedClient?.name}
        icon={<UserPlus className="w-5 h-5" />}
      >
        <form onSubmit={handleCreateUser} className="space-y-5">
          {selectedClient && (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
              style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.15)" }}>
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
              >
                {selectedClient.profileImage && selectedClient.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                  <img src={selectedClient.profileImage} className="max-w-full max-h-full object-contain p-1" alt="" />
                ) : (
                  <span className="text-white font-black text-sm">{selectedClient.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-black text-[#0A183A]">{selectedClient.name}</p>
                <p className="text-[11px] text-gray-400">
                  {selectedClient.vehicleCount} vehículos · {selectedClient.tireCount} llantas
                </p>
              </div>
            </div>
          )}

          <UserFormFields
            userName={userName} setUserName={setUserName}
            userEmail={userEmail} setUserEmail={setUserEmail}
            userPassword={userPassword} setUserPassword={setUserPassword}
            showPassword={showPassword} setShowPassword={setShowPassword}
            userRole={userRole} setUserRole={setUserRole}
          />

          <div className="flex gap-3 pt-1">
            <button type="button"
              onClick={() => { setShowAddUserModal(false); setSelectedClient(null); resetUserForm(); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0A183A] border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={userLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
              {userLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creando…</>
                : <><UserPlus className="w-4 h-4" />Crear Usuario</>
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// =============================================================================
// Shared user form fields
// FIX: userRole type updated to "admin" | "viewer" | "technician"
//      The select options now match the Prisma UserRole enum exactly.
// =============================================================================

function UserFormFields({
  userName, setUserName, userEmail, setUserEmail,
  userPassword, setUserPassword, showPassword, setShowPassword,
  userRole, setUserRole,
}: {
  userName: string;       setUserName: (v: string) => void;
  userEmail: string;      setUserEmail: (v: string) => void;
  userPassword: string;   setUserPassword: (v: string) => void;
  showPassword: boolean;  setShowPassword: (v: boolean) => void;
  userRole: UserRole;     setUserRole: (v: UserRole) => void;
}) {
  return (
    <>
      <Field label="Nombre completo">
        <input type="text" className={inputCls} style={inputStyle}
          placeholder="Juan Pérez" value={userName}
          onChange={e => setUserName(e.target.value)} required />
      </Field>

      <Field label="Correo electrónico">
        <input type="email" className={inputCls} style={inputStyle}
          placeholder="usuario@empresa.com" value={userEmail}
          onChange={e => setUserEmail(e.target.value)} required />
      </Field>

      <Field label="Contraseña" hint="Mínimo 6 caracteres">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className={`${inputCls} pr-10`} style={inputStyle}
            placeholder="••••••••" value={userPassword}
            onChange={e => setUserPassword(e.target.value)}
            required minLength={6}
          />
          <button type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      {/* FIX: options now use "admin" | "viewer" | "technician" — matching UserRole enum */}
      <Field label="Rol">
        <div className="relative">
          <select
            className={`${inputCls} appearance-none pr-8`} style={inputStyle}
            value={userRole}
            onChange={e => setUserRole(e.target.value as UserRole)}
          >
            <option value="admin">Administrador</option>
            <option value="viewer">Solo Lectura</option>
            <option value="technician">Técnico</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </Field>
    </>
  );
}