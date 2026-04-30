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
  // For reencauche items, modelo is the banda code (e.g. "D801", "VRL1") —
  // the renderer force-uppercases it. Pass "reencauche" here when it is.
  tipo?:      string | null;
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
  // Optional pre-discount MSRP. When > priceCop the PDF prints both,
  // strikes through originalPriceCop, and shows a "−X%" badge.
  originalPriceCop?: number | null;
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
  // bleeding past the hero image margin. For reencauche the modelo IS
  // the banda code, so force-uppercase it (matches the per-row uppercase
  // we already do for tipoBanda elsewhere).
  const heroMaxW = pageW - M - HERO_W - M - 18;
  const heroModelo = input.tipo === "reencauche" ? input.modelo.toUpperCase() : input.modelo;
  const heroLines = doc.splitTextToSize(heroModelo, heroMaxW).slice(0, 2) as string[];
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

    const original    = input.originalPriceCop ?? null;
    const hasDiscount = original != null && original > base;
    const shownOriginal = hasDiscount
      ? (input.priceMode === "con_iva" ? Math.round(original * 1.19) : original)
      : null;
    const savings     = hasDiscount && shownOriginal != null ? shownOriginal - shown : 0;
    const discountPct = hasDiscount ? Math.round(((original! - base) / original!) * 100) : 0;

    // Single clean treatment whether discounted or not. Everything aligns
    // on the same horizontal grid: hairline / eyebrow / big number /
    // (struck MSRP + savings) / hairline.  No loud pill, no boxes.
    const boxY = y;
    const boxH = hasDiscount ? 88 : 70;

    // Top hairline.
    doc.setDrawColor(...FALLBACK.line);
    doc.setLineWidth(0.5);
    doc.line(M, boxY, pageW - M, boxY);

    // Eyebrow — left.
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TYPE.eyebrow.size);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text("PRECIO", M, boxY + 18);
    doc.setCharSpace(0);

    // IVA label — right, same line as eyebrow.
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(TYPE.bodySm.size);
    doc.text(ivaLabel, pageW - M, boxY + 18, { align: "right" });

    // Final price — brand color, oversized. Anchors everything below.
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TYPE.bigMoney.size);
    doc.text(fmtCOP(shown), M, boxY + 50);

    // Discount detail row — a single inline caption under the big price:
    // ~~$1.500.000~~   −25%   ahorras $500.000
    //   muted strike    emerald      emerald
    //
    // Same baseline, all tabular-numeric, never wraps. Reads like a
    // restrained luxury price tag — no shouting pills.
    if (hasDiscount && shownOriginal != null) {
      const lineY = boxY + 72;

      // 1. Struck-through MSRP.
      doc.setFont("helvetica", "normal");
      doc.setFontSize(TYPE.bodySm.size);
      doc.setTextColor(...FALLBACK.muted);
      const msrpStr = fmtCOP(shownOriginal);
      doc.text(msrpStr, M, lineY);
      const msrpW = doc.getTextWidth(msrpStr);
      doc.setDrawColor(...FALLBACK.muted);
      doc.setLineWidth(0.55);
      doc.line(M, lineY - 3, M + msrpW, lineY - 3);

      // 2. Discount %.
      const gap = 12;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);   // emerald-700
      doc.setFontSize(TYPE.bodySm.size);
      const pctStr = `−${discountPct}%`;
      doc.text(pctStr, M + msrpW + gap, lineY);
      const pctW = doc.getTextWidth(pctStr);

      // 3. Savings amount.
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...FALLBACK.muted);
      doc.text(`ahorras ${fmtCOP(savings)}`, M + msrpW + gap + pctW + gap, lineY);
    }

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
  // Optional pre-discount MSRP. When > unitPriceCop the renderer strikes
  // through this value and shows a small "−X%" badge next to the final.
  originalPriceCop?: number | null;
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
    // For reencauche, modelo IS the banda code → always upper-case.
    doc.text(it.tipo === "reencauche" ? it.modelo.toUpperCase() : it.modelo, M, y);

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

    // ─── PRICE BLOCK — clean dark card, no pills ────────────────────────
    if (input.priceMode !== "none" && it.unitPriceCop && it.unitPriceCop > 0) {
      const unit = Math.round(it.unitPriceCop * ivaMul);
      const ivaLabel = input.priceMode === "con_iva" ? "IVA 19% incluido" : "No incluye IVA";

      const original = it.originalPriceCop ?? null;
      const hasDisc  = original != null && original > it.unitPriceCop;
      const origUnit = hasDisc ? Math.round(original! * ivaMul) : 0;
      const savings  = hasDisc ? origUnit - unit : 0;
      const discPct  = hasDisc ? Math.round(((original! - it.unitPriceCop) / original!) * 100) : 0;

      const boxH = hasDisc ? 86 : 64;
      const boxY = y;
      doc.setFillColor(...FALLBACK.ink);
      doc.roundedRect(M, boxY, pageW - 2 * M, boxH, 12, 12, "F");
      doc.setFillColor(...brand);
      doc.roundedRect(M, boxY, 8, boxH, 4, 4, "F");

      // Eyebrow — left.
      doc.setTextColor(200, 215, 240);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Precio", M + 22, boxY + 22);

      // IVA — right, same baseline as eyebrow.
      doc.text(ivaLabel, pageW - M - 18, boxY + 22, { align: "right" });

      // Big white final price.
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text(fmtCOP(unit), M + 22, boxY + 50);

      // Inline discount caption: ~~MSRP~~  −X%  ahorras $Y
      // All on the same baseline, beneath the big price.
      if (hasDisc) {
        const lineY = boxY + 70;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(170, 190, 220);
        const msrpStr = fmtCOP(origUnit);
        doc.text(msrpStr, M + 22, lineY);
        const msrpW = doc.getTextWidth(msrpStr);
        doc.setDrawColor(170, 190, 220);
        doc.setLineWidth(0.55);
        doc.line(M + 22, lineY - 3, M + 22 + msrpW, lineY - 3);

        const gap = 12;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(74, 222, 128);  // emerald-400 on dark
        const pctStr = `−${discPct}%`;
        doc.text(pctStr, M + 22 + msrpW + gap, lineY);
        const pctW = doc.getTextWidth(pctStr);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(170, 190, 220);
        doc.text(`ahorras ${fmtCOP(savings)}`, M + 22 + msrpW + gap + pctW + gap, lineY);
      }

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
  // ────────────────────────────────────────────────────────────────────────
  // Letter-size cotización built to match the Merquellantas reference:
  //   1. Hero header  (logo + name | COTIZACIÓN N.º COT-YYYY-MMDD + date)
  //   2. Brand accent bar over a navy hairline
  //   3. 3-column meta card (asesor / ciudad / forma de pago)
  //   4. Section header tab "DETALLE DE LA COTIZACIÓN"
  //   5. Items table — dark navy header row, product rows with thumb +
  //      brand + modelo + dimension + attribute pills + qty in a circle +
  //      strike MSRP / final / -X% chip + line subtotal
  //   6. Two-card pair below: "Tu ahorro" (light cream, brand left bar)
  //      next to a dark navy totals card with brand accent
  //   7. Contact card (asesor | teléfono | sitio web)
  //   8. Footer (company | date | POWERED BY TIREPRO)
  // Everything brand-colored is driven by input.companyColor so every
  // cotización feels like the company that issued it.
  // ────────────────────────────────────────────────────────────────────────

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = SPACE.M;

  const brand    = parseHex(input.companyColor) ?? FALLBACK.primary;
  const brandT08 = tint(brand, 0.08);
  const brandT15 = tint(brand, 0.18);
  void brandT08; void brandT15;
  // Brand-tinted cream for the "Tu ahorro" card. Softer than tint(0.08)
  // so it reads as a backdrop, not a chip.
  const cream: [number, number, number] = [
    Math.round(brand[0] * 0.06 + 255 * 0.94),
    Math.round(brand[1] * 0.06 + 255 * 0.94),
    Math.round(brand[2] * 0.06 + 255 * 0.94),
  ];

  const logoUrl = isDefaultPlaceholderLogo(input.companyLogoUrl) ? null : input.companyLogoUrl;
  const proxy   = input.fetchViaProxy;

  const [logoData, ...thumbDatas] = await Promise.all([
    loadImageAsDataUrl(logoUrl, proxy),
    ...input.items.map((it) => loadImageAsDataUrl(it.imageUrl, proxy)),
  ]);

  const ivaMul = input.priceMode === "con_iva" ? 1.19 : 1;
  const effectiveUnit = (unit: number | null) =>
    unit == null ? 0 : Math.round(unit * ivaMul);
  const lineTotal = (it: QuoteItem) =>
    effectiveUnit(it.unitPriceCop) * Math.max(1, it.quantity || 1);
  const lineMSRP = (it: QuoteItem) => {
    const o = it.originalPriceCop ?? null;
    if (o == null || o <= (it.unitPriceCop ?? 0)) return 0;
    return Math.round(o * ivaMul) * Math.max(1, it.quantity || 1);
  };

  // Cotización number — same shape as the reference: COT-YYYY-MMDD.
  const now = new Date();
  const cotNum = `COT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const todayLong = now.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  // ──────────────────────────────────────────────────────────────────────
  // 1. HERO HEADER
  // ──────────────────────────────────────────────────────────────────────
  const HEADER_TOP = 40;
  let y = HEADER_TOP;

  // Logo box (rounded square, light gray bg) — left.
  const LOGO_BOX = 56;
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(M, y, LOGO_BOX, LOGO_BOX, 28, 28, "F");
  if (logoData) {
    const { w, h } = await imageDims(logoData);
    const scale = Math.min((LOGO_BOX - 14) / w, (LOGO_BOX - 14) / h);
    const drawW = w * scale, drawH = h * scale;
    doc.addImage(
      logoData, detectFormat(logoData),
      M + (LOGO_BOX - drawW) / 2,
      y + (LOGO_BOX - drawH) / 2,
      drawW, drawH, undefined, "SLOW",
    );
  }

  // Company name — big, bold italic-style display weight.
  if (input.companyName) {
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(28);
    doc.text(input.companyName.toUpperCase(), M + LOGO_BOX + 16, y + 30);
    // Optional tagline subhead — small caps, muted.
    if (input.companyCity) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setCharSpace(TRACK.eyebrow);
      doc.setTextColor(...FALLBACK.muted);
      doc.text(`MARKETPLACE Y SERVICIOS DE LLANTAS`, M + LOGO_BOX + 16, y + 46);
      doc.setCharSpace(0);
    }
  }

  // Right side — COTIZACIÓN eyebrow / N.º / date. (No "Válida por X días".)
  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TYPE.eyebrow.size);
  doc.setCharSpace(TRACK.eyebrow);
  doc.text("COTIZACIÓN", pageW - M, y + 12, { align: "right" });
  doc.setCharSpace(0);
  doc.setTextColor(...FALLBACK.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`N.º ${cotNum}`, pageW - M, y + 28, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(todayLong, pageW - M, y + 42, { align: "right" });

  y += LOGO_BOX + 14;

  // Brand accent bar + thin navy hairline.
  doc.setFillColor(...brand);
  doc.rect(M, y, 110, 3, "F");
  doc.setDrawColor(...FALLBACK.ink);
  doc.setLineWidth(0.6);
  doc.line(M + 110, y + 1.5, pageW - M, y + 1.5);
  y += 18;

  // ──────────────────────────────────────────────────────────────────────
  // 2. META ROW — 3-column light gray card
  // ──────────────────────────────────────────────────────────────────────
  const META_H = 50;
  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(231, 234, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, pageW - 2 * M, META_H, 8, 8, "FD");

  const metaCol = (pageW - 2 * M) / 3;
  const metaCells: { eyebrow: string; value: string; valueColor?: [number, number, number] }[] = [
    { eyebrow: "ASESOR COMERCIAL", value: input.repName ?? input.companyName ?? "—" },
    { eyebrow: "CIUDAD",           value: input.companyCity ?? "—" },
    { eyebrow: "FORMA DE PAGO",    value: "A convenir", valueColor: brand },
  ];
  metaCells.forEach((cell, i) => {
    const cx = M + 14 + i * metaCol;
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text(cell.eyebrow, cx, y + 18);
    doc.setCharSpace(0);
    doc.setTextColor(...(cell.valueColor ?? FALLBACK.ink));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(cell.value, cx, y + 36);
  });
  y += META_H + 18;

  // ──────────────────────────────────────────────────────────────────────
  // 3. SECTION HEADER — brand tab + label
  // ──────────────────────────────────────────────────────────────────────
  doc.setFillColor(...brand);
  doc.rect(M, y - 9, 3, 14, "F");
  doc.setTextColor(...FALLBACK.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setCharSpace(TRACK.eyebrow);
  doc.text("DETALLE DE LA COTIZACIÓN", M + 12, y + 2);
  doc.setCharSpace(0);
  y += 14;

  // ──────────────────────────────────────────────────────────────────────
  // 4. ITEMS TABLE — dark header row + product rows
  // ──────────────────────────────────────────────────────────────────────
  const TABLE_W = pageW - 2 * M;
  const COL_QTY      = M + TABLE_W * 0.48;
  const COL_UNIT_R   = M + TABLE_W * 0.78;
  const COL_TOTAL_R  = pageW - M - 14;
  const isTotal = input.displayMode === "total";

  // Header row — dark navy, white text.
  const HEAD_H = 32;
  doc.setFillColor(...FALLBACK.ink);
  doc.roundedRect(M, y, TABLE_W, HEAD_H, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setCharSpace(TRACK.eyebrow);
  doc.text("PRODUCTO",        M + 14,        y + 20);
  doc.text("CANT.",           COL_QTY,       y + 20, { align: "center" });
  doc.text("VALOR UNITARIO",  COL_UNIT_R,    y + 20, { align: "right" });
  if (isTotal) doc.text("SUBTOTAL", COL_TOTAL_R, y + 20, { align: "right" });
  doc.setCharSpace(0);
  y += HEAD_H + 6;

  // Defaults — same as before.
  const fields: QuoteIncludeFields = input.includeFields ?? {
    categoria: true, terreno: true, ejeTirePro: true,
  };

  // Build attribute pills (Nueva / Tracción / Carga 152/148 / Reencauchable).
  const buildPills = (it: QuoteItem): string[] => {
    const pills: string[] = [];
    if (fields.tipo            && it.tipo)            pills.push(it.tipo === "nueva" ? "Nueva" : it.tipo === "reencauche" ? "Reencauche" : it.tipo);
    if (fields.categoria       && it.categoria && it.categoria !== it.tipo) pills.push(it.categoria);
    if (fields.terreno         && it.terreno)         pills.push(it.terreno);
    if (fields.ejeTirePro      && it.ejeTirePro)      pills.push(it.ejeTirePro.charAt(0).toUpperCase() + it.ejeTirePro.slice(1));
    if (fields.indiceCarga     && it.indiceCarga)     pills.push(`Carga ${it.indiceCarga}`);
    if (fields.indiceVelocidad && it.indiceVelocidad) pills.push(`Vel. ${it.indiceVelocidad}`);
    if (fields.rtdMm           && it.rtdMm != null)   pills.push(`${it.rtdMm} mm`);
    if (fields.psiRecomendado  && it.psiRecomendado != null) pills.push(`${it.psiRecomendado} PSI`);
    if (fields.cinturones      && it.cinturones)      pills.push(`Cint. ${it.cinturones}`);
    if (fields.pr              && it.pr)              pills.push(`${it.pr} PR`);
    if (fields.tipoBanda       && it.tipoBanda)       pills.push(`Banda ${it.tipoBanda.toUpperCase()}`);
    if (fields.reencauchable   && it.reencauchable)   pills.push("Reencauchable");
    if (fields.construccion    && it.construccion)    pills.push(it.construccion);
    if (fields.segmento        && it.segmento)        pills.push(it.segmento);
    return pills;
  };

  // Render the pill row, return the y where the row ended.
  const drawPills = (pills: string[], pillX: number, pillY: number, maxW: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    let cx = pillX, cy = pillY;
    const PH = 14, PAD_X = 7, GAP = 5;
    for (const p of pills) {
      const w = doc.getTextWidth(p) + PAD_X * 2;
      if (cx - pillX + w > maxW) { cx = pillX; cy += PH + 4; }
      // First "Nueva"/"Reencauche" pill takes the brand color so the
      // category jumps; the rest are neutral outlined chips.
      const isFirst = p === pills[0];
      if (isFirst) {
        doc.setFillColor(...brand);
        doc.roundedRect(cx, cy, w, PH, 7, 7, "F");
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(225, 230, 238);
        doc.setLineWidth(0.5);
        doc.roundedRect(cx, cy, w, PH, 7, 7, "FD");
        doc.setTextColor(...FALLBACK.ink);
      }
      doc.text(p, cx + w / 2, cy + 9.5, { align: "center" });
      cx += w + GAP;
    }
    return cy + PH;
  };

  // ─── Product rows ───────────────────────────────────────────────────────
  for (let i = 0; i < input.items.length; i++) {
    const it    = input.items[i];
    const thumb = thumbDatas[i];
    const pills = buildPills(it);

    // Estimate row height: identity (54pt) + pills (1 or 2 rows).
    const textX  = M + 14 + 64 + 14;
    const pillsMaxW = COL_QTY - textX - 20;
    // Quick measure to know if pills wrap.
    let pillsRows = 1;
    {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      let cx = 0;
      for (const p of pills) {
        const w = doc.getTextWidth(p) + 14;
        if (cx + w > pillsMaxW) { pillsRows++; cx = 0; }
        cx += w + 5;
      }
    }
    const rowH = Math.max(76, 50 + pillsRows * 18);

    if (y + rowH > pageH - 240) {
      drawFooter(doc, pageW, pageH, M, brand, input.companyName);
      doc.addPage();
      y = HEADER_TOP;
    }

    // Subtle row separator only — no fills, keeps the table elegant.
    if (i > 0) {
      doc.setDrawColor(...FALLBACK.line);
      doc.setLineWidth(0.4);
      doc.line(M + 14, y - 4, pageW - M - 14, y - 4);
    }

    // Thumb — light gray rounded square.
    const thumbW = 64, thumbH = 64;
    const thumbY = y + 6;
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(M + 14, thumbY, thumbW, thumbH, 8, 8, "F");
    if (thumb) {
      const { w, h } = await imageDims(thumb);
      const scale = Math.min((thumbW - 8) / w, (thumbH - 8) / h);
      const drawW = w * scale, drawH = h * scale;
      doc.addImage(
        thumb, detectFormat(thumb),
        M + 14 + (thumbW - drawW) / 2,
        thumbY + (thumbH - drawH) / 2,
        drawW, drawH, undefined, "MEDIUM",
      );
    }

    // Identity column.
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text(it.marca.toUpperCase(), textX, y + 14);
    doc.setCharSpace(0);
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(it.tipo === "reencauche" ? it.modelo.toUpperCase() : it.modelo, textX, y + 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brand);
    doc.text(it.dimension, textX, y + 44);

    // Pills row(s).
    if (pills.length > 0) drawPills(pills, textX, y + 50, pillsMaxW);

    // Quantity — circle outline with number inside.
    const qtyCY = y + rowH / 2;
    doc.setDrawColor(...FALLBACK.ink);
    doc.setLineWidth(1);
    doc.circle(COL_QTY, qtyCY, 14, "S");
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(String(it.quantity), COL_QTY, qtyCY + 4, { align: "center" });

    // Valor unitario column — strike MSRP / final / -X% chip stacked.
    const moneyY = qtyCY;
    if (input.priceMode === "none" || it.unitPriceCop == null || it.unitPriceCop <= 0) {
      doc.setTextColor(...FALLBACK.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("—", COL_UNIT_R, moneyY + 4, { align: "right" });
      if (isTotal) doc.text("—", COL_TOTAL_R, moneyY + 4, { align: "right" });
    } else {
      const unit     = effectiveUnit(it.unitPriceCop);
      const original = it.originalPriceCop ?? null;
      const hasDisc  = original != null && original > it.unitPriceCop;

      if (hasDisc) {
        const origUnit = effectiveUnit(original!);
        const discPct  = Math.round(((original! - it.unitPriceCop) / original!) * 100);
        // 1. Strike-through MSRP, smaller, muted, on top.
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...FALLBACK.muted);
        const msrpStr = fmtCOP(origUnit);
        doc.text(msrpStr, COL_UNIT_R, moneyY - 8, { align: "right" });
        const msrpW = doc.getTextWidth(msrpStr);
        doc.setDrawColor(...FALLBACK.muted);
        doc.setLineWidth(0.55);
        doc.line(COL_UNIT_R - msrpW, moneyY - 11, COL_UNIT_R, moneyY - 11);
        // 2. Final price — bold, larger.
        doc.setTextColor(...FALLBACK.ink);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(fmtCOP(unit), COL_UNIT_R, moneyY + 6, { align: "right" });
        // 3. Emerald "-X%" chip below the final price.
        const pct = `−${discPct}%`;
        doc.setFontSize(7.5);
        const pillW = doc.getTextWidth(pct) + 12;
        const pillH = 12;
        const pillX = COL_UNIT_R - pillW;
        const pillY = moneyY + 10;
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(pillX, pillY, pillW, pillH, 6, 6, "F");
        doc.setTextColor(21, 128, 61);
        doc.setFont("helvetica", "bold");
        doc.text(pct, pillX + pillW / 2, pillY + 8.5, { align: "center" });
      } else {
        // No discount — just the unit price.
        doc.setTextColor(...FALLBACK.ink);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(fmtCOP(unit), COL_UNIT_R, moneyY + 4, { align: "right" });
      }

      // Subtotal column — line total in brand color.
      if (isTotal) {
        doc.setTextColor(...brand);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(fmtCOP(lineTotal(it)), COL_TOTAL_R, moneyY + 4, { align: "right" });
      }
    }

    y += rowH;
  }

  y += 14;

  // ──────────────────────────────────────────────────────────────────────
  // 5. AHORRO + TOTALS — twin cards
  // ──────────────────────────────────────────────────────────────────────
  if (isTotal && input.priceMode !== "none") {
    const subtotal = input.items.reduce((s, it) => s + lineTotal(it), 0);
    const msrpSum  = input.items.reduce((s, it) => s + lineMSRP(it), 0);
    const savings  = msrpSum > 0 ? msrpSum - subtotal : 0;
    const grandPct = msrpSum > 0 ? Math.round((savings / msrpSum) * 100) : 0;

    const need = 130;
    if (y + need > pageH - 100) {
      drawFooter(doc, pageW, pageH, M, brand, input.companyName);
      doc.addPage();
      y = HEADER_TOP;
    }

    const cardW = (pageW - 2 * M - 14) / 2;
    const cardH = 110;

    // ── LEFT — TU AHORRO (only renders if there's an actual saving) ────
    if (savings > 0) {
      // Cream bg + brand-color left bar.
      doc.setFillColor(...cream);
      doc.roundedRect(M, y, cardW, cardH, 10, 10, "F");
      doc.setFillColor(...brand);
      doc.rect(M, y + 6, 5, cardH - 12, "F");

      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setCharSpace(TRACK.eyebrow);
      doc.text("TU AHORRO EN ESTA COTIZACIÓN", M + 18, y + 28);
      doc.setCharSpace(0);

      doc.setTextColor(...FALLBACK.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text(fmtCOP(savings), M + 18, y + 60);

      doc.setTextColor(...FALLBACK.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const totalUnits = input.items.reduce((s, it) => s + Math.max(1, it.quantity || 1), 0);
      const caption = `Descuento del ${grandPct}% aplicado al precio de lista por compra de ${totalUnits} unidad${totalUnits !== 1 ? "es" : ""}.`;
      const lines = doc.splitTextToSize(caption, cardW - 28).slice(0, 2);
      let cy = y + 78;
      for (const ln of lines) { doc.text(ln, M + 18, cy); cy += 12; }
    } else {
      // No savings → render an info card on the left so the layout doesn't
      // collapse asymmetrically.
      doc.setFillColor(248, 249, 251);
      doc.roundedRect(M, y, cardW, cardH, 10, 10, "F");
      doc.setTextColor(...FALLBACK.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setCharSpace(TRACK.eyebrow);
      doc.text("RESUMEN DE LA COTIZACIÓN", M + 18, y + 28);
      doc.setCharSpace(0);
      doc.setTextColor(...FALLBACK.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${input.items.length} referencia${input.items.length !== 1 ? "s" : ""} cotizada${input.items.length !== 1 ? "s" : ""}.`, M + 18, y + 50);
      doc.text(`Precios válidos sujetos a confirmación con el asesor.`, M + 18, y + 66);
    }

    // ── RIGHT — TOTALS card (dark navy with brand corner accent) ───────
    const rightX = M + cardW + 14;
    doc.setFillColor(...FALLBACK.ink);
    doc.roundedRect(rightX, y, cardW, cardH, 10, 10, "F");
    // Brand accent — top-right corner stripe.
    doc.setFillColor(...brand);
    doc.rect(rightX + cardW - 70, y, 70, 4, "F");

    doc.setTextColor(200, 215, 240);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Subtotal", rightX + 18, y + 28);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(fmtCOP(subtotal), rightX + cardW - 18, y + 28, { align: "right" });

    if (savings > 0) {
      doc.setTextColor(200, 215, 240);
      doc.setFont("helvetica", "normal");
      doc.text("Descuento aplicado", rightX + 18, y + 46);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`−${fmtCOP(savings)}`, rightX + cardW - 18, y + 46, { align: "right" });
    }

    // Divider above TOTAL.
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.line(rightX + 18, y + 60, rightX + cardW - 18, y + 60);

    // TOTAL row.
    doc.setTextColor(200, 215, 240);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text("TOTAL", rightX + 18, y + 84);
    doc.setCharSpace(0);
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(fmtCOP(subtotal), rightX + cardW - 18, y + 88, { align: "right" });

    doc.setTextColor(170, 190, 220);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      input.priceMode === "con_iva" ? "IVA 19% incluido" : "No incluye IVA",
      rightX + cardW - 18, y + cardH - 8, { align: "right" },
    );

    y += cardH + 18;
  } else if (input.priceMode !== "none") {
    const note = input.priceMode === "con_iva"
      ? "Precios por unidad, IVA 19% incluido"
      : "Precios por unidad, no incluyen IVA";
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...FALLBACK.muted);
    doc.text(note, M, y + 6);
    y += 18;
  }

  // ──────────────────────────────────────────────────────────────────────
  // 6. CONTACT card — 3 cols asesor / teléfono / sitio web
  // ──────────────────────────────────────────────────────────────────────
  const hasRep      = !!(input.repName || input.repPhone);
  const hasSiteCity = !!(input.companyWebsite || input.companyCity);
  if (hasRep || hasSiteCity) {
    const contactNeed = 80;
    if (y + contactNeed > pageH - 60) {
      drawFooter(doc, pageW, pageH, M, brand, input.companyName);
      doc.addPage();
      y = HEADER_TOP;
    }
    const CONTACT_H = 64;
    doc.setFillColor(248, 249, 251);
    doc.setDrawColor(231, 234, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, pageW - 2 * M, CONTACT_H, 8, 8, "FD");

    const contactCol = (pageW - 2 * M) / 3;
    const contactCells: { eyebrow: string; line1: string; line2?: string; line1Color?: [number, number, number] }[] = [
      {
        eyebrow: "ASESOR",
        line1: input.repName ?? input.companyName ?? "—",
        line2: "Asesor Comercial",
      },
      {
        eyebrow: "TELÉFONO",
        line1: input.repPhone ?? "—",
        line2: "Lun a Vie · 8:00 a 18:00",
      },
      {
        eyebrow: "SITIO WEB",
        line1: input.companyWebsite
          ? input.companyWebsite.replace(/^https?:\/\//i, "").replace(/\/$/, "")
          : "—",
        line2: "Cotización en línea",
        line1Color: brand,
      },
    ];
    contactCells.forEach((cell, i) => {
      const cx = M + 14 + i * contactCol;
      doc.setTextColor(...FALLBACK.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setCharSpace(TRACK.eyebrow);
      doc.text(cell.eyebrow, cx, y + 18);
      doc.setCharSpace(0);
      doc.setTextColor(...(cell.line1Color ?? FALLBACK.ink));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(cell.line1, cx, y + 36);
      if (cell.line2) {
        doc.setTextColor(...FALLBACK.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(cell.line2, cx, y + 50);
      }
    });
    y += CONTACT_H + 12;
  }

  drawFooter(doc, pageW, pageH, M, brand, input.companyName);

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
