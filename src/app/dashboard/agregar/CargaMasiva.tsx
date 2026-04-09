"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FilePlus, Upload, Download, Info, ChevronDown,
  X, AlertTriangle, CheckCircle, Loader2, Layers,
  Trash2, RotateCcw, Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

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
// Recent uploads (localStorage) — keeps the last 3 bulk uploads so the user
// can mass-undo a recent run if they uploaded the wrong file or made a typo.
// =============================================================================

const RECENT_KEY = "tirepro:recent-bulk-uploads:tires";
const MAX_RECENT = 3;

interface RecentUpload {
  id: string;             // unique key for React + delete
  timestamp: number;      // ms epoch
  fileName: string;
  count: number;          // # tires created
  tireIds: string[];      // for undo
  companyId: string;
}

function loadRecentUploads(companyId: string): RecentUpload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const all: RecentUpload[] = JSON.parse(raw);
    return all.filter((u) => u.companyId === companyId);
  } catch {
    return [];
  }
}

function saveRecentUpload(upload: RecentUpload) {
  if (typeof window === "undefined") return;
  let all: RecentUpload[] = [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) all = JSON.parse(raw);
  } catch { /* */ }
  all.unshift(upload);
  // keep max 3 PER company
  const byCompany: Record<string, RecentUpload[]> = {};
  for (const u of all) {
    (byCompany[u.companyId] ??= []).push(u);
  }
  const trimmed: RecentUpload[] = [];
  for (const cid in byCompany) trimmed.push(...byCompany[cid].slice(0, MAX_RECENT));
  localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
}

function removeRecentUpload(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return;
    const all: RecentUpload[] = JSON.parse(raw);
    localStorage.setItem(RECENT_KEY, JSON.stringify(all.filter((u) => u.id !== id)));
  } catch { /* */ }
}

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
  // Parsed preview rows so the user can verify the spreadsheet before commit.
  const [previewRows,   setPreviewRows]   = useState<Record<string, any>[]>([]);
  const [previewHeaders,setPreviewHeaders]= useState<string[]>([]);
  const [recents,       setRecents]       = useState<RecentUpload[]>([]);
  const [undoingId,     setUndoingId]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pull companyId from localStorage user object on mount
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u.companyId) {
        setCompanyId(u.companyId);
        setRecents(loadRecentUploads(u.companyId));
      }
    } catch (err) {
      console.error("Failed to parse user from localStorage", err);
    }
  }, []);

  // -- File handling ----------------------------------------------------------
  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setMessage("Solo se permiten archivos .xlsx o .xls");
      setMessageType("error");
      return;
    }
    setFile(f);
    setMessage(undefined);
    // Parse the workbook client-side so the user can preview the rows
    // before actually sending them to the backend.
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { setPreviewRows([]); setPreviewHeaders([]); return; }
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
        const headers = rows.length ? Object.keys(rows[0]) : [];
        setPreviewRows(rows);
        setPreviewHeaders(headers);
      } catch (err) {
        console.error("Error parsing xlsx", err);
        setPreviewRows([]); setPreviewHeaders([]);
        setMessage("No se pudo leer el archivo. Revisa que sea un .xlsx válido.");
        setMessageType("error");
      }
    };
    reader.readAsArrayBuffer(f);
  }

  function clearFile() {
    setFile(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  // -- Undo a recent bulk upload --------------------------------------------
  const undoUpload = useCallback(async (upload: RecentUpload) => {
    if (!companyId) return;
    const ok = window.confirm(
      `¿Eliminar las ${upload.count} llantas creadas en "${upload.fileName}"? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setUndoingId(upload.id);
    try {
      const res = await authFetch(`${API_BASE}/tires/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tireIds: upload.tireIds, companyId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json().catch(() => ({ deleted: upload.count }));
      removeRecentUpload(upload.id);
      setRecents(loadRecentUploads(companyId));
      setMessage(`${data.deleted ?? upload.count} llantas eliminadas correctamente.`);
      setMessageType("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo deshacer la carga.");
      setMessageType("error");
    } finally {
      setUndoingId(null);
    }
  }, [companyId]);

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

      // Save the run so the user can mass-undo it from the "Cargas recientes"
      // panel if they made a mistake.
      const createdIds: string[] = Array.isArray(data.createdTireIds) ? data.createdTireIds : [];
      if (createdIds.length > 0 && file) {
        saveRecentUpload({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          fileName: file.name,
          count: data.success ?? createdIds.length,
          tireIds: createdIds,
          companyId,
        });
        setRecents(loadRecentUploads(companyId));
      }

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

        {/* -- Upload form ------------------------------------------------- */}
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
                onClick={clearFile}
                className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Quitar archivo
              </button>
            )}
          </Card>

          {/* -- Preview of parsed rows ------------------------------------ */}
          {previewRows.length > 0 && (
            <Card className="p-4 sm:p-5">
              <CardTitle
                icon={Layers}
                title={`Vista previa (${previewRows.length} fila${previewRows.length !== 1 ? "s" : ""})`}
                sub="Revisa que las columnas y los valores se vean correctos antes de cargar"
              />
              <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                <table className="min-w-full text-[11px]">
                  <thead style={{ background: "rgba(30,118,182,0.06)" }}>
                    <tr>
                      <th className="px-2 py-2 text-left font-black text-[#0A183A] uppercase tracking-wide">#</th>
                      {previewHeaders.map((h) => (
                        <th key={h} className="px-2 py-2 text-left font-black text-[#0A183A] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 5).map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}>
                        <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                        {previewHeaders.map((h) => (
                          <td key={h} className="px-2 py-1.5 text-[#0A183A] whitespace-nowrap">
                            {String(r[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 5 && (
                <p className="text-[11px] text-gray-400 mt-2 text-center">
                  + {previewRows.length - 5} fila{previewRows.length - 5 !== 1 ? "s" : ""} más se cargarán al confirmar
                </p>
              )}
            </Card>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando…</>
              : <><FilePlus className="w-4 h-4" />
                  {previewRows.length > 0
                    ? `Confirmar y cargar ${previewRows.length} llanta${previewRows.length !== 1 ? "s" : ""}`
                    : "Cargar Masivamente"}
                </>
            }
          </button>
        </form>

        {/* -- Cargas recientes ---------------------------------------------- */}
        {recents.length > 0 && (
          <Card className="p-4 sm:p-5">
            <CardTitle
              icon={Clock}
              title="Cargas recientes"
              sub="Si te equivocaste, puedes deshacer las últimas 3 cargas"
            />
            <div className="space-y-2">
              {recents.map((u) => {
                const isUndoing = undoingId === u.id;
                const date = new Date(u.timestamp);
                const ago = date.toLocaleString("es-CO", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                });
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(30,118,182,0.12)" }}
                  >
                    <div className="p-2 rounded-lg flex-shrink-0" style={{ background: "rgba(30,118,182,0.12)" }}>
                      <FilePlus className="w-3.5 h-3.5 text-[#1E76B6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#0A183A] truncate">{u.fileName}</p>
                      <p className="text-[10px] text-gray-400">
                        {u.count} llanta{u.count !== 1 ? "s" : ""} · {ago}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => undoUpload(u)}
                      disabled={isUndoing}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                      title="Deshacer esta carga (eliminar las llantas creadas)"
                    >
                      {isUndoing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Deshacer
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}