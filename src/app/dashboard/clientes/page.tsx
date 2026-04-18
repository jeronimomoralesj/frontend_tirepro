"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2, Users, Plus, X, ChevronDown, Search,
  UserPlus, Eye, EyeOff, CheckCircle, AlertCircle,
  Loader2, Car, Circle, ArrowRight, Calendar, TrendingUp,
  Activity, DollarSign, ShieldCheck, Mail, Clock, UserCheck,
} from "lucide-react";

// =============================================================================
// Types — Mi Equipo
// =============================================================================

type TabKey = "clientes" | "equipo";

type DateRangeKey = "today" | "7d" | "30d" | "90d" | "all";

type EquipoUser = {
  id:             string;
  name:           string;
  email:          string;
  role:           string;
  createdAt:      string;
  lastLoginAt:    string | null;
  loginCount:     number;
  inspections:    number;
  lastInspection: string | null;
};

function dateRangeFromKey(key: DateRangeKey): { from?: string; to?: string } {
  const now = new Date();
  if (key === "all") return {};
  if (key === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { from: start.toISOString() };
  }
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  const start = new Date(now); start.setDate(start.getDate() - days);
  return { from: start.toISOString() };
}

// =============================================================================
// Types
// =============================================================================

type ClientStats = {
  users: number;
  vehicles: number;
  tires: number;
  activeTires: number;
  finTires: number;
  lastInspection: string | null;
  avgCpk: number | null;
  inversionTotal: number;
  clientSince: string;
  distributorSince: string;
  yearsAsClient: number;
  inspections30d: number;
  inspectionsByMonth: { month: string; count: number }[];
};
type Client = {
  id: string;
  name: string;
  profileImage: string;
  plan: string;
  vehicleCount: number;
  tireCount: number;
  stats?: ClientStats;
};
type ClientUser = {
  id:    string;
  name:  string;
  email: string;
  role:  string;
  lastLoginAt?: string | null;
  loginCount?:  number;
  createdAt?:   string;
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

function HeroKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
    >
      <div className="p-1.5 rounded-lg text-white/90 flex-shrink-0"
           style={{ background: "rgba(52,140,203,0.22)" }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-white/50 uppercase tracking-wide font-bold leading-none">{label}</p>
        <p className="text-sm text-white font-black leading-tight mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function Sparkline({ data, color = "#1E76B6" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 140, h = 40, step = data.length > 1 ? w / (data.length - 1) : 0;
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * (h - 6) - 3}`).join(" ");
  const areaPts = `0,${h} ${pts} ${(data.length - 1) * step},${h}`;
  const gradId = `spark-grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * (h - 6) - 3} r="2.25" fill="white" stroke={color} strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("es-CO");
}
function fmtMoney(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("es-CO"); } catch { return "—"; }
}

