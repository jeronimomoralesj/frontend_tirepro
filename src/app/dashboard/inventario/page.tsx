"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Plus, Pencil, Trash2, Loader2, X,
  Check, Layers, ChevronDown, Search, Truck,
  ArrowRight, RotateCcw, AlertTriangle, CheckCircle2,
} from "lucide-react";

// =============================================================================
// Constants & auth
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

const BUCKET_COLORS = [
  "#1E76B6", "#173D68", "#0A183A", "#348CCB",
  "#E67E22", "#27AE60", "#8E44AD", "#C0392B", "#16A085", "#D35400",
];
const BUCKET_ICONS = ["📦", "🔧", "🔄", "⚠️", "🏭", "🛠️", "🚛", "⏳", "✅", "🔩"];

// =============================================================================
// Types
// =============================================================================

interface InventoryBucket {
  id: string;
  nombre: string;
  color: string;
  icono: string;
  excluirDeFlota: boolean;
  orden: number;
  tireCount: number;
}

interface InventoryTire {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension?: string;
  vidaActual?: string;
  currentProfundidad?: number | null;
  alertLevel?: string;
  inventoryBucketId: string | null;
  lastVehicleId: string | null;
  lastVehiclePlaca: string | null;
  lastPosicion: number | null;
  inventoryEnteredAt: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const VIDA_SHORT: Record<string, string> = {
  nueva: "Nueva", reencauche1: "R1", reencauche2: "R2", reencauche3: "R3", fin: "Fin",
};

// =============================================================================
// Bucket modal (create/edit)
// =============================================================================

function BucketModal({
  initial, companyId, onSave, onClose,
}: {
  initial?: InventoryBucket | null;
  companyId: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [color, setColor] = useState(initial?.color ?? BUCKET_COLORS[0]);
  const [icono, setIcono] = useState(initial?.icono ?? BUCKET_ICONS[0]);
  const [excluir, setExcluir] = useState(initial?.excluirDeFlota ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  async function save() {
    if (!nombre.trim()) { setErr("El nombre es obligatorio"); return; }
    setSaving(true);
    setErr("");
    try {
      const url = initial
        ? `${API_BASE}/inventory-buckets/${initial.id}?companyId=${companyId}`
        : `${API_BASE}/inventory-buckets`;
      const res = await authFetch(url, {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify({
          companyId, nombre: nombre.trim(), color, icono, excluirDeFlota: excluir,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.message ?? "Error al guardar");
      }
      onSave();
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
        className="bg-white rounded-xl shadow-sm w-full max-w-sm overflow-hidden"
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
            <p className="text-xs font-semibold text-red-500 px-3 py-2 rounded-xl bg-red-50">
              {err}
            </p>
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
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#173D68] block mb-1.5">
              Ícono
            </label>
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
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#173D68] block mb-1.5">
              Color
            </label>
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
              style={{
                background: excluir ? "#1E76B6" : "transparent",
                border: excluir ? "none" : "1.5px solid #348CCB",
              }}
            >
              {excluir && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </div>
            <div>
              <p className="font-bold text-[#0A183A] text-xs">Excluir de analytics de flota</p>
              <p className="text-[10px] text-[#348CCB]/60 mt-0.5">
                Las llantas aquí no afectarán CPK ni salud promedio
              </p>
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
// Delete confirmation
// =============================================================================

function DeleteModal({
  bucket, onConfirm, onCancel, loading,
}: {
  bucket: InventoryBucket;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="bg-white rounded-xl shadow-sm w-full max-w-sm p-6"
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
            <p className="text-[10px] text-[#348CCB]/60 mt-0.5">
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>
        <p className="text-sm text-[#173D68] mb-5">
          Las <strong>{bucket.tireCount}</strong> llantas serán movidas a{" "}
          <strong>Disponible</strong>.
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
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #e53e3e, #c53030)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function InventarioPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);

  // Data
  const [buckets, setBuckets] = useState<InventoryBucket[]>([]);
  const [disponibleCount, setDisponibleCount] = useState(0);
  const [tires, setTires] = useState<InventoryTire[]>([]);
  const [tiresLoading, setTiresLoading] = useState(false);

  // Selection state
  const [activeBucket, setActiveBucket] = useState<string | null>("disponible");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editBucket, setEditBucket] = useState<InventoryBucket | null>(null);
  const [deleteBucket, setDeleteBucket] = useState<InventoryBucket | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Move dropdown
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moving, setMoving] = useState(false);

  // -- Auth --------------------------------------------------------------------

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    let user: { companyId?: string };
    try { user = JSON.parse(stored); } catch { router.push("/login"); return; }
    if (!user.companyId) return;
    setCompanyId(user.companyId);
  }, [router]);

  // -- Fetch buckets ----------------------------------------------------------

  const fetchBuckets = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE}/inventory-buckets?companyId=${companyId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBuckets(data.buckets ?? []);
        setDisponibleCount(data.disponible ?? 0);
      }
    } catch { /* */ }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchBuckets(); }, [fetchBuckets]);

  // -- Fetch tires for selected bucket ----------------------------------------

  const fetchTires = useCallback(async () => {
    if (!companyId || !activeBucket) { setTires([]); return; }
    setTiresLoading(true);
    setSelectedIds(new Set());
    try {
      const url =
        activeBucket === "disponible"
          ? `${API_BASE}/inventory-buckets/disponible/tires?companyId=${companyId}`
          : `${API_BASE}/inventory-buckets/${activeBucket}/tires?companyId=${companyId}`;
      const res = await authFetch(url);
      if (res.ok) setTires(await res.json());
      else setTires([]);
    } catch {
      setTires([]);
    }
    setTiresLoading(false);
  }, [companyId, activeBucket]);

  useEffect(() => { fetchTires(); }, [fetchTires]);

  // -- Toggle selection -------------------------------------------------------

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const visible = filteredTires.map((t) => t.id);
    const allSelected = visible.every((id) => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visible));
  }, [selectedIds]);

  // -- Filter tires -----------------------------------------------------------

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

  // -- Delete bucket ----------------------------------------------------------

  const handleDelete = useCallback(async () => {
    if (!deleteBucket) return;
    setDeleteLoading(true);
    try {
      await authFetch(
        `${API_BASE}/inventory-buckets/${deleteBucket.id}?companyId=${companyId}`,
        { method: "DELETE" },
      );
      setDeleteBucket(null);
      if (activeBucket === deleteBucket.id) setActiveBucket("disponible");
      fetchBuckets();
    } catch { /* */ }
    setDeleteLoading(false);
  }, [deleteBucket, companyId, activeBucket, fetchBuckets]);

  // -- Move tires -------------------------------------------------------------

  const handleMove = useCallback(
    async (targetBucketId: string | null) => {
      if (selectedIds.size === 0) return;
      setMoving(true);
      setShowMoveMenu(false);
      try {
        await authFetch(`${API_BASE}/inventory-buckets/bulk-move`, {
          method: "POST",
          body: JSON.stringify({
            tireIds: Array.from(selectedIds),
            bucketId: targetBucketId,
            companyId,
          }),
        });
        setSelectedIds(new Set());
        fetchBuckets();
        fetchTires();
      } catch { /* */ }
      setMoving(false);
    },
    [selectedIds, companyId, fetchBuckets, fetchTires],
  );

  // -- Batch return -----------------------------------------------------------

  const handleBatchReturn = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const tiresWithVehicle = tires.filter(
      (t) => selectedIds.has(t.id) && t.lastVehicleId && t.lastPosicion,
    );
    if (tiresWithVehicle.length === 0) return;

    setMoving(true);
    try {
      await authFetch(`${API_BASE}/inventory-buckets/batch-return`, {
        method: "POST",
        body: JSON.stringify({
          returns: tiresWithVehicle.map((t) => ({
            tireId: t.id,
            vehicleId: t.lastVehicleId,
            posicion: t.lastPosicion,
          })),
          fallbackTireIds: [],
          companyId,
        }),
      });
      setSelectedIds(new Set());
      fetchBuckets();
      fetchTires();
    } catch { /* */ }
    setMoving(false);
  }, [selectedIds, tires, companyId, fetchBuckets, fetchTires]);

  // -- Derived ----------------------------------------------------------------

  const selectedWithVehicle = useMemo(
    () =>
      tires.filter((t) => selectedIds.has(t.id) && t.lastVehicleId && t.lastPosicion)
        .length,
    [tires, selectedIds],
  );

  const activeBucketName = useMemo(() => {
    if (activeBucket === "disponible") return "Disponible";
    return buckets.find((b) => b.id === activeBucket)?.nombre ?? "";
  }, [activeBucket, buckets]);

  // -- Render -----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-5"
        style={{
          background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
        }}
      >
        <h1 className="font-black text-white text-lg tracking-tight">
          Inventario
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Cargando inventario…</span>
          </div>
        ) : (
          <>
            {/* -- Bucket cards ---------------------------------------- */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {/* Disponible */}
              <button
                onClick={() => setActiveBucket("disponible")}
                className="flex-shrink-0 rounded-xl p-4 transition-all min-w-[140px]"
                style={{
                  background:
                    activeBucket === "disponible"
                      ? "rgba(30,118,182,0.08)"
                      : "white",
                  border:
                    activeBucket === "disponible"
                      ? "2px solid #1E76B6"
                      : "1px solid rgba(52,140,203,0.15)",
                  boxShadow: "0 2px 8px rgba(10,24,58,0.04)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📦</span>
                  <span className="text-xs font-black text-[#0A183A]">Disponible</span>
                </div>
                <p className="text-2xl font-black text-[#1E76B6]">{disponibleCount}</p>
              </button>

              {/* Custom buckets */}
              {buckets.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActiveBucket(b.id)}
                  className="flex-shrink-0 rounded-xl p-4 transition-all min-w-[140px] relative group"
                  style={{
                    background:
                      activeBucket === b.id ? `${b.color}12` : "white",
                    border:
                      activeBucket === b.id
                        ? `2px solid ${b.color}`
                        : "1px solid rgba(52,140,203,0.15)",
                    boxShadow: "0 2px 8px rgba(10,24,58,0.04)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{b.icono}</span>
                    <span className="text-xs font-black text-[#0A183A] truncate">
                      {b.nombre}
                    </span>
                  </div>
                  <p className="text-2xl font-black" style={{ color: b.color }}>
                    {b.tireCount}
                  </p>

                  {/* Edit/delete on hover */}
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditBucket(b); }}
                      className="p-1 rounded-md bg-white shadow-sm hover:bg-gray-50"
                    >
                      <Pencil className="w-3 h-3 text-[#348CCB]" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteBucket(b); }}
                      className="p-1 rounded-md bg-white shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </button>
              ))}

              {/* Create new */}
              <button
                onClick={() => setShowCreate(true)}
                className="flex-shrink-0 rounded-xl p-4 min-w-[140px] flex flex-col items-center justify-center gap-2 transition-all hover:bg-gray-50"
                style={{
                  border: "2px dashed rgba(52,140,203,0.25)",
                }}
              >
                <Plus className="w-5 h-5 text-[#348CCB]" />
                <span className="text-xs font-bold text-[#348CCB]">Crear Grupo</span>
              </button>
            </div>

            {/* -- Active bucket content ------------------------------- */}
            <div
              className="bg-white rounded-xl shadow-sm overflow-hidden"
              style={{ border: "1px solid rgba(52,140,203,0.12)" }}
            >
              {/* Toolbar */}
              <div
                className="px-4 py-3 flex flex-wrap items-center gap-3"
                style={{ borderBottom: "1px solid rgba(52,140,203,0.08)" }}
              >
                <h2 className="text-sm font-black text-[#0A183A]">
                  {activeBucketName}
                </h2>

                <div className="flex-1 relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar placa, marca, diseño…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#348CCB]"
                  />
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1E76B6]">
                      {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
                    </span>

                    {/* Return to vehicle */}
                    {selectedWithVehicle > 0 && (
                      <button
                        onClick={handleBatchReturn}
                        disabled={moving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                        style={{ background: "#27AE60" }}
                      >
                        {moving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Devolver ({selectedWithVehicle})
                      </button>
                    )}

                    {/* Move to dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoveMenu(!showMoveMenu)}
                        disabled={moving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E76B6] transition-all hover:bg-[#F0F7FF] disabled:opacity-50"
                        style={{ border: "1px solid rgba(30,118,182,0.25)" }}
                      >
                        <ArrowRight className="w-3 h-3" />
                        Mover a…
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showMoveMenu && (
                        <div
                          className="absolute right-0 mt-1 w-48 rounded-xl py-1 z-20 shadow-sm"
                          style={{
                            background: "white",
                            border: "1px solid rgba(52,140,203,0.2)",
                          }}
                        >
                          {activeBucket !== "disponible" && (
                            <button
                              onClick={() => handleMove(null)}
                              className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-[#F0F7FF] text-[#0A183A]"
                            >
                              📦 Disponible
                            </button>
                          )}
                          {buckets
                            .filter((b) => b.id !== activeBucket)
                            .map((b) => (
                              <button
                                key={b.id}
                                onClick={() => handleMove(b.id)}
                                className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-[#F0F7FF] text-[#0A183A]"
                              >
                                {b.icono} {b.nombre}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              {tiresLoading ? (
                <div className="flex items-center justify-center py-16 text-[#1E76B6]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : filteredTires.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Package className="w-8 h-8 mb-2" />
                  <p className="text-sm font-medium">No hay llantas en este grupo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-left text-[10px] font-black uppercase tracking-wider text-gray-400"
                        style={{ borderBottom: "1px solid rgba(52,140,203,0.08)" }}
                      >
                        <th className="pl-4 pr-2 py-3 w-10">
                          <button
                            onClick={toggleAll}
                            className="w-5 h-5 rounded flex items-center justify-center transition-all"
                            style={{
                              background:
                                filteredTires.length > 0 &&
                                filteredTires.every((t) => selectedIds.has(t.id))
                                  ? "#1E76B6"
                                  : "rgba(52,140,203,0.08)",
                              border:
                                filteredTires.length > 0 &&
                                filteredTires.every((t) => selectedIds.has(t.id))
                                  ? "none"
                                  : "1.5px solid rgba(52,140,203,0.3)",
                            }}
                          >
                            {filteredTires.length > 0 &&
                              filteredTires.every((t) => selectedIds.has(t.id)) && (
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              )}
                          </button>
                        </th>
                        <th className="px-2 py-3">Placa</th>
                        <th className="px-2 py-3">Marca</th>
                        <th className="px-2 py-3">Diseño</th>
                        <th className="px-2 py-3">Dimensión</th>
                        <th className="px-2 py-3">Prof. Actual</th>
                        <th className="px-2 py-3">Vida</th>
                        <th className="px-2 py-3">Vehículo Anterior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTires.map((tire) => {
                        const sel = selectedIds.has(tire.id);
                        const vida = tire.vidaActual?.toLowerCase() ?? "nueva";
                        return (
                          <tr
                            key={tire.id}
                            onClick={() => toggleSelect(tire.id)}
                            className="cursor-pointer transition-colors hover:bg-gray-50/50"
                            style={{
                              background: sel ? "rgba(30,118,182,0.04)" : "transparent",
                              borderBottom: "1px solid rgba(52,140,203,0.06)",
                            }}
                          >
                            <td className="pl-4 pr-2 py-3">
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center transition-all"
                                style={{
                                  background: sel ? "#1E76B6" : "rgba(52,140,203,0.08)",
                                  border: sel ? "none" : "1.5px solid rgba(52,140,203,0.3)",
                                }}
                              >
                                {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <span className="font-mono font-black text-[#0A183A] text-xs">
                                {tire.placa}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-xs text-gray-600">
                              {tire.marca}
                            </td>
                            <td className="px-2 py-3 text-xs text-gray-600">
                              {tire.diseno}
                            </td>
                            <td className="px-2 py-3 text-xs text-gray-600">
                              {tire.dimension ?? "—"}
                            </td>
                            <td className="px-2 py-3">
                              <span
                                className="text-xs font-bold"
                                style={{
                                  color:
                                    tire.currentProfundidad == null
                                      ? "#94a3b8"
                                      : tire.currentProfundidad > 6
                                        ? "#27AE60"
                                        : tire.currentProfundidad > 3
                                          ? "#E67E22"
                                          : "#e53e3e",
                                }}
                              >
                                {tire.currentProfundidad != null
                                  ? `${tire.currentProfundidad.toFixed(1)} mm`
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-2 py-3">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                                style={{
                                  background:
                                    vida === "fin" ? "#64748B" :
                                    vida === "nueva" ? "#348CCB" :
                                    "#173D68",
                                }}
                              >
                                {VIDA_SHORT[vida] ?? vida}
                              </span>
                            </td>
                            <td className="px-2 py-3">
                              {tire.lastVehiclePlaca ? (
                                <div className="flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-[#348CCB]" />
                                  <span className="text-xs font-mono font-bold text-[#0A183A]">
                                    {tire.lastVehiclePlaca}
                                  </span>
                                  {tire.lastPosicion != null && (
                                    <span className="text-[10px] text-[#348CCB]">
                                      P{tire.lastPosicion}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editBucket) && (
        <BucketModal
          initial={editBucket}
          companyId={companyId}
          onSave={() => {
            setShowCreate(false);
            setEditBucket(null);
            fetchBuckets();
          }}
          onClose={() => { setShowCreate(false); setEditBucket(null); }}
        />
      )}

      {deleteBucket && (
        <DeleteModal
          bucket={deleteBucket}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteBucket(null)}
        />
      )}
    </div>
  );
}
