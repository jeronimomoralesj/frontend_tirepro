"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search, Loader2, Package, Truck, ArrowLeft, ArrowUpRight, Phone, Mail,
  MapPin, Globe, ChevronLeft, ChevronRight, Sparkles,
  Store, Shield, Recycle, Building2, ShieldCheck, Layers, Send, MessageCircle, X,
  SlidersHorizontal,
} from "lucide-react";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import { AddToCartButton } from "../../../../components/marketplace/AddToCartButton";
import { trackDistributorView } from "../../../../lib/marketplaceAnalytics";
import { productHref } from "../../product/_lib/url";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface PinnedListing {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  precioCop: number;
  precioPromo: number | null;
  promoHasta: string | null;
  imageUrls: string[] | null;
  coverIndex: number;
}

interface Profile {
  id: string; slug: string | null; name: string; profileImage: string; plan: string;
  emailAtencion: string | null; telefono: string | null;
  descripcion: string | null; bannerImage: string | null;
  direccion: string | null; ciudad: string | null; sitioWeb: string | null;
  cobertura: any[] | null; tipoEntrega: string | null; colorMarca: string | null;
  promoBannerImage: string | null;
  promoBannerTitle: string | null;
  promoBannerSubtitle: string | null;
  promoBannerHref: string | null;
  pinnedListing: PinnedListing | null;
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
  // Debounced copy of `search` — typing into the input updates `search`
  // immediately so the field stays responsive, but the fetch only runs
  // 280ms after the user stops typing. Without this, every keystroke
  // triggered a full re-fetch + grid re-render, which is what the
  // "lags" complaint was actually about.
  const [searchDebounced, setSearchDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 280);
    return () => clearTimeout(t);
  }, [search]);
  const [tipo, setTipo] = useState("");
  const [eje, setEje] = useState("");
  const [dimension, setDimension] = useState("");
  // Sort + max-price mirror the marketplace search so the dist's
  // storefront feels like a scoped slice of the global experience —
  // not a simpler one-off layout that loses parity over time.
  const [sortBy, setSortBy] = useState<string>("price_asc");
  const [maxPrice, setMaxPrice] = useState<string>("");
  // Mobile filter drawer — true when the user has tapped the Filtros
  // button on a small viewport. Sidebar is always visible on lg+.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Lock body scroll while the mobile drawer is open. Otherwise the
  // page scrolls behind the drawer when the user touches it.
  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [filtersOpen]);
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
    if (searchDebounced) p.set("search", searchDebounced);
    if (tipo) p.set("tipo", tipo);
    if (eje) p.set("eje", eje);
    if (dimension) p.set("dimension", dimension);
    if (marcaFilter) p.set("marca", marcaFilter);
    // Compute rims once so we both send them as a query param AND keep
    // a client-side rim-regex fallback (defensive — works even if the
    // backend ignores rimSizes).
    const useCaseCfg = USE_CASES.find((u) => u.key === useCase);
    const rimSizes = useCaseCfg?.rims ?? [];
    if (rimSizes.length > 0) p.set("rimSizes", rimSizes.join(","));
    const maxPriceNum = parseInt(maxPrice.replace(/\D/g, ""), 10);
    if (Number.isFinite(maxPriceNum) && maxPriceNum > 0) p.set("maxPrice", String(maxPriceNum));
    p.set("page", String(page));
    // Bigger page when a use-case filter is active so the client-side
    // rim filter has enough rows to work with.
    p.set("limit", rimSizes.length > 0 ? "60" : "24");
    p.set("sortBy", sortBy || "price_asc");
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
  }, [profile?.id, searchDebounced, tipo, eje, dimension, marcaFilter, useCase, page, sortBy, maxPrice]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [searchDebounced, tipo, eje, dimension, marcaFilter, useCase, sortBy, maxPrice]);

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

  // Brand metadata (logo + slug) keyed by lowercase brand name. The
  // /marketplace/brands endpoint is the same one MarketplaceClient uses
  // for its global brand pills, so we get logos that line up with the
  // brand-detail pages without a second source of truth.
  type BrandMeta = { name: string; slug: string; logoUrl: string | null };
  const [brandsMap, setBrandsMap] = useState<Map<string, BrandMeta>>(new Map());
  useEffect(() => {
    fetch(`${API_BASE}/marketplace/brands`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        const m = new Map<string, BrandMeta>();
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (row?.name) {
              m.set(String(row.name).toLowerCase().trim(), {
                name:    row.name,
                slug:    row.slug ?? null,
                logoUrl: row.logoUrl ?? null,
              });
            }
          }
        }
        setBrandsMap(m);
      })
      .catch(() => { /* no logos — carousel falls back to monogram tiles */ });
  }, []);

  const brandsCarouselRef = useRef<HTMLDivElement>(null);
  const scrollBrandsBy = useCallback((delta: number) => {
    brandsCarouselRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }, []);
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
        // Dedupe brands by lowercase key — distributors sometimes
        // upload the same brand with mixed casing ("Hankook" + "hankook")
        // and we don't want two cards for the same logo. Keep the
        // best-cased variant we've seen so the tile stays readable
        // even when no BrandInfo record exists to override the display.
        const brandCounts = new Map<string, { display: string; count: number }>();
        const dimCounts = new Map<string, number>();
        const looksProper = (s: string) =>
          s.length > 0 && s[0] === s[0].toUpperCase();
        for (const l of items) {
          const raw = (l.marca || "").trim();
          if (raw) {
            const key = raw.toLowerCase();
            const existing = brandCounts.get(key);
            if (existing) {
              existing.count += 1;
              // Upgrade to a properly-cased variant if we now see one
              // and didn't have one before.
              if (looksProper(raw) && !looksProper(existing.display)) {
                existing.display = raw;
              }
            } else {
              brandCounts.set(key, { display: raw, count: 1 });
            }
          }
          const dim = (l.dimension || "").trim();
          if (dim) dimCounts.set(dim, (dimCounts.get(dim) ?? 0) + 1);
        }
        setStockedBrands(
          [...brandCounts.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 12)
            .map((v) => v.display),
        );
        setStockedDimensions(
          [...dimCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d]) => d),
        );
      })
      .catch(() => {});
  }, [profile?.id]);

  // Active filters — memoized so the chip list only rebuilds when one
  // of the inputs actually changes, not on every keystroke or scroll.
  const activeChips = useMemo(() => {
    const list: Array<{ key: string; label: string; clear: () => void }> = [];
    if (marcaFilter) list.push({ key: "marca",     label: marcaFilter,                                              clear: () => setMarcaFilter("") });
    if (useCase)     list.push({ key: "useCase",   label: USE_CASES.find((u) => u.key === useCase)?.label ?? "",     clear: () => setUseCase("") });
    if (tipo)        list.push({ key: "tipo",      label: tipo === "nueva" ? "Nuevas" : "Reencauche",                clear: () => setTipo("") });
    if (eje)         list.push({ key: "eje",       label: eje[0].toUpperCase() + eje.slice(1),                       clear: () => setEje("") });
    if (dimension)   list.push({ key: "dimension", label: dimension,                                                  clear: () => setDimension("") });
    if (maxPrice)    list.push({ key: "maxPrice",  label: `Hasta $${Number(maxPrice.replace(/\D/g, "")).toLocaleString("es-CO")}`, clear: () => setMaxPrice("") });
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaFilter, useCase, tipo, eje, dimension, maxPrice]);
  const activeFiltersCount = activeChips.length;

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
  // Gate the Leaflet script + tile load on the map div scrolling into
  // view. The presence section sits far below the fold on most
  // viewports, so eager loading shipped 140KB of leaflet.js + a stream
  // of OSM tile requests for users who never scroll there. Once the
  // observer fires we keep the flag latched — there's no benefit to
  // unmounting Leaflet when the user scrolls back up.
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    if (mapVisible || !mapRef.current || cobWithCoords.length === 0) return;
    // Bail out gracefully if the browser doesn't have IntersectionObserver
    // (very old Safari) — render the map immediately rather than never.
    if (typeof IntersectionObserver === "undefined") {
      setMapVisible(true);
      return;
    }
    const el = mapRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMapVisible(true);
          io.disconnect();
        }
      },
      // 200px rootMargin so the script kicks in just before the map
      // scrolls into the viewport — no perceptible delay for users.
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cobWithCoords.length, mapVisible]);

  // Render map for this distributor's locations
  useEffect(() => {
    if (!profile || cobWithCoords.length === 0 || !mapRef.current || mapReady || !mapVisible) return;
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
  }, [profile, cobWithCoords, brandColor, mapReady, mapVisible]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav
        coBrand={profile ? {
          name: profile.name,
          // Skip the default placeholder logo — it's the same generic
          // TirePro mark, would render twice next to the real one and
          // defeat the "co-brand" framing. Also reject empty / non-http
          // URLs so we never hand <img src=""> to the navbar.
          logoUrl: (() => {
            const u = (profile.profileImage ?? "").trim();
            if (!u) return null;
            if (u.includes("logoFull.png")) return null;
            return u;
          })(),
          href: `/marketplace/distributor/${profile.slug ?? profile.id}`,
          accentColor: profile.colorMarca && profile.colorMarca.trim()
            ? profile.colorMarca
            : undefined,
        } : undefined}
      />

      {/* HERO — co-branded landing-style header. Reads like the dist
          has their own landing page but is unmistakably hosted on
          TirePro: a small "TirePro × {dist}" co-brand chip up top, the
          dist's name as the marquee headline, their description as
          the tagline, and CTAs that drive the visitor toward either
          the catalog (primary) or WhatsApp (secondary). The right
          column carries the dist logo against their banner image so
          their visual identity still dominates the hero. */}
      <section
        className="relative overflow-hidden"
        style={{
          background: profile?.bannerImage
            ? `linear-gradient(135deg, ${brandColor}12 0%, ${brandColor}04 60%, white 100%)`
            : `linear-gradient(135deg, ${brandColor}1a 0%, ${brandColor}06 55%, white 100%)`,
        }}
      >
        {/* Soft brand-tinted blobs in the background — subtle texture
            so the hero doesn't feel flat. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 12% 20%, ${brandColor}1a, transparent 45%), radial-gradient(circle at 88% 0%, ${brandColor}10, transparent 45%)`,
          }}
        />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10 sm:pb-14">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0A183A]/70 hover:text-[#0A183A] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver al marketplace
          </Link>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT — copy & CTAs */}
            <div className="lg:col-span-7">
              {/* Co-brand strip — TirePro logo · Distributor logo. Reads
                  as a partnership lockup, not a header logo dump. */}
              <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-full bg-white"
                style={{ boxShadow: "0 6px 14px -8px rgba(10,24,58,0.15)", border: `1px solid ${brandColor}22` }}
              >
                <Image src="/logo_full.png" alt="TirePro" width={80} height={18} className="h-4 sm:h-[18px] w-auto" />
                <span className="text-gray-300 text-xs font-light">×</span>
                {profile?.profileImage && !profile.profileImage.includes("logoFull.png") ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.name}
                    className="h-4 sm:h-[18px] w-auto object-contain"
                  />
                ) : (
                  <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: brandColor }}>
                    {profile?.name}
                  </span>
                )}
              </div>

              <span
                className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{ background: `${brandColor}15`, color: brandColor }}
              >
                <Shield className="w-3 h-3" />
                Distribuidor verificado
              </span>

              <h1
                className="mt-3 text-[34px] sm:text-[48px] lg:text-[56px] font-black leading-[1.02] tracking-tight"
                style={{
                  background: `linear-gradient(135deg,#0A183A,${brandColor})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {profile?.name ?? "Distribuidor"}
              </h1>

              <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                {profile?.descripcion?.trim()
                  ? profile.descripcion
                  : `Compra llantas con ${profile?.name ?? "este distribuidor"} en TirePro Marketplace. Asesoría directa, pago seguro y entrega coordinada.`}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {profile?.ciudad && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#0A183A] font-bold">
                    <MapPin className="w-3.5 h-3.5" style={{ color: brandColor }} />
                    {profile.ciudad}
                  </span>
                )}
                {profile?._count.listings != null && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#0A183A] font-bold">
                      <Package className="w-3.5 h-3.5" style={{ color: brandColor }} />
                      {profile._count.listings} productos
                    </span>
                  </>
                )}
                {entrega && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#0A183A] font-bold">
                      <Truck className="w-3.5 h-3.5" style={{ color: brandColor }} />
                      {entrega === "domicilio" ? "Entrega a domicilio" : entrega === "recogida" ? "Solo recogida" : "Domicilio y recogida"}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-7">
                <a
                  href="#catalogo-distribuidor"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98]"
                  style={{
                    background: brandColor,
                    boxShadow: `0 14px 28px -10px ${brandColor}80`,
                  }}
                >
                  Ver catálogo
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

              {/* Coverage chips — under CTAs so they read as
                  reassurance, not header noise. */}
              {cobertura.length > 0 && (
                <div className="mt-6 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cobertura</span>
                  {cobertura.slice(0, 6).map((c: any, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                      style={{ background: `${brandColor}10`, color: brandColor, border: `1px solid ${brandColor}25` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: brandColor }} />
                      {c.ciudad ?? c}
                    </span>
                  ))}
                  {cobertura.length > 6 && (
                    <span className="text-[10px] text-gray-400 font-bold">+{cobertura.length - 6} más</span>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — visual lockup. The dist's banner is the backdrop
                for a centered logo card so their identity dominates
                the right side without us repeating the logo twice. */}
            <div className="lg:col-span-5">
              <div
                className="relative rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[5/4] lg:aspect-square"
                style={{
                  background: profile?.bannerImage
                    ? `url(${profile.bannerImage}) center/cover no-repeat`
                    : `radial-gradient(circle at 30% 20%, ${brandColor}26, ${brandColor}05 65%, white)`,
                  boxShadow: `0 30px 60px -24px ${brandColor}55, 0 0 0 1px ${brandColor}1a`,
                }}
              >
                {profile?.bannerImage && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${brandColor}40 0%, rgba(10,24,58,0.10) 60%, rgba(255,255,255,0.0) 100%)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div
                    className="bg-white rounded-2xl flex items-center justify-center p-6 sm:p-8 max-w-[68%] aspect-[3/2]"
                    style={{ boxShadow: "0 20px 50px -16px rgba(10,24,58,0.35)" }}
                  >
                    {profile?.profileImage && !profile.profileImage.includes("logoFull.png") ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Store className="w-16 h-16 text-gray-300" />
                    )}
                  </div>
                </div>
                {/* "Sponsored by TirePro" subtle ribbon — reinforces
                    co-brand without competing with the dist's logo. */}
                <div
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase backdrop-blur"
                  style={{ background: "rgba(255,255,255,0.92)", color: "#0A183A", boxShadow: "0 4px 10px rgba(10,24,58,0.15)" }}
                >
                  <span className="opacity-70">en</span>
                  <Image src="/logo_full.png" alt="TirePro" width={52} height={12} className="h-3 w-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* PROMO HERO — distributor-pinned banner + featured product,
          edited from /dashboard/marketplace/perfil. Layout adapts to
          which slots are populated:
            - banner only           → full-width banner
            - banner + pinned listing → 2/3 + 1/3 on desktop, stacked on mobile
            - pinned listing only   → narrow featured-product card centered
          The banner's optional click-through routes via <Link> for
          internal /marketplace/... URLs and target=_blank for external. */}
      {(profile?.promoBannerImage || profile?.pinnedListing) && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          {/* Flex (not grid) — Tailwind's JIT scanner doesn't always
              extract arbitrary `md:grid-cols-[…]` from a template
              literal, which is why the columns kept collapsing to a
              single stack on desktop. flex-row + numeric basis classes
              are statically extractable and behave the same. */}
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            {profile.promoBannerImage && (() => {
              const href      = profile.promoBannerHref?.trim() || null;
              const isInternal= !!href && href.startsWith("/");
              const isExternal= !!href && /^https?:\/\//i.test(href);
              // Banner takes the bigger slot on desktop. min-w-0 lets
              // the inner aspect-ratio computation use the actual
              // basis width instead of the inflated content width.
              // basis-4/5 + no flex-1 → banner stays at ~80%, leaving
              // the pin at ~20%. flex-1 sets basis:0 which would
              // override the fraction, so we drop it here.
              const slotCls = profile.pinnedListing
                ? "w-full md:basis-4/5 min-w-0"
                : "w-full";
              const inner = (
                <div
                  className="relative w-full overflow-hidden rounded-2xl h-full"
                  style={{
                    // Cinematic 32:9 — keeps the banner visually
                    // present without dominating the page, and lines
                    // the row up to a height the featured-product
                    // card can match on large screens (~250px on a
                    // 1400px viewport) without going huge.
                    aspectRatio: "32 / 9",
                    border: "1px solid rgba(10,24,58,0.08)",
                    boxShadow: `0 18px 36px -16px ${brandColor}40`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.promoBannerImage}
                    alt={profile.promoBannerTitle ?? `${profile.name} — promoción`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {(profile.promoBannerTitle || profile.promoBannerSubtitle) && (
                    <div
                      className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 text-white"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 60%)" }}
                    >
                      {profile.promoBannerTitle && (
                        <p className="text-lg sm:text-2xl lg:text-3xl font-black leading-tight drop-shadow">
                          {profile.promoBannerTitle}
                        </p>
                      )}
                      {profile.promoBannerSubtitle && (
                        <p className="text-xs sm:text-sm font-medium opacity-90 mt-1 drop-shadow">
                          {profile.promoBannerSubtitle}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
              if (isInternal) return <Link href={href!} className={`block ${slotCls}`}>{inner}</Link>;
              if (isExternal) return <a href={href!} target="_blank" rel="noopener noreferrer" className={`block ${slotCls}`}>{inner}</a>;
              return <div className={slotCls}>{inner}</div>;
            })()}

            {profile.pinnedListing && (() => {
              const l = profile.pinnedListing;
              const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
              const cover = imgs.length > 0 ? (imgs[l.coverIndex ?? 0] ?? imgs[0]) : null;
              const promoActive = l.precioPromo != null && l.promoHasta != null && new Date(l.promoHasta).getTime() > Date.now();
              const price = promoActive ? l.precioPromo! : l.precioCop;
              const promoPct = promoActive
                ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100)
                : 0;
              const pinSlotCls = profile.promoBannerImage
                ? "w-full md:basis-1/5 min-w-0"
                : "w-full max-w-md mx-auto";
              return (
                <div className={pinSlotCls}>
                  <Link
                    href={productHref(l)}
                    className="group relative flex flex-col rounded-2xl bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      border: "1px solid rgba(10,24,58,0.08)",
                      boxShadow: `0 18px 36px -16px ${brandColor}40`,
                    }}
                  >
                    {/* Tiny label strip */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: brandColor }}
                      >
                        Destacado
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0A183A] transition-colors" />
                    </div>

                    {/* Compact horizontal body — image tile is a fixed
                        88×88 square so the card's natural height stays
                        small (~140px) and never balloons regardless of
                        column width. */}
                    <div className="flex items-center gap-3 px-4 pb-4">
                      <div
                        className="rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{
                          width: 88,
                          height: 88,
                          background: `radial-gradient(circle at 30% 20%, ${brandColor}14, ${brandColor}04 70%)`,
                        }}
                      >
                        {cover ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={cover}
                            alt={`${l.marca} ${l.modelo}`}
                            className="max-w-full max-h-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: brandColor }}>
                          {l.marca}
                        </p>
                        <p className="text-sm font-black text-[#0A183A] leading-tight mt-0.5 truncate">
                          {l.modelo}
                        </p>
                        <p className="text-[13px] font-black tabular-nums tracking-tight mt-1 leading-none truncate" style={{ color: brandColor }}>{l.dimension}</p>
                        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                          <span
                            className="text-base font-black tabular-nums"
                            style={{ color: brandColor }}
                          >
                            {fmtCOP(price)}
                          </span>
                          {promoActive && (
                            <span className="text-[10px] text-gray-400 line-through tabular-nums">
                              {fmtCOP(l.precioCop)}
                            </span>
                          )}
                          {promoActive && promoPct > 0 && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-white bg-emerald-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              −{promoPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* WHY BUY — value-prop cards moved up to right under the
          promo hero so trust signals show before the user has to
          scroll past the whole catalog. Reads: identity → promo →
          reasons to trust → brands → catalog → map → B2B → SEO. */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
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

      {/* BRANDS CAROUSEL — logos pulled from BrandInfo so the dist's
          storefront matches the global marketplace styling. Clicking a
          tile filters the catalog by that marca; clicking the active
          tile clears the filter. Falls back to a monogram badge for
          brands without a registered logo. */}
      {stockedBrands.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <section aria-labelledby="dist-brands">
            <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: brandColor }}>
                  Filtra por marca
                </p>
                <h2 id="dist-brands" className="text-lg sm:text-xl font-black text-[#0A183A]">
                  Marcas que vende {profile?.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {marcaFilter && (
                  <button
                    onClick={() => setMarcaFilter("")}
                    className="text-[10px] font-black hover:underline"
                    style={{ color: brandColor }}
                  >
                    Limpiar marca
                  </button>
                )}
                {/* Desktop scroll arrows — hidden on touch where the strip
                    scrolls naturally. */}
                <div className="hidden sm:flex gap-1.5">
                  <button
                    onClick={() => scrollBrandsBy(-360)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
                    style={{ border: "1px solid rgba(10,24,58,0.10)" }}
                    aria-label="Marcas anteriores"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#0A183A]" />
                  </button>
                  <button
                    onClick={() => scrollBrandsBy(360)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
                    style={{ border: "1px solid rgba(10,24,58,0.10)" }}
                    aria-label="Marcas siguientes"
                  >
                    <ChevronRight className="w-4 h-4 text-[#0A183A]" />
                  </button>
                </div>
              </div>
            </div>
            <div
              ref={brandsCarouselRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {stockedBrands.map((b) => {
                const active = marcaFilter === b;
                const meta = brandsMap.get(b.toLowerCase().trim());
                const logo = meta?.logoUrl ?? null;
                // Prefer the canonical name from BrandInfo when available
                // — that's the version the brand-detail page already
                // uses, and it normalises any remaining casing drift.
                const display = meta?.name ?? b;
                const initial = (display.trim()[0] ?? "?").toUpperCase();
                return (
                  <button
                    key={b}
                    onClick={() => {
                      setMarcaFilter(active ? "" : b);
                      if (typeof window !== "undefined") {
                        setTimeout(() => {
                          document.getElementById("catalogo-distribuidor")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 80);
                      }
                    }}
                    className="group flex-shrink-0 flex flex-col items-center justify-between rounded-2xl bg-white transition-all overflow-hidden"
                    style={{
                      width: 148,
                      height: 132,
                      padding: "12px",
                      scrollSnapAlign: "start",
                      border: active
                        ? `2px solid ${brandColor}`
                        : "1px solid rgba(10,24,58,0.08)",
                      boxShadow: active
                        ? `0 14px 28px -12px ${brandColor}90`
                        : "0 1px 2px rgba(10,24,58,0.04)",
                      transform: active ? "translateY(-2px)" : "none",
                    }}
                  >
                    {/* Fixed-size logo box keeps every card visually
                        balanced regardless of the source logo's aspect
                        ratio. object-contain + center positioning means
                        wide marks (Continental) and square ones
                        (Pirelli) both sit on the same baseline. */}
                    <div
                      className="w-full flex items-center justify-center"
                      style={{ height: 72 }}
                    >
                      {logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={logo}
                          alt={`${display} logo`}
                          loading="lazy"
                          className="transition-transform group-hover:scale-105"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            objectPosition: "center",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl"
                          style={{
                            background: `linear-gradient(135deg, ${brandColor}1a, ${brandColor}33)`,
                            color: brandColor,
                          }}
                        >
                          {initial}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-black tracking-wide truncate w-full text-center"
                      style={{ color: active ? brandColor : "#0A183A" }}
                    >
                      {display}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* CATALOG — sidebar + grid layout, modeled on the global
          marketplace search but scoped to this distributor's listings.
          Sidebar is sticky on lg+ and slides in from the left as a
          drawer on mobile. */}
      <div id="catalogo-distribuidor" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10 scroll-mt-20">
        {/* Section header */}
        <div className="flex items-end justify-between mb-4 gap-3">
          <div>
            <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Catálogo</p>
            <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">Productos del distribuidor</h2>
          </div>
          <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
            {total} producto{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Sidebar (left) + content column (right). Using flex with
            explicit widths instead of `grid-cols-[240px_minmax(0,1fr)]`
            because Tailwind's JIT was inconsistent extracting that
            arbitrary value at build time — when the class didn't
            compile, the grid collapsed to one column and the sidebar
            stacked on top of the products. Flex utilities are
            extracted reliably and produce identical visuals.

            `sticky top-16` (MarketplaceNav's h-16) + the inner
            `max-h-[calc(100vh-5rem)] overflow-y-auto` keeps the
            sidebar from spilling past the viewport when filter
            lists are long. */}
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
          {/* SIDEBAR — desktop only. Mobile uses the drawer below. */}
          <aside
            className="hidden lg:block flex-shrink-0 w-60 self-start sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-2xl p-4"
            style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18)", border: "1px solid rgba(10,24,58,0.05)" }}
          >
            <FilterPanel
              brandColor={brandColor}
              tipo={tipo} setTipo={setTipo}
              eje={eje} setEje={setEje}
              dimension={dimension} setDimension={setDimension}
              dimensions={stockedDimensions}
              marcaFilter={marcaFilter} setMarcaFilter={setMarcaFilter}
              brands={stockedBrands}
              useCase={useCase} setUseCase={setUseCase}
              useCases={USE_CASES}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
              onClearAll={() => {
                setMarcaFilter(""); setUseCase(""); setTipo(""); setEje("");
                setDimension(""); setMaxPrice("");
              }}
            />
          </aside>

          {/* RIGHT — search · sort · filter chips · grid · pagination.
              `flex-1 min-w-0 w-full` is the flex equivalent of the
              earlier `minmax(0, 1fr)` track — fills remaining space
              without overflowing the parent on narrow viewports. */}
          <div className="flex-1 min-w-0 w-full">
            {/* Search bar — sits inside the right column so it aligns
                with the grid (was full-width and overran the sidebar). */}
            <div
              className="flex items-center gap-2 p-2 rounded-2xl bg-white mb-3"
              style={{ boxShadow: "0 8px 24px -12px rgba(10,24,58,0.15), 0 0 0 1px rgba(30,118,182,0.08)" }}
            >
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-4 h-4 text-[#1E76B6] flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en este catálogo…"
                  className="flex-1 bg-transparent outline-none text-sm text-[#0A183A] placeholder-gray-400 py-2.5"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Limpiar búsqueda">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile filters trigger + sort row */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-black bg-white text-[#0A183A]"
                style={{ border: `1px solid ${brandColor}33`, boxShadow: "0 6px 14px -8px rgba(10,24,58,0.18)" }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: brandColor }} />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: brandColor }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="ml-auto px-3 py-2 rounded-full text-[11px] font-medium border border-gray-200 bg-white text-[#0A183A] flex-shrink-0"
              >
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="newest">Más recientes</option>
                <option value="relevance">Relevancia</option>
              </select>
            </div>

            {/* Active-filter chips (each clears its own filter) */}
            {activeChips.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Filtros:</span>
                {activeChips.map((f) => (
                  <button
                    key={f.key}
                    onClick={f.clear}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white hover:opacity-90"
                    style={{ background: brandColor }}
                  >
                    {f.label}
                    <X className="w-2.5 h-2.5" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMarcaFilter(""); setUseCase(""); setTipo(""); setEje("");
                    setDimension(""); setMaxPrice("");
                  }}
                  className="text-[10px] font-black hover:underline ml-1"
                  style={{ color: brandColor }}
                >
                  Limpiar todos
                </button>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center py-20 bg-white rounded-2xl">
                <Package className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm font-bold text-[#0A183A]">Sin productos</p>
                <p className="text-xs text-gray-400 mt-1">No hay resultados con estos filtros.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {listings.map((l) => {
                    const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                    const coverImg = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
                    const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                    const price = hasPromo ? l.precioPromo! : l.precioCop;
                    const discount = hasPromo ? Math.round(((l.precioCop - l.precioPromo!) / l.precioCop) * 100) : 0;

                    return (
                      <Link
                        key={l.id}
                        href={productHref(l)}
                        className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group block border border-gray-100"
                      >
                        <div
                          className="relative aspect-square flex items-center justify-center overflow-hidden"
                          style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}
                        >
                          {coverImg ? (
                            <Image src={coverImg} alt={`${l.marca} ${l.modelo}`} fill sizes="(max-width: 640px) 100vw, 33vw" style={{ objectFit: "contain", padding: "1.25rem" }} className="group-hover:scale-105 transition-transform duration-500" />
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
                          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: brandColor }}>{l.marca}</p>
                          <p className="text-sm font-black text-[#0A183A] leading-snug truncate mt-0.5">{l.modelo}</p>
                          <p className="text-[13px] font-black tabular-nums tracking-tight mt-1 leading-none" style={{ color: brandColor }}>{l.dimension}</p>
                          {/* Price always sits on its own row above the
                              CTAs so they never collide on tight cards.
                              Two buttons: icon-only Agregar + Comprar ya
                              pill, side by side. */}
                          <div className="mt-2 min-w-0">
                            <span className="text-lg font-black text-[#0A183A] tabular-nums">{fmtCOP(price)}</span>
                            {hasPromo && <span className="text-[10px] text-gray-400 line-through ml-1.5 tabular-nums">{fmtCOP(l.precioCop)}</span>}
                          </div>
                          <div className="mt-2 flex items-stretch gap-1.5">
                            <AddToCartButton
                              listing={l as any}
                              variant="icon"
                              accent={brandColor}
                            />
                            <AddToCartButton
                              listing={l as any}
                              variant="compact"
                              accent={brandColor}
                              className="flex-1 justify-center"
                            />
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
          </div>
        </div>
      </div>

      {/* Mobile filter drawer — slides up from the bottom on phones
          (matches iOS share-sheet language better than a side drawer
          for one-thumb use). Always full-height of viewport so long
          filter lists don't fight the on-screen keyboard. The
          backdrop dim-fades and the panel translates in via CSS
          transitions instead of mounting/unmounting the panel —
          keeps the open animation smooth on low-end Android. */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-200 ${filtersOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!filtersOpen}
      >
        <button
          aria-label="Cerrar filtros"
          onClick={() => setFiltersOpen(false)}
          className="absolute inset-0 bg-black/45"
          tabIndex={-1}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
          className={`absolute inset-x-0 bottom-0 bg-white rounded-t-3xl flex flex-col transition-transform duration-250 ease-out ${filtersOpen ? "translate-y-0" : "translate-y-full"}`}
          style={{ height: "92vh", boxShadow: "0 -20px 50px -20px rgba(10,24,58,0.4)" }}
        >
          {/* Drag handle */}
          <div className="pt-2 pb-1 flex justify-center flex-shrink-0">
            <span className="block w-10 h-1.5 rounded-full bg-gray-200" />
          </div>
          <div className="px-5 pt-1 pb-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: brandColor }}>Filtros</p>
              <p className="text-sm font-black text-[#0A183A]">Refinar búsqueda</p>
            </div>
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100"
              aria-label="Cerrar filtros"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <FilterPanel
              brandColor={brandColor}
              tipo={tipo} setTipo={setTipo}
              eje={eje} setEje={setEje}
              dimension={dimension} setDimension={setDimension}
              dimensions={stockedDimensions}
              marcaFilter={marcaFilter} setMarcaFilter={setMarcaFilter}
              brands={stockedBrands}
              useCase={useCase} setUseCase={setUseCase}
              useCases={USE_CASES}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
              onClearAll={() => {
                setMarcaFilter(""); setUseCase(""); setTipo(""); setEje("");
                setDimension(""); setMaxPrice("");
              }}
            />
          </div>
          <div
            className="px-5 py-3 flex-shrink-0 bg-white border-t border-gray-100"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full py-3.5 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-transform"
              style={{
                background: brandColor,
                boxShadow: `0 12px 24px -8px ${brandColor}80`,
              }}
            >
              Ver {total} producto{total !== 1 ? "s" : ""}
            </button>
          </div>
        </aside>
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

    </div>
  );
}

// FilterPanel — the body of the sidebar on desktop and the drawer
// on mobile. Pure presentational: every piece of state lives in
// the parent so the desktop and mobile copies stay in sync without
// any shared store gymnastics.
function FilterPanel({
  brandColor,
  tipo, setTipo,
  eje, setEje,
  dimension, setDimension,
  dimensions,
  marcaFilter, setMarcaFilter,
  brands,
  useCase, setUseCase,
  useCases,
  maxPrice, setMaxPrice,
  onClearAll,
}: {
  brandColor: string;
  tipo: string; setTipo: (v: string) => void;
  eje: string;  setEje:  (v: string) => void;
  dimension: string; setDimension: (v: string) => void;
  dimensions: string[];
  marcaFilter: string; setMarcaFilter: (v: string) => void;
  brands: string[];
  useCase: any; setUseCase: (v: any) => void;
  useCases: Array<{ key: any; label: string; rims?: number[] }>;
  maxPrice: string; setMaxPrice: (v: string) => void;
  onClearAll: () => void;
}) {
  const anyActive = !!(tipo || eje || dimension || marcaFilter || useCase || maxPrice);
  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: brandColor }}>
          Refinar
        </p>
        {anyActive && (
          <button onClick={onClearAll} className="text-[10px] font-black hover:underline" style={{ color: brandColor }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Use case */}
      <FilterGroup title="Tipo de vehículo">
        <div className="flex flex-wrap gap-1.5">
          {useCases.map((u) => {
            const active = useCase === u.key;
            return (
              <button
                key={u.key || "all"}
                onClick={() => setUseCase(u.key)}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-black transition-all"
                style={{
                  background: active ? brandColor : "white",
                  color: active ? "white" : "#0A183A",
                  border: active ? "1px solid transparent" : "1px solid rgba(10,24,58,0.10)",
                  boxShadow: active ? `0 4px 12px -4px ${brandColor}80` : "none",
                }}
              >
                {u.label}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      {/* Tipo */}
      <FilterGroup title="Tipo">
        <div className="space-y-1.5">
          {[{ v: "", l: "Todas" }, { v: "nueva", l: "Nuevas" }, { v: "reencauche", l: "Reencauche" }].map((t) => (
            <FilterRadio
              key={t.v}
              label={t.l}
              checked={tipo === t.v}
              onChange={() => setTipo(t.v)}
              brandColor={brandColor}
            />
          ))}
        </div>
      </FilterGroup>

      {/* Eje */}
      <FilterGroup title="Eje">
        <div className="space-y-1.5">
          {[
            { v: "", l: "Cualquiera" },
            { v: "direccion", l: "Dirección" },
            { v: "traccion", l: "Tracción" },
            { v: "libre", l: "Libre / multi" },
            { v: "remolque", l: "Remolque" },
          ].map((e) => (
            <FilterRadio
              key={e.v}
              label={e.l}
              checked={eje === e.v}
              onChange={() => setEje(e.v)}
              brandColor={brandColor}
            />
          ))}
        </div>
      </FilterGroup>

      {/* Marca */}
      {brands.length > 0 && (
        <FilterGroup title="Marca">
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 -mr-1">
            <FilterRadio
              label="Todas"
              checked={!marcaFilter}
              onChange={() => setMarcaFilter("")}
              brandColor={brandColor}
            />
            {brands.map((b) => (
              <FilterRadio
                key={b}
                label={b}
                checked={marcaFilter === b}
                onChange={() => setMarcaFilter(b)}
                brandColor={brandColor}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {/* Medida */}
      {dimensions.length > 0 && (
        <FilterGroup title="Medida">
          <div className="flex flex-wrap gap-1.5">
            {dimension && (
              <button
                onClick={() => setDimension("")}
                className="px-2 py-1 rounded-full text-[10px] font-black bg-white text-[#0A183A] hover:bg-gray-50"
                style={{ border: "1px solid rgba(10,24,58,0.10)" }}
              >
                Limpiar
              </button>
            )}
            {dimensions.map((d) => {
              const active = dimension === d;
              return (
                <button
                  key={d}
                  onClick={() => setDimension(active ? "" : d)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all font-mono"
                  style={{
                    background: active ? brandColor : "white",
                    color: active ? "white" : "#0A183A",
                    border: active ? "1px solid transparent" : "1px solid rgba(10,24,58,0.10)",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Max price */}
      <FilterGroup title="Precio máximo">
        <DistMaxPriceInput value={maxPrice} onChange={setMaxPrice} brandColor={brandColor} />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{title}</p>
      {children}
    </div>
  );
}

function FilterRadio({
  label, checked, onChange, brandColor,
}: { label: string; checked: boolean; onChange: () => void; brandColor: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-2 w-full text-left text-[12px] font-medium hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
      style={{ color: checked ? brandColor : "#0A183A" }}
    >
      <span
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          border: `1.5px solid ${checked ? brandColor : "rgba(10,24,58,0.25)"}`,
          background: "white",
        }}
      >
        {checked && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: brandColor }} />
        )}
      </span>
      <span className={checked ? "font-black" : ""}>{label}</span>
    </button>
  );
}

// Mirrors MarketplaceClient's MaxPriceInput shape so the dist storefront's
// filter strip lines up visually with the global search. Local copy keeps
// the storefront component free of cross-page imports.
function DistMaxPriceInput({
  value,
  onChange,
  brandColor,
}: {
  value: string;
  onChange: (v: string) => void;
  brandColor: string;
}) {
  const digits = value.replace(/\D/g, "");
  const display = digits ? Number(digits).toLocaleString("es-CO") : "";
  return (
    <div className="relative w-full">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder="Precio máx."
        className="pl-6 pr-7 py-2 rounded-lg text-[11px] bg-white text-[#0A183A] w-full placeholder-gray-400"
        style={{ border: `1px solid ${digits ? `${brandColor}55` : "rgba(10,24,58,0.10)"}` }}
      />
      {digits && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"
          aria-label="Limpiar precio máximo"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
