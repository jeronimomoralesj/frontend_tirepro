// =============================================================================
// VEHICLE_DB — Colombian make+model → tire dimensions registry.
//
// Single source of truth for the assistant chat (TireAssistant.tsx) AND
// the marketplace hero's plate-fallback flow (MarketplaceClient hero).
// Whenever a buyer's plate isn't resolved by any backend tier, we drop
// them into a typeahead over this DB so they pick their vehicle by
// name and get the EXACT manufacturer dimensions for that specific
// year — not generic "auto" / "camioneta" fallbacks.
//
// Year-banded variants: same model can have different tire dimensions
// across generations (Toyota Corolla pre-2018 = 205/55R16, post-2019
// = 215/45R17). Entries that have a `variants` array expand into one
// autocomplete row per band, labeled with the year range. Entries
// without `variants` fall back to the flat `dims` array (legacy
// behavior, used by the long tail of less-popular models).
// =============================================================================

export interface VehicleVariant {
  /** First model year covered (inclusive). */
  from: number;
  /** Last model year covered (inclusive). 0 = "presente" (current). */
  to: number;
  /** Tire dimensions for this generation. First entry = most common. */
  dims: string[];
  /** Optional trim label. e.g. "Sport", "XLE", "4x4". */
  trim?: string;
}

export interface VehicleEntry {
  /** Vehicle category — drives our backend's TIRE_MAP `clase` enum. */
  type: string;
  /** Default dims used when no `variants` are defined OR no variant
   *  matches the user-supplied year. */
  dims: string[];
  /** Year-banded breakdown. When present, the picker prefers these
   *  over the flat `dims` array and surfaces each band as its own
   *  autocomplete row. */
  variants?: VehicleVariant[];
}

