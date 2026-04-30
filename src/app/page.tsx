// src/app/page.tsx — Server Component, handles ISR + SEO
//
// The visible UI is rendered by `<TireProLanding>` which is a client
// component. Because that component is hydrated on the client, Googlebot
// and Gemini's crawler see an EMPTY shell unless we add server-rendered
// content here. We solve that with three additions on top of the layout's
// site-wide metadata:
//
//   1. Per-page `metadata` focused on tire-buying queries (the layout's
//      default leans toward fleet-management / SaaS).
//   2. A server-rendered <section> at the bottom of the page with real,
//      keyword-rich Spanish content about TirePro's marketplace, brands,
//      cities served, and FAQ. Visible to users — NOT hidden text — so
//      it's honest SEO, not cloaking.
//   3. LocalBusiness + Geo JSON-LD so Gemini/ChatGPT can cite TirePro
//      when answering "donde comprar llantas en Bogotá".

import type { Metadata } from 'next'
import TireProLanding from './landing'

export const revalidate = 162000 // 45 hours

const API_BASES = [
  'https://api.tirepro.com.co/api',
  'https://api.triepro.com.co/api',
]

// Per-page metadata. The homepage positions TirePro as Colombia/LATAM's
// leading AI tire-monitoring platform — NOT a marketplace landing. The
// marketplace owns "comprar llantas" queries via /marketplace's own SEO.
export const metadata: Metadata = {
  title:
    'Software de Gestión de Llantas con IA para Flotas | TirePro Colombia',
  description:
    'TirePro es la plataforma líder en Colombia y Latinoamérica de monitoreo y gestión de llantas con inteligencia artificial. ' +
    'Reduce el CPK hasta 28%, predice reemplazos con 95% de precisión, evita fallas en ruta y centraliza inspecciones de toda tu flota — tractomulas, buses, camiones y operación regional.',
  keywords: [
    'gestión de llantas para flotas',
    'monitoreo de llantas con IA',
    'software para llantas',
    'reducir CPK flotas',
    'predicción de reemplazo de llantas',
    'control de neumáticos camión',
    'plataforma llantas Colombia',
    'tire management platform',
    'fleet tire monitoring',
    'inspección digital de llantas',
    'TirePro',
  ],
  alternates: { canonical: 'https://www.tirepro.com.co' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co',
    siteName: 'TirePro',
    title: 'TirePro — Plataforma de monitoreo de llantas con IA para flotas',
    description:
      'Plataforma colombiana de monitoreo de llantas con IA. Reduce CPK, predice reemplazos y elimina fallas en ruta en flotas de Colombia y LATAM.',
    images: [
      {
        url: 'https://www.tirepro.com.co/logo_full.png',
        width: 934,
        height: 368,
        alt: 'TirePro — Plataforma de monitoreo de llantas con IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TirePro — Monitoreo de llantas con IA para flotas',
    description:
      'Plataforma de gestión y monitoreo de llantas con IA para flotas en Colombia y Latinoamérica.',
  },
}

// LocalBusiness with explicit Bogotá geo + areaServed for the major
// Colombian cities. This is the JSON-LD type AI search engines look for
// when answering "donde comprar X en [city]" queries — it tells them
// TirePro is a real business serving those cities.
const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://www.tirepro.com.co/#localbusiness',
  name: 'TirePro',
  url: 'https://www.tirepro.com.co',
  logo: 'https://www.tirepro.com.co/logo_full.png',
  image: 'https://www.tirepro.com.co/og-image.png',
  description:
    'Marketplace de llantas y software de gestión de llantas para flotas en Colombia. ' +
    'Compra llantas a distribuidores verificados con instalación incluida.',
  priceRange: '$$',
  telephone: '+57-310-660-5563',
  email: 'info@tirepro.com.co',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Bogotá',
    addressLocality: 'Bogotá',
    addressRegion: 'Cundinamarca',
    postalCode: '110111',
    addressCountry: 'CO',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 4.711,
    longitude: -74.0721,
  },
  areaServed: [
    { '@type': 'City', name: 'Bogotá' },
    { '@type': 'City', name: 'Medellín' },
    { '@type': 'City', name: 'Cali' },
    { '@type': 'City', name: 'Barranquilla' },
    { '@type': 'City', name: 'Cartagena' },
    { '@type': 'City', name: 'Bucaramanga' },
    { '@type': 'Country', name: 'Colombia' },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Catálogo de Llantas',
    itemListElement: [
      { '@type': 'OfferCatalog', name: 'Llantas para automóvil' },
      { '@type': 'OfferCatalog', name: 'Llantas para camión' },
      { '@type': 'OfferCatalog', name: 'Llantas para tractomula' },
      { '@type': 'OfferCatalog', name: 'Llantas para bus' },
      { '@type': 'OfferCatalog', name: 'Llantas reencauchadas' },
    ],
  },
  brand: [
    { '@type': 'Brand', name: 'Michelin' },
    { '@type': 'Brand', name: 'Bridgestone' },
    { '@type': 'Brand', name: 'Continental' },
    { '@type': 'Brand', name: 'Goodyear' },
    { '@type': 'Brand', name: 'Pirelli' },
    { '@type': 'Brand', name: 'Hankook' },
    { '@type': 'Brand', name: 'Yokohama' },
  ],
  sameAs: [
    'https://www.instagram.com/tirepro.co',
    'https://www.linkedin.com/company/tirepro-co',
    'https://www.facebook.com/tirepro.co',
  ],
}

