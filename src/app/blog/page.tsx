// src/app/blog/page.tsx — Server Component
import BlogClient from './BlogClient'

// Shorter ISR window than the original 24h: if the API is briefly down when
// a deploy builds (like the IP-change outage we had), the empty result now
// auto-corrects in an hour instead of sticking for a full day.
export const revalidate = 3600 // 1 hour

const PRIMARY = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : null
const FALLBACK = 'https://api.tirepro.com.co/api'

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
  return <BlogClient initialArticles={articles} />
}