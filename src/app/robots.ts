import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/', 
        '/verify/', 
        '/login', 
        '/registeruser', 
        '/context/', // Internal logic
        '/delete',    // User data deletion page
      ],
    },
    sitemap: 'https://www.tirepro.com.co/sitemap.xml',
  }
}