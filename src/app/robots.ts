// src/app/robots.ts
import { MetadataRoute } from 'next'

const BASE_URL = 'https://www.tirepro.com.co'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Default: all well-behaved crawlers (Google, Bing, etc.) ─────────────
      {
        userAgent: '*',
        allow: [
          '/',
          '/blog/',
          '/blog',
          '/calculadora/',
          '/calculadora',
          '/contact',
          '/equipo',
          '/developers',
          '/companyregister',
          '/legal',
        ],
        disallow: [
          // Auth & private app routes
          '/login',
          '/registeruser',
          '/dashboard',
          '/dashboard/',
          // Verification / utility routes
          '/verify',
          '/verify/',
          '/delete',
          '/context',
          // Internal blog admin
          '/blog/admin',
          '/blog/admin/',
          // API routes — no value to index
          '/api/',
          // Next.js internals
          '/_next/',
          '/static/',
        ],
      },

      // ── GPTBot (ChatGPT / OpenAI) — allow full public content ───────────────
      // Letting GPT crawl increases chances of ChatGPT recommending TirePro
      {
        userAgent: 'GPTBot',
        allow: [
          '/',
          '/blog/',
          '/calculadora/',
          '/companyregister',
          '/contact',
          '/equipo',
        ],
        disallow: [
          '/dashboard',
          '/login',
          '/api/',
          '/_next/',
        ],
      },

      // ── Claude / Anthropic bot ───────────────────────────────────────────────
      {
        userAgent: 'anthropic-ai',
        allow: [
          '/',
          '/blog/',
          '/calculadora/',
          '/companyregister',
          '/contact',
        ],
        disallow: [
          '/dashboard',
          '/login',
          '/api/',
          '/_next/',
        ],
      },

      // ── Google Extended (Gemini / Bard training) ─────────────────────────────
      {
        userAgent: 'Google-Extended',
        allow: [
          '/',
          '/blog/',
          '/calculadora/',
          '/companyregister',
        ],
        disallow: [
          '/dashboard',
          '/login',
          '/api/',
          '/_next/',
        ],
      },

      // ── PerplexityBot ────────────────────────────────────────────────────────
      {
        userAgent: 'PerplexityBot',
        allow: [
          '/',
          '/blog/',
          '/calculadora/',
          '/companyregister',
          '/contact',
        ],
        disallow: [
          '/dashboard',
          '/login',
          '/api/',
          '/_next/',
        ],
      },

      // ── Cohere AI ────────────────────────────────────────────────────────────
      {
        userAgent: 'cohere-ai',
        allow: ['/'],
        disallow: ['/dashboard', '/login', '/api/'],
      },

      // ── Meta AI ──────────────────────────────────────────────────────────────
      {
        userAgent: 'meta-externalagent',
        allow: ['/'],
        disallow: ['/dashboard', '/login', '/api/'],
      },

      // ── Malicious / scraper bots — block entirely ────────────────────────────
      { userAgent: 'AhrefsBot',  disallow: ['/'] },
      { userAgent: 'SemrushBot', disallow: ['/'] },
      { userAgent: 'MJ12bot',    disallow: ['/'] },
      { userAgent: 'DotBot',     disallow: ['/'] },
      { userAgent: 'BLEXBot',    disallow: ['/'] },
      { userAgent: 'PetalBot',   disallow: ['/'] },
    ],

    sitemap: `${BASE_URL}/sitemap.xml`,
    host:    BASE_URL,
  }
}