import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/', '/api/', '/driver-action/', '/login', '/registeruser',
          '/verify', '/delete', '/blog/admin/', '/_next/', '/settings',
          // Transactional surfaces — burn no crawl budget on per-user pages.
          '/marketplace/cart', '/marketplace/order/',
          // Faceted-search params — `?sortBy=`, `?page=`, `?limit=` etc.
          // produce thin duplicates of the same product set. Strip them
          // from the index so the canonical /marketplace path is the
          // only one ranked. Note: `?q=` is intentionally allowed —
          // those are the dimension/brand landing variants we DO want
          // ranked (and which the dynamic sitemap surfaces).
          '/*?*sortBy=', '/*?*page=', '/*?*limit=',
        ],
      },
      // Google — full access to all public content including images
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Googlebot-Image', allow: '/' },
      { userAgent: 'Storebot-Google', allow: '/' },
      // AI crawlers — allow indexing for AI search (Perplexity, ChatGPT, etc.)
      { userAgent: 'GPTBot', allow: '/', disallow: ['/dashboard/', '/api/', '/_next/'] },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'cohere-ai', allow: '/' },
      { userAgent: 'meta-externalagent', allow: '/' },
      // Block crawl-budget wasters
      { userAgent: 'AhrefsBot', disallow: ['/'] },
      { userAgent: 'SemrushBot', disallow: ['/'] },
      { userAgent: 'MJ12bot', disallow: ['/'] },
      { userAgent: 'DotBot', disallow: ['/'] },
      { userAgent: 'BLEXBot', disallow: ['/'] },
    ],
    sitemap: [
      'https://www.tirepro.com.co/sitemap.xml',
      // Image sitemap with explicit per-image titles and captions so each
      // tire photo is associated with its product (not the page title of
      // whichever URL Googlebot first encountered it on).
      'https://www.tirepro.com.co/sitemap-images.xml',
      // Google Merchant Center / Bing Merchant Center product feed.
      // Listed here so other crawlers and AI engines can also discover it.
      'https://www.tirepro.com.co/feed.xml',
    ],
    host: 'https://www.tirepro.com.co',
  }
}
