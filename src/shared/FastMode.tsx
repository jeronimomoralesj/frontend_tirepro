"use client";

import { useState } from "react";
import {
  Truck, Plus, Trash2, Search, Loader2, Gauge, Camera, Wind,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import CatalogAutocomplete from "../components/CatalogAutocomplete";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

const VEHICLE_TYPES: Record<string, string> = {
  "2_ejes_trailer": "Trailer 2 ejes",
  "2_ejes_cabezote": "Cabezote 2 ejes",
  "3_ejes_trailer": "Trailer 3 ejes",
  "1_eje_cabezote": "Cabezote 1 eje",
  furgon: "Furgón",
};

const EJE_OPTIONS = [
  { value: "direccion", label: "Dirección" },
  { value: "traccion", label: "Tracción" },
  { value: "libre", label: "Libre" },
  { value: "remolque", label: "Remolque" },
];

// ── Types ────────────────────────────────────────────────────────────────────

type NewTire = {
  tempId: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension: string;
  eje: string;
  posicion: number;
  profundidadInicial: number;
  costo: number;
  vidaActual: string;
  kilometrosRecorridos: number | "";
  fechaInstalacion: string;
  // Inspection
  profundidadInt: number | "";
  profundidadCen: number | "";
  profundidadExt: number | "";
  presionPsi: number | "";
  image: File | null;
};

type ExistingTire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
  profundidadInicial: number;
  vehicleId: string;
  // Inspection
  profundidadInt: number | "";
  profundidadCen: number | "";
  profundidadExt: number | "";
  presionPsi: number | "";
  image: File | null;
};

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

let tempCounter = 0;
function makeTempId() { return `new_${++tempCounter}_${Date.now()}`; }

// ── Component ────────────────────────────────────────────────────────────────

