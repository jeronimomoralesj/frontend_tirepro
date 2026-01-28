"use client";

import React, { useState, useRef, useEffect } from "react";
import { FilePlus, Upload, Download, Info, ChevronDown } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface CargaMasivaProps {
  language: 'en' | 'es';
}

export default function CargaMasiva({ language = 'es' }: CargaMasivaProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [messageType, setMessageType] = useState<"success" | "error">();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("Todos");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Translations object
  const translations = {
    es: {
      selectClient: "Cliente",
      allClients: "Todos",
      pleaseSelectClient: "Por favor seleccione un cliente",
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
      selectClient: "Client",
      allClients: "All",
      pleaseSelectClient: "Please select a client",
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
        "id", "retread", "plate", "vehicle_milage", "cargo_type", 
        "brand", "tread", "vehicle_type", "pos", "proact", 
        "axle", "internal_depth", "central_depth", "exterior_depth", "initial_depth",
        "cost", "tire_milage", "dimensions",
      ],
    }
  };

  const t = translations[language];

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const res = await fetch(
        `https://api.tirepro.com.co/api/companies/me/clients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        console.error("Error fetching companies");
        return;
      }

      const data = await res.json();

      const companyList: Company[] = data.map((access: any) => ({
        id: access.company.id,
        name: access.company.name,
      }));

      setCompanies(companyList);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    console.log("Picked file →", picked);
    setFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage(t.selectFileError);
      setMessageType("error");
      return;
    }

    // Validate company selection
    if (selectedCompany === t.allClients) {
      setMessage(t.pleaseSelectClient);
      setMessageType("error");
      return;
    }

    // Get the selected company ID
    const company = companies.find(c => c.name === selectedCompany);
    if (!company) {
      setMessage("Company not found");
      setMessageType("error");
      return;
    }

    console.log("Submitting bulk upload. file=", file, "companyId=", company.id);

    setLoading(true);
    setMessage(undefined);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.tirepro.com.co";
      const res = await fetch(
        `${API_BASE}/api/tires/bulk-upload?companyId=${company.id}`,
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
    const headers = t.fields.join('\t');
    const blob = new Blob([headers], { type: 'text/tab-separated-values' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = language === 'es' ? 'plantilla_carga_llantas.xls' : 'tire_upload_template.xls';
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const companyOptions = [t.allClients, ...companies.map(c => c.name)];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Company Selection Header */}
      <div className="mb-6 bg-gradient-to-r from-blue-900 to-blue-600 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-white">
            <h2 className="text-2xl font-bold">
              {language === 'es' ? 'Carga Masiva de Llantas' : 'Bulk Tire Upload'}
            </h2>
          </div>
          
          {/* Company Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
              className="px-4 py-2.5 bg-black bg-opacity-10 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-opacity-20 transition-colors flex items-center gap-2 min-w-[200px] justify-between"
            >
              <span>{t.selectClient}: {selectedCompany}</span>
              <ChevronDown size={16} />
            </button>
            {showCompanyDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 z-10 max-h-80 overflow-y-auto">
                {companyOptions.map((company) => (
                  <button
                    key={company}
                    type="button"
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      selectedCompany === company ? "bg-blue-50 text-blue-700 font-medium" : ""
                    }`}
                    onClick={() => {
                      setSelectedCompany(company);
                      setShowCompanyDropdown(false);
                    }}
                  >
                    {company}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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

            {/* Video tutorial */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {language === 'es' ? 'Video explicativo sobre la carga masiva' : 'Tutorial video about bulk upload'}
              </h3>
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  className="w-full h-64 rounded-lg shadow"
                  src={language === 'es'
                    ? "https://www.youtube.com/embed/AgFnH-jGVoc"
                    : "https://www.youtube.com/embed/WbcmncTitEM"}
                  title="Bulk Upload Tutorial"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

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