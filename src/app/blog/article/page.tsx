'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Head from 'next/head'
import { useSearchParams } from 'next/navigation'
import { 
  Menu,
  X,
  Calendar,
  Clock,
  User,
  ChevronLeft,
  Tag,
  Loader,
  Share2,
  BookOpen,
  ArrowUp
} from 'lucide-react'
import logo from "../../../../public/logo_text.png"
import logoTire from "../../../../public/logo_tire.png"

// Create a separate component for the article content that uses useSearchParams
const ArticleContent = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [article, setArticle] = useState(null)
  const [relatedArticles, setRelatedArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const searchParams = useSearchParams()
  const articleId = searchParams.get('id')

  // API configuration
  const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : null
  const FALLBACK_API_URL = 'http://localhost:6001/api'

  const makeApiRequest = async (endpoint, options = {}) => {
    const urls = PRIMARY_API_URL ? [PRIMARY_API_URL, FALLBACK_API_URL] : [FALLBACK_API_URL]
    
    for (const baseUrl of urls) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })
        
        if (response.ok) {
          return response
        }
      } catch (error) {
        console.warn(`Failed to connect to ${baseUrl}:`, error.message)
        continue
      }
    }
    
    throw new Error('All API endpoints failed')
  }

  // Calculate estimated read time based on content length
  const calculateReadTime = (content) => {
    const wordsPerMinute = 200
    const wordCount = content ? content.split(' ').length : 0
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return `${minutes} min`
  }

  // Extract plain text from HTML content for meta descriptions
  const extractTextFromHTML = (html, maxLength = 155) => {
    if (!html) return ''
    
    // Remove HTML tags and decode entities
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text
  }

  // Generate structured data for SEO
  const generateStructuredData = (article) => {
    if (!article) return null

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.subtitle || extractTextFromHTML(article.content, 155),
      "image": [article.image],
      "datePublished": article.date,
      "dateModified": article.date,
      "author": {
        "@type": "Organization",
        "name": article.author
      },
      "publisher": {
        "@type": "Organization",
        "name": "TirePro",
        "logo": {
          "@type": "ImageObject",
          "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/logo_text.png`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": typeof window !== 'undefined' ? window.location.href : ''
      },
      "articleSection": article.category,
      "keywords": article.hashtags ? article.hashtags.join(', ') : '',
      "wordCount": article.content ? article.content.split(' ').length : 0,
      "timeRequired": `PT${article.readTime.replace(' min', '')}M`,
      "inLanguage": "es-ES"
    }

    return structuredData
  }

  // Fetch single article from backend
  const fetchArticle = async () => {
    if (!articleId) {
      setError('ID de artículo no encontrado')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await makeApiRequest(`/blog/${articleId}`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Transform backend data to match frontend structure
        const transformedArticle = {
          id: data.id,
          title: data.title,
          subtitle: data.subtitle || '',
          content: data.content,
          category: data.category || 'general',
          author: "Equipo TirePro",
          date: data.createdAt,
          readTime: calculateReadTime(data.content),
          image: data.coverImage || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
          hashtags: data.hashtags || []
        }
        
        setArticle(transformedArticle)
        setError(null)
        
        // Update page title and meta tags dynamically
        if (typeof window !== 'undefined') {
          document.title = `${transformedArticle.title} - TirePro`
          
          // Update meta description
          const metaDescription = document.querySelector('meta[name="description"]')
          if (metaDescription) {
            metaDescription.setAttribute('content', 
              transformedArticle.subtitle || extractTextFromHTML(transformedArticle.content, 155)
            )
          }

          // Update Open Graph tags
          const ogTitle = document.querySelector('meta[property="og:title"]')
          const ogDescription = document.querySelector('meta[property="og:description"]')
          const ogImage = document.querySelector('meta[property="og:image"]')
          const ogUrl = document.querySelector('meta[property="og:url"]')

          if (ogTitle) ogTitle.setAttribute('content', `${transformedArticle.title} - TirePro`)
          if (ogDescription) ogDescription.setAttribute('content', transformedArticle.subtitle || extractTextFromHTML(transformedArticle.content, 155))
          if (ogImage) ogImage.setAttribute('content', transformedArticle.image)
          if (ogUrl) ogUrl.setAttribute('content', window.location.href)

          // Update Twitter Card tags
          const twitterTitle = document.querySelector('meta[name="twitter:title"]')
          const twitterDescription = document.querySelector('meta[name="twitter:description"]')
          const twitterImage = document.querySelector('meta[name="twitter:image"]')

          if (twitterTitle) twitterTitle.setAttribute('content', `${transformedArticle.title} - TirePro`)
          if (twitterDescription) twitterDescription.setAttribute('content', transformedArticle.subtitle || extractTextFromHTML(transformedArticle.content, 155))
          if (twitterImage) twitterImage.setAttribute('content', transformedArticle.image)

          // Add structured data
          const structuredData = generateStructuredData(transformedArticle)
          if (structuredData) {
            let scriptTag = document.getElementById('structured-data')
            if (!scriptTag) {
              scriptTag = document.createElement('script')
              scriptTag.id = 'structured-data'
              scriptTag.type = 'application/ld+json'
              document.head.appendChild(scriptTag)
            }
            scriptTag.textContent = JSON.stringify(structuredData)
          }
        }
        
        // Fetch related articles
        await fetchRelatedArticles(transformedArticle.category)
      } else {
        throw new Error('Artículo no encontrado')
      }
    } catch (error) {
      console.error('Error fetching article:', error)
      setError('Error al cargar el artículo. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch related articles
  const fetchRelatedArticles = async (category) => {
    try {
      const response = await makeApiRequest('/blog')
      
      if (response.ok) {
        const data = await response.json()
        
        // Filter related articles (same category, different ID)
        const related = data
          .filter(art => art.category === category && art.id !== parseInt(articleId))
          .slice(0, 3)
          .map(article => ({
            id: article.id,
            title: article.title,
            excerpt: article.subtitle || extractTextFromHTML(article.content, 120),
            category: article.category || 'general',
            author: "TirePro Team",
            date: article.createdAt,
            readTime: calculateReadTime(article.content),
            image: article.coverImage || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"
          }))
        
        setRelatedArticles(related)
      }
    } catch (error) {
      console.error('Error fetching related articles:', error)
    }
  }

  // Share functionality
  const shareArticle = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.subtitle,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Enlace copiado al portapapeles')
    }
  }

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
      setShowScrollToTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

useEffect(() => {
  // Execute scripts in the article content after it's rendered
  const executeScripts = () => {
    const articleElement = document.querySelector('.article-content');
    if (!articleElement) return;

    const scripts = articleElement.querySelectorAll('script');
    
    scripts.forEach(script => {
      const newScript = document.createElement('script');
      Array.from(script.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = script.textContent;
      script.parentNode.replaceChild(newScript, script);
    });

    const forms = articleElement.querySelectorAll('form');
    forms.forEach(form => {
      const buttons = form.querySelectorAll('button[onclick]');
      buttons.forEach(button => {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
          button.removeAttribute('onclick');
          button.addEventListener('click', () => {
            try {
              eval(onclickAttr);
            } catch (error) {
              console.error('Error executing onclick:', error);
            }
          });
        }
      });
    });
  };

  if (article) {
    setTimeout(executeScripts, 100);
  }
}, [article]);


useEffect(() => {
  fetchArticle()
}, [articleId])

// 🔽 Add this right below:
useEffect(() => {
  if (!article) return;

  const container = document.querySelector('.article-content');
  if (!container) return;

  // Re-inject all <script> blocks to execute them
  const scripts = container.querySelectorAll('script');
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}, [article])


  // Loading component
  if (loading) {
    return (
      <>
        <Head>
          <title>Cargando Artículo - TirePro</title>
          <meta name="description" content="Cargando artículo sobre mantenimiento y gestión de llantas con TirePro" />
        </Head>
        <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="animate-spin h-12 w-12 text-[#348CCB] mx-auto mb-4" />
            <p className="text-gray-300">Cargando artículo...</p>
          </div>
        </div>
      </>
    )
  }

  // Error component
  if (error || !article) {
    return (
      <>
        <Head>
          <title>Error - Artículo no encontrado - TirePro</title>
          <meta name="description" content="El artículo solicitado no pudo ser encontrado. Explora más contenido sobre mantenimiento de llantas en TirePro." />
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <h1 className="text-xl font-bold text-red-400 mb-2">Error al cargar</h1>
              <p className="text-gray-300 mb-4">{error}</p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={fetchArticle}
                  className="px-4 py-2 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all"
                >
                  Reintentar
                </button>
                <Link href="/blog">
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all">
                    Volver al Blog
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const pageTitle = `${article.title} - TirePro`
  const pageDescription = article.subtitle || extractTextFromHTML(article.content, 155)
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={`${article.hashtags ? article.hashtags.join(', ') + ', ' : ''}llantas, mantenimiento, gestión de flotas, neumáticos, TirePro, ${article.category}`} />
        <meta name="author" content={article.author} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="language" content="es-ES" />
        <meta name="revisit-after" content="7 days" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={article.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={article.title} />
        <meta property="og:site_name" content="TirePro" />
        <meta property="og:locale" content="es_ES" />
        <meta property="article:published_time" content={new Date(article.date).toISOString()} />
        <meta property="article:modified_time" content={new Date(article.date).toISOString()} />
        <meta property="article:author" content={article.author} />
        <meta property="article:section" content={article.category} />
        {article.hashtags && article.hashtags.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={canonicalUrl} />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={pageDescription} />
        <meta property="twitter:image" content={article.image} />
        <meta property="twitter:image:alt" content={article.title} />
        <meta name="twitter:creator" content="@TirePro" />
        <meta name="twitter:site" content="@TirePro" />

        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#348CCB" />
        <meta name="msapplication-navbutton-color" content="#348CCB" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Preload critical resources */}
        <link rel="preload" href={article.image} as="image" />
        
        {/* Breadcrumb Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Inicio",
                  "item": typeof window !== 'undefined' ? window.location.origin : ''
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Blog",
                  "item": `${typeof window !== 'undefined' ? window.location.origin : ''}/blog`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": article.title,
                  "item": canonicalUrl
                }
              ]
            })
          }}
        />
      </Head>

      <div className="bg-[#030712] text-white min-h-screen">
        {/* Enhanced Article Content Styles */}
        <style jsx global>{`
          .article-content {
            font-size: 1.125rem;
            line-height: 1.7;
            color: #d1d5db;
            max-width: none;
          }

          .article-content form {
  background: rgba(10, 24, 58, 0.3);
  border: 1px solid rgba(23, 61, 104, 0.3);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
}

.article-content form p {
  color: #e5e7eb;
  font-weight: 600;
  margin: 1.5rem 0 1rem 0;
}

.article-content form input[type="radio"] {
  margin-right: 0.5rem;
  accent-color: #348CCB;
}

.article-content form label,
.article-content form input[type="radio"] + text {
  color: #d1d5db;
  cursor: pointer;
  line-height: 1.6;
}

.article-content form button {
  background: linear-gradient(to right, #348CCB, #1E76B6);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.article-content form button:hover {
  background: linear-gradient(to right, #1E76B6, #348CCB);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 140, 203, 0.3);
}

.article-content #result {
  background: rgba(52, 140, 203, 0.1);
  border: 1px solid rgba(52, 140, 203, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  color: #e5e7eb !important;
  font-size: 1.1rem !important;
}

          .article-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            background: rgba(10, 24, 58, 0.3);
            border-radius: 8px;
            overflow: hidden;
            font-size: 1rem;
          }
          
          .article-content th,
          .article-content td {
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid rgba(23, 61, 104, 0.3);
            vertical-align: top;
          }
          
          .article-content th {
            background: rgba(52, 140, 203, 0.2);
            font-weight: 600;
            color: white;
            font-size: 0.9rem;
          }
          
          .article-content tr:last-child td {
            border-bottom: none;
          }

          /* Mobile table responsiveness */
          @media (max-width: 768px) {
            .article-content table {
              font-size: 0.85rem;
              margin: 1rem 0;
            }
            
            .article-content th,
            .article-content td {
              padding: 0.5rem 0.75rem;
              font-size: 0.85rem;
              line-height: 1.4;
            }
            
            .article-content th {
              font-size: 0.8rem;
              font-weight: 700;
            }
            
            /* Make table horizontally scrollable on very small screens */
            .article-content table {
              display: block;
              overflow-x: auto;
              white-space: nowrap;
              -webkit-overflow-scrolling: touch;
            }
            
            .article-content thead,
            .article-content tbody,
            .article-content tr {
              display: table;
              width: 100%;
              table-layout: fixed;
            }
            
            .article-content table thead,
            .article-content table tbody {
              width: max-content;
              min-width: 100%;
            }
          }
          
          @media (max-width: 480px) {
            .article-content table {
              font-size: 0.8rem;
            }
            
            .article-content th,
            .article-content td {
              padding: 0.4rem 0.6rem;
              font-size: 0.8rem;
            }
            
            .article-content th {
              font-size: 0.75rem;
            }
          }
          
          .article-content h1 {
            font-size: 2.25rem;
            font-weight: 700;
            color: white;
            margin: 2rem 0 1.5rem 0;
            line-height: 1.2;
          }
          
          .article-content h2 {
            font-size: 1.875rem;
            font-weight: 700;
            color: white;
            margin: 1.75rem 0 1rem 0;
            line-height: 1.3;
          }
          
          .article-content h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: white;
            margin: 1.5rem 0 0.75rem 0;
            line-height: 1.3;
          }
          
          .article-content h4 {
            font-size: 1.25rem;
            font-weight: 600;
            color: white;
            margin: 1.25rem 0 0.5rem 0;
            line-height: 1.3;
          }
          
          .article-content h5 {
            font-size: 1.125rem;
            font-weight: 600;
            color: white;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.3;
          }
          
          .article-content h6 {
            font-size: 1rem;
            font-weight: 600;
            color: white;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.3;
          }
          
          .article-content p {
            margin: 1.25rem 0;
            color: #d1d5db;
            font-size: 1.125rem;
            line-height: 1.7;
          }
          
          .article-content strong, .article-content b {
            font-weight: 700;
            color: #348CCB;
          }
          
          .article-content em, .article-content i {
            font-style: italic;
            color: #e5e7eb;
          }
          
          .article-content br {
            display: block;
            margin: 1rem 0;
            content: "";
          }
          
          .article-content ul {
            margin: 1.5rem 0;
            padding-left: 2rem;
            list-style-type: disc;
          }
          
          .article-content ol {
            margin: 1.5rem 0;
            padding-left: 2rem;
            list-style-type: decimal;
          }
          
          .article-content li {
            margin: 0.75rem 0;
            color: #d1d5db;
            font-size: 1.125rem;
            line-height: 1.6;
          }
          
          .article-content li::marker {
            color: #348CCB;
          }
          
          .article-content ul ul,
          .article-content ol ol,
          .article-content ul ol,
          .article-content ol ul {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          
          .article-content blockquote {
            margin: 2rem 0;
            padding: 1.5rem;
            border-left: 4px solid #348CCB;
            background: rgba(52, 140, 203, 0.1);
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: #e5e7eb;
          }
          
          .article-content blockquote p {
            margin: 0.5rem 0;
          }
          
          .article-content code {
            background: rgba(52, 140, 203, 0.1);
            color: #348CCB;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          .article-content pre {
            background: rgba(10, 24, 58, 0.6);
            border: 1px solid rgba(23, 61, 104, 0.3);
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            overflow-x: auto;
          }
          
          .article-content pre code {
            background: none;
            padding: 0;
            color: #d1d5db;
          }
          
          .article-content a {
            color: #348CCB;
            text-decoration: underline;
            transition: color 0.2s ease;
          }
          
          .article-content a:hover {
            color: #1E76B6;
          }
          
          .article-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            background: rgba(10, 24, 58, 0.3);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .article-content th,
          .article-content td {
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid rgba(23, 61, 104, 0.3);
          }
          
          .article-content th {
            background: rgba(52, 140, 203, 0.2);
            font-weight: 600;
            color: white;
          }
          
          .article-content tr:last-child td {
            border-bottom: none;
          }
          
          .article-content hr {
            border: none;
            height: 1px;
            background: linear-gradient(to right, transparent, #348CCB, transparent);
            margin: 2rem 0;
          }
          
          .article-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1.5rem 0;
          }
          
          .article-content figure {
            margin: 1.5rem 0;
            text-align: center;
          }
          
          .article-content figcaption {
            margin-top: 0.5rem;
            font-size: 0.9rem;
            color: #9ca3af;
            font-style: italic;
          }

          /* Special styling for nested lists */
          .article-content ul li ul,
          .article-content ol li ol,
          .article-content ul li ol,
          .article-content ol li ul {
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .article-content {
              font-size: 1rem;
            }
            
            .article-content h1 {
              font-size: 1.875rem;
            }
            
            .article-content h2 {
              font-size: 1.5rem;
            }
            
            .article-content h3 {
              font-size: 1.25rem;
            }
            
            .article-content p,
            .article-content li {
              font-size: 1rem;
            }
            
            .article-content ul,
            .article-content ol {
              padding-left: 1.5rem;
            }
          }
        `}</style>

        {/* Mobile Menu Blur Overlay */}
        <div className={`fixed inset-0 z-40 transition-all duration-500 ${
          isMobileMenuOpen 
            ? 'backdrop-blur-3xl bg-black/60 opacity-100' 
            : 'opacity-0 pointer-events-none'
        }`} onClick={() => setIsMobileMenuOpen(false)}></div>

        {/* Enhanced Floating Liquid Glass Navbar */}
        <nav className={`fixed top-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] max-w-6xl z-50 transition-all duration-700 rounded-2xl ${
          isScrolled 
            ? 'backdrop-blur-2xl bg-gradient-to-r from-white/15 via-white/8 to-white/15 border border-white/30 shadow-2xl' 
            : 'backdrop-blur-xl bg-gradient-to-r from-white/8 via-transparent to-white/8 border border-white/20 shadow-xl'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/15 via-transparent to-[#348CCB]/15 opacity-60 rounded-2xl"></div>
          
          <div className="px-6 sm:px-8 lg:px-10 relative">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center space-x-2 relative z-10">
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
                    <Link href="/"><div className="flex items-center space-x-2">
                <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
                <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
              </div></Link>
                  </span>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6 relative z-10">
                {['Plataforma', 'Blog', 'Planes', 'Contact'].map((item, i) => (
                  <Link 
                    key={i}
                    href={item === 'Plataforma' ? '/#platform' : item === 'Planes' ? '/#plans' : `/${item.toLowerCase()}`}
                    className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                    <span className="relative z-10">{item}</span>
                  </Link>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="hidden md:flex items-center space-x-3 relative z-10">
                <Link href='/login'><button className="px-4 py-2 rounded-xl border border-[#348CCB]/60 text-black backdrop-blur-lg bg-white/10 hover:bg-[#348CCB]/20 hover:border-[#348CCB] transition-all duration-300 hover:shadow-lg">
                  Ingresar
                </button></Link>
                <Link href='/companyregister'><button className="px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-xl backdrop-blur-sm hover:shadow-xl hover:shadow-[#348CCB]/30 transition-all duration-300 hover:scale-105">
                  Comenzar
                </button></Link>
              </div>

              {/* Mobile menu button */}
              <button 
                className="md:hidden p-1 rounded-xl backdrop-blur-lg bg-white/15 hover:bg-white/25 transition-all duration-300 relative z-50 border border-white/20"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <div className="relative">
                  <Menu className={`w-6 h-6 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-45' : 'opacity-100'}`} />
                  <X className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 -rotate-45'}`} />
                </div>
              </button>
            </div>
          </div>
        {/* Enhanced Floating Mobile Menu */}
        <div className={`md:hidden absolute top-full left-1/2 transform -translate-x-1/2 w-full mt-4 z-50 transition-all duration-500 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'
        }`}>
          <div className="mx-4 rounded-3xl backdrop-blur-3xl bg-gradient-to-br from-white/25 via-white/15 to-white/20 border-2 border-white/40 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 via-transparent to-[#1E76B6]/20 rounded-3xl"></div>
            
            <div className="relative p-5 space-y-6">
              {['Plataforma', 'Blog', 'Planes', 'Contact'].map((item, i) => (
                <a 
                  key={i}
                  href={item === 'Plataforma' ? '#platform' : item === 'Planes' ? '#plans' : `/${item.toLowerCase()}`}
                  className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              
              <div className="pt-2 border-t border-white/30 space-y-4">
                <a href='/login'><button className="w-full py-2 px-6 rounded-2xl border-2 border-[#348CCB]/70 text-black font-semibold text-lg backdrop-blur-sm bg-white/15 hover:bg-[#348CCB]/20 transition-all duration-300 mb-3">
                  Ingresar
                </button></a>
                <a href='/companyregister'><button className="w-full py-2 px-6 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-2xl backdrop-blur-sm hover:shadow-xl font-semibold text-lg transition-all duration-300">
                  Comenzar
                </button></a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Back to Blog Button */}
      <div className="pt-20 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
          <Link href="/blog" className="inline-flex items-center space-x-2 text-[#348CCB] hover:text-white transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Volver al Blog</span>
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Article Meta */}
          <div className="mb-8">
            
<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400 mb-4">
              <span className="px-3 py-1 bg-[#348CCB] text-white text-xs font-medium rounded-full capitalize w-fit">
                {article.category}
              </span>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center space-x-1">
                  <User size={14} />
                  <span className="whitespace-nowrap">{article.author}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span className="whitespace-nowrap">{new Date(article.date).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span className="whitespace-nowrap">{article.readTime}</span>
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                {article.subtitle}
              </p>
            )}

            {/* Share Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex items-center space-x-2">
                <BookOpen size={16} className="text-[#348CCB]" />
                <span className="text-sm text-gray-400">Lectura de {article.readTime}</span>
              </div>
              <button
                onClick={shareArticle}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-gray-300 hover:text-white hover:border-[#348CCB] transition-all w-fit"
              >
                <Share2 size={16} />
                <span>Compartir</span>
              </button>
            </div>
          </div>

          {/* Featured Image */}
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
            <img 
              src={article.image} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>

          {/* Article Content - Enhanced HTML Rendering */}
          <div className="mt-8 mb-12 max-w-none">
            <div 
              className="article-content"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          {/* Hashtags */}
          {article.hashtags && article.hashtags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[#173D68]/30">
              <div className="flex items-center space-x-2 mb-4">
                <Tag size={16} className="text-[#348CCB]" />
                <span className="text-sm font-medium text-gray-300">Etiquetas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.hashtags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-full text-sm text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-[#0A183A]/20 to-[#173D68]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Artículos Relacionados
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedArticles.map((relatedArticle) => (
                <Link key={relatedArticle.id} href={`/blog/article?id=${relatedArticle.id}`}>
                  <div className="group bg-gradient-to-br from-[#0A183A]/40 to-[#173D68]/20 rounded-2xl overflow-hidden border border-[#173D68]/30 hover:border-[#348CCB]/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={relatedArticle.image} 
                        alt={relatedArticle.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{new Date(relatedArticle.date).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{relatedArticle.readTime}</span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold mb-3 group-hover:text-[#348CCB] transition-colors line-clamp-2">
                        {relatedArticle.title}
                      </h3>
                      
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                        {relatedArticle.excerpt}
                      </p>
                      
                      <span className="text-sm text-[#348CCB] capitalize">
                        {relatedArticle.category}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-[#348CCB] text-white rounded-full shadow-lg hover:bg-[#1E76B6] transition-all z-40"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-[#0A183A]/30 border-t border-[#173D68]/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-1 filter brightness-0 invert'/>
                <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
              </div>
              <p className="text-gray-400 mb-4">
                Plataforma inteligente para la gestión y optimización de flotas de vehículos.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Links Importantes</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/legal#terms-section" className="hover:text-[#348CCB] transition-colors">Términos y Condiciones</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-[#348CCB] transition-colors">Privacidad de Datos</a></li>
                <li><a href="/contact" className="hover:text-[#348CCB] transition-colors">Contáctanos</a></li>
                <li><a href="/delete" className="hover:text-[#348CCB] transition-colors">Eliminar Datos</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contacto</h4>
              <ul className="space-y-2 text-gray-400">
                <li>info@tirepro.com.co</li>
                <li>+57 310 660 5563</li>
                <li>Bogotá, Colombia</li>
              </ul>
              
              <div className="flex space-x-4 mt-6">
                <div className="w-8 h-8 bg-[#348CCB] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">in</span>
                </div>
                <div className="w-8 h-8 bg-[#348CCB] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">ig</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#173D68]/30 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 TirePro. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}

// Loading component for Suspense fallback
const ArticlePageFallback = () => (
  <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Loader className="animate-spin h-12 w-12 text-[#348CCB] mx-auto mb-4" />
      <p className="text-gray-300">Cargando página...</p>
    </div>
  </div>
)

// Main component wrapped with Suspense
const ArticlePage = () => {
  return (
    <Suspense fallback={<ArticlePageFallback />}>
      <ArticleContent />
    </Suspense>
  )
}

export default ArticlePage