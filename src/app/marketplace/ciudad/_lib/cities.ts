// =============================================================================
// Colombian cities with dedicated landing pages at
// /marketplace/ciudad/[slug]. Each entry carries the canonical name
// (with accents — used in copy + LocalBusiness areaServed) and the
// slug (ascii-only, lowercase — used in URLs).
//
// Adding a new city: append here. The dynamic city page picks it up
// on the next deploy and the sitemap auto-includes it.
// =============================================================================

export interface City {
  /** Canonical display name with diacritics. */
  name: string;
  /** URL-safe slug. */
  slug: string;
  /** Department / region for context in copy. */
  department: string;
  /** Approximate population — used to order cities by importance and
   *  as background context for SEO copy. */
  population: number;
  /** Latitude/longitude — geo signal for LocalBusiness schema. */
  lat: number;
  lng: number;
  /** Brief description for hero copy and meta description. */
  blurb: string;
}

export const CITIES: City[] = [
  { name: "Bogotá",        slug: "bogota",       department: "Cundinamarca",       population: 7_900_000, lat: 4.7110,  lng: -74.0721, blurb: "capital y mayor centro de transporte y logística del país" },
  { name: "Medellín",      slug: "medellin",     department: "Antioquia",          population: 2_500_000, lat: 6.2442,  lng: -75.5812, blurb: "centro industrial y de transporte del Valle de Aburrá" },
  { name: "Cali",          slug: "cali",         department: "Valle del Cauca",    population: 2_200_000, lat: 3.4516,  lng: -76.5320, blurb: "principal nodo del suroccidente colombiano" },
  { name: "Barranquilla",  slug: "barranquilla", department: "Atlántico",          population: 1_300_000, lat: 10.9685, lng: -74.7813, blurb: "puerta logística del Caribe colombiano" },
  { name: "Cartagena",     slug: "cartagena",    department: "Bolívar",            population: 1_000_000, lat: 10.3910, lng: -75.4794, blurb: "puerto principal del Caribe y polo turístico" },
  { name: "Bucaramanga",   slug: "bucaramanga",  department: "Santander",          population: 600_000,   lat: 7.1193,  lng: -73.1227, blurb: "centro logístico del nororiente colombiano" },
  { name: "Pereira",       slug: "pereira",      department: "Risaralda",          population: 480_000,   lat: 4.8133,  lng: -75.6961, blurb: "eje cafetero y nodo de transporte central" },
  { name: "Manizales",     slug: "manizales",    department: "Caldas",             population: 400_000,   lat: 5.0703,  lng: -75.5138, blurb: "ciudad cafetera del centro-occidente" },
  { name: "Cúcuta",        slug: "cucuta",       department: "Norte de Santander", population: 700_000,   lat: 7.8939,  lng: -72.5078, blurb: "frontera con Venezuela y nodo de transporte oriental" },
  { name: "Ibagué",        slug: "ibague",       department: "Tolima",             population: 530_000,   lat: 4.4389,  lng: -75.2322, blurb: "centro logístico del Tolima" },
  { name: "Santa Marta",   slug: "santa-marta",  department: "Magdalena",          population: 510_000,   lat: 11.2408, lng: -74.1990, blurb: "puerto del Caribe y entrada turística" },
  { name: "Villavicencio", slug: "villavicencio", department: "Meta",              population: 530_000,   lat: 4.1420,  lng: -73.6266, blurb: "puerta a los Llanos Orientales" },
  { name: "Neiva",         slug: "neiva",        department: "Huila",              population: 360_000,   lat: 2.9273,  lng: -75.2819, blurb: "principal ciudad del sur del país" },
  { name: "Armenia",       slug: "armenia",      department: "Quindío",            population: 300_000,   lat: 4.5339,  lng: -75.6811, blurb: "eje cafetero, conexión Bogotá–Buenaventura" },
  { name: "Popayán",       slug: "popayan",      department: "Cauca",              population: 280_000,   lat: 2.4448,  lng: -76.6147, blurb: "centro histórico del Cauca" },
];

export function cityFromSlug(slug: string): City | null {
  const norm = slug.toLowerCase();
  return CITIES.find((c) => c.slug === norm) ?? null;
}

/**
 * Helper for callers that have a free-form ciudad string from listing
 * data and want to find the canonical city record (so we can link them
 * to the right /ciudad/[slug] page). Tolerant of accent + casing
 * differences.
 */
export function findCity(name: string | null | undefined): City | null {
  if (!name) return null;
  const norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return CITIES.find((c) => {
    const cn = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cn === norm;
  }) ?? null;
}
