// -----------------------------------------------------------------------------
// Resumen dashboard — PDF-first report generator (jsPDF, all vector).
//
// Why we DON'T screenshot the on-screen charts: they're chart.js <canvas>
// elements tuned for a dark interactive UI, and the app is on Tailwind v4
// (oklch theme) which html2canvas can't parse — both make for ugly,
// page-splitting exports. Instead every figure is redrawn as crisp vector
// graphics sized for A4: gridded line/bar charts with a real Y axis and a
// label on EVERY point, horizontal bar lists for distributions, KPI tiles,
// and ranking lists. Built to look good on a boardroom projector.
//
// Co-branding: every page carries both the company logo and the TirePro logo.
// The user picks the accent color and a reporting period; the cover, charts
// and section headings all pick it up.
//
// The caller (ExportModal) chooses a template, edits title/company/note,
// picks an accent, and filters the underlying data (brand / axle / life /
// date range) so the same dashboard can produce, say, a "2027 board review".
// This module is purely presentational — it receives a finished payload.
// -----------------------------------------------------------------------------

import { jsPDF } from "jspdf";

// -- Public data + option types ----------------------------------------------

export type TrendPoint = { label: string; value: number | null };
export type Distribution = { label: string; value: number; color?: string };

export type ResumenReportData = {
  company: { name: string; logo: string | null };
  periodLabel: string; // e.g. "Mes actual" or "ene 2027 – dic 2027"
  kpis: {
    totalLlantas: number;
    totalFleet: number;
    inversionPeriodo: number;
    cpkProyectado: number;
    llantasAnalizadas: number;
  };
  filtersLabel: string;
  cpkEvolution: TrendPoint[];
  inversionMensual: TrendPoint[];
  dineroPerdido: TrendPoint[];
  inversionCategoria: {
    entries: Array<{ label: string; color: string; total: number; count: number }>;
    grandTotal: number;
  };
  porMarca: Distribution[];
  porVida: Distribution[];
  porDimension: Distribution[];
  mejoresCpk: Array<{ marca: string; diseno: string; dimension: string; avgCpk: number; count: number }>;
};

export type ResumenSection =
  | "kpis" | "cpk" | "inversion" | "dinero_perdido"
  | "marca" | "vida" | "dimension" | "mejores_cpk";

export const SECTION_ORDER: ResumenSection[] = [
  "kpis", "cpk", "inversion", "dinero_perdido", "marca", "vida", "dimension", "mejores_cpk",
];

export const SECTION_LABELS: Record<ResumenSection, string> = {
  kpis:           "Indicadores (KPIs)",
  cpk:            "CPK Proyectado",
  inversion:      "Inversión y por categoría",
  dinero_perdido: "Dinero perdido por desecho",
  marca:          "Distribución por marca",
  vida:           "Distribución por vida",
  dimension:      "Distribución por dimensión",
  mejores_cpk:    "Mejores combinaciones CPK",
};

export type ResumenReportOptions = {
  templateId: string;
  templateName: string;
  title: string;
  company: string;
  preparedBy: string;
  note: string;
  showFilters: boolean;
  accent: string;
  sections: ResumenSection[];
};

// -- Palette ------------------------------------------------------------------

const COLOR_TEXT   = "#0A183A";
const COLOR_MUTED  = "#6b7280";
const COLOR_BORDER = "#e5e7eb";
const COLOR_TRACK  = "#eef2f7";
const COLOR_GRID   = "#eaeef4";
const COLOR_ORANGE = "#f97316";

