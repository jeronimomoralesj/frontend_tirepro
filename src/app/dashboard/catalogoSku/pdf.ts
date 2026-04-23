// -----------------------------------------------------------------------------
// Catalog datasheet PDF generator — client-side only (jspdf + autoTable).
//
// Produces a one-page branded sheet with:
//   • Top banner painted with the distributor's brand color (colorMarca on
//     Company) — falls back to TirePro blue if unset. Carries the dist's
//     logo + "FICHA TÉCNICA" label.
//   • Product title (marca / modelo) + dimension.
//   • Hero image on the right — the first image the user chose to include.
//   • Up to 3 additional thumbnails below the spec table.
//   • Spec table driven by the toggles the user picked.
//   • Optional price block (sin IVA / con IVA / omitted) styled in the
//     brand color.
//   • Contact card — salesperson name + phone + company website / city.
//   • Centered "tirepro.com.co" watermark in the footer.
//
// Why client-side: jspdf is ~300 KB gzipped, runs instantly, and skips a
// round-trip + PDF-engine process on the backend. Branded layouts at this
// level of polish don't need HTML-grade rendering.
// -----------------------------------------------------------------------------

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfInput = {
  // Company / branding
  companyName:   string | null;
  companyLogoUrl:string | null;
  companyColor:  string | null;   // hex like "#1E76B6"; fallback palette used when null
  companyWebsite:string | null;
  companyCity:   string | null;
  // Salesperson contact block
  repName:  string | null;
  repPhone: string | null;
  // Product
  marca:      string;
  modelo:     string;
  dimension:  string;
  categoria:  string | null;
  // Gallery — already filtered to what the user wants. First one is the hero.
  imageUrls:  string[];
  // Spec rows already filtered to enabled fields with resolved values.
  rows:       Array<{ label: string; value: string }>;
  // Price
  priceMode: "none" | "sin_iva" | "con_iva";
  priceCop:  number | null;
  // Misc
  notes: string | null;
};

// Default palette — used when the dist hasn't set a colorMarca yet.
const FALLBACK = {
  ink:     [10, 24, 58]   as [number, number, number],  // #0A183A
  primary: [30, 118, 182] as [number, number, number],  // #1E76B6
  muted:   [120, 135, 165] as [number, number, number],
  page:    [240, 247, 255] as [number, number, number],
};

// =============================================================================
// Color helpers — parse colorMarca (hex) into RGB and derive tints.
// =============================================================================

function parseHex(hex: string | null): [number, number, number] | null {
  if (!hex) return null;
  const m = hex.trim().replace(/^#/, "").match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Luminance-aware text color so a white-ish brand color still renders
// readable "FICHA TÉCNICA" text on top of the banner.
function readableTextOn(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? [10, 24, 58] : [255, 255, 255];
}

function tint(rgb: [number, number, number], alpha: number): [number, number, number] {
  // Blend toward white. Cheap alpha approximation for jspdf which doesn't
  // support transparency on solid fills.
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * (1 - alpha)),
    Math.round(rgb[1] + (255 - rgb[1]) * (1 - alpha)),
    Math.round(rgb[2] + (255 - rgb[2]) * (1 - alpha)),
  ];
}

// =============================================================================
// Asset loading
// =============================================================================

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

function imageDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

// =============================================================================
// Money
// =============================================================================

function fmtCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

// =============================================================================
// Main
// =============================================================================