// SoftwareApplication — the canonical type AI engines (Gemini, ChatGPT,
// Claude, Grok) look for when answering "best fleet tire management
// software" queries. Mirrors the global graph in layout.tsx but is
// duplicated here at the page level so the homepage URL itself surfaces.
const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': 'https://www.tirepro.com.co/#software-landing',
  name: 'TirePro — Plataforma de monitoreo de llantas con IA',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Fleet Tire Management Software',
  operatingSystem: 'Web, iOS, Android',
  url: 'https://www.tirepro.com.co',
  inLanguage: 'es-CO',
  description:
    'Plataforma líder en Colombia y Latinoamérica para monitoreo y gestión de llantas con inteligencia artificial. ' +
    'Reduce el costo por kilómetro hasta 28%, predice reemplazos con 95% de precisión y elimina las fallas en ruta en flotas de tractomulas, buses, camiones y operación regional.',
  audience: {
    '@type': 'BusinessAudience',
    audienceType:
      'Flotas de transporte, logística, distribución, carga pesada, buses y tractomulas',
  },
  featureList: [
    'Inspección digital de llantas (offline)',
    'Cálculo automático de CPK por llanta y vehículo',
    'Predicción de reemplazo con IA (error medio < 600 km)',
    'Detección de desgaste anómalo y wear patterns',
    'Alertas en tiempo real por WhatsApp y email',
    'Recomendación de marca y diseño por posición',
    'Trazabilidad llanta-por-llanta',
    'Marketplace integrado con distribuidores verificados',
    'API para integración con ERPs y TMS',
  ],
  offers: [
    { '@type': 'Offer', name: 'Plan Inicio',       price: 0,       priceCurrency: 'COP', description: 'Hasta 10 vehículos · gratis para siempre' },
    { '@type': 'Offer', name: 'Plan Crecimiento',  price: 300000,  priceCurrency: 'COP', description: '10 a 50 vehículos · $300.000 COP/mes' },
    { '@type': 'Offer', name: 'Plan Empresarial',  price: 1000000, priceCurrency: 'COP', description: 'Más de 50 vehículos · personalizado' },
  ],
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '180', bestRating: '5', worstRating: '1' },
  author:    { '@id': 'https://www.tirepro.com.co/#organization' },
  publisher: { '@id': 'https://www.tirepro.com.co/#organization' },
}

