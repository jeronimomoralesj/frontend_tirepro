"use client";

import React, { useState } from "react";
import Vida from "./Vida";
import Posicion from "./Posicion";
import OtherEvent from "./Other";

interface EventoProps {
  language: 'es';
}

export default function Evento({ language = 'es' }: EventoProps) {
  const [selectedOption, setSelectedOption] = useState<"vida" | "posicion" | "evento">("vida");

  // Translations object
  const translations = {
    es: {
      titleByOption: {
        vida: "Actualizar vida",
        posicion: "Registro nueva rotación",
        evento: "Registrar otro evento"
      },
      defaultTitle: "Seleccione una opción",
      cards: {
        vida: {
          title: "Cambiar Vida",
          description: "Cambie la llanta a reencauche, o en fin de vida"
        },
        posicion: {
          title: "Agregar Rotación",
          description: "Agregue una rotación en sus Vehículos"
        },
        evento: {
          title: "Otro evento",
          description: "Agregar otros eventos como pinchazo, etc."
        }
      }
    }
  };

  const t = translations[language];

  const getTitleByOption = () => {
    return t.titleByOption[selectedOption] || t.defaultTitle;
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
                {t.cards.vida.title}
              </h3>
              <p className="text-sm text-gray-500">{t.cards.vida.description}</p>
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
                {t.cards.posicion.title}
              </h3>
              <p className="text-sm text-gray-500">{t.cards.posicion.description}</p>
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
                {t.cards.evento.title}
              </h3>
              <p className="text-sm text-gray-500">{t.cards.evento.description}</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 overflow-hidden">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-[#0A183A]">{getTitleByOption()}</h2>
          </div>
          
          <div>
            {selectedOption === "vida" && <Vida language={language} />}
            {selectedOption === "posicion" && <Posicion language={language} />}
            {selectedOption === "evento" && <OtherEvent language={language} />}
          </div>
        </div>
      </div>
    </div>
  );
}