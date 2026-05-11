"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  ChevronDown,
  ChevronRight,
  Upload,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Link2,
  Link2Off,
  ShoppingCart,
  Package,
  Clock,
  RotateCcw,
  Truck,
  ArrowUpRight,
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
  plan: string;
  emailAtencion?: string | null;
  _count: {
    users: number;
    tires: number;
    vehicles: number;
  };
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
// Role editor — admin-only popover. Renders the user's current role as a
// pill, click to switch via a small dropdown. Distribuidor-plan-only roles
// (catalogo / catalogo_admin / marketplace_tracker) only appear when the
// company is on that plan, mirroring the create-user form. The user can't
// edit their OWN role here — locking yourself out of admin would brick
// the whole company until support intervenes.
// =============================================================================

const ROLE_META: Record<string, { label: string; bg: string }> = {
  admin:               { label: "Admin",                bg: "#0A183A" },
  catalogo_admin:      { label: "Catálogo Admin",       bg: "#7c3aed" },
  catalogo:            { label: "Catálogo",             bg: "#a855f7" },
  marketplace_tracker: { label: "Marketplace Tracker",  bg: "#f97316" },
  viewer:              { label: "Regular",              bg: "#1E76B6" },
  regular:             { label: "Regular",              bg: "#1E76B6" },
};

