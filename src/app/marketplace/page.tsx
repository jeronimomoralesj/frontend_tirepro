// src/app/marketplace/page.tsx — Server Component
//
// Marketplace SEO + AI indexing strategy:
//   - Aggressive metadata targeting every "comprar llantas" buying query
//     in Colombia: by brand, by vehicle, by city, by dimension.
//   - Six JSON-LD payloads (Store / OnlineStore / LocalBusiness / WebSite
//     with SearchAction / FAQPage / BreadcrumbList) so Google + Gemini +
//     ChatGPT + Claude + Grok have every schema they need to surface
//     TirePro Marketplace as the first result for buying tires.
//   - Small server-rendered SEO content block (H2/H3 with cities + brands
//     + vehicle types + popular dimensions). Visible to users + crawlers.
//
// The heavy interactive UI is `<MarketplaceClient>`; this server wrapper
// supplies the indexable shell and structured data.

import type { Metadata } from 'next'
import MarketplaceClient from './MarketplaceClient'

// 1-hour ISR window. Was 86400 (24h) but that cached the SSG HTML for a
// full day after every deploy, which created a deploy-skew window where
// stale HTML loaded freshly-deployed JS chunks and React hydration died
// with "This page couldn't load". 1 hour is short enough to clear that
// window quickly while still giving the marketplace home most of the
// SSG benefit.
export const revalidate = 3600

