"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FilePlus, Upload, Download, Info, ChevronDown,
  X, AlertTriangle, CheckCircle, Loader2, Layers,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface CargaMasivaProps {
  language?: "es";
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

const FIELDS = [
  "id", "vida", "placa", "kilometraje_actual", "frente",
  "marca", "diseno", "tipovhc", "pos", "proact",
  "eje", "profundidad_int", "profundidad_cen", "profundidad_ext", "profundidad_inicial",
  "costo", "kilometros_llanta", "dimension",
];

// =============================================================================
// Helpers
// =============================================================================

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

// =============================================================================
// Design-system micro-components (matching VidaPage)
// =============================================================================

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.15)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <div>
        <p className="text-sm font-black text-[#0A183A] leading-none">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export default function CargaMasiva({ language = "es" }: CargaMasivaProps) {
  const [file,             setFile]             = useState<File | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [message,          setMessage]          = useState<string>();
  const [messageType,      setMessageType]      = useState<"success" | "error">();
  const [companyId,        setCompanyId]        = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [dragging,         setDragging]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pull companyId from localStorage user object on mount
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u.companyId) setCompanyId(u.companyId);
    } catch (err) {
      console.error("Failed to parse user from localStorage", err);
    }
  }, []);

  // ── File handling ──────────────────────────────────────────────────────────
  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setMessage("Solo se permiten archivos .xlsx o .xls");
      setMessageType("error");
      return;
    }
    setFile(f);
    setMessage(undefined);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  // ── Download template ──────────────────────────────────────────────────────
  function handleDownloadTemplate() {
    const blob = new Blob([FIELDS.join("\t")], { type: "text/tab-separated-values" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "plantilla_carga_llantas.xls";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(undefined);

    if (!file) {
      setMessage("Seleccione un archivo Excel (.xls/.xlsx).");
      setMessageType("error");
      return;
    }
    if (!companyId) {
      setMessage("No se encontró companyId. Vuelva a iniciar sesión.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await authFetch(
        `${API_BASE}/tires/bulk-upload?companyId=${companyId}`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status} en la carga masiva`);
      }

      const data = await res.json();
      const renamedWarnings = (data.details?.warnings ?? [])
        .filter((w: string) => w.includes("duplicado"));

      const renamedNote = renamedWarnings.length > 0
        ? `\n\nIDs renombrados con *:\n${renamedWarnings.map((w: string) => `• ${w}`).join("\n")}`
        : "";

      setMessage((data.message ?? "Carga masiva completada con éxito.") + renamedNote);
      setMessageType("success");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error inesperado en la carga masiva.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen" style={{ background: "white" }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-5">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 py-5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
            boxShadow: "0 8px 32px rgba(10,24,58,0.22)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none tracking-tight">
                Carga Masiva de Llantas
              </h1>
              <p className="text-xs text-white/60 mt-0.5">
                Sube tu archivo Excel para importar llantas
              </p>
            </div>
          </div>
        </div>

        {/* ── Result banners ────────────────────────────────────────────── */}
        {message && messageType === "error" && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-red-700">{message}</span>
            <button onClick={() => setMessage(undefined)}>
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}
        {message && messageType === "success" && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}
          >
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-green-700 whitespace-pre-line">{message}</span>
            <button onClick={() => setMessage(undefined)}>
              <X className="w-4 h-4 text-green-400" />
            </button>
          </div>
        )}

        {/* ── Instructions accordion ────────────────────────────────────── */}
        <Card>
          <button
            type="button"
            onClick={() => setShowInstructions(v => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                <Info className="w-4 h-4 text-[#1E76B6]" />
              </div>
              <p className="text-sm font-black text-[#0A183A]">Instrucciones para la Carga Masiva</p>
            </div>
            <ChevronDown
              className="w-4 h-4 text-gray-400 transition-transform"
              style={{ transform: showInstructions ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {showInstructions && (
            <div
              className="px-4 sm:px-5 pb-5 space-y-4"
              style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}
            >
              <p className="text-xs text-gray-500 pt-4">
                Para subir las llantas asegúrate de tener estos campos con estos títulos en tu archivo Excel:
              </p>

              {/* Field chips */}
              <div className="flex flex-wrap gap-2">
                {FIELDS.map(f => (
                  <span
                    key={f}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    style={{
                      background: "rgba(30,118,182,0.08)",
                      color: "#1E76B6",
                      border: "1px solid rgba(30,118,182,0.18)",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* Video tutorial */}
              <div>
                <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide mb-2">
                  Video tutorial
                </p>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                >
                  <iframe
                    className="w-full"
                    style={{ height: 220 }}
                    src="https://www.youtube.com/embed/AgFnH-jGVoc"
                    title="Tutorial carga masiva"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>

              {/* Download template */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-xs font-black text-[#1E76B6] hover:opacity-70 transition-opacity"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Plantilla Excel
              </button>
            </div>
          )}
        </Card>

        {/* ── Upload form ───────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="p-4 sm:p-5">
            <CardTitle
              icon={Upload}
              title="Archivo Excel"
              sub="Arrastra o selecciona tu archivo .xlsx / .xls"
            />

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? "#1E76B6" : "rgba(52,140,203,0.3)"}`,
                background: dragging ? "rgba(30,118,182,0.05)" : "rgba(10,24,58,0.01)",
                boxShadow: dragging ? "0 0 0 4px rgba(30,118,182,0.1)" : "none",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => pickFile(e.target.files?.[0] ?? null)}
              />

              <div
                className="p-4 rounded-2xl"
                style={{ background: file ? "rgba(22,163,74,0.1)" : "rgba(30,118,182,0.08)" }}
              >
                <Upload
                  className="w-8 h-8"
                  style={{ color: file ? "#16a34a" : "#1E76B6" }}
                />
              </div>

              {file ? (
                <div className="text-center">
                  <p className="text-sm font-black text-[#0A183A]">{file.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB · listo para subir
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-black text-[#0A183A]">Seleccione un archivo Excel</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">o arrastre y suelte aquí</p>
                </div>
              )}

              <p className="text-[10px] text-gray-400">Formatos permitidos: .xlsx, .xls</p>
            </div>

            {/* Clear file */}
            {file && (
              <button
                type="button"
                onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Quitar archivo
              </button>
            )}
          </Card>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando…</>
              : <><FilePlus className="w-4 h-4" />Cargar Masivamente</>
            }
          </button>
        </form>

      </div>
    </div>
  );
}