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
  alternates: { canonical: 'https://tirepro.com.co/marketplace' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://tirepro.com.co/marketplace',
    siteName: 'TirePro',
    title: 'Marketplace de Llantas en Colombia | TirePro',
    description:
      'Marketplace con distribuidores verificados de llantas en toda Colombia. Compara precios, lee reseñas y compra llantas Michelin, Bridgestone, Continental y más.',
    images: [
      {
        url: 'https://tirepro.com.co/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Marketplace TirePro — Comprar llantas en Colombia',
      },
    ],
  },
}

// Marketplace-level structured data:
//   • Store + LocalBusiness so AI engines pick TirePro for "donde comprar"
//   • OfferCatalog enumerating product categories
const marketplaceLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': 'https://tirepro.com.co/marketplace#store',
  name: 'Marketplace TirePro',
  url: 'https://tirepro.com.co/marketplace',
  image: 'https://tirepro.com.co/og-image.png',
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
  return (
    <>
      <MarketplaceClient />

      {/*
        Server-rendered SEO content. Visible to users when they scroll past
        the marketplace search/grid (real content, not hidden text — Google
        penalizes cloaked text). Crawlers see this in the initial HTML
        response, which the client-rendered <MarketplaceClient> doesn't
        provide.
      */}
      <section
        aria-labelledby="marketplace-seo-overview"
        className="bg-gray-50 py-16 px-6 lg:px-8 border-t border-gray-100"
      >
        <div className="max-w-4xl mx-auto">
          <h2
            id="marketplace-seo-overview"
            className="text-3xl font-black text-[#0A183A] mb-6 tracking-tight"
          >
            Marketplace de llantas en Colombia
          </h2>

          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              El <strong>marketplace de TirePro</strong> conecta a compradores con{' '}
              <strong>distribuidores verificados de llantas en Colombia</strong>.
              Comparas precios, lees reseñas reales y compras en línea con la
              tranquilidad de que cada distribuidor pasó por nuestro proceso de
              verificación. Operamos en <strong>Bogotá, Medellín, Cali, Barranquilla,
              Cartagena, Bucaramanga</strong> y el resto del país.
            </p>
            <p>
              Encuentra <strong>llantas para automóvil</strong> en medidas comunes
              (195/65R15, 205/55R16, 215/55R17, 225/45R17), <strong>llantas para
              camión y tractomula</strong> (295/80R22.5, 11R22.5, 12R22.5, 315/80R22.5)
              y <strong>llantas para SUV</strong> (265/70R16, 285/60R18). Marcas
              disponibles: Michelin, Bridgestone, Continental, Goodyear, Pirelli,
              Hankook, Yokohama, Cooper, Maxxis y opciones nacionales.
            </p>
            <p>
              Muchos distribuidores ofrecen <strong>instalación gratuita</strong> en
              servitecas aliadas, además de servicios de alineación, balanceo y cambio
              de válvulas. Para flotas, integra el marketplace con el software TirePro
              de gestión y control de llantas con IA — calcula CPK en tiempo real,
              proyecta reemplazos y compra cuando lo necesites.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-[#0A183A] mb-3">
                Marcas en el marketplace
              </h3>
              <ul className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <li>Michelin</li>
                <li>Bridgestone</li>
                <li>Continental</li>
                <li>Goodyear</li>
                <li>Pirelli</li>
                <li>Hankook</li>
                <li>Yokohama</li>
                <li>Cooper</li>
                <li>Maxxis</li>
                <li>Roadlux</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0A183A] mb-3">
                Tipos de llanta disponibles
              </h3>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <li>Llantas para automóvil</li>
                <li>Llantas para SUV / 4x4</li>
                <li>Llantas para camión</li>
                <li>Llantas para tractomula</li>
                <li>Llantas para bus</li>
                <li>Llantas reencauchadas</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceLd) }}
      />
    </>
  )
}
