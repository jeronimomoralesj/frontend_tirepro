// =============================================================================
// City × Brand pairs for /marketplace/ciudad/[city]/[brand].
//
// Top combinations of Colombian cities × tire brands. Each pair gets
// a dedicated server-rendered landing page targeting queries like
// "Michelin en Bogotá", "comprar Bridgestone Medellín" — high
// commercial intent + local intent stacked.
//
// Generated as a Cartesian product of (top cities × top brands), with
// the option to filter out combinations that don't make sense for a
// particular brand's distribution footprint.
// =============================================================================

import { CITIES, type City } from "./cities";

// 8 highest-volume Colombian cities for tire commerce. Defined here as
// city slugs so we can subset CITIES without exporting the full list.
const TOP_CITY_SLUGS = [
  "bogota",
  "medellin",
  "cali",
  "barranquilla",
  "bucaramanga",
  "cartagena",
  "pereira",
  "cucuta",
] as const;

// Most-searched tire brands in Colombia. Slugs match the
// /marketplace/brand/<slug> canonical paths. Each entry produces 8
// city × brand landing pages (one per TOP_CITY) that internally link
// back to the brand page — that internal-linking equity is what
// lifts the brand page itself for navigational queries like
// "llantas nexen", "comprar hankook", etc. Adding a new brand here
// instantly creates 8 inbound links + 8 sitemap entries.
export const TOP_BRANDS: Array<{ slug: string; name: string; tier: "premium" | "mid" | "value"; country?: string }> = [
  { slug: "michelin",     name: "Michelin",     tier: "premium", country: "Francia" },
  { slug: "bridgestone",  name: "Bridgestone",  tier: "premium", country: "Japón" },
  { slug: "continental",  name: "Continental",  tier: "premium", country: "Alemania" },
  { slug: "goodyear",     name: "Goodyear",     tier: "premium", country: "Estados Unidos" },
  { slug: "pirelli",      name: "Pirelli",      tier: "premium", country: "Italia" },
  { slug: "hankook",      name: "Hankook",      tier: "mid",     country: "Corea del Sur" },
  { slug: "yokohama",     name: "Yokohama",     tier: "mid",     country: "Japón" },
  { slug: "firestone",    name: "Firestone",    tier: "mid",     country: "Estados Unidos" },
  { slug: "dunlop",       name: "Dunlop",       tier: "mid",     country: "Reino Unido" },
  { slug: "nexen",        name: "Nexen",        tier: "mid",     country: "Corea del Sur" },
  { slug: "kumho",        name: "Kumho",        tier: "mid",     country: "Corea del Sur" },
  { slug: "toyo",         name: "Toyo",         tier: "mid",     country: "Japón" },
  { slug: "cooper",       name: "Cooper",       tier: "mid",     country: "Estados Unidos" },
  { slug: "bfgoodrich",   name: "BFGoodrich",   tier: "mid",     country: "Estados Unidos" },
  { slug: "maxxis",       name: "Maxxis",       tier: "mid",     country: "Taiwán" },
  { slug: "gt-radial",    name: "GT Radial",    tier: "mid",     country: "Indonesia" },
  { slug: "sailun",       name: "Sailun",       tier: "value",   country: "China" },
  { slug: "linglong",     name: "Linglong",     tier: "value",   country: "China" },
  { slug: "triangle",     name: "Triangle",     tier: "value",   country: "China" },
  { slug: "westlake",     name: "Westlake",     tier: "value",   country: "China" },
  { slug: "doublestar",   name: "Doublestar",   tier: "value",   country: "China" },
];

export interface CityBrandPair {
  citySlug: string;
  city: City;
  brandSlug: string;
  brandName: string;
  brandTier: "premium" | "mid" | "value";
  brandCountry?: string;
}

/** Cartesian product of TOP cities × TOP brands → 96 pages */
export const CITY_BRAND_PAIRS: CityBrandPair[] = (() => {
  const out: CityBrandPair[] = [];
  for (const slug of TOP_CITY_SLUGS) {
    const c = CITIES.find((x) => x.slug === slug);
    if (!c) continue;
    for (const b of TOP_BRANDS) {
      out.push({
        citySlug: slug,
        city: c,
        brandSlug: b.slug,
        brandName: b.name,
        brandTier: b.tier,
        brandCountry: b.country,
      });
    }
  }
  return out;
})();

export function brandFromSlug(slug: string) {
  return TOP_BRANDS.find((b) => b.slug === slug);
}
