"use client";

import React, { useState, lazy, Suspense } from "react";
import { ShoppingCart, Bell, Settings, BarChart3, Calendar, Trash2, Loader2 } from "lucide-react";
import PedidosTab from "./components/PedidosTab";
import NotificacionesTab from "./components/NotificacionesTab";
import AjustesTab from "./components/AjustesTab";

const DesechosPage = lazy(() => import("../desechos/page"));


const TABS = [
  { key: "pedidos",         label: "Pedidos",         icon: ShoppingCart },
  { key: "notificaciones",  label: "Notificaciones",  icon: Bell },
  { key: "desechos",        label: "Desechos",        icon: Trash2 },
  { key: "ajustes",         label: "Ajustes",         icon: Settings },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AnalistaPage() {
  const [active, setActive] = useState<TabKey>("pedidos");

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
              Analista Inteligente
            </h1>
            <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Motor de decisiones para tu flota
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all"
                style={{
                  background: isActive ? "#0A183A" : "transparent",
                  color: isActive ? "#fff" : "#173D68",
                  border: isActive ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)",
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {active === "pedidos" && <PedidosTab />}
        {active === "notificaciones" && <NotificacionesTab />}
        {active === "desechos" && (
          <Suspense fallback={<div className="flex items-center justify-center py-20 text-[#1E76B6]"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
            <DesechosPage />
          </Suspense>
        )}
        {active === "ajustes" && <AjustesTab />}
      </div>

    </div>
  );
}
