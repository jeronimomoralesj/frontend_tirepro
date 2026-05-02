// =============================================================================
// Category catalog — vehicle classes and tire types that get a
// dedicated landing page at /marketplace/categoria/[slug]. Each one
// targets a high-volume Spanish search query in Colombia.
//
// Two types of category:
//   1. tipo-based   (reencauche, nueva)  → passed to the backend as `tipo=`
//   2. rim-based    (camion, tractomula) → passed as `rimSizes=`
// The page generator picks the right query mode based on `kind`.
// =============================================================================

export type CategoryKind = "tipo" | "rim";

export interface Category {
  slug: string;
  /** Display name used in copy (always plural for vehicle types). */
  name: string;
  /** Used in the H1: "Llantas {h1Suffix} en Colombia". */
  h1Suffix: string;
  /** Backend filter: either tipo value or rim sizes. */
  kind: CategoryKind;
  tipo?: string;        // when kind === "tipo"
  rimSizes?: number[];  // when kind === "rim"
  /** Short blurb for the hero / meta description. */
  blurb: string;
  /** Common dimensions in this category — surfaced as cross-links. */
  commonDimensions?: string[];
  /** What the buyer is typically buying for. */
  vehicles: string[];
}

export const CATEGORIES: Category[] = [
  // ── Tipo categories ───────────────────────────────────────────────────────
  {
    slug: "reencauche",
    name: "Reencauche",
    h1Suffix: "reencauchadas",
    kind: "tipo",
    tipo: "reencauche",
    blurb:
      "Llantas reencauchadas certificadas, garantía sobre el casco y el proceso de reencauche. Reduce el costo por kilómetro hasta 40% en flotas pesadas.",
    commonDimensions: ["295/80R22.5", "11R22.5", "315/80R22.5", "12R22.5", "275/80R22.5"],
    vehicles: ["tractomula", "camión", "bus", "volqueta"],
  },
  {
    slug: "nueva",
    name: "Llantas nuevas",
    h1Suffix: "nuevas",
    kind: "tipo",
    tipo: "nueva",
    blurb:
      "Llantas nuevas de fábrica con garantía oficial del fabricante. Marcas premium e intermedias en stock con distribuidores verificados.",
    vehicles: ["tractomula", "camión", "bus", "camioneta", "automóvil"],
  },

  // ── Rim-based vehicle classes ─────────────────────────────────────────────
  {
    slug: "tractomula",
    name: "Llantas para tractomula",
    h1Suffix: "para tractomula",
    kind: "rim",
    rimSizes: [22.5, 24.5],
    blurb:
      "Llantas para tractomula y carga pesada de larga distancia. Dimensiones 22.5\" y 24.5\" en marcas premium e intermedias, nuevas y reencauche.",
    commonDimensions: ["295/80R22.5", "11R22.5", "315/80R22.5", "12R22.5", "275/80R22.5", "12R24.5", "11R24.5"],
    vehicles: ["tractomula", "doble troque", "carga pesada"],
  },
  {
    slug: "camion",
    name: "Llantas para camión",
    h1Suffix: "para camión",
    kind: "rim",
    rimSizes: [17.5, 19.5, 22.5],
    blurb:
      "Llantas para camiones medianos y pesados, transporte urbano e intermunicipal. Compara marcas y precios de distribuidores verificados.",
    commonDimensions: ["11R22.5", "12R22.5", "275/80R22.5", "215/75R17.5", "225/70R19.5"],
    vehicles: ["camión", "camión mediano", "camión pesado", "transporte de carga"],
  },
  {
    slug: "bus",
    name: "Llantas para bus",
    h1Suffix: "para bus",
    kind: "rim",
    rimSizes: [17.5, 19.5, 22.5],
    blurb:
      "Llantas para buses urbanos, intermunicipales y de turismo. Diseño optimizado para alta rotación y comodidad de pasajeros.",
    commonDimensions: ["275/80R22.5", "215/75R17.5", "235/75R17.5", "225/70R19.5", "11R22.5"],
    vehicles: ["bus urbano", "bus intermunicipal", "buseta", "bus de turismo", "minibus"],
  },
  {
    slug: "camioneta",
    name: "Llantas para camioneta",
    h1Suffix: "para camioneta",
    kind: "rim",
    rimSizes: [15, 16, 17, 18],
    blurb:
      "Llantas para camionetas pickup, doble cabina y comerciales. Diseño all-terrain, mixto o de carretera según el uso.",
    commonDimensions: ["265/70R16", "245/70R16", "235/75R15", "265/65R17", "265/70R17"],
    vehicles: ["camioneta", "pickup", "doble cabina", "4x4"],
  },
  {
    slug: "suv",
    name: "Llantas para SUV",
    h1Suffix: "para SUV",
    kind: "rim",
    rimSizes: [16, 17, 18, 19, 20, 21],
    blurb:
      "Llantas para vehículos utilitarios deportivos (SUV) — de carretera, all-terrain y mixtas. Marcas premium e intermedias en stock.",
    commonDimensions: ["235/65R17", "265/65R17", "235/60R18", "255/55R18", "255/55R19"],
    vehicles: ["SUV", "vehículo utilitario", "crossover"],
  },
  {
    slug: "auto",
    name: "Llantas para auto",
    h1Suffix: "para automóvil",
    kind: "rim",
    rimSizes: [13, 14, 15, 16, 17],
    blurb:
      "Llantas para automóviles, sedanes y hatchbacks. Compara índice de carga, velocidad, profundidad y precio antes de comprar.",
    commonDimensions: ["205/55R16", "195/65R15", "215/60R16", "195/55R16", "185/65R15", "175/70R13"],
    vehicles: ["sedán", "hatchback", "automóvil", "vehículo liviano"],
  },
  {
    slug: "volqueta",
    name: "Llantas para volqueta",
    h1Suffix: "para volqueta",
    kind: "rim",
    rimSizes: [20, 22.5, 24],
    blurb:
      "Llantas para volquetas y maquinaria de construcción. Diseño reforzado para terreno mixto, alta resistencia al corte y desgaste.",
    commonDimensions: ["12R22.5", "11R22.5", "295/80R22.5", "315/80R22.5"],
    vehicles: ["volqueta", "maquinaria pesada", "obra civil"],
  },
  {
    slug: "furgon",
    name: "Llantas para furgón",
    h1Suffix: "para furgón",
    kind: "rim",
    rimSizes: [14, 15, 16],
    blurb:
      "Llantas para furgones, camiones de reparto urbano y vehículos de carga liviana. Diseño optimizado para uso comercial intensivo.",
    commonDimensions: ["195R15C", "205/65R16C", "215/75R16C", "225/70R15C"],
    vehicles: ["furgón", "camión liviano", "vehículo de reparto"],
  },
];

export function categoryFromSlug(slug: string): Category | null {
  return CATEGORIES.find((c) => c.slug === slug.toLowerCase()) ?? null;
}
