// =============================================================================
// /glosario/[term] — knowledge base for the TirePro tire glossary.
//
// Each entry powers:
//   - /glosario/<slug> (DefinedTerm + FAQPage + BreadcrumbList JSON-LD,
//     visible H1, long-form definition, examples, related terms,
//     cross-links into the marketplace).
//   - /glosario index (DefinedTermSet JSON-LD, grouped list).
//   - sitemap.ts (one entry per term).
//
// SEO design:
//   - Each term targets a single Spanish-language tire query
//     ("¿qué es CPK en llantas?", "indice de carga llantas tabla", etc.)
//   - The `definition` body is ≥2 paragraphs so Google's Helpful Content
//     filter doesn't flag the page as thin.
//   - `faqs` mirrors the FAQPage JSON-LD verbatim for AI overview lifts.
//   - `relatedTerms` builds an internal-link mesh between glossary
//     entries — important for PageRank within the entity hub.
//   - `marketplaceLinks` lets each glossary page funnel commercial
//     intent down to the actual marketplace.
// =============================================================================

export type GlossaryCategory =
  | "medidas"     // dimensions, sizing, ratings stamped on the sidewall
  | "tecnologia"  // construction, technology features
  | "mantenimiento" // care, lifecycle operations
  | "comercial"   // purchase, lifecycle decisions
  | "seguridad"   // performance, safety properties
  | "tipos";      // tire types / classes

export interface GlossaryFaq { q: string; a: string }

export interface GlossaryTerm {
  slug: string;
  name: string;
  shortDef: string;
  definition: string;
  category: GlossaryCategory;
  synonyms?: string[];
  examples?: string[];
  relatedTerms?: string[];
  marketplaceLinks?: Array<{ label: string; href: string }>;
  faqs?: GlossaryFaq[];
}

