"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, Download, Info, ChevronDown,
  X, AlertTriangle, CheckCircle, Loader2, Sparkles,
} from "lucide-react";
import RecentBulkUploads from "@/components/RecentBulkUploads";
import MappingReview from "@/components/bulk/MappingReview";
import { analyzeBulkFile, uploadBulkFile, type AnalyzeResult } from "@/components/bulk/bulkMapping";

// =============================================================================
// Types
// =============================================================================

interface CargaMasivaProps {
  language?: "es";
}

// =============================================================================
// Constants
// =============================================================================

const FIELDS = [
  "id", "vida", "placa", "kilometraje_actual", "frente",
  "marca", "diseno", "tipovhc", "pos", "proact",
  "eje", "profundidad_int", "profundidad_cen", "profundidad_ext", "profundidad_inicial",
  "costo", "kilometros_llanta", "dimension",
];

// Recent uploads now live server-side (BulkUploadSnapshot). The
// RecentBulkUploads component handles fetch / revert / edit+reapply.

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Design-system micro-components (matching VidaPage)
// =============================================================================

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl ${className}`}
      style={{
        border: "1px solid rgba(10,24,58,0.08)",
        boxShadow: "0 2px 12px -4px rgba(10,24,58,0.08)",
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#1E76B6]" />
      <div>
        <p className="text-sm font-bold text-[#0A183A] leading-none">{title}</p>
        {sub && <p className="text-[11px] text-[#0A183A]/40 mt-0.5">{sub}</p>}
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
  // AI analysis: the proposed column mapping + detected issues the user reviews.
  const [analyzing,     setAnalyzing]     = useState(false);
  const [analysis,      setAnalysis]      = useState<AnalyzeResult | null>(null);
  const [recentsVersion, setRecentsVersion] = useState(0);
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

  // -- File handling ----------------------------------------------------------
  async function pickFile(f: File | null) {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setMessage("Solo se permiten archivos .xlsx, .xls o .csv");
      setMessageType("error");
      return;
    }
    setFile(f);
    setMessage(undefined);
    setAnalysis(null);
    setAnalyzing(true);
    // Send the file to the backend so the AI can detect its structure, map the
    // columns to TirePro fields and flag data errors before we commit anything.
    try {
      const res = await analyzeBulkFile(f);
      if (!res.headers.length) {
        setMessage("El archivo está vacío o no se pudo leer.");
        setMessageType("error");
        setFile(null);
      } else {
        setAnalysis(res);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo analizar el archivo.");
      setMessageType("error");
      setFile(null);
    } finally {
      setAnalyzing(false);
    }
  }

  function clearFile() {
    setFile(null);
    setAnalysis(null);
    setAnalyzing(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Recent uploads are managed by the RecentBulkUploads component, which
  // fetches from /tires/bulk-upload/recent and handles revert + reapply.
  // Bumping recentsVersion forces it to refresh (e.g. after a new upload).

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  // -- Download template ------------------------------------------------------
  function handleDownloadTemplate() {
    const blob = new Blob([FIELDS.join("\t")], { type: "text/tab-separated-values" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "plantilla_carga_llantas.xls";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // -- Submit -----------------------------------------------------------------
  // Called from MappingReview once the user confirms the AI column mapping.
  async function handleSubmit(columnMapping: Record<string, string | null>) {
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
      const res = await uploadBulkFile(file, companyId, { columnMapping });

      if (!res.ok) {
        let errMsg = `Error ${res.status} en la carga masiva`;
        try {
          const errBody = await res.json();
          errMsg = errBody.message ?? errMsg;
        } catch {
          const errText = await res.text();
          if (errText) errMsg = errText;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const renamedWarnings = (data.details?.warnings ?? [])
        .filter((w: string) => w.includes("duplicado"));

      const renamedNote = renamedWarnings.length > 0
        ? `\n\nIDs renombrados con *:\n${renamedWarnings.map((w: string) => `• ${w}`).join("\n")}`
        : "";

      setMessage((data.message ?? "Carga masiva completada con éxito.") + renamedNote);
      setMessageType("success");

      // Backend already persisted a BulkUploadSnapshot — just bump the
      // version so the RecentBulkUploads panel re-fetches.
      setRecentsVersion((v) => v + 1);

      clearFile();
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
    <div style={{ background: "white" }}>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">

        {/* -- Result banners ---------------------------------------------- */}
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

        {/* -- Instructions accordion -------------------------------------- */}
        <Card>
          <button
            type="button"
            onClick={() => setShowInstructions(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
          >
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-[#1E76B6]" />
              <p className="text-sm font-bold text-[#0A183A]">Instrucciones para la Carga Masiva</p>
            </div>
            <ChevronDown
              className="w-4 h-4 text-[#0A183A]/25 transition-transform"
              style={{ transform: showInstructions ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {showInstructions && (
            <div
              className="px-5 pb-5 space-y-4"
              style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
            >
              <p className="text-xs text-[#0A183A]/40 pt-4">
                Para subir las llantas asegúrate de tener estos campos con estos títulos en tu archivo Excel:
              </p>

              <div className="flex flex-wrap gap-1.5">
                {FIELDS.map(f => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#1E76B6] bg-[#1E76B6]/[0.06] border border-[#1E76B6]/10"
                  >
                    {f}
                  </span>
                ))}
              </div>

              <div>
                <p className="text-[11px] font-bold text-[#0A183A]/50 uppercase tracking-wider mb-2">
                  Video tutorial
                </p>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(10,24,58,0.08)" }}
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

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-xs font-bold text-[#1E76B6] hover:opacity-70 transition-opacity"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Plantilla Excel
              </button>
            </div>
          )}
        </Card>

        {/* -- Upload flow ------------------------------------------------- */}
        <div className="space-y-4">
          {/* Drop zone — hidden once a file is being analyzed or reviewed */}
          {!analyzing && !analysis && (
            <Card className="p-4 sm:p-5">
              <CardTitle
                icon={Sparkles}
                title="Sube tu archivo — la IA hace el resto"
                sub="Cualquier estructura de columnas: la IA detecta y mapea los datos por ti"
              />

              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragging ? "#1E76B6" : "rgba(10,24,58,0.1)"}`,
                  background: dragging ? "rgba(30,118,182,0.03)" : "rgba(10,24,58,0.01)",
                  boxShadow: dragging ? "0 0 0 4px rgba(30,118,182,0.06)" : "none",
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => pickFile(e.target.files?.[0] ?? null)}
                />

                <div className="p-4 rounded-2xl" style={{ background: "rgba(30,118,182,0.08)" }}>
                  <Upload className="w-8 h-8" style={{ color: "#1E76B6" }} />
                </div>

                <div className="text-center">
                  <p className="text-sm font-black text-[#0A183A]">Seleccione un archivo</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">o arrastre y suelte aquí</p>
                </div>

                <p className="text-[10px] text-gray-400">Formatos permitidos: .xlsx, .xls, .csv</p>
              </div>
            </Card>
          )}

          {/* Analyzing */}
          {analyzing && (
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[#A374FF]" />
                <div className="text-center">
                  <p className="text-sm font-black text-[#0A183A]">Analizando tu archivo con IA…</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Detectando columnas y validando datos</p>
                </div>
                {file && <p className="text-[10px] text-gray-400">{file.name}</p>}
              </div>
            </Card>
          )}

          {/* Mapping review + confirm */}
          {analysis && !analyzing && (
            <Card className="p-4 sm:p-5">
              <MappingReview
                result={analysis}
                loading={loading}
                confirmLabel={`Confirmar y cargar ${analysis.totalRows} llanta${analysis.totalRows !== 1 ? "s" : ""}`}
                onBack={clearFile}
                onConfirm={handleSubmit}
              />
            </Card>
          )}
        </div>

        {/* -- Cargas recientes (server-backed, 7-day rewind window) -------- */}
        {companyId && (
          <RecentBulkUploads
            companyId={companyId}
            refreshKey={recentsVersion}
            onChanged={() => setRecentsVersion((v) => v + 1)}
          />
        )}

      </div>
    </div>
  );
}