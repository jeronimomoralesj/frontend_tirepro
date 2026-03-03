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
        '/context/',
        '/delete',
      ],
    },
    sitemap: 'https://www.tirepro.com.co/sitemap.xml',
  }
}