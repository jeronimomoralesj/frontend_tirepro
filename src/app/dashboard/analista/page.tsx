"use client";

import React, { useState, lazy, Suspense } from "react";
import { ShoppingCart, Bell, Settings, BarChart3, Calendar, Trash2, Loader2 } from "lucide-react";
import PedidosTab from "./components/PedidosTab";
import NotificacionesTab from "./components/NotificacionesTab";
import AjustesTab from "./components/AjustesTab";
import { OtisFloatingButton } from "../../../components/Otis";

const DesechosPage = lazy(() => import("../desechos/page"));

const OTIS_INSIGHT_BY_TAB: Record<string, { capability: any; title: string; insight: string }> = {
  pedidos: {
    capability: "orders",
    title: "Pedidos y compras",
    insight: "Esta vista cruza tus necesidades de reemplazo con el catálogo de distribuidores. Si ves muchas alertas, prioriza primero las posiciones críticas (≤3 mm de profundidad mínima), luego agrupa los reemplazos por marca/dimensión para negociar mejores precios. Las propuestas con CPK proyectado más bajo suelen ser la mejor inversión.",
  },
  notificaciones: {
    capability: "drivers",
    title: "Alertas y notificaciones",
    insight: "Aquí ves las alertas que requieren acción inmediata. Las críticas (rojas) son posiciones con riesgo de falla — actúa hoy. Las amarillas son advertencias que puedes resolver en tu próximo mantenimiento programado. Confirma cada acción para mantener la trazabilidad.",
  },
  desechos: {
    capability: "waste",
    title: "Desechos y dinero perdido",
    insight: "El dinero perdido por mes te dice cuánto valor estás dejando en llantas que podrían haber rendido más. Si el promedio sube, revisa si los inspectores están retirando llantas demasiado pronto. Apunta a un retiro cerca de los 3 mm para maximizar el aprovechamiento del casco.",
  },
  ajustes: {
    capability: undefined,
    title: "Configuración de Otis",
    insight: "Desde aquí decides qué capacidades de Otis están activas para tu cuenta. Cada capacidad agrega análisis automáticos en distintas pantallas — desactiva las que no quieras ver.",
  },
};

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

      {/* Floating Otis — analyzes whichever tab is active */}
      <OtisFloatingButton
        pageKey={`analista.${active}`}
        capability={OTIS_INSIGHT_BY_TAB[active].capability}
        title={OTIS_INSIGHT_BY_TAB[active].title}
        insight={OTIS_INSIGHT_BY_TAB[active].insight}
      />
    </div>
  );
}