function ClientCard({ client, onAddUser }: { client: Client; onAddUser: (c: Client) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers]       = useState<ClientUser[] | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [hovered, setHovered]   = useState(false);

  const stats = client.stats;

  async function toggle() {
    const nextOpen = !expanded;
    setExpanded(nextOpen);
    if (nextOpen && users === null) {
      setLoadingUsers(true);
      try {
        const res = await fetch(`${API_BASE}/users?companyId=${client.id}`, { headers: authHeaders() });
        const data = res.ok ? await res.json() : [];
        setUsers(Array.isArray(data) ? data : []);
      } catch { setUsers([]); }
      setLoadingUsers(false);
    }
  }

  // Freshness indicator based on last inspection
  const freshness = (() => {
    if (!stats?.lastInspection) return { color: "#94a3b8", label: "Sin actividad" };
    const days = Math.floor((Date.now() - new Date(stats.lastInspection).getTime()) / 86400000);
    if (days <= 7)  return { color: "#10b981", label: `hace ${days}d` };
    if (days <= 30) return { color: "#f59e0b", label: `hace ${days}d` };
    return            { color: "#ef4444", label: `hace ${days}d` };
  })();

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "white",
        border: `1px solid ${hovered ? "rgba(30,118,182,0.35)" : "rgba(52,140,203,0.14)"}`,
        boxShadow: hovered
          ? "0 20px 40px -12px rgba(30,118,182,0.22), 0 6px 16px -8px rgba(10,24,58,0.08)"
          : "0 2px 12px rgba(10,24,58,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent stripe */}
      <div className="h-1"
           style={{ background: "linear-gradient(90deg, #0A183A 0%, #1E76B6 45%, #348CCB 100%)" }} />

      <div className="p-5">
        {/* Header — avatar + name + plan + freshness */}
        <div className="flex items-start gap-3 mb-5">
          <div className="relative flex-shrink-0">
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #0A183A 0%, #173D68 55%, #1E76B6 100%)",
                boxShadow: "0 6px 16px -4px rgba(10,24,58,0.3)",
              }}
            >
              {client.profileImage && !client.profileImage.includes("logoFull.png") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={client.profileImage} alt={client.name} className="max-w-full max-h-full object-contain p-1.5" />
              ) : (
                <span className="text-white font-black text-xl tracking-tight">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
              style={{ background: freshness.color }}
              title={`Última inspección · ${freshness.label}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-[#0A183A] text-[15px] leading-tight truncate pr-6">
              {client.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{
                  background: "linear-gradient(135deg, rgba(30,118,182,0.12), rgba(52,140,203,0.08))",
                  color: "#1E76B6",
                }}
              >
                <Circle className="w-1.5 h-1.5 fill-current" />{client.plan}
              </span>
              {stats && stats.yearsAsClient > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: "rgba(22,163,74,0.08)",
                        color: "#15803d",
                      }}>
                  {stats.yearsAsClient} año{stats.yearsAsClient === 1 ? "" : "s"}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      background: `${freshness.color}15`,
                      color: freshness.color,
                    }}>
                <Activity className="w-2.5 h-2.5" />
                {freshness.label}
              </span>
            </div>
          </div>
        </div>

        {/* Stats — two featured + compact four */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <FeaturedStat
            icon={<Activity className="w-4 h-4" />}
            label="Llantas activas"
            value={fmtNum(stats?.activeTires ?? client.tireCount)}
            sub={stats?.finTires ? `${stats.finTires.toLocaleString("es-CO")} retiradas` : "—"}
            accent="#1E76B6"
          />
          <FeaturedStat
            icon={<Users className="w-4 h-4" />}
            label="Usuarios"
            value={fmtNum(stats?.users)}
            sub={stats?.vehicles != null ? `${stats.vehicles} vehículos` : "—"}
            accent="#348CCB"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <CompactStat icon={<DollarSign className="w-3 h-3" />} label="CPK"       value={stats?.avgCpk != null ? `$${Math.round(stats.avgCpk)}` : "—"} />
          <CompactStat icon={<TrendingUp className="w-3 h-3" />} label="Inversión" value={fmtMoney(stats?.inversionTotal)} />
          <CompactStat icon={<ShieldCheck className="w-3 h-3" />} label="30d"      value={fmtNum(stats?.inspections30d)} />
        </div>

        {/* Sparkline */}
        {stats?.inspectionsByMonth && stats.inspectionsByMonth.some(m => m.count > 0) && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl mb-3"
               style={{
                 background: "linear-gradient(135deg, rgba(10,24,58,0.025), rgba(30,118,182,0.04))",
                 border: "1px solid rgba(52,140,203,0.1)",
               }}>
            <div className="min-w-0">
              <p className="text-[9px] text-gray-400 leading-none uppercase tracking-widest font-bold">Inspecciones · 6m</p>
              <p className="text-[11px] text-[#173D68] font-semibold mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                últ. {fmtDate(stats.lastInspection)}
              </p>
            </div>
            <Sparkline data={stats.inspectionsByMonth.map(m => m.count)} />
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onAddUser(client)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black text-white transition-all hover:opacity-95 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)",
              boxShadow: "0 4px 12px -2px rgba(30,118,182,0.35)",
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />Agregar usuario
          </button>
          <button
            onClick={toggle}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95"
            style={{
              color: expanded ? "white" : "#0A183A",
              background: expanded ? "linear-gradient(135deg, #348CCB, #1E76B6)" : "transparent",
              border: expanded ? "1px solid transparent" : "1px solid rgba(30,118,182,0.25)",
            }}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Ocultar detalles" : "Ver detalles"}
          </button>
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[rgba(52,140,203,0.1)] space-y-3 animate-in fade-in duration-200">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2.5 rounded-xl"
                   style={{ background: "rgba(10,24,58,0.035)", border: "1px solid rgba(52,140,203,0.1)" }}>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Cliente desde</p>
                <p className="text-xs font-black text-[#0A183A] mt-0.5">{fmtDate(stats?.distributorSince)}</p>
              </div>
              <div className="px-3 py-2.5 rounded-xl"
                   style={{ background: "rgba(10,24,58,0.035)", border: "1px solid rgba(52,140,203,0.1)" }}>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Empresa creada</p>
                <p className="text-xs font-black text-[#0A183A] mt-0.5">{fmtDate(stats?.clientSince)}</p>
              </div>
            </div>

            {/* Users list */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.12)" }}>
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b"
                   style={{ borderColor: "rgba(52,140,203,0.1)", background: "rgba(248,250,255,0.6)" }}>
                <p className="text-[10px] text-[#0A183A] uppercase tracking-widest font-black flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-[#1E76B6]" />
                  Usuarios ({users?.length ?? 0})
                </p>
              </div>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-[11px] text-[#1E76B6] px-3 py-3">
                  <Loader2 className="w-3 h-3 animate-spin" />cargando…
                </div>
              ) : !users || users.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic px-3 py-3">Sin usuarios registrados</p>
              ) : (
                <ul className="divide-y divide-[rgba(52,140,203,0.08)]">
                  {users.map(u => {
                    const initials = u.name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
                    return (
                      <li key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[rgba(240,247,255,0.6)] transition-colors">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                             style={{ background: "linear-gradient(135deg, #173D68, #1E76B6)" }}>
                          {initials || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0A183A] truncate leading-tight">{u.name}</p>
                          <p className="text-[10px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-2.5 h-2.5" />{u.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-[rgba(30,118,182,0.08)] text-[#1E76B6] text-[9px] font-black uppercase tracking-wider">
                            {u.role}
                          </span>
                          {u.lastLoginAt && (
                            <span className="flex items-center gap-0.5 text-[9px] text-gray-500"
                                  title={`Último login · ${new Date(u.lastLoginAt).toLocaleString("es-CO")}`}>
                              <Clock className="w-2.5 h-2.5" />{fmtDate(u.lastLoginAt)}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedStat({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className="relative overflow-hidden px-3 py-3 rounded-xl"
         style={{
           background: `linear-gradient(135deg, ${accent}12, ${accent}05)`,
           border: `1px solid ${accent}22`,
         }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded-md" style={{ background: `${accent}18`, color: accent }}>
          {icon}
        </div>
        <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{label}</p>
      </div>
      <p className="text-lg font-black text-[#0A183A] leading-none tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function CompactStat({ icon, label, value }: {
  icon: React.ReactNode; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg min-w-0"
         style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.08)" }}>
      <span className="text-[#1E76B6] flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-gray-400 leading-none uppercase tracking-widest font-bold truncate">{label}</p>
        <p className="text-[11px] font-black text-[#0A183A] mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function StatBlock({ icon, label, value, sub }: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?:  string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl min-w-0"
         style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.1)" }}>
      {icon && <span className="text-[#1E76B6] flex-shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[9px] text-gray-400 leading-none uppercase tracking-wide truncate">{label}</p>
        <p className="text-xs font-black text-[#0A183A] mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[9px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// Mi Equipo section — per-user inspection metrics for the distribuidor
// =============================================================================

const DATE_RANGE_OPTIONS: { k: DateRangeKey; label: string }[] = [
  { k: "today", label: "Hoy" },
  { k: "7d",    label: "7 días" },
  { k: "30d",   label: "30 días" },
  { k: "90d",   label: "90 días" },
  { k: "all",   label: "Todo" },
];

function EquipoSection({
  equipo, loading, dateRange, onDateRangeChange, search, onSearchChange,
}: {
  equipo: EquipoUser[];
  loading: boolean;
  dateRange: DateRangeKey;
  onDateRangeChange: (r: DateRangeKey) => void;
  search: string;
  onSearchChange: (s: string) => void;
}) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? equipo.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
      : equipo;
    return [...list].sort((a, b) => b.inspections - a.inspections);
  }, [equipo, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar: date range + search */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex gap-1 bg-white rounded-xl p-1 border overflow-x-auto"
             style={{ borderColor: "rgba(52,140,203,0.2)" }}>
          {DATE_RANGE_OPTIONS.map(({ k, label }) => {
            const active = dateRange === k;
            return (
              <button
                key={k}
                onClick={() => onDateRangeChange(k)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap"
                style={{
                  background: active ? "linear-gradient(135deg, #0A183A, #1E76B6)" : "transparent",
                  color:      active ? "white" : "#64748b",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className={`${inputCls} pl-11`}
            style={inputStyle}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-[#1E76B6]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Cargando equipo…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-2xl mb-4" style={{ background: "rgba(30,118,182,0.06)" }}>
            <Users className="w-8 h-8 text-[#1E76B6] opacity-50" />
          </div>
          <p className="text-sm font-black text-[#0A183A] mb-1">
            {search ? "Sin resultados" : "No hay usuarios en tu equipo"}
          </p>
          <p className="text-xs text-gray-400 max-w-xs">
            {search
              ? `No se encontraron usuarios para "${search}"`
              : "Tus usuarios aparecerán aquí con sus métricas de inspecciones"}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y" style={{ borderColor: "rgba(52,140,203,0.08)" }}>
            {filtered.map(u => <EquipoRow key={u.id} user={u} />)}
          </div>
        </Card>
      )}
    </div>
  );
}

function EquipoRow({ user }: { user: EquipoUser }) {
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleDateString("es-CO")
    : "—";
  const lastInsp = user.lastInspection
    ? new Date(user.lastInspection).toLocaleDateString("es-CO")
    : "—";

  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-[rgba(240,247,255,0.6)] transition-colors">
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
      >
        {initials || "?"}
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-black text-[#0A183A] truncate">{user.name}</p>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider flex-shrink-0"
            style={{
              background: user.role === "admin" ? "rgba(30,118,182,0.1)" : "rgba(100,116,139,0.1)",
              color: user.role === "admin" ? "#1E76B6" : "#64748b",
            }}
          >
            {user.role}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
          <Mail className="w-2.5 h-2.5 flex-shrink-0" />
          {user.email}
        </p>
      </div>

      {/* Inspecciones — the headline metric for this tab */}
      <div className="flex-shrink-0 text-right w-20 hidden sm:block">
        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold leading-none">Inspecciones</p>
        <p className="text-lg font-black text-[#173D68] tabular-nums mt-0.5 leading-none">
          {user.inspections.toLocaleString("es-CO")}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 tabular-nums">
          últ. {lastInsp}
        </p>
      </div>

      {/* Login activity */}
      <div className="flex-shrink-0 text-right w-20 hidden md:block">
        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold leading-none">Logins</p>
        <p className="text-sm font-black text-[#0A183A] tabular-nums mt-0.5 leading-none">
          {user.loginCount.toLocaleString("es-CO")}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 tabular-nums flex items-center gap-1 justify-end">
          <Clock className="w-2.5 h-2.5" />
          {lastLogin}
        </p>
      </div>

      {/* Compact mobile-only inline metric */}
      <div className="flex-shrink-0 text-right sm:hidden">
        <p className="text-lg font-black text-[#173D68] tabular-nums leading-none">
          {user.inspections.toLocaleString("es-CO")}
        </p>
        <p className="text-[9px] text-gray-400 mt-0.5">insp.</p>
      </div>
    </div>
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

  // -- Tab state ---------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<TabKey>("clientes");

  // -- Mi Equipo tab ----------------------------------------------------------
  const [equipo,         setEquipo]         = useState<EquipoUser[]>([]);
  const [equipoLoading,  setEquipoLoading]  = useState(false);
  const [dateRange,      setDateRange]      = useState<DateRangeKey>("30d");
  const [equipoSearch,   setEquipoSearch]   = useState("");

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

  // -- Toast helpers ------------------------------------------------------------
  function addToast(message: string, type: "success" | "error") {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }

  // -- Fetch clients ------------------------------------------------------------
  // FIX: Use GET /companies/:companyId which returns _count: { users, tires, vehicles }
  // instead of making two extra fetches per client for vehicles and tires.
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/companies/me/clients`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar los clientes");
      const data = await res.json();

      // Single call: /me/clients now returns rich stats per client
      // (users/active/fin tires, CPK, inversión, inspections by month,
      // yearsAsClient, etc.). No more per-client fetch loop.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: Client[] = data
        .filter((access: any) => access.company?.id)
        .map((access: any) => ({
          id:           access.company.id,
          name:         access.company.name,
          profileImage: access.company.profileImage ?? "",
          plan:         access.company.plan ?? "pro",
          vehicleCount: access.company.stats?.vehicles ?? access.company._count?.vehicles ?? 0,
          tireCount:    access.company.stats?.tires    ?? access.company._count?.tires    ?? 0,
          stats:        access.company.stats ?? undefined,
        }));

      setClients(list);

      // Keep the old per-client detail fetch as a no-op so the diff is small
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

  // -- Fetch Mi Equipo (distribuidor's own users + inspection counts) --------
  const fetchEquipo = useCallback(async (range: DateRangeKey) => {
    const distributorId = getDistributorId();
    if (!distributorId) return;
    setEquipoLoading(true);
    try {
      const { from, to } = dateRangeFromKey(range);
      const qs = new URLSearchParams({ companyId: distributorId });
      if (from) qs.set("from", from);
      if (to)   qs.set("to",   to);
      const res = await fetch(`${API_BASE}/users/inspection-stats?${qs.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar el equipo");
      const data = (await res.json()) as EquipoUser[];
      setEquipo(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error inesperado", "error");
    } finally {
      setEquipoLoading(false);
    }
  }, []);

  // Re-fetch when the Equipo tab opens or the date range changes.
  useEffect(() => {
    if (activeTab === "equipo") fetchEquipo(dateRange);
  }, [activeTab, dateRange, fetchEquipo]);

  // -- Create Company -----------------------------------------------------------
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

  // -- Create User --------------------------------------------------------------
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

  // -- Helpers ------------------------------------------------------------------
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

  const [sortKey, setSortKey] = useState<'name' | 'tires' | 'users' | 'cpk' | 'recent'>('tires');

  // Pagination: render in batches of PAGE_SIZE so a distribuidor with many
  // clients doesn't pay the DOM cost of rendering everything upfront. Search
  // and sort both reset the visible count back to the first page.
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = term
      ? clients.filter(c => c.name.toLowerCase().includes(term))
      : clients.slice();
    list.sort((a, b) => {
      switch (sortKey) {
        case 'name':   return a.name.localeCompare(b.name);
        case 'tires':  return (b.stats?.activeTires ?? b.tireCount) - (a.stats?.activeTires ?? a.tireCount);
        case 'users':  return (b.stats?.users ?? 0) - (a.stats?.users ?? 0);
        case 'cpk':    return (a.stats?.avgCpk ?? Infinity) - (b.stats?.avgCpk ?? Infinity);
        case 'recent':
          return new Date(b.stats?.lastInspection ?? 0).getTime()
               - new Date(a.stats?.lastInspection ?? 0).getTime();
      }
    });
    return list;
  }, [clients, searchTerm, sortKey]);

  // Reset pagination whenever the filtered set changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchTerm, sortKey]);

  const visibleClients = useMemo(
    () => filteredClients.slice(0, visibleCount),
    [filteredClients, visibleCount],
  );
  const hasMore = filteredClients.length > visibleCount;

  // Aggregate across every client — shown on the hero strip
  const totals = useMemo(() => {
    const acc = { tires: 0, vehicles: 0, users: 0, inversion: 0, insp30: 0 };
    for (const c of clients) {
      acc.tires    += c.stats?.activeTires ?? c.tireCount;
      acc.vehicles += c.stats?.vehicles   ?? c.vehicleCount;
      acc.users    += c.stats?.users      ?? 0;
      acc.inversion += c.stats?.inversionTotal ?? 0;
      acc.insp30   += c.stats?.inspections30d  ?? 0;
    }
    return acc;
  }, [clients]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F8FAFF 0%, #FFFFFF 40%)" }}>
      <Toasts toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-5">

        {/* -- Hero banner with aggregate KPIs ------------------------------- */}
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 50%, #1E76B6 100%)",
            boxShadow: "0 20px 48px -12px rgba(10,24,58,0.35)",
          }}
        >
          {/* Decorative glows */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
               style={{ background: "radial-gradient(circle, #348CCB, transparent 70%)" }} />
          <div className="absolute -bottom-32 -left-10 w-80 h-80 rounded-full opacity-10"
               style={{ background: "radial-gradient(circle, #ffffff, transparent 70%)" }} />

          <div className="relative px-6 sm:px-8 py-6 sm:py-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl backdrop-blur-sm"
                     style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-white text-xl sm:text-2xl leading-none tracking-tight">
                    Gestión
                  </h1>
                  <p className="text-xs text-white/60 mt-1.5">
                    {activeTab === "clientes"
                      ? `${clients.length} cliente${clients.length !== 1 ? "s" : ""} vinculado${clients.length !== 1 ? "s" : ""}`
                      : `${equipo.length} usuario${equipo.length !== 1 ? "s" : ""} en tu equipo`}
                  </p>
                </div>
              </div>
              {activeTab === "clientes" && (
                <button
                  onClick={() => { resetAll(); setShowCreateModal(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-[#0A183A] bg-white hover:bg-blue-50 transition-all active:scale-95"
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Cliente
                </button>
              )}
            </div>

            {/* Aggregate KPI pills — Clientes tab shows fleet totals;
                Mi Equipo tab shows team / inspection totals. */}
            {activeTab === "clientes" ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                <HeroKpi icon={<Building2 className="w-3.5 h-3.5" />} label="Clientes"   value={clients.length.toLocaleString("es-CO")} />
                <HeroKpi icon={<Car className="w-3.5 h-3.5" />}       label="Vehículos"  value={totals.vehicles.toLocaleString("es-CO")} />
                <HeroKpi icon={<Activity className="w-3.5 h-3.5" />}  label="Llantas"    value={totals.tires.toLocaleString("es-CO")} />
                <HeroKpi icon={<Users className="w-3.5 h-3.5" />}     label="Usuarios"   value={totals.users.toLocaleString("es-CO")} />
                <HeroKpi icon={<TrendingUp className="w-3.5 h-3.5" />} label="Insp. 30d" value={totals.insp30.toLocaleString("es-CO")} />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <HeroKpi icon={<Users className="w-3.5 h-3.5" />}      label="Miembros"      value={equipo.length.toLocaleString("es-CO")} />
                <HeroKpi icon={<UserCheck className="w-3.5 h-3.5" />}  label="Activos 30d"   value={equipo.filter(u => u.lastLoginAt && (Date.now() - new Date(u.lastLoginAt).getTime()) < 30*86400000).length.toLocaleString("es-CO")} />
                <HeroKpi icon={<Activity className="w-3.5 h-3.5" />}   label="Inspecciones"  value={equipo.reduce((s, u) => s + u.inspections, 0).toLocaleString("es-CO")} />
                <HeroKpi icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Admins"       value={equipo.filter(u => u.role === "admin").length.toLocaleString("es-CO")} />
              </div>
            )}
          </div>
        </div>

        {/* -- Tab switcher ------------------------------------------------- */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border w-fit"
             style={{ borderColor: "rgba(52,140,203,0.2)" }}>
          {([
            { k: "clientes", label: "Clientes" },
            { k: "equipo",   label: "Mi Equipo" },
          ] as const).map(({ k, label }) => {
            const active = activeTab === k;
            return (
              <button
                key={k}
                onClick={() => setActiveTab(k)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: active ? "linear-gradient(135deg, #0A183A, #1E76B6)" : "transparent",
                  color:      active ? "white" : "#64748b",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* -- Clientes tab ------------------------------------------------- */}
        {activeTab === "clientes" && <>

        {/* -- Toolbar: search + sort --------------------------------------- */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar clientes por nombre…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`${inputCls} pl-11`}
              style={inputStyle}
            />
          </div>
          <div className="flex gap-1.5 bg-white rounded-xl px-1.5 py-1.5 border"
               style={{ borderColor: "rgba(52,140,203,0.2)" }}>
            {([
              { k: 'tires',  label: 'Más llantas'   },
              { k: 'users',  label: 'Más usuarios'  },
              { k: 'cpk',    label: 'Mejor CPK'     },
              { k: 'recent', label: 'Recientes'     },
              { k: 'name',   label: 'A-Z'           },
            ] as const).map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap"
                style={{
                  background: sortKey === k ? "linear-gradient(135deg, #0A183A, #1E76B6)" : "transparent",
                  color:      sortKey === k ? "white" : "#64748b",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* -- Grid / states ------------------------------------------------ */}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleClients.map(client => (
                <ClientCard key={client.id} client={client} onAddUser={openAddUser} />
              ))}
            </div>

            {/* Pagination footer — count + load more */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-[11px] font-semibold text-gray-500">
                Mostrando{" "}
                <span className="text-[#0A183A] font-black">{visibleClients.length.toLocaleString("es-CO")}</span>
                {" "}de{" "}
                <span className="text-[#0A183A] font-black">{filteredClients.length.toLocaleString("es-CO")}</span>
                {" "}cliente{filteredClients.length === 1 ? "" : "s"}
              </p>
              {hasMore && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black text-white transition-all hover:opacity-90 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)",
                      boxShadow: "0 4px 12px -2px rgba(30,118,182,0.35)",
                    }}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Cargar {Math.min(PAGE_SIZE, filteredClients.length - visibleCount)} más
                  </button>
                  <button
                    onClick={() => setVisibleCount(filteredClients.length)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold text-[#0A183A] transition-all hover:bg-[rgba(30,118,182,0.06)] active:scale-95"
                    style={{ border: "1px solid rgba(30,118,182,0.25)" }}
                  >
                    Mostrar todos
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        </>}
        {/* -- End Clientes tab -------------------------------------------- */}

        {/* -- Mi Equipo tab ------------------------------------------------ */}
        {activeTab === "equipo" && (
          <EquipoSection
            equipo={equipo}
            loading={equipoLoading}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            search={equipoSearch}
            onSearchChange={setEquipoSearch}
          />
        )}
      </div>

      {/* -- Modal: Create Company + optional user step ------------------- */}
      <Modal
        open={showCreateModal}
        onClose={resetAll}
        title={showUserStep ? "Crear Usuario" : "Nuevo Cliente"}
        subtitle={showUserStep ? "Opcional — para la empresa recién creada" : "Registra una empresa y vincúlala a tu cuenta"}
        icon={showUserStep ? <UserPlus className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
      >
        {!showUserStep ? (
          // -- Step 1: Company ----------------------------------------------
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
          // -- Step 2: User (optional) ---------------------------------------
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

      {/* -- Modal: Add User to Existing Client ---------------------------- */}
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