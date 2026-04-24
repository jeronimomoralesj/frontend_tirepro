// -----------------------------------------------------------------------------
// Catalog datasheet PDF generator — client-side only (jspdf + autoTable).
//
// Layout (one-page Letter):
//   ┌────────────────────────────────────────────────────────────────┐
//   │  HEADER BANNER (brand color)                                   │
//   │  [logo tile]                      FICHA TÉCNICA / categoría   │
//   └────────────────────────────────────────────────────────────────┘
//
//   MARCA [inline brand logo · country]
//   MODEL NAME                                          ┌─────────┐
//   dimension                                           │ HERO    │
//                                                       │ TIRE    │
//   [chip] [chip] [chip] [chip]                         │         │
//                                                       └─────────┘
//
//   ─ ACERCA DE LA MARCA ─────────────────────── (optional block)
//   "Tagline in italic"
//   Description paragraph…
//   país · fundada YYYY · casa matriz · sitio-web
//
//   ─ ESPECIFICACIONES ───────────────────────────────────
//   [spec table full width]
//
//   [thumb 1][thumb 2][thumb 3]                (when >1 image picked)
//
//   ┌─ PRICE BLOCK (brand accented) ──────────────────────┐   (optional)
//   └─────────────────────────────────────────────────────┘
//
//   ─ CONTACTO ───────────────────────────────────────
//   Rep name · phone · website · city
//
//   ──────────── tirepro.com.co ────────────
// -----------------------------------------------------------------------------

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfBrand = {
  name:          string;
  logoUrl:       string | null;
  tier:          string | null;
  tagline:       string | null;
  description:   string | null;
  country:       string | null;
  headquarters:  string | null;
  foundedYear:   number | null;
  parentCompany: string | null;
  website:       string | null;
};

export type PdfInput = {
  companyName:   string | null;
  companyLogoUrl:string | null;
  companyColor:  string | null;
  companyWebsite:string | null;
  companyCity:   string | null;
  repName:  string | null;
  repPhone: string | null;
  marca:      string;
  modelo:     string;
  dimension:  string;
  categoria:  string | null;
  terreno:    string | null;
  ejeTirePro: string | null;
  reencauchable: boolean;
  // Legacy single-field brand identity (kept for back-compat). Prefer
  // the `brand` object below, which carries everything the user opts in.
  brandLogoUrl: string | null;
  brandCountry: string | null;
  brand:        PdfBrand | null;
  imageUrls:    string[];
  rows:         Array<{ label: string; value: string }>;
  priceMode: "none" | "sin_iva" | "con_iva";
  priceCop:  number | null;
  notes: string | null;
  fetchViaProxy?: (url: string) => Promise<Blob | null>;
};

const FALLBACK = {
  ink:     [10, 24, 58]    as [number, number, number],
  primary: [30, 118, 182]  as [number, number, number],
  muted:   [120, 135, 165] as [number, number, number],
  page:    [244, 248, 253] as [number, number, number],
  line:    [225, 232, 245] as [number, number, number],
};

// =============================================================================
// Color helpers
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
function readableTextOn(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? [10, 24, 58] : [255, 255, 255];
}
function tint(rgb: [number, number, number], alpha: number): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * (1 - alpha)),
    Math.round(rgb[1] + (255 - rgb[1]) * (1 - alpha)),
    Math.round(rgb[2] + (255 - rgb[2]) * (1 - alpha)),
  ];
}

// =============================================================================
// Asset loading
// =============================================================================

