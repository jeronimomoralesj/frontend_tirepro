import type { Metadata } from 'next'

// --- Base URL -----------------------------------------------------------------
const BASE_URL = 'https://www.tirepro.com.co'

// --- Shared keywords list -----------------------------------------------------
// Ordered by search volume / commercial intent (Colombia + Latam)
const KEYWORDS = [
  // Primary — highest volume, highest intent
  'software gestión llantas flotas Colombia',
  'control de llantas camiones Colombia',
  'costo por kilómetro CPK llantas',
  'seguimiento llantas flota',
  'TirePro',
  // Secondary — strong intent
  'software llantas con IA',
  'reencauche inteligente llantas Colombia',
  'mantenimiento preventivo llantas camiones',
  'gestión neumáticos flota pesada',
  'control CPK llantas flotas',
  // Long-tail — conversion keywords
  'software gestión llantas camiones buses Colombia',
  'reducir costo llantas flota Colombia',
  'inspección digital llantas flotas',
  'alerta reemplazo llantas IA',
  'seguimiento neumáticos tractocamiones',
  'app control llantas flotas offline',
  'calculadora CPK llantas Colombia',
  'software llantas volquetas Colombia',
  'gestión flota pesada Colombia',
  // Geo-targeted
  'software llantas Bogotá',
  'software llantas Medellín',
  'software llantas Colombia',
  'gestión llantas Latam',
].join(', ')

// --- Main landing page metadata -----------------------------------------------
export const metadata: Metadata = {
  // -- Title ------------------------------------------------------------------
  // Target: ~60 chars. Primary keyword first, brand at end.
  title: {
    default: 'TirePro | Software de Gestión de Llantas con IA para Flotas en Colombia',
    template: '%s | TirePro — Gestión de Llantas con IA',
  },

  // -- Description ------------------------------------------------------------
  // Target: ~155 chars. Includes CPK, reencauche, Colombia, fleet types.
  description:
    'TirePro reduce el CPK de llantas para flotas de camiones, buses y tractocamiones en Colombia. Inspecciones digitales, alertas de reencauche con IA y reportes de ahorro en pesos colombianos. Comienza gratis.',

  // -- Keywords ---------------------------------------------------------------
  keywords: KEYWORDS,

  // -- Authors & Creator ------------------------------------------------------
  authors: [{ name: 'TirePro Colombia', url: BASE_URL }],
  creator: 'TirePro',
  publisher: 'TirePro Colombia',

  // -- Canonical --------------------------------------------------------------
  alternates: {
    canonical: BASE_URL,
    languages: {
      'es-CO': BASE_URL,
      'es':    BASE_URL,
    },
  },

  // -- Robots -----------------------------------------------------------------
  robots: {
    index:               true,
    follow:              true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-video-preview':  -1,
      'max-image-preview':  'large',
      'max-snippet':        -1,
    },
  },

  // -- Open Graph -------------------------------------------------------------
  openGraph: {
    type:        'website',
    url:         BASE_URL,
    siteName:    'TirePro',
    locale:      'es_CO',
    title:       'TirePro | Software de Gestión de Llantas con IA para Flotas en Colombia',
    description:
      'Reduce el CPK de llantas de tu flota con inteligencia artificial. Inspecciones digitales, alertas de reencauche y reportes de ahorro en COP. Software #1 para flotas pesadas en Colombia.',
    images: [
      {
        url:    `${BASE_URL}/og-image.png`,   // 1200×630px recommended
        width:  1200,
        height: 630,
        alt:    'TirePro — Software de gestión de llantas con IA para flotas en Colombia. Dashboard con CPK, inspecciones digitales y alertas predictivas.',
      },
    ],
  },

  // -- Twitter / X Cards ------------------------------------------------------
  twitter: {
    card:        'summary_large_image',
    site:        '@TireProColombia',
    creator:     '@TireProColombia',
    title:       'TirePro | Software de Gestión de Llantas con IA para Flotas en Colombia',
    description:
      'Reduce el CPK de llantas de tu flota con IA. Inspecciones digitales, reencauche inteligente y reportes en COP. #1 Colombia.',
    images: [`${BASE_URL}/og-image.png`],
  },

  // -- Verification -----------------------------------------------------------
  // Add your actual verification codes here
  verification: {
    google: 'YOUR_GOOGLE_SEARCH_CONSOLE_TOKEN',
    // yandex: 'YOUR_YANDEX_TOKEN',
  },

  // -- App links --------------------------------------------------------------
  appLinks: {
    ios: {
      url:      'https://apps.apple.com/us/app/tirepro/id6741497732',
      app_store_id: '6741497732',
    },
    android: {
      package:  'co.tirepro.app',
      app_name: 'TirePro',
    },
  },

  // -- Additional meta --------------------------------------------------------
  category: 'technology',
  classification: 'Business Software',
  referrer: 'origin-when-cross-origin',

  other: {
    // Geographic targeting
    'geo.region':   'CO',
    'geo.placename': 'Colombia',
    'geo.position': '4.711;-74.0721',
    'ICBM':         '4.711, -74.0721',
    // Language
    'content-language': 'es-CO',
    // Dublin Core (helps AI engines and specialized crawlers)
    'DC.title':       'TirePro — Software de Gestión de Llantas con IA para Flotas en Colombia',
    'DC.description': 'Plataforma SaaS de control de CPK, seguimiento de llantas y gestión de reencauche para flotas pesadas en Colombia.',
    'DC.creator':     'TirePro Colombia',
    'DC.language':    'es-CO',
    'DC.coverage':    'Colombia, Latinoamérica',
    'DC.subject':     'Software gestión llantas, CPK llantas, reencauche inteligente, flotas Colombia',
  },
}