export const VEHICLE_DB: Record<string, VehicleEntry> = {
  // ── City cars ─────────────────────────────────────────────────────────
  "kia picanto": {
    type: "City car",
    dims: ["165/65R14", "175/65R14"],
    variants: [
      { from: 2011, to: 2017, dims: ["155/70R13", "165/65R14"] },
      { from: 2018, to: 0,    dims: ["165/65R14", "175/65R14"] },
    ],
  },
  "chevrolet spark": {
    type: "City car",
    dims: ["155/80R13", "165/65R14"],
    variants: [
      { from: 2005, to: 2010, dims: ["155/65R13"] },
      { from: 2011, to: 2017, dims: ["155/80R13", "165/65R14"], trim: "Spark / Spark GT" },
      { from: 2018, to: 0,    dims: ["165/65R14", "185/55R15"], trim: "Spark Life / Spark GT" },
    ],
  },
  "renault kwid":  { type: "City car", dims: ["165/70R14"] },
  "suzuki alto":   { type: "City car", dims: ["155/65R14"] },

  // ── Sedans ────────────────────────────────────────────────────────────
  "renault logan": {
    type: "Sedan",
    dims: ["185/65R15", "195/55R16"],
    variants: [
      { from: 2005, to: 2013, dims: ["175/70R13", "185/65R15"], trim: "Logan I" },
      { from: 2014, to: 0,    dims: ["185/65R15", "195/55R16"], trim: "Logan II" },
    ],
  },
  "renault sandero": {
    type: "Hatchback",
    dims: ["185/65R15", "195/55R16"],
    variants: [
      { from: 2009, to: 2014, dims: ["185/65R15"] },
      { from: 2015, to: 0,    dims: ["185/65R15", "195/55R16"] },
    ],
  },
  "chevrolet onix": {
    type: "Sedan",
    dims: ["195/65R15", "205/55R16"],
    variants: [
      { from: 2017, to: 2019, dims: ["195/65R15"], trim: "Joy / LT" },
      { from: 2020, to: 0,    dims: ["195/65R15", "205/55R16"], trim: "RS / Premier" },
    ],
  },
  "kia rio": {
    type: "Sedan",
    dims: ["185/65R15", "195/55R16"],
    variants: [
      { from: 2012, to: 2017, dims: ["185/65R15"] },
      { from: 2018, to: 0,    dims: ["185/65R15", "195/55R16"] },
    ],
  },
  "hyundai accent": { type: "Sedan", dims: ["185/65R15", "195/55R16"] },
  "hyundai i25":    { type: "Sedan", dims: ["185/65R15", "195/55R16"] },
  "toyota corolla": {
    type: "Sedan",
    dims: ["205/55R16", "215/45R17"],
    variants: [
      { from: 2009, to: 2013, dims: ["195/65R15", "205/55R16"], trim: "Corolla X" },
      { from: 2014, to: 2018, dims: ["205/55R16"], trim: "Corolla XI" },
      { from: 2019, to: 0,    dims: ["205/55R16", "215/45R17", "225/40R18"], trim: "Corolla XII" },
    ],
  },
  "mazda 3": {
    type: "Sedan",
    dims: ["205/60R16", "215/45R18"],
    variants: [
      { from: 2014, to: 2018, dims: ["205/60R16", "215/45R18"], trim: "Mazda3 III" },
      { from: 2019, to: 0,    dims: ["215/50R17", "215/45R18"], trim: "Mazda3 IV" },
    ],
  },
  "honda civic": {
    type: "Sedan",
    dims: ["205/55R16", "215/50R17"],
    variants: [
      { from: 2012, to: 2015, dims: ["205/55R16"] },
      { from: 2016, to: 2021, dims: ["215/55R16", "215/50R17", "235/40R18"] },
      { from: 2022, to: 0,    dims: ["215/55R16", "215/50R17", "235/40R18"] },
    ],
  },
  "kia cerato":     { type: "Sedan", dims: ["205/55R16", "215/45R17"] },
  "volkswagen jetta": { type: "Sedan", dims: ["205/55R16", "215/45R17"] },
  "nissan versa":   { type: "Sedan", dims: ["185/65R15", "195/55R16"] },

  // ── Hatchbacks ────────────────────────────────────────────────────────
  "mazda 2":           { type: "Hatchback", dims: ["185/65R15", "195/55R16"] },
  "honda fit":         { type: "Hatchback", dims: ["185/55R16", "175/65R15"] },
  "volkswagen polo":   { type: "Hatchback", dims: ["185/65R15", "195/55R16"] },
  "suzuki swift":      { type: "Hatchback", dims: ["185/55R16", "195/45R17"] },

  // ── SUV / Crossover ───────────────────────────────────────────────────
  "hyundai tucson": {
    type: "SUV",
    dims: ["225/60R17", "235/55R18"],
    variants: [
      { from: 2010, to: 2015, dims: ["225/60R17", "225/55R18"], trim: "ix35" },
      { from: 2016, to: 2020, dims: ["225/60R17", "245/45R19"], trim: "Tucson III" },
      { from: 2021, to: 0,    dims: ["235/65R17", "235/60R18", "235/55R19"], trim: "Tucson NX4" },
    ],
  },
  "kia sportage": {
    type: "SUV",
    dims: ["225/60R17", "235/55R18"],
    variants: [
      { from: 2011, to: 2015, dims: ["225/60R17", "235/55R18"], trim: "Sportage III" },
      { from: 2016, to: 2021, dims: ["225/60R17", "235/55R19"], trim: "Sportage IV" },
      { from: 2022, to: 0,    dims: ["235/65R17", "235/60R18", "235/55R19"], trim: "Sportage V" },
    ],
  },
  "toyota rav4": {
    type: "SUV",
    dims: ["225/65R17", "235/55R18"],
    variants: [
      { from: 2013, to: 2018, dims: ["225/65R17", "235/55R18"], trim: "RAV4 IV" },
      { from: 2019, to: 0,    dims: ["225/65R17", "235/55R19"], trim: "RAV4 V" },
    ],
  },
  "mazda cx-5": {
    type: "SUV",
    dims: ["225/65R17", "225/55R19"],
    variants: [
      { from: 2013, to: 2017, dims: ["225/65R17", "225/55R19"], trim: "CX-5 KE" },
      { from: 2018, to: 0,    dims: ["225/65R17", "225/55R19"], trim: "CX-5 KF" },
    ],
  },
  "nissan qashqai":      { type: "SUV", dims: ["215/65R16", "225/55R18"] },
  "renault duster": {
    type: "SUV",
    dims: ["215/65R16", "215/60R17"],
    variants: [
      { from: 2012, to: 2017, dims: ["215/65R16"], trim: "Duster I" },
      { from: 2018, to: 0,    dims: ["215/60R17", "215/55R17"], trim: "Duster II" },
    ],
  },
  "chevrolet tracker": {
    type: "SUV",
    dims: ["215/55R17", "215/50R18"],
    variants: [
      { from: 2014, to: 2019, dims: ["215/55R17", "215/50R18"], trim: "Tracker I" },
      { from: 2020, to: 0,    dims: ["215/55R17", "215/55R18"], trim: "Tracker II" },
    ],
  },
  "ford escape":         { type: "SUV", dims: ["225/65R17", "235/55R18"] },
  "hyundai creta":       { type: "SUV", dims: ["205/65R16", "215/60R17"] },
  "kia seltos":          { type: "SUV", dims: ["215/60R17", "235/45R18"] },

  // ── Campero / 4x4 ─────────────────────────────────────────────────────
  "toyota prado": {
    type: "Campero",
    dims: ["265/65R17", "265/60R18"],
    variants: [
      { from: 2003, to: 2009, dims: ["265/65R17", "265/60R18"], trim: "Prado 120" },
      { from: 2010, to: 2023, dims: ["265/65R17", "265/60R18", "265/55R19"], trim: "Prado 150" },
      { from: 2024, to: 0,    dims: ["265/65R18", "265/55R20"], trim: "Prado 250" },
    ],
  },
  "toyota fortuner": {
    type: "Campero",
    dims: ["265/65R17", "265/60R18"],
    variants: [
      { from: 2005, to: 2015, dims: ["265/65R17"], trim: "Fortuner I" },
      { from: 2016, to: 0,    dims: ["265/65R17", "265/60R18"], trim: "Fortuner II" },
    ],
  },
  "toyota land cruiser": { type: "Campero", dims: ["265/65R17", "285/60R18"] },
  "nissan patrol":       { type: "Campero", dims: ["265/70R17", "275/60R20"] },
  "chevrolet trailblazer": { type: "Campero", dims: ["265/65R17", "265/60R18"] },
  "ford bronco":         { type: "Campero", dims: ["255/70R16", "265/70R17"] },

  // ── Pickup / Camioneta ────────────────────────────────────────────────
  "toyota hilux": {
    type: "Pickup",
    dims: ["265/65R17", "265/60R18"],
    variants: [
      { from: 2005, to: 2015, dims: ["255/70R16", "265/70R16"], trim: "Hilux VII" },
      { from: 2016, to: 0,    dims: ["265/65R17", "265/60R18"], trim: "Hilux VIII (Revo)" },
    ],
  },
  "nissan frontier": {
    type: "Pickup",
    dims: ["255/70R16", "265/65R17"],
    variants: [
      { from: 2008, to: 2015, dims: ["255/70R16"], trim: "Frontier D40" },
      { from: 2016, to: 0,    dims: ["255/65R17", "265/65R17"], trim: "Frontier D23" },
    ],
  },
  "chevrolet d-max": {
    type: "Pickup",
    dims: ["245/70R16", "265/65R17"],
    variants: [
      { from: 2007, to: 2012, dims: ["245/70R16"], trim: "D-Max I" },
      { from: 2013, to: 0,    dims: ["245/70R16", "255/60R18"], trim: "D-Max II" },
    ],
  },
  "ford ranger": {
    type: "Pickup",
    dims: ["265/65R17", "265/60R18"],
    variants: [
      { from: 2012, to: 2022, dims: ["255/70R16", "265/65R17"], trim: "Ranger T6" },
      { from: 2023, to: 0,    dims: ["265/65R17", "265/60R18"], trim: "Ranger T6.2" },
    ],
  },
  "mitsubishi l200":     { type: "Pickup", dims: ["245/70R16", "265/65R17"] },
  "mazda bt-50":         { type: "Pickup", dims: ["255/70R16", "265/65R17"] },

  // ── Vans ──────────────────────────────────────────────────────────────
  "hyundai h1":          { type: "Van", dims: ["215/70R16", "225/70R16"] },
  "mercedes vito":       { type: "Van", dims: ["225/65R16C", "235/60R17"] },
  "renault kangoo":      { type: "Van", dims: ["185/65R15", "195/65R15"] },

  // ── EVs (Colombian market) ────────────────────────────────────────────
  "nissan leaf": {
    type: "Sedan electrico",
    dims: ["205/55R16", "215/50R17"],
    variants: [
      { from: 2011, to: 2017, dims: ["205/55R16"], trim: "Leaf I" },
      { from: 2018, to: 0,    dims: ["205/55R16", "215/50R17"], trim: "Leaf II" },
    ],
  },
  "byd dolphin":         { type: "Sedan electrico", dims: ["205/55R16", "215/45R17"] },
  "byd atto 3":          { type: "SUV electrico",   dims: ["215/55R18"] },
  "byd song":            { type: "SUV electrico",   dims: ["235/50R19"] },
  "byd yuan plus":       { type: "SUV electrico",   dims: ["215/55R18"] },
  "renault zoe":         { type: "City car",        dims: ["195/55R16", "205/45R17"] },
  "tesla model 3":       { type: "Sedan electrico", dims: ["235/45R18", "235/40R19"] },
  "tesla model y":       { type: "SUV electrico",   dims: ["255/45R19", "255/40R20"] },
  "tesla model s":       { type: "Sedan electrico", dims: ["245/45R19", "265/35R21"] },
  "tesla model x":       { type: "SUV electrico",   dims: ["255/45R20", "265/40R21"] },

  // ── Premium / European ────────────────────────────────────────────────
  "volvo xc40":  { type: "SUV", dims: ["235/55R18", "245/45R19"] },
  "volvo xc60":  { type: "SUV", dims: ["235/55R19", "255/45R20"] },
  "volvo xc90":  { type: "SUV", dims: ["255/50R19", "275/45R20"] },
  "volvo s60":   { type: "Sedan", dims: ["225/50R17", "235/45R18"] },
  "bmw x1":      { type: "SUV", dims: ["225/55R17", "225/50R18"] },
  "bmw x3":      { type: "SUV", dims: ["245/50R19", "245/45R20"] },
  "bmw x5":      { type: "SUV", dims: ["265/50R19", "275/45R20"] },
  "bmw serie 3": { type: "Sedan", dims: ["225/50R17", "225/45R18"] },
  "audi q3":     { type: "SUV", dims: ["215/65R17", "235/55R18"] },
  "audi q5":     { type: "SUV", dims: ["235/60R18", "255/45R20"] },
  "audi a3":     { type: "Sedan", dims: ["225/50R17", "225/45R18"] },
  "audi a4":     { type: "Sedan", dims: ["225/50R17", "245/40R18"] },
  "mercedes glc":      { type: "SUV", dims: ["235/60R18", "255/45R20"] },
  "mercedes gle":      { type: "SUV", dims: ["255/55R19", "275/45R21"] },
  "mercedes clase c":  { type: "Sedan", dims: ["225/50R17", "225/45R18"] },
  "mercedes clase a":  { type: "Sedan", dims: ["225/45R17", "225/40R18"] },
  "jeep wrangler":     { type: "Campero", dims: ["245/75R17", "255/70R18"] },
  "jeep grand cherokee": { type: "SUV", dims: ["265/60R18", "265/50R20"] },
  "jeep renegade":     { type: "SUV", dims: ["215/65R16", "225/55R18"] },
  "subaru forester":   { type: "SUV", dims: ["225/60R17", "225/55R18"] },
  "subaru outback":    { type: "SUV", dims: ["225/60R18", "225/65R17"] },
  "mini cooper":       { type: "Hatchback", dims: ["195/55R16", "205/45R17"] },
  "peugeot 208":       { type: "Hatchback", dims: ["195/55R16", "205/45R17"] },
  "peugeot 2008":      { type: "SUV", dims: ["215/60R17", "215/55R18"] },
  "peugeot 3008":      { type: "SUV", dims: ["225/55R18", "235/55R19"] },
  "citroen c3":        { type: "Hatchback", dims: ["195/65R15", "205/55R16"] },
  "fiat 500":          { type: "City car", dims: ["185/55R15", "195/45R16"] },
  "chery tiggo 4":     { type: "SUV", dims: ["215/55R18", "215/60R17"] },
  "chery tiggo 7":     { type: "SUV", dims: ["225/60R18", "235/55R19"] },
  "jac s3":            { type: "SUV", dims: ["205/55R17", "215/55R17"] },
  "great wall haval h6": { type: "SUV", dims: ["225/60R18", "235/55R19"] },
  "mg zs":             { type: "SUV", dims: ["215/55R17", "215/50R18"] },
  "mg hs":             { type: "SUV", dims: ["225/55R19", "235/50R19"] },
  "ssangyong rexton":  { type: "SUV", dims: ["265/60R18", "255/55R19"] },
  "ssangyong tivoli":  { type: "SUV", dims: ["215/60R17", "225/45R18"] },
  "dfsk glory 580":    { type: "SUV", dims: ["225/60R18", "215/60R17"] },

  // ── Motorcycles ───────────────────────────────────────────────────────
  "honda cb190":       { type: "Motocicleta", dims: ["120/80-17", "100/80-17"] },
  "yamaha fz":         { type: "Motocicleta", dims: ["140/60R17", "100/80-17"] },
  "bajaj pulsar":      { type: "Motocicleta", dims: ["130/70-17", "100/80-17"] },
  "suzuki gixxer":     { type: "Motocicleta", dims: ["140/60R17", "100/80-17"] },
  "honda navi":        { type: "Motocicleta", dims: ["120/80-12", "90/90-12"] },
  "yamaha nmax":       { type: "Scooter",     dims: ["130/70-13", "110/70-13"] },
  "akt ak125":         { type: "Motocicleta", dims: ["90/90-18", "2.75-18"] },

  // ── Trucks ────────────────────────────────────────────────────────────
  "chevrolet nhr":     { type: "Camion liviano", dims: ["7.00R16", "7.50R16"] },
  "chevrolet nqr":     { type: "Camion mediano", dims: ["215/75R17.5", "235/75R17.5"] },
  "hino fc":           { type: "Camion mediano", dims: ["215/75R17.5", "235/75R17.5"] },
  "hino 500":          { type: "Camion pesado",  dims: ["295/80R22.5", "11R22.5"] },
  "jac x350":          { type: "Camion mediano", dims: ["215/75R17.5", "235/75R17.5"] },
  "hyundai hd65":      { type: "Camion liviano", dims: ["7.00R16", "7.50R16"] },
  "hyundai hd45":      { type: "Camion liviano", dims: ["7.00R16", "7.50R16"] },
  "foton aumark":      { type: "Camion liviano", dims: ["7.00R16", "7.50R16"] },
  "jmc carrying":      { type: "Camion liviano", dims: ["7.00R16", "7.50R16"] },

  // ── Tractomulas ───────────────────────────────────────────────────────
  "kenworth t680":            { type: "Tractomula", dims: ["295/80R22.5", "11R22.5", "315/80R22.5"] },
  "kenworth t800":            { type: "Tractomula", dims: ["295/80R22.5", "11R22.5", "12R22.5"] },
  "freightliner cascadia":    { type: "Tractomula", dims: ["295/80R22.5", "11R22.5", "315/80R22.5"] },
  "international lt":         { type: "Tractomula", dims: ["295/80R22.5", "11R22.5"] },
  "international prostar":    { type: "Tractomula", dims: ["295/80R22.5", "11R22.5"] },
  "mack anthem":              { type: "Tractomula", dims: ["295/80R22.5", "11R22.5"] },
  "volvo fh":                 { type: "Tractomula", dims: ["295/80R22.5", "315/80R22.5"] },
  "scania r":                 { type: "Tractomula", dims: ["295/80R22.5", "315/80R22.5"] },

  // ── Volquetas ─────────────────────────────────────────────────────────
  "kenworth t800 volqueta":   { type: "Volqueta", dims: ["12R24.5", "11R24.5", "315/80R22.5"] },
  "international 7600":       { type: "Volqueta", dims: ["12R24.5", "11R24.5"] },
  "mack granite":             { type: "Volqueta", dims: ["12R24.5", "11R24.5"] },

  // ── Buses ─────────────────────────────────────────────────────────────
  "mercedes of":              { type: "Bus", dims: ["275/80R22.5", "295/80R22.5"] },
  "mercedes o500":            { type: "Bus", dims: ["295/80R22.5", "275/80R22.5"] },
  "marcopolo":                { type: "Bus", dims: ["295/80R22.5", "275/80R22.5"] },
  "chevrolet lv150":          { type: "Bus urbano", dims: ["215/75R17.5", "235/75R17.5"] },
  "hino ak":                  { type: "Bus", dims: ["275/80R22.5", "295/80R22.5"] },
};

