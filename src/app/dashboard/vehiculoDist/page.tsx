"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Plus, Trash2, X, Truck, ChevronDown, Edit, Loader2,
  AlertCircle, Building2, Link2, Search, CheckCircle, Upload, Download, FileSpreadsheet,
} from "lucide-react";
import { AxleConfigPicker, describeAxleConfig } from "@/components/AxleConfigPicker";

// =============================================================================
// Types
// =============================================================================

type Company = { id: string; name: string };

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  carga: string;
  pesoCarga: number;
  tipovhc: string;
  companyId: string;
  tireCount: number;
  union: string[];
  cliente: string | null;
};

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

const VEHICLE_TYPES: Record<string, string> = {
  "2_ejes_trailer":  "Trailer 2 ejes",
  "2_ejes_cabezote": "Cabezote 2 ejes",
  "3_ejes_trailer":  "Trailer 3 ejes",
  "1_eje_cabezote":  "Cabezote 1 eje",
  furgon:            "Furgón",
};

// =============================================================================
// Helpers
// =============================================================================

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

function safeVehicle(v: any): Vehicle {
  return { ...v, union: Array.isArray(v.union) ? v.union : [] };
}

// =============================================================================
// Design-system micro-components (matching DistribuidorPage)
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

function CardTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <h2 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h2>
    </div>
  );
}

/** Modal wrapper */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div
        className="w-full max-w-md my-8 rounded-2xl overflow-hidden"
        style={{ background: "white", boxShadow: "0 24px 80px rgba(10,24,58,0.25)" }}
      >
        {children}
      </div>
    </div>
  );
}

/** Modal header */
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4"
      style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)" }}
    >
      <h2 className="font-black text-white text-base">{title}</h2>
      <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Form field wrapper */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = { border: "1.5px solid rgba(52,140,203,0.2)", color: "#0A183A" };