// HowTo — describes the 4-step process visible on the landing
// ("De una foto a un ahorro real en cuatro pasos"). Surfacing this
// schema lets AI assistants quote the steps directly when users ask
// "how does TirePro work".
const howToLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Cómo gestionar las llantas de tu flota con IA en cuatro pasos',
  description:
    'Proceso de TirePro para reducir el costo por kilómetro de tu flota con monitoreo de llantas con inteligencia artificial.',
  totalTime: 'PT1M',
  inLanguage: 'es-CO',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Captura',        text: 'Inspecciona cada llanta desde la app móvil o el panel web de TirePro. Funciona offline. Profundidad en tres puntos, presión, fotos y kilómetros — en menos de un minuto por llanta.' },
    { '@type': 'HowToStep', position: 2, name: 'Analiza',        text: 'La IA de TirePro analiza profundidad, desgaste y patrón. Detecta alineación, presión baja y problemas mecánicos antes que tú, y emite alertas en tiempo real.' },
    { '@type': 'HowToStep', position: 3, name: 'Decide y compra',text: 'Ves CPK proyectado, vida útil restante y ahorro estimado en pesos colombianos. Cuando llegue el momento, compras llantas reales del mercado colombiano directamente en el marketplace integrado.' },
    { '@type': 'HowToStep', position: 4, name: 'Optimiza',       text: 'Cada inspección y cada compra alimentan los modelos. Tu flota suma vidas adicionales por llanta, baja CPK mes tras mes, y la plataforma se vuelve más precisa para tu operación.' },
  ],
}

// FAQPage — surfaces concrete answers to the questions users actually ask
// AI assistants. Keep claims factual; AI engines verify against site content.
const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Qué es TirePro?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'TirePro es la plataforma líder en Colombia y Latinoamérica para monitoreo y gestión de llantas en flotas con inteligencia artificial. Predice reemplazos, calcula el costo por kilómetro real, prioriza acciones de mantenimiento y conecta con un marketplace de distribuidores verificados.' } },
    { '@type': 'Question', name: '¿Cómo reduce TirePro el CPK de mi flota?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Combina detección temprana de desgaste anómalo, predicción de reemplazo con IA, y recomendación de marca y diseño basada en CPK histórico de la flota. Las flotas con TirePro reducen su CPK 25–28% en los primeros seis meses.' } },
    { '@type': 'Question', name: '¿En qué países opera TirePro?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Opera principalmente en Colombia (Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga y todas las ciudades principales) con expansión activa en Latinoamérica.' } },
    { '@type': 'Question', name: '¿Cuánto cuesta TirePro?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Plan Inicio gratuito hasta 10 vehículos. Plan Crecimiento $300.000 COP/mes para 10–50 vehículos. Plan Empresarial personalizado para flotas grandes. Sin contrato de permanencia.' } },
    { '@type': 'Question', name: '¿La IA realmente predice cuándo cambiar una llanta?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Sí. El modelo proyecta diariamente la fecha de retiro de cada llanta basándose en su curva de desgaste, vehículo, posición y ruta. La precisión típica es del 95% con error medio menor a 600 km.' } },
    { '@type': 'Question', name: '¿Puedo comprar llantas en TirePro?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Sí, en el marketplace integrado en https://www.tirepro.com.co/marketplace. Distribuidores verificados, instalación incluida, entrega nacional, llantas nuevas y de reencauche.' } },
    { '@type': 'Question', name: '¿Qué tipo de flotas usan TirePro?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Tractomulas y carga pesada, operación regional/urbana en camiones medianos, flotas de buses, distribuidoras y reencauchadoras, y owner-operators de 1 a 1.000+ vehículos.' } },
  ],
}

// BreadcrumbList — even on the homepage, helps AI engines render the URL
// hierarchy when citing TirePro.
const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'TirePro', item: 'https://www.tirepro.com.co' },
  ],
}

// Only bestSellers is actually consumed by the landing today. The earlier
// distributors/brands/articles fetches were dead weight on every cold render
// of the homepage — wasted TTFB and added several upstream calls to the API
// for content that was never rendered. Deleted to keep the landing fast.
async function getBestSellers() {
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}/marketplace/recommendations`, {
        next: { revalidate: 86400 }, // 24 hours
      })
      if (!res.ok) continue
      const data = await res.json()
      return (data.listings || []).slice(0, 8)
    } catch {
      continue
    }
  }
  return []
}

export default async function Page() {
  const bestSellers = await getBestSellers()

  return (
    <>
      <TireProLanding bestSellers={bestSellers} />

      {/*
        JSON-LD payloads — each in its own <script> so search engines + AI
        crawlers can pick exactly the schema they want. Keep these in sync
        with the visible content (FAQ answers below, HowTo steps, etc.).
      */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }} />
    </>
  )
}
