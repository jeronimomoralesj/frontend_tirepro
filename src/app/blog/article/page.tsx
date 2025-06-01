'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
            excerpt: article.subtitle || '',
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
    fetchArticle()
  }, [articleId])

  // Loading component
  if (loading) {
    return (
      <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-[#348CCB] mx-auto mb-4" />
          <p className="text-gray-300">Cargando artículo...</p>
        </div>
      </div>
    )
  }

  // Error component
  if (error || !article) {
    return (
      <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error al cargar</h2>
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
    )
  }

  return (
    <div className="bg-[#030712] text-white min-h-screen">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#030712]/95 backdrop-blur-md border-b border-[#0A183A]' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
              <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#platform" className="text-gray-300 hover:text-white transition-colors">
                Plataforma
              </Link>
              <Link href="/blog" className="text-white font-medium">
                Blog
              </Link>
              <Link href="/#plans" className="text-gray-300 hover:text-white transition-colors">
                Planes
              </Link>
              <Link href="/#contact" className="text-gray-300 hover:text-white transition-colors">
                Contacto
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link href='/login'>
                <button className="px-4 py-2 text-[#348CCB] border border-[#348CCB] rounded-lg hover:bg-[#348CCB] hover:text-white transition-all">
                  Ingresar
                </button>
              </Link>
              <Link href='/companyregister'>
                <button className="px-4 py-2 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all">
                  Quiero Iniciar
                </button>
              </Link>
            </div>

            <button 
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#030712]/95 backdrop-blur-md border-t border-[#0A183A]">
            <div className="px-4 py-4 space-y-4">
              <Link href="/#platform" className="block text-gray-300 hover:text-white">
                Plataforma
              </Link>
              <Link href="/blog" className="block text-white font-medium">
                Blog
              </Link>
              <Link href="/#plans" className="block text-gray-300 hover:text-white">
                Planes
              </Link>
              <Link href="/#contact" className="block text-gray-300 hover:text-white">
                Contacto
              </Link>
              <div className="flex flex-col space-y-2 pt-4 border-t border-[#0A183A]">
                <Link href='/login'>
                  <button className="w-full px-4 py-2 text-[#348CCB] border border-[#348CCB] rounded-lg">
                    Ingresar
                  </button>
                </Link>
                <Link href='/companyregister'>
                  <button className="w-full px-4 py-2 bg-[#348CCB] text-white rounded-lg">
                    Quiero Iniciar
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Back to Blog Button */}
      <div className="pt-20 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
              <span className="px-3 py-1 bg-[#348CCB] text-white text-xs font-medium rounded-full capitalize">
                {article.category}
              </span>
              <div className="flex items-center space-x-1">
                <User size={14} />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>{new Date(article.date).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span>{article.readTime}</span>
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
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <BookOpen size={16} className="text-[#348CCB]" />
                <span className="text-sm text-gray-400">Lectura de {article.readTime}</span>
              </div>
              <button
                onClick={shareArticle}
                className="flex items-center space-x-2 px-4 py-2 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-gray-300 hover:text-white hover:border-[#348CCB] transition-all"
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

          {/* Article Content */}
          <div className="prose prose-lg prose-invert max-w-none">
            <div 
              className="text-gray-300 leading-relaxed space-y-6"
              dangerouslySetInnerHTML={{ 
                __html: article.content.replace(/\n/g, '<br/>') 
              }}
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

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-r from-[#0A183A]/40 to-[#173D68]/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">¿Te gustó este artículo?</h2>
          <p className="text-gray-300 mb-8">
            Suscríbete para recibir más contenido como este directamente en tu correo
          </p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-4">
            <input
              type="email"
              placeholder="tu@email.com"
              className="flex-1 px-4 py-3 bg-[#0A183A]/60 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] transition-colors"
            />
            <button className="px-6 py-3 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all font-medium">
              Suscribirse
            </button>
          </div>
        </div>
      </section>

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
                <li><a href="/contacto" className="hover:text-[#348CCB] transition-colors">Contáctanos</a></li>
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