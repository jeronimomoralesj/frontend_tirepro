"use client";

// Distributor public profile editor. Edits the data the public marketplace
// page at /marketplace/distributor/<slug> renders for end customers:
// company name, banner, profile photo, brand color, contact info, delivery
// type, and coverage points. Backed by the same
// /marketplace/distributor/:id/profile endpoint that the Mi Perfil tab on
// /dashboard/pedidosDist hits — surfaced as its own page so
// marketplace_tracker users (and anyone else who only needs the public
// storefront) can land here without scrolling through the Pedidos UI.

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, ExternalLink, Image as ImageIcon, Loader2, MapPin, Megaphone,
  Pin, Plus, Save, Search, Trash2, Upload, X,
} from "lucide-react";

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

interface CoberturaItem { ciudad: string; direccion?: string | null; lat?: number | null; lng?: number | null; }

// Slim picker shape — only the fields the picker UI shows. Matches what
// /marketplace/listings/distributor returns.
interface PickListing {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  precioCop: number;
  precioPromo: number | null;
  promoHasta: string | null;
  imageUrls: string[] | null;
  coverIndex: number;
  isActive: boolean;
}

interface CompanyForm {
  name: string;
  slug: string | null;
  profileImage: string;
  bannerImage: string;
  ciudad: string;
  telefono: string;
  emailAtencion: string;
  sitioWeb: string;
  descripcion: string;
  colorMarca: string;
  tipoEntrega: "domicilio" | "recogida" | "ambos";
  cobertura: CoberturaItem[];
  // Pinned promo banner — distributor-controlled hero on their public
  // storefront. All four fields nullable so leaving them blank means
  // "no banner" rather than "broken empty banner".
  promoBannerImage: string;
  promoBannerTitle: string;
  promoBannerSubtitle: string;
  promoBannerHref: string;
  // Optional listing the dist pins as their featured product, shown
  // next to the banner on the storefront. Empty string = no pin.
  pinnedListingId: string;
}

