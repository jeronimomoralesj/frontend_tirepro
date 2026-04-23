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
  // Manufacturer info from the marketplace BrandInfo table — rendered as a
  // small logo + country tag near the title. Both optional.
  brandLogoUrl: string | null;
  brandCountry: string | null;
  // Gallery — already filtered to what the user wants. First one is the hero.
  imageUrls:  string[];
  // Spec rows already filtered to enabled fields with resolved values.
  rows:       Array<{ label: string; value: string }>;
  // Price
  priceMode: "none" | "sin_iva" | "con_iva";
  priceCop:  number | null;
  // Misc
  notes: string | null;
  // Optional image fetcher. The detail page wires this to a backend
  // asset proxy that authenticates via the JWT header — so S3-hosted
  // images load without depending on the bucket's CORS policy.
  // Returns null (or throws) when the fetch fails, in which case the
  // loader falls back to a direct fetch of the original URL.
  fetchViaProxy?: (url: string) => Promise<Blob | null>;
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

// URL fragment for TirePro's default placeholder logo. Any Company whose
// profileImage still points at this (i.e. the dist never uploaded their
// own) must NOT render it in the PDF — printing the TirePro logo as the
// salesperson's brand is worse than printing no logo at all.
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
  // Try the proxy first so S3 CORS never comes into play; fall back to
  // a direct fetch (covers third-party CDNs like brand logos where the
  // proxy refuses to forward).
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

// jspdf wants "PNG" / "JPEG" / "WEBP" to pick its decoder. Inferring from
// the data URL's MIME prefix avoids passing the wrong format (which jspdf
// will still accept but can muddy colors on certain inputs).
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

  // Pre-fetch logo + every selected product image in parallel. Capped at
  // 4 hero/thumbs to keep the layout readable on one page. The logo is
  // skipped entirely when it's still the TirePro default placeholder —
  // stamping our logo on a distributor's sales sheet is a branding own-goal.
  const logoUrl = isDefaultPlaceholderLogo(input.companyLogoUrl)
    ? null
    : input.companyLogoUrl;
  const proxy = input.fetchViaProxy;
  const heroSelected = input.imageUrls.slice(0, 4);
  const [logoData, brandLogoData, ...productDatas] = await Promise.all([
    loadImageAsDataUrl(logoUrl, proxy),
    loadImageAsDataUrl(input.brandLogoUrl, proxy),
    ...heroSelected.map((u) => loadImageAsDataUrl(u, proxy)),
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

  // Logo in a white tile (left). If no logo is available (either the dist
  // hasn't uploaded one, the fetch failed, or we stripped the TirePro
  // placeholder) render the company name in a white-pill fallback so
  // there's still a recognizable brand on the banner.
  if (logoData) {
    const { w, h } = await imageDims(logoData);
    const boxW = 150, boxH = 60;
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale, drawH = h * scale;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M - 8, 15, boxW + 16, 64, 8, 8, "F");
    doc.addImage(
      logoData,
      detectFormat(logoData),
      M - 8 + (boxW + 16 - drawW) / 2,
      15 + (64 - drawH) / 2,
      drawW, drawH,
      undefined,
      "SLOW",   // logos are small + high-contrast — pay compression time for crisp edges
    );
  } else if (input.companyName) {
    doc.setFillColor(255, 255, 255);
    const pillH = 36;
    const pillPadX = 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const textW = doc.getTextWidth(input.companyName);
    const pillW = Math.min(260, textW + pillPadX * 2);
    doc.roundedRect(M - 8, 27, pillW, pillH, 8, 8, "F");
    doc.setTextColor(...brand);
    doc.text(input.companyName, M - 8 + pillW / 2, 27 + pillH / 2 + 4, {
      align: "center",
      maxWidth: pillW - pillPadX,
    });
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
  // Marca + manufacturer info (brand logo inline at the start of the line,
  // country appended after the marca name). Brand logo box is small by
  // request — 28×16 — so it reads as a tag, not a second header.
  const marcaText = input.marca.toUpperCase();
  let cursorX = M;
  if (brandLogoData) {
    const { w, h } = await imageDims(brandLogoData);
    const boxW = 36, boxH = 18;
    const scale = Math.min(boxW / w, boxH / h);
    const drawW = w * scale, drawH = h * scale;
    doc.addImage(
      brandLogoData,
      detectFormat(brandLogoData),
      cursorX, y - drawH + 2,
      drawW, drawH,
      undefined,
      "SLOW",
    );
    cursorX += drawW + 8;
  }
  doc.setTextColor(...brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(marcaText, cursorX, y);
  if (input.brandCountry) {
    const marcaWidth = doc.getTextWidth(marcaText);
    doc.setTextColor(...FALLBACK.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`· ${input.brandCountry}`, cursorX + marcaWidth + 6, y);
  }

  y += 22;
  doc.setTextColor(...FALLBACK.ink);
  doc.setFont("helvetica", "bold");
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
  // Bigger hero so the tire itself is the centerpiece of the sales sheet.
  // 250×230 pts ≈ 3.5×3.2 inches at the PDF's native 72dpi.
  const HERO_BOX_Y = 108;
  const HERO_BOX_W = 250, HERO_BOX_H = 230;
  if (heroData) {
    const { w, h } = await imageDims(heroData);
    const scale = Math.min(HERO_BOX_W / w, HERO_BOX_H / h);
    const drawW = w * scale, drawH = h * scale;
    const x = pageW - M - HERO_BOX_W;
    // Softer radial-ish background — a flat tint + a faint brand frame
    // makes the tire pop without needing transparent PNG uploads.
    doc.setFillColor(...FALLBACK.page);
    doc.roundedRect(x, HERO_BOX_Y, HERO_BOX_W, HERO_BOX_H, 12, 12, "F");
    doc.setDrawColor(...tint(brand, 0.18));
    doc.setLineWidth(0.6);
    doc.roundedRect(x, HERO_BOX_Y, HERO_BOX_W, HERO_BOX_H, 12, 12, "S");
    doc.addImage(
      heroData,
      detectFormat(heroData),
      x + (HERO_BOX_W - drawW) / 2,
      HERO_BOX_Y + (HERO_BOX_H - drawH) / 2,
      drawW, drawH,
      undefined,
      "MEDIUM",   // better quality than FAST; noticeable on zoomed/printed photos
    );
    tableWidth = pageW - 2 * M - HERO_BOX_W - 22;
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
      doc.setDrawColor(...tint(brand, 0.14));
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, thumbW, thumbH, 8, 8, "S");
      doc.addImage(
        data,
        detectFormat(data),
        x + (thumbW - drawW) / 2,
        y + (thumbH - drawH) / 2,
        drawW, drawH,
        undefined,
        "MEDIUM",
      );
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
