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
  // Single-page ficha técnica. See drawFichaPage for the actual layout —
  // both this function and buildComparativePdf (multi-tire) reuse that
  // helper so the design stays in sync.
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await drawFichaPage(doc, input);
  return doc.output("blob");
}

// =============================================================================
// drawFichaPage — single-tire ficha técnica layout, drawn onto an existing
// `doc`. Shared by buildCatalogPdf (one item) and buildComparativePdf
// (multiple items, separated by addPage). Each call paints the full page.
//
// Layout (top → bottom):
//   1. Header: rounded logo box + company name (display caps) + tagline |
//      FICHA TÉCNICA eyebrow + tipo (brand color) + actualizada short date.
//   2. Brand-color accent bar over a thin navy hairline.
//   3. Hero card (cream bg, brand left bar): two-column with identity
//      (brand pill, modelo, dimension, tipo/eje pills, 3 stat cards) on
//      the left + tire image with floating "EJE X" pill on the right.
//   4. Two-column section: ACERCA DE LA MARCA + ESPECIFICACIONES TÉCNICAS.
//   5. Full-width dark price card (PRECIO PÚBLICO).
//   6. 3-column contact card.
//   7. Footer.
//
// Brand color drives every accent so the document feels like the company
// that issued it.
// =============================================================================
async function drawFichaPage(doc: jsPDF, input: PdfInput): Promise<void> {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = SPACE.M;

  const brand = parseHex(input.companyColor) ?? FALLBACK.primary;
  // Cream backdrop — brand-tinted at ~6% so it reads as the company's color
  // without being chip-loud.
  const cream: [number, number, number] = [
    Math.round(brand[0] * 0.06 + 255 * 0.94),
    Math.round(brand[1] * 0.06 + 255 * 0.94),
    Math.round(brand[2] * 0.06 + 255 * 0.94),
  ];

  const logoUrl = isDefaultPlaceholderLogo(input.companyLogoUrl) ? null : input.companyLogoUrl;
  const proxy = input.fetchViaProxy;

  // Pre-load company logo + the first tire image only (this layout uses
  // a single hero shot — no thumbnail strip).
  const [logoData, ...tireImgs] = await Promise.all([
    loadImageAsDataUrl(logoUrl, proxy),
    ...input.imageUrls.slice(0, 1).map((u) => loadImageAsDataUrl(u, proxy)),
  ]);
  const tireImg = tireImgs[0] ?? null;

  const isReencauche = input.tipo === "reencauche";
  const tipoLabel = isReencauche ? "Reencauche" : "Llanta Nueva";
  const fichaDateShort = new Date().toLocaleDateString("es-CO", {
    day: "numeric", month: "short", year: "numeric",
  });

  // ─────────────────────────────────────────────────────────────────────
  // 1. HEADER
  // ─────────────────────────────────────────────────────────────────────
  let y = 40;
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
  if (input.companyName) {
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(28);
    doc.text(input.companyName.toUpperCase(), M + LOGO_BOX + 16, y + 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setCharSpace(TRACK.eyebrow);
    doc.setTextColor(...FALLBACK.muted);
    doc.text("LLANTAS PARA TODO TIPO DE VEHÍCULO", M + LOGO_BOX + 16, y + 46);
    doc.setCharSpace(0);
  }

  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TYPE.eyebrow.size);
  doc.setCharSpace(TRACK.eyebrow);
  doc.text("FICHA TÉCNICA", pageW - M, y + 12, { align: "right" });
  doc.setCharSpace(0);
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(tipoLabel, pageW - M, y + 30, { align: "right" });
  doc.setTextColor(...FALLBACK.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Actualizada: ${fichaDateShort}`, pageW - M, y + 44, { align: "right" });

  y += LOGO_BOX + 14;

  // Brand bar + thin navy hairline.
  doc.setFillColor(...brand);
  doc.rect(M, y, 110, 3, "F");
  doc.setDrawColor(...FALLBACK.ink);
  doc.setLineWidth(0.6);
  doc.line(M + 110, y + 1.5, pageW - M, y + 1.5);
  y += 18;

  // ─────────────────────────────────────────────────────────────────────
  // 2. HERO CARD
  // ─────────────────────────────────────────────────────────────────────
  const HERO_H = 220;
  doc.setFillColor(...cream);
  doc.roundedRect(M, y, pageW - 2 * M, HERO_H, 12, 12, "F");
  doc.setFillColor(...brand);
  doc.rect(M, y + 14, 5, HERO_H - 28, "F");

  const heroLeftX = M + 16;
  const heroRightX = pageW / 2 + 12;
  const heroRightW = pageW - M - heroRightX;

  // ─ Brand pill (solid brand color) + country
  const brandPillText = input.marca.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const brandPillW = doc.getTextWidth(brandPillText) + 16;
  const brandPillH = 18;
  doc.setFillColor(...brand);
  doc.roundedRect(heroLeftX, y + 18, brandPillW, brandPillH, 4, 4, "F");
  doc.setTextColor(...readableTextOn(brand));
  doc.text(brandPillText, heroLeftX + brandPillW / 2, y + 30.5, { align: "center" });
  if (input.brand?.country) {
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`· ${input.brand.country}`, heroLeftX + brandPillW + 6, y + 31);
  }

  // ─ Modelo (force-uppercase for reencauche) + dimension
  doc.setTextColor(...FALLBACK.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  // Modelo upper-case rule:
  //   1. Reencauche modelos ARE the banda code (D801, VRL1, etc.).
  //   2. Code-style nueva modelos (no spaces, all alphanumeric) are also
  //      banda/SKU codes that look wrong lower-cased ("d801" → "D801")
  //      while real model names with spaces ("Energy Saver", "Primacy 4")
  //      stay sentence case.
  const looksLikeBandaCode = /^[A-Za-z0-9+]+$/.test(input.modelo) && !input.modelo.includes(" ");
  const heroModelo = (isReencauche || looksLikeBandaCode)
    ? input.modelo.toUpperCase()
    : input.modelo;
  doc.text(heroModelo, heroLeftX, y + 72);
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.dimension, heroLeftX, y + 92);

  // ─ Identity pills row: tipo, eje, reencauchable
  const heroPills: string[] = [tipoLabel];
  if (input.ejeTirePro) heroPills.push(input.ejeTirePro.charAt(0).toUpperCase() + input.ejeTirePro.slice(1));
  if (input.reencauchable) heroPills.push("Reencauchable");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  let pillX = heroLeftX, pillY = y + 108;
  const HP_H = 22, HP_PAD = 10, HP_GAP = 6;
  for (let i = 0; i < heroPills.length; i++) {
    const p = heroPills[i];
    const w = doc.getTextWidth(p) + HP_PAD * 2;
    if (i === 0) {
      doc.setFillColor(...FALLBACK.ink);
      doc.roundedRect(pillX, pillY, w, HP_H, 11, 11, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(225, 230, 238);
      doc.setLineWidth(0.5);
      doc.roundedRect(pillX, pillY, w, HP_H, 11, 11, "FD");
      doc.setTextColor(...FALLBACK.ink);
    }
    doc.text(p, pillX + w / 2, pillY + 14.5, { align: "center" });
    pillX += w + HP_GAP;
  }

  // ─ 3 mini stat cards (CARGA / PROFUNDIDAD / PRESIÓN)
  const findRow = (...keywords: string[]): string | null => {
    for (const r of input.rows) {
      const lab = r.label.toLowerCase();
      if (keywords.some((k) => lab.includes(k))) return r.value;
    }
    return null;
  };
  const stats: { label: string; value: string }[] = [];
  const cargaVal = findRow("carga");
  const profVal  = findRow("prof");
  const presVal  = findRow("presión", "psi");
  if (cargaVal) stats.push({ label: "CARGA",        value: cargaVal });
  if (profVal)  stats.push({ label: "PROFUNDIDAD",  value: profVal });
  if (presVal)  stats.push({ label: "PRESIÓN",      value: presVal });

  const STAT_W = 92, STAT_H = 44, STAT_GAP = 8;
  let statsX = heroLeftX;
  const statsY = y + 144;
  for (const stat of stats) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...FALLBACK.line);
    doc.setLineWidth(0.5);
    doc.roundedRect(statsX, statsY, STAT_W, STAT_H, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setCharSpace(TRACK.eyebrow);
    doc.setTextColor(...FALLBACK.muted);
    doc.text(stat.label, statsX + 8, statsY + 14);
    doc.setCharSpace(0);
    // Split "12 mm" into number + unit so the unit reads small / muted.
    const m = stat.value.match(/^(\S+)\s+(.+)$/);
    if (m) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...FALLBACK.ink);
      doc.text(m[1], statsX + 8, statsY + 32);
      const numW = doc.getTextWidth(m[1]);
      doc.setFontSize(9);
      doc.setTextColor(...FALLBACK.muted);
      doc.text(m[2], statsX + 8 + numW + 4, statsY + 32);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...FALLBACK.ink);
      doc.text(stat.value, statsX + 8, statsY + 32);
    }
    statsX += STAT_W + STAT_GAP;
  }

  // ─ Right side: tire image inside a white rounded card
  const heroImgX = heroRightX + 8;
  const heroImgY = y + 22;
  const heroImgW = heroRightW - 16;
  const heroImgH = HERO_H - 44;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(heroImgX, heroImgY, heroImgW, heroImgH, 12, 12, "F");
  if (tireImg) {
    const { w, h } = await imageDims(tireImg);
    const scale = Math.min((heroImgW - 32) / w, (heroImgH - 32) / h);
    const drawW = w * scale, drawH = h * scale;
    doc.addImage(
      tireImg, detectFormat(tireImg),
      heroImgX + (heroImgW - drawW) / 2,
      heroImgY + (heroImgH - drawH) / 2,
      drawW, drawH, undefined, "MEDIUM",
    );
  }
  // EJE pill — top-right of the tire card. No charSpace tracking here so
  // the pill width measurement matches the rendered width (charSpace
  // adds horizontal pixels jsPDF's getTextWidth() doesn't account for,
  // which is why the pill was getting clipped).
  if (input.ejeTirePro) {
    const ejeText = `EJE ${input.ejeTirePro.toUpperCase()}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const ejePillW = doc.getTextWidth(ejeText) + 18;
    const ejePillH = 18;
    const ejePillX = heroImgX + heroImgW - 14 - ejePillW;
    const ejePillY = heroImgY + 14;
    doc.setFillColor(...FALLBACK.ink);
    doc.roundedRect(ejePillX, ejePillY, ejePillW, ejePillH, 9, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(ejeText, ejePillX + ejePillW / 2, ejePillY + 12, { align: "center" });
  }

  y += HERO_H + 18;

  // ─────────────────────────────────────────────────────────────────────
  // 3. TWO-COLUMN: ABOUT THE BRAND  +  TECHNICAL SPECS
  // ─────────────────────────────────────────────────────────────────────
  const colW = (pageW - 2 * M - 16) / 2;
  const leftColX = M;
  const rightColX = M + colW + 16;

  // Brand facts (left card). Each fact has a label + value. Long values
  // (long company HQ addresses, long parent-company names) are NOT
  // right-aligned here because they would crash into the label — they
  // wrap onto a second line below. We also drop the unicode icon glyphs
  // entirely (jsPDF's default helvetica doesn't include ⌂ ★ ▣ ↗ etc.,
  // which is why they rendered as garbage like `"a` in the previous PDF).
  // A simple brand-color disc is plenty visually.
  const b = input.brand;
  const facts: { label: string; value: string }[] = [];
  if (b?.country) {
    const v = b.headquarters && b.headquarters !== b.country
      ? `${b.country} · ${b.headquarters}`
      : b.country;
    facts.push({ label: "Origen", value: v });
  }
  if (b?.foundedYear) facts.push({ label: "Fundada",     value: String(b.foundedYear) });
  if (b?.tier && TIER_LABEL[b.tier]) facts.push({ label: "Segmento", value: TIER_LABEL[b.tier] });
  if (b?.parentCompany) facts.push({ label: "Casa matriz", value: b.parentCompany });
  if (b?.website) {
    const host = b.website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    facts.push({ label: "Sitio web", value: host });
  }

  // Banda values force-upper-case across rows (rule shared with old layout).
  const upperBandaRows = input.rows.map((r) =>
    r.label.toLowerCase().includes("banda")
      ? { label: r.label, value: r.value.toUpperCase() }
      : r,
  );

  const ABOUT_PAD = 16;
  const FACT_H_BASE = 22;
  // Pre-measure each fact's value width so we can decide whether it fits
  // on the same row as the label, or needs to wrap onto its own line.
  // Set the font upfront so getTextWidth measures with the right metrics.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const factHeights = facts.map((f) => {
    const labelW = (() => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      return doc.getTextWidth(f.label);
    })();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const valueW = doc.getTextWidth(f.value);
    const inline = labelW + valueW + 12 + 22; // 22 = icon disc + gap, 12 = gap
    const colInner = colW - ABOUT_PAD * 2;
    return inline <= colInner ? FACT_H_BASE : FACT_H_BASE + 12; // wrap row
  });
  const factsBlockH = facts.length > 0
    ? 8 + factHeights.reduce((a, b) => a + b, 0)
    : 0;

  const aboutBaseH = ABOUT_PAD * 2
    + (b?.name ? 24 : 0)
    + (b?.tagline ? 18 : 0)
    + (b?.description ? 38 : 0)
    + factsBlockH;

  const SPEC_ROW_H = 32;
  const specsBaseH = ABOUT_PAD + upperBandaRows.length * SPEC_ROW_H + ABOUT_PAD;
  const cardH = Math.max(aboutBaseH, specsBaseH, 200);

  // Page-break safety — runs BEFORE drawing section headers so the
  // headers + cards never get split across pages. Earlier the headers
  // were drawn first, then if the cards didn't fit we'd page-break the
  // CARDS leaving the headers stranded with empty space underneath.
  const SECTION_HEADER_H = 14;
  const PRICE_H_RESERVE = 90;
  const CONTACT_H_RESERVE = 80;
  if (y + SECTION_HEADER_H + cardH + PRICE_H_RESERVE + CONTACT_H_RESERVE > pageH - 60) {
    drawCatalogFooter(doc, pageW, pageH, M, brand, input.companyName);
    doc.addPage();
    y = 60;
  }

  // Section header tabs (brand-color tab + caps title) — drawn AFTER the
  // page-break decision so they always sit immediately above their cards.
  const drawColHeader = (title: string, x: number, ty: number) => {
    doc.setFillColor(...brand);
    doc.rect(x, ty - 9, 3, 14, "F");
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text(title, x + 12, ty + 2);
    doc.setCharSpace(0);
  };
  drawColHeader("ACERCA DE LA MARCA", leftColX, y);
  drawColHeader("ESPECIFICACIONES TÉCNICAS", rightColX, y);
  y += 14;

  // ─ LEFT: ABOUT card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.5);
  doc.roundedRect(leftColX, y, colW, cardH, 10, 10, "FD");
  let by = y + ABOUT_PAD;
  if (b?.name) {
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(b.name, leftColX + ABOUT_PAD, by + 12);
    by += 22;
  }
  if (b?.tagline) {
    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(b.tagline, leftColX + ABOUT_PAD, by);
    by += 16;
  }
  if (b?.description) {
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const descLines = (doc.splitTextToSize(b.description, colW - ABOUT_PAD * 2) as string[]).slice(0, 3);
    for (const ln of descLines) {
      doc.text(ln, leftColX + ABOUT_PAD, by);
      by += 12;
    }
    by += 6;
  }
  if (facts.length > 0) {
    doc.setDrawColor(...FALLBACK.line);
    doc.setLineWidth(0.4);
    doc.line(leftColX + ABOUT_PAD, by, leftColX + colW - ABOUT_PAD, by);
    by += 10;
    facts.forEach((f, i) => {
      const wrapped = factHeights[i] !== FACT_H_BASE;
      // Brand-color disc — no glyph inside (the previous unicode icons
      // didn't render in jsPDF's default font, looked like "a/&/$/etc.).
      doc.setFillColor(...brand);
      doc.circle(leftColX + ABOUT_PAD + 4, by + 6, 3, "F");
      // Label
      doc.setTextColor(...FALLBACK.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(f.label, leftColX + ABOUT_PAD + 14, by + 9);
      // Value — right-aligned on the same line if it fits, else wrapped
      // onto its own line below the label so long Origen / parent-company
      // strings can't crash into the label.
      doc.setTextColor(...FALLBACK.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      if (!wrapped) {
        doc.text(f.value, leftColX + colW - ABOUT_PAD, by + 9, { align: "right" });
      } else {
        // Wrap to fit; show up to 2 lines so the card height stays sane.
        const wrapW = colW - ABOUT_PAD * 2 - 14;
        const lines = (doc.splitTextToSize(f.value, wrapW) as string[]).slice(0, 2);
        let ly = by + 9 + 12;
        for (const ln of lines) {
          doc.text(ln, leftColX + ABOUT_PAD + 14, ly);
          ly += 11;
        }
      }
      by += factHeights[i];
    });
  }

  // ─ RIGHT: SPECS card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...FALLBACK.line);
  doc.setLineWidth(0.5);
  doc.roundedRect(rightColX, y, colW, cardH, 10, 10, "FD");
  let sy = y + ABOUT_PAD;
  for (let i = 0; i < upperBandaRows.length; i++) {
    const s = upperBandaRows[i];
    // Icon square — solid brand color, no glyph (same reason the brand
    // facts dropped their unicode glyphs above: jsPDF's default font
    // doesn't carry the symbols, they came through as garbage).
    doc.setFillColor(...brand);
    doc.roundedRect(rightColX + ABOUT_PAD, sy + 1, 4, 16, 2, 2, "F");
    // Label
    doc.setTextColor(...FALLBACK.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(s.label, rightColX + ABOUT_PAD + 14, sy + 12);
    // Value — green pill for "SÍ" reencauchabilidad, otherwise bold + unit muted
    const isReencauchSi = s.label.toLowerCase().includes("reencauch") && /^s[ií]$/i.test(s.value.trim());
    if (isReencauchSi) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const pw = doc.getTextWidth(s.value) + 14;
      const ph = 14;
      const px = rightColX + colW - ABOUT_PAD - pw;
      const py = sy + 1;
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(px, py, pw, ph, 7, 7, "F");
      doc.setTextColor(21, 128, 61);
      doc.text(s.value, px + pw / 2, py + 10, { align: "center" });
    } else {
      const m = s.value.match(/^(.+?)\s+(mm|psi|kg|cm|km|PSI|MM)$/i);
      if (m) {
        const num = m[1], unit = m[2];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...FALLBACK.muted);
        doc.text(unit, rightColX + colW - ABOUT_PAD, sy + 12, { align: "right" });
        const unitW = doc.getTextWidth(unit);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...FALLBACK.ink);
        doc.text(num, rightColX + colW - ABOUT_PAD - unitW - 4, sy + 12, { align: "right" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...FALLBACK.ink);
        doc.text(s.value, rightColX + colW - ABOUT_PAD, sy + 12, { align: "right" });
      }
    }
    // Separator hairline (not after last row)
    if (i < upperBandaRows.length - 1) {
      doc.setDrawColor(...FALLBACK.line);
      doc.setLineWidth(0.3);
      doc.line(rightColX + ABOUT_PAD, sy + 24, rightColX + colW - ABOUT_PAD, sy + 24);
    }
    sy += SPEC_ROW_H;
  }

  y += cardH + 18;

  // ─────────────────────────────────────────────────────────────────────
  // 4. PRICE CARD (full-width dark)
  // ─────────────────────────────────────────────────────────────────────
  if (input.priceMode !== "none" && input.priceCop && input.priceCop > 0) {
    const base = input.priceCop;
    const withIva = Math.round(base * 1.19);
    const shown = input.priceMode === "con_iva" ? withIva : base;
    const ivaLabel = input.priceMode === "con_iva"
      ? "IVA 19% incluido · Precio por unidad"
      : "Precio por unidad · No incluye IVA";

    const PRICE_H = 70;
    if (y + PRICE_H + 90 > pageH - 60) {
      drawCatalogFooter(doc, pageW, pageH, M, brand, input.companyName);
      doc.addPage();
      y = 60;
    }
    doc.setFillColor(...FALLBACK.ink);
    doc.roundedRect(M, y, pageW - 2 * M, PRICE_H, 10, 10, "F");
    doc.setFillColor(...brand);
    doc.rect(M + 8, y, 100, 3, "F");

    doc.setTextColor(200, 215, 240);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setCharSpace(TRACK.eyebrow);
    doc.text("PRECIO PÚBLICO", M + 18, y + 24);
    doc.setCharSpace(0);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const productLine = `${input.marca.toUpperCase()} ${heroModelo} · ${input.dimension}`;
    doc.text(productLine, M + 18, y + 44);

    doc.setTextColor(...brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(fmtCOP(shown), pageW - M - 18, y + 38, { align: "right" });
    doc.setTextColor(170, 190, 220);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(ivaLabel, pageW - M - 18, y + 56, { align: "right" });

    y += PRICE_H + 18;
  }

  // ─────────────────────────────────────────────────────────────────────
  // 5. CONTACT card (3 cols)
  // ─────────────────────────────────────────────────────────────────────
  const hasRep = !!(input.repName || input.repPhone);
  const hasSiteCity = !!(input.companyWebsite || input.companyCity);
  if (hasRep || hasSiteCity) {
    const CONTACT_H = 64;
    if (y + CONTACT_H + 60 > pageH) {
      drawCatalogFooter(doc, pageW, pageH, M, brand, input.companyName);
      doc.addPage();
      y = 60;
    }
    doc.setFillColor(248, 249, 251);
    doc.setDrawColor(231, 234, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, pageW - 2 * M, CONTACT_H, 8, 8, "FD");

    const cells: { eyebrow: string; line1: string; line2?: string; line1Color?: [number, number, number] }[] = [
      {
        eyebrow: "ASESOR",
        line1: input.repName ?? input.companyName ?? "—",
        line2: "Asesor Comercial",
      },
      {
        eyebrow: "TELÉFONO",
        line1: input.repPhone ?? "—",
        line2: input.companyCity ?? undefined,
      },
      {
        eyebrow: "SITIO WEB",
        line1: input.companyWebsite
          ? input.companyWebsite.replace(/^https?:\/\//i, "").replace(/\/$/, "")
          : "—",
        line2: "Catálogo en línea",
        line1Color: brand,
      },
    ];
    const colWidth = (pageW - 2 * M) / 3;
    cells.forEach((cell, i) => {
      const cx = M + 14 + i * colWidth;
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

  drawCatalogFooter(doc, pageW, pageH, M, brand, input.companyName);
}

// Footer used by the ficha-técnica layout. Same shape as the cotización
// drawFooter, but kept local so this module's two layouts can drift
// independently.
function drawCatalogFooter(
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(TYPE.eyebrow.size);
  doc.setCharSpace(TRACK.eyebrow);
  if (companyName) doc.text(companyName.toUpperCase(), M, pageH - 26);
  const today = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  doc.text(today, pageW / 2, pageH - 26, { align: "center" });
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.text("POWERED BY TIREPRO.COM.CO", pageW - M, pageH - 26, { align: "right" });
  doc.setCharSpace(0);
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
  // Multi-tire ficha técnica: one full-page ficha per item, separated by
  // addPage(). Reuses drawFichaPage so both this and buildCatalogPdf stay
  // visually identical — same hero card, brand pills, two-col specs/marca,
  // dark price band, contact card, and footer.

  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const fields: QuoteIncludeFields = input.includeFields ?? {
    dimension: true, categoria: true, terreno: true, ejeTirePro: true,
    indiceCarga: true, indiceVelocidad: true, rtdMm: true, psiRecomendado: true,
    cinturones: true, pr: true, reencauchable: true, tipoBanda: true,
  };
  const brandByMarca = input.brandByMarca ?? {};

  for (let i = 0; i < input.items.length; i++) {
    if (i > 0) doc.addPage();
    const it = input.items[i];
    const brandMeta = brandByMarca[it.marca] ?? null;

    // Map this QuoteItem onto the PdfInput shape drawFichaPage expects.
    // Brand-block, hero pills and spec rows are all derived from the
    // same QuoteIncludeFields toggle set the user chose, so the user's
    // "what to include" preferences carry over.
    const pseudo: PdfInput = {
      companyName:    input.companyName,
      companyLogoUrl: input.companyLogoUrl,
      companyColor:   input.companyColor,
      companyWebsite: input.companyWebsite,
      companyCity:    input.companyCity,
      repName:        input.repName,
      repPhone:       input.repPhone,
      marca:          it.marca,
      modelo:         it.modelo,
      tipo:           it.tipo,
      dimension:      it.dimension,
      categoria:      it.categoria,
      terreno:        it.terreno,
      ejeTirePro:     it.ejeTirePro,
      reencauchable:  !!it.reencauchable,
      brandLogoUrl:   brandMeta?.logoUrl ?? null,
      brandCountry:   brandMeta?.country ?? null,
      brand:          brandMeta,
      imageUrls:      it.imageUrl ? [it.imageUrl] : [],
      rows:           buildSpecRows(it, fields),
      priceMode:      input.priceMode,
      priceCop:       it.unitPriceCop,
      originalPriceCop: it.originalPriceCop ?? null,
      notes:          null,
      fetchViaProxy:  input.fetchViaProxy,
    };

    await drawFichaPage(doc, pseudo);
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
    {
      // Same rule as drawFichaPage: reencauche modelos OR banda-code-shaped
      // nueva modelos (no spaces, all alphanumeric) → upper-case.
      const looksLikeCode = /^[A-Za-z0-9+]+$/.test(it.modelo) && !it.modelo.includes(" ");
      const renderedModelo = (it.tipo === "reencauche" || looksLikeCode)
        ? it.modelo.toUpperCase()
        : it.modelo;
      doc.text(renderedModelo, textX, y + 30);
    }
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
