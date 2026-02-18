// src/app/sitemap.ts
import { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:6001/api'

const BASE_URL = 'https://www.tirepro.com.co'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: any[] = []

  try {
    const res = await fetch(`${API_URL}/blog`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      posts = await res.json()
    }
  } catch (error) {
    console.error('Sitemap fetch error:', error)
  }

  // Dynamic blog article entries — one URL per article
  const postEntries: MetadataRoute.Sitemap = posts
    .filter((p) => p.slug && p.slug.trim() !== '')
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.createdAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: posts.length > 0
        ? new Date(posts[0].createdAt)  // most recent post date
        : new Date(),
      changeFrequency: 'weekly' as const,  // blog index updates often
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/companyregister`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/legal`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]

  return [...staticPages, ...postEntries]
}