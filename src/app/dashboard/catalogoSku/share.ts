// -----------------------------------------------------------------------------
// PDF save/share helpers. On mobile, tapping "Descargar" in a browser is
// awkward (download lands in a hidden Downloads folder; sending it to a
// client usually means an extra "upload" step). The Web Share API level
// 2 fixes this: navigator.share({ files: [pdf] }) opens the native share
// sheet, which every mobile OS renders with every installed app
// (WhatsApp, Mail, Drive, AirDrop, etc.).
//
// Support is good on recent mobile browsers (iOS Safari 15+, Chrome on
// Android); falls back to a plain download on desktop browsers that
// don't implement it. Callers use `canSharePdf()` to decide whether to
// render the "Compartir" button at all.
// -----------------------------------------------------------------------------

/**
 * Can the current browser share a PDF file via the native share sheet?
 * Feature-detects `navigator.canShare({ files })` because some browsers
 * expose `navigator.share` for URLs only and would reject files at
 * call-time — we want to know BEFORE rendering the button.
 */
export function canSharePdf(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    const probe = new File([new Blob()], "probe.pdf", { type: "application/pdf" });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Open the native share sheet for a PDF. Returns true on success, false
 * when the user cancelled, and throws on programmatic failures so the
 * caller can log them. Cancel is distinguished from failure via the
 * standard `AbortError` DOMException.
 */
export async function sharePdf(blob: Blob, filename: string, title?: string): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  const file = new File([blob], filename, { type: "application/pdf" });
  try {
    await nav.share({
      files: [file],
      title: title ?? filename,
    });
    return true;
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === "AbortError") return false; // user dismissed the sheet
    throw err;
  }
}

/** Plain download — anchor with `download=` + object URL cleanup. */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
