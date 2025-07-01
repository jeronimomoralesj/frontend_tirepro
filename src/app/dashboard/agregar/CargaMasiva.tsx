"use client";

import React, { useState, useRef, useEffect } from "react";
import { FilePlus, Upload, Download, Info } from "lucide-react";

interface CargaMasivaProps {
  language: 'en' | 'es';
}

export default function CargaMasiva({ language = 'es' }: CargaMasivaProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [messageType, setMessageType] = useState<"success" | "error">();
  const [companyId, setCompanyId] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Translations object
  const translations = {
    es: {
      instructions: "Instrucciones para la Carga Masiva",
      instructionText: "Para subir las llantas asegúrate de tener estos campos y que tengan estos títulos en tu archivo Excel:",
      downloadTemplate: "Descargar Plantilla Excel",
      selectFile: "Seleccione un archivo Excel",
      dragDrop: "o arrastre y suelte aquí",
      allowedFormats: "Formatos permitidos: .xlsx, .xls",
      bulkUpload: "Cargar Masivamente",
      processing: "Procesando...",
      selectFileError: "Seleccione un archivo Excel (.xls/.xlsx).",
      companyIdError: "No se encontró companyId en localStorage.",
      successMessage: "Carga masiva completada con éxito",
      unexpectedError: "Error inesperado en la carga masiva",
      fields: [
    "id", "vida", "placa", "kilometraje_actual", "frente", 
    "marca", "diseno", "tipovhc", "pos", "proact", 
    "eje", "profundidad_int", "profundidad_cen", "profundidad_ext", "profundidad_inicial",
    "costo", "kilometros_llanta", "dimension"
  ],
    },
    en: {
      instructions: "Bulk Upload Instructions",
      instructionText: "To upload tires make sure you have these fields and that they have these titles in your Excel file:",
      downloadTemplate: "Download Excel Template",
      selectFile: "Select an Excel file",
      dragDrop: "or drag and drop here",
      allowedFormats: "Allowed formats: .xlsx, .xls",
      bulkUpload: "Bulk Upload",
      processing: "Processing...",
      selectFileError: "Please select an Excel file (.xls/.xlsx).",
      companyIdError: "Company ID not found in localStorage.",
      successMessage: "Bulk upload completed successfully",
      unexpectedError: "Unexpected error in bulk upload",
      fields: [
    "id", "retread", "plate", "vehicle_milage", "load_type", 
    "brand", "tread", "vehicle_type", "pos", "proact", 
    "axis", "internal_depth", "central_depth", "exterior_depth", "initial_depth",
    "cost", "tire_milage", "reference",
  ],
    }
  };

  const t = translations[language];

  // On mount, pull the companyId from the stored user object
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.companyId) setCompanyId(u.companyId);
      } catch (err) {
        console.error("Failed to parse user from localStorage", err);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    console.log("Picked file →", picked);
    setFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting bulk upload. file=", file, "companyId=", companyId);

    if (!file) {
      setMessage(t.selectFileError);
      setMessageType("error");
      return;
    }
    if (!companyId) {
      setMessage(t.companyIdError);
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage(undefined);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_BASE = "http://localhost:6001/api";
      const res = await fetch(
        `${API_BASE}/tires/bulk-upload?companyId=${companyId}`,
        { method: "POST", body: formData }
      );

      console.log("Response status", res.status);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status} ${language === 'es' ? 'en la carga masiva' : 'in bulk upload'}`);
      }

      const data = await res.json();
      setMessage(data.message || t.successMessage);
      setMessageType("success");

      // reset file input
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      console.error("Bulk upload failed:", err);
      
      // Properly type the error
      const errorMessage = err instanceof Error 
        ? err.message 
        : t.unexpectedError;
      
      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleClickUpload = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleDownloadTemplate = () => {
    // Create a template with headers
    const headers = t.fields.join('\t');
    const blob = new Blob([headers], { type: 'text/tab-separated-values' });
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = language === 'es' ? 'plantilla_carga_llantas.xls' : 'tire_upload_template.xls';
    
    // Append to the document and trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Explanatory section */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={toggleDetails}
        >
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-blue-800">
              {t.instructions}
            </h3>
          </div>
          <span className="text-blue-600">
            {showDetails ? "▲" : "▼"}
          </span>
        </div>
        
        {showDetails && (
          <div className="mt-3 text-sm text-gray-700">
            <p className="mb-2">
              {t.instructionText}
            </p>
            
            <div className="grid grid-cols-3 gap-x-2 gap-y-1 mb-3">
              {t.fields.map((field, index) => (
                <div key={index} className="px-2 py-1 bg-blue-100 rounded text-blue-800 text-xs">
                  {field}
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadTemplate();
                }}
                className="flex items-center text-blue-700 hover:text-blue-800"
              >
                <Download className="h-4 w-4 mr-1" />
                {t.downloadTemplate}
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div 
          className="border-2 border-dashed border-[#1E76B6] rounded-lg p-8 text-center bg-[#173D68]/5 cursor-pointer" 
          onClick={handleClickUpload}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <Upload className="mx-auto h-12 w-12 text-[#1E76B6] mb-3" />
          
          <div className="text-[#173D68] font-medium">
            {file ? (
              <span className="text-lg">{file.name}</span>
            ) : (
              <>
                <p className="text-lg font-semibold">{t.selectFile}</p>
                <p className="text-sm mt-2">{t.dragDrop}</p>
              </>
            )}
          </div>
          
          <p className="mt-2 text-sm text-[#173D68]/70">
            {t.allowedFormats}
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center px-6 py-3 bg-[#1E76B6] text-white rounded-md hover:bg-[#348CCB] transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <FilePlus className="mr-2 w-5 h-5" />
          {loading ? t.processing : t.bulkUpload}
        </button>
        
        {message && (
          <div 
            className={`p-4 rounded-md text-sm ${
              messageType === "success" 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}