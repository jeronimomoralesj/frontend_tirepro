"use client";

import React, { useState, useRef, useEffect } from "react";
import { FilePlus, Upload } from "lucide-react";

interface ErrorResponse {
  message: string;
}

export default function CargaMasiva() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [messageType, setMessageType] = useState<"success" | "error">();
  const [companyId, setCompanyId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      setMessage("Seleccione un archivo Excel (.xls/.xlsx).");
      setMessageType("error");
      return;
    }
    if (!companyId) {
      setMessage("No se encontró companyId en localStorage.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage(undefined);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_BASE = "https://api.tirepro.com.co/api";
      const res = await fetch(
        `${API_BASE}/tires/bulk-upload?companyId=${companyId}`,
        { method: "POST", body: formData }
      );

      console.log("Response status", res.status);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status} en la carga masiva`);
      }

      const data = await res.json();
      setMessage(data.message || "Carga masiva completada con éxito");
      setMessageType("success");

      // reset file input
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      console.error("Bulk upload failed:", err);
      
      // Properly type the error
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Error inesperado en la carga masiva";
      
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

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-lg">

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-2 border-dashed border-[#1E76B6] rounded-lg p-8 text-center bg-[#173D68]/5 cursor-pointer" onClick={handleClickUpload}>
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
                <p className="text-lg font-semibold">Seleccione un archivo Excel</p>
                <p className="text-sm mt-2">o arrastre y suelte aquí</p>
              </>
            )}
          </div>
          
          <p className="mt-2 text-sm text-[#173D68]/70">
            Formatos permitidos: .xlsx, .xls
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center px-6 py-3 bg-[#1E76B6] text-white rounded-md hover:bg-[#348CCB] transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <FilePlus className="mr-2 w-5 h-5" />
          {loading ? "Procesando..." : "Cargar Masivamente"}
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