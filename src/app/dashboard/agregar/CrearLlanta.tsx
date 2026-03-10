"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Circle,
  Search,
  ChevronDown,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Truck,
  Hash,
  Tag,
  Layers,
  Gauge,
  Ruler,
  Navigation,
  Milestone,
  DollarSign,
  RefreshCw,
  MapPin,
  Plus,
} from "lucide-react";

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
  tireCount?: number;
  _count?: { tires: number };
};

type TireFormData = {
  tirePlaca: string;
  marca: string;
  diseno: string;
  profundidadInicial: number | "";
  dimension: string;
  eje: string;
  kilometrosRecorridos: number | "";
  costo: number | "";
  vida: string;
  posicion: number | "";
};

const BLANK_FORM: TireFormData = {
  tirePlaca: "",
  marca: "",
  diseno: "",
  profundidadInicial: "",
  dimension: "",
  eje: "direccion",
  kilometrosRecorridos: "",
  costo: "",
  vida: "nueva",
  posicion: "",
};

const EJE_OPTIONS = [
  { value: "direccion", label: "Dirección" },
  { value: "traccion",  label: "Tracción"  },
  { value: "libre",     label: "Libre"      },
  { value: "repuesto",  label: "Repuesto"   },
];

const VIDA_OPTIONS = [
  { value: "nueva",       label: "Nueva"             },
  { value: "reencauche1", label: "Primer Reencauche"  },
  { value: "reencauche2", label: "Segundo Reencauche" },
  { value: "reencauche3", label: "Tercer Reencauche"  },
];

// =============================================================================
// Helpers
// =============================================================================

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// =============================================================================
// Shared primitives — consistent with vehicle page
// =============================================================================

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

const selectCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all appearance-none pr-8";

function FieldLabel({
  icon: Icon,
  label,
  required,
}: {
  icon: React.ElementType;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#173D68] uppercase tracking-wider mb-1.5">
      <Icon className="w-3.5 h-3.5 text-[#1E76B6]" />
      {label}
      {required && <span className="text-[#348CCB] font-bold">*</span>}
    </label>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#1E76B6]" />
    </div>
  );
}

// =============================================================================
// Section header
// =============================================================================

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div
        className="p-2 rounded-xl flex-shrink-0"
        style={{ background: "rgba(30,118,182,0.12)" }}
      >
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#0A183A] leading-none">{title}</p>
        {subtitle && (
          <p className="text-xs text-[#348CCB] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Divider
// =============================================================================

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.18)" }} />
      <span className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-[0.15em] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(52,140,203,0.18)" }} />
    </div>
  );
}

// =============================================================================
// Vehicle search dropdown
// =============================================================================

