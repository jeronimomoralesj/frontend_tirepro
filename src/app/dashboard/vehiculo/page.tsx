"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Plus, Truck, Edit, Trash2, Link2, X, ChevronDown, Unlink } from "lucide-react";

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const VEHICLE_TYPES: Record<string, string> = {
  "2_ejes_trailer":  "Trailer 2 ejes",
  "2_ejes_cabezote": "Cabezote 2 ejes",
  "3_ejes_trailer":  "Trailer 3 ejes",
  "1_eje_cabezote":  "Cabezote 1 eje",
  furgon:            "Furgón",
};

// =============================================================================
// Types
// =============================================================================

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  carga: string;
  pesoCarga: number;
  tipovhc: string;
  companyId: string;
  cliente: string | null;
  union: string[];
  _count: { tires: number };
};

type VehicleFormData = {
  placa: string;
  kilometrajeActual: number | "";
  carga: string;
  pesoCarga: number | "";
  tipovhc: string;
  cliente: string;
};

const BLANK_FORM: VehicleFormData = {
  placa: "",
  kilometrajeActual: "",
  carga: "",
  pesoCarga: "",
  tipovhc: "2_ejes_trailer",
  cliente: "",
};

// =============================================================================
// Helpers
// =============================================================================

function safeUnion(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

function tireCount(v: Vehicle): number {
  return v._count?.tires ?? 0;
}

function labelFor(tipovhc: string): string {
  return VEHICLE_TYPES[tipovhc] ?? tipovhc ?? "Sin tipo";
}

function normalise(v: any): Vehicle {
  return { ...v, union: safeUnion(v?.union) };
}

// =============================================================================
// Modal
// =============================================================================

function Modal({
  title,
  onClose,
  children,
  danger,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
           style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{
            background: danger
              ? "linear-gradient(135deg, #173D68 0%, #0A183A 100%)"
              : "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)",
          }}
        >
          <h2 className="font-semibold text-white text-sm tracking-wide uppercase">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors rounded-lg p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Form field
// =============================================================================

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#173D68] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

// =============================================================================
// Vehicle form
// =============================================================================

function VehicleForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  label,
  existingTireCount,
}: {
  data: VehicleFormData;
  onChange: (d: VehicleFormData) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  label: string;
  existingTireCount?: number;
}) {
  const set =
    (field: keyof VehicleFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      onChange({
        ...data,
        [field]:
          e.target.type === "number"
            ? value === "" ? "" : Number(value)
            : field === "placa"
            ? value.toUpperCase()
            : value,
      });
    };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-4">
      <FieldRow label="Placa">
        <input
          type="text"
          value={data.placa}
          onChange={set("placa")}
          required
          placeholder="ABC123"
          className={inputCls}
          style={{ textTransform: "uppercase" }}
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Kilometraje">
          <input
            type="number"
            value={data.kilometrajeActual}
            onChange={set("kilometrajeActual")}
            required
            min={0}
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="Peso carga (kg)">
          <input
            type="number"
            value={data.pesoCarga}
            onChange={set("pesoCarga")}
            required
            min={0}
            step="0.1"
            className={inputCls}
          />
        </FieldRow>
      </div>

      <FieldRow label="Tipo de carga">
        <input
          type="text"
          value={data.carga}
          onChange={set("carga")}
          required
          placeholder="ej: gas, líquido, seco"
          className={inputCls}
        />
      </FieldRow>

      <FieldRow label="Tipo de vehículo">
        <div className="relative">
          <select
            value={data.tipovhc}
            onChange={set("tipovhc")}
            required
            className={`${inputCls} appearance-none pr-8`}
          >
            {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#1E76B6]" />
        </div>
      </FieldRow>

      <FieldRow label="Dueño (opcional)">
        <input
          type="text"
          value={data.cliente}
          onChange={set("cliente")}
          placeholder="Nombre del cliente"
          className={inputCls}
        />
      </FieldRow>

      {existingTireCount !== undefined && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3 text-sm"
          style={{ background: "linear-gradient(135deg, #EBF5FF, #DDEEFF)", border: "1px solid rgba(30,118,182,0.2)" }}
        >
          <span className="text-[#1E76B6] font-medium">Llantas asignadas</span>
          <span className="font-bold text-[#173D68] text-lg">{existingTireCount}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-[#348CCB]/40 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          {label}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// Stat pill
// =============================================================================

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#348CCB]/70">{label}</span>
      <span className="text-sm font-semibold text-[#0A183A] mt-0.5 truncate">{value}</span>
    </div>
  );
}

// =============================================================================
// Vehicle card
// =============================================================================

type CardProps = {
  vehicle: Vehicle;
  connectionIndex: number;
  showUnion: boolean;
  plateInput: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleUnion: () => void;
  onPlateChange: (v: string) => void;
  onAddUnion: () => void;
  onRemoveLeft: (() => void) | null;
};

function VehicleCard({
  vehicle,
  connectionIndex,
  showUnion,
  plateInput,
  onEdit,
  onDelete,
  onToggleUnion,
  onPlateChange,
  onAddUnion,
  onRemoveLeft,
}: CardProps) {
  const tc = tireCount(vehicle);

  return (
    <div
      className="relative flex-shrink-0 flex flex-col"
      style={{ width: "280px" }}
    >
      {/* Connector bar */}
      {connectionIndex > 0 && (
        <button
          title="Eliminar conexión"
          onClick={onRemoveLeft ?? undefined}
          className="absolute -left-9 top-1/2 -translate-y-1/2 flex items-center justify-center group"
          style={{ width: "36px", height: "24px", zIndex: 10 }}
        >
          <span
            className="block h-0.5 w-full group-hover:bg-[#348CCB] transition-colors"
            style={{ background: "rgba(30,118,182,0.5)" }}
          />
          <Unlink className="absolute hidden group-hover:block w-3.5 h-3.5 text-[#348CCB]" />
        </button>
      )}

      <div
        className="rounded-2xl overflow-hidden flex flex-col h-full"
        style={{
          background: "white",
          border: "1px solid rgba(52,140,203,0.18)",
          boxShadow: "0 4px 24px rgba(10,24,58,0.06), 0 1px 4px rgba(30,118,182,0.08)",
        }}
      >
        {/* Card header */}
        <div
          className="px-5 py-4 flex items-start justify-between"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}
        >
          <div>
            <p
              className="font-black tracking-widest text-white"
              style={{ fontSize: "22px", letterSpacing: "0.12em", fontFamily: "'DM Mono', monospace" }}
            >
              {vehicle.placa.toUpperCase()}
            </p>
            <p className="text-[#348CCB] text-xs font-medium mt-0.5">{labelFor(vehicle.tipovhc)}</p>
          </div>
          {/* Tire count badge */}
          <div
            className="flex flex-col items-center justify-center rounded-xl px-3 py-2"
            style={{ background: "rgba(52,140,203,0.2)", minWidth: "52px" }}
          >
            <span className="text-2xl font-black text-white leading-none">{tc}</span>
            <span className="text-[9px] text-[#348CCB] uppercase tracking-wider mt-0.5">llantas</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3" style={{ background: "#F8FBFF" }}>
          <StatPill label="Kilometraje" value={`${(vehicle.kilometrajeActual ?? 0).toLocaleString()} km`} />
          <StatPill label="Peso carga" value={`${vehicle.pesoCarga ?? 0} kg`} />
          <StatPill label="Tipo carga" value={vehicle.carga || "N/A"} />
          <StatPill label="Dueño" value={vehicle.cliente ?? "Propio"} />
          {vehicle.union.length > 0 && (
            <div className="col-span-2">
              <StatPill label="Conectado con" value={vehicle.union.map(p => p.toUpperCase()).join(", ")} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          className="px-4 pb-4 pt-3 flex gap-2 mt-auto"
          style={{ borderTop: "1px solid rgba(52,140,203,0.12)", background: "white" }}
        >
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
          >
            <Edit className="w-3 h-3" /> Editar
          </button>
          <button
            onClick={onToggleUnion}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-all hover:opacity-80"
            style={{
              background: showUnion
                ? "rgba(30,118,182,0.18)"
                : "rgba(52,140,203,0.08)",
              color: "#1E76B6",
              border: showUnion ? "1px solid rgba(30,118,182,0.3)" : "1px solid transparent",
            }}
          >
            <Link2 className="w-3 h-3" /> Unir
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: "rgba(10,24,58,0.06)", color: "#173D68" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Union input */}
        {showUnion && (
          <div
            className="px-4 pb-4 flex gap-2"
            style={{ background: "white", borderTop: "1px solid rgba(52,140,203,0.1)" }}
          >
            <input
              type="text"
              placeholder="Placa a unir (ej: XYZ789)"
              value={plateInput}
              onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onAddUnion()}
              className={`${inputCls} flex-1 text-xs`}
              style={{ textTransform: "uppercase" }}
            />
            <button
              onClick={onAddUnion}
              className="px-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function VehiculoPage() {
  const router = useRouter();

  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [companyId, setCompanyId] = useState("");

  const [showCreate, setShowCreate]           = useState(false);
  const [vehicleToEdit, setVehicleToEdit]     = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [unionToDelete, setUnionToDelete]     = useState<{ sourceId: string; targetPlaca: string } | null>(null);

  const [createForm, setCreateForm] = useState<VehicleFormData>(BLANK_FORM);
  const [editForm, setEditForm]     = useState<VehicleFormData>(BLANK_FORM);

  const [showUnionInput, setShowUnionInput] = useState<Record<string, boolean>>({});
  const [plateInputs, setPlateInputs]       = useState<Record<string, string>>({});

  // ===========================================================================
  // Data
  // ===========================================================================

  const fetchVehicles = useCallback(async (cId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles?companyId=${cId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar vehículos");
      const data: Vehicle[] = await res.json();
      setVehicles(data.map(normalise));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.push("/login"); return; }
    try {
      const user = JSON.parse(raw);
      if (!user.companyId) throw new Error();
      setCompanyId(user.companyId);
      fetchVehicles(user.companyId);
    } catch {
      router.push("/login");
    }
  }, [router, fetchVehicles]);

  // ===========================================================================
  // Grouping
  // ===========================================================================

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const result: Vehicle[][] = [];
    vehicles.forEach((v) => {
      if (seen.has(v.id)) return;
      const group: Vehicle[] = [v];
      seen.add(v.id);
      v.union.forEach((placa) => {
        const peer = vehicles.find((x) => x.placa.toUpperCase() === placa.toUpperCase());
        if (peer && !seen.has(peer.id)) { group.push(peer); seen.add(peer.id); }
      });
      result.push(group);
    });
    return result;
  }, [vehicles]);

  const connectedGroups = groups.filter((g) => g.length > 1);
  const singleVehicles  = groups.filter((g) => g.length === 1).map((g) => g[0]);

  // ===========================================================================
  // CRUD
  // ===========================================================================

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...createForm,
          placa:   createForm.placa.trim().toUpperCase(),
          cliente: createForm.cliente.trim() || null,
          companyId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Error al crear");
      const vehicle = await res.json();
      setVehicles((prev) => [...prev, normalise(vehicle)]);
      setCreateForm(BLANK_FORM);
      setShowCreate(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  function openEdit(vehicle: Vehicle) {
    setVehicleToEdit(vehicle);
    setEditForm({
      placa:             vehicle.placa.toUpperCase(),
      kilometrajeActual: vehicle.kilometrajeActual,
      carga:             vehicle.carga,
      pesoCarga:         vehicle.pesoCarga,
      tipovhc:           vehicle.tipovhc,
      cliente:           vehicle.cliente ?? "",
    });
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!vehicleToEdit) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleToEdit.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          ...editForm,
          placa:   editForm.placa.trim().toUpperCase(),
          cliente: editForm.cliente.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Error al editar");
      const vehicle = await res.json();
      setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? normalise(vehicle) : v));
      setVehicleToEdit(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Error al eliminar");
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      setVehicleToDelete(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function handleAddUnion(vehicleId: string) {
    const placa = plateInputs[vehicleId]?.trim().toUpperCase();
    if (!placa) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/union/add`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ placa }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Error al unir");
      const vehicle = await res.json();
      setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? normalise(vehicle) : v));
      setPlateInputs((p) => ({ ...p, [vehicleId]: "" }));
      setShowUnionInput((p) => ({ ...p, [vehicleId]: false }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function handleRemoveUnion(sourceId: string, targetPlaca: string) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${sourceId}/union/remove`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ placa: targetPlaca }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Error al eliminar unión");
      const vehicle = await res.json();
      setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? normalise(vehicle) : v));
      setUnionToDelete(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  // ===========================================================================
  // Render card
  // ===========================================================================

  function renderCard(vehicle: Vehicle, indexInGroup: number, onRemoveLeft: (() => void) | null) {
    return (
      <VehicleCard
        key={vehicle.id}
        vehicle={vehicle}
        connectionIndex={indexInGroup}
        showUnion={!!showUnionInput[vehicle.id]}
        plateInput={plateInputs[vehicle.id] ?? ""}
        onEdit={() => openEdit(vehicle)}
        onDelete={() => setVehicleToDelete(vehicle)}
        onToggleUnion={() => setShowUnionInput((p) => ({ ...p, [vehicle.id]: !p[vehicle.id] }))}
        onPlateChange={(val) => setPlateInputs((p) => ({ ...p, [vehicle.id]: val }))}
        onAddUnion={() => handleAddUnion(vehicle.id)}
        onRemoveLeft={onRemoveLeft}
      />
    );
  }

  // ===========================================================================
  // JSX
  // ===========================================================================

  return (
    <div className="min-h-screen antialiased" style={{ background: "#ffff", color: "#0A183A" }}>

      {/* Top bar */}
      <div
        className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{
          background: "rgba(240,246,255,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
              Gestión de Vehículos
            </h1>
            <p className="text-xs text-[#348CCB] mt-0.5">
              {vehicles.length} vehículo{vehicles.length !== 1 ? "s" : ""} registrado{vehicles.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <button
          onClick={() => { setCreateForm(BLANK_FORM); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
          style={{
            background: "linear-gradient(135deg, #1E76B6, #173D68)",
            boxShadow: "0 4px 16px rgba(30,118,182,0.35)",
          }}
        >
          <Plus className="w-4 h-4" />
          Añadir Vehículo
        </button>
      </div>

      <div className="px-6 py-8 max-w-screen-2xl mx-auto">

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-xl flex items-center justify-between text-sm font-medium"
            style={{
              background: "rgba(10,24,58,0.06)",
              border: "1px solid rgba(30,118,182,0.3)",
              color: "#173D68",
            }}
          >
            <span>{error}</span>
            <button onClick={() => setError("")} className="hover:opacity-70 transition-opacity ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div
              className="w-12 h-12 rounded-full border-4 border-[#348CCB]/20 border-t-[#1E76B6] animate-spin"
            />
            <p className="text-[#348CCB] text-sm font-medium">Cargando vehículos…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div
              className="p-6 rounded-3xl"
              style={{ background: "rgba(30,118,182,0.08)" }}
            >
              <Truck className="w-16 h-16 text-[#348CCB]/40" />
            </div>
            <p className="text-[#173D68] text-lg font-bold">Sin vehículos registrados</p>
            <p className="text-[#348CCB] text-sm">Usa el botón de arriba para añadir tu primer vehículo</p>
          </div>
        ) : (
          <div className="space-y-12">

            {/* Connected groups */}
            {connectedGroups.length > 0 && (
              <section>
                <SectionLabel icon="🔗">Vehículos Conectados</SectionLabel>
                <div className="space-y-6">
                  {connectedGroups.map((group, gi) => (
                    <div
                      key={`group-${gi}`}
                      className="flex flex-row flex-nowrap overflow-x-auto pb-3 items-center"
                      style={{ gap: "36px" }}
                    >
                      {group.map((vehicle, vi) =>
                        renderCard(
                          vehicle,
                          vi,
                          vi > 0
                            ? () => {
                                const prev = group[vi - 1];
                                const src  = prev.union.some(p => p.toUpperCase() === vehicle.placa.toUpperCase()) ? prev : vehicle;
                                const tgt  = src === prev ? vehicle.placa.toUpperCase() : prev.placa.toUpperCase();
                                setUnionToDelete({ sourceId: src.id, targetPlaca: tgt });
                              }
                            : null
                        )
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Individual */}
            {singleVehicles.length > 0 && (
              <section>
                <SectionLabel>Vehículos Individuales</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {singleVehicles.map((v) => renderCard(v, 0, null))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {showCreate && (
        <Modal title="Nuevo Vehículo" onClose={() => setShowCreate(false)}>
          <VehicleForm
            data={createForm}
            onChange={setCreateForm}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            label="Crear Vehículo"
          />
        </Modal>
      )}

      {vehicleToEdit && (
        <Modal title="Editar Vehículo" onClose={() => setVehicleToEdit(null)}>
          <VehicleForm
            data={editForm}
            onChange={setEditForm}
            onSubmit={handleEdit}
            onCancel={() => setVehicleToEdit(null)}
            label="Guardar Cambios"
            existingTireCount={tireCount(vehicleToEdit)}
          />
        </Modal>
      )}

      {vehicleToDelete && (
        <Modal title="Confirmar Eliminación" onClose={() => setVehicleToDelete(null)} danger>
          <div className="p-6 space-y-5">
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: "rgba(10,24,58,0.04)", border: "1px solid rgba(30,118,182,0.15)" }}
            >
              <p className="text-[#173D68]">
                ¿Eliminar el vehículo{" "}
                <span className="font-black text-[#0A183A] tracking-widest">
                  {vehicleToDelete.placa.toUpperCase()}
                </span>
                ?
              </p>
              <p className="text-[#348CCB] text-xs mt-1">Sus llantas quedarán sin asignar.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setVehicleToDelete(null)}
                className="flex-1 border border-[#348CCB]/30 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(vehicleToDelete.id)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #173D68, #0A183A)" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {unionToDelete && (
        <Modal title="Eliminar Conexión" onClose={() => setUnionToDelete(null)}>
          <div className="p-6 space-y-5">
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: "rgba(10,24,58,0.04)", border: "1px solid rgba(30,118,182,0.15)" }}
            >
              <p className="text-[#173D68]">
                ¿Eliminar la conexión con{" "}
                <span className="font-black text-[#0A183A] tracking-widest">
                  {unionToDelete.targetPlaca.toUpperCase()}
                </span>
                ?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUnionToDelete(null)}
                className="flex-1 border border-[#348CCB]/30 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveUnion(unionToDelete.sourceId, unionToDelete.targetPlaca)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
              >
                Eliminar Conexión
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {icon && <span className="text-base">{icon}</span>}
      <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-[0.15em]">{children}</p>
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.2)" }} />
    </div>
  );
}