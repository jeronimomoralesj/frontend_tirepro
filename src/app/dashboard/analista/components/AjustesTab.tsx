"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Zap, User, ClipboardList, Bot, Hand } from "lucide-react";

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

interface AgentSettings {
  agentEnabled: boolean;
  alertMode: "agent_auto" | "notify_person" | "display_only";
  alertRecipientName?: string;
  alertRecipientPhone?: string;
  purchaseMode: "agent_auto" | "manual";
  monthlyBudgetCap?: number;
}

const DEFAULT_SETTINGS: AgentSettings = {
  agentEnabled: false,
  alertMode: "display_only",
  purchaseMode: "manual",
};

// ── Radio card ───────────────────────────────────────────────────────────────

function RadioCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-xl p-4 transition-all"
      style={{
        border: selected ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.15)",
        background: selected ? "rgba(30,118,182,0.04)" : "white",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Radio dot */}
        <div
          className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            border: selected ? "2px solid #1E76B6" : "2px solid #cbd5e1",
            background: selected ? "#1E76B6" : "transparent",
          }}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${selected ? "text-[#1E76B6]" : "text-gray-400"}`} />
            <span className="text-sm font-bold" style={{ color: selected ? "#0A183A" : "#334155" }}>
              {title}
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
          {selected && children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </button>
  );
}

// ── Input helper ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

// ── Component ────────────────────────────────────────────────────────────────

export default function AjustesTab() {
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [companyId, setCompanyId] = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      const user = JSON.parse(stored);
      if (!user.companyId) return;
      setCompanyId(user.companyId);

      authFetch(`${API_BASE}/companies/${user.companyId}/agent-settings`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.agentSettings) {
            setSettings({ ...DEFAULT_SETTINGS, ...data.agentSettings });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const res = await authFetch(
        `${API_BASE}/companies/${companyId}/agent-settings`,
        { method: "PATCH", body: JSON.stringify(settings) },
      );
      if (!res.ok) throw new Error();
      setToast("Ajustes guardados");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setToast("Error al guardar");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  }, [companyId, settings]);

  // ── Update helper ────────────────────────────────────────────────────────

  function set<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const disabled = !settings.agentEnabled;

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#1E76B6]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-0">
      {/* ── 1. Master switch ──────────────────────────────────────────── */}
      <div className="py-6 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{
                background: settings.agentEnabled
                  ? "linear-gradient(135deg, #1E76B6, #173D68)"
                  : "rgba(100,116,139,0.1)",
              }}
            >
              <Zap
                className="w-5 h-5"
                style={{ color: settings.agentEnabled ? "white" : "#94a3b8" }}
              />
            </div>
            <div>
              <p className="text-sm font-black text-[#0A183A]">Agente TirePro</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Activa el agente inteligente para automatizar alertas y decisiones
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            type="button"
            onClick={() => set("agentEnabled", !settings.agentEnabled)}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors"
            style={{
              background: settings.agentEnabled ? "#1E76B6" : "#cbd5e1",
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform"
              style={{
                transform: settings.agentEnabled ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </button>
        </div>
      </div>

      {/* ── 2. Alert mode ─────────────────────────────────────────────── */}
      <div className="py-6 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-wider text-[#348CCB] mb-1">
          Modo de alertas
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Como se notifican los problemas detectados en las llantas
        </p>

        <div className="space-y-2.5">
          <RadioCard
            selected={settings.alertMode === "agent_auto"}
            onClick={() => set("alertMode", "agent_auto")}
            disabled={disabled}
            icon={Bot}
            title="Automatico"
            description="El agente envia mensajes automaticos a los conductores del vehiculo con instrucciones precisas."
          />

          <RadioCard
            selected={settings.alertMode === "notify_person"}
            onClick={() => set("alertMode", "notify_person")}
            disabled={disabled}
            icon={User}
            title="Notificar a persona"
            description="Las alertas se envian a una persona designada."
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                  Nombre
                </label>
                <input
                  type="text"
                  value={settings.alertRecipientName ?? ""}
                  onChange={(e) => set("alertRecipientName", e.target.value)}
                  placeholder="Nombre del responsable"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                  Telefono
                </label>
                <input
                  type="text"
                  value={settings.alertRecipientPhone ?? ""}
                  onChange={(e) => set("alertRecipientPhone", e.target.value)}
                  placeholder="+57 300 123 4567"
                  className={inputCls}
                />
              </div>
            </div>
          </RadioCard>

          <RadioCard
            selected={settings.alertMode === "display_only"}
            onClick={() => set("alertMode", "display_only")}
            disabled={disabled}
            icon={ClipboardList}
            title="Solo en TirePro"
            description="Las alertas solo aparecen en la pestana de Notificaciones."
          />
        </div>
      </div>

      {/* ── 3. Purchase mode ──────────────────────────────────────────── */}
      <div className="py-6 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-wider text-[#348CCB] mb-1">
          Modo de compras
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Como se gestionan las necesidades de reemplazo de llantas
        </p>

        <div className="space-y-2.5">
          <RadioCard
            selected={settings.purchaseMode === "agent_auto"}
            onClick={() => set("purchaseMode", "agent_auto")}
            disabled={disabled}
            icon={Bot}
            title="Automatico"
            description="Cuando una llanta necesita cambio, el agente envia propuestas al distribuidor vinculado."
          >
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                Presupuesto mensual maximo (COP)
              </label>
              <input
                type="number"
                value={settings.monthlyBudgetCap ?? ""}
                onChange={(e) =>
                  set(
                    "monthlyBudgetCap",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                placeholder="Ej: 5000000"
                min={0}
                className={inputCls}
              />
            </div>
          </RadioCard>

          <RadioCard
            selected={settings.purchaseMode === "manual"}
            onClick={() => set("purchaseMode", "manual")}
            disabled={disabled}
            icon={Hand}
            title="Manual"
            description="Las recomendaciones aparecen en Pedidos. Tu decides cuando enviar."
          />
        </div>
      </div>

      {/* ── Save button ───────────────────────────────────────────────── */}
      <div className="py-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Guardar ajustes
        </button>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-sm transition-all"
          style={{
            background: toast.includes("Error")
              ? "#ef4444"
              : "linear-gradient(135deg, #1E76B6, #173D68)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
