// src/app/sitemap.ts
import { MetadataRoute } from 'next'
import { POPULAR_DIMENSIONS, toDimensionSlug } from './marketplace/dimension/_lib/dimensions'
import { CITIES } from './marketplace/ciudad/_lib/cities'
import { CATEGORIES } from './marketplace/categoria/_lib/categories'
import { VEHICLES } from './marketplace/vehiculo/_lib/vehicles'
import { productHref } from './marketplace/product/_lib/url'

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.tirepro.com.co/api'

const BASE_URL = 'https://www.tirepro.com.co'

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

// Next.js's MetadataRoute.Sitemap emits the `images` array as raw text — it
// does NOT XML-escape ampersands, so any URL like
// `https://encrypted-tbn0.gstatic.com/images?q=tbn:...&s` ends up producing
// invalid XML (the `&s` is read as a malformed entity reference). We pre-
// escape `&` to `&amp;` and reject anything else that would break the parser.
function safeImageUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || url.length === 0) return null
  if (!/^https?:\/\//i.test(url)) return null
  // Bail on any other XML-special chars that shouldn't ever appear in a
  // real image URL anyway.
  if (/[<>"]/.test(url)) return null
  return url.replace(/&/g, '&amp;')
}

function safeImages(urls: (string | null | undefined)[]): string[] | undefined {
  const cleaned = urls
    .map(safeImageUrl)
    .filter((u): u is string => u !== null)
  return cleaned.length > 0 ? cleaned : undefined
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
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
      images: safeImages([`${BASE_URL}/og-image.png`, `${BASE_URL}/logo_full.png`]),
    },
    { url: `${BASE_URL}/calculadora`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: mostRecentPostDate, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
    { url: `${BASE_URL}/legal`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/equipo`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // -- Blog entries ------------------------------------------------------------
  // Include the cover image so Google Image search treats blog illustrations
  // as canonical and indexes them attached to the article URL (vs. floating
  // unattached on Unsplash/Pexels CDN).
  const postEntries: MetadataRoute.Sitemap = sortedPosts
    .filter((p) => p.slug && p.slug.trim() !== '' && p.published !== false)
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: safeDate(post.updatedAt || post.createdAt),
      changeFrequency: 'monthly' as const,
      priority: post.featured ? 0.85 : 0.75,
      images: safeImages([post.coverImage]),
    }))

  // -- Marketplace index -------------------------------------------------------
  const marketplaceStatic: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/marketplace`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
  ]

  // -- Dimension landing pages -------------------------------------------------
  // Dedicated /marketplace/dimension/[slug] routes — server-rendered pages
  // with H1, product grid, AggregateOffer JSON-LD, FAQ, and brand
  // cross-links. Replaced the old /marketplace?q=… query-string entries
  // because Google treats those as faceted search and won't anchor
  // authority to them. The dedicated route gives each dimension its own
  // canonical URL.
  const dimensionPages: MetadataRoute.Sitemap = POPULAR_DIMENSIONS.map((dim) => ({
    url: `${BASE_URL}/marketplace/dimension/${toDimensionSlug(dim)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // -- Brand/type search pages -------------------------------------------------
  // Pointed at /marketplace/buscar (SSR) instead of the client-side
  // /marketplace?q= so crawlers see the actual filtered product set
  // in the HTML, not the generic shell.
  const searchPages: MetadataRoute.Sitemap = POPULAR_SEARCHES.map((q) => ({
    url: `${BASE_URL}/marketplace/buscar?q=${encodeURIComponent(q)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // -- Category landing pages --------------------------------------------------
  // Vehicle-class and tipo (reencauche / nueva) landing pages. Filled in
  // alongside the dimension and city pages — together these three hubs
  // cover the canonical Colombian tire-buy intents.
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${BASE_URL}/marketplace/categoria/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // -- Vehicle landing pages ---------------------------------------------------
  // /marketplace/vehiculo/[slug] for each Colombian make+model in the
  // catalog. These target "llantas para Kia Picanto", "llantas para
  // Toyota Hilux" etc. — the most-searched intent class after
  // dimension and brand. Each page maps the vehicle to its stock
  // dimension(s) and renders the matching products SSR.
  const vehiclePages: MetadataRoute.Sitemap = VEHICLES.map((v) => ({
    url: `${BASE_URL}/marketplace/vehiculo/${v.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  // -- City landing pages ------------------------------------------------------
  // Dedicated /marketplace/ciudad/[slug] routes for the 15 largest
  // Colombian markets. Each one carries LocalBusiness array JSON-LD,
  // ItemList of distributors with cobertura in that city, and a
  // city-specific FAQ. These are the primary local-search vehicles.
  const cityPages: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${BASE_URL}/marketplace/ciudad/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // -- Fetch brands --------------------------------------------------------
  // Brand pages (/marketplace/brand/<slug>) are the canonical landing pages
  // for brand-name queries like "Michelin Colombia" or "comprar Bridgestone".
  // Previously omitted from the sitemap, which forced Google to discover them
  // only through internal linking — slower and incomplete.
  let brandEntries: MetadataRoute.Sitemap = []
  try {
    const brandsRes = await fetch(`${API_URL}/marketplace/brands`, { next: { revalidate: 7200 } })
    if (brandsRes.ok) {
      const brands = await brandsRes.json()
      brandEntries = (Array.isArray(brands) ? brands : [])
        .filter((b: any) => b?.slug && b.published !== false)
        .map((b: any) => {
          return {
            url: `${BASE_URL}/marketplace/brand/${b.slug}`,
            lastModified: safeDate(b.updatedAt),
            changeFrequency: 'weekly' as const,
            // Brand pages with listings rank higher than empty ones.
            priority: (b.listingCount ?? 0) > 0 ? 0.9 : 0.6,
            images: safeImages([b.heroImageUrl, b.logoUrl]),
          }
        })
    }
  } catch (error) {
    console.error('Sitemap brands fetch error:', error)
  }

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

      // Each product gets its image array attached so Google Image search
      // treats the canonical product URL as the landing page for those tire
      // photos. URL is the slug-id form (productHref) so search engines pick
      // up the SEO-friendly path on first crawl. Caps at 5 images per
      // product to stay within the 1000-images-per-URL limit.
      productEntries = listings.map((l: any) => {
        const imgs: string[] = Array.isArray(l.imageUrls) ? l.imageUrls.filter(Boolean) : []
        const cover = imgs[l.coverIndex ?? 0] ?? imgs[0]
        const ordered = cover ? [cover, ...imgs.filter((u: string) => u !== cover)] : imgs
        return {
          url: `${BASE_URL}${productHref(l)}`,
          lastModified: safeDate(l.updatedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          images: safeImages(ordered.slice(0, 5)),
        }
      })

      // Extract unique distributors. Prefer the slug for keyword-rich URLs
      // (/marketplace/distributor/merquellantas); fall back to the UUID for
      // any rare distributor that hasn't been backfilled yet.
      const distIds = new Set<string>()
      const distEntries: MetadataRoute.Sitemap = []
      for (const l of listings) {
        if (l.distributor?.id && !distIds.has(l.distributor.id)) {
          distIds.add(l.distributor.id)
          const distHandle = l.distributor.slug ?? l.distributor.id
          distEntries.push({
            url: `${BASE_URL}/marketplace/distributor/${distHandle}`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            // Brand-name landing pages — push high so Google reindexes them
            // quickly and treats them as authoritative for the distributor's
            // brand queries.
            priority: 0.95,
            images: safeImages([l.distributor.bannerImage, l.distributor.profileImage]),
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
    ...vehiclePages,
    ...categoryPages,
    ...cityPages,
    ...searchPages,
    ...brandEntries,
    ...distributorEntries,
    ...productEntries,
    ...postEntries,
  ]
}
