// src/app/blog/page.tsx — Server Component
import BlogClient from './BlogClient'

export const revalidate = 86400 // 24 hours

const PRIMARY = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : null
const FALLBACK = 'https://api.tirepro.com.co/api'

async function getAllArticles() {
  const urls = PRIMARY ? [PRIMARY, FALLBACK] : [FALLBACK]
  for (const base of urls) {
    try {
      const res = await fetch(`${base}/blog`, { next: { revalidate: 86400 } })
      if (!res.ok) continue
      const data = await res.json()
      return data.map((a: any) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        excerpt: a.subtitle || '',
        content: a.content,
        category: a.category || 'general',
        author: 'TirePro Team',
        date: a.createdAt,
        readTime: `${Math.ceil((a.content?.split(' ').length || 0) / 200)} min`,
        image: a.coverImage || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
        featured: false,
        hashtags: a.hashtags || [],
      }))
    } catch { continue }
  }
  return []
}

export default async function BlogPage() {
  const articles = await getAllArticles()
  return <BlogClient initialArticles={articles} />
}