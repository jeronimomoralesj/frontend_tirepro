"use client";

import React, { useState, useEffect, useRef } from "react";
import { PlusCircle, Search, FilePlus, SwitchCameraIcon, Recycle, Calendar1 } from "lucide-react";
import CrearLlanta from "./CrearLlanta";
import Inspeccion from "./Inspeccion";
import Evento from "./Evento";
import CargaMasiva from "./CargaMasiva";
import VidaPage from "./Vida";
import Posicion from "./Posicion";
import EventosPage from "./Other";

type Option = "crear" | "inspeccion" | "evento" | "cargamasiva" | "vida" | "rotacion";

export default function AgregarPage() {
  const [selectedOption, setSelectedOption] = useState<Option>("crear");
  
  // Ref for the content container
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Language select
  const [language, setLanguage] = useState<'es'>('es');

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = 'es';
      setLanguage(saved);
    };

    detectAndSetLanguage();
  }, []);

  // Translations object
  const translations = {
    es: {
      mainTitle: "Agregar Información",
      mainSubtitle: "Seleccione una opción para comenzar a registrar datos",
      createTitle: "Crear Nueva Llanta",
      createDesc: "Registre una llanta nueva en el sistema",
      bulkTitle: "Carga Masiva",
      bulkDesc: "Suba un archivo Excel con varias llantas",
      inspectionTitle: "Inspección",
      inspectionDesc: "Registre una inspección para una placa existente",
      eventTitle: "Evento",
      eventDesc: "Registre una rotación o un evento personalizado.",
      formSubtitle: "Complete el formulario para continuar",
      titleByOption: {
        crear: "Crear Nueva Llanta",
        inspeccion: "Registro de Inspección",
        evento: "Registrar Evento",
        cargamasiva: "Carga Masiva de Llantas"
      }
    },
    en: {
      mainTitle: "Add Information",
      mainSubtitle: "Select an option to start registering data",
      createTitle: "Create New Tire",
      createDesc: "Register a new tire in the system",
      bulkTitle: "Bulk Upload",
      bulkDesc: "Upload an Excel file with multiple tires",
      inspectionTitle: "Inspection",
      inspectionDesc: "Register an inspection for an existing plate",
      eventTitle: "Event",
      eventDesc: "Register a rotation or custom event.",
      formSubtitle: "Complete the form to continue",
      titleByOption: {
        crear: "Create New Tire",
        inspeccion: "Inspection Record",
        evento: "Register Event",
        cargamasiva: "Bulk Tire Upload"
      }
    }
  };

  const t = translations[language];

  const getTitleByOption = () => {
    return t.titleByOption[selectedOption];
  };

  return (
    <div className="min-h-screen from-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8" ref={contentRef}>
        {/* Main header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t.mainTitle}
          </h1>
          <p className="text-gray-600">
            {t.mainSubtitle}
          </p>
        </div>

        {/* Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Create */}
          <Card
            active={selectedOption === "crear"}
            onClick={() => setSelectedOption("crear")}
            title={t.createTitle}
            Icon={PlusCircle}
          />
          {/* Bulk Upload */}
          <Card
            active={selectedOption === "cargamasiva"}
            onClick={() => setSelectedOption("cargamasiva")}
            title={t.bulkTitle}
            Icon={FilePlus}
          />
          {/* Inspection */}
          <Card
            active={selectedOption === "inspeccion"}
            onClick={() => setSelectedOption("inspeccion")}
            title={t.inspectionTitle}
            Icon={Search}
          />
        </div>

        {/* Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* Create */}
          <Card
            active={selectedOption === "vida"}
            onClick={() => setSelectedOption("vida")}
            title="Vida"
            Icon={Recycle}
          />
          {/* Bulk Upload */}
          <Card
            active={selectedOption === "rotacion"}
            onClick={() => setSelectedOption("rotacion")}
            title="Rotación"
            Icon={SwitchCameraIcon}
          />
          {/* Inspection */}
          <Card
            active={selectedOption === "evento"}
            onClick={() => setSelectedOption("evento")}
            title="Evento personalizado"
            Icon={Calendar1}
          />
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 overflow-hidden">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-[#0A183A]">
              {getTitleByOption()}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t.formSubtitle}
            </p>
          </div>
          <div>
            {selectedOption === "crear" && <CrearLlanta language={language} />}
            {selectedOption === "cargamasiva" && <CargaMasiva language={language} />}
            {selectedOption === "inspeccion" && <Inspeccion language={language} />}
            {selectedOption === "vida" && <VidaPage language={language} />}
            {selectedOption === "rotacion" && <Posicion language={language} />}
            {selectedOption === "evento" && <EventosPage language={language} />}
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
      <div className="relative p-5">
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center mb-2
            ${active ? "bg-[#1E76B6]" : "bg-[#0A183A]/10"}
          `}
        >
          <Icon
            size={20}
            className={active ? "text-white" : "text-[#173D68]"}
          />
        </div>
        <h3
          className={`
            font-semibold text-m
            ${active ? "text-[#0A183A]" : "text-gray-700"}
          `}
        >
          {title}
        </h3>
      </div>
    </div>
  );
}