// -----------------------------------------------------------------------------
// buildResumenReport — turns a raw tire snapshot + a set of report filters into
// the presentational `ResumenReportData` the PDF generator consumes.
//
// The on-screen dashboard (dashboard/resumen/page.tsx) derives the same figures
// inline from its live `filtered` memo. This module mirrors that math so the
// export can be RE-FILTERED independently of the screen — the user can ask for
// "only brand X, rear axle, Jan–Dec 2027" without changing what they're looking
// at. The aggregation algorithms (inversion allow-list, km-weighted CPK,
// dinero-perdido waste model, top-CPK grouping) are kept byte-for-byte in step
// with the page so the numbers match.
//
// Key difference vs the dashboard: the 12-month trend window is DYNAMIC. With a
// date range it spans the months of that range (capped at 24 buckets); with no
// range it falls back to the last 12 months from today. Cost/inspection records
// outside the window simply map to a month key that isn't plotted.
// -----------------------------------------------------------------------------

import type { ResumenReportData, Distribution } from "./resumenReportPdf";

export type RawCosto = { valor: number; fecha: string | Date; concepto?: string | null };
export type RawInspeccion = {
  fecha: string | Date;
  cpkProyectado: number | null;
  cpk?: number | null;
  lifetimeCpk?: number | null;
};
export type ReportTire = {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  dimension: string;
  eje: string;
  vehicleId: string | null;
  profundidadInicial: number;
  kilometrosRecorridos: number;
  currentCpk: number | null;
  lifetimeCpk?: number | null;
  currentProfundidad: number | null;
  projectedProfundidad?: number | null;
  vidaActual: string;
  costos: RawCosto[];
  inspecciones: RawInspeccion[];
};

export type ReportFilterOpts = {
  marca: string; // "Todos" or a brand
  eje: string;   // "Todos" or an axle
  vida: string;  // "Todos" | nueva | reencauche1.. | fin
  search: string;
  dateFrom: string; // "YYYY-MM-DD" or ""
  dateTo: string;   // "YYYY-MM-DD" or ""
};

// -- Inversion allow-list (mirrors page.tsx) ----------------------------------

const INVERSION_CONCEPTS = new Set(["compra_nueva", "reencauche", ""]);
function isInversionCost(c: { concepto?: string | null }): boolean {
  return INVERSION_CONCEPTS.has((c.concepto ?? "").toLowerCase().trim());
}

// -- Month helpers ------------------------------------------------------------

type MonthBucket = { key: string; label: string };

function monthLabel(d: Date): string {
  return d.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}
function monthKeyOf(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}
function toMonthKey(fecha: string | Date): string {
  const d = new Date(fecha);
  return monthKeyOf(d.getFullYear(), d.getMonth());
}
function localDay(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("en-CA"); // YYYY-MM-DD, local tz
}

// Build the month buckets the trends will plot.
function buildWindow(dateFrom: string, dateTo: string): { months: MonthBucket[]; periodLabel: string } {
  const mk = (y: number, m0: number): MonthBucket => {
    const d = new Date(y, m0, 1);
    return { key: monthKeyOf(y, m0), label: monthLabel(d) };
  };

  if (!dateFrom && !dateTo) {
    const now = new Date();
    const months: MonthBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(mk(d.getFullYear(), d.getMonth()));
    }
    return { months, periodLabel: "Últimos 12 meses" };
  }

  const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
  const to = dateTo ? new Date(dateTo + "T00:00:00") : null;
  // Anchor the ends: if only one bound is given, span 12 months around it.
  const end = to ?? from!;
  const start = from ?? new Date(end.getFullYear(), end.getMonth() - 11, 1);

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const months: MonthBucket[] = [];
  while (cursor <= last && months.length < 24) {
    months.push(mk(cursor.getFullYear(), cursor.getMonth()));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  if (months.length === 0) months.push(mk(last.getFullYear(), last.getMonth()));
  const periodLabel = months.length === 1
    ? months[0].label
    : `${months[0].label} – ${months[months.length - 1].label}`;
  return { months, periodLabel };
}

