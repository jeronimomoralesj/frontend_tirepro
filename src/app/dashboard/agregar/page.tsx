"use client";

import React, { useState } from "react";
import { PlusCircle, Search, Calendar, FilePlus } from "lucide-react";
import CrearLlanta from "./CrearLlanta";
import Inspeccion from "./Inspeccion";
import Evento from "./Evento";
import CargaMasiva from "./CargaMasiva";

type Option = "crear" | "inspeccion" | "evento" | "cargamasiva";

export default function AgregarPage() {
  const [selectedOption, setSelectedOption] = useState<Option>("crear");

  const getTitleByOption = () => {
    switch (selectedOption) {
      case "crear":
        return "Crear Nueva Llanta";
      case "inspeccion":
        return "Registro de Inspección";
      case "evento":
        return "Registrar Evento";
      case "cargamasiva":
        return "Carga Masiva de Llantas";
    }
  };

  return (
    <div className="min-h-screen from-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Agregar Información
          </h1>
          <p className="text-gray-600">
            Seleccione una opción para comenzar a registrar datos
          </p>
        </div>

        {/* Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {/* Create */}
          <Card
            active={selectedOption === "crear"}
            onClick={() => setSelectedOption("crear")}
            title="Crear Nueva Llanta"
            description="Registre una llanta nueva en el sistema"
            Icon={PlusCircle}
          />
          {/* Bulk Upload */}
          <Card
            active={selectedOption === "cargamasiva"}
            onClick={() => setSelectedOption("cargamasiva")}
            title="Carga Masiva"
            description="Suba un archivo Excel con varias llantas"
            Icon={FilePlus}
          />
          {/* Inspection */}
          <Card
            active={selectedOption === "inspeccion"}
            onClick={() => setSelectedOption("inspeccion")}
            title="Inspección"
            description="Registre una inspección para una placa existente"
            Icon={Search}
          />
          {/* Event */}
          <Card
            active={selectedOption === "evento"}
            onClick={() => setSelectedOption("evento")}
            title="Evento"
            description="Registre un evento para una llanta existente"
            Icon={Calendar}
          />
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 overflow-hidden">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-[#0A183A]">
              {getTitleByOption()}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Complete el formulario para continuar
            </p>
          </div>
          <div>
            {selectedOption === "crear" && <CrearLlanta />}
            {selectedOption === "cargamasiva" && <CargaMasiva />}
            {selectedOption === "inspeccion" && <Inspeccion />}
            {selectedOption === "evento" && <Evento />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  active,
  onClick,
  title,
  description,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 border hover:shadow-md
        ${active
          ? "border-[#1E76B6] ring-2 ring-[#1E76B6]/20"
          : "border-gray-200 hover:border-[#1E76B6]/50"}
      `}
    >
      <div
        className={`
          absolute inset-0 opacity-10
          ${active ? "bg-[#1E76B6]" : "bg-gray-200"}
        `}
      />
      <div className="relative p-6">
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center mb-4
            ${active ? "bg-[#1E76B6]" : "bg-[#0A183A]/10"}
          `}
        >
          <Icon
            size={24}
            className={active ? "text-white" : "text-[#173D68]"}
          />
        </div>
        <h3
          className={`
            font-semibold text-lg mb-2
            ${active ? "text-[#0A183A]" : "text-gray-700"}
          `}
        >
          {title}
        </h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