// --- Per-route metadata helpers -----------------------------------------------
// Use these in app/blog/[slug]/page.tsx, app/calculadora/page.tsx, etc.

export function blogPostMetadata(params: {
  title:       string
  description: string
  slug:        string
  image?:      string
  date?:       string
  author?:     string
  category?:   string
}): Metadata {
  const { title, description, slug, image, date, author, category } = params
  const url = `${BASE_URL}/blog/${slug}`

  return {
    title:       `${title} | Blog TirePro`,
    description,
    keywords:    `${category ?? 'llantas'}, CPK llantas Colombia, gestión de llantas, reencauche, mantenimiento preventivo neumáticos, ${KEYWORDS}`,
    alternates:  { canonical: url },
    openGraph: {
      type:        'article',
      url,
      title,
      description,
      publishedTime: date,
      authors:     author ? [author] : ['TirePro Colombia'],
      section:     category ?? 'Gestión de Llantas',
      tags:        ['llantas Colombia', 'CPK', 'reencauche', 'flotas pesadas'],
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: title }]
        : [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${title} | TirePro Blog`,
      description,
      images:      image ? [image] : [`${BASE_URL}/og-image.png`],
    },
  }
}

export function calculadoraMetadata(): Metadata {
  return {
    title:       'Calculadora CPK de Llantas Gratis | TirePro Colombia',
    description: 'Calcula el costo por kilómetro (CPK) de las llantas de tu flota gratis. Herramienta online para gerentes de flota de camiones, buses y tractocamiones en Colombia.',
    keywords:    `calculadora CPK llantas, costo por kilómetro llantas Colombia, CPK neumáticos camiones, herramienta CPK flotas, ${KEYWORDS}`,
    alternates:  { canonical: `${BASE_URL}/calculadora` },
    openGraph: {
      type:        'website',
      url:         `${BASE_URL}/calculadora`,
      title:       'Calculadora de CPK de Llantas Gratis — TirePro Colombia',
      description: 'Descubre cuánto te cuesta cada kilómetro recorrido en neumáticos. Herramienta gratuita para flotas en Colombia.',
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Calculadora CPK llantas TirePro' }],
    },
  }
}