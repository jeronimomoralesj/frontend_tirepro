"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Pencil, Trash2, Package, Search, X,
  Check, DollarSign, Calendar, Tag,
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
  precioCop: number;
  precioPromo: number | null;
  cantidadDisponible: number;
  tiempoEntrega: string | null;
  isActive: boolean;
  catalogId: string | null;
  catalog?: { skuRef: string } | null;
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
    marca: "", modelo: "", dimension: "", eje: "",
    precioCop: 0, precioPromo: 0, cantidadDisponible: 0,
    tiempoEntrega: "1-3 dias", catalogId: "",
  });

  // Edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ precioCop: 0, cantidadDisponible: 0, tiempoEntrega: "", isActive: true });

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
      const res = await authFetch(`${API_BASE}/marketplace/listings`, {
        method: "POST",
        body: JSON.stringify({
          distributorId: companyId,
          ...form,
          catalogId: form.catalogId || undefined,
          eje: form.eje || undefined,
          precioPromo: form.precioPromo > 0 ? form.precioPromo : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ marca: "", modelo: "", dimension: "", eje: "", precioCop: 0, precioPromo: 0, cantidadDisponible: 0, tiempoEntrega: "1-3 dias", catalogId: "" });
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

  const filtered = search.trim()
    ? listings.filter((l) =>
        l.marca.toLowerCase().includes(search.toLowerCase()) ||
        l.modelo.toLowerCase().includes(search.toLowerCase()) ||
        l.dimension.includes(search))
    : listings;

  const activeCount = listings.filter((l) => l.isActive).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">Mi Catalogo</h1>
            <p className="text-xs text-[#348CCB] mt-0.5">{activeCount} producto{activeCount !== 1 ? "s" : ""} activo{activeCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Precio COP</label>
                    <input type="number" value={form.precioCop || ""} placeholder="$"
                      onChange={(e) => setForm((f) => ({ ...f, precioCop: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Precio promo</label>
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
                {form.catalogId && (
                  <p className="text-[9px] text-green-500 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Vinculado al catalogo TirePro
                  </p>
                )}
                {form.marca && !form.catalogId && (
                  <p className="text-[9px] text-orange-500 font-bold">
                    Este producto no esta en el catalogo — se agregara automaticamente.
                  </p>
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

        {/* Listings table */}
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
          <div className="space-y-2">
            {filtered.map((l) => {
              const isEditing = editingId === l.id;
              return (
                <div key={l.id} className="rounded-xl overflow-hidden transition-all" style={{
                  border: `1px solid ${l.isActive ? "rgba(52,140,203,0.12)" : "rgba(0,0,0,0.06)"}`,
                  opacity: l.isActive ? 1 : 0.5,
                }}>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#0A183A]">{l.marca} {l.modelo}</p>
                      <p className="text-[10px] text-gray-400">{l.dimension}{l.eje ? ` · ${l.eje}` : ""}{l.catalog ? ` · SKU: ${l.catalog.skuRef}` : ""}</p>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input type="number" value={editForm.precioCop || ""} placeholder="Precio"
                          onChange={(e) => setEditForm((f) => ({ ...f, precioCop: Number(e.target.value) }))}
                          className="w-24 px-2 py-1.5 rounded-lg text-xs border border-[#348CCB]/30 text-center" />
                        <input type="number" value={editForm.cantidadDisponible || ""} placeholder="Cant"
                          onChange={(e) => setEditForm((f) => ({ ...f, cantidadDisponible: Number(e.target.value) }))}
                          className="w-16 px-2 py-1.5 rounded-lg text-xs border border-[#348CCB]/30 text-center" />
                        <button onClick={() => handleUpdate(l.id)} disabled={saving}
                          className="p-1.5 rounded-lg text-white" style={{ background: "#22c55e" }}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-black text-[#0A183A]">{fmtCOP(l.precioCop)}</p>
                          <p className="text-[9px] text-gray-400">{l.cantidadDisponible} uds · {l.tiempoEntrega ?? "—"}</p>
                        </div>
                        <button onClick={() => { setEditingId(l.id); setEditForm({ precioCop: l.precioCop, cantidadDisponible: l.cantidadDisponible, tiempoEntrega: l.tiempoEntrega ?? "", isActive: l.isActive }); }}
                          className="p-1.5 rounded-lg text-[#348CCB] hover:bg-[#F0F7FF]">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(l.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
