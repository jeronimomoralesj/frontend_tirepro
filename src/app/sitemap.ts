// src/app/sitemap.ts
import { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.tirepro.com.co/api'

const BASE_URL = 'https://tirepro.com.co'

// Popular tire dimensions searched in Colombia — these become indexable landing pages
const POPULAR_DIMENSIONS = [
  '295/80R22.5', '11R22.5', '315/80R22.5', '12R22.5',
  '275/80R22.5', '225/70R19.5', '215/75R17.5', '235/75R17.5',
  '7.50R16', '9.5R17.5', '12R24.5', '11R24.5',
  '265/70R16', '245/70R16', '235/75R15',
  '205/55R16', '195/65R15', '215/60R16', '195/55R16',
  '185/65R15', '175/70R13', '205/65R15',
]

// Popular search terms for marketplace
const POPULAR_SEARCHES = [
  'Michelin', 'Bridgestone', 'Continental', 'Goodyear', 'Firestone',
  'Hankook', 'Yokohama', 'Pirelli',
  'reencauche', 'camion', 'camioneta', 'tractomula', 'bus',
]

function safeDate(value: string | null | undefined): Date {
  if (!value) return new Date()
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // -- Fetch blog posts --------------------------------------------------------
  let posts: any[] = []
  try {
    const res = await fetch(`${API_URL}/blog`, { next: { revalidate: 7200 } })
    if (res.ok) posts = await res.json()
  } catch (error) {
    console.error('Sitemap blog fetch error:', error)
  }

  const sortedPosts = [...posts].sort(
    (a, b) => safeDate(b.updatedAt || b.createdAt).getTime() - safeDate(a.updatedAt || a.createdAt).getTime(),
  )
  const mostRecentPostDate = sortedPosts.length > 0
    ? safeDate(sortedPosts[0].updatedAt || sortedPosts[0].createdAt)
    : new Date()

  // -- Static pages ------------------------------------------------------------
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/calculadora`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: mostRecentPostDate, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
    { url: `${BASE_URL}/legal`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // -- Blog entries ------------------------------------------------------------
  const postEntries: MetadataRoute.Sitemap = sortedPosts
    .filter((p) => p.slug && p.slug.trim() !== '' && p.published !== false)
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: safeDate(post.updatedAt || post.createdAt),
      changeFrequency: 'monthly' as const,
      priority: post.featured ? 0.85 : 0.75,
    }))

  // -- Marketplace index -------------------------------------------------------
  const marketplaceStatic: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/marketplace`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
  ]

  // -- Dimension landing pages (e.g. /marketplace?q=295/80R22.5) ---------------
  // These are the money pages — someone searching "295/80R22.5 Colombia" should land here
  const dimensionPages: MetadataRoute.Sitemap = POPULAR_DIMENSIONS.map((dim) => ({
    url: `${BASE_URL}/marketplace?q=${encodeURIComponent(dim)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // -- Brand/type search pages -------------------------------------------------
  const searchPages: MetadataRoute.Sitemap = POPULAR_SEARCHES.map((q) => ({
    url: `${BASE_URL}/marketplace?q=${encodeURIComponent(q)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // -- Fetch marketplace listings for product + distributor pages ---------------
  let productEntries: MetadataRoute.Sitemap = []
  let distributorEntries: MetadataRoute.Sitemap = []
  try {
    const listingsRes = await fetch(`${API_URL}/marketplace/listings?limit=1000&sortBy=newest`, {
      next: { revalidate: 7200 },
    })
    if (listingsRes.ok) {
      const data = await listingsRes.json()
      const listings = data.listings ?? []

      productEntries = listings.map((l: any) => ({
        url: `${BASE_URL}/marketplace/product/${l.id}`,
        lastModified: safeDate(l.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))

      // Extract unique distributors
      const distIds = new Set<string>()
      const distEntries: MetadataRoute.Sitemap = []
      for (const l of listings) {
        if (l.distributor?.id && !distIds.has(l.distributor.id)) {
          distIds.add(l.distributor.id)
          distEntries.push({
            url: `${BASE_URL}/marketplace/distributor/${l.distributor.id}`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            // Brand-name landing pages — push high so Google reindexes them
            // quickly and treats them as authoritative for the distributor's
            // brand queries.
            priority: 0.95,
          })
        }
      }
      distributorEntries = distEntries
    }
  } catch (error) {
    console.error('Sitemap marketplace fetch error:', error)
  }

  return [
    ...staticPages,
    ...marketplaceStatic,
    ...dimensionPages,
    ...searchPages,
    ...distributorEntries,
    ...productEntries,
    ...postEntries,
  ]
}
