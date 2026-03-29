"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Loader2, Package, Truck, X, ArrowLeft, Phone, Mail,
  MapPin, Globe, ShoppingCart, Clock, CheckCircle, ChevronLeft, ChevronRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface DistributorProfile {
  id: string; name: string; profileImage: string; plan: string;
  emailAtencion: string | null; telefono: string | null;
  descripcion: string | null; bannerImage: string | null;
  direccion: string | null; ciudad: string | null; sitioWeb: string | null;
  _count: { listings: number };
}

interface Listing {
  id: string; marca: string; modelo: string; dimension: string;
  eje: string | null; tipo: string; precioCop: number;
  precioPromo: number | null; promoHasta: string | null;
  incluyeIva: boolean; cantidadDisponible: number;
  tiempoEntrega: string | null; imageUrl: string | null;
  distributor: { id: string; name: string; profileImage: string };
  catalog: { terreno: string | null; reencauchable: boolean; crowdAvgCpk: number | null; cpkEstimado: number | null } | null;
}

export default function DistributorStorefront() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<DistributorProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/marketplace/distributor/${id}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => {});
  }, [id]);

  const fetchListings = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("distributorId", id);
    if (search) params.set("search", search);
    if (tipo) params.set("tipo", tipo);
    params.set("page", String(page));
    params.set("limit", "24");
    params.set("sortBy", "price_asc");
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings?${params}`);
      if (res.ok) { const d = await res.json(); setListings(d.listings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); }
    } catch { /* */ }
    setLoading(false);
  }, [id, search, tipo, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, tipo]);

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "1px solid rgba(10,24,58,0.06)", boxShadow: "0 1px 4px rgba(10,24,58,0.04)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href="/marketplace" className="flex items-center gap-2 text-sm font-bold text-[#348CCB] hover:text-[#173D68]">
            <ArrowLeft className="w-4 h-4" /> Marketplace
          </Link>
          <div className="flex-1" />
          <Link href="/login" className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            Ingresar
          </Link>
        </div>
      </header>

      {/* Banner + Profile */}
      <div className="relative">
        <div className="h-40 sm:h-56 w-full" style={{
          background: profile?.bannerImage
            ? `url(${profile.bannerImage}) center/cover`
            : "linear-gradient(135deg, #0A183A 0%, #1E76B6 50%, #173D68 100%)",
        }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-10">
          <div className="flex items-end gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden p-2"
              style={{ border: "3px solid white" }}>
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt={profile.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <Truck className="w-8 h-8 text-[#348CCB]/40" />
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-xl sm:text-2xl font-black text-[#0A183A]">{profile?.name ?? "Distribuidor"}</h1>
              {profile?.ciudad && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {profile.ciudad}
                  {profile.direccion && <> · {profile.direccion}</>}
                </p>
              )}
            </div>
          </div>

          {/* Contact + description */}
          {profile && (
            <div className="mt-4 flex flex-col sm:flex-row gap-4 pb-4" style={{ borderBottom: "1px solid rgba(10,24,58,0.06)" }}>
              {profile.descripcion && (
                <p className="flex-1 text-sm text-gray-600 leading-relaxed">{profile.descripcion}</p>
              )}
              <div className="flex flex-wrap gap-3 flex-shrink-0">
                {profile.telefono && (
                  <a href={`tel:${profile.telefono}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#173D68] bg-white border border-gray-200 hover:bg-gray-50">
                    <Phone className="w-3.5 h-3.5" /> {profile.telefono}
                  </a>
                )}
                {profile.emailAtencion && (
                  <a href={`mailto:${profile.emailAtencion}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#173D68] bg-white border border-gray-200 hover:bg-gray-50">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                )}
                {profile.sitioWeb && (
                  <a href={profile.sitioWeb} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#173D68] bg-white border border-gray-200 hover:bg-gray-50">
                    <Globe className="w-3.5 h-3.5" /> Sitio web
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters + Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-[#1E76B6] text-[#0A183A]" />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[{ value: "", label: "Todas" }, { value: "nueva", label: "Nuevas" }, { value: "reencauche", label: "Reencauche" }].map((t) => (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className="px-3 py-2 text-xs font-bold transition-all"
                style={{ background: tipo === t.value ? "#0A183A" : "white", color: tipo === t.value ? "white" : "#173D68" }}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{total} producto{total !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#1E76B6]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Package className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-bold text-[#0A183A]">Sin productos publicados</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((l) => {
                const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                const price = hasPromo ? l.precioPromo! : l.precioCop;
                const cpk = l.catalog?.crowdAvgCpk ?? l.catalog?.cpkEstimado;
                return (
                  <div key={l.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    style={{ border: "1px solid rgba(10,24,58,0.06)" }}>
                    <div className="relative h-32 flex items-center justify-center" style={{ background: "#f8fafc" }}>
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt={`${l.marca} ${l.modelo}`} className="h-full w-full object-contain p-3" />
                      ) : (
                        <Package className="w-8 h-8 text-[#348CCB]/20" />
                      )}
                      {hasPromo && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black text-white bg-red-500">PROMO</span>}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[8px] font-bold"
                        style={{ background: l.tipo === "reencauche" ? "rgba(139,92,246,0.1)" : "rgba(30,118,182,0.1)", color: l.tipo === "reencauche" ? "#8b5cf6" : "#1E76B6" }}>
                        {l.tipo === "reencauche" ? "Reencauche" : "Nueva"}
                      </span>
                    </div>
                    <div className="p-3.5">
                      <p className="text-[10px] font-bold text-[#348CCB] uppercase">{l.marca}</p>
                      <p className="text-sm font-black text-[#0A183A] leading-tight">{l.modelo}</p>
                      <p className="text-[10px] text-gray-400">{l.dimension}</p>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-lg font-black text-[#0A183A]">{fmtCOP(price)}</span>
                        {hasPromo && <span className="text-xs text-gray-400 line-through">{fmtCOP(l.precioCop)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cpk != null && cpk > 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-600">CPK {fmtCOP(Math.round(cpk))}</span>}
                        {l.catalog?.reencauchable && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Reencauchable</span>}
                        {l.tiempoEntrega && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{l.tiempoEntrega}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-[#173D68] border border-gray-200 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-xs text-gray-400">Pagina {page} de {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-[#173D68] border border-gray-200 disabled:opacity-30">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="mt-8 py-6 text-center" style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}>
        <Link href="/marketplace" className="text-sm font-bold text-[#348CCB] hover:underline">Volver al Marketplace</Link>
      </footer>
    </div>
  );
}