function RoleEditor({
  currentRole, isSelf, companyPlan, onChange,
}: {
  currentRole: string;
  isSelf: boolean;
  companyPlan: string;
  onChange: (nextRole: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const m = ROLE_META[currentRole] ?? ROLE_META.regular;

  // What roles can this user be promoted/demoted to?
  const baseRoles = [
    { key: "admin",   label: "Admin"   },
    { key: "viewer",  label: "Regular" },
  ];
  const distRoles = companyPlan === "distribuidor"
    ? [
        { key: "catalogo",            label: "Catálogo (ventas)" },
        { key: "catalogo_admin",      label: "Catálogo Admin (ventas + stats)" },
        { key: "marketplace_tracker", label: "Marketplace Tracker" },
      ]
    : [];
  const options = [...baseRoles, ...distRoles];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { if (!isSelf) setOpen((o) => !o); }}
        title={isSelf ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
        disabled={isSelf}
        // Visible at every breakpoint — this is an action button, not a
        // decorative badge. The previous "hidden sm:inline-flex" was a
        // copy-over from the old static role pill and meant the mobile
        // Users tab had no way to change roles at all.
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white transition-opacity"
        style={{
          background: m.bg,
          cursor: isSelf ? "default" : "pointer",
          opacity: isSelf ? 0.85 : 1,
        }}
      >
        <Shield className="w-2.5 h-2.5" />
        {m.label}
        {!isSelf && <ChevronDown className="w-2.5 h-2.5 opacity-80" />}
      </button>

      {open && !isSelf && (
        <div
          className="absolute right-0 top-full mt-1.5 z-30 min-w-[220px] rounded-xl bg-white shadow-2xl py-1"
          style={{ border: "1px solid rgba(10,24,58,0.08)" }}
        >
          {options.map((opt) => {
            const active = opt.key === currentRole;
            return (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#F0F7FF] transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: ROLE_META[opt.key]?.bg ?? "#9ca3af" }}
                />
                <span className={active ? "font-black text-[#0A183A]" : "font-bold text-[#0A183A]"}>
                  {opt.label}
                </span>
                {active && <span className="ml-auto text-[10px] text-[#1E76B6] font-bold">Actual</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Users tab — search + role filter + expandable cards. Admin-only view in
// /dashboard/ajustes that lets the company owner manage who can sign in,
// what they can do (RoleEditor), and which placas they're scoped to.
// Compact-by-default cards expand inline to reveal placa management.
// =============================================================================

const ROLE_FILTERS: { key: string; label: string }[] = [
  { key: "all",                 label: "Todos" },
  { key: "admin",               label: "Admins" },
  { key: "viewer",              label: "Regulares" },
  { key: "catalogo",            label: "Catálogo" },
  { key: "catalogo_admin",      label: "Catálogo Admin" },
  { key: "marketplace_tracker", label: "Marketplace" },
];

// Deterministic gradient pairs so each user's avatar gets a stable, distinct
// color tied to the first letter of their name. Saves us from React-side
// hashing while still feeling personalized.
const AVATAR_GRADIENTS: [string, string][] = [
  ["#1E76B6", "#62b8f0"], ["#7c3aed", "#a855f7"], ["#f97316", "#fb923c"],
  ["#16a34a", "#22c55e"], ["#0A183A", "#173D68"], ["#dc2626", "#f87171"],
  ["#0891b2", "#22d3ee"], ["#ca8a04", "#facc15"],
];
function avatarGradient(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UsersTabContent({
  users, currentUserId, companyPlan, plateInputs, setPlateInputs,
  onEditRole, onDelete, onAddPlate, onRemovePlate, onNewUser,
}: {
  users: UserData[];
  currentUserId: string | null;
  companyPlan: string;
  plateInputs: Record<string, string>;
  setPlateInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onEditRole: (userId: string, nextRole: string) => void;
  onDelete: (userId: string) => void;
  onAddPlate: (userId: string) => void;
  onRemovePlate: (userId: string, plate: string) => void;
  onNewUser: () => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-role counts feed the filter chip labels — the buttons feel more
  // useful when each tells you the cohort size in advance.
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = users.filter((u) => {
    if (roleFilter !== "all") {
      // "viewer" filter also matches the legacy "regular" role string.
      if (roleFilter === "viewer" && (u.role === "viewer" || u.role === "regular")) {
        // accept
      } else if (u.role !== roleFilter) {
        return false;
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const blob = `${u.name} ${u.email}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  // Sort: pinned self first, admins next, then alphabetical. Makes the list
  // useful at a glance instead of order-of-creation.
  const sorted = [...filtered].sort((a, b) => {
    const selfA = a.id === currentUserId ? -2 : 0;
    const selfB = b.id === currentUserId ? -2 : 0;
    const adminA = a.role === "admin" ? -1 : 0;
    const adminB = b.role === "admin" ? -1 : 0;
    if (selfA !== selfB || adminA !== adminB) {
      return (selfA + adminA) - (selfB + adminB);
    }
    return a.name.localeCompare(b.name, "es");
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-lg font-black text-[#0A183A]">Usuarios</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {users.length} {users.length === 1 ? "miembro" : "miembros"} en tu empresa
          </p>
        </div>
        <PrimaryBtn onClick={onNewUser}>
          <UserPlus className="w-4 h-4" /> Nuevo
        </PrimaryBtn>
      </div>

      {/* Search + role chips */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
            style={{ border: "1px solid rgba(52,140,203,0.18)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {ROLE_FILTERS.map((rf) => {
            const count =
              rf.key === "all"
                ? users.length
                : rf.key === "viewer"
                  ? (roleCounts.viewer ?? 0) + (roleCounts.regular ?? 0)
                  : (roleCounts[rf.key] ?? 0);
            // Hide chip for plan-irrelevant roles to keep the strip tight
            const distOnly =
              rf.key === "catalogo" ||
              rf.key === "catalogo_admin" ||
              rf.key === "marketplace_tracker";
            if (distOnly && companyPlan !== "distribuidor" && count === 0) return null;
            const active = roleFilter === rf.key;
            return (
              <button
                key={rf.key}
                onClick={() => setRoleFilter(rf.key)}
                className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0"
                style={{
                  background: active ? "#0A183A" : "white",
                  color:      active ? "white" : "#0A183A",
                  border: `1px solid ${active ? "#0A183A" : "rgba(10,24,58,0.10)"}`,
                }}
              >
                {rf.label} <span className={active ? "text-white/70" : "text-gray-400"}>· {count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User cards / empty states */}
      {users.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No hay usuarios aún</p>
          <p className="text-xs text-gray-400 mt-1">Invita a tu primer compañero con el botón <strong>Nuevo</strong>.</p>
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center">
          <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">Sin resultados</p>
          <p className="text-xs text-gray-400 mt-1">
            Prueba otro término o limpia los filtros.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((u) => (
            <UserListCard
              key={u.id}
              u={u}
              isSelf={u.id === currentUserId}
              expanded={expandedId === u.id}
              companyPlan={companyPlan}
              plateInput={plateInputs[u.id] ?? ""}
              setPlateInput={(v) => setPlateInputs((prev) => ({ ...prev, [u.id]: v }))}
              onToggle={() => setExpandedId((id) => (id === u.id ? null : u.id))}
              onEditRole={(next) => onEditRole(u.id, next)}
              onDelete={() => onDelete(u.id)}
              onAddPlate={() => onAddPlate(u.id)}
              onRemovePlate={(plate) => onRemovePlate(u.id, plate)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserListCard({
  u, isSelf, expanded, companyPlan, plateInput, setPlateInput,
  onToggle, onEditRole, onDelete, onAddPlate, onRemovePlate,
}: {
  u: UserData;
  isSelf: boolean;
  expanded: boolean;
  companyPlan: string;
  plateInput: string;
  setPlateInput: (v: string) => void;
  onToggle: () => void;
  onEditRole: (next: string) => void;
  onDelete: () => void;
  onAddPlate: () => void;
  onRemovePlate: (plate: string) => void;
}) {
  const [a, b] = avatarGradient(u.id || u.email);

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden transition-all"
      style={{
        border: `1px solid ${isSelf ? "rgba(30,118,182,0.30)" : "rgba(10,24,58,0.08)"}`,
        boxShadow: expanded ? "0 14px 30px -16px rgba(10,24,58,0.18)" : "none",
      }}
    >
      {/* Compact header row — clickable to expand the placa drawer */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 sm:px-4 py-3 flex items-center gap-3"
      >
        {/* Initials avatar with deterministic gradient */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-sm"
          style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
        >
          {initials(u.name)}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-sm text-[#0A183A] truncate">
              {u.name}
            </p>
            {isSelf && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-[#1E76B6] bg-[#F0F7FF] flex-shrink-0">
                Tú
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{u.email}</p>
        </div>

        {/* Inline metadata — placas count + role pill + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {u.plates && u.plates.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#1E76B6] bg-[#F0F7FF]">
              <Tag className="w-2.5 h-2.5" />
              {u.plates.length}
            </span>
          )}
          {/* Role editor — stop propagation so the chevron click on the
              outer row doesn't accidentally close the dropdown the user
              just opened. */}
          <span onClick={(e) => e.stopPropagation()}>
            <RoleEditor
              currentRole={u.role}
              isSelf={isSelf}
              companyPlan={companyPlan}
              onChange={onEditRole}
            />
          </span>
          <ChevronDown
            className="w-4 h-4 text-gray-400 transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {/* Expandable: placa management + delete */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-4 pt-1 border-t" style={{ borderColor: "rgba(10,24,58,0.06)" }}>
          <div className="mt-3 mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Placas asignadas {u.plates?.length ? `(${u.plates.length})` : ""}
            </p>
          </div>

          {u.plates?.length ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {u.plates.map((plate) => (
                <span
                  key={plate}
                  className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: "rgba(30,118,182,0.08)",
                    color: "#1E76B6",
                    border: "1px solid rgba(30,118,182,0.20)",
                  }}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {plate}
                  <button
                    onClick={() => onRemovePlate(plate)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-red-100 transition-colors"
                    style={{ color: "#DC2626" }}
                    title={`Quitar ${plate}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div
              className="flex items-center justify-center py-3 mb-3 rounded-lg text-[11px] text-gray-400 font-medium"
              style={{ border: "1.5px dashed rgba(52,140,203,0.18)" }}
            >
              Sin placas asignadas
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva placa…"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onAddPlate()}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              style={{ border: "1px solid rgba(52,140,203,0.18)" }}
            />
            <PrimaryBtn onClick={onAddPlate}>
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar</span>
            </PrimaryBtn>
          </div>

          {/* Danger zone — delete user. Hidden on self so admins can't
              suicide-delete the only admin and lock the company. */}
          {!isSelf && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(10,24,58,0.06)" }}>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors hover:bg-red-50"
                style={{ color: "#DC2626" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar usuario
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Email Atencion Card (distributor proposal email)
// =============================================================================

const COLOMBIAN_CITIES = [
  "Bogota","Medellin","Cali","Barranquilla","Cartagena","Bucaramanga","Cucuta",
  "Pereira","Santa Marta","Ibague","Manizales","Villavicencio","Pasto","Monteria",
  "Neiva","Armenia","Popayan","Valledupar","Sincelejo","Tunja","Riohacha",
  "Florencia","Quibdo","Yopal","Mocoa","Leticia","Arauca","San Jose del Guaviare",
  "Puerto Carreno","Mitu","Inirida","Sogamoso","Duitama","Girardot","Zipaquira",
  "Facatativa","Fusagasuga","Soacha","Bello","Envigado","Itagui","Sabaneta",
  "Rionegro","Apartado","Turbo","Palmira","Buenaventura","Tulua","Buga",
  "Cartago","Soledad","Maicao","Barrancabermeja","Piedecuesta","Floridablanca",
  "Giron","Dosquebradas","La Virginia","Tuquerres","Ipiales","Tumaco",
];

type CoberturaItem = { ciudad: string; direccion: string; lat: number | null; lng: number | null };

function DistributorProfileEditor({ companyId, toast }: {
  companyId: string;
  toast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    telefono: "", descripcion: "", bannerImage: "", direccion: "", ciudad: "", sitioWeb: "",
    cobertura: [] as CoberturaItem[], tipoEntrega: "ambos", colorMarca: "#1E76B6",
  });
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<{ display: string; city: string; address: string; lat: number; lng: number }[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounce = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/marketplace/distributor/${companyId}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          // Migrate old string[] cobertura to new format
          let cob: CoberturaItem[] = [];
          if (Array.isArray(data.cobertura)) {
            cob = data.cobertura.map((c: any) =>
              typeof c === "string" ? { ciudad: c, direccion: "", lat: null, lng: null } : c
            );
          }
          setForm({
            telefono: data.telefono ?? "", descripcion: data.descripcion ?? "",
            bannerImage: data.bannerImage ?? "", direccion: data.direccion ?? "",
            ciudad: data.ciudad ?? "", sitioWeb: data.sitioWeb ?? "",
            cobertura: cob, tipoEntrega: data.tipoEntrega ?? "ambos",
            colorMarca: data.colorMarca ?? "#1E76B6",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  // Debounced address search via Nominatim
  function handleAddressSearch(query: string) {
    setAddressQuery(query);
    setAddressResults([]);
    if (addressDebounce.current) clearTimeout(addressDebounce.current);
    if (query.length < 3) return;
    addressDebounce.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Colombia")}&format=json&limit=5&countrycodes=co&accept-language=es`);
        if (res.ok) {
          const data = await res.json();
          setAddressResults(data.map((r: any) => {
            const parts = (r.display_name ?? "").split(",").map((s: string) => s.trim());
            const city = parts.find((p: string) => COLOMBIAN_CITIES.some((c) => p.toLowerCase().includes(c.toLowerCase()))) ?? parts[1] ?? "";
            return {
              display: r.display_name ?? query,
              city: city.replace("Bogotá D.C.", "Bogota").replace("Bogotá", "Bogota").replace("Medellín", "Medellin"),
              address: parts.slice(0, 2).join(", "),
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            };
          }));
        }
      } catch { /* */ }
      setAddressSearching(false);
    }, 400);
  }

  function addCoveragePoint(result: { city: string; address: string; lat: number; lng: number }) {
    setForm((f) => ({
      ...f,
      cobertura: [...f.cobertura, { ciudad: result.city || addressQuery, direccion: result.address, lat: result.lat, lng: result.lng }],
    }));
    setAddressQuery("");
    setAddressResults([]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/marketplace/distributor/${companyId}/profile`, {
        method: "PATCH", body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast("Perfil del marketplace actualizado", "success");
    } catch { toast("Error al guardar", "error"); }
    setSaving(false);
  }

  const inputCls = "w-full px-3 py-2 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

  if (loading) return null;

  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle icon={Building} title="Perfil en Marketplace" />
      <p className="text-xs text-gray-400 mb-4">
        Esta informacion aparece en tu pagina publica del marketplace.
        <a href={`/marketplace/distributor/${companyId}`} target="_blank" rel="noopener" className="ml-1 text-[#1E76B6] font-bold hover:underline">Ver mi pagina</a>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefono</label>
          <input type="tel" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder="+57 300 123 4567" className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sitio Web</label>
          <input type="url" value={form.sitioWeb} onChange={(e) => setForm((f) => ({ ...f, sitioWeb: e.target.value }))}
            placeholder="https://..." className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ciudad principal</label>
          <input type="text" value={form.ciudad} onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
            placeholder="Bogota" className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Direccion principal</label>
          <input type="text" value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            placeholder="Calle 80 #45-12" className={inputCls} />
        </div>
      </div>

      {/* Color picker */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Color de marca</label>
        <div className="flex items-center gap-3">
          <input type="color" value={form.colorMarca} onChange={(e) => setForm((f) => ({ ...f, colorMarca: e.target.value }))}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 cursor-pointer" />
          <span className="text-xs font-mono text-gray-500">{form.colorMarca}</span>
          <div className="flex gap-1">
            {["#1E76B6", "#ef4444", "#22c55e", "#f97316", "#8b5cf6", "#0A183A"].map((c) => (
              <button key={c} onClick={() => setForm((f) => ({ ...f, colorMarca: c }))}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: form.colorMarca === c ? "#0A183A" : "transparent" }} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descripcion</label>
        <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          rows={3} placeholder="Describe tu empresa, servicios y especialidades..." className={`${inputCls} resize-none`} />
      </div>
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Imagen de portada (URL)</label>
        <input type="url" value={form.bannerImage} onChange={(e) => setForm((f) => ({ ...f, bannerImage: e.target.value }))}
          placeholder="https://...imagen-portada.jpg" className={inputCls} />
        {form.bannerImage && (
          <div className="mt-2 h-20 rounded-xl overflow-hidden bg-gray-100">
            <img src={form.bannerImage} alt="Banner" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Delivery type */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo de entrega</label>
        <div className="flex rounded-xl overflow-hidden border border-[#348CCB]/30">
          {[{ value: "domicilio", label: "Domicilio" }, { value: "recogida", label: "Recogida" }, { value: "ambos", label: "Ambos" }].map((t) => (
            <button key={t.value} type="button" onClick={() => setForm((f) => ({ ...f, tipoEntrega: t.value }))}
              className="flex-1 px-3 py-2 text-xs font-bold transition-all"
              style={{ background: form.tipoEntrega === t.value ? "#0A183A" : "#F0F7FF", color: form.tipoEntrega === t.value ? "white" : "#173D68" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coverage locations */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          Puntos de cobertura ({form.cobertura.length})
        </label>

        {/* Existing points */}
        {form.cobertura.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {form.cobertura.map((loc, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: form.colorMarca, border: "2px solid white", boxShadow: `0 0 0 1px ${form.colorMarca}40` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#0A183A]">{loc.ciudad}</p>
                  {loc.direccion && <p className="text-[10px] text-gray-400 truncate">{loc.direccion}</p>}
                </div>
                {loc.lat && loc.lng && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 flex-shrink-0">
                    📍 {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                  </span>
                )}
                <button onClick={() => setForm((f) => ({ ...f, cobertura: f.cobertura.filter((_, j) => j !== i) }))}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Add new — single smart search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => handleAddressSearch(e.target.value)}
                placeholder="Buscar direccion, barrio o ciudad..."
                className={inputCls}
              />
              {addressSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[#348CCB]" />
              )}
            </div>
          </div>

          {/* Search results dropdown */}
          {addressResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {addressResults.map((r, i) => (
                <button key={i} onClick={() => addCoveragePoint(r)}
                  className="w-full text-left px-4 py-3 hover:bg-[#F0F7FF] transition-colors border-b border-gray-50 last:border-0">
                  <p className="text-xs font-bold text-[#0A183A]">{r.city || "Colombia"}</p>
                  <p className="text-[10px] text-gray-400 truncate">{r.display}</p>
                </button>
              ))}
            </div>
          )}

          {/* Quick add Colombian cities */}
          {!addressQuery && form.cobertura.length < 3 && (
            <div className="mt-2">
              <p className="text-[9px] text-gray-400 mb-1.5">Agregar rapidamente:</p>
              <div className="flex flex-wrap gap-1">
                {COLOMBIAN_CITIES.slice(0, 10)
                  .filter((c) => !form.cobertura.some((loc) => loc.ciudad === c))
                  .slice(0, 6)
                  .map((city) => (
                    <button key={city} onClick={() => {
                      handleAddressSearch(city);
                      // Also auto-search so they get results
                      setTimeout(() => {
                        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", Colombia")}&format=json&limit=1&countrycodes=co`)
                          .then((r) => r.ok ? r.json() : [])
                          .then((data) => {
                            if (data.length > 0) {
                              addCoveragePoint({ city, address: "", lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                            } else {
                              setForm((f) => ({ ...f, cobertura: [...f.cobertura, { ciudad: city, direccion: "", lat: null, lng: null }] }));
                            }
                          })
                          .catch(() => setForm((f) => ({ ...f, cobertura: [...f.cobertura, { ciudad: city, direccion: "", lat: null, lng: null }] })));
                        setAddressQuery("");
                      }, 100);
                    }}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium text-[#1E76B6] bg-[#1E76B6]/5 hover:bg-[#1E76B6]/10 transition-colors">
                      + {city}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PrimaryBtn onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Guardar Perfil
      </PrimaryBtn>
    </Card>
  );
}

function EmailAtencionCard({ companyId, initialEmail, onSaved, toast }: {
  companyId: string; initialEmail: string;
  onSaved: (email: string) => void;
  toast: (msg: string, type: "success" | "error") => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!email.trim() || !email.includes("@")) { toast("Ingrese un email válido", "error"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(
        `${(process.env.NEXT_PUBLIC_API_URL ?? "https://api.tirepro.com.co")}/api/companies/${companyId}/email-atencion`,
        { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: email.trim() }) },
      );
      if (!res.ok) throw new Error();
      onSaved(email.trim());
      toast("Email de propuestas actualizado", "success");
    } catch { toast("Error al guardar email", "error"); }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
        <Mail className="w-5 h-5 text-white/80" />
        <div>
          <p className="text-sm font-bold text-white">Email para Propuestas de Compra</p>
          <p className="text-[10px] text-white/60">Los clientes enviarán sus pedidos de llantas a este email</p>
        </div>
      </div>
      <div className="p-5 space-y-3 bg-white">
        <p className="text-xs text-[#348CCB]">
          Cuando un cliente cree una propuesta de compra, recibirá una notificación en este correo con un enlace para ver y cotizar el pedido en TirePro.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ventas@miempresa.com"
            className="flex-1 px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Guardar
          </button>
        </div>
        {initialEmail && (
          <p className="text-[10px] text-[#348CCB]">
            Actual: <span className="font-bold text-[#0A183A]">{initialEmail}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Tab nav definition
// =============================================================================

type TabId = "profile" | "orders" | "planes" | "company" | "users" | "addUser" | "distributors";

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
  // Initial tab can come from ?tab= so external links (e.g.
  // MarketplaceShell's "Mis Pedidos" entry) deep-link straight into
  // the right section. Falls back to "profile" if no/unknown value.
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "profile";
    const t = new URLSearchParams(window.location.search).get("tab");
    const allowed: TabId[] = ["profile", "orders", "planes", "company", "users", "addUser", "distributors"];
    return (allowed as string[]).includes(t ?? "") ? (t as TabId) : "profile";
  });

  // Scoped distribuidor roles (catalogo / catalogo_admin /
  // marketplace_tracker) historically only saw the Profile tab. We
  // now let them onto the Orders tab too — every role is allowed to
  // place a marketplace order, so every role needs to be able to
  // see their order history. Other admin-only tabs (Planes / Empresa
  // / Usuarios / Distribuidores) stay blocked for these roles.
  useEffect(() => {
    const restrictedRole =
      user?.role === "catalogo" ||
      user?.role === "catalogo_admin" ||
      user?.role === "marketplace_tracker";
    const allowedForRestricted: TabId[] = ["profile", "orders"];
    if (restrictedRole && !(allowedForRestricted as string[]).includes(activeTab)) {
      setActiveTab("profile");
    }
  }, [user?.role, activeTab]);
  const [showChange,   setShowChange]   = useState(false);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);

  // Default role is "viewer" — "regular" isn't a value in the Prisma
  // UserRole enum and submissions with it 400 at the validation pipe.
  const [newUserData, setNewUserData] = useState({ name: "", email: "", password: "", role: "viewer" });
  // Optional per-user vehicle scoping for the new user. Empty list = no
  // restriction (current behavior — user can inspect any company vehicle).
  // A non-empty list installs UserVehicleAccess rows on the backend.
  const [newUserVehicleIds, setNewUserVehicleIds] = useState<string[]>([]);
  const [allVehicles, setAllVehicles] = useState<{ id: string; placa: string; tipovhc?: string | null }[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Lazy-load the company vehicle list the first time the addUser tab opens.
  // We only need it for the optional vehicle picker; loading on initial page
  // mount would burn bandwidth for everyone who never visits this tab.
  useEffect(() => {
    if (activeTab !== "addUser") return;
    if (!user?.companyId) return;
    if (allVehicles.length > 0) return;
    setLoadingVehicles(true);
    authFetch(`${API_BASE}/vehicles/inspectable?companyId=${encodeURIComponent(user.companyId)}`)
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const items = Array.isArray(data) ? data : [];
        setAllVehicles(
          items
            .map((v) => ({ id: v.id, placa: v.placa, tipovhc: v.tipovhc }))
            .sort((a, b) => (a.placa ?? "").localeCompare(b.placa ?? "")),
        );
      })
      .catch(() => setAllVehicles([]))
      .finally(() => setLoadingVehicles(false));
    // authFetch is a stable module-level fn; safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.companyId]);
  const [notifChannel, setNotifChannel] = useState<string>("none");
  const [notifContact, setNotifContact] = useState("");
  const [savingNotif, setSavingNotif] = useState(false);
  const [plateInputs, setPlateInputs] = useState<Record<string, string>>({});
  const [savingUser,  setSavingUser]  = useState(false);
  const [marketplaceOrders, setMarketplaceOrders] = useState<any[]>([]);
  const [returnModal, setReturnModal] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  async function submitReturnRequest() {
    if (!returnModal || !returnReason.trim()) return;
    setReturnSubmitting(true);
    setReturnError("");
    try {
      const stored = localStorage.getItem("user");
      const u = stored ? JSON.parse(stored) : {};
      const res = await authFetch(`${API_BASE}/marketplace/orders/${returnModal.id}/return-request`, {
        method: "POST",
        body: JSON.stringify({ userId: u.id, reason: returnReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo enviar la solicitud");
      }
      // Refresh orders
      if (u.id) {
        const r = await authFetch(`${API_BASE}/marketplace/orders/user?userId=${u.id}`);
        if (r.ok) setMarketplaceOrders(await r.json());
      }
      setReturnModal(null);
      setReturnReason("");
    } catch (e) {
      setReturnError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setReturnSubmitting(false);
    }
  }

  // Plan switching
  const [planSwitchingTo, setPlanSwitchingTo] = useState<string | null>(null);
  const [planCompanyForm, setPlanCompanyForm] = useState({ name: "", nit: "" });
  const [planShowForm, setPlanShowForm] = useState(false);
  const [planCreating, setPlanCreating] = useState(false);

  // Saturn V mode
  const [showSaturnChallenge, setShowSaturnChallenge] = useState(false);
  const [saturnUnlocked, setSaturnUnlocked] = useState(false);
  const [saturnActive, setSaturnActive] = useState(false);
  const [saturnAnswers, setSaturnAnswers] = useState({
    stage1: "", stage1count: "", stage2: "", stage2count: "", stage3: "", stage3count: "",
    engineType1: "", engineType2: "", cathode: "", battery1: "", battery2: "",
  });
  const [saturnError, setSaturnError] = useState("");
  const [saturnSaving, setSaturnSaving] = useState(false);

  // Distributor tab
  const [searchQuery,           setSearchQuery]           = useState("");
  const [searchResults,         setSearchResults]         = useState<DistributorCompany[]>([]);
  const [selectedDistributors,  setSelectedDistributors]  = useState<DistributorCompany[]>([]);
  const [connectedDistributors, setConnectedDistributors] = useState<DistributorCompany[]>([]);
  const [searchLoading,         setSearchLoading]         = useState(false);
  const [grantingAccess,        setGrantingAccess]        = useState(false);

  // -- Toast helper ---------------------------------------------------------
  const toast = useCallback((message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // -- Data fetchers ---------------------------------------------------------
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

  // -- Auth init -------------------------------------------------------------
  useEffect(() => {
    const storedUser  = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (!storedUser || !storedToken) { localStorage.clear(); router.push("/login"); return; }
    const parsed: UserData = JSON.parse(storedUser);
    setUser(parsed);
    // Fetch notification prefs
    authFetch(`${API_BASE}/users/${parsed.id}/notification-prefs`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setNotifChannel(data.notifChannel ?? "none");
          setNotifContact(data.notifContact ?? "");
          if (data.saturnVUnlocked) {
            setSaturnUnlocked(true);
            try { localStorage.setItem("saturnV", "1"); } catch {}
            try {
              if (localStorage.getItem("saturnVActive") === "1") {
                setSaturnActive(true);
                document.documentElement.classList.add("saturn-v");
              }
            } catch {}
          }
        }
      })
      .catch(() => {});
    // Fetch marketplace orders
    if (parsed.id) {
      const token = localStorage.getItem("token") ?? "";
      authFetch(`${API_BASE}/marketplace/orders/user?userId=${parsed.id}`)
        .then((r) => r.ok ? r.json() : [])
        .then(setMarketplaceOrders)
        .catch(() => {});
    }
    if (parsed.companyId) {
      fetchCompany(parsed.companyId);
      if (parsed.role === "admin") {
        fetchUsers(parsed.companyId);
        fetchConnectedDistributors(parsed.companyId);
      }
    }
    setLoading(false);
  }, [router, fetchCompany, fetchUsers, fetchConnectedDistributors]);

  // -- Distributor search (debounced) ----------------------------------------
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

  // -- Handlers --------------------------------------------------------------
  const handleLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    // Validate file size & type up front
    if (file.size > 5 * 1024 * 1024) {
      toast("La imagen no debe superar 5MB", "error");
      return;
    }
    if (!/^image\/(jpeg|png|webp|jpg)$/.test(file.type)) {
      toast("Formato no válido. Usa JPG, PNG o WebP.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      try {
        const res = await authFetch(`${API_BASE}/companies/${company.id}/logo`, {
          method: "PATCH", body: JSON.stringify({ imageBase64: base64 }),
        });
        if (!res.ok) {
          toast("Error al actualizar el logo", "error");
          return;
        }
        const data = await res.json();
        // Backend returns { message, profileImage } — merge instead of replace
        // so we don't lose company.id, name, plan, etc.
        setCompany((prev) => prev ? { ...prev, profileImage: data.profileImage ?? prev.profileImage } : prev);
        setLogoPreview(null); // clear local preview now that the server URL is set
        toast("Logo actualizado exitosamente", "success");
      } catch (err) {
        toast("Error al actualizar el logo", "error");
      }
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
      // Only include vehicleIds when the role is one that does inspection
      // work — picking vehicles for a catalogo / catalogo_admin /
      // marketplace_tracker user would be confusing (those roles don't
      // touch the inspection flow). Empty list keeps the existing
      // "user can inspect any company vehicle" default.
      const inspectorRole = newUserData.role === "viewer" || newUserData.role === "technician";
      const vehicleIds = inspectorRole ? newUserVehicleIds : [];
      const res = await authFetch(`${API_BASE}/users/register`, {
        method: "POST",
        body: JSON.stringify({
          ...newUserData,
          companyId: user.companyId,
          email: newUserData.email.toLowerCase().trim(),
          name: newUserData.name.trim(),
          ...(vehicleIds.length > 0 && { vehicleIds }),
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
      setNewUserVehicleIds([]);
      setVehicleSearch("");
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

  // Admin can change another user's role inline. Backend validates against
  // the Prisma UserRole enum so we don't have to mirror the list here —
  // any unknown value 400s. We optimistically update the local list, then
  // refetch so server-side caches stay coherent.
  const handleEditRole = async (userId: string, nextRole: string) => {
    const target = users.find((x) => x.id === userId);
    if (!target) return;
    if (target.role === nextRole) return;
    if (target.id === user?.id) {
      toast("No puedes cambiar tu propio rol", "error");
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.message ?? "No se pudo actualizar el rol");
      }
      // Optimistic update for immediate feedback; fetchUsers reconciles.
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: nextRole } : u));
      toast("Rol actualizado", "success");
      if (user) fetchUsers(user.companyId);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
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

  // -- Tab definitions -------------------------------------------------------
  const hasCompanyId = !!user?.companyId;
  // Catálogo, Catálogo Admin, and Marketplace Tracker all get the
  // Profile tab only — Mis Pedidos, Planes, Empresa, Usuarios,
  // Distribuidores are all fleet-admin / company-owner concerns. They
  // land here from the sidebar to update their own password and
  // personal data.
  const isCatalogoOnly =
    user?.role === "catalogo" ||
    user?.role === "catalogo_admin" ||
    user?.role === "marketplace_tracker";
  const tabs: { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean; hideForDistributor?: boolean; requiresCompany?: boolean; hideForCatalogo?: boolean }[] = [
    { id: "profile",      label: "Perfil",          icon: User                             },
    // Mis Pedidos is universal — every authenticated user can have placed
    // a marketplace order, regardless of role/plan/company. Used to be
    // gated behind hideForCatalogo, which excluded catalogo /
    // catalogo_admin / marketplace_tracker for no good reason.
    { id: "orders",       label: "Mis Pedidos",     icon: ShoppingCart },
    { id: "planes",       label: "Planes",          icon: Tag,         hideForCatalogo: true },
    { id: "company",      label: "Empresa",         icon: Building,    requiresCompany: true, hideForCatalogo: true },
    { id: "users",        label: "Usuarios",        icon: Users,    adminOnly: true, requiresCompany: true },
    { id: "addUser",      label: "Nuevo Usuario",   icon: UserPlus, adminOnly: true, requiresCompany: true },
    { id: "distributors", label: "Distribuidores",  icon: Link2,    adminOnly: true, hideForDistributor: true, requiresCompany: true },
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

      {/* -- Sticky header -- */}
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

        {/* -- Tab nav -- */}
        <Card className="p-1.5">
          <nav className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tabs.filter((t) => (!t.adminOnly || user?.role === "admin") && (!t.hideForDistributor || company?.plan !== "distribuidor") && (!t.requiresCompany || hasCompanyId) && (!t.hideForCatalogo || !isCatalogoOnly)).length}, minmax(0,1fr))` }}>
            {tabs
              .filter((t) => (!t.adminOnly || user?.role === "admin") && (!t.hideForDistributor || company?.plan !== "distribuidor") && (!t.requiresCompany || hasCompanyId) && (!t.hideForCatalogo || !isCatalogoOnly))
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
                  {(() => {
                    if (!user.companyId) {
                      return (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "#6b7280" }}>
                          <Shield className="w-2.5 h-2.5" />
                          Solo Marketplace
                        </span>
                      );
                    }
                    const meta: Record<string, { label: string; bg: string }> = {
                      admin:               { label: "Administrador",       bg: "#0A183A" },
                      catalogo_admin:      { label: "Catálogo Admin",      bg: "#7c3aed" },
                      catalogo:            { label: "Catálogo",            bg: "#a855f7" },
                      marketplace_tracker: { label: "Marketplace Tracker", bg: "#f97316" },
                      viewer:              { label: "Usuario Regular",     bg: "#1E76B6" },
                      regular:             { label: "Usuario Regular",     bg: "#1E76B6" },
                    };
                    const m = meta[user.role] ?? meta.regular;
                    return (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: m.bg }}>
                        <Shield className="w-2.5 h-2.5" />
                        {m.label}
                      </span>
                    );
                  })()}
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

            {/* Spending summary for marketplace-only users */}
            {!hasCompanyId && marketplaceOrders.length > 0 && (
              <Card className="p-5 sm:p-6">
                <SectionTitle icon={ShoppingCart} title="Tu actividad en TirePro" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(30,118,182,0.1)" }}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total gastado</p>
                    <p className="text-2xl font-black text-[#0A183A]">
                      {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
                        marketplaceOrders.filter((o: any) => o.status !== "cancelado").reduce((sum: number, o: any) => sum + (o.totalCop ?? 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(30,118,182,0.1)" }}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pedidos realizados</p>
                    <p className="text-2xl font-black text-[#0A183A]">{marketplaceOrders.filter((o: any) => o.status !== "cancelado").length}</p>
                  </div>
                </div>
              </Card>
            )}

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

            {/* Notification preferences card — hide for marketplace-only users */}
            {hasCompanyId && <Card className="p-5 sm:p-6">
              <SectionTitle icon={Mail} title="Mis Notificaciones" />
              <p className="text-xs text-gray-400 mb-4">
                Elige como quieres recibir alertas cuando el agente detecte problemas en tus llantas.
              </p>

              <div className="space-y-2.5 mb-4">
                {[
                  { key: "email", label: "Correo electronico", desc: "Recibe alertas por email", placeholder: "tu@email.com" },
                  { key: "whatsapp", label: "WhatsApp", desc: "Recibe alertas por mensaje de WhatsApp", placeholder: "+57 300 123 4567" },
                  { key: "none", label: "Solo en plataforma", desc: "Las alertas solo aparecen dentro de TirePro", placeholder: "" },
                ].map((opt) => {
                  const active = notifChannel === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setNotifChannel(opt.key)}
                      className="w-full text-left rounded-xl p-4 transition-all"
                      style={{
                        border: active ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.15)",
                        background: active ? "rgba(30,118,182,0.04)" : "white",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ border: active ? "2px solid #1E76B6" : "2px solid #cbd5e1", background: active ? "#1E76B6" : "transparent" }}
                        >
                          {active && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: active ? "#0A183A" : "#334155" }}>{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.desc}</p>
                          {active && opt.key !== "none" && (
                            <input
                              type={opt.key === "email" ? "email" : "text"}
                              value={notifContact}
                              onChange={(e) => setNotifContact(e.target.value)}
                              placeholder={opt.placeholder}
                              onClick={(e) => e.stopPropagation()}
                              className={inputCls + " mt-3"}
                              style={inputStyle}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <PrimaryBtn
                disabled={savingNotif}
                onClick={async () => {
                  if (!user) return;
                  setSavingNotif(true);
                  try {
                    const res = await authFetch(`${API_BASE}/users/${user.id}/notification-prefs`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        notifChannel: notifChannel === "none" ? null : notifChannel,
                        notifContact: notifChannel === "none" ? null : notifContact.trim() || null,
                      }),
                    });
                    if (!res.ok) throw new Error();
                    toast("Preferencias de notificacion guardadas", "success");
                  } catch {
                    toast("Error al guardar preferencias", "error");
                  }
                  setSavingNotif(false);
                }}
              >
                {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Guardar preferencias
              </PrimaryBtn>
            </Card>}

            {/* Saturn V trigger / toggle */}
            {saturnUnlocked ? (
              <div
                className="mt-6 rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: saturnActive ? "linear-gradient(135deg, #0a0a0a, #1a1a2e)" : "rgba(10,24,58,0.03)",
                  border: saturnActive ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(52,140,203,0.1)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚀</span>
                  <div>
                    <p className="text-xs font-black" style={{ color: saturnActive ? "#f97316" : "#0A183A" }}>Saturn V Mode</p>
                    <p className="text-[10px]" style={{ color: saturnActive ? "rgba(255,255,255,0.4)" : "#94a3b8" }}>
                      {saturnActive ? "Houston, estamos en orbita." : "Modo espacial desbloqueado"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !saturnActive;
                    setSaturnActive(next);
                    localStorage.setItem("saturnVActive", next ? "1" : "0");
                    document.documentElement.classList.toggle("saturn-v", next);
                  }}
                  className="relative w-11 h-6 rounded-full transition-all"
                  style={{ background: saturnActive ? "#f97316" : "rgba(0,0,0,0.1)" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ left: saturnActive ? 22 : 2 }}
                  />
                </button>
              </div>
            ) : (
              <div className="flex justify-center pt-8 pb-2">
                <button
                  onClick={() => setShowSaturnChallenge(true)}
                  className="text-2xl transition-all hover:scale-125 active:scale-95"
                  style={{ opacity: 0.25 }}
                >
                  🚀
                </button>
              </div>
            )}
          </div>
        )}

        {/* Saturn V challenge modal */}
        {showSaturnChallenge && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          >
            <div
              className="w-full sm:max-w-md max-h-[95vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Header */}
              <div className="px-5 py-3.5 flex-shrink-0 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚀</span>
                  <div>
                    <h3 className="text-sm font-black text-white" style={{ fontFamily: "'DM Mono', monospace" }}>SATURN V</h3>
                    <p className="text-[9px] text-white/30">Demuestra lo que sabes</p>
                  </div>
                </div>
                <button onClick={() => { setShowSaturnChallenge(false); setSaturnError(""); }} className="text-white/60 hover:text-white transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Questions — scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ background: "#0d0d0d" }}>

                {/* Q1: Saturn V stages */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">1 · Motor y cantidad por etapa del Saturn V</p>
                  <div className="space-y-1.5">
                    {([
                      { key: "stage1", countKey: "stage1count", label: "S-IC" },
                      { key: "stage2", countKey: "stage2count", label: "S-II" },
                      { key: "stage3", countKey: "stage3count", label: "S-IVB" },
                    ] as const).map(({ key, countKey, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-white/80 w-10 flex-shrink-0">{label}</span>
                        <input
                          type="text"
                          value={saturnAnswers[key]}
                          onChange={(e) => setSaturnAnswers((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder="Motor"
                          className="flex-1 px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        />
                        <input
                          type="number"
                          value={saturnAnswers[countKey]}
                          onChange={(e) => setSaturnAnswers((p) => ({ ...p, [countKey]: e.target.value }))}
                          placeholder="#"
                          className="w-12 px-2 py-1.5 rounded-md text-xs text-center bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

                {/* Q2: Engine cycles */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">2 · Dos tipos de ciclo de motor cohete</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={saturnAnswers.engineType1}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, engineType1: e.target.value }))}
                      placeholder="Ciclo 1"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                    <input
                      type="text"
                      value={saturnAnswers.engineType2}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, engineType2: e.target.value }))}
                      placeholder="Ciclo 2"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

                {/* Q3: Cathode/Anode */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">3 · Electrodo positivo en una celda</p>
                  <div className="flex gap-2">
                    {(["catodo", "anodo"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSaturnAnswers((p) => ({ ...p, cathode: opt }))}
                        className="flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                        style={{
                          background: saturnAnswers.cathode === opt ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.03)",
                          border: saturnAnswers.cathode === opt ? "1.5px solid #f97316" : "1.5px solid rgba(255,255,255,0.06)",
                          color: saturnAnswers.cathode === opt ? "#f97316" : "rgba(255,255,255,0.8)",
                        }}
                      >
                        {opt === "catodo" ? "Catodo" : "Anodo"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

                {/* Q4: Battery types */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">4 · Dos tipos de baterias de litio</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={saturnAnswers.battery1}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, battery1: e.target.value }))}
                      placeholder="Tipo 1"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                    <input
                      type="text"
                      value={saturnAnswers.battery2}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, battery2: e.target.value }))}
                      placeholder="Tipo 2"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                  </div>
                </div>

                {saturnError && (
                  <p className="text-[11px] text-red-400 font-bold flex items-center gap-1.5 pt-2">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" /> {saturnError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="px-5 py-3 flex-shrink-0" style={{ background: "#0d0d0d", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  disabled={saturnSaving}
                  onClick={async () => {
                    const norm = (s: string) => s.trim().toLowerCase().replace(/[-\s]/g, "");

                    // 1. Saturn V stages
                    const s1 = norm(saturnAnswers.stage1);
                    const s2 = norm(saturnAnswers.stage2);
                    const s3 = norm(saturnAnswers.stage3);
                    const c1 = saturnAnswers.stage1count.trim();
                    const c2 = saturnAnswers.stage2count.trim();
                    const c3 = saturnAnswers.stage3count.trim();
                    const stagesOk = s1 === "f1" && c1 === "5" && s2 === "j2" && c2 === "5" && s3 === "j2" && c3 === "1";

                    // 2. Engine cycle types (accept any 2 valid types)
                    const VALID_CYCLES = new Set([
                      "abierto", "cicloabierto", "opencycle",
                      "cerrado", "ciclocerrado", "closedcycle",
                      "fullflow", "flujocompleto",
                      "presurizado", "pressurefed", "alimentadoporpresion",
                      "expander", "expandercycle",
                      "gasgen", "gasgenerator", "generadordegas",
                      "stagedcombustion", "combustionescalonada",
                      "electricpump", "bombaelectrica",
                      "coldgas", "gasfrio",
                      "monopropelente", "monopropellant", "monoprop",
                      "bipropelente", "bipropellant", "biprop",
                    ]);
                    const e1 = norm(saturnAnswers.engineType1);
                    const e2 = norm(saturnAnswers.engineType2);
                    const enginesOk = e1 !== e2 && VALID_CYCLES.has(e1) && VALID_CYCLES.has(e2);

                    // 3. Cathode is positive
                    const cathodeOk = saturnAnswers.cathode === "catodo";

                    // 4. Battery types (accept any 2 valid types)
                    const VALID_BATTERIES = new Set([
                      "lfp", "lifepo4", "fosfatodehierro",
                      "nmc", "nmc811", "nmc622", "nmc532",
                      "nca",
                      "lco", "cobaltodilitio",
                      "lmo", "manganeso",
                      "lto", "titanato",
                      "solidstate", "estadosolido", "solidostate",
                      "lis", "litioazufre", "lithiumsulfur",
                      "sodium", "sodio", "naion", "sodiumion",
                      "liion", "iondelitio",
                      "lipo", "litiopolimero",
                    ]);
                    const b1 = norm(saturnAnswers.battery1);
                    const b2 = norm(saturnAnswers.battery2);
                    const batteriesOk = b1 !== b2 && VALID_BATTERIES.has(b1) && VALID_BATTERIES.has(b2);

                    // Build error messages
                    const errors: string[] = [];
                    if (!stagesOk) errors.push("Etapas del Saturn V");
                    if (!enginesOk) errors.push("Tipos de motor");
                    if (!cathodeOk) errors.push("Electrodo positivo");
                    if (!batteriesOk) errors.push("Tipos de bateria");

                    if (errors.length > 0) {
                      setSaturnError(`Incorrecto: ${errors.join(", ")}.`);
                      return;
                    }

                    setSaturnSaving(true);
                    try {
                      if (user) {
                        await authFetch(`${API_BASE}/users/${user.id}/notification-prefs`, {
                          method: "PATCH",
                          body: JSON.stringify({ saturnVUnlocked: true }),
                        });
                      }
                      setSaturnUnlocked(true);
                      localStorage.setItem("saturnV", "1");
                      setShowSaturnChallenge(false);
                      setSaturnError("");
                      toast("Saturn V Mode desbloqueado.", "success");
                    } catch {
                      setSaturnError("Error al guardar. Intenta de nuevo.");
                    } finally {
                      setSaturnSaving(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "white",
                    boxShadow: "0 0 20px rgba(249,115,22,0.3)",
                  }}
                >
                  {saturnSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Autorizar Lanzamiento"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* ORDERS TAB                                                        */}
        {/* ================================================================ */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={ShoppingCart} title="Historial de Pedidos" />
              {marketplaceOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold text-[#0A183A]">Sin pedidos</p>
                  <p className="text-xs mt-1">Tus compras del marketplace apareceran aqui.</p>
                  <a href="/marketplace" className="inline-block mt-3 px-4 py-2 rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                    Ir al Marketplace
                  </a>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  {marketplaceOrders.map((o: any) => {
                    const imgs = Array.isArray(o.listing?.imageUrls) ? o.listing.imageUrls : [];
                    const cover = imgs.length > 0 ? imgs[o.listing?.coverIndex ?? 0] ?? imgs[0] : null;
                    const fmtCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
                    const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
                      pendiente:  { label: "Pendiente",  color: "#f97316", bg: "rgba(249,115,22,0.1)" },
                      confirmado: { label: "Confirmado", color: "#1E76B6", bg: "rgba(30,118,182,0.1)" },
                      enviado:    { label: "Enviado",    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
                      entregado:  { label: "Entregado",  color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
                      cancelado:  { label: "Cancelado",  color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
                    };
                    const st = statusMeta[o.status] ?? statusMeta.pendiente;
                    const returnMeta: Record<string, { label: string; color: string; bg: string }> = {
                      pendiente: { label: "Devolución pendiente", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                      aprobada:  { label: "Devolución aprobada",  color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
                      rechazada: { label: "Devolución rechazada", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
                    };
                    const ret = o.returnStatus ? returnMeta[o.returnStatus] : null;
                    const canRequestReturn = !o.returnStatus && (o.status === "entregado" || o.status === "enviado");
                    // Tracking deep-link — uses the buyer email already
                    // on the order so the tracking page passes its email
                    // gate without prompting the user again.
                    const trackHref = `/marketplace/order/${o.id}?email=${encodeURIComponent(o.buyerEmail ?? user?.email ?? "")}`;
                    return (
                      <div key={o.id} className="rounded-xl bg-white overflow-hidden hover:border-[#1E76B6]/30 transition-colors" style={{ border: "1px solid rgba(52,140,203,0.1)" }}>
                        <div className="flex items-center gap-3 p-3">
                          <a
                            href={trackHref}
                            className="w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center overflow-hidden flex-shrink-0"
                          >
                            {cover ? <img src={cover} alt="" className="w-full h-full object-contain p-1.5" /> : <Package className="w-5 h-5 text-gray-300" />}
                          </a>
                          <a href={trackHref} className="flex-1 min-w-0 group">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[#0A183A] group-hover:text-[#1E76B6] truncate">
                                {o.listing?.marca} {o.listing?.modelo}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                              {ret && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: ret.bg, color: ret.color }}>{ret.label}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {o.listing?.dimension} · {o.quantity} uds · #{o.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(o.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                            {o.returnReason && (
                              <p className="text-[10px] text-gray-500 mt-1 italic">Motivo: {o.returnReason}</p>
                            )}
                          </a>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <p className="text-sm font-black text-[#0A183A]">{fmtCOP(o.totalCop)}</p>
                            {/* Explicit tracking CTA — replaces the prior
                                hover-only "Ver seguimiento →" hint, which
                                was invisible on touch and easy to miss on
                                desktop. Always visible, never hidden. */}
                            <a
                              href={trackHref}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-white whitespace-nowrap transition-all hover:opacity-90"
                              style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                            >
                              <Truck className="w-2.5 h-2.5" />
                              Rastrear pedido
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </a>
                            {canRequestReturn && (
                              <button
                                onClick={() => { setReturnModal(o); setReturnReason(""); setReturnError(""); }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black text-[#1E76B6] border border-[#1E76B6]/25 hover:bg-[#1E76B6]/5 transition-colors whitespace-nowrap"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                Solicitar devolución
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-gray-400 pt-1 text-center">
                    Consulta nuestra{" "}
                    <a href="/marketplace/return-policy" className="font-bold text-[#1E76B6] hover:underline">política de devoluciones</a>.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Return-request modal */}
        {returnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-5 py-4" style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm">Solicitar devolución</h3>
                    <p className="text-[10px] text-white/70 mt-0.5">El distribuidor recibirá tu solicitud</p>
                  </div>
                  <button onClick={() => setReturnModal(null)} className="ml-auto text-white/70 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="px-3 py-2 rounded-xl bg-gray-50">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pedido</p>
                  <p className="text-sm font-black text-[#0A183A]">{returnModal.listing?.marca} {returnModal.listing?.modelo}</p>
                  <p className="text-[10px] text-gray-500">#{returnModal.id.slice(0, 8).toUpperCase()} · {returnModal.quantity} uds</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest block mb-1.5">Motivo *</label>
                  <select
                    value={returnReason.startsWith("Otro:") ? "Otro" : returnReason}
                    onChange={(e) => setReturnReason(e.target.value === "Otro" ? "Otro: " : e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6]"
                  >
                    <option value="">Seleccionar motivo…</option>
                    <option value="Producto incorrecto">Producto incorrecto</option>
                    <option value="Defecto de fábrica">Defecto de fábrica</option>
                    <option value="Daños en el transporte">Daños en el transporte</option>
                    <option value="Cambio de opinión">Cambio de opinión</option>
                    <option value="Otro">Otro motivo</option>
                  </select>
                </div>
                {(returnReason.startsWith("Otro:") || returnReason === "Otro") && (
                  <textarea
                    value={returnReason.startsWith("Otro:") ? returnReason.slice(5).trimStart() : ""}
                    onChange={(e) => setReturnReason(`Otro: ${e.target.value}`)}
                    rows={3}
                    placeholder="Describe el motivo en detalle…"
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] resize-none"
                  />
                )}
                {returnError && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[11px]" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700">{returnError}</span>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  El distribuidor tiene hasta 5 días hábiles para responder. Recibirás un correo con la actualización.
                </p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setReturnModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    disabled={returnSubmitting || !returnReason.trim() || returnReason === "Otro" || returnReason === "Otro: "}
                    onClick={submitReturnRequest}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-all"
                    style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                  >
                    {returnSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Enviar solicitud"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PLANES TAB                                                        */}
        {/* ================================================================ */}
        {activeTab === "planes" && user && (() => {
          const currentPlan = company?.plan ?? "marketplace";
          const isDistributor = currentPlan === "distribuidor";
          const isMarketplaceOnly = !user.companyId;
          // Distribuidor and non-distribuidor plans live in separate tracks —
          // a distribuidor can't downgrade to fleet plans and vice versa, so
          // we only show the cards from the user's own track.
          const ALL_PLANS = [
            { id: "marketplace", name: "Marketplace", price: "Gratis", priceDetail: "Para siempre", desc: "Acceso al marketplace de llantas", features: ["Comprar llantas", "Comparar precios", "Resenas y calificaciones", "Busqueda por placa"], current: isMarketplaceOnly, canSwitch: false, highlight: false },
            { id: "plus", name: "Plus", price: "Gratis", priceDetail: "Para siempre", desc: "Gestion basica de flotas + marketplace", features: ["Todo de Marketplace", "Dashboard de flota", "Analisis basico de desgaste", "Inventario de llantas", "Reportes y semaforo", "Gestion de vehiculos"], current: currentPlan === "plus", canSwitch: isMarketplaceOnly || currentPlan === "pro", highlight: false },
            { id: "pro", name: "Pro", price: "$10.000", priceDetail: "/mes", desc: "Gestion avanzada con IA + marketplace", features: ["Todo de Plus", "Agentes IA (Nikita, Sentinel, Campa, Linex)", "Analisis avanzado de desgaste con IA", "Notificaciones inteligentes", "Prediccion de reemplazo", "Multiples usuarios", "Roles y permisos", "Distribuidores conectados", "Soporte prioritario"], current: currentPlan === "pro", canSwitch: isMarketplaceOnly || currentPlan === "plus", highlight: true },
            { id: "distribuidor", name: "Distribuidor", price: "$1.000.000", priceDetail: "/mes", desc: "Vende llantas en el marketplace", features: ["Catalogo de productos", "Gestion de pedidos", "Analitica de ventas", "Clientes conectados", "Perfil de distribuidor publico", "Notificaciones por email"], current: isDistributor, canSwitch: isMarketplaceOnly, highlight: false },
          ];
          const PLANS = isDistributor
            ? ALL_PLANS.filter((p) => p.id === "distribuidor")
            : ALL_PLANS.filter((p) => p.id !== "distribuidor");

          async function doSwitchPlan(planId: string) {
            if (isMarketplaceOnly) { setPlanSwitchingTo(planId); setPlanShowForm(true); return; }
            setPlanSwitchingTo(planId);
            try {
              const res = await authFetch(`${API_BASE}/companies/${user.companyId}`, { method: "PATCH", body: JSON.stringify({ plan: planId }) });
              if (!res.ok) throw new Error("Error al cambiar plan");
              toast("Plan actualizado exitosamente", "success");
              fetchCompany(user.companyId);
            } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
            setPlanSwitchingTo(null);
          }

          async function doCreateCompany() {
            if (!planCompanyForm.name.trim()) { toast("Ingresa el nombre de la empresa", "error"); return; }
            setPlanCreating(true);
            try {
              const res = await authFetch(`${API_BASE}/companies`, { method: "POST", body: JSON.stringify({ name: planCompanyForm.name.trim(), nit: planCompanyForm.nit.trim() || undefined, plan: planSwitchingTo }) });
              if (!res.ok) throw new Error("Error al crear empresa");
              const newCompany = await res.json();
              await authFetch(`${API_BASE}/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ companyId: newCompany.id, role: "admin" }) });
              const updatedUser = { ...user, companyId: newCompany.id, role: "admin" };
              localStorage.setItem("user", JSON.stringify(updatedUser));
              setUser(updatedUser);
              toast("Empresa creada. Redirigiendo...", "success");
              setTimeout(() => window.location.href = "/dashboard", 1500);
            } catch (e) { toast(e instanceof Error ? e.message : "Error al crear empresa", "error"); }
            setPlanCreating(false);
          }

          return (
            <div className="space-y-4">
              <Card className="p-5 sm:p-6">
                <SectionTitle icon={Tag} title="Tu Plan Actual" />
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1.5 rounded-full text-sm font-black text-white"
                    style={{ background: isDistributor ? "#7c3aed" : isMarketplaceOnly ? "#6b7280" : "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                    {isMarketplaceOnly ? "Solo Marketplace" : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                  </span>
                  {isDistributor && <p className="text-xs text-gray-400">Los distribuidores no pueden cambiar de plan.</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PLANS.map((plan) => (
                    <div key={plan.id} className="relative rounded-2xl p-5 transition-all"
                      style={{
                        border: plan.current ? "2px solid #1E76B6" : plan.highlight ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.15)",
                        background: plan.current ? "rgba(30,118,182,0.03)" : "white",
                      }}>
                      {plan.highlight && !plan.current && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                          RECOMENDADO
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-black text-[#0A183A]">{plan.name}</h3>
                        {plan.current && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1E76B6] text-white">ACTUAL</span>}
                      </div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <p className="text-xl font-black text-[#1E76B6]">{plan.price}</p>
                        {plan.priceDetail && <span className="text-xs text-gray-400">{plan.priceDetail}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-4">{plan.desc}</p>
                      <ul className="space-y-1.5 mb-5">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1.5">
                            <span className="text-[#1E76B6] font-bold mt-0.5">-</span> {f}
                          </li>
                        ))}
                      </ul>
                      {!plan.current && plan.canSwitch && !isDistributor && (
                        <button
                          onClick={() => doSwitchPlan(plan.id)}
                          disabled={planSwitchingTo === plan.id}
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                          {planSwitchingTo === plan.id ? "Cambiando..." : isMarketplaceOnly ? `Activar ${plan.name}` : `Cambiar a ${plan.name}`}
                        </button>
                      )}
                      {plan.current && (
                        <div className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-[#1E76B6]"
                          style={{ background: "rgba(30,118,182,0.08)" }}>
                          Plan activo
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {planShowForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { setPlanShowForm(false); setPlanSwitchingTo(null); }}>
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-bold text-[#0A183A]">Crear empresa</p>
                        <p className="text-[11px] text-gray-400">Para activar el plan {planSwitchingTo} necesitas una empresa</p>
                      </div>
                      <button onClick={() => { setPlanShowForm(false); setPlanSwitchingTo(null); }}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <Field label="Nombre de la empresa" required>
                        <input type="text" value={planCompanyForm.name} onChange={(e) => setPlanCompanyForm((f) => ({ ...f, name: e.target.value }))} placeholder="Mi Empresa S.A.S." className={inputCls} style={inputStyle} />
                      </Field>
                      <Field label="NIT (opcional)">
                        <input type="text" value={planCompanyForm.nit} onChange={(e) => setPlanCompanyForm((f) => ({ ...f, nit: e.target.value }))} placeholder="900.123.456-7" className={inputCls} style={inputStyle} />
                      </Field>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <GhostBtn onClick={() => { setPlanShowForm(false); setPlanSwitchingTo(null); }} className="flex-1">Cancelar</GhostBtn>
                      <PrimaryBtn onClick={doCreateCompany} disabled={planCreating || !planCompanyForm.name.trim()} className="flex-1">
                        {planCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear y activar"}
                      </PrimaryBtn>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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
                  <div className="w-24 h-20 rounded-2xl overflow-hidden bg-[#F0F7FF] flex items-center justify-center p-1.5" style={{ border: "2px solid rgba(52,140,203,0.2)" }}>
                    <img
                      src={logoPreview || company.profileImage}
                      alt={company.name}
                      className="max-w-full max-h-full object-contain"
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
                { label: "Usuarios",  value: company._count.users,    icon: Users,     grad: "linear-gradient(135deg, #0A183A, #173D68)" },
                { label: "Vehículos", value: company._count.vehicles,  icon: Car,       grad: "linear-gradient(135deg, #173D68, #1E76B6)" },
                { label: "Llantas",   value: company._count.tires,     icon: Building2, grad: "linear-gradient(135deg, #1E76B6, #348CCB)" },
              ].map(({ label, value, icon: Icon, grad }) => (
                <Card key={label} className="p-4 sm:p-5 flex flex-col gap-2">
                  <div className="p-2 rounded-xl self-start" style={{ background: grad }}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-black leading-none">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                </Card>
              ))}
            </div>

            {/* Email de atención para propuestas (distribuidor) */}
            {user?.role === "admin" && (
              <EmailAtencionCard companyId={company.id} initialEmail={company.emailAtencion ?? ""} onSaved={(email) => setCompany((c) => c ? { ...c, emailAtencion: email } : c)} toast={toast} />
            )}

            {/* Distributor marketplace profile — moved to Pedidos & Ventas tab */}

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
          <UsersTabContent
            users={users}
            currentUserId={user?.id ?? null}
            companyPlan={(company?.plan ?? "").toLowerCase()}
            plateInputs={plateInputs}
            setPlateInputs={setPlateInputs}
            onEditRole={handleEditRole}
            onDelete={handleDeleteUser}
            onAddPlate={handleAddPlate}
            onRemovePlate={handleRemovePlate}
            onNewUser={() => setActiveTab("addUser")}
          />
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
                  <option value="viewer">Usuario Regular</option>
                  <option value="admin">Administrador</option>
                  {/* Catalog roles are distribuidor-only — the backend
                      rejects them for other plans and showing them to a
                      fleet admin would just confuse. */}
                  {(company?.plan ?? "").toLowerCase() === "distribuidor" && (
                    <>
                      <option value="catalogo">Catálogo (ventas)</option>
                      <option value="catalogo_admin">Catálogo Admin (ventas + stats)</option>
                      <option value="marketplace_tracker">Marketplace Tracker (catálogo + pedidos)</option>
                    </>
                  )}
                </select>
              </Field>

              {/* Optional vehicle scoping — only meaningful for the
                  inspection-capable roles. If the admin picks at least
                  one vehicle, the new user can ONLY inspect those
                  vehicles; leaving it empty preserves the existing
                  default of full company-wide access. */}
              {(newUserData.role === "viewer" || newUserData.role === "technician") && (
                <Field label="Vehículos asignados (opcional)">
                  <p className="text-[11px] text-gray-500 mb-2">
                    Si seleccionas vehículos, el usuario sólo podrá inspeccionar esos. Déjalo vacío para darle acceso a todos los vehículos de la empresa.
                  </p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={loadingVehicles ? "Cargando vehículos…" : "Buscar por placa…"}
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      disabled={loadingVehicles}
                      className={`${inputCls} pl-9`}
                      style={inputStyle}
                    />
                  </div>

                  {/* Results — only render when actively searching so the
                      tab doesn't show an N-row list by default. */}
                  {vehicleSearch.trim().length >= 1 && (() => {
                    const q = vehicleSearch.trim().toLowerCase();
                    const matches = allVehicles
                      .filter((v) => !newUserVehicleIds.includes(v.id))
                      .filter((v) => v.placa.toLowerCase().includes(q))
                      .slice(0, 20);
                    if (matches.length === 0) {
                      return (
                        <p className="text-xs text-gray-400 py-2">
                          {loadingVehicles ? "Cargando…" : "Sin resultados"}
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
                        {matches.map((v) => (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => {
                              setNewUserVehicleIds((prev) => prev.includes(v.id) ? prev : [...prev, v.id]);
                              setVehicleSearch("");
                            }}
                            className="w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-all hover:bg-[#F0F7FF]"
                            style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0A183A] truncate">{v.placa.toUpperCase()}</p>
                              {v.tipovhc && <p className="text-[10px] text-gray-400 truncate">{v.tipovhc}</p>}
                            </div>
                            <PlusCircle className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Selected vehicles */}
                  {newUserVehicleIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {newUserVehicleIds.map((id) => {
                        const v = allVehicles.find((x) => x.id === id);
                        const label = v ? v.placa.toUpperCase() : id.slice(0, 6);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: "rgba(30,118,182,0.08)",
                              border: "1px solid rgba(30,118,182,0.18)",
                              color: "#1E76B6",
                            }}
                          >
                            {label}
                            <button
                              type="button"
                              onClick={() => setNewUserVehicleIds((prev) => prev.filter((x) => x !== id))}
                              className="hover:opacity-70"
                              aria-label={`Quitar ${label}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Field>
              )}

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
                        <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0 p-1" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                          <img src={d.profileImage} alt={d.name} className="max-w-full max-h-full object-contain" />
                        </div>
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
                        <div className="w-9 h-9 rounded-lg bg-[#F0F7FF] flex items-center justify-center flex-shrink-0 p-0.5" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                          <img src={d.profileImage} alt={d.name} className="max-w-full max-h-full object-contain" />
                        </div>
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
                          <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0 p-1" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                            <img src={dist.profileImage} alt={dist.name} className="max-w-full max-h-full object-contain" />
                          </div>
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