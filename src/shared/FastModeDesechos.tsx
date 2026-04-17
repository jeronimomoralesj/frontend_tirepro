"use client";

import { useState, useMemo } from "react";
import {
  Search, Trash2, Plus, X, Loader2, CheckCircle2, AlertCircle,
  Truck, Package, Camera, Circle,
} from "lucide-react";
import CatalogAutocomplete from "../components/CatalogAutocomplete";
import AgentCardHeader from "../components/AgentCardHeader";
import { AGENTS } from "../lib/agents";
import { DESECHO_CAUSALES } from "../lib/desechoCausales";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) } });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res(r.result as string); r.onerror = rej; });
}

const inputCls = "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

const EJE_OPTIONS = [
  { value: "direccion", label: "Dirección" }, { value: "traccion", label: "Tracción" },
  { value: "libre", label: "Libre" }, { value: "remolque", label: "Remolque" },
];

type FoundTire = {
  id: string; placa: string; marca: string; diseno: string; dimension: string;
  eje: string; posicion: number; currentProfundidad: number | null; vidaActual: string;
  vehicle?: { placa: string } | null;
};

type DiscardItem = {
  key: string;
  source: "existing" | "new";
  tireId?: string;
  placa: string; marca: string; diseno: string; dimension: string;
  eje: string; posicion: number; vehiclePlaca: string;
  profundidadInicial: number; costo: number;
  // Discard data (same as Vida fin)
  causales: string;
  milimetros: string;
  images: string[]; // base64
};

let ctr = 0;
function key() { return `d${++ctr}_${Date.now()}`; }

