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

// Per-page metadata. Overrides the layout's defaults with copy tuned for
// "comprar llantas Colombia" type queries — the layout leans toward fleet
// management which is more B2B / SaaS oriented.
export const metadata: Metadata = {
  title:
    'Comprar Llantas en Colombia | Marketplace con Distribuidores Verificados — TirePro',
  description:
    'Compra llantas para carro, camión, tractomula o flota directo de distribuidores verificados en Bogotá, Medellín, Cali y toda Colombia. ' +
    'Marketplace TirePro: precios competitivos, distribuidores con calificación, instalación incluida y software gratuito de gestión de llantas con IA.',
  alternates: { canonical: 'https://tirepro.com.co' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://tirepro.com.co',
    siteName: 'TirePro',
    title: 'Comprar Llantas en Colombia | Marketplace TirePro',
    description:
      'Marketplace de llantas con distribuidores verificados en toda Colombia. Software de gestión de llantas con IA para flotas. CPK, predicción de reemplazo, alertas.',
    images: [
      {
        url: 'https://tirepro.com.co/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TirePro — Comprar y gestionar llantas en Colombia',
      },
    ],
  },
}

// LocalBusiness with explicit Bogotá geo + areaServed for the major
// Colombian cities. This is the JSON-LD type AI search engines look for
// when answering "donde comprar X en [city]" queries — it tells them
// TirePro is a real business serving those cities.
const localBusinessLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://tirepro.com.co/#localbusiness',
  name: 'TirePro',
  url: 'https://tirepro.com.co',
  logo: 'https://tirepro.com.co/logo_full.png',
  image: 'https://tirepro.com.co/og-image.png',
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

async function getArticles() {
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}/blog`, { next: { revalidate: 162000 } })
      if (!res.ok) continue
      const data = await res.json()
      return data
        .map((a: any) => ({
          id: a.id,
          slug:
            a.slug ||
            a.title
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-'),
          title: a.title,
          excerpt: a.subtitle || '',
          content: a.content,
          category: a.category || 'general',
          author: 'TirePro Team',
          date: a.createdAt,
          readTime: `${Math.ceil((a.content?.split(' ').length || 0) / 200)} min`,
          image:
            a.coverImage ||
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
          featured: false,
          hashtags: a.hashtags || [],
        }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
    } catch {
      continue
    }
  }
  return []
}

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
  const [articles, bestSellers] = await Promise.all([getArticles(), getBestSellers()])

  return (
    <>
      <TireProLanding initialArticles={articles} bestSellers={bestSellers} />

      {/*
        Server-rendered SEO content. Visible to users when they scroll past
        the landing's hero (real content, not hidden text — Google penalizes
        cloaked text). Crawlers see this in the initial HTML response, which
        the client-rendered <TireProLanding> above doesn't provide.
      */}
      <section
        aria-labelledby="seo-overview"
        className="bg-white py-16 px-6 lg:px-8 border-t border-gray-100"
      >
        <div className="max-w-4xl mx-auto">
          <h2
            id="seo-overview"
            className="text-3xl font-black text-[#0A183A] mb-6 tracking-tight"
          >
            Comprar llantas en Colombia con TirePro
          </h2>

          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              <strong>TirePro</strong> es la plataforma colombiana para{' '}
              <strong>comprar llantas</strong> a distribuidores verificados y para{' '}
              <strong>gestionar las llantas de tu flota</strong> con inteligencia
              artificial. Operamos en <strong>Bogotá, Medellín, Cali, Barranquilla,
              Cartagena, Bucaramanga</strong> y todas las ciudades principales del país,
              con marcas como Michelin, Bridgestone, Continental, Goodyear, Pirelli,
              Hankook y Yokohama.
            </p>
            <p>
              En nuestro <strong>marketplace</strong> encuentras llantas para{' '}
              <strong>automóvil, camión, tractomula y bus</strong>, en medidas estándar
              (205/55R16, 265/70R16) y comerciales (295/80R22.5, 11R22.5). Los
              distribuidores aliados ofrecen instalación, alineación, balanceo y
              entregas a domicilio en todo el territorio nacional.
            </p>
            <p>
              Para <strong>flotas</strong>, TirePro ofrece el software más completo
              de gestión y control de llantas con IA: cálculo de{' '}
              <strong>CPK (costo por kilómetro)</strong> en tiempo real, predicción
              de reemplazo, alertas de desgaste, inspecciones digitales con foto y
              recomendaciones de compra. Empresas como las que operan tractomulas en
              rutas largas reducen costos hasta un 25% gracias a nuestra plataforma.
            </p>
          </div>

          {/* Cities served — important for "donde comprar llantas en [city]" queries */}
          <div className="mt-10">
            <h3 className="text-lg font-bold text-[#0A183A] mb-4">
              Ciudades donde TirePro opera
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm text-gray-600">
              <li>Bogotá</li>
              <li>Medellín</li>
              <li>Cali</li>
              <li>Barranquilla</li>
              <li>Cartagena</li>
              <li>Bucaramanga</li>
              <li>Pereira</li>
              <li>Manizales</li>
              <li>Cúcuta</li>
              <li>Ibagué</li>
              <li>Santa Marta</li>
              <li>Villavicencio</li>
            </ul>
          </div>

          {/* FAQ — answers the questions Gemini/ChatGPT users actually ask. The
              layout already exposes a global FAQPage schema; this block reinforces
              the same content visually so users see the answers too. */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-[#0A183A] mb-6">
              Preguntas frecuentes
            </h3>
            <div className="space-y-5">
              <div>
                <h4 className="font-bold text-[#0A183A] mb-1">
                  ¿Dónde puedo comprar llantas nuevas en Bogotá?
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  En el marketplace de TirePro encuentras llantas nuevas de marcas
                  reconocidas a través de distribuidores verificados en Bogotá y toda
                  Colombia, con instalación incluida y entrega a domicilio.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0A183A] mb-1">
                  ¿Cuáles marcas de llantas se venden en TirePro?
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook,
                  Yokohama, Cooper, Maxxis y marcas locales. Llantas para carro,
                  camión, tractomula, bus y maquinaria.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0A183A] mb-1">
                  ¿TirePro envía llantas a toda Colombia?
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Sí. Los distribuidores aliados despachan a Medellín, Cali,
                  Barranquilla, Cartagena, Bucaramanga, Pereira y todas las ciudades
                  principales. Algunos ofrecen instalación gratuita en sus servitecas
                  aliadas.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0A183A] mb-1">
                  ¿Qué es el CPK y cómo lo calcula TirePro?
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  El CPK (costo por kilómetro) mide cuánto cuesta cada kilómetro de
                  uso de una llanta. TirePro lo calcula automáticamente desde las
                  inspecciones digitales y el odómetro del vehículo, permitiendo
                  comparar marcas y diseños para tu flota.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#0A183A] mb-1">
                  ¿El software de gestión de TirePro tiene costo?
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Tenemos plan gratuito para flotas pequeñas y planes pagos con
                  funciones avanzadas (predicción con IA, alertas automáticas,
                  marketplace integrado). Consulta los planes en nuestra página de
                  precios.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LocalBusiness + Geo JSON-LD — surfaces TirePro in AI search results
          for "donde comprar llantas" queries with city context. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
      />
    </>
  )
}
