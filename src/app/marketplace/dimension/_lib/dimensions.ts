// =============================================================================
// Dimension catalog — canonical list of tire sizes that get a dedicated
// landing page at /marketplace/dimension/[slug]. The slug is a URL-safe
// transformation of the canonical (e.g. "295/80R22.5" → "295-80r22-5"),
// reversed via this lookup table because the slug-to-canonical direction
// is otherwise ambiguous (`11r22-5` could be `11R22.5` OR `11R22-5`).
//
// To add a new dimension: just append the canonical string to
// POPULAR_DIMENSIONS — the slug is generated automatically and the
// page picks it up on the next deploy.
// =============================================================================

export const POPULAR_DIMENSIONS = [
  // Truck / tractomula (rim 22.5–24.5)
  "295/80R22.5", "11R22.5", "315/80R22.5", "12R22.5",
  "275/80R22.5", "12R24.5", "11R24.5",
  // Mid truck / bus (rim 17.5–19.5)
  "225/70R19.5", "215/75R17.5", "235/75R17.5", "9.5R17.5",
  // Small commercial (rim 16)
  "7.50R16",
  // Pickup / SUV grandes (rim 17–18) — Hilux, Fortuner, Ranger, L200, Frontier, Land Cruiser
  "265/65R17", "265/60R18", "245/65R17", "285/60R18",
  "265/70R16", "245/70R16",
  // SUV medianas y compactas (rim 16–19) — Tucson, CX-5, Captiva, Sorento, Sportage, Outlander, Tracker, Duster
  "215/55R17", "215/65R16", "225/55R17", "225/55R18", "225/60R17", "225/65R17",
  "235/55R17", "235/55R18", "235/55R19", "235/60R17", "235/65R17", "255/55R18",
  // Auto / sedan (rim 13–16)
  "205/55R16", "195/65R15", "215/60R16", "195/55R16",
  "185/65R15", "175/70R13", "205/65R15", "235/75R15",
  // Subcompactos / urbanos (rim 13–15) — Picanto, Spark, Sandero, Yaris, Eon, Logan, Sail, Mazda 2
  "165/65R14", "175/65R14", "175/65R15", "185/55R15", "185/65R14",
  "195/60R15",
  // Furgones / vans comerciales (LT) — Hyundai HD, Chevrolet NPR/NHR, Hino Dutro
  "8.25R16", "7.00R15",
] as const;

export type Dimension = (typeof POPULAR_DIMENSIONS)[number];

/**
 * Convert a canonical dimension string to a URL-safe slug.
 *   "295/80R22.5" → "295-80r22-5"
 *   "11R22.5"     → "11r22-5"
 *   "7.50R16"     → "7-50r16"
 */
export function toDimensionSlug(d: string): string {
  return d
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\./g, "-")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-");
}

// Reverse lookup, built once at module load.
const SLUG_TO_DIMENSION = new Map<string, string>();
for (const d of POPULAR_DIMENSIONS) {
  SLUG_TO_DIMENSION.set(toDimensionSlug(d), d);
}

export function dimensionFromSlug(slug: string): string | null {
  return SLUG_TO_DIMENSION.get(slug.toLowerCase()) ?? null;
}

// =============================================================================
// Parsing — break a dimension into width/profile/rim so we can generate
// vehicle-class copy ("rim 22.5 → tractomula", "rim 16 → camioneta") on
// the landing page without hand-curating every size.
// =============================================================================

export interface ParsedDimension {
  width: number;
  profile: number | null;
  rim: number;
}

export function parseDimension(d: string): ParsedDimension | null {
  // Matches "295/80R22.5", "11R22.5", "7.50R16", "215 75 17.5".
  const m = d.match(/^\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?\s*R?\s*(\d+(?:\.\d+)?)\s*$/i);
  if (!m) return null;
  return {
    width:   Number(m[1]),
    profile: m[2] ? Number(m[2]) : null,
    rim:     Number(m[3]),
  };
}

/**
 * Best-fit vehicle classification from rim diameter alone — Colombian
 * fleet usage patterns. Used for copy generation only; does not gate
 * any data filtering.
 */
export function vehicleClass(rim: number): {
  primary: string;
  examples: string[];
  category: "truck" | "bus" | "suv" | "auto";
} {
  if (rim >= 22) {
    return {
      primary: "tractomula y camión pesado",
      examples: ["tractomula", "camión", "volqueta", "doble troque"],
      category: "truck",
    };
  }
  if (rim >= 19) {
    return {
      primary: "camión mediano y bus intermunicipal",
      examples: ["camión mediano", "bus", "buseta", "minibus"],
      category: "bus",
    };
  }
  if (rim >= 17) {
    return {
      primary: "camioneta, SUV y van comercial",
      examples: ["camioneta", "SUV", "van", "furgón liviano"],
      category: "suv",
    };
  }
  return {
    primary: "automóvil y vehículo liviano",
    examples: ["sedán", "hatchback", "automóvil compacto", "vehículo liviano"],
    category: "auto",
  };
}

/**
 * Render a human-friendly dimension description: "ancho 295 mm, perfil
 * 80%, rin 22.5 pulgadas". Used in copy + meta description.
 */
export function describeDimension(d: string): string {
  const p = parseDimension(d);
  if (!p) return d;
  const widthIsLT = p.profile === null && p.width < 50;
  const widthLabel = widthIsLT
    ? `ancho ${p.width}" (Light Truck)`
    : `${p.width} mm de ancho`;
  const profileLabel = p.profile != null ? `, perfil ${p.profile}%` : "";
  return `${widthLabel}${profileLabel}, rin ${p.rim}″`;
}
