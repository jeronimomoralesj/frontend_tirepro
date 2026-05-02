// =============================================================================
// Colombian vehicle catalog. Each entry maps a (make, model) pair to
// its stock tire dimensions, so a buyer searching "llantas para Kia
// Picanto" lands on a dedicated page that shows the right size +
// in-stock products instead of fragmenting onto a generic search.
//
// `dimensions` lists every stock size the buyer might find on the
// road for that model — primary (most common) first. The page
// shows all of them but uses the primary to drive the SSR product
// grid. `dimensions` strings should match the canonical format used
// in DistributorListing.dimension (e.g. "295/80R22.5", "165/65R14").
//
// Adding a vehicle: append below. Sitemap and the dynamic vehicle
// route pick it up automatically. No backend change needed.
// =============================================================================

export type VehicleCategory = "auto" | "camioneta" | "suv" | "camion" | "tractomula" | "bus";

export interface Vehicle {
  slug: string;
  make: string;
  model: string;
  category: VehicleCategory;
  /** Stock dimensions, primary first (most common trim/year combo). */
  dimensions: string[];
  /** Year range commonly seen on Colombian roads. */
  yearRange?: string;
  /** Free-form notes — e.g. "Trim GT-Line usa 18\"" */
  notes?: string;
  /** Common alt names users might search ("4Runner Hilux", "i25 Accent"). */
  aliases?: string[];
}

// =============================================================================
// CATALOG — top ~50 vehicles in Colombia by registration volume + search
// volume. Ordered by category then alphabetically inside each category.
// =============================================================================

