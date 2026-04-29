"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Loader2, Package, Truck, ArrowLeft, Phone, Mail,
  MapPin, Globe, ChevronLeft, ChevronRight,
  Store, Shield, Recycle, Building2, ShieldCheck, Layers, Send, MessageCircle,
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
  // Catalog filters local to this distributor's storefront. The brand
  // chips above the catalog and the use-case chips inside the filter
  // bar both write into these and re-fetch.
  const [marcaFilter, setMarcaFilter] = useState("");
  // Use cases map to rim-diameter sets extracted from the dimension
  // string. "retread" filters by tipo, not rim — kept separate from
  // the explicit tipo dropdown so the two can be combined.
  type UseCase = "" | "auto" | "truck" | "bus";
  const [useCase, setUseCase] = useState<UseCase>("");
  const USE_CASES: Array<{ key: UseCase; label: string; rims?: number[] }> = [
    { key: "",      label: "Todas" },
    { key: "auto",  label: "Auto y camioneta", rims: [13, 14, 15, 16, 17, 18, 19, 20, 21] },
    { key: "truck", label: "Camión y tractomula", rims: [17.5, 19.5, 22.5, 24.5] },
    { key: "bus",   label: "Bus", rims: [17.5, 19.5, 22.5] },
  ];

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
    if (marcaFilter) p.set("marca", marcaFilter);
    // Compute rims once so we both send them as a query param AND keep
    // a client-side rim-regex fallback (defensive — works even if the
    // backend ignores rimSizes).
    const useCaseCfg = USE_CASES.find((u) => u.key === useCase);
    const rimSizes = useCaseCfg?.rims ?? [];
    if (rimSizes.length > 0) p.set("rimSizes", rimSizes.join(","));
    p.set("page", String(page));
    // Bigger page when a use-case filter is active so the client-side
    // rim filter has enough rows to work with.
    p.set("limit", rimSizes.length > 0 ? "60" : "24");
    p.set("sortBy", "price_asc");
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings?${p}`);
      if (res.ok) {
        const d = await res.json();
        let next: any[] = d.listings ?? [];
        let nextTotal: number = d.total ?? 0;
        let nextPages: number = d.pages ?? 1;
        // Defensive client-side rim filter — applies even when the
        // backend returns the full set without honoring rimSizes.
        if (rimSizes.length > 0) {
          const rimRegexes = rimSizes.map(
            (r) => new RegExp(`R\\s*${String(r).replace(".", "\\.")}\\b`, "i"),
          );
          next = next.filter((l) =>
            rimRegexes.some((rx) => rx.test(l.dimension ?? "")),
          );
          nextTotal = next.length;
          nextPages = 1;
        }
        setListings(next);
        setTotal(nextTotal);
        setPages(nextPages);
      }
    } catch { /* */ }
    setLoading(false);
  }, [profile?.id, search, tipo, marcaFilter, useCase, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [search, tipo, marcaFilter, useCase]);

  const rawCobertura = Array.isArray(profile?.cobertura) ? profile!.cobertura : [];
  const cobertura = rawCobertura.map((c: any) => typeof c === "string" ? { ciudad: c, direccion: "", lat: null, lng: null } : c);
  const cobWithCoords = cobertura.filter((c: any) => c.lat && c.lng);
  const entrega = profile?.tipoEntrega;
  const brandColor = profile?.colorMarca ?? "#1E76B6";

  // ─── Aggregates derived from the WHOLE catalog (not the filtered
  // page) so the brand chips and SEO column links stay consistent
  // even when a user filters the grid down. Loaded once on profile
  // load via a single high-limit query.
  const [stockedBrands, setStockedBrands] = useState<string[]>([]);
  const [stockedDimensions, setStockedDimensions] = useState<string[]>([]);
  useEffect(() => {
    if (!profile?.id) return;
    const p = new URLSearchParams();
    p.set("distributorId", profile.id);
    p.set("limit", "200");
    p.set("sortBy", "newest");
    fetch(`${API_BASE}/marketplace/listings?${p}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const items: any[] = d?.listings ?? [];
        const brandCounts = new Map<string, number>();
        const dimCounts = new Map<string, number>();
        for (const l of items) {
          const m = (l.marca || "").trim();
          if (m) brandCounts.set(m, (brandCounts.get(m) ?? 0) + 1);
          const dim = (l.dimension || "").trim();
          if (dim) dimCounts.set(dim, (dimCounts.get(dim) ?? 0) + 1);
        }
        setStockedBrands(
          [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n]) => n),
        );
        setStockedDimensions(
          [...dimCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d]) => d),
        );
      })
      .catch(() => {});
  }, [profile?.id]);

  // WhatsApp link — Colombia phone numbers in TirePro come in many shapes
  // ("+57 315 134 9122", "315 134 9122", "+573151349122"). Strip every
  // non-digit and prepend 57 if it's missing so wa.me works regardless.
  const whatsappHref = useMemo(() => {
    if (!profile?.telefono) return null;
    const raw = profile.telefono.replace(/\D+/g, "");
    if (!raw) return null;
    const e164 = raw.startsWith("57") ? raw : `57${raw}`;
    const msg = `Hola ${profile.name}, vengo desde TirePro Marketplace y quisiera más información sobre sus llantas.`;
    return `https://wa.me/${e164}?text=${encodeURIComponent(msg)}`;
  }, [profile?.telefono, profile?.name]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

      {/* STATS STRIP — at-a-glance trust metrics. Sits visually anchored
          on the profile card. Pulls only data the API already returns
          (productos, ciudades, marcas en stock, tipo entrega) so it
          never renders stale or made-up numbers. */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <section
          aria-labelledby="dist-stats"
          className="bg-white rounded-3xl p-4 sm:p-5"
          style={{ boxShadow: "0 24px 60px -24px rgba(10,24,58,0.18)", border: `1px solid ${brandColor}1f` }}
        >
          <h2 id="dist-stats" className="sr-only">{profile?.name} en cifras</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: Package,    label: "Productos",     value: String(profile?._count.listings ?? 0), sub: "en catálogo" },
              { icon: MapPin,     label: "Cobertura",     value: cobertura.length > 0 ? `${cobertura.length} ciudades` : "Nacional", sub: cobertura[0]?.ciudad ? `incluye ${cobertura[0].ciudad}` : "envío en Colombia" },
              { icon: Layers,     label: "Marcas",        value: stockedBrands.length > 0 ? `${stockedBrands.length}+` : "Premium", sub: stockedBrands.slice(0, 2).join(" · ") || "marcas verificadas" },
              { icon: Truck,      label: "Entrega",       value: entrega === "domicilio" ? "Domicilio" : entrega === "recogida" ? "Recogida" : "Domicilio", sub: profile?.ciudad ? `desde ${profile.ciudad}` : "envío en Colombia" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${brandColor}15`, border: `1px solid ${brandColor}25` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: brandColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: brandColor }}>
                      {s.label}
                    </p>
                    <p className="text-[15px] font-black text-[#0A183A] leading-tight truncate">{s.value}</p>
                    <p className="text-[10px] text-gray-500 leading-snug truncate">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* BRANDS STRIP — chips act as catalog filters (not external
          links). Clicking a chip filters the catalog below by that
          marca; clicking the same chip again clears the filter.
          Auto-scrolls to the catalog so the user sees the result. */}
      {stockedBrands.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <section aria-labelledby="dist-brands">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: brandColor }}>
                  Filtra por marca
                </p>
                <h2 id="dist-brands" className="text-lg sm:text-xl font-black text-[#0A183A]">
                  Marcas que vende {profile?.name}
                </h2>
              </div>
              {marcaFilter && (
                <button
                  onClick={() => setMarcaFilter("")}
                  className="text-[10px] font-black hover:underline"
                  style={{ color: brandColor }}
                >
                  Limpiar marca
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {stockedBrands.map((b) => {
                const active = marcaFilter === b;
                return (
                  <button
                    key={b}
                    onClick={() => {
                      setMarcaFilter(active ? "" : b);
                      if (typeof window !== "undefined") {
                        // Defer so React re-renders the active state
                        // before we scroll.
                        setTimeout(() => {
                          document.getElementById("catalogo-distribuidor")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 80);
                      }
                    }}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full transition-all"
                    style={{
                      background: active ? `linear-gradient(135deg,#0A183A,${brandColor})` : "white",
                      color: active ? "white" : "#0A183A",
                      border: active ? "1px solid transparent" : "1px solid rgba(10,24,58,0.08)",
                      boxShadow: active ? `0 6px 16px -6px ${brandColor}80` : "none",
                    }}
                  >
                    <span className="text-xs font-black">{b}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Search + Filters */}
      <div id="catalogo-distribuidor" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 scroll-mt-24">
        <div className="flex items-end justify-between mb-3 gap-3">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Catálogo</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Productos del distribuidor</h2>
          </div>
          <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
            {total} producto{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Use-case chips — first row, mirrors the brand-page filter
            language so users get the same shortcuts everywhere. */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {USE_CASES.map((u) => {
            const active = useCase === u.key;
            return (
              <button
                key={u.key || "all"}
                onClick={() => setUseCase(u.key)}
                className="px-3 py-1.5 rounded-full text-[11px] font-black transition-all"
                style={{
                  background: active ? `linear-gradient(135deg,#0A183A,${brandColor})` : "white",
                  color: active ? "white" : "#0A183A",
                  border: active ? "1px solid transparent" : "1px solid rgba(10,24,58,0.08)",
                  boxShadow: active ? `0 4px 12px -4px ${brandColor}80` : "none",
                }}
              >
                {u.label}
              </button>
            );
          })}
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

        {/* Active-filter summary + reset — only renders when any of the
            three (marca / use case / tipo) is active. Search has its
            own visible input. */}
        {(marcaFilter || useCase || tipo) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Filtros:</span>
            {marcaFilter && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: brandColor }}
              >
                {marcaFilter}
              </span>
            )}
            {useCase && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: brandColor }}
              >
                {USE_CASES.find((u) => u.key === useCase)?.label}
              </span>
            )}
            {tipo && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: brandColor }}
              >
                {tipo === "nueva" ? "Nuevas" : "Reencauche"}
              </span>
            )}
            <button
              onClick={() => { setMarcaFilter(""); setUseCase(""); setTipo(""); }}
              className="text-[10px] font-black hover:underline ml-1"
              style={{ color: brandColor }}
            >
              Limpiar todos
            </button>
          </div>
        )}
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

      {/* WHY BUY — value prop cards. Moved here (after the catalog,
          before the map) so the page reads: identity → stats → brands
          → catalog → reasons to trust → coverage map → B2B → SEO.
          Title trimmed to a single eyebrow line so it doesn't repeat
          "{name}, distribuidor verificado" right under the H1. */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <section aria-labelledby="dist-why" className="space-y-3">
          <p
            id="dist-why"
            className="text-[10px] font-black uppercase tracking-widest mb-1"
            style={{ color: brandColor }}
          >
            Por qué comprar aquí
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: ShieldCheck, title: "Distribuidor verificado", sub: "Pasó nuestro proceso de validación de TirePro Marketplace." },
              { icon: Package,     title: "Amplio inventario",       sub: `${profile?._count.listings ?? 0} producto${profile?._count.listings === 1 ? "" : "s"} disponibles entre marcas y dimensiones.` },
              { icon: Truck,       title: "Envío en Colombia",       sub: cobertura.length > 0 ? `Cobertura activa en ${cobertura.slice(0, 3).map((c: any) => c.ciudad).filter(Boolean).join(", ")}${cobertura.length > 3 ? " y más" : ""}.` : "Despacho a las principales ciudades del país." },
              { icon: Building2,   title: "Atendemos flotas",        sub: "Compras al por mayor con asesoría directa y precios para empresas." },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="bg-white rounded-2xl p-4 flex items-start gap-3"
                  style={{ boxShadow: "0 6px 18px -10px rgba(10,24,58,0.12)", border: "1px solid rgba(10,24,58,0.05)" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${brandColor}12`, border: `1px solid ${brandColor}22` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: brandColor }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-[#0A183A] leading-tight">{b.title}</p>
                    <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{b.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* MAP — moved to the end (after the catalog + Por qué) so the
          tires breathe right under the hero and the user only meets
          the geo presence once they're already engaged. Same content
          as before; just relocated. */}
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

      {/* B2B / FLOTAS — explicit "we sell to fleets" block. Pre-fills
          the email/WhatsApp body with a quote-request template so
          buyers don't have to think. Most retread-volume conversions
          start as a phone or WhatsApp ping, not a checkout. */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <section
          aria-labelledby="dist-b2b"
          className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0A183A 0%, ${brandColor} 100%)`,
            boxShadow: "0 24px 60px -24px rgba(10,24,58,0.45)",
          }}
        >
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.5), transparent 40%), radial-gradient(circle at 85% 100%, rgba(255,255,255,0.3), transparent 40%)",
            }}
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">
                Compras para flotas y empresas
              </p>
              <h2 id="dist-b2b" className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight">
                Cotiza al por mayor con {profile?.name}
              </h2>
              <p className="text-sm text-white/85 mt-2 max-w-xl leading-relaxed">
                Atendemos transportadores, talleres y operadores logísticos. Pídenos un
                presupuesto para tu flota — descuentos por volumen y asesoría directa
                con un comercial.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-white/85 max-w-xl">
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/70" /> Precios por volumen</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/70" /> Asesoría comercial directa</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/70" /> Facturación a empresa</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/70" /> Despacho coordinado</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2.5">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-black bg-white text-[#0A183A] hover:bg-gray-50 transition-colors"
                  style={{ boxShadow: "0 12px 28px -10px rgba(0,0,0,0.45)" }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp para cotizar
                </a>
              )}
              {profile?.emailAtencion && (
                <a
                  href={`mailto:${profile.emailAtencion}?subject=${encodeURIComponent(`Cotización flota — ${profile.name}`)}&body=${encodeURIComponent(`Hola,\n\nVengo desde TirePro Marketplace y me gustaría una cotización para una flota.\n\n• Cantidad estimada: \n• Dimensiones: \n• Tipo (nueva / reencauche): \n• Ciudad de entrega: \n\nGracias.`)}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold text-white border border-white/30 hover:bg-white/10 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Enviar correo
                </a>
              )}
              {profile?.telefono && (
                <a
                  href={`tel:${profile.telefono}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold text-white border border-white/30 hover:bg-white/10 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Llamar a {profile.telefono}
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* SEO CONTENT BLOCK — H2 with target keyword "Comprar llantas
          con {distributor} en Colombia". Server-rendered Spanish copy
          for crawlers + 3 internal-link columns (brands stocked /
          dimensions in stock / cities served). Stocked* lists are
          empty-safe (the column drops out gracefully). */}
      {profile && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
          <section
            aria-labelledby="dist-seo"
            className="bg-white rounded-3xl p-6 sm:p-8"
            style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
          >
            <h2 id="dist-seo" className="text-xl sm:text-2xl font-black text-[#0A183A] mb-4">
              Comprar llantas con {profile.name} en Colombia
            </h2>
            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-3">
              <p>
                <strong>{profile.name}</strong> es un distribuidor verificado en TirePro
                Marketplace{profile.ciudad ? <>, con base en <strong>{profile.ciudad}</strong></> : ""}.
                Compras llantas en línea con respaldo, asesoría directa y envío
                {cobertura.length > 0 ? <> a las ciudades de su cobertura activa</> : <> a toda Colombia</>}.
              </p>
              <p>
                {stockedBrands.length > 0 ? (
                  <>
                    Su catálogo en TirePro incluye marcas como{" "}
                    <strong>{stockedBrands.slice(0, 5).join(", ")}</strong>
                    {stockedBrands.length > 5 ? ", entre otras" : ""}, en dimensiones
                    populares para tractomula, camión, bus, camioneta y automóvil.
                  </>
                ) : (
                  <>
                    Atiende compradores particulares, talleres y flotas de transporte en
                    Colombia, ofreciendo llantas para tractomula, camión, bus, camioneta
                    y automóvil.
                  </>
                )}
              </p>
              <p>
                Compra en línea desde Bogotá, Medellín, Cali, Barranquilla, Bucaramanga,
                Cartagena y resto del país. Compara precios, lee reseñas y coordina la
                entrega directamente con el distribuidor — sin intermediarios.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {stockedBrands.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: brandColor }}>
                    Marcas que vende
                  </h3>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {stockedBrands.slice(0, 8).map((b) => (
                      <li key={b}>
                        <Link href={`/marketplace/brand/${slugify(b)}`} className="hover:text-[#1E76B6] hover:underline">
                          Llantas {b}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stockedDimensions.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: brandColor }}>
                    Medidas en catálogo
                  </h3>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {stockedDimensions.map((d) => (
                      <li key={d}>
                        <Link href={`/marketplace?q=${encodeURIComponent(d)}`} className="hover:text-[#1E76B6] hover:underline">
                          Llantas {d}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: brandColor }}>
                  Ciudades servidas
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  {(cobertura.length > 0
                    ? cobertura.slice(0, 8).map((c: any) => c.ciudad).filter(Boolean)
                    : ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Cartagena", "Pereira", "Cúcuta"]
                  ).map((c: string) => (
                    <li key={c}>
                      <Link
                        href={`/marketplace?q=${encodeURIComponent(`${profile.name} ${c}`)}`}
                        className="hover:text-[#1E76B6] hover:underline"
                      >
                        {profile.name} en {c}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <MarketplaceFooter />

      {/* STICKY MOBILE CTA — phone / WhatsApp / email always within
          thumb's reach. Hidden on desktop where the profile-card
          contact buttons are persistently visible. */}
      {(profile?.telefono || profile?.emailAtencion) && (
        <>
          <div className="lg:hidden h-20" aria-hidden />
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md"
            style={{ borderTop: "1px solid rgba(10,24,58,0.08)", boxShadow: "0 -8px 24px -12px rgba(10,24,58,0.18)" }}
          >
            <div className="px-3 py-2.5 flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">Contacta</p>
                <p className="text-[12px] font-black text-[#0A183A] leading-tight truncate">{profile.name}</p>
              </div>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                  style={{ background: "#22c55e", boxShadow: "0 6px 16px -4px rgba(34,197,94,0.55)" }}
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {profile.telefono && (
                <a
                  href={`tel:${profile.telefono}`}
                  aria-label="Llamar"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg,#0A183A,${brandColor})`, boxShadow: `0 6px 16px -4px ${brandColor}99` }}
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {profile.emailAtencion && (
                <a
                  href={`mailto:${profile.emailAtencion}`}
                  aria-label="Email"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[#0A183A] border border-gray-200 bg-white"
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