// -- Hex helpers --------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
function setFill(doc: jsPDF, hex: string) { const [r, g, b] = rgb(hex); doc.setFillColor(r, g, b); }
function setDraw(doc: jsPDF, hex: string) { const [r, g, b] = rgb(hex); doc.setDrawColor(r, g, b); }
function setText(doc: jsPDF, hex: string) { const [r, g, b] = rgb(hex); doc.setTextColor(r, g, b); }
function lighten(hex: string, amt: number): string {
  const [r, g, b] = rgb(hex);
  const L = (c: number) => Math.round(c + (255 - c) * amt);
  return `#${[L(r), L(g), L(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
function darken(hex: string, amt: number): string {
  const [r, g, b] = rgb(hex);
  const D = (c: number) => Math.round(c * (1 - amt));
  return `#${[D(r), D(g), D(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
// Black or white text that reads on top of `hex`.
function idealText(hex: string): string {
  const [r, g, b] = rgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#0A183A" : "#ffffff";
}

// -- Number formatters --------------------------------------------------------

function fmtCOP(n: number): string { return "$" + Math.round(n).toLocaleString("es-CO"); }
function fmtCOPCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
function fmtInt(n: number): string { return n.toLocaleString("es-CO"); }

// -- Text fitting -------------------------------------------------------------

function fitText(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

// -- Image loading ------------------------------------------------------------

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(typeof fr.result === "string" ? fr.result : null);
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(blob);
  });
}
async function loadImageAsDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch { return null; }
}
function detectFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp);/i);
  if (!m) return "PNG";
  const mime = m[1].toLowerCase();
  if (mime === "jpg" || mime === "jpeg") return "JPEG";
  if (mime === "webp") return "WEBP";
  return "PNG";
}
function imageDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

// Draw a logo contained inside a rounded tile (so a white/transparent logo
// still reads on a colored band).
async function drawLogoTile(
  doc: jsPDF, dataUrl: string | null, x: number, y: number, w: number, h: number, tileBg: string,
) {
  setFill(doc, tileBg);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  if (!dataUrl) return;
  try {
    const dims = await imageDims(dataUrl);
    const pad = 2.4;
    const innerW = w - pad * 2, innerH = h - pad * 2;
    const ratio = dims.w / dims.h || 1;
    let lw = innerW, lh = innerW / ratio;
    if (lh > innerH) { lh = innerH; lw = innerH * ratio; }
    doc.addImage(dataUrl, detectFormat(dataUrl), x + (w - lw) / 2, y + (h - lh) / 2, lw, lh);
  } catch { /* tile alone is a fine fallback */ }
}

// -- Card frame ---------------------------------------------------------------

function cardFrame(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, accent: string, subtitle?: string) {
  setDraw(doc, COLOR_BORDER);
  setFill(doc, "#ffffff");
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  // accent tab on the title
  setFill(doc, accent);
  doc.roundedRect(x + 5, y + 4.2, 2, 4.2, 0.8, 0.8, "F");
  setText(doc, COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.8);
  doc.text(title, x + 9.5, y + 7.6);
  if (subtitle) {
    setText(doc, COLOR_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    doc.text(subtitle, x + w - 5, y + 7.4, { align: "right" });
  }
}

// -- Chart grid + axis --------------------------------------------------------

// Draw horizontal gridlines + Y-axis value labels, return nothing; the series
// is drawn into the same plot rect with the same `max`.
function drawGrid(
  doc: jsPDF, plotX: number, plotY: number, plotW: number, plotH: number,
  max: number, fmt: (v: number) => string, ticks = 4,
) {
  for (let t = 0; t <= ticks; t++) {
    const gy = plotY + plotH - (t / ticks) * plotH;
    setDraw(doc, t === 0 ? COLOR_BORDER : COLOR_GRID);
    doc.setLineWidth(t === 0 ? 0.3 : 0.15);
    doc.line(plotX, gy, plotX + plotW, gy);
    setText(doc, COLOR_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.text(fmt((max / ticks) * t), plotX - 1.6, gy + 0.9, { align: "right" });
  }
}

// -- Trend: line with area fill, markers, every-point labels ------------------

function drawTrendLine(
  doc: jsPDF, plotX: number, plotY: number, plotW: number, plotH: number,
  points: TrendPoint[], color: string, fmt: (v: number) => string, max: number,
) {
  const n = points.length || 1;
  const slotW = plotW / n;
  const px = (i: number) => plotX + i * slotW + slotW / 2;
  const py = (v: number) => plotY + plotH - (max > 0 ? (v / max) * plotH : 0);
  const baseY = plotY + plotH;

  const pts = points
    .map((p, i) => (p.value == null ? null : { i, X: px(i), Y: py(p.value), v: p.value }))
    .filter((p): p is { i: number; X: number; Y: number; v: number } => p != null);

  // area fill
  if (pts.length >= 2) {
    try {
      const deltas: [number, number][] = [];
      deltas.push([0, pts[0].Y - baseY]);
      for (let i = 1; i < pts.length; i++) deltas.push([pts[i].X - pts[i - 1].X, pts[i].Y - pts[i - 1].Y]);
      deltas.push([0, baseY - pts[pts.length - 1].Y]);
      setFill(doc, lighten(color, 0.84));
      doc.lines(deltas, pts[0].X, baseY, [1, 1], "F", true);
    } catch { /* skip fill on any path hiccup */ }
  }

  // line
  setDraw(doc, color);
  doc.setLineWidth(1.1);
  for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1].X, pts[i - 1].Y, pts[i].X, pts[i].Y);

  // month labels (all slots)
  setText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  points.forEach((p, i) => doc.text(p.label, px(i), baseY + 3.4, { align: "center" }));

  // markers + value label on EVERY point
  pts.forEach((p) => {
    setFill(doc, "#ffffff"); doc.circle(p.X, p.Y, 1.25, "F");
    setFill(doc, color);     doc.circle(p.X, p.Y, 0.95, "F");
    setText(doc, darken(color, 0.15));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    const ly = Math.max(plotY + 2, p.Y - 2.2);
    doc.text(fmt(p.v), p.X, ly, { align: "center" });
  });
}