export const GLOSSARY_CATEGORIES: Record<GlossaryCategory, string> = {
  medidas:        "Medidas y nomenclatura",
  tecnologia:     "Tecnología y construcción",
  mantenimiento:  "Mantenimiento y cuidado",
  comercial:      "Compra y vida útil",
  seguridad:      "Desempeño y seguridad",
  tipos:          "Tipos de llantas",
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: "reencauche",
    name: "Reencauche",
    shortDef:
      "Proceso industrial certificado que renueva la banda de rodamiento de una llanta cuyo casco está en buen estado.",
    definition:
      "El reencauche es un proceso industrial de renovación de llantas: se inspecciona el casco original, se elimina la banda de rodamiento desgastada y se aplica una banda nueva mediante vulcanización en frío (proceso pre-cured) o vulcanización en caliente (proceso mold-cure). Una llanta reencauchada certificada conserva las propiedades estructurales del casco y entrega un kilometraje similar al de una llanta nueva equivalente, a un costo significativamente menor.\n\nEn Colombia, el reencauche es estándar en flotas pesadas (tractomula, camión, bus): permite reducir el costo por kilómetro (CPK) hasta un 40% comparado con llanta nueva. Cada casco puede reencaucharse 1 a 3 veces dependiendo de su estado estructural — sin grietas, sin separaciones internas y dentro de los DOT máximos definidos por el reencauchador.",
    category: "tipos",
    synonyms: ["llanta reencauchada", "retread", "renovación de llantas"],
    examples: [
      "Una llanta de tractomula 295/80R22.5 reencauchada cuesta 35-45% menos que una nueva equivalente.",
      "El proceso pre-cured aplica una banda pre-vulcanizada — más común en Colombia para flota pesada.",
    ],
    relatedTerms: ["cpk", "casco-de-la-llanta", "rtd", "vida-util-de-llanta"],
    marketplaceLinks: [
      { label: "Llantas reencauchadas en Colombia", href: "/marketplace/categoria/reencauche" },
      { label: "Llantas para tractomula", href: "/marketplace/categoria/tractomula" },
    ],
    faqs: [
      { q: "¿Qué es una llanta reencauchada?",
        a: "Es una llanta cuyo casco original ha sido reaprovechado: se le aplica una banda de rodamiento nueva mediante vulcanización certificada. Rinde como una nueva en muchas aplicaciones a menor costo." },
      { q: "¿Cuántas veces se puede reencauchar una llanta?",
        a: "Entre 1 y 3 veces, dependiendo del estado del casco. Llantas de marcas premium con casco bien mantenido suelen aceptar 2-3 reencauches; cascos dañados se descartan en la inspección inicial." },
      { q: "¿Qué garantía tiene una llanta reencauchada en TirePro?",
        a: "Todas las llantas reencauchadas vendidas en TirePro Marketplace cuentan con garantía sobre el proceso de reencauche y la integridad del casco, emitida por el distribuidor reencauchador certificado." },
    ],
  },
  {
    slug: "cpk",
    name: "CPK (Costo por kilómetro)",
    shortDef:
      "Métrica que divide el costo total de una llanta entre los kilómetros que recorre antes de su reemplazo.",
    definition:
      "El CPK (Costo Por Kilómetro) es la métrica fundamental para comparar la rentabilidad de llantas en flotas. Se calcula dividiendo el precio de adquisición de la llanta entre los kilómetros que recorre hasta su descarte (o hasta el primer reencauche, según convenga). Una llanta cara que rinde mucho puede tener un CPK menor que una barata que rinde poco.\n\nPara flotas pesadas, el CPK típicamente se rastrea por marca, modelo, dimensión y posición del eje (dirección, tracción, libre, remolque). TirePro registra automáticamente el CPK de cada llanta inspeccionada en sus operaciones para que el comprador pueda elegir la opción óptima en función de datos reales, no de marketing.",
    category: "comercial",
    synonyms: ["costo por kilómetro", "cost per mile", "CPM"],
    examples: [
      "Llanta de $2.000.000 que rinde 100.000 km → CPK = $20/km.",
      "Llanta de $1.200.000 que rinde 50.000 km → CPK = $24/km (peor rentabilidad pese al menor precio).",
    ],
    relatedTerms: ["reencauche", "vida-util-de-llanta", "rtd", "rotacion-de-llantas"],
    marketplaceLinks: [
      { label: "Calculadora de CPK", href: "/calculadora" },
      { label: "Catálogo con CPK", href: "/marketplace" },
    ],
    faqs: [
      { q: "¿Cómo se calcula el CPK de una llanta?",
        a: "CPK = (precio de la llanta) ÷ (kilómetros recorridos al descarte). Para flotas se suele incluir también el costo de reencauches sumados al casco." },
      { q: "¿Qué CPK es bueno para tractomula en Colombia?",
        a: "En llantas premium nuevas, un CPK entre $15-25 por kilómetro se considera competitivo. Con reencauche el rango se ajusta a $8-15." },
    ],
  },
  {
    slug: "rtd",
    name: "RTD (Profundidad de banda)",
    shortDef:
      "Profundidad remanente de la banda de rodamiento, medida en milímetros (Remaining Tread Depth).",
    definition:
      "El RTD (Remaining Tread Depth) es la profundidad remanente de los surcos de la banda de rodamiento, medida en milímetros con una galga (depth gauge). Es el indicador principal del desgaste de una llanta y de cuándo debe reemplazarse o reencauchar­se.\n\nEn Colombia, el código nacional de tránsito exige que las llantas tengan al menos 1.6 mm de RTD para circular legalmente; por debajo de ese valor se incurre en multa y la frenada en mojado se ve seriamente comprometida. Las flotas profesionales suelen retirar las llantas mucho antes — entre 3 y 5 mm dependiendo del eje — para enviarlas a reencauche con casco aún sano.",
    category: "mantenimiento",
    synonyms: ["profundidad de banda", "tread depth", "profundidad remanente"],
    examples: [
      "Llanta nueva de pasajero: RTD ~8-10 mm.",
      "Llanta de carga nueva: RTD ~16-20 mm.",
      "Mínimo legal en Colombia: 1.6 mm.",
    ],
    relatedTerms: ["banda-de-rodamiento", "vida-util-de-llanta", "reencauche", "cpk"],
    faqs: [
      { q: "¿Cuál es el RTD mínimo legal en Colombia?",
        a: "1.6 mm. Por debajo de ese valor la llanta no es legal para circular y la frenada en mojado pierde efectividad." },
      { q: "¿Cómo se mide el RTD?",
        a: "Con una galga de profundidad apoyada perpendicular a la banda, midiendo en los surcos principales en al menos 3 puntos de la circunferencia." },
    ],
  },
  {
    slug: "indice-de-carga",
    name: "Índice de carga",
    shortDef:
      "Número estampado en el flanco que indica la carga máxima que la llanta soporta a su presión nominal.",
    definition:
      "El índice de carga es un número estampado en el flanco de la llanta (ej. 109 en \"205/55R16 91V\" o 152/148L en una 295/80R22.5) que se traduce, vía tabla ISO, a una carga máxima admisible en kilogramos a la presión nominal de inflado.\n\nUsar una llanta con un índice de carga inferior al especificado por el fabricante del vehículo o por la legislación de transporte de carga es ilegal y peligroso: el flanco se sobrecarga, eleva su temperatura y puede explotar en autopista. En vehículos de carga colombianos, el índice de carga se verifica en la revisión técnico-mecánica y debe coincidir o exceder lo registrado en la tarjeta de propiedad.",
    category: "medidas",
    synonyms: ["load index", "LI"],
    examples: [
      "91 → 615 kg por llanta a presión nominal.",
      "109 → 1.030 kg por llanta.",
      "152 → 3.550 kg por llanta (típico tractomula).",
    ],
    relatedTerms: ["indice-de-velocidad", "psi", "flanco", "dimension-llanta"],
    faqs: [
      { q: "¿Dónde encuentro el índice de carga de mi llanta?",
        a: "Estampado en el flanco, junto al índice de velocidad. Por ejemplo en \"205/55R16 91V\", el 91 es el índice de carga." },
      { q: "¿Puedo usar una llanta con índice de carga mayor al recomendado?",
        a: "Sí. Igual o mayor es seguro. Menor al especificado por el fabricante es ilegal y peligroso." },
    ],
  },
  {
    slug: "indice-de-velocidad",
    name: "Índice de velocidad",
    shortDef:
      "Letra estampada en el flanco que indica la velocidad máxima sostenida que la llanta tolera.",
    definition:
      "El índice de velocidad es la letra (A1 a Y, pasando por T, H, V, W) que sigue al índice de carga en el flanco — por ejemplo \"205/55R16 91V\" tiene índice V. Cada letra corresponde a una velocidad máxima de servicio sostenida según la tabla ISO 4000.\n\nEn aplicaciones de pasajero a alta velocidad (autopistas con velocidad de 110-140 km/h), elegir una llanta con índice de velocidad inferior al recomendado por el fabricante puede provocar separación de la banda por temperatura. Las flotas pesadas operan a velocidades menores y por eso suelen aceptar índices L (120 km/h) o M (130 km/h) sin riesgo.",
    category: "medidas",
    synonyms: ["speed rating", "speed index"],
    examples: [
      "L: 120 km/h (típico camión y tractomula)",
      "T: 190 km/h (carros utilitarios)",
      "H: 210 km/h (sedan medio)",
      "V: 240 km/h (deportivo)",
      "W: 270 km/h (deportivo alto rendimiento)",
    ],
    relatedTerms: ["indice-de-carga", "dimension-llanta", "flanco"],
    faqs: [
      { q: "¿Qué pasa si uso una llanta con índice de velocidad inferior?",
        a: "A velocidades sostenidas superiores al límite, la llanta acumula temperatura, debilita el casco y puede sufrir separación de banda. Es peligroso." },
    ],
  },
  {
    slug: "dot",
    name: "DOT (Fecha de fabricación)",
    shortDef:
      "Código grabado en el flanco que indica el lugar y la semana/año de fabricación de la llanta.",
    definition:
      "El código DOT es un sello obligatorio del Department of Transportation de los EE. UU. que identifica el lugar y la fecha exacta en que se fabricó cada llanta. Los últimos 4 dígitos indican la semana y el año (ej. DOT 2723 = semana 27 de 2023). Los primeros caracteres identifican la planta y el lote.\n\nEn Colombia, el DOT es la herramienta principal para verificar que una llanta no esté almacenada en exceso. Las marcas premium garantizan rendimiento óptimo durante 5-6 años desde la fecha del DOT, almacenadas correctamente. Comprar llantas con DOT mayor a 2 años a precio de \"nueva\" es una práctica común en mercados grises que TirePro filtra mostrando el DOT a la vista del comprador.",
    category: "medidas",
    synonyms: ["código DOT", "fecha de fabricación", "DOT date"],
    examples: [
      "DOT XXXX 2725 → fabricada en la semana 27 de 2025.",
      "DOT XXXX 0824 → fabricada en la semana 8 de 2024.",
    ],
    relatedTerms: ["flanco", "vida-util-de-llanta"],
    faqs: [
      { q: "¿Cómo leer el DOT de una llanta?",
        a: "Los últimos 4 dígitos son la semana y el año. \"2723\" significa semana 27 de 2023. Si solo hay 3 dígitos, la llanta es anterior al 2000 y debe descartarse." },
      { q: "¿Cuánto dura una llanta nueva almacenada?",
        a: "Las marcas premium garantizan rendimiento óptimo hasta 5-6 años desde el DOT, siempre que se haya almacenado en lugar fresco, seco y sin luz UV." },
    ],
  },
  {
    slug: "flanco",
    name: "Flanco (Sidewall)",
    shortDef:
      "Pared lateral de la llanta entre la banda de rodamiento y el rin.",
    definition:
      "El flanco o sidewall es la pared lateral de la llanta. Soporta la mayoría de la flexión durante el rodamiento y el peso del vehículo. En su superficie van estampados todos los datos identificadores: marca, modelo, dimensión, índice de carga, índice de velocidad, DOT, número de telas (plies) y composición (tubeless / tube type).\n\nUn flanco dañado por golpe contra hueco o reborde de andén nunca se debe reparar; se reemplaza la llanta. Las grietas, abolladuras y burbujas en el flanco son señal de daño estructural y de riesgo de explosión.",
    category: "tecnologia",
    synonyms: ["sidewall", "pared lateral", "costado de la llanta"],
    relatedTerms: ["banda-de-rodamiento", "casco-de-la-llanta", "dimension-llanta"],
    faqs: [
      { q: "¿Se puede reparar un flanco golpeado?",
        a: "No. Una grieta, abolladura o protuberancia en el flanco indica daño estructural irreparable — la llanta se reemplaza completa." },
    ],
  },
  {
    slug: "banda-de-rodamiento",
    name: "Banda de rodamiento",
    shortDef:
      "Capa exterior de caucho que está en contacto con el pavimento y aporta el agarre.",
    definition:
      "La banda de rodamiento (tread) es la capa exterior de la llanta que toca el pavimento. Su diseño de surcos, ranuras y bloques determina el agarre en seco, en mojado, en barro y en nieve, además de la evacuación de agua en hidroplaneo.\n\nEl compuesto de caucho de la banda balancea agarre vs. resistencia al desgaste — bandas blandas agarran mejor pero rinden menos kilómetros, bandas duras rinden más pero pierden agarre en mojado. Las llantas reencauchadas reciben una banda nueva sobre el casco original.",
    category: "tecnologia",
    synonyms: ["tread", "rodamiento", "banda"],
    relatedTerms: ["rtd", "reencauche", "tipos-de-terreno", "hidroplaneo"],
  },
  {
    slug: "casco-de-la-llanta",
    name: "Casco (Carcaza)",
    shortDef:
      "Estructura interna de la llanta que soporta la presión y el peso.",
    definition:
      "El casco o carcaza es la estructura textil-metálica interna de una llanta: capas de telas (poliéster, nylon, rayón) y cinturones de acero embebidos en caucho que dan rigidez radial y soportan la presión de inflado y la carga del vehículo.\n\nEn llantas radiales modernas, el casco es la parte más cara de fabricar y es la que se reaprovecha en el reencauche. Un casco bien mantenido (sin sobrecargas, sin impactos en huecos, sin bajas presiones prolongadas) puede reencaucharse 2-3 veces, multiplicando el valor económico de la llanta.",
    category: "tecnologia",
    synonyms: ["carcaza", "casing", "carcasa"],
    relatedTerms: ["reencauche", "flanco", "llanta-radial"],
  },
  {
    slug: "psi",
    name: "PSI (Presión de inflado)",
    shortDef:
      "Unidad de presión de aire dentro de la llanta — Pounds per Square Inch.",
    definition:
      "El PSI (Pounds per Square Inch) es la unidad estándar para la presión de inflado de una llanta. Cada vehículo tiene una presión recomendada por el fabricante, normalmente impresa en una placa en el marco de la puerta del conductor. La presión correcta optimiza el agarre, el desgaste uniforme y el consumo de combustible.\n\nUna llanta sub-inflada flexa más, calienta el flanco y aumenta el consumo hasta un 5%. Una llanta sobre-inflada reduce la huella de contacto, agarra peor en mojado y se desgasta por el centro. En Colombia, las flotas pesadas verifican PSI a diario antes del primer rodaje del día.",
    category: "mantenimiento",
    synonyms: ["presión de inflado", "presion de aire", "tire pressure"],
    examples: [
      "Auto compacto: 30-32 PSI",
      "Camioneta: 35-40 PSI",
      "Tractomula: 100-120 PSI",
    ],
    relatedTerms: ["tpms", "balanceo", "rotacion-de-llantas", "vida-util-de-llanta"],
    faqs: [
      { q: "¿Con qué frecuencia debo revisar la presión de mis llantas?",
        a: "Una vez al mes para vehículos de pasajeros, diariamente para vehículos de carga pesada. La presión se mide siempre en frío, antes de rodar." },
      { q: "¿Qué presión debo usar?",
        a: "La indicada por el fabricante en la placa de la puerta del conductor. No la presión máxima estampada en el flanco de la llanta — esa es el límite, no la recomendación." },
    ],
  },
  {
    slug: "alineacion",
    name: "Alineación",
    shortDef:
      "Ajuste de los ángulos de las ruedas (camber, caster, toe) para que rueden paralelas al chasis.",
    definition:
      "La alineación es el ajuste de los ángulos geométricos de las ruedas — camber (inclinación lateral), caster (inclinación del eje de dirección) y toe (apertura/cierre) — para que las llantas rueden paralelas al chasis y entre sí. Es indispensable después de un golpe contra hueco, cambio de amortiguadores, terminales, mesa de suspensión o juego de llantas.\n\nUna alineación incorrecta produce desgaste en banda interna o externa de la llanta, deriva en la dirección, vibración y mayor consumo. En Colombia se recomienda alinear cada 10.000 km o tras cualquier impacto contra obstáculo.",
    category: "mantenimiento",
    synonyms: ["alineamiento", "alignment"],
    relatedTerms: ["balanceo", "rotacion-de-llantas", "vida-util-de-llanta"],
    faqs: [
      { q: "¿Cada cuánto debo alinear mi vehículo?",
        a: "Cada 10.000 km, al cambiar llantas, después de cualquier golpe contra hueco o si notas que la dirección se ladea sola." },
    ],
  },
  {
    slug: "balanceo",
    name: "Balanceo",
    shortDef:
      "Igualación del peso de la llanta + rin sobre el eje para eliminar vibraciones.",
    definition:
      "El balanceo es el procedimiento que iguala el peso de cada conjunto llanta-rin alrededor de su eje de rotación. Se realiza con una balanceadora que detecta los desequilibrios y guía al técnico para colocar contrapesos en el aro hasta que la rueda gire sin vibración.\n\nUna rueda mal balanceada produce vibración en el volante (eje delantero) o en el asiento (eje trasero) a partir de 80 km/h, además de desgaste irregular de la banda y fatiga prematura de los amortiguadores. El balanceo se realiza siempre que se monta una llanta nueva, después de una pinchada o cada 15.000-20.000 km.",
    category: "mantenimiento",
    synonyms: ["balancing", "balanceo de ruedas"],
    relatedTerms: ["alineacion", "rotacion-de-llantas"],
  },
  {
    slug: "rotacion-de-llantas",
    name: "Rotación de llantas",
    shortDef:
      "Cambio sistemático de posición de las llantas para igualar el desgaste entre los 4 vehículos.",
    definition:
      "La rotación de llantas es el cambio sistemático de posición — adelante atrás y/o lado a lado — de las cuatro llantas de un vehículo, según un patrón definido por el fabricante. Iguala el desgaste entre las cuatro y maximiza la vida útil del juego completo.\n\nEn vehículos de tracción delantera el desgaste es mayor en las delanteras, en tracción trasera o 4x4 puede ser parejo o invertido. Se recomienda rotar cada 8.000-10.000 km. En flotas pesadas, la rotación entre direcciones, tracciones y libres también optimiza el rendimiento — TirePro registra la posición histórica de cada llanta para recomendar la próxima rotación.",
    category: "mantenimiento",
    synonyms: ["rotación", "rotation", "rotación de neumáticos"],
    relatedTerms: ["alineacion", "balanceo", "cpk", "vida-util-de-llanta"],
  },
  {
    slug: "tpms",
    name: "TPMS",
    shortDef:
      "Sistema electrónico que monitorea en tiempo real la presión de cada llanta.",
    definition:
      "El TPMS (Tire Pressure Monitoring System) es un sistema electrónico estándar en vehículos modernos (obligatorio en USA desde 2007) que monitorea la presión de cada llanta y dispara un testigo en el tablero cuando una baja de su rango de servicio.\n\nExisten dos variantes: directo (sensor dentro de cada rueda que reporta presión exacta) e indirecto (mide diferencias de revolución por ABS para inferir presión baja). Al cambiar llantas en un vehículo con TPMS directo, los sensores deben re-emparejarse o reemplazarse — un costo a considerar al evaluar el cambio del juego.",
    category: "tecnologia",
    synonyms: ["sistema de monitoreo de presión", "Tire Pressure Monitoring System"],
    relatedTerms: ["psi", "balanceo"],
  },
  {
    slug: "tubeless",
    name: "Tubeless (Sin cámara)",
    shortDef:
      "Llanta diseñada para sellar contra el rin sin necesidad de una cámara interna de aire.",
    definition:
      "Una llanta tubeless está diseñada para retener el aire sin una cámara interna: el flanco interior tiene una capa selladora (innerliner) y el talón se ajusta sobre un canal específico del rin. La mayoría de las llantas radiales modernas son tubeless.\n\nLas llantas con cámara (tube type) sobreviven principalmente en aplicaciones agrícolas, motos antiguas y algunas dimensiones de carga muy específicas. Una llanta tubeless es más segura ante pinchada (pierde aire gradualmente, no súbito) y permite reparación con mecha sin desmontar.",
    category: "tecnologia",
    synonyms: ["sin cámara"],
    relatedTerms: ["llanta-radial", "casco-de-la-llanta"],
  },
  {
    slug: "run-flat",
    name: "Run-flat",
    shortDef:
      "Llanta con flanco reforzado que permite rodar a velocidad reducida tras una pinchada.",
    definition:
      "Una llanta run-flat tiene un flanco reforzado (auto-soportado) o un soporte interno que permite seguir rodando entre 80 y 200 km a velocidad reducida (~80 km/h) después de perder toda la presión, sin colapsar el flanco. Es estándar en algunos modelos premium europeos.\n\nVentajas: elimina la rueda de repuesto, mejora la seguridad después de pinchada en autopista. Desventajas: viaje más rígido, mayor peso (impacta consumo), costo más alto, y al volverse a inflar requiere inspección estricta (no siempre se puede reparar).",
    category: "tecnologia",
    synonyms: ["RFT", "Self Supporting Tire"],
    relatedTerms: ["flanco", "tubeless"],
  },
  {
    slug: "llanta-radial",
    name: "Llanta radial",
    shortDef:
      "Llanta donde las telas del casco se disponen perpendiculares al sentido de rodaje.",
    definition:
      "Una llanta radial tiene las telas del casco dispuestas perpendiculares al eje de rodaje (a 90°) y refuerzos diagonales (cinturones) por debajo de la banda. Esta arquitectura ofrece menor resistencia al rodamiento, mayor durabilidad de la banda y mejor agarre comparada con la construcción diagonal (bias-ply).\n\nDesde los años 80, prácticamente todas las llantas de pasajero, camioneta, camión y tractomula son radiales. La marca radial se identifica con la letra \"R\" en la dimensión: \"205/55R16\" o \"295/80R22.5\".",
    category: "tipos",
    synonyms: ["radial", "construcción radial"],
    relatedTerms: ["llanta-diagonal", "casco-de-la-llanta", "dimension-llanta"],
  },
  {
    slug: "llanta-diagonal",
    name: "Llanta diagonal (Bias-ply)",
    shortDef:
      "Llanta con telas del casco dispuestas en cruz a un ángulo de 30-40° respecto al rodaje.",
    definition:
      "Una llanta diagonal o bias-ply tiene las telas del casco dispuestas en cruz a un ángulo de 30°-40° respecto al sentido de rodaje. Es la arquitectura más antigua, hoy reservada a aplicaciones agrícolas, industriales pesadas y algunos remolques agrícolas.\n\nVentajas: flanco más rígido (mejor para terreno accidentado), menor costo de fabricación. Desventajas: mayor resistencia al rodamiento (más consumo), banda y flanco se deforman juntos al frenar (peor agarre), menor vida útil. Se identifica por una letra \"D\" o por la ausencia de \"R\" en la dimensión.",
    category: "tipos",
    synonyms: ["bias-ply", "convencional"],
    relatedTerms: ["llanta-radial", "casco-de-la-llanta"],
  },
  {
    slug: "llanta-de-tractomula",
    name: "Llanta de tractomula",
    shortDef:
      "Llanta diseñada para tractocamiones con dimensiones típicas 295/80R22.5 o 11R22.5.",
    definition:
      "Una llanta de tractomula está diseñada para soportar las cargas y velocidades de un tractocamión: 152-156 índice de carga, 100-120 PSI de presión nominal, dimensiones típicas 295/80R22.5, 11R22.5 o 315/80R22.5 según configuración del eje.\n\nSe especifican por posición — dirección (banda lisa, surcos longitudinales para estabilidad), tracción (tacos profundos para agarre en arranque), libre (intermedio), remolque (muy resistente al desgaste por arrastre). Cada posición tiene un modelo óptimo y un patrón de rotación distinto.",
    category: "tipos",
    synonyms: ["llanta de tracto", "llanta truck", "llanta de carga pesada"],
    relatedTerms: ["llanta-de-bus", "indice-de-carga", "reencauche", "rotacion-de-llantas"],
    marketplaceLinks: [
      { label: "Llantas para tractomula en Colombia", href: "/marketplace/categoria/tractomula" },
    ],
  },
  {
    slug: "llanta-de-bus",
    name: "Llanta de bus",
    shortDef:
      "Llanta para transporte de pasajeros con énfasis en confort, durabilidad y bajo ruido.",
    definition:
      "Una llanta de bus (urban bus, intermunicipal o turismo) prioriza confort de marcha, bajo nivel de ruido, alta resistencia al desgaste por carga frecuente y tolerancia a las altas temperaturas operativas (paradas frecuentes, frenadas continuas). Las dimensiones más comunes son 275/70R22.5, 295/80R22.5 y 11R22.5.\n\nEn Colombia, las flotas de transporte público (TransMilenio, busetas) operan con llantas de bus reencauchadas para reducir CPK — un solo bus puede consumir más de 24 llantas al año entre las 6-12 ruedas y la rotación.",
    category: "tipos",
    relatedTerms: ["llanta-de-tractomula", "reencauche", "cpk"],
    marketplaceLinks: [
      { label: "Llantas para bus en Colombia", href: "/marketplace/categoria/bus" },
    ],
  },
  {
    slug: "llanta-all-season",
    name: "Llanta all-season (todas las estaciones)",
    shortDef:
      "Llanta diseñada para funcionar todo el año en climas con verano e invierno moderados.",
    definition:
      "Una llanta all-season balancea propiedades de llanta de verano (agarre en seco, durabilidad) y de invierno (agarre en mojado, en pavimento frío, sin riesgo en nieve ligera). Es la categoría dominante en mercados con inviernos suaves o tropicales como Colombia.\n\nEn aplicaciones colombianas, prácticamente todas las llantas vendidas a usuarios particulares son all-season; las llantas de invierno (winter / nieve) o verano puro son raras y aplican solo a vehículos importados a zonas paramunas o de exportación.",
    category: "tipos",
    synonyms: ["llanta para todo clima", "llanta 4 estaciones"],
    relatedTerms: ["llanta-off-road", "tipos-de-terreno"],
  },
  {
    slug: "llanta-off-road",
    name: "Llanta off-road / mixta",
    shortDef:
      "Llanta con tacos agresivos para tracción en barro, arena, roca y terrenos sin pavimentar.",
    definition:
      "Una llanta off-road (M/T — Mud Terrain) o mixta (A/T — All Terrain) tiene un dibujo de banda con tacos profundos y separados que clavan en superficies blandas (barro, arena, gravilla). El compromiso es ruido, mayor desgaste en pavimento y menor confort vs. llanta de carretera.\n\nLas mixtas (A/T) sirven para 60% pavimento / 40% destapado típico de camionetas en zonas rurales. Las puramente off-road (M/T) son para vehículos 4x4 dedicados a senderos. En Colombia, marcas como Goodyear Wrangler, BFGoodrich All-Terrain y Cooper Discoverer dominan este segmento.",
    category: "tipos",
    synonyms: ["llanta off-road", "M/T", "A/T", "All Terrain", "Mud Terrain"],
    relatedTerms: ["llanta-all-season", "tipos-de-terreno", "banda-de-rodamiento"],
  },
  {
    slug: "tipos-de-terreno",
    name: "Tipos de terreno",
    shortDef:
      "Clasificación del uso de la llanta por superficie: pavimento, mixto, destapado, especializado.",
    definition:
      "El tipo de terreno define el dibujo de banda, el compuesto y la construcción óptimos: pavimento (highway / H — banda longitudinal, baja resistencia al rodamiento), mixto (A/T — All Terrain — 50/50), destapado (M/T — Mud Terrain — agresivo), y especializado (mining, agrícola).\n\nElegir mal el tipo de terreno es la causa más frecuente de bajo rendimiento: una llanta de carretera en una flota minera dura semanas, y una llanta off-road en autopista consume hasta 20% más combustible.",
    category: "comercial",
    synonyms: ["uso de la llanta", "aplicación de la llanta"],
    relatedTerms: ["llanta-all-season", "llanta-off-road", "banda-de-rodamiento"],
  },
  {
    slug: "dimension-llanta",
    name: "Dimensión de llanta",
    shortDef:
      "Código que combina ancho, perfil, construcción y rin de la llanta (ej. 205/55R16).",
    definition:
      "La dimensión de una llanta es el código estampado en el flanco que combina cuatro datos: ancho de la banda en mm (205), aspecto/perfil como % del ancho (55), tipo de construcción (R = radial), y diámetro de rin en pulgadas (16). El conjunto \"205/55R16\" es la dimensión.\n\nLa dimensión debe coincidir con la especificación del fabricante del vehículo (placa en la puerta) o ser una equivalencia dimensional autorizada. Un cambio fuera de equivalencia altera lectura del velocímetro, geometría de suspensión y, si es ilegal, anula seguro.",
    category: "medidas",
    synonyms: ["medida de llanta", "tamaño de llanta", "tire size"],
    examples: [
      "205/55R16: pasajero compacto",
      "265/65R17: camioneta utilitaria",
      "295/80R22.5: tractomula",
    ],
    relatedTerms: ["aspecto", "indice-de-carga", "indice-de-velocidad"],
  },
  {
    slug: "aspecto",
    name: "Aspecto / Perfil",
    shortDef:
      "Altura del flanco como porcentaje del ancho de la banda (segundo número de la dimensión).",
    definition:
      "El aspecto o perfil es el segundo número de la dimensión (\"55\" en \"205/55R16\") y representa la altura del flanco como porcentaje del ancho. Un perfil bajo (35-45) da más respuesta de dirección y look deportivo, pero golpea más, requiere rin más grande y absorbe peor las imperfecciones.\n\nUn perfil alto (65-80) absorbe mejor irregularidades, ahorra el rin de los huecos y baja el costo, pero rinde menos en curvas. Las flotas pesadas usan perfiles 70-80 por durabilidad; los deportivos usan 35-45 por respuesta.",
    category: "medidas",
    synonyms: ["perfil", "aspect ratio"],
    relatedTerms: ["dimension-llanta", "flanco"],
  },
  {
    slug: "hidroplaneo",
    name: "Hidroplaneo",
    shortDef:
      "Pérdida de contacto con el pavimento por una capa de agua entre llanta y suelo.",
    definition:
      "El hidroplaneo (aquaplaning) ocurre cuando la velocidad del vehículo y la cantidad de agua en el pavimento superan la capacidad de la llanta para evacuar el agua por sus surcos. La banda \"flota\" sobre el agua y pierde adherencia, dirección y frenada.\n\nFactores que aumentan el riesgo: baja profundidad de banda (RTD), llantas anchas con baja relación de surcos, exceso de velocidad en lluvia, y baja presión de inflado. La defensa principal es mantener RTD adecuado (>3 mm) y reducir velocidad en lluvia. En Colombia, donde el invierno es lluvioso, el hidroplaneo causa muchos accidentes en autopistas.",
    category: "seguridad",
    synonyms: ["aquaplaning", "hidroplaning"],
    relatedTerms: ["rtd", "banda-de-rodamiento", "psi"],
  },
  {
    slug: "vida-util-de-llanta",
    name: "Vida útil de una llanta",
    shortDef:
      "Kilómetros y/o años que una llanta sirve antes de su descarte o primer reencauche.",
    definition:
      "La vida útil de una llanta combina dos métricas: kilometraje (cuánto recorre antes de llegar al RTD mínimo) y antigüedad (cuántos años desde el DOT, máximo 6 con buen mantenimiento). El primero que se cumpla determina el fin de su vida útil para esa aplicación.\n\nPasajeros: 50.000-80.000 km en banda, máximo 6 años. Camiones: 80.000-150.000 km y reencauche posterior. Tractomula: 150.000-250.000 km en primera vida + 1-2 reencauches. La vida útil se acorta drásticamente con baja presión, sobrecarga o golpes severos.",
    category: "comercial",
    synonyms: ["durabilidad de llanta", "kilometraje de llanta"],
    relatedTerms: ["cpk", "rtd", "reencauche", "psi", "rotacion-de-llantas"],
  },
  {
    slug: "tpms-vs-presion-manual",
    name: "TPMS vs. revisión manual",
    shortDef:
      "Comparación entre el monitoreo electrónico y la revisión periódica con manómetro.",
    definition:
      "Aunque el TPMS dispara una alerta cuando la presión cae 25% por debajo del valor nominal, no detecta diferencias menores que igualmente desgastan la llanta. La revisión manual con manómetro digital una vez al mes (o cada salida en flotas) detecta caídas de 2-3 PSI antes de que el TPMS reaccione.\n\nLas mejores flotas combinan ambos: TPMS como red de seguridad ante pinchada súbita, y revisión manual programada para mantener el inflado óptimo y prolongar la vida útil. TirePro registra cada lectura manual asociada al vehículo y a la llanta.",
    category: "mantenimiento",
    synonyms: [],
    relatedTerms: ["tpms", "psi"],
  },
  {
    slug: "marcas-de-llantas",
    name: "Marcas de llantas (panorama)",
    shortDef:
      "Categorización de las principales marcas globales de llantas por tier comercial.",
    definition:
      "Las marcas de llantas se categorizan en tres tiers: premium (Michelin, Bridgestone, Continental, Goodyear, Pirelli) — máxima tecnología, durabilidad y precio; intermedio (Hankook, Yokohama, Firestone, Dunlop) — buena relación calidad-precio para uso intensivo; económico (Sailun, Triangle, Linglong, Aplus) — costo bajo, kilometraje moderado, ideal para flotas con CPK presionado.\n\nEn Colombia, las flotas pesadas suelen mezclar tiers según el eje: premium en dirección por seguridad, intermedio en tracción, económico en remolque para optimizar CPK. La elección no es \"premium = mejor siempre\", sino \"premium donde la pérdida cuesta caro, económico donde el riesgo es bajo\".",
    category: "comercial",
    synonyms: ["marcas premium llantas", "marcas tier"],
    relatedTerms: ["cpk", "vida-util-de-llanta", "comparativa-nueva-vs-reencauche"],
    marketplaceLinks: [
      { label: "Catálogo Michelin", href: "/marketplace/brand/michelin" },
      { label: "Catálogo Bridgestone", href: "/marketplace/brand/bridgestone" },
      { label: "Catálogo Continental", href: "/marketplace/brand/continental" },
    ],
  },
  {
    slug: "comparativa-nueva-vs-reencauche",
    name: "Llanta nueva vs. reencauche",
    shortDef:
      "Comparación entre comprar una llanta nueva o una reencauchada certificada.",
    definition:
      "Llanta nueva: máxima profundidad de banda original, garantía de fabricante completa, opción única para ejes de dirección de pasajero y aplicaciones de alta velocidad. Costo más alto, mayor CPK en aplicaciones donde el casco se podría reaprovechar.\n\nLlanta reencauchada: 30-45% más económica, garantía sobre proceso e integridad del casco, ideal para tracción y libre/remolque en flotas pesadas. Limitada a aplicaciones de baja-media velocidad y a cascos que pasen la inspección estructural. La decisión correcta es por eje y aplicación, no por una preferencia única.",
    category: "comercial",
    synonyms: ["nueva vs retread"],
    relatedTerms: ["reencauche", "cpk", "casco-de-la-llanta", "marcas-de-llantas"],
    marketplaceLinks: [
      { label: "Llantas nuevas", href: "/marketplace/categoria/nueva" },
      { label: "Llantas reencauchadas", href: "/marketplace/categoria/reencauche" },
    ],
  },
];

export function termFromSlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}
