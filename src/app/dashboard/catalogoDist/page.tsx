"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Pencil, Trash2, Package, Search, X,
  Check, DollarSign, Calendar, Tag, Percent, AlertTriangle,
  ChevronDown, ShoppingCart, Star, BarChart3,
} from "lucide-react";
import CatalogAutocomplete from "../../../components/CatalogAutocomplete";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) },
  });
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const inputCls = "w-full px-3 py-2 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

interface Listing {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  eje: string | null;
  tipo: string;
  precioCop: number;
  precioPromo: number | null;
  cantidadDisponible: number;
  tiempoEntrega: string | null;
  descripcion: string | null;
  imageUrls: string[] | null;
  coverIndex: number;
  isActive: boolean;
  catalogId: string | null;
  catalog?: { skuRef: string } | null;
  _count?: { orders: number; reviews: number };
}

export default function CatalogoDistPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Add form
  const [form, setForm] = useState({
    marca: "", modelo: "", dimension: "", eje: "", tipo: "nueva",
    precioCop: 0, precioPromo: 0, cantidadDisponible: 0,
    tiempoEntrega: "1-3 dias", catalogId: "", descripcion: "",
    imageUrls: [] as string[], coverIndex: 0,
    profundidadInicial: 0,
  });

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    precioCop: 0, cantidadDisponible: 0, tiempoEntrega: "", isActive: true,
    descripcion: "", modelo: "", marca: "",
  });

  // Promotions
  const [showPromo, setShowPromo] = useState(false);
  const [promoType, setPromoType] = useState<"percent" | "fixed">("percent");
  const [promoValue, setPromoValue] = useState(0);
  const [promoExpiry, setPromoExpiry] = useState("");
  const [promoSelected, setPromoSelected] = useState<Set<string>>(new Set());
  const [promoSaving, setPromoSaving] = useState(false);

  const fetchListings = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/marketplace/listings/distributor?distributorId=${cId}`);
      if (res.ok) setListings(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    let user: { companyId?: string };
    try { user = JSON.parse(stored); } catch { router.push("/login"); return; }
    if (!user.companyId) return;
    setCompanyId(user.companyId);
    fetchListings(user.companyId);
  }, [router, fetchListings]);

  async function handleAdd() {
    if (!form.marca || !form.modelo || !form.dimension || form.precioCop <= 0) return;
    setSaving(true);
    try {
      const { profundidadInicial, ...formData } = form;
      const res = await authFetch(`${API_BASE}/marketplace/listings`, {
        method: "POST",
        body: JSON.stringify({
          distributorId: companyId,
          ...formData,
          catalogId: form.catalogId || undefined,
          eje: form.eje || undefined,
          precioPromo: form.precioPromo > 0 ? form.precioPromo : undefined,
          ...(!form.catalogId && profundidadInicial > 0 ? { profundidadInicial } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ marca: "", modelo: "", dimension: "", eje: "", tipo: "nueva", precioCop: 0, precioPromo: 0, cantidadDisponible: 0, tiempoEntrega: "1-3 dias", catalogId: "", descripcion: "", imageUrls: [], coverIndex: 0, profundidadInicial: 0 });
      setShowAdd(false);
      setSuccess("Producto agregado al catalogo");
      setTimeout(() => setSuccess(""), 3000);
      fetchListings(companyId);
    } catch { /* */ }
    setSaving(false);
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await authFetch(`${API_BASE}/marketplace/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ distributorId: companyId, ...editForm }),
      });
      setEditingId(null);
      fetchListings(companyId);
    } catch { /* */ }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Desactivar este producto del catalogo?")) return;
    await authFetch(`${API_BASE}/marketplace/listings/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ distributorId: companyId }),
    });
    fetchListings(companyId);
  }

  async function handleApplyPromo() {
    if (promoSelected.size === 0 || promoValue <= 0 || !promoExpiry) return;
    setPromoSaving(true);
    for (const id of promoSelected) {
      const listing = listings.find((l) => l.id === id);
      if (!listing) continue;
      const promoPrice = promoType === "percent"
        ? Math.round(listing.precioCop * (1 - promoValue / 100))
        : Math.max(0, listing.precioCop - promoValue);
      try {
        await authFetch(`${API_BASE}/marketplace/listings/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ distributorId: companyId, precioPromo: promoPrice, promoHasta: new Date(promoExpiry).toISOString() }),
        });
      } catch { /* continue */ }
    }
    setShowPromo(false); setPromoSelected(new Set()); setPromoValue(0); setPromoExpiry("");
    setSuccess(`Promocion aplicada a ${promoSelected.size} producto${promoSelected.size !== 1 ? "s" : ""}`);
    setTimeout(() => setSuccess(""), 3000);
    fetchListings(companyId);
    setPromoSaving(false);
  }

  async function handleRemovePromo(id: string) {
    await authFetch(`${API_BASE}/marketplace/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ distributorId: companyId, precioPromo: null, promoHasta: null }),
    });
    fetchListings(companyId);
  }

  const filtered = search.trim()
    ? listings.filter((l) =>
        l.marca.toLowerCase().includes(search.toLowerCase()) ||
        l.modelo.toLowerCase().includes(search.toLowerCase()) ||
        l.dimension.includes(search))
    : listings;

  const activeCount = listings.filter((l) => l.isActive).length;
  const promoProducts = filtered.filter((l) => l.precioPromo != null && l.isActive);
  const nonPromoProducts = filtered.filter((l) => l.precioPromo == null || !l.isActive);
  const totalPromoSales = promoProducts.reduce((sum, l) => sum + (l._count?.orders ?? 0), 0);

  // Stats
  const totalSales = listings.reduce((s, l) => s + (l._count?.orders ?? 0), 0);
  const totalReviews = listings.reduce((s, l) => s + (l._count?.reviews ?? 0), 0);
  const totalStock = listings.reduce((s, l) => s + l.cantidadDisponible, 0);
  const topSeller = [...listings].sort((a, b) => (b._count?.orders ?? 0) - (a._count?.orders ?? 0))[0];

  // Group by brand
  const brandGroups = React.useMemo(() => {
    const allItems = [...promoProducts, ...nonPromoProducts];
    const groups: Record<string, Listing[]> = {};
    for (const l of allItems) {
      const key = l.marca.toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [promoProducts, nonPromoProducts]);

  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set());

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* IVA Banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-orange-700">Todos los precios deben ser sin IVA</p>
            <p className="text-[10px] text-orange-600/70 mt-0.5">El IVA se calculara automaticamente al momento de la compra.</p>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Package, label: "Productos activos", value: String(activeCount), color: "#1E76B6" },
              { icon: ShoppingCart, label: "Ventas totales", value: String(totalSales), color: "#22c55e" },
              { icon: Star, label: "Resenas", value: String(totalReviews), color: "#f59e0b" },
              { icon: BarChart3, label: "Stock total", value: `${totalStock} uds`, color: "#8b5cf6" },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(10,24,58,0.06)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{s.label}</span>
                </div>
                <p className="text-lg font-black text-[#0A183A]">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top seller callout */}
        {!loading && topSeller && (topSeller._count?.orders ?? 0) > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)" }}>
            <span className="text-[10px]">🏆</span>
            <p className="text-[11px] text-gray-600">
              <span className="font-bold text-[#0A183A]">{topSeller.marca} {topSeller.modelo}</span> es tu producto mas vendido con <span className="font-bold text-green-600">{topSeller._count?.orders} venta{(topSeller._count?.orders ?? 0) !== 1 ? "s" : ""}</span>
            </p>
          </div>
        )}

        {/* Inline header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{brandGroups.length} marca{brandGroups.length !== 1 ? "s" : ""} · {filtered.length} producto{filtered.length !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPromo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#1E76B6] transition-all hover:bg-[#F0F7FF]"
              style={{ border: "1px solid rgba(30,118,182,0.2)" }}>
              <Percent className="w-4 h-4" /> Promocion
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>
        {success && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#93b8d4]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo o dimension..." className={`${inputCls} pl-9`} />
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
              <div className="bg-[#173D68] text-white px-5 py-3.5 flex justify-between items-center flex-shrink-0">
                <h2 className="font-bold text-sm">Agregar Producto al Catalogo</h2>
                <button onClick={() => setShowAdd(false)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Marca</label>
                    <CatalogAutocomplete
                      value={form.marca}
                      onChange={(v) => setForm((f) => ({ ...f, marca: v }))}
                      onSelect={(item) => setForm((f) => ({ ...f, marca: item.marca }))}
                      field="marca"
                      placeholder="Marca"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Modelo/Diseno</label>
                    <CatalogAutocomplete
                      value={form.modelo}
                      onChange={(v) => setForm((f) => ({ ...f, modelo: v }))}
                      onSelect={(item) => setForm((f) => ({ ...f, modelo: item.modelo, dimension: item.dimension || f.dimension }))}
                      field="modelo"
                      filterMarca={form.marca}
                      placeholder="Modelo"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Dimension</label>
                    <CatalogAutocomplete
                      value={form.dimension}
                      onChange={(v) => setForm((f) => ({ ...f, dimension: v }))}
                      onSelect={(item) => setForm((f) => ({ ...f, dimension: item.dimension }))}
                      field="dimension"
                      filterMarca={form.marca}
                      placeholder="Ej: 295/80R22.5"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Eje</label>
                    <select value={form.eje} onChange={(e) => setForm((f) => ({ ...f, eje: e.target.value }))} className={inputCls}>
                      <option value="">Todos</option>
                      <option value="direccion">Direccion</option>
                      <option value="traccion">Traccion</option>
                      <option value="libre">Libre</option>
                      <option value="remolque">Remolque</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Tipo</label>
                  <div className="flex rounded-lg overflow-hidden border border-[#348CCB]/30">
                    {[{ value: "nueva", label: "Llanta Nueva" }, { value: "reencauche", label: "Reencauche" }].map((t) => (
                      <button key={t.value} type="button" onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                        className="flex-1 px-3 py-2 text-xs font-bold transition-all"
                        style={{ background: form.tipo === t.value ? "#0A183A" : "#F0F7FF", color: form.tipo === t.value ? "white" : "#173D68" }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Precio sin IVA (COP)</label>
                    <input type="number" value={form.precioCop || ""} placeholder="$"
                      onChange={(e) => setForm((f) => ({ ...f, precioCop: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Precio promo sin IVA</label>
                    <input type="number" value={form.precioPromo || ""} placeholder="Opcional"
                      onChange={(e) => setForm((f) => ({ ...f, precioPromo: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Cantidad</label>
                    <input type="number" value={form.cantidadDisponible || ""} placeholder="0"
                      onChange={(e) => setForm((f) => ({ ...f, cantidadDisponible: Number(e.target.value) }))} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Tiempo de entrega</label>
                  <select value={form.tiempoEntrega} onChange={(e) => setForm((f) => ({ ...f, tiempoEntrega: e.target.value }))} className={inputCls}>
                    <option value="Inmediato">Inmediato</option>
                    <option value="1-3 dias">1-3 dias</option>
                    <option value="1 semana">1 semana</option>
                    <option value="2 semanas">2 semanas</option>
                  </select>
                </div>
                {/* Description */}
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Descripcion del producto</label>
                  <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    rows={2} placeholder="Detalles, especificaciones, garantia..." className={`${inputCls} resize-none`} />
                </div>

                {/* Photos — up to 5 URLs */}
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fotos (max 5)</label>
                  <div className="flex gap-2 flex-wrap">
                    {form.imageUrls.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((_, j) => j !== i), coverIndex: f.coverIndex >= f.imageUrls.length - 1 ? 0 : f.coverIndex }))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </button>
                        {form.coverIndex === i && (
                          <span className="absolute bottom-0 left-0 right-0 bg-[#1E76B6] text-white text-[7px] font-bold text-center py-0.5">Portada</span>
                        )}
                        {form.coverIndex !== i && (
                          <button onClick={() => setForm((f) => ({ ...f, coverIndex: i }))}
                            className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[7px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            Portada
                          </button>
                        )}
                      </div>
                    ))}
                    {form.imageUrls.length < 5 && (
                      <div className="flex flex-col gap-1.5">
                        {/* File upload */}
                        <label className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-[#348CCB]/30 bg-[#F0F7FF] cursor-pointer hover:border-[#1E76B6] transition-colors">
                          <Plus className="w-5 h-5 text-[#348CCB]/50" />
                          <input type="file" accept="image/*" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || form.imageUrls.length >= 5) return;
                              const fd = new FormData();
                              fd.append("image", file);
                              fd.append("distributorId", companyId);
                              try {
                                const res = await fetch(`${API_BASE}/marketplace/upload`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
                                  body: fd,
                                });
                                if (res.ok) {
                                  const { url } = await res.json();
                                  setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, url] }));
                                }
                              } catch { /* */ }
                              e.target.value = "";
                            }} />
                        </label>
                        <p className="text-[8px] text-gray-400">Subir o pegar URL</p>
                        {/* URL fallback */}
                        <input type="url" placeholder="URL..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val && form.imageUrls.length < 5) {
                                setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, val] }));
                                (e.target as HTMLInputElement).value = "";
                              }
                              e.preventDefault();
                            }
                          }}
                          className="w-32 px-2 py-1 rounded-md text-[9px] border border-[#348CCB]/20 bg-[#F0F7FF] text-[#0A183A] placeholder-[#93b8d4]" />
                      </div>
                    )}
                  </div>
                </div>

                {form.catalogId && (
                  <p className="text-[9px] text-green-500 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Vinculado al catalogo TirePro
                  </p>
                )}
                {form.marca && !form.catalogId && (
                  <div className="p-3 rounded-xl" style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)" }}>
                    <p className="text-[9px] text-orange-500 font-bold mb-2">
                      Este producto no esta en el catalogo — se agregara automaticamente.
                    </p>
                    <label className="text-[9px] font-bold text-orange-400 uppercase block mb-1">
                      Profundidad inicial del diseno (mm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="40"
                      value={form.profundidadInicial || ""}
                      placeholder="Ej: 18, 20, 22..."
                      onChange={(e) => setForm((f) => ({ ...f, profundidadInicial: Number(e.target.value) }))}
                      className={inputCls}
                    />
                    <p className="text-[8px] text-gray-400 mt-1">
                      La profundidad de banda cuando la llanta esta nueva (en milimetros). Esto nos ayuda a calcular el desgaste y CPK para tus clientes.
                    </p>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF]">Cancelar</button>
                <button onClick={handleAdd} disabled={saving || !form.marca || !form.modelo || !form.dimension || form.precioCop <= 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listings grouped by brand */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Package className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-bold text-[#0A183A]">Sin productos en el catalogo</p>
            <p className="text-xs mt-1">Agrega tus llantas para que aparezcan en el marketplace.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {brandGroups.map(([brand, items]) => {
              const brandSales = items.reduce((s, l) => s + (l._count?.orders ?? 0), 0);
              const brandStock = items.reduce((s, l) => s + l.cantidadDisponible, 0);
              const brandPromos = items.filter((l) => l.precioPromo != null && l.isActive).length;
              const isCollapsed = collapsedBrands.has(brand);

              return (
                <div key={brand} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.1)" }}>
                  {/* Brand header */}
                  <button
                    onClick={() => setCollapsedBrands((prev) => {
                      const next = new Set(prev);
                      if (next.has(brand)) next.delete(brand); else next.add(brand);
                      return next;
                    })}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
                    style={{ background: "rgba(10,24,58,0.015)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-[#0A183A]">{brand}</span>
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                      {brandPromos > 0 && (
                        <span className="text-[8px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">{brandPromos} promo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {brandSales > 0 && <span className="text-[9px] font-bold text-green-600">{brandSales} vendido{brandSales !== 1 ? "s" : ""}</span>}
                      <span className="text-[9px] text-gray-400">{brandStock} uds</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    </div>
                  </button>

                  {/* Brand items */}
                  {!isCollapsed && (
                    <div className="divide-y divide-gray-50">
                      {items.map((l) => {
              const isEditing = editingId === l.id;
              const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
              const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
              const salesCount = l._count?.orders ?? 0;
              const reviewCount = l._count?.reviews ?? 0;

              return (
                <div key={l.id} className="rounded-2xl overflow-hidden bg-white transition-all" style={{
                  border: `1px solid ${l.isActive ? "rgba(52,140,203,0.12)" : "rgba(0,0,0,0.06)"}`,
                  opacity: l.isActive ? 1 : 0.5,
                }}>
                  {/* Main row */}
                  <div className="px-4 py-3 flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {cover ? <img src={cover} alt={`${l.marca} ${l.modelo}`} className="w-full h-full object-contain p-1" /> : <Package className="w-5 h-5 text-gray-300" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-[#0A183A]">{l.marca} {l.modelo}</p>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: l.tipo === "reencauche" ? "#f3e8ff" : "#dbeafe", color: l.tipo === "reencauche" ? "#7c3aed" : "#1d4ed8" }}>
                          {l.tipo === "reencauche" ? "Reencauche" : "Nueva"}
                        </span>
                        {!l.isActive && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactivo</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{l.dimension}{l.eje ? ` · ${l.eje}` : ""}</p>
                      {l.descripcion && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{l.descripcion}</p>}

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-sm font-black text-[#0A183A]">{fmtCOP(l.precioCop)}</span>
                        <span className="text-[8px] text-gray-400">sin IVA</span>
                        {l.precioPromo != null && (
                          <span className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-red-500">{fmtCOP(l.precioPromo)}</span>
                            <span className="text-[8px] font-bold text-red-400">-{Math.round(((l.precioCop - l.precioPromo) / l.precioCop) * 100)}%</span>
                            <button onClick={() => handleRemovePromo(l.id)} className="text-[8px] text-red-400 hover:text-red-600 underline ml-1">Quitar</button>
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400">{l.cantidadDisponible} uds</span>
                        {salesCount > 0 && <span className="text-[9px] font-bold text-[#22c55e]">{salesCount} vendido{salesCount !== 1 ? "s" : ""}</span>}
                        {reviewCount > 0 && <span className="text-[9px] text-gray-400">{reviewCount} resena{reviewCount !== 1 ? "s" : ""}</span>}
                        {imgs.length > 0 && <span className="text-[9px] text-gray-400">{imgs.length} foto{imgs.length !== 1 ? "s" : ""}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => {
                        setEditingId(isEditing ? null : l.id);
                        if (!isEditing) setEditForm({
                          precioCop: l.precioCop, cantidadDisponible: l.cantidadDisponible,
                          tiempoEntrega: l.tiempoEntrega ?? "", isActive: l.isActive,
                          descripcion: l.descripcion ?? "", modelo: l.modelo, marca: l.marca,
                        });
                      }}
                        className="p-1.5 rounded-lg text-[#348CCB] hover:bg-[#F0F7FF] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(l.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded edit form */}
                  {isEditing && (
                    <div className="px-4 pb-4 pt-2 space-y-2.5" style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Marca</label>
                          <input type="text" value={editForm.marca}
                            onChange={(e) => setEditForm((f) => ({ ...f, marca: e.target.value }))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#348CCB]/20 bg-[#F0F7FF]" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Modelo</label>
                          <input type="text" value={editForm.modelo}
                            onChange={(e) => setEditForm((f) => ({ ...f, modelo: e.target.value }))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#348CCB]/20 bg-[#F0F7FF]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Precio sin IVA</label>
                          <input type="number" value={editForm.precioCop || ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, precioCop: Number(e.target.value) }))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#348CCB]/20 bg-[#F0F7FF]" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Cantidad</label>
                          <input type="number" value={editForm.cantidadDisponible || ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, cantidadDisponible: Number(e.target.value) }))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#348CCB]/20 bg-[#F0F7FF]" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Entrega</label>
                          <select value={editForm.tiempoEntrega}
                            onChange={(e) => setEditForm((f) => ({ ...f, tiempoEntrega: e.target.value }))}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#348CCB]/20 bg-[#F0F7FF]">
                            <option value="Inmediato">Inmediato</option>
                            <option value="1-3 dias">1-3 dias</option>
                            <option value="1 semana">1 semana</option>
                            <option value="2 semanas">2 semanas</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Descripcion</label>
                        <textarea value={editForm.descripcion}
                          onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                          rows={2} placeholder="Descripcion del producto..."
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-[#348CCB]/20 bg-[#F0F7FF] resize-none" />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editForm.isActive}
                            onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                            className="accent-[#1E76B6]" />
                          <span className="text-[10px] font-medium text-gray-500">Activo en marketplace</span>
                        </label>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 border border-gray-200 hover:bg-gray-50">
                            Cancelar
                          </button>
                          <button onClick={() => handleUpdate(l.id)} disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-[#1E76B6] hover:opacity-90 disabled:opacity-40">
                            Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promotion modal */}
      {showPromo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(10,24,58,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.2)" }}>
            <div className="bg-[#173D68] text-white px-5 py-3.5 flex justify-between items-center flex-shrink-0">
              <h2 className="font-bold text-sm">Crear Promocion</h2>
              <button onClick={() => setShowPromo(false)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1.5">Tipo de descuento</label>
                <div className="flex rounded-lg overflow-hidden border border-[#348CCB]/30">
                  <button type="button" onClick={() => setPromoType("percent")}
                    className="flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    style={{ background: promoType === "percent" ? "#0A183A" : "#F0F7FF", color: promoType === "percent" ? "white" : "#173D68" }}>
                    <Percent className="w-3 h-3" /> Porcentaje
                  </button>
                  <button type="button" onClick={() => setPromoType("fixed")}
                    className="flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    style={{ background: promoType === "fixed" ? "#0A183A" : "#F0F7FF", color: promoType === "fixed" ? "white" : "#173D68" }}>
                    <DollarSign className="w-3 h-3" /> Valor fijo
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">{promoType === "percent" ? "Descuento (%)" : "Descuento (COP)"}</label>
                  <input type="number" value={promoValue || ""} placeholder={promoType === "percent" ? "Ej: 15" : "Ej: 50000"}
                    onChange={(e) => setPromoValue(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fecha limite</label>
                  <input type="date" value={promoExpiry} onChange={(e) => setPromoExpiry(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} className={inputCls} />
                </div>
              </div>
              {promoValue > 0 && promoSelected.size > 0 && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <p className="text-green-700 font-bold">
                    {promoType === "percent" ? `${promoValue}%` : fmtCOP(promoValue)} de descuento en {promoSelected.size} producto{promoSelected.size !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">Seleccionar productos</label>
                  <button onClick={() => {
                    const active = listings.filter((l) => l.isActive);
                    if (promoSelected.size === active.length) setPromoSelected(new Set());
                    else setPromoSelected(new Set(active.map((l) => l.id)));
                  }} className="text-[9px] font-bold text-[#1E76B6] hover:underline">
                    {promoSelected.size === listings.filter((l) => l.isActive).length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {listings.filter((l) => l.isActive).map((l) => {
                    const selected = promoSelected.has(l.id);
                    const newPrice = promoType === "percent" ? Math.round(l.precioCop * (1 - promoValue / 100)) : Math.max(0, l.precioCop - promoValue);
                    return (
                      <label key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
                        style={{ background: selected ? "rgba(30,118,182,0.05)" : "transparent", border: `1px solid ${selected ? "rgba(30,118,182,0.15)" : "rgba(0,0,0,0.04)"}` }}>
                        <input type="checkbox" checked={selected} onChange={() => {
                          const next = new Set(promoSelected);
                          if (selected) next.delete(l.id); else next.add(l.id);
                          setPromoSelected(next);
                        }} className="accent-[#1E76B6] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0A183A] truncate">{l.marca} {l.modelo}</p>
                          <p className="text-[9px] text-gray-400">{l.dimension}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-gray-400 line-through">{fmtCOP(l.precioCop)}</p>
                          {promoValue > 0 && <p className="text-xs font-bold text-red-500">{fmtCOP(newPrice)}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}>
              <button onClick={() => setShowPromo(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] border border-[#348CCB]/30 hover:bg-[#F0F7FF]">Cancelar</button>
              <button onClick={handleApplyPromo} disabled={promoSaving || promoSelected.size === 0 || promoValue <= 0 || !promoExpiry}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                {promoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Percent className="w-4 h-4" />}
                Aplicar a {promoSelected.size}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
