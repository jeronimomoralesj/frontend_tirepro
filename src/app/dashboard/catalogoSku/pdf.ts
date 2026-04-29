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

// Design tokens — premium-feel type scale and spacing for both PDFs.
// Inspired by Michelin / Pirelli / Bridgestone product sheets: heavy
// hierarchy (one big number per section, the rest small) and hairline
// rules instead of filled blocks.
const TYPE = {
  /** Document type label — small caps tracker. */
  eyebrow:   { size: 8.5, gap: 4 },
  /** Brand / "PARA" caps label. */
  micro:     { size: 8 },
  /** Section heading body. */
  section:   { size: 10 },
  /** Body text. */
  body:      { size: 10 },
  /** Small body for facts. */
  bodySm:    { size: 9 },
  /** Hero subhead (dimension etc.). */
  subhead:   { size: 13 },
  /** H1 hero (modelo). */
  hero:      { size: 32 },
  /** Hero line height multiplier. */
  heroLh:    1.05,
  /** Big money number (totals / hero price). */
  bigMoney:  { size: 28 },
  /** Money in tables. */
  rowMoney:  { size: 11 },
};
const SPACE = {
  /** Margin all-around on Letter pages. */
  M:           48,
  /** Default vertical gap between sections. */
  sectionGap:  22,
  /** Compact gap between H2 + its content. */
  blockGap:    10,
  /** Gap between row groups in tables. */
  rowGap:      0,
};
const TRACK = {
  /** Letter-spacing applied to small-caps eyebrows (jspdf charSpace). */
  eyebrow: 0.6,
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
  const M = SPACE.M;

  const brand       = parseHex(input.companyColor) ?? FALLBACK.primary;
  // Tints used for very subtle backgrounds (chips, table headers, price block).
  // The header itself stays white — a colored band makes any PDF read
  // template-grade no matter how good the typography is.
  void readableTextOn;
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
  // HEADER — minimalist. Logo (or company name) at left, document
  // type + category eyebrow at right, separated from content by a
  // single hairline. No filled banner, no contrasting block — every
  // premium product sheet (Michelin XZE, Pirelli Truck, Bridgestone
  // Ecopia) leads with whitespace and type.
  // ───────────────────────────────────────────────────────────────────────────
  const HEADER_TOP = 36;
  const HEADER_LOGO_H = 38;

  if (logoData) {
    const { w, h } = await imageDims(logoData);
    const boxH = HEADER_LOGO_H;
    const scale = Math.min(180 / w, boxH / h);
    const drawW = w * scale, drawH = h * scale;
    doc.addImage(
      logoData, detectFormat(logoData),
      M, HEADER_TOP, drawW, drawH, undefined, "SLOW",
    );
  } else if (input.companyName) {
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(input.companyName, M, HEADER_TOP + 24);
  }

  // Right side: tracker eyebrow + bold category label.
  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(TYPE.eyebrow.size);
  doc.setCharSpace(TRACK.eyebrow);
  doc.text("FICHA TÉCNICA", pageW - M, HEADER_TOP + 14, { align: "right" });
  doc.setCharSpace(0);
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    input.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva",
    pageW - M, HEADER_TOP + 32, { align: "right" },
  );

  // Hairline separator running the full content width — replaces the
  // colored banner as the header's bottom edge.
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.5);
  doc.line(M, HEADER_TOP + HEADER_LOGO_H + 14, pageW - M, HEADER_TOP + HEADER_LOGO_H + 14);

  // Hero tile dimensions — hoisted so the chip row can measure how wide
  // it may grow before overlapping the image.
  const HERO_TOP = 116;
  const HERO_W = 248, HERO_H = 220;

  // ───────────────────────────────────────────────────────────────────────────
  // TITLE BLOCK — premium product hierarchy. Brand eyebrow (with logo
  // if present) sits above an oversized model name; dimension renders
  // as a refined subhead. The H1 is the visual anchor of the whole page.
  // ───────────────────────────────────────────────────────────────────────────
  let y = HEADER_TOP + HEADER_LOGO_H + 38;

  // Marca eyebrow: small brand logo + marca text + country, all in
  // the muted brand color so it reads as a category label, not a title.
  let cursorX = M;
  if (brandLogoData) {
    const { w, h } = await imageDims(brandLogoData);
    const boxW = 38, boxH = 20;
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale, drawH = h * scale;
    doc.addImage(
      brandLogoData, detectFormat(brandLogoData),
      cursorX, y - drawH + 1, drawW, drawH, undefined, "SLOW",
    );
    cursorX += drawW + 10;
  }
  const marcaText = input.marca.toUpperCase();
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TYPE.micro.size);
  doc.setCharSpace(TRACK.eyebrow);
  doc.text(marcaText, cursorX, y);
  doc.setCharSpace(0);
  if (input.brandCountry || input.brand?.country) {
    const country = input.brand?.country ?? input.brandCountry;
    const mw = doc.getTextWidth(marcaText) + TRACK.eyebrow * (marcaText.length - 1);
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(TYPE.bodySm.size);
    doc.text(`· ${country}`, cursorX + mw + 8, y);
  }

  y += 26;
  // Hero H1 — the modelo. Big, dark, tight. This is the single biggest
  // type element on the page and should anchor the eye.
  doc.setTextColor(...FALLBACK.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TYPE.hero.size);
  // splitTextToSize wraps long model names across two lines instead of
  // bleeding past the hero image margin.
  const heroMaxW = pageW - M - HERO_W - M - 18;
  const heroLines = doc.splitTextToSize(input.modelo, heroMaxW).slice(0, 2) as string[];
  for (const ln of heroLines) {
    doc.text(ln, M, y);
    y += TYPE.hero.size * TYPE.heroLh;
  }

  y += 4;
  // Dimension — refined subhead, brand color, regular weight (not bold)
  // so it reads "label" rather than "title".
  doc.setTextColor(...brand);
  doc.setFontSize(TYPE.subhead.size);
  doc.setFont("helvetica", "normal");
  doc.text(input.dimension, M, y);

  // ───────────────────────────────────────────────────────────────────────────
  // CHIP ROW — at-a-glance attributes. All chips share one subtle visual
  // language (1-pt brand-tinted border + brand text on white) so the
  // category badge doesn't read like a button while the others read like
  // labels. Smaller, lower-contrast = more premium.
  // ───────────────────────────────────────────────────────────────────────────
  const chips: Array<{ label: string }> = [];
  chips.push({ label: input.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva" });
  if (input.terreno)    chips.push({ label: input.terreno });
  if (input.ejeTirePro) chips.push({ label: input.ejeTirePro.charAt(0).toUpperCase() + input.ejeTirePro.slice(1) });
  if (input.reencauchable) chips.push({ label: "Reencauchable" });

  y += 16;
  const heroLeftX = pageW - M - HERO_W;
  const chipMaxX  = productImages[0] ? heroLeftX - 14 : pageW - M;
  const chipH      = 20;
  const chipGapX   = 6;
  const chipGapY   = 6;
  const chipPadX   = 10;
  const chipFont   = 8.5;
  const chipBaseY  = 13;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(chipFont);
  doc.setCharSpace(0.4);

  let chipX   = M;
  let chipTop = y;
  for (const chip of chips) {
    const label = chip.label.toUpperCase();
    const tw    = doc.getTextWidth(label) + 0.4 * (label.length - 1);
    const w     = tw + chipPadX * 2;
    if (chipX > M && chipX + w > chipMaxX) {
      chipX   = M;
      chipTop += chipH + chipGapY;
    }
    // Hairline outline only — fills are reserved for stronger
    // statements (price block, totals).
    doc.setDrawColor(...brandT15);
    doc.setLineWidth(0.6);
    doc.roundedRect(chipX, chipTop, w, chipH, chipH / 2, chipH / 2, "S");
    doc.setTextColor(...brand);
    doc.text(label, chipX + chipPadX, chipTop + chipBaseY);
    chipX += w + chipGapX;
  }
  doc.setCharSpace(0);
  y = chipTop + chipH;

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
  // SPECS TABLE — full width, hairline horizontal rules only, no zebra.
  // Reads like a printed product datasheet rather than a web table.
  // ───────────────────────────────────────────────────────────────────────────
  y = drawSectionHeader(doc, "Especificaciones", M, y, pageW - M, brand);
  const tableWidth = pageW - 2 * M;
  // Banda values are SKU-style codes (HDC1, BDR HG, M725...) — always
  // render in upper case regardless of how the catalog editor stored
  // them. "hdc1" becomes "HDC1" so quotes look uniform across vendors.
  const upperBandaRows = input.rows.map((r) =>
    r.label.toLowerCase().includes("banda")
      ? [r.label, r.value.toUpperCase()]
      : [r.label, r.value],
  );
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head:   [["Característica", "Valor"]],
    body:   upperBandaRows,
    theme:  "plain",
    tableWidth,
    styles: {
      font: "helvetica",
      fontSize: TYPE.body.size,
      cellPadding: { top: 9, right: 10, bottom: 9, left: 0 },
      textColor: FALLBACK.ink,
      lineColor: FALLBACK.line,
      // Bottom rule only on each cell, drawn via didDrawCell below so
      // we can control direction (no vertical lines).
      lineWidth: 0,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: FALLBACK.muted,
      fontStyle: "bold",
      fontSize: TYPE.eyebrow.size,
      cellPadding: { top: 0, right: 10, bottom: 8, left: 0 },
    },
    columnStyles: {
      0: { cellWidth: Math.round(tableWidth * 0.40), fontStyle: "normal", textColor: FALLBACK.muted },
      1: { cellWidth: Math.round(tableWidth * 0.60), fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      // Draw a hairline rule under every body row (and under the head).
      // Skipping the very last row keeps the table from looking
      // bordered at the bottom; the next section's eyebrow rule does
      // that job.
      if (data.section === "head" || data.section === "body") {
        const isLastBody =
          data.section === "body" &&
          data.row.index === (input.rows.length - 1);
        if (isLastBody) return;
        doc.setDrawColor(...FALLBACK.line);
        doc.setLineWidth(0.4);
        const yLine = data.cell.y + data.cell.height;
        doc.line(M, yLine, pageW - M, yLine);
      }
    },
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y += 18;

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
  // PRICE — minimalist treatment. Eyebrow + oversized brand-tinted
  // number on white, hairline rule above and below. Reads like a
  // showroom price tag rather than a marketing CTA.
  // ───────────────────────────────────────────────────────────────────────────
  if (input.priceMode !== "none" && input.priceCop && input.priceCop > 0) {
    const base = input.priceCop;
    const withIva = Math.round(base * 1.19);
    const shown = input.priceMode === "con_iva" ? withIva : base;
    const ivaLabel = input.priceMode === "con_iva" ? "IVA 19% incluido" : "No incluye IVA";

    const boxY = y;
    const boxH = 70;

    // Top hairline.
    doc.setDrawColor(...FALLBACK.line);
    doc.setLineWidth(0.5);
    doc.line(M, boxY, pageW - M, boxY);

    // Eyebrow.
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TYPE.eyebrow.size);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text("PRECIO", M, boxY + 18);
    doc.setCharSpace(0);

    // The big number — brand color, oversized, anchors the page.
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TYPE.bigMoney.size);
    doc.text(fmtCOP(shown), M, boxY + 54);

    // IVA label, right-aligned, low-contrast.
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(TYPE.bodySm.size);
    doc.text(ivaLabel, pageW - M, boxY + 54, { align: "right" });

    // Bottom hairline.
    doc.line(M, boxY + boxH, pageW - M, boxY + boxH);

    y = boxY + boxH + 18;
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
    // Plain layout — name big, supporting line muted, website on the
    // right. No filled card; the section eyebrow already carries the
    // visual bracket.
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(input.repName ?? input.companyName ?? "", M, y + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(TYPE.bodySm.size);
    doc.setTextColor(...FALLBACK.muted);
    const line2 = [input.repPhone, input.companyCity].filter(Boolean).join("  ·  ");
    if (line2) doc.text(line2, M, y + 34);

    if (input.companyWebsite) {
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(TYPE.bodySm.size);
      doc.text(input.companyWebsite, pageW - M, y + 34, { align: "right" });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FOOTER — refined watermark. Hairline + 3 small spans (company /
  // date / TirePro signature) on a single line.
  // ───────────────────────────────────────────────────────────────────────────
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.4);
  doc.line(M, pageH - 42, pageW - M, pageH - 42);

  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(TYPE.eyebrow.size);
  doc.setCharSpace(TRACK.eyebrow);
  if (input.companyName) doc.text(input.companyName.toUpperCase(), M, pageH - 26);
  const today = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  doc.text(today, pageW / 2, pageH - 26, { align: "center" });
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.text("POWERED BY TIREPRO.COM.CO", pageW - M, pageH - 26, { align: "right" });
  doc.setCharSpace(0);

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
  // Premium-grade section header. Small-caps tracker over a hairline
  // rule that runs the full content width — like a product sheet's
  // chapter divider. Heavy filled bars are the #1 reason a generated
  // PDF reads "templated"; this avoids them entirely.
  const upper = title.toUpperCase();
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TYPE.eyebrow.size);
  // jspdf has charSpace for tracking — a touch of letter-spacing on
  // the eyebrow makes it read editorial rather than brutal.
  doc.setCharSpace(TRACK.eyebrow);
  doc.text(upper, x, y);
  doc.setCharSpace(0);
  const textW = doc.getTextWidth(upper) + TRACK.eyebrow * (upper.length - 1);
  // Thin rule the full width, sitting just below the cap line so the
  // header feels grounded rather than floating.
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.4);
  doc.line(x + textW + 12, y - 3, right, y - 3);
  return y + 12;
}

// =============================================================================
// Multi-tire quote PDF
// Different layout from the single-product sheet — compact rows, one per
// tire, qty + price column on the right, optional grand total. "Display
// mode" picks between an individual-price comparative (no grand total)
// and a total-price purchase (qty × unit + grand total).
// =============================================================================

export type QuoteItem = {
  catalogId: string;
  marca:     string;
  modelo:    string;
  dimension: string;
  categoria: string | null;
  terreno:   string | null;
  ejeTirePro:string | null;
  imageUrl:  string | null;
  // Ficha snapshot — renders conditionally based on QuoteInput.includeFields.
  indiceCarga?:     string | null;
  indiceVelocidad?: string | null;
  rtdMm?:           number | null;
  psiRecomendado?:  number | null;
  pesoKg?:          number | null;
  cinturones?:      string | null;
  pr?:              string | null;
  reencauchable?:   boolean | null;
  tipoBanda?:       string | null;
  construccion?:    string | null;
  segmento?:        string | null;
  tipo?:            string | null;
  quantity:  number;
  unitPriceCop: number | null;
};

/** Which ficha-técnica fields to print on each quote row. */
export type QuoteIncludeFields = Partial<Record<
  | "categoria" | "terreno" | "ejeTirePro" | "dimension"
  | "indiceCarga" | "indiceVelocidad" | "rtdMm" | "psiRecomendado"
  | "pesoKg" | "cinturones" | "pr" | "reencauchable" | "tipoBanda"
  | "construccion" | "segmento" | "tipo",
  boolean
>>;

export type QuoteInput = {
  companyName:    string | null;
  companyLogoUrl: string | null;
  companyColor:   string | null;
  companyWebsite: string | null;
  companyCity:    string | null;
  repName:        string | null;
  repPhone:       string | null;
  clientName:     string | null;
  clientNotes:    string | null;
  items:          QuoteItem[];
  priceMode:   "none" | "sin_iva" | "con_iva";
  // "individual": comparative layout — one full datasheet per tire, unit
  //               prices, no grand total (used to compare products).
  // "total":      cotización layout — compact table rows, qty × unit =
  //               line total, with a grand total (used to close a sale).
  displayMode: "individual" | "total";
  // Which ficha fields to include under each row. When undefined the
  // renderer falls back to a minimal "dimension · categoria · terreno
  // · eje" line so old callers keep working.
  includeFields?: QuoteIncludeFields;
  // Manufacturer brand info keyed by marca. Used by buildComparativePdf
  // to draw the "Acerca de la marca" card + inline brand logo/country so
  // each tire page looks identical to the single-tire PDF. Optional —
  // missing marcas just render without the brand block.
  brandByMarca?: Record<string, PdfBrand | null>;
  fetchViaProxy?: (url: string) => Promise<Blob | null>;
};

// =============================================================================
// Comparative PDF — one full single-tire-style datasheet per cart item.
// Reuses the same layout conventions as buildCatalogPdf (banner, brand
// rail, hero, chips, specs table, price block, contact card, footer) so
// each tire in the comparison is as readable as a solo product sheet.
// Used when displayMode === "individual".
// =============================================================================

export async function buildComparativePdf(input: QuoteInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 42;

  const brand     = parseHex(input.companyColor) ?? FALLBACK.primary;
  const brandText = readableTextOn(brand);
  const brandT08  = tint(brand, 0.08);
  const brandT15  = tint(brand, 0.18);

  const logoUrl = isDefaultPlaceholderLogo(input.companyLogoUrl) ? null : input.companyLogoUrl;
  const proxy   = input.fetchViaProxy;
  const brandByMarca = input.brandByMarca ?? {};

  // Preload company logo + every tire hero + every unique marca's brand
  // logo in parallel. Brand logos are deduped by marca since the cart can
  // hold multiple tires of the same manufacturer.
  const uniqueMarcas = Array.from(new Set(input.items.map((it) => it.marca)));
  const brandLogoUrlByMarca = new Map<string, string | null>();
  for (const marca of uniqueMarcas) {
    brandLogoUrlByMarca.set(marca, brandByMarca[marca]?.logoUrl ?? null);
  }
  const [logoData, heroDataArr, brandLogoDataArr] = await Promise.all([
    loadImageAsDataUrl(logoUrl, proxy),
    Promise.all(input.items.map((it) => loadImageAsDataUrl(it.imageUrl, proxy))),
    Promise.all(uniqueMarcas.map((m) => loadImageAsDataUrl(brandLogoUrlByMarca.get(m) ?? null, proxy))),
  ]);
  const heroDatas = heroDataArr;
  const brandLogoDataByMarca = new Map<string, string | null>();
  uniqueMarcas.forEach((m, idx) => brandLogoDataByMarca.set(m, brandLogoDataArr[idx]));

  // Default ficha set — broader than the "total" mode default since a
  // per-tire datasheet has room to breathe, and the user picked
  // comparative specifically because they want the detail.
  const fields: QuoteIncludeFields = input.includeFields ?? {
    dimension: true, categoria: true, terreno: true, ejeTirePro: true,
    indiceCarga: true, indiceVelocidad: true, rtdMm: true, psiRecomendado: true,
    cinturones: true, pr: true, reencauchable: true, tipoBanda: true,
  };

  const ivaMul = input.priceMode === "con_iva" ? 1.19 : 1;

  for (let i = 0; i < input.items.length; i++) {
    if (i > 0) doc.addPage();
    const it            = input.items[i];
    const heroData      = heroDatas[i];
    const b             = brandByMarca[it.marca] ?? null;
    const brandLogoData = brandLogoDataByMarca.get(it.marca) ?? null;

    // ─── HEADER BANNER ──────────────────────────────────────────────────
    doc.setFillColor(...brand);
    doc.rect(0, 0, pageW, 94, "F");
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      const textW = doc.getTextWidth(input.companyName);
      const pillW = Math.min(280, textW + 32);
      doc.roundedRect(M - 8, 27, pillW, 40, 8, 8, "F");
      doc.setTextColor(...brand);
      doc.text(input.companyName, M - 8 + pillW / 2, 52, { align: "center", maxWidth: pillW - 32 });
    }

    // Match the single-tire header verbatim — "FICHA TÉCNICA" + categoría
    // in the right slot. No page counter; the user wanted parity with the
    // single-tire download.
    doc.setTextColor(...brandText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("FICHA TÉCNICA", pageW - M, 36, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      it.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva",
      pageW - M, 54, { align: "right" },
    );

    // Left-edge brand rail
    doc.setFillColor(...brand);
    doc.rect(0, 94, 4, pageH - 94, "F");

    // ─── TITLE BLOCK ────────────────────────────────────────────────────
    const HERO_TOP = 120;
    const HERO_W = 240, HERO_H = 200;
    let y = 132;

    // Marca tagline: small brand logo (if available) + marca text + country.
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
    const marcaText = it.marca.toUpperCase();
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(marcaText, cursorX, y);
    if (b?.country) {
      const mw = doc.getTextWidth(marcaText);
      doc.setTextColor(...FALLBACK.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`· ${b.country}`, cursorX + mw + 8, y);
    }

    y += 30;
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text(it.modelo, M, y);

    y += 20;
    doc.setTextColor(...brand);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(it.dimension, M, y);

    // ─── CHIP ROW (left column only, wraps if needed) ───────────────────
    const chips: Array<{ label: string; fill: [number, number, number]; text: [number, number, number] }> = [];
    chips.push({
      label: it.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva",
      fill:  brand,
      text:  brandText,
    });
    if (it.terreno)    chips.push({ label: it.terreno,   fill: brandT08, text: brand });
    if (it.ejeTirePro) chips.push({ label: it.ejeTirePro.charAt(0).toUpperCase() + it.ejeTirePro.slice(1), fill: brandT08, text: brand });
    if (it.reencauchable) chips.push({ label: "Reencauchable", fill: brandT15, text: brand });

    y += 10;
    const heroLeftX = pageW - M - HERO_W;
    const chipMaxX  = heroData ? heroLeftX - 14 : pageW - M;
    const chipH    = 22, chipGapX = 8, chipGapY = 8, chipPadX = 12, chipFont = 9, chipBaseY = 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(chipFont);
    let chipX   = M;
    let chipTop = y;
    for (const chip of chips) {
      const label = chip.label.toUpperCase();
      const tw = doc.getTextWidth(label);
      const w  = tw + chipPadX * 2;
      if (chipX > M && chipX + w > chipMaxX) { chipX = M; chipTop += chipH + chipGapY; }
      doc.setFillColor(...chip.fill);
      doc.roundedRect(chipX, chipTop, w, chipH, chipH / 2, chipH / 2, "F");
      doc.setTextColor(...chip.text);
      doc.text(label, chipX + chipPadX, chipTop + chipBaseY);
      chipX += w + chipGapX;
    }
    y = chipTop + chipH;

    // ─── HERO IMAGE ─────────────────────────────────────────────────────
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

    y = Math.max(y + 24, HERO_TOP + HERO_H + 18);

    // ─── BRAND CARD (optional) — "Acerca de la marca" + facts ──────────
    // Exact same layout as buildCatalogPdf: tagline (italic) + description
    // + facts line (uppercase, country · founded · tier · casa matriz ·
    // website). Rendered only when the marketplace has an entry for this
    // marca (brandByMarca populated).
    const hasBrandContent = !!b && (
      b.tagline || b.description ||
      b.country || b.foundedYear || b.parentCompany || b.tier || b.website
    );
    if (hasBrandContent && b) {
      y = drawSectionHeader(doc, "Acerca de la marca", M, y, pageW - M, brand);
      const cardTop = y + 4;
      const innerW  = pageW - 2 * M - 24;

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

      const cardH = 16
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

    // ─── SPECS TABLE ────────────────────────────────────────────────────
    const rows = buildSpecRows(it, fields);
    if (rows.length > 0) {
      y = drawSectionHeader(doc, "Especificaciones", M, y, pageW - M, brand);
      const tableWidth = pageW - 2 * M;
      autoTable(doc, {
        startY: y + 4,
        margin: { left: M, right: M },
        head:   [["Característica", "Valor"]],
        body:   rows.map((r) => [r.label, r.value]),
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
    }

    // ─── PRICE BLOCK — identical to single-tire PDF ─────────────────────
    if (input.priceMode !== "none" && it.unitPriceCop && it.unitPriceCop > 0) {
      const unit = Math.round(it.unitPriceCop * ivaMul);
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
      doc.text(fmtCOP(unit), M + 22, boxY + 50);

      doc.setTextColor(200, 215, 240);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(ivaLabel, pageW - M - 20, boxY + 50, { align: "right" });

      y = boxY + boxH + 14;
    }

    // ─── CONTACT CARD (spills to a new page if needed; next tire will
    //      still start on a fresh page of its own via addPage at the top
    //      of the loop). ────────────────────────────────────────────────
    const hasRep      = !!(input.repName || input.repPhone);
    const hasSiteCity = !!(input.companyWebsite || input.companyCity);
    if (hasRep || hasSiteCity) {
      const contactNeed = 80;
      if (y + contactNeed > pageH - 60) {
        drawFooter(doc, pageW, pageH, M, brand, input.companyName);
        doc.addPage();
        doc.setFillColor(...brand);
        doc.rect(0, 0, 4, pageH, "F");
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

    drawFooter(doc, pageW, pageH, M, brand, input.companyName);
  }

  return doc.output("blob");
}

// Map a QuoteItem + includeFields toggle set to spec-table rows. Same
// label wording as the single-tire PDF's spec table so both renderings
// feel like they belong to the same product sheet family.
function buildSpecRows(it: QuoteItem, f: QuoteIncludeFields): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (f.dimension       && it.dimension)        rows.push({ label: "Dimensión",            value: it.dimension });
  if (f.indiceCarga     && it.indiceCarga)      rows.push({ label: "Índice de carga",      value: it.indiceCarga });
  if (f.indiceVelocidad && it.indiceVelocidad)  rows.push({ label: "Índice de velocidad",  value: it.indiceVelocidad });
  if (f.rtdMm           && it.rtdMm != null)    rows.push({ label: "Profundidad inicial",  value: `${it.rtdMm} mm` });
  if (f.psiRecomendado  && it.psiRecomendado != null) rows.push({ label: "Presión recomendada", value: `${it.psiRecomendado} PSI` });
  if (f.pesoKg          && it.pesoKg != null)   rows.push({ label: "Peso",                 value: `${it.pesoKg} kg` });
  if (f.cinturones      && it.cinturones)       rows.push({ label: "Cinturones",           value: it.cinturones });
  if (f.pr              && it.pr)               rows.push({ label: "PR (ply rating)",      value: it.pr });
  if (f.ejeTirePro      && it.ejeTirePro)       rows.push({ label: "Eje",                  value: cap(it.ejeTirePro) });
  if (f.terreno         && it.terreno)          rows.push({ label: "Terreno",              value: it.terreno });
  if (f.reencauchable   && it.reencauchable != null) rows.push({ label: "Reencauchabilidad", value: it.reencauchable ? "Sí" : "No" });
  if (f.tipoBanda       && it.tipoBanda)        rows.push({ label: "Tipo de banda",        value: it.tipoBanda.toUpperCase() });
  if (f.construccion    && it.construccion)     rows.push({ label: "Construcción",         value: it.construccion });
  if (f.segmento        && it.segmento)         rows.push({ label: "Segmento",             value: it.segmento });
  if (f.tipo            && it.tipo)             rows.push({ label: "Tipo",                 value: it.tipo });
  if (f.categoria       && it.categoria)        rows.push({ label: "Categoría",            value: it.categoria === "reencauche" ? "Reencauche" : "Llanta Nueva" });
  return rows;
}

export async function buildQuotePdf(input: QuoteInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = SPACE.M;

  const brand     = parseHex(input.companyColor) ?? FALLBACK.primary;
  const brandT08  = tint(brand, 0.08);
  const brandT15  = tint(brand, 0.18);
  void brandT08;

  const logoUrl = isDefaultPlaceholderLogo(input.companyLogoUrl) ? null : input.companyLogoUrl;
  const proxy   = input.fetchViaProxy;

  // Pre-load logo + every tire thumbnail in parallel.
  const [logoData, ...thumbDatas] = await Promise.all([
    loadImageAsDataUrl(logoUrl, proxy),
    ...input.items.map((it) => loadImageAsDataUrl(it.imageUrl, proxy)),
  ]);

  const ivaMul = input.priceMode === "con_iva" ? 1.19 : 1;
  const effectiveUnit = (unit: number | null) =>
    unit == null ? 0 : Math.round(unit * ivaMul);
  const lineTotal = (it: QuoteItem) =>
    effectiveUnit(it.unitPriceCop) * Math.max(1, it.quantity || 1);

  // ───────────────────────────────────────────────────────────────────────────
  // HEADER — same minimalist treatment as the catalog sheet so the two
  // documents feel like a system. Logo at left, COTIZACIÓN eyebrow +
  // date at right, hairline below, no colored banner.
  // ───────────────────────────────────────────────────────────────────────────
  const HEADER_TOP = 36;
  const HEADER_LOGO_H = 38;
  if (logoData) {
    const { w, h } = await imageDims(logoData);
    const scale = Math.min(180 / w, HEADER_LOGO_H / h);
    const drawW = w * scale, drawH = h * scale;
    doc.addImage(
      logoData, detectFormat(logoData),
      M, HEADER_TOP, drawW, drawH, undefined, "SLOW",
    );
  } else if (input.companyName) {
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(input.companyName, M, HEADER_TOP + 24);
  }

  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(TYPE.eyebrow.size);
  doc.setCharSpace(TRACK.eyebrow);
  doc.text("COTIZACIÓN", pageW - M, HEADER_TOP + 14, { align: "right" });
  doc.setCharSpace(0);
  const today = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  doc.setTextColor(...FALLBACK.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(today, pageW - M, HEADER_TOP + 32, { align: "right" });

  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.5);
  doc.line(M, HEADER_TOP + HEADER_LOGO_H + 14, pageW - M, HEADER_TOP + HEADER_LOGO_H + 14);

  let y = HEADER_TOP + HEADER_LOGO_H + 38;

  // Client block — eyebrow + name styled like the recipient line of a
  // formal quote (PARA: NAME). The notes paragraph hangs below.
  if (input.clientName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TYPE.eyebrow.size);
    doc.setTextColor(...FALLBACK.muted);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text("PARA", M, y);
    doc.setCharSpace(0);
    doc.setTextColor(...FALLBACK.ink);
    doc.setFontSize(16);
    doc.text(input.clientName, M, y + 18);
    y += 30;
  }
  if (input.clientNotes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(TYPE.bodySm.size);
    doc.setTextColor(...FALLBACK.muted);
    const lines = doc.splitTextToSize(input.clientNotes, pageW - 2 * M).slice(0, 3);
    for (const ln of lines) { doc.text(ln, M, y); y += 12; }
    y += 4;
  }

  y += 10;

  // ─── ITEMS TABLE HEADER ──────────────────────────────────────────────────
  const QTY_X      = pageW - M - 220;
  const UNIT_X     = pageW - M - 140;
  const TOTAL_X    = pageW - M - 4;
  const ROW_MIN_H  = 70;
  const isTotal    = input.displayMode === "total";

  // Default set when the caller didn't explicitly configure fields —
  // matches the original compact subtitle so upgrading doesn't change
  // output until the rep opts in to more.
  const fields: QuoteIncludeFields = input.includeFields ?? {
    categoria: true, terreno: true, ejeTirePro: true,
  };
  // Build the "specs line" for a given item. Each toggled field becomes
  // one segment with a label-prefix so multi-value values like
  // "16 PR / 4B+2N" stay readable when smushed together.
  const buildSpecsLine = (it: QuoteItem): string => {
    const bits: string[] = [];
    if (fields.dimension       && it.dimension)       bits.push(it.dimension);
    if (fields.categoria       && it.categoria)       bits.push(it.categoria);
    if (fields.terreno         && it.terreno)         bits.push(it.terreno);
    if (fields.ejeTirePro      && it.ejeTirePro)      bits.push(it.ejeTirePro);
    if (fields.indiceCarga     && it.indiceCarga)     bits.push(`Carga ${it.indiceCarga}`);
    if (fields.indiceVelocidad && it.indiceVelocidad) bits.push(`Vel. ${it.indiceVelocidad}`);
    if (fields.rtdMm           && it.rtdMm != null)   bits.push(`${it.rtdMm} mm`);
    if (fields.psiRecomendado  && it.psiRecomendado != null) bits.push(`${it.psiRecomendado} PSI`);
    if (fields.pesoKg          && it.pesoKg != null)  bits.push(`${it.pesoKg} kg`);
    if (fields.cinturones      && it.cinturones)      bits.push(`Cint. ${it.cinturones}`);
    if (fields.pr              && it.pr)              bits.push(`${it.pr} PR`);
    if (fields.reencauchable   && it.reencauchable != null) {
      bits.push(it.reencauchable ? "Reencauchable" : "No reencauchable");
    }
    if (fields.tipoBanda       && it.tipoBanda)       bits.push(`Banda ${it.tipoBanda.toUpperCase()}`);
    if (fields.construccion    && it.construccion)    bits.push(it.construccion);
    if (fields.segmento        && it.segmento)        bits.push(it.segmento);
    if (fields.tipo            && it.tipo)            bits.push(it.tipo);
    return bits.join("  ·  ");
  };

  // Header for the items table — eyebrow column labels + a single
  // hairline rule. No filled bar; the type itself does the work.
  const drawTableHeader = (y0: number): number => {
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TYPE.eyebrow.size);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text("LLANTA", M, y0);
    doc.text("CANT.", QTY_X, y0, { align: "right" });
    doc.text(isTotal ? "UNIT." : "PRECIO", UNIT_X, y0, { align: "right" });
    if (isTotal) doc.text("TOTAL", TOTAL_X, y0, { align: "right" });
    doc.setCharSpace(0);
    doc.setDrawColor(...FALLBACK.line);
    doc.setLineWidth(0.5);
    doc.line(M, y0 + 6, pageW - M, y0 + 6);
    return y0 + 18;
  };

  y = drawTableHeader(y);

  // ─── ITEM ROWS ──────────────────────────────────────────────────────────
  for (let i = 0; i < input.items.length; i++) {
    const it   = input.items[i];
    const thumb = thumbDatas[i];

    // Measure the specs line so we know how tall the row must be. Width
    // budget is (everything to the left of the qty column, minus a pad).
    const textX   = M + 54 + 16;
    const specsW  = QTY_X - textX - 14;
    const specsText = buildSpecsLine(it);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const specsLines = specsText
      ? (doc.splitTextToSize(specsText, specsW) as string[]).slice(0, 3)
      : [];
    // Base row = identity block (marca 8pt + modelo 12pt + dimension
    // 10pt) plus one spec line; each extra spec line adds ~11pt.
    const rowH = Math.max(ROW_MIN_H, 62 + specsLines.length * 11);

    // Page break if the whole row + footer breathing room would overflow.
    if (y + rowH > pageH - 120) {
      drawFooter(doc, pageW, pageH, M, brand, input.companyName);
      doc.addPage();
      // No brand rail on follow-on pages either — the whole document
      // commits to the minimalist treatment.
      y = HEADER_TOP;
      y = drawTableHeader(y);
    }

    // No row backdrop — flat rows separated by hairlines feel premium
    // and let the eye scan price columns vertically. The rule is drawn
    // at the BOTTOM of every row.

    // Thumb (left)
    const thumbX = M;
    const thumbY = y + 8;
    const thumbW = 54, thumbH = rowH - 16;
    doc.setFillColor(...FALLBACK.page);
    doc.roundedRect(thumbX, thumbY, thumbW, thumbH, 6, 6, "F");
    if (thumb) {
      const { w, h } = await imageDims(thumb);
      const scale = Math.min(thumbW / w, thumbH / h);
      const drawW = w * scale, drawH = h * scale;
      doc.addImage(
        thumb, detectFormat(thumb),
        thumbX + (thumbW - drawW) / 2,
        thumbY + (thumbH - drawH) / 2,
        drawW, drawH, undefined, "MEDIUM",
      );
    }

    // Identity column
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(it.marca.toUpperCase(), textX, y + 18);
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(it.modelo, textX, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...brand);
    doc.text(it.dimension, textX, y + 48);

    // Specs line(s) — multi-line support
    if (specsLines.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...FALLBACK.muted);
      let sy = y + 62;
      for (const ln of specsLines) { doc.text(ln, textX, sy); sy += 11; }
    }

    // Qty / unit / total columns — vertically centered to the row.
    const moneyY = y + rowH / 2 + 4;
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(String(it.quantity), QTY_X, moneyY, { align: "right" });

    doc.setFontSize(TYPE.rowMoney.size);
    if (input.priceMode === "none" || it.unitPriceCop == null || it.unitPriceCop <= 0) {
      doc.setTextColor(...FALLBACK.muted);
      doc.text("—", UNIT_X, moneyY, { align: "right" });
      if (isTotal) doc.text("—", TOTAL_X, moneyY, { align: "right" });
    } else {
      const unit  = effectiveUnit(it.unitPriceCop);
      const line  = lineTotal(it);
      doc.text(fmtCOP(unit), UNIT_X, moneyY, { align: "right" });
      if (isTotal) {
        // Line total — slightly heavier weight + brand color so the eye
        // lands on the column the customer cares about.
        doc.setTextColor(...brand);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(TYPE.rowMoney.size + 1);
        doc.text(fmtCOP(line), TOTAL_X, moneyY, { align: "right" });
      }
    }

    // Hairline rule under every row separates them without the visual
    // weight of a card border. Last row's rule is suppressed by the
    // total/notes block below absorbing it.
    doc.setDrawColor(...FALLBACK.line);
    doc.setLineWidth(0.4);
    doc.line(M, y + rowH, pageW - M, y + rowH);

    y += rowH;
  }

  y += 12;

  // ─── GRAND TOTAL — premium minimalist treatment.
  // Eyebrow label on the left, oversized brand-colored number on the
  // right. No filled bar; the type itself is the statement. This is
  // the moment the customer is supposed to see the number — make it
  // unambiguously the biggest thing on the page after the H1.
  if (isTotal && input.priceMode !== "none") {
    const grand = input.items.reduce((s, it) => s + lineTotal(it), 0);
    if (grand > 0) {
      const need = 70;
      if (y + need > pageH - 120) {
        drawFooter(doc, pageW, pageH, M, brand, input.companyName);
        doc.addPage();
        y = HEADER_TOP;
      }
      // Top hairline.
      doc.setDrawColor(...FALLBACK.ink);
      doc.setLineWidth(1.2);
      doc.line(M, y, pageW - M, y);

      // Eyebrow.
      doc.setTextColor(...FALLBACK.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(TYPE.eyebrow.size);
      doc.setCharSpace(TRACK.eyebrow);
      doc.text("TOTAL", M, y + 22);
      doc.setCharSpace(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(TYPE.bodySm.size);
      doc.setTextColor(...FALLBACK.muted);
      doc.text(
        input.priceMode === "con_iva" ? "IVA 19% incluido" : "No incluye IVA",
        M, y + 40,
      );

      // The big number.
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(TYPE.bigMoney.size);
      doc.text(fmtCOP(grand), pageW - M, y + 38, { align: "right" });

      y += 60;
      doc.setDrawColor(...FALLBACK.line);
      doc.setLineWidth(0.4);
      doc.line(M, y, pageW - M, y);
      y += 18;
    }
  } else if (input.priceMode !== "none") {
    // Individual/comparative mode — short note reminding the reader
    // prices are per-unit.
    const note = input.priceMode === "con_iva"
      ? "Precios por unidad, IVA 19% incluido"
      : "Precios por unidad, no incluyen IVA";
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...FALLBACK.muted);
    doc.text(note, M, y + 6);
    y += 18;
  }

  // ─── CONTACT — minimalist layout matching the catalog sheet ──────────────
  const hasRep      = !!(input.repName || input.repPhone);
  const hasSiteCity = !!(input.companyWebsite || input.companyCity);
  if (hasRep || hasSiteCity) {
    const contactNeed = 80;
    if (y + contactNeed > pageH - 60) {
      drawFooter(doc, pageW, pageH, M, brand, input.companyName);
      doc.addPage();
      y = HEADER_TOP;
    }
    y = drawSectionHeader(doc, "Contacto", M, y + 4, pageW - M, brand);
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(input.repName ?? input.companyName ?? "", M, y + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(TYPE.bodySm.size);
    doc.setTextColor(...FALLBACK.muted);
    const line2 = [input.repPhone, input.companyCity].filter(Boolean).join("  ·  ");
    if (line2) doc.text(line2, M, y + 34);

    if (input.companyWebsite) {
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(TYPE.bodySm.size);
      doc.text(input.companyWebsite, pageW - M, y + 34, { align: "right" });
    }
  }

  drawFooter(doc, pageW, pageH, M, brand, input.companyName);

  void brandT15;

  return doc.output("blob");
}

function drawFooter(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  M: number,
  brand: [number, number, number],
  companyName: string | null,
) {
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.4);
  doc.line(M, pageH - 42, pageW - M, pageH - 42);

  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TYPE.eyebrow.size);
  doc.setCharSpace(TRACK.eyebrow);
  if (companyName) doc.text(companyName.toUpperCase(), M, pageH - 26);
  const today = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  doc.text(today, pageW / 2, pageH - 26, { align: "center" });
  doc.setTextColor(...brand);
  doc.text("POWERED BY TIREPRO.COM.CO", pageW - M, pageH - 26, { align: "right" });
  doc.setCharSpace(0);
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
