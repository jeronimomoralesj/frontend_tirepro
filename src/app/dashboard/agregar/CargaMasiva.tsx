"use client";

import React, { useState, useRef, useEffect } from "react";
import { FilePlus } from "lucide-react";

export default function CargaMasiva() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
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
      return;
    }
    if (!companyId) {
      setMessage("No se encontró companyId en localStorage.");
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

      // reset file input
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      console.error("Bulk upload failed:", err);
      setMessage(err.message || "Error inesperado en la carga masiva");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Archivo Excel
        </label>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="mt-1 block w-full"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center px-4 py-2 bg-[#1E76B6] text-white rounded hover:bg-[#348CCB]"
      >
        <FilePlus className="mr-2 w-5 h-5" />
        {loading ? "Cargando..." : "Cargar Masivamente"}
      </button>
      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  );
}