export async function buildCatalogPdf(input: PdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 42; // outer margin

  const brand       = parseHex(input.companyColor) ?? FALLBACK.primary;
  const brandText   = readableTextOn(brand);
  const brandTint08 = tint(brand, 0.08);

  // Pre-fetch logo + every selected product image in parallel. Capped at 4
  // to keep the layout readable on one page.
  const heroSelected = input.imageUrls.slice(0, 4);
  const [logoData, ...productDatas] = await Promise.all([
    loadImageAsDataUrl(input.companyLogoUrl),
    ...heroSelected.map(loadImageAsDataUrl),
  ]);
  const productImages = productDatas.filter((d): d is string => !!d);

  // ───────────────────────────────────────────────────────────────────────────
  // HEADER BANNER (brand color)
  // ───────────────────────────────────────────────────────────────────────────
  doc.setFillColor(...brand);
  doc.rect(0, 0, pageW, 90, "F");
  // Darker strip underneath for depth.
  doc.setFillColor(...FALLBACK.ink);
  doc.rect(0, 84, pageW, 6, "F");

  // Logo in a white tile (left)
  if (logoData) {
    const { w, h } = await imageDims(logoData);
    const boxW = 140, boxH = 56;
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale, drawH = h * scale;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M - 8, 17, boxW + 16, 60, 6, 6, "F");
    doc.addImage(logoData, "PNG", M - 8 + (boxW + 16 - drawW) / 2, 17 + (60 - drawH) / 2, drawW, drawH, undefined, "FAST");
  } else if (input.companyName) {
    doc.setTextColor(...brandText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(input.companyName, M, 50);
  }

  // Right-side label
  doc.setTextColor(...brandText);
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
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(input.marca.toUpperCase(), M, y);

  y += 22;
  doc.setTextColor(...FALLBACK.ink);
  doc.setFontSize(22);
  doc.text(input.modelo, M, y);

  y += 20;
  doc.setTextColor(...brand);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(input.dimension, M, y);

  // ───────────────────────────────────────────────────────────────────────────
  // HERO IMAGE — right side, next to the title. Only when the user picked
  // at least one product photo.
  // ───────────────────────────────────────────────────────────────────────────
  let tableWidth = pageW - 2 * M;
  const heroData = productImages[0];
  const HERO_BOX_Y = 110;
  const HERO_BOX_W = 200, HERO_BOX_H = 170;
  if (heroData) {
    const { w, h } = await imageDims(heroData);
    const scale = Math.min(HERO_BOX_W / w, HERO_BOX_H / h);
    const drawW = w * scale, drawH = h * scale;
    const x = pageW - M - HERO_BOX_W;
    doc.setFillColor(...FALLBACK.page);
    doc.roundedRect(x, HERO_BOX_Y, HERO_BOX_W, HERO_BOX_H, 10, 10, "F");
    doc.addImage(heroData, "PNG", x + (HERO_BOX_W - drawW) / 2, HERO_BOX_Y + (HERO_BOX_H - drawH) / 2, drawW, drawH, undefined, "FAST");
    tableWidth = pageW - 2 * M - HERO_BOX_W - 20;
  }

  y += 22;

  // ───────────────────────────────────────────────────────────────────────────
  // SPEC TABLE
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
      textColor: FALLBACK.ink,
      lineColor: [225, 232, 245],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: brandTint08,
      textColor: brand,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [250, 252, 255] },
    columnStyles: {
      0: { cellWidth: Math.round(tableWidth * 0.45), fontStyle: "bold" },
      1: { cellWidth: Math.round(tableWidth * 0.55) },
    },
  });

  const afterTableY = Math.max(
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y,
    heroData ? HERO_BOX_Y + HERO_BOX_H : y,
  );
  y = afterTableY + 16;

  // ───────────────────────────────────────────────────────────────────────────
  // THUMBNAIL STRIP — images 2..N (up to 3 extra). Laid out left-to-right
  // under the spec table. Skipped if only one image was picked.
  // ───────────────────────────────────────────────────────────────────────────
  const extras = productImages.slice(1);
  if (extras.length > 0) {
    const thumbCount = Math.min(extras.length, 3);
    const gap = 10;
    const thumbW = Math.floor((pageW - 2 * M - gap * (thumbCount - 1)) / thumbCount);
    const thumbH = Math.min(110, thumbW); // cap so we don't blow the page
    for (let i = 0; i < thumbCount; i++) {
      const data = extras[i];
      if (!data) continue;
      const { w, h } = await imageDims(data);
      const scale = Math.min(thumbW / w, thumbH / h);
      const drawW = w * scale, drawH = h * scale;
      const x = M + i * (thumbW + gap);
      doc.setFillColor(...FALLBACK.page);
      doc.roundedRect(x, y, thumbW, thumbH, 8, 8, "F");
      doc.addImage(data, "PNG", x + (thumbW - drawW) / 2, y + (thumbH - drawH) / 2, drawW, drawH, undefined, "FAST");
    }
    y += thumbH + 18;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRICE BLOCK — painted in the brand color
  // ───────────────────────────────────────────────────────────────────────────
  if (input.priceMode !== "none" && input.priceCop && input.priceCop > 0) {
    const base = input.priceCop;
    const withIva = Math.round(base * 1.19);
    const shown = input.priceMode === "con_iva" ? withIva : base;
    const ivaLabel = input.priceMode === "con_iva" ? "IVA 19% incluido" : "No incluye IVA";

    const boxY = y;
    const boxH = 58;
    doc.setFillColor(...FALLBACK.ink);
    doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 10, 10, "F");
    // Accent bar in brand color on the left edge
    doc.setFillColor(...brand);
    doc.roundedRect(M, boxY, 6, boxH, 3, 3, "F");

    doc.setTextColor(180, 200, 225);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Precio", M + 20, boxY + 22);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(fmtCOP(shown), M + 20, boxY + 44);

    doc.setTextColor(180, 200, 225);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(ivaLabel, pageW - M - 18, boxY + 44, { align: "right" });

    y = boxY + boxH + 14;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONTACT CARD — the salesperson pushing this PDF
  // ───────────────────────────────────────────────────────────────────────────
  const hasRep     = !!(input.repName || input.repPhone);
  const hasSiteCity= !!(input.companyWebsite || input.companyCity);
  if (hasRep || hasSiteCity) {
    // Keep the contact card on-page; if we're running low, shrink upwards.
    const boxH = 70;
    if (y + boxH > pageH - 60) y = pageH - 60 - boxH;
    const boxY = y;
    doc.setFillColor(...brandTint08);
    doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 10, 10, "F");

    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CONTACTO", M + 16, boxY + 20);

    doc.setTextColor(...FALLBACK.ink);
    doc.setFontSize(12);
    doc.text(input.repName ?? input.companyName ?? "", M + 16, boxY + 38);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...FALLBACK.ink);
    const line2: string[] = [];
    if (input.repPhone)       line2.push(input.repPhone);
    if (input.companyCity)    line2.push(input.companyCity);
    if (line2.length) doc.text(line2.join("  ·  "), M + 16, boxY + 54);

    if (input.companyWebsite) {
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(input.companyWebsite, pageW - M - 16, boxY + 54, { align: "right" });
    }

    y = boxY + boxH + 10;
  }

  // Notes paragraph — only if there's room.
  if (input.notes && y < pageH - 90) {
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOTAS", M, y);
    y += 12;
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(input.notes, pageW - 2 * M);
    const maxLines = Math.min(lines.length, 4);
    for (let i = 0; i < maxLines; i++) {
      if (y > pageH - 70) break;
      doc.text(lines[i], M, y);
      y += 11;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FOOTER
  // ───────────────────────────────────────────────────────────────────────────
  doc.setDrawColor(225, 232, 245);
  doc.setLineWidth(0.5);
  doc.line(M, pageH - 50, pageW - M, pageH - 50);

  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (input.companyName) {
    doc.text(input.companyName, M, pageH - 30);
  }
  const today = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  doc.text(today, pageW - M, pageH - 30, { align: "right" });

  // TirePro watermark — tiny, centered, brand-accented.
  doc.setTextColor(...brand);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("tirepro.com.co", pageW / 2, pageH - 18, { align: "center" });

  return doc.output("blob");
}