// -- Trend: bars, every-bar labels --------------------------------------------

function drawTrendBars(
  doc: jsPDF, plotX: number, plotY: number, plotW: number, plotH: number,
  points: TrendPoint[], color: string, fmt: (v: number) => string, max: number,
) {
  const n = points.length || 1;
  const baseY = plotY + plotH;
  const slotW = plotW / n;
  const barW = Math.min(slotW * 0.62, 9);
  let lastNonZero = -1;
  points.forEach((p, i) => { if ((p.value ?? 0) > 0) lastNonZero = i; });

  points.forEach((p, i) => {
    const v = p.value ?? 0;
    const bh = max > 0 ? (v / max) * plotH : 0;
    const bx = plotX + i * slotW + (slotW - barW) / 2;
    const by = baseY - bh;
    if (v > 0) {
      setFill(doc, i === lastNonZero ? color : lighten(color, 0.4));
      doc.roundedRect(bx, by, barW, Math.max(bh, 0.4), 0.7, 0.7, "F");
      setText(doc, darken(color, 0.15));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.2);
      doc.text(fmt(v), bx + barW / 2, Math.max(plotY + 2, by - 1.4), { align: "center" });
    }
    setText(doc, COLOR_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.4);
    doc.text(p.label, plotX + i * slotW + slotW / 2, baseY + 3.4, { align: "center" });
  });
}

// Full trend card: frame + grid/axis + series. Returns next Y.
function trendCard(
  doc: jsPDF, x: number, y: number, w: number, title: string, subtitle: string,
  points: TrendPoint[], kind: "line" | "bar", color: string, fmt: (v: number) => string, axisFmt: (v: number) => string,
): number {
  const H = 62;
  cardFrame(doc, x, y, w, H, title, color, subtitle);
  const gutter = 15, padR = 6, padTop = 13, labelBand = 6;
  const plotX = x + gutter, plotY = y + padTop, plotW = w - gutter - padR, plotH = H - padTop - labelBand - 2;
  const max = Math.max(...points.map((p) => p.value ?? 0), 1);
  drawGrid(doc, plotX, plotY, plotW, plotH, max, axisFmt);
  if (kind === "line") drawTrendLine(doc, plotX, plotY, plotW, plotH, points, color, fmt, max);
  else drawTrendBars(doc, plotX, plotY, plotW, plotH, points, color, fmt, max);
  return y + H;
}

// -- Horizontal bar list (distributions) -------------------------------------

