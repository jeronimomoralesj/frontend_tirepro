"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Upload, X, FileDown, Download, Plus,
  AlertCircle, Trash2, Image as ImageIcon, CheckCircle2, Film, Video,
  Edit3, Save,
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
  tipoBanda: string | null;
  precioCop: number | null;
  cpkEstimado: number | null;
  segmento: string | null;
  tipo: string | null;
  construccion: string | null;
  pctPavimento: number;
  pctDestapado: number;
  cinturones: string | null;
  pr: string | null;
  notasColombia: string | null;
  fuente: string | null;
  url: string | null;
  images: CatalogImage[];
  video?: CatalogVideo | null;
  subscribed?: boolean;
};

type CatalogVideo = {
  id:           string;
  url:          string;
  originalName: string | null;
  mimeType:     string | null;
  sizeBytes:    number | null;
  createdAt:    string;
};

type BrandInfo = {
  name:          string;
  slug:          string;
  logoUrl:       string | null;
  country:       string | null;
  headquarters:  string | null;
  foundedYear:   number | null;
  website:       string | null;
  description:   string | null;
  parentCompany: string | null;
  tier:          string | null;
  tagline:       string | null;
};

// =============================================================================
// Field registry — drives both the sidebar spec list AND the PDF toggles.
// Order here is the order shown in both the UI and the PDF, so a user can
// predict what they'll get.
// =============================================================================

type FieldKey =
  | "dimension" | "indiceCarga" | "indiceVelocidad" | "rtdMm" | "psiRecomendado"
  | "pesoKg"    | "cinturones"  | "pr"              | "ejeTirePro"
  | "terreno"   | "pctUso"
  | "reencauchable" | "tipoBanda" | "construccion" | "segmento" | "tipo";

type FieldDef = { key: FieldKey; label: string; defaultOn: boolean; render: (d: CatalogDetail) => string | null };

// Note: kmEstimadosReales and cpkEstimado are tracked in the DB (used by
// TirePro's internal analytics) but are deliberately NOT exposed here.
// A salesperson sending a product sheet to a customer shouldn't be
// leading with our CPK estimate — that's a TirePro-side number, not a
// manufacturer datum they can defend.
const FIELDS: FieldDef[] = [
  { key: "dimension",         label: "Dimensión",               defaultOn: true,  render: (d) => d.dimension },
  { key: "indiceCarga",       label: "Índice de carga",         defaultOn: true,  render: (d) => d.indiceCarga },
  { key: "indiceVelocidad",   label: "Índice de velocidad",     defaultOn: true,  render: (d) => d.indiceVelocidad },
  { key: "rtdMm",             label: "Profundidad inicial",     defaultOn: true,  render: (d) => d.rtdMm != null ? `${d.rtdMm} mm` : null },
  { key: "psiRecomendado",    label: "Presión recomendada",     defaultOn: true,  render: (d) => d.psiRecomendado != null ? `${d.psiRecomendado} PSI` : null },
  { key: "pesoKg",            label: "Peso",                    defaultOn: false, render: (d) => d.pesoKg != null ? `${d.pesoKg} kg` : null },
  { key: "cinturones",        label: "Cinturones",              defaultOn: true,  render: (d) => d.cinturones },
  { key: "pr",                label: "PR (ply rating)",         defaultOn: true,  render: (d) => d.pr },
  { key: "ejeTirePro",        label: "Eje",                     defaultOn: true,  render: (d) => d.ejeTirePro ?? d.posicion },
  { key: "terreno",           label: "Terreno",                 defaultOn: true,  render: (d) => d.terreno },
  { key: "pctUso",            label: "Pavimento / Destapado",   defaultOn: false, render: (d) => `${d.pctPavimento}% / ${d.pctDestapado}%` },
  { key: "reencauchable",     label: "Reencauchabilidad",       defaultOn: true,  render: (d) => d.reencauchable ? "Sí" : "No" },
  { key: "tipoBanda",         label: "Tipo de banda",           defaultOn: true,  render: (d) => d.tipoBanda },
  { key: "construccion",      label: "Construcción",            defaultOn: false, render: (d) => d.construccion },
  { key: "segmento",          label: "Segmento",                defaultOn: false, render: (d) => d.segmento },
  { key: "tipo",              label: "Tipo",                    defaultOn: false, render: (d) => d.tipo },
];

