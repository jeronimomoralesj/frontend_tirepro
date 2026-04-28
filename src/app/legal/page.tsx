import type { Metadata } from 'next'
import LegalClient from './LegalClient'

export const metadata: Metadata = {
  title: 'Términos y Política de Privacidad — TirePro Colombia',
  description:
    'Términos de servicio, política de privacidad y tratamiento de datos personales de TirePro. ' +
    'Cumplimiento con la normativa colombiana (Ley 1581 de 2012) y estándares de protección de datos.',
  alternates: { canonical: 'https://www.tirepro.com.co/legal' },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co/legal',
    siteName: 'TirePro',
    title: 'Términos y Política de Privacidad | TirePro',
    description: 'Términos de servicio y política de privacidad de TirePro.',
  },
}

export default function LegalPage() {
  return <LegalClient />
}