// ─────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:
    'TirePro Marketplace — Comprar Llantas Online en Colombia | Distribuidores Verificados',
  description:
    'Compra llantas online en Colombia: Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone, Yokohama y más, ' +
    'directo de distribuidores verificados con instalación incluida y entrega nacional. Llantas para carro, camioneta, camión, tractomula y bus en ' +
    'Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira y todo el país. Mejores precios, financiación, comparativa de CPK.',
  keywords: [
    // Brand
    'TirePro',
    'tirepro',
    'TirePro Marketplace',
    'tirepro marketplace',
    // Buy intent — Spanish
    'comprar llantas Colombia',
    'llantas online Colombia',
    'marketplace llantas',
    'llantas baratas Colombia',
    'venta de llantas online',
    'tienda de llantas Colombia',
    'llantas con instalación',
    // By city
    'llantas Bogotá',
    'llantas Medellín',
    'llantas Cali',
    'llantas Barranquilla',
    'llantas Cartagena',
    'llantas Bucaramanga',
    'llantas Pereira',
    'llantas Manizales',
    'llantas Cúcuta',
    'llantas Ibagué',
    // By vehicle
    'llantas para carro',
    'llantas para camioneta',
    'llantas para SUV',
    'llantas para camión',
    'llantas para tractomula',
    'llantas para bus',
    'llantas para volqueta',
    // By dimension (high-volume buyer queries)
    'llantas 295/80R22.5',
    'llantas 11R22.5',
    'llantas 315/80R22.5',
    'llantas 12R22.5',
    'llantas 265/70R16',
    'llantas 215/55R17',
    'llantas 205/55R16',
    'llantas 195/65R15',
    'llantas 175/70R13',
    // Reencauche
    'reencauche Colombia',
    'llantas reencauchadas',
    'reencauchadora Colombia',
    'banda de reencauche',
    // Brand
    'Michelin Colombia',
    'Bridgestone Colombia',
    'Continental llantas',
    'Goodyear Colombia',
    'Pirelli Colombia',
    'Hankook Colombia',
    'Firestone Colombia',
    'Yokohama Colombia',
    // English (LATAM expansion)
    'buy tires Colombia',
    'tire marketplace Colombia',
    'fleet tires Colombia',
  ],
  alternates: { canonical: 'https://www.tirepro.com.co/marketplace' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co/marketplace',
    siteName: 'TirePro',
    title: 'Comprar Llantas en Colombia | Marketplace TirePro',
    description:
      'El marketplace de llantas más completo de Colombia. Distribuidores verificados, precios competitivos, instalación incluida y entrega a domicilio.',
    // Image is supplied by ./opengraph-image.tsx (Next.js file convention)
    // — produces a branded 1200x630 PNG with the TirePro logo centered for
    // WhatsApp / Facebook / Twitter / LinkedIn previews.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comprar Llantas en Colombia | Marketplace TirePro',
    description:
      'Marketplace con distribuidores verificados de llantas en toda Colombia. Compara precios y compra con instalación incluida.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────
// JSON-LD — Store
// ─────────────────────────────────────────────────────────────────────────

const storeLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': 'https://www.tirepro.com.co/marketplace#store',
  name: 'Marketplace TirePro',
  alternateName: ['TirePro Marketplace', 'Tienda de Llantas TirePro'],
  url: 'https://www.tirepro.com.co/marketplace',
  image: 'https://www.tirepro.com.co/marketplace/opengraph-image',
  logo: 'https://www.tirepro.com.co/logo_full.png',
  description:
    'Marketplace #1 de llantas en Colombia. Distribuidores verificados, precios competitivos, instalación incluida y entrega nacional. ' +
    'Llantas para carro, camioneta, SUV, camión, tractomula y bus de marcas como Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook y Yokohama.',
  priceRange: '$',
  currenciesAccepted: 'COP',
  paymentAccepted: 'Tarjeta de crédito, Tarjeta de débito, PSE, Nequi, Transferencia bancaria, Crédito empresarial',
  telephone: '+57-317-216-9790',
  email: 'info@tirepro.com.co',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CO',
    addressRegion: 'Cundinamarca',
    addressLocality: 'Bogotá',
    postalCode: '110111',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 4.711, longitude: -74.0721 },
  areaServed: [
    { '@type': 'Country', name: 'Colombia' },
    { '@type': 'City', name: 'Bogotá' },
    { '@type': 'City', name: 'Medellín' },
    { '@type': 'City', name: 'Cali' },
    { '@type': 'City', name: 'Barranquilla' },
    { '@type': 'City', name: 'Cartagena' },
    { '@type': 'City', name: 'Bucaramanga' },
    { '@type': 'City', name: 'Pereira' },
    { '@type': 'City', name: 'Manizales' },
    { '@type': 'City', name: 'Cúcuta' },
    { '@type': 'City', name: 'Ibagué' },
    { '@type': 'City', name: 'Santa Marta' },
    { '@type': 'City', name: 'Villavicencio' },
    { '@type': 'City', name: 'Neiva' },
    { '@type': 'City', name: 'Armenia' },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Catálogo completo de llantas',
    itemListElement: [
      { '@type': 'OfferCatalog', name: 'Llantas para automóvil' },
      { '@type': 'OfferCatalog', name: 'Llantas para SUV y camioneta' },
      { '@type': 'OfferCatalog', name: 'Llantas para camión y tractomula' },
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
    { '@type': 'Brand', name: 'Firestone' },
    { '@type': 'Brand', name: 'Yokohama' },
    { '@type': 'Brand', name: 'BFGoodrich' },
    { '@type': 'Brand', name: 'Cooper' },
    { '@type': 'Brand', name: 'Maxxis' },
    { '@type': 'Brand', name: 'Triangle' },
    { '@type': 'Brand', name: 'Linglong' },
    { '@type': 'Brand', name: 'Aeolus' },
    { '@type': 'Brand', name: 'Double Coin' },
    { '@type': 'Brand', name: 'Roadmaster' },
  ],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.tirepro.com.co/marketplace?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
  sameAs: [
    'https://www.instagram.com/tirepro.co',
    'https://www.linkedin.com/company/tirepro-co',
    'https://www.facebook.com/tirepro.co',
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// JSON-LD — OnlineStore (extra type Google understands for transactional)
// ─────────────────────────────────────────────────────────────────────────

const onlineStoreLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  '@id': 'https://www.tirepro.com.co/marketplace#onlinestore',
  name: 'Marketplace TirePro',
  url: 'https://www.tirepro.com.co/marketplace',
  description:
    'Tienda online de llantas en Colombia para autos, camionetas, SUV, camiones, buses y flotas. Distribuidores verificados, comparación de precios en tiempo real y entrega nacional.',
  parentOrganization: { '@id': 'https://www.tirepro.com.co/#organization' },
  hasMerchantReturnPolicy: {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'CO',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 15,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  },
  shippingDetails: {
    '@type': 'OfferShippingDetails',
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CO' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 7, unitCode: 'DAY' },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────
// JSON-LD — WebSite with SearchAction
// ─────────────────────────────────────────────────────────────────────────

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://www.tirepro.com.co/marketplace#website',
  url: 'https://www.tirepro.com.co/marketplace',
  name: 'TirePro Marketplace',
  inLanguage: 'es-CO',
  publisher: { '@id': 'https://www.tirepro.com.co/#organization' },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.tirepro.com.co/marketplace?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

// ─────────────────────────────────────────────────────────────────────────
// JSON-LD — BreadcrumbList
// ─────────────────────────────────────────────────────────────────────────

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'TirePro',     item: 'https://www.tirepro.com.co' },
    { '@type': 'ListItem', position: 2, name: 'Marketplace', item: 'https://www.tirepro.com.co/marketplace' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// JSON-LD — FAQPage (transactional buying questions)
// ─────────────────────────────────────────────────────────────────────────

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Dónde puedo comprar llantas online en Colombia?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'En el Marketplace TirePro (https://www.tirepro.com.co/marketplace) compras llantas nuevas y de reencauche directo de distribuidores verificados en toda Colombia, con entrega nacional, instalación incluida y precios competitivos.' } },
    { '@type': 'Question', name: '¿Cuáles marcas de llantas se venden en TirePro?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone, Yokohama, BFGoodrich, Cooper, Maxxis, Triangle, Linglong, Aeolus, Double Coin, Roadmaster y más. Llantas nuevas y reencauchadas para carro, camioneta, SUV, camión, tractomula y bus.' } },
    { '@type': 'Question', name: '¿En qué ciudades de Colombia entregan llantas?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'En Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Cúcuta, Ibagué, Santa Marta, Villavicencio, Neiva, Armenia y todas las ciudades principales del país. Algunos distribuidores ofrecen instalación gratuita en sus servitecas aliadas.' } },
    { '@type': 'Question', name: '¿Qué métodos de pago acepta TirePro?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Tarjeta de crédito, tarjeta de débito, PSE, Nequi, transferencia bancaria y crédito empresarial para flotas. Sin recargos por método de pago.' } },
    { '@type': 'Question', name: '¿Cómo busco la llanta correcta para mi vehículo?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Puedes buscar por dimensión (ej. 205/55R16), por marca, por tipo de vehículo, o ingresando la placa de tu carro — TirePro busca automáticamente las dimensiones recomendadas para esa placa colombiana.' } },
    { '@type': 'Question', name: '¿Las llantas que vende TirePro tienen garantía?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Sí. Cada llanta vendida en TirePro está respaldada por la garantía oficial del fabricante. Los reencauches certificados también incluyen garantía del proceso. La política de devolución del marketplace es de 15 días con devolución gratuita.' } },
    { '@type': 'Question', name: '¿Puedo comprar llantas para flotas con factura empresarial?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Sí. Los distribuidores en TirePro emiten factura electrónica colombiana válida para deducción de impuestos. Las flotas con la plataforma de gestión de TirePro pueden integrar las compras directamente con su sistema de gestión de llantas.' } },
    { '@type': 'Question', name: '¿Dónde encuentro llantas baratas en Colombia?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'En el Marketplace TirePro: comparas precios de varios distribuidores verificados al mismo tiempo, hay reencauches certificados desde $400.000 COP, y ofertas activas en marcas premium como Michelin y Bridgestone.' } },
    { '@type': 'Question', name: '¿Cuánto cuesta una llanta de tractomula 295/80R22.5?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Una llanta nueva 295/80R22.5 parte desde $800.000 COP en TirePro Marketplace. Una versión reencauchada certificada desde $400.000 COP. Los precios exactos dependen de la marca y el distribuidor.' } },
    { '@type': 'Question', name: '¿Puedo reencauchar mis llantas en Colombia?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Sí. TirePro tiene reencauchadores certificados en su marketplace. Cotizas, despachas tus cascos, recibes la llanta reencauchada con garantía del proceso. Compatible con bandas Vipal, Bandag, Marangoni y otras.' } },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// JSON-LD — LocalBusiness (geo)
// ─────────────────────────────────────────────────────────────────────────

const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://www.tirepro.com.co/marketplace#localbusiness',
  name: 'Marketplace TirePro',
  url: 'https://www.tirepro.com.co/marketplace',
  image: 'https://www.tirepro.com.co/marketplace/opengraph-image',
  description:
    'Marketplace de llantas en Colombia con distribuidores verificados, instalación, alineación, balanceo y entrega a domicilio.',
  priceRange: '$',
  telephone: '+57-317-216-9790',
  email: 'info@tirepro.com.co',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CO',
    addressRegion: 'Cundinamarca',
    addressLocality: 'Bogotá',
    postalCode: '110111',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 4.711, longitude: -74.0721 },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '09:00',
      closes: '14:00',
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  return (
    <>
      <MarketplaceClient />

      {/* JSON-LD payloads — six separate scripts so AI engines + Google
          + Gemini + ChatGPT + Claude + Grok can each pick exactly the
          schema type they need. */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(onlineStoreLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  )
}