export default function FastMode({ language }: { language: string }) {
  // Step state
  const [step, setStep] = useState<"search" | "vehicle" | "tires">("search");

  // Search
  const [placaInput, setPlacaInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Vehicle — null = needs creation, object = exists
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehicleIsNew, setVehicleIsNew] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    placa: "",
    kilometrajeActual: 0,
    carga: "seco",
    pesoCarga: 0,
    tipovhc: "2_ejes_trailer",
    cliente: "",
    pctPavimento: 90,
    configuracion: "",
  });

  // Tires — mix of existing + new
  const [existingTires, setExistingTires] = useState<ExistingTire[]>([]);
  const [newTires, setNewTires] = useState<NewTire[]>([]);

  // Kilometraje
  const [newKilometraje, setNewKilometraje] = useState(0);

  // Company
  const [companyId, setCompanyId] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") ?? "{}").companyId ?? ""; } catch { return ""; }
  });

  // ── Search / check if vehicle exists ─────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const placa = placaInput.trim().toUpperCase();
    if (!placa) { setError("Ingrese la placa"); return; }

    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(placa)}`, { headers: authHeaders() });
      if (res.ok) {
        // Vehicle exists — load its tires
        const v = await res.json();
        setVehicleId(v.id);
        setVehicleIsNew(false);
        setVehicleForm((f) => ({ ...f, placa: v.placa, kilometrajeActual: v.kilometrajeActual, tipovhc: v.tipovhc, carga: v.carga, pesoCarga: v.pesoCarga, cliente: v.cliente ?? "" }));
        setNewKilometraje(v.kilometrajeActual);

        const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${v.id}`, { headers: authHeaders() });
        if (tRes.ok) {
          const tires = await tRes.json();
          setExistingTires(tires.map((t: any) => ({
            id: t.id, placa: t.placa, marca: t.marca, posicion: t.posicion,
            profundidadInicial: t.profundidadInicial, vehicleId: t.vehicleId,
            profundidadInt: "", profundidadCen: "", profundidadExt: "", presionPsi: "", image: null,
          })));
        }
        setStep("tires");
      } else {
        // Vehicle doesn't exist — offer to create
        setVehicleId(null);
        setVehicleIsNew(true);
        setVehicleForm((f) => ({ ...f, placa }));
        setNewKilometraje(0);
        setExistingTires([]);
        setNewTires([]);
        setStep("vehicle");
      }
    } catch { setError("Error de conexión"); }
    setLoading(false);
  }

  // ── Create vehicle ───────────────────────────────────────────────────────

  async function handleCreateVehicle() {
    setError(""); setLoading(true);
    try {
      const { pctPavimento, configuracion, ...rest } = vehicleForm;
      const res = await fetch(`${API_BASE}/vehicles/create`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          ...rest, companyId,
          tipoOperacion: `${pctPavimento}-${100 - pctPavimento}`,
          configuracion: configuracion || null,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? "Error al crear vehículo"); }
      const v = await res.json();
      setVehicleId(v.id);
      setVehicleIsNew(false);
      setNewKilometraje(v.kilometrajeActual);
      setStep("tires");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  // ── Add new tire row ─────────────────────────────────────────────────────

  function addNewTireRow() {
    setNewTires((prev) => [
      ...prev,
      {
        tempId: makeTempId(), placa: "", marca: "", diseno: "", dimension: "",
        eje: "traccion", posicion: 0, profundidadInicial: 16, costo: 0,
        vidaActual: "nueva", kilometrosRecorridos: "", fechaInstalacion: new Date().toISOString().split("T")[0],
        profundidadInt: "", profundidadCen: "", profundidadExt: "", presionPsi: "", image: null,
      },
    ]);
  }

  function removeNewTire(tempId: string) {
    setNewTires((prev) => prev.filter((t) => t.tempId !== tempId));
  }

  function updateNewTire(tempId: string, field: string, value: any) {
    setNewTires((prev) => prev.map((t) => t.tempId === tempId ? { ...t, [field]: value } : t));
  }

  function updateExistingTire(id: string, field: string, value: any) {
    setExistingTires((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
  }

  // ── Submit everything ────────────────────────────────────────────────────

  async function handleSubmitAll(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) { setError("No hay vehículo"); return; }
    setError(""); setSubmitting(true);

    try {
      // 1. Validate new tires
      for (const nt of newTires) {
        if (!nt.placa.trim()) throw new Error("Todas las llantas necesitan un identificador (placa)");
        if (!nt.marca.trim()) throw new Error(`Llanta ${nt.placa || "nueva"}: marca es obligatoria`);
        if (!nt.dimension.trim()) throw new Error(`Llanta ${nt.placa}: dimensión es obligatoria`);
        if (!nt.costo || nt.costo <= 0) throw new Error(`Llanta ${nt.placa}: costo es obligatorio`);
        if (nt.profundidadInt === "" || nt.profundidadCen === "" || nt.profundidadExt === "") throw new Error(`Llanta ${nt.placa}: las 3 profundidades son obligatorias`);
        if (!nt.posicion || nt.posicion <= 0) throw new Error(`Llanta ${nt.placa}: posición es obligatoria`);
      }

      // 2. Create new tires
      for (const nt of newTires) {

        const vida = nt.vidaActual || "nueva";
        const fechaInst = nt.fechaInstalacion || new Date().toISOString().split("T")[0];
        // Build eventos: always include a montaje event, plus a vida event if not nueva
        const eventos: any[] = [
          { tipo: "montaje", fecha: fechaInst, notas: vida },
        ];
        if (vida !== "nueva") {
          eventos.push({ tipo: "reencauche", fecha: fechaInst, notas: vida });
        }

        const createRes = await fetch(`${API_BASE}/tires/create`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({
            placa: nt.placa.trim().toUpperCase(),
            marca: nt.marca,
            diseno: nt.diseno || "Estándar",
            dimension: nt.dimension,
            eje: nt.eje,
            posicion: nt.posicion,
            profundidadInicial: nt.profundidadInicial || 16,
            costo: nt.costo ? [{ valor: nt.costo, fecha: new Date().toISOString() }] : [],
            vidaActual: vida,
            kilometrosRecorridos: nt.kilometrosRecorridos !== "" ? Number(nt.kilometrosRecorridos) : 0,
            fechaInstalacion: fechaInst,
            eventos,
            vehicleId,
            companyId,
          }),
        });
        if (!createRes.ok) {
          const b = await createRes.json().catch(() => ({}));
          throw new Error(b.message ?? `Error al crear llanta ${nt.placa}`);
        }
        const created = await createRes.json();

        // Submit inspection (always — profundidades are required)
        const imageUrl = nt.image ? await convertFileToBase64(nt.image) : "";
        const payload: Record<string, unknown> = {
          profundidadInt: Number(nt.profundidadInt),
          profundidadCen: Number(nt.profundidadCen),
          profundidadExt: Number(nt.profundidadExt),
          newKilometraje: Number(newKilometraje),
          imageUrl,
        };
        if (nt.presionPsi !== "" && nt.presionPsi !== 0) payload.presionPsi = Number(nt.presionPsi);

        await fetch(`${API_BASE}/tires/${created.id}/inspection`, {
          method: "PATCH", headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      }

      // 3. Submit inspections for existing tires
      for (const et of existingTires) {
        if (et.profundidadInt === "" || et.profundidadCen === "" || et.profundidadExt === "") continue;
        const imageUrl = et.image ? await convertFileToBase64(et.image) : "";
        const payload: Record<string, unknown> = {
          profundidadInt: Number(et.profundidadInt),
          profundidadCen: Number(et.profundidadCen),
          profundidadExt: Number(et.profundidadExt),
          newKilometraje: Number(newKilometraje),
          imageUrl,
        };
        if (et.presionPsi !== "" && et.presionPsi !== 0) payload.presionPsi = Number(et.presionPsi);

        const res = await fetch(`${API_BASE}/tires/${et.id}/inspection`, {
          method: "PATCH", headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.message ?? `Error al inspeccionar ${et.placa}`);
        }
      }

      setSuccess(`Todo listo. ${newTires.length > 0 ? `${newTires.length} llantas creadas. ` : ""}Inspecciones guardadas.`);
      // Reset
      setStep("search");
      setPlacaInput("");
      setVehicleId(null);
      setExistingTires([]);
      setNewTires([]);
    } catch (e: any) { setError(e.message); }
    setSubmitting(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(10,24,58,0.06)", border: "1px solid rgba(10,24,58,0.2)" }}>
          <AlertCircle className="w-4 h-4 text-[#173D68] flex-shrink-0 mt-0.5" />
          <span className="flex-1 text-[#0A183A]">{error}</span>
          <button onClick={() => setError("")}><X className="w-4 h-4 text-[#348CCB]" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.3)" }}>
          <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0 mt-0.5" />
          <span className="flex-1 text-[#0A183A]">{success}</span>
          <button onClick={() => setSuccess("")}><X className="w-4 h-4 text-[#348CCB]" /></button>
        </div>
      )}

      {/* ═══ STEP 1: Search ═══ */}
      {step === "search" && (
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: "rgba(30,118,182,0.10)" }}>
              <Search className="w-4 h-4 text-[#1E76B6]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0A183A]">Buscar o Crear Vehículo</p>
              <p className="text-xs text-[#348CCB] mt-0.5">Si el vehículo no existe, podrá crearlo al instante</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input type="text" value={placaInput} onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
              placeholder="Placa del vehículo" className={`${inputCls} flex-1`} style={{ textTransform: "uppercase" }} />
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </form>
        </div>
      )}

      {/* ═══ STEP 2: Create Vehicle ═══ */}
      {step === "vehicle" && vehicleIsNew && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}>
          <div className="px-5 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
            <Truck className="w-4 h-4 text-[#348CCB]" />
            <div>
              <p className="text-sm font-bold text-white">Vehículo no encontrado — Crear <span className="font-mono tracking-wider">{vehicleForm.placa}</span></p>
              <p className="text-[10px] text-white/50">Complete los datos del vehículo para continuar</p>
            </div>
          </div>
          <div className="p-5 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Kilometraje</label>
                <input type="number" value={vehicleForm.kilometrajeActual} onChange={(e) => setVehicleForm((f) => ({ ...f, kilometrajeActual: Number(e.target.value) }))}
                  className={inputCls} min={0} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Peso carga (kg)</label>
                <input type="number" value={vehicleForm.pesoCarga} onChange={(e) => setVehicleForm((f) => ({ ...f, pesoCarga: Number(e.target.value) }))}
                  className={inputCls} min={0} step={0.1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Tipo de carga</label>
                <input type="text" value={vehicleForm.carga} onChange={(e) => setVehicleForm((f) => ({ ...f, carga: e.target.value }))}
                  placeholder="seco, líquido, gas" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Tipo vehículo</label>
                <select value={vehicleForm.tipovhc} onChange={(e) => setVehicleForm((f) => ({ ...f, tipovhc: e.target.value }))}
                  className={`${inputCls} appearance-none`}>
                  {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">
                Terreno: {vehicleForm.pctPavimento}% pavimento — {100 - vehicleForm.pctPavimento}% destapado
                <span className="text-[#348CCB] font-normal ml-1">(opcional)</span>
              </label>
              <input type="range" min={0} max={100} step={5} value={vehicleForm.pctPavimento}
                onChange={(e) => setVehicleForm((f) => ({ ...f, pctPavimento: Number(e.target.value) }))}
                className="w-full accent-[#1E76B6] h-2" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">
                Dueño <span className="text-[#348CCB] font-normal">(opcional)</span>
              </label>
              <input type="text" value={vehicleForm.cliente} onChange={(e) => setVehicleForm((f) => ({ ...f, cliente: e.target.value }))}
                placeholder="Nombre del cliente" className={inputCls} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep("search")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF] transition-colors">Volver</button>
              <button onClick={handleCreateVehicle} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Crear y Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Tires + Inspections ═══ */}
      {step === "tires" && vehicleId && (
        <form onSubmit={handleSubmitAll} className="space-y-4">
          {/* Vehicle info bar */}
          <div className="rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.18)" }}>
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-[#173D68]" />
              <div>
                <p className="font-mono font-black text-[#0A183A] text-lg tracking-wider">{vehicleForm.placa}</p>
                <p className="text-xs text-[#348CCB]">{vehicleForm.tipovhc} — {existingTires.length + newTires.length} llantas</p>
              </div>
            </div>
            <button type="button" onClick={() => { setStep("search"); setVehicleId(null); setExistingTires([]); setNewTires([]); }}
              className="text-xs text-[#348CCB] hover:text-[#0A183A] font-semibold">Cambiar</button>
          </div>

          {/* Kilometraje */}
          <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)" }}>
            <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1.5">Kilometraje actual</label>
            <input type="number" value={newKilometraje} onChange={(e) => setNewKilometraje(Number(e.target.value))}
              className={inputCls} min={0} />
          </div>

          {/* Existing tires */}
          {existingTires.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">Llantas existentes ({existingTires.length})</p>
              {existingTires.map((t) => (
                <TireCard key={t.id} label={`${t.placa} — P${t.posicion} — ${t.marca}`} isNew={false}
                  profInt={t.profundidadInt} profCen={t.profundidadCen} profExt={t.profundidadExt}
                  presion={t.presionPsi} image={t.image}
                  onChange={(f, v) => updateExistingTire(t.id, f, v)} />
              ))}
            </div>
          )}

          {/* New tires */}
          {newTires.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">Llantas nuevas ({newTires.length})</p>
              {newTires.map((t) => (
                <NewTireCard key={t.tempId} tire={t}
                  onUpdate={(f, v) => updateNewTire(t.tempId, f, v)}
                  onRemove={() => removeNewTire(t.tempId)} />
              ))}
            </div>
          )}

          {/* Add tire button */}
          <button type="button" onClick={addNewTireRow}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:bg-[#F0F7FF]"
            style={{ border: "2px dashed rgba(52,140,203,0.3)", color: "#1E76B6" }}>
            <Plus className="w-4 h-4" /> Agregar Llanta Nueva
          </button>

          {/* Submit */}
          <button type="submit" disabled={submitting || (existingTires.length === 0 && newTires.length === 0)}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Guardando...</>
              : <><CheckCircle2 className="w-4 h-4 inline mr-2" />Guardar Todo</>}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Tire inspection card (existing) ──────────────────────────────────────────

function TireCard({
  label, isNew, profInt, profCen, profExt, presion, image,
  onChange,
}: {
  label: string; isNew: boolean;
  profInt: number | ""; profCen: number | ""; profExt: number | "";
  presion: number | ""; image: File | null;
  onChange: (field: string, value: any) => void;
}) {
  const [showExtras, setShowExtras] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.18)" }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: isNew ? "linear-gradient(135deg, #1E76B6, #173D68)" : "linear-gradient(135deg, #0A183A, #173D68)" }}>
        <Gauge className="w-3.5 h-3.5 text-white/70" />
        <span className="text-xs font-bold text-white tracking-wide">{label}</span>
      </div>
      <div className="p-4 space-y-3 bg-white">
        {/* Depth inputs */}
        <div className="grid grid-cols-3 gap-2">
          {([["profundidadInt", "Interior", profInt], ["profundidadCen", "Central", profCen], ["profundidadExt", "Exterior", profExt]] as const).map(([field, lbl, val]) => (
            <div key={field}>
              <label className="block text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider text-center mb-1">{lbl}</label>
              <input type="number" min={0} max={30} step={0.1} value={val === "" ? "" : val} placeholder="mm"
                onChange={(e) => onChange(field, e.target.value === "" ? "" : Number(e.target.value))}
                className={`${inputCls} text-center`} />
            </div>
          ))}
        </div>

        {/* Image upload */}
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium"
          style={{ background: image ? "rgba(30,118,182,0.08)" : "#F0F7FF", border: "1px dashed rgba(52,140,203,0.4)", color: "#1E76B6" }}>
          <Camera className="w-4 h-4 flex-shrink-0" />
          <span className="truncate text-xs">{image ? image.name : "Foto del neumático (opcional)"}</span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => onChange("image", e.target.files?.[0] ?? null)} />
        </label>

        {/* Pressure toggle */}
        <button type="button" onClick={() => setShowExtras(!showExtras)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
          style={{ background: "rgba(240,247,255,0.6)", border: "1px dashed rgba(52,140,203,0.35)" }}>
          <div className="flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-[#1E76B6]" />
            <span className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">Presión</span>
            {presion !== "" && presion !== 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(30,118,182,0.15)", color: "#1E76B6" }}>{presion} PSI</span>}
          </div>
          <span className="text-[10px] text-[#348CCB]">{showExtras ? "Ocultar" : "Opcional"}</span>
        </button>
        {showExtras && (
          <div className="flex items-center gap-2 px-1">
            <input type="number" min={0} max={200} step={1} value={presion === "" ? "" : presion} placeholder="PSI"
              onChange={(e) => onChange("presionPsi", e.target.value === "" ? "" : Number(e.target.value))}
              className={`${inputCls} max-w-[120px]`} />
            <span className="text-xs text-[#348CCB]">PSI</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New tire card (create + inspect) ─────────────────────────────────────────

const VIDA_OPTIONS = [
  { value: "nueva", label: "Nueva" },
  { value: "reencauche1", label: "Reencauche 1" },
  { value: "reencauche2", label: "Reencauche 2" },
  { value: "reencauche3", label: "Reencauche 3" },
];

function NewTireCard({
  tire, onUpdate, onRemove,
}: {
  tire: NewTire;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
}) {
  const [showExtras, setShowExtras] = useState(false);
  const req = <span className="text-red-400">*</span>;
  const opt = <span className="text-[#348CCB] font-normal">(opc.)</span>;
  const L = (t: string) => <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">{t}</label>;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(249,115,22,0.3)" }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
        <span className="text-xs font-bold text-white">Nueva Llanta{tire.posicion ? ` — P${tire.posicion}` : ""}</span>
        <button type="button" onClick={onRemove} className="text-white/70 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-4 space-y-3 bg-white">

        {/* Row 1: Placa + Marca */}
        <div className="grid grid-cols-2 gap-2">
          <div>{L(<>Placa / ID {req}</>)}<input type="text" value={tire.placa} onChange={(e) => onUpdate("placa", e.target.value.toUpperCase())}
            placeholder="Ej: LL001" className={inputCls} style={{ textTransform: "uppercase" }} required /></div>
          <div>{L(<>Marca {req}</>)}
            <CatalogAutocomplete value={tire.marca} field="marca" placeholder="Michelin" required className={inputCls}
              onChange={(v) => onUpdate("marca", v)}
              onSelect={(item) => { onUpdate("marca", item.marca); onUpdate("dimension", item.dimension); onUpdate("diseno", item.modelo); if (item.rtdMm) onUpdate("profundidadInicial", item.rtdMm); if (item.precioCop) onUpdate("costo", item.precioCop); }} />
          </div>
        </div>

        {/* Row 2: Dimension + Diseño/Banda + Eje */}
        <div className="grid grid-cols-3 gap-2">
          <div>{L(<>Dimensión {req}</>)}
            <CatalogAutocomplete value={tire.dimension} field="dimension" filterMarca={tire.marca} placeholder="295/80 R22.5" required className={inputCls}
              onChange={(v) => onUpdate("dimension", v)}
              onSelect={(item) => { onUpdate("dimension", item.dimension); onUpdate("marca", item.marca); onUpdate("diseno", item.modelo); if (item.rtdMm) onUpdate("profundidadInicial", item.rtdMm); if (item.precioCop) onUpdate("costo", item.precioCop); }} />
          </div>
          <div>{L(<>Diseño / Banda {req}</>)}
            <CatalogAutocomplete value={tire.diseno} field="modelo" filterMarca={tire.marca} filterDimension={tire.dimension} placeholder="XZE2+" required className={inputCls}
              onChange={(v) => onUpdate("diseno", v)}
              onSelect={(item) => { onUpdate("diseno", item.modelo); if (item.rtdMm) onUpdate("profundidadInicial", item.rtdMm); if (item.precioCop) onUpdate("costo", item.precioCop); }} />
          </div>
          <div>{L(<>Eje {req}</>)}
            <select value={tire.eje} onChange={(e) => onUpdate("eje", e.target.value)} className={`${inputCls} appearance-none`}>
              {EJE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: Posición + Prof inicial + Costo */}
        <div className="grid grid-cols-3 gap-2">
          <div>{L(<>Posición {req}</>)}
            <input type="number" value={tire.posicion || ""} onChange={(e) => onUpdate("posicion", Number(e.target.value))}
              placeholder="Ej: 1" className={inputCls} min={0} required />
          </div>
          <div>{L(<>Prof. inicial {opt}</>)}
            <input type="number" value={tire.profundidadInicial} onChange={(e) => onUpdate("profundidadInicial", Number(e.target.value))}
              className={inputCls} min={0} max={35} step={0.5} />
          </div>
          <div>{L(<>Costo (COP) {req}</>)}
            <input type="number" value={tire.costo || ""} onChange={(e) => onUpdate("costo", Number(e.target.value))}
              placeholder="1900000" className={inputCls} min={0} required />
          </div>
        </div>

        {/* Row 4: Vida + Km recorridos + Fecha instalación */}
        <div className="grid grid-cols-3 gap-2">
          <div>{L(<>Vida actual</>)}
            <select value={tire.vidaActual} onChange={(e) => onUpdate("vidaActual", e.target.value)} className={`${inputCls} appearance-none`}>
              {VIDA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>{L(<>Km recorridos {opt}</>)}
            <input type="number" value={tire.kilometrosRecorridos === "" ? "" : tire.kilometrosRecorridos}
              onChange={(e) => onUpdate("kilometrosRecorridos", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0" className={inputCls} min={0} />
          </div>
          <div>{L(<>Fecha montaje</>)}
            <input type="date" value={tire.fechaInstalacion}
              onChange={(e) => onUpdate("fechaInstalacion", e.target.value)}
              className={inputCls} />
          </div>
        </div>

        {/* Inspection depths (required) */}
        <div className="pt-2" style={{ borderTop: "1px dashed rgba(52,140,203,0.2)" }}>
          <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-2">Profundidades actuales {req}</p>
          <div className="grid grid-cols-3 gap-2">
            {([["profundidadInt", "Interior"], ["profundidadCen", "Central"], ["profundidadExt", "Exterior"]] as const).map(([field, lbl]) => (
              <div key={field}>
                <label className="block text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider text-center mb-1">{lbl}</label>
                <input type="number" min={0} max={30} step={0.1}
                  value={tire[field] === "" ? "" : tire[field]} placeholder="mm"
                  onChange={(e) => onUpdate(field, e.target.value === "" ? "" : Number(e.target.value))}
                  className={`${inputCls} text-center`} required />
              </div>
            ))}
          </div>
        </div>

        {/* Image upload */}
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium"
          style={{ background: tire.image ? "rgba(30,118,182,0.08)" : "#F0F7FF", border: "1px dashed rgba(52,140,203,0.4)", color: "#1E76B6" }}>
          <Camera className="w-4 h-4 flex-shrink-0" />
          <span className="truncate text-xs">{tire.image ? tire.image.name : "Foto del neumático (opcional)"}</span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => onUpdate("image", e.target.files?.[0] ?? null)} />
        </label>

        {/* Pressure (optional) */}
        <button type="button" onClick={() => setShowExtras(!showExtras)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl"
          style={{ background: "rgba(240,247,255,0.6)", border: "1px dashed rgba(52,140,203,0.35)" }}>
          <div className="flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-[#1E76B6]" />
            <span className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">Presión</span>
            {tire.presionPsi !== "" && tire.presionPsi !== 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(30,118,182,0.15)", color: "#1E76B6" }}>{tire.presionPsi} PSI</span>}
          </div>
          <span className="text-[10px] text-[#348CCB]">{showExtras ? "Ocultar" : "Opcional"}</span>
        </button>
        {showExtras && (
          <div className="flex items-center gap-2 px-1">
            <input type="number" min={0} max={200} step={1}
              value={tire.presionPsi === "" ? "" : tire.presionPsi} placeholder="PSI"
              onChange={(e) => onUpdate("presionPsi", e.target.value === "" ? "" : Number(e.target.value))}
              className={`${inputCls} max-w-[120px]`} />
            <span className="text-xs text-[#348CCB]">PSI</span>
          </div>
        )}
      </div>
    </div>
  );
}