const DEFAULT_LOGO_FRAGMENT = "companyResources/logoFull";
function isDefaultPlaceholderLogo(url: string | null | undefined): boolean {
  return !!url && url.includes(DEFAULT_LOGO_FRAGMENT);
}

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(typeof fr.result === "string" ? fr.result : null);
    fr.onerror   = () => resolve(null);
    fr.readAsDataURL(blob);
  });
}
async function loadImageAsDataUrl(
  url: string | null,
  viaProxy?: (u: string) => Promise<Blob | null>,
): Promise<string | null> {
  if (!url) return null;
  if (viaProxy) {
    try {
      const blob = await viaProxy(url);
      if (blob) {
        const dataUrl = await blobToDataUrl(blob);
        if (dataUrl) return dataUrl;
      }
    } catch { /* fall through */ }
  }
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

function fmtCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

const TIER_LABEL: Record<string, string> = {
  premium: "Premium",
  mid:     "Intermedia",
  value:   "Económica",
};

// =============================================================================
// Main
// =============================================================================

export async function buildCatalogPdf(input: PdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 42;

  const brand       = parseHex(input.companyColor) ?? FALLBACK.primary;
  const brandText   = readableTextOn(brand);
  const brandT08    = tint(brand, 0.08);
  const brandT15    = tint(brand, 0.18);

  const logoUrl  = isDefaultPlaceholderLogo(input.companyLogoUrl) ? null : input.companyLogoUrl;
  const proxy    = input.fetchViaProxy;
  const hero4    = input.imageUrls.slice(0, 4);
  const [logoData, brandLogoData, ...productDatas] = await Promise.all([
    loadImageAsDataUrl(logoUrl, proxy),
    loadImageAsDataUrl(input.brand?.logoUrl ?? input.brandLogoUrl, proxy),
    ...hero4.map((u) => loadImageAsDataUrl(u, proxy)),
  ]);
  const productImages = productDatas.filter((d): d is string => !!d);

  // ───────────────────────────────────────────────────────────────────────────
  // HEADER BANNER
  // ───────────────────────────────────────────────────────────────────────────
  doc.setFillColor(...brand);
  doc.rect(0, 0, pageW, 94, "F");
  // Ink strip along the bottom edge of the banner for depth.
  doc.setFillColor(...FALLBACK.ink);
  doc.rect(0, 88, pageW, 6, "F");

  if (logoData) {
    const { w, h } = await imageDims(logoData);
    const boxW = 160, boxH = 62;
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale, drawH = h * scale;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M - 8, 16, boxW + 16, 66, 8, 8, "F");
    doc.addImage(
      logoData, detectFormat(logoData),
      M - 8 + (boxW + 16 - drawW) / 2,
      16 + (66 - drawH) / 2,
      drawW, drawH, undefined, "SLOW",
    );
  } else if (input.companyName) {
    doc.setFillColor(255, 255, 255);
    const pillH = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    const textW = doc.getTextWidth(input.companyName);
    const pillW = Math.min(280, textW + 32);
    doc.roundedRect(M - 8, 27, pillW, pillH, 8, 8, "F");
    doc.setTextColor(...brand);
    doc.text(input.companyName, M - 8 + pillW / 2, 27 + pillH / 2 + 5, {
      align: "center",
      maxWidth: pillW - 32,
    });
  }

  doc.setTextColor(...brandText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FICHA TÉCNICA", pageW - M, 36, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(
    input.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva",
    pageW - M, 54, { align: "right" },
  );

  // Left-edge brand rail — thin vertical accent running down the page.
  doc.setFillColor(...brand);
  doc.rect(0, 94, 4, pageH - 94, "F");

  // Hero tile dimensions — hoisted so the chip row can measure how wide
  // it may grow before overlapping the image.
  const HERO_TOP = 120;
  const HERO_W = 240, HERO_H = 200;

  // ───────────────────────────────────────────────────────────────────────────
  // TITLE BLOCK
  // ───────────────────────────────────────────────────────────────────────────
  let y = 132;

  // Marca tagline: small brand logo + marca text + country.
  let cursorX = M;
  if (brandLogoData) {
    const { w, h } = await imageDims(brandLogoData);
    const boxW = 42, boxH = 22;
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale, drawH = h * scale;
    doc.addImage(
      brandLogoData, detectFormat(brandLogoData),
      cursorX, y - drawH + 2, drawW, drawH, undefined, "SLOW",
    );
    cursorX += drawW + 10;
  }
  const marcaText = input.marca.toUpperCase();
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(marcaText, cursorX, y);
  if (input.brandCountry || input.brand?.country) {
    const country = input.brand?.country ?? input.brandCountry;
    const mw = doc.getTextWidth(marcaText);
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`· ${country}`, cursorX + mw + 8, y);
  }

  y += 30;
  doc.setTextColor(...FALLBACK.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);   // big headline
  doc.text(input.modelo, M, y);

  y += 20;
  doc.setTextColor(...brand);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(input.dimension, M, y);

  // ───────────────────────────────────────────────────────────────────────────
  // CHIP ROW — at-a-glance attributes. Constrained to the left column so
  // chips never run UNDER the hero tile. Wraps to a second row when the
  // first one fills up (common with long terreno / eje labels).
  // ───────────────────────────────────────────────────────────────────────────
  const chips: Array<{ label: string; fill: [number, number, number]; text: [number, number, number] }> = [];
  chips.push({
    label: input.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva",
    fill:  brand,
    text:  brandText,
  });
  if (input.terreno)    chips.push({ label: input.terreno,   fill: brandT08, text: brand });
  if (input.ejeTirePro) chips.push({ label: input.ejeTirePro.charAt(0).toUpperCase() + input.ejeTirePro.slice(1), fill: brandT08, text: brand });
  if (input.reencauchable) chips.push({ label: "Reencauchable", fill: brandT15, text: brand });

  y += 16;
  // Right edge of the chip track. When the hero tile is present, stop the
  // chips a bit before its left edge (14pt gutter). Otherwise use the full
  // right margin.
  const heroLeftX = pageW - M - HERO_W;
  // productImages[0] is the first valid loaded tire image — stop chips
  // a gutter before the hero tile so they never render behind it.
  const chipMaxX = productImages[0] ? heroLeftX - 14 : pageW - M;
  const chipRowH = 20;
  let chipX = M;
  let chipY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  for (const chip of chips) {
    const label = chip.label.toUpperCase();
    const tw = doc.getTextWidth(label);
    const padX = 10;
    const w = tw + padX * 2;
    const h = 18;
    // Wrap to a new row if this chip would blow past the hero/right margin.
    // An empty row (chipX === M) still draws even if it overflows — better
    // to clip than to silently drop.
    if (chipX > M && chipX + w > chipMaxX) {
      chipX = M;
      chipY += chipRowH;
    }
    doc.setFillColor(...chip.fill);
    doc.roundedRect(chipX, chipY - h + 2, w, h, 9, 9, "F");
    doc.setTextColor(...chip.text);
    doc.text(label, chipX + padX, chipY - 2);
    chipX += w + 6;
  }
  // Advance y past whatever row the chips ended on.
  y = chipY;

  // ───────────────────────────────────────────────────────────────────────────
  // HERO IMAGE (right side of title block)
  // ───────────────────────────────────────────────────────────────────────────
  const heroData = productImages[0];
  if (heroData) {
    const { w, h } = await imageDims(heroData);
    const scale = Math.min(HERO_W / w, HERO_H / h);
    const drawW = w * scale, drawH = h * scale;
    const x = pageW - M - HERO_W;
    doc.setFillColor(...FALLBACK.page);
    doc.roundedRect(x, HERO_TOP, HERO_W, HERO_H, 14, 14, "F");
    doc.setDrawColor(...brandT15);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, HERO_TOP, HERO_W, HERO_H, 14, 14, "S");
    doc.addImage(
      heroData, detectFormat(heroData),
      x + (HERO_W - drawW) / 2,
      HERO_TOP + (HERO_H - drawH) / 2,
      drawW, drawH, undefined, "MEDIUM",
    );
  }

  // Drop `y` so the next section starts below the hero bottom.
  y = Math.max(y + 24, HERO_TOP + HERO_H + 18);

  // ───────────────────────────────────────────────────────────────────────────
  // BRAND CARD (optional) — "Acerca de la marca" + facts
  // ───────────────────────────────────────────────────────────────────────────
  const b = input.brand;
  const hasBrandContent = !!b && (
    b.tagline || b.description ||
    b.country || b.foundedYear || b.parentCompany || b.tier || b.website
  );
  if (hasBrandContent && b) {
    y = drawSectionHeader(doc, "Acerca de la marca", M, y, pageW - M, brand);
    const cardTop = y + 4;
    const innerW  = pageW - 2 * M - 24;

    // Pre-measure each chunk so we size the card exactly once. splitTextToSize
    // handles all wrapping (including the facts line that used to overflow).
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    const taglineLines = b.tagline
      ? doc.splitTextToSize(b.tagline, innerW).slice(0, 2) as string[]
      : [];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const descLines = b.description
      ? doc.splitTextToSize(b.description, innerW).slice(0, 3) as string[]
      : [];

    const factsText = factLine(b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const factsLines = factsText
      ? doc.splitTextToSize(factsText, innerW).slice(0, 2) as string[]
      : [];

    let cardH = 16
      + taglineLines.length * 13
      + (descLines.length ? descLines.length * 12 + 4 : 0)
      + (factsLines.length ? factsLines.length * 11 + 4 : 0)
      + 14;

    doc.setFillColor(...FALLBACK.page);
    doc.roundedRect(M, cardTop, pageW - 2 * M, cardH, 10, 10, "F");
    doc.setDrawColor(...brandT15);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, cardTop, pageW - 2 * M, cardH, 10, 10, "S");

    let ty = cardTop + 18;
    if (taglineLines.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...brand);
      for (const ln of taglineLines) { doc.text(ln, M + 12, ty); ty += 13; }
    }
    if (descLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...FALLBACK.ink);
      for (const ln of descLines) { doc.text(ln, M + 12, ty); ty += 12; }
      ty += 4;
    }
    if (factsLines.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...FALLBACK.muted);
      for (const ln of factsLines) { doc.text(ln, M + 12, ty); ty += 11; }
    }
    y = cardTop + cardH + 14;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPECS TABLE (full width)
  // ───────────────────────────────────────────────────────────────────────────
  y = drawSectionHeader(doc, "Especificaciones", M, y, pageW - M, brand);
  const tableWidth = pageW - 2 * M;
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head:   [["Característica", "Valor"]],
    body:   input.rows.map((r) => [r.label, r.value]),
    theme:  "plain",
    tableWidth,
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: { top: 7, right: 10, bottom: 7, left: 10 },
      textColor: FALLBACK.ink,
      lineColor: FALLBACK.line,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: brandT08,
      textColor: brand,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    columnStyles: {
      0: { cellWidth: Math.round(tableWidth * 0.42), fontStyle: "bold" },
      1: { cellWidth: Math.round(tableWidth * 0.58) },
    },
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y += 12;

  // ───────────────────────────────────────────────────────────────────────────
  // THUMBNAILS (images 2..N)
  // ───────────────────────────────────────────────────────────────────────────
  const extras = productImages.slice(1);
  if (extras.length > 0) {
    const n = Math.min(extras.length, 3);
    const gap = 10;
    const w = Math.floor((pageW - 2 * M - gap * (n - 1)) / n);
    const h = Math.min(95, w);
    for (let i = 0; i < n; i++) {
      const data = extras[i];
      const { w: iw, h: ih } = await imageDims(data);
      const scale = Math.min(w / iw, h / ih);
      const drawW = iw * scale, drawH = ih * scale;
      const x = M + i * (w + gap);
      doc.setFillColor(...FALLBACK.page);
      doc.roundedRect(x, y, w, h, 8, 8, "F");
      doc.setDrawColor(...brandT15);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, w, h, 8, 8, "S");
      doc.addImage(
        data, detectFormat(data),
        x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH, undefined, "MEDIUM",
      );
    }
    y += h + 14;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRICE BLOCK (optional)
  // ───────────────────────────────────────────────────────────────────────────
  if (input.priceMode !== "none" && input.priceCop && input.priceCop > 0) {
    const base = input.priceCop;
    const withIva = Math.round(base * 1.19);
    const shown = input.priceMode === "con_iva" ? withIva : base;
    const ivaLabel = input.priceMode === "con_iva" ? "IVA 19% incluido" : "No incluye IVA";

    const boxH = 64;
    const boxY = y;
    doc.setFillColor(...FALLBACK.ink);
    doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 12, 12, "F");
    doc.setFillColor(...brand);
    doc.roundedRect(M, boxY, 8, boxH, 4, 4, "F");

    doc.setTextColor(200, 215, 240);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Precio", M + 22, boxY + 24);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(fmtCOP(shown), M + 22, boxY + 50);

    doc.setTextColor(200, 215, 240);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(ivaLabel, pageW - M - 20, boxY + 50, { align: "right" });

    y = boxY + boxH + 14;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONTACT CARD — guaranteed below all spec content. If there's no room
  // left on page 1 (big spec table + big brand card push us past the
  // footer line), start a fresh page and paint the rail there too so the
  // brand anchor stays consistent.
  // ───────────────────────────────────────────────────────────────────────────
  const hasRep      = !!(input.repName || input.repPhone);
  const hasSiteCity = !!(input.companyWebsite || input.companyCity);
  if (hasRep || hasSiteCity) {
    const contactNeed = 80;  // section header + card + breathing room
    if (y + contactNeed > pageH - 60) {
      doc.addPage();
      doc.setFillColor(...brand);
      doc.rect(0, 0, 4, pageH, "F");   // brand rail on page 2
      y = 50;
    }
    y = drawSectionHeader(doc, "Contacto", M, y + 4, pageW - M, brand);
    const boxH = 60;
    const boxY = y + 4;
    doc.setFillColor(...brandT08);
    doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 10, 10, "F");

    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(input.repName ?? input.companyName ?? "", M + 14, boxY + 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const line2 = [input.repPhone, input.companyCity].filter(Boolean).join("  ·  ");
    if (line2) doc.text(line2, M + 14, boxY + 42);

    if (input.companyWebsite) {
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(input.companyWebsite, pageW - M - 14, boxY + 42, { align: "right" });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FOOTER — watermark
  // ───────────────────────────────────────────────────────────────────────────
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.5);
  doc.line(M, pageH - 48, pageW - M, pageH - 48);

  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (input.companyName) doc.text(input.companyName, M, pageH - 30);
  const today = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  doc.text(today, pageW - M, pageH - 30, { align: "right" });

  doc.setTextColor(...brand);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("tirepro.com.co", pageW / 2, pageH - 18, { align: "center" });

  return doc.output("blob");
}

// =============================================================================
// Helpers
// =============================================================================

function drawSectionHeader(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  right: number,
  brand: [number, number, number],
): number {
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), x, y);
  const textW = doc.getTextWidth(title.toUpperCase());
  // thin accent rule after the text
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.5);
  doc.line(x + textW + 10, y - 3, right, y - 3);
  return y + 10;
}

function factLine(b: PdfBrand): string | null {
  const parts: string[] = [];
  if (b.country)      parts.push(b.country);
  if (b.headquarters && b.headquarters !== b.country) parts.push(b.headquarters);
  if (b.foundedYear)  parts.push(`Fundada en ${b.foundedYear}`);
  if (b.tier && TIER_LABEL[b.tier]) parts.push(TIER_LABEL[b.tier]);
  if (b.parentCompany) parts.push(`Casa matriz: ${b.parentCompany}`);
  // Strip protocol + trailing slash so "https://hankooktire.com/" lands
  // as "hankooktire.com" — fits the line budget, reads cleaner in the
  // uppercase fact line, and the brand page link in the web UI still
  // carries the full URL if they want to click through.
  if (b.website) {
    const host = b.website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    parts.push(host);
  }
  return parts.length ? parts.join("  ·  ").toUpperCase() : null;
}
