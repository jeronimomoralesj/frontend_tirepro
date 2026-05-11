"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, Loader2, AlertCircle, FileText, Truck, Package } from "lucide-react";
import {
  generateInspectionsDayReportPdf,
  type InspectionsDayReport,
} from "./inspectionsDayReportPdf";

// -----------------------------------------------------------------------------
// Inspections-of-the-day report card
//
// Drop-in section for /dashboard/resumen (and the distribuidor view) — picks a
// date, calls the aggregating endpoint, and pipes the result to the shared
// client-side PDF generator. Changing the date triggers a debounced preview
// fetch so the user sees the headline counts (vehicles inspected, tires)
// before deciding whether to commit to a PDF.
//
// `companyId` is the report's scope. For pro accounts that's the user's own
// company; for distribuidores it's the picked client (or their own — backend
// expands DistributorAccess either way, so we just pass whatever the host
// currently has selected).
// -----------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Preview = {
  vehicles: number;
  tires: number;
  semaforo: InspectionsDayReport["totals"]["semaforo"];
};

export default function InspectionsDayReportCard({
  companyId,
}: {
  companyId: string | null | undefined;
}) {
  const [date, setDate]                = useState<string>(todayIso());
  // Cache the last fetched report so "Descargar" doesn't re-hit the API
  // immediately after the preview just hit it.
  const [report, setReport]            = useState<InspectionsDayReport | null>(null);
  const [preview, setPreview]          = useState<Preview | null>(null);
  const [previewing, setPreviewing]    = useState(false);
  const [downloading, setDownloading]  = useState(false);
  const [error, setError]              = useState<string>("");
  const [info, setInfo]                = useState<string>("");

  // Debounced preview fetch — fires whenever the user picks a new date or
  // the company changes. We keep the response in state so the download
  // button can reuse it without a second round-trip.
  useEffect(() => {
    if (!companyId || !date) {
      setReport(null);
      setPreview(null);
      return;
    }
    let cancelled = false;
    setError("");
    setInfo("");
    setPreview(null);
    setReport(null);
    setPreviewing(true);
    const t = setTimeout(async () => {
      try {
        const res = await authFetch(
          `${API_BASE}/tires/inspections-day-report?companyId=${encodeURIComponent(companyId)}&date=${encodeURIComponent(date)}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as { message?: string }));
          throw new Error(body?.message ?? "No se pudo cargar el reporte");
        }
        const data = (await res.json()) as InspectionsDayReport;
        if (cancelled) return;
        setReport(data);
        if (data.totals.totalTires === 0) {
          setInfo("No hay inspecciones registradas en esa fecha");
          setPreview(null);
        } else {
          setPreview({
            vehicles: data.totals.vehiclesInspected,
            tires:    data.totals.totalTires,
            semaforo: data.totals.semaforo,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [companyId, date]);

  async function handleDownload() {
    if (!report || report.totals.totalTires === 0) return;
    setDownloading(true);
    try {
      await generateInspectionsDayReportPdf(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setDownloading(false);
    }
  }

  const canDownload = !!report && report.totals.totalTires > 0 && !previewing && !downloading;

  return (
    <div className="relative w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-4 sm:p-5 flex items-center gap-3">
        <FileText className="w-5 h-5 flex-shrink-0" />
        <div>
          <h2 className="text-base sm:text-lg font-bold">Reporte de inspecciones del día</h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Selecciona una fecha para ver el resumen y descargar el PDF.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <label className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-1.5 block">
            Fecha
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={!canDownload}
          onClick={handleDownload}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-4 min-h-[36px]">
        {previewing && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Cargando resumen…
          </p>
        )}

        {!previewing && error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-800">{error}</p>
          </div>
        )}

        {!previewing && !error && info && (
          <p className="text-xs text-gray-500 italic">{info}</p>
        )}

        {/* Preview chips — give the user a "we have data for this day"
            confirmation before they commit to generating the full PDF. */}
        {!previewing && !error && preview && (
          <div className="flex flex-wrap gap-2">
            <Stat
              icon={<Truck className="w-3 h-3" />}
              label="Vehículos inspeccionados"
              value={preview.vehicles}
              tone="primary"
            />
            <Stat
              icon={<Package className="w-3 h-3" />}
              label="Llantas inspeccionadas"
              value={preview.tires}
              tone="primary"
            />
            {preview.semaforo.cambio_inmediato > 0 && (
              <Stat label="Cambio inmediato" value={preview.semaforo.cambio_inmediato} tone="danger" />
            )}
            {preview.semaforo.proyectado_30 > 0 && (
              <Stat label="Proyectado 30 días" value={preview.semaforo.proyectado_30} tone="warning" />
            )}
            {preview.semaforo.proyectado_60 > 0 && (
              <Stat label="Proyectado 60 días" value={preview.semaforo.proyectado_60} tone="warning2" />
            )}
            {preview.semaforo.buen_estado > 0 && (
              <Stat label="En buen estado" value={preview.semaforo.buen_estado} tone="success" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "danger" | "warning" | "warning2" | "success";
}) {
  const palette =
    tone === "danger"   ? { bg: "rgba(239,68,68,0.08)",  br: "rgba(239,68,68,0.3)",  fg: "#b91c1c" }
    : tone === "warning"  ? { bg: "rgba(245,158,11,0.08)", br: "rgba(245,158,11,0.3)", fg: "#b45309" }
    : tone === "warning2" ? { bg: "rgba(250,204,21,0.12)", br: "rgba(250,204,21,0.45)", fg: "#854d0e" }
    : tone === "success"  ? { bg: "rgba(34,197,94,0.1)",   br: "rgba(34,197,94,0.3)",  fg: "#15803d" }
    : { bg: "rgba(30,118,182,0.08)", br: "rgba(30,118,182,0.3)", fg: "#1E76B6" };
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{ background: palette.bg, border: `1px solid ${palette.br}` }}
    >
      {icon && <span style={{ color: palette.fg }}>{icon}</span>}
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: palette.fg }}>
        {label}
      </span>
      <span className="text-sm font-black" style={{ color: palette.fg }}>{value}</span>
    </div>
  );
}
