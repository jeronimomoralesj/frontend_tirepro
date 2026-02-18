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
  Loader,
  ArrowRight
} from 'lucide-react'
import logo from "../../../public/logo_full.png"

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
          headers: { 'Content-Type': 'application/json', ...options.headers },
        })
        if (response.ok) return response
      } catch (error) {
        console.warn(`Failed to connect to ${baseUrl}:`, error.message)
        continue
      }
    }
    throw new Error('All API endpoints failed')
  }

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const response = await makeApiRequest('/blog')
      if (response.ok) {
        const data = await response.json()
        const transformedArticles = data.map(article => ({
          id: article.id,
          slug: article.slug,
          title: article.title,
          excerpt: article.subtitle || '',
          content: article.content,
          category: article.category || 'general',
          author: "TirePro Team",
          date: article.createdAt,
          readTime: calculateReadTime(article.content),
          image: article.coverImage || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
          featured: false,
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

  const calculateReadTime = (content) => {
    const wordsPerMinute = 200
    const wordCount = content ? content.split(' ').length : 0
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return `${minutes} min`
  }

  const getCategories = () => {
    const uniqueCategories = [...new Set(articles.map(article => article.category))]
    const categoryCounts = uniqueCategories.map(category => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      count: articles.filter(article => article.category === category).length
    }))
    return [{ id: 'all', name: 'Todos', count: articles.length }, ...categoryCounts]
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => { fetchArticles() }, [])

  const categories = getCategories()

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const latestArticle = articles.length > 0
    ? [...articles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null

  const featuredArticles = filteredArticles.filter(a => a.featured)
  const regularArticles = filteredArticles.filter(a => !a.featured && a.id !== latestArticle?.id)

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando artículos...</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error al cargar</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={fetchArticles}
              className="px-6 py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-100 transition-all"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black text-white min-h-screen overflow-x-hidden w-full">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <a href="/" aria-label="TirePro - Inicio">
              <Image
                src={logo}
                height={50}
                width={120}
                alt="TirePro - Software de Gestión de Llantas con IA"
                className="filter brightness-0 invert h-10 sm:h-12 md:h-14 w-auto"
              />
            </a>
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <a href="/#producto" className="text-sm text-gray-400 hover:text-white transition-colors">Producto</a>
              <a href="/#beneficios" className="text-sm text-gray-400 hover:text-white transition-colors">Beneficios</a>
              <a href="/#planes" className="text-sm text-gray-400 hover:text-white transition-colors">Planes</a>
              <a href="/#preguntas" className="text-sm text-gray-400 hover:text-white transition-colors">Preguntas</a>
              <a href="/blog" className="text-sm text-white font-medium transition-colors">Blog</a>
              <a href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Ingresar</a>
              <a href="/companyregister">
                <button className="bg-white text-black px-4 xl:px-6 py-2 sm:py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-all whitespace-nowrap">
                  Comenzar Gratis
                </button>
              </a>
            </div>
            <button
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-black border-t border-white/10">
            <div className="px-4 py-4 space-y-3">
              <a href="/#producto" className="block text-gray-400 hover:text-white py-2">Producto</a>
              <a href="/#beneficios" className="block text-gray-400 hover:text-white py-2">Beneficios</a>
              <a href="/#planes" className="block text-gray-400 hover:text-white py-2">Planes</a>
              <a href="/#preguntas" className="block text-gray-400 hover:text-white py-2">Preguntas</a>
              <a href="/blog" className="block text-white font-medium py-2">Blog</a>
              <a href="/login" className="block text-gray-400 hover:text-white py-2">Ingresar</a>
              <a href="/companyregister">
                <button className="w-full bg-white text-black px-6 py-3 rounded-full text-sm font-medium mt-2">
                  Comenzar Gratis
                </button>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO HEADER ──────────────────────────────────────────────────────── */}
      <header className="pt-28 sm:pt-32 pb-10 px-4 sm:px-6 lg:px-8 w-full text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
            Recursos para
            <br />
            <span className="text-gray-500">tu flota</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Guías, casos reales y análisis sobre gestión de llantas, CPK y mantenimiento preventivo para flotas en Colombia y Latinoamérica.
          </p>
        </div>
      </header>

      {/* ── FEATURED COVER ARTICLE ───────────────────────────────────────────── */}
      {latestArticle && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <div className="max-w-7xl mx-auto">
            <Link href={`/blog/${latestArticle.slug}`}>
              <article className="group relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="relative h-[380px] md:h-[460px] lg:h-[520px] overflow-hidden">
                  <img
                    src={latestArticle.image}
                    alt={latestArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* layered gradients for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

                  {/* Badge */}
                  <div className="absolute top-6 left-6 z-10">
                    <span className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-full">
                      ✦ Más reciente
                    </span>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10 z-10">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-4">
                        <span className="flex items-center gap-1.5"><User size={14} />{latestArticle.author}</span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {new Date(latestArticle.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5"><Clock size={14} />{latestArticle.readTime} de lectura</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-white mb-3 group-hover:text-gray-200 transition-colors">
                        {latestArticle.title}
                      </h2>
                      <p className="text-gray-300 text-base sm:text-lg leading-relaxed line-clamp-2 mb-5">
                        {latestArticle.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Tag size={14} className="text-blue-400" />
                          <span className="text-blue-400 capitalize font-medium">{latestArticle.category}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-white group-hover:gap-2.5 transition-all">
                          Leer artículo <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          </div>
        </section>
      )}

      {/* ── SEARCH + FILTERS ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-10 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Buscar artículos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-white text-black'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {cat.name} <span className="opacity-60">({cat.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED ARTICLES ────────────────────────────────────────────────── */}
      {featuredArticles.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8">Artículos Destacados</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredArticles.map(article => (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <article className="group rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 bg-white/5 transition-all duration-300 hover:scale-[1.02]">
                    <div className="relative h-56 overflow-hidden">
                      <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute top-4 left-4 px-3 py-1 bg-white text-black text-xs font-semibold rounded-full">Destacado</span>
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><User size={12} />{article.author}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} />{new Date(article.date).toLocaleDateString('es-ES')}</span>
                        <span className="flex items-center gap-1"><Clock size={12} />{article.readTime}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-gray-300 transition-colors">{article.title}</h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-3">{article.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-blue-400"><Tag size={12} /><span className="capitalize">{article.category}</span></span>
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── REGULAR ARTICLES GRID ────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 w-full">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-8">
            {featuredArticles.length > 0 || latestArticle ? 'Más Artículos' : 'Todos los Artículos'}
          </h2>

          {regularArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularArticles.map(article => (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <article className="group rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 hover:border-blue-500/40 bg-gradient-to-br from-white/5 to-transparent hover:from-white/8 transition-all duration-300 hover:scale-[1.02] h-full flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><Calendar size={11} />{new Date(article.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{article.readTime} de lectura</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold mb-2 group-hover:text-gray-300 transition-colors line-clamp-2 flex-shrink-0">
                        {article.title}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-1">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="flex items-center gap-1 text-xs text-blue-400">
                          <Tag size={11} />
                          <span className="capitalize">{article.category}</span>
                        </span>
                        <ChevronRight size={15} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                {articles.length === 0
                  ? "No hay artículos disponibles en este momento."
                  : "No se encontraron artículos que coincidan con tu búsqueda."}
              </p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 w-full">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent pointer-events-none" />
            <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-2">¿Listo para reducir tus costos en llantas?</h2>
                <p className="text-gray-400 text-sm sm:text-base">Prueba TirePro gratis y calcula el CPK de toda tu flota automáticamente.</p>
              </div>
              <a href="/companyregister" className="flex-shrink-0">
                <button className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-all flex items-center gap-2 whitespace-nowrap">
                  Comenzar Gratis
                  <ArrowRight size={16} />
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg>
                </div>
                <span className="font-semibold">TirePro Colombia</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                Software de optimización inteligente de llantas para flotas de vehículos en Colombia.
              </p>
              <div className="flex space-x-3">
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-xs font-bold transition-all">in</a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-xs font-bold transition-all">ig</a>
              </div>
            </div>

            <nav aria-labelledby="ft-product">
              <h4 id="ft-product" className="font-medium mb-3 sm:mb-4 text-sm">Producto</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li><a href="/#producto" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="/#planes" className="hover:text-white transition-colors">Planes y precios</a></li>
                <li><a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </nav>

            <nav aria-labelledby="ft-legal">
              <h4 id="ft-legal" className="font-medium mb-3 sm:mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li><a href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="/delete" className="hover:text-white transition-colors">Eliminar datos</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </nav>

            <address className="not-italic">
              <h4 className="font-medium mb-3 sm:mb-4 text-sm">Contacto TirePro</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li><a href="mailto:info@tirepro.com.co" className="hover:text-white transition-colors">info@tirepro.com.co</a></li>
                <li><a href="tel:+573151349122" className="hover:text-white transition-colors">+57 315 134 9122</a></li>
                <li>Bogotá, Colombia</li>
              </ul>
            </address>
          </div>

          <div className="pt-6 sm:pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-500 gap-4">
            <p>© 2025 TirePro Colombia. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ en Colombia</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp */}
      <a
        href="https://wa.me/3151349122?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20TirePro"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50"
        aria-label="Contáctanos por WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
      </a>
    </div>
  )
}

export default BlogPage