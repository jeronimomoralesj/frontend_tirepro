"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShoppingCart, Loader2, Package, Truck, MapPin, Phone,
  Mail, Globe, Star, Clock, CheckCircle, Shield, Recycle, ChevronLeft,
  ChevronRight, ChevronDown, Minus, Plus, X, Check, Search, Zap, Info,
  Weight, Scale, Gauge,
} from "lucide-react";
import { useCart } from "../../../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";
import { trackProductView, trackAddToCart, trackReviewSubmit, trackProductDwell } from "../../../../lib/marketplaceAnalytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface Review { id: string; rating: number; comment: string | null; createdAt: string; user: { name: string } }

interface Product {
  id: string; marca: string; modelo: string; dimension: string; eje: string | null;
  tipo: string; precioCop: number; precioPromo: number | null; promoHasta: string | null;
  incluyeIva: boolean; cantidadDisponible: number; tiempoEntrega: string | null;
  descripcion: string | null; imageUrls: string[] | null; coverIndex: number;
  distributor: { id: string; slug?: string | null; name: string; profileImage: string; ciudad: string | null; telefono: string | null; emailAtencion: string | null; tipoEntrega: string | null; cobertura: any[] | null };
  catalog: {
    id?: string; skuRef?: string;
    terreno: string | null; reencauchable: boolean;
    kmEstimadosReales: number | null; kmEstimadosFabrica?: number | null;
    cpkEstimado: number | null; crowdAvgCpk: number | null;
    psiRecomendado: number | null; rtdMm: number | null;
    indiceCarga?: string | null; indiceVelocidad?: string | null;
    vidasReencauche?: number | null;
    anchoMm?: number | null; perfil?: string | null; rin?: string | null;
    posicion?: string | null; ejeTirePro?: string | null; pesoKg?: number | null;
    pctPavimento?: number | null; pctDestapado?: number | null;
    segmento?: string | null; tipo?: string | null; construccion?: string | null;
    notasColombia?: string | null; fuente?: string | null;
    crowdAvgPrice?: number | null; crowdAvgKm?: number | null;
    crowdConfidence?: number | null; crowdCompanyCount?: number | null;
  } | null;
  reviews: Review[];
  _count: { reviews: number };
  totalSold?: number;
}

interface BrandInfo {
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  tier: "premium" | "mid" | "value" | null;
  foundedYear: number | null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "francia": "🇫🇷", "france": "🇫🇷",
  "italia": "🇮🇹", "italy": "🇮🇹",
  "alemania": "🇩🇪", "germany": "🇩🇪",
  "estados unidos": "🇺🇸", "united states": "🇺🇸", "usa": "🇺🇸",
  "japón": "🇯🇵", "japon": "🇯🇵", "japan": "🇯🇵",
  "corea del sur": "🇰🇷", "south korea": "🇰🇷", "korea": "🇰🇷",
  "china": "🇨🇳", "taiwán": "🇹🇼", "taiwan": "🇹🇼",
  "españa": "🇪🇸", "spain": "🇪🇸",
  "reino unido": "🇬🇧", "united kingdom": "🇬🇧", "uk": "🇬🇧",
  "india": "🇮🇳", "brasil": "🇧🇷", "brazil": "🇧🇷",
  "argentina": "🇦🇷", "colombia": "🇨🇴", "méxico": "🇲🇽", "mexico": "🇲🇽",
  "canadá": "🇨🇦", "canada": "🇨🇦", "rusia": "🇷🇺", "russia": "🇷🇺",
  "tailandia": "🇹🇭", "thailand": "🇹🇭",
  "vietnam": "🇻🇳", "indonesia": "🇮🇩",
};

function brandFlag(country: string | null | undefined): string {
  if (!country) return "";
  const k = country.toLowerCase().replace(/\([^)]*\)/g, "").trim();
  for (const [name, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (k.includes(name)) return flag;
  }
  return "";
}

const BRAND_TIER_META: Record<string, { label: string; bg: string }> = {
  premium: { label: "Premium",    bg: "linear-gradient(135deg,#f59e0b,#fbbf24)" },
  mid:     { label: "Intermedia", bg: "linear-gradient(135deg,#1E76B6,#348CCB)" },
  value:   { label: "Económica",  bg: "linear-gradient(135deg,#64748b,#94a3b8)" },
};

// Load index → kg per single tire. ISO 4000-series curve: kg ≈ 45 × 1.0307^LI.
// Accurate within ~2% across the truck range (LI 100–180) which is all that
// matters for the fleet insight — we only surface it as "approximately Xkg".
function parseLoadIndex(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2,3})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 50 && n <= 220 ? n : null;
}
function loadIndexToKg(li: number): number {
  return Math.round(45 * Math.pow(1.0307, li));
}

