// src/app/sitemap.ts
import { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:6001/api'

const BASE_URL = 'https://tirepro.com.co'

// ─── Helper — safe date that never throws ────────────────────────────────────
function safeDate(value: string | null | undefined): Date {
  if (!value) return new Date()
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Fetch blog posts ────────────────────────────────────────────────────────
  let posts: any[] = []
  try {
    const res = await fetch(`${API_URL}/blog`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) posts = await res.json()
  } catch (error) {
    console.error('Sitemap blog fetch error:', error)
  }

  // Sort posts newest-first so blog index lastModified is accurate
  const sortedPosts = [...posts].sort(
    (a, b) =>
      safeDate(b.updatedAt || b.createdAt).getTime() -
      safeDate(a.updatedAt || a.createdAt).getTime(),
  )

  const mostRecentPostDate =
    sortedPosts.length > 0
      ? safeDate(sortedPosts[0].updatedAt || sortedPosts[0].createdAt)
      : new Date()

  // ── Static pages ────────────────────────────────────────────────────────────
  // Priority scale:
  //  1.0 → homepage (most important)
  //  0.9 → high-conversion pages (register, calculadora)
  //  0.8 → important content (blog index, contact)
  //  0.7 → supporting content (equipo, developers)
  //  0.4 → low-value / legal
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:             BASE_URL,
      lastModified:    new Date(),
      changeFrequency: 'weekly',
      priority:        1.0,
    },
    {
      // High-intent landing page — separate route if you have one
      url:             `${BASE_URL}/#producto`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.9,
    },
    {
      // Calculadora — standalone SEO page, high intent keyword
      url:             `${BASE_URL}/calculadora`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.9,
    },
    {
      // Registration — main conversion page
      url:             `${BASE_URL}/companyregister`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.9,
    },
    {
      // Blog index — updated frequently, high SEO value
      url:             `${BASE_URL}/blog`,
      lastModified:    mostRecentPostDate,
      changeFrequency: 'weekly',
      priority:        0.85,
    },
    {
      url:             `${BASE_URL}/contact`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.6,
    },
    {
      url:             `${BASE_URL}/equipo`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.5,
    },
    {
      url:             `${BASE_URL}/developers`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.4,
    },
    {
      url:             `${BASE_URL}/legal`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.3,
    },
  ]

  // ── Dynamic blog post entries ───────────────────────────────────────────────
  const postEntries: MetadataRoute.Sitemap = sortedPosts
    .filter((p) => p.slug && p.slug.trim() !== '' && p.published !== false)
    .map((post) => ({
      url:             `${BASE_URL}/blog/${post.slug}`,
      lastModified:    safeDate(post.updatedAt || post.createdAt),
      changeFrequency: 'monthly' as const,
      // Featured posts get a small priority boost
      priority:        post.featured ? 0.85 : 0.75,
    }))

  return [...staticPages, ...postEntries]
}