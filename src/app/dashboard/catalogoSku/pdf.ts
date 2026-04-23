// -----------------------------------------------------------------------------
// Catalog datasheet PDF generator — client-side only (jspdf + autoTable).
// Produces a one-page branded sheet with:
//   • Top banner carrying the distributor's logo + "Ficha Técnica" label
//   • Product title (marca / modelo) + dimension
//   • Optional hero image from the distributor's uploaded gallery
//   • Spec table driven by the toggles the user picked
//   • Optional price block (sin IVA / con IVA / omitted)
//   • Notas Colombia paragraph when the SKU carries one
//   • Centered "tirepro.com.co" watermark in the footer
//
// Why client-side: jspdf is ~300 KB gzipped, runs instantly, and skips a
// round-trip + PDF-engine process on the backend. Branded layouts at this
// level of polish don't need HTML-grade rendering.
// -----------------------------------------------------------------------------

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfInput = {
  companyName: string | null;
  companyLogoUrl: string | null;
  marca: string;
  modelo: string;
  dimension: string;
  categoria: string | null;
  heroImageUrl: string | null;
  rows: Array<{ label: string; value: string }>;
  priceMode: "none" | "sin_iva" | "con_iva";
  priceCop: number | null;
  notes: string | null;
};

// Brand palette — mirrors the dashboard theme so the PDF feels like
// continuation of the web UI.
const COLORS = {
  ink:     [10, 24, 58]  as [number, number, number],   // #0A183A
  primary: [30, 118, 182] as [number, number, number],  // #1E76B6
  accent:  [52, 140, 203] as [number, number, number],  // #348CCB
  muted:   [120, 135, 165] as [number, number, number],
  pageBg:  [240, 247, 255] as [number, number, number], // #F0F7FF
};

// =============================================================================
// Asset loading
// =============================================================================

/**
 * Fetch a remote image and turn it into a data URL so jspdf can embed it.
 * Uses fetch → blob → FileReader. Returns null on any failure (CORS,
 * network, format) so the PDF still renders without the asset.
 */
async function loadImageAsDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror   = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Read actual pixel dimensions from a data URL. jspdf can stretch-fit if
 * we lie about aspect ratio, but matching the real ratio keeps logos and
 * hero images from looking squished.
 */
function imageDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

// =============================================================================
// Money formatting
// =============================================================================

function fmtCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

// =============================================================================
// Main — returns a Blob the caller can save.
// =============================================================================

export async function buildCatalogPdf(input: PdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48; // outer margin

  // Pre-fetch both images in parallel. Either can fail independently
  // (e.g. logo missing) without blocking the other.
  const [logoData, heroData] = await Promise.all([
    loadImageAsDataUrl(input.companyLogoUrl),
    loadImageAsDataUrl(input.heroImageUrl),
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // HEADER BANNER — brand-gradient box that anchors the distributor's logo.
  // jspdf doesn't do gradients natively, so we paint a solid primary with
  // a lighter accent strip underneath for depth.
  // ───────────────────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.ink);
  doc.rect(0, 0, pageW, 88, "F");
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 78, pageW, 10, "F");

  // Distributor logo (left). Contained in a 140×60 box so tall or square
  // logos don't overwhelm. White tile so colored logos have contrast.
  if (logoData) {
    const { w, h } = await imageDims(logoData);
    const boxW = 140, boxH = 54;
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale;
    const drawH = h * scale;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M - 8, 16, boxW + 16, 60, 6, 6, "F");
    doc.addImage(logoData, "PNG", M - 8 + (boxW + 16 - drawW) / 2, 16 + (60 - drawH) / 2, drawW, drawH, undefined, "FAST");
  } else if (input.companyName) {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(input.companyName, M, 50);
  }

  // Label on the right side of the banner.
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FICHA TÉCNICA", pageW - M, 34, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(input.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva", pageW - M, 50, { align: "right" });

  // ───────────────────────────────────────────────────────────────────────────
  // TITLE
  // ───────────────────────────────────────────────────────────────────────────
  let y = 120;
  doc.setTextColor(...COLORS.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(input.marca.toUpperCase(), M, y);

  y += 22;
  doc.setTextColor(...COLORS.ink);
  doc.setFontSize(24);
  doc.text(input.modelo, M, y);

  y += 20;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(input.dimension, M, y);

  // ───────────────────────────────────────────────────────────────────────────
  // HERO IMAGE (right-aligned, next to title) — only if the distributor
  // uploaded one. If absent, the table gets the full width.
  // ───────────────────────────────────────────────────────────────────────────
  let tableWidth = pageW - 2 * M;
  if (heroData) {
    const boxW = 200, boxH = 200;
    const { w, h } = await imageDims(heroData);
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale;
    const drawH = h * scale;
    const x = pageW - M - boxW;
    const imgY = 110;
    // Soft background tile so contained images don't float on raw white.
    doc.setFillColor(...COLORS.pageBg);
    doc.roundedRect(x, imgY, boxW, boxH, 10, 10, "F");
    doc.addImage(heroData, "PNG", x + (boxW - drawW) / 2, imgY + (boxH - drawH) / 2, drawW, drawH, undefined, "FAST");
    tableWidth = pageW - 2 * M - boxW - 20;
  }

  y += 24;

  // ───────────────────────────────────────────────────────────────────────────
  // SPECS TABLE — autoTable renders our toggled fields.
  // ───────────────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: heroData ? (pageW - M - tableWidth) : M },
    head:   [["Característica", "Valor"]],
    body:   input.rows.map((r) => [r.label, r.value]),
    theme:  "plain",
    tableWidth,
    styles: {
      font:     "helvetica",
      fontSize: 10,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      textColor: COLORS.ink,
      lineColor: [225, 232, 245],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 247, 255],
      textColor: COLORS.primary,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [250, 252, 255] },
    columnStyles: {
      0: { cellWidth: Math.round(tableWidth * 0.45), fontStyle: "bold" },
      1: { cellWidth: Math.round(tableWidth * 0.55) },
    },
  });

  // Figure out where autoTable left off so we can place price + notes
  // without overlapping. The hero image might extend below the table
  // on short spec lists, so take the max.
  const afterTableY = Math.max(
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y,
    heroData ? 310 : y,
  );
  y = afterTableY + 18;

  // ───────────────────────────────────────────────────────────────────────────
  // PRICE BLOCK — optional, driven by priceMode
  // ───────────────────────────────────────────────────────────────────────────
  if (input.priceMode !== "none" && input.priceCop && input.priceCop > 0) {
    const base = input.priceCop;
    const withIva = Math.round(base * 1.19);
    const shown = input.priceMode === "con_iva" ? withIva : base;
    const ivaLabel = input.priceMode === "con_iva" ? "IVA 19% incluido" : "No incluye IVA";

    const boxY = y;
    const boxH = 62;
    doc.setFillColor(...COLORS.ink);
    doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 10, 10, "F");

    doc.setTextColor(180, 200, 225);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Precio", M + 18, boxY + 22);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(fmtCOP(shown), M + 18, boxY + 46);

    doc.setTextColor(180, 200, 225);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(ivaLabel, pageW - M - 18, boxY + 46, { align: "right" });

    y = boxY + boxH + 18;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NOTES — SKU's Colombia notes if present. Wrapped to fit width.
  // ───────────────────────────────────────────────────────────────────────────
  if (input.notes && y < pageH - 140) {
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOTAS", M, y);
    y += 14;
    doc.setTextColor(...COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(input.notes, pageW - 2 * M);
    const maxLines = Math.min(lines.length, 6); // keep one-pager intact
    for (let i = 0; i < maxLines; i++) {
      doc.text(lines[i], M, y);
      y += 13;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FOOTER — distributor byline + centered TirePro watermark.
  // ───────────────────────────────────────────────────────────────────────────
  doc.setDrawColor(225, 232, 245);
  doc.setLineWidth(0.5);
  doc.line(M, pageH - 50, pageW - M, pageH - 50);

  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (input.companyName) {
    doc.text(input.companyName, M, pageH - 30);
  }
  const today = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  doc.text(today, pageW - M, pageH - 30, { align: "right" });

  // Watermark — small, centered, subtle brand attribution per brief.
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("tirepro.com.co", pageW / 2, pageH - 18, { align: "center" });

  return doc.output("blob");
}