export default function ProductClient({
  initialProduct,
  brandInfo,
}: {
  initialProduct?: Product | null;
  brandInfo?: BrandInfo | null;
}) {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [loading, setLoading] = useState(!initialProduct);
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [similar, setSimilar] = useState<any[]>([]);
  const [promoListings, setPromoListings] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  // Notas TirePro collapsible
  const [notasOpen, setNotasOpen] = useState(false);
  // Distributor description "Ver más / menos" toggle. Long copy (Hankook
  // RA33 etc.) used to push the buy box far down on mobile.
  const [descExpanded, setDescExpanded] = useState(false);
  // Per-placa analysis
  const [vrPlaca, setVrPlaca] = useState("");
  const [vrLoading, setVrLoading] = useState(false);
  const [vrResult, setVrResult] = useState<{
    verdict: "perfect" | "compatible" | "incompatible" | "empty";
    headline: string;
    matches: Array<{ posicion: number; eje: string; reason: string; severity: "urgent" | "soon" | "ok" | "empty" }>;
    incompatible: Array<{ posicion: number; reason: string }>;
    summary: string;
    insights: Array<{ kind: "load" | "cpk" | "reencauche" | "vehicle"; ok: boolean | null; title: string; detail: string }>;
    vehicleLabel?: string | null;
  } | null>(null);
  const [vrError, setVrError] = useState("");
  const [isProUser, setIsProUser] = useState(false);
  const cart = useCart();

  // Check if user belongs to a pro company
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (user.companyId && user.userPlan && user.userPlan !== "distribuidor") {
        setIsProUser(true);
      }
    } catch { /* */ }
  }, []);

  const [fetchFailed, setFetchFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!id || initialProduct) return;
    let cancelled = false;
    setLoading(true);
    setFetchFailed(false);

    async function load() {
      const url = `${API_BASE}/marketplace/product/${id}`;
      // Try up to 2 times — first hit, then a single retry after a short
      // delay if the first attempt failed (covers transient backend / RDS
      // pool blips). A definitive 404 stops the loop without flagging
      // a fetch failure (that's a real "not found", not a connectivity
      // issue, so the user shouldn't see the Reintentar button).
      let is404 = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (r.ok) {
            const d = await r.json();
            if (!cancelled) {
              setProduct(d);
              if (d) setSelectedImg(d.coverIndex ?? 0);
              setLoading(false);
            }
            return;
          }
          if (r.status === 404) { is404 = true; break; }
        } catch { /* network error, fall through to retry */ }
        if (attempt === 0) await new Promise((res) => setTimeout(res, 700));
      }
      if (!cancelled) {
        setFetchFailed(!is404);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, initialProduct, retryNonce]);

  // Track product view + dwell time
  useEffect(() => {
    if (!product) return;
    trackProductView({
      id: product.id, marca: product.marca, modelo: product.modelo,
      dimension: product.dimension, precioCop: product.precioCop,
      tipo: product.tipo, distributorName: product.distributor.name,
    });
    const start = Date.now();
    return () => { trackProductDwell(product.id, (Date.now() - start) / 1000); };
  }, [product?.id]);

  // Fetch similar products + promo listings from same distributor
  useEffect(() => {
    if (!product) return;
    fetch(`${API_BASE}/marketplace/listings?dimension=${encodeURIComponent(product.dimension)}&limit=5&sortBy=price_asc`)
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((d) => setSimilar((d.listings ?? []).filter((l: any) => l.id !== product.id).slice(0, 4)))
      .catch(() => {});
    // Fetch promo listings from same distributor
    fetch(`${API_BASE}/marketplace/listings?distributorId=${product.distributor.id}&limit=10&sortBy=price_asc`)
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((d) => setPromoListings(
        (d.listings ?? []).filter((l: any) => l.id !== product.id && l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date()).slice(0, 4)
      ))
      .catch(() => {});
  }, [product]);

  function handleAddToCart() {
    if (!product) return;
    const imgs = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    cart.addItem({
      listingId: product.id,
      marca: product.marca,
      modelo: product.modelo,
      dimension: product.dimension,
      precioCop: product.precioCop,
      precioPromo: product.precioPromo,
      promoHasta: product.promoHasta,
      tipo: product.tipo,
      imageUrl: imgs.length > 0 ? imgs[product.coverIndex ?? 0] ?? imgs[0] : null,
      distributorId: product.distributor.id,
      distributorName: product.distributor.name,
    }, qty);
    trackAddToCart({
      id: product.id, marca: product.marca, modelo: product.modelo,
      dimension: product.dimension, precioCop: product.precioCop,
      tipo: product.tipo, distributorName: product.distributor.name, quantity: qty,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center px-6">
      <Package className="w-12 h-12 text-gray-300 mb-3" />
      <p className="text-lg font-bold text-[#0A183A]">
        {fetchFailed ? "No pudimos cargar el producto" : "Producto no encontrado"}
      </p>
      {fetchFailed && (
        <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">
          Hubo un problema al consultar el servidor. Vuelve a intentarlo en unos segundos.
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {fetchFailed && (
          <button
            onClick={() => setRetryNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-[#1E76B6] hover:bg-[#0A183A] transition-colors"
          >
            Reintentar
          </button>
        )}
        <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm font-bold text-[#1E76B6] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Volver al marketplace
        </Link>
      </div>
    </div>
  );

  const imgs = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const hasPromo = product.precioPromo != null && product.promoHasta && new Date(product.promoHasta) > new Date();
  const price = hasPromo ? product.precioPromo! : product.precioCop;

  const discount = hasPromo ? Math.round(((product.precioCop - product.precioPromo!) / product.precioCop) * 100) : 0;
  // CPK = price / estimated km (this tire's actual projected cost per km)
  const kmEstimados = product.catalog?.kmEstimadosReales ?? 0;
  const cpk = kmEstimados > 0 ? price / kmEstimados : null;
  const avgRating = product.reviews.length > 0 ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : 0;
  const cobertura = Array.isArray(product.distributor.cobertura) ? product.distributor.cobertura : [];

  return (
    <div className="min-h-screen bg-white">
      <MarketplaceNav />

      {/* Added to cart notification */}
      {addedToCart && (
        <div className="fixed top-20 right-4 z-50 bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3" style={{ border: "1px solid rgba(30,118,182,0.15)" }}>
          <div className="w-9 h-9 rounded-full bg-[#1E76B6]/10 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-[#1E76B6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0A183A]">Agregado al carrito</p>
            <Link href="/marketplace/cart" className="text-[11px] font-medium text-[#1E76B6] hover:underline">Ver carrito ({cart.count})</Link>
          </div>
        </div>
      )}

      {/* HEADER — minimal nav strip with TirePro blue accents.
          - Thin brand-gradient bar at the very top anchors the page
            with the TirePro identity (replaces the old heavy navy
            banner without eating vertical space).
          - Header background a faint brand tint instead of pure white
            so the page doesn't feel sterile.
          - Bottom border in brand blue at low alpha. */}
      <div
        className="h-1"
        style={{ background: "linear-gradient(90deg,#0A183A 0%,#1E76B6 50%,#348CCB 100%)" }}
        aria-hidden
      />
      <div
        style={{
          background: "linear-gradient(180deg, rgba(30,118,182,0.05), rgba(30,118,182,0))",
          borderBottom: "1px solid rgba(30,118,182,0.15)",
        }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1E76B6] hover:text-[#0A183A] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volver al marketplace</span>
            <span className="sm:hidden">Volver</span>
          </Link>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0"
          >
            <Link href="/marketplace" className="hover:text-[#1E76B6] transition-colors hidden sm:inline">
              Marketplace
            </Link>
            <span className="text-[#1E76B6]/40 hidden sm:inline">/</span>
            <Link
              href={`/marketplace/distributor/${product.distributor.slug ?? product.distributor.id}`}
              className="hover:text-[#1E76B6] transition-colors truncate max-w-[120px] sm:max-w-[180px]"
            >
              {product.distributor.name}
            </Link>
            <span className="text-[#1E76B6]/40">/</span>
            <span className="text-[#0A183A] font-bold truncate max-w-[140px] sm:max-w-[220px]">
              {product.modelo}
            </span>
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 pb-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16">
          {/* LEFT — Images */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div
              className="relative aspect-[5/4] sm:aspect-square rounded-3xl overflow-hidden flex items-center justify-center mb-4 group max-h-[50vh] sm:max-h-none mx-auto w-full"
              style={{
                background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)",
                boxShadow: "0 20px 60px -20px rgba(10,24,58,0.25), 0 0 0 1px rgba(30,118,182,0.08)",
              }}
            >
              {hasPromo && (
                <span
                  className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 6px 18px rgba(239,68,68,0.35)" }}
                >
                  -{discount}% OFF
                </span>
              )}
              {imgs.length > 0 ? (
                <img
                  src={imgs[selectedImg] ?? imgs[0]}
                  alt={`Llanta ${product.marca} ${product.modelo} ${product.dimension}${product.tipo === "reencauche" ? " reencauche" : ""} — Comprar en Colombia | TirePro`}
                  className="w-full h-full object-contain p-10 sm:p-14 transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <Package className="w-24 h-24 text-gray-200" />
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 justify-center">
                {imgs.map((url, i) => (
                  <button key={i} onClick={() => setSelectedImg(i)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all"
                    style={{ background: "#f5f5f7", border: i === selectedImg ? "2px solid #1E76B6" : "2px solid transparent", opacity: i === selectedImg ? 1 : 0.5 }}>
                    <img src={url} alt={`${product.marca} ${product.modelo} ${product.dimension} - imagen ${i + 1}`} className="w-full h-full object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Details */}
          <div className="pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/marketplace/brand/${brandInfo?.slug ?? product.marca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")}`}
                className="inline-flex items-center gap-2 text-[11px] font-black text-[#1E76B6] tracking-widest uppercase px-3 py-1.5 rounded-full bg-white border border-[#1E76B6]/30 hover:bg-[#F0F7FF] hover:border-[#1E76B6]/50 transition-colors shadow-sm"
              >
                {brandInfo?.logoUrl && (
                  <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-white" style={{ border: "1px solid rgba(30,118,182,0.18)" }}>
                    <img src={brandInfo.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                  </span>
                )}
                {product.marca}
              </Link>
              {brandInfo?.tier && BRAND_TIER_META[brandInfo.tier] && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white"
                  style={{ background: BRAND_TIER_META[brandInfo.tier].bg, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}
                >
                  <Shield className="w-3 h-3" />
                  {BRAND_TIER_META[brandInfo.tier].label}
                </span>
              )}
              {brandInfo?.country && brandFlag(brandInfo.country) && (
                <Link
                  href={`/marketplace/brand/${brandInfo.slug}`}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0A183A] px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  title={brandInfo.country}
                >
                  <span className="text-sm leading-none">{brandFlag(brandInfo.country)}</span>
                  {brandInfo.country}
                </Link>
              )}
            </div>
            <h1 className="text-[26px] sm:text-[36px] font-black text-[#0A183A] mt-2 leading-[1.05] tracking-tight">{product.modelo}</h1>
            <p className="text-sm text-gray-500 mt-2 font-medium flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#348CCB]">
                  {product.tipo === "reencauche" ? "Ancho" : "Dimensión"}
                </span>
                <span className="font-bold text-[#0A183A]">{product.dimension}</span>
              </span>
              {product.eje && (
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#348CCB]">Eje</span>
                  <span className="font-bold text-[#0A183A] capitalize">{product.eje}</span>
                </span>
              )}
            </p>

            {/* Stars */}
            {product._count.reviews > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4" fill={s <= Math.round(avgRating) ? "#1E76B6" : "none"} style={{ color: s <= Math.round(avgRating) ? "#1E76B6" : "#d1d5db" }} />
                  ))}
                </div>
                <span className="text-[13px] text-gray-500">
                  {avgRating.toFixed(1)} ({product._count.reviews})
                  {product.totalSold != null && product.totalSold > 0 && <> · {product.totalSold} vendido{product.totalSold !== 1 ? "s" : ""}</>}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-100 my-5" />

            {/* Promo banner */}
            {hasPromo && (
              <div
                className="px-4 py-3 rounded-2xl mb-3 flex items-center gap-3 text-white"
                style={{ background: "linear-gradient(135deg,#dc2626 0%,#ef4444 50%,#f97316 100%)", boxShadow: "0 8px 24px rgba(239,68,68,0.25)" }}
              >
                <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">-{discount}%</span>
                <p className="text-xs font-bold">Promoción hasta {new Date(product.promoHasta!).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</p>
              </div>
            )}

            {/* Price */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "linear-gradient(135deg,rgba(30,118,182,0.06) 0%,rgba(52,140,203,0.04) 100%)",
                border: "1px solid rgba(30,118,182,0.12)",
              }}
            >
              <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-widest mb-1">Precio</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  className="text-[32px] sm:text-[40px] font-black tracking-tight leading-none"
                  style={{
                    background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {fmtCOP(price)}
                </span>
                {hasPromo && (
                  <span className="text-lg text-gray-400 line-through">{fmtCOP(product.precioCop)}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">+ IVA · {product.cantidadDisponible} disponibles</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{
                background: product.tipo === "reencauche" ? "#f3e8ff" : "#dbeafe",
                color: product.tipo === "reencauche" ? "#7c3aed" : "#1d4ed8",
              }}>
                {product.tipo === "reencauche" ? "Reencauche" : "Llanta Nueva"}
              </span>
              {product.catalog?.terreno && <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{product.catalog.terreno}</span>}
              {/* "Reencauchable" attribute doesn't apply to retread products themselves. */}
              {product.tipo !== "reencauche" && product.catalog?.reencauchable && <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">Reencauchable</span>}
              {product.tiempoEntrega && <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{product.tiempoEntrega}</span>}
            </div>

            {/* DECISION STRIP — translates raw spec fields into buyer
                language ("Ideal para" + "Por qué elegir"). Sits ABOVE
                the technical Notas TirePro block so users decide before
                drilling into specs. Heuristic: derives from eje, terreno,
                rim size, brand tier, reencauchable, cpk. */}
            {(() => {
              const c = product.catalog;
              const eje = (product.eje ?? c?.ejeTirePro ?? "").toLowerCase();
              const terr = (c?.terreno ?? "").toLowerCase();
              const rim = parseFloat((product.dimension.match(/R\s*(\d{2}(?:\.\d)?)/i) ?? [, ""])[1]);
              const tier = brandInfo?.tier;
              const isReenc = product.tipo === "reencauche";

              const idealFor: string[] = [];
              if (rim >= 22) idealFor.push("Tractomulas y camiones pesados");
              else if (rim >= 17.5) idealFor.push("Camiones y buses");
              else if (rim >= 16) idealFor.push("Camionetas y SUV");
              else if (rim >= 13) idealFor.push("Automóvil");
              if (eje.includes("tracc")) idealFor.push("Eje motriz / tracción");
              else if (eje.includes("dirección") || eje.includes("direccion")) idealFor.push("Eje delantero / dirección");
              else if (eje.includes("remol") || eje.includes("trailer")) idealFor.push("Trailer / remolque");
              if (terr.includes("carretera")) idealFor.push("Larga distancia en carretera");
              else if (terr.includes("mixto")) idealFor.push("Servicio mixto on/off-road");
              else if (terr.includes("urbano") || terr.includes("ciudad")) idealFor.push("Servicio urbano");
              else if (terr.includes("destap") || terr.includes("off")) idealFor.push("Terrenos destapados");
              if (isReenc) idealFor.push("Flotas con cascos reencauchables");

              const reasons: Array<{ title: string; sub: string }> = [];
              if (tier === "premium") {
                reasons.push({ title: "Calidad premium", sub: "Carcasa y compuestos de gama alta · ingeniería para cargas exigentes." });
              } else if (tier === "mid") {
                reasons.push({ title: "Equilibrio precio-rendimiento", sub: "Buena durabilidad con precio inicial competitivo." });
              } else if (tier === "value") {
                reasons.push({ title: "Costo-efectiva", sub: "Pensada para flotas de alta rotación con presupuesto ajustado." });
              }
              if (!isReenc && c?.reencauchable) {
                reasons.push({
                  title: c.vidasReencauche
                    ? `Reencauchable hasta ${c.vidasReencauche} vidas`
                    : "Reencauchable",
                  sub: "Extiende su vida útil reduciendo el costo total de tus llantas.",
                });
              }
              if (isReenc) {
                reasons.push({
                  title: "Aprovecha tus cascos",
                  sub: "El reencauche reduce el costo por kilómetro frente a una llanta nueva equivalente.",
                });
              }
              if (c?.kmEstimadosReales && c.kmEstimadosReales >= 100000) {
                reasons.push({
                  title: `~${(c.kmEstimadosReales / 1000).toFixed(0)}K km estimados`,
                  sub: "Vida útil proyectada en condiciones colombianas reales.",
                });
              }

              if (idealFor.length === 0 && reasons.length === 0) return null;

              return (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {idealFor.length > 0 && (
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "linear-gradient(135deg,rgba(30,118,182,0.06),rgba(52,140,203,0.02))",
                        border: "1px solid rgba(30,118,182,0.12)",
                      }}
                    >
                      <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">
                        Ideal para
                      </p>
                      <ul className="space-y-1.5">
                        {idealFor.slice(0, 5).map((it) => (
                          <li key={it} className="flex items-start gap-2 text-[12px] text-[#0A183A]">
                            <Check className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0 mt-0.5" />
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reasons.length > 0 && (
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "linear-gradient(135deg,rgba(34,197,94,0.05),rgba(16,185,129,0.02))",
                        border: "1px solid rgba(34,197,94,0.16)",
                      }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-emerald-700">
                        Por qué elegirla
                      </p>
                      <ul className="space-y-2">
                        {reasons.slice(0, 4).map((r) => (
                          <li key={r.title}>
                            <p className="text-[12px] font-black text-[#0A183A]">{r.title}</p>
                            <p className="text-[10px] text-gray-600 leading-snug">{r.sub}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Description (from distributor) — clamped to 280 chars by
                default. Long distributor copy (full spec dumps, marketing
                pitches) pushed the buy box and decision strip far below
                the fold; the toggle lets users opt in to the full text
                without forcing it on everyone. */}
            {product.descripcion && (() => {
              const DESC_MAX = 280;
              const full = product.descripcion;
              const isLong = full.length > DESC_MAX;
              // Trim at the nearest space so we don't break a word.
              const cut = isLong
                ? full.slice(0, DESC_MAX).replace(/\s+\S*$/, "") + "…"
                : full;
              const shown = !isLong || descExpanded ? full : cut;
              return (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{shown}</p>
                  {isLong && (
                    <button
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-[#1E76B6] hover:underline"
                    >
                      {descExpanded ? "Ver menos" : "Ver más"}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${descExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Notas TirePro — collapsible technical sheet */}
            {product.catalog && (() => {
              const c = product.catalog;
              const loadLi = parseLoadIndex(c.indiceCarga);
              const loadKg = loadLi != null ? loadIndexToKg(loadLi) : null;
              const rows: Array<{ label: string; value: string; icon?: any }> = [];
              if (c.anchoMm != null || c.perfil || c.rin) {
                const parts = [c.anchoMm != null ? `${c.anchoMm}mm` : null, c.perfil ? `perfil ${c.perfil}` : null, c.rin ? `rin ${c.rin}` : null].filter(Boolean);
                if (parts.length) rows.push({ label: "Medida", value: parts.join(" · ") });
              }
              if (c.rtdMm != null)        rows.push({ label: "Profundidad inicial", value: `${c.rtdMm} mm` });
              if (c.psiRecomendado != null) rows.push({ label: "Presión recomendada", value: `${c.psiRecomendado} PSI` });
              if (c.indiceCarga)          rows.push({ label: "Índice de carga", value: loadKg ? `${c.indiceCarga} · ~${loadKg.toLocaleString("es-CO")} kg por llanta` : c.indiceCarga });
              if (c.indiceVelocidad)      rows.push({ label: "Índice de velocidad", value: c.indiceVelocidad });
              if (c.pesoKg != null)       rows.push({ label: "Peso de la llanta", value: `${c.pesoKg} kg` });
              if (c.kmEstimadosReales != null) rows.push({ label: "Km estimados (Colombia)", value: `${(c.kmEstimadosReales / 1000).toFixed(0)}K km` });
              if (c.kmEstimadosFabrica != null && c.kmEstimadosFabrica !== c.kmEstimadosReales) rows.push({ label: "Km estimados (fábrica)", value: `${(c.kmEstimadosFabrica / 1000).toFixed(0)}K km` });
              if (c.terreno)              rows.push({ label: "Terreno", value: c.terreno });
              if (c.pctPavimento != null && c.pctDestapado != null) rows.push({ label: "Uso pavimento / destapado", value: `${c.pctPavimento}% / ${c.pctDestapado}%` });
              if (c.ejeTirePro || c.posicion) rows.push({ label: "Posición de eje", value: c.ejeTirePro ?? c.posicion ?? "—" });
              if (c.segmento)             rows.push({ label: "Segmento", value: c.segmento });
              if (c.construccion)         rows.push({ label: "Construcción", value: c.construccion });
              if (c.tipo)                 rows.push({ label: "Tipo", value: c.tipo });
              // Skip the "Reencauchable" row entirely for retread products —
              // a band that's already a reencauche can't itself reencauche again.
              if (product.tipo !== "reencauche") {
                rows.push({ label: "Reencauchable", value: c.reencauchable ? `Sí${c.vidasReencauche ? ` · hasta ${c.vidasReencauche} vidas` : ""}` : "No" });
              }
              if (c.skuRef)               rows.push({ label: "SKU TirePro", value: c.skuRef });

              return (
                <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setNotasOpen(!notasOpen)}
                    className="w-full px-4 py-3 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
                    style={{ background: notasOpen ? "rgba(30,118,182,0.04)" : "white" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                      <Info className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-black text-[#0A183A]">Notas TirePro</p>
                      <p className="text-[10px] text-gray-500">Ficha técnica verificada · {rows.length} datos</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${notasOpen ? "rotate-180" : ""}`} />
                  </button>
                  {notasOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-0.5" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                      {rows.map((r, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                          <span className="text-[11px] text-gray-500 flex-shrink-0">{r.label}</span>
                          <span className="text-[11px] font-bold text-[#0A183A] text-right">{r.value}</span>
                        </div>
                      ))}
                      {c.notasColombia && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-1">Notas Colombia</p>
                          <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">{c.notasColombia}</p>
                        </div>
                      )}
                      {c.crowdCompanyCount != null && c.crowdCompanyCount >= 3 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-1.5">Datos reales de la red</p>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {c.crowdAvgPrice != null && <div><span className="text-gray-500">Precio típico: </span><span className="font-bold text-[#0A183A]">{fmtCOP(Math.round(c.crowdAvgPrice))}</span></div>}
                            {c.crowdAvgKm != null && <div><span className="text-gray-500">Km reales: </span><span className="font-bold text-[#0A183A]">{(c.crowdAvgKm / 1000).toFixed(0)}K</span></div>}
                            {c.crowdConfidence != null && <div><span className="text-gray-500">Confianza: </span><span className="font-bold text-[#0A183A]">{Math.round(c.crowdConfidence * 100)}%</span></div>}
                          </div>
                          <p className="text-[9px] text-gray-400 mt-1.5">Basado en {c.crowdCompanyCount} empresas de la red TirePro</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Specs */}
            {product.catalog && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {product.catalog.rtdMm != null && <div className="px-4 py-3 rounded-2xl bg-[#f5f5f7]"><p className="text-[10px] text-gray-400 font-medium">Prof. inicial</p><p className="text-[15px] font-semibold text-[#0A183A] mt-0.5">{product.catalog.rtdMm} mm</p></div>}
                {product.catalog.kmEstimadosReales != null && <div className="px-4 py-3 rounded-2xl bg-[#f5f5f7]"><p className="text-[10px] text-gray-400 font-medium">Km estimados</p><p className="text-[15px] font-semibold text-[#0A183A] mt-0.5">{(product.catalog.kmEstimadosReales / 1000).toFixed(0)}K km</p></div>}
                {product.catalog.psiRecomendado != null && <div className="px-4 py-3 rounded-2xl bg-[#f5f5f7]"><p className="text-[10px] text-gray-400 font-medium">Presion rec.</p><p className="text-[15px] font-semibold text-[#0A183A] mt-0.5">{product.catalog.psiRecomendado} PSI</p></div>}
              </div>
            )}

            {/* Buy box — Amazon-style sticky card */}
            <div
              className="mt-6 rounded-3xl p-5 bg-white"
              style={{ boxShadow: "0 12px 32px -16px rgba(10,24,58,0.18), 0 0 0 1px rgba(30,118,182,0.08)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-black text-emerald-600">
                  Disponible
                  {product.cantidadDisponible > 0 && product.cantidadDisponible <= 10 && (
                    <span className="text-amber-600 font-bold"> · solo {product.cantidadDisponible} unidades</span>
                  )}
                </p>
              </div>
              {product.tiempoEntrega && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mb-4">
                  <Truck className="w-3.5 h-3.5 text-[#1E76B6]" />
                  Entrega estimada: <span className="font-bold text-[#0A183A]">{product.tiempoEntrega}</span>
                </p>
              )}

              <div className="flex items-center gap-4 mb-4">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cantidad</span>
                <div className="flex items-center rounded-full overflow-hidden" style={{ border: "1.5px solid #e5e5e5" }}>
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3.5 py-2 hover:bg-[#f0f7ff] transition-colors"><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                  <span className="px-5 py-2 text-[14px] font-black text-[#0A183A]" style={{ borderLeft: "1.5px solid #e5e5e5", borderRight: "1.5px solid #e5e5e5" }}>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="px-3.5 py-2 hover:bg-[#f0f7ff] transition-colors"><Plus className="w-3.5 h-3.5 text-gray-500" /></button>
                </div>
                {qty > 1 && (
                  <span className="text-sm font-black text-[#0A183A] ml-auto">
                    {fmtCOP(price * qty)}
                  </span>
                )}
              </div>

              <button onClick={handleAddToCart}
                className="w-full py-3.5 rounded-2xl text-[15px] font-black text-white transition-all hover:opacity-95 hover:shadow-2xl hover:shadow-[#1E76B6]/30 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#0A183A 0%,#1E76B6 100%)" }}>
                <ShoppingCart className="w-4 h-4" />
                Agregar al carrito
              </button>
              {cart.count > 0 && (
                <Link href="/marketplace/cart"
                  className="w-full mt-2 py-3 rounded-2xl text-[13px] font-black text-[#1E76B6] border-2 border-[#1E76B6]/15 hover:bg-[#f0f7ff] flex items-center justify-center gap-2 transition-colors">
                  Ver carrito ({cart.count})
                </Link>
              )}

              <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                El distribuidor confirma tu pedido en hasta 5 días hábiles. El pago se solicita después de la confirmación.
              </p>
            </div>

            {/* Distributor info */}
            <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-200">
              <Link href={`/marketplace/distributor/${product.distributor.slug ?? product.distributor.id}`} className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                  {product.distributor.profileImage && product.distributor.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png"
                    ? <img src={product.distributor.profileImage} alt={`Logo de ${product.distributor.name} — distribuidor de llantas`} className="max-w-full max-h-full object-contain" />
                    : <Truck className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0A183A] group-hover:text-[#1E76B6]">{product.distributor.name}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    {product.distributor.ciudad && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{product.distributor.ciudad}</span>}
                    {product.distributor.tipoEntrega && <span>{product.distributor.tipoEntrega === "domicilio" ? "Entrega a domicilio" : product.distributor.tipoEntrega === "recogida" ? "Recogida" : "Domicilio y recogida"}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E76B6]" />
              </Link>
              {cobertura.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1">
                  <span className="text-[9px] text-gray-400 font-bold mr-1">Cobertura:</span>
                  {cobertura.slice(0, 6).map((c: any, i: number) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{typeof c === "string" ? c : c.ciudad ?? "—"}</span>)}
                  {cobertura.length > 6 && <span className="text-[9px] text-gray-400">+{cobertura.length - 6}</span>}
                </div>
              )}
            </div>

            {/* ═══ RETREADABILITY INDEX ═══ */}
            {/* Hidden for reencauche tires — a retread can't itself be retreaded
                again for additional lives, so the index doesn't apply. */}
            {product.tipo !== "reencauche" && (
            <div className="mt-6 p-5 rounded-2xl bg-white border border-gray-100" style={{ boxShadow: "0 8px 24px -16px rgba(10,24,58,0.1)" }}>
              <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Reencauchabilidad</p>
              <p className="text-sm font-black text-[#0A183A] mb-3">Índice de reencauchabilidad</p>
              {(() => {
                const reencauchable = product.catalog?.reencauchable ?? false;
                const kmEst = product.catalog?.kmEstimadosReales ?? 0;
                const rtd = product.catalog?.rtdMm ?? 0;
                const isReencauche = product.tipo === "reencauche";

                // Calculate index 0-100
                let score = 0;
                if (reencauchable) score += 40;
                if (rtd >= 18) score += 20; else if (rtd >= 14) score += 10;
                if (kmEst >= 150000) score += 20; else if (kmEst >= 100000) score += 10;
                if (!isReencauche) score += 20; // new tires have more retread potential

                const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
                const label = score >= 70 ? "Excelente" : score >= 40 ? "Moderado" : "Bajo";

                return (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
                      </div>
                      <span className="text-sm font-black" style={{ color }}>{score}/100</span>
                    </div>
                    <p className="text-xs font-bold" style={{ color }}>{label}</p>
                    <div className="mt-2 space-y-1 text-[10px] text-gray-500">
                      <p>{reencauchable ? "Casco reencauchable — puede tener hasta 3 vidas adicionales" : "No reencauchable segun fabricante"}</p>
                      {rtd > 0 && <p>Profundidad inicial: {rtd}mm {rtd >= 18 ? "(optima para reencauche)" : rtd >= 14 ? "(adecuada)" : "(limitada)"}</p>}
                      {kmEst > 0 && <p>{(kmEst / 1000).toFixed(0)}K km estimados por vida</p>}
                      {isReencauche && <p>Este producto ya es un reencauche — ahorro estimado vs nueva: ~40%</p>}
                    </div>
                  </div>
                );
              })()}
            </div>
            )}

            {/* ═══ VEHICLE COMPATIBILITY ═══ */}
            <div className="mt-6 p-5 rounded-2xl bg-white border border-gray-100" style={{ boxShadow: "0 8px 24px -16px rgba(10,24,58,0.1)" }}>
              <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">Compatibilidad</p>
              <p className="text-sm font-black text-[#0A183A] mb-3">Vehículos compatibles</p>
              {(() => {
                const dim = product.dimension;
                const eje = product.eje;
                const terreno = product.catalog?.terreno;
                const isReencauche = product.tipo === "reencauche";

                // Parse dimension to extract width, aspect ratio, and rim diameter
                // Formats: "195/55R16", "295/80R22.5", "11R22.5", "7.50R16", "120/80-17"
                const numericMatch = dim.match(/^(\d+(?:\.\d+)?)R(\d+(?:\.\d+)?)$/i);       // e.g. 11R22.5
                const standardMatch = dim.match(/^(\d+)\/(\d+)\s*R?\s*(\d+(?:\.\d+)?)$/i);  // e.g. 195/55R16
                const motoMatch = dim.match(/^(\d+)\/(\d+)\s*-\s*(\d+)$/);                  // e.g. 120/80-17
                // Reencauche bands use a bare width (the "ancho") — e.g. "295" or
                // "11.50". No rim, no aspect. Detect both raw integer and decimal.
                const reencaucheMatch = dim.match(/^(\d+(?:\.\d+)?)$/);

                const width = standardMatch ? parseInt(standardMatch[1]) : numericMatch ? parseFloat(numericMatch[1]) * 25.4 : 0;
                const rim = standardMatch ? parseFloat(standardMatch[3]) : numericMatch ? parseFloat(numericMatch[2]) : motoMatch ? parseFloat(motoMatch[3]) : 0;
                const isMoto = !!motoMatch || dim.includes('-');

                type VehicleCompat = { name: string; examples: string; positions: string };
                let vehicles: VehicleCompat[] = [];

                // Reencauche-specific path: the dimension is just an ancho, so
                // the standard rim/width parsing is meaningless. Map the ancho
                // (in mm — inch values < 30 are converted) to the heavy-duty
                // applications retread bands actually fit.
                if (isReencauche && reencaucheMatch) {
                  const ejePos = (() => {
                    if (eje === "direccion") return "Eje direccional";
                    if (eje === "traccion")  return "Ejes de tracción";
                    if (eje === "remolque")  return "Eje de remolque";
                    if (eje === "libre")     return "Cualquier eje";
                    return "Consultar posición según diseño de banda";
                  })();
                  const raw = parseFloat(reencaucheMatch[1]);
                  // Heuristic: anything below ~30 was almost certainly entered
                  // in inches (e.g. 11.00, 12.00 R22.5 hosts). Convert to mm.
                  const widthMm = raw < 30 ? raw * 25.4 : raw;

                  if (widthMm >= 285) {
                    vehicles = [
                      { name: "Tractomula (cabezote)", examples: "Kenworth T680, Freightliner Cascadia, International LT", positions: ejePos },
                      { name: "Volqueta / Mixer", examples: "Kenworth T800, International HX520, Mack Granite", positions: ejePos },
                      { name: "Bus interurbano", examples: "Mercedes-Benz O500, Marcopolo Paradiso, Scania K360", positions: ejePos },
                    ];
                  } else if (widthMm >= 245) {
                    vehicles = [
                      { name: "Camión mediano", examples: "Chevrolet NQR, Hino FC, JAC X350, Isuzu FRR", positions: ejePos },
                      { name: "Bus urbano", examples: "Chevrolet LV150, Hino AK, SITP Bogotá, Mio Cali", positions: ejePos },
                      { name: "Trailer / Semirremolque", examples: "Trailer 2 y 3 ejes, cisterna, cama baja", positions: ejePos },
                    ];
                  } else if (widthMm >= 200) {
                    vehicles = [
                      { name: "Camión liviano", examples: "Chevrolet NHR, Hyundai HD65, JMC Carrying", positions: ejePos },
                      { name: "Furgón de reparto", examples: "Chevrolet NLR, Hyundai HD45, Kia K2700", positions: ejePos },
                    ];
                  } else {
                    vehicles = [
                      { name: "Vehículo comercial liviano", examples: "Consulta el manual del vehículo", positions: ejePos },
                    ];
                  }
                } else if (isMoto) {
                  vehicles = [
                    { name: "Motocicleta", examples: "Honda CB190, Yamaha FZ, Bajaj Pulsar, Suzuki Gixxer", positions: "Delantera o trasera segun medida" },
                  ];
                } else if (rim >= 22) {
                  // Heavy truck / bus — R22.5, R24.5
                  if (rim >= 24) {
                    vehicles = [
                      { name: "Volqueta", examples: "Kenworth T800, International 7600, Mack Granite", positions: eje === "traccion" ? "Ejes de traccion" : eje === "direccion" ? "Eje direccional" : "Todas las posiciones" },
                      { name: "Mixer / Mezcladora", examples: "International HX520, Freightliner 114SD", positions: "Ejes de carga" },
                    ];
                  } else {
                    vehicles = [
                      { name: "Tractomula (cabezote)", examples: "Kenworth T680, Freightliner Cascadia, International LT", positions: eje === "direccion" ? "Eje delantero (P1, P2)" : eje === "traccion" ? "Ejes traseros (P3-P6)" : "Todas las posiciones" },
                      { name: "Trailer / Semirremolque", examples: "Trailer 2 y 3 ejes, cama baja, cisterna", positions: eje === "libre" || !eje ? "Todos los ejes" : `Eje de ${eje}` },
                      { name: "Bus interurbano", examples: "Mercedes-Benz O500, Marcopolo Paradiso", positions: eje === "direccion" ? "Eje direccional" : "Ejes de traccion" },
                    ];
                  }
                } else if (rim >= 19 && rim < 22) {
                  // Medium truck / bus — R19.5, R20
                  vehicles = [
                    { name: "Camion mediano", examples: "Chevrolet NQR, Hino FC, JAC X350", positions: eje === "direccion" ? "Eje delantero" : "Eje trasero" },
                    { name: "Bus urbano", examples: "Chevrolet LV150, Hino AK, SITP Bogota", positions: "Todos los ejes" },
                  ];
                } else if (rim >= 17 && rim < 19) {
                  // Light truck or SUV depending on width
                  if (width >= 200 || numericMatch) {
                    // Wide or numeric format (7.50R16, 215/75R17.5) = light truck
                    vehicles = [
                      { name: "Camion liviano", examples: "Chevrolet NHR, Hyundai HD65, JMC Carrying", positions: eje === "direccion" ? "Eje delantero" : "Todas las posiciones" },
                      { name: "Furgon de reparto", examples: "Chevrolet NLR, Hyundai HD45, Kia K2700", positions: "Todos los ejes" },
                    ];
                  } else {
                    // Narrower R17/R18 = SUV, crossover, sedan deportivo
                    vehicles = [
                      { name: "SUV / Crossover", examples: "Toyota RAV4, Mazda CX-5, Hyundai Tucson, Kia Sportage", positions: "Las 4 ruedas" },
                      { name: "Sedan mediano", examples: "Toyota Camry, Mazda 3, Honda Civic, Kia Cerato", positions: "Las 4 ruedas" },
                    ];
                    if (width >= 235) {
                      vehicles.unshift({ name: "Camioneta / Pickup", examples: "Toyota Hilux, Nissan Frontier, Chevrolet D-MAX, Ford Ranger", positions: "Las 4 ruedas" });
                    }
                  }
                } else if (rim >= 15 && rim < 17) {
                  // Passenger car / small SUV — R15, R16
                  if (width >= 255) {
                    // Wide R15/R16 = pickup / SUV
                    vehicles = [
                      { name: "Camioneta / Pickup", examples: "Toyota Hilux, Nissan Frontier, Mitsubishi L200", positions: "Las 4 ruedas" },
                      { name: "Campero / SUV", examples: "Toyota Prado, Nissan Pathfinder, Chevrolet TrailBlazer", positions: "Las 4 ruedas" },
                    ];
                  } else if (width >= 215) {
                    vehicles = [
                      { name: "Sedan mediano / Grande", examples: "Toyota Corolla, Mazda 3, Honda Civic, Kia Cerato", positions: "Las 4 ruedas" },
                      { name: "SUV compacto", examples: "Hyundai Tucson, Kia Sportage, Nissan Qashqai, Renault Duster", positions: "Las 4 ruedas" },
                    ];
                  } else if (width >= 185) {
                    vehicles = [
                      { name: "Sedan compacto", examples: "Renault Logan, Chevrolet Onix, Kia Rio, Hyundai Accent", positions: "Las 4 ruedas" },
                      { name: "Hatchback", examples: "Honda Fit, Mazda 2, Renault Sandero, Volkswagen Polo", positions: "Las 4 ruedas" },
                    ];
                  } else {
                    vehicles = [
                      { name: "Auto compacto / City car", examples: "Kia Picanto, Chevrolet Spark, Renault Kwid, Suzuki Swift", positions: "Las 4 ruedas" },
                    ];
                  }
                } else if (rim >= 13 && rim < 15) {
                  // Small car — R13, R14
                  if (width >= 175) {
                    vehicles = [
                      { name: "Sedan compacto", examples: "Renault Logan, Chevrolet Sail, Kia Rio, Hyundai i25", positions: "Las 4 ruedas" },
                      { name: "Hatchback", examples: "Renault Sandero, Chevrolet Onix, Suzuki Swift", positions: "Las 4 ruedas" },
                    ];
                  } else {
                    vehicles = [
                      { name: "City car", examples: "Kia Picanto, Chevrolet Spark, Suzuki Alto, Renault Kwid", positions: "Las 4 ruedas" },
                    ];
                  }
                } else if (numericMatch && rim === 16 && width > 150) {
                  // Numeric format R16 (e.g. 7.50R16) = light truck
                  vehicles = [
                    { name: "Camion liviano", examples: "Chevrolet NHR, Hyundai HD45, Kia K2700", positions: "Todas las posiciones" },
                    { name: "Furgon", examples: "JMC Carrying, Foton Aumark, Hyundai HD65", positions: "Todos los ejes" },
                  ];
                }

                // Fallback: try to infer from rim and width if nothing matched
                if (vehicles.length === 0) {
                  if (rim <= 16 && width <= 250) {
                    vehicles = [
                      { name: "Automovil", examples: "Consulta el manual de tu vehiculo para confirmar compatibilidad", positions: "Las 4 ruedas" },
                    ];
                  } else {
                    vehicles = [
                      { name: "Vehiculo comercial", examples: "Consulta el manual de tu vehiculo para confirmar compatibilidad", positions: eje ? `Eje de ${eje}` : "Consultar posicion" },
                    ];
                  }
                }

                return (
                  <div className="space-y-2">
                    {vehicles.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(30,118,182,0.03)", border: "1px solid rgba(30,118,182,0.08)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0A183A]">{v.name}</p>
                          <p className="text-[10px] text-gray-500">{v.examples}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{v.positions}</p>
                        </div>
                      </div>
                    ))}
                    {terreno && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Optimizada para terreno: <span className="font-bold text-gray-600">{terreno}</span>
                      </p>
                    )}
                    {eje && (
                      <p className="text-[10px] text-gray-400">
                        Posicion recomendada: <span className="font-bold text-gray-600 capitalize">Eje de {eje}</span>
                      </p>
                    )}
                    {isReencauche && (
                      <p className="text-[10px] text-gray-400 italic mt-1">
                        Esta es una banda de reencauche — la compatibilidad final depende del casco al que se aplica.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ═══ PER-PLACA ANALYSIS (pro users only) ═══ */}
            {isProUser && (
            <div className="mt-6 p-5 rounded-2xl border border-gray-100" style={{ background: "linear-gradient(135deg, rgba(10,24,58,0.03), rgba(30,118,182,0.03))", boxShadow: "0 8px 24px -16px rgba(10,24,58,0.1)" }}>
              <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">TirePro · Pro</p>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-black text-[#0A183A]">Análisis por placa</p>
                <Zap className="w-3.5 h-3.5 text-[#1E76B6]" />
              </div>
              <p className="text-[10px] text-gray-500 mb-3">Ingresa la placa y analizamos todo: compatibilidad por posición, índice de carga vs peso del vehículo, reencauchabilidad e historial de tus llantas actuales.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={vrPlaca}
                  onChange={(e) => setVrPlaca(e.target.value.toUpperCase())}
                  placeholder="Ingresa la placa"
                  maxLength={7}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A] placeholder-gray-400 uppercase"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  disabled={vrPlaca.length < 3 || vrLoading}
                  onClick={async () => {
                    setVrLoading(true); setVrError(""); setVrResult(null);
                    try {
                      const token = localStorage.getItem("token") ?? "";
                      if (!token) { setVrError("Inicia sesión para analizar la placa"); setVrLoading(false); return; }
                      const vRes = await fetch(`${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(vrPlaca)}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (!vRes.ok) { setVrError("Vehículo no encontrado"); setVrLoading(false); return; }
                      const vehicle = await vRes.json();
                      const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicle.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const tires: any[] = tRes.ok ? await tRes.json() : [];

                      // ----- AXIS-AWARE COMPATIBILITY -----
                      // P1/P2 = steer, rest = drive. Casing + tread compound
                      // differences make cross-axis swaps unsafe.
                      //
                      // Dimensions run through `normDim` before any compare
                      // or map-key so "295/80R22.5" matches "295/80 r22.5"
                      // / "295/80 R 22.5" even on rows written before the
                      // canonical-dimension migration landed.
                      const normDim = (s: string | null | undefined) =>
                        (s ?? "").replace(/\s+/g, "").toUpperCase();
                      const tireEje = (product.eje ?? "libre").toLowerCase();
                      const tireDimension = normDim(product.dimension);

                      const positionEje = (pos: number): "direccion" | "traccion" => (pos <= 2 ? "direccion" : "traccion");
                      const ejeFits = (productEje: string, posEje: string) => {
                        if (!productEje || productEje === "libre") return true;
                        return productEje === posEje;
                      };

                      const dimByEje: Record<string, Map<string, number>> = { direccion: new Map(), traccion: new Map() };
                      tires.forEach((t: any) => {
                        const e = t.eje?.toLowerCase() === "direccion" || t.eje?.toLowerCase() === "traccion"
                          ? t.eje.toLowerCase()
                          : positionEje(t.posicion ?? 0);
                        const d = normDim(t.dimension);
                        if (!d) return;
                        const m = dimByEje[e];
                        m.set(d, (m.get(d) ?? 0) + 1);
                      });
                      const dominantDim = (e: "direccion" | "traccion"): string | null => {
                        const m = dimByEje[e];
                        if (m.size === 0) return null;
                        return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
                      };

                      const matches: Array<{ posicion: number; eje: string; reason: string; severity: "urgent" | "soon" | "ok" | "empty" }> = [];
                      const incompatible: Array<{ posicion: number; reason: string }> = [];
                      const occupied = new Set(tires.map((t: any) => t.posicion));
                      const maxPos = Math.max(6, ...tires.map((t: any) => t.posicion ?? 0));

                      for (let p = 1; p <= maxPos; p++) {
                        if (occupied.has(p)) continue;
                        const e = positionEje(p);
                        if (!ejeFits(tireEje, e)) {
                          incompatible.push({ posicion: p, reason: `Posición vacía pero es de ${e}; esta llanta es de ${tireEje}` });
                          continue;
                        }
                        const dom = dominantDim(e);
                        const dimNote = dom && dom !== tireDimension
                          ? `el resto del ${e === "direccion" ? "eje delantero" : "eje trasero"} usa ${dom}, esta es ${tireDimension}`
                          : `coincide con ${tireDimension} en ${e === "direccion" ? "el eje delantero" : "el eje trasero"}`;
                        matches.push({ posicion: p, eje: e, reason: `Posición vacía — ${dimNote}`, severity: "empty" });
                      }

                      tires.forEach((t: any) => {
                        const pos = t.posicion;
                        const tEje = t.eje?.toLowerCase() || positionEje(pos);
                        const tDim = normDim(t.dimension);
                        const depth = typeof t.currentProfundidad === "number" ? t.currentProfundidad : 99;
                        if (!ejeFits(tireEje, tEje)) {
                          incompatible.push({ posicion: pos, reason: `Posición de ${tEje}; esta llanta es de ${tireEje}` });
                          return;
                        }
                        if (tDim && tDim !== tireDimension) {
                          incompatible.push({ posicion: pos, reason: `Medida instalada ${tDim} ≠ ${tireDimension}` });
                          return;
                        }
                        if (depth <= 3) {
                          matches.push({ posicion: pos, eje: tEje, reason: `Reemplazo urgente — ${t.marca ?? "llanta"} a ${depth.toFixed(1)} mm`, severity: "urgent" });
                        } else if (depth <= 6) {
                          matches.push({ posicion: pos, eje: tEje, reason: `Considerar reemplazo pronto — ${t.marca ?? "llanta"} a ${depth.toFixed(1)} mm`, severity: "soon" });
                        } else {
                          matches.push({ posicion: pos, eje: tEje, reason: `Compatible (la actual aún tiene ${depth.toFixed(1)} mm)`, severity: "ok" });
                        }
                      });

                      const order: Record<string, number> = { urgent: 0, soon: 1, empty: 2, ok: 3 };
                      matches.sort((a, b) => order[a.severity] - order[b.severity] || a.posicion - b.posicion);

                      const verdict: "perfect" | "compatible" | "incompatible" | "empty" =
                        matches.some((m) => m.severity === "urgent") ? "perfect"
                          : matches.length > 0 ? "compatible"
                          : incompatible.length > 0 ? "incompatible"
                          : "empty";

                      const headline =
                        verdict === "perfect"     ? "Esta llanta encaja perfecto en una posición que necesita reemplazo"
                        : verdict === "compatible" ? `Compatible con ${matches.length} posición${matches.length !== 1 ? "es" : ""} de tu vehículo`
                        : verdict === "incompatible" ? "Esta llanta no es compatible con tu vehículo"
                        : "Sin posiciones donde encaje en este momento";

                      const summary = (() => {
                        const parts: string[] = [];
                        if (tireEje === "libre" || !tireEje) {
                          parts.push("Llanta multi-posición — puede ir tanto en eje direccional como en ejes de tracción.");
                        } else {
                          parts.push(`Llanta de ${tireEje}: en este vehículo solo puede instalarse en ${tireEje === "direccion" ? "P1 y P2 (eje delantero)" : "P3 en adelante (ejes traseros)"}.`);
                        }
                        const dirDim = dominantDim("direccion");
                        const tracDim = dominantDim("traccion");
                        if (dirDim || tracDim) {
                          const bits = [];
                          if (dirDim)  bits.push(`eje delantero: ${dirDim}`);
                          if (tracDim) bits.push(`ejes traseros: ${tracDim}`);
                          parts.push(`Vehículo actualmente usa ${bits.join(" · ")}.`);
                        }
                        return parts.join(" ");
                      })();

                      // ----- EXTRA INSIGHTS -----
                      const insights: Array<{ kind: "load" | "cpk" | "reencauche" | "vehicle"; ok: boolean | null; title: string; detail: string }> = [];

                      // Vehicle summary (tipovhc, config, KM)
                      {
                        const bits: string[] = [];
                        if (vehicle.tipovhc) bits.push(String(vehicle.tipovhc));
                        if (vehicle.configuracion) bits.push(`config ${vehicle.configuracion}`);
                        if (vehicle.kilometrajeActual) bits.push(`${Math.round(vehicle.kilometrajeActual).toLocaleString("es-CO")} km`);
                        if (bits.length) insights.push({ kind: "vehicle", ok: null, title: "Tu vehículo", detail: bits.join(" · ") });
                      }

                      // Load-bearing: tire load index vs vehicle pesoCarga
                      const li = parseLoadIndex(product.catalog?.indiceCarga ?? null);
                      const tireKg = li != null ? loadIndexToKg(li) : null;
                      const pesoCarga = typeof vehicle.pesoCarga === "number" ? vehicle.pesoCarga : null;
                      if (tireKg != null && pesoCarga && pesoCarga > 0) {
                        const nTires = Math.max(tires.length, 4);
                        const totalCap = tireKg * nTires;
                        const headroom = totalCap - pesoCarga;
                        const ok = headroom >= 0;
                        insights.push({
                          kind: "load",
                          ok,
                          title: ok ? "Índice de carga adecuado" : "Índice de carga insuficiente",
                          detail: `Capacidad total estimada: ${totalCap.toLocaleString("es-CO")} kg (${tireKg.toLocaleString("es-CO")} kg × ${nTires} llantas) vs peso de carga ${pesoCarga.toLocaleString("es-CO")} kg`,
                        });
                      } else if (tireKg != null) {
                        insights.push({
                          kind: "load",
                          ok: null,
                          title: "Carga por llanta",
                          detail: `Soporta ~${tireKg.toLocaleString("es-CO")} kg por unidad (índice ${product.catalog?.indiceCarga}). Sin peso de carga registrado para validar.`,
                        });
                      }

                      // CPK comparison was removed — proyected CPK isn't a
                      // claim we want to show buyers since it depends on
                      // factors outside the product (route, load, driver).

                      // Reencauchabilidad
                      const reencauchable = product.catalog?.reencauchable ?? false;
                      const vidasReencauche = product.catalog?.vidasReencauche ?? 0;
                      if (reencauchable) {
                        insights.push({
                          kind: "reencauche",
                          ok: true,
                          title: "Casco reencauchable",
                          detail: vidasReencauche > 0
                            ? `Soporta hasta ${vidasReencauche} vida${vidasReencauche === 1 ? "" : "s"} adicional${vidasReencauche === 1 ? "" : "es"} — amortiza costo sobre ~${(vidasReencauche + 1)} ciclos`
                            : "Permite reencauche — amortiza costo sobre múltiples vidas",
                        });
                      } else {
                        insights.push({
                          kind: "reencauche",
                          ok: false,
                          title: "No reencauchable",
                          detail: "El costo se amortiza en una sola vida.",
                        });
                      }

                      const vehicleLabel = vehicle.placa
                        ? `${String(vehicle.placa).toUpperCase()}${vehicle.tipovhc ? ` · ${vehicle.tipovhc}` : ""}`
                        : null;

                      setVrResult({ verdict, headline, matches, incompatible, summary, insights, vehicleLabel });
                    } catch { setVrError("Error al analizar el vehículo"); }
                    setVrLoading(false);
                  }}
                  aria-label="Analizar placa"
                  title="Analizar placa"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:opacity-90 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
                  {vrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {vrError && <p className="text-xs text-red-500 font-bold mt-2">{vrError}</p>}

              {vrResult && (() => {
                const verdictColor: Record<string, string> = {
                  perfect:      "#22c55e",
                  compatible:   "#1E76B6",
                  incompatible: "#ef4444",
                  empty:        "#64748b",
                };
                const sevMeta: Record<string, { label: string; bg: string; color: string }> = {
                  urgent: { label: "Urgente", bg: "rgba(239,68,68,0.1)",  color: "#ef4444" },
                  soon:   { label: "Pronto",  bg: "rgba(245,158,11,0.1)", color: "#d97706" },
                  empty:  { label: "Vacía",   bg: "rgba(30,118,182,0.1)", color: "#1E76B6" },
                  ok:     { label: "Compat.", bg: "rgba(34,197,94,0.1)",  color: "#16a34a" },
                };
                const insightIcon: Record<string, any> = {
                  load: Weight, cpk: Gauge, reencauche: Recycle, vehicle: Truck,
                };
                const insightColor = (ok: boolean | null): string =>
                  ok === true ? "#16a34a" : ok === false ? "#ef4444" : "#1E76B6";
                return (
                  <div className="mt-3 p-4 rounded-2xl bg-white border border-gray-100">
                    <div className="flex items-start gap-2 pb-3 mb-3 border-b border-gray-100">
                      <span className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0" style={{ background: verdictColor[vrResult.verdict] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#0A183A] leading-snug">{vrResult.headline}</p>
                        {vrResult.vehicleLabel && (
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{vrResult.vehicleLabel}</p>
                        )}
                      </div>
                    </div>

                    {vrResult.insights.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Insights TirePro</p>
                        <div className="space-y-1.5">
                          {vrResult.insights.map((ins, i) => {
                            const Icon = insightIcon[ins.kind] ?? Info;
                            const col = insightColor(ins.ok);
                            return (
                              <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-lg" style={{ background: `${col}10`, border: `1px solid ${col}25` }}>
                                <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: col }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-black text-[#0A183A] leading-tight">{ins.title}</p>
                                  <p className="text-[10px] text-gray-600 leading-snug mt-0.5">{ins.detail}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {vrResult.matches.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Posiciones donde encaja</p>
                        <div className="space-y-1.5">
                          {vrResult.matches.map((m, i) => {
                            const sm = sevMeta[m.severity];
                            return (
                              <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: sm.bg, border: `1px solid ${sm.color}25` }}>
                                <span className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: "white", color: sm.color, border: `1px solid ${sm.color}40` }}>P{m.posicion}</span>
                                <span className="text-[10px] text-[#0A183A] leading-snug flex-1">{m.reason}</span>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: sm.color, color: "white" }}>{sm.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {vrResult.incompatible.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">No compatible</p>
                        <div className="space-y-1.5">
                          {vrResult.incompatible.map((m, i) => (
                            <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                              <span className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white text-red-500 border border-red-300">P{m.posicion}</span>
                              <span className="text-[10px] text-red-700 leading-snug">{m.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-500 leading-relaxed pt-2 border-t border-gray-100">{vrResult.summary}</p>
                  </div>
                );
              })()}
            </div>
            )}
          </div>
        </div>

        {/* Reviews & Ratings section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-[#0A183A]">
              Resenas y calificaciones
              {product._count.reviews > 0 && <span className="text-gray-400 font-normal ml-2">({product._count.reviews})</span>}
            </h2>
          </div>

          {/* Rating summary */}
          {product.reviews.length > 0 && (
            <div className="flex items-start gap-6 mb-6 p-5 bg-white rounded-2xl border border-gray-100">
              <div className="text-center flex-shrink-0">
                <p className="text-4xl font-black text-[#0A183A]">{avgRating.toFixed(1)}</p>
                <div className="flex justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4" fill={s <= Math.round(avgRating) ? "#f59e0b" : "none"} style={{ color: s <= Math.round(avgRating) ? "#f59e0b" : "#e5e7eb" }} />
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{product._count.reviews} resena{product._count.reviews !== 1 ? "s" : ""}</p>
              </div>
              {/* Star distribution */}
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = product.reviews.filter((r) => r.rating === star).length;
                  const pct = product.reviews.length > 0 ? (count / product.reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-3 text-right">{star}</span>
                      <Star className="w-3 h-3 text-gray-300" fill="#f59e0b" style={{ color: "#f59e0b" }} />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Write a review */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <p className="text-sm font-bold text-[#0A183A] mb-3">Escribe una resena</p>
            {reviewSuccess ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                <CheckCircle className="w-4 h-4" /> Resena publicada. Gracias!
              </div>
            ) : (
              <>
                {/* Star picker */}
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-xs text-gray-400 mr-2">Tu calificacion:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button"
                      onMouseEnter={() => setReviewHover(s)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewRating(s)}
                      className="transition-transform hover:scale-110">
                      <Star className="w-6 h-6" fill={s <= (reviewHover || reviewRating) ? "#f59e0b" : "none"}
                        style={{ color: s <= (reviewHover || reviewRating) ? "#f59e0b" : "#d1d5db" }} />
                    </button>
                  ))}
                  {reviewRating > 0 && <span className="text-xs text-gray-400 ml-2">{reviewRating}/5</span>}
                </div>
                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                  rows={3} placeholder="Comparte tu experiencia con este producto..."
                  className="w-full px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A] placeholder-gray-400 resize-none" />
                <div className="flex justify-end mt-3">
                  <button
                    disabled={reviewRating === 0 || reviewSubmitting}
                    onClick={async () => {
                      setReviewSubmitting(true);
                      try {
                        let userId: string | undefined;
                        try { userId = JSON.parse(localStorage.getItem("user") ?? "{}").id; } catch { /* */ }
                        const token = localStorage.getItem("token") ?? "";
                        if (!userId || !token) { alert("Debes iniciar sesion para dejar una resena"); setReviewSubmitting(false); return; }
                        const res = await fetch(`${API_BASE}/marketplace/listings/${product.id}/reviews`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ userId, rating: reviewRating, comment: reviewComment || undefined }),
                        });
                        if (res.ok) { setReviewSuccess(true); setReviewComment(""); trackReviewSubmit(product.id, reviewRating); }
                      } catch { /* */ }
                      setReviewSubmitting(false);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                    {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar resena"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Existing reviews */}
          {product.reviews.length > 0 ? (
            <div className="space-y-3">
              {product.reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#0A183A] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-white">{r.user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0A183A]">{r.user.name}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3" fill={s <= r.rating ? "#f59e0b" : "none"} style={{ color: s <= r.rating ? "#f59e0b" : "#d1d5db" }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 leading-relaxed ml-10">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : !reviewSuccess && (
            <div className="text-center py-8 text-gray-400">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-[#0A183A]">Sin resenas todavia</p>
              <p className="text-xs mt-1">Se el primero en calificar este producto.</p>
            </div>
          )}
        </div>
        {/* Promo listings from same distributor */}
        {promoListings.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Ofertas relámpago</p>
                <h2 className="text-xl sm:text-2xl font-black text-[#0A183A]">Más promociones de {product.distributor.name}</h2>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              {promoListings.map((l: any) => {
                const pImgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                const pCover = pImgs.length > 0 ? pImgs[l.coverIndex ?? 0] ?? pImgs[0] : null;
                const pDiscount = Math.round(((l.precioCop - l.precioPromo) / l.precioCop) * 100);
                return (
                  <Link
                    key={l.id}
                    href={`/marketplace/product/${l.id}`}
                    className="flex-shrink-0 snap-start bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group border border-gray-100 relative"
                    style={{ width: "min(70vw, 240px)" }}
                  >
                    <span
                      className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                      style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 6px 14px rgba(239,68,68,0.3)" }}
                    >
                      -{pDiscount}%
                    </span>
                    <div
                      className="aspect-square flex items-center justify-center overflow-hidden"
                      style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}
                    >
                      {pCover ? <img src={pCover} alt={`${l.marca} ${l.modelo} ${l.dimension}`} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform" /> : <Package className="w-10 h-10 text-gray-200" />}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] text-[#1E76B6] font-black uppercase tracking-widest">{l.marca}</p>
                      <p className="text-sm font-black text-[#0A183A] leading-snug truncate mt-0.5">{l.modelo}</p>
                      <p className="text-[11px] text-gray-400">{l.dimension}</p>
                      <div className="flex items-baseline gap-1.5 mt-2">
                        <p className="text-base font-black text-red-500">{fmtCOP(l.precioPromo)}</p>
                        <p className="text-[10px] text-gray-400 line-through">{fmtCOP(l.precioCop)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* SEO CONTENT BLOCK — H2 with target keyword "Comprar llanta
            {brand} {modelo} en Colombia". Renders Spanish copy crawlers
            can read on first request, plus three columns of internal
            links (brand, dimension, city). Avoids manufacturer-warranty
            claims since those are seller-dependent.
            Hidden when the product is missing core identifying data so
            we don't render generic copy without anchors. */}
        {(() => {
          const slugify = (s: string) =>
            s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const brandSlug = brandInfo?.slug ?? slugify(product.marca);
          const dimEnc = encodeURIComponent(product.dimension);
          const c = product.catalog;
          const eje = (product.eje ?? c?.ejeTirePro ?? "").toLowerCase();
          const terr = (c?.terreno ?? "").toLowerCase();
          // Use case sentence — short, plain Spanish.
          const useCase =
            terr.includes("carretera") ? "rutas de larga distancia"
            : terr.includes("urbano") || terr.includes("ciudad") ? "operación urbana"
            : terr.includes("mixto") ? "servicio mixto on/off-road"
            : eje.includes("tracc") ? "ejes de tracción"
            : eje.includes("dirección") || eje.includes("direccion") ? "ejes de dirección"
            : "operación de flota en Colombia";
          return (
            <section
              aria-labelledby="product-seo"
              className="mt-14 bg-white rounded-3xl p-6 sm:p-8"
              style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18)" }}
            >
              <h2
                id="product-seo"
                className="text-xl sm:text-2xl font-black text-[#0A183A] mb-4"
              >
                Comprar llanta {product.marca} {product.modelo} en Colombia
              </h2>
              <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-3">
                <p>
                  La <strong>{product.marca} {product.modelo} {product.dimension}</strong>
                  {product.tipo === "reencauche" ? " (reencauche)" : ""} está pensada para{" "}
                  <strong>{useCase}</strong>. En TirePro Marketplace la compras a través de{" "}
                  distribuidores verificados con envío a todo el país y pago seguro.
                </p>
                {c?.kmEstimadosReales && c.kmEstimadosReales >= 50000 && (
                  <p>
                    A <strong>{fmtCOP(price)}</strong>, esta llanta está dimensionada para flotas
                    que miden el rendimiento real. Vida útil estimada:{" "}
                    <strong>{(c.kmEstimadosReales / 1000).toFixed(0)}K km</strong> en condiciones colombianas.
                  </p>
                )}
                <p>
                  Compra en línea desde Bogotá, Medellín, Cali, Barranquilla, Bucaramanga,
                  Cartagena y todo el país. Compara precios entre distribuidores y elige
                  el modelo correcto para tu vehículo sin moverte del computador.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">
                    Más {product.marca}
                  </h3>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    <li>
                      <Link href={`/marketplace/brand/${brandSlug}`} className="hover:text-[#1E76B6] hover:underline">
                        Catálogo {product.marca}
                      </Link>
                    </li>
                    <li>
                      <Link href={`/marketplace?q=${encodeURIComponent(product.marca)}+tractomula`} className="hover:text-[#1E76B6] hover:underline">
                        {product.marca} para tractomula
                      </Link>
                    </li>
                    <li>
                      <Link href={`/marketplace?q=${encodeURIComponent(product.marca)}+camion`} className="hover:text-[#1E76B6] hover:underline">
                        {product.marca} para camión
                      </Link>
                    </li>
                    <li>
                      <Link href={`/marketplace?q=${encodeURIComponent(product.marca)}+camioneta`} className="hover:text-[#1E76B6] hover:underline">
                        {product.marca} para camioneta
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">
                    Misma medida
                  </h3>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    <li>
                      <Link href={`/marketplace?q=${dimEnc}`} className="hover:text-[#1E76B6] hover:underline">
                        Llantas {product.dimension}
                      </Link>
                    </li>
                    <li>
                      <Link href={`/marketplace?q=${dimEnc}+nueva`} className="hover:text-[#1E76B6] hover:underline">
                        {product.dimension} nuevas
                      </Link>
                    </li>
                    <li>
                      <Link href={`/marketplace?q=${dimEnc}+reencauche`} className="hover:text-[#1E76B6] hover:underline">
                        {product.dimension} reencauche
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">
                    En tu ciudad
                  </h3>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Cartagena"].map((c) => (
                      <li key={c}>
                        <Link
                          href={`/marketplace?q=${encodeURIComponent(`${product.marca} ${c}`)}`}
                          className="hover:text-[#1E76B6] hover:underline"
                        >
                          {product.marca} en {c}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Similar products */}
        {similar.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-1">También te puede interesar</p>
                <h2 className="text-xl sm:text-2xl font-black text-[#0A183A]">Productos similares</h2>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              {similar.map((l: any) => {
                const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
                const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                const p = hasPromo ? l.precioPromo : l.precioCop;
                return (
                  <Link
                    key={l.id}
                    href={`/marketplace/product/${l.id}`}
                    className="flex-shrink-0 snap-start bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all group border border-gray-100"
                    style={{ width: "min(70vw, 240px)" }}
                  >
                    <div
                      className="aspect-square flex items-center justify-center overflow-hidden"
                      style={{ background: "radial-gradient(circle at 30% 20%,#ffffff,#f0f7ff)" }}
                    >
                      {cover ? (
                        <img src={cover} alt={`${l.marca} ${l.modelo} ${l.dimension} — llanta en Colombia`} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform" />
                      ) : (
                        <Package className="w-10 h-10 text-gray-200" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] text-[#1E76B6] font-black uppercase tracking-widest">{l.marca}</p>
                      <p className="text-sm font-black text-[#0A183A] leading-snug truncate mt-0.5">{l.modelo}</p>
                      <p className="text-[11px] text-gray-400">{l.dimension}</p>
                      <p className="text-base font-black text-[#0A183A] mt-2">{fmtCOP(p)}</p>
                      {l.distributor && <p className="text-[9px] text-gray-400 mt-1 truncate">{l.distributor.name}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <MarketplaceFooter />

      {/* STICKY CTA — visible at every breakpoint. Comprar should never
          be more than a glance away, even on a long page on a wide
          monitor. Pads the main scroll area so the last block isn't
          hidden behind the bar. The spacer also accounts for the
          iPhone home-indicator safe area. */}
      <div
        aria-hidden
        style={{ height: "calc(5rem + env(safe-area-inset-bottom))" }}
      />
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md"
        style={{
          borderTop: "1px solid rgba(10,24,58,0.08)",
          boxShadow: "0 -8px 24px -12px rgba(10,24,58,0.18)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Two-tier layout:
            - mobile: price as a compact eyebrow row, then stepper + Comprar
              filling the full width below it. This avoids cramming three
              elements on a 360px screen and lets Comprar grow.
            - sm+: single row with thumb + identity at left, price + stepper
              + Comprar right-anchored. */}
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5">
          {/* Mobile-only price strip */}
          <div className="sm:hidden flex items-baseline justify-between gap-2 pb-1.5">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-[16px] font-black text-[#0A183A] leading-none truncate">{fmtCOP(price)}</span>
              {hasPromo && (
                <>
                  <span className="text-[11px] text-gray-400 line-through leading-none">{fmtCOP(product.precioCop)}</span>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider leading-none">-{discount}%</span>
                </>
              )}
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none flex-shrink-0">
              {product.marca} {product.dimension}
            </span>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* LEFT — thumb + identity. Hidden on mobile so the action
                cluster gets full width on phones. */}
            <div className="hidden sm:flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#fafafa] flex-shrink-0 flex items-center justify-center overflow-hidden">
                {imgs.length > 0 ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imgs[product.coverIndex ?? 0] ?? imgs[0]}
                    alt={`${product.marca} ${product.modelo}`}
                    className="max-w-full max-h-full object-contain p-1"
                  />
                ) : (
                  <Package className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest leading-none">{product.marca}</p>
                <p className="text-[13px] font-black text-[#0A183A] leading-tight truncate">{product.modelo}</p>
                <p className="text-[10px] text-gray-400 leading-none">{product.dimension}</p>
              </div>
            </div>

            {/* RIGHT cluster — full-width on mobile (so Comprar can stretch),
                right-anchored on sm+. */}
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto sm:ml-auto">
              {/* Price block — desktop only; mobile uses the strip above */}
              <div className="hidden sm:block text-right">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                  {hasPromo ? `-${discount}% · Promoción` : "Precio"}
                </p>
                <p className="text-[16px] sm:text-[18px] font-black text-[#0A183A] leading-tight">{fmtCOP(price)}</p>
                {hasPromo && (
                  <p className="text-[10px] text-gray-400 line-through leading-none">{fmtCOP(product.precioCop)}</p>
                )}
              </div>

              {/* Stepper. Compact on mobile so the bar fits 360px screens. */}
              <div
                className="flex items-center rounded-full overflow-hidden bg-white flex-shrink-0"
                style={{ border: "1px solid rgba(10,24,58,0.12)" }}
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || product.cantidadDisponible === 0}
                  aria-label="Restar uno"
                  className="w-8 sm:w-9 h-9 flex items-center justify-center text-[#0A183A] disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={Math.max(1, product.cantidadDisponible || 1)}
                  value={qty}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isFinite(n) && n > 0) {
                      setQty(Math.min(n, product.cantidadDisponible || n));
                    } else if (e.target.value === "") {
                      setQty(1);
                    }
                  }}
                  aria-label="Cantidad"
                  className="w-9 sm:w-12 h-9 text-center text-sm font-black text-[#0A183A] bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQty((q) =>
                      product.cantidadDisponible > 0
                        ? Math.min(q + 1, product.cantidadDisponible)
                        : q + 1,
                    )
                  }
                  disabled={
                    product.cantidadDisponible === 0 ||
                    (product.cantidadDisponible > 0 && qty >= product.cantidadDisponible)
                  }
                  aria-label="Sumar uno"
                  className="w-8 sm:w-9 h-9 flex items-center justify-center text-[#0A183A] disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Comprar — fills remaining width on mobile, fixed on sm+. */}
              <button
                onClick={handleAddToCart}
                disabled={product.cantidadDisponible === 0}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-sm font-black text-white transition-all disabled:opacity-50 whitespace-nowrap min-w-0"
                style={{
                  background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                  boxShadow: "0 8px 22px -6px rgba(30,118,182,0.5)",
                }}
              >
                <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {product.cantidadDisponible === 0
                    ? "Agotada"
                    : addedToCart
                      ? "Agregada"
                      : qty > 1
                        ? `Comprar ${qty}`
                        : "Comprar"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
