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
    <div style={{ background: "#ffffff" }}>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Option pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {OPTIONS.map(({ key, icon: Icon, title }) => {
            const active = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: active ? "linear-gradient(135deg, #0A183A, #173D68)" : "white",
                  color: active ? "#fff" : "#173D68",
                  border: active ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {title}
              </button>
            );
          })}
        </div>

        {/* Sub-page */}
        <div>
          {selected === "vida"     && <Vida     language={language} />}
          {selected === "posicion" && <Posicion language={language} />}
          {selected === "evento"   && <OtherEvent language={language} />}
        </div>

      </div>
    </div>
  );
}