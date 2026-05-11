"use client";

import { useState } from "react";
import { Calendar, Download, Loader2, AlertCircle, FileText } from "lucide-react";
import {
  generateInspectionsDayReportPdf,
  type InspectionsDayReport,
} from "./inspectionsDayReportPdf";

// -----------------------------------------------------------------------------
// Inspections-of-the-day report card
//
// Drop-in section for /dashboard/resumen (and the distribuidor view) — picks a
// date, calls the aggregating endpoint, and pipes the result to the shared
// client-side PDF generator. The component is fully self-contained so the
// host page doesn't need to know anything about jspdf or the response shape.
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

export default function InspectionsDayReportCard({
  companyId,
}: {
  companyId: string | null | undefined;
}) {
  const [date, setDate]         = useState<string>(todayIso());
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string>("");
  const [preview, setPreview]   = useState<{ vehicles: number; tires: number } | null>(null);

  async function handleDownload() {
    if (!companyId) {
      setError("No se pudo determinar la empresa");
      return;
    }
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      const res = await authFetch(
        `${API_BASE}/tires/inspections-day-report?companyId=${encodeURIComponent(companyId)}&date=${encodeURIComponent(date)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        throw new Error(body?.message ?? "No se pudo cargar el reporte");
      }
      const report = (await res.json()) as InspectionsDayReport;
      if (report.totals.totalTires === 0) {
        setError("No hay inspecciones registradas en esa fecha");
        return;
      }
      setPreview({ vehicles: report.totals.vehiclesInspected, tires: report.totals.totalTires });
      await generateInspectionsDayReportPdf(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-[#173D68] text-white p-4 sm:p-5 flex items-center gap-3">
        <FileText className="w-5 h-5 flex-shrink-0" />
        <div>
          <h2 className="text-base sm:text-lg font-bold">Reporte de inspecciones del día</h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Descarga todas las inspecciones realizadas en un día específico en PDF.
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
              onChange={(e) => { setDate(e.target.value); setError(""); setPreview(null); }}
              className="w-full pl-9 pr-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy || !companyId}
          onClick={handleDownload}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {busy ? "Generando…" : "Descargar reporte"}
        </button>
      </div>

      {(error || preview) && (
        <div className="px-4 sm:px-6 pb-4">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-800">{error}</p>
            </div>
          )}
          {preview && !error && (
            <p className="text-xs text-gray-500">
              Reporte generado · <span className="font-bold text-[#0A183A]">{preview.vehicles}</span> vehículo(s),
              {" "}<span className="font-bold text-[#0A183A]">{preview.tires}</span> llanta(s).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
