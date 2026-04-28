import type { Metadata } from 'next'
import EquipoClient from './EquipoClient'

export const metadata: Metadata = {
  title: 'Equipo TirePro — Quiénes Somos | Software de Llantas con IA Colombia',
  description:
    'Conoce al equipo detrás de TirePro: ingenieros, expertos en llantas y especialistas en flotas trabajando ' +
    'desde Bogotá para reducir el costo de llantas en flotas colombianas con IA.',
  alternates: { canonical: 'https://www.tirepro.com.co/equipo' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co/equipo',
    siteName: 'TirePro',
    title: 'Equipo TirePro | Quiénes Somos',
    description: 'El equipo detrás de TirePro — software de gestión de llantas con IA en Colombia.',
    images: [{ url: 'https://www.tirepro.com.co/og-image.png', width: 1200, height: 630 }],
  },
}

const aboutLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': 'https://www.tirepro.com.co/equipo#about',
  name: 'Sobre TirePro',
  url: 'https://www.tirepro.com.co/equipo',
  inLanguage: 'es-CO',
  about: {
    '@type': 'Organization',
    name: 'TirePro',
    url: 'https://www.tirepro.com.co',
    foundingLocation: { '@type': 'Place', name: 'Bogotá, Colombia' },
    foundingDate: '2024',
  },
}

export default function EquipoPage() {
  return (
    <>
      <EquipoClient />

      <section
        aria-labelledby="equipo-seo-overview"
        className="bg-gray-50 py-16 px-6 lg:px-8 border-t border-gray-100"
      >
        <div className="max-w-4xl mx-auto">
          <h2 id="equipo-seo-overview" className="text-3xl font-black text-[#0A183A] mb-6">
            Quiénes somos — TirePro
          </h2>
          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              <strong>TirePro</strong> es una empresa colombiana de tecnología fundada en{' '}
              Bogotá en 2024 con una misión clara: ayudar a las flotas de transporte
              colombianas a reducir el costo de llantas mediante inteligencia artificial
              y datos en tiempo real.
            </p>
            <p>
              Nuestro equipo combina experiencia en <strong>ingeniería de llantas,
              software, ciencia de datos e IA</strong> para construir dos productos
              integrados: la plataforma de gestión de flota y el marketplace de llantas
              con distribuidores verificados en toda Colombia.
            </p>
            <p>
              Trabajamos con transportadores, distribuidores y operadores logísticos en{' '}
              Bogotá, Medellín, Cali, Barranquilla y todo el país para que cada decisión
              de llantas esté respaldada por datos.
            </p>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }}
      />
    </>
  )
}
