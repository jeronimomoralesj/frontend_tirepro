import { MetadataRoute } from 'next'

// =============================================================================
// robots.txt
//
// Strategy:
//   - "*" baseline rule allows everything public, blocks transactional/admin
//     surfaces and faceted-search params (which produce thin duplicates).
//   - Named allowlist for legitimate crawlers: search engines (every major
//     market), AI assistants, and social-share preview bots. Each is listed
//     explicitly so future tightening of the "*" rule never accidentally
//     locks them out.
//   - Named denylist for SEO-tool crawlers that burn crawl budget without
//     adding value (Ahrefs, Semrush, etc.) — they scrape millions of URLs
//     to power third-party SEO dashboards we don't subscribe to.
//
// We deliberately do NOT block "AI training" crawlers (GPTBot, ClaudeBot,
// Google-Extended, etc.). The user's stated goal is to be discoverable via
// AI agents/chatbots, which means letting those models read the catalog.
// =============================================================================

const PRIVATE_PATHS = [
  '/dashboard/', '/api/', '/driver-action/', '/login', '/registeruser',
  '/verify', '/delete', '/blog/admin/', '/_next/', '/settings',
  '/marketplace/cart', '/marketplace/order/',
  '/*?*sortBy=', '/*?*page=', '/*?*limit=',
]

// Search engines and shopping crawlers — given the same access as "*" but
// listed explicitly so they're always called out.
const SEARCH_BOTS = [
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-News',
  'Googlebot-Video',
  'Storebot-Google',         // Google Shopping crawler
  'AdsBot-Google',           // Google Ads landing-page check
  'Bingbot',                 // Bing + Bing Shopping
  'msnbot',                  // legacy MSN UA still seen in logs
  'Slurp',                   // Yahoo
  'DuckDuckBot',             // DuckDuckGo
  'Yandex',                  // Yandex (parent UA)
  'YandexBot',
  'YandexImages',
  'Baiduspider',             // Baidu
  'NaverBot',                // Naver (Korean SE)
  'Yeti',                    // Naver image bot
  'Applebot',                // Spotlight + Siri Suggestions
  'AppleNewsBot',
  'Mojeek',                  // independent EU search index
  'Petalbot',                // Huawei / Petal Search
  'SeznamBot',               // Czech search engine
]

// AI assistants / LLM crawlers — read the catalog so users asking ChatGPT,
// Claude, Perplexity, Gemini, etc. for tire recommendations get our products.
const AI_BOTS = [
  'GPTBot',                  // OpenAI training crawler
  'ChatGPT-User',            // ChatGPT browse / on-demand fetch
  'OAI-SearchBot',           // ChatGPT Search index
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Google-Extended',         // Bard / Gemini training opt-in
  'cohere-ai',
  'Cohere-AI',
  'Meta-ExternalAgent',
  'meta-externalagent',
  'FacebookBot',             // Meta AI training
  'Bytespider',              // ByteDance AI / TikTok recommendations
  'Amazonbot',               // Alexa / shopping AI
  'YouBot',                  // You.com AI search
  'DuckAssistBot',           // DuckDuckGo AI
  'Diffbot',                 // structured-data extractors used by AI tools
  'Kagibot',                 // Kagi search AI
  'mistralai-User',          // Mistral on-demand
  'Operator',                // OpenAI Operator agent
  'GoogleOther',             // misc Google research crawler
]

// Social / messaging share-preview bots. They fetch the page once when a
// user pastes a link to render the OG card. Always allowed — blocking them
// breaks link previews everywhere.
const SOCIAL_BOTS = [
  'facebookexternalhit',     // FB / Instagram / WhatsApp / Messenger preview
  'Facebot',
  'Twitterbot',              // X / Twitter
  'LinkedInBot',
  'Slackbot',
  'Slackbot-LinkExpanding',
  'Discordbot',
  'TelegramBot',
  'WhatsApp',
  'Pinterestbot',
  'redditbot',
  'Bluesky',
  'Mastodon',
  'Threads',
  'Iframely',                // generic OG resolver used by many platforms
  'embedly',
]

// SEO-tool scrapers we don't use — they burn server resources to build
// dashboards for competitors. Block to preserve crawl budget.
const BLOCKED_BOTS = [
  'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot',
  'DataForSeoBot', 'serpstatbot', 'AwarioRssBot', 'AwarioSmartBot',
  'magpie-crawler', 'PetalBotResearch', 'ZoominfoBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Baseline — allow public marketplace + blog content, block private.
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },

      // Search + AI + social — same baseline access, listed explicitly so
      // crawler-specific behavior changes (e.g. crawl-rate, snippet length)
      // can be tuned per-bot in the future.
      ...SEARCH_BOTS.map((ua) => ({
        userAgent: ua,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
      ...AI_BOTS.map((ua) => ({
        userAgent: ua,
        allow: '/',
        // AI bots get the same private-path block as everyone else; no
        // need to leak dashboard or admin URLs into a model's training.
        disallow: PRIVATE_PATHS,
      })),
      ...SOCIAL_BOTS.map((ua) => ({
        userAgent: ua,
        allow: '/',
      })),

      // Hard-deny crawl-budget wasters.
      ...BLOCKED_BOTS.map((ua) => ({ userAgent: ua, disallow: ['/'] })),
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