// =============================================================================
// Vehicle Card
// =============================================================================

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
  onAddUnion,
  onRemoveUnion,
}: {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
  onAddUnion: (placa: string) => void;
  onRemoveUnion: (placa: string) => void;
}) {
  const [showUnionInput, setShowUnionInput] = useState(false);
  const [unionPlaca, setUnionPlaca]         = useState("");

  const rows = [
    { label: "Kilometraje", value: `${vehicle.kilometrajeActual.toLocaleString("es-CO")} km` },
    { label: "Carga",       value: vehicle.carga || "N/A" },
    { label: "Peso",        value: `${vehicle.pesoCarga} kg` },
    { label: "Llantas",     value: String(vehicle.tireCount ?? 0) },
    { label: "Dueño",       value: vehicle.cliente || "Propio" },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg"
      style={{ border: "1.5px solid rgba(52,140,203,0.14)", background: "white" }}
    >
      {/* Header stripe */}
      <div className="h-1" style={{ background: "linear-gradient(90deg, #0A183A, #1E76B6)" }} />

      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-black text-[#0A183A] text-base leading-tight">{vehicle.placa.toUpperCase()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{VEHICLE_TYPES[vehicle.tipovhc] ?? vehicle.tipovhc ?? "Sin tipo"}</p>
          </div>
          {vehicle.union.length > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
            >
              <Link2 className="w-3 h-3" />
              {vehicle.union.length} unión
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="rounded-xl overflow-hidden mb-3" style={{ border: "1px solid rgba(52,140,203,0.1)" }}>
          {rows.map(({ label, value }, i) => (
            <div
              key={label}
              className="flex justify-between items-center px-3 py-1.5 text-xs"
              style={{ background: i % 2 === 0 ? "rgba(10,24,58,0.02)" : "white", borderBottom: "1px solid rgba(52,140,203,0.07)" }}
            >
              <span className="font-bold text-gray-400">{label}</span>
              <span className="font-bold text-[#0A183A]">{value}</span>
            </div>
          ))}
          {vehicle.union.length > 0 && (
            <div className="px-3 py-2" style={{ background: "rgba(30,118,182,0.03)" }}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Uniones</p>
              <div className="flex flex-wrap gap-1">
                {vehicle.union.map((p) => (
                  <button
                    key={p}
                    onClick={() => onRemoveUnion(p)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors hover:bg-red-50"
                    style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
                    title="Eliminar unión"
                  >
                    {p.toUpperCase()}
                    <X className="w-2.5 h-2.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
            style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.15)" }}
          >
            <Edit className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            onClick={() => setShowUnionInput((v) => !v)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
            style={{ background: "rgba(10,24,58,0.05)", color: "#173D68", border: "1px solid rgba(10,24,58,0.1)" }}
          >
            <Link2 className="w-3.5 h-3.5" />
            Unir
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-red-50"
            style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.12)" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Union input */}
        {showUnionInput && (
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              placeholder="Placa del otro vehículo"
              value={unionPlaca}
              onChange={(e) => setUnionPlaca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onAddUnion(unionPlaca.trim()); setUnionPlaca(""); setShowUnionInput(false); }
              }}
              className={`${inputCls} flex-1`}
              style={{ ...inputStyle, fontSize: "12px" }}
            />
            <button
              onClick={() => { onAddUnion(unionPlaca.trim()); setUnionPlaca(""); setShowUnionInput(false); }}
              className="px-3 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
            >
              ➕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Vehicle Form (shared for create / edit)
// =============================================================================

function VehicleForm({
  title,
  companies,
  showClientField,
  defaultCompanyName,
  initialData,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  companies: Company[];
  showClientField: boolean;
  defaultCompanyName?: string;
  initialData?: {
    placa: string; kilometrajeActual: number; carga: string;
    pesoCarga: number; tipovhc: string; cliente: string;
    configuracion?: string | null;
  };
  submitLabel: string;
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    placa:             initialData?.placa             ?? "",
    kilometrajeActual: initialData?.kilometrajeActual ?? 0,
    carga:             initialData?.carga             ?? "",
    pesoCarga:         initialData?.pesoCarga         ?? 0,
    tipovhc:           initialData?.tipovhc           ?? "2_ejes_trailer",
    cliente:           initialData?.cliente           ?? "",
    configuracion:     initialData?.configuracion     ?? "",
    companyName:       defaultCompanyName             ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState("");

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (showClientField && !form.companyName) { setFormError("Por favor seleccione un cliente."); return; }
    setSubmitting(true); setFormError("");
    try {
      const company = companies.find((c) => c.name === form.companyName);
      await onSubmit({ ...form, companyId: company?.id });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={title} onClose={onClose} />
      <form onSubmit={handleSubmit} className="p-5 space-y-3">
        {formError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{formError}
          </div>
        )}

        {showClientField && (
          <Field label="Cliente" required>
            <select
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              required
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Seleccione un cliente…</option>
              {companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Placa" required>
            <input type="text" required value={form.placa}
              onChange={(e) => set("placa", e.target.value)}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Kilometraje">
            <input type="number" value={form.kilometrajeActual}
              onChange={(e) => set("kilometrajeActual", parseInt(e.target.value) || 0)}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Carga">
            <input type="text" value={form.carga}
              onChange={(e) => set("carga", e.target.value)}
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Peso (kg)">
            <input type="number" value={form.pesoCarga}
              onChange={(e) => set("pesoCarga", parseFloat(e.target.value) || 0)}
              className={inputCls} style={inputStyle} />
          </Field>
        </div>

        <Field label="Tipo de Vehículo">
          <select value={form.tipovhc} onChange={(e) => set("tipovhc", e.target.value)}
            className={inputCls} style={inputStyle}>
            {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>

        <Field label="Estructura (configuración de ejes)">
          <AxleConfigPicker
            value={form.configuracion ?? ""}
            onChange={(next) => set("configuracion", next)}
          />
          {form.configuracion && (
            <p className="text-[10px] text-gray-500 mt-2">
              {describeAxleConfig(form.configuracion)}
            </p>
          )}
        </Field>

        <Field label="Dueño (opcional)">
          <input type="text" value={form.cliente} placeholder="Nombre del cliente"
            onChange={(e) => set("cliente", e.target.value)}
            className={inputCls} style={inputStyle} />
        </Field>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors"
            style={{ background: "rgba(10,24,58,0.06)", color: "#0A183A" }}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</> : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// =============================================================================
// Main page
// =============================================================================

export default function VehiculoPage() {
  const [vehicles,        setVehicles]        = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error,           setError]           = useState("");
  const [companies,       setCompanies]       = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [clientSearch,    setClientSearch]    = useState("");

  // Modal state
  const [showCreate,    setShowCreate]    = useState(false);
  const [showBulk,      setShowBulk]      = useState(false);
  const [bulkRows,      setBulkRows]      = useState<Record<string, any>[]>([]);
  const [bulkFileName,  setBulkFileName]  = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult,    setBulkResult]    = useState<{ ok: number; failed: { row: number; placa: string; error: string }[] } | null>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [vehicleToDel,  setVehicleToDel]  = useState<Vehicle | null>(null);
  const [unionToDel,    setUnionToDel]    = useState<{ sourceId: string; targetPlaca: string } | null>(null);

  // -- Fetch companies --------------------------------------------------------
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/companies/me/clients`);
      if (!res.ok) return;
      const data = await res.json();
      const list: Company[] = data.map((a: any) => ({ id: a.company.id, name: a.company.name }));
      setCompanies(list);
      if (list.length > 0) setSelectedCompany((cur) => cur || list[0].name);
    } catch {/* silent */}
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // -- Fetch vehicles + per-vehicle tire counts -------------------------------
  // The /vehicles endpoint doesn't include tire counts, so we fetch the
  // company's tires in parallel and group them by vehicleId, then merge the
  // counts onto each vehicle. Without this every card showed 0 llantas.
  const fetchVehicles = useCallback(async (companyId: string) => {
    setLoadingVehicles(true); setError("");
    try {
      const [vRes, tRes] = await Promise.all([
        authFetch(`${API_BASE}/vehicles?companyId=${companyId}`),
        authFetch(`${API_BASE}/tires?companyId=${companyId}`),
      ]);
      if (!vRes.ok) throw new Error("Error al obtener vehículos.");
      const vData = await vRes.json();
      const tData: any[] = tRes.ok ? await tRes.json() : [];

      const countByVehicle: Record<string, number> = {};
      tData.forEach((t) => {
        if (t?.vehicleId) {
          countByVehicle[t.vehicleId] = (countByVehicle[t.vehicleId] ?? 0) + 1;
        }
      });

      return (vData as any[]).map((v) => {
        const safe = safeVehicle(v);
        return { ...safe, tireCount: countByVehicle[safe.id] ?? safe.tireCount ?? 0 };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      return [];
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    if (!companies.length || !selectedCompany) { setVehicles([]); return; }
    const run = async () => {
      const co = companies.find((c) => c.name === selectedCompany);
      if (co) setVehicles(await fetchVehicles(co.id));
      else setVehicles([]);
    };
    run();
  }, [selectedCompany, companies, fetchVehicles]);

  // -- Organized groups -------------------------------------------------------
  const organizedVehicles = useMemo(() => {
    const processed = new Set<string>();
    const groups: Vehicle[][] = [];
    for (const vehicle of vehicles) {
      if (processed.has(vehicle.id)) continue;
      const group: Vehicle[] = [vehicle];
      processed.add(vehicle.id);
      for (const connPlaca of (vehicle.union ?? [])) {
        const conn = vehicles.find((v) => v.placa === connPlaca);
        if (conn && !processed.has(conn.id)) { group.push(conn); processed.add(conn.id); }
      }
      groups.push(group);
    }
    return groups;
  }, [vehicles]);

  const connectedGroups   = organizedVehicles.filter((g) => g.length > 1);
  const individualGroups  = organizedVehicles.filter((g) => g.length === 1);

  // -- CRUD handlers ----------------------------------------------------------
  async function handleCreate(data: any) {
    const res = await authFetch(`${API_BASE}/vehicles/create`, {
      method: "POST",
      body: JSON.stringify({
        placa:             data.placa.toLowerCase(),
        kilometrajeActual: data.kilometrajeActual,
        carga:             data.carga || "n/a",
        pesoCarga:         data.pesoCarga,
        tipovhc:           data.tipovhc,
        companyId:         data.companyId,
        cliente:           data.cliente.trim() || null,
        configuracion:     data.configuracion?.trim() || null,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Error al crear vehículo"); }
    const body = await res.json();
    // API may return { vehicle } or the vehicle directly
    const nv = safeVehicle(body.vehicle ?? body);
    setVehicles((vs) => [...vs, nv]);
    setShowCreate(false);
  }

  // Bulk vehicle upload — read an .xlsx file with one row per vehicle.
  // Supported columns (case + accent insensitive, any order):
  //   placa, km, tipovhc, carga, pesoCarga, cliente, configuracion
  // Minimum required: placa.
  function fieldKey(raw: string): string | null {
    const k = String(raw ?? "").toLowerCase().replace(/\s+/g, "")
      .replace(/[áàä]/g, "a").replace(/[éè]/g, "e").replace(/[íì]/g, "i")
      .replace(/[óò]/g, "o").replace(/[úù]/g, "u");
    if (k.includes("placa")) return "placa";
    if (k.includes("km") || k.includes("kilometr")) return "kilometrajeActual";
    if (k.includes("tipo")) return "tipovhc";
    if (k.includes("pesocarga") || k === "peso") return "pesoCarga";
    if (k.includes("carga")) return "carga";
    if (k.includes("cliente")) return "cliente";
    if (k.includes("config") || k.includes("ejes")) return "configuracion";
    return null;
  }

  function downloadBulkTemplate() {
    const sample = [
      { placa: "ABC123", km: 150000, tipovhc: "2_ejes_trailer", configuracion: "2-4", carga: "seco", pesoCarga: 30000, cliente: "" },
      { placa: "XYZ789", km: 80000,  tipovhc: "3_ejes_trailer", configuracion: "2-4-4", carga: "liquido", pesoCarga: 25000, cliente: "" },
      { placa: "DEF456", km: "",     tipovhc: "", configuracion: "2-2", carga: "", pesoCarga: "", cliente: "" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: ["placa", "km", "tipovhc", "configuracion", "carga", "pesoCarga", "cliente"] });
    ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehiculos");
    XLSX.writeFile(wb, "tirepro-vehiculos-plantilla.xlsx");
  }

  function handleBulkFile(e: React.ChangeEvent<HTMLInputElement>) {
    setBulkResult(null);
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
        // Normalise header keys to canonical fields
        const normalised = raw.map((row) => {
          const out: Record<string, any> = {};
          Object.entries(row).forEach(([k, v]) => {
            const fk = fieldKey(k);
            if (fk) out[fk] = v;
          });
          return out;
        }).filter((r) => String(r.placa ?? "").trim() !== "");
        setBulkRows(normalised);
        if (normalised.length === 0) {
          setError("El archivo no contiene filas con placa válida");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo leer el archivo");
        setBulkRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleBulkUpload() {
    const co = companies.find((c) => c.name === selectedCompany);
    if (!co) { setError("Seleccione un cliente antes de hacer carga masiva"); return; }
    if (bulkRows.length === 0) { setError("Sube un archivo con al menos una placa"); return; }

    setBulkSubmitting(true);
    setError("");

    // Build the entire payload, then ship it as a single bulk request so
    // the backend's throttler only counts it once. The bulk endpoint runs
    // each insert serially under @SkipThrottle and returns ok/failed per
    // placa.
    const payload = bulkRows.map((row, i) => ({
      _row: i + 2,
      placa: String(row.placa || "").trim().toLowerCase(),
      kilometrajeActual: Number(row.kilometrajeActual) || 0,
      tipovhc: String(row.tipovhc || "").trim() || "2_ejes_trailer",
      carga: String(row.carga || "").trim() || "n/a",
      pesoCarga: Number(row.pesoCarga) || 0,
      cliente: String(row.cliente || "").trim() || null,
      configuracion: String(row.configuracion || "").trim() || null,
      companyId: co.id,
      tipoOperacion: "90-10",
    }));

    const rowMap: Record<string, number> = {};
    payload.forEach((p) => { if (p.placa) rowMap[p.placa] = p._row; });

    const created: Vehicle[] = [];
    const failed: { row: number; placa: string; error: string }[] = [];

    try {
      const res = await authFetch(`${API_BASE}/vehicles/bulk-create`, {
        method: "POST",
        body: JSON.stringify({
          vehicles: payload.map(({ _row, ...rest }) => rest),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      (data.created ?? []).forEach((v: any) => created.push(safeVehicle(v)));
      (data.failed ?? []).forEach((f: any) => {
        const placa = String(f.placa ?? "").toLowerCase();
        failed.push({ row: rowMap[placa] ?? 0, placa: f.placa, error: f.error });
      });
    } catch (err) {
      // Fall back to per-row sequential create if the bulk endpoint isn't
      // deployed yet — keeps existing deploys working. IMPORTANT: strip
      // _row before sending or the strict DTO will reject the request.
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (const p of payload) {
        const { _row, ...rowBody } = p;
        if (!rowBody.placa) {
          failed.push({ row: _row, placa: "(vacío)", error: "Sin placa" });
          continue;
        }
        try {
          const r = await authFetch(`${API_BASE}/vehicles/create`, {
            method: "POST",
            body: JSON.stringify(rowBody),
          });
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.message || `HTTP ${r.status}`);
          }
          const json = await r.json();
          created.push(safeVehicle(json.vehicle ?? json));
        } catch (e) {
          failed.push({ row: _row, placa: rowBody.placa, error: e instanceof Error ? e.message : "Error" });
        }
        await sleep(1500); // very conservative fallback pacing
      }
      if (failed.length === 0 && created.length === 0) {
        // Surface the bulk error if both paths failed completely
        failed.push({ row: 0, placa: "(bulk)", error: err instanceof Error ? err.message : "Error" });
      }
    }

    setVehicles((prev) => {
      const known = new Set(prev.map((v) => v.id));
      return [...prev, ...created.filter((v) => !known.has(v.id))];
    });
    setBulkResult({ ok: created.length, failed });
    setBulkSubmitting(false);
  }

  async function handleEdit(data: any) {
    if (!vehicleToEdit) return;
    const res = await authFetch(`${API_BASE}/vehicles/${vehicleToEdit.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        placa:             data.placa.toLowerCase(),
        kilometrajeActual: data.kilometrajeActual,
        carga:             data.carga || "n/a",
        pesoCarga:         data.pesoCarga,
        tipovhc:           data.tipovhc,
        cliente:           data.cliente.trim() || null,
        configuracion:     data.configuracion?.trim() || null,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Error al actualizar vehículo"); }
    const body = await res.json();
    const nv   = safeVehicle(body.vehicle ?? body);
    setVehicles((vs) => vs.map((v) => (v.id === nv.id ? nv : v)));
    setVehicleToEdit(null);
  }

  async function handleDelete(vehicleId: string) {
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/vehicles/${vehicleId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Error al eliminar"); }
      setVehicles((vs) => vs.filter((v) => v.id !== vehicleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function handleAddUnion(vehicleId: string, placa: string) {
    if (!placa) return;
    try {
      const res = await authFetch(`${API_BASE}/vehicles/${vehicleId}/union/add`, {
        method: "PATCH",
        body: JSON.stringify({ placa }),
      });
      if (!res.ok) throw new Error("Fallo al añadir unión");
      const body = await res.json();
      const nv   = safeVehicle(body.vehicle ?? body);
      setVehicles((vs) => vs.map((v) => (v.id === nv.id ? nv : v)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function handleRemoveUnion(sourceId: string, targetPlaca: string) {
    try {
      const res = await authFetch(`${API_BASE}/vehicles/${sourceId}/union/remove`, {
        method: "PATCH",
        body: JSON.stringify({ placa: targetPlaca }),
      });
      if (!res.ok) throw new Error("Fallo al eliminar unión");
      const body = await res.json();
      const nv   = safeVehicle(body.vehicle ?? body);
      setVehicles((vs) => vs.map((v) => (v.id === nv.id ? nv : v)));
      setUnionToDel(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  // -- Dropdown options -------------------------------------------------------
  const filteredOptions = useMemo(() => {
    const all = companies.map((c) => c.name);
    return clientSearch.trim()
      ? all.filter((o) => o.toLowerCase().includes(clientSearch.toLowerCase()))
      : all;
  }, [companies, clientSearch]);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* -- Page header ------------------------------------------------- */}
        <div
          className="px-4 sm:px-6 py-4 sm:py-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)", boxShadow: "0 8px 32px rgba(10,24,58,0.22)" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none tracking-tight">Gestión de Vehículos</h1>
              <p className="text-xs text-white/60 mt-0.5">{vehicles.length} vehículo{vehicles.length !== 1 ? "s" : ""} cargado{vehicles.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Client selector */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: selectedCompany ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                }}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{selectedCompany || "Seleccionar cliente"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
              </button>

              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div
                    className="absolute right-0 mt-1 w-56 rounded-xl overflow-hidden z-20"
                    style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)", boxShadow: "0 8px 32px rgba(10,24,58,0.15)" }}
                  >
                    <div className="p-2 border-b" style={{ borderColor: "rgba(52,140,203,0.12)" }}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          autoFocus type="text" placeholder="Buscar cliente…"
                          value={clientSearch} onChange={(e) => setClientSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                          style={{ border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {filteredOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => { setSelectedCompany(opt); setShowDropdown(false); setClientSearch(""); }}
                          className="block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F0F7FF]"
                          style={{ color: selectedCompany === opt ? "#1E76B6" : "#0A183A", fontWeight: selectedCompany === opt ? 700 : 400 }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bulk upload button */}
            <button
              onClick={() => { setShowBulk(true); setBulkResult(null); setBulkText(""); }}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.2)" }}
              title="Pega múltiples placas para crear varios vehículos"
            >
              <Plus className="w-3.5 h-3.5" />
              Carga masiva
            </button>

            {/* Add button */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* -- Vehicle list ------------------------------------------------ */}
        <Card className="overflow-hidden">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
            <CardTitle icon={Truck} title="Lista de Vehículos" />
            {!loadingVehicles && vehicles.length > 0 && (
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full ml-auto"
                style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
              >
                {vehicles.length} vehículo{vehicles.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loadingVehicles ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#1E76B6]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Cargando vehículos…</span>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Truck className="w-10 h-10 opacity-30" />
              <p className="text-sm">No se encontraron vehículos.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-8">

              {/* Connected groups */}
              {connectedGroups.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                      <Link2 className="w-3.5 h-3.5 text-[#1E76B6]" />
                    </div>
                    <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide">Vehículos Conectados</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}>
                      {connectedGroups.length} grupo{connectedGroups.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-6">
                    {connectedGroups.map((group, gi) => (
                      <div key={`cg-${gi}`} className="relative">
                        {/* Connection line */}
                        <div
                          className="absolute top-[72px] left-[calc(theme(spacing.4)+160px)] right-[calc(theme(spacing.4)+160px)] h-0.5 hidden md:block"
                          style={{ background: "linear-gradient(90deg, #1E76B6, #0A183A)", opacity: 0.3, zIndex: 0 }}
                        />
                        <div className="flex flex-wrap gap-4 relative z-10">
                          {group.map((vehicle) => (
                            <div key={vehicle.id} className="flex-shrink-0">
                              <VehicleCard
                                vehicle={vehicle}
                                onEdit={() => setVehicleToEdit(vehicle)}
                                onDelete={() => setVehicleToDel(vehicle)}
                                onAddUnion={(p) => handleAddUnion(vehicle.id, p)}
                                onRemoveUnion={(p) => setUnionToDel({ sourceId: vehicle.id, targetPlaca: p })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {connectedGroups.length > 0 && individualGroups.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(52,140,203,0.12)" }} />
              )}

              {/* Individual vehicles */}
              {individualGroups.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded-lg" style={{ background: "rgba(10,24,58,0.06)" }}>
                      <Truck className="w-3.5 h-3.5 text-[#173D68]" />
                    </div>
                    <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide">Vehículos Individuales</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(10,24,58,0.06)", color: "#173D68" }}>
                      {individualGroups.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {individualGroups.map((group) => (
                      <VehicleCard
                        key={group[0].id}
                        vehicle={group[0]}
                        onEdit={() => setVehicleToEdit(group[0])}
                        onDelete={() => setVehicleToDel(group[0])}
                        onAddUnion={(p) => handleAddUnion(group[0].id, p)}
                        onRemoveUnion={(p) => setUnionToDel({ sourceId: group[0].id, targetPlaca: p })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* -- Modals ------------------------------------------------------- */}

      {/* Bulk upload — XLSX file */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden" style={{ boxShadow: "0 32px 80px -16px rgba(10,24,58,0.4)" }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Vehículos · Carga masiva</p>
                <h3 className="text-lg font-black text-white mt-0.5">Subir un archivo Excel</h3>
              </div>
              <button onClick={() => { setShowBulk(false); setBulkResult(null); setBulkRows([]); setBulkFileName(""); }} className="p-1.5 rounded-lg text-white/80 hover:bg-white/15">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="rounded-2xl p-3.5 text-[11px] text-[#0A183A]" style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.18)" }}>
                <p className="font-black mb-1.5 text-[12px]">Cómo funciona</p>
                <ol className="text-gray-600 leading-relaxed list-decimal pl-4 space-y-1">
                  <li>Descarga la plantilla Excel.</li>
                  <li>Llena una fila por vehículo. Solo la <strong>placa</strong> es obligatoria.</li>
                  <li>Sube el archivo y dale clic a &ldquo;Crear vehículos&rdquo;.</li>
                </ol>
                <button
                  onClick={downloadBulkTemplate}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black text-[#1E76B6] bg-white border border-[#1E76B6]/30 hover:bg-[#F0F7FF] transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Descargar plantilla .xlsx
                </button>
              </div>

              {/* Drop / pick area */}
              <div>
                <label className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest block mb-1.5">Archivo Excel</label>
                <input
                  ref={bulkFileRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleBulkFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bulkFileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed transition-colors hover:bg-[#F0F7FF]"
                  style={{ borderColor: bulkFileName ? "#1E76B6" : "rgba(30,118,182,0.3)", background: bulkFileName ? "rgba(30,118,182,0.04)" : "white" }}
                >
                  {bulkFileName ? (
                    <>
                      <FileSpreadsheet className="w-8 h-8 text-[#1E76B6]" />
                      <p className="text-sm font-black text-[#0A183A]">{bulkFileName}</p>
                      <p className="text-[11px] text-gray-500">{bulkRows.length} vehículo{bulkRows.length !== 1 ? "s" : ""} listo{bulkRows.length !== 1 ? "s" : ""} para crear</p>
                      <p className="text-[10px] text-[#1E76B6] font-bold mt-1">Click para cambiar el archivo</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-[#1E76B6]" />
                      <p className="text-sm font-black text-[#0A183A]">Click para seleccionar un .xlsx</p>
                      <p className="text-[11px] text-gray-500">o arrastra el archivo aquí</p>
                    </>
                  )}
                </button>
              </div>

              {/* Preview of first 5 rows */}
              {bulkRows.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1.5">Vista previa</p>
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <table className="w-full text-[11px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-black text-gray-500">Placa</th>
                          <th className="text-left px-2 py-1.5 font-black text-gray-500">Km</th>
                          <th className="text-left px-2 py-1.5 font-black text-gray-500">Configuración</th>
                          <th className="text-left px-2 py-1.5 font-black text-gray-500">Cliente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1.5 font-mono font-bold text-[#0A183A]">{String(r.placa ?? "").toUpperCase()}</td>
                            <td className="px-2 py-1.5 text-gray-600">{r.kilometrajeActual ?? ""}</td>
                            <td className="px-2 py-1.5 text-gray-600">{r.configuracion ?? ""}</td>
                            <td className="px-2 py-1.5 text-gray-600 truncate max-w-[120px]">{r.cliente ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkRows.length > 5 && (
                      <p className="text-[10px] text-gray-400 px-2 py-1.5 bg-gray-50 border-t border-gray-100">
                        + {bulkRows.length - 5} fila{bulkRows.length - 5 !== 1 ? "s" : ""} más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {bulkResult && (
                <div className="space-y-2">
                  <div className="rounded-xl px-3 py-2.5 text-xs flex items-center gap-2"
                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#166534" }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-black">{bulkResult.ok}</span> vehículos creados correctamente
                  </div>
                  {bulkResult.failed.length > 0 && (
                    <div className="rounded-xl px-3 py-2.5 text-[11px]"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", color: "#991b1b" }}>
                      <p className="font-black mb-1">{bulkResult.failed.length} fila{bulkResult.failed.length !== 1 ? "s" : ""} con error:</p>
                      <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                        {bulkResult.failed.map((f, i) => (
                          <li key={i} className="font-mono text-[10px]">
                            fila {f.row} · <strong>{f.placa}</strong> — {f.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowBulk(false); setBulkResult(null); setBulkRows([]); setBulkFileName(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50">
                  Cerrar
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={bulkSubmitting || bulkRows.length === 0 || !selectedCompany}
                  className="flex-[1.5] py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                >
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Crear {bulkRows.length} vehículo{bulkRows.length !== 1 ? "s" : ""}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create */}
      {showCreate && (
        <VehicleForm
          title="Crear Vehículo"
          companies={companies}
          showClientField
          submitLabel="Crear"
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit */}
      {vehicleToEdit && (
        <VehicleForm
          title="Editar Vehículo"
          companies={companies}
          showClientField={false}
          defaultCompanyName={companies.find((c) => c.id === vehicleToEdit.companyId)?.name}
          initialData={{
            placa:             vehicleToEdit.placa,
            kilometrajeActual: vehicleToEdit.kilometrajeActual,
            carga:             vehicleToEdit.carga,
            pesoCarga:         vehicleToEdit.pesoCarga,
            tipovhc:           vehicleToEdit.tipovhc,
            cliente:           vehicleToEdit.cliente ?? "",
            configuracion:     (vehicleToEdit as any).configuracion ?? "",
          }}
          submitLabel="Guardar Cambios"
          onSubmit={handleEdit}
          onClose={() => setVehicleToEdit(null)}
        />
      )}

      {/* Delete vehicle */}
      {vehicleToDel && (
        <Modal onClose={() => setVehicleToDel(null)}>
          <ModalHeader title="Eliminar Vehículo" onClose={() => setVehicleToDel(null)} />
          <div className="p-5">
            <p className="text-sm text-[#0A183A] mb-1">
              ¿Eliminar <strong>{vehicleToDel.placa.toUpperCase()}</strong>?
            </p>
            <p className="text-xs text-gray-400 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setVehicleToDel(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors"
                style={{ background: "rgba(10,24,58,0.06)", color: "#0A183A" }}>
                Cancelar
              </button>
              <button
                onClick={async () => { await handleDelete(vehicleToDel.id); setVehicleToDel(null); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)" }}>
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove union */}
      {unionToDel && (
        <Modal onClose={() => setUnionToDel(null)}>
          <ModalHeader title="Eliminar Conexión" onClose={() => setUnionToDel(null)} />
          <div className="p-5">
            <p className="text-sm text-[#0A183A] mb-1">¿Eliminar la conexión con <strong>{unionToDel.targetPlaca.toUpperCase()}</strong>?</p>
            <p className="text-xs text-gray-400 mb-5">Los vehículos quedarán desvinculados.</p>
            <div className="flex gap-2">
              <button onClick={() => setUnionToDel(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors"
                style={{ background: "rgba(10,24,58,0.06)", color: "#0A183A" }}>
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveUnion(unionToDel.sourceId, unionToDel.targetPlaca)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                Eliminar Conexión
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}