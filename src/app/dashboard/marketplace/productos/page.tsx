"use client";

// Marketplace listings manager. Distribuidores see every product they
// have published on /marketplace with stock, price, promo state, and
// active flag — and can spin up a brand-new listing inline via the
// "Nuevo producto" modal. Heavier flows (catalog SKU picker, bulk
// promo, inactive cleanup) still live in /catalogoDist.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ExternalLink, FileSpreadsheet,
  Image as ImageIcon, Loader2, Package, Pencil, Percent, Plus, Search,
  Tag, ToggleLeft, ToggleRight, Trash2, Upload, X,
  MapPin, Store as StoreIcon, RefreshCw, Link2,
} from "lucide-react";
import { productHref } from "../../../marketplace/product/_lib/url";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Listing {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  eje: string | null;
  tipo: string;
  precioCop: number;
  precioPromo: number | null;
  promoHasta: string | null;
  cantidadDisponible: number;
  tiempoEntrega: string | null;
  descripcion: string | null;
  isActive: boolean;
  imageUrls: string[] | null;
  coverIndex: number;
  updatedAt?: string;
}

type FilterTab = "all" | "active" | "low" | "promo" | "inactive";

export default function ProductosMarketplacePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showBanda, setShowBanda] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u?.companyId) setCompanyId(u.companyId);
    } catch { /* */ }
  }, []);

  function refetch(cId: string) {
    setLoading(true);
    authFetch(`${API_BASE}/marketplace/listings/distributor?distributorId=${encodeURIComponent(cId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!companyId) return;
    refetch(companyId);
  }, [companyId]);

  const counts = useMemo(() => {
    const now = Date.now();
    const isPromo = (l: Listing) =>
      l.precioPromo != null && l.promoHasta != null && new Date(l.promoHasta).getTime() > now;
    // Counts mirror what each tab actually renders. "Todos" shows
    // active only — so the chip count must reflect that, otherwise
    // it lies (e.g. "Todos · 47" but only 32 cards render).
    const active = listings.filter((l) => l.isActive);
    return {
      all:      active.length,
      active:   active.length,
      low:      active.filter((l) => l.cantidadDisponible > 0 && l.cantidadDisponible <= 3).length,
      promo:    active.filter(isPromo).length,
      inactive: listings.filter((l) => !l.isActive).length,
    };
  }, [listings]);

  const visible = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (q) {
        const blob = `${l.marca} ${l.modelo} ${l.dimension}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      // Inactive listings are quarantined to their own tab — every
      // other filter ("Todos" included) hides them so the dist's
      // public-facing inventory view doesn't get cluttered with
      // pausados / dados de baja.
      if (tab !== "inactive" && !l.isActive) return false;
      if (tab === "inactive" &&  l.isActive) return false;
      if (tab === "low"      && !(l.cantidadDisponible > 0 && l.cantidadDisponible <= 3)) return false;
      if (tab === "promo"    && !(l.precioPromo != null && l.promoHasta != null && new Date(l.promoHasta).getTime() > now)) return false;
      return true;
    });
  }, [listings, search, tab]);

  const totalUnits = useMemo(
    () => listings.reduce((s, l) => s + (l.cantidadDisponible ?? 0), 0),
    [listings],
  );
  const totalValue = useMemo(
    () => listings.reduce((s, l) => s + (l.precioCop ?? 0) * (l.cantidadDisponible ?? 0), 0),
    [listings],
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#1E76B6]">
              Marketplace · Productos
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] mt-1 leading-tight">
              Productos publicados
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Listado en vivo de tus llantas en el marketplace público. Edición avanzada en{" "}
              <Link href="/dashboard/agregarDist" className="font-bold text-[#1E76B6] hover:underline">
                Agregar
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowBanda(true)}
              disabled={!companyId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-[#0A183A] bg-white hover:bg-[#F0F7FF] transition-colors disabled:opacity-50"
              style={{ border: "1px solid rgba(10,24,58,0.10)" }}
            >
              <Tag className="w-4 h-4" /> Editar por banda
            </button>
            <button
              type="button"
              onClick={() => setShowBulk(true)}
              disabled={!companyId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-[#0A183A] bg-white hover:bg-[#F0F7FF] transition-colors disabled:opacity-50"
              style={{ border: "1px solid rgba(10,24,58,0.10)" }}
            >
              <Upload className="w-4 h-4" /> Carga masiva
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              disabled={!companyId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-black text-white transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
              }}
            >
              <Plus className="w-4 h-4" /> Nuevo producto
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Kpi label="Productos"          value={String(counts.all)}    accent="#1E76B6" />
          <Kpi label="Unidades en stock"  value={String(totalUnits)}    accent="#62b8f0" />
          <Kpi label="Valor en stock"     value={fmtCOP(totalValue)}    accent="#0A183A" />
          <Kpi
            label="Stock bajo"
            value={String(counts.low)}
            accent={counts.low > 0 ? "#f97316" : "#9ca3af"}
          />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por marca, modelo o dimensión…"
              className="w-full pl-10 pr-3 py-2.5 rounded-full text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              style={{ border: "1px solid rgba(10,24,58,0.10)" }}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <FilterChip active={tab === "all"}      onClick={() => setTab("all")}>Todos · {counts.all}</FilterChip>
            <FilterChip active={tab === "active"}   onClick={() => setTab("active")}>Activos · {counts.active}</FilterChip>
            <FilterChip active={tab === "promo"}    onClick={() => setTab("promo")}>Promo · {counts.promo}</FilterChip>
            <FilterChip active={tab === "low"}      onClick={() => setTab("low")}>Stock bajo · {counts.low}</FilterChip>
            <FilterChip active={tab === "inactive"} onClick={() => setTab("inactive")}>Inactivos · {counts.inactive}</FilterChip>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#1E76B6]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div
            className="rounded-xl bg-white p-10 text-center"
            style={{ border: "1px dashed rgba(10,24,58,0.12)" }}
          >
            <Package className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {listings.length === 0
                ? "Aún no tienes productos publicados en el marketplace."
                : "No hay productos que coincidan con esos filtros."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {visible.map((l) => (
              <ListingRow key={l.id} l={l} onEdit={() => setEditing(l)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && companyId && (
        <CreateListingModal
          companyId={companyId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch(companyId); }}
        />
      )}

      {showBulk && companyId && (
        <BulkUploadModal
          companyId={companyId}
          onClose={() => setShowBulk(false)}
          onUploaded={() => { setShowBulk(false); refetch(companyId); }}
        />
      )}

      {showBanda && companyId && (
        <BandaEditModal
          companyId={companyId}
          listings={listings}
          onClose={() => setShowBanda(false)}
          onUpdated={() => { setShowBanda(false); refetch(companyId); }}
        />
      )}

      {editing && companyId && (
        <EditListingModal
          companyId={companyId}
          listing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(companyId); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-white p-3.5" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">{label}</p>
      <p className="text-lg sm:text-xl font-black tabular-nums mt-0.5" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
      style={{
        background: active ? "#0A183A" : "white",
        color: active ? "white" : "#0A183A",
        border: `1px solid ${active ? "#0A183A" : "rgba(10,24,58,0.10)"}`,
      }}
    >
      {children}
    </button>
  );
}

function ListingRow({ l, onEdit }: { l: Listing; onEdit: () => void }) {
  const now = Date.now();
  const isPromo =
    l.precioPromo != null && l.promoHasta != null && new Date(l.promoHasta).getTime() > now;
  const price = isPromo ? l.precioPromo! : l.precioCop;
  const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
  const cover = imgs.length > 0 ? (imgs[l.coverIndex ?? 0] ?? imgs[0]) : null;
  const lowStock = l.cantidadDisponible > 0 && l.cantidadDisponible <= 3;

  return (
    <div
      className="flex gap-3 p-3 rounded-xl bg-white"
      style={{ border: "1px solid rgba(10,24,58,0.08)", opacity: l.isActive ? 1 : 0.65 }}
    >
      <div
        className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)" }}
      >
        {cover
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={cover} alt="" className="w-full h-full object-contain p-1" />
          : <Tag className="w-6 h-6 text-gray-300" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase text-[#348CCB]">{l.marca}</span>
          <span className="text-sm font-black text-[#0A183A] truncate">{l.modelo}</span>
          {!l.isActive && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-gray-100 text-gray-500">
              Inactivo
            </span>
          )}
          {isPromo && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-50 text-emerald-700">
              Promo
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
          {l.dimension}
          {l.eje ? ` · ${l.eje}` : ""}
          {l.tipo === "reencauche" ? " · Reencauche" : ""}
        </p>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-base font-black text-[#0A183A] tabular-nums">{fmtCOP(price)}</span>
          {isPromo && (
            <span className="text-[10px] text-gray-400 line-through tabular-nums">{fmtCOP(l.precioCop)}</span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
          {l.cantidadDisponible === 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertTriangle className="w-3 h-3" /> Sin stock
            </span>
          ) : lowStock ? (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertTriangle className="w-3 h-3" /> Solo {l.cantidadDisponible} unidades
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> {l.cantidadDisponible} en stock
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-3">
          <Link
            href={productHref(l)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-[#1E76B6] hover:underline inline-flex items-center gap-1"
          >
            Ver público <ExternalLink className="w-2.5 h-2.5" />
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="text-[10px] font-bold text-[#0A183A] hover:underline inline-flex items-center gap-1"
          >
            <Pencil className="w-2.5 h-2.5" /> Editar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Create modal
// ─────────────────────────────────────────────────────────────────────

interface CreateForm {
  marca: string;
  modelo: string;
  dimension: string;
  // Must match Prisma's EjeType enum exactly — sending anything else
  // (including the old "todas" value) makes the backend reject the
  // request with `Invalid value for argument eje. Expected EjeType.`.
  eje: "" | "direccion" | "traccion" | "libre" | "remolque" | "repuesto";
  tipo: "nueva" | "reencauche";
  precioCop: number | "";
  cantidadDisponible: number | "";
  // Backend stores tiempoEntrega as a single string ("3 días"). The form
  // splits it into a numeric quantity + unit for nicer UX, then joins
  // them on submit.
  tiempoEntregaNum: number | "";
  tiempoEntregaUnit: "días" | "semanas";
  descripcion: string;
  imageUrls: string[];
  coverIndex: number;
}

const EMPTY_CREATE: CreateForm = {
  marca: "", modelo: "", dimension: "", eje: "", tipo: "nueva",
  precioCop: "", cantidadDisponible: "",
  tiempoEntregaNum: "", tiempoEntregaUnit: "días",
  descripcion: "", imageUrls: [], coverIndex: 0,
};

function CreateListingModal({
  companyId, onClose, onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const canSave =
    form.marca.trim().length > 0 &&
    form.modelo.trim().length > 0 &&
    form.dimension.trim().length > 0 &&
    typeof form.precioCop === "number" && form.precioCop > 0;

  async function handleUpload(file: File) {
    if (form.imageUrls.length >= 5) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("distributorId", companyId);
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`${API_BASE}/marketplace/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, url] }));
    } catch {
      setError("No se pudo subir la imagen");
      setTimeout(() => setError(""), 2500);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings`, {
        method: "POST",
        body: JSON.stringify({
          distributorId:      companyId,
          marca:              form.marca.trim(),
          modelo:             form.modelo.trim(),
          dimension:          form.dimension.trim(),
          eje:                form.eje || undefined,
          tipo:               form.tipo,
          precioCop:          form.precioCop,
          cantidadDisponible: typeof form.cantidadDisponible === "number" ? form.cantidadDisponible : 0,
          tiempoEntrega:
            typeof form.tiempoEntregaNum === "number" && form.tiempoEntregaNum > 0
              ? `${form.tiempoEntregaNum} ${form.tiempoEntregaUnit}`
              : undefined,
          descripcion:        form.descripcion.trim() || undefined,
          imageUrls:          form.imageUrls.length > 0 ? form.imageUrls : undefined,
          coverIndex:         form.imageUrls.length > 0 ? form.coverIndex : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "No se pudo crear el producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">Crear listing</p>
            <h2 className="text-lg font-black text-[#0A183A]">Nuevo producto</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Identidad */}
          <div className="grid sm:grid-cols-2 gap-3">
            <ModalField label="Marca *">
              <Combobox
                value={form.marca}
                onChange={(v) => setForm((f) => ({ ...f, marca: v }))}
                placeholder="Bridgestone"
                fetchSuggestions={async (q) => {
                  const url = `${API_BASE}/catalog/autocomplete/brands?q=${encodeURIComponent(q)}&limit=20`;
                  const r = await fetch(url);
                  if (!r.ok) return [];
                  const rows = (await r.json()) as Array<{ marca: string }>;
                  return rows.map((row) => row.marca);
                }}
              />
            </ModalField>
            <ModalField label="Modelo *">
              <Combobox
                value={form.modelo}
                onChange={(v) => setForm((f) => ({ ...f, modelo: v }))}
                placeholder="R268 Ecopia"
                disabled={!form.marca.trim()}
                disabledHint="Selecciona una marca primero"
                // Re-fetch whenever marca changes so the model list is
                // always scoped to the chosen brand.
                refetchKey={form.marca}
                fetchSuggestions={async (q) => {
                  const params = new URLSearchParams({ marca: form.marca, q, limit: "20" });
                  const r = await fetch(`${API_BASE}/catalog/autocomplete/models?${params}`);
                  if (!r.ok) return [];
                  const rows = (await r.json()) as Array<{ modelo: string }>;
                  return rows.map((row) => row.modelo);
                }}
              />
            </ModalField>
            <ModalField label="Dimensión *">
              <Combobox
                value={form.dimension}
                onChange={(v) => setForm((f) => ({ ...f, dimension: v }))}
                placeholder="295/80R22.5"
                refetchKey={`${form.marca}|${form.modelo}`}
                fetchSuggestions={async (q) => {
                  const params = new URLSearchParams({ q, limit: "20" });
                  if (form.marca.trim())  params.set("marca", form.marca);
                  if (form.modelo.trim()) params.set("modelo", form.modelo);
                  const r = await fetch(`${API_BASE}/catalog/autocomplete/dimensions?${params}`);
                  if (!r.ok) return [];
                  const rows = (await r.json()) as Array<{ dimension: string }>;
                  return rows.map((row) => row.dimension);
                }}
              />
            </ModalField>
            <ModalField label="Eje">
              <select
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                value={form.eje}
                onChange={(e) => setForm((f) => ({ ...f, eje: e.target.value as CreateForm["eje"] }))}
              >
                <option value="">Sin definir</option>
                <option value="direccion">Dirección</option>
                <option value="traccion">Tracción</option>
                <option value="libre">Libre</option>
                <option value="remolque">Remolque</option>
                <option value="repuesto">Repuesto</option>
              </select>
            </ModalField>
            <ModalField label="Tipo">
              <div className="flex gap-2">
                {(["nueva", "reencauche"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-bold capitalize"
                    style={{
                      background: form.tipo === t ? "#0A183A" : "#F0F7FF",
                      color: form.tipo === t ? "white" : "#173D68",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </ModalField>
            <ModalField label="Tiempo de entrega">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                  value={form.tiempoEntregaNum}
                  onChange={(e) => setForm((f) => ({ ...f, tiempoEntregaNum: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="3"
                />
                <select
                  className="px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                  value={form.tiempoEntregaUnit}
                  onChange={(e) => setForm((f) => ({ ...f, tiempoEntregaUnit: e.target.value as CreateForm["tiempoEntregaUnit"] }))}
                >
                  <option value="días">Días</option>
                  <option value="semanas">Semanas</option>
                </select>
              </div>
            </ModalField>
          </div>

          {/* Precio + stock */}
          <div className="grid sm:grid-cols-2 gap-3">
            <ModalField label="Precio (COP) *">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                value={form.precioCop}
                onChange={(e) => setForm((f) => ({ ...f, precioCop: e.target.value === "" ? "" : Number(e.target.value) }))}
                placeholder="1500000"
              />
            </ModalField>
            <ModalField label="Cantidad disponible">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                value={form.cantidadDisponible}
                onChange={(e) => setForm((f) => ({ ...f, cantidadDisponible: e.target.value === "" ? "" : Number(e.target.value) }))}
                placeholder="0"
              />
            </ModalField>
          </div>

          {/* Descripción */}
          <ModalField label="Descripción">
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              style={{ border: "1px solid rgba(52,140,203,0.2)", resize: "vertical" }}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Detalles que quieras destacar a los compradores."
            />
          </ModalField>

          {/* Imágenes */}
          <ModalField label={`Imágenes (${form.imageUrls.length}/5)`}>
            <div className="flex gap-2 flex-wrap">
              {form.imageUrls.map((url, i) => (
                <div
                  key={url}
                  className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 group"
                  style={{ border: form.coverIndex === i ? "2px solid #1E76B6" : "1px solid rgba(10,24,58,0.10)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => {
                      const nextUrls = f.imageUrls.filter((_, j) => j !== i);
                      return {
                        ...f,
                        imageUrls: nextUrls,
                        coverIndex: f.coverIndex >= nextUrls.length ? 0 : f.coverIndex,
                      };
                    })}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Quitar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {form.coverIndex === i ? (
                    <span className="absolute bottom-0 left-0 right-0 bg-[#1E76B6] text-white text-[8px] font-bold text-center py-0.5">
                      Portada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, coverIndex: i }))}
                      className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Portada
                    </button>
                  )}
                </div>
              ))}
              {form.imageUrls.length < 5 && (
                <label
                  className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-[#F0F7FF]"
                  style={{ borderColor: "rgba(52,140,203,0.35)" }}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-[#348CCB] animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#348CCB]/60" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {form.imageUrls.length < 5 && (
              <ImageUrlInput
                onAdd={(url) => setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, url] }))}
              />
            )}
          </ModalField>

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-5 sm:px-6 py-4 flex items-center justify-end gap-2" style={{ borderTop: "1px solid rgba(10,24,58,0.08)" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-bold text-[#0A183A] hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#0A183A,#1E76B6)",
              boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Publicar producto
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline helper for adding image URLs (link instead of upload). Used
// by both Create and Edit modals. Tolerates the user pasting with or
// without a protocol — we tack on `https://` if missing — and only
// pushes obvious image-looking URLs (path ends in jpg/png/webp/gif/svg
// OR includes one of the common image-host hostnames). The user can
// still paste any URL — the check just nudges them to fix obvious
// typos before the listing renders a broken image.
function ImageUrlInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");

  function commit() {
    const raw = val.trim();
    if (!raw) return;
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      // Throws on completely invalid URLs.
      new URL(url);
    } catch {
      setErr("URL inválida");
      return;
    }
    onAdd(url);
    setVal("");
    setErr("");
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={val}
          onChange={(e) => { setVal(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          placeholder="https://… (pega un enlace de imagen)"
          className="flex-1 px-3 py-2 rounded-lg text-xs bg-white text-[#0A183A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
          style={{ border: "1px solid rgba(52,140,203,0.20)" }}
        />
        <button
          type="button"
          onClick={commit}
          disabled={!val.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
        >
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>
      {err && <p className="mt-1 text-[10px] text-red-600">{err}</p>}
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Edit modal — same visual shell as Create, but identity (marca, modelo,
// dimensión, tipo, eje) is read-only because those are catalog-level
// facts and shouldn't drift across listings of the same SKU. Adds a
// promo block + active/paused toggle on top of the editable fields.
// ─────────────────────────────────────────────────────────────────────

interface EditForm {
  precioCop: number | "";
  cantidadDisponible: number | "";
  tiempoEntregaNum: number | "";
  tiempoEntregaUnit: "días" | "semanas";
  tiempoEntregaTouched: boolean;
  descripcion: string;
  imageUrls: string[];
  coverIndex: number;
  isActive: boolean;
  // Promo: tracked as on/off + price + ISO date so the user can dial it
  // in or clear it without touching the rest of the form.
  promoEnabled: boolean;
  precioPromo: number | "";
  promoHasta: string; // YYYY-MM-DD (date input value)
}

// Parse "3 días" / "2 semanas" / "1-3 días" back into the num+unit
// form. Falls back to blank-num when the legacy string isn't a clean
// "<number> días|semanas". The user can leave it untouched and we
// won't overwrite the existing string on save.
function parseTiempoEntrega(raw: string | null): { num: number | ""; unit: "días" | "semanas" } {
  if (!raw) return { num: "", unit: "días" };
  const m = raw.trim().match(/^(\d+)\s*(d[ií]as?|semanas?)/i);
  if (!m) return { num: "", unit: "días" };
  const unit: "días" | "semanas" = /semana/i.test(m[2]) ? "semanas" : "días";
  return { num: Number(m[1]), unit };
}

function EditListingModal({
  companyId, listing, onClose, onSaved,
}: {
  companyId: string;
  listing: Listing;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = useMemo<EditForm>(() => {
    const t = parseTiempoEntrega(listing.tiempoEntrega);
    const promoActive = listing.precioPromo != null;
    return {
      precioCop:           listing.precioCop,
      cantidadDisponible:  listing.cantidadDisponible,
      tiempoEntregaNum:    t.num,
      tiempoEntregaUnit:   t.unit,
      tiempoEntregaTouched:false,
      descripcion:         listing.descripcion ?? "",
      imageUrls:           Array.isArray(listing.imageUrls) ? listing.imageUrls : [],
      coverIndex:          listing.coverIndex ?? 0,
      isActive:            listing.isActive,
      promoEnabled:        promoActive,
      precioPromo:         listing.precioPromo ?? "",
      promoHasta:          listing.promoHasta ? listing.promoHasta.slice(0, 10) : "",
    };
  }, [listing]);

  const [form, setForm] = useState<EditForm>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    if (form.imageUrls.length >= 5) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("distributorId", companyId);
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`${API_BASE}/marketplace/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, url] }));
    } catch {
      setError("No se pudo subir la imagen");
      setTimeout(() => setError(""), 2500);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (typeof form.precioCop !== "number" || form.precioCop <= 0) {
      setError("El precio debe ser mayor a 0");
      return;
    }
    if (form.promoEnabled) {
      if (typeof form.precioPromo !== "number" || form.precioPromo <= 0) {
        setError("Define un precio de promoción");
        return;
      }
      if (form.precioPromo >= form.precioCop) {
        setError("El precio de promo debe ser menor al precio normal");
        return;
      }
      if (!form.promoHasta) {
        setError("Define hasta cuándo dura la promo");
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        distributorId:      companyId,
        precioCop:          form.precioCop,
        cantidadDisponible: typeof form.cantidadDisponible === "number" ? form.cantidadDisponible : 0,
        descripcion:        form.descripcion.trim(),
        imageUrls:          form.imageUrls,
        coverIndex:         form.imageUrls.length > 0 ? form.coverIndex : 0,
        isActive:           form.isActive,
      };
      // Only touch tiempoEntrega if the user actually edited it — keeps
      // legacy free-text values intact when they're not parseable into
      // num+unit but the user didn't intend to change them.
      if (form.tiempoEntregaTouched) {
        body.tiempoEntrega =
          typeof form.tiempoEntregaNum === "number" && form.tiempoEntregaNum > 0
            ? `${form.tiempoEntregaNum} ${form.tiempoEntregaUnit}`
            : null;
      }
      if (form.promoEnabled) {
        body.precioPromo = form.precioPromo;
        body.promoHasta  = new Date(`${form.promoHasta}T23:59:59`).toISOString();
      } else {
        body.precioPromo = null;
        body.promoHasta  = null;
      }
      const res = await authFetch(`${API_BASE}/marketplace/listings/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirm("Dar de baja este producto del marketplace? Quedará oculto a los compradores.")) return;
    setDeleting(true);
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/${listing.id}`, {
        method: "DELETE",
        body: JSON.stringify({ distributorId: companyId }),
      });
      if (!res.ok) throw new Error();
      onSaved();
    } catch {
      setError("No se pudo dar de baja");
    } finally {
      setDeleting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]";
  const inputStyle = { border: "1px solid rgba(52,140,203,0.2)" };
  const idChip = "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider";

  const promoSavings =
    form.promoEnabled && typeof form.precioCop === "number" && typeof form.precioPromo === "number"
      ? form.precioCop - form.precioPromo
      : 0;
  const promoPct =
    form.promoEnabled && typeof form.precioCop === "number" && form.precioCop > 0 && typeof form.precioPromo === "number"
      ? Math.round(((form.precioCop - form.precioPromo) / form.precioCop) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">Editar producto</p>
            <h2 className="text-lg font-black text-[#0A183A] truncate">
              {listing.marca} {listing.modelo}
            </h2>
            <p className="text-[11px] text-gray-500 truncate">{listing.dimension}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Identity (read-only) */}
          <div className="rounded-xl p-3.5 flex flex-wrap gap-2" style={{ background: "#F0F7FF" }}>
            <span className={idChip} style={{ background: "white", color: "#1E76B6" }}>{listing.marca}</span>
            <span className={idChip} style={{ background: "white", color: "#0A183A" }}>{listing.modelo}</span>
            <span className={idChip} style={{ background: "white", color: "#0A183A" }}>{listing.dimension}</span>
            {listing.eje && <span className={idChip} style={{ background: "white", color: "#173D68" }}>{listing.eje}</span>}
            <span className={idChip} style={{ background: "white", color: "#173D68" }}>{listing.tipo}</span>
          </div>

          {/* Active toggle */}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl text-left"
            style={{ border: "1px solid rgba(10,24,58,0.10)", background: form.isActive ? "rgba(34,197,94,0.06)" : "rgba(107,114,128,0.06)" }}
          >
            <div>
              <p className="text-sm font-black" style={{ color: form.isActive ? "#15803d" : "#374151" }}>
                {form.isActive ? "Activo en marketplace" : "Pausado"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {form.isActive
                  ? "Los compradores pueden ver y comprar este producto."
                  : "Oculto a los compradores hasta que lo reactives."}
              </p>
            </div>
            {form.isActive ? (
              <ToggleRight className="w-9 h-9 text-emerald-500 flex-shrink-0" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-gray-400 flex-shrink-0" />
            )}
          </button>

          {/* Precio + stock + tiempoEntrega */}
          <div className="grid sm:grid-cols-2 gap-3">
            <ModalField label="Precio (COP) *">
              <input
                type="number" inputMode="numeric" min={0}
                className={inputCls} style={inputStyle}
                value={form.precioCop}
                onChange={(e) => setForm((f) => ({ ...f, precioCop: e.target.value === "" ? "" : Number(e.target.value) }))}
              />
            </ModalField>
            <ModalField label="Cantidad disponible">
              <input
                type="number" inputMode="numeric" min={0}
                className={inputCls} style={inputStyle}
                value={form.cantidadDisponible}
                onChange={(e) => setForm((f) => ({ ...f, cantidadDisponible: e.target.value === "" ? "" : Number(e.target.value) }))}
              />
            </ModalField>
            <ModalField label={`Tiempo de entrega${listing.tiempoEntrega && !form.tiempoEntregaTouched ? ` · actual: ${listing.tiempoEntrega}` : ""}`}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="number" inputMode="numeric" min={0}
                  className={inputCls} style={inputStyle}
                  value={form.tiempoEntregaNum}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    tiempoEntregaNum: e.target.value === "" ? "" : Number(e.target.value),
                    tiempoEntregaTouched: true,
                  }))}
                  placeholder="3"
                />
                <select
                  className={inputCls} style={inputStyle}
                  value={form.tiempoEntregaUnit}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    tiempoEntregaUnit: e.target.value as EditForm["tiempoEntregaUnit"],
                    tiempoEntregaTouched: true,
                  }))}
                >
                  <option value="días">Días</option>
                  <option value="semanas">Semanas</option>
                </select>
              </div>
            </ModalField>
          </div>

          {/* Promoción */}
          <div className="rounded-xl p-4" style={{ border: "1px solid rgba(249,115,22,0.18)", background: "rgba(249,115,22,0.04)" }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(249,115,22,0.12)" }}>
                  <Percent className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#0A183A]">Promoción</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    Precio rebajado por tiempo limitado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, promoEnabled: !f.promoEnabled }))}
                className="flex-shrink-0"
                aria-label="Toggle promo"
              >
                {form.promoEnabled ? (
                  <ToggleRight className="w-9 h-9 text-orange-500" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-gray-400" />
                )}
              </button>
            </div>
            {form.promoEnabled && (
              <div className="grid sm:grid-cols-2 gap-3">
                <ModalField label="Precio promo (COP)">
                  <input
                    type="number" inputMode="numeric" min={0}
                    className={inputCls} style={inputStyle}
                    value={form.precioPromo}
                    onChange={(e) => setForm((f) => ({ ...f, precioPromo: e.target.value === "" ? "" : Number(e.target.value) }))}
                    placeholder="1200000"
                  />
                </ModalField>
                <ModalField label="Termina el">
                  <input
                    type="date"
                    className={inputCls} style={inputStyle}
                    value={form.promoHasta}
                    onChange={(e) => setForm((f) => ({ ...f, promoHasta: e.target.value }))}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </ModalField>
                {promoSavings > 0 && (
                  <p className="sm:col-span-2 text-[11px] text-orange-700 font-bold">
                    Ahorro: {fmtCOP(promoSavings)} ({promoPct}% de descuento)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Descripción */}
          <ModalField label="Descripción">
            <textarea
              rows={3}
              className={inputCls}
              style={{ ...inputStyle, resize: "vertical" }}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Detalles que quieras destacar a los compradores."
            />
          </ModalField>

          {/* Imágenes */}
          <ModalField label={`Imágenes (${form.imageUrls.length}/5)`}>
            <div className="flex gap-2 flex-wrap">
              {form.imageUrls.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 group"
                  style={{ border: form.coverIndex === i ? "2px solid #1E76B6" : "1px solid rgba(10,24,58,0.10)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => {
                      const nextUrls = f.imageUrls.filter((_, j) => j !== i);
                      return {
                        ...f,
                        imageUrls: nextUrls,
                        coverIndex: f.coverIndex >= nextUrls.length ? 0 : f.coverIndex,
                      };
                    })}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Quitar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {form.coverIndex === i ? (
                    <span className="absolute bottom-0 left-0 right-0 bg-[#1E76B6] text-white text-[8px] font-bold text-center py-0.5">
                      Portada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, coverIndex: i }))}
                      className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Portada
                    </button>
                  )}
                </div>
              ))}
              {form.imageUrls.length < 5 && (
                <label
                  className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-[#F0F7FF]"
                  style={{ borderColor: "rgba(52,140,203,0.35)" }}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-[#348CCB] animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#348CCB]/60" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {form.imageUrls.length < 5 && (
              <ImageUrlInput
                onAdd={(url) => setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, url] }))}
              />
            )}
          </ModalField>

          {/* Retail source connection — paste a public retailer
              product URL (Alkosto / Ktronix today) and we re-scrape
              the price + per-store stock daily so buyers can choose
              to pick up at one of those locations. */}
          <RetailSourceSection listingId={listing.id} />

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-5 sm:px-6 py-4 flex items-center justify-between gap-2 flex-wrap" style={{ borderTop: "1px solid rgba(10,24,58,0.08)" }}>
          <button
            type="button"
            onClick={handleArchive}
            disabled={deleting || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Dar de baja
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-bold text-[#0A183A] hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Combobox: input + suggestion dropdown backed by /catalog/autocomplete/*.
// Free entry is allowed — the user can type a value that doesn't exist
// in the catalog (the marketplace create endpoint auto-mints a master
// SKU for unknown combos). The dropdown's job is to nudge users toward
// existing values so we don't end up with "Bridgestone", "BRIDGESTONE",
// and "bridgestone" as three separate brands.
// ─────────────────────────────────────────────────────────────────────

function Combobox({
  value, onChange, placeholder, fetchSuggestions, refetchKey, disabled, disabledHint,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  fetchSuggestions: (q: string) => Promise<string[]>;
  refetchKey?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Debounced fetch — re-runs when the input value or refetchKey changes
  // (so e.g. switching the selected marca refreshes the modelo list).
  useEffect(() => {
    if (disabled) { setItems([]); return; }
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(value);
        if (!cancelled) {
          setItems(results.slice(0, 30));
          setActiveIdx(-1);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
    // fetchSuggestions intentionally omitted — the consumer rebuilds the
    // closure on every render, so we'd refetch on every keystroke twice.
    // refetchKey is the stable trigger for "the dependency the closure
    // captures actually changed".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, refetchKey, open, disabled]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      onChange(items[activeIdx]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && !disabled && (loading || items.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6] disabled:bg-gray-50 disabled:text-gray-400"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
        value={value}
        disabled={disabled}
        placeholder={disabled && disabledHint ? disabledHint : placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (!disabled) setOpen(true); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {showDropdown && (
        <ul
          className="absolute z-10 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg bg-white shadow-lg"
          style={{ border: "1px solid rgba(10,24,58,0.10)" }}
        >
          {loading && items.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400">Buscando…</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400">Sin coincidencias — se creará nuevo</li>
          ) : (
            items.map((item, i) => (
              <li key={item}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // mousedown so it fires before input blur / outside-click handler
                    e.preventDefault();
                    onChange(item);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className="w-full text-left px-3 py-2 text-sm text-[#0A183A]"
                  style={{ background: i === activeIdx ? "#F0F7FF" : "transparent" }}
                >
                  {item}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Bulk upload — Excel parser + preview + submit. The dist drops a
// .xlsx file (any of the spreadsheet shapes their suppliers send), we
// auto-map columns by header fuzzy-match, show a preview table with
// the rows we'll create, and POST to /marketplace/listings/bulk. The
// backend reuses createListing per row so catalog auto-mint + dist
// catalogSubscription happen consistently for every uploaded SKU.
// ─────────────────────────────────────────────────────────────────────

interface BulkRow {
  marca: string;
  modelo: string;
  dimension: string;
  tipo: "nueva" | "reencauche";
  precioCop: number;
  cantidadDisponible: number;
  eje?: string;
  descripcion?: string;
  // Derived for UI display
  _row: number;
  _valid: boolean;
  _problem?: string;
}

// Header → field mapping. Each entry lists synonyms we accept so a
// supplier's spreadsheet can use any of these column names.
const HEADER_ALIASES: Record<keyof Pick<BulkRow, "marca" | "modelo" | "dimension" | "tipo" | "precioCop" | "cantidadDisponible" | "eje" | "descripcion">, string[]> = {
  marca:              ["marca", "brand", "fabricante"],
  modelo:             ["modelo", "diseño", "diseno", "design", "ref", "referencia", "model"],
  dimension:          ["dimension", "dimensión", "medida", "size", "tamaño"],
  tipo:               ["tipo", "categoria", "categoría", "tipo de llanta"],
  precioCop:          ["precio final alkosto", "precio final", "precio venta", "precio publico", "precio público", "precio", "price"],
  cantidadDisponible: ["inventario", "stock", "cantidad", "qty", "existencias", "disponible"],
  eje:                ["eje", "posicion", "posición", "axis"],
  descripcion:        ["descripcion", "descripción", "description", "notas", "detalle", "tecnologia", "tecnología"],
};

function normalizeHeader(s: string): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function detectColumns(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const norm = headers.map(normalizeHeader);
  const out: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  (Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader);
    // Prefer exact match first, then "contains" fallback so "PRECIO FINAL ALKOSTO" matches "precio final alkosto".
    let idx = norm.findIndex((h) => aliases.includes(h));
    if (idx === -1) idx = norm.findIndex((h) => aliases.some((a) => h.includes(a)));
    if (idx !== -1) out[field] = idx;
  });
  return out;
}

function parseNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // Strip currency symbols, whitespace; tolerate Colombian thousands "."
    // and decimal "," conventions by removing both. Treats 309.900 and
    // 309,900 the same way (= 309900). For floats users would have
    // explicit decimals which they almost never do for COP prices.
    const cleaned = v.replace(/[^0-9.\-]/g, "").replace(/\./g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function BulkUploadModal({
  companyId, onClose, onUploaded,
}: {
  companyId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    created: number;
    errors: Array<{ row: number; reason: string; identifier?: string }>;
  } | null>(null);

  async function handleFile(f: File) {
    setError("");
    setRows([]);
    setHeaders([]);
    setResult(null);
    setFile(f);
    setParsing(true);
    try {
      const xlsx = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = xlsx.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (json.length === 0) throw new Error("La hoja está vacía");

      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      const cols = detectColumns(hdrs);

      // Validate that the bare-minimum columns resolved.
      const missing: string[] = [];
      if (cols.marca     === undefined) missing.push("marca");
      if (cols.modelo    === undefined) missing.push("modelo / diseño");
      if (cols.dimension === undefined) missing.push("dimensión / medida");
      if (cols.precioCop === undefined) missing.push("precio");
      if (missing.length > 0) {
        throw new Error(`No encontré columnas de: ${missing.join(", ")}. Asegúrate que la primera fila sea de encabezados.`);
      }

      const parsed: BulkRow[] = json.map((r, i) => {
        const get = (field: keyof typeof HEADER_ALIASES) => {
          const idx = cols[field];
          if (idx === undefined) return "";
          return r[hdrs[idx]];
        };
        const marca = String(get("marca") ?? "").trim();
        const modelo = String(get("modelo") ?? "").trim();
        const dimension = String(get("dimension") ?? "").trim();
        const tipoRaw = String(get("tipo") ?? "").trim().toLowerCase();
        const tipo: BulkRow["tipo"] = tipoRaw.includes("reenc") ? "reencauche" : "nueva";
        const precioCop = parseNumber(get("precioCop"));
        const cantidadDisponible = Math.max(0, Math.round(parseNumber(get("cantidadDisponible"))));
        const eje = String(get("eje") ?? "").trim() || undefined;
        const descripcion = String(get("descripcion") ?? "").trim() || undefined;

        let problem: string | undefined;
        if (!marca || !modelo || !dimension) problem = "Faltan datos obligatorios";
        else if (!precioCop || precioCop <= 0) problem = "Precio inválido";

        return {
          marca, modelo, dimension, tipo, precioCop, cantidadDisponible,
          eje, descripcion,
          _row: i + 2, // header is row 1
          _valid: !problem,
          _problem: problem,
        };
      });
      setRows(parsed);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo leer el archivo");
    } finally {
      setParsing(false);
    }
  }

  const validRows = useMemo(() => rows.filter((r) => r._valid), [rows]);
  const invalidCount = rows.length - validRows.length;

  async function handleSubmit() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/bulk`, {
        method: "POST",
        body: JSON.stringify({
          distributorId: companyId,
          items: validRows.map((r) => ({
            marca: r.marca,
            modelo: r.modelo,
            dimension: r.dimension,
            eje: r.eje,
            tipo: r.tipo,
            precioCop: r.precioCop,
            cantidadDisponible: r.cantidadDisponible,
            descripcion: r.descripcion,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({ created: data.created ?? 0, errors: data.errors ?? [] });
      // If everything succeeded with no errors, auto-close + refetch
      // after a short delay so the user can see the success state.
      if ((data.errors?.length ?? 0) === 0) {
        setTimeout(() => onUploaded(), 1500);
      }
    } catch (e: any) {
      setError(e?.message?.slice(0, 300) || "No se pudo procesar la carga");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={() => !submitting && !parsing && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">Carga masiva</p>
            <h2 className="text-lg font-black text-[#0A183A]">Subir productos desde Excel</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Step 1 — file picker */}
          {!file && !result && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Sube un archivo .xlsx con tus productos. Detectamos las columnas automáticamente — sólo necesitas que la primera fila sea de encabezados con nombres reconocibles (marca, modelo / diseño, dimensión / medida, precio, inventario).
              </p>
              <label
                className="block w-full p-8 rounded-2xl text-center cursor-pointer hover:bg-[#F0F7FF] transition-colors"
                style={{ border: "2px dashed rgba(52,140,203,0.30)" }}
              >
                <FileSpreadsheet className="w-10 h-10 text-[#1E76B6] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#0A183A]">Selecciona tu archivo</p>
                <p className="text-[11px] text-gray-500 mt-1">.xlsx · hasta 500 productos</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="mt-4 p-3 rounded-xl text-[11px] text-gray-600" style={{ background: "#F0F7FF", border: "1px solid rgba(30,118,182,0.12)" }}>
                <p className="font-bold text-[#0A183A] mb-1">Columnas que reconocemos:</p>
                <p>marca · modelo / diseño · dimensión / medida · precio (final) · inventario · tipo (nueva / reencauche, opcional) · eje (opcional) · descripción (opcional).</p>
              </div>
            </div>
          )}

          {/* Step 2 — parsing */}
          {parsing && (
            <div className="flex items-center justify-center py-16 text-[#1E76B6]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-sm">Leyendo archivo…</span>
            </div>
          )}

          {/* Step 3 — preview */}
          {!parsing && !result && rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div>
                  <p className="text-sm font-black text-[#0A183A]">{file?.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {rows.length} fila{rows.length !== 1 ? "s" : ""} detectada{rows.length !== 1 ? "s" : ""} ·{" "}
                    <span className="text-emerald-700 font-bold">{validRows.length} válida{validRows.length !== 1 ? "s" : ""}</span>
                    {invalidCount > 0 && (
                      <> · <span className="text-amber-700 font-bold">{invalidCount} con problema{invalidCount !== 1 ? "s" : ""}</span></>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); setRows([]); setHeaders([]); }}
                  className="text-[11px] font-bold text-[#1E76B6] hover:underline"
                >
                  Cambiar archivo
                </button>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(10,24,58,0.08)" }}
              >
                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-[11px]">
                    <thead className="bg-[#fafbfc] sticky top-0">
                      <tr className="text-left">
                        <th className="px-2.5 py-2 font-bold text-gray-500">#</th>
                        <th className="px-2.5 py-2 font-bold text-gray-500">Marca</th>
                        <th className="px-2.5 py-2 font-bold text-gray-500">Modelo</th>
                        <th className="px-2.5 py-2 font-bold text-gray-500">Medida</th>
                        <th className="px-2.5 py-2 font-bold text-gray-500">Tipo</th>
                        <th className="px-2.5 py-2 font-bold text-gray-500 text-right">Precio</th>
                        <th className="px-2.5 py-2 font-bold text-gray-500 text-right">Stock</th>
                        <th className="px-2.5 py-2 font-bold text-gray-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((r, i) => (
                        <tr
                          key={i}
                          className="border-t border-gray-100"
                          style={{ background: r._valid ? "white" : "rgba(245,158,11,0.05)" }}
                        >
                          <td className="px-2.5 py-1.5 text-gray-400">{r._row}</td>
                          <td className="px-2.5 py-1.5 font-bold text-[#0A183A]">{r.marca || "—"}</td>
                          <td className="px-2.5 py-1.5 text-[#0A183A]">{r.modelo || "—"}</td>
                          <td className="px-2.5 py-1.5 text-gray-600">{r.dimension || "—"}</td>
                          <td className="px-2.5 py-1.5 text-gray-500 capitalize">{r.tipo}</td>
                          <td className="px-2.5 py-1.5 text-right tabular-nums">
                            {r.precioCop > 0 ? `$${r.precioCop.toLocaleString("es-CO")}` : "—"}
                          </td>
                          <td className="px-2.5 py-1.5 text-right tabular-nums">{r.cantidadDisponible}</td>
                          <td className="px-2.5 py-1.5">
                            {r._valid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <span className="text-[10px] text-amber-700 font-bold">{r._problem}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {rows.length > 50 && (
                        <tr>
                          <td colSpan={8} className="px-2.5 py-2 text-center text-[11px] text-gray-400">
                            …y {rows.length - 50} fila{rows.length - 50 !== 1 ? "s" : ""} más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidCount > 0 && (
                <p className="mt-3 text-[11px] text-amber-700">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Las filas con problema no se cargarán — sólo las {validRows.length} válidas.
                </p>
              )}
            </div>
          )}

          {/* Step 4 — result */}
          {result && (
            <div className="space-y-3">
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: result.errors.length === 0 ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)",
                  border: `1px solid ${result.errors.length === 0 ? "rgba(34,197,94,0.20)" : "rgba(245,158,11,0.25)"}`,
                }}
              >
                <p className="text-sm font-black text-[#0A183A]">
                  {result.created} producto{result.created !== 1 ? "s" : ""} creado{result.created !== 1 ? "s" : ""}
                </p>
                {result.errors.length > 0 && (
                  <p className="text-[11px] text-amber-800 mt-1">
                    {result.errors.length} fila{result.errors.length !== 1 ? "s" : ""} no se pudieron cargar:
                  </p>
                )}
              </div>
              {result.errors.length > 0 && (
                <ul className="text-[11px] space-y-1 max-h-48 overflow-y-auto rounded-lg p-2" style={{ border: "1px solid rgba(10,24,58,0.06)" }}>
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-gray-600">
                      <span className="font-mono text-gray-400">Fila {err.row}</span>
                      {err.identifier && <span className="text-[#0A183A] ml-2">{err.identifier}</span>}
                      <span className="text-amber-700 ml-2">— {err.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-2 flex-wrap" style={{ borderTop: "1px solid rgba(10,24,58,0.08)" }}>
          {result ? (
            <button
              type="button"
              onClick={onUploaded}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white ml-auto"
              style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
            >
              <CheckCircle2 className="w-4 h-4" /> Listo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || parsing}
                className="px-4 py-2 rounded-full text-sm font-bold text-[#0A183A] hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || parsing || validRows.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                  boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
                }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {submitting
                  ? "Subiendo…"
                  : validRows.length > 0
                    ? `Cargar ${validRows.length} producto${validRows.length !== 1 ? "s" : ""}`
                    : "Cargar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Banda edit — push the same images + description to every dimension
// variant of a (marca, banda) under one distributor. Saves the dist
// from manually editing 10 different listings of the same model. The
// preview step shows exactly which listings will get the update so
// nothing happens by surprise.
// ─────────────────────────────────────────────────────────────────────

interface BandaPreviewItem {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  isActive: boolean;
}

function BandaEditModal({
  companyId, listings, onClose, onUpdated,
}: {
  companyId: string;
  listings: Listing[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  // Brand options come from what the dist has actually published — no
  // typing brands the catalog doesn't know.
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) if (l.marca?.trim()) set.add(l.marca.trim());
    return [...set].sort();
  }, [listings]);

  const [marca, setMarca] = useState<string>(brandOptions[0] ?? "");
  const [modeloMatch, setModeloMatch] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [preview, setPreview] = useState<BandaPreviewItem[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ updated: number } | null>(null);

  // Modelo suggestions — distinct modelos for the chosen marca, drawn
  // from the dist's own listings. Helps the user pick exactly the
  // banda string they want to match.
  const modeloSuggestions = useMemo(() => {
    if (!marca.trim()) return [];
    const set = new Set<string>();
    for (const l of listings) {
      if (l.marca?.trim().toLowerCase() === marca.trim().toLowerCase() && l.modelo?.trim()) {
        set.add(l.modelo.trim());
      }
    }
    return [...set].sort();
  }, [listings, marca]);

  async function handlePreview() {
    if (!marca.trim() || !modeloMatch.trim()) {
      setError("Selecciona marca y escribe la banda");
      return;
    }
    setPreviewing(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/preview-by-banda`, {
        method: "POST",
        body: JSON.stringify({
          distributorId: companyId,
          marca:         marca.trim(),
          modeloContains: modeloMatch.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as BandaPreviewItem[];
      setPreview(data);
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "No se pudo cargar la vista previa");
    } finally {
      setPreviewing(false);
    }
  }

  async function uploadImage(file: File) {
    if (imageUrls.length >= 5) return;
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("distributorId", companyId);
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`${API_BASE}/marketplace/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setImageUrls((u) => [...u, url]);
    } catch {
      setError("No se pudo subir la imagen");
      setTimeout(() => setError(""), 2500);
    }
  }

  async function handleApply() {
    if (!preview || preview.length === 0) {
      setError("Vista previa primero para confirmar a cuáles aplica");
      return;
    }
    if (imageUrls.length === 0 && !descripcion.trim()) {
      setError("Carga al menos imágenes o descripción para aplicar");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        distributorId:  companyId,
        marca:          marca.trim(),
        modeloContains: modeloMatch.trim(),
      };
      if (imageUrls.length > 0)     body.imageUrls   = imageUrls;
      if (descripcion.trim())       body.descripcion = descripcion.trim();
      const res = await authFetch(`${API_BASE}/marketplace/listings/bulk-by-banda`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDone({ updated: data.updated ?? 0 });
      setTimeout(() => onUpdated(), 1500);
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "No se pudo aplicar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">Editar por banda</p>
            <h2 className="text-lg font-black text-[#0A183A]">Imágenes y descripción en lote</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Aplica los mismos datos a todas las dimensiones de una misma banda.
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Step 1 — picker */}
          <div className="grid sm:grid-cols-2 gap-3">
            <ModalField label="Marca">
              <select
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                value={marca}
                onChange={(e) => { setMarca(e.target.value); setPreview(null); }}
              >
                {brandOptions.length === 0 && <option value="">No tienes productos</option>}
                {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </ModalField>
            <ModalField label="Banda / modelo">
              <input
                list="banda-modelo-suggestions"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                value={modeloMatch}
                onChange={(e) => { setModeloMatch(e.target.value); setPreview(null); }}
                placeholder="Ej: ATX, AT PRO RA8, R268"
              />
              <datalist id="banda-modelo-suggestions">
                {modeloSuggestions.map((m) => <option key={m} value={m} />)}
              </datalist>
              <p className="text-[10px] text-gray-500 mt-1">
                Hacemos match parcial — escribe lo suficiente para identificar la banda.
              </p>
            </ModalField>
          </div>

          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing || !marca.trim() || !modeloMatch.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-[#1E76B6] hover:bg-[#F0F7FF] disabled:opacity-50"
            style={{ border: "1px solid rgba(30,118,182,0.20)" }}
          >
            {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Ver vista previa
          </button>

          {preview && (
            <div
              className="rounded-xl p-4"
              style={{
                background: preview.length > 0 ? "rgba(30,118,182,0.06)" : "rgba(245,158,11,0.06)",
                border:     `1px solid ${preview.length > 0 ? "rgba(30,118,182,0.20)" : "rgba(245,158,11,0.25)"}`,
              }}
            >
              <p className="text-sm font-black text-[#0A183A]">
                {preview.length} producto{preview.length !== 1 ? "s" : ""} se actualizará{preview.length !== 1 ? "n" : ""}
              </p>
              {preview.length === 0 ? (
                <p className="text-xs text-amber-700 mt-1">
                  No encontramos productos con esa banda. Intenta con menos texto.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {preview.map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: p.isActive ? "white" : "rgba(10,24,58,0.06)",
                        color: p.isActive ? "#0A183A" : "#9ca3af",
                        border: "1px solid rgba(10,24,58,0.08)",
                      }}
                    >
                      {p.modelo} · {p.dimension}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — payload */}
          {preview && preview.length > 0 && !done && (
            <>
              <div className="border-t pt-4" style={{ borderColor: "rgba(10,24,58,0.06)" }}>
                <ModalField label={`Imágenes (${imageUrls.length}/5) — opcional`}>
                  <div className="flex gap-2 flex-wrap">
                    {imageUrls.map((url, i) => (
                      <div
                        key={`${url}-${i}`}
                        className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ border: "1px solid rgba(10,24,58,0.10)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrls((u) => u.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                          aria-label="Quitar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-[#1E76B6] text-white text-[8px] font-bold text-center py-0.5">
                            Portada
                          </span>
                        )}
                      </div>
                    ))}
                    {imageUrls.length < 5 && (
                      <label
                        className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-[#F0F7FF]"
                        style={{ borderColor: "rgba(52,140,203,0.35)" }}
                      >
                        <ImageIcon className="w-5 h-5 text-[#348CCB]/60" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadImage(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {imageUrls.length < 5 && (
                    <ImageUrlInput onAdd={(url) => setImageUrls((u) => [...u, url])} />
                  )}
                  <p className="text-[10px] text-gray-500 mt-2">
                    Las imágenes reemplazan completamente las que ya tengan los productos. La primera será la portada.
                  </p>
                </ModalField>
              </div>

              <ModalField label="Descripción — opcional">
                <textarea
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.2)", resize: "vertical" }}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Texto que aparecerá en todos los productos de esta banda."
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Reemplaza la descripción actual de cada listing afectado.
                </p>
              </ModalField>
            </>
          )}

          {done && (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.20)",
              }}
            >
              <p className="text-sm font-black text-[#0A183A]">
                {done.updated} producto{done.updated !== 1 ? "s" : ""} actualizado{done.updated !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-end gap-2" style={{ borderTop: "1px solid rgba(10,24,58,0.08)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm font-bold text-[#0A183A] hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          {!done && (
            <button
              type="button"
              onClick={handleApply}
              disabled={
                saving ||
                !preview ||
                preview.length === 0 ||
                (imageUrls.length === 0 && !descripcion.trim())
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {preview ? `Aplicar a ${preview.length}` : "Aplicar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RETAIL SOURCE — connect a public retailer product page (Alkosto /
// Ktronix today) so buyers can choose to pick up at one of the
// retailer's physical stores. Daily cron re-scrapes price + per-store
// stock; the dist sees a "última actualización" timestamp + a manual
// refresh button so they can verify the parse on demand.
// =============================================================================

interface RetailPickupPoint {
  id: string;
  externalId: string | null;
  name: string;
  address: string | null;
  city: string;
  cityDisplay: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  stockUnits: number;
  refreshedAt: string;
}

interface RetailSourcePayload {
  id: string;
  url: string;
  domain: string | null;
  lastPriceCop: number | null;
  lastFetchedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  isActive: boolean;
  pickupPoints: RetailPickupPoint[];
}

function RetailSourceSection({ listingId }: { listingId: string }) {
  const [source, setSource] = useState<RetailSourcePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [priceHtml, setPriceHtml] = useState("");
  const [stockHtml, setStockHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/${listingId}/retail-source`);
      if (res.ok) {
        const data = (await res.json()) as RetailSourcePayload | null;
        setSource(data);
        if (data) {
          setUrl(data.url);
          setEditing(false);
        } else {
          setEditing(true);
        }
      } else {
        setSource(null);
        setEditing(true);
      }
    } catch {
      setSource(null);
      setEditing(true);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { reload(); }, [reload]);

  async function save() {
    if (!url.trim()) {
      setErr("Pega la URL del producto en el sitio del retailer");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/${listingId}/retail-source`, {
        method: "POST",
        body: JSON.stringify({
          url: url.trim(),
          priceHtmlSnippet: priceHtml.trim() || undefined,
          stockHtmlSnippet: stockHtml.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await reload();
    } catch (e) {
      setErr((e instanceof Error ? e.message : "").slice(0, 300) || "No se pudo conectar la fuente");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setErr("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/${listingId}/retail-source/refresh`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      await reload();
    } catch (e) {
      setErr((e instanceof Error ? e.message : "").slice(0, 300) || "No se pudo refrescar");
    } finally {
      setBusy(false);
    }
  }

  async function detach() {
    if (!confirm("¿Desconectar este producto del retailer?")) return;
    setBusy(true);
    setErr("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/${listingId}/retail-source`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setSource(null);
      setUrl("");
      setPriceHtml("");
      setStockHtml("");
      setEditing(true);
    } catch (e) {
      setErr((e instanceof Error ? e.message : "").slice(0, 300) || "No se pudo desconectar");
    } finally {
      setBusy(false);
    }
  }

  // Group points by city for the in-stock summary
  const cityGroups = useMemo(() => {
    if (!source) return [];
    const map = new Map<string, { city: string; cityDisplay: string; total: number; points: RetailPickupPoint[] }>();
    for (const p of source.pickupPoints) {
      if (!map.has(p.city)) {
        map.set(p.city, { city: p.city, cityDisplay: p.cityDisplay ?? p.city, total: 0, points: [] });
      }
      const g = map.get(p.city)!;
      g.total += p.stockUnits;
      g.points.push(p);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [source]);

  const inStockTotal = source?.pickupPoints.reduce((s, p) => s + p.stockUnits, 0) ?? 0;

  return (
    <div className="rounded-2xl p-4"
      style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(30,118,182,0.18)" }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#1E76B6]" />
          <p className="text-sm font-black text-[#0A183A]">Conexión con tienda externa</p>
        </div>
        {source && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">
            {source.domain ?? "conectado"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-500 leading-snug mb-3">
        Pega la URL pública del producto en Alkosto o Ktronix. Cada día actualizamos el precio
        y el stock por tienda; los compradores ven la opción de recoger en la sucursal más cercana.
      </p>

      {loading ? (
        <div className="py-4 flex items-center justify-center text-[#1E76B6]">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.alkosto.com/llanta-…/p/…"
            className="w-full px-3 py-2 rounded-lg text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
            style={{ border: "1px solid rgba(52,140,203,0.25)" }}
          />
          <details className="group">
            <summary className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6] cursor-pointer hover:underline">
              Pegar HTML de precio y stock (opcional)
            </summary>
            <div className="mt-2 space-y-2">
              <textarea
                value={priceHtml}
                onChange={(e) => setPriceHtml(e.target.value)}
                placeholder='HTML del precio (p.ej. <input class="price-hidden" value="..."> ...)'
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[11px] font-mono bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.25)", resize: "vertical" }}
              />
              <textarea
                value={stockHtml}
                onChange={(e) => setStockHtml(e.target.value)}
                placeholder='HTML del bloque de stock por ciudad'
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[11px] font-mono bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{ border: "1px solid rgba(52,140,203,0.25)", resize: "vertical" }}
              />
              <p className="text-[10px] text-gray-400 leading-snug">
                Solo necesario para retailers nuevos. Para Alkosto/Ktronix usamos un parser dedicado.
              </p>
            </div>
          </details>
          {err && <p className="text-[11px] text-red-600 font-medium">{err}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-black text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {source ? "Actualizar URL" : "Conectar"}
            </button>
            {source && (
              <button
                type="button"
                onClick={() => { setEditing(false); setUrl(source.url); setErr(""); }}
                className="px-3 py-2 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : source ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#1E76B6] hover:underline truncate max-w-full inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{source.url}</span>
            </a>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={refresh}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#1E76B6] hover:bg-[#1E76B6]/10 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Actualizar
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold text-[#0A183A] hover:bg-gray-100"
              >
                Editar URL
              </button>
              <button
                type="button"
                onClick={detach}
                disabled={busy}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Desconectar
              </button>
            </div>
          </div>

          {/* Status row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white px-2 py-2" style={{ border: "1px solid rgba(10,24,58,0.06)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Precio</p>
              <p className="text-sm font-black text-[#0A183A] tabular-nums">
                {source.lastPriceCop ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(source.lastPriceCop) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-white px-2 py-2" style={{ border: "1px solid rgba(10,24,58,0.06)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Tiendas con stock</p>
              <p className="text-sm font-black text-[#0A183A] tabular-nums">
                {source.pickupPoints.filter((p) => p.stockUnits > 0).length}
                <span className="text-[10px] text-gray-400 font-normal"> / {source.pickupPoints.length}</span>
              </p>
            </div>
            <div className="rounded-lg bg-white px-2 py-2" style={{ border: "1px solid rgba(10,24,58,0.06)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Unidades total</p>
              <p className="text-sm font-black text-[#0A183A] tabular-nums">{inStockTotal}</p>
            </div>
          </div>

          {source.lastError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700"
              style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
              <strong>Error en la última actualización:</strong> {source.lastError}
            </div>
          )}
          {source.lastSuccessAt && (
            <p className="text-[10px] text-gray-400">
              Última actualización exitosa: {new Date(source.lastSuccessAt).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {cityGroups.length > 0 && (
            <details className="group" open={false}>
              <summary className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6] cursor-pointer hover:underline">
                Tiendas por ciudad ({cityGroups.length})
              </summary>
              <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                {cityGroups.map((g) => (
                  <div key={g.city} className="rounded-lg bg-white px-3 py-2"
                    style={{ border: "1px solid rgba(10,24,58,0.06)" }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[12px] font-black text-[#0A183A] flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#1E76B6]" />
                        {g.cityDisplay}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums"
                        style={{ color: g.total > 0 ? "#059669" : "#9ca3af" }}>
                        {g.total} unidad{g.total === 1 ? "" : "es"}
                      </span>
                    </div>
                    <ul className="space-y-0.5 ml-1">
                      {g.points.map((p) => (
                        <li key={p.id} className="text-[10px] text-gray-600 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 truncate">
                            <StoreIcon className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{p.name}</span>
                          </span>
                          <span className={p.stockUnits > 0 ? "font-bold text-emerald-600" : "text-gray-400"}>
                            {p.stockUnits} u.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : null}
    </div>
  );
}
