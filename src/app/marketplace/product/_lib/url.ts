// Product URL helpers — Amazon-style slug-prefixed URLs for SEO.
//
// Old format (still routable, redirects to new):
//     /marketplace/product/<uuid>
// New canonical format:
//     /marketplace/product/llanta-<marca>-<modelo>-<dimension>-<uuid>
//
// The UUID stays at the end of the path so we can always extract the real
// primary key with a single regex, regardless of what comes before it.
// The marca/modelo/dimension prefix is purely for SERP/buyer legibility —
// the page route handler validates it against the canonical slug and
// 301-redirects mismatches.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
// Anchor at the end of string for extraction (so a UUID embedded inside the
// slug part can't be misread as the listing id).
const UUID_END_RE = new RegExp(`(${UUID_RE.source})$`, "i");

export interface ProductSlugFields {
  marca?: string | null;
  modelo?: string | null;
  dimension?: string | null;
}

/**
 * Build the URL-safe slug portion from a product's marca/modelo/dimension.
 * Returns "" when nothing usable is provided — the caller should fall back
 * to the bare-id URL in that case.
 *
 * Example:
 *   { marca: "Nexen", modelo: "Roadian HTX RH5", dimension: "265/70R17" }
 *   -> "llanta-nexen-roadian-htx-rh5-265-70r17"
 */
export function productSlug(p: ProductSlugFields): string {
  const parts: string[] = ["llanta"];
  if (p.marca)     parts.push(p.marca);
  if (p.modelo)    parts.push(p.modelo);
  if (p.dimension) parts.push(p.dimension);
  return parts
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\//g, "-")              // 205/55R16 → 205-55r16
    .replace(/[^a-z0-9\s-]/g, "")     // drop other punctuation
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);                    // sanity cap
}

/**
 * Build the canonical product href. Returns the bare-id form when the
 * listing has no marca/modelo/dimension (extremely rare — means a draft
 * listing), so the page is still routable.
 */
export function productHref(listing: { id: string } & ProductSlugFields): string {
  const slug = productSlug(listing);
  return slug
    ? `/marketplace/product/${slug}-${listing.id}`
    : `/marketplace/product/${listing.id}`;
}

/**
 * Extract the listing UUID from a route param. The param can be either:
 *   - "<uuid>"                                 (legacy)
 *   - "<slug>-<uuid>"                          (canonical)
 *   - anything ending with a UUID-shaped tail  (defensive)
 *
 * Returns null when the param doesn't end in a UUID — the caller should
 * 404 in that case.
 */
export function extractListingId(param: string): string | null {
  const match = param.match(UUID_END_RE);
  return match ? match[1].toLowerCase() : null;
}

/**
 * True when the incoming route param is already the canonical
 * "<slug>-<uuid>" for the given product. When false, the route handler
 * should permanentRedirect to the canonical URL.
 */
export function isCanonicalParam(param: string, listing: { id: string } & ProductSlugFields): boolean {
  const slug = productSlug(listing);
  const canonical = slug ? `${slug}-${listing.id.toLowerCase()}` : listing.id.toLowerCase();
  return param.toLowerCase() === canonical;
}