function defaultToggles(): Record<FieldKey, boolean> {
  return FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f.defaultOn }), {} as Record<FieldKey, boolean>);
}

// =============================================================================
// Page
// =============================================================================

// Subset of Company the PDF builder needs. Fetched once up-front so PDF
// generation doesn't hit the network between clicks.
type CompanyCtx = {
  name: string;
  profileImage: string | null;
  colorMarca:   string | null;
  sitioWeb:     string | null;
  ciudad:       string | null;
  telefono:     string | null;
};

export default function CatalogoSkuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [sku,      setSku]      = useState<CatalogDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [uploading,setUploading]= useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // PDF builder state
  const [toggles,       setToggles]       = useState<Record<FieldKey, boolean>>(defaultToggles());
  const [priceMode,     setPriceMode]     = useState<"none" | "sin_iva" | "con_iva">("none");
  const [priceInput,    setPriceInput]    = useState("");
  // Which images go in the PDF. Initialized to the full set on first load
  // so the default "generate" gives them everything; user unchecks to
  // remove. Kept as a Set of image IDs.
  const [selectedImgs,  setSelectedImgs]  = useState<Set<string>>(new Set());
  const [repName,       setRepName]       = useState("");
  const [repPhone,      setRepPhone]      = useState("");
  const [companyCtx,    setCompanyCtx]    = useState<CompanyCtx | null>(null);
  const [brand,         setBrand]         = useState<BrandInfo | null>(null);
  const [videoUploading,setVideoUploading]= useState(false);
  const [videoDeleting, setVideoDeleting] = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [toast,         setToast]         = useState<string>("");
  // Admin-only edit modal — only `admin` role distribuidor users can
  // mutate the master catalog row, since it's shared with every other
  // distributor viewing the same SKU.
  const [isAdmin,       setIsAdmin]       = useState(false);
  // Sales managers can curate the list too (add / remove) even when
  // they can't mutate the shared SKU fields.
  const [canCurate,     setCanCurate]     = useState(false);
  const [editOpen,      setEditOpen]      = useState(false);
  const [editDraft,     setEditDraft]     = useState<Record<string, any>>({});
  const [saving,        setSaving]        = useState(false);
  const [subscribing,   setSubscribing]   = useState(false);

  // Brand toggles for the PDF — each one maps to a piece of BrandInfo
  // we pulled from /marketplace/brands/:slug. Two groups keeps the UI
  // compact: editorial copy (tagline + description) vs. factual data
  // (country, founded year, parent, tier, website).
  const [brandIncludeAbout, setBrandIncludeAbout] = useState(true);
  const [brandIncludeFacts, setBrandIncludeFacts] = useState(true);

  const fileInput  = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  // Seed rep name from the logged-in user + hydrate company context.
  useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (user?.role === "admin") setIsAdmin(true);
      if (user?.role === "admin" || user?.role === "catalogo_admin") setCanCurate(true);
      if (user?.name && !repName) setRepName(user.name);
      if (user?.companyId) {
        authFetch(`${API_BASE}/companies/${user.companyId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((c) => {
            if (!c) return;
            setCompanyCtx({
              name:         c.name ?? "",
              profileImage: c.profileImage ?? null,
              colorMarca:   c.colorMarca   ?? null,
              sitioWeb:     c.sitioWeb     ?? null,
              ciudad:       c.ciudad       ?? null,
              telefono:     c.telefono     ?? null,
            });
            if (!repPhone && c.telefono) setRepPhone(c.telefono);
          })
          .catch(() => {});
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await authFetch(`${API_BASE}/catalog/dist/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CatalogDetail = await res.json();
      setSku(data);
      // Seed the price input from the catalog's own price if it has one.
      if (data.precioCop && priceMode === "none") setPriceInput(String(Math.round(data.precioCop)));
      // Pre-select every uploaded image. Newly added images after the
      // initial load get auto-selected too (see onUpload).
      setSelectedImgs((prev) => {
        if (prev.size === 0) return new Set(data.images.map((i) => i.id));
        // Keep existing picks but drop IDs that no longer exist (deleted).
        const alive = new Set(data.images.map((i) => i.id));
        const next = new Set<string>();
        for (const id of prev) if (alive.has(id)) next.add(id);
        // If upload just landed, select new image IDs too.
        for (const img of data.images) if (!prev.has(img.id) && prev.size > 0) next.add(img.id);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el SKU");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Pull manufacturer brand info once we know the marca. Normalized slug
  // matches what /marketplace/brands/:slug expects (see ProductClient).
  useEffect(() => {
    if (!sku?.marca) return;
    const slug = sku.marca
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (!slug) return;
    fetch(`${API_BASE}/marketplace/brands/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b && typeof b === "object") {
          setBrand({
            name:          b.name    ?? sku.marca,
            slug:          b.slug    ?? slug,
            logoUrl:       b.logoUrl ?? null,
            country:       b.country ?? null,
            headquarters:  b.headquarters  ?? null,
            foundedYear:   b.foundedYear   ?? null,
            website:       b.website       ?? null,
            description:   b.description   ?? null,
            parentCompany: b.parentCompany ?? null,
            tier:          b.tier    ?? null,
            tagline:       b.tagline ?? null,
          });
        }
      })
      .catch(() => { /* brand page is optional */ });
  }, [sku?.marca]);

  async function onUploadVideo(files: FileList | null) {
    if (!files || files.length === 0 || !sku) return;
    const file = files[0];
    if (file.size > 50 * 1024 * 1024) {
      setError("El video supera 50 MB. Comprímelo antes de subirlo.");
      if (videoInput.current) videoInput.current.value = "";
      return;
    }
    setVideoUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("video", file);
      const res = await authFetch(`${API_BASE}/catalog/dist/${sku.id}/video`, { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir video");
    } finally {
      setVideoUploading(false);
      if (videoInput.current) videoInput.current.value = "";
    }
  }

  // Prefill the edit draft from the current SKU and open the modal.
  function openEdit() {
    if (!sku) return;
    // Seed only fields the dist admin is allowed to mutate. Fleet-
    // derived fields (vidasReencauche, kmEstimados*, precioCop,
    // cpkEstimado) live on the row but aren't exposed here — TirePro
    // computes them from real averages.
    setEditDraft({
      marca: sku.marca, modelo: sku.modelo, dimension: sku.dimension,
      skuRef: sku.skuRef,
      anchoMm: sku.anchoMm, perfil: sku.perfil, rin: sku.rin,
      ejeTirePro: sku.ejeTirePro, posicion: sku.posicion, terreno: sku.terreno,
      pctPavimento: sku.pctPavimento, pctDestapado: sku.pctDestapado,
      rtdMm: sku.rtdMm, indiceCarga: sku.indiceCarga, indiceVelocidad: sku.indiceVelocidad,
      psiRecomendado: sku.psiRecomendado, pesoKg: sku.pesoKg,
      cinturones: sku.cinturones, pr: sku.pr,
      reencauchable: sku.reencauchable, tipoBanda: sku.tipoBanda,
      categoria: sku.categoria, segmento: sku.segmento, tipo: sku.tipo,
      construccion: sku.construccion, notasColombia: sku.notasColombia,
      fuente: sku.fuente, url: sku.url,
    });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!sku) return;
    setSaving(true); setError("");
    try {
      // Normalize: blank strings → null so they clear the DB value.
      // Numeric fields: coerce string inputs back to number, but keep
      // null-or-undefined when the user cleared them.
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(editDraft)) {
        if (v === "" || v === undefined) payload[k] = null;
        else payload[k] = v;
      }
      const res = await authFetch(`${API_BASE}/catalog/dist/${sku.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      setEditOpen(false);
      setToast("Ficha actualizada");
      setTimeout(() => setToast(""), 3000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleSubscription() {
    if (!sku) return;
    const wasSubscribed = !!sku.subscribed;
    if (wasSubscribed && !confirm("¿Quitar esta llanta de tu catálogo? Tus imágenes y video se conservan por si la vuelves a agregar.")) return;
    setSubscribing(true); setError("");
    try {
      const method = wasSubscribed ? "DELETE" : "POST";
      const res = await authFetch(`${API_BASE}/catalog/dist/${sku.id}/subscribe`, { method });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      setToast(wasSubscribed ? "Quitada de tu catálogo" : "Agregada a tu catálogo");
      setTimeout(() => setToast(""), 3000);
      if (wasSubscribed) {
        // Leaving the page makes more sense than sticking around on a
        // tire that's no longer in their list — they can re-add via
        // /explorar.
        router.push("/dashboard/catalogoSku");
      } else {
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setSubscribing(false);
    }
  }

  async function onDeleteVideo() {
    if (!sku?.video) return;
    if (!confirm("¿Eliminar el video?")) return;
    setVideoDeleting(true);
    try {
      const res = await authFetch(`${API_BASE}/catalog/dist/${sku.id}/video`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar video");
    } finally {
      setVideoDeleting(false);
    }
  }

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
      const enabledRows = FIELDS
        .filter((f) => toggles[f.key])
        .map((f) => ({ label: f.label, value: f.render(sku) }))
        .filter((r): r is { label: string; value: string } => !!r.value);

      const price = priceMode === "none"
        ? null
        : Number(priceInput.replace(/[^0-9]/g, "")) || 0;

      // Preserve gallery order (by coverIndex) for the subset the user
      // picked — keeps the PDF layout deterministic regardless of click
      // order in the UI.
      const imageUrls = sku.images
        .filter((img) => selectedImgs.has(img.id))
        .map((img) => img.url);

      // Route S3-hosted images through our authenticated asset proxy so
      // browser CORS on the bucket can't break PDF rendering. Anything
      // that's not ours (e.g. brand logos from manufacturer CDNs) falls
      // back to a direct fetch inside pdf.ts.
      const proxyFetcher = async (u: string): Promise<Blob | null> => {
        if (!/amazonaws\.com/.test(u)) return null;
        const r = await authFetch(`${API_BASE}/catalog/dist/asset-proxy?url=${encodeURIComponent(u)}`);
        if (!r.ok) return null;
        return await r.blob();
      };

      // Pack the brand block only with the toggles the user enabled.
      // Passing null keeps the PDF layout decisions in pdf.ts where
      // they belong — the renderer draws the brand card when it has
      // anything worth showing.
      const brandBlock = brand
        ? {
            name:          brand.name,
            logoUrl:       brand.logoUrl,
            tier:          brand.tier,
            tagline:       brandIncludeAbout ? brand.tagline : null,
            description:   brandIncludeAbout ? brand.description : null,
            country:       brandIncludeFacts ? brand.country : null,
            headquarters:  brandIncludeFacts ? brand.headquarters : null,
            foundedYear:   brandIncludeFacts ? brand.foundedYear : null,
            parentCompany: brandIncludeFacts ? brand.parentCompany : null,
            website:       brandIncludeFacts ? brand.website : null,
          }
        : null;

      const pdfInput: PdfInput = {
        companyName:    companyCtx?.name ?? null,
        companyLogoUrl: companyCtx?.profileImage ?? null,
        companyColor:   companyCtx?.colorMarca ?? null,
        companyWebsite: companyCtx?.sitioWeb ?? null,
        companyCity:    companyCtx?.ciudad ?? null,
        repName:        repName.trim() || companyCtx?.name || null,
        repPhone:       repPhone.trim() || companyCtx?.telefono || null,
        brandLogoUrl:   brand?.logoUrl ?? null,
        brandCountry:   brand?.country ?? null,
        brand:          brandBlock,
        marca:     sku.marca,
        modelo:    sku.modelo,
        dimension: sku.dimension,
        categoria: sku.categoria,
        terreno:   sku.terreno,
        ejeTirePro: sku.ejeTirePro,
        reencauchable: sku.reencauchable,
        imageUrls,
        rows:      enabledRows,
        priceMode,
        priceCop:  price,
        notes:     sku.notasColombia,
        fetchViaProxy: proxyFetcher,
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
        {canCurate && (
          sku.subscribed ? (
            <button onClick={onToggleSubscription} disabled={subscribing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-red-50 disabled:opacity-40"
              style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              {subscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              <span className="hidden sm:inline">Quitar</span>
            </button>
          ) : (
            <button onClick={onToggleSubscription} disabled={subscribing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              {subscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              <span className="hidden sm:inline">Agregar al catálogo</span>
              <span className="sm:hidden">Agregar</span>
            </button>
          )
        )}
      </div>

      {/* Non-subscribed banner — renders a read-only hint at the top so
          sales reps (who can't curate) know why they can't edit, and
          managers see a clear CTA to pull the tire into their list. */}
      {sku && sku.subscribed === false && (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.25)" }}>
            <AlertCircle className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
            <p className="text-xs text-[#0A183A] flex-1">
              Esta llanta no está en tu catálogo. {canCurate ? "Agrégala para personalizarla y generar PDFs." : "Pide a un administrador que la agregue."}
            </p>
          </div>
        </div>
      )}

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
              <>
                <p className="text-[10px] text-gray-500">
                  Toca una imagen para incluirla o excluirla del PDF · {selectedImgs.size}/{sku.images.length} seleccionada{selectedImgs.size === 1 ? "" : "s"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sku.images.map((img) => {
                    const selected = selectedImgs.has(img.id);
                    const toggle = () => setSelectedImgs((prev) => {
                      const next = new Set(prev);
                      if (next.has(img.id)) next.delete(img.id); else next.add(img.id);
                      return next;
                    });
                    return (
                      <div key={img.id}
                        role="button" tabIndex={0}
                        onClick={toggle}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
                        className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer transition-all"
                        style={{
                          background: "#F0F7FF",
                          border: selected ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.15)",
                          boxShadow: selected ? "0 0 0 2px rgba(30,118,182,0.15)" : undefined,
                        }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-contain p-1"
                          style={{ opacity: selected ? 1 : 0.55 }} />
                        {/* Selection badge (top-left) — always visible when selected */}
                        <span className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            background: selected ? "#1E76B6" : "rgba(255,255,255,0.9)",
                            border: selected ? "none" : "1px solid rgba(52,140,203,0.3)",
                            color: selected ? "white" : "#348CCB",
                          }}>
                          {selected ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </span>
                        {/* Delete (top-right, hover-only) */}
                        <button onClick={(e) => { e.stopPropagation(); onDeleteImage(img.id); }}
                          disabled={deleting === img.id}
                          className="absolute top-1 right-1 p-1 rounded-full bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-100">
                          {deleting === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Video block — single attachable MP4 / MOV / WebM. Never
                embedded in the PDF; the sales rep downloads it and
                forwards separately as an "instructional" asset. */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-[#0A183A] flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-[#1E76B6]" />
                  Video (opcional)
                </h3>
                {!sku.video && (
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", color: "white" }}>
                    {videoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {videoUploading ? "Subiendo…" : "Subir video"}
                    <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm" hidden
                      onChange={(e) => onUploadVideo(e.target.files)} />
                  </label>
                )}
              </div>
              {sku.video ? (
                <div className="rounded-xl p-3" style={{ background: "#F0F7FF", border: "1px solid rgba(52,140,203,0.15)" }}>
                  <video src={sku.video.url} controls preload="metadata"
                    className="w-full rounded-lg bg-black" style={{ maxHeight: 280 }} />
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0A183A] truncate">
                        {sku.video.originalName || "Video del producto"}
                      </p>
                      {sku.video.sizeBytes != null && (
                        <p className="text-[10px] text-gray-400">
                          {(sku.video.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <a href={sku.video.url} download={sku.video.originalName || "video"} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                        <Download className="w-3 h-3" />
                        Descargar
                      </a>
                      <button onClick={onDeleteVideo} disabled={videoDeleting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition-all disabled:opacity-40">
                        {videoDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl flex flex-col items-center justify-center py-6 text-gray-400 gap-1.5"
                  style={{ background: "#F0F7FF", border: "1px dashed rgba(52,140,203,0.3)" }}>
                  <Video className="w-8 h-8 opacity-40" />
                  <p className="text-[10px]">Hasta 50 MB · MP4, MOV, WebM</p>
                  <p className="text-[10px] text-gray-400">No se incluye en el PDF — sirve para enviar aparte</p>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT — Full spec + PDF builder */}
          <section className="space-y-4">
            {/* Spec sheet */}
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-[#0A183A]">Ficha técnica</h2>
                {isAdmin && (
                  <button onClick={openEdit}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-90"
                    style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.25)" }}>
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </button>
                )}
              </div>
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

              {/* Brand data — toggles render only when /marketplace/brands
                  has an entry for this marca. Two groups keeps the UI tight. */}
              {brand && (brand.tagline || brand.description || brand.country || brand.foundedYear || brand.parentCompany || brand.tier || brand.website) && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1.5">
                    Incluir datos de la marca
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(brand.tagline || brand.description) && (
                      <label
                        className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                        style={{
                          background: brandIncludeAbout ? "rgba(30,118,182,0.08)" : "white",
                          border: `1px solid ${brandIncludeAbout ? "rgba(30,118,182,0.25)" : "rgba(52,140,203,0.12)"}`,
                        }}>
                        <input type="checkbox" checked={brandIncludeAbout}
                          onChange={(e) => setBrandIncludeAbout(e.target.checked)}
                          className="accent-[#1E76B6] mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-medium text-[#0A183A] block">Descripción y tagline</span>
                          {brand.tagline && <span className="text-[9px] text-gray-400 truncate block">{brand.tagline}</span>}
                        </div>
                      </label>
                    )}
                    {(brand.country || brand.foundedYear || brand.parentCompany || brand.tier || brand.website || brand.headquarters) && (
                      <label
                        className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                        style={{
                          background: brandIncludeFacts ? "rgba(30,118,182,0.08)" : "white",
                          border: `1px solid ${brandIncludeFacts ? "rgba(30,118,182,0.25)" : "rgba(52,140,203,0.12)"}`,
                        }}>
                        <input type="checkbox" checked={brandIncludeFacts}
                          onChange={(e) => setBrandIncludeFacts(e.target.checked)}
                          className="accent-[#1E76B6] mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-medium text-[#0A183A] block">Datos de la marca</span>
                          <span className="text-[9px] text-gray-400 truncate block">
                            {[
                              brand.country,
                              brand.foundedYear ? `fundada ${brand.foundedYear}` : null,
                              brand.tier ? `${brand.tier}` : null,
                            ].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Contact block — printed in the footer of the PDF */}
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1.5">Contacto en el PDF</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Nombre</label>
                    <input type="text" value={repName} onChange={(e) => setRepName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
                      style={{ border: "1px solid rgba(52,140,203,0.2)" }} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Teléfono</label>
                    <input type="text" value={repPhone} onChange={(e) => setRepPhone(e.target.value)}
                      placeholder="Ej: 300 123 4567"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E76B6] text-[#0A183A]"
                      style={{ border: "1px solid rgba(52,140,203,0.2)" }} />
                  </div>
                </div>
                {(companyCtx?.sitioWeb || companyCtx?.ciudad) && (
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    Se añadirá también
                    {companyCtx.sitioWeb && <> {companyCtx.sitioWeb}</>}
                    {companyCtx.sitioWeb && companyCtx.ciudad && <> ·</>}
                    {companyCtx.ciudad  && <> {companyCtx.ciudad}</>}
                  </p>
                )}
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

      {/* Admin edit modal — only rendered when the user clicked Editar. */}
      {editOpen && sku && (
        <EditFichaModal
          draft={editDraft}
          setDraft={setEditDraft}
          saving={saving}
          onCancel={() => setEditOpen(false)}
          onSave={onSaveEdit}
        />
      )}
    </div>
  );
}

// =============================================================================
// Edit modal
// =============================================================================

function EditFichaModal({
  draft, setDraft, saving, onCancel, onSave,
}: {
  draft: Record<string, any>;
  setDraft: (d: Record<string, any>) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = (key: string, val: any) => setDraft({ ...draft, [key]: val });
  const txt = (key: string, label: string, placeholder = "") => (
    <FieldRow label={label}>
      <input type="text" value={draft[key] ?? ""} placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
        style={{ background: "white", border: "1px solid rgba(52,140,203,0.25)" }} />
    </FieldRow>
  );
  const numF = (key: string, label: string, step = "1") => (
    <FieldRow label={label}>
      <input type="number" step={step} value={draft[key] ?? ""}
        onChange={(e) => set(key, e.target.value === "" ? null : Number(e.target.value))}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
        style={{ background: "white", border: "1px solid rgba(52,140,203,0.25)" }} />
    </FieldRow>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.55)" }}>
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-3 bg-white"
          style={{ borderBottom: "1px solid rgba(52,140,203,0.1)" }}>
          <div>
            <p className="text-sm font-black text-[#0A183A]">Editar ficha del SKU</p>
            <p className="text-[10px] text-gray-400">Los cambios impactan el catálogo compartido con todos los distribuidores</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Fieldset title="Identidad">
            <Grid2>
              {txt("marca",     "Marca")}
              {txt("modelo",    "Modelo")}
              {txt("dimension", "Dimensión", "295/80R22.5")}
              {txt("skuRef",    "SKU")}
            </Grid2>
          </Fieldset>

          <Fieldset title="Medida">
            <Grid2>
              {numF("anchoMm", "Ancho (mm)")}
              {txt("perfil",  "Perfil")}
              {txt("rin",     "Rin")}
            </Grid2>
          </Fieldset>

          <Fieldset title="Aplicación">
            <Grid2>
              <FieldRow label="Eje TirePro">
                <select value={draft.ejeTirePro ?? ""}
                  onChange={(e) => set("ejeTirePro", e.target.value || null)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.25)" }}>
                  <option value="">—</option>
                  <option value="direccion">direccion</option>
                  <option value="traccion">traccion</option>
                  <option value="libre">libre</option>
                  <option value="remolque">remolque</option>
                  <option value="repuesto">repuesto</option>
                </select>
              </FieldRow>
              {txt("posicion", "Posición (D/T/AP/R)")}
              {txt("terreno",  "Terreno", "Carretera / Mixto / …")}
              {numF("pctPavimento", "% Pavimento")}
              {numF("pctDestapado", "% Destapado")}
              <FieldRow label="Categoría">
                <select value={draft.categoria ?? ""}
                  onChange={(e) => set("categoria", e.target.value || null)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.25)" }}>
                  <option value="">—</option>
                  <option value="nueva">nueva</option>
                  <option value="reencauche">reencauche</option>
                </select>
              </FieldRow>
            </Grid2>
          </Fieldset>

          <Fieldset title="Desempeño">
            <Grid2>
              {numF("rtdMm", "RTD inicial (mm)", "0.1")}
              {txt("indiceCarga",     "Índice de carga", "152/148")}
              {txt("indiceVelocidad", "Índice de velocidad", "M")}
              {numF("psiRecomendado", "PSI recomendado")}
              {numF("pesoKg",         "Peso (kg)", "0.1")}
              {txt("cinturones",      "Cinturones", "4B+2N")}
              {txt("pr",              "PR (ply rating)", "16PR")}
            </Grid2>
          </Fieldset>

          <Fieldset title="Reencauche">
            <Grid2>
              <FieldRow label="Reencauchable">
                <select value={draft.reencauchable === true ? "true" : draft.reencauchable === false ? "false" : ""}
                  onChange={(e) => set("reencauchable", e.target.value === "true")}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.25)" }}>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </FieldRow>
              {txt("tipoBanda", "Tipo de banda", "Ej: Bandag BDR-HT")}
            </Grid2>
            <p className="text-[10px] text-gray-400 mt-2">
              Las vidas de reencauche, los kilómetros estimados y el precio se calculan con promedios de toda la red de TirePro.
            </p>
          </Fieldset>

          <Fieldset title="Clasificación">
            <Grid2>
              {txt("segmento",     "Segmento")}
              {txt("tipo",         "Tipo", "Radial / Convencional")}
              {txt("construccion", "Construcción", "Acero / Nylon")}
              {txt("fuente",       "Fuente")}
              {txt("url",          "URL")}
            </Grid2>
          </Fieldset>

          <Fieldset title="Notas Colombia">
            <textarea value={draft.notasColombia ?? ""}
              rows={3}
              onChange={(e) => set("notasColombia", e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg text-xs text-[#0A183A] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              style={{ border: "1px solid rgba(52,140,203,0.25)" }} />
          </Fieldset>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-3 bg-white"
          style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}>
          <button onClick={onCancel} disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#1E76B6] mb-2">{title}</p>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  );
}
