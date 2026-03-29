"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Loader2, Package, Truck, X, ArrowLeft, Phone, Mail,
  MapPin, Globe, ShoppingCart, Clock, CheckCircle, ChevronLeft, ChevronRight,
  Store, Star, Shield, Recycle, Building2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Profile {
  id: string; name: string; profileImage: string; plan: string;
  emailAtencion: string | null; telefono: string | null;
  descripcion: string | null; bannerImage: string | null;
  direccion: string | null; ciudad: string | null; sitioWeb: string | null;
  cobertura: string[] | null; tipoEntrega: string | null;
  _count: { listings: number };
}

interface Listing {
  id: string; marca: string; modelo: string; dimension: string;
  eje: string | null; tipo: string; precioCop: number;
  precioPromo: number | null; promoHasta: string | null;
  incluyeIva: boolean; cantidadDisponible: number;
  tiempoEntrega: string | null; descripcion: string | null;
  imageUrls: string[] | null; coverIndex: number;
  distributor: { id: string; name: string; profileImage: string };
  catalog: { terreno: string | null; reencauchable: boolean; crowdAvgCpk: number | null; cpkEstimado: number | null } | null;
}

export default function DistributorStorefront() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/marketplace/distributor/${id}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [id]);

  const fetchListings = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const p = new URLSearchParams();
    p.set("distributorId", id);
    if (search) p.set("search", search);
    if (tipo) p.set("tipo", tipo);
    p.set("page", String(page));
    p.set("limit", "24");
    p.set("sortBy", "price_asc");
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings?${p}`);
      if (res.ok) { const d = await res.json(); setListings(d.listings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); }
    } catch { /* */ }
    setLoading(false);
  }, [id, search, tipo, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, tipo]);

  const cobertura = Array.isArray(profile?.cobertura) ? profile!.cobertura : [];
  const entrega = profile?.tipoEntrega;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link href="/marketplace" className="flex items-center gap-2 text-sm font-bold text-[#555] hover:text-[#0A183A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Marketplace</span>
          </Link>
          <div className="flex-1" />
          <Link href="/marketplace" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#1E76B6]" />
            <span className="text-xs font-bold text-[#0A183A] hidden sm:block">TirePro Marketplace</span>
          </Link>
        </div>
      </header>

      {/* Banner */}
      <div className="relative h-48 sm:h-64 lg:h-72">
        <div className="absolute inset-0" style={{
          background: profile?.bannerImage
            ? `url(${profile.bannerImage}) center/cover no-repeat`
            : "linear-gradient(135deg, #0A183A 0%, #1E76B6 50%, #348CCB 100%)",
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* Profile card — overlaps banner */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 p-2 -mt-16 sm:-mt-20 border-4 border-white">
              {profile?.profileImage && profile.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                <img src={profile.profileImage} alt={profile.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <Store className="w-10 h-10 text-gray-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0A183A]">{profile?.name ?? "Distribuidor"}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    {profile?.ciudad && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" /> {profile.ciudad}
                      </span>
                    )}
                    {profile?._count.listings != null && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Package className="w-3 h-3" /> {profile._count.listings} productos
                      </span>
                    )}
                    {entrega && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Truck className="w-3 h-3" />
                        {entrega === "domicilio" ? "Entrega a domicilio" : entrega === "recogida" ? "Solo recogida" : "Domicilio y recogida"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact buttons */}
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                  {profile?.telefono && (
                    <a href={`tel:${profile.telefono}`}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ background: "#22c55e" }}>
                      <Phone className="w-3.5 h-3.5" /> Llamar
                    </a>
                  )}
                  {profile?.emailAtencion && (
                    <a href={`mailto:${profile.emailAtencion}`}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-[#0A183A] border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  )}
                  {profile?.sitioWeb && (
                    <a href={profile.sitioWeb} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-[#0A183A] border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Web
                    </a>
                  )}
                </div>
              </div>

              {/* Description */}
              {profile?.descripcion && (
                <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-2xl">{profile.descripcion}</p>
              )}

              {/* Coverage */}
              {cobertura.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Cobertura:</span>
                  {cobertura.slice(0, 8).map((c) => (
                    <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{c}</span>
                  ))}
                  {cobertura.length > 8 && (
                    <span className="text-[10px] text-gray-400">+{cobertura.length - 8} mas</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en este catalogo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 text-[#0A183A] placeholder-gray-400" />
          </div>
          {[{ v: "", l: "Todo" }, { v: "nueva", l: "Nuevas" }, { v: "reencauche", l: "Reencauche" }].map((t) => (
            <button key={t.v} onClick={() => setTipo(t.v)}
              className="px-4 py-2 rounded-full text-xs font-bold transition-all"
              style={{ background: tipo === t.v ? "#0A183A" : "white", color: tipo === t.v ? "white" : "#555", border: tipo === t.v ? "none" : "1px solid #e5e5e5" }}>
              {t.l}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-auto">{total} producto{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Products */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Package className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm font-bold text-[#0A183A]">Sin productos</p>
            <p className="text-xs text-gray-400 mt-1">Este distribuidor aun no ha publicado productos.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {listings.map((l) => {
                const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                const coverImg = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
                const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                const price = hasPromo ? l.precioPromo! : l.precioCop;
                const cpk = l.catalog?.crowdAvgCpk ?? l.catalog?.cpkEstimado;
                const discount = hasPromo ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;

                return (
                  <div key={l.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                    <div className="relative aspect-square flex items-center justify-center overflow-hidden bg-[#fafafa]">
                      {coverImg ? (
                        <img src={coverImg} alt={`${l.marca} ${l.modelo}`} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Package className="w-10 h-10 text-gray-200" />
                      )}
                      {hasPromo && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white bg-red-500">-{discount}%</span>}
                      {l.tipo === "reencauche" && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-bold text-purple-700 bg-purple-100 flex items-center gap-0.5">
                          <Recycle className="w-2.5 h-2.5" /> Reenc.
                        </span>
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="text-[10px] text-gray-400 uppercase">{l.marca}</p>
                      <p className="text-sm font-bold text-[#111] leading-snug">{l.modelo}</p>
                      <p className="text-[10px] text-gray-400">{l.dimension}</p>
                      <div className="mt-2">
                        <span className="text-lg font-black text-[#111]">{fmtCOP(price)}</span>
                        {hasPromo && <span className="text-[10px] text-gray-400 line-through ml-1">{fmtCOP(l.precioCop)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {cpk != null && cpk > 0 && <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">CPK {fmtCOP(Math.round(cpk))}</span>}
                        {l.tiempoEntrega && <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{l.tiempoEntrega}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-10">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 disabled:opacity-20 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400 px-3">Pagina {page} de {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 disabled:opacity-20 hover:bg-gray-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 text-center" style={{ borderTop: "1px solid #e5e5e5" }}>
        <Link href="/marketplace" className="text-sm font-bold text-[#1E76B6] hover:underline">Volver al Marketplace</Link>
      </footer>
    </div>
  );
}
