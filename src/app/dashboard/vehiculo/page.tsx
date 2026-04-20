"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Link2, X, ChevronDown, Unlink, User, Phone, Loader2, Calendar, Truck } from "lucide-react";
import FilterFab from "../components/FilterFab";
import type { FilterOption } from "../components/FilterFab";
import { AxleConfigPicker } from "@/components/AxleConfigPicker";

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

type Driver = {
  id?: string;
  nombre: string;
  telefono: string;
  isPrimary: boolean;
};

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  carga: string;
  pesoCarga: number;
  tipovhc: string;
  companyId: string;
  cliente: string | null;
  tipoOperacion: string | null;
  configuracion: string | null;
  union: string[];
  drivers?: Driver[];
  _count: { tires: number };
};

type VehicleFormData = {
  placa: string;
  kilometrajeActual: number | "";
  carga: string;
  pesoCarga: number | "";
  tipovhc: string;
  cliente: string;
  pctPavimento: number;
  configuracion: string;
};

const BLANK_FORM: VehicleFormData = {
  placa: "",
  kilometrajeActual: "",
  carga: "",
  pesoCarga: "",
  tipovhc: "2_ejes_trailer",
  cliente: "",
  pctPavimento: 90,
  configuracion: "",
};

// Axle configs now live in AxleConfigPicker (canonical + shared).

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain px-4 py-6 sm:py-12"
      style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-4 flex justify-between items-center rounded-t-2xl"
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
  children,
}: {
  data: VehicleFormData;
  onChange: (d: VehicleFormData) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  label: string;
  existingTireCount?: number;
  children?: React.ReactNode;
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

      {/* Terreno / Operación */}
      <FieldRow label={`Terreno: ${data.pctPavimento}% pavimento — ${100 - data.pctPavimento}% destapado`}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[#348CCB] w-16">Destapado</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={data.pctPavimento}
            onChange={(e) => onChange({ ...data, pctPavimento: Number(e.target.value) })}
            className="flex-1 accent-[#1E76B6] h-2"
          />
          <span className="text-[10px] font-bold text-[#1E76B6] w-16 text-right">Pavimento</span>
        </div>
      </FieldRow>

      <FieldRow label="Configuración de ejes">
        <AxleConfigPicker
          value={data.configuracion}
          onChange={(next) => onChange({ ...data, configuracion: next })}
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

      {children}

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
// Vehicle card — simplified
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
  onEditDrivers: () => void;
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
  onEditDrivers,
}: CardProps) {
  const tc = tireCount(vehicle);
  const drivers = vehicle.drivers ?? [];

  return (
    <div className="relative flex-shrink-0 flex flex-col w-full">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="bg-[#173D68] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-black tracking-widest text-white text-lg">
              {vehicle.placa.toUpperCase()}
            </p>
            <p className="text-[#348CCB] text-xs font-medium">{labelFor(vehicle.tipovhc)}</p>
          </div>
          <div className="flex items-center gap-2">
            {drivers.length > 0 && (
              <div className="flex -space-x-1.5">
                {drivers.slice(0, 3).map((d, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-[#173D68]"
                    style={{ background: d.isPrimary ? "#1E76B6" : "#64748b" }}
                    title={d.nombre}
                  >
                    {d.nombre.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white/10 rounded-lg px-2.5 py-1 text-center">
              <span className="text-lg font-black text-white leading-none">{tc}</span>
              <span className="text-[8px] text-[#348CCB] block">llantas</span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-4 py-3 space-y-2 flex-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span className="text-gray-400 text-[10px]">Km</span>
              <p className="font-semibold text-[#0A183A]">{(vehicle.kilometrajeActual ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-400 text-[10px]">Carga</span>
              <p className="font-semibold text-[#0A183A] truncate">{vehicle.carga || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-400 text-[10px]">Peso</span>
              <p className="font-semibold text-[#0A183A]">{vehicle.pesoCarga ?? 0} kg</p>
            </div>
            <div>
              <span className="text-gray-400 text-[10px]">Cliente</span>
              <p className="font-semibold text-[#0A183A] truncate">{vehicle.cliente ?? "Propio"}</p>
            </div>
            {vehicle.configuracion && (
              <div className="col-span-2">
                <span className="text-gray-400 text-[10px]">Config. ejes</span>
                <p className="font-semibold text-[#0A183A]">{vehicle.configuracion}</p>
              </div>
            )}
          </div>

          {/* Drivers */}
          {drivers.length > 0 && (
            <div className="pt-2 border-t border-gray-50 space-y-1">
              {drivers.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <User className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  <span className="text-[#0A183A] truncate">{d.nombre}</span>
                  {d.isPrimary && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#1E76B6]/10 text-[#1E76B6] flex-shrink-0">
                      Principal
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {vehicle.union.length > 0 && (
            <div className="pt-2 border-t border-gray-50">
              <span className="text-gray-400 text-[10px]">Conectado con</span>
              <p className="text-xs font-semibold text-[#1E76B6]">{vehicle.union.map(p => p.toUpperCase()).join(", ")}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-3 pb-3 pt-1 flex gap-1.5 mt-auto border-t border-gray-50">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-lg text-[#1E76B6] hover:bg-[#1E76B6]/5 transition-colors"
          >
            <Edit className="w-3 h-3" /> Editar
          </button>
          <button
            onClick={onEditDrivers}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-lg text-[#1E76B6] hover:bg-[#1E76B6]/5 transition-colors"
          >
            <User className="w-3 h-3" /> Conductores
          </button>
          <button
            onClick={onToggleUnion}
            className={`flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 px-2 rounded-lg transition-colors ${showUnion ? "bg-[#1E76B6]/10 text-[#1E76B6]" : "text-[#1E76B6] hover:bg-[#1E76B6]/5"}`}
          >
            <Link2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center py-1.5 px-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Union input */}
        {showUnion && (
          <div className="px-3 pb-3 flex gap-2 border-t border-gray-50 pt-2">
            <input
              type="text"
              placeholder="Placa a unir"
              value={plateInput}
              onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onAddUnion()}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-[#0A183A] bg-gray-50 focus:outline-none focus:border-[#1E76B6] transition-colors"
              style={{ textTransform: "uppercase" }}
            />
            <button
              onClick={onAddUnion}
              className="px-3 rounded-lg text-white text-sm font-bold bg-[#1E76B6] hover:opacity-90 transition-opacity"
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
// Driver modal
// =============================================================================

function DriverModal({
  vehicleId,
  vehiclePlaca,
  initialDrivers,
  onClose,
  onSaved,
}: {
  vehicleId: string;
  vehiclePlaca: string;
  initialDrivers: Driver[];
  onClose: () => void;
  onSaved: (drivers: Driver[]) => void;
}) {
  const [drivers, setDrivers] = useState<Driver[]>(
    initialDrivers.length > 0 ? initialDrivers : [],
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function addDriver() {
    if (drivers.length >= 3) return;
    setDrivers([...drivers, { nombre: "", telefono: "", isPrimary: drivers.length === 0 }]);
  }

  function removeDriver(idx: number) {
    const next = drivers.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((d) => d.isPrimary)) next[0].isPrimary = true;
    setDrivers(next);
  }

  function updateDriver(idx: number, field: keyof Driver, value: string | boolean) {
    setDrivers(
      drivers.map((d, i) => {
        if (i !== idx) {
          if (field === "isPrimary" && value === true) return { ...d, isPrimary: false };
          return d;
        }
        return { ...d, [field]: value };
      }),
    );
  }

  async function save() {
    const valid = drivers.filter((d) => d.nombre.trim() && d.telefono.trim());
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/drivers`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ drivers: valid }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Error al guardar");
      const saved = await res.json();
      onSaved(saved);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Conductores — ${vehiclePlaca}`} onClose={onClose}>
      <div className="p-5 space-y-4">
        {err && (
          <p className="text-xs font-semibold text-red-500 px-3 py-2 rounded-xl bg-red-50">{err}</p>
        )}

        {drivers.length === 0 && (
          <p className="text-sm text-[#348CCB]/60 text-center py-4">
            Sin conductores asignados
          </p>
        )}

        {drivers.map((d, i) => (
          <div
            key={i}
            className="rounded-xl p-3 space-y-2"
            style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.12)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D68]">
                Conductor {i + 1}
              </span>
              <button
                onClick={() => removeDriver(i)}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#348CCB]/40" />
                  <input
                    type="text"
                    value={d.nombre}
                    onChange={(e) => updateDriver(i, "nombre", e.target.value)}
                    placeholder="Nombre"
                    maxLength={100}
                    className={`${inputCls} pl-8 text-xs`}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#348CCB]/40" />
                  <input
                    type="text"
                    value={d.telefono}
                    onChange={(e) => updateDriver(i, "telefono", e.target.value)}
                    placeholder="+57 300 123 4567"
                    maxLength={20}
                    className={`${inputCls} pl-8 text-xs`}
                  />
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="primaryDriver"
                checked={d.isPrimary}
                onChange={() => updateDriver(i, "isPrimary", true)}
                className="accent-[#1E76B6]"
              />
              <span className="text-[10px] font-medium text-[#173D68]">Conductor principal</span>
            </label>
          </div>
        ))}

        <button
          onClick={addDriver}
          disabled={drivers.length >= 3}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
          style={{
            border: "2px dashed rgba(52,140,203,0.25)",
            color: "#1E76B6",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar Conductor {drivers.length >= 3 && "(máx. 3)"}
        </button>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-[#348CCB]/40 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// Create vehicle drivers section (inline in form)
// =============================================================================

function CreateDriversSection({
  drivers,
  onChange,
}: {
  drivers: Driver[];
  onChange: (d: Driver[]) => void;
}) {
  function add() {
    if (drivers.length >= 3) return;
    onChange([...drivers, { nombre: "", telefono: "", isPrimary: drivers.length === 0 }]);
  }

  function remove(idx: number) {
    const next = drivers.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((d) => d.isPrimary)) next[0].isPrimary = true;
    onChange(next);
  }

  function update(idx: number, field: keyof Driver, value: string | boolean) {
    onChange(
      drivers.map((d, i) => {
        if (i !== idx) {
          if (field === "isPrimary" && value === true) return { ...d, isPrimary: false };
          return d;
        }
        return { ...d, [field]: value };
      }),
    );
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-[#173D68] uppercase tracking-wider mb-1.5">
        Conductores (opcional)
      </label>

      {drivers.map((d, i) => (
        <div key={i} className="flex gap-2 items-start mb-2">
          <input
            type="text"
            value={d.nombre}
            onChange={(e) => update(i, "nombre", e.target.value)}
            placeholder="Nombre"
            maxLength={100}
            className={`${inputCls} flex-1 text-xs`}
          />
          <input
            type="text"
            value={d.telefono}
            onChange={(e) => update(i, "telefono", e.target.value)}
            placeholder="+57 300 123 4567"
            maxLength={20}
            className={`${inputCls} flex-1 text-xs`}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-2 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {drivers.length < 3 && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#1E76B6] hover:opacity-70 transition-opacity mt-1"
        >
          <Plus className="w-3 h-3" /> Agregar conductor
        </button>
      )}
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

  const [createForm, setCreateForm]     = useState<VehicleFormData>(BLANK_FORM);
  const [editForm, setEditForm]       = useState<VehicleFormData>(BLANK_FORM);
  const [createDrivers, setCreateDrivers] = useState<Driver[]>([]);
  const [driverModalVehicle, setDriverModalVehicle] = useState<Vehicle | null>(null);

  const [showUnionInput, setShowUnionInput] = useState<Record<string, boolean>>({});
  const [plateInputs, setPlateInputs]       = useState<Record<string, string>>({});

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    tipo: "Todos", config: "Todos",
  });
  const [filterSearch, setFilterSearch] = useState("");

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
  // Filter options
  // ===========================================================================

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: "tipo",
      label: "Tipo",
      options: ["Todos", ...Array.from(new Set(vehicles.map((v) => labelFor(v.tipovhc)))).sort()],
    },
    {
      key: "config",
      label: "Configuración",
      options: ["Todos", ...Array.from(new Set(vehicles.filter(v => v.configuracion).map((v) => v.configuracion!))).sort()],
    },
  ], [vehicles]);

  // ===========================================================================
  // Filtered vehicles
  // ===========================================================================

  const filtered = useMemo(() => {
    let result = [...vehicles];

    if (filterValues.tipo && filterValues.tipo !== "Todos") {
      result = result.filter((v) => labelFor(v.tipovhc) === filterValues.tipo);
    }
    if (filterValues.config && filterValues.config !== "Todos") {
      result = result.filter((v) => v.configuracion === filterValues.config);
    }
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      result = result.filter((v) =>
        v.placa.toLowerCase().includes(q) ||
        (v.cliente ?? "").toLowerCase().includes(q) ||
        (v.carga ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [vehicles, filterValues, filterSearch]);

  // ===========================================================================
  // Grouping (on filtered)
  // ===========================================================================

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const result: Vehicle[][] = [];
    filtered.forEach((v) => {
      if (seen.has(v.id)) return;
      const group: Vehicle[] = [v];
      seen.add(v.id);
      v.union.forEach((placa) => {
        const peer = filtered.find((x) => x.placa.toUpperCase() === placa.toUpperCase());
        if (peer && !seen.has(peer.id)) { group.push(peer); seen.add(peer.id); }
      });
      result.push(group);
    });
    return result;
  }, [filtered]);

  const connectedGroups = groups.filter((g) => g.length > 1);
  const singleVehicles  = groups.filter((g) => g.length === 1).map((g) => g[0]);

  // ===========================================================================
  // CRUD
  // ===========================================================================

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const validDrivers = createDrivers.filter((d) => d.nombre.trim() && d.telefono.trim());
      const { pctPavimento, configuracion, ...restCreate } = createForm;
      const res = await fetch(`${API_BASE}/vehicles/create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...restCreate,
          placa:          restCreate.placa.trim().toUpperCase(),
          cliente:        restCreate.cliente.trim() || null,
          tipoOperacion:  `${pctPavimento}-${100 - pctPavimento}`,
          configuracion:  configuracion || null,
          companyId,
          ...(validDrivers.length > 0 ? { drivers: validDrivers } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Error al crear");
      const vehicle = await res.json();
      setVehicles((prev) => [...prev, normalise(vehicle)]);
      setCreateForm(BLANK_FORM);
      setCreateDrivers([]);
      setShowCreate(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  function openEdit(vehicle: Vehicle) {
    setVehicleToEdit(vehicle);
    let pctPav = 90;
    if (vehicle.tipoOperacion) {
      const parts = vehicle.tipoOperacion.split("-");
      if (parts.length === 2) pctPav = Number(parts[0]) || 90;
    }
    setEditForm({
      placa:             vehicle.placa.toUpperCase(),
      kilometrajeActual: vehicle.kilometrajeActual,
      carga:             vehicle.carga,
      pesoCarga:         vehicle.pesoCarga,
      tipovhc:           vehicle.tipovhc,
      cliente:           vehicle.cliente ?? "",
      pctPavimento:      pctPav,
      configuracion:     vehicle.configuracion ?? "",
    });
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!vehicleToEdit) return;
    setError("");
    try {
      const { pctPavimento, configuracion, ...rest } = editForm;
      const res = await fetch(`${API_BASE}/vehicles/${vehicleToEdit.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          ...rest,
          placa:          rest.placa.trim().toUpperCase(),
          cliente:        rest.cliente.trim() || null,
          tipoOperacion:  `${pctPavimento}-${100 - pctPavimento}`,
          configuracion:  configuracion || null,
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
        onEditDrivers={() => setDriverModalVehicle(vehicle)}
      />
    );
  }

  // ===========================================================================
  // JSX
  // ===========================================================================

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div>
          <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
            Mis Vehiculos
          </h1>
          <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {vehicles.length} vehiculo{vehicles.length !== 1 ? "s" : ""}
            {vehicles.reduce((s, v) => s + tireCount(v), 0) > 0 && ` · ${vehicles.reduce((s, v) => s + tireCount(v), 0)} llantas`}
          </p>
        </div>
        <button
          onClick={() => { setCreateForm(BLANK_FORM); setCreateDrivers([]); setShowCreate(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl flex items-center justify-between text-sm font-medium bg-red-50 border border-red-200 text-red-700">
            <span>{error}</span>
            <button onClick={() => setError("")} className="hover:opacity-70 ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-32 text-[#1E76B6]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Cargando vehiculos...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Truck className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 text-sm font-medium">Sin vehiculos registrados</p>
            <p className="text-gray-400 text-xs">Usa el boton de arriba para añadir tu primer vehiculo</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Connected groups */}
            {connectedGroups.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#348CCB]">
                    Vehiculos Conectados
                  </h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
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
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#348CCB]">
                    Vehiculos{connectedGroups.length > 0 ? " Individuales" : ""}
                  </h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {singleVehicles.map((v) => renderCard(v, 0, null))}
                </div>
              </section>
            )}

            {filtered.length === 0 && vehicles.length > 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Sin resultados para los filtros seleccionados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter FAB */}
      {!loading && vehicles.length > 0 && (
        <FilterFab
          filters={filterOptions}
          values={filterValues}
          onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
          search={filterSearch}
          onSearchChange={setFilterSearch}
          searchPlaceholder="Buscar por placa, cliente..."
        />
      )}

      {/* -- Modals -- */}

      {showCreate && (
        <Modal title="Nuevo Vehiculo" onClose={() => { setShowCreate(false); setCreateDrivers([]); }}>
          <VehicleForm
            data={createForm}
            onChange={setCreateForm}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setCreateDrivers([]); }}
            label="Crear Vehiculo"
          >
            <CreateDriversSection drivers={createDrivers} onChange={setCreateDrivers} />
          </VehicleForm>
        </Modal>
      )}

      {vehicleToEdit && (
        <Modal title="Editar Vehiculo" onClose={() => setVehicleToEdit(null)}>
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
        <Modal title="Confirmar Eliminacion" onClose={() => setVehicleToDelete(null)} danger>
          <div className="p-6 space-y-5">
            <div className="rounded-xl p-4 text-sm bg-gray-50 border border-gray-200">
              <p className="text-[#173D68]">
                ¿Eliminar el vehiculo{" "}
                <span className="font-black text-[#0A183A] tracking-widest">
                  {vehicleToDelete.placa.toUpperCase()}
                </span>
                ?
              </p>
              <p className="text-gray-500 text-xs mt-1">Sus llantas quedarán sin asignar.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setVehicleToDelete(null)}
                className="flex-1 border border-gray-300 px-4 py-2.5 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(vehicleToDelete.id)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90 bg-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {driverModalVehicle && (
        <DriverModal
          vehicleId={driverModalVehicle.id}
          vehiclePlaca={driverModalVehicle.placa.toUpperCase()}
          initialDrivers={driverModalVehicle.drivers ?? []}
          onClose={() => setDriverModalVehicle(null)}
          onSaved={(saved) => {
            setVehicles((prev) =>
              prev.map((v) =>
                v.id === driverModalVehicle.id ? { ...v, drivers: saved } : v,
              ),
            );
            setDriverModalVehicle(null);
          }}
        />
      )}

      {unionToDelete && (
        <Modal title="Eliminar Conexion" onClose={() => setUnionToDelete(null)}>
          <div className="p-6 space-y-5">
            <div className="rounded-xl p-4 text-sm bg-gray-50 border border-gray-200">
              <p className="text-[#173D68]">
                ¿Eliminar la conexion con{" "}
                <span className="font-black text-[#0A183A] tracking-widest">
                  {unionToDelete.targetPlaca.toUpperCase()}
                </span>
                ?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUnionToDelete(null)}
                className="flex-1 border border-gray-300 px-4 py-2.5 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveUnion(unionToDelete.sourceId, unionToDelete.targetPlaca)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
              >
                Eliminar Conexion
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
