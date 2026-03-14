"use client";

import React, { useState } from "react";
import { ShoppingCart, Brain } from "lucide-react";
import PedidosPage from "./pedidos";
import IntegratedAnalysisPage from "./analysis";

const TABS = [
  {
    key: "pedidos",
    label: "Pedidos",
    icon: ShoppingCart,
    sub: "Necesidades de flota",
  },
  {
    key: "analisis",
    label: "Análisis por Placa",
    icon: Brain,
    sub: "Diagnóstico individual",
  },
  
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AnalistaPage() {
  const [active, setActive] = useState<TabKey>("pedidos");

  return (
    <div className="min-h-screen" style={{ background: "white" }}>
      {/* Tab bar */}
      <div
        className="sticky top-0 z-30 px-3 sm:px-4 lg:px-6 pt-3 pb-0"
        style={{
          background: "white",
          borderBottom: "1.5px solid rgba(52,140,203,0.13)",
          boxShadow: "0 2px 12px rgba(10,24,58,0.04)",
        }}
      >
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-black transition-all relative"
                style={{
                  color: isActive ? "#1E76B6" : "#9ca3af",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.sub}</span>

                {/* Active underline */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #0A183A, #1E76B6)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className={active === "analisis" ? "block" : "hidden"}>
        <IntegratedAnalysisPage />
      </div>
      <div className={active === "pedidos" ? "block" : "hidden"}>
        <PedidosPage />
      </div>
    </div>
  );
}