"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import {
  AlertTriangle, CheckCircle, Loader2, Search,
  ChevronDown, X, Plus,
  Truck,
  CheckCircle2,
} from "lucide-react";
import CatalogAutocomplete from "../../../components/CatalogAutocomplete";

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
};

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

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

function randomId(len = 8): string {
  return Array.from({ length: len }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
      Math.floor(Math.random() * 62)
    ]
  ).join("");
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

function Field({
  label, required, children,
}: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-black text-[#0A183A] uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-xl text-sm font-medium text-[#0A183A] bg-white " +
  "border border-[#348CCB]/20 " +
  "focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

const inputStyle = {};

// =============================================================================
// Main component
// =============================================================================

export default function TirePage() {
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [loading,         setLoading]         = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
const [duplicateInfo, setDuplicateInfo] = useState<{
  existingTire: {
    placa: string; marca: string; diseno: string;
    dimension: string; eje: string; posicion: number;
    vehicle: { placa: string; tipovhc: string } | null;
    suggestedPlaca: string;
  };
} | null>(null);

  // Companies
  const [companies,           setCompanies]           = useState<Company[]>([]);
  const [selectedCompany,     setSelectedCompany]     = useState<Company | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Vehicles
  const [userVehicles,        setUserVehicles]        = useState<Vehicle[]>([]);
  const [filteredVehicles,    setFilteredVehicles]    = useState<Vehicle[]>([]);
  const [selectedVehicle,     setSelectedVehicle]     = useState<Vehicle | null>(null);
  const [vehicleSearch,       setVehicleSearch]       = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  // Form
  const [form, setForm] = useState({
    tirePlaca: "",
    marca: "",
    diseno: "",
    profundidadInicial: 0,
    dimension: "",
    eje: "direccion",
    kilometrosRecorridos: "" as number | "",
    costo: "" as number | "",
    vida: "nueva",
    posicion: "",
  });

  // -- Fetch companies on mount -----------------------------------------------
  useEffect(() => {
    const run = async () => {
      try {
        const res = await authFetch(`${API_BASE}/companies/me/clients`);
        if (!res.ok) throw new Error("Error al obtener clientes");
        const data = await res.json();
        setCompanies(data.map((a: any) => ({ id: a.company.id, name: a.company.name })));
      } catch (e) {
        console.error(e);
      }
    };
    run();
  }, []);

  // -- Fetch vehicles when company changes ------------------------------------
  useEffect(() => {
    if (!selectedCompany) { setUserVehicles([]); setFilteredVehicles([]); return; }
    const run = async () => {
      setLoadingVehicles(true);
      try {
        const res = await authFetch(`${API_BASE}/vehicles?companyId=${selectedCompany.id}`);
        if (!res.ok) throw new Error("Error al obtener vehículos");
        const data: Vehicle[] = await res.json();
        setUserVehicles(data);
        setFilteredVehicles(data);
        clearVehicle();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        setLoadingVehicles(false);
      }
    };
    run();
  }, [selectedCompany]);

  // -- Vehicle search filter --------------------------------------------------
  useEffect(() => { setFilteredVehicles(userVehicles); }, [userVehicles]);

  // -- Click-outside for vehicle dropdown ------------------------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(e.target as Node)) {
        setShowVehicleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // -- Handlers ---------------------------------------------------------------
  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["profundidadInicial", "kilometrosRecorridos", "costo"].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  }

  function handleVehicleSearch(v: string) {
    setVehicleSearch(v);
    const lv = v.toLowerCase();
    setFilteredVehicles(
      v.trim() === ""
        ? userVehicles
        : userVehicles.filter(
            (vh) =>
              vh.placa.toLowerCase().includes(lv) ||
              vh.tipovhc.toLowerCase().includes(lv)
          )
    );
    setShowVehicleDropdown(true);
  }

  function selectVehicle(v: Vehicle) {
    setSelectedVehicle(v);
    setVehicleSearch(v.placa);
    setShowVehicleDropdown(false);
  }

  function clearVehicle() {
    setSelectedVehicle(null);
    setVehicleSearch("");
    setFilteredVehicles(userVehicles);
  }

  // -- Submit -----------------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!selectedCompany) { setError("Por favor seleccione un cliente."); return; }

    setLoading(true);
    const now = new Date().toISOString();
    const vidaVal = form.vida.toLowerCase();
    const eventos: any[] = [
      { tipo: "montaje", fecha: now, notas: vidaVal, metadata: { vidaValor: vidaVal } },
    ];
    if (vidaVal !== "nueva") {
      eventos.push({ tipo: "reencauche", fecha: now, notas: vidaVal, metadata: { vidaValor: vidaVal } });
    }
    const payload = {
      placa:                form.tirePlaca.trim() !== "" ? form.tirePlaca.toLowerCase() : randomId(),
      marca:                form.marca.toLowerCase(),
      diseno:               form.diseno.toLowerCase(),
      profundidadInicial:   form.profundidadInicial,
      dimension:            form.dimension.toLowerCase(),
      eje:                  form.eje.toLowerCase(),
      kilometrosRecorridos: Number(form.kilometrosRecorridos) || 0,
      costo:                [{ valor: Number(form.costo) || 0, fecha: now }],
      vidaActual:           vidaVal,
      eventos,
      posicion:             Number(form.posicion),
      companyId:            selectedCompany.id,
      vehicleId:            selectedVehicle?.id ?? null,
    };

    try {
      const res = await authFetch(`${API_BASE}/tires/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Error al crear la llanta");
      }
      if (body.duplicate) {
        setDuplicateInfo({ existingTire: body.existingTire });
        return;
      }
      setSuccess(body.message || "Neumático creado exitosamente");
      setForm({
        tirePlaca: "", marca: "", diseno: "", profundidadInicial: 0,
        dimension: "", eje: "direccion", kilometrosRecorridos: "",
        costo: "", vida: "nueva", posicion: "",
      });
      clearVehicle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDuplicate() {
  if (!duplicateInfo) return;
  const suggestedPlaca = duplicateInfo.existingTire.suggestedPlaca.toUpperCase();
  setDuplicateInfo(null);
  setError(""); setSuccess("");
  setLoading(true);

  const now = new Date().toISOString();
  const vidaVal2 = form.vida.toLowerCase();
  const eventos2: any[] = [
    { tipo: "montaje", fecha: now, notas: vidaVal2, metadata: { vidaValor: vidaVal2 } },
  ];
  if (vidaVal2 !== "nueva") {
    eventos2.push({ tipo: "reencauche", fecha: now, notas: vidaVal2, metadata: { vidaValor: vidaVal2 } });
  }
  const payload = {
    placa:                suggestedPlaca.toLowerCase(),
    marca:                form.marca.toLowerCase(),
    diseno:               form.diseno.toLowerCase(),
    profundidadInicial:   form.profundidadInicial,
    dimension:            form.dimension.toLowerCase(),
    eje:                  form.eje.toLowerCase(),
    kilometrosRecorridos: Number(form.kilometrosRecorridos) || 0,
    costo:                [{ valor: Number(form.costo) || 0, fecha: now }],
    vidaActual:           vidaVal2,
    eventos:              eventos2,
    posicion:             Number(form.posicion),
    companyId:            selectedCompany!.id,
    vehicleId:            selectedVehicle?.id ?? null,
  };

  try {
    const res = await authFetch(`${API_BASE}/tires/create`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || "Error al crear la llanta");
    setSuccess(`Llanta creada como ${suggestedPlaca}`);
    setForm({ tirePlaca: "", marca: "", diseno: "", profundidadInicial: 0, dimension: "", eje: "direccion", kilometrosRecorridos: "", costo: "", vida: "nueva", posicion: "" });
    clearVehicle();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Error desconocido");
  } finally {
    setLoading(false);
  }
}

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={{ background: "white" }}>

      {duplicateInfo && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}>
    <div className="w-full max-w-md rounded-2xl p-6 space-y-5"
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.25)", boxShadow: "0 20px 60px rgba(10,24,58,0.2)" }}>

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "rgba(251,191,36,0.15)" }}>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <p className="font-bold text-[#0A183A] text-base">ID de llanta duplicado</p>
          <p className="text-xs text-gray-400 mt-0.5">Ya existe una llanta con este ID en este cliente</p>
        </div>
      </div>

      <div className="rounded-xl p-4 space-y-2" style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.2)" }}>
        <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-2">Llanta existente</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["ID",        duplicateInfo.existingTire.placa.toUpperCase()],
            ["Posición",  String(duplicateInfo.existingTire.posicion)],
            ["Marca",     duplicateInfo.existingTire.marca],
            ["Diseño",    duplicateInfo.existingTire.diseno],
            ["Dimensión", duplicateInfo.existingTire.dimension],
            ["Eje",       duplicateInfo.existingTire.eje],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
              <p className="font-semibold text-[#0A183A] capitalize">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(52,140,203,0.15)" }}>
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Vehículo asignado</p>
          {duplicateInfo.existingTire.vehicle ? (
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-[#1E76B6]" />
              <span className="font-bold text-[#0A183A] text-sm">{duplicateInfo.existingTire.vehicle.placa.toUpperCase()}</span>
              <span className="text-xs text-gray-400">— {duplicateInfo.existingTire.vehicle.tipovhc}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin vehículo asignado</p>
          )}
        </div>
      </div>

      <div className="rounded-xl p-3 flex items-center gap-3"
        style={{ background: "rgba(30,118,182,0.07)", border: "1px solid rgba(30,118,182,0.2)" }}>
        <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
        <p className="text-xs text-[#173D68]">
          La nueva llanta se guardará como{" "}
          <span className="font-black">{duplicateInfo.existingTire.suggestedPlaca.toUpperCase()}</span>
        </p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => setDuplicateInfo(null)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#173D68] transition-all hover:bg-[#F0F7FF]"
          style={{ border: "1px solid rgba(52,140,203,0.3)" }}>
          Cancelar
        </button>
        <button type="button" onClick={confirmDuplicate}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1E76B6 0%, #173D68 100%)", boxShadow: "0 4px 16px rgba(30,118,182,0.3)" }}>
          Guardar como {duplicateInfo.existingTire.suggestedPlaca.toUpperCase()}
        </button>
      </div>
    </div>
  </div>
)}

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">

        {/* -- Company selector --------------------------------------------- */}
        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "rgba(30,118,182,0.08)",
              border: "1.5px solid rgba(52,140,203,0.2)",
              color: "#0A183A",
              minWidth: 200,
            }}
          >
            <span className="flex-1 text-left truncate">
              {selectedCompany ? selectedCompany.name : "Seleccionar cliente"}
            </span>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showCompanyDropdown ? "rotate-180" : ""}`} />
          </button>

          {showCompanyDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCompanyDropdown(false)} />
              <div
                className="absolute right-0 mt-12 w-64 rounded-xl overflow-hidden z-20"
                style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)", boxShadow: "0 8px 32px rgba(10,24,58,0.15)" }}
              >
                <div className="max-h-60 overflow-y-auto">
                  {companies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCompany(c); setShowCompanyDropdown(false); }}
                      className="block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F0F7FF]"
                      style={{ color: selectedCompany?.id === c.id ? "#1E76B6" : "#0A183A", fontWeight: selectedCompany?.id === c.id ? 700 : 400 }}
                    >
                      {c.name}
                    </button>
                  ))}
                  {companies.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">Sin clientes</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* -- Feedback banners -------------------------------------------- */}
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}
        {success && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}
          >
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="flex-1 text-green-700">{success}</span>
            <button onClick={() => setSuccess("")}><X className="w-4 h-4 text-green-400" /></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* -- Vehicle search -------------------------------------------- */}
          <Card className="p-5">
            <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide mb-3">
              Vehículo Asociado <span className="text-gray-400 font-medium normal-case">(opcional)</span>
            </p>

            <div className="relative" ref={vehicleDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={vehicleSearch}
                  onChange={(e) => handleVehicleSearch(e.target.value)}
                  onFocus={() => setShowVehicleDropdown(true)}
                  placeholder={loadingVehicles ? "Cargando vehículos…" : !selectedCompany ? "Seleccione un cliente primero" : "Buscar por placa o tipo…"}
                  className={`${inputCls} pl-10 pr-10`}
                  style={inputStyle}
                  disabled={loadingVehicles || !selectedCompany}
                />
                {loadingVehicles && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#1E76B6]" />
                )}
                {selectedVehicle && !loadingVehicles && (
                  <button type="button" onClick={clearVehicle} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                  </button>
                )}
                {!selectedVehicle && !loadingVehicles && (
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                )}
              </div>

              {showVehicleDropdown && !loadingVehicles && selectedCompany && (
                <div
                  className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden max-h-56 overflow-y-auto"
                  style={{ background: "white", border: "1.5px solid rgba(52,140,203,0.2)", boxShadow: "0 8px 24px rgba(10,24,58,0.12)" }}
                >
                  <button
                    type="button"
                    onClick={clearVehicle}
                    className="block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F0F7FF]"
                    style={{ color: "#173D68", borderBottom: "1px solid rgba(52,140,203,0.1)" }}
                  >
                    — Sin vehículo (opcional) —
                  </button>
                  {filteredVehicles.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">No se encontraron vehículos</p>
                  ) : filteredVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVehicle(v)}
                      className="block w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#F0F7FF]"
                      style={{ borderBottom: "1px solid rgba(52,140,203,0.06)" }}
                    >
                      <p className="font-bold text-[#0A183A]">{v.placa.toUpperCase()}</p>
                      <p className="text-xs text-[#173D68]">{v.tipovhc} · {v.carga}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedVehicle && (
              <div
                className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(52,140,203,0.2)" }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#1E76B6" }} />
                <span className="font-bold text-[#0A183A]">{selectedVehicle.placa.toUpperCase()}</span>
                <span className="text-[#173D68]">— {selectedVehicle.tipovhc}</span>
              </div>
            )}
          </Card>

          {/* -- Form fields ----------------------------------------------- */}
          <Card className="p-5">
            <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide mb-4">Datos de la Llanta</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <Field label="ID de la Llanta">
                <input
                  type="text" name="tirePlaca" value={form.tirePlaca}
                  onChange={handleFormChange}
                  placeholder="Dejar vacío para generar automáticamente"
                  className={inputCls} style={inputStyle}
                />
              </Field>

              <Field label="Marca" required>
                <CatalogAutocomplete value={form.marca} field="marca" placeholder="Michelin" required
                  className={inputCls}
                  onChange={(v) => setForm((f: any) => ({ ...f, marca: v }))}
                  onSelect={(item) => setForm((f: any) => ({ ...f, marca: item.marca, dimension: item.dimension, diseno: item.modelo, profundidadInicial: item.rtdMm ?? f.profundidadInicial }))} />
              </Field>

              <Field label="Diseño / Banda" required>
                <CatalogAutocomplete value={form.diseno} field="modelo" filterMarca={form.marca} placeholder="XDS2" required
                  className={inputCls}
                  onChange={(v) => setForm((f: any) => ({ ...f, diseno: v }))}
                  onSelect={(item) => setForm((f: any) => ({ ...f, diseno: item.modelo, marca: item.marca, dimension: item.dimension, profundidadInicial: item.rtdMm ?? f.profundidadInicial }))} />
              </Field>

              <Field label="Profundidad Inicial (mm)" required>
                <input
                  type="number" name="profundidadInicial" value={form.profundidadInicial}
                  onChange={handleFormChange} required step="0.1"
                  className={inputCls} style={inputStyle}
                />
              </Field>

              <Field label="Dimensión" required>
                <CatalogAutocomplete value={form.dimension} field="dimension" filterMarca={form.marca} placeholder="295/80R22.5" required
                  className={inputCls}
                  onChange={(v) => setForm((f: any) => ({ ...f, dimension: v }))}
                  onSelect={(item) => setForm((f: any) => ({ ...f, dimension: item.dimension, marca: item.marca, diseno: item.modelo, profundidadInicial: item.rtdMm ?? f.profundidadInicial }))} />
              </Field>

              <Field label="Eje" required>
                <select
                  name="eje" value={form.eje}
                  onChange={handleFormChange} required
                  className={inputCls} style={inputStyle}
                >
                  <option value="direccion">Dirección</option>
                  <option value="traccion">Tracción</option>
                </select>
              </Field>

              <Field label="Kilómetros Recorridos">
                <input
                  type="number" name="kilometrosRecorridos" value={form.kilometrosRecorridos}
                  onChange={handleFormChange}
                  className={inputCls} style={inputStyle}
                />
              </Field>

              <Field label="Costo" required>
                <input
                  type="number" name="costo" value={form.costo}
                  onChange={handleFormChange} required step="0.01"
                  className={inputCls} style={inputStyle}
                />
              </Field>

              <Field label="Vida" required>
                <select
                  name="vida" value={form.vida}
                  onChange={handleFormChange} required
                  className={inputCls} style={inputStyle}
                >
                  <option value="nueva">Nueva</option>
                  <option value="reencauche1">Primer Reencauche</option>
                  <option value="reencauche2">Segundo Reencauche</option>
                  <option value="reencauche3">Tercer Reencauche</option>
                </select>
              </Field>

              <Field label="Posición" required>
                <input
                  type="number" name="posicion" value={form.posicion}
                  onChange={handleFormChange} required min={1}
                  className={inputCls} style={inputStyle}
                />
              </Field>
            </div>
          </Card>

          {/* -- Submit ---------------------------------------------------- */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)", boxShadow: "0 4px 20px rgba(10,24,58,0.25)" }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creando llanta…</>
            ) : (
              <><Plus className="w-4 h-4" /> Crear Nueva Llanta</>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}