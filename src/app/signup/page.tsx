"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Truck, BarChart3, ArrowRight, Check } from "lucide-react";

export default function SignupChooser() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8">
        <Image src="/logo_full.png" alt="TirePro" width={130} height={39} className="h-9 w-auto" />
      </Link>

      <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] text-center mb-2">Crea tu cuenta</h1>
      <p className="text-sm text-gray-400 text-center mb-8 max-w-md">Elige como quieres usar TirePro</p>

      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Marketplace only */}
        <Link href="/register"
          className="group relative rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1"
          style={{ border: "2px solid #e5e5e5" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#f0f7ff" }}>
            <ShoppingCart className="w-6 h-6 text-[#1E76B6]" />
          </div>
          <h2 className="text-lg font-black text-[#0A183A] mb-1">Marketplace</h2>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Compra llantas, compara precios y recibe ofertas de distribuidores.
          </p>
          <ul className="space-y-1.5 mb-5">
            {["Comprar llantas", "Comparar precios", "Carrito de compras", "Historial de pedidos"].map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Check className="w-3 h-3 text-[#1E76B6] flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1 text-[12px] font-semibold text-[#1E76B6] group-hover:gap-2 transition-all">
            Crear cuenta gratis <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1E76B6]/10 text-[#1E76B6]">Gratis</span>
        </Link>

        {/* Full platform */}
        <Link href="/companyregister"
          className="group relative rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1"
          style={{ border: "2px solid #1E76B6", background: "linear-gradient(180deg, #f0f7ff 0%, white 40%)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#0A183A" }}>
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-black text-[#0A183A] mb-1">Flota + Marketplace</h2>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Controla tus llantas, reduce costos y compra en el marketplace.
          </p>
          <ul className="space-y-1.5 mb-5">
            {["Todo del Marketplace", "Gestion de llantas", "CPK e inspecciones", "Agentes IA", "Inventario", "Reportes"].map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Check className="w-3 h-3 text-[#0A183A] flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1 text-[12px] font-semibold text-[#0A183A] group-hover:gap-2 transition-all">
            Registrar empresa <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#0A183A] text-white">Recomendado</span>
        </Link>

        {/* Distributor */}
        <Link href="/companyregister?plan=distribuidor"
          className="group relative rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1"
          style={{ border: "2px solid #e5e5e5" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#f5f0ff" }}>
            <Truck className="w-6 h-6 text-[#8b5cf6]" />
          </div>
          <h2 className="text-lg font-black text-[#0A183A] mb-1">Distribuidor</h2>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Vende llantas, gestiona pedidos y llega a flotas en Colombia.
          </p>
          <ul className="space-y-1.5 mb-5">
            {["Pagina de distribuidor", "Catalogo de productos", "Gestion de ventas", "Licitaciones", "Mapa de cobertura"].map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Check className="w-3 h-3 text-[#8b5cf6] flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1 text-[12px] font-semibold text-[#8b5cf6] group-hover:gap-2 transition-all">
            Registrar distribuidor <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">Gratis</span>
        </Link>
      </div>

      <p className="text-xs text-gray-400 text-center mt-8">
        ¿Ya tienes cuenta? <Link href="/login" className="text-[#1E76B6] font-semibold hover:underline">Ingresar</Link>
      </p>
    </div>
  );
}