const EMPTY_FORM: CompanyForm = {
  name: "", slug: null, profileImage: "", bannerImage: "",
  ciudad: "", telefono: "", emailAtencion: "", sitioWeb: "",
  descripcion: "", colorMarca: "#1E76B6", tipoEntrega: "ambos",
  cobertura: [],
  promoBannerImage: "", promoBannerTitle: "",
  promoBannerSubtitle: "", promoBannerHref: "",
  pinnedListingId: "",
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-white text-[#0A183A] " +
  "placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]";
const inputStyle: React.CSSProperties = { border: "1px solid rgba(52,140,203,0.18)" };

export default function PerfilDistributorPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>("");
  // Resolved listing the dist has pinned, kept alongside the form so
  // the preview tile can render without a per-keystroke API hit.
  const [pinnedPreview, setPinnedPreview] = useState<PickListing | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u?.companyId) setCompanyId(u.companyId);
    } catch { /* unauth — middleware handles */ }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authFetch(`${API_BASE}/marketplace/distributor/${companyId}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: any) => {
        if (!c) return;
        const cob: CoberturaItem[] = Array.isArray(c.cobertura)
          ? c.cobertura.map((x: any) =>
              typeof x === "string"
                ? { ciudad: x, direccion: "", lat: null, lng: null }
                : { ciudad: x.ciudad ?? "", direccion: x.direccion ?? "", lat: x.lat ?? null, lng: x.lng ?? null },
            )
          : [];
        setForm({
          name:                c.name                ?? "",
          slug:                c.slug                ?? null,
          profileImage:        c.profileImage        ?? "",
          bannerImage:         c.bannerImage         ?? "",
          ciudad:              c.ciudad              ?? "",
          telefono:            c.telefono            ?? "",
          emailAtencion:       c.emailAtencion       ?? "",
          sitioWeb:            c.sitioWeb            ?? "",
          descripcion:         c.descripcion         ?? "",
          colorMarca:          c.colorMarca          ?? "#1E76B6",
          tipoEntrega:         (c.tipoEntrega as any) ?? "ambos",
          cobertura:           cob,
          promoBannerImage:    c.promoBannerImage    ?? "",
          promoBannerTitle:    c.promoBannerTitle    ?? "",
          promoBannerSubtitle: c.promoBannerSubtitle ?? "",
          promoBannerHref:     c.promoBannerHref     ?? "",
          pinnedListingId:     c.pinnedListingId     ?? "",
        });
        // Pre-cache the resolved listing object so the preview tile
        // shows up immediately without a follow-up fetch.
        if (c.pinnedListing) setPinnedPreview(c.pinnedListing as PickListing);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const publicUrl = useMemo(() => {
    if (!form.slug) return null;
    return `https://www.tirepro.com.co/marketplace/distributor/${form.slug}`;
  }, [form.slug]);

  async function handleSave() {
    if (!companyId) return;
    setSaving(true);
    setToast("");
    try {
      const res = await authFetch(`${API_BASE}/marketplace/distributor/${companyId}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          // name + slug are server-managed — never overwrite them.
          profileImage:  form.profileImage,
          bannerImage:   form.bannerImage,
          ciudad:        form.ciudad,
          telefono:      form.telefono,
          emailAtencion: form.emailAtencion,
          sitioWeb:      form.sitioWeb,
          descripcion:   form.descripcion,
          colorMarca:    form.colorMarca,
          tipoEntrega:   form.tipoEntrega,
          cobertura:     form.cobertura,
          // Promo banner — empty string maps to null so toggling the
          // banner off (clearing the image URL) actually removes it
          // rather than persisting a "" that the storefront would
          // still try to render.
          promoBannerImage:    form.promoBannerImage.trim()    || null,
          promoBannerTitle:    form.promoBannerTitle.trim()    || null,
          promoBannerSubtitle: form.promoBannerSubtitle.trim() || null,
          promoBannerHref:     form.promoBannerHref.trim()     || null,
          pinnedListingId:     form.pinnedListingId.trim()     || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast("Perfil actualizado");
    } catch (e: any) {
      setToast(`Error: ${e?.message ?? "no se pudo guardar"}`);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 3500);
    }
  }

  // Reuse the marketplace upload endpoint (also used by the listings
  // create modal) — it accepts any image bound to a distributorId and
  // stores it in the same S3 prefix, so promo banners live alongside
  // listing photos under one access policy.
  const [uploadingPromo, setUploadingPromo] = useState(false);
  async function uploadPromoBanner(file: File) {
    if (!companyId) return;
    setUploadingPromo(true);
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
      setForm((f) => ({ ...f, promoBannerImage: url }));
    } catch {
      setToast("No se pudo subir la imagen del banner");
      setTimeout(() => setToast(""), 2500);
    } finally {
      setUploadingPromo(false);
    }
  }

  function updateCobertura(i: number, patch: Partial<CoberturaItem>) {
    setForm((f) => ({
      ...f,
      cobertura: f.cobertura.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  }
  function removeCobertura(i: number) {
    setForm((f) => ({ ...f, cobertura: f.cobertura.filter((_, idx) => idx !== i) }));
  }
  function addCobertura() {
    setForm((f) => ({
      ...f,
      cobertura: [...f.cobertura, { ciudad: "", direccion: "", lat: null, lng: null }],
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#1E76B6]">
              Marketplace · Perfil
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] mt-1 leading-tight">
              Perfil del distribuidor
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Edita lo que ven los compradores en la página pública del marketplace.
            </p>
          </div>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E76B6] hover:underline"
            >
              Ver perfil público <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 px-4 py-2.5 rounded-xl text-sm bg-[#0A183A] text-white">
            {toast}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Identity card */}
          <section className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
            <h2 className="text-sm font-black text-[#0A183A] mb-4">Identidad</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombre comercial">
                <input className={inputCls} style={inputStyle} value={form.name} disabled />
              </Field>
              <Field label="Slug público">
                <input className={inputCls} style={inputStyle} value={form.slug ?? "—"} disabled />
              </Field>
              <Field label="Ciudad principal">
                <input
                  className={inputCls} style={inputStyle}
                  value={form.ciudad}
                  onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                  placeholder="Ej: Bogotá"
                />
              </Field>
              <Field label="Color de marca">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colorMarca}
                    onChange={(e) => setForm((f) => ({ ...f, colorMarca: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer flex-shrink-0"
                    style={{ border: "1px solid rgba(52,140,203,0.18)" }}
                  />
                  <input
                    className={inputCls} style={inputStyle}
                    value={form.colorMarca}
                    onChange={(e) => setForm((f) => ({ ...f, colorMarca: e.target.value }))}
                    placeholder="#1E76B6"
                  />
                </div>
              </Field>
              <Field label="URL imagen de perfil (logo)">
                <input
                  className={inputCls} style={inputStyle}
                  value={form.profileImage}
                  onChange={(e) => setForm((f) => ({ ...f, profileImage: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
              <Field label="URL imagen de banner">
                <input
                  className={inputCls} style={inputStyle}
                  value={form.bannerImage}
                  onChange={(e) => setForm((f) => ({ ...f, bannerImage: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
            </div>
          </section>

          {/* Preview card */}
          <aside className="bg-white rounded-2xl p-5 sm:p-6" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
            <h2 className="text-sm font-black text-[#0A183A] mb-4">Previsualización</h2>
            <div
              className="rounded-xl overflow-hidden mb-3"
              style={{ background: form.colorMarca, height: 90 }}
            >
              {form.bannerImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={form.bannerImage} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex items-center gap-3 -mt-9 ml-3">
              <div
                className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ border: "3px solid white", boxShadow: "0 4px 12px rgba(10,24,58,0.12)" }}
              >
                {form.profileImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={form.profileImage} alt="" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </div>
            <p className="text-base font-black text-[#0A183A] mt-2 truncate">{form.name || "Tu empresa"}</p>
            <p className="text-xs text-gray-500 truncate">{form.ciudad || "Ciudad"}</p>
          </aside>

          {/* Promo banner editor — pinned to the top of the public
              storefront. Image is uploaded to S3 via the marketplace
              upload endpoint (same one listings use); title/subtitle/href
              are optional and any blank field clears that part of the
              banner on save. */}
          <section className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
            <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(249,115,22,0.10)" }}>
                  <Megaphone className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#0A183A]">Banner promocional</h2>
                  <p className="text-[11px] text-gray-500">
                    Aparece arriba de tu catálogo en el storefront público.
                  </p>
                </div>
              </div>
              {form.promoBannerImage && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    promoBannerImage: "", promoBannerTitle: "",
                    promoBannerSubtitle: "", promoBannerHref: "",
                  }))}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                >
                  <Trash2 className="w-3 h-3" /> Quitar banner
                </button>
              )}
            </div>

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mt-4">
              {/* Live preview — same proportions the storefront uses so
                  the dist sees what the buyer will see before saving. */}
              <div
                className="relative w-full rounded-xl overflow-hidden"
                style={{
                  aspectRatio: "21 / 9",
                  background: form.promoBannerImage
                    ? "#0A183A"
                    : `linear-gradient(135deg,#f3f4f6,#e5e7eb)`,
                  border: "1px solid rgba(10,24,58,0.08)",
                }}
              >
                {form.promoBannerImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={form.promoBannerImage}
                    alt="Vista previa del banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-7 h-7 mb-1" />
                    <p className="text-[11px] font-bold uppercase tracking-wider">Sin banner</p>
                  </div>
                )}
                {form.promoBannerImage && (form.promoBannerTitle || form.promoBannerSubtitle) && (
                  <div
                    className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 text-white"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)" }}
                  >
                    {form.promoBannerTitle && (
                      <p className="text-base sm:text-lg font-black leading-tight drop-shadow">
                        {form.promoBannerTitle}
                      </p>
                    )}
                    {form.promoBannerSubtitle && (
                      <p className="text-[11px] sm:text-xs font-medium opacity-90 mt-0.5 drop-shadow">
                        {form.promoBannerSubtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    Imagen
                  </span>
                  <div className="flex gap-2">
                    <label
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer text-[#1E76B6] hover:bg-[#F0F7FF] flex-shrink-0"
                      style={{ border: "1px solid rgba(52,140,203,0.25)" }}
                    >
                      {uploadingPromo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Subir
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadPromoBanner(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <input
                      className={inputCls} style={inputStyle}
                      value={form.promoBannerImage}
                      onChange={(e) => setForm((f) => ({ ...f, promoBannerImage: e.target.value }))}
                      placeholder="…o pega una URL"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Recomendado: 1680×720 (21:9), JPG/PNG.
                  </p>
                </label>

                <Field label="Título (opcional)">
                  <input
                    className={inputCls} style={inputStyle}
                    value={form.promoBannerTitle}
                    onChange={(e) => setForm((f) => ({ ...f, promoBannerTitle: e.target.value }))}
                    placeholder="Ej: Promo Bridgestone -20%"
                    maxLength={70}
                  />
                </Field>
                <Field label="Subtítulo (opcional)">
                  <input
                    className={inputCls} style={inputStyle}
                    value={form.promoBannerSubtitle}
                    onChange={(e) => setForm((f) => ({ ...f, promoBannerSubtitle: e.target.value }))}
                    placeholder="Hasta agotar existencias"
                    maxLength={120}
                  />
                </Field>
                <Field label="URL al hacer clic (opcional)">
                  <div className="relative">
                    <input
                      className={`${inputCls} pr-9`} style={inputStyle}
                      value={form.promoBannerHref}
                      onChange={(e) => setForm((f) => ({ ...f, promoBannerHref: e.target.value }))}
                      placeholder="/marketplace/product/<id> o https://…"
                    />
                    {form.promoBannerHref && (
                      <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </Field>
              </div>
            </div>

            {/* Pinned product — sits next to the banner on the public
                storefront. The picker is a lightweight modal over the
                dist's own listings; clearing the pin nukes it server-
                side on the next save. */}
            <div className="mt-6 pt-5" style={{ borderTop: "1px dashed rgba(10,24,58,0.10)" }}>
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(30,118,182,0.10)" }}>
                    <Pin className="w-3.5 h-3.5 text-[#1E76B6]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0A183A]">Producto destacado</p>
                    <p className="text-[11px] text-gray-500">
                      Aparece como tarjeta junto al banner en tu storefront.
                    </p>
                  </div>
                </div>
                {form.pinnedListingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, pinnedListingId: "" }));
                      setPinnedPreview(null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> Quitar
                  </button>
                )}
              </div>

              {pinnedPreview ? (
                <PinnedListingTile listing={pinnedPreview} />
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={!companyId}
                  className="w-full p-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[#1E76B6] hover:bg-[#F0F7FF] transition-colors disabled:opacity-50"
                  style={{ border: "2px dashed rgba(52,140,203,0.30)" }}
                >
                  <Plus className="w-4 h-4" /> Elegir producto destacado
                </button>
              )}
              {pinnedPreview && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="mt-2 text-[11px] font-bold text-[#1E76B6] hover:underline inline-flex items-center gap-1"
                >
                  <Search className="w-3 h-3" /> Cambiar producto
                </button>
              )}
            </div>
          </section>

          {/* Contact card */}
          <section className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
            <h2 className="text-sm font-black text-[#0A183A] mb-4">Contacto</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Teléfono">
                <input
                  className={inputCls} style={inputStyle}
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="+57 300 …"
                />
              </Field>
              <Field label="Email de atención">
                <input
                  className={inputCls} style={inputStyle}
                  value={form.emailAtencion}
                  onChange={(e) => setForm((f) => ({ ...f, emailAtencion: e.target.value }))}
                  placeholder="contacto@empresa.co"
                  type="email"
                />
              </Field>
              <Field label="Sitio web">
                <input
                  className={inputCls} style={inputStyle}
                  value={form.sitioWeb}
                  onChange={(e) => setForm((f) => ({ ...f, sitioWeb: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Tipo de entrega">
                <select
                  className={inputCls} style={inputStyle}
                  value={form.tipoEntrega}
                  onChange={(e) => setForm((f) => ({ ...f, tipoEntrega: e.target.value as any }))}
                >
                  <option value="ambos">Domicilio y recogida</option>
                  <option value="domicilio">Solo domicilio</option>
                  <option value="recogida">Solo recogida</option>
                </select>
              </Field>
            </div>
          </section>

          {/* Coverage editor — full width below contact so it has room for two
              columns (ciudad + dirección) per row plus the per-row delete. */}
          <section className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
            <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
              <h2 className="text-sm font-black text-[#0A183A]">
                Puntos de cobertura ({form.cobertura.length})
              </h2>
              <button
                type="button"
                onClick={addCobertura}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white"
                style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
              >
                <Plus className="w-3.5 h-3.5" /> Agregar punto
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Ciudades y direcciones que aparecen como cobertura en tu perfil público.
            </p>

            {form.cobertura.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                <MapPin className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Sin puntos de cobertura.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {form.cobertura.map((c, i) => (
                  <li key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-start">
                    <input
                      className={inputCls}
                      style={inputStyle}
                      value={c.ciudad}
                      onChange={(e) => updateCobertura(i, { ciudad: e.target.value })}
                      placeholder="Ciudad"
                    />
                    <input
                      className={inputCls}
                      style={inputStyle}
                      value={c.direccion ?? ""}
                      onChange={(e) => updateCobertura(i, { direccion: e.target.value })}
                      placeholder="Dirección (opcional)"
                    />
                    <button
                      type="button"
                      onClick={() => removeCobertura(i)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-red-600 hover:bg-red-50 flex-shrink-0"
                      style={{ border: "1px solid rgba(220,38,38,0.18)" }}
                      aria-label="Eliminar punto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Bank account for payouts — separate section because it's
              private data (not surfaced on the public storefront) and
              flows through a dedicated payments endpoint. Component
              owns its own state + save flow so it doesn't fight the
              main "Guardar cambios" button at the bottom of the page. */}
          {companyId && (
            <section className="lg:col-span-3">
              <BankAccountSection companyId={companyId} />
            </section>
          )}

          {/* Description (full width) */}
          <section className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
            <h2 className="text-sm font-black text-[#0A183A] mb-4">Descripción pública</h2>
            <textarea
              rows={5}
              className={inputCls}
              style={{ ...inputStyle, resize: "vertical" }}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Cuéntale a los compradores qué los hace elegir tu empresa: años en el mercado, marcas que distribuyen, servicios incluidos, ciudades cubiertas…"
            />
          </section>
        </div>

        {/* Save bar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-black text-white transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#0A183A,#1E76B6)",
              boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>

      {pickerOpen && companyId && (
        <PinnedListingPicker
          companyId={companyId}
          selectedId={form.pinnedListingId}
          onClose={() => setPickerOpen(false)}
          onPick={(listing) => {
            setForm((f) => ({ ...f, pinnedListingId: listing.id }));
            setPinnedPreview(listing);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
// Pinned listing — preview + picker
// ─────────────────────────────────────────────────────────────────────

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function listingCover(l: PickListing): string | null {
  const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
  return imgs.length > 0 ? (imgs[l.coverIndex ?? 0] ?? imgs[0]) : null;
}

function isPromoActive(l: PickListing): boolean {
  return l.precioPromo != null && l.promoHasta != null && new Date(l.promoHasta).getTime() > Date.now();
}

function PinnedListingTile({ listing }: { listing: PickListing }) {
  const cover = listingCover(listing);
  const promo = isPromoActive(listing);
  const price = promo ? listing.precioPromo! : listing.precioCop;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white"
      style={{ border: "1px solid rgba(30,118,182,0.20)", boxShadow: "0 4px 14px -8px rgba(30,118,182,0.30)" }}
    >
      <div
        className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)" }}
      >
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cover} alt="" className="w-full h-full object-contain p-1" />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E76B6]">{listing.marca}</p>
        <p className="text-sm font-black text-[#0A183A] truncate">{listing.modelo}</p>
        <p className="text-[11px] text-gray-500 truncate">{listing.dimension}</p>
        <p className="text-sm font-black text-[#0A183A] tabular-nums mt-0.5">
          {fmtCOP(price)}
          {promo && (
            <span className="ml-2 text-[10px] text-gray-400 line-through font-medium">
              {fmtCOP(listing.precioCop)}
            </span>
          )}
        </p>
      </div>
      {!listing.isActive && (
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          Inactivo
        </span>
      )}
    </div>
  );
}

function PinnedListingPicker({
  companyId, selectedId, onClose, onPick,
}: {
  companyId: string;
  selectedId: string;
  onClose: () => void;
  onPick: (l: PickListing) => void;
}) {
  const [items, setItems] = useState<PickListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
    fetch(`${API_BASE}/marketplace/listings/distributor?distributorId=${encodeURIComponent(companyId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((l) =>
      `${l.marca} ${l.modelo} ${l.dimension}`.toLowerCase().includes(term),
    );
  }, [items, q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">Producto destacado</p>
            <h2 className="text-lg font-black text-[#0A183A]">Elegir producto</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-3" style={{ borderBottom: "1px solid rgba(10,24,58,0.06)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por marca, modelo o dimensión…"
              className="w-full pl-10 pr-3 py-2.5 rounded-full text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              style={{ border: "1px solid rgba(10,24,58,0.10)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#1E76B6]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-12">
              {items.length === 0
                ? "Aún no tienes productos publicados."
                : "Sin coincidencias."}
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((l) => {
                const cover = listingCover(l);
                const promo = isPromoActive(l);
                const price = promo ? l.precioPromo! : l.precioCop;
                const selected = l.id === selectedId;
                return (
                  <button
                    key={l.id}
                    onClick={() => onPick(l)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white text-left hover:border-[#1E76B6]/40 transition-colors"
                    style={{
                      border: selected
                        ? "2px solid #1E76B6"
                        : "1px solid rgba(10,24,58,0.08)",
                      boxShadow: selected ? "0 6px 16px -8px rgba(30,118,182,0.40)" : "none",
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)" }}
                    >
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cover} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#348CCB]">{l.marca}</p>
                      <p className="text-sm font-black text-[#0A183A] truncate">{l.modelo}</p>
                      <p className="text-[11px] text-gray-500 truncate">{l.dimension}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-[#0A183A] tabular-nums">{fmtCOP(price)}</p>
                      {!l.isActive && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 mt-0.5 inline-block">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Bank account for payouts
// ─────────────────────────────────────────────────────────────────────

const COLOMBIAN_BANKS = [
  "Bancolombia",
  "Davivienda",
  "BBVA Colombia",
  "Banco de Bogotá",
  "Banco Popular",
  "Banco AV Villas",
  "Banco Caja Social",
  "Banco GNB Sudameris",
  "Banco Itaú",
  "Banco Pichincha",
  "Bancoomeva",
  "Banco Falabella",
  "Banco Finandina",
  "Banco Santander",
  "Banco W",
  "Citibank Colombia",
  "Scotiabank Colpatria",
  "Nequi",
  "Daviplata",
  "Otro",
] as const;

interface BankAccountFormState {
  holderName: string;
  documentType: "NIT" | "CC";
  documentNumber: string;
  bankName: string;
  accountType: "ahorros" | "corriente";
  accountNumber: string;
  notificationEmail: string;
}

const EMPTY_BANK: BankAccountFormState = {
  holderName: "",
  documentType: "NIT",
  documentNumber: "",
  bankName: "Bancolombia",
  accountType: "ahorros",
  accountNumber: "",
  notificationEmail: "",
};

function BankAccountSection({ companyId: _companyId }: { companyId: string }) {
  const [form, setForm] = useState<BankAccountFormState>(EMPTY_BANK);
  const [loaded, setLoaded] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    authFetch(`${API_BASE}/payments/me/account`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setForm({
            holderName:        data.holderName        ?? "",
            documentType:      (data.documentType ?? "NIT") as "NIT" | "CC",
            documentNumber:    data.documentNumber    ?? "",
            bankName:          data.bankName          ?? "Bancolombia",
            accountType:       (data.accountType ?? "ahorros") as "ahorros" | "corriente",
            accountNumber:     data.accountNumber     ?? "",
            notificationEmail: data.notificationEmail ?? "",
          });
          setVerifiedAt(data.verifiedAt ?? null);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoaded(true));
  }, []);

  async function handleSave() {
    if (!form.holderName.trim() || !form.documentNumber.trim() || !form.accountNumber.trim()) {
      setToast("Completa los campos obligatorios.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/payments/me/account`, {
        method: "PATCH",
        body: JSON.stringify({
          holderName:        form.holderName.trim(),
          documentType:      form.documentType,
          documentNumber:    form.documentNumber.trim(),
          bankName:          form.bankName,
          accountType:       form.accountType,
          accountNumber:     form.accountNumber.trim(),
          notificationEmail: form.notificationEmail.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVerifiedAt(data.verifiedAt ?? null);
      setToast("Cuenta bancaria guardada");
    } catch (e: any) {
      setToast(`Error: ${e?.message?.slice(0, 200) ?? "no se pudo guardar"}`);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(30,118,182,0.10)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#1E76B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M3 21h18" />
              <path d="M5 21V10l7-5 7 5v11" />
              <path d="M9 21V14h6v7" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-black text-[#0A183A]">Cuenta para pagos</h2>
            <p className="text-[11px] text-gray-500">
              Donde te transferimos lo recaudado de los pedidos del marketplace.
            </p>
          </div>
        </div>
        {verifiedAt && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verificada
          </span>
        )}
      </div>

      {!loaded ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Titular de la cuenta">
            <input
              className={inputCls} style={inputStyle}
              value={form.holderName}
              onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))}
              placeholder="Razón social o nombre completo"
            />
          </Field>
          <Field label="Documento del titular">
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <select
                className={inputCls} style={inputStyle}
                value={form.documentType}
                onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value as "NIT" | "CC" }))}
              >
                <option value="NIT">NIT</option>
                <option value="CC">CC</option>
              </select>
              <input
                className={inputCls} style={inputStyle}
                value={form.documentNumber}
                onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
                placeholder="Número de documento"
              />
            </div>
          </Field>
          <Field label="Banco">
            <select
              className={inputCls} style={inputStyle}
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            >
              {COLOMBIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Tipo de cuenta">
            <select
              className={inputCls} style={inputStyle}
              value={form.accountType}
              onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value as "ahorros" | "corriente" }))}
            >
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </Field>
          <Field label="Número de cuenta">
            <input
              className={inputCls} style={inputStyle}
              value={form.accountNumber}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
              placeholder="Solo dígitos"
              inputMode="numeric"
            />
          </Field>
          <Field label="Email para comprobantes (opcional)">
            <input
              className={inputCls} style={inputStyle}
              value={form.notificationEmail}
              onChange={(e) => setForm((f) => ({ ...f, notificationEmail: e.target.value }))}
              placeholder="pagos@empresa.co"
              type="email"
            />
          </Field>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] text-gray-500 leading-relaxed max-w-md">
          Validamos los datos antes del primer pago. Si están incorrectos el pago será devuelto. Cualquier cambio reinicia la verificación.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !loaded}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#0A183A,#1E76B6)",
            boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar cuenta
        </button>
      </div>

      {toast && (
        <p className="mt-3 inline-block px-3 py-1.5 rounded-lg text-xs bg-[#0A183A] text-white">{toast}</p>
      )}
    </div>
  );
}