// -- Human-readable filter summary -------------------------------------------

function filtersLabel(f: ReportFilterOpts): string {
  return [
    f.marca && f.marca !== "Todos" ? `Marca: ${f.marca}` : "",
    f.eje && f.eje !== "Todos" ? `Eje: ${f.eje}` : "",
    f.vida && f.vida !== "Todos" ? `Vida: ${f.vida}` : "",
    f.search.trim() ? `Búsqueda: "${f.search.trim()}"` : "",
    (f.dateFrom || f.dateTo) ? `Período: ${f.dateFrom || "inicio"} → ${f.dateTo || "hoy"}` : "",
  ].filter(Boolean).join("  ·  ");
}

// -- Main builder -------------------------------------------------------------

export function buildResumenReportData(
  allTires: ReportTire[],
  f: ReportFilterOpts,
  company: { name: string; logo: string | null },
  totalFleet: number,
): ResumenReportData {
  const { months, periodLabel } = buildWindow(f.dateFrom, f.dateTo);
  const windowKeys = new Set(months.map((m) => m.key));
  const lastKey = months[months.length - 1]?.key ?? "";
  const hasRange = !!(f.dateFrom || f.dateTo);

  // 1) Apply tire-level filters (brand / axle / life / search). Date-range
  //    narrowing of the inspecciones list happens too, so snapshot cards that
  //    read the latest in-range inspection behave like the dashboard.
  let result: ReportTire[] = allTires;

  if (f.dateFrom || f.dateTo) {
    const from = f.dateFrom || "0000-00-00";
    const to = f.dateTo || "9999-12-31";
    const narrowed: ReportTire[] = [];
    for (const t of result) {
      let latest: RawInspeccion | null = null;
      let latestTs = -Infinity;
      for (const i of t.inspecciones) {
        const day = localDay(i.fecha);
        if (day < from || day > to) continue;
        const ts = new Date(i.fecha).getTime();
        if (ts > latestTs) { latestTs = ts; latest = i; }
      }
      if (!latest) continue;
      narrowed.push({ ...t, inspecciones: [latest] });
    }
    result = narrowed;
  }

  if (!f.vida || f.vida === "Todos") result = result.filter((t) => t.vidaActual !== "fin");
  else result = result.filter((t) => t.vidaActual === f.vida);
  if (f.marca && f.marca !== "Todos") result = result.filter((t) => t.marca === f.marca);
  if (f.eje && f.eje !== "Todos") result = result.filter((t) => t.eje === f.eje);
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    result = result.filter((t) => t.placa.toLowerCase().includes(q) || t.marca.toLowerCase().includes(q));
  }
  const filtered = result;

  // Fin-de-vida tires (for dinero perdido) — keep only "fin", honor marca/eje/search.
  let finTires = allTires.filter((t) => t.vidaActual === "fin");
  if (f.marca && f.marca !== "Todos") finTires = finTires.filter((t) => t.marca === f.marca);
  if (f.eje && f.eje !== "Todos") finTires = finTires.filter((t) => t.eje === f.eje);
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    finTires = finTires.filter((t) => t.placa.toLowerCase().includes(q) || t.marca.toLowerCase().includes(q));
  }

  // 2) Inversión over the window (allow-listed concepts only).
  let inversionPeriodo = 0;
  filtered.forEach((t) => (t.costos ?? []).forEach((c) => {
    if (!isInversionCost(c)) return;
    if (windowKeys.has(toMonthKey(c.fecha))) inversionPeriodo += c.valor;
  }));

  const llantasAnalizadas = filtered.filter((t) => (t.inspecciones?.length ?? 0) > 0).length;

  // 3) Inversión por categoría — concept grouping, restricted to the LAST month
  //    of the window when no range (current month), else the whole window.
  const CONCEPT_LABELS: Record<string, string> = { compra_nueva: "Llanta Nueva", reencauche: "Reencauche", "": "Llanta Nueva" };
  const CONCEPT_COLORS: Record<string, string> = { compra_nueva: "#1E76B6", reencauche: "#22c55e", "": "#1E76B6" };
  const byConcept: Record<string, { total: number; count: number }> = {};
  filtered.forEach((t) => (t.costos ?? []).forEach((c) => {
    if (!isInversionCost(c)) return;
    const key = toMonthKey(c.fecha);
    const inScope = hasRange ? windowKeys.has(key) : key === lastKey;
    if (!inScope) return;
    const concept = (c.concepto ?? "").toLowerCase().trim() || "compra_nueva";
    if (!byConcept[concept]) byConcept[concept] = { total: 0, count: 0 };
    byConcept[concept].total += c.valor;
    byConcept[concept].count++;
  }));
  const catEntries = Object.entries(byConcept)
    .map(([concept, { total, count }]) => ({
      label: CONCEPT_LABELS[concept] ?? concept,
      color: CONCEPT_COLORS[concept] ?? "#64748b",
      total, count,
    }))
    .sort((a, b) => b.total - a.total);
  const grandTotal = catEntries.reduce((s, e) => s + e.total, 0);

  // 4) CPK evolution — km-weighted per month (lifetimeCpk > cpkProyectado > cpk).
  const cpkByMonth: Record<string, { sumCpkKm: number; sumKm: number }> = {};
  filtered.forEach((t) => {
    if (!t.kilometrosRecorridos) return;
    (t.inspecciones ?? []).forEach((i) => {
      const cpkVal = (i.lifetimeCpk && i.lifetimeCpk > 0) ? i.lifetimeCpk
        : (i.cpkProyectado && i.cpkProyectado > 0) ? i.cpkProyectado
        : (i.cpk && i.cpk > 0) ? i.cpk : 0;
      if (cpkVal <= 0) return;
      const k = toMonthKey(i.fecha);
      if (!cpkByMonth[k]) cpkByMonth[k] = { sumCpkKm: 0, sumKm: 0 };
      cpkByMonth[k].sumCpkKm += cpkVal * t.kilometrosRecorridos;
      cpkByMonth[k].sumKm += t.kilometrosRecorridos;
    });
  });
  const cpkEvolution = months.map((m) => {
    const b = cpkByMonth[m.key];
    return { label: m.label, value: b && b.sumKm > 0 ? +(b.sumCpkKm / b.sumKm).toFixed(1) : null };
  });

  // Headline CPK: most recent non-null month, else km-weighted tire-level fallback.
  let cpkProyectado = 0;
  for (let i = cpkEvolution.length - 1; i >= 0; i--) {
    const v = cpkEvolution[i].value;
    if (v != null && v > 0) { cpkProyectado = v; break; }
  }
  if (cpkProyectado === 0) {
    let sumCpkKm = 0, sumKm = 0;
    filtered.forEach((t) => {
      if (!t.kilometrosRecorridos) return;
      const tireCpk = (t.lifetimeCpk && t.lifetimeCpk > 0) ? t.lifetimeCpk
        : (t.currentCpk && t.currentCpk > 0) ? t.currentCpk : 0;
      if (tireCpk > 0) { sumCpkKm += tireCpk * t.kilometrosRecorridos; sumKm += t.kilometrosRecorridos; }
    });
    cpkProyectado = sumKm > 0 ? +(sumCpkKm / sumKm).toFixed(1) : 0;
  }

  // 5) Inversión mensual (allow-listed).
  const invByMonth: Record<string, number> = {};
  filtered.forEach((t) => (t.costos ?? []).forEach((c) => {
    if (!isInversionCost(c)) return;
    const k = toMonthKey(c.fecha);
    invByMonth[k] = (invByMonth[k] || 0) + c.valor;
  }));
  const inversionMensual = months.map((m) => ({ label: m.label, value: invByMonth[m.key] || 0 }));

  // 6) Dinero perdido — wasted tread value of scrapped tires, bucketed by last cost month.
  const perdidoByMonth: Record<string, number> = {};
  finTires.forEach((t) => {
    const depth = t.projectedProfundidad ?? t.currentProfundidad;
    if (!depth || !t.profundidadInicial || t.profundidadInicial <= 0) return;
    const totalCost = (t.costos ?? []).reduce((s, c) => s + c.valor, 0);
    const waste = (depth / t.profundidadInicial) * totalCost;
    if (waste <= 0) return;
    const lastCosto = [...(t.costos ?? [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    const k = lastCosto ? toMonthKey(lastCosto.fecha) : lastKey;
    perdidoByMonth[k] = (perdidoByMonth[k] || 0) + waste;
  });
  const dineroPerdido = months.map((m) => ({ label: m.label, value: Math.round(perdidoByMonth[m.key] || 0) }));

  // 7) Distributions.
  const countBy = (key: (t: ReportTire) => string): Distribution[] => {
    const m: Record<string, number> = {};
    filtered.forEach((t) => { const k = key(t); if (k) m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };
  const porMarca = countBy((t) => t.marca);
  const porDimension = countBy((t) => t.dimension?.trim());

  const VIDA_LABELS: Record<string, string> = {
    nueva: "Nueva", reencauche1: "Reencauche 1", reencauche2: "Reencauche 2", reencauche3: "Reencauche 3", fin: "Fin de vida",
  };
  const VIDA_COLORS: Record<string, string> = {
    nueva: "#1E76B6", reencauche1: "#22c55e", reencauche2: "#16a34a", reencauche3: "#15803d", fin: "#ef4444",
  };
  const vidaCounts: Record<string, number> = {};
  filtered.forEach((t) => { const k = t.vidaActual || "nueva"; vidaCounts[k] = (vidaCounts[k] ?? 0) + 1; });
  const porVida = Object.entries(vidaCounts)
    .map(([k, value]) => ({ label: VIDA_LABELS[k] ?? k, value, color: VIDA_COLORS[k] ?? "#64748b" }))
    .sort((a, b) => b.value - a.value);

  // 8) Best CPK combinations (nueva only, latest inspection per tire).
  const groups: Record<string, { marca: string; diseno: string; dimension: string; cpks: number[]; count: number }> = {};
  filtered.forEach((t) => {
    if (t.vidaActual !== "nueva") return;
    if (!t.inspecciones?.length) return;
    const latest = [...t.inspecciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    if (!latest.cpkProyectado || latest.cpkProyectado <= 0) return;
    const key = `${t.marca}|${t.dimension}|${t.diseno}`;
    if (!groups[key]) groups[key] = { marca: t.marca, diseno: t.diseno, dimension: t.dimension, cpks: [], count: 0 };
    groups[key].cpks.push(latest.cpkProyectado);
    groups[key].count++;
  });
  const mejoresCpk = Object.values(groups)
    .map((g) => ({ marca: g.marca, diseno: g.diseno, dimension: g.dimension, count: g.count, avgCpk: g.cpks.reduce((a, b) => a + b, 0) / g.cpks.length }))
    .sort((a, b) => a.avgCpk - b.avgCpk)
    .slice(0, 5);

  return {
    company,
    periodLabel: hasRange ? periodLabel : "Mes actual",
    kpis: {
      totalLlantas: filtered.length,
      totalFleet,
      inversionPeriodo,
      cpkProyectado,
      llantasAnalizadas,
    },
    filtersLabel: filtersLabel(f),
    cpkEvolution,
    inversionMensual,
    dineroPerdido,
    inversionCategoria: { entries: catEntries, grandTotal },
    porMarca,
    porVida,
    porDimension,
    mejoresCpk,
  };
}
