"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShoppingCart, Loader2, Package, Truck, MapPin, Phone,
  Mail, Globe, Star, Clock, CheckCircle, Shield, Recycle, ChevronLeft,
  ChevronRight, Minus, Plus, X,
} from "lucide-react";

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
  distributor: { id: string; name: string; profileImage: string; ciudad: string | null; telefono: string | null; emailAtencion: string | null; tipoEntrega: string | null; cobertura: string[] | null };
  catalog: { terreno: string | null; reencauchable: boolean; kmEstimadosReales: number | null; cpkEstimado: number | null; crowdAvgCpk: number | null; psiRecomendado: number | null; rtdMm: number | null } | null;
  reviews: Review[];
  _count: { reviews: number };
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [showOrder, setShowOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({ buyerName: "", buyerEmail: "", buyerPhone: "", buyerAddress: "", buyerCity: "", buyerCompany: "", notas: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Try to pre-fill from logged in user
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (user.name) setOrderForm((f) => ({ ...f, buyerName: user.name, buyerEmail: user.email ?? "" }));
    } catch { /* guest */ }
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/marketplace/product/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setProduct(d); if (d) setSelectedImg(d.coverIndex ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleOrder() {
    if (!product || !orderForm.buyerName || !orderForm.buyerEmail) return;
    setSubmitting(true);
    try {
      let userId: string | undefined;
      try { userId = JSON.parse(localStorage.getItem("user") ?? "{}").id; } catch { /* guest */ }
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`${API_BASE}/marketplace/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ listingId: product.id, quantity: qty, userId, ...orderForm }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrderId(data.id?.slice(0, 8).toUpperCase() ?? "");
        setOrderSuccess(true);
      }
    } catch { /* */ }
    setSubmitting(false);
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

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A] placeholder-gray-400";

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href="/marketplace" className="flex items-center gap-2 text-sm font-bold text-[#555] hover:text-[#0A183A]">
            <ArrowLeft className="w-4 h-4" /> Marketplace
          </Link>
          <div className="flex-1" />
          <Link href="/marketplace" className="flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-[#1E76B6]" />
            <span className="text-xs font-bold text-[#0A183A] hidden sm:block">TirePro</span>
          </Link>
        </div>
      </header>

      {/* Order success overlay */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-black text-[#0A183A] mb-2">Pedido Confirmado</h2>
            <p className="text-sm text-gray-500 mb-1">Pedido #{orderId}</p>
            <p className="text-sm text-gray-500 mb-6">Te enviamos un email de confirmacion. El distribuidor se comunicara contigo.</p>
            <div className="flex gap-3">
              <Link href="/marketplace" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#1E76B6] border border-gray-200 hover:bg-gray-50 text-center">
                Seguir comprando
              </Link>
              <button onClick={() => setOrderSuccess(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* LEFT — Images */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-white flex items-center justify-center mb-3" style={{ border: "1px solid #e5e5e5" }}>
              {imgs.length > 0 ? (
                <img src={imgs[selectedImg] ?? imgs[0]} alt={product.modelo} className="w-full h-full object-contain p-8" />
              ) : (
                <Package className="w-20 h-20 text-gray-200" />
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imgs.map((url, i) => (
                  <button key={i} onClick={() => setSelectedImg(i)}
                    className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all"
                    style={{ border: i === selectedImg ? "2px solid #1E76B6" : "2px solid #e5e5e5", opacity: i === selectedImg ? 1 : 0.6 }}>
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Details + Order */}
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-3">
              <Link href="/marketplace" className="hover:text-[#1E76B6]">Marketplace</Link>
              <span>/</span>
              <Link href={`/marketplace/distributor/${product.distributor.id}`} className="hover:text-[#1E76B6]">{product.distributor.name}</Link>
              <span>/</span>
              <span className="text-gray-600">{product.modelo}</span>
            </div>

            <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">{product.marca}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] mt-1 leading-tight">{product.modelo}</h1>
            <p className="text-sm text-gray-500 mt-1">{product.dimension}{product.eje ? ` · Eje ${product.eje}` : ""}</p>

            {/* Stars */}
            {product._count.reviews > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4" fill={s <= Math.round(avgRating) ? "#f59e0b" : "none"} style={{ color: s <= Math.round(avgRating) ? "#f59e0b" : "#d1d5db" }} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{avgRating.toFixed(1)} ({product._count.reviews} resena{product._count.reviews !== 1 ? "s" : ""})</span>
              </div>
            )}

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black text-[#0A183A]">{fmtCOP(price)}</span>
              {hasPromo && (
                <>
                  <span className="text-lg text-gray-400 line-through">{fmtCOP(product.precioCop)}</span>
                  <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">-{discount}%</span>
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
              <div className="mt-4 grid grid-cols-2 gap-2">
                {product.catalog.rtdMm && <div className="px-3 py-2 rounded-lg bg-white border border-gray-100"><p className="text-[9px] text-gray-400 uppercase">Prof. inicial</p><p className="text-sm font-bold text-[#0A183A]">{product.catalog.rtdMm} mm</p></div>}
                {product.catalog.kmEstimadosReales && <div className="px-3 py-2 rounded-lg bg-white border border-gray-100"><p className="text-[9px] text-gray-400 uppercase">Km estimados</p><p className="text-sm font-bold text-[#0A183A]">{(product.catalog.kmEstimadosReales / 1000).toFixed(0)}K km</p></div>}
                {product.catalog.psiRecomendado && <div className="px-3 py-2 rounded-lg bg-white border border-gray-100"><p className="text-[9px] text-gray-400 uppercase">Presion rec.</p><p className="text-sm font-bold text-[#0A183A]">{product.catalog.psiRecomendado} PSI</p></div>}
                {cpk != null && cpk > 0 && <div className="px-3 py-2 rounded-lg bg-white border border-gray-100"><p className="text-[9px] text-gray-400 uppercase">CPK promedio</p><p className="text-sm font-bold text-emerald-600">{fmtCOP(Math.round(cpk))}/km</p></div>}
              </div>
            )}

            {/* Quantity + Order */}
            <div className="mt-6 p-5 rounded-2xl bg-white border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-bold text-[#0A183A]">Cantidad:</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-gray-50"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="px-4 py-2 text-sm font-bold text-[#0A183A] border-x border-gray-200">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="px-3 py-2 hover:bg-gray-50"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <span className="text-lg font-black text-[#0A183A] ml-auto">{fmtCOP(price * qty)}</span>
              </div>

              {!showOrder ? (
                <button onClick={() => setShowOrder(true)}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                  Ordenar ahora
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Nombre *</label>
                      <input type="text" value={orderForm.buyerName} onChange={(e) => setOrderForm((f) => ({ ...f, buyerName: e.target.value }))}
                        placeholder="Tu nombre" className={inputCls} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Email *</label>
                      <input type="email" value={orderForm.buyerEmail} onChange={(e) => setOrderForm((f) => ({ ...f, buyerEmail: e.target.value }))}
                        placeholder="tu@email.com" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Telefono</label>
                      <input type="tel" value={orderForm.buyerPhone} onChange={(e) => setOrderForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                        placeholder="+57 300..." className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Ciudad</label>
                      <input type="text" value={orderForm.buyerCity} onChange={(e) => setOrderForm((f) => ({ ...f, buyerCity: e.target.value }))}
                        placeholder="Bogota" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Direccion de entrega</label>
                      <input type="text" value={orderForm.buyerAddress} onChange={(e) => setOrderForm((f) => ({ ...f, buyerAddress: e.target.value }))}
                        placeholder="Calle, carrera, barrio..." className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Empresa (opcional)</label>
                      <input type="text" value={orderForm.buyerCompany} onChange={(e) => setOrderForm((f) => ({ ...f, buyerCompany: e.target.value }))}
                        placeholder="Nombre de tu empresa" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Notas</label>
                      <textarea value={orderForm.notas} onChange={(e) => setOrderForm((f) => ({ ...f, notas: e.target.value }))}
                        rows={2} placeholder="Instrucciones especiales..." className={`${inputCls} resize-none`} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowOrder(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={handleOrder} disabled={submitting || !orderForm.buyerName || !orderForm.buyerEmail}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Confirmar — ${fmtCOP(price * qty)}`}
                    </button>
                  </div>
                </div>
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
                  {cobertura.slice(0, 6).map((c) => <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{c}</span>)}
                  {cobertura.length > 6 && <span className="text-[9px] text-gray-400">+{cobertura.length - 6}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews section */}
        {product.reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-black text-[#0A183A] mb-4">Resenas ({product._count.reviews})</h2>
            <div className="space-y-3">
              {product.reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5" fill={s <= r.rating ? "#f59e0b" : "none"} style={{ color: s <= r.rating ? "#f59e0b" : "#d1d5db" }} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-[#0A183A]">{r.user.name}</span>
                    <span className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleDateString("es-CO")}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 text-center border-t border-gray-200">
        <Link href="/marketplace" className="text-sm font-bold text-[#1E76B6] hover:underline">Volver al Marketplace</Link>
      </footer>
    </div>
  );
}
