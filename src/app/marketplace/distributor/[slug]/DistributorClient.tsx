"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Loader2, Package, Truck, X, ArrowLeft, Phone, Mail,
  MapPin, Globe, ShoppingCart, Clock, CheckCircle, ChevronLeft, ChevronRight,
  Store, Star, Shield, Recycle, Building2,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import { trackDistributorView } from "../../../../lib/marketplaceAnalytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Profile {
  id: string; slug: string | null; name: string; profileImage: string; plan: string;
  emailAtencion: string | null; telefono: string | null;
  descripcion: string | null; bannerImage: string | null;
  direccion: string | null; ciudad: string | null; sitioWeb: string | null;
  cobertura: any[] | null; tipoEntrega: string | null; colorMarca: string | null;
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
  // The route param can be either the new slug (preferred) or a legacy UUID.
  // The backend resolves either form, so we just pass it through to /profile.
  // For listings we wait until profile loads so we can filter by the canonical
  // UUID — the listings endpoint expects distributorId as a UUID.
  const { slug } = useParams<{ slug: string }>();
  const handle = slug;
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
    if (!handle) return;
    fetch(`${API_BASE}/marketplace/distributor/${handle}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setProfile(d); if (d) trackDistributorView({ id: d.id, name: d.name }); })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [handle]);

  const fetchListings = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const p = new URLSearchParams();
    p.set("distributorId", profile.id);
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
  }, [profile?.id, search, tipo, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, tipo]);

  const rawCobertura = Array.isArray(profile?.cobertura) ? profile!.cobertura : [];
  const cobertura = rawCobertura.map((c: any) => typeof c === "string" ? { ciudad: c, direccion: "", lat: null, lng: null } : c);
  const cobWithCoords = cobertura.filter((c: any) => c.lat && c.lng);
  const entrega = profile?.tipoEntrega;
  const brandColor = profile?.colorMarca ?? "#1E76B6";
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  // Render map for this distributor's locations
  useEffect(() => {
    if (!profile || cobWithCoords.length === 0 || !mapRef.current || mapReady) return;
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link"); link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;
      const map = L.map(mapRef.current).setView([cobWithCoords[0].lat, cobWithCoords[0].lng], cobWithCoords.length === 1 ? 13 : 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 18 }).addTo(map);
      cobWithCoords.forEach((loc: any) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${brandColor};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-size:9px;font-weight:900;">${profile?.name?.charAt(0) ?? ""}</span>
          </div>`,
          iconSize: [28, 28], iconAnchor: [14, 14],
        });
        L.marker([loc.lat, loc.lng], { icon }).addTo(map)
          .bindPopup(`<div style="font-family:system-ui"><p style="font-weight:800;margin:0;font-size:12px;">${loc.ciudad}</p>${loc.direccion ? `<p style="font-size:11px;color:#666;margin:2px 0 0;">${loc.direccion}</p>` : ""}</div>`);
      });
      if (cobWithCoords.length > 1) {
        const bounds = L.latLngBounds(cobWithCoords.map((c: any) => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [30, 30] });
      }
      setMapReady(true);
    };
    if (!(window as any).L) document.body.appendChild(script);
    else script.onload?.(new Event("load"));
  }, [profile, cobWithCoords, brandColor, mapReady]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      {/* Banner */}
      <div className="relative h-56 sm:h-72 lg:h-80 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: profile?.bannerImage
            ? `url(${profile.bannerImage}) center/cover no-repeat`
            : "linear-gradient(135deg, #0A183A 0%, #173D68 55%, #1E76B6 100%)",
        }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(10,24,58,0.55) 0%, rgba(10,24,58,0.15) 50%, rgba(245,245,247,1) 100%)",
        }} />
        <div className="absolute inset-0 opacity-25" aria-hidden style={{
          backgroundImage: "radial-gradient(circle at 15% 20%, rgba(52,140,203,0.55), transparent 45%), radial-gradient(circle at 85% 0%, rgba(245,158,11,0.4), transparent 45%)",
        }} />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Volver al marketplace
          </Link>
        </div>
      </div>

      {/* Profile card — overlaps banner */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8" style={{
          boxShadow: "0 20px 60px -20px rgba(10,24,58,0.25), 0 0 0 1px rgba(30,118,182,0.06)",
        }}>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Logo */}
            <div
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center overflow-hidden flex-shrink-0 p-3 -mt-20 sm:-mt-24 border-4 border-white"
              style={{
                background: "radial-gradient(circle at 30% 20%, #ffffff, #f0f7ff)",
                boxShadow: "0 12px 32px -10px rgba(10,24,58,0.3)",
              }}
            >
              {profile?.profileImage && profile.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png" ? (
                <img src={profile.profileImage} alt={profile.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <Store className="w-12 h-12 text-gray-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2"
                    style={{ background: `${brandColor}15`, color: brandColor }}
                  >
                    <Shield className="w-3 h-3" />
                    Distribuidor verificado
                  </span>
                  <h1
                    className="text-2xl sm:text-[32px] font-black leading-[1.05] tracking-tight"
                    style={{
                      background: `linear-gradient(135deg,#0A183A,${brandColor})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {profile?.name ?? "Distribuidor"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {profile?.ciudad && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#1E76B6]" /> {profile.ciudad}
                      </span>
                    )}
                    {profile?._count.listings != null && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <Package className="w-3.5 h-3.5 text-[#1E76B6]" /> {profile._count.listings} productos
                      </span>
                    )}
                    {entrega && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <Truck className="w-3.5 h-3.5 text-[#1E76B6]" />
                        {entrega === "domicilio" ? "Entrega a domicilio" : entrega === "recogida" ? "Solo recogida" : "Domicilio y recogida"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact buttons */}
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                  {profile?.telefono && (
                    <a href={`tel:${profile.telefono}`}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black text-white transition-all hover:opacity-95 hover:shadow-lg active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg,#0A183A,${brandColor})`, boxShadow: `0 6px 18px ${brandColor}40` }}>
                      <Phone className="w-3.5 h-3.5" /> Llamar
                    </a>
                  )}
                  {profile?.emailAtencion && (
                    <a href={`mailto:${profile.emailAtencion}`}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#0A183A] border border-gray-200 hover:bg-[#F0F7FF] hover:border-[#1E76B6]/30 transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  )}
                  {profile?.sitioWeb && (
                    <a href={profile.sitioWeb} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#0A183A] border border-gray-200 hover:bg-[#F0F7FF] hover:border-[#1E76B6]/30 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Web
                    </a>
                  )}
                </div>
              </div>

              {/* Description */}
              {profile?.descripcion && (
                <p className="text-sm text-gray-600 mt-4 leading-relaxed max-w-2xl">{profile.descripcion}</p>
              )}

              {/* Coverage badges */}
              {cobertura.length > 0 && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cobertura</span>
                  {cobertura.slice(0, 8).map((c: any, i: number) => (
                    <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                      style={{ background: `${brandColor}10`, color: brandColor, border: `1px solid ${brandColor}25` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: brandColor }} />
                      {c.ciudad ?? c}
                    </span>
                  ))}
                  {cobertura.length > 8 && (
                    <span className="text-[10px] text-gray-400 font-bold">+{cobertura.length - 8} más</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      {cobWithCoords.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Presencia</p>
              <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Dónde nos encuentras</h2>
            </div>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: brandColor }} />
              {cobWithCoords.length} punto{cobWithCoords.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div ref={mapRef} className="h-64 sm:h-72 rounded-3xl overflow-hidden border border-gray-100" style={{ zIndex: 0, boxShadow: "0 12px 40px -16px rgba(10,24,58,0.18)" }} />
        </div>
      )}

      {/* Search + Filters */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Catálogo</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Productos del distribuidor</h2>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">{total} producto{total !== 1 ? "s" : ""}</span>
        </div>
        <div
          className="flex items-center gap-2 p-2 rounded-2xl bg-white"
          style={{ boxShadow: "0 8px 24px -12px rgba(10,24,58,0.15), 0 0 0 1px rgba(30,118,182,0.08)" }}
        >
          <div className="flex items-center gap-2 flex-1 px-3">
            <Search className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en este catálogo…"
              className="flex-1 bg-transparent outline-none text-sm text-[#0A183A] placeholder-gray-400 py-2.5" />
          </div>
          <div className="hidden sm:flex gap-1">
            {[{ v: "", l: "Todo" }, { v: "nueva", l: "Nuevas" }, { v: "reencauche", l: "Reencauche" }].map((t) => (
              <button key={t.v} onClick={() => setTipo(t.v)}
                className="px-3 py-2 rounded-xl text-[11px] font-black transition-all"
                style={{
                  background: tipo === t.v ? `linear-gradient(135deg,#0A183A,${brandColor})` : "transparent",
                  color: tipo === t.v ? "white" : "#555",
                }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex sm:hidden gap-1 mt-2">
          {[{ v: "", l: "Todo" }, { v: "nueva", l: "Nuevas" }, { v: "reencauche", l: "Reencauche" }].map((t) => (
            <button key={t.v} onClick={() => setTipo(t.v)}
              className="px-3 py-1.5 rounded-full text-[10px] font-black transition-all"
              style={{
                background: tipo === t.v ? `linear-gradient(135deg,#0A183A,${brandColor})` : "white",
                color: tipo === t.v ? "white" : "#555",
                border: tipo === t.v ? "none" : "1px solid #e5e5e5",
              }}>
              {t.l}
            </button>
          ))}
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
                  <Link
                    key={l.id}
                    href={`/marketplace/product/${l.id}`}
                    className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group block border border-gray-100"
                  >
                    <div
                      className="relative aspect-square flex items-center justify-center overflow-hidden"
                      style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}
                    >
                      {coverImg ? (
                        <img src={coverImg} alt={`${l.marca} ${l.modelo}`} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <Package className="w-10 h-10 text-gray-200" />
                      )}
                      {hasPromo && (
                        <span
                          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 6px 14px rgba(239,68,68,0.3)" }}
                        >
                          -{discount}%
                        </span>
                      )}
                      {l.tipo === "reencauche" && (
                        <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-[9px] font-black text-purple-700 bg-purple-100/90 backdrop-blur-sm flex items-center gap-0.5">
                          <Recycle className="w-2.5 h-2.5" /> Reenc.
                        </span>
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="text-[10px] text-[#1E76B6] font-black uppercase tracking-widest">{l.marca}</p>
                      <p className="text-sm font-black text-[#0A183A] leading-snug truncate mt-0.5">{l.modelo}</p>
                      <p className="text-[10px] text-gray-400">{l.dimension}</p>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-[#0A183A]">{fmtCOP(price)}</span>
                        {hasPromo && <span className="text-[10px] text-gray-400 line-through">{fmtCOP(l.precioCop)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {cpk != null && cpk > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">CPK {fmtCOP(Math.round(cpk))}</span>}
                        {l.tiempoEntrega && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{l.tiempoEntrega}</span>}
                      </div>
                    </div>
                  </Link>
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
      <MarketplaceFooter />

    </div>
  );
}
