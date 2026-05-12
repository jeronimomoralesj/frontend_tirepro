// Shared blog category helpers.
//
// Categories are a free-text field on each post (e.g. "Mantenimiento",
// "Análisis de CPK"). We derive URL slugs deterministically so the same
// label always points to the same /blog/category/<slug> hub, regardless
// of casing or accents.

export function categorySlug(category: string | null | undefined): string {
  if (!category) return "general";
  const slug = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")      // drop punctuation
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "general";
}

// Pretty-print a category label from its slug. Used as a fallback when
// we encounter a slug that doesn't match any known label (e.g. an
// orphaned URL surviving from before a category was renamed).
export function prettifyCategorySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
