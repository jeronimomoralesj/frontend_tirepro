"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, Loader2, AlertCircle, FileText, Truck, Package } from "lucide-react";
import {
  generateInspectionsDayReportPdf,
  type InspectionsDayReport,
} from "./inspectionsDayReportPdf";

// -----------------------------------------------------------------------------
// Inspections report card
//
// Drop-in section for /dashboard/resumen (and the distribuidor view) — picks a
// date RANGE, calls the aggregating endpoint, and pipes the result to the
// shared client-side PDF generator. Changing either date triggers a debounced
// preview fetch so the user sees the headline counts (vehicles, tires) before
// committing to a PDF.
//
// `companyId` is the report's scope. For pro accounts that's the user's own
// company; for distribuidores it's the picked client. When the logged-in
// user's own company differs from the report scope, we pass it as
// `distributorId` so the backend can co-brand the PDF with the distributor's
// logo (it independently validates the access before honoring the hint).
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

/** Own company id from the stored user — used as the distributor branding hint. */
function ownCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const u = JSON.parse(localStorage.getItem("user") ?? "{}");
    return typeof u?.companyId === "string" ? u.companyId : null;
  } catch {
    return null;
  }
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
  const [from, setFrom]                = useState<string>(todayIso());
  const [to, setTo]                    = useState<string>(todayIso());
  // Cache the last fetched report so "Descargar" doesn't re-hit the API
  // immediately after the preview just hit it.
  const [report, setReport]            = useState<InspectionsDayReport | null>(null);
  const [preview, setPreview]          = useState<Preview | null>(null);
  const [previewing, setPreviewing]    = useState(false);
  const [downloading, setDownloading]  = useState(false);
  const [error, setError]              = useState<string>("");
  const [info, setInfo]                = useState<string>("");

  // Debounced preview fetch — fires whenever the user changes either date or
  // the company. We keep the response in state so the download button can
  // reuse it without a second round-trip.
  useEffect(() => {
    if (!companyId || !from || !to) {
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
        const distId = ownCompanyId();
        const params = new URLSearchParams({ companyId, from, to });
        if (distId && distId !== companyId) params.set("distributorId", distId);
        const res = await authFetch(
          `${API_BASE}/tires/inspections-day-report?${params.toString()}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as { message?: string }));
          throw new Error(body?.message ?? "No se pudo cargar el reporte");
        }
        const data = (await res.json()) as InspectionsDayReport;
        if (cancelled) return;
        setReport(data);
        if (data.totals.totalTires === 0) {
          setInfo("No hay inspecciones registradas en ese rango de fechas");
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
  }, [companyId, from, to]);

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
    <div
      className="w-full bg-white rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        border: "1px solid rgba(10,24,58,0.08)",
        boxShadow: "0 2px 12px -4px rgba(10,24,58,0.08)",
      }}
    >
      {/* Header — matches the dashboard card design system */}
      <div
        className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(10,24,58,0.06)" }}
      >
        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(163,116,255,0.08)" }}>
          <FileText className="h-3.5 w-3.5 text-[#A374FF]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#0A183A] leading-none">Reporte de inspecciones</h2>
          <p className="text-[11px] text-[#0A183A]/40 mt-1">
            Elige un rango de fechas y descarga el PDF
          </p>
        </div>
      </div>

      {/* Date range + download */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end gap-3">
        <DateField
          label="Desde"
          value={from}
          max={to || todayIso()}
          onChange={(v) => setFrom(v)}
        />
        <DateField
          label="Hasta"
          value={to}
          min={from || undefined}
          max={todayIso()}
          onChange={(v) => setTo(v)}
        />
        <button
          type="button"
          disabled={!canDownload}
          onClick={handleDownload}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-[0.99] shrink-0"
          style={{ background: "linear-gradient(135deg,#1E76B6,#0A183A)" }}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

      <div className="px-4 sm:px-5 pb-4 min-h-[36px]">
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

        {/* Preview chips — confirm there's data for the range before
            committing to the full PDF. */}
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

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 min-w-0">
      <label className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-[#0A183A] bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
          style={{ border: "1px solid rgba(10,24,58,0.1)" }}
        />
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