/** Maps a vehicle category to the upstream backend's `clase` enum. */
export const VEHICLE_TYPE_TO_CLASE: Record<string, string> = {
  "City car":         "AUTOMOVIL",
  "Sedan":            "AUTOMOVIL",
  "Hatchback":        "AUTOMOVIL",
  "Sedan electrico":  "AUTOMOVIL",
  "SUV":              "CAMPERO",
  "SUV electrico":    "CAMPERO",
  "Campero":          "CAMPERO",
  "Pickup":           "CAMIONETA",
  "Van":              "FURGON",
  "Motocicleta":      "MOTOCICLETA",
  "Scooter":          "MOTOCICLETA",
  "Camion liviano":   "CAMION",
  "Camion mediano":   "CAMION",
  "Camion pesado":    "CAMION",
  "Tractomula":       "TRACTOMULA",
  "Volqueta":         "VOLQUETA",
  "Bus":              "BUS",
  "Bus urbano":       "BUS",
};

/** Resolve a free-text vehicle description to one of our DB entries
 *  (legacy single-row helper used by the chat assistant). */
export function findVehicleDims(input: string): { match: string; type: string; dims: string[] } | null {
  const q = input.toLowerCase().trim();
  if (!q) return null;
  if (VEHICLE_DB[q]) return { match: q, type: VEHICLE_DB[q].type, dims: VEHICLE_DB[q].dims };
  for (const [key, val] of Object.entries(VEHICLE_DB)) {
    if (key.includes(q) || q.includes(key)) return { match: key, type: val.type, dims: val.dims };
  }
  for (const [key, val] of Object.entries(VEHICLE_DB)) {
    const words = q.split(/\s+/);
    if (words.some(w => w.length >= 3 && key.includes(w))) return { match: key, type: val.type, dims: val.dims };
  }
  return null;
}

/** One row in the autocomplete dropdown. */
export interface VehicleSuggestion {
  /** Internal key (the make-model in lowercase). */
  key: string;
  /** Display label, e.g. "Toyota Hilux 2016 - presente". */
  label: string;
  /** Vehicle category from the DB. */
  type: string;
  /** Tire dimensions for this specific year band (or all years for legacy entries). */
  dims: string[];
  /** Year band — null when the entry has no year-banded variants. */
  yearFrom?: number;
  yearTo?: number;
  /** Optional trim label. */
  trim?: string;
}

/** Score-rank typeahead matches, expanding multi-variant entries into
 *  one suggestion per year band. */
export function searchVehicles(query: string, limit = 8): VehicleSuggestion[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const out: Array<VehicleSuggestion & { score: number }> = [];

  function scoreFor(key: string): number {
    if (key === q) return 100;
    if (key.startsWith(q)) return 80;
    if (key.includes(q)) return 60;
    const words = q.split(/\s+/).filter((w) => w.length >= 2);
    const hits = words.filter((w) => key.includes(w)).length;
    return hits === 0 ? 0 : 30 + hits * 10;
  }

  function titleCase(key: string): string {
    return key.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  for (const [key, val] of Object.entries(VEHICLE_DB)) {
    const score = scoreFor(key);
    if (score === 0) continue;
    const baseLabel = titleCase(key);
    if (val.variants && val.variants.length > 0) {
      // Newest variants first — most buyers search the latest gen.
      const sortedVariants = [...val.variants].sort((a, b) => b.from - a.from);
      for (const v of sortedVariants) {
        const yearLabel = v.to === 0 ? `${v.from} - presente` : `${v.from} - ${v.to}`;
        const trimLabel = v.trim ? ` (${v.trim})` : "";
        out.push({
          key,
          label:    `${baseLabel} ${yearLabel}${trimLabel}`,
          type:     val.type,
          dims:     v.dims,
          yearFrom: v.from,
          yearTo:   v.to,
          trim:     v.trim,
          score,
        });
      }
    } else {
      out.push({
        key,
        label: baseLabel,
        type:  val.type,
        dims:  val.dims,
        score,
      });
    }
  }

  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...row }) => row); // eslint-disable-line @typescript-eslint/no-unused-vars
}
