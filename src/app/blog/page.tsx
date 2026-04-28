import type { Metadata } from 'next'
import BlogClient from './BlogClient'

export const revalidate = 3600

const PRIMARY = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : null
const FALLBACK = 'https://api.tirepro.com.co/api'

export const metadata: Metadata = {
  title: 'Blog de Llantas y Gestión de Flotas en Colombia — TirePro',
  description:
    'Guías sobre gestión de llantas, CPK, reencauche, mantenimiento de flotas y compra de neumáticos en Colombia. ' +
    'Casos prácticos para transportadores, distribuidores y gerentes de flota.',
  alternates: { canonical: 'https://www.tirepro.com.co/blog' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co/blog',
    siteName: 'TirePro',
    title: 'Blog de Llantas y Gestión de Flotas en Colombia | TirePro',
    description:
      'Estrategias de CPK, reencauche inteligente y compra de llantas para flotas colombianas.',
    images: [{ url: 'https://www.tirepro.com.co/og-image.png', width: 1200, height: 630 }],
  },
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      signal: controller.signal,
    })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

function mapArticle(a: any) {
  const wordCount = typeof a.content === 'string' ? a.content.split(' ').length : 0
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.subtitle || '',
    content: a.content,
    category: a.category || 'general',
    author: 'TirePro Team',
    date: a.createdAt,
    readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min`,
    image:
      a.coverImage ||
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
    featured: false,
    hashtags: a.hashtags || [],
  }
}

async function getAllArticles() {
  const urls = PRIMARY ? [PRIMARY, FALLBACK] : [FALLBACK]

  for (const base of urls) {
    try {
      const res = await fetchWithTimeout(`${base}/blog`, 5000)
      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data)) continue
      return data.map(mapArticle)
    } catch {
      continue
    }
  }
  return []
}

export default async function BlogPage() {
  const articles = await getAllArticles()

  const blogLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': 'https://www.tirepro.com.co/blog#blog',
    name: 'Blog TirePro',
    url: 'https://www.tirepro.com.co/blog',
    inLanguage: 'es-CO',
    description:
      'Guías de gestión de llantas, CPK, reencauche y mantenimiento de flotas en Colombia.',
    publisher: {
      '@type': 'Organization',
      name: 'TirePro',
      url: 'https://www.tirepro.com.co',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.tirepro.com.co/logo_full.png',
      },
    },
    blogPost: articles.slice(0, 20).map((a: any) => ({
      '@type': 'BlogPosting',
      headline: a.title,
      description: a.excerpt,
      url: `https://www.tirepro.com.co/blog/${a.slug}`,
      datePublished: a.date,
      image: a.image,
      author: { '@type': 'Organization', name: 'TirePro' },
    })),
  }

  return (
    <>
      <BlogClient initialArticles={articles} />

      <section
        aria-labelledby="blog-seo-overview"
        className="bg-gray-50 py-16 px-6 lg:px-8 border-t border-gray-100"
      >
        <div className="max-w-4xl mx-auto">
          <h2
            id="blog-seo-overview"
            className="text-3xl font-black text-[#0A183A] mb-6 tracking-tight"
          >
            Blog de gestión de llantas y flotas en Colombia
          </h2>

          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              El <strong>blog de TirePro</strong> reúne guías prácticas sobre{' '}
              <strong>gestión de llantas para flotas</strong>, cálculo de CPK (costo por
              kilómetro), <strong>reencauche inteligente</strong>, mantenimiento preventivo
              de neumáticos y compra de llantas en Colombia. Está dirigido a gerentes de
              flota, jefes de mantenimiento, transportadores y compradores de llantas.
            </p>
            <p>
              Cubrimos las marcas más usadas en flotas colombianas (
              <strong>Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook,
              Yokohama</strong>), medidas más comunes (295/80R22.5, 11R22.5, 315/80R22.5
              para tractomula; 265/70R16, 285/60R18 para SUV; 195/65R15, 205/55R16 para
              automóvil) y temas de operación: alineación, presión, rotación, retiro óptimo
              a 3mm para preservar el casco, reencauche y desecho.
            </p>
            <p>
              Si gestionas una flota de camiones, buses, tractomulas o volquetas en{' '}
              <strong>Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena</strong>{' '}
              o cualquier ciudad de Colombia, estos artículos te ayudan a reducir el costo
              de llantas y extender la vida útil de cada neumático.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-[#0A183A] mb-3">Categorías</h3>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <li>Tips de gestión de llantas</li>
                <li>Mantenimiento de neumáticos</li>
                <li>Reencauche y vida útil</li>
                <li>Análisis de CPK</li>
                <li>Tecnología y software de flotas</li>
                <li>Marcas y comparativos</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0A183A] mb-3">Temas frecuentes</h3>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <li>Cómo calcular el CPK de una llanta</li>
                <li>Cuándo reencauchar vs comprar nueva</li>
                <li>Cómo leer una llanta de camión</li>
                <li>Mejores marcas de llantas para tractomula</li>
                <li>Presión correcta para llantas de carga</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
    </>
  )
}
