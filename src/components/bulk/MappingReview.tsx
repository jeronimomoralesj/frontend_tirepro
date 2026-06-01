"use client";

import React, { useMemo, useState } from "react";
import {
  Sparkles, AlertTriangle, CheckCircle2, ArrowLeft, Loader2, Info,
} from "lucide-react";
import type { AnalyzeResult, MappingIssue } from "./bulkMapping";

const IGNORE = "__ignore__";

interface MappingReviewProps {
  result: AnalyzeResult;
  loading?: boolean;
  confirmLabel?: string;
  onConfirm: (mapping: Record<string, string | null>) => void;
  onBack: () => void;
}

/**
 * AI-assisted column mapping review. Shows the AI's proposed header→field
 * mapping (editable), the data errors it detected, and live required-field
 * coverage — so the user can confirm a 100%-correct upload of an arbitrary
 * file structure before anything is written.
 */
export default function MappingReview({
  result,
  loading = false,
  confirmLabel = "Confirmar y cargar",
  onConfirm,
  onBack,
}: MappingReviewProps) {
  // Local, editable copy of the AI mapping. Selecting IGNORE → null.
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const h of result.headers) init[h] = result.mapping[h] ?? IGNORE;
    return init;
  });

  const fieldLabel = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of result.fields) m[f.field] = f.label;
    return m;
  }, [result.fields]);

  // Live required coverage as the user edits the dropdowns.
  const mappedFields = useMemo(
    () => new Set(Object.values(mapping).filter(v => v && v !== IGNORE)),
    [mapping],
  );
  const missingRequired = useMemo(
    () => result.fields.filter(f => f.required && !mappedFields.has(f.field)),
    [result.fields, mappedFields],
  );

  // Detect two columns pointing at the same single-value field (depths excepted).
  const duplicateFields = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of Object.values(mapping)) {
      if (!v || v === IGNORE || v.startsWith("profundidad_")) continue;
      counts[v] = (counts[v] ?? 0) + 1;
    }
    return Object.keys(counts).filter(k => counts[k] > 1);
  }, [mapping]);

  const errors = result.issues.filter(i => i.severity === "error");
  const warnings = result.issues.filter(i => i.severity === "warning");

  function setHeader(header: string, value: string) {
    setMapping(prev => ({ ...prev, [header]: value }));
  }

  function handleConfirm() {
    const out: Record<string, string | null> = {};
    for (const [h, v] of Object.entries(mapping)) out[h] = v === IGNORE ? null : v;
    onConfirm(out);
  }

  const sampleFor = (header: string): string => {
    const vals = result.sampleRows
      .map(r => String(r[header] ?? "").trim())
      .filter(Boolean)
      .slice(0, 3);
    return vals.join(" · ");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: "rgba(163,116,255,0.06)", border: "1px solid rgba(163,116,255,0.2)" }}
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#A374FF]" />
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#0A183A]">
            {result.aiUsed ? "Mapeo inteligente del archivo" : "Revisión del archivo"}
          </p>
          <p className="text-[11px] text-[#0A183A]/55 mt-0.5">
            {result.aiUsed
              ? `La IA detectó la estructura de tu archivo (${result.headers.length} columnas, ${result.totalRows} filas). Revisa y confirma el mapeo.`
              : "La IA no está disponible. Asigna manualmente cada columna a su campo o continúa para usar la detección automática del sistema."}
          </p>
        </div>
        {result.aiUsed && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              background: result.confidence >= 0.7 ? "rgba(22,163,74,0.1)" : "rgba(217,119,6,0.1)",
              color: result.confidence >= 0.7 ? "#16a34a" : "#d97706",
            }}
          >
            {Math.round(result.confidence * 100)}% confianza
          </span>
        )}
      </div>

      {/* Detected errors / warnings */}
      {(errors.length > 0 || missingRequired.length > 0) && (
        <IssueList
          tone="error"
          title="Errores detectados"
          items={[
            ...missingRequired.map(f => `Falta una columna para el campo requerido "${f.label}".`),
            ...errors.map(formatIssue),
          ]}
        />
      )}
      {duplicateFields.length > 0 && (
        <IssueList
          tone="error"
          title="Columnas duplicadas"
          items={duplicateFields.map(f => `Dos columnas están asignadas a "${fieldLabel[f] ?? f}". Deja solo una.`)}
        />
      )}
      {warnings.length > 0 && (
        <IssueList tone="warn" title="Advertencias" items={warnings.map(formatIssue)} />
      )}

      {/* Mapping table */}
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
        <div className="grid grid-cols-[1fr_1.1fr] gap-px text-[10px] font-black uppercase tracking-wide text-[#0A183A]/45"
          style={{ background: "rgba(10,24,58,0.04)" }}>
          <div className="px-3 py-2">Columna del archivo</div>
          <div className="px-3 py-2">Campo de TirePro</div>
        </div>
        <div className="max-h-[22rem] overflow-y-auto">
          {result.headers.map(h => {
            const val = mapping[h];
            const isIgnored = val === IGNORE;
            const sample = sampleFor(h);
            return (
              <div
                key={h}
                className="grid grid-cols-[1fr_1.1fr] items-center gap-2 px-3 py-2"
                style={{ borderTop: "1px solid rgba(10,24,58,0.05)" }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-[#0A183A]" title={h}>{h}</p>
                  {sample && <p className="truncate text-[10px] text-[#0A183A]/40" title={sample}>{sample}</p>}
                </div>
                <select
                  value={val}
                  onChange={e => setHeader(h, e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-[12px] text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/30"
                  style={{
                    border: `1px solid ${isIgnored ? "rgba(10,24,58,0.12)" : "rgba(30,118,182,0.35)"}`,
                    background: isIgnored ? "rgba(10,24,58,0.02)" : "rgba(30,118,182,0.04)",
                    color: isIgnored ? "rgba(10,24,58,0.4)" : "#0A183A",
                  }}
                >
                  <option value={IGNORE}>Ignorar columna</option>
                  {result.fields.map(f => (
                    <option key={f.field} value={f.field}>
                      {f.label}{f.required ? " *" : ""}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coverage hint */}
      <div className="flex items-center gap-2 text-[11px]">
        {missingRequired.length === 0 ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
            <span className="text-[#16a34a] font-semibold">Todos los campos requeridos están asignados.</span>
          </>
        ) : (
          <>
            <Info className="h-3.5 w-3.5 text-[#d97706]" />
            <span className="text-[#d97706]">
              Puedes continuar: el sistema intentará completar los campos faltantes automáticamente.
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#0A183A]/60 transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
          style={{ border: "1px solid rgba(10,24,58,0.15)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cambiar archivo
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || duplicateFields.length > 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#0A183A", boxShadow: "0 2px 8px rgba(10,24,58,0.2)" }}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />Procesando…</>
            : <><CheckCircle2 className="h-4 w-4" />{confirmLabel}</>}
        </button>
      </div>
    </div>
  );
}

function formatIssue(i: MappingIssue): string {
  return i.ref ? `${i.ref}: ${i.message}` : i.message;
}

function IssueList({ tone, title, items }: { tone: "error" | "warn"; title: string; items: string[] }) {
  if (items.length === 0) return null;
  const color = tone === "error" ? "#dc2626" : "#d97706";
  const bg = tone === "error" ? "rgba(220,38,38,0.05)" : "rgba(217,119,6,0.05)";
  const border = tone === "error" ? "rgba(220,38,38,0.2)" : "rgba(217,119,6,0.2)";
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="mb-1.5 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[12px] font-bold" style={{ color }}>{title}</span>
      </div>
      <ul className="space-y-0.5 pl-5">
        {items.map((t, i) => (
          <li key={i} className="list-disc text-[11px]" style={{ color }}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
