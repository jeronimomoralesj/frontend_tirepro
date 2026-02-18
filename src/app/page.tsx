// src/app/page.tsx  — Server Component, handles ISR
import TireProLanding from './landing'

export const revalidate = 162000 // 45 hours

async function getArticles() {
  const urls = [
    'https://api.tirepro.com.co/api',
    'https://api.triepro.com.co/api',
  ]
  for (const base of urls) {
    try {
      const res = await fetch(`${base}/blog`, { next: { revalidate: 162000 } })
      if (!res.ok) continue
      const data = await res.json()
      return data
        .map((a: any) => ({
          id: a.id,
          slug: a.slug || a.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'),
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
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
    } catch { continue }
  }
  return []
}

export default async function Page() {
  const articles = await getArticles()
  return <TireProLanding initialArticles={articles} />
}