import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contacto TirePro — Soporte y Ventas Colombia | Llantas con IA',
  description:
    'Contacta al equipo de TirePro para soporte, ventas o demos del software de gestión de llantas con IA. ' +
    'Atendemos flotas de transporte en Bogotá, Medellín, Cali, Barranquilla y toda Colombia.',
  alternates: { canonical: 'https://www.tirepro.com.co/contact' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co/contact',
    siteName: 'TirePro',
    title: 'Contacto TirePro | Soporte y Ventas',
    description: 'Habla con el equipo de TirePro — software de gestión de llantas para flotas en Colombia.',
    images: [{ url: 'https://www.tirepro.com.co/og-image.png', width: 1200, height: 630 }],
  },
}

const contactLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  '@id': 'https://www.tirepro.com.co/contact#page',
  name: 'Contacto TirePro',
  url: 'https://www.tirepro.com.co/contact',
  inLanguage: 'es-CO',
  about: {
    '@type': 'Organization',
    name: 'TirePro',
    url: 'https://www.tirepro.com.co',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'info@tirepro.com.co',
        telephone: '+57-315-134-9122',
        contactType: 'customer support',
        areaServed: 'CO',
        availableLanguage: ['Spanish', 'English'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bogotá',
      addressRegion: 'Cundinamarca',
      addressCountry: 'CO',
    },
  },
}

export default function ContactPage() {
  return (
    <>
      <ContactClient />

      <section
        aria-labelledby="contact-seo-overview"
        className="bg-gray-50 py-16 px-6 lg:px-8 border-t border-gray-100"
      >
        <div className="max-w-4xl mx-auto">
          <h2 id="contact-seo-overview" className="text-3xl font-black text-[#0A183A] mb-6">
            Contacta a TirePro
          </h2>
          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              ¿Quieres reducir el costo de llantas de tu flota? Habla con el equipo de{' '}
              <strong>TirePro</strong>. Te asesoramos para configurar el software,
              integrarlo con tu operación y comenzar a generar ahorros desde el primer
              mes.
            </p>
            <p>
              Atendemos flotas de transporte de carga, pasajeros y comerciales en{' '}
              <strong>Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena</strong>{' '}
              y todo el país. También atendemos a distribuidores que quieran publicar
              sus llantas en el marketplace.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Email: <a href="mailto:info@tirepro.com.co" className="text-[#1E76B6] hover:underline">info@tirepro.com.co</a></li>
              <li>WhatsApp / Teléfono: <a href="tel:+573151349122" className="text-[#1E76B6] hover:underline">+57 315 134 9122</a></li>
              <li>Ubicación: Bogotá, Colombia</li>
            </ul>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactLd) }}
      />
    </>
  )
}
