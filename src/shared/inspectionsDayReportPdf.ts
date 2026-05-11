// -----------------------------------------------------------------------------
// Inspections-of-the-day report — client-side PDF generation (jspdf + autoTable).
//
// Mirrors the MerqueLlantas "REPORTES DE INSPECCIÓN" layout shipped to the
// distribuidor team:
//
//   Page 1
//   ┌─────────────────────────────────────────────────────────────────────────┐
//   │ [gray tile · logo]  REPORTES DE INSPECCIÓN                              │
//   │                     CLIENTE / REFERENCIA / ASESOR / TECNICO / FECHA     │
//   ├──────────────────────────────────┬──────────────────────────────────────┤
//   │ Inspección General               │ Semáforo General de Llantas          │
//   │ veh.inspeccionados · total llantas│ (cambio inmediato / 30 / 60 / ok)   │
//   ├──────────────────────────────────┼──────────────────────────────────────┤
//   │ Participación por vida           │ Presiones de Inflado                 │
//   └──────────────────────────────────┴──────────────────────────────────────┘
//
//   Page 2: Composición de Flotas (marca × dimension matrix)
//   Page 3+: Información por vehículo (per-vehicle tire list + semáforo totals)
//
// Why client-side instead of a server-rendered PDF: the per-vehicle bar/pie
// graphics are repeats of the same primitives the dashboard uses; reusing
// jspdf primitives keeps the binary out of the API surface and the data
// payload from `/api/tires/inspections-day-report` stays human-readable.
//
// The gray tile under the logo is always rendered even when the company
// uploaded a logo with its own background — flagged in the brief ("always
// add a gray background in case the logo of the company is white and no
// background"). Same fallback applies when the logo fails to load.
// -----------------------------------------------------------------------------

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type InspectionsDayReport = {
  date: string;
  company: { id: string; name: string; profileImage: string | null };
  inspectorNames: string[];
  totals: {
    vehiclesInspected: number;
    totalTires: number;
    semaforo: { cambio_inmediato: number; proyectado_30: number; proyectado_60: number; buen_estado: number };
    vida:     { nueva: number; reencauche: number };
    presion:  { baja: number; alta: number; correcta: number; sin_medida: number };
  };
  composicionFlota: Array<{
    marca: string;
    total: number;
    dimensiones: Array<{ dimension: string; count: number }>;
  }>;
  vehicles: Array<{
    vehicleId: string | null;
    placa: string;
    tipovhc: string | null;
    kilometraje: number | null;
    tipoServicio: string | null;
    configuracion: string | null;
    clientCompany: string | null;
    tires: Array<{
      tireId: string;
      placa: string;
      marca: string;
      diseno: string;
      dimension: string;
      posicion: number;
      vidaActual: string;
      minDepth: number;
      avgDepth: number;
      presionPsi: number | null;
      presionRecomendada: number | null;
      semaforo: "buen_estado" | "proyectado_60" | "proyectado_30" | "cambio_inmediato";
      presionBucket: "correcta" | "baja" | "alta" | null;
    }>;
  }>;
};

const COLOR_TEXT      = "#0A183A";
const COLOR_MUTED     = "#6b7280";
const COLOR_BORDER    = "#e5e7eb";
const COLOR_GRAY_TILE = "#f3f4f6"; // always-on fallback behind the logo
const COLOR_BAR       = "#f59e0b"; // orange bar accent
const COLOR_SEM = {
  cambio_inmediato: "#fde2e2",
  proyectado_30:    "#fff1d6",
  proyectado_60:    "#fff8d6",
  buen_estado:      "#d6f5d6",
};
const COLOR_SEM_DOT = {
  cambio_inmediato: "#ef4444",
  proyectado_30:    "#f59e0b",
  proyectado_60:    "#facc15",
  buen_estado:      "#22c55e",
};
const SEM_LABEL: Record<keyof typeof COLOR_SEM, string> = {
  cambio_inmediato: "Cambio Inmediato",
  proyectado_30:    "Proyectado 30 días",
  proyectado_60:    "Proyectado 60 días",
  buen_estado:      "En buen estado",
};

