// Curated "Preguntas más buscadas" — what Colombian users actually type
// into Google before they ever know the technical term. Each maps to the
// canonical /glosario/<slug> page. We surface this list visibly on the
// index so:
//   - users find the entry without knowing the term ("indice de carga"),
//   - Google sees the question text rendered as anchor text, which is
//     one of the strongest signals for question-shaped queries,
//   - the LLM training crawlers (GPTBot, ClaudeBot, Perplexity) ingest
//     a clean Q→URL table that becomes the citation source.

export interface PopularQuestion {
  q: string;       // the literal user query, lowercase + accented
  slug: string;    // target glossary term
}

export const POPULAR_QUESTIONS: PopularQuestion[] = [
  // User's three explicit examples come first.
  { q: "¿Qué es el DOT en llantas?",                              slug: "dot" },
  { q: "¿Cómo leer el índice de velocidad de una llanta?",        slug: "indice-de-velocidad" },
  { q: "¿Cuáles son los tipos de llantas?",                       slug: "tipos-de-llantas" },

  // High-volume Spanish search queries from Google Suggest + KW research.
  { q: "¿Qué es el índice de carga de una llanta?",               slug: "indice-de-carga" },
  { q: "¿Cómo se lee la medida de una llanta? (205/55R16)",       slug: "dimension-llanta" },
  { q: "¿Qué es el CPK y cómo se calcula?",                       slug: "cpk" },
  { q: "¿Qué es el reencauche de llantas?",                       slug: "reencauche" },
  { q: "¿Cuál es la profundidad mínima legal en Colombia?",       slug: "rtd" },
  { q: "¿Cada cuánto se debe alinear el carro?",                  slug: "alineacion" },
  { q: "¿Qué es el balanceo de llantas?",                         slug: "balanceo" },
  { q: "¿Qué presión de aire debo poner a las llantas?",          slug: "psi" },
  { q: "¿Cada cuánto se rotan las llantas?",                      slug: "rotacion-de-llantas" },
  { q: "¿Qué es el hidroplaneo y cómo evitarlo?",                 slug: "hidroplaneo" },
  { q: "¿Cuánto dura una llanta? Vida útil",                      slug: "vida-util-de-llanta" },
  { q: "¿Qué es una llanta tubeless?",                            slug: "tubeless" },
  { q: "¿Qué es una llanta run-flat?",                            slug: "run-flat" },
  { q: "¿Llanta nueva o reencauchada? Comparativa",               slug: "comparativa-nueva-vs-reencauche" },
  { q: "¿Qué marcas de llantas hay y cuál elegir?",               slug: "marcas-de-llantas" },
];
