import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crear Cuenta Gratis — TirePro',
  description:
    'Crea tu cuenta gratis en TirePro. Software de gestión de llantas con IA para flotas en Colombia. Hasta 10 vehículos gratis para siempre.',
  alternates: { canonical: 'https://www.tirepro.com.co/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
