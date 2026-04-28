import type { Metadata } from 'next'
import CalculadoraClient from './CalculadoraClient'

export const metadata: Metadata = {
  title:
    'Calculadora de CPK de Llantas Gratuita — Costo por Kilómetro | TirePro',
  description:
    'Calcula el CPK (costo por kilómetro) de tus llantas gratis. Ideal para flotas de camiones, tractomulas, buses y volquetas en Colombia. ' +
    'Descubre cuánto te cuesta cada kilómetro y dónde está el margen de ahorro.',
  alternates: { canonical: 'https://www.tirepro.com.co/calculadora' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co/calculadora',
    siteName: 'TirePro',
    title: 'Calculadora de CPK de Llantas Gratuita | TirePro',
    description:
      'Calcula el costo por kilómetro de tus llantas y descubre cuánto puedes ahorrar en tu flota.',
    images: [{ url: 'https://www.tirepro.com.co/og-image.png', width: 1200, height: 630 }],
  },
}

const calcLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': 'https://www.tirepro.com.co/calculadora#app',
  name: 'Calculadora de CPK de Llantas TirePro',
  url: 'https://www.tirepro.com.co/calculadora',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: 'es-CO',
  description:
    'Herramienta gratuita para calcular el costo por kilómetro (CPK) de llantas de camión, tractomula, bus, camioneta y automóvil en Colombia.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'COP' },
  publisher: {
    '@type': 'Organization',
    name: 'TirePro',
    url: 'https://www.tirepro.com.co',
  },
}

export default function CalculadoraPage() {
  return (
    <>
      <CalculadoraClient />

      <section
        aria-labelledby="calc-seo-overview"
        className="bg-gray-50 py-16 px-6 lg:px-8 border-t border-gray-100"
      >
        <div className="max-w-4xl mx-auto">
          <h2
            id="calc-seo-overview"
            className="text-3xl font-black text-[#0A183A] mb-6 tracking-tight"
          >
            Calculadora de CPK de llantas para flotas en Colombia
          </h2>

          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              El <strong>CPK (costo por kilómetro)</strong> es el indicador clave para
              medir la eficiencia de las llantas en una flota. Esta calculadora gratuita
              te muestra cuánto te cuesta cada kilómetro recorrido en cada llanta y
              cuánto puedes ahorrar comparando marcas, dimensiones y opciones de
              reencauche.
            </p>
            <p>
              Es ideal para <strong>flotas de transporte de carga</strong> (tractomulas,
              camiones rígidos, volquetas), <strong>flotas de pasajeros</strong> (buses
              intermunicipales, urbanos), <strong>flotas comerciales</strong> (camionetas,
              vans de reparto) y operaciones de <strong>transporte público</strong> en{' '}
              Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena y todo el
              país.
            </p>
            <p>
              ¿Cómo se calcula? CPK = Precio de la llanta ÷ Kilómetros recorridos hasta
              el retiro. Una llanta de $2.000.000 que rinde 120.000 km tiene un CPK de
              $16,67. Las flotas optimizadas con TirePro reducen el CPK hasta un 25%
              mediante mejor presión, alineación, retiro óptimo a 3mm y reencauche
              certificado.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-[#0A183A] mb-3">¿Para qué sirve?</h3>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <li>Comparar marcas (Michelin vs Bridgestone vs Hankook)</li>
                <li>Decidir entre llanta nueva y reencauche</li>
                <li>Justificar inversiones en alineación y presión</li>
                <li>Calcular el ROI de cambiar de proveedor</li>
                <li>Negociar mejor con distribuidores</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0A183A] mb-3">Más allá del CPK</h3>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <li>Software TirePro: gestión completa de flota con IA</li>
                <li>Marketplace: compra de llantas a distribuidores verificados</li>
                <li>Predicción de reemplazo y reencauche</li>
                <li>Alertas automáticas a conductores vía WhatsApp</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcLd) }}
      />
    </>
  )
}