function VehicleSearchDropdown({
  vehicles,
  loading,
  selected,
  onSelect,
  onClear,
}: {
  vehicles: Vehicle[];
  loading: boolean;
  selected: Vehicle | null;
  onSelect: (v: Vehicle) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  // Sync display when external clear is called
  useEffect(() => {
    if (!selected) setQuery("");
  }, [selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = vehicles.filter(
    (v) =>
      v.placa.toUpperCase().includes(query.toUpperCase()) ||
      v.tipovhc.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(v: Vehicle) {
    onSelect(v);
    setQuery(v.placa.toUpperCase());
    setOpen(false);
  }

  function handleClear() {
    onClear();
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-[#1E76B6] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por placa o tipo..."
          disabled={loading}
          className={`${inputCls} pl-9 pr-9`}
          style={{ textTransform: "uppercase" }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 w-4 h-4 text-[#1E76B6] animate-spin" />
        )}
        {!loading && selected && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 text-[#348CCB] hover:text-[#0A183A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {!loading && !selected && (
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-[#1E76B6] pointer-events-none" />
        )}
      </div>

      {/* Selected badge */}
      {selected && (
        <div
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{
            background: "rgba(30,118,182,0.08)",
            border: "1px solid rgba(30,118,182,0.25)",
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
          <span className="font-black tracking-widest text-[#0A183A] text-sm">
            {selected.placa.toUpperCase()}
          </span>
          <span className="text-[#348CCB] text-xs">— {selected.tipovhc}</span>
        </div>
      )}

      {/* Dropdown */}
      {open && !loading && (
        <div
          className="absolute z-50 w-full mt-1.5 rounded-2xl overflow-hidden"
          style={{
            background: "white",
            border: "1px solid rgba(52,140,203,0.25)",
            boxShadow: "0 8px 32px rgba(10,24,58,0.12)",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          {/* No vehicle option */}
          <button
            type="button"
            onClick={handleClear}
            className="w-full text-left px-4 py-3 text-sm text-[#348CCB] font-medium hover:bg-[#F0F7FF] transition-colors border-b border-[#348CCB]/10"
          >
            — Sin vehículo (opcional)
          </button>

          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Truck className="w-8 h-8 text-[#348CCB]/30 mx-auto mb-2" />
              <p className="text-sm text-[#348CCB]">No se encontraron vehículos</p>
            </div>
          ) : (
            filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelect(v)}
                className="w-full text-left px-4 py-3 transition-colors border-b border-[#348CCB]/08 last:border-0 hover:bg-[#F0F7FF]"
              >
                <p className="font-black tracking-widest text-[#0A183A] text-sm">
                  {v.placa.toUpperCase()}
                </p>
                <p className="text-xs text-[#348CCB] mt-0.5">
                  {v.tipovhc} · {v.carga || "sin carga"}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Toast notification
// =============================================================================

function Toast({
  type,
  message,
  onDismiss,
}: {
  type: "error" | "success";
  message: string;
  onDismiss: () => void;
}) {
  const isError = type === "error";
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: isError ? "rgba(10,24,58,0.06)" : "rgba(30,118,182,0.08)",
        border: isError
          ? "1px solid rgba(10,24,58,0.2)"
          : "1px solid rgba(30,118,182,0.3)",
        color: "#0A183A",
      }}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0 mt-0.5" />
      )}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-[#348CCB] hover:text-[#0A183A] transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function TirePage() {
  const router = useRouter();

  const [companyId, setCompanyId]       = useState("");
  const [vehicles, setVehicles]         = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelected]  = useState<Vehicle | null>(null);
  const [loadingVehicles, setLoadingV]  = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [form, setForm]                 = useState<TireFormData>(BLANK_FORM);

  // ===========================================================================
  // Bootstrap
  // ===========================================================================

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
  }, [router]);

  async function fetchVehicles(cId: string) {
    setLoadingV(true);
    try {
      const res = await fetch(`${API_BASE}/vehicles?companyId=${cId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Error al cargar vehículos");
      const data: Vehicle[] = await res.json();
      setVehicles(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoadingV(false);
    }
  }

  // ===========================================================================
  // Form helpers
  // ===========================================================================

  function set(field: keyof TireFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value, type } = e.target as HTMLInputElement;
      setForm((prev) => ({
        ...prev,
        [field]:
          type === "number"
            ? value === "" ? "" : Number(value)
            : field === "tirePlaca"
            ? value.toUpperCase()
            : value,
      }));
    };
  }

  // ===========================================================================
  // Submit
  // ===========================================================================

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const now       = new Date().toISOString();
    const finalId   = form.tirePlaca.trim() !== "" ? form.tirePlaca.trim() : generateRandomString(8);

    const payload = {
      placa:                finalId.toUpperCase(),
      marca:                form.marca.trim().toLowerCase(),
      diseno:               form.diseno.trim().toLowerCase(),
      profundidadInicial:   Number(form.profundidadInicial) || 0,
      dimension:            form.dimension.trim().toLowerCase(),
      eje:                  form.eje.toLowerCase(),
      kilometrosRecorridos: Number(form.kilometrosRecorridos) || 0,
      costo: [{ valor: Number(form.costo) || 0, fecha: now }],
      eventos: [
        {
          tipo:     "montaje",
          fecha:    now,
          notas:    form.vida.toLowerCase(),
          metadata: { vidaValor: form.vida.toLowerCase() },
        },
      ],
      posicion: Number(form.posicion) || 0,
      companyId,
      vehicleId:            selectedVehicle?.id ?? null,
    };

    try {
      const res = await fetch(`${API_BASE}/tires/create`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? "Error al crear llanta");
      }
      setSuccess("Llanta creada exitosamente");
      setForm(BLANK_FORM);
      setSelected(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  // ===========================================================================
  // JSX
  // ===========================================================================

  return (
    <div className="min-h-screen antialiased" style={{ background: "#fff", color: "#0A183A" }}>
      {/* Content */}
      <div className="px-4 py-8 max-w-3xl mx-auto">

        {/* Notifications */}
        <div className="space-y-3 mb-6">
          {error   && <Toast type="error"   message={error}   onDismiss={() => setError("")}   />}
          {success && <Toast type="success" message={success} onDismiss={() => setSuccess("")} />}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Vehicle selector ───────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "white",
              border: "1px solid rgba(52,140,203,0.18)",
              boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
            }}
          >
            <SectionHeader
              icon={Truck}
              title="Vehículo"
              subtitle="Seleccione el vehículo para asociar la llanta (opcional)"
            />
            <VehicleSearchDropdown
              vehicles={vehicles}
              loading={loadingVehicles}
              selected={selectedVehicle}
              onSelect={setSelected}
              onClear={() => setSelected(null)}
            />
          </div>

          {/* ── Identification ─────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "white",
              border: "1px solid rgba(52,140,203,0.18)",
              boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
            }}
          >
            <SectionHeader
              icon={Hash}
              title="Identificación"
              subtitle="Datos de identidad de la llanta"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tire ID */}
              <div>
                <FieldLabel icon={Hash} label="ID de la Llanta" />
                <input
                  type="text"
                  value={form.tirePlaca}
                  onChange={set("tirePlaca")}
                  placeholder="Dejar vacío para generar automático"
                  className={inputCls}
                  style={{ textTransform: "uppercase" }}
                />
              </div>

              {/* Posición */}
              <div>
                <FieldLabel icon={MapPin} label="Posición" required />
                <input
                  type="number"
                  value={form.posicion}
                  onChange={set("posicion")}
                  required
                  min={1}
                  placeholder="ej: 1"
                  className={inputCls}
                />
              </div>

              {/* Marca */}
              <div>
                <FieldLabel icon={Tag} label="Marca" required />
                <input
                  type="text"
                  value={form.marca}
                  onChange={set("marca")}
                  required
                  placeholder="ej: Michelin"
                  className={inputCls}
                />
              </div>

              {/* Diseño */}
              <div>
                <FieldLabel icon={Layers} label="Diseño" required />
                <input
                  type="text"
                  value={form.diseno}
                  onChange={set("diseno")}
                  required
                  placeholder="ej: XDS2"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── Technical specs ────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "white",
              border: "1px solid rgba(52,140,203,0.18)",
              boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
            }}
          >
            <SectionHeader
              icon={Gauge}
              title="Especificaciones Técnicas"
              subtitle="Medidas y configuración del eje"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Profundidad Inicial */}
              <div>
                <FieldLabel icon={Gauge} label="Profundidad Inicial (mm)" required />
                <input
                  type="number"
                  value={form.profundidadInicial}
                  onChange={set("profundidadInicial")}
                  required
                  step="0.1"
                  min={0}
                  placeholder="ej: 22"
                  className={inputCls}
                />
              </div>

              {/* Dimensión */}
              <div>
                <FieldLabel icon={Ruler} label="Dimensión" required />
                <input
                  type="text"
                  value={form.dimension}
                  onChange={set("dimension")}
                  required
                  placeholder="ej: 295/80R22.5"
                  className={inputCls}
                />
              </div>

              {/* Eje */}
              <div>
                <FieldLabel icon={Navigation} label="Eje" required />
                <SelectWrapper>
                  <select
                    value={form.eje}
                    onChange={set("eje")}
                    required
                    className={selectCls}
                  >
                    {EJE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>

              {/* Vida */}
              <div>
                <FieldLabel icon={RefreshCw} label="Vida" required />
                <SelectWrapper>
                  <select
                    value={form.vida}
                    onChange={set("vida")}
                    required
                    className={selectCls}
                  >
                    {VIDA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
            </div>
          </div>

          {/* ── Operational data ───────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "white",
              border: "1px solid rgba(52,140,203,0.18)",
              boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
            }}
          >
            <SectionHeader
              icon={Milestone}
              title="Datos Operacionales"
              subtitle="Kilometraje y costo de la llanta"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Kilómetros */}
              <div>
                <FieldLabel icon={Milestone} label="Kilómetros Recorridos" />
                <input
                  type="number"
                  value={form.kilometrosRecorridos}
                  onChange={set("kilometrosRecorridos")}
                  min={0}
                  placeholder="ej: 0"
                  className={inputCls}
                />
              </div>

              {/* Costo */}
              <div>
                <FieldLabel icon={DollarSign} label="Costo" required />
                <input
                  type="number"
                  value={form.costo}
                  onChange={set("costo")}
                  required
                  step="0.01"
                  min={0}
                  placeholder="ej: 2200000"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── Submit ─────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)",
              boxShadow: "0 4px 20px rgba(30,118,182,0.35)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando Llanta…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Crear Llanta
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}