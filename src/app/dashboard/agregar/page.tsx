"use client";

import React, { useState } from "react";
import { PlusCircle, Search, Calendar } from "lucide-react";
import CrearLlanta from "./CrearLlanta";
import Inspeccion from "./Inspeccion";
import Evento from "./Evento";

export default function AgregarPage() {
  const [selectedOption, setSelectedOption] = useState<"crear" | "inspeccion" | "evento">("crear");

  const getTitleByOption = () => {
    switch (selectedOption) {
      case "crear": return "Crear Nueva Llanta";
      case "inspeccion": return "Registro de Inspección";
      case "evento": return "Registrar Evento";
    }
  }

  return (
    <div className="min-h-screen  from-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
      
        {/* Main header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Agregar Información</h1>
          <p className="text-gray-600">Seleccione una opción para comenzar a registrar datos</p>
        </div>

        {/* Options Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* Create Tire Card */}
          <div 
            onClick={() => setSelectedOption("crear")}
            className={`relative rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 border hover:shadow-md ${
              selectedOption === "crear" 
                ? "border-[#1E76B6] ring-2 ring-[#1E76B6]/20" 
                : "border-gray-200 hover:border-[#1E76B6]/50"
            }`}
          >
            <div className={`absolute inset-0 opacity-10 ${selectedOption === "crear" ? "bg-[#1E76B6]" : "bg-gray-200"}`}></div>
            <div className="relative p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                selectedOption === "crear" ? "bg-[#1E76B6]" : "bg-[#0A183A]/10"
              }`}>
                <PlusCircle className={selectedOption === "crear" ? "text-white" : "text-[#173D68]"} size={24} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${selectedOption === "crear" ? "text-[#0A183A]" : "text-gray-700"}`}>
                Crear Nueva Llanta
              </h3>
              <p className="text-sm text-gray-500">Registre una llanta nueva en el sistema</p>
            </div>
          </div>

          {/* Inspection Card */}
          <div 
            onClick={() => setSelectedOption("inspeccion")}
            className={`relative rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 border hover:shadow-md ${
              selectedOption === "inspeccion" 
                ? "border-[#1E76B6] ring-2 ring-[#1E76B6]/20" 
                : "border-gray-200 hover:border-[#1E76B6]/50"
            }`}
          >
            <div className={`absolute inset-0 opacity-10 ${selectedOption === "inspeccion" ? "bg-[#1E76B6]" : "bg-gray-200"}`}></div>
            <div className="relative p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                selectedOption === "inspeccion" ? "bg-[#1E76B6]" : "bg-[#0A183A]/10"
              }`}>
                <Search className={selectedOption === "inspeccion" ? "text-white" : "text-[#173D68]"} size={24} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${selectedOption === "inspeccion" ? "text-[#0A183A]" : "text-gray-700"}`}>
                Inspección
              </h3>
              <p className="text-sm text-gray-500">Registre una inspección para una placa existente</p>
            </div>
          </div>

          {/* Event Card */}
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                selectedOption === "evento" ? "bg-[#1E76B6]" : "bg-[#0A183A]/10"
              }`}>
                <Calendar className={selectedOption === "evento" ? "text-white" : "text-[#173D68]"} size={24} />
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${selectedOption === "evento" ? "text-[#0A183A]" : "text-gray-700"}`}>
                Evento
              </h3>
              <p className="text-sm text-gray-500">Registre un evento para una llanta existente</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 overflow-hidden">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-[#0A183A]">{getTitleByOption()}</h2>
            <p className="text-sm text-gray-500 mt-1">Complete el formulario para continuar</p>
          </div>
          
          <div>
            {selectedOption === "crear" && <CrearLlanta />}
            {selectedOption === "inspeccion" && <Inspeccion />}
            {selectedOption === "evento" && <Evento />}
          </div>
        </div>
      </div>
    </div>
  );
}