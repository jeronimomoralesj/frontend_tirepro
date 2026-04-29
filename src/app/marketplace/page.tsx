// src/app/marketplace/page.tsx — Server Component
//
// Same SEO pattern as the homepage: the visible UI lives in a 'use client'
// component (MarketplaceClient.tsx — formerly the entire page.tsx) which
// hydrates on the browser. To make the marketplace home indexable by
// Google + Gemini we wrap that client component in a server component
// that exports per-page metadata, renders a static SEO content section,
// and emits LocalBusiness + ItemList JSON-LD.
//
// Result: crawlers see a fully-rendered HTML response with real Spanish
// content + structured data; users see the same dynamic search/filter UI
// they always had.

import type { Metadata } from 'next'
import MarketplaceClient from './MarketplaceClient'

export const metadata: Metadata = {
  title:
    'Marketplace de Llantas en Colombia | Comprar Llantas Online — TirePro',
  description:
    'Compra llantas online en Colombia: Michelin, Bridgestone, Continental, Goodyear, Pirelli y más, ' +
    'directo de distribuidores verificados. Llantas para carro, camión, tractomula y bus en Bogotá, Medellín, Cali, ' +
    'Barranquilla y todo el país. Precios competitivos, instalación incluida y CPK garantizado.',
  alternates: { canonical: 'https://www.tirepro.com.co/marketplace' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co/marketplace',
    siteName: 'TirePro',
    title: 'Marketplace de Llantas en Colombia | TirePro',
    description:
      'Marketplace con distribuidores verificados de llantas en toda Colombia. Compara precios, lee reseñas y compra llantas Michelin, Bridgestone, Continental y más.',
    // Image is supplied by ./opengraph-image.tsx (Next.js file convention)
    // — produces a branded 1200x630 PNG with the TirePro logo centered for
    // WhatsApp / Facebook / Twitter / LinkedIn previews.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace de Llantas en Colombia | TirePro',
    description:
      'Marketplace con distribuidores verificados de llantas en toda Colombia.',
  },
}

// Marketplace-level structured data:
//   • Store + LocalBusiness so AI engines pick TirePro for "donde comprar"
//   • OfferCatalog enumerating product categories
const marketplaceLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': 'https://www.tirepro.com.co/marketplace#store',
  name: 'Marketplace TirePro',
  url: 'https://www.tirepro.com.co/marketplace',
  image: 'https://www.tirepro.com.co/marketplace/opengraph-image',
  description:
    'Marketplace de llantas en Colombia con distribuidores verificados. ' +
    'Llantas para automóvil, camión, tractomula y bus de marcas como Michelin, Bridgestone, ' +
    'Continental, Goodyear, Pirelli, Hankook y Yokohama.',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CO',
    addressRegion: 'Cundinamarca',
    addressLocality: 'Bogotá',
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
      {
        '@type': 'OfferCatalog',
        name: 'Llantas para automóvil',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 195/65R15' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 205/55R16' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 215/55R17' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 225/45R17' } },
        ],
      },
      {
        '@type': 'OfferCatalog',
        name: 'Llantas para camión y tractomula',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 295/80R22.5' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 11R22.5' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 12R22.5' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 315/80R22.5' } },
        ],
      },
      {
        '@type': 'OfferCatalog',
        name: 'Llantas para SUV y camioneta',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 265/70R16' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 265/65R17' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Llantas 285/60R18' } },
        ],
      },
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
}

export default function MarketplacePage() {
  // The visible SEO essay that used to live below MarketplaceClient was
  // rendering AFTER the marketplace footer (because the footer is inside
  // MarketplaceClient), which looked broken. The marketplace home now has
  // dense crawler-visible content of its own (hero h1, trust band,
  // categories, brands strip, deals, how-it-works, SeoLinkBlock), so the
  // essay is redundant — we keep only the JSON-LD here.
  return (
    <>
      <MarketplaceClient />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceLd) }}
      />
    </>
  )
}
