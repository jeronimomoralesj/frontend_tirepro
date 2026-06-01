"use client";

import { useEffect, useMemo, useState } from "react";
import { X, FileText, Check, Download, Loader2, LayoutTemplate, SlidersHorizontal, Pencil, Palette, Filter } from "lucide-react";
import {
  generateResumenReportPdf,
  SECTION_ORDER,
  SECTION_LABELS,
  type ResumenReportData,
  type ResumenSection,
} from "@/shared/resumenReportPdf";
import type { ReportFilterOpts } from "@/shared/buildResumenReport";

// -- Templates ----------------------------------------------------------------

type Template = {
  id: string;
  name: string;
  desc: string;
  accent: string;
  sections: ResumenSection[];
};

const TEMPLATES: Template[] = [
  {
    id: "ejecutivo",
    name: "Ejecutivo",
    desc: "Conciso para directivos: KPIs, CPK, inversión y top CPK.",
    accent: "#1E76B6",
    sections: ["kpis", "cpk", "inversion", "mejores_cpk"],
  },
  {
    id: "completo",
    name: "Completo",
    desc: "Todos los indicadores, tendencias y distribuciones.",
    accent: "#0A183A",
    sections: ["kpis", "cpk", "inversion", "dinero_perdido", "marca", "vida", "dimension", "mejores_cpk"],
  },
  {
    id: "financiero",
    name: "Financiero",
    desc: "Costos: inversión, dinero perdido y mejores combinaciones.",
    accent: "#16a34a",
    sections: ["kpis", "inversion", "dinero_perdido", "mejores_cpk"],
  },
  {
    id: "operativo",
    name: "Operativo",
    desc: "Composición de la flota: marca, vida, dimensión y CPK.",
    accent: "#7c3aed",
    sections: ["kpis", "marca", "vida", "dimension", "cpk"],
  },
];

const COLOR_PRESETS = ["#1E76B6", "#0A183A", "#16a34a", "#7c3aed", "#dc2626", "#ea580c", "#0891b2", "#db2777"];

const VIDA_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Todos", label: "Todas las vidas" },
  { value: "nueva", label: "Nueva" },
  { value: "reencauche1", label: "Reencauche 1" },
  { value: "reencauche2", label: "Reencauche 2" },
  { value: "reencauche3", label: "Reencauche 3" },
  { value: "fin", label: "Fin de vida" },
];

// -- Component ----------------------------------------------------------------

