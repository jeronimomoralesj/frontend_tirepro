"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShoppingCart, Loader2, Package, Truck, MapPin, Phone,
  Mail, Globe, Star, Clock, CheckCircle, Shield, Recycle, ChevronLeft,
  ChevronRight, Minus, Plus, X, Check, Search, Zap,
} from "lucide-react";
import { useCart } from "../../../../lib/useCart";
import { MarketplaceNav, MarketplaceFooter } from "../../../../components/MarketplaceShell";

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
  distributor: { id: string; name: string; profileImage: string; ciudad: string | null; telefono: string | null; emailAtencion: string | null; tipoEntrega: string | null; cobertura: any[] | null };
  catalog: { terreno: string | null; reencauchable: boolean; kmEstimadosReales: number | null; cpkEstimado: number | null; crowdAvgCpk: number | null; psiRecomendado: number | null; rtdMm: number | null } | null;
  reviews: Review[];
  _count: { reviews: number };
  totalSold?: number;
}

export default function ProductClient({ initialProduct }: { initialProduct?: Product | null }) {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [loading, setLoading] = useState(!initialProduct);
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [similar, setSimilar] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  // Vehicle recommendation
  const [vrPlaca, setVrPlaca] = useState("");
  const [vrLoading, setVrLoading] = useState(false);
  const [vrResult, setVrResult] = useState<{ positions: string[]; reason: string } | null>(null);
  const [vrError, setVrError] = useState("");
  const cart = useCart();

  useEffect(() => {
    if (!id || initialProduct) return;
    setLoading(true);
    fetch(`${API_BASE}/marketplace/product/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setProduct(d); if (d) setSelectedImg(d.coverIndex ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch similar products
  useEffect(() => {
    if (!product) return;
    fetch(`${API_BASE}/marketplace/listings?dimension=${encodeURIComponent(product.dimension)}&limit=5&sortBy=price_asc`)
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((d) => setSimilar((d.listings ?? []).filter((l: any) => l.id !== product.id).slice(0, 4)))
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
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center">
      <Package className="w-12 h-12 text-gray-300 mb-3" />
      <p className="text-lg font-bold text-[#0A183A]">Producto no encontrado</p>
      <Link href="/marketplace" className="mt-4 text-sm font-bold text-[#1E76B6] hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Volver al marketplace
      </Link>
    </div>
  );

  const imgs = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const hasPromo = product.precioPromo != null && product.promoHasta && new Date(product.promoHasta) > new Date();
  const price = hasPromo ? product.precioPromo! : product.precioCop;

  const discount = hasPromo ? Math.round(((product.precioCop - product.precioPromo!) / product.precioCop) * 100) : 0;
  const cpk = product.catalog?.crowdAvgCpk ?? product.catalog?.cpkEstimado;
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

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
          <Link href="/marketplace" className="hover:text-[#1E76B6] transition-colors">Marketplace</Link>
          <span className="text-gray-300">/</span>
          <Link href={`/marketplace/distributor/${product.distributor.id}`} className="hover:text-[#1E76B6] transition-colors">{product.distributor.name}</Link>
          <span className="text-gray-300">/</span>
          <span className="text-[#0A183A]">{product.modelo}</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* LEFT — Images */}
          <div className="sticky top-20 self-start">
            <div className="aspect-square rounded-3xl overflow-hidden bg-[#f5f5f7] flex items-center justify-center mb-4">
              {imgs.length > 0 ? (
                <img src={imgs[selectedImg] ?? imgs[0]} alt={product.modelo} className="w-full h-full object-contain p-10 sm:p-12" />
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
                    <img src={url} alt="" className="w-full h-full object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Details */}
          <div className="pt-2">
            <p className="text-[13px] font-semibold text-[#1E76B6] tracking-wide">{product.marca}</p>
            <h1 className="text-2xl sm:text-[32px] font-black text-[#0A183A] mt-1 leading-[1.15] tracking-tight">{product.modelo}</h1>
            <p className="text-[15px] text-gray-500 mt-2">{product.dimension}{product.eje ? ` · Eje ${product.eje}` : ""}</p>

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

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-[34px] font-black text-[#0A183A] tracking-tight">{fmtCOP(price)}</span>
              {hasPromo && (
                <>
                  <span className="text-lg text-gray-300 line-through">{fmtCOP(product.precioCop)}</span>
                  <span className="text-xs font-bold text-[#1E76B6] bg-[#1E76B6]/8 px-2.5 py-1 rounded-full">-{discount}%</span>
                </>
              )}
            </div>
            {product.incluyeIva && <p className="text-xs text-gray-400 mt-0.5">IVA incluido</p>}

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{
                background: product.tipo === "reencauche" ? "#f3e8ff" : "#dbeafe",
                color: product.tipo === "reencauche" ? "#7c3aed" : "#1d4ed8",
              }}>
                {product.tipo === "reencauche" ? "Reencauche" : "Llanta Nueva"}
              </span>
              {product.catalog?.terreno && <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{product.catalog.terreno}</span>}
              {product.catalog?.reencauchable && <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">Reencauchable</span>}
              {cpk != null && cpk > 0 && <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">CPK {fmtCOP(Math.round(cpk))}</span>}
              {product.tiempoEntrega && <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{product.tiempoEntrega}</span>}
            </div>

            {/* Description */}
            {product.descripcion && (
              <p className="text-sm text-gray-600 mt-4 leading-relaxed">{product.descripcion}</p>
            )}

            {/* Specs */}
            {product.catalog && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {product.catalog.rtdMm != null && <div className="px-4 py-3 rounded-2xl bg-[#f5f5f7]"><p className="text-[10px] text-gray-400 font-medium">Prof. inicial</p><p className="text-[15px] font-semibold text-[#0A183A] mt-0.5">{product.catalog.rtdMm} mm</p></div>}
                {product.catalog.kmEstimadosReales != null && <div className="px-4 py-3 rounded-2xl bg-[#f5f5f7]"><p className="text-[10px] text-gray-400 font-medium">Km estimados</p><p className="text-[15px] font-semibold text-[#0A183A] mt-0.5">{(product.catalog.kmEstimadosReales / 1000).toFixed(0)}K km</p></div>}
                {product.catalog.psiRecomendado != null && <div className="px-4 py-3 rounded-2xl bg-[#f5f5f7]"><p className="text-[10px] text-gray-400 font-medium">Presion rec.</p><p className="text-[15px] font-semibold text-[#0A183A] mt-0.5">{product.catalog.psiRecomendado} PSI</p></div>}
                {cpk != null && cpk > 0 && <div className="px-4 py-3 rounded-2xl bg-[#f0f7ff]"><p className="text-[10px] text-[#1E76B6] font-medium">CPK promedio</p><p className="text-[15px] font-semibold text-[#1E76B6] mt-0.5">{fmtCOP(Math.round(cpk))}/km</p></div>}
              </div>
            )}

            {/* Quantity + Order */}
            <div className="mt-6">
              <div className="flex items-center gap-4 mb-5">
                <span className="text-[13px] font-medium text-gray-500">Cantidad</span>
                <div className="flex items-center rounded-full overflow-hidden" style={{ border: "1.5px solid #e5e5e5" }}>
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3.5 py-2 hover:bg-[#f0f7ff] transition-colors"><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                  <span className="px-5 py-2 text-[14px] font-semibold text-[#0A183A]" style={{ borderLeft: "1.5px solid #e5e5e5", borderRight: "1.5px solid #e5e5e5" }}>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="px-3.5 py-2 hover:bg-[#f0f7ff] transition-colors"><Plus className="w-3.5 h-3.5 text-gray-500" /></button>
                </div>
                {qty > 1 && <span className="text-[15px] font-semibold text-[#0A183A] ml-auto">{fmtCOP(price * qty)}</span>}
              </div>

              <button onClick={handleAddToCart}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#1E76B6]/25 active:scale-[0.98]"
                style={{ background: "#1E76B6" }}>
                Agregar al carrito
              </button>
              {cart.count > 0 && (
                <Link href="/marketplace/cart"
                  className="w-full mt-2.5 py-3.5 rounded-2xl text-[14px] font-semibold text-[#1E76B6] border-2 border-[#1E76B6]/15 hover:bg-[#f0f7ff] flex items-center justify-center gap-2 transition-colors">
                  Ver carrito ({cart.count})
                </Link>
              )}
            </div>

            {/* Distributor info */}
            <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-200">
              <Link href={`/marketplace/distributor/${product.distributor.id}`} className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                  {product.distributor.profileImage && product.distributor.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png"
                    ? <img src={product.distributor.profileImage} alt="" className="max-w-full max-h-full object-contain" />
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
            <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Recycle className="w-4 h-4 text-purple-500" />
                <p className="text-sm font-bold text-[#0A183A]">Indice de Reencauchabilidad</p>
              </div>
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
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        {reencauchable
                          ? <><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /><span className="text-gray-600">Casco reencauchable — puede tener hasta 3 vidas adicionales</span></>
                          : <><X className="w-3 h-3 text-red-400 flex-shrink-0" /><span className="text-gray-400">No reencauchable segun fabricante</span></>}
                      </div>
                      {rtd > 0 && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: rtd >= 18 ? "#22c55e" : rtd >= 14 ? "#f59e0b" : "#ef4444" }} />
                          <span className="text-gray-600">Profundidad inicial: {rtd}mm {rtd >= 18 ? "(optima para reencauche)" : rtd >= 14 ? "(adecuada)" : "(limitada)"}</span>
                        </div>
                      )}
                      {kmEst > 0 && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: kmEst >= 150000 ? "#22c55e" : "#f59e0b" }} />
                          <span className="text-gray-600">{(kmEst / 1000).toFixed(0)}K km estimados por vida</span>
                        </div>
                      )}
                      {isReencauche && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <Recycle className="w-3 h-3 text-purple-500 flex-shrink-0" />
                          <span className="text-gray-600">Este producto ya es un reencauche — ahorro estimado vs nueva: ~40%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ═══ VEHICLE COMPATIBILITY ═══ */}
            <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-[#1E76B6]" />
                <p className="text-sm font-bold text-[#0A183A]">Vehiculos compatibles</p>
              </div>
              {(() => {
                const dim = product.dimension;
                const eje = product.eje;
                const terreno = product.catalog?.terreno;

                // Map dimension patterns to vehicle types
                const COMPAT: { dim: RegExp; vehicles: { name: string; icon: string; positions: string }[] }[] = [
                  { dim: /22\.5/, vehicles: [
                    { name: "Tractomula (cabezote)", icon: "🚛", positions: eje === "direccion" ? "Eje delantero (P1, P2)" : eje === "traccion" ? "Ejes traseros (P3-P6)" : "Todas las posiciones" },
                    { name: "Trailer 3 ejes", icon: "📦", positions: eje === "libre" || !eje ? "Todos los ejes" : `Eje de ${eje}` },
                    { name: "Bus interurbano", icon: "🚌", positions: eje === "direccion" ? "Eje direccional" : "Ejes de traccion" },
                  ]},
                  { dim: /19\.5/, vehicles: [
                    { name: "Camion mediano", icon: "🚚", positions: eje === "direccion" ? "Eje delantero" : "Eje trasero" },
                    { name: "Bus urbano", icon: "🚌", positions: "Todos los ejes" },
                  ]},
                  { dim: /17\.5/, vehicles: [
                    { name: "Camion liviano", icon: "🚚", positions: eje === "direccion" ? "Eje delantero" : "Todas las posiciones" },
                    { name: "Furgon", icon: "📦", positions: "Todos los ejes" },
                  ]},
                  { dim: /24\.5/, vehicles: [
                    { name: "Volqueta", icon: "🚛", positions: eje === "traccion" ? "Ejes de traccion" : "Eje direccional" },
                    { name: "Mixer (mezcladora)", icon: "🏗️", positions: "Ejes de carga" },
                  ]},
                  { dim: /20/, vehicles: [
                    { name: "Camion pesado", icon: "🚛", positions: eje === "direccion" ? "Eje delantero" : "Ejes traseros" },
                    { name: "Bus intermunicipal", icon: "🚌", positions: "Todos los ejes" },
                  ]},
                ];

                const matches = COMPAT.filter((c) => c.dim.test(dim));
                const vehicles = matches.length > 0
                  ? matches.flatMap((m) => m.vehicles)
                  : [
                    { name: "Vehiculo de carga", icon: "🚛", positions: eje ? `Eje de ${eje}` : "Consultar posicion" },
                    { name: "Bus / transporte", icon: "🚌", positions: eje ? `Eje de ${eje}` : "Consultar posicion" },
                  ];

                return (
                  <div className="space-y-2">
                    {vehicles.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(30,118,182,0.03)", border: "1px solid rgba(30,118,182,0.08)" }}>
                        <span className="text-lg flex-shrink-0">{v.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0A183A]">{v.name}</p>
                          <p className="text-[10px] text-gray-500">{v.positions}</p>
                        </div>
                      </div>
                    ))}
                    {terreno && (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Optimizada para terreno: <span className="font-bold text-gray-600">{terreno}</span>
                      </p>
                    )}
                    {eje && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-[#1E76B6]" />
                        Posicion recomendada: <span className="font-bold text-gray-600">Eje de {eje}</span>
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ═══ VEHICLE RECOMMENDATION AGENT ═══ */}
            <div className="mt-6 p-4 rounded-2xl border border-gray-200" style={{ background: "linear-gradient(135deg, rgba(10,24,58,0.03), rgba(30,118,182,0.03))" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#ef4444" }}>
                  <Shield className="w-3 h-3 text-white" />
                </div>
                <p className="text-sm font-bold text-[#0A183A]">Agente SENTINEL</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444]">IA</span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Ingresa la placa de tu vehiculo y te recomendamos donde instalar esta llanta.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={vrPlaca}
                  onChange={(e) => setVrPlaca(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC123"
                  maxLength={6}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#ef4444]/20 focus:border-[#ef4444] text-[#0A183A] placeholder-gray-400 uppercase"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  disabled={vrPlaca.length < 3 || vrLoading}
                  onClick={async () => {
                    setVrLoading(true); setVrError(""); setVrResult(null);
                    try {
                      const token = localStorage.getItem("token") ?? "";
                      if (!token) { setVrError("Inicia sesion para usar el agente"); setVrLoading(false); return; }
                      // Fetch vehicle tires
                      const vRes = await fetch(`${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(vrPlaca)}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (!vRes.ok) { setVrError("Vehiculo no encontrado"); setVrLoading(false); return; }
                      const vehicle = await vRes.json();
                      const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${vehicle.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const tires: any[] = tRes.ok ? await tRes.json() : [];

                      // Analyze — which positions would this tire work for?
                      const tireEje = product.eje;
                      const tireDimension = product.dimension;
                      const positions: string[] = [];
                      const reasons: string[] = [];

                      // Check empty positions
                      const occupiedPos = new Set(tires.map((t: any) => t.posicion));
                      const maxPos = Math.max(0, ...tires.map((t: any) => t.posicion), 6);

                      for (let p = 1; p <= maxPos; p++) {
                        if (!occupiedPos.has(p)) {
                          positions.push(`P${p} (vacia)`);
                        }
                      }

                      // Check positions where current tire is worn
                      tires.forEach((t: any) => {
                        const depth = t.currentProfundidad ?? 99;
                        const matchesDim = t.dimension === tireDimension;
                        const matchesEje = !tireEje || t.eje === tireEje || tireEje === "libre";

                        if (depth <= 4 && matchesDim && matchesEje) {
                          positions.push(`P${t.posicion} (reemplazar ${t.marca} — ${depth.toFixed(1)}mm)`);
                          reasons.push(`La llanta en P${t.posicion} tiene solo ${depth.toFixed(1)}mm y necesita reemplazo.`);
                        } else if (depth <= 6 && matchesDim && matchesEje) {
                          reasons.push(`P${t.posicion}: ${t.marca} a ${depth.toFixed(1)}mm — considerar reemplazo pronto.`);
                        }
                      });

                      if (!tireEje || tireEje === "libre") {
                        reasons.push(`Esta llanta es para eje ${tireEje ?? "no especificado"} — compatible con multiples posiciones.`);
                      } else {
                        reasons.push(`Llanta de eje ${tireEje} — instalar solo en posiciones de ${tireEje}.`);
                      }

                      if (positions.length === 0) {
                        reasons.unshift("No hay posiciones criticas que necesiten esta llanta en este momento.");
                      }

                      setVrResult({
                        positions,
                        reason: reasons.join(" "),
                      });
                    } catch { setVrError("Error al analizar el vehiculo"); }
                    setVrLoading(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 flex-shrink-0"
                  style={{ background: "#ef4444" }}>
                  {vrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-3.5 h-3.5 inline mr-1" />Analizar</>}
                </button>
              </div>

              {vrError && <p className="text-xs text-red-500 font-bold mt-2">{vrError}</p>}

              {vrResult && (
                <div className="mt-3 p-3 rounded-xl bg-white border border-gray-100">
                  {vrResult.positions.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-[#0A183A] uppercase tracking-wider mb-1.5">Posiciones recomendadas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vrResult.positions.map((p, i) => (
                          <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#ef4444]/10 text-[#ef4444]">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-600 leading-relaxed">{vrResult.reason}</p>
                </div>
              )}
            </div>
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
                        if (res.ok) { setReviewSuccess(true); setReviewComment(""); }
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
        {/* Similar products */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-black text-[#0A183A] mb-4">Productos similares</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {similar.map((l: any) => {
                const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
                const cover = imgs.length > 0 ? imgs[l.coverIndex ?? 0] ?? imgs[0] : null;
                const hasPromo = l.precioPromo != null && l.promoHasta && new Date(l.promoHasta) > new Date();
                const p = hasPromo ? l.precioPromo : l.precioCop;
                return (
                  <Link key={l.id} href={`/marketplace/product/${l.id}`}
                    className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-all group border border-gray-100">
                    <div className="aspect-square flex items-center justify-center bg-[#fafafa] overflow-hidden">
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
                      ) : (
                        <Package className="w-8 h-8 text-gray-200" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-gray-400 uppercase">{l.marca}</p>
                      <p className="text-xs font-bold text-[#0A183A] leading-snug truncate">{l.modelo}</p>
                      <p className="text-[10px] text-gray-400">{l.dimension}</p>
                      <p className="text-sm font-black text-[#0A183A] mt-1">{fmtCOP(p)}</p>
                      {l.distributor && <p className="text-[9px] text-gray-400 mt-1">{l.distributor.name}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <MarketplaceFooter />

    </div>
  );
}
