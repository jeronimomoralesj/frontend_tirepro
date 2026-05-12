// Brand contact constants. Centralized here so a number/email change is
// a single-line edit, not a grep-and-replace across 10 files. Pre-2026
// state had at least 3 different numbers in production simultaneously
// (315 134 9122, 310 660 5563, 317 2169790) — that's exactly the
// drift this module is meant to prevent.

// Display formats ─────────────────────────────────────────────────────
export const BRAND_PHONE_DISPLAY = "+57 317 2169790";   // visible to humans
export const BRAND_PHONE_TEL     = "+573172169790";     // tel: hrefs
export const BRAND_PHONE_ORG_LD  = "+57-317-216-9790";  // JSON-LD Organization.telephone

// WhatsApp ─────────────────────────────────────────────────────────────
// wa.me accepts the bare number with country code, no plus.
export const BRAND_WHATSAPP_NUMBER = "573172169790";

/** Build a wa.me link with an optional pre-filled message. */
export function buildWhatsAppUrl(
  number: string = BRAND_WHATSAPP_NUMBER,
  message?: string,
): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Email ────────────────────────────────────────────────────────────────
// Only info@ is monitored (soporte@ and hola@ are stale aliases — see the
// auto-memory note from the user). matemoral@gmail.com appeared in legal
// copy historically and is no longer correct.
export const BRAND_EMAIL_INFO = "info@tirepro.com.co";
