"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  Send,
  Eye,
  AlertTriangle,
  Truck,
  User,
} from "lucide-react";

// ── API ──────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Driver {
  nombre: string;
  telefono: string;
  isPrimary: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical";
  seen: boolean;
  actionType: string | null;
  actionPayload: Record<string, any> | null;
  actionLabel: string | null;
  executed: boolean;
  executedAt: string | null;
  executedBy: string | null;
  sentToDriver: boolean;
  sentToDriverAt: string | null;
  driverConfirmed: boolean;
  driverConfirmedAt: string | null;
  groupKey: string | null;
  priority: number;
  createdAt: string;
  tire: { placa: string; marca: string; posicion: number; alertLevel: string } | null;
  vehicle: { placa: string; drivers: Driver[] } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "#ef4444", label: "Critica" },
  warning:  { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "#f97316", label: "Urgente" },
  info:     { color: "#eab308", bg: "rgba(234,179,8,0.08)",  border: "#eab308", label: "Atencion" },
};

function sev(type: string) {
  return SEVERITY[type] ?? SEVERITY.info;
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function worstType(notifs: Notification[]): string {
  if (notifs.some((n) => n.type === "critical")) return "critical";
  if (notifs.some((n) => n.type === "warning")) return "warning";
  return "info";
}

// ── Vehicle group ────────────────────────────────────────────────────────────

function VehicleGroup({
  vehiclePlaca,
  drivers,
  notifications,
  onExecute,
  onSendToDriver,
  onMarkSeen,
  sendCounts,
}: {
  vehiclePlaca: string;
  drivers: Driver[];
  notifications: Notification[];
  onExecute: (id: string) => void;
  onSendToDriver: (id: string) => void;
  onMarkSeen: (id: string) => void;
  sendCounts: Record<string, number>;
}) {
  const [open, setOpen] = useState(true);
  const worst = worstType(notifications);
  const s = sev(worst);
  const pending = notifications.filter((n) => !n.executed).length;

  return (
    <div className="mb-5">
      {/* Group header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
        style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}
      >
        <Truck className="w-4 h-4 text-[#348CCB] flex-shrink-0" />
        <span className="font-mono font-black text-white text-sm tracking-wider flex-shrink-0">
          {vehiclePlaca.toUpperCase()}
        </span>

        {drivers.length > 0 && (
          <div className="flex items-center gap-1 ml-1">
            <User className="w-3 h-3 text-[#348CCB]/60" />
            <span className="text-[10px] text-[#348CCB]/80 truncate max-w-[120px]">
              {drivers.map((d) => d.nombre).join(", ")}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: s.bg, color: s.color }}
          >
            {s.label}
          </span>
          <span className="text-[10px] font-bold text-white/50">
            {pending} pendiente{pending !== 1 ? "s" : ""}
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white/40" />
          )}
        </div>
      </button>

      {/* Notification cards */}
      {open && (
        <div className="mt-2 space-y-2 pl-2">
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              hasDrivers={drivers.length > 0}
              onExecute={onExecute}
              onSendToDriver={onSendToDriver}
              onMarkSeen={onMarkSeen}
              sendCounts={sendCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notification card ────────────────────────────────────────────────────────

function NotificationCard({
  notification: n,
  hasDrivers,
  onExecute,
  onSendToDriver,
  onMarkSeen,
  sendCounts,
}: {
  notification: Notification;
  hasDrivers: boolean;
  onExecute: (id: string) => void;
  onSendToDriver: (id: string) => void;
  onMarkSeen: (id: string) => void;
  sendCounts: Record<string, number>;
}) {
  const [confirmExecute, setConfirmExecute] = useState(false);
  const s = sev(n.type);

  return (
    <div
      className="bg-white rounded-xl border-l-4 p-4 shadow-sm"
      style={{ borderLeftColor: s.border, opacity: n.executed ? 0.6 : 1 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0A183A]">{n.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
        </div>
        {n.tire && (
          <span className="text-[10px] font-mono font-bold text-[#348CCB] bg-[#348CCB]/8 px-2 py-0.5 rounded-md flex-shrink-0">
            {n.tire.placa}
          </span>
        )}
      </div>

      {/* Projection warning — tire may have worsened since inspection */}
      {n.tire && !n.executed && (() => {
        const tireAlert = n.tire.alertLevel;
        const nType = n.type;
        const alertRank: Record<string, number> = { info: 0, warning: 1, critical: 2 };
        const tireRank: Record<string, number> = { ok: 0, watch: 0, warning: 1, critical: 2 };
        if (tireRank[tireAlert] > alertRank[nType]) {
          return (
            <div className="mt-2 px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
              style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              Esta llanta puede haber empeorado desde la ultima inspeccion
            </div>
          );
        }
        return null;
      })()}

      {/* Action label */}
      {n.actionLabel && !n.executed && (
        <div
          className="mt-2 px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(30,118,182,0.06)", color: "#1E76B6" }}
        >
          {n.actionLabel}
        </div>
      )}

      {/* Status badges */}
      {(n.executed || n.sentToDriver || n.driverConfirmed) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {n.driverConfirmed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
              <Check className="w-3 h-3" />
              Confirmado por conductor {n.driverConfirmedAt && `- ${fmtDate(n.driverConfirmedAt)}`}
            </span>
          )}
          {n.sentToDriver && !n.driverConfirmed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1E76B6]">
              <Send className="w-3 h-3" />
              Enviado a conductor {n.sentToDriverAt && `- ${fmtDate(n.sentToDriverAt)}`}
            </span>
          )}
          {n.executed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
              <Check className="w-3 h-3" />
              Ejecutado {n.executedBy && `por ${n.executedBy}`} {n.executedAt && `- ${fmtDate(n.executedAt)}`}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!n.executed && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Execute */}
          {!confirmExecute ? (
            <button
              onClick={() => setConfirmExecute(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: "#22c55e" }}
            >
              <Check className="w-3 h-3" />
              Ejecutar
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { onExecute(n.id); setConfirmExecute(false); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmExecute(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Send / Resend to driver */}
          {hasDrivers && (() => {
            const count = sendCounts[n.id] ?? (n.sentToDriver ? 1 : 0);
            const canSend = count < 3 && !n.driverConfirmed;
            if (!canSend) return null;
            return (
              <button
                onClick={() => onSendToDriver(n.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                style={{ background: n.sentToDriver ? "rgba(249,115,22,0.08)" : "rgba(30,118,182,0.08)", color: n.sentToDriver ? "#f97316" : "#1E76B6", border: n.sentToDriver ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(30,118,182,0.2)" }}
              >
                <Send className="w-3 h-3" />
                {n.sentToDriver ? `Reenviar (${count}/3)` : "Enviar a Conductor"}
              </button>
            );
          })()}

          {/* Mark seen */}
          {!n.seen && (
            <button
              onClick={() => onMarkSeen(n.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Eye className="w-3 h-3" />
              Marcar visto
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificacionesTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/notifications/actionable?companyId=${cId}`);
      if (res.ok) setNotifications(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      const user = JSON.parse(stored);
      if (!user.companyId) return;
      setCompanyId(user.companyId);
      setUserId(user.id ?? "admin");
      fetchData(user.companyId);
    } catch { /* */ }
  }, [fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleExecute = useCallback(async (id: string) => {
    try {
      await authFetch(`${API_BASE}/notifications/${id}/execute`, {
        method: "PATCH",
        body: JSON.stringify({ executedBy: userId }),
      });
      fetchData(companyId);
    } catch { /* */ }
  }, [userId, companyId, fetchData]);

  // Track send counts per notification (max 3)
  const [sendCounts, setSendCounts] = useState<Record<string, number>>({});

  const handleSendToDriver = useCallback(async (id: string) => {
    const current = sendCounts[id] ?? (notifications.find((n) => n.id === id)?.sentToDriver ? 1 : 0);
    if (current >= 3) return;
    try {
      await authFetch(`${API_BASE}/notifications/${id}/send-to-driver`, { method: "PATCH" });
      setSendCounts((prev) => ({ ...prev, [id]: (prev[id] ?? (notifications.find((n) => n.id === id)?.sentToDriver ? 1 : 0)) + 1 }));
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, sentToDriver: true, sentToDriverAt: new Date().toISOString() } : n),
      );
    } catch { /* */ }
  }, [sendCounts, notifications]);

  const handleMarkSeen = useCallback(async (id: string) => {
    try {
      await authFetch(`${API_BASE}/notifications/seen/${id}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, seen: true } : n));
    } catch { /* */ }
  }, []);

  // ── Summary counts ───────────────────────────────────────────────────────

  const counts = useMemo(() => {
    let critical = 0, warning = 0, info = 0, executedToday = 0;
    const today = new Date().toDateString();
    notifications.forEach((n) => {
      if (!n.executed) {
        if (n.type === "critical") critical++;
        else if (n.type === "warning") warning++;
        else info++;
      }
      if (n.executed && n.executedAt && new Date(n.executedAt).toDateString() === today) {
        executedToday++;
      }
    });
    return { critical, warning, info, executedToday };
  }, [notifications]);

  // ── Group by vehicle ─────────────────────────────────────────────────────

  const groups = useMemo(() => {
    const map = new Map<string, { placa: string; drivers: Driver[]; notifs: Notification[] }>();

    notifications.forEach((n) => {
      const key = n.groupKey ?? n.vehicle?.placa ?? "sin-vehiculo";
      if (!map.has(key)) {
        map.set(key, {
          placa: n.vehicle?.placa ?? "Sin vehiculo",
          drivers: n.vehicle?.drivers ?? [],
          notifs: [],
        });
      }
      map.get(key)!.notifs.push(n);
    });

    // Sort groups: most critical first
    return Array.from(map.values()).sort((a, b) => {
      const aW = worstType(a.notifs) === "critical" ? 2 : worstType(a.notifs) === "warning" ? 1 : 0;
      const bW = worstType(b.notifs) === "critical" ? 2 : worstType(b.notifs) === "warning" ? 1 : 0;
      return bW - aW;
    });
  }, [notifications]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#1E76B6]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const pending = notifications.filter((n) => !n.executed);

  if (pending.length === 0 && counts.executedToday === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Check className="w-10 h-10 mb-3 text-green-400" />
        <p className="text-sm font-bold text-[#0A183A]">Todo en orden</p>
        <p className="text-xs text-gray-400 mt-1">No hay acciones pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Criticas", count: counts.critical, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
          { label: "Urgentes", count: counts.warning, color: "#f97316", bg: "rgba(249,115,22,0.08)" },
          { label: "Atencion", count: counts.info, color: "#eab308", bg: "rgba(234,179,8,0.08)" },
          { label: "Completadas hoy", count: counts.executedToday, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
        ].map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: b.bg }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />
            <span className="text-[10px] font-bold" style={{ color: b.color }}>{b.label}</span>
            <span className="text-sm font-black ml-auto" style={{ color: b.color }}>{b.count}</span>
          </div>
        ))}
      </div>

      {/* Vehicle groups */}
      {groups.map((g) => (
        <VehicleGroup
          key={g.placa}
          vehiclePlaca={g.placa}
          drivers={g.drivers}
          notifications={g.notifs}
          onExecute={handleExecute}
          onSendToDriver={handleSendToDriver}
          onMarkSeen={handleMarkSeen}
          sendCounts={sendCounts}
        />
      ))}
    </div>
  );
}