// -----------------------------------------------------------------------------
// Asset loading — copied + trimmed from catalogoSku/pdf.ts so this module
// stays self-contained.
// -----------------------------------------------------------------------------

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(typeof fr.result === "string" ? fr.result : null);
    fr.onerror   = () => resolve(null);
    fr.readAsDataURL(blob);
  });
}
async function loadImageAsDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
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
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

// -----------------------------------------------------------------------------
// Small drawing helpers
// -----------------------------------------------------------------------------

function setHexFill(doc: jsPDF, hex: string) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  doc.setFillColor(r, g, b);
}
function setHexDraw(doc: jsPDF, hex: string) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  doc.setDrawColor(r, g, b);
}
function setHexText(doc: jsPDF, hex: string) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  doc.setTextColor(r, g, b);
}

function pct(n: number, total: number): string {
  if (!total) return "0,0 %";
  return `${((n / total) * 100).toFixed(1).replace(".", ",")} %`;
}

function referenceCode(date: string, companyId: string): string {
  // Stable, human-friendly: DIA-YYYYMMDD-XXXX where XXXX is a 4-char hash
  // of companyId so two reports for the same day across different
  // tenants get distinct codes without a server round-trip.
  let h = 0;
  for (let i = 0; i < companyId.length; i++) h = ((h << 5) - h + companyId.charCodeAt(i)) | 0;
  const tag = (Math.abs(h) % 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `DIA-${date.replace(/-/g, "")}-${tag}`;
}

// -----------------------------------------------------------------------------
// Header band — gray tile + logo, then title + meta cell
// -----------------------------------------------------------------------------

async function drawHeader(
  doc: jsPDF,
  report: InspectionsDayReport,
  logoDataUrl: string | null,
  marginX: number,
  topY: number,
  contentW: number,
): Promise<number> {
  const HEADER_H = 26;
  const LEFT_W   = 50;
  // Outer border
  setHexDraw(doc, COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(marginX, topY, contentW, HEADER_H);
  // Vertical separator between logo tile and meta cell
  doc.line(marginX + LEFT_W, topY, marginX + LEFT_W, topY + HEADER_H);

  // Always-on gray tile behind the logo
  setHexFill(doc, COLOR_GRAY_TILE);
  doc.rect(marginX, topY, LEFT_W, HEADER_H, "F");

  // Logo, scaled inside the tile with 3mm padding
  if (logoDataUrl) {
    try {
      const dims = await imageDims(logoDataUrl);
      const pad = 3;
      const innerW = LEFT_W - pad * 2;
      const innerH = HEADER_H - pad * 2;
      const ratio = dims.w / dims.h;
      let w = innerW, h = innerW / ratio;
      if (h > innerH) { h = innerH; w = innerH * ratio; }
      doc.addImage(
        logoDataUrl,
        detectFormat(logoDataUrl),
        marginX + (LEFT_W - w) / 2,
        topY  + (HEADER_H - h) / 2,
        w, h,
      );
    } catch {
      // ignore — gray tile alone is fine fallback
    }
  }

  // Title row
  setHexText(doc, COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleY = topY + 6;
  doc.text("REPORTES DE INSPECCIÓN", marginX + LEFT_W + (contentW - LEFT_W) / 2, titleY, { align: "center" });

  // Horizontal divider beneath the title
  setHexDraw(doc, COLOR_BORDER);
  doc.line(marginX + LEFT_W, topY + 9, marginX + contentW, topY + 9);

  // Meta block (two columns: CLIENTE/REFERENCIA  |  ASESOR/TECNICO/FECHA)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setHexText(doc, COLOR_TEXT);
  const metaX1 = marginX + LEFT_W + 4;
  const metaX2 = marginX + LEFT_W + (contentW - LEFT_W) / 2 + 4;
  let mY = topY + 14;

  function field(x: number, y: number, label: string, value: string) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + doc.getTextWidth(`${label}: `), y);
  }

  field(metaX1, mY,     "CLIENTE",    report.company.name);
  field(metaX1, mY + 4, "REFERENCIA", referenceCode(report.date, report.company.id));

  const inspector = report.inspectorNames[0] ?? "—";
  field(metaX2, mY,     "ASESOR",  inspector);
  field(metaX2, mY + 4, "TECNICO", inspector);
  field(metaX2, mY + 8, "FECHA",   report.date);

  return topY + HEADER_H + 4;
}

// -----------------------------------------------------------------------------
// Card primitive — bordered box with a title row + content area. Returns
// the Y where the renderer can continue.
// -----------------------------------------------------------------------------

function cardFrame(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
) {
  setHexDraw(doc, COLOR_BORDER);
  setHexFill(doc, "#ffffff");
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 1, 1, "FD");
  setHexText(doc, COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, x + 4, y + 5);
}

// -----------------------------------------------------------------------------
// Bar chart — horizontal rows of orange bars with the value above each bar.
// Light, no axis ticks — matches the sample's stripped-down style.
// -----------------------------------------------------------------------------

function drawBarChart(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  data: Array<{ label: string; value: number }>,
) {
  if (data.length === 0) return;
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelH = 4;
  const valueH = 4;
  const barAreaH = h - labelH - valueH - 4;
  const slotW = w / data.length;
  const barWMax = Math.min(slotW * 0.55, 18);

  setHexFill(doc, COLOR_BAR);
  setHexText(doc, COLOR_TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  data.forEach((d, i) => {
    const slotX  = x + i * slotW;
    const barX   = slotX + (slotW - barWMax) / 2;
    const barH   = max > 0 ? (d.value / max) * barAreaH : 0;
    const barY   = y + valueH + (barAreaH - barH);
    if (d.value > 0) doc.rect(barX, barY, barWMax, barH, "F");
    // value above the bar
    doc.text(String(d.value), barX + barWMax / 2, barY - 1.5, { align: "center" });
    // label below
    doc.text(d.label, slotX + slotW / 2, y + h - 1, { align: "center" });
  });
}

// -----------------------------------------------------------------------------
// Stat card with table + bar chart — the layout shared by Inspección General,
// Por Vida, and Presiones blocks in the sample.
// -----------------------------------------------------------------------------

function statCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  title: string,
  rows: Array<{ label: string; value: string; bg?: string }>,
  bars: Array<{ label: string; value: number }>,
) {
  cardFrame(doc, x, y, w, h, title);
  const innerX = x + 4;
  const innerW = w - 8;
  let cursorY = y + 10;

  // Mini table header
  setHexFill(doc, "#ffffff");
  setHexDraw(doc, COLOR_BORDER);
  doc.setLineWidth(0.2);
  doc.line(innerX, cursorY + 0.5, innerX + innerW, cursorY + 0.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHexText(doc, COLOR_TEXT);
  doc.text("Nombre",   innerX + 1,            cursorY - 1);
  doc.text("Cantidad", innerX + innerW - 1,   cursorY - 1, { align: "right" });
  cursorY += 4;

  // Body rows
  rows.forEach((r) => {
    if (r.bg) {
      setHexFill(doc, r.bg);
      doc.rect(innerX, cursorY - 3, innerW, 4.5, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setHexText(doc, COLOR_TEXT);
    doc.text(r.label, innerX + 1, cursorY);
    doc.text(r.value, innerX + innerW - 1, cursorY, { align: "right" });
    cursorY += 4.5;
  });

  // Bars in the lower half of the card
  const chartY = Math.max(cursorY + 4, y + h - 32);
  const chartH = (y + h - 4) - chartY;
  drawBarChart(doc, innerX, chartY, innerW, chartH, bars);
}

// -----------------------------------------------------------------------------
// Public — generate + save the PDF
// -----------------------------------------------------------------------------

export async function generateInspectionsDayReportPdf(report: InspectionsDayReport): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "letter" }); // 215.9 × 279.4
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 10;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const logo = await loadImageAsDataUrl(report.company.profileImage);

  // ─── Page 1 ────────────────────────────────────────────────────────────────
  let cursorY = await drawHeader(doc, report, logo, MARGIN, MARGIN, CONTENT_W);

  // 2×2 grid of stat cards
  const COL_W = (CONTENT_W - 4) / 2;
  const CARD_H = 70;

  // Inspección General
  statCard(doc, MARGIN, cursorY, COL_W, CARD_H, "Inspección General",
    [
      { label: "Veh. Inspeccionados", value: String(report.totals.vehiclesInspected) },
      { label: "Total llantas",       value: String(report.totals.totalTires) },
    ],
    [
      { label: "Veh. Inspeccionados", value: report.totals.vehiclesInspected },
      { label: "Total llantas",       value: report.totals.totalTires },
    ],
  );

  // Semáforo General
  const sem = report.totals.semaforo;
  const semTotal = sem.cambio_inmediato + sem.proyectado_30 + sem.proyectado_60 + sem.buen_estado;
  statCard(doc, MARGIN + COL_W + 4, cursorY, COL_W, CARD_H, "Semáforo General de Llantas",
    [
      { label: SEM_LABEL.cambio_inmediato, value: `${sem.cambio_inmediato} - ${pct(sem.cambio_inmediato, semTotal)}`, bg: COLOR_SEM.cambio_inmediato },
      { label: SEM_LABEL.proyectado_30,    value: `${sem.proyectado_30} - ${pct(sem.proyectado_30, semTotal)}`,       bg: COLOR_SEM.proyectado_30 },
      { label: SEM_LABEL.proyectado_60,    value: `${sem.proyectado_60} - ${pct(sem.proyectado_60, semTotal)}`,       bg: COLOR_SEM.proyectado_60 },
      { label: SEM_LABEL.buen_estado,      value: `${sem.buen_estado} - ${pct(sem.buen_estado, semTotal)}`,           bg: COLOR_SEM.buen_estado },
    ],
    [
      { label: "Camb.Inm.",  value: sem.cambio_inmediato },
      { label: "Proy. 30",   value: sem.proyectado_30 },
      { label: "Proy. 60",   value: sem.proyectado_60 },
      { label: "Buen est.",  value: sem.buen_estado },
    ],
  );

  cursorY += CARD_H + 4;

  // Por Vida
  const vida = report.totals.vida;
  const vidaTotal = vida.nueva + vida.reencauche;
  statCard(doc, MARGIN, cursorY, COL_W, CARD_H, "Participación por vida",
    [
      { label: "Total Nuevas",     value: `${vida.nueva}/${vidaTotal}` },
      { label: "Total Reencauche", value: `${vida.reencauche}/${vidaTotal}` },
    ],
    [
      { label: "Total Nuevas",     value: vida.nueva },
      { label: "Total Reencauche", value: vida.reencauche },
    ],
  );

  // Presiones
  const pres = report.totals.presion;
  const presTotal = pres.baja + pres.alta + pres.correcta;
  statCard(doc, MARGIN + COL_W + 4, cursorY, COL_W, CARD_H, "Presiones de Inflado",
    [
      { label: "Baja Presión",     value: `${pres.baja}/${presTotal} - ${pct(pres.baja, presTotal)}`,        bg: COLOR_SEM.proyectado_30 },
      { label: "Alta Presión",     value: `${pres.alta}/${presTotal} - ${pct(pres.alta, presTotal)}`,        bg: COLOR_SEM.cambio_inmediato },
      { label: "Presión Correcta", value: `${pres.correcta}/${presTotal} - ${pct(pres.correcta, presTotal)}`, bg: COLOR_SEM.buen_estado },
    ],
    [
      { label: "Baja",     value: pres.baja },
      { label: "Alta",     value: pres.alta },
      { label: "Correcta", value: pres.correcta },
    ],
  );

  cursorY += CARD_H + 4;

  if (pres.sin_medida > 0) {
    setHexText(doc, COLOR_MUTED);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`${pres.sin_medida} llanta(s) sin medida de presión registrada.`, MARGIN, cursorY);
    cursorY += 4;
  }

  // ─── Page 2 — Composición de Flotas ───────────────────────────────────────
  if (report.composicionFlota.length > 0) {
    doc.addPage();
    cursorY = await drawHeader(doc, report, logo, MARGIN, MARGIN, CONTENT_W);

    cardFrame(doc, MARGIN, cursorY, CONTENT_W, 8 + 6, "Composición de Flotas");
    cursorY += 12;

    // Pivot: rows = dimensions, cols = marcas (top 4 + Otros)
    const TOP_MARCAS = 4;
    const sorted = [...report.composicionFlota].sort((a, b) => b.total - a.total);
    const topMarcas = sorted.slice(0, TOP_MARCAS).map((m) => m.marca);
    const otherMarcas = sorted.slice(TOP_MARCAS).map((m) => m.marca);

    // Collect every dimension and the per-marca counts
    type Row = { dimension: string; cells: Record<string, number>; total: number };
    const dimRows = new Map<string, Row>();
    for (const m of report.composicionFlota) {
      const marcaCol = topMarcas.includes(m.marca) ? m.marca : "Otros";
      for (const d of m.dimensiones) {
        if (!dimRows.has(d.dimension)) {
          dimRows.set(d.dimension, { dimension: d.dimension, cells: {}, total: 0 });
        }
        const row = dimRows.get(d.dimension)!;
        row.cells[marcaCol] = (row.cells[marcaCol] ?? 0) + d.count;
        row.total += d.count;
      }
    }
    const rows = Array.from(dimRows.values()).sort((a, b) => b.total - a.total);
    const columnHeaders = [...topMarcas, ...(otherMarcas.length > 0 ? ["Otros"] : [])];

    autoTable(doc, {
      startY: cursorY,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Marca/Dimensión", ...columnHeaders]],
      body: [
        ...rows.map((r) => [
          r.dimension,
          ...columnHeaders.map((m) => String(r.cells[m] ?? 0)),
        ]),
        // Total row
        [
          "Total",
          ...columnHeaders.map((m) =>
            String(rows.reduce((s, r) => s + (r.cells[m] ?? 0), 0)),
          ),
        ],
      ],
      headStyles: { fillColor: [243, 244, 246], textColor: [10, 24, 58], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [10, 24, 58] },
      styles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
      foot:  [],
    });
  }

  // ─── Page 3+ — Información por vehículo ───────────────────────────────────
  if (report.vehicles.length > 0) {
    for (const v of report.vehicles) {
      doc.addPage();
      cursorY = await drawHeader(doc, report, logo, MARGIN, MARGIN, CONTENT_W);

      setHexText(doc, COLOR_TEXT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("INFORMACIÓN POR VEHÍCULO", PAGE_W / 2, cursorY, { align: "center" });
      cursorY += 6;

      // Card with vehicle meta + per-tire table
      const vehSem = { cambio_inmediato: 0, proyectado_30: 0, proyectado_60: 0, buen_estado: 0 };
      for (const t of v.tires) vehSem[t.semaforo]++;
      const vehSemTotal = v.tires.length;

      cardFrame(doc, MARGIN, cursorY, CONTENT_W, 24, "Semáforo Individual de Llantas");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setHexText(doc, COLOR_TEXT);
      const metaLines = [
        `Placa: ${v.placa}`,
        v.tipovhc ? `Tipo de Vehículo: ${v.tipovhc.toUpperCase()}` : null,
        v.kilometraje != null ? `Kilometraje: ${v.kilometraje.toLocaleString("es-CO")} Km` : null,
        v.tipoServicio ? `Tipo de Operación: ${v.tipoServicio}` : null,
      ].filter(Boolean).join(" - ");
      doc.text(metaLines, MARGIN + 4, cursorY + 11);
      if (v.clientCompany) {
        setHexText(doc, COLOR_MUTED);
        doc.text(`Cliente: ${v.clientCompany}`, MARGIN + 4, cursorY + 16);
      }
      cursorY += 28;

      // Semáforo individual table
      autoTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Nombre", "Cantidad"]],
        body: [
          [SEM_LABEL.cambio_inmediato, `${vehSem.cambio_inmediato} - ${pct(vehSem.cambio_inmediato, vehSemTotal)}`],
          [SEM_LABEL.proyectado_30,    `${vehSem.proyectado_30} - ${pct(vehSem.proyectado_30, vehSemTotal)}`],
          [SEM_LABEL.proyectado_60,    `${vehSem.proyectado_60} - ${pct(vehSem.proyectado_60, vehSemTotal)}`],
          [SEM_LABEL.buen_estado,      `${vehSem.buen_estado} - ${pct(vehSem.buen_estado, vehSemTotal)}`],
        ],
        headStyles: { fillColor: [243, 244, 246], textColor: [10, 24, 58], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [10, 24, 58] },
        // Color-code each row to match the dashboard semáforo card
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const key = (["cambio_inmediato", "proyectado_30", "proyectado_60", "buen_estado"] as const)[data.row.index];
          const bg = COLOR_SEM[key];
          if (bg) {
            const r = parseInt(bg.slice(1, 3), 16);
            const g = parseInt(bg.slice(3, 5), 16);
            const b = parseInt(bg.slice(5, 7), 16);
            data.cell.styles.fillColor = [r, g, b];
          }
        },
        styles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
      });
      // @ts-expect-error — autoTable adds lastAutoTable to the doc instance
      cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 4;

      // Per-tire detail
      autoTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Pos", "Llanta", "Marca", "Diseño", "Dimensión", "Vida", "Prof. mín.", "Prof. prom.", "Presión", "Estado"]],
        body: v.tires
          .slice()
          .sort((a, b) => a.posicion - b.posicion)
          .map((t) => [
            t.posicion || "—",
            t.placa,
            t.marca,
            t.diseno,
            t.dimension,
            t.vidaActual,
            `${t.minDepth.toFixed(1)} mm`,
            `${t.avgDepth.toFixed(1)} mm`,
            t.presionPsi != null
              ? `${t.presionPsi} psi${t.presionBucket ? ` (${t.presionBucket})` : ""}`
              : "—",
            SEM_LABEL[t.semaforo],
          ]),
        headStyles: { fillColor: [243, 244, 246], textColor: [10, 24, 58], fontStyle: "bold", fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: [10, 24, 58] },
        styles:     { lineColor: [229, 231, 235], lineWidth: 0.2, cellPadding: 1.5 },
        didParseCell: (data) => {
          if (data.section !== "body" || data.column.index !== 9) return;
          const tireSemaforo = v.tires.slice().sort((a, b) => a.posicion - b.posicion)[data.row.index].semaforo;
          const bg = COLOR_SEM[tireSemaforo];
          if (bg) {
            const r = parseInt(bg.slice(1, 3), 16);
            const g = parseInt(bg.slice(3, 5), 16);
            const b = parseInt(bg.slice(5, 7), 16);
            data.cell.styles.fillColor = [r, g, b];
          }
        },
      });
    }
  }

  // ─── Footer page numbers ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setHexText(doc, COLOR_MUTED);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 5, { align: "right" });
    doc.text(`Generado por TirePro · ${new Date().toLocaleString("es-CO")}`, MARGIN, PAGE_H - 5);
  }

  doc.save(`Inspeccion-${report.company.name.replace(/\s+/g, "_")}-${report.date}.pdf`);
}
