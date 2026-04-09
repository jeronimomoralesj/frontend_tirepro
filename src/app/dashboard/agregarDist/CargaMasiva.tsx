"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FilePlus, Upload, Download, Info, ChevronDown, Search,
  X, AlertTriangle, CheckCircle, Loader2, Layers,
  RotateCcw, Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

// =============================================================================
// Types
// =============================================================================

interface Company {
  id: string;
  name: string;
}

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
// Recent uploads (localStorage) — keeps the last 3 bulk uploads PER company
// so the distributor can mass-undo a recent run if they uploaded the wrong
// file or made a typo.
// =============================================================================

const RECENT_KEY = "tirepro:recent-bulk-uploads:tires";
const MAX_RECENT = 3;

interface RecentUpload {
  id: string;
  timestamp: number;
  fileName: string;
  count: number;
  tireIds: string[];
  companyId: string;
  companyName: string;
}

function loadRecentUploads(): RecentUpload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentUpload[];
  } catch { return []; }
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
  for (const u of all) (byCompany[u.companyId] ??= []).push(u);
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

const inputStyle = { border: "1.5px solid rgba(52,140,203,0.2)" };

// =============================================================================
// Main component
// =============================================================================

export default function CargaMasiva({ language = "es" }: CargaMasivaProps) {
  const [file,              setFile]              = useState<File | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [message,           setMessage]           = useState<string>();
  const [messageType,       setMessageType]       = useState<"success" | "error">();
  const [companies,         setCompanies]         = useState<Company[]>([]);
  const [selectedCompany,   setSelectedCompany]   = useState<string>("Todos");
  const [showDropdown,      setShowDropdown]      = useState(false);
  const [clientSearch,      setClientSearch]      = useState("");
  const [showInstructions,  setShowInstructions]  = useState(false);
  const [dragging,          setDragging]          = useState(false);
  const [previewRows,       setPreviewRows]       = useState<Record<string, any>[]>([]);
  const [previewHeaders,    setPreviewHeaders]    = useState<string[]>([]);
  const [recents,           setRecents]           = useState<RecentUpload[]>([]);
  const [undoingId,         setUndoingId]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setRecents(loadRecentUploads()); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch distributor clients on mount
  useEffect(() => {
    authFetch(`${API_BASE}/companies/me/clients`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        setCompanies(data.map((access: any) => ({
          id:   access.company?.id   ?? access.id,
          name: access.company?.name ?? access.name,
        })));
      })
      .catch(console.error);
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
    // Parse client-side for preview
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
    const ok = window.confirm(
      `¿Eliminar las ${upload.count} llantas creadas en "${upload.fileName}" para ${upload.companyName}? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setUndoingId(upload.id);
    try {
      const res = await authFetch(`${API_BASE}/tires/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tireIds: upload.tireIds, companyId: upload.companyId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json().catch(() => ({ deleted: upload.count }));
      removeRecentUpload(upload.id);
      setRecents(loadRecentUploads());
      setMessage(`${data.deleted ?? upload.count} llantas eliminadas correctamente.`);
      setMessageType("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo deshacer la carga.");
      setMessageType("error");
    } finally {
      setUndoingId(null);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  // -- Download template ------------------------------------------------------
  function handleDownloadTemplate() {
    const headers = FIELDS.join("\t");
    const blob = new Blob([headers], { type: "text/tab-separated-values" });
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

    // Determine companyId: selected client or own company from localStorage
    let companyId: string | null = null;
    if (selectedCompany !== "Todos") {
      companyId = companies.find(c => c.name === selectedCompany)?.id ?? null;
      if (!companyId) { setMessage("Empresa no encontrada."); setMessageType("error"); return; }
    } else {
      try {
        const user = JSON.parse(localStorage.getItem("user") ?? "{}");
        companyId = user?.companyId ?? null;
      } catch { /* ignore */ }
    }

    if (!companyId) {
      setMessage("No se encontró companyId. Seleccione un cliente o vuelva a iniciar sesión.");
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

      // Track this run so it can be undone from "Cargas recientes".
      const createdIds: string[] = Array.isArray(data.createdTireIds) ? data.createdTireIds : [];
      if (createdIds.length > 0 && file) {
        const companyName = selectedCompany !== "Todos"
          ? selectedCompany
          : "Mi empresa";
        saveRecentUpload({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          fileName: file.name,
          count: data.success ?? createdIds.length,
          tireIds: createdIds,
          companyId,
          companyName,
        });
        setRecents(loadRecentUploads());
      }

      clearFile();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error inesperado en la carga masiva.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  // Normalize for accent-insensitive search (e.g. "transpo" matches "Transportes")
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const filteredCompanies = clientSearch.trim()
    ? companies.filter(c => normalize(c.name).includes(normalize(clientSearch)))
    : companies;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={{ background: "white" }}>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">

        {/* -- Company selector --------------------------------------------- */}
        {companies.length > 0 && (
          <div className="relative flex justify-end" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowDropdown(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
            >
              <span className="max-w-[140px] truncate">
                {selectedCompany === "Todos" ? "Seleccionar cliente" : selectedCompany}
              </span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {showDropdown && (
              <div
                className="absolute right-0 mt-10 w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-50"
                style={{
                  background: "white",
                  border: "1px solid rgba(52,140,203,0.15)",
                  boxShadow: "0 8px 32px rgba(10,24,58,0.12)",
                }}
              >
                {/* Search box */}
                <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(52,140,203,0.2)" }}>
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="flex-1 bg-transparent text-sm text-[#0A183A] placeholder-gray-400 focus:outline-none"
                    />
                    {clientSearch && (
                      <button
                        type="button"
                        onClick={() => setClientSearch("")}
                        className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200/60"
                        aria-label="Limpiar busqueda"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                  {filteredCompanies.length > 0 && (
                    <p className="text-[10px] text-gray-400 px-1 mt-1.5">
                      {filteredCompanies.length} de {companies.length} cliente{companies.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Scrollable list */}
                <div className="max-h-80 overflow-y-auto">
                  {/* "Mi empresa" always at top */}
                  <button
                    type="button"
                    onClick={() => { setSelectedCompany("Todos"); setClientSearch(""); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(30,118,182,0.06)] border-b border-gray-50"
                    style={{
                      fontWeight: selectedCompany === "Todos" ? 800 : 500,
                      color: selectedCompany === "Todos" ? "#1E76B6" : "#64748B",
                    }}
                  >
                    — Mi empresa —
                  </button>

                  {filteredCompanies.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-gray-400">No se encontraron clientes</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">Intenta otra busqueda</p>
                    </div>
                  ) : (
                    filteredCompanies.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCompany(c.name); setClientSearch(""); setShowDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(30,118,182,0.06)]"
                        style={{
                          fontWeight: selectedCompany === c.name ? 800 : 500,
                          color: selectedCompany === c.name ? "#1E76B6" : "#0A183A",
                        }}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -- Result banners ---------------------------------------------- */}
        {message && messageType === "error" && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-red-700">{message}</span>
            <button onClick={() => setMessage(undefined)}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}
        {message && messageType === "success" && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}
          >
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-green-700 whitespace-pre-line">{message}</span>
            <button onClick={() => setMessage(undefined)}><X className="w-4 h-4 text-green-400" /></button>
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
            <div className="px-4 sm:px-5 pb-5 space-y-4 border-t" style={{ borderColor: "rgba(52,140,203,0.1)" }}>
              <p className="text-xs text-gray-500 pt-4">
                Para subir las llantas asegúrate de tener estos campos y que tengan estos títulos en tu archivo Excel:
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
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
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
            <CardTitle icon={Upload} title="Archivo Excel" sub="Arrastra o selecciona tu archivo .xlsx / .xls" />

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
              sub="Si te equivocaste, puedes deshacer las últimas 3 cargas por cliente"
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
                        {u.count} llanta{u.count !== 1 ? "s" : ""} · {u.companyName} · {ago}
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