function drawHBarList(doc: jsPDF, x: number, y: number, w: number, data: Distribution[], accent: string) {
  const rowH = 7.6;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelW = Math.min(44, w * 0.34);
  const valW = 24;
  const barX = x + labelW + 2;
  const barW = w - labelW - valW - 4;

  data.forEach((d, i) => {
    const ry = y + i * rowH;
    if (i % 2 === 1) { setFill(doc, "#fafbfd"); doc.rect(x - 2, ry - 1.6, w + 4, rowH, "F"); }
    setText(doc, COLOR_TEXT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.text(fitText(doc, d.label || "—", labelW), x, ry + 3.4);
    setFill(doc, COLOR_TRACK);
    doc.roundedRect(barX, ry + 0.6, barW, 3.6, 1.2, 1.2, "F");
    const bw = Math.max(0.8, (d.value / max) * barW);
    setFill(doc, d.color ?? accent);
    doc.roundedRect(barX, ry + 0.6, bw, 3.6, 1.2, 1.2, "F");
    setText(doc, COLOR_TEXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.text(`${fmtInt(d.value)} · ${((d.value / total) * 100).toFixed(0)}%`, x + w, ry + 3.4, { align: "right" });
  });
}

// -- KPI strip ----------------------------------------------------------------

function drawKpiStrip(doc: jsPDF, x: number, y: number, w: number, accent: string, k: ResumenReportData["kpis"], periodLabel: string): number {
  const items = [
    { label: "Total Llantas",      value: fmtInt(k.totalLlantas), sub: k.totalLlantas !== k.totalFleet ? `de ${fmtInt(k.totalFleet)} en flota` : "" },
    { label: "Inversión",          value: fmtCOPCompact(k.inversionPeriodo), sub: periodLabel },
    { label: "CPK Proyectado",     value: k.cpkProyectado > 0 ? fmtCOP(+k.cpkProyectado.toFixed(1)) : "--", sub: "costo por km" },
    { label: "Llantas Analizadas", value: fmtInt(k.llantasAnalizadas), sub: "con inspección" },
  ];
  const gap = 4;
  const bw = (w - gap * (items.length - 1)) / items.length;
  const bh = 26;
  items.forEach((it, i) => {
    const bx = x + i * (bw + gap);
    setFill(doc, "#ffffff");
    setDraw(doc, COLOR_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, bw, bh, 2, 2, "FD");
    setFill(doc, accent);
    doc.roundedRect(bx, y, bw, 1.6, 2, 2, "F");
    doc.rect(bx, y + 0.8, bw, 0.8, "F");
    setText(doc, COLOR_MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(it.label.toUpperCase(), bx + 4.5, y + 8);
    setText(doc, COLOR_TEXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(fitText(doc, it.value, bw - 8), bx + 4.5, y + 16.5);
    if (it.sub) {
      setText(doc, COLOR_MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.text(fitText(doc, it.sub, bw - 8), bx + 4.5, y + 22);
    }
  });
  return y + bh;
}

// -- Public entry -------------------------------------------------------------

export async function generateResumenReportPdf(
  data: ResumenReportData,
  options: ResumenReportOptions,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); // 210 × 297
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = PAGE_W - M * 2;
  const BOTTOM = PAGE_H - 16;
  const accent = options.accent || "#1E76B6";

  // Only the company logo is rendered — the report is branded for the company.
  // TirePro's mark intentionally does NOT appear; the sole TirePro reference is
  // the "Generado por TirePro" footer line.
  const companyLogo = await loadImageAsDataUrl(data.company.logo);
  const dateStr = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  // ── Running header (pages 2+) — company-branded ───────────────────────────
  function runningHeader(): number {
    setFill(doc, accent);
    doc.rect(0, 0, PAGE_W, 1.8, "F");
    setText(doc, COLOR_TEXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(fitText(doc, options.company || data.company.name || options.title, CW), M, M);
    setDraw(doc, COLOR_BORDER);
    doc.setLineWidth(0.2);
    doc.line(M, M + 2.5, PAGE_W - M, M + 2.5);
    return M + 9;
  }

  // ── Cover hero band ────────────────────────────────────────────────────────
  // Height adapts to a one- vs two-line title so the period label never
  // collides with the title.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  const titleLines = (doc.splitTextToSize(options.title, CW - 8) as string[]).slice(0, 2);
  const heroH = 44 + (titleLines.length > 1 ? 9 : 0);
  setFill(doc, accent);
  doc.rect(0, 0, PAGE_W, heroH, "F");
  setFill(doc, darken(accent, 0.12));
  doc.rect(0, heroH - 2.4, PAGE_W, 2.4, "F");

  // Company logo, top-left, on a white tile so it reads on the accent band.
  // Only drawn when a logo actually loaded (no empty box otherwise).
  const tileH = 14;
  if (companyLogo) await drawLogoTile(doc, companyLogo, M, M - 2, 36, tileH, "#ffffff");

  const heroText = idealText(accent);
  setText(doc, heroText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  let ty = M + 18;
  titleLines.forEach((ln) => { doc.text(ln, M, ty); ty += 9; });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  setText(doc, heroText === "#ffffff" ? lighten(accent, 0.85) : COLOR_MUTED);
  doc.text(`Período: ${data.periodLabel}`, M, Math.min(ty + 0.5, heroH - 5));

  let y = heroH + 8;

  // meta line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, COLOR_TEXT);
  const meta = [
    options.company || data.company.name,
    `Generado el ${dateStr}`,
    options.preparedBy ? `Preparado por ${options.preparedBy}` : "",
  ].filter(Boolean).join("    ·    ");
  doc.text(fitText(doc, meta, CW), M, y);
  y += 6;

  if (options.showFilters && data.filtersLabel) {
    setFill(doc, lighten(accent, 0.88));
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(`Filtros — ${data.filtersLabel}`, CW - 8) as string[];
    const boxH = lines.length * 4 + 3.5;
    doc.roundedRect(M, y, CW, boxH, 1.5, 1.5, "F");
    setText(doc, darken(accent, 0.25));
    lines.forEach((ln, i) => doc.text(ln, M + 4, y + 5 + i * 4));
    y += boxH + 2;
  }

  setDraw(doc, COLOR_BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, y + 2, PAGE_W - M, y + 2);
  y += 8;

  if (options.note.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(options.note.trim(), CW - 10) as string[];
    const boxH = lines.length * 4.4 + 8;
    setFill(doc, "#fbfcfe");
    setDraw(doc, COLOR_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, boxH, 2, 2, "FD");
    setFill(doc, accent);
    doc.roundedRect(M, y, 1.6, boxH, 1, 1, "F");
    setText(doc, COLOR_MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.text("OBSERVACIONES", M + 5, y + 5.5);
    setText(doc, COLOR_TEXT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    lines.forEach((ln, i) => doc.text(ln, M + 5, y + 10.5 + i * 4.4));
    y += boxH + 6;
  }

  // ── Section flow ───────────────────────────────────────────────────────────
  const ensure = (need: number) => { if (y + need > BOTTOM) { doc.addPage(); y = runningHeader(); } };

  for (const section of options.sections) {
    switch (section) {
      case "kpis":
        ensure(30);
        y = drawKpiStrip(doc, M, y, CW, accent, data.kpis, data.periodLabel);
        y += 6;
        break;

      case "cpk":
        ensure(66);
        y = trendCard(doc, M, y, CW, "CPK Proyectado de la flota", "Promedio ponderado por km",
          data.cpkEvolution, "line", accent, (v) => fmtCOP(v), (v) => fmtCOPCompact(v));
        y += 6;
        break;

      case "inversion": {
        ensure(66);
        y = trendCard(doc, M, y, CW, "Inversión", "Compras nuevas + reencauches",
          data.inversionMensual, "bar", accent, (v) => fmtCOPCompact(v), (v) => fmtCOPCompact(v));
        y += 6;
        const entries = data.inversionCategoria.entries;
        const catH = 16 + Math.max(1, entries.length) * 7.6 + 5;
        ensure(catH);
        cardFrame(doc, M, y, CW, catH, "Inversión por categoría", accent, data.periodLabel);
        setText(doc, COLOR_MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(6.6);
        doc.text("TOTAL", M + 9.5, y + 13);
        setText(doc, COLOR_TEXT); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text(fmtCOP(data.inversionCategoria.grandTotal), M + CW - 5, y + 13, { align: "right" });
        if (entries.length === 0) {
          setText(doc, COLOR_MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(8);
          doc.text("Sin costos en el período seleccionado.", M + 6, y + 20);
        } else {
          drawHBarList(doc, M + 6, y + 17, CW - 12, entries.map((e) => ({ label: e.label, value: e.total, color: e.color })), accent);
        }
        y += catH + 6;
        break;
      }

      case "dinero_perdido":
        ensure(66);
        y = trendCard(doc, M, y, CW, "Dinero perdido por desecho", "Banda desechada con vida remanente",
          data.dineroPerdido, "bar", COLOR_ORANGE, (v) => fmtCOPCompact(v), (v) => fmtCOPCompact(v));
        y += 6;
        break;

      case "marca":
        y = distributionCard(doc, M, CW, "Distribución por marca", data.porMarca, accent, ensure, () => y);
        y += 6;
        break;
      case "vida":
        y = distributionCard(doc, M, CW, "Distribución por vida", data.porVida, accent, ensure, () => y);
        y += 6;
        break;
      case "dimension":
        y = distributionCard(doc, M, CW, "Distribución por dimensión", data.porDimension, accent, ensure, () => y);
        y += 6;
        break;

      case "mejores_cpk": {
        const rows = data.mejoresCpk.slice(0, 5);
        const H = 14 + Math.max(1, rows.length) * 9 + 4;
        ensure(H);
        cardFrame(doc, M, y, CW, H, "Mejores combinaciones CPK", accent, "Menor costo por km · llantas nuevas");
        if (rows.length === 0) {
          setText(doc, COLOR_MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(8);
          doc.text("Sin datos suficientes para un ranking.", M + 6, y + 16);
        } else {
          const rankColors = ["#D4AF37", "#94A3B8", "#CD7F32", accent, accent];
          rows.forEach((c, i) => {
            const ry = y + 14 + i * 9;
            if (i % 2 === 1) { setFill(doc, "#fafbfd"); doc.rect(M + 4, ry - 3.4, CW - 8, 8.6, "F"); }
            setFill(doc, rankColors[i] ?? accent);
            doc.circle(M + 9, ry + 0.6, 2.8, "F");
            setText(doc, "#ffffff"); doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
            doc.text(String(i + 1), M + 9, ry + 1.8, { align: "center" });
            setText(doc, COLOR_TEXT); doc.setFont("helvetica", "bold"); doc.setFontSize(8.8);
            doc.text(fitText(doc, `${c.marca} ${c.diseno}`, CW - 72), M + 15, ry);
            setText(doc, COLOR_MUTED); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
            doc.text(`${c.dimension} · ${c.count} ${c.count === 1 ? "llanta" : "llantas"}`, M + 15, ry + 4.6);
            setText(doc, darken(accent, 0.1)); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
            doc.text(fmtCOP(+c.avgCpk.toFixed(1)), M + CW - 5, ry + 1.8, { align: "right" });
          });
        }
        y += H + 6;
        break;
      }
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setDraw(doc, COLOR_BORDER); doc.setLineWidth(0.2);
    doc.line(M, PAGE_H - 9, PAGE_W - M, PAGE_H - 9);
    setText(doc, COLOR_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - M, PAGE_H - 5, { align: "right" });
    doc.text(`Generado por TirePro · ${dateStr}`, M, PAGE_H - 5);
  }

  const safeCompany = (options.company || data.company.name || "TirePro").replace(/\s+/g, "_");
  const today = new Date().toISOString().slice(0, 10);
  doc.save(`Resumen-${safeCompany}-${today}.pdf`);
}

// Distribution card with page-break safety.
function distributionCard(
  doc: jsPDF, x: number, w: number, title: string, data: Distribution[], accent: string,
  ensure: (need: number) => void, getY: () => number,
): number {
  const top = data.slice(0, 8);
  const H = 13 + Math.max(1, top.length) * 7.6 + 4;
  ensure(H);
  const y = getY();
  cardFrame(doc, x, y, w, H, title, accent, `${data.length} ${data.length === 1 ? "categoría" : "categorías"}`);
  if (top.length === 0) {
    setText(doc, COLOR_MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.text("Sin datos para el filtro actual.", x + 6, y + 16);
  } else {
    drawHBarList(doc, x + 6, y + 13, w - 12, top, accent);
  }
  return y + H;
}
