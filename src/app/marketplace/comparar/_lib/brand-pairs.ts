// =============================================================================
// /marketplace/comparar/[pair] — curated brand-vs-brand comparison pairs.
//
// Each entry pre-renders a side-by-side brand-comparison page server-side.
// Targeted queries: "michelin vs bridgestone", "comparativa goodyear pirelli",
// "cual es mejor continental o michelin" — high commercial intent, very low
// SEO competition in es-CO since most comparison content is in en-US.
//
// Pair canonicalization: stored alphabetically by `a` then `b` so the URL
// is deterministic. The page also accepts the reverse permutation
// (bridgestone-vs-michelin → michelin-vs-bridgestone) via redirect.
// =============================================================================

export interface BrandPair {
  /** Lower-case slug of brand A (alphabetically first) */
  a: string;
  /** Lower-case slug of brand B */
  b: string;
  /** Display name A — used in headlines, kept faithful to brand styleguide */
  nameA: string;
  /** Display name B */
  nameB: string;
  /** One-line summary of who-vs-who used in meta description + intro paragraph */
  hook: string;
}

/** URL slug for a pair: "michelin-vs-bridgestone" */
export function pairSlug(p: BrandPair): string {
  return `${p.a}-vs-${p.b}`;
}

/** Resolve a slug back to a pair, allowing reverse order */
export function pairFromSlug(slug: string): { pair: BrandPair; reversed: boolean } | null {
  const m = slug.match(/^([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
  if (!m) return null;
  const [, x, y] = m;
  const direct = BRAND_PAIRS.find((p) => p.a === x && p.b === y);
  if (direct) return { pair: direct, reversed: false };
  const reversed = BRAND_PAIRS.find((p) => p.a === y && p.b === x);
  if (reversed) return { pair: reversed, reversed: true };
  return null;
}

// 50 curated pairs. Sorted alphabetically (a < b) so each pair has exactly
// one canonical URL. Reverse permutations 301-redirect to the canonical.
export const BRAND_PAIRS: BrandPair[] = [
  // ── Premium vs premium (highest-intent comparison queries) ──────────────
  { a: "bridgestone", b: "michelin",    nameA: "Bridgestone",  nameB: "Michelin",    hook: "Las dos marcas premium más vendidas para flota pesada y pasajero en Colombia." },
  { a: "continental", b: "michelin",    nameA: "Continental",  nameB: "Michelin",    hook: "Tecnología alemana frente a la herencia francesa — ambas marcas premium con desempeños distintos por aplicación." },
  { a: "goodyear",    b: "michelin",    nameA: "Goodyear",     nameB: "Michelin",    hook: "Dos referentes globales con catálogos amplios para auto, camioneta, camión y tractomula." },
  { a: "michelin",    b: "pirelli",     nameA: "Michelin",     nameB: "Pirelli",     hook: "Francia vs Italia: rendimiento premium con énfasis distinto en confort y deportividad." },
  { a: "bridgestone", b: "continental", nameA: "Bridgestone",  nameB: "Continental", hook: "Dos premium globales con fuerte presencia en flota pesada y pasajero." },
  { a: "bridgestone", b: "goodyear",    nameA: "Bridgestone",  nameB: "Goodyear",    hook: "Dos gigantes mundiales con catálogos extensos y precios competitivos en Colombia." },
  { a: "bridgestone", b: "pirelli",     nameA: "Bridgestone",  nameB: "Pirelli",     hook: "Bridgestone para volumen y flota; Pirelli para aplicaciones deportivas y premium europeo." },
  { a: "continental", b: "goodyear",    nameA: "Continental",  nameB: "Goodyear",    hook: "Tecnología alemana vs herencia americana, ambas con catálogos completos en Colombia." },
  { a: "continental", b: "pirelli",     nameA: "Continental",  nameB: "Pirelli",     hook: "Premium europeo: Continental orientado a confort y seguridad, Pirelli a deportividad." },
  { a: "goodyear",    b: "pirelli",     nameA: "Goodyear",     nameB: "Pirelli",     hook: "Catálogo amplio Goodyear vs especialización deportiva Pirelli." },

  // ── Premium vs intermedio (where shoppers tradeoff price vs. tier) ──────
  { a: "hankook",     b: "michelin",    nameA: "Hankook",      nameB: "Michelin",    hook: "La pregunta clásica: vale la pena pagar premium o el mid-tier coreano cubre la necesidad." },
  { a: "bridgestone", b: "hankook",     nameA: "Bridgestone",  nameB: "Hankook",     hook: "Premium japonés frente al coreano de mejor relación precio-rendimiento." },
  { a: "continental", b: "hankook",     nameA: "Continental",  nameB: "Hankook",     hook: "Alemán premium vs coreano intermedio — diferencia real para flotas y autos de pasajero." },
  { a: "goodyear",    b: "hankook",     nameA: "Goodyear",     nameB: "Hankook",     hook: "Dos catálogos amplios: Goodyear premium con peso histórico, Hankook con precio-rendimiento agresivo." },
  { a: "michelin",    b: "yokohama",    nameA: "Michelin",     nameB: "Yokohama",    hook: "Premium francés frente al japonés mid-tier con fortaleza en pasajero deportivo." },
  { a: "bridgestone", b: "yokohama",    nameA: "Bridgestone",  nameB: "Yokohama",    hook: "Dos marcas japonesas, distintos posicionamientos: Bridgestone premium global, Yokohama mid con foco deportivo." },
  { a: "firestone",   b: "michelin",    nameA: "Firestone",    nameB: "Michelin",    hook: "El mid-tier americano (subsidiaria Bridgestone) frente a la referencia premium europea." },
  { a: "firestone",   b: "goodyear",    nameA: "Firestone",    nameB: "Goodyear",    hook: "Dos marcas americanas: Firestone (Bridgestone group) mid frente a Goodyear premium." },
  { a: "dunlop",      b: "michelin",    nameA: "Dunlop",       nameB: "Michelin",    hook: "Mid-tier británico-japonés (grupo Goodyear) frente a la referencia premium francesa." },
  { a: "dunlop",      b: "hankook",     nameA: "Dunlop",       nameB: "Hankook",     hook: "Dos marcas mid-tier con fuerte presencia en pasajero y camioneta colombiana." },

  // ── Intermedio vs intermedio (CPK-driven flota decisions) ────────────────
  { a: "firestone",   b: "hankook",     nameA: "Firestone",    nameB: "Hankook",     hook: "Mid-tier vs mid-tier: subsidiaria de Bridgestone frente al líder coreano." },
  { a: "hankook",     b: "yokohama",    nameA: "Hankook",      nameB: "Yokohama",    hook: "Dos asiáticas mid-tier con fortalezas distintas: Hankook valor de flota, Yokohama deportividad." },
  { a: "dunlop",      b: "firestone",   nameA: "Dunlop",       nameB: "Firestone",   hook: "Dos americanas mid-tier — subsidiarias de los gigantes Goodyear y Bridgestone." },
  { a: "cooper",      b: "hankook",     nameA: "Cooper",       nameB: "Hankook",     hook: "Mid-tier americano (off-road specialist) vs coreano (volumen pasajero)." },
  { a: "bfgoodrich",  b: "cooper",      nameA: "BFGoodrich",   nameB: "Cooper",      hook: "Las dos marcas mid-tier americanas más fuertes en off-road y camioneta utilitaria." },
  { a: "bfgoodrich",  b: "goodyear",    nameA: "BFGoodrich",   nameB: "Goodyear",    hook: "Subsidiaria Michelin (off-road) frente a la matriz americana premium." },
  { a: "cooper",      b: "michelin",    nameA: "Cooper",       nameB: "Michelin",    hook: "Especialista off-road frente al líder mundial — comparativa por aplicación de uso." },

  // ── Premium / mid vs económico (presupuesto-conscious flotas) ───────────
  { a: "michelin",    b: "sailun",      nameA: "Michelin",     nameB: "Sailun",      hook: "El extremo del rango: premium europeo frente al chino económico de mayor crecimiento." },
  { a: "michelin",    b: "triangle",    nameA: "Michelin",     nameB: "Triangle",    hook: "Premium europeo vs económico chino especializado en flota pesada." },
  { a: "michelin",    b: "linglong",    nameA: "Michelin",     nameB: "Linglong",    hook: "Premium francés frente a la económica china con catálogo completo." },
  { a: "bridgestone", b: "sailun",      nameA: "Bridgestone",  nameB: "Sailun",      hook: "Premium japonés vs económico chino — comparativa de CPK real para flotas." },
  { a: "bridgestone", b: "triangle",    nameA: "Bridgestone",  nameB: "Triangle",    hook: "Premium frente a económica china con énfasis en tractomula y bus." },
  { a: "bridgestone", b: "linglong",    nameA: "Bridgestone",  nameB: "Linglong",    hook: "Premium japonés frente a la económica de mayor distribución en Colombia." },
  { a: "continental", b: "sailun",      nameA: "Continental",  nameB: "Sailun",      hook: "Tecnología alemana vs costo chino — análisis de cuándo cada uno conviene." },
  { a: "goodyear",    b: "sailun",      nameA: "Goodyear",     nameB: "Sailun",      hook: "Premium americano vs económica china — comparativa para decisión de flota." },
  { a: "hankook",     b: "sailun",      nameA: "Hankook",      nameB: "Sailun",      hook: "Mid-tier coreano frente al económico chino más vendido para flota." },
  { a: "hankook",     b: "triangle",    nameA: "Hankook",      nameB: "Triangle",    hook: "Mid-tier coreano vs económico chino especializado en carga pesada." },
  { a: "hankook",     b: "linglong",    nameA: "Hankook",      nameB: "Linglong",    hook: "Mid-tier vs económico chino — la decisión más común para flota presupuesto-consciente." },
  { a: "firestone",   b: "sailun",      nameA: "Firestone",    nameB: "Sailun",      hook: "Mid-tier americano frente a la económica china en pasajero y camioneta." },

  // ── Económico vs económico (presupuesto puro) ───────────────────────────
  { a: "linglong",    b: "sailun",      nameA: "Linglong",     nameB: "Sailun",      hook: "Las dos económicas chinas más vendidas en flota colombiana." },
  { a: "sailun",      b: "triangle",    nameA: "Sailun",       nameB: "Triangle",    hook: "Dos económicas chinas con fuerte presencia en tractomula y bus." },
  { a: "linglong",    b: "triangle",    nameA: "Linglong",     nameB: "Triangle",    hook: "Económicas chinas con catálogos amplios — comparativa por aplicación." },
  { a: "aplus",       b: "sailun",      nameA: "Aplus",        nameB: "Sailun",      hook: "Dos económicas chinas con perfiles de uso distintos: Aplus catálogo amplio, Sailun foco en flota." },
  { a: "joyroad",     b: "sailun",      nameA: "Joyroad",      nameB: "Sailun",      hook: "Dos económicas chinas en el segmento de mayor crecimiento del mercado colombiano." },

  // ── Aplicación específica: off-road ─────────────────────────────────────
  { a: "bfgoodrich",  b: "michelin",    nameA: "BFGoodrich",   nameB: "Michelin",    hook: "Dos marcas del mismo grupo: BFGoodrich off-road specialist vs Michelin premium global." },
  { a: "cooper",      b: "goodyear",    nameA: "Cooper",       nameB: "Goodyear",    hook: "Dos americanas con foco en camioneta utilitaria y aplicaciones de terreno mixto." },

  // ── Comparativas históricas / curiosas ──────────────────────────────────
  { a: "firestone",   b: "pirelli",     nameA: "Firestone",    nameB: "Pirelli",     hook: "Mid-tier americano frente al italiano con foco deportivo y premium europeo." },
  { a: "firestone",   b: "yokohama",    nameA: "Firestone",    nameB: "Yokohama",    hook: "Dos mid-tier con perfiles operativos diferentes — americano y japonés." },
  { a: "dunlop",      b: "yokohama",    nameA: "Dunlop",       nameB: "Yokohama",    hook: "Dos marcas mid-tier con fuerte presencia histórica en pasajero." },
  { a: "goodyear",    b: "yokohama",    nameA: "Goodyear",     nameB: "Yokohama",    hook: "Premium americano frente al mid-tier japonés deportivo." },
];
