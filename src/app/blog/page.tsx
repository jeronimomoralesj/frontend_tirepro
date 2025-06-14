'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Menu,
  X,
  Calendar,
  Clock,
  User,
  ChevronRight,
  Search,
  Tag,
  Loader
} from 'lucide-react'
import logo from "../../../public/logo_text.png"
import logoTire from "../../../public/logo_tire.png"

const BlogPage = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  // Fetch articles from backend
  const fetchArticles = async () => {
    try {
      setLoading(true)
      const response = await makeApiRequest('/blog')
      
      if (response.ok) {
        const data = await response.json()
        
        // Transform backend data to match frontend structure
        const transformedArticles = data.map(article => ({
          id: article.id,
          title: article.title,
          excerpt: article.subtitle || '', // Use subtitle as excerpt
          content: article.content,
          category: article.category || 'general',
          author: "TirePro Team", // Default author since backend doesn't have this
          date: article.createdAt,
          readTime: calculateReadTime(article.content),
          image: article.coverImage || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
          featured: false, // You might want to add a featured flag to your backend model
          hashtags: article.hashtags || []
        }))
        
        setArticles(transformedArticles)
        setError(null)
      } else {
        throw new Error('Failed to fetch articles')
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
      setError('Error al cargar los artículos. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate estimated read time based on content length
  const calculateReadTime = (content) => {
    const wordsPerMinute = 200
    const wordCount = content ? content.split(' ').length : 0
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return `${minutes} min`
  }

  // Get unique categories from articles
  const getCategories = () => {
    const uniqueCategories = [...new Set(articles.map(article => article.category))]
    const categoryCounts = uniqueCategories.map(category => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      count: articles.filter(article => article.category === category).length
    }))
    
    return [
      { id: 'all', name: 'Todos', count: articles.length },
      ...categoryCounts
    ]
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [])

  const categories = getCategories()

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredArticles = filteredArticles.filter(article => article.featured)
  const regularArticles = filteredArticles.filter(article => !article.featured)

  // Loading component
  if (loading) {
    return (
      <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-[#348CCB] mx-auto mb-4" />
          <p className="text-gray-300">Cargando artículos...</p>
        </div>
      </div>
    )
  }

  // Error component
  if (error) {
    return (
      <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error al cargar</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button 
              onClick={fetchArticles}
              className="px-4 py-2 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#030712] text-white min-h-screen">
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
                <a 
                  key={i}
                  href={item === 'Plataforma' ? '#platform' : item === 'Planes' ? '#plans' : `/${item.toLowerCase()}`} 
                  className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                  <span className="relative z-10">{item}</span>
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3 relative z-10">
              <a href='/login'><button className="px-4 py-2 rounded-xl border border-[#348CCB]/60 text-black backdrop-blur-lg bg-white/10 hover:bg-[#348CCB]/20 hover:border-[#348CCB] transition-all duration-300 hover:shadow-lg">
                Ingresar
              </button></a>
              <a href='/companyregister'><button className="px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-xl backdrop-blur-sm hover:shadow-xl hover:shadow-[#348CCB]/30 transition-all duration-300 hover:scale-105">
                Comenzar
              </button></a>
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
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-[#0A183A]/30 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent">
              Blog TirePro
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Conocimiento experto, insights y mejores prácticas para la gestión inteligente de flotas
            </p>
          </div>

          {/* Search and Filter */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar artículos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] transition-colors"
                />
              </div>
              
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-[#348CCB] text-white'
                        : 'bg-[#0A183A]/40 text-gray-300 hover:bg-[#348CCB]/20 hover:text-white'
                    }`}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Artículos Destacados
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {featuredArticles.map((article) => (
                <Link key={article.id} href={`/blog/article?id=${article.id}`}>
                  <div className="group relative bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/40 rounded-2xl overflow-hidden border border-[#173D68]/30 hover:border-[#348CCB]/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={article.image} 
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-[#348CCB] text-white text-xs font-medium rounded-full">
                          Destacado
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
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
                      
                      <h3 className="text-xl font-bold mb-3 group-hover:text-[#348CCB] transition-colors">
                        {article.title}
                      </h3>
                      
                      <p className="text-gray-300 mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Tag size={14} className="text-[#348CCB]" />
                          <span className="text-sm text-[#348CCB] capitalize">
                            {categories.find(cat => cat.id === article.category)?.name || article.category}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-[#348CCB] transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Regular Articles Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
            {featuredArticles.length > 0 ? 'Más Artículos' : 'Todos los Artículos'}
          </h2>
          
          {regularArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularArticles.map((article) => (
                <Link key={article.id} href={`/blog/article?id=${article.id}`}>
                  <div className="group bg-gradient-to-br from-[#0A183A]/40 to-[#173D68]/20 rounded-2xl overflow-hidden border border-[#173D68]/30 hover:border-[#348CCB]/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={article.image} 
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{new Date(article.date).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{article.readTime}</span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold mb-3 group-hover:text-[#348CCB] transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#348CCB] capitalize">
                          {categories.find(cat => cat.id === article.category)?.name || article.category}
                        </span>
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-[#348CCB] transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                {articles.length === 0 
                  ? "No hay artículos disponibles en este momento." 
                  : "No se encontraron artículos que coincidan con tu búsqueda."
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer - Same as original */}
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
  )
}

export default BlogPage