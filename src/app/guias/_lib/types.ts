// =============================================================================
// /guias/[topic] — buying-guide engine data shapes.
//
// Each Guide entry powers one /guias/<slug> page. The page renders:
//   - Hero with H1 + intro
//   - Sections (each H2 + paragraphs)
//   - HowTo JSON-LD generated from howToSteps
//   - FAQPage JSON-LD generated from faqs
//   - Article JSON-LD with author + datePublished + dateModified
//   - Related glossary entries + marketplace CTAs
//
// Content design constraint: each guide must answer ONE specific
// buying decision. Avoid editorial drift — the user lands here
// because they're about to spend money and want a clear
// recommendation.
// =============================================================================

export type GuideCategory =
  | "compra"        // purchase decision
  | "mantenimiento" // care, lifecycle
  | "flota"         // fleet-specific
  | "seguridad";    // safety, regulations

export interface GuideSection {
  /** H2 heading */
  heading: string;
  /** Body paragraphs — each rendered as a separate <p>. */
  paragraphs: string[];
}

export interface GuideStep {
  /** Step name, e.g. "Mide la profundidad de banda" */
  name: string;
  /** What to do in this step. */
  text: string;
}

export interface GuideFaq { q: string; a: string }

export interface Guide {
  /** URL slug, e.g. "como-elegir-llantas-tractomula" */
  slug: string;
  /** H1 title */
  title: string;
  /** SEO meta description (~155 chars) */
  shortDescription: string;
  /** Category badge in the hero */
  category: GuideCategory;
  /** Estimated read minutes */
  readMinutes: number;
  /** ISO date — YYYY-MM-DD */
  updatedDate: string;
  /** Intro paragraph(s) shown right under the H1 */
  intro: string;
  /** Long-form content sections */
  sections: GuideSection[];
  /** Optional HowTo step list — enables HowTo schema */
  howToSteps?: GuideStep[];
  /** FAQ entries shown as accordion + emitted as FAQPage schema */
  faqs: GuideFaq[];
  /** Glossary slugs to cross-link in the "Términos relacionados" panel */
  relatedTerms?: string[];
  /** Cross-links into the marketplace */
  marketplaceLinks?: Array<{ label: string; href: string }>;
  /** Other guide slugs to surface as "Continúa leyendo" */
  relatedGuides?: string[];
}

export const GUIDE_CATEGORIES: Record<GuideCategory, string> = {
  compra:        "Decisión de compra",
  mantenimiento: "Mantenimiento",
  flota:         "Flota y CPK",
  seguridad:     "Seguridad",
};
