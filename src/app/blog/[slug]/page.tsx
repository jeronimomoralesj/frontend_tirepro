import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticleClient from './ArticleClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:6001/api'

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

  return {
    title: `${article.title} - TirePro`,
    description,
    keywords: [
      ...(article.hashtags || []),
      'llantas',
      'mantenimiento',
      'TirePro',
      article.category,
    ].join(', '),
    openGraph: {
      title: `${article.title} - TirePro`,
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
      title: `${article.title} - TirePro`,
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
      <ArticleClient article={article} />
    </>
  )
}