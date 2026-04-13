"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  Send,
  Eye,
  Truck,
  User,
} from "lucide-react";

// -- API ----------------------------------------------------------------------

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

// -- Types --------------------------------------------------------------------

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
  tire: { placa: string; marca: string; posicion: number; alertLevel: string; currentProfundidad: number | null; inspecciones?: { profundidadInt: number; profundidadCen: number; profundidadExt: number }[] } | null;
  vehicle: { placa: string; drivers: Driver[] } | null;
}

// -- Helpers ------------------------------------------------------------------

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

// -- Vehicle group ------------------------------------------------------------

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
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Vehicle header */}
      <div className="bg-[#173D68] px-4 py-2.5 flex items-center gap-2">
        <Truck className="w-3.5 h-3.5 text-[#348CCB]" />
        <span className="font-mono font-bold text-white text-xs tracking-wider">
          {vehiclePlaca.toUpperCase()}
        </span>
        {drivers.length > 0 && (
          <span className="text-[10px] text-white/40 truncate max-w-[140px]">
            {drivers.map((d) => d.nombre).join(", ")}
          </span>
        )}
        <span className="text-[10px] text-white/40 ml-auto">
          {notifications.filter((n) => !n.executed).length} pendiente{notifications.filter((n) => !n.executed).length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Notification rows */}
      <div className="divide-y divide-gray-50">
        {notifications.map((n) => (
          <NotificationRow
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
    </div>
  );
}

// -- Notification row ---------------------------------------------------------

function NotificationRow({
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
  const [expanded, setExpanded] = useState(false);
  const s = sev(n.type);

  return (
    <div style={{ opacity: n.executed ? 0.5 : 1 }}>
      {/* Compact row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Severity dot */}
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} title={s.label} />

        {/* Tire info */}
        {n.tire && (
          <span className="text-[10px] font-mono font-bold text-[#348CCB] flex-shrink-0">
            P{n.tire.posicion}
          </span>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#0A183A] truncate">{n.title}</p>
        </div>

        {/* Status */}
        {n.executed ? (
          <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5 flex-shrink-0">
            <Check className="w-3 h-3" /> Hecho
          </span>
        ) : n.driverConfirmed ? (
          <span className="text-[10px] font-bold text-cyan-500 flex-shrink-0">Confirmado</span>
        ) : n.sentToDriver ? (
          <span className="text-[10px] font-bold text-cyan-400 flex-shrink-0">Enviado</span>
        ) : null}

        {/* Severity badge */}
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>

        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 ml-5 space-y-2">
          {/* Message */}
          <p className="text-[11px] text-gray-500 leading-relaxed">{n.message}</p>

          {/* Action label */}
          {n.actionLabel && !n.executed && (
            <div className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(30,118,182,0.06)", color: "#1E76B6" }}>
              {n.actionLabel}
            </div>
          )}

          {/* Status badges */}
          {(n.executed || n.sentToDriver || n.driverConfirmed) && (
            <div className="flex flex-wrap gap-1.5">
              {n.driverConfirmed && (
                <span className="text-[10px] font-bold text-cyan-500">
                  Confirmado por conductor {n.driverConfirmedAt && `· ${fmtDate(n.driverConfirmedAt)}`}
                </span>
              )}
              {n.sentToDriver && !n.driverConfirmed && (
                <span className="text-[10px] font-bold text-cyan-400">
                  Enviado por WhatsApp {n.sentToDriverAt && `· ${fmtDate(n.sentToDriverAt)}`}
                </span>
              )}
              {n.executed && (
                <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" />
                  Ejecutado {n.executedBy && `por ${n.executedBy}`} {n.executedAt && `· ${fmtDate(n.executedAt)}`}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!n.executed && (
            <div className="flex flex-wrap gap-2 pt-1">
              {!confirmExecute ? (
                <button onClick={(e) => { e.stopPropagation(); setConfirmExecute(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-colors">
                  <Check className="w-3 h-3" /> Ejecutar
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); onExecute(n.id); setConfirmExecute(false); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors">
                    Confirmar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmExecute(false); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                    Cancelar
                  </button>
                </div>
              )}

              {hasDrivers && (() => {
                const count = sendCounts[n.id] ?? (n.sentToDriver ? 1 : 0);
                if (count >= 3 || n.driverConfirmed) return null;
                return (
                  <button onClick={(e) => { e.stopPropagation(); onSendToDriver(n.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                    style={{ background: n.sentToDriver ? "rgba(249,115,22,0.08)" : "rgba(30,118,182,0.08)", color: n.sentToDriver ? "#f97316" : "#1E76B6" }}>
                    <Send className="w-3 h-3" />
                    {n.sentToDriver ? `Reenviar (${count}/3)` : "Enviar a Conductor"}
                  </button>
                );
              })()}

              {!n.seen && (
                <button onClick={(e) => { e.stopPropagation(); onMarkSeen(n.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Eye className="w-3 h-3" /> Visto
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- Page ---------------------------------------------------------------------

export default function NotificacionesTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");

  // -- Load -----------------------------------------------------------------

  const fetchData = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/notifications/actionable?companyId=${cId}`);
      if (res.ok) {
        const all: Notification[] = await res.json();
        // Only show agent-generated notifications (those with an actionType)
        setNotifications(all.filter((n) => n.actionType));
      }
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

  // -- Actions --------------------------------------------------------------

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

  // -- Summary counts -------------------------------------------------------

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

  // -- Group by vehicle -----------------------------------------------------

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

  // -- Render ---------------------------------------------------------------

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

  const sentCount = notifications.filter((n) => n.sentToDriver).length;
  const confirmedCount = notifications.filter((n) => n.driverConfirmed).length;
  const pendingDriverCount = sentCount - confirmedCount;

  const notReadyToSend = pending.filter((n) => !n.sentToDriver && n.vehicle?.drivers && n.vehicle.drivers.length > 0);

  async function notifyAllDrivers() {
    if (notReadyToSend.length === 0) {
      window.alert("No hay alertas pendientes con conductores asignados.");
      return;
    }
    const ok = window.confirm(
      `Se enviarán ${notReadyToSend.length} alertas por WhatsApp a los conductores asignados. ¿Continuar?`,
    );
    if (!ok) return;
    for (const n of notReadyToSend) {
      // sequential to avoid throttling
      try { await handleSendToDriver(n.id); } catch { /* */ }
    }
  }
  // --------------------------------------------------------------------------

  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filteredGroups = useMemo(() => {
    if (severityFilter === "all") return groups;
    if (severityFilter === "executed") {
      return groups.map((g) => ({ ...g, notifs: g.notifs.filter((n) => n.executed) })).filter((g) => g.notifs.length > 0);
    }
    return groups.map((g) => ({ ...g, notifs: g.notifs.filter((n) => !n.executed && n.type === severityFilter) })).filter((g) => g.notifs.length > 0);
  }, [groups, severityFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
        <div className="bg-[#173D68] text-white p-4 rounded-t-xl">
          <p className="text-sm font-bold leading-tight">Alertas y Notificaciones</p>
          <p className="text-[10px] text-white/50">{pending.length} pendientes · {sentCount} enviadas · {confirmedCount} confirmadas</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setSeverityFilter("all")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: severityFilter === "all" ? "rgba(10,24,58,0.08)" : "transparent", color: "#0A183A", border: "1px solid rgba(0,0,0,0.08)" }}>
          Todos ({pending.length})
        </button>
        <button onClick={() => setSeverityFilter("critical")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: severityFilter === "critical" ? "rgba(239,68,68,0.1)" : "transparent", color: severityFilter === "critical" ? "#ef4444" : "#64748b", border: `1px solid ${severityFilter === "critical" ? "rgba(239,68,68,0.3)" : "rgba(0,0,0,0.08)"}` }}>
          Criticas ({counts.critical})
        </button>
        <button onClick={() => setSeverityFilter("warning")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: severityFilter === "warning" ? "rgba(249,115,22,0.1)" : "transparent", color: severityFilter === "warning" ? "#f97316" : "#64748b", border: `1px solid ${severityFilter === "warning" ? "rgba(249,115,22,0.3)" : "rgba(0,0,0,0.08)"}` }}>
          Urgentes ({counts.warning})
        </button>
        <button onClick={() => setSeverityFilter("info")}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: severityFilter === "info" ? "rgba(234,179,8,0.1)" : "transparent", color: severityFilter === "info" ? "#eab308" : "#64748b", border: `1px solid ${severityFilter === "info" ? "rgba(234,179,8,0.3)" : "rgba(0,0,0,0.08)"}` }}>
          Atencion ({counts.info})
        </button>
        {counts.executedToday > 0 && (
          <button onClick={() => setSeverityFilter("executed")}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
            style={{ background: severityFilter === "executed" ? "rgba(34,197,94,0.1)" : "transparent", color: severityFilter === "executed" ? "#22c55e" : "#64748b", border: `1px solid ${severityFilter === "executed" ? "rgba(34,197,94,0.3)" : "rgba(0,0,0,0.08)"}` }}>
            Completadas ({counts.executedToday})
          </button>
        )}

        {/* Notify all button */}
        {notReadyToSend.length > 0 && (
          <button onClick={notifyAllDrivers}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-90 text-white"
            style={{ background: "#1E76B6" }}>
            <Send className="w-3 h-3" />
            Notificar a {notReadyToSend.length} conductores
          </button>
        )}
      </div>

      {/* Vehicle groups */}
      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <Check className="w-8 h-8 mb-2 text-green-400" />
          <p className="text-sm font-bold text-[#0A183A]">Sin alertas en esta categoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((g) => (
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
      )}
    </div>
  );
}
