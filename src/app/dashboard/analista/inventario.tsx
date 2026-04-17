"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Package, Truck, ChevronDown, ChevronRight, RotateCcw,
  AlertTriangle, CheckCircle2, X, Loader2, Search,
  Calendar, ArrowRight, Info, Check, Minus, Plus,
  Pencil, Trash2, Send, FolderOpen, Layers,
} from "lucide-react";

// =============================================================================
// Constants & auth
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): Record<string, string> {
  let token: string | null = null;
  try { token = localStorage.getItem("token"); } catch { /**/ }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function bustUrl(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_t=${Date.now()}`;
}

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(bustUrl(url), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

const BUCKET_COLORS = [
  "#1E76B6","#173D68","#0A183A","#348CCB",
  "#E67E22","#27AE60","#8E44AD","#C0392B","#16A085","#D35400",
];
const BUCKET_ICONS = ["📦","🔧","🔄","⚠️","🏭","🛠️","🚛","⏳","✅","🔩"];

// =============================================================================
// Types
// =============================================================================

interface Inspeccion {
  profundidadInt?: number;
  profundidadCen?: number;
  profundidadExt?: number;
  cpk?: number;
  fecha?: string;
}

interface InventoryTire {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension?: string;
  eje?: string;
  kilometrosRecorridos?: number;
  vidaActual?: string;
  alertLevel?: string;
  currentProfundidad?: number;
  inventoryBucketId:  string | null;
  lastVehicleId:      string | null;
  lastVehiclePlaca:   string | null;
  lastPosicion:       number | null;
  inventoryEnteredAt: string | null;
  inspecciones?:      Inspeccion[];
  costos?:            Array<{ valor: number; fecha: string }>;
}

interface InventoryBucket {
  id:             string;
  nombre:         string;
  color:          string;
  icono:          string;
  excluirDeFlota: boolean;
  orden:          number;
  tireCount:      number;
}

interface CurrentVehicleTire {
  id:       string;
  posicion: number;
  marca?:   string;
}

type ConflictStatus = "ok" | "occupied" | "no_vehicle";

interface ResolvedReturn {
  tire:          InventoryTire;
  status:        ConflictStatus;
  vehicleId?:    string;
  vehiclePlaca?: string;
  posicion?:     number;
  blockedBy?:    string;
  blockerTireId?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getMinDepth(tire: InventoryTire): number | null {
  const insps = tire.inspecciones ?? [];
  if (!insps.length) return null;
  const last = insps[insps.length - 1];
  const vals = [last.profundidadInt, last.profundidadCen, last.profundidadExt]
    .filter((v): v is number => v != null);
  return vals.length ? Math.min(...vals) : null;
}

function depthColor(mm: number | null): string {
  if (mm === null) return "#348CCB";
  if (mm <= 2) return "#e53e3e";
  if (mm <= 4) return "#E67E22";
  if (mm <= 6) return "#d4a017";
  return "#27AE60";
}

function alertBadge(level?: string) {
  switch (level) {
    case "critical": return { bg: "rgba(229,62,62,0.12)",  text: "#e53e3e", label: "Crítico" };
    case "warning":  return { bg: "rgba(230,126,34,0.12)", text: "#E67E22", label: "Precaución" };
    case "watch":    return { bg: "rgba(212,160,23,0.12)", text: "#d4a017", label: "Vigilar" };
    default:         return { bg: "rgba(39,174,96,0.12)",  text: "#27AE60", label: "OK" };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function groupByDate(tires: InventoryTire[]): Array<{ label: string; tires: InventoryTire[] }> {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const map   = new Map<string, InventoryTire[]>();

  const sorted = [...tires].sort((a, b) => {
    const da = a.inventoryEnteredAt ? new Date(a.inventoryEnteredAt).getTime() : 0;
    const db = b.inventoryEnteredAt ? new Date(b.inventoryEnteredAt).getTime() : 0;
    return db - da;
  });

  sorted.forEach((t) => {
    const entered = t.inventoryEnteredAt ? new Date(t.inventoryEnteredAt) : null;
    let key: string;
    if (!entered) {
      key = "Sin fecha de ingreso";
    } else {
      const d    = new Date(entered.getFullYear(), entered.getMonth(), entered.getDate()).getTime();
      const diff = Math.round((today - d) / 86_400_000);
      if (diff === 0)      key = "Hoy";
      else if (diff === 1) key = "Ayer";
      else if (diff <= 7)  key = `Hace ${diff} días`;
      else if (diff <= 30) key = "Esta semana – mes";
      else {
        key = entered.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
        key = key.charAt(0).toUpperCase() + key.slice(1);
      }
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  });

  return Array.from(map.entries()).map(([label, tires]) => ({ label, tires }));
}

// =============================================================================
// API
// =============================================================================

async function fetchInventoryData(companyId: string) {
  const [tiresRes, bucketsRes] = await Promise.all([
    fetch(`${API_BASE}/tires?companyId=${companyId}&slim=true`, { headers: authHeaders(), cache: 'no-store' }),
    fetch(`${API_BASE}/inventory-buckets?companyId=${companyId}`, { headers: authHeaders(), cache: 'no-store' }),
  ]);
  const allTires: any[] = tiresRes.ok ? await tiresRes.json() : [];
  const filtered: InventoryTire[] = allTires.filter(
    (t: any) => !t.vehicleId && t.vidaActual !== "fin"
  );
  const bucketsData = bucketsRes.ok
    ? await bucketsRes.json()
    : { buckets: [], disponible: 0 };
  return {
    tires:   filtered,
    buckets: (bucketsData.buckets ?? []) as InventoryBucket[],
  };
}

async function fetchVehicleTires(vehicleId: string): Promise<CurrentVehicleTire[]> {
  const res = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicleId}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const tires: any[] = await res.json();
  return tires
    .filter((t) => t.posicion && Number(t.posicion) > 0)
    .map((t) => ({ id: t.id, posicion: Number(t.posicion), marca: t.marca }));
}

// =============================================================================
// Tire card
// =============================================================================

function TireCard({
  tire, selected, onToggle,
}: {
  tire: InventoryTire; selected: boolean; onToggle: (id: string) => void;
}) {
  const depth = getMinDepth(tire);
  const dc    = depthColor(depth);
  const badge = alertBadge((tire as any).projectedAlertLevel ?? tire.alertLevel);
  const cost  = tire.costos?.at(-1)?.valor ?? null;

  return (
    <div
      onClick={() => onToggle(tire.id)}
      className="relative rounded-2xl p-4 cursor-pointer select-none transition-all duration-150"
      style={{
        background: selected ? "rgba(30,118,182,0.05)" : "white",
        border: selected ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.16)",
        boxShadow: selected
          ? "0 4px 20px rgba(30,118,182,0.15)"
          : "0 2px 12px rgba(10,24,58,0.04)",
        transform: selected ? "translateY(-2px)" : "none",
      }}
    >
      {/* Checkbox */}
      <div
        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all"
        style={{
          background: selected ? "#1E76B6" : "rgba(52,140,203,0.08)",
          border: selected ? "none" : "1.5px solid rgba(52,140,203,0.3)",
        }}
      >
        {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </div>

      <p
        className="font-black text-[#0A183A] text-sm leading-tight pr-7 mb-0.5"
        style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}
      >
        {tire.placa.toUpperCase()}
      </p>
      <p className="text-[10px] text-[#348CCB] truncate mb-3">
        {tire.marca} · {tire.diseno}
      </p>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-col items-center min-w-[2rem]">
          <span className="text-base font-black leading-none" style={{ color: dc, fontFamily: "'DM Mono', monospace" }}>
            {depth != null ? depth : "—"}
          </span>
          <span className="text-[8px] font-bold uppercase" style={{ color: dc }}>mm</span>
        </div>
        <div className="flex-1 space-y-1">
          <span
            className="inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#348CCB]/50 uppercase">Vida:</span>
            <span className="text-[9px] font-bold text-[#173D68] capitalize">
              {tire.vidaActual ?? "nueva"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl px-2.5 py-2 flex items-center gap-2"
        style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.08)" }}
      >
        <Truck className="w-3 h-3 text-[#348CCB] flex-shrink-0" />
        {tire.lastVehiclePlaca ? (
          <span
            className="text-[10px] font-black text-[#0A183A] tracking-widest truncate"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {tire.lastVehiclePlaca.toUpperCase()}
            <span className="text-[#348CCB] font-normal ml-1">pos.{tire.lastPosicion ?? "?"}</span>
          </span>
        ) : (
          <span className="text-[10px] text-[#348CCB]/40 italic">Sin vehículo</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        {cost ? (
          <span className="text-[9px] text-[#348CCB]/60">${cost.toLocaleString()}</span>
        ) : <span />}
        {tire.inventoryEnteredAt && (
          <div className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5 text-[#348CCB]/30" />
            <span className="text-[9px] text-[#348CCB]/40">{formatDate(tire.inventoryEnteredAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Date group
// =============================================================================

function DateGroup({
  label, tires, selectedIds, onToggle,
}: {
  label: string; tires: InventoryTire[];
  selectedIds: Set<string>; onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const allSel  = tires.every((t) => selectedIds.has(t.id));
  const someSel = tires.some((t) => selectedIds.has(t.id));

  function toggleAll(e: React.MouseEvent) {
    e.stopPropagation();
    if (allSel) tires.forEach((t) => selectedIds.has(t.id) && onToggle(t.id));
    else tires.forEach((t) => !selectedIds.has(t.id) && onToggle(t.id));
  }

  return (
    <div className="mb-5">
      <div
        className="flex items-center gap-2 mb-3 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#1E76B6]" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#348CCB]">{label}</span>
        <span className="text-[10px] text-[#348CCB]/40">({tires.length})</span>
        <div className="flex-1 h-px bg-[#348CCB]/10" />
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:opacity-70"
          style={{
            color: someSel ? "#1E76B6" : "#348CCB",
            background: someSel ? "rgba(30,118,182,0.08)" : "transparent",
          }}
        >
          {allSel ? <Minus className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
          {allSel ? "Quitar" : "Todos"}
        </button>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-[#348CCB]/60" />
          : <ChevronRight className="w-3.5 h-3.5 text-[#348CCB]/60" />}
      </div>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tires.map((t) => (
            <TireCard
              key={t.id}
              tire={t}
              selected={selectedIds.has(t.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Bucket create/edit modal
// =============================================================================

function BucketModal({
  initial, companyId, onSave, onClose,
}: {
  initial?: InventoryBucket | null;
  companyId: string;
  onSave: (b: InventoryBucket) => void;
  onClose: () => void;
}) {
  const [nombre,  setNombre]  = useState(initial?.nombre ?? "");
  const [color,   setColor]   = useState(initial?.color  ?? BUCKET_COLORS[0]);
  const [icono,   setIcono]   = useState(initial?.icono  ?? BUCKET_ICONS[0]);
  const [excluir, setExcluir] = useState(initial?.excluirDeFlota ?? false);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  async function save() {
    if (!nombre.trim()) { setErr("El nombre es obligatorio"); return; }
    setSaving(true); setErr("");
    try {
      const url    = initial
        ? `${API_BASE}/inventory-buckets/${initial.id}?companyId=${companyId}`
        : `${API_BASE}/inventory-buckets`;
      const method = initial ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method, headers: authHeaders(),
        body: JSON.stringify({
          companyId, nombre: nombre.trim(), color, icono, excluirDeFlota: excluir,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.message ?? "Error al guardar");
      }
      onSave(await res.json());
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
      >
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)" }}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">
              {initial ? "Editar grupo" : "Nuevo grupo"}
            </span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {err && (
            <p className="text-xs font-semibold text-red-500 px-3 py-2 rounded-xl bg-red-50">{err}</p>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#173D68] block mb-1.5">
              Nombre del grupo
            </label>
            <input
              ref={inputRef}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Ej: En Reencauche, Reparación…"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/25 transition-all"
              style={{ border: "1px solid rgba(52,140,203,0.25)" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#173D68] block mb-1.5">Ícono</label>
            <div className="flex flex-wrap gap-2">
              {BUCKET_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcono(ic)}
                  className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                  style={{
                    background: icono === ic ? "rgba(30,118,182,0.12)" : "rgba(52,140,203,0.05)",
                    border: icono === ic ? "2px solid #1E76B6" : "2px solid transparent",
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#173D68] block mb-1.5">Color</label>
            <div className="flex flex-wrap gap-2">
              {BUCKET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setExcluir(!excluir)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
            style={{
              background: excluir ? "rgba(30,118,182,0.06)" : "rgba(52,140,203,0.03)",
              border: excluir ? "1px solid rgba(30,118,182,0.25)" : "1px solid rgba(52,140,203,0.12)",
            }}
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: excluir ? "#1E76B6" : "transparent", border: excluir ? "none" : "1.5px solid #348CCB" }}
            >
              {excluir && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </div>
            <div>
              <p className="font-bold text-[#0A183A] text-xs">Excluir de analytics de flota</p>
              <p className="text-[10px] text-[#348CCB]/60 mt-0.5">Las llantas aquí no afectarán CPK ni salud promedio</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#348CCB]/60 font-medium">Vista previa:</span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white"
              style={{ background: color }}
            >
              {icono} {nombre || "Nombre"}
            </span>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] transition-colors hover:bg-[#F0F7FF]"
              style={{ border: "1px solid rgba(52,140,203,0.25)" }}
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || !nombre.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Delete bucket confirmation
// =============================================================================

function DeleteBucketModal({
  bucket, onConfirm, onCancel,
}: {
  bucket: InventoryBucket; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-red-50">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-black text-[#0A183A] text-sm">
              Eliminar {bucket.icono} {bucket.nombre}
            </p>
            <p className="text-[10px] text-[#348CCB]/60 mt-0.5">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-[#173D68] mb-5">
          Las <strong>{bucket.tireCount}</strong> llantas serán movidas a <strong>Disponible</strong>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] transition-colors hover:bg-[#F0F7FF]"
            style={{ border: "1px solid rgba(52,140,203,0.25)" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #e53e3e, #c53030)" }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Conflict resolution modal
// =============================================================================

// =============================================================================
// Assign-to-vehicle modal
// =============================================================================

interface VehicleOption { id: string; placa: string }

type BlockerAction = "disponible" | "fin" | string; // string = bucketId

interface AssignRow {
  tire: InventoryTire;
  vehiclePlaca: string;
  vehicleId: string | null;
  posicion: number;
  conflict: { blockerTireId: string; blockerMarca: string } | null;
  blockerAction: BlockerAction;
  blockerBucketId: string;
}

function AssignVehicleModal({
  tires: selectedTires,
  buckets,
  companyId,
  onConfirm,
  onCancel,
  loading,
}: {
  tires: InventoryTire[];
  buckets: InventoryBucket[];
  companyId: string;
  onConfirm: (rows: AssignRow[]) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [rows, setRows] = useState<AssignRow[]>(() =>
    selectedTires.map((t) => ({
      tire: t,
      vehiclePlaca: t.lastVehiclePlaca ?? "",
      vehicleId: t.lastVehicleId ?? null,
      posicion: t.lastPosicion ?? 1,
      conflict: null,
      blockerAction: "disponible" as BlockerAction,
      blockerBucketId: "",
    }))
  );

  const [vehicleSearch, setVehicleSearch] = useState<Record<number, string>>({});
  const [vehicleResults, setVehicleResults] = useState<Record<number, VehicleOption[]>>({});
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null);

  // Search for vehicle by placa
  async function searchVehicle(idx: number, placa: string) {
    setSearchingIdx(idx);
    try {
      const res = await authFetch(`${API_BASE}/vehicles?companyId=${companyId}`);
      if (!res.ok) return;
      const vehicles: any[] = await res.json();
      const q = placa.toLowerCase();
      const matches = vehicles
        .filter((v: any) => v.placa.toLowerCase().includes(q))
        .slice(0, 8)
        .map((v: any) => ({ id: v.id, placa: v.placa }));
      setVehicleResults((p) => ({ ...p, [idx]: matches }));
    } catch { /* */ }
    finally { setSearchingIdx(null); }
  }

  function updateRow(idx: number, patch: Partial<AssignRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setChecked(false); // reset validation when user changes
  }

  function selectVehicle(idx: number, v: VehicleOption) {
    updateRow(idx, { vehicleId: v.id, vehiclePlaca: v.placa });
    setVehicleResults((p) => ({ ...p, [idx]: [] }));
    setVehicleSearch((p) => ({ ...p, [idx]: "" }));
  }

  // Check all positions for conflicts
  async function checkConflicts() {
    setChecking(true);
    try {
      const vehicleIds = [...new Set(rows.filter((r) => r.vehicleId).map((r) => r.vehicleId!))];
      const occupiedMap = new Map<string, CurrentVehicleTire[]>();
      await Promise.all(
        vehicleIds.map(async (vid) => {
          const occupied = await fetchVehicleTires(vid);
          occupiedMap.set(vid, occupied);
        })
      );

      setRows((prev) =>
        prev.map((r) => {
          if (!r.vehicleId) return { ...r, conflict: null };
          const occupied = occupiedMap.get(r.vehicleId) ?? [];
          const blocker = occupied.find((ot) => ot.posicion === r.posicion);
          if (blocker) {
            return {
              ...r,
              conflict: { blockerTireId: blocker.id, blockerMarca: blocker.marca ?? "Otra llanta" },
              blockerAction: "disponible",
              blockerBucketId: "",
            };
          }
          return { ...r, conflict: null };
        })
      );
      setChecked(true);
    } catch { /* */ }
    finally { setChecking(false); }
  }

  const allValid = rows.every((r) => r.vehicleId && r.posicion > 0);
  const hasConflicts = rows.some((r) => r.conflict);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.65)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)" }}>
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-black text-white text-sm uppercase tracking-widest">Asignar a Vehículo</h3>
              <p className="text-white/55 text-xs mt-0.5">
                {selectedTires.length} llanta{selectedTires.length !== 1 ? "s" : ""} — elige vehículo y posición
              </p>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {rows.map((row, idx) => (
            <div key={row.tire.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
              {/* Tire info */}
              <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: "rgba(10,24,58,0.03)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[#0A183A]" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {row.tire.placa.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-[#348CCB]">{row.tire.marca} · {row.tire.diseno}</p>
                </div>
                {row.tire.lastVehiclePlaca && (
                  <span className="text-[9px] text-gray-400">
                    Último: {row.tire.lastVehiclePlaca} P{row.tire.lastPosicion ?? "?"}
                  </span>
                )}
              </div>

              <div className="px-4 py-3 space-y-2.5">
                {/* Vehicle selector */}
                <div className="relative">
                  <label className="text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1 block">Vehículo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vehicleSearch[idx] ?? row.vehiclePlaca}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setVehicleSearch((p) => ({ ...p, [idx]: val }));
                        if (val.length >= 2) searchVehicle(idx, val);
                        else setVehicleResults((p) => ({ ...p, [idx]: [] }));
                      }}
                      onFocus={() => { if (row.vehiclePlaca) setVehicleSearch((p) => ({ ...p, [idx]: row.vehiclePlaca })); }}
                      placeholder="Buscar placa..."
                      className="flex-1 px-3 py-2 border border-[#348CCB]/30 rounded-lg text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6]"
                      style={{ textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}
                    />
                    {searchingIdx === idx && <Loader2 className="w-4 h-4 animate-spin text-[#348CCB] self-center" />}
                  </div>
                  {/* Dropdown results */}
                  {(vehicleResults[idx] ?? []).length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-32 overflow-y-auto">
                      {vehicleResults[idx].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => selectVehicle(idx, v)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#F0F7FF] flex items-center gap-2"
                        >
                          <Truck className="w-3 h-3 text-[#348CCB]" />
                          <span className="font-bold text-[#0A183A]" style={{ fontFamily: "'DM Mono', monospace" }}>{v.placa}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Position */}
                <div>
                  <label className="text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1 block">Posición</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={row.posicion}
                    onChange={(e) => updateRow(idx, { posicion: Math.max(1, Number(e.target.value)) })}
                    className="w-20 px-3 py-2 border border-[#348CCB]/30 rounded-lg text-sm text-center font-bold text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6]"
                  />
                </div>

                {/* Conflict display */}
                {checked && row.conflict && (
                  <div className="rounded-lg p-3" style={{ background: "rgba(230,126,34,0.06)", border: "1px solid rgba(230,126,34,0.2)" }}>
                    <p className="text-[10px] font-bold flex items-center gap-1.5 mb-2" style={{ color: "#E67E22" }}>
                      <AlertTriangle className="w-3 h-3" />
                      P{row.posicion} ocupada por {row.conflict.blockerMarca}
                    </p>
                    <p className="text-[10px] text-gray-500 mb-2">¿Qué hacer con la llanta que está en esa posición?</p>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`blocker-${row.tire.id}`}
                          checked={row.blockerAction === "disponible"}
                          onChange={() => updateRow(idx, { blockerAction: "disponible", blockerBucketId: "" })}
                          className="accent-[#1E76B6]"
                        />
                        <span className="text-[10px] font-medium text-[#0A183A]">Mover a Disponible (inventario general)</span>
                      </label>
                      {buckets.map((b) => (
                        <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`blocker-${row.tire.id}`}
                            checked={row.blockerAction === b.id}
                            onChange={() => updateRow(idx, { blockerAction: b.id, blockerBucketId: b.id })}
                            className="accent-[#1E76B6]"
                          />
                          <span className="text-[10px] font-medium text-[#0A183A]">{b.icono} Mover a {b.nombre}</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`blocker-${row.tire.id}`}
                          checked={row.blockerAction === "fin"}
                          onChange={() => updateRow(idx, { blockerAction: "fin", blockerBucketId: "" })}
                          className="accent-[#ef4444]"
                        />
                        <span className="text-[10px] font-medium text-[#ef4444]">Marcar como Fin de Vida</span>
                      </label>
                    </div>
                  </div>
                )}

                {checked && !row.conflict && row.vehicleId && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#27AE60]">
                    <CheckCircle2 className="w-3 h-3" /> P{row.posicion} disponible
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] transition-colors hover:bg-[#F0F7FF] disabled:opacity-50"
            style={{ border: "1px solid rgba(52,140,203,0.25)" }}
          >
            Cancelar
          </button>
          {!checked ? (
            <button
              onClick={checkConflicts}
              disabled={!allValid || checking}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verificar Posiciones
            </button>
          ) : (
            <button
              onClick={() => onConfirm(rows)}
              disabled={loading || !allValid}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #27AE60, #1E76B6)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar Asignación
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConflictModal({
  resolved, onConfirm, onCancel, loading,
}: {
  resolved:  ResolvedReturn[];
  onConfirm: (list: Array<ResolvedReturn & { _decision: "return" | "disponible" }>) => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  const [overrides, setOverrides] = useState<Record<string, "return" | "disponible">>({});

  const ok        = resolved.filter((r) => r.status === "ok");
  const occupied  = resolved.filter((r) => r.status === "occupied");
  const noVehicle = resolved.filter((r) => r.status === "no_vehicle");

  function decide(r: ResolvedReturn): "return" | "disponible" {
    if (r.status === "ok")         return "return";
    if (r.status === "no_vehicle") return "disponible";
    return overrides[r.tire.id] ?? "disponible";
  }

  const returnCount     = resolved.filter((r) => decide(r) === "return").length;
  const disponibleCount = resolved.filter((r) => decide(r) === "disponible").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.65)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
      >
        <div
          className="px-6 py-5 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)" }}
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-black text-white text-sm uppercase tracking-widest">Confirmar Retorno</h3>
              <p className="text-white/55 text-xs mt-0.5">
                {resolved.length} llanta{resolved.length !== 1 ? "s" : ""} seleccionada{resolved.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div
          className="px-6 py-3 flex gap-2 flex-wrap flex-shrink-0"
          style={{ background: "rgba(10,24,58,0.02)", borderBottom: "1px solid rgba(52,140,203,0.08)" }}
        >
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(39,174,96,0.1)", color: "#27AE60" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> {returnCount} al vehículo
          </span>
          {disponibleCount > 0 && (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(52,140,203,0.1)", color: "#1E76B6" }}
            >
              <Package className="w-3.5 h-3.5" /> {disponibleCount} a Disponible
            </span>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* OK */}
          {ok.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#27AE60] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Sin conflicto ({ok.length})
              </p>
              <div className="space-y-1.5">
                {ok.map((r) => (
                  <div
                    key={r.tire.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(39,174,96,0.05)", border: "1px solid rgba(39,174,96,0.18)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#0A183A]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {r.tire.placa.toUpperCase()}
                      </p>
                      <p className="text-[10px] text-[#348CCB]">{r.tire.marca} · {r.tire.diseno}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#27AE60]">
                      <Truck className="w-3 h-3" />
                      <span style={{ fontFamily: "'DM Mono', monospace" }}>{r.vehiclePlaca?.toUpperCase()}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>P{r.posicion}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflicts */}
          {occupied.length > 0 && (
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: "#E67E22" }}
              >
                <AlertTriangle className="w-3 h-3" /> Posición ocupada — elige ({occupied.length})
              </p>
              <div className="space-y-2">
                {occupied.map((r) => {
                  const dec = overrides[r.tire.id] ?? "disponible";
                  return (
                    <div
                      key={r.tire.id}
                      className="rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(230,126,34,0.22)" }}
                    >
                      <div className="px-3 py-2.5" style={{ background: "rgba(230,126,34,0.04)" }}>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <p className="text-xs font-black text-[#0A183A]" style={{ fontFamily: "'DM Mono', monospace" }}>
                              {r.tire.placa.toUpperCase()}
                            </p>
                            <p className="text-[10px] text-[#348CCB]">{r.tire.marca} · {r.tire.diseno}</p>
                          </div>
                          <div className="text-right text-[10px]">
                            <p className="font-bold" style={{ color: "#E67E22" }}>
                              {r.vehiclePlaca?.toUpperCase()} · P{r.posicion}
                            </p>
                            <p className="text-[#348CCB]/50">Ocup. por: {r.blockedBy}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setOverrides((p) => ({ ...p, [r.tire.id]: "disponible" }))}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                            style={{
                              background: dec === "disponible" ? "rgba(30,118,182,0.1)" : "rgba(52,140,203,0.04)",
                              border: dec === "disponible" ? "1.5px solid #1E76B6" : "1.5px solid transparent",
                              color: "#1E76B6",
                            }}
                          >
                            → A Disponible
                          </button>
                          <button
                            onClick={() => setOverrides((p) => ({ ...p, [r.tire.id]: "return" }))}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                            style={{
                              background: dec === "return" ? "rgba(230,126,34,0.1)" : "rgba(230,126,34,0.03)",
                              border: dec === "return" ? "1.5px solid #E67E22" : "1.5px solid transparent",
                              color: "#E67E22",
                            }}
                          >
                            → Forzar P{r.posicion}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No vehicle */}
          {noVehicle.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#348CCB] mb-2 flex items-center gap-1.5">
                <Info className="w-3 h-3" /> Sin vehículo → Disponible ({noVehicle.length})
              </p>
              <div className="space-y-1.5">
                {noVehicle.map((r) => (
                  <div
                    key={r.tire.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(52,140,203,0.04)", border: "1px solid rgba(52,140,203,0.12)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#0A183A]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {r.tire.placa.toUpperCase()}
                      </p>
                      <p className="text-[10px] text-[#348CCB]">{r.tire.marca} · {r.tire.diseno}</p>
                    </div>
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{ background: "rgba(52,140,203,0.1)", color: "#1E76B6" }}
                    >
                      <Package className="w-3 h-3" /> Disponible
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="px-6 py-4 flex gap-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}
        >
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] transition-colors hover:bg-[#F0F7FF] disabled:opacity-50"
            style={{ border: "1px solid rgba(52,140,203,0.25)" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(resolved.map((r) => ({ ...r, _decision: decide(r) })))}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Bucket section
// =============================================================================

function BucketSection({
  bucket, tires, selectedIds, onToggle, onEdit, onDelete, onReturnAll,
}: {
  bucket:      InventoryBucket | null;
  tires:       InventoryTire[];
  selectedIds: Set<string>;
  onToggle:    (id: string) => void;
  onEdit?:     (b: InventoryBucket) => void;
  onDelete?:   (b: InventoryBucket) => void;
  onReturnAll: (tires: InventoryTire[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const dateGroups     = useMemo(() => groupByDate(tires), [tires]);
  const color          = bucket?.color  ?? "#1E76B6";
  const icono          = bucket?.icono  ?? "✅";
  const nombre         = bucket?.nombre ?? "Disponible";
  const withVehicle    = tires.filter((t) => !!t.lastVehiclePlaca).length;

  if (tires.length === 0 && bucket === null) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.16)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        style={{ borderBottom: open ? "1px solid rgba(52,140,203,0.08)" : "none" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xl leading-none">{icono}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black uppercase tracking-widest" style={{ color }}>
              {nombre}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: color }}
            >
              {tires.length}
            </span>
            {bucket?.excluirDeFlota && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(52,140,203,0.08)", color: "#348CCB" }}
              >
                Sin analytics
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#348CCB]/50 mt-0.5">
            {withVehicle} con vehículo registrado
          </p>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {tires.length > 0 && (
            <button
              onClick={() => onReturnAll(tires)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
              style={{ background: `${color}18`, color }}
              title="Retornar todas al vehículo"
            >
              <Send className="w-3 h-3" /> Retornar todo
            </button>
          )}
          {bucket && onEdit && (
            <button
              onClick={() => onEdit(bucket)}
              className="p-1.5 rounded-lg transition-colors hover:bg-[#F0F7FF]"
            >
              <Pencil className="w-3.5 h-3.5 text-[#348CCB]" />
            </button>
          )}
          {bucket && onDelete && (
            <button
              onClick={() => onDelete(bucket)}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>

        {open
          ? <ChevronDown className="w-4 h-4 text-[#348CCB]/60 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-[#348CCB]/60 flex-shrink-0" />}
      </div>

      {open && (
        <div className="px-5 py-5">
          {tires.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <FolderOpen className="w-8 h-8 text-[#348CCB]/20" />
              <p className="text-sm text-[#348CCB]/35 font-medium">Sin llantas en este grupo</p>
            </div>
          ) : (
            dateGroups.map((g) => (
              <DateGroup
                key={g.label}
                label={g.label}
                tires={g.tires}
                selectedIds={selectedIds}
                onToggle={onToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Selection bar
// =============================================================================

function SelectionBar({
  count, withVehicle, onReturn, onAssign, onMoveBucket, onFinVida, onClear, returning, buckets,
}: {
  count: number; withVehicle: number;
  onReturn: () => void; onAssign: () => void;
  onMoveBucket: (bucketId: string) => void; onFinVida: () => void;
  onClear: () => void;
  returning: boolean;
  buckets: InventoryBucket[];
}) {
  const [showBucketMenu, setShowBucketMenu] = useState(false);
  const [showFinConfirm, setShowFinConfirm] = useState(false);

  if (count === 0) return null;
  return (
    <>
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3.5 rounded-2xl shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
        border:     "1px solid rgba(255,255,255,0.12)",
        boxShadow:  "0 16px 48px rgba(10,24,58,0.4)",
        minWidth:   "min(92vw, 580px)",
        maxWidth:   "min(95vw, 680px)",
      }}
    >
      {/* Top row: count + close */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-lg bg-white/12 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">{count}</span>
          </div>
          <div>
            <p className="text-white font-bold text-xs leading-none">
              {count} llanta{count !== 1 ? "s" : ""} seleccionada{count !== 1 ? "s" : ""}
            </p>
            <p className="text-white/40 text-[9px] mt-0.5">
              {withVehicle} con vehículo registrado
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Assign to vehicle */}
        <button
          onClick={onAssign}
          disabled={returning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          <Truck className="w-3 h-3" />
          Asignar a Vehículo
        </button>

        {/* Return to last vehicle */}
        {withVehicle > 0 && (
          <button
            onClick={onReturn}
            disabled={returning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: "white", color: "#0A183A" }}
          >
            {returning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Retornar al Vehículo
          </button>
        )}

        {/* Move to bucket */}
        <div className="relative">
          <button
            onClick={() => setShowBucketMenu((v) => !v)}
            disabled={returning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Layers className="w-3 h-3" />
            Mover a Grupo
          </button>
          {showBucketMenu && (
            <div
              className="absolute bottom-full mb-2 left-0 w-48 rounded-xl overflow-hidden shadow-2xl"
              style={{ background: "#0A183A", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <div className="py-1">
                <button
                  onClick={() => { onMoveBucket(""); setShowBucketMenu(false); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold text-white/70 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span>✅</span> Disponible
                </button>
                {buckets.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { onMoveBucket(b.id); setShowBucketMenu(false); }}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold text-white/70 hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <span>{b.icono}</span> {b.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fin de vida */}
        <button
          onClick={() => setShowFinConfirm(true)}
          disabled={returning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <Trash2 className="w-3 h-3" />
          Fin de Vida
        </button>
      </div>
    </div>

    {/* Fin de vida confirmation */}
    {showFinConfirm && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(10,24,58,0.65)", backdropFilter: "blur(8px)" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #991b1b, #ef4444)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-white" />
              <h3 className="font-black text-white text-sm">Confirmar Fin de Vida</h3>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-700">
              ¿Marcar <strong>{count} llanta{count !== 1 ? "s" : ""}</strong> como fin de vida?
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Esta accion cambia la vida a "fin" y las retira del inventario activo.
            </p>
          </div>
          <div className="px-5 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              onClick={() => setShowFinConfirm(false)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ border: "1px solid rgba(0,0,0,0.08)" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { setShowFinConfirm(false); onFinVida(); }}
              className="flex-1 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
              style={{ background: "#ef4444" }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function InventarioPage() {
  const [tires,         setTires]         = useState<InventoryTire[]>([]);
  const [buckets,       setBuckets]       = useState<InventoryBucket[]>([]);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState("");
  const [search,        setSearch]        = useState("");
  const [companyId,     setCompanyId]     = useState("");
  const [conflictModal, setConflictModal] = useState<ResolvedReturn[] | null>(null);
  const [returning,     setReturning]     = useState(false);
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [editingBucket,   setEditingBucket]   = useState<InventoryBucket | null>(null);
  const [deletingBucket,  setDeletingBucket]  = useState<InventoryBucket | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning,       setAssigning]       = useState(false);
const [buildingResolved, setBuildingResolved] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (user?.companyId) { setCompanyId(user.companyId); load(user.companyId); }
    } catch { setLoading(false); }
  }, []);

  async function load(cid: string) {
    setLoading(true);
    try {
      const { tires: t, buckets: b } = await fetchInventoryData(cid);
      setTires(t); setBuckets(b);
    } catch { setError("Error al cargar el inventario"); }
    finally { setLoading(false); }
  }

  const toggleTire = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectedTires = useMemo(() => tires.filter((t) => selectedIds.has(t.id)), [tires, selectedIds]);
  const withVehicle   = selectedTires.filter((t) => !!t.lastVehiclePlaca).length;

  const filteredTires = useMemo(() => {
    if (!search.trim()) return tires;
    const q = search.toLowerCase();
    return tires.filter(
      (t) =>
        t.placa.toLowerCase().includes(q) ||
        t.marca.toLowerCase().includes(q) ||
        t.diseno.toLowerCase().includes(q) ||
        (t.lastVehiclePlaca ?? "").toLowerCase().includes(q),
    );
  }, [tires, search]);

  const tiresPerBucket = useMemo(() => {
    const map = new Map<string | null, InventoryTire[]>();
    map.set(null, []);
    buckets.forEach((b) => map.set(b.id, []));
    filteredTires.forEach((t) => {
      const key = t.inventoryBucketId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [filteredTires, buckets]);

  // -- Return flow -------------------------------------------------------------

  async function buildResolved(targetTires: InventoryTire[]): Promise<ResolvedReturn[]> {
    const byVehicle = new Map<string, InventoryTire[]>();
    const noVehicle: InventoryTire[] = [];

    targetTires.forEach((t) => {
      if (!t.lastVehicleId) { noVehicle.push(t); return; }
      if (!byVehicle.has(t.lastVehicleId)) byVehicle.set(t.lastVehicleId, []);
      byVehicle.get(t.lastVehicleId)!.push(t);
    });

    const resolved: ResolvedReturn[] = [];

    for (const [vehicleId, vTires] of byVehicle.entries()) {
      let occupied: CurrentVehicleTire[] = [];
        try { 
            occupied = await fetchVehicleTires(vehicleId); 
            } catch (e: any) { 
            throw new Error(`No se pudo verificar el vehículo: ${e.message}`);
        }
      const occupiedPos    = new Set(occupied.map((ot) => ot.posicion));
      const occupiedByTire = new Map(occupied.map((ot) => [ot.posicion, ot]));

      vTires.forEach((t) => {
        const pos = t.lastPosicion ?? 0;
        if (!pos) {
          resolved.push({ tire: t, status: "no_vehicle" });
        } else if (occupiedPos.has(pos)) {
          const blocker = occupiedByTire.get(pos);
          resolved.push({
            tire: t, status: "occupied", vehicleId,
            vehiclePlaca: t.lastVehiclePlaca ?? "",
            posicion: pos,
            blockedBy: blocker?.marca ?? "otra llanta",
            blockerTireId: blocker?.id,
          });
        } else {
          resolved.push({
            tire: t, status: "ok", vehicleId,
            vehiclePlaca: t.lastVehiclePlaca ?? "", posicion: pos,
          });
        }
      });
    }

    noVehicle.forEach((t) => resolved.push({ tire: t, status: "no_vehicle" }));
    return resolved;
  }

  async function handleInitiateReturn(targetTires?: InventoryTire[]) {
  const list = targetTires ?? selectedTires;
  if (!list.length) return;
  setBuildingResolved(true);
  try {
    const resolved = await buildResolved(list);
    setConflictModal(resolved);
  } catch (e: any) {
    setError(e.message ?? "Error al preparar el retorno");
  } finally {
    setBuildingResolved(false);
  }
}

  async function handleConfirmReturn(
  finalList: Array<ResolvedReturn & { _decision: "return" | "disponible" }>,
) {
  setReturning(true);
  try {
    const returns: Array<{ tireId: string; vehicleId: string; posicion: number }> = [];
    const fallbackTireIds: string[] = [];

    finalList.forEach((r) => {
      if (r._decision === "return" && r.vehicleId && r.posicion)
        returns.push({ tireId: r.tire.id, vehicleId: r.vehicleId, posicion: r.posicion });
      else
        fallbackTireIds.push(r.tire.id);
    });

    // -- DEBUG --------------------------------------------------------------
    console.log("📋 finalList decisions:", finalList.map(r => ({
      tireId: r.tire.id,
      placa: r.tire.placa,
      decision: r._decision,
      status: r.status,
      vehicleId: r.vehicleId,
      posicion: r.posicion,
      lastVehicleId: r.tire.lastVehicleId,
      lastPosicion: r.tire.lastPosicion,
    })));
    console.log("✅ returns array:", returns);
    console.log("📦 fallbackTireIds:", fallbackTireIds);
    console.log("🏢 companyId:", companyId);
    // -- END DEBUG ----------------------------------------------------------

    const forcedReturns = finalList.filter(
      (r) => r._decision === "return" && r.status === "occupied"
    );
    if (forcedReturns.length > 0) {
      const blockerIds = forcedReturns
        .map((r) => r.blockerTireId)
        .filter((id): id is string => !!id);
      if (blockerIds.length > 0) {
        await fetch(`${API_BASE}/tires/unassign-vehicle`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ tireIds: blockerIds }),
        });
      }
    }

    const res = await fetch(`${API_BASE}/inventory-buckets/batch-return`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ returns, fallbackTireIds, companyId }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("🔁 batch-return response:", res.status, data);

    if (!res.ok) throw new Error(data?.message ?? "Error al retornar");

setSuccess(
  `${data.returned} llanta${data.returned !== 1 ? "s" : ""} retornada${data.returned !== 1 ? "s" : ""} al vehículo` +
  (data.movedToDisponible > 0 ? `, ${data.movedToDisponible} a Disponible` : ""),
);

// All processed tires are fully removed from inventory view.
// - "return" tires are back on their vehicle → no longer in inventory
// - "disponible" tires: backend clears their bucket but they stay off-vehicle,
//   so we reload fresh data to reflect their updated state accurately
const allProcessedIds = new Set(finalList.map(r => r.tire.id));

setTires((prev) => prev.filter((t) => !allProcessedIds.has(t.id)));
setSelectedIds(new Set());
setConflictModal(null);
await load(companyId); 
  } catch (e: any) {
    setError(e.message ?? "Error inesperado");
  } finally {
    setReturning(false);
  }
}

  // -- Assign to vehicle flow ---------------------------------------------------

  async function handleConfirmAssign(rows: AssignRow[]) {
    setAssigning(true);
    try {
      // 1. Handle blocker tires first
      for (const row of rows) {
        if (!row.conflict) continue;
        const blockerId = row.conflict.blockerTireId;

        if (row.blockerAction === "fin") {
          // Mark blocker as fin de vida
          await authFetch(`${API_BASE}/tires/${blockerId}/vida`, {
            method: "POST",
            body: JSON.stringify({ vida: "fin" }),
          });
        } else {
          // Unassign blocker from vehicle first
          await fetch(`${API_BASE}/tires/unassign-vehicle`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ tireIds: [blockerId] }),
          });
          // If moving to a specific bucket
          if (row.blockerAction !== "disponible") {
            await authFetch(`${API_BASE}/inventory-buckets/move`, {
              method: "POST",
              body: JSON.stringify({ tireIds: [blockerId], bucketId: row.blockerAction, companyId }),
            });
          }
        }
      }

      // 2. Assign selected tires to their vehicles via batch-return
      const returns = rows
        .filter((r) => r.vehicleId && r.posicion > 0)
        .map((r) => ({ tireId: r.tire.id, vehicleId: r.vehicleId!, posicion: r.posicion }));

      if (returns.length > 0) {
        const res = await fetch(`${API_BASE}/inventory-buckets/batch-return`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ returns, fallbackTireIds: [], companyId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message ?? "Error al asignar");
        setSuccess(`${data.returned ?? returns.length} llanta${returns.length !== 1 ? "s" : ""} asignada${returns.length !== 1 ? "s" : ""} a vehículo`);
      }

      setSelectedIds(new Set());
      setShowAssignModal(false);
      await load(companyId);
    } catch (e: any) {
      setError(e.message ?? "Error al asignar");
    } finally {
      setAssigning(false);
    }
  }

  // -- Move to bucket ----------------------------------------------------------

  async function handleMoveBucket(bucketId: string) {
    if (selectedIds.size === 0) return;
    setReturning(true);
    try {
      const tireIds = [...selectedIds];
      if (bucketId) {
        // Move to specific bucket
        await authFetch(`${API_BASE}/inventory-buckets/bulk-move`, {
          method: "POST",
          body: JSON.stringify({ tireIds, bucketId, companyId }),
        });
      } else {
        // Move to Disponible (null bucket)
        await authFetch(`${API_BASE}/inventory-buckets/bulk-move`, {
          method: "POST",
          body: JSON.stringify({ tireIds, bucketId: null, companyId }),
        });
      }
      const bucketName = bucketId ? buckets.find((b) => b.id === bucketId)?.nombre ?? "grupo" : "Disponible";
      setSuccess(`${tireIds.length} llanta${tireIds.length !== 1 ? "s" : ""} movida${tireIds.length !== 1 ? "s" : ""} a ${bucketName}`);
      setSelectedIds(new Set());
      await load(companyId);
    } catch (e: any) {
      setError(e.message ?? "Error al mover llantas");
    } finally {
      setReturning(false);
    }
  }

  // -- Fin de vida -------------------------------------------------------------

  async function handleFinVida() {
    if (selectedIds.size === 0) return;
    setReturning(true);
    try {
      const tireIds = [...selectedIds];
      await Promise.all(
        tireIds.map((id) =>
          authFetch(`${API_BASE}/tires/${id}/vida`, {
            method: "POST",
            body: JSON.stringify({ vida: "fin" }),
          })
        )
      );
      setSuccess(`${tireIds.length} llanta${tireIds.length !== 1 ? "s" : ""} marcada${tireIds.length !== 1 ? "s" : ""} como fin de vida`);
      setSelectedIds(new Set());
      await load(companyId);
    } catch (e: any) {
      setError(e.message ?? "Error al marcar fin de vida");
    } finally {
      setReturning(false);
    }
  }

  // -- Bucket CRUD -------------------------------------------------------------

  function handleBucketSaved(saved: InventoryBucket) {
    setBuckets((prev) => {
      const exists = prev.find((b) => b.id === saved.id);
      return exists
        ? prev.map((b) => (b.id === saved.id ? { ...b, ...saved } : b))
        : [...prev, { ...saved, tireCount: 0 }];
    });
    setShowBucketModal(false);
    setEditingBucket(null);
  }

  async function handleDeleteBucket(bucket: InventoryBucket) {
    try {
      await fetch(`${API_BASE}/inventory-buckets/${bucket.id}?companyId=${companyId}`, {
        method: "DELETE", headers: authHeaders(),
      });
      setBuckets((prev) => prev.filter((b) => b.id !== bucket.id));
      setTires((prev) =>
        prev.map((t) => t.inventoryBucketId === bucket.id ? { ...t, inventoryBucketId: null } : t),
      );
      setSuccess(`Grupo "${bucket.nombre}" eliminado`);
    } catch { setError("Error al eliminar el grupo"); }
    finally { setDeletingBucket(null); }
  }

  const totalInInventory = tires.length;
  const totalWithVehicle = tires.filter((t) => !!t.lastVehiclePlaca).length;
  const disponibleTires  = tiresPerBucket.get(null) ?? [];

  return (
    <div className="min-h-screen pb-32" style={{ background: "#f7f9fc" }}>

      {/* Top bar */}
      <div
        className="sticky top-0 z-40 px-6 py-4"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(52,140,203,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-[#0A183A] text-lg leading-none" style={{ letterSpacing: "-0.02em" }}>
                Inventarios
              </h1>
              <p className="text-xs text-[#348CCB] mt-0.5">Llantas fuera de vehículo · organizadas por grupo</p>
            </div>
          </div>

          <div className="flex gap-5 ml-auto">
            {[["Total", totalInInventory], ["Con vehículo", totalWithVehicle], ["Grupos", buckets.length]].map(([l, v]) => (
              <div key={l as string} className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#348CCB]">{l}</p>
                <p className="text-xl font-black text-[#0A183A]">{v}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setEditingBucket(null); setShowBucketModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
          >
            <Plus className="w-4 h-4" /> Nuevo grupo
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-6xl mx-auto space-y-4">

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.18)" }}>
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="flex-1 text-[#0A183A]">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(39,174,96,0.07)", border: "1px solid rgba(39,174,96,0.22)" }}>
            <CheckCircle2 className="w-4 h-4 text-[#27AE60] flex-shrink-0" />
            <span className="flex-1 text-[#0A183A]">{success}</span>
            <button onClick={() => setSuccess("")}><X className="w-4 h-4 text-[#27AE60]" /></button>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#348CCB]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar placa, marca, vehículo…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[#0A183A] bg-white placeholder-[#93b8d4] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
              style={{ border: "1px solid rgba(52,140,203,0.2)" }}
            />
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] transition-colors hover:bg-[#F0F7FF]"
              style={{ border: "1px solid rgba(52,140,203,0.25)" }}
            >
              <X className="w-3.5 h-3.5" /> Limpiar selección
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 className="w-6 h-6 text-[#1E76B6] animate-spin" />
            <span className="text-sm text-[#348CCB] font-medium">Cargando inventarios…</span>
          </div>
        )}

        {!loading && (
          <>
            <BucketSection
              bucket={null}
              tires={disponibleTires}
              selectedIds={selectedIds}
              onToggle={toggleTire}
              onReturnAll={(t) => handleInitiateReturn(t)}
            />

            {buckets.map((bucket) => (
              <BucketSection
                key={bucket.id}
                bucket={bucket}
                tires={tiresPerBucket.get(bucket.id) ?? []}
                selectedIds={selectedIds}
                onToggle={toggleTire}
                onEdit={(b) => { setEditingBucket(b); setShowBucketModal(true); }}
                onDelete={(b) => setDeletingBucket(b)}
                onReturnAll={(t) => handleInitiateReturn(t)}
              />
            ))}

            {filteredTires.length === 0 && !search && (
              <div className="flex flex-col items-center py-24 gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(52,140,203,0.06)" }}>
                  <Package className="w-10 h-10 text-[#348CCB]/25" />
                </div>
                <p className="text-base font-black text-[#0A183A]">Sin llantas en inventario</p>
                <p className="text-sm text-[#348CCB]/50 text-center max-w-xs">
                  Cuando retires una llanta de un vehículo en Posiciones, aparecerá aquí.
                </p>
              </div>
            )}
            {filteredTires.length === 0 && search && (
              <div className="flex flex-col items-center py-16 gap-2">
                <Search className="w-7 h-7 text-[#348CCB]/25" />
                <p className="text-sm text-[#348CCB]/50">Sin resultados para <strong>"{search}"</strong></p>
              </div>
            )}
          </>
        )}
      </div>

      <SelectionBar
  count={selectedIds.size}
  withVehicle={withVehicle}
  onReturn={() => handleInitiateReturn()}
  onAssign={() => setShowAssignModal(true)}
  onMoveBucket={handleMoveBucket}
  onFinVida={handleFinVida}
  onClear={() => setSelectedIds(new Set())}
  returning={buildingResolved}
  buckets={buckets}
/>

      {conflictModal && (
        <ConflictModal
          resolved={conflictModal}
          onConfirm={handleConfirmReturn}
          onCancel={() => setConflictModal(null)}
          loading={returning}
        />
      )}

      {showBucketModal && (
        <BucketModal
          initial={editingBucket}
          companyId={companyId}
          onSave={handleBucketSaved}
          onClose={() => { setShowBucketModal(false); setEditingBucket(null); }}
        />
      )}

      {deletingBucket && (
        <DeleteBucketModal
          bucket={deletingBucket}
          onConfirm={() => handleDeleteBucket(deletingBucket)}
          onCancel={() => setDeletingBucket(null)}
        />
      )}

      {showAssignModal && selectedTires.length > 0 && (
        <AssignVehicleModal
          tires={selectedTires}
          buckets={buckets}
          companyId={companyId}
          onConfirm={handleConfirmAssign}
          onCancel={() => setShowAssignModal(false)}
          loading={assigning}
        />
      )}
    </div>
  );
}