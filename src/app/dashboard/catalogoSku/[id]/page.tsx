"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Upload, X, FileDown, Download, Plus,
  AlertCircle, Trash2, Image as ImageIcon, CheckCircle2,
} from "lucide-react";
import { buildCatalogPdf, type PdfInput } from "../pdf";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

// =============================================================================
// Types
// =============================================================================

type CatalogImage = { id: string; url: string; coverIndex: number };

type CatalogDetail = {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  skuRef: string;
  categoria: string | null;
  terreno: string | null;
  ejeTirePro: string | null;
  posicion: string | null;
  anchoMm: number | null;
  perfil: string | null;
  rin: string | null;
  rtdMm: number | null;
  indiceCarga: string | null;
  indiceVelocidad: string | null;
  psiRecomendado: number | null;
  pesoKg: number | null;
  kmEstimadosReales: number | null;
  kmEstimadosFabrica: number | null;
  reencauchable: boolean;
  vidasReencauche: number;
  precioCop: number | null;
  cpkEstimado: number | null;
  segmento: string | null;
  tipo: string | null;
  construccion: string | null;
  pctPavimento: number;
  pctDestapado: number;
  notasColombia: string | null;
  images: CatalogImage[];
};

// =============================================================================
// Field registry — drives both the sidebar spec list AND the PDF toggles.
// Order here is the order shown in both the UI and the PDF, so a user can
// predict what they'll get.
// =============================================================================

type FieldKey =
  | "dimension" | "indiceCarga" | "indiceVelocidad" | "rtdMm" | "psiRecomendado"
  | "pesoKg"    | "kmEstimadosReales" | "cpkEstimado" | "ejeTirePro" | "terreno"
  | "pctUso"    | "reencauchable" | "construccion" | "segmento" | "tipo" | "skuRef";

type FieldDef = { key: FieldKey; label: string; defaultOn: boolean; render: (d: CatalogDetail) => string | null };

const FIELDS: FieldDef[] = [
  { key: "dimension",         label: "Dimensión",               defaultOn: true,  render: (d) => d.dimension },
  { key: "indiceCarga",       label: "Índice de carga",         defaultOn: true,  render: (d) => d.indiceCarga },
  { key: "indiceVelocidad",   label: "Índice de velocidad",     defaultOn: true,  render: (d) => d.indiceVelocidad },
  { key: "rtdMm",             label: "Profundidad inicial",     defaultOn: true,  render: (d) => d.rtdMm != null ? `${d.rtdMm} mm` : null },
  { key: "psiRecomendado",    label: "Presión recomendada",     defaultOn: true,  render: (d) => d.psiRecomendado != null ? `${d.psiRecomendado} PSI` : null },
  { key: "pesoKg",            label: "Peso",                    defaultOn: false, render: (d) => d.pesoKg != null ? `${d.pesoKg} kg` : null },
  { key: "kmEstimadosReales", label: "Km estimados",            defaultOn: true,  render: (d) => d.kmEstimadosReales != null ? `${(d.kmEstimadosReales / 1000).toFixed(0)}K km` : null },
  { key: "cpkEstimado",       label: "CPK estimado",            defaultOn: false, render: (d) => d.cpkEstimado != null ? `$${Math.round(d.cpkEstimado).toLocaleString("es-CO")}/km` : null },
  { key: "ejeTirePro",        label: "Eje",                     defaultOn: true,  render: (d) => d.ejeTirePro ?? d.posicion },
  { key: "terreno",           label: "Terreno",                 defaultOn: true,  render: (d) => d.terreno },
  { key: "pctUso",            label: "Pavimento / Destapado",   defaultOn: false, render: (d) => `${d.pctPavimento}% / ${d.pctDestapado}%` },
  { key: "reencauchable",     label: "Reencauchabilidad",       defaultOn: true,  render: (d) => d.reencauchable ? `Sí · hasta ${d.vidasReencauche || 3} vidas` : "No" },
  { key: "construccion",      label: "Construcción",            defaultOn: false, render: (d) => d.construccion },
  { key: "segmento",          label: "Segmento",                defaultOn: false, render: (d) => d.segmento },
  { key: "tipo",              label: "Tipo",                    defaultOn: false, render: (d) => d.tipo },
  { key: "skuRef",            label: "SKU",                     defaultOn: false, render: (d) => d.skuRef },
];

function defaultToggles(): Record<FieldKey, boolean> {
  return FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f.defaultOn }), {} as Record<FieldKey, boolean>);
}

// =============================================================================
// Page
// =============================================================================

export default function CatalogoSkuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [sku,      setSku]      = useState<CatalogDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [uploading,setUploading]= useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // PDF builder state
  const [toggles,   setToggles]   = useState<Record<FieldKey, boolean>>(defaultToggles());
  const [priceMode, setPriceMode] = useState<"none" | "sin_iva" | "con_iva">("none");
  const [priceInput,setPriceInput]= useState("");
  const [generating,setGenerating]= useState(false);
  const [toast,     setToast]     = useState<string>("");

  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await authFetch(`${API_BASE}/catalog/dist/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSku(data);
      // Seed the price input from the catalog's own price if it has one.
      if (data.precioCop && priceMode === "none") setPriceInput(String(Math.round(data.precioCop)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el SKU");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0 || !sku) return;
    setUploading(true); setError("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await authFetch(`${API_BASE}/catalog/dist/${sku.id}/images`, { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(body || `HTTP ${res.status}`);
        }
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onDeleteImage(imgId: string) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    setDeleting(imgId);
    try {
      const res = await authFetch(`${API_BASE}/catalog/dist/images/${imgId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  async function onGeneratePdf() {
    if (!sku) return;
    setGenerating(true); setError(""); setToast("");
    try {
      // Resolve company logo from the user's stored company or /companies/me.
      let logoUrl: string | null = null;
      let companyName: string | null = null;
      try {
        const userRaw = localStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        if (user?.companyId) {
          const r = await authFetch(`${API_BASE}/companies/${user.companyId}`);
          if (r.ok) {
            const c = await r.json();
            logoUrl = c.profileImage ?? null;
            companyName = c.name ?? null;
          }
        }
      } catch { /* non-fatal */ }

      const enabledRows = FIELDS
        .filter((f) => toggles[f.key])
        .map((f) => ({ label: f.label, value: f.render(sku) }))
        .filter((r): r is { label: string; value: string } => !!r.value);

      const price = priceMode === "none"
        ? null
        : Number(priceInput.replace(/[^0-9]/g, "")) || 0;

      const pdfInput: PdfInput = {
        companyName,
        companyLogoUrl: logoUrl,
        marca: sku.marca,
        modelo: sku.modelo,
        dimension: sku.dimension,
        categoria: sku.categoria,
        heroImageUrl: sku.images[0]?.url ?? null,
        rows: enabledRows,
        priceMode,
        priceCop: price,
        notes: sku.notasColombia,
      };

      const blob = await buildCatalogPdf(pdfInput);
      // Save to user's disk.
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `${sku.marca}-${sku.modelo}-${sku.dimension}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");
      a.click();
      URL.revokeObjectURL(url);

      // Log the download — best-effort, don't surface failures to the user.
      authFetch(`${API_BASE}/catalog/dist/${sku.id}/track-download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceMode,
          priceCop: price,
          fieldsIncluded: toggles,
        }),
      }).catch(() => {});

      setToast("PDF descargado");
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando PDF");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#1E76B6] animate-spin" />
      </div>
    );
  }
  if (!sku) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-500">
        <AlertCircle className="w-8 h-8" />
        <p>{error || "SKU no encontrado"}</p>
        <Link href="/dashboard/catalogoSku" className="text-[#1E76B6] text-sm font-bold hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const priceNumber = Number(priceInput.replace(/[^0-9]/g, "")) || 0;
  const effectivePrice = priceMode === "con_iva" ? Math.round(priceNumber * 1.19) : priceNumber;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <button onClick={() => router.push("/dashboard/catalogoSku")}
          className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-[#0A183A]" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB]">{sku.marca}</p>
          <p className="text-sm font-black text-[#0A183A] leading-tight truncate">{sku.modelo} · {sku.dimension}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-700"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}
        {toast && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-emerald-700 flex items-center gap-2"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <CheckCircle2 className="w-4 h-4" />
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — Gallery + Upload */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#0A183A]">Imágenes del producto</h2>
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", color: "white" }}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Subiendo…" : "Subir"}
                <input ref={fileInput} type="file" accept="image/*" multiple hidden
                  onChange={(e) => onUpload(e.target.files)} />
              </label>
            </div>
            {sku.images.length === 0 ? (
              <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400 gap-2"
                style={{ background: "#F0F7FF", border: "1px dashed rgba(52,140,203,0.3)" }}>
                <ImageIcon className="w-10 h-10 opacity-40" />
                <p className="text-xs">Sin imágenes todavía</p>
                <p className="text-[10px] text-gray-400">Sube hasta 5 MB por imagen (JPG · PNG · WebP)</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sku.images.map((img) => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden"
                    style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.15)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-contain p-1" />
                    <button onClick={() => onDeleteImage(img.id)} disabled={deleting === img.id}
                      className="absolute top-1 right-1 p-1 rounded-full bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-100">
                      {deleting === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RIGHT — Full spec + PDF builder */}
          <section className="space-y-4">
            {/* Spec sheet */}
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}>
              <h2 className="text-sm font-black text-[#0A183A] mb-3">Ficha técnica</h2>
              <div className="space-y-1.5">
                {FIELDS.map((f) => {
                  const v = f.render(sku);
                  if (!v) return null;
                  return (
                    <div key={f.key} className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-[11px] text-gray-500">{f.label}</span>
                      <span className="text-[11px] font-bold text-[#0A183A] text-right">{v}</span>
                    </div>
                  );
                })}
                {sku.notasColombia && (
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <p className="text-[10px] font-bold uppercase text-[#1E76B6] tracking-wider mb-1">Notas Colombia</p>
                    <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">{sku.notasColombia}</p>
                  </div>
                )}
              </div>
            </div>

            {/* PDF builder */}
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "linear-gradient(135deg, rgba(30,118,182,0.04), rgba(52,140,203,0.04))", border: "1px solid rgba(30,118,182,0.18)" }}>
              <h2 className="text-sm font-black text-[#0A183A] mb-3 flex items-center gap-2">
                <FileDown className="w-4 h-4 text-[#1E76B6]" />
                Generar ficha en PDF
              </h2>

              {/* Price mode */}
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1.5">Precio</p>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { k: "none",    label: "Sin precio" },
                    { k: "sin_iva", label: "Sin IVA" },
                    { k: "con_iva", label: "Con IVA" },
                  ] as const).map((opt) => {
                    const active = priceMode === opt.k;
                    return (
                      <button key={opt.k} onClick={() => setPriceMode(opt.k)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: active ? "#1E76B6" : "white",
                          color: active ? "white" : "#0A183A",
                          border: active ? "1px solid #1E76B6" : "1px solid rgba(52,140,203,0.2)",
                        }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {priceMode !== "none" && (
                  <div className="mt-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input type="text" inputMode="numeric" value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder={priceMode === "con_iva" ? "Precio base (sin IVA)" : "Precio"}
                        className="w-full pl-7 pr-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
                        style={{ border: "1px solid rgba(52,140,203,0.2)" }} />
                    </div>
                    {priceMode === "con_iva" && priceNumber > 0 && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        Se mostrará ${effectivePrice.toLocaleString("es-CO")} (IVA 19% incluido)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Field toggles */}
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1.5">Qué incluir</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIELDS.map((f) => {
                    const v = f.render(sku);
                    if (!v) return null;
                    const checked = toggles[f.key];
                    return (
                      <label key={f.key}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                        style={{ background: checked ? "rgba(30,118,182,0.08)" : "white", border: `1px solid ${checked ? "rgba(30,118,182,0.25)" : "rgba(52,140,203,0.12)"}` }}>
                        <input type="checkbox" checked={checked}
                          onChange={(e) => setToggles((t) => ({ ...t, [f.key]: e.target.checked }))}
                          className="accent-[#1E76B6]" />
                        <span className="font-medium text-[#0A183A] truncate">{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button onClick={onGeneratePdf} disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generating ? "Generando…" : "Descargar PDF"}
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-2">
                Se registrará esta descarga en las estadísticas del equipo
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
