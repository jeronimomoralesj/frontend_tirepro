"use client";

import React, { useState } from "react";
import Inspeccion from "./Inspeccion";
import Vida from "./Vida";
import Posicion from "./Posicion";
import OtherEvent from "./Other";

export default function Evento() {
  const [selectedOption, setSelectedOption] = useState<"vida" | "posicion" | "evento">("vida");

  const getTitleByOption = () => {
    switch (selectedOption) {
      case "vida": return "Actualizar vida";
      case "posicion": return "Registro nueva rotación";
      case "evento": return "Registrar otro evento";
      default: return "Seleccione una opción";
    }
  }  

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Options Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* Vida Card */}
          <div 
            onClick={() => setSelectedOption("vida")}
            className={`relative rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 border hover:shadow-md ${
              selectedOption === "vida" 
                ? "border-[#1E76B6] ring-2 ring-[#1E76B6]/20" 
                : "border-gray-200 hover:border-[#1E76B6]/50"
            }`}
          >
            <div className={`absolute inset-0 opacity-10 ${selectedOption === "vida" ? "bg-[#1E76B6]" : "bg-gray-200"}`}></div>
            <div className="relative p-6">
              <h3 className={`font-semibold text-lg mb-2 ${selectedOption === "vida" ? "text-[#0A183A]" : "text-gray-700"}`}>
                Cambiar Vida
              </h3>
              <p className="text-sm text-gray-500">Cambie la llanta a reencauche, o en fin de vida</p>
            </div>
          </div>

          {/* Posicion Card */}
          <div 
            onClick={() => setSelectedOption("posicion")}
            className={`relative rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 border hover:shadow-md ${
              selectedOption === "posicion" 
                ? "border-[#1E76B6] ring-2 ring-[#1E76B6]/20" 
                : "border-gray-200 hover:border-[#1E76B6]/50"
            }`}
          >
            <div className={`absolute inset-0 opacity-10 ${selectedOption === "posicion" ? "bg-[#1E76B6]" : "bg-gray-200"}`}></div>
            <div className="relative p-6">
              <h3 className={`font-semibold text-lg mb-2 ${selectedOption === "posicion" ? "text-[#0A183A]" : "text-gray-700"}`}>
                Agregar Rotación
              </h3>
              <p className="text-sm text-gray-500">Agregue una rotación en sus Vehículos</p>
            </div>
          </div>

          {/* Evento Card */}
          <div 
            onClick={() => setSelectedOption("evento")}
            className={`relative rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 border hover:shadow-md ${
              selectedOption === "evento" 
                ? "border-[#1E76B6] ring-2 ring-[#1E76B6]/20" 
                : "border-gray-200 hover:border-[#1E76B6]/50"
            }`}
          >
            <div className={`absolute inset-0 opacity-10 ${selectedOption === "evento" ? "bg-[#1E76B6]" : "bg-gray-200"}`}></div>
            <div className="relative p-6">
              <h3 className={`font-semibold text-lg mb-2 ${selectedOption === "evento" ? "text-[#0A183A]" : "text-gray-700"}`}>
                Otro evento
              </h3>
              <p className="text-sm text-gray-500">Agregar otros eventos como pinchazo, etc.</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 overflow-hidden">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-[#0A183A]">{getTitleByOption()}</h2>
          </div>
          
          <div>
            {selectedOption === "vida" && <Vida />}
            {selectedOption === "posicion" && <Posicion />}
            {selectedOption === "evento" && <OtherEvent />}
          </div>
        </div>
      </div>
    </div>
  );
}