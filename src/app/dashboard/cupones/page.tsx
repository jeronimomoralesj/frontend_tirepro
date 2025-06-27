// app/(tabs)/cupones/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Calendar,
  Tag,
  Gift,
  Battery,
  Fuel,
  Wrench,
  Car,
} from "lucide-react";

// — UI labels only —
const UI = {
  title: "Ofertas Especiales",
  subtitle: "Descuentos exclusivos para ti",
  categories: {
    all: "Todos",
    llantas: "Llantas",
    reencauches: "Reencauches",
    baterias: "Baterías",
    gasolina: "Gasolina",
    aceites: "Aceites",
  },
  couponDetails: {
    code: "Código",
    validUntil: "Válido hasta",
    copied: "¡Copiado!",
  },
  stats: { coupons: "Cupones" },
  loading: "Cargando...",
  errorFetch: "Error al cargar ofertas",
  noCoupons: "No hay cupones disponibles",
} as const;

type Coupon = {
  id: string;
  titleKey: string;         // actual title text from server
  descriptionKey: string;   // actual description text from server
  discount: string;
  category: "llantas" | "reencauches" | "baterias" | "gasolina" | "aceites";
  validUntil: string;       // ISO date
  code: string;
  color: string;            // tailwind gradient or hex
};

// Pick icon per category
const getIcon = (cat: Coupon["category"]) =>
  ({
    llantas: Car,
    reencauches: Gift,
    baterias: Battery,
    gasolina: Fuel,
    aceites: Wrench,
  }[cat] || Tag);

export default function CuponesPage() {
  const [filter, setFilter] = useState<"all" | Coupon["category"]>("all");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch from real backend on mount
  useEffect(() => {
    let cancelled = false;
    const fetchCoupons = async () => {
      setLoading(true);
      setError(null);

      const base =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
        "http://localhost:6001";
      try {
        const res = await fetch(`${base}/api/coupons`);
        if (!res.ok) throw new Error(`Error del servidor (${res.status})`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Formato inesperado");
        if (!cancelled) setCoupons(data);
      } catch (err: any) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : UI.errorFetch);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCoupons();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered list
  const visible =
    filter === "all"
      ? coupons
      : coupons.filter((c) => c.category === filter);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const CATS = [
    { id: "all", name: UI.categories.all, icon: Tag },
    { id: "llantas", name: UI.categories.llantas, icon: Car },
    { id: "reencauches", name: UI.categories.reencauches, icon: Gift },
    { id: "baterias", name: UI.categories.baterias, icon: Battery },
    { id: "gasolina", name: UI.categories.gasolina, icon: Fuel },
    { id: "aceites", name: UI.categories.aceites, icon: Wrench },
  ] as const;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">{UI.loading}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">{UI.title}</h1>
          <p className="text-xl text-gray-600">{UI.subtitle}</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {CATS.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilter(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
                filter === id
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
              }`}
            >
              <Icon className="w-4 h-4" /> <span>{name}</span>
            </button>
          ))}
        </div>

        {/* Coupons grid / empty */}
        {visible.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="text-gray-500 text-lg">{UI.noCoupons}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {visible.map((c) => (
              <CouponCard key={c.id} coupon={c} onCopy={copyCode} />
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="text-center">
          <div className="inline-block bg-white rounded-2xl shadow p-6">
            <div className="text-3xl font-bold text-blue-500 mb-1">
              {visible.length}
            </div>
            <div className="text-gray-600">{UI.stats.coupons}</div>
          </div>
        </div>

        {/* Copy toast */}
        {copied && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50">
            {UI.couponDetails.copied}
          </div>
        )}
      </div>
    </div>
  );
}

function CouponCard({
  coupon,
  onCopy,
}: {
  coupon: Coupon;
  onCopy: (code: string) => void;
}) {
  const Icon = getIcon(coupon.category);
  const isGradient = coupon.color.includes(" ");
  const style = !isGradient ? { backgroundColor: coupon.color } : undefined;

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105">
      <div
        className={`p-6 text-white relative ${
          isGradient ? "bg-gradient-to-br " + coupon.color : ""
        }`}
        style={style}
      >
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />

        {/* Icon + discount */}
        <div className="flex justify-between items-start mb-4 z-10">
          <div className="p-2 bg-white/20 rounded-lg">
            <Icon className="w-6 h-6" />
          </div>
          <div className="bg-white/90 text-gray-900 px-3 py-1 rounded-full font-bold text-sm">
            {coupon.discount}
          </div>
        </div>

        {/* Title & Description */}
        <div className="z-10 mb-4">
          <h3 className="text-lg font-bold mb-1">{coupon.titleKey}</h3>
          <p className="text-white/90 text-sm">{coupon.descriptionKey}</p>
        </div>

        {/* Footer */}
        <div className="z-10 border-t border-white/20 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-xs">{UI.couponDetails.code}</span>
            <button
              onClick={() => onCopy(coupon.code)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition"
            >
              <Copy className="w-3 h-3" />
              <span className="font-mono text-xs">{coupon.code}</span>
            </button>
          </div>
          <div className="flex items-center text-white/70 text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            {UI.couponDetails.validUntil}{" "}
            {new Date(coupon.validUntil).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
