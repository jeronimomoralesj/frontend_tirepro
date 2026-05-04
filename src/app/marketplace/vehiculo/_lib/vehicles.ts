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
  { slug: "chevrolet-cobalt",   make: "Chevrolet", model: "Cobalt",   category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2012+" },
  { slug: "chevrolet-cruze",    make: "Chevrolet", model: "Cruze",    category: "auto", dimensions: ["205/55R16", "225/50R17"], yearRange: "2010+" },
  { slug: "chevrolet-joy",      make: "Chevrolet", model: "Joy",      category: "auto", dimensions: ["185/55R15", "175/70R14"], yearRange: "2019+" },
  { slug: "chevrolet-onix",     make: "Chevrolet", model: "Onix",     category: "auto", dimensions: ["185/60R15", "195/55R16"], yearRange: "2017+" },
  { slug: "chevrolet-sail",     make: "Chevrolet", model: "Sail",     category: "auto", dimensions: ["175/70R14", "185/60R15"], yearRange: "2014–2020" },
  { slug: "chevrolet-spark",    make: "Chevrolet", model: "Spark",    category: "auto", dimensions: ["165/65R14", "165/65R13"], yearRange: "2010+", aliases: ["Spark GT", "Spark Life"] },
  { slug: "honda-accord",       make: "Honda",     model: "Accord",   category: "auto", dimensions: ["235/45R18", "225/50R17"], yearRange: "2014+" },
  { slug: "honda-city",         make: "Honda",     model: "City",     category: "auto", dimensions: ["185/55R16", "175/65R15"], yearRange: "2014+" },
  { slug: "honda-civic",        make: "Honda",     model: "Civic",    category: "auto", dimensions: ["215/55R16", "215/50R17", "235/40R18"], yearRange: "2010+", aliases: ["Civic EX", "Civic Sport", "Civic Touring"] },
  { slug: "honda-fit",          make: "Honda",     model: "Fit",      category: "auto", dimensions: ["185/55R16", "175/65R15"], yearRange: "2014+", aliases: ["Jazz"] },
  { slug: "hyundai-accent",     make: "Hyundai",   model: "Accent",   category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2012+", aliases: ["i25 Accent"] },
  { slug: "hyundai-eon",        make: "Hyundai",   model: "Eon",      category: "auto", dimensions: ["155/70R13", "165/70R13"], yearRange: "2013+" },
  { slug: "hyundai-i10",        make: "Hyundai",   model: "i10",      category: "auto", dimensions: ["165/65R14", "175/65R14"], yearRange: "2014+" },
  { slug: "kia-cerato",         make: "Kia",       model: "Cerato",   category: "auto", dimensions: ["205/55R16", "225/45R17"], yearRange: "2014+", aliases: ["Forte"] },
  { slug: "kia-picanto",        make: "Kia",       model: "Picanto",  category: "auto", dimensions: ["175/65R14", "165/65R14", "185/55R15"], yearRange: "2012+", aliases: ["Picanto Ion", "Picanto GT-Line"] },
  { slug: "kia-rio",            make: "Kia",       model: "Rio",      category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2012+" },
  { slug: "kia-soluto",         make: "Kia",       model: "Soluto",   category: "auto", dimensions: ["175/65R14", "185/65R15"], yearRange: "2019+" },
  { slug: "mazda-2",            make: "Mazda",     model: "2",        category: "auto", dimensions: ["185/55R15", "185/60R15"], yearRange: "2014+", aliases: ["Mazda2"] },
  { slug: "mazda-3",            make: "Mazda",     model: "3",        category: "auto", dimensions: ["205/55R16", "215/45R18"], yearRange: "2014+", aliases: ["Mazda3"] },
  { slug: "nissan-march",       make: "Nissan",    model: "March",    category: "auto", dimensions: ["185/65R14", "185/65R15"], yearRange: "2012+" },
  { slug: "nissan-sentra",      make: "Nissan",    model: "Sentra",   category: "auto", dimensions: ["205/55R16", "215/50R17"], yearRange: "2013+" },
  { slug: "nissan-versa",       make: "Nissan",    model: "Versa",    category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2012+" },
  { slug: "renault-kwid",       make: "Renault",   model: "Kwid",     category: "auto", dimensions: ["165/70R14", "165/65R14"], yearRange: "2018+" },
  { slug: "renault-logan",      make: "Renault",   model: "Logan",    category: "auto", dimensions: ["185/65R15", "185/70R14"], yearRange: "2014+" },
  { slug: "renault-sandero",    make: "Renault",   model: "Sandero",  category: "auto", dimensions: ["185/65R15", "195/55R16"], yearRange: "2014+", aliases: ["Sandero Stepway"] },
  { slug: "renault-stepway",    make: "Renault",   model: "Stepway",  category: "auto", dimensions: ["205/60R16", "195/55R16"], yearRange: "2014+" },
  { slug: "toyota-corolla",     make: "Toyota",    model: "Corolla",  category: "auto", dimensions: ["205/55R16", "215/45R17"], yearRange: "2010+" },
  { slug: "toyota-yaris",       make: "Toyota",    model: "Yaris",    category: "auto", dimensions: ["185/60R15", "195/50R16"], yearRange: "2014+" },
  { slug: "volkswagen-gol",     make: "Volkswagen", model: "Gol",     category: "auto", dimensions: ["175/70R13", "185/60R14"], yearRange: "2008+" },
  { slug: "volkswagen-jetta",   make: "Volkswagen", model: "Jetta",   category: "auto", dimensions: ["205/55R16", "225/45R17"], yearRange: "2010+" },
  { slug: "volkswagen-polo",    make: "Volkswagen", model: "Polo",    category: "auto", dimensions: ["185/60R15", "195/55R16"], yearRange: "2014+" },
  { slug: "volkswagen-virtus",  make: "Volkswagen", model: "Virtus",  category: "auto", dimensions: ["185/60R15", "205/55R16"], yearRange: "2018+" },

  // ── SUV / CAMIONETAS DEPORTIVAS ──────────────────────────────────────────
  { slug: "chevrolet-captiva",  make: "Chevrolet", model: "Captiva",  category: "suv", dimensions: ["235/55R19", "235/55R18", "235/60R17"], yearRange: "2013+" },
  { slug: "chevrolet-groove",   make: "Chevrolet", model: "Groove",   category: "suv", dimensions: ["205/55R17", "215/55R17"], yearRange: "2021+" },
  { slug: "chevrolet-tracker",  make: "Chevrolet", model: "Tracker",  category: "suv", dimensions: ["215/55R17", "215/60R17"], yearRange: "2013+" },
  { slug: "ford-ecosport",      make: "Ford",      model: "EcoSport", category: "suv", dimensions: ["205/60R16", "215/60R17"], yearRange: "2013+" },
  { slug: "ford-explorer",      make: "Ford",      model: "Explorer", category: "suv", dimensions: ["255/65R18", "255/55R20"], yearRange: "2014+" },
  { slug: "ford-territory",     make: "Ford",      model: "Territory", category: "suv", dimensions: ["225/55R18", "215/55R18"], yearRange: "2020+" },
  { slug: "honda-br-v",         make: "Honda",     model: "BR-V",     category: "suv", dimensions: ["195/60R16", "185/65R15"], yearRange: "2017+" },
  { slug: "honda-cr-v",         make: "Honda",     model: "CR-V",     category: "suv", dimensions: ["235/60R18", "225/65R17", "235/65R17"], yearRange: "2010+", aliases: ["CRV"] },
  { slug: "honda-hr-v",         make: "Honda",     model: "HR-V",     category: "suv", dimensions: ["215/55R17", "215/60R16", "225/50R18"], yearRange: "2015+", aliases: ["HRV", "Vezel"] },
  { slug: "honda-pilot",        make: "Honda",     model: "Pilot",    category: "suv", dimensions: ["245/60R18", "245/50R20"], yearRange: "2014+" },
  { slug: "hyundai-creta",      make: "Hyundai",   model: "Creta",    category: "suv", dimensions: ["215/60R17", "205/65R16"], yearRange: "2018+" },
  { slug: "hyundai-kona",       make: "Hyundai",   model: "Kona",     category: "suv", dimensions: ["215/55R17", "235/45R18"], yearRange: "2018+" },
  { slug: "hyundai-santa-fe",   make: "Hyundai",   model: "Santa Fe", category: "suv", dimensions: ["235/65R17", "235/60R18", "235/55R19"], yearRange: "2010+" },
  { slug: "hyundai-tucson",     make: "Hyundai",   model: "Tucson",   category: "suv", dimensions: ["235/60R17", "235/55R18", "225/60R17"], yearRange: "2010+", aliases: ["Tucson IX35"] },
  { slug: "hyundai-venue",      make: "Hyundai",   model: "Venue",    category: "suv", dimensions: ["205/55R17", "215/60R16"], yearRange: "2020+" },
  { slug: "jeep-compass",       make: "Jeep",      model: "Compass",  category: "suv", dimensions: ["225/60R17", "225/55R18"], yearRange: "2017+" },
  { slug: "jeep-grand-cherokee", make: "Jeep",     model: "Grand Cherokee", category: "suv", dimensions: ["265/60R18", "265/50R20"], yearRange: "2014+" },
  { slug: "jeep-renegade",      make: "Jeep",      model: "Renegade", category: "suv", dimensions: ["215/60R17", "225/55R18"], yearRange: "2015+" },
  { slug: "jeep-wrangler",      make: "Jeep",      model: "Wrangler", category: "suv", dimensions: ["255/75R17", "255/70R18", "275/55R20"], yearRange: "2010+" },
  { slug: "kia-niro",           make: "Kia",       model: "Niro",     category: "suv", dimensions: ["205/60R16", "225/45R18"], yearRange: "2018+" },
  { slug: "kia-seltos",         make: "Kia",       model: "Seltos",   category: "suv", dimensions: ["215/60R17", "235/55R18"], yearRange: "2020+" },
  { slug: "kia-sorento",        make: "Kia",       model: "Sorento",  category: "suv", dimensions: ["235/65R17", "235/60R18", "235/55R19"], yearRange: "2014+" },
  { slug: "kia-soul",           make: "Kia",       model: "Soul",     category: "suv", dimensions: ["205/55R16", "215/55R17", "235/45R18"], yearRange: "2014+" },
  { slug: "kia-sportage",       make: "Kia",       model: "Sportage", category: "suv", dimensions: ["235/55R18", "235/65R17", "225/60R17"], yearRange: "2010+" },
  { slug: "kia-stonic",         make: "Kia",       model: "Stonic",   category: "suv", dimensions: ["205/60R16", "215/55R17"], yearRange: "2018+" },
  { slug: "mazda-cx-3",         make: "Mazda",     model: "CX-3",     category: "suv", dimensions: ["215/60R16", "215/50R18"], yearRange: "2016+" },
  { slug: "mazda-cx-30",        make: "Mazda",     model: "CX-30",    category: "suv", dimensions: ["215/55R18", "215/65R16"], yearRange: "2020+" },
  { slug: "mazda-cx-5",         make: "Mazda",     model: "CX-5",     category: "suv", dimensions: ["225/65R17", "225/55R19"], yearRange: "2013+" },
  { slug: "mazda-cx-50",        make: "Mazda",     model: "CX-50",    category: "suv", dimensions: ["235/65R17", "235/55R19"], yearRange: "2023+" },
  { slug: "mitsubishi-outlander", make: "Mitsubishi", model: "Outlander", category: "suv", dimensions: ["225/55R18", "215/70R16"], yearRange: "2013+" },
  { slug: "nissan-kicks",       make: "Nissan",    model: "Kicks",    category: "suv", dimensions: ["205/55R17", "215/60R17"], yearRange: "2018+" },
  { slug: "nissan-pathfinder",  make: "Nissan",    model: "Pathfinder", category: "suv", dimensions: ["255/60R18", "235/55R20"], yearRange: "2014+" },
  { slug: "nissan-qashqai",     make: "Nissan",    model: "Qashqai",  category: "suv", dimensions: ["215/60R17", "215/65R16"], yearRange: "2014+" },
  { slug: "nissan-x-trail",     make: "Nissan",    model: "X-Trail",  category: "suv", dimensions: ["225/65R17", "225/60R18"], yearRange: "2014+", aliases: ["XTrail"] },
  { slug: "peugeot-2008",       make: "Peugeot",   model: "2008",     category: "suv", dimensions: ["215/60R17", "215/55R18"], yearRange: "2015+" },
  { slug: "peugeot-3008",       make: "Peugeot",   model: "3008",     category: "suv", dimensions: ["225/55R18", "235/45R19"], yearRange: "2017+" },
  { slug: "renault-captur",     make: "Renault",   model: "Captur",   category: "suv", dimensions: ["215/60R17", "215/65R16"], yearRange: "2017+" },
  { slug: "renault-duster",     make: "Renault",   model: "Duster",   category: "suv", dimensions: ["215/65R16", "215/60R17"], yearRange: "2014+" },
  { slug: "renault-koleos",     make: "Renault",   model: "Koleos",   category: "suv", dimensions: ["225/60R17", "225/55R19"], yearRange: "2017+" },
  { slug: "ssangyong-tivoli",   make: "SsangYong", model: "Tivoli",   category: "suv", dimensions: ["215/60R17", "205/60R16"], yearRange: "2016+" },
  { slug: "subaru-forester",    make: "Subaru",    model: "Forester", category: "suv", dimensions: ["225/60R17", "225/55R18"], yearRange: "2013+" },
  { slug: "subaru-outback",     make: "Subaru",    model: "Outback",  category: "suv", dimensions: ["225/65R17", "225/60R18"], yearRange: "2013+" },
  { slug: "subaru-xv",          make: "Subaru",    model: "XV",       category: "suv", dimensions: ["225/55R17", "225/60R17"], yearRange: "2013+", aliases: ["Crosstrek"] },
  { slug: "suzuki-jimny",       make: "Suzuki",    model: "Jimny",    category: "suv", dimensions: ["195/80R15", "215/75R15"], yearRange: "2018+" },
  { slug: "suzuki-s-cross",     make: "Suzuki",    model: "S-Cross",  category: "suv", dimensions: ["205/60R16", "215/55R17"], yearRange: "2014+" },
  { slug: "suzuki-vitara",      make: "Suzuki",    model: "Vitara",   category: "suv", dimensions: ["215/60R16", "215/55R17"], yearRange: "2015+", aliases: ["Grand Vitara"] },
  { slug: "toyota-4runner",     make: "Toyota",    model: "4Runner",  category: "suv", dimensions: ["265/70R17", "265/65R17"], yearRange: "2010+" },
  { slug: "toyota-corolla-cross", make: "Toyota",  model: "Corolla Cross", category: "suv", dimensions: ["215/60R17", "225/50R18"], yearRange: "2022+" },
  { slug: "toyota-fortuner",    make: "Toyota",    model: "Fortuner", category: "suv", dimensions: ["265/65R17", "265/60R18"], yearRange: "2010+", aliases: ["Hilux SW4"] },
  { slug: "toyota-land-cruiser", make: "Toyota",   model: "Land Cruiser", category: "suv", dimensions: ["285/60R18", "275/65R18"], yearRange: "2010+", aliases: ["Land Cruiser Prado", "Prado VX"] },
  { slug: "toyota-prado",       make: "Toyota",    model: "Prado",    category: "suv", dimensions: ["265/65R17", "265/60R18", "265/55R20"], yearRange: "2010+", aliases: ["Land Cruiser Prado", "Prado TX", "Prado VX"] },
  { slug: "toyota-rav4",        make: "Toyota",    model: "RAV4",     category: "suv", dimensions: ["235/55R19", "225/65R17"], yearRange: "2014+" },
  { slug: "volkswagen-nivus",   make: "Volkswagen", model: "Nivus",   category: "suv", dimensions: ["205/55R17", "205/60R16"], yearRange: "2021+" },
  { slug: "volkswagen-t-cross", make: "Volkswagen", model: "T-Cross", category: "suv", dimensions: ["205/60R16", "215/55R17"], yearRange: "2020+", aliases: ["TCross"] },
  { slug: "volkswagen-taos",    make: "Volkswagen", model: "Taos",    category: "suv", dimensions: ["215/65R17", "225/55R18"], yearRange: "2021+" },
  { slug: "volkswagen-tiguan",  make: "Volkswagen", model: "Tiguan",  category: "suv", dimensions: ["235/55R18", "235/50R19"], yearRange: "2014+" },

  // ── PICKUPS / CAMIONETAS DE TRABAJO ──────────────────────────────────────
  { slug: "chevrolet-d-max",    make: "Chevrolet", model: "D-Max",    category: "camioneta", dimensions: ["255/65R17", "245/70R16"], yearRange: "2010+", aliases: ["DMax"] },
  { slug: "chevrolet-luv",      make: "Chevrolet", model: "Luv",      category: "camioneta", dimensions: ["245/70R16", "265/70R16"], yearRange: "2008+" },
  { slug: "fiat-strada",        make: "Fiat",      model: "Strada",   category: "camioneta", dimensions: ["205/65R15", "215/65R16"], yearRange: "2014+" },
  { slug: "ford-f-150",         make: "Ford",      model: "F-150",    category: "camioneta", dimensions: ["275/65R18", "275/55R20"], yearRange: "2014+", aliases: ["F150"] },
  { slug: "ford-maverick",      make: "Ford",      model: "Maverick", category: "camioneta", dimensions: ["225/65R17", "225/55R18"], yearRange: "2022+" },
  { slug: "ford-ranger",        make: "Ford",      model: "Ranger",   category: "camioneta", dimensions: ["265/65R17", "265/60R18", "255/65R17"], yearRange: "2012+" },
  { slug: "mazda-bt-50",        make: "Mazda",     model: "BT-50",    category: "camioneta", dimensions: ["255/65R17", "245/70R16"], yearRange: "2012+", aliases: ["BT50"] },
  { slug: "mitsubishi-l200",    make: "Mitsubishi", model: "L200",    category: "camioneta", dimensions: ["245/65R17", "265/65R17"], yearRange: "2010+", aliases: ["Triton"] },
  { slug: "nissan-frontier",    make: "Nissan",    model: "Frontier", category: "camioneta", dimensions: ["265/60R18", "265/65R17"], yearRange: "2014+", aliases: ["Navara"] },
  { slug: "nissan-np300",       make: "Nissan",    model: "NP300",    category: "camioneta", dimensions: ["255/65R16", "265/70R16"], yearRange: "2010+" },
  { slug: "renault-alaskan",    make: "Renault",   model: "Alaskan",  category: "camioneta", dimensions: ["255/60R18", "265/60R18"], yearRange: "2018+" },
  { slug: "renault-oroch",      make: "Renault",   model: "Oroch",    category: "camioneta", dimensions: ["215/65R16", "215/60R17"], yearRange: "2016+", aliases: ["Duster Oroch"] },
  { slug: "ssangyong-musso",    make: "SsangYong", model: "Musso",    category: "camioneta", dimensions: ["255/60R18", "245/65R17"], yearRange: "2019+" },
  { slug: "toyota-hilux",       make: "Toyota",    model: "Hilux",    category: "camioneta", dimensions: ["265/65R17", "265/60R18", "255/70R16"], yearRange: "2010+" },
  { slug: "toyota-tacoma",      make: "Toyota",    model: "Tacoma",   category: "camioneta", dimensions: ["265/70R16", "265/65R17", "265/60R18"], yearRange: "2014+" },
  { slug: "volkswagen-amarok",  make: "Volkswagen", model: "Amarok",  category: "camioneta", dimensions: ["245/65R17", "255/55R19"], yearRange: "2012+" },
  { slug: "volkswagen-saveiro", make: "Volkswagen", model: "Saveiro", category: "camioneta", dimensions: ["205/65R15", "175/70R14"], yearRange: "2014+" },

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