export const VEHICLES: Vehicle[] = [
  // ── AUTOS ────────────────────────────────────────────────────────────────
  { slug: "chevrolet-aveo",     make: "Chevrolet", model: "Aveo",     category: "auto", dimensions: ["185/60R14", "185/65R14"], yearRange: "2010+" },
  { slug: "chevrolet-beat",     make: "Chevrolet", model: "Beat",     category: "auto", dimensions: ["165/65R14", "175/70R14"], yearRange: "2017+" },
  { slug: "chevrolet-onix",     make: "Chevrolet", model: "Onix",     category: "auto", dimensions: ["185/60R15", "195/55R16"], yearRange: "2017+" },
  { slug: "chevrolet-sail",     make: "Chevrolet", model: "Sail",     category: "auto", dimensions: ["175/70R14", "185/60R15"], yearRange: "2014–2020" },
  { slug: "chevrolet-spark",    make: "Chevrolet", model: "Spark",    category: "auto", dimensions: ["165/65R14", "165/65R13"], yearRange: "2010+", aliases: ["Spark GT", "Spark Life"] },
  { slug: "hyundai-accent",     make: "Hyundai",   model: "Accent",   category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2012+", aliases: ["i25 Accent"] },
  { slug: "hyundai-eon",        make: "Hyundai",   model: "Eon",      category: "auto", dimensions: ["155/70R13", "165/70R13"], yearRange: "2013+" },
  { slug: "hyundai-i10",        make: "Hyundai",   model: "i10",      category: "auto", dimensions: ["165/65R14", "175/65R14"], yearRange: "2014+" },
  { slug: "kia-picanto",        make: "Kia",       model: "Picanto",  category: "auto", dimensions: ["175/65R14", "165/65R14", "185/55R15"], yearRange: "2012+", aliases: ["Picanto Ion", "Picanto GT-Line"] },
  { slug: "kia-rio",            make: "Kia",       model: "Rio",      category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2012+" },
  { slug: "mazda-2",            make: "Mazda",     model: "2",        category: "auto", dimensions: ["185/55R15", "185/60R15"], yearRange: "2014+", aliases: ["Mazda2"] },
  { slug: "mazda-3",            make: "Mazda",     model: "3",        category: "auto", dimensions: ["205/55R16", "215/45R18"], yearRange: "2014+", aliases: ["Mazda3"] },
  { slug: "nissan-march",       make: "Nissan",    model: "March",    category: "auto", dimensions: ["185/65R14", "185/65R15"], yearRange: "2012+" },
  { slug: "nissan-versa",       make: "Nissan",    model: "Versa",    category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2012+" },
  { slug: "renault-logan",      make: "Renault",   model: "Logan",    category: "auto", dimensions: ["185/65R15", "185/70R14"], yearRange: "2014+" },
  { slug: "renault-sandero",    make: "Renault",   model: "Sandero",  category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2014+", aliases: ["Sandero Stepway"] },
  { slug: "renault-stepway",    make: "Renault",   model: "Stepway",  category: "auto", dimensions: ["205/60R16", "195/55R16"], yearRange: "2014+" },
  { slug: "toyota-corolla",     make: "Toyota",    model: "Corolla",  category: "auto", dimensions: ["205/55R16", "215/45R17"], yearRange: "2010+" },
  { slug: "toyota-yaris",       make: "Toyota",    model: "Yaris",    category: "auto", dimensions: ["185/60R15", "195/50R16"], yearRange: "2014+" },
  { slug: "volkswagen-gol",     make: "Volkswagen", model: "Gol",     category: "auto", dimensions: ["175/70R13", "185/60R14"], yearRange: "2008+" },

  // ── SUV / CAMIONETAS DEPORTIVAS ──────────────────────────────────────────
  { slug: "chevrolet-captiva",  make: "Chevrolet", model: "Captiva",  category: "suv", dimensions: ["235/55R19", "235/55R18", "235/60R17"], yearRange: "2013+" },
  { slug: "chevrolet-tracker",  make: "Chevrolet", model: "Tracker",  category: "suv", dimensions: ["215/55R17", "215/60R17"], yearRange: "2013+" },
  { slug: "ford-ecosport",      make: "Ford",      model: "EcoSport", category: "suv", dimensions: ["205/60R16", "215/60R17"], yearRange: "2013+" },
  { slug: "ford-explorer",      make: "Ford",      model: "Explorer", category: "suv", dimensions: ["255/65R18", "255/55R20"], yearRange: "2014+" },
  { slug: "hyundai-creta",      make: "Hyundai",   model: "Creta",    category: "suv", dimensions: ["215/60R17", "205/65R16"], yearRange: "2018+" },
  { slug: "hyundai-tucson",     make: "Hyundai",   model: "Tucson",   category: "suv", dimensions: ["235/60R17", "235/55R18", "225/60R17"], yearRange: "2010+", aliases: ["Tucson IX35"] },
  { slug: "kia-seltos",         make: "Kia",       model: "Seltos",   category: "suv", dimensions: ["215/60R17", "235/55R18"], yearRange: "2020+" },
  { slug: "kia-sorento",        make: "Kia",       model: "Sorento",  category: "suv", dimensions: ["235/65R17", "235/60R18", "235/55R19"], yearRange: "2014+" },
  { slug: "kia-sportage",       make: "Kia",       model: "Sportage", category: "suv", dimensions: ["235/55R18", "235/65R17", "225/60R17"], yearRange: "2010+" },
  { slug: "mazda-cx-30",        make: "Mazda",     model: "CX-30",    category: "suv", dimensions: ["215/55R18", "215/65R16"], yearRange: "2020+" },
  { slug: "mazda-cx-5",         make: "Mazda",     model: "CX-5",     category: "suv", dimensions: ["225/65R17", "225/55R19"], yearRange: "2013+" },
  { slug: "mitsubishi-outlander", make: "Mitsubishi", model: "Outlander", category: "suv", dimensions: ["225/55R18", "215/70R16"], yearRange: "2013+" },
  { slug: "nissan-kicks",       make: "Nissan",    model: "Kicks",    category: "suv", dimensions: ["205/55R17", "215/60R17"], yearRange: "2018+" },
  { slug: "nissan-qashqai",     make: "Nissan",    model: "Qashqai",  category: "suv", dimensions: ["215/60R17", "215/65R16"], yearRange: "2014+" },
  { slug: "nissan-x-trail",     make: "Nissan",    model: "X-Trail",  category: "suv", dimensions: ["225/65R17", "225/60R18"], yearRange: "2014+", aliases: ["XTrail"] },
  { slug: "renault-duster",     make: "Renault",   model: "Duster",   category: "suv", dimensions: ["215/65R16", "215/60R17"], yearRange: "2014+" },
  { slug: "renault-koleos",     make: "Renault",   model: "Koleos",   category: "suv", dimensions: ["225/60R17", "225/55R19"], yearRange: "2017+" },
  { slug: "ssangyong-tivoli",   make: "SsangYong", model: "Tivoli",   category: "suv", dimensions: ["215/60R17", "205/60R16"], yearRange: "2016+" },
  { slug: "toyota-fortuner",    make: "Toyota",    model: "Fortuner", category: "suv", dimensions: ["265/65R17", "265/60R18"], yearRange: "2010+", aliases: ["Hilux SW4"] },
  { slug: "toyota-land-cruiser", make: "Toyota",   model: "Land Cruiser", category: "suv", dimensions: ["285/60R18", "275/65R18"], yearRange: "2010+", aliases: ["Land Cruiser Prado", "Prado VX"] },
  { slug: "toyota-rav4",        make: "Toyota",    model: "RAV4",     category: "suv", dimensions: ["235/55R19", "225/65R17"], yearRange: "2014+" },
  { slug: "volkswagen-tiguan",  make: "Volkswagen", model: "Tiguan",  category: "suv", dimensions: ["235/55R18", "235/50R19"], yearRange: "2014+" },

  // ── PICKUPS / CAMIONETAS DE TRABAJO ──────────────────────────────────────
  { slug: "chevrolet-d-max",    make: "Chevrolet", model: "D-Max",    category: "camioneta", dimensions: ["255/65R17", "245/70R16"], yearRange: "2010+", aliases: ["DMax"] },
  { slug: "chevrolet-luv",      make: "Chevrolet", model: "Luv",      category: "camioneta", dimensions: ["245/70R16", "265/70R16"], yearRange: "2008+" },
  { slug: "ford-ranger",        make: "Ford",      model: "Ranger",   category: "camioneta", dimensions: ["265/65R17", "265/60R18", "255/65R17"], yearRange: "2012+" },
  { slug: "mazda-bt-50",        make: "Mazda",     model: "BT-50",    category: "camioneta", dimensions: ["255/65R17", "245/70R16"], yearRange: "2012+", aliases: ["BT50"] },
  { slug: "mitsubishi-l200",    make: "Mitsubishi", model: "L200",    category: "camioneta", dimensions: ["245/65R17", "265/65R17"], yearRange: "2010+", aliases: ["Triton"] },
  { slug: "nissan-frontier",    make: "Nissan",    model: "Frontier", category: "camioneta", dimensions: ["265/60R18", "265/65R17"], yearRange: "2014+", aliases: ["Navara"] },
  { slug: "renault-alaskan",    make: "Renault",   model: "Alaskan",  category: "camioneta", dimensions: ["255/60R18", "265/60R18"], yearRange: "2018+" },
  { slug: "ssangyong-musso",    make: "SsangYong", model: "Musso",    category: "camioneta", dimensions: ["255/60R18", "245/65R17"], yearRange: "2019+" },
  { slug: "toyota-hilux",       make: "Toyota",    model: "Hilux",    category: "camioneta", dimensions: ["265/65R17", "265/60R18", "255/70R16"], yearRange: "2010+" },
  { slug: "volkswagen-amarok",  make: "Volkswagen", model: "Amarok",  category: "camioneta", dimensions: ["245/65R17", "255/55R19"], yearRange: "2012+" },

  // ── CAMIONES (rigid + commercial) ────────────────────────────────────────
  { slug: "chevrolet-nhr",      make: "Chevrolet", model: "NHR",      category: "camion", dimensions: ["7.00R15", "7.50R16"], yearRange: "2008+" },
  { slug: "chevrolet-npr",      make: "Chevrolet", model: "NPR",      category: "camion", dimensions: ["7.50R16", "215/75R17.5"], yearRange: "2008+" },
  { slug: "hino-dutro",         make: "Hino",      model: "Dutro",    category: "camion", dimensions: ["7.50R16", "8.25R16"], yearRange: "2010+" },
  { slug: "hyundai-hd-65",      make: "Hyundai",   model: "HD 65",    category: "camion", dimensions: ["7.00R15", "7.50R16"], yearRange: "2010+", aliases: ["Hyundai HD"] },
  { slug: "hyundai-hd-78",      make: "Hyundai",   model: "HD 78",    category: "camion", dimensions: ["7.50R16", "8.25R16"], yearRange: "2010+" },
  { slug: "jac-1040",           make: "JAC",       model: "1040",     category: "camion", dimensions: ["7.00R15", "7.50R16"], yearRange: "2014+" },

  // ── TRACTOMULAS ──────────────────────────────────────────────────────────
  { slug: "freightliner-cascadia", make: "Freightliner", model: "Cascadia", category: "tractomula", dimensions: ["295/80R22.5", "11R22.5"], yearRange: "2008+" },
  { slug: "freightliner-columbia", make: "Freightliner", model: "Columbia", category: "tractomula", dimensions: ["11R22.5", "295/80R22.5"], yearRange: "2008+" },
  { slug: "international-9200",    make: "International", model: "9200",    category: "tractomula", dimensions: ["11R22.5", "295/80R22.5"], yearRange: "2008+" },
  { slug: "kenworth-t800",         make: "Kenworth",      model: "T800",    category: "tractomula", dimensions: ["11R22.5", "295/80R22.5", "315/80R22.5"], yearRange: "2008+" },
  { slug: "kenworth-t660",         make: "Kenworth",      model: "T660",    category: "tractomula", dimensions: ["11R22.5", "295/80R22.5"], yearRange: "2008+" },
  { slug: "mack-anthem",           make: "Mack",          model: "Anthem",  category: "tractomula", dimensions: ["11R22.5", "295/80R22.5"], yearRange: "2018+" },
  { slug: "volvo-vnl",             make: "Volvo",         model: "VNL",     category: "tractomula", dimensions: ["11R22.5", "295/80R22.5"], yearRange: "2008+" },
];

export function vehicleFromSlug(slug: string): Vehicle | null {
  return VEHICLES.find((v) => v.slug === slug.toLowerCase()) ?? null;
}

export function vehiclesInCategory(cat: VehicleCategory): Vehicle[] {
  return VEHICLES.filter((v) => v.category === cat);
}

/**
 * Map a vehicle's category to the slug of the matching
 * /marketplace/categoria/[type] page. Some categories collapse — a
 * "camioneta" maps to the camioneta category page, while a "bus"
 * does the same. Returns null when there's no obvious target.
 */
export function categorySlugFor(cat: VehicleCategory): string {
  return cat;
}
