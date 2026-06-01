import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión — TirePro',
  description:
    'Inicia sesión en TirePro para gestionar las llantas de tu flota con IA. Accede a tu dashboard, inspecciones, CPK y recomendaciones.',
  alternates: { canonical: 'https://www.tirepro.com.co/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
