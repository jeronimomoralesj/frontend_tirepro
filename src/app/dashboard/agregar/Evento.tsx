"use client";

import React, { useState } from "react";
import { RefreshCw, Truck, Zap } from "lucide-react";
import Vida from "./Vida";
import Posicion from "./Posicion";
import OtherEvent from "./Other";

// =============================================================================
// Types
// =============================================================================

type Option = "vida" | "posicion" | "evento";

interface EventoProps {
  language?: "es";
}

// =============================================================================
// Config
// =============================================================================

const OPTIONS: {
  key: Option;
  icon: React.ElementType;
  title: string;
  description: string;
  pageTitle: string;
}[] = [
  {
    key:         "vida",
    icon:        RefreshCw,
    title:       "Cambiar Vida",
    description: "Cambie la llanta a reencauche, o en fin de vida",
    pageTitle:   "Actualizar Vida",
  },
  {
    key:         "posicion",
    icon:        Truck,
    title:       "Agregar Rotación",
    description: "Registre una nueva rotación de llantas en sus vehículos",
    pageTitle:   "Registro Nueva Rotación",
  },
  {
    key:         "evento",
    icon:        Zap,
    title:       "Otro Evento",
    description: "Registre otros eventos como pinchazo, reparación, etc.",
    pageTitle:   "Registrar Otro Evento",
  },
];

// =============================================================================
// Component
// =============================================================================

export default function Evento({ language = "es" }: EventoProps) {
  const [selected, setSelected] = useState<Option>("vida");

  const current = OPTIONS.find((o) => o.key === selected)!;

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>

      {/* Top bar */}
      <div
        className="sticky top-0 z-40 px-6 py-4 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div
          className="p-2 rounded-xl"
          style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
        >
          <current.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
            {current.pageTitle}
          </h1>
          <p className="text-xs text-[#348CCB] mt-0.5">{current.description}</p>
        </div>
      </div>

      <div className="px-4 py-8 max-w-5xl mx-auto space-y-4">

        {/* Option selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {OPTIONS.map(({ key, icon: Icon, title, description }) => {
            const active = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className="text-left rounded-2xl p-5 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: active
                    ? "linear-gradient(135deg, #0A183A 0%, #173D68 100%)"
                    : "white",
                  border: active
                    ? "1px solid transparent"
                    : "1px solid rgba(52,140,203,0.2)",
                  boxShadow: active
                    ? "0 8px 24px rgba(10,24,58,0.18)"
                    : "0 2px 8px rgba(10,24,58,0.04)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-xl flex-shrink-0 mt-0.5"
                    style={{
                      background: active
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(30,118,182,0.10)",
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: active ? "white" : "#1E76B6" }}
                    />
                  </div>
                  <div>
                    <p
                      className="font-bold text-sm leading-tight"
                      style={{ color: active ? "white" : "#0A183A" }}
                    >
                      {title}
                    </p>
                    <p
                      className="text-xs mt-1 leading-snug"
                      style={{ color: active ? "rgba(255,255,255,0.65)" : "#348CCB" }}
                    >
                      {description}
                    </p>
                  </div>
                </div>

                {/* Active indicator dot */}
                {active && (
                  <div className="mt-4 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                      Seleccionado
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(52,140,203,0.18)",
            boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
          }}
        >
          {/* Panel header */}
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "rgba(10,24,58,0.02)",
              borderBottom: "1px solid rgba(52,140,203,0.12)",
            }}
          >
            <current.icon className="w-4 h-4 text-[#1E76B6]" />
            <h2 className="text-sm font-bold text-[#0A183A]">{current.pageTitle}</h2>
          </div>

          {/* Sub-page rendered here — each manages its own padding */}
          <div className="bg-white">
            {selected === "vida"     && <Vida     language={language} />}
            {selected === "posicion" && <Posicion language={language} />}
            {selected === "evento"   && <OtherEvent language={language} />}
          </div>
        </div>

      </div>
    </div>
  );
}