export default function DesechosFastMode({ onDone }: { onDone: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"vehicle" | "tire">("vehicle");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [foundTires, setFoundTires] = useState<FoundTire[]>([]);
  const [list, setList] = useState<DiscardItem[]>([]);
  const [showNew, setShowNew] = useState(false);

  const companyId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") ?? "{}").companyId ?? ""; } catch { return ""; }
  }, []);

  // -- Search -----------------------------------------------------------------

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setError(""); setFoundTires([]); setLoading(true);
    try {
      if (searchMode === "vehicle") {
        const vRes = await authFetch(`${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(searchTerm.trim())}`);
        if (!vRes.ok) throw new Error("Vehículo no encontrado");
        const v = await vRes.json();
        const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${v.id}`);
        if (!tRes.ok) throw new Error("Error al cargar llantas");
        const tires: any[] = await tRes.json();
        setFoundTires(tires.filter((t: any) => t.vidaActual !== "fin").map((t: any) => ({ ...t, vehicle: { placa: v.placa } })));
      } else {
        const tRes = await authFetch(`${API_BASE}/tires?companyId=${companyId}`);
        if (!tRes.ok) throw new Error("Error al buscar");
        const all: any[] = await tRes.json();
        const term = searchTerm.trim().toLowerCase();
        setFoundTires(all.filter((t: any) => t.vidaActual !== "fin" && t.placa.toLowerCase().includes(term))
          .sort((a: any, b: any) => (a.placa.toLowerCase() === term ? -1 : 0) - (b.placa.toLowerCase() === term ? -1 : 0)));
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  function addTire(tire: FoundTire) {
    if (list.some((d) => d.tireId === tire.id)) return;
    setList((p) => [...p, {
      key: key(), source: "existing", tireId: tire.id,
      placa: tire.placa, marca: tire.marca, diseno: tire.diseno, dimension: tire.dimension,
      eje: tire.eje, posicion: tire.posicion, vehiclePlaca: tire.vehicle?.placa ?? "",
      profundidadInicial: 0, costo: 0,
      causales: "", causalOtro: "", milimetros: String(tire.currentProfundidad ?? ""), images: [],
    }]);
  }

  function addAllFound() {
    const ids = new Set(list.map((d) => d.tireId));
    const toAdd = foundTires.filter((t) => !ids.has(t.id));
    setList((p) => [...p, ...toAdd.map((t) => ({
      key: key(), source: "existing" as const, tireId: t.id,
      placa: t.placa, marca: t.marca, diseno: t.diseno, dimension: t.dimension,
      eje: t.eje, posicion: t.posicion, vehiclePlaca: t.vehicle?.placa ?? "",
      profundidadInicial: 0, costo: 0,
      causales: "", milimetros: String(t.currentProfundidad ?? ""), images: [],
    }))]);
  }

  // -- New tire form ----------------------------------------------------------

  const [nf, setNf] = useState({ placa: "", marca: "", diseno: "", dimension: "", eje: "traccion", profundidadInicial: 16, costo: 0 });

  function addNewToList() {
    if (!nf.placa.trim() || !nf.marca.trim() || !nf.dimension.trim()) { setError("Placa, marca y dimensión son obligatorios"); return; }
    setList((p) => [...p, {
      key: key(), source: "new",
      placa: nf.placa.toUpperCase(), marca: nf.marca, diseno: nf.diseno || "Estándar", dimension: nf.dimension,
      eje: nf.eje, posicion: 0, vehiclePlaca: "",
      profundidadInicial: nf.profundidadInicial, costo: nf.costo,
      causales: "", causalOtro: "", milimetros: "", images: [],
    }]);
    setNf({ placa: "", marca: "", diseno: "", dimension: "", eje: "traccion", profundidadInicial: 16, costo: 0 });
    setShowNew(false); setError("");
  }

  function update(k: string, field: string, value: any) { setList((p) => p.map((d) => d.key === k ? { ...d, [field]: value } : d)); }
  function remove(k: string) { setList((p) => p.filter((d) => d.key !== k)); }

  async function addImage(k: string, file: File) {
    const item = list.find((d) => d.key === k);
    if (!item || item.images.length >= 3) return;
    const b64 = await fileToBase64(file);
    update(k, "images", [...item.images, b64]);
  }

  function removeImage(k: string, idx: number) {
    const item = list.find((d) => d.key === k);
    if (!item) return;
    update(k, "images", item.images.filter((_, i) => i !== idx));
  }

  // -- Submit -----------------------------------------------------------------

  function resolvedCausal(d: { causales: string; causalOtro?: string }): string {
    if (d.causales === "otro") return (d.causalOtro ?? "").trim();
    return d.causales;
  }

  async function handleSubmit() {
    // Validate
    for (const d of list) {
      if (!d.causales) { setError(`Llanta ${d.placa}: seleccione la causa del descarte`); return; }
      if (d.causales === "otro" && !(d.causalOtro ?? "").trim()) {
        setError(`Llanta ${d.placa}: describa la causa del descarte`); return;
      }
      if (!d.milimetros.trim()) { setError(`Llanta ${d.placa}: milímetros finales es obligatorio`); return; }
    }

    setSubmitting(true); setError("");
    try {
      for (const d of list) {
        let tireId = d.tireId;

        if (d.source === "new") {
          const res = await authFetch(`${API_BASE}/tires/create`, {
            method: "POST",
            body: JSON.stringify({
              placa: d.placa, marca: d.marca, diseno: d.diseno, dimension: d.dimension,
              eje: d.eje, posicion: d.posicion, profundidadInicial: d.profundidadInicial,
              costo: d.costo ? [{ valor: d.costo, fecha: new Date().toISOString() }] : [],
              vidaActual: "nueva", companyId,
            }),
          });
          if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? `Error creando ${d.placa}`); }
          const created = await res.json();
          tireId = created.id;
        }

        if (!tireId) continue;

        const causal = resolvedCausal(d);
        await authFetch(`${API_BASE}/tires/${tireId}/vida`, {
          method: "PATCH",
          body: JSON.stringify({
            valor: "fin",
            motivoFin: "desgaste",
            notasRetiro: causal,
            desechoData: {
              causales: causal,
              milimetrosDesechados: parseFloat(d.milimetros) || 0,
              imageUrls: d.images,
            },
          }),
        });
      }

      setSuccess(`${list.length} llanta${list.length !== 1 ? "s" : ""} desechada${list.length !== 1 ? "s" : ""}`);
      setList([]); setFoundTires([]); setSearchTerm("");
      setTimeout(() => onDone(), 1500);
    } catch (e: any) { setError(e.message); }
    setSubmitting(false);
  }

  // -- Render -----------------------------------------------------------------

  const linex = AGENTS.linex;
  const linexInsight = (() => {
    const lines: string[] = [];
    if (list.length === 0) {
      lines.push("Busca llantas por placa o ID para registrar su fin de vida. Captura causales, milimetros finales y fotos.");
    } else {
      lines.push(`${list.length} llanta${list.length > 1 ? "s" : ""} lista${list.length > 1 ? "s" : ""} para desechar. Completa causales y milimetros finales antes de enviar.`);
    }
    return lines.join("\n\n");
  })();

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* LINEX agent header */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #0A183A, #173D68)", border: `1px solid ${linex.color}30` }}
      >
        <div className="flex items-center gap-3">
          <AgentCardHeader agent="linex" insight={linexInsight} />
          <div>
            <p className="text-sm font-black text-white tracking-tight">Modo Rápido — Desechos</p>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
              {linex.status} &middot; {list.length > 0 ? `${list.length} llantas` : "Listo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: linex.color }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: linex.color }}>{linex.codename}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="flex-1 text-red-700">{error}</span>
          <button onClick={() => setError("")}><X className="w-4 h-4 text-red-300" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.3)" }}>
          <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0 mt-0.5" />
          <span className="flex-1 text-[#0A183A]">{success}</span>
        </div>
      )}

      {/* === Search === */}
      <div className="rounded-xl p-4" style={{ border: "1px solid rgba(52,140,203,0.18)" }}>
        <p className="text-xs font-bold text-[#0A183A] mb-3">Buscar llantas para desechar</p>
        <form onSubmit={handleSearch} className="flex gap-2 items-center">
          {/* Compact toggle instead of wide select */}
          <div className="flex rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
            {(["vehicle", "tire"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setSearchMode(m)}
                className="px-3 py-2.5 text-[11px] font-bold transition-all"
                style={{ background: searchMode === m ? "#0A183A" : "#F0F7FF", color: searchMode === m ? "#fff" : "#173D68" }}>
                {m === "vehicle" ? <Truck className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchMode === "vehicle" ? "Placa vehículo" : "ID llanta"}
            className={`${inputCls} flex-1`} />
          <button type="submit" disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>

        {foundTires.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-[#348CCB] uppercase">{foundTires.length} encontradas</p>
              <button onClick={addAllFound} className="text-[10px] font-bold text-[#1E76B6] hover:underline">+ Agregar todas</button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {foundTires.map((t) => {
                const added = list.some((d) => d.tireId === t.id);
                return (
                  <button key={t.id} onClick={() => !added && addTire(t)} disabled={added}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all disabled:opacity-40"
                    style={{ border: "1px solid rgba(52,140,203,0.1)", background: added ? "rgba(52,140,203,0.04)" : "white" }}>
                    <span className="font-mono font-bold text-[#0A183A]">{t.placa}</span>
                    <span className="text-gray-400">P{t.posicion} · {t.marca} · {t.dimension}</span>
                    <span className="ml-auto text-gray-300">{t.vehicle?.placa ?? ""}</span>
                    {added ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Plus className="w-3.5 h-3.5 text-[#1E76B6]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* === Create new tire on the spot === */}
      {!showNew ? (
        <button onClick={() => setShowNew(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-[#F0F7FF]"
          style={{ border: "2px dashed rgba(52,140,203,0.25)", color: "#1E76B6" }}>
          <Package className="w-3.5 h-3.5" /> Crear llanta y desechar directamente
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(249,115,22,0.3)" }}>
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            <span className="text-xs font-bold text-white">Nueva llanta → Desecho directo</span>
            <button onClick={() => setShowNew(false)} className="text-white/70 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="p-4 space-y-3 bg-white">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Placa <span className="text-red-400">*</span></label>
                <input type="text" value={nf.placa} onChange={(e) => setNf((f) => ({ ...f, placa: e.target.value.toUpperCase() }))}
                  placeholder="LL-001" className={inputCls} style={{ textTransform: "uppercase" }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Marca <span className="text-red-400">*</span></label>
                <CatalogAutocomplete value={nf.marca} field="marca" placeholder="Michelin" className={inputCls}
                  onChange={(v) => setNf((f) => ({ ...f, marca: v }))}
                  onSelect={(item) => setNf((f) => ({ ...f, marca: item.marca, dimension: item.dimension, diseno: item.modelo, profundidadInicial: item.rtdMm ?? f.profundidadInicial }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Diseño <span className="text-red-400">*</span></label>
                <CatalogAutocomplete value={nf.diseno} field="modelo" filterMarca={nf.marca} placeholder="XZE2+" className={inputCls}
                  onChange={(v) => setNf((f) => ({ ...f, diseno: v }))}
                  onSelect={(item) => setNf((f) => ({ ...f, diseno: item.modelo, dimension: f.dimension || item.dimension }))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Dimensión <span className="text-red-400">*</span></label>
                <CatalogAutocomplete value={nf.dimension} field="dimension" filterMarca={nf.marca} filterModelo={nf.diseno} placeholder="295/80 R22.5" className={inputCls}
                  onChange={(v) => setNf((f) => ({ ...f, dimension: v }))}
                  onSelect={(item) => setNf((f) => ({ ...f, dimension: item.dimension }))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Eje</label>
                <select value={nf.eje} onChange={(e) => setNf((f) => ({ ...f, eje: e.target.value }))} className={`${inputCls} appearance-none`}>
                  {EJE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={addNewToList}
              className="w-full py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
              Agregar a lista
            </button>
          </div>
        </div>
      )}

      {/* === Discard list === */}
      {list.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">
              <Trash2 className="w-3 h-3 inline mr-1" />{list.length} llanta{list.length !== 1 ? "s" : ""} para desechar
            </h3>
            <div className="flex-1 h-px bg-red-100" />
          </div>

          {list.map((d) => (
            <div key={d.key} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.15)" }}>
              {/* Header */}
              <div className="px-4 py-2 flex items-center justify-between" style={{ background: "rgba(220,38,38,0.04)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-[#0A183A] text-xs">{d.placa}</span>
                  <span className="text-[10px] text-gray-400 truncate">{d.marca} · {d.dimension} · P{d.posicion}</span>
                  {d.vehiclePlaca && <span className="text-[10px] text-[#348CCB]">{d.vehiclePlaca}</span>}
                  {d.source === "new" && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">Nueva</span>}
                </div>
                <button onClick={() => remove(d.key)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>

              {/* Discard fields */}
              <div className="p-4 bg-white space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Causal del descarte <span className="text-red-400">*</span></label>
                    <select
                      value={d.causales}
                      onChange={(e) => update(d.key, "causales", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccione…</option>
                      {DESECHO_CAUSALES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {d.causales === "otro" && (
                      <input
                        type="text"
                        value={d.causalOtro ?? ""}
                        onChange={(e) => update(d.key, "causalOtro", e.target.value)}
                        placeholder="Describa la causa"
                        className={`${inputCls} mt-2`}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1">Milímetros finales <span className="text-red-400">*</span></label>
                    <input type="number" step="0.1" value={d.milimetros} onChange={(e) => update(d.key, "milimetros", e.target.value)}
                      placeholder="ej: 3.5" className={inputCls} />
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1.5">
                    <Camera className="w-3 h-3 inline mr-1" />Fotos del descarte (máx. 3)
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {d.images.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(d.key, i)}
                          className="absolute top-0.5 right-0.5 rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.85)" }}>
                          <X className="w-2.5 h-2.5 text-[#0A183A]" />
                        </button>
                      </div>
                    ))}
                    {d.images.length < 3 && (
                      <label className="w-16 h-16 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-[#F0F7FF]"
                        style={{ border: "2px dashed rgba(52,140,203,0.3)" }}>
                        <Camera className="w-4 h-4 text-[#348CCB]" />
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => e.target.files?.[0] && addImage(d.key, e.target.files[0])} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)" }}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Procesando...</>
              : <><Trash2 className="w-4 h-4 inline mr-2" />Desechar {list.length} llanta{list.length !== 1 ? "s" : ""}</>}
          </button>
        </div>
      )}
    </div>
  );
}
