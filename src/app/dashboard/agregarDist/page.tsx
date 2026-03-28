"use client";

import React, { useState, useRef } from "react";
import { PlusCircle, Search, FilePlus, SwitchCameraIcon, Recycle, Calendar1 } from "lucide-react";
import CrearLlanta from "./CrearLlanta";
import Inspeccion from "./Inspeccion";
import CargaMasiva from "./CargaMasiva";
import VidaPage from "./Vida";
import Posicion from "./Posicion";
import EventosPage from "./Other";

type Option = "crear" | "inspeccion" | "evento" | "cargamasiva" | "vida" | "rotacion";

const OPTIONS: { key: Option; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "crear",       label: "Crear Llanta",   Icon: PlusCircle },
  { key: "cargamasiva", label: "Carga Masiva",    Icon: FilePlus },
  { key: "inspeccion",  label: "Inspección",      Icon: Search },
  { key: "vida",        label: "Vida",            Icon: Recycle },
  { key: "rotacion",    label: "Rotación",        Icon: SwitchCameraIcon },
  { key: "evento",      label: "Evento",          Icon: Calendar1 },
];

export default function AgregarPage() {
  const [selected, setSelected] = useState<Option>("crear");
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8" ref={contentRef}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0A183A]">Agregar Información</h1>
          <p className="text-sm text-[#348CCB] mt-1">Seleccione una opción para comenzar</p>
        </div>

        {/* Option pills — scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
          {OPTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: selected === key ? "linear-gradient(135deg, #0A183A, #173D68)" : "white",
                color: selected === key ? "#fff" : "#173D68",
                border: selected === key ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)",
                boxShadow: selected === key ? "0 2px 8px rgba(10,24,58,0.2)" : "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Form container */}
        <div className="bg-white rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(52,140,203,0.15)", boxShadow: "0 1px 8px rgba(10,24,58,0.06)" }}>
          <div className="px-5 sm:px-6 py-4" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
              {OPTIONS.find((o) => o.key === selected)?.label}
            </h2>
            <p className="text-xs text-white/60 mt-0.5">Complete el formulario para continuar</p>
          </div>
          <div className="p-5 sm:p-6">
            {selected === "crear" && <CrearLlanta language="es" />}
            {selected === "cargamasiva" && <CargaMasiva language="es" />}
            {selected === "inspeccion" && <Inspeccion language="es" />}
            {selected === "vida" && <VidaPage language="es" />}
            {selected === "rotacion" && <Posicion language="es" />}
            {selected === "evento" && <EventosPage language="es" />}
          </div>
        </div>
      </div>
    </div>
  );
}
