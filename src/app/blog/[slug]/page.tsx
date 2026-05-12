import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticleClient from './ArticleClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.tirepro.com.co/api'

export const revalidate = 86400 // 24 hours

async function getArticle(slug: string) {
  try {
    const res = await fetch(`${API_URL}/blog/slug/${slug}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Same-category recommendations, server-rendered. Was fetched client-side
// before, so Googlebot never saw the outgoing links — that's exactly the
// internal-link signal an article hub needs. Fetching here makes the
// crawl graph dense between every post in the same category on first
// byte, and gives users at the bottom of the article a path forward
// without a JS round-trip.
type RelatedArticleLite = {
  id: string | number
  slug: string
  title: string
  subtitle?: string | null
  category?: string | null
  coverImage?: string | null
  content?: string
  createdAt?: string
  updatedAt?: string
  published?: boolean
}

async function getRelatedArticles(
  category: string | null | undefined,
  excludeId: string | number,
): Promise<RelatedArticleLite[]> {
  try {
    const res = await fetch(`${API_URL}/blog`, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const all: RelatedArticleLite[] = await res.json()
    const sameCat = all.filter(
      (a) =>
        a.published !== false &&
        a.slug &&
        a.id !== excludeId &&
        (a.category ?? '').toLowerCase() === (category ?? '').toLowerCase(),
    )
    const byRecency = (xs: RelatedArticleLite[]) =>
      [...xs].sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
      )
    // If the same-category pool is thin, fill the slate with the most
    // recent posts overall so the related strip never collapses to
    // zero (which would lose the internal-link signal entirely).
    if (sameCat.length >= 4) return byRecency(sameCat).slice(0, 4)
    const filler = all.filter(
      (a) => a.published !== false && a.slug && a.id !== excludeId && !sameCat.includes(a),
    )
    return [...byRecency(sameCat), ...byRecency(filler)].slice(0, 4)
  } catch {
    return []
  }
}

// Article body comes in as authored HTML and frequently includes its own
// <h1> — which competes with the page's actual H1 (article.title). Two
// H1s split topical signal and is a documented Google quality miss.
// We demote every body H1 to H2 server-side so the output always has
// exactly one H1 on the page, regardless of editor habits.
function demoteBodyH1s(html: string): string {
  if (!html) return html
  return html.replace(/<h1(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>')
}

export async function generateStaticParams() {
  const urls = process.env.NEXT_PUBLIC_API_URL
    ? [`${process.env.NEXT_PUBLIC_API_URL}/api`, 'https://api.tirepro.com.co/api']
    : ['https://api.tirepro.com.co/api']

  for (const base of urls) {
    try {
      const res = await fetch(`${base}/blog`)
      if (!res.ok) continue
      const posts = await res.json()
      return posts
        .filter((p: any) => p.slug)
        .map((p: any) => ({ slug: p.slug }))
    } catch { continue }
  }
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Artículo no encontrado - TirePro' }

  const description =
    article.subtitle ||
    article.content.replace(/<[^>]*>/g, '').slice(0, 155)

  // Title kept clean — the root layout's title template (`%s | TirePro`)
  // appends the brand once. Adding "- TirePro" here too produced
  // "... - TirePro | TirePro" in the SERP, which Google trims to the
  // duplicate brand suffix and which looked low-effort to human scanners.
  return {
    title: article.title,
    description,
    keywords: [
      ...(article.hashtags || []),
      'llantas',
      'mantenimiento',
      'TirePro',
      article.category,
    ].join(', '),
    openGraph: {
      title: article.title,
      description,
      images: [{ url: article.coverImage, width: 1200, height: 630 }],
      type: 'article',
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
      tags: article.hashtags,
      siteName: 'TirePro',
      locale: 'es_CO',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [article.coverImage],
      creator: '@TirePro',
      site: '@TirePro',
    },
    alternates: {
      canonical: `https://www.tirepro.com.co/blog/${article.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  // Strip body-level H1s + fetch same-category recommendations in
  // parallel with the rest of the render. Both go through the same
  // 24h ISR window so a fresh post propagates to its siblings within
  // a day.
  const cleanedContent = demoteBodyH1s(article.content ?? '')
  const relatedArticles = await getRelatedArticles(article.category, article.id)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description:
      article.subtitle ||
      article.content.replace(/<[^>]*>/g, '').slice(0, 155),
    image: [article.coverImage],
    datePublished: article.createdAt,
    dateModified: article.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'TirePro',
    },
    publisher: {
      '@type': 'Organization',
      name: 'TirePro',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.tirepro.com.co/logo_text.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.tirepro.com.co/blog/${article.slug}`,
    },
    keywords: article.hashtags?.join(', '),
    articleSection: article.category,
    wordCount: article.content
      ? article.content.replace(/<[^>]*>/g, '').split(' ').length
      : 0,
    inLanguage: 'es-CO',
  }

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: 'https://www.tirepro.com.co',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://www.tirepro.com.co/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `https://www.tirepro.com.co/blog/${article.slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <ArticleClient
        article={{ ...article, content: cleanedContent }}
        relatedArticles={relatedArticles.map((a) => ({
          id: typeof a.id === 'number' ? a.id : Number(a.id) || 0,
          title: a.title,
          slug: a.slug,
          excerpt: a.subtitle ?? (a.content ? a.content.replace(/<[^>]*>/g, ' ').slice(0, 140) : ''),
          category: a.category ?? 'general',
          date: a.createdAt ?? '',
          readTime: `${Math.max(1, Math.ceil((a.content ?? '').replace(/<[^>]*>/g, '').split(' ').length / 200))} min`,
          image:
            a.coverImage ??
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
        }))}
      />
    </>
  )
}