export default function ExportModal({
  open,
  onClose,
  buildData,
  defaultFilters,
  marcaOptions,
  ejeOptions,
  defaultTitle,
  defaultCompany,
  defaultPreparedBy,
}: {
  open: boolean;
  onClose: () => void;
  buildData: (opts: ReportFilterOpts) => ResumenReportData;
  defaultFilters: ReportFilterOpts;
  marcaOptions: string[];
  ejeOptions: string[];
  defaultTitle: string;
  defaultCompany: string;
  defaultPreparedBy: string;
}) {
  const [templateId, setTemplateId] = useState<string>("ejecutivo");
  const [selected, setSelected] = useState<Set<ResumenSection>>(new Set(TEMPLATES[0].sections));
  const [accent, setAccent] = useState<string>(TEMPLATES[0].accent);
  const [title, setTitle] = useState(defaultTitle);
  const [company, setCompany] = useState(defaultCompany);
  const [preparedBy, setPreparedBy] = useState(defaultPreparedBy);
  const [note, setNote] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<ReportFilterOpts>(defaultFilters);
  const [generating, setGenerating] = useState(false);

  const template = useMemo(() => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0], [templateId]);

  // Resync editable fields + filters when the modal (re)opens.
  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setCompany(defaultCompany);
    setPreparedBy(defaultPreparedBy);
    setFilters(defaultFilters);
  }, [open, defaultTitle, defaultCompany, defaultPreparedBy, defaultFilters]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !generating) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, generating, onClose]);

  // Live report data for the chosen filters — drives the preview count.
  const data = useMemo(() => (open ? buildData(filters) : null), [open, buildData, filters]);

  if (!open) return null;

  function pickTemplate(t: Template) {
    setTemplateId(t.id);
    setSelected(new Set(t.sections));
    setAccent(t.accent);
  }
  function toggleSection(id: ResumenSection) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function setFilter<K extends keyof ReportFilterOpts>(key: K, value: ReportFilterOpts[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const orderedSections = SECTION_ORDER.filter((s) => selected.has(s));

  async function handleGenerate() {
    if (orderedSections.length === 0 || !data) return;
    setGenerating(true);
    try {
      await generateResumenReportPdf(data, {
        templateId: template.id,
        templateName: template.name,
        title: title.trim() || "Reporte de Resumen",
        company: company.trim(),
        preparedBy: preparedBy.trim(),
        note,
        showFilters,
        accent,
        sections: orderedSections,
      });
      onClose();
    } catch (e) {
      console.error("Error generando el PDF de resumen:", e);
    } finally {
      setGenerating(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg text-sm text-[#0A183A] bg-white border border-[#0A183A]/12 focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/15 outline-none transition-colors";
  const labelCls = "block text-[11px] font-medium text-[#173D68]/60 mb-1";
  const sectionHead = "text-[11px] font-bold uppercase tracking-wider text-[#173D68]/50";

  const hasFilters =
    (filters.marca && filters.marca !== "Todos") ||
    (filters.eje && filters.eje !== "Todos") ||
    (filters.vida && filters.vida !== "Todos") ||
    filters.search.trim() || filters.dateFrom || filters.dateTo;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A183A]/40 backdrop-blur-sm" onClick={() => { if (!generating) onClose(); }} />

      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#0A183A]/8">
          <div className="p-2 rounded-xl" style={{ background: `${accent}14` }}>
            <FileText className="w-4 h-4" style={{ color: accent }} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-[#0A183A] leading-none">Exportar reporte</h2>
            <p className="text-[11px] text-[#173D68]/50 mt-1">Plantilla, color, datos y contenido — todo a tu medida.</p>
          </div>
          <button onClick={() => { if (!generating) onClose(); }} className="p-1.5 rounded-lg text-[#173D68]/50 hover:bg-[#0A183A]/[0.04] hover:text-[#173D68] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Templates */}
          <section>
            <div className="flex items-center gap-1.5 mb-2.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-[#173D68]/50" />
              <h3 className={sectionHead}>Plantilla</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEMPLATES.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    onClick={() => pickTemplate(t)}
                    className="text-left rounded-xl p-3 transition-all"
                    style={{ border: active ? `2px solid ${accent}` : "1px solid rgba(10,24,58,0.1)", background: active ? `${accent}0d` : "white" }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-[#0A183A]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: active ? accent : t.accent }} />
                        {t.name}
                      </span>
                      {active && <Check className="w-4 h-4" style={{ color: accent }} />}
                    </div>
                    <p className="text-[11px] leading-snug text-[#173D68]/55">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Color */}
          <section>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Palette className="w-3.5 h-3.5 text-[#173D68]/50" />
              <h3 className={sectionHead}>Color de marca</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccent(c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ background: c, outline: accent.toLowerCase() === c.toLowerCase() ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                  title={c}
                >
                  {accent.toLowerCase() === c.toLowerCase() && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
              <label className="flex items-center gap-1.5 ml-1 px-2.5 py-1.5 rounded-lg cursor-pointer text-[12px] font-medium text-[#173D68]/70" style={{ border: "1px solid rgba(10,24,58,0.1)" }}>
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: accent }} />
                Personalizado
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="sr-only" />
              </label>
            </div>
          </section>

          {/* Data filters */}
          <section>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Filter className="w-3.5 h-3.5 text-[#173D68]/50" />
              <h3 className={sectionHead}>Datos del reporte</h3>
              {data && (
                <span className="ml-auto text-[11px] font-bold" style={{ color: accent }}>
                  {data.kpis.totalLlantas.toLocaleString("es-CO")} llantas
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Marca</label>
                <select className={inputCls} value={filters.marca} onChange={(e) => setFilter("marca", e.target.value)}>
                  {["Todos", ...marcaOptions.filter((m) => m !== "Todos")].map((m) => <option key={m} value={m}>{m === "Todos" ? "Todas" : m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Eje</label>
                <select className={inputCls} value={filters.eje} onChange={(e) => setFilter("eje", e.target.value)}>
                  {["Todos", ...ejeOptions.filter((m) => m !== "Todos")].map((m) => <option key={m} value={m}>{m === "Todos" ? "Todos" : m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Vida</label>
                <select className={inputCls} value={filters.vida} onChange={(e) => setFilter("vida", e.target.value)}>
                  {VIDA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Desde</label>
                <input type="date" className={inputCls} value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Hasta</label>
                <input type="date" className={inputCls} value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Buscar</label>
                <input className={inputCls} value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Placa o marca" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[11px] text-[#173D68]/45">El rango de fechas define el período de las gráficas (ej. ene–dic 2027).</p>
              {hasFilters && (
                <button
                  onClick={() => setFilters({ marca: "Todos", eje: "Todos", vida: "Todos", search: "", dateFrom: "", dateTo: "" })}
                  className="ml-auto text-[11px] font-medium text-[#173D68]/60 hover:text-[#0A183A] underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </section>

          {/* Sections */}
          <section>
            <div className="flex items-center gap-1.5 mb-2.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#173D68]/50" />
              <h3 className={sectionHead}>Secciones a incluir</h3>
              <span className="ml-auto text-[11px] font-medium text-[#173D68]/40">{orderedSections.length} seleccionadas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {SECTION_ORDER.map((id) => {
                const checked = selected.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleSection(id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[#0A183A]/[0.03]"
                    style={{ border: "1px solid rgba(10,24,58,0.07)" }}
                  >
                    <span className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: checked ? accent : "white", border: checked ? `1px solid ${accent}` : "1px solid rgba(10,24,58,0.2)" }}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-[13px] font-medium text-[#0A183A]">{SECTION_LABELS[id]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Details */}
          <section>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Pencil className="w-3.5 h-3.5 text-[#173D68]/50" />
              <h3 className={sectionHead}>Detalles del reporte</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Título</label>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reporte de Resumen" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Empresa (opcional)</label>
                  <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nombre de la empresa" />
                </div>
                <div>
                  <label className={labelCls}>Preparado por (opcional)</label>
                  <input className={inputCls} value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Tu nombre" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Observaciones (opcional)</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notas o contexto que aparecerán en la portada…" />
              </div>
              <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-2.5 px-1 py-1 transition-colors">
                <span className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0" style={{ background: showFilters ? accent : "white", border: showFilters ? `1px solid ${accent}` : "1px solid rgba(10,24,58,0.2)" }}>
                  {showFilters && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="text-[13px] font-medium text-[#0A183A]">Mostrar los filtros aplicados en la portada</span>
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#0A183A]/8 bg-[#F8FAFC]">
          <p className="text-[11px] text-[#173D68]/45">
            {orderedSections.length === 0 ? "Selecciona al menos una sección" : `${orderedSections.length} ${orderedSections.length === 1 ? "sección" : "secciones"} · ${template.name}`}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (!generating) onClose(); }} className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#173D68]/70 hover:bg-[#0A183A]/[0.05] transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || orderedSections.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: accent }}
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {generating ? "Generando…" : "Generar PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
