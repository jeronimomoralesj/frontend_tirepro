"use client";

import React, { useState, lazy, Suspense } from "react";
import { ShoppingCart, Bell, Trash2, Loader2 } from "lucide-react";
import PedidosTab from "./components/PedidosTab";
import NotificacionesTab from "./components/NotificacionesTab";

const DesechosPage = lazy(() => import("../desechos/page"));

const TABS = [
  { key: "pedidos",         label: "Pedidos",         icon: ShoppingCart },
  { key: "notificaciones",  label: "Notificaciones",  icon: Bell },
  { key: "desechos",        label: "Desechos",        icon: Trash2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AnalistaPage() {
  const [active, setActive] = useState<TabKey>("pedidos");

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-4"
        style={{
          background: "rgba(248,250,252,0.85)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          borderBottom: "1px solid rgba(10,24,58,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
            Analista
          </h1>

          {/* Tabs — inline in header */}
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const isActive = active === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={[
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-[#0A183A] text-white"
                      : "text-[#173D68]/60 hover:bg-[#0A183A]/[0.04] hover:text-[#173D68]",
                  ].join(" ")}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {active === "pedidos" && <PedidosTab />}
        {active === "notificaciones" && <NotificacionesTab />}
        {active === "desechos" && (
          <Suspense fallback={<div className="flex items-center justify-center py-20 text-[#173D68]"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
            <DesechosPage />
          </Suspense>
        )}
      </div>
    </div>
  );
}
