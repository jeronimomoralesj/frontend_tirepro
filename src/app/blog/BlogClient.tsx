'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  ArrowRight,
} from 'lucide-react'
import logo from '../../../public/logo_full.png'
import PublicNav from '../../components/PublicNav'

// --- Types --------------------------------------------------------------------

interface Article {
  id: string | number
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  author: string
  date: string
  readTime: string
  image: string
  featured: boolean
  hashtags: string[]
}

// --- Skeleton card -------------------------------------------------------------

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden border animate-pulse bg-white"
      style={{ borderColor: "rgba(30,118,182,0.1)", boxShadow: "0 2px 12px rgba(30,118,182,0.05)" }}
    >
      <div className="h-48" style={{ backgroundColor: "#f0f6fb" }} />
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/3 rounded" style={{ backgroundColor: "#e8f3fa" }} />
        <div className="h-4 w-full rounded" style={{ backgroundColor: "#e8f3fa" }} />
        <div className="h-4 w-4/5 rounded" style={{ backgroundColor: "#e8f3fa" }} />
        <div className="h-3 w-2/3 rounded" style={{ backgroundColor: "#e8f3fa" }} />
      </div>
    </div>
  )
}

// --- Nav ----------------------------------------------------------------------

function Nav() {
  return <PublicNav />
}

// --- Main Component -----------------------------------------------------------

const BlogClient = ({ initialArticles = [] }: { initialArticles?: Article[] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const articles = initialArticles

  const latestArticle = useMemo(() => {
    if (articles.length === 0) return null
    return [...articles].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]
  }, [articles])

  const categories = useMemo(() => {
    const uniqueCats = [...new Set(articles.map(a => a.category))]
    const counts = uniqueCats.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: articles.filter(a => a.category === cat).length,
    }))
    return [{ id: 'all', name: 'Todos', count: articles.length }, ...counts]
  }, [articles])

  const filteredArticles = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return articles.filter(a => {
      const matchesSearch =
        a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
      const matchesCategory =
        selectedCategory === 'all' || a.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [articles, searchTerm, selectedCategory])

  const featuredArticles = useMemo(
    () => filteredArticles.filter(a => a.featured && a.id !== latestArticle?.id),
    [filteredArticles, latestArticle]
  )

  const regularArticles = useMemo(
    () => filteredArticles.filter(a => !a.featured && a.id !== latestArticle?.id),
    [filteredArticles, latestArticle]
  )

  const formatDate = (dateStr: string, opts?: Intl.DateTimeFormatOptions) =>
    new Date(dateStr).toLocaleDateString('es-ES', opts ?? { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="bg-white text-gray-900 min-h-screen overflow-x-hidden w-full">
      <Nav />

      {/* -- HERO HEADER -------------------------------------------------------- */}
      <header
        className="pt-28 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8 w-full text-center"
        style={{ background: "linear-gradient(160deg, #f0f6fb 0%, #ffffff 60%, #e8f3fa 100%)" }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight"
            style={{ color: "#0A183A" }}
          >
            Recursos para
            <br />
            <span style={{ color: "#1E76B6" }}>tu flota</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Guías, casos reales y análisis sobre gestión de llantas, CPK y mantenimiento
            preventivo para flotas en Colombia y Latinoamérica.
          </p>
        </div>
      </header>

      {/* -- FEATURED COVER ARTICLE --------------------------------------------- */}
      {latestArticle && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <div className="max-w-7xl mx-auto">
            <Link href={`/blog/${latestArticle.slug}`}>
              <article
                className="group relative rounded-2xl sm:rounded-3xl overflow-hidden border transition-all duration-300"
                style={{
                  borderColor: "rgba(30,118,182,0.15)",
                  boxShadow: "0 4px 32px rgba(30,118,182,0.1)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,118,182,0.4)"
                  ;(e.currentTarget as HTMLElement).style.boxShadow = "0 8px 48px rgba(30,118,182,0.18)"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,118,182,0.15)"
                  ;(e.currentTarget as HTMLElement).style.boxShadow = "0 4px 32px rgba(30,118,182,0.1)"
                }}
              >
                <div className="relative h-[380px] md:h-[460px] lg:h-[520px] overflow-hidden">
                  <Image
                    src={latestArticle.image}
                    alt={latestArticle.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1280px"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    priority
                    unoptimized={latestArticle.image.includes('unsplash.com')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/5" />

                  <div className="absolute top-6 left-6 z-10">
                    <span
                      className="px-3 py-1.5 text-white text-xs font-semibold rounded-full"
                      style={{ backgroundColor: "#1E76B6" }}
                    >
                      ✦ Más reciente
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10 z-10">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-200 mb-4">
                        <span className="flex items-center gap-1.5">
                          <User size={14} />{latestArticle.author}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {formatDate(latestArticle.date, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />{latestArticle.readTime} de lectura
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-white mb-3">
                        {latestArticle.title}
                      </h2>
                      <p className="text-gray-200 text-base sm:text-lg leading-relaxed line-clamp-2 mb-5">
                        {latestArticle.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Tag size={14} style={{ color: "#60b4f0" }} />
                          <span className="capitalize font-medium" style={{ color: "#60b4f0" }}>
                            {latestArticle.category}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-white group-hover:gap-2.5 transition-all">
                          Leer artículo
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
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

      {/* -- SEARCH + FILTERS --------------------------------------------------- */}
      <section className="px-4 sm:px-6 lg:px-8 pb-10 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar artículos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-gray-900 text-sm placeholder-gray-400 transition-all outline-none"
                style={{
                  border: "1.5px solid rgba(30,118,182,0.2)",
                  backgroundColor: "#f8fafd",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1E76B6")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(30,118,182,0.2)")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                  style={
                    selectedCategory === cat.id
                      ? { backgroundColor: "#1E76B6", color: "white" }
                      : {
                          backgroundColor: "rgba(30,118,182,0.06)",
                          border: "1.5px solid rgba(30,118,182,0.2)",
                          color: "#173D68",
                        }
                  }
                  onMouseEnter={e => {
                    if (selectedCategory !== cat.id) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,118,182,0.12)"
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedCategory !== cat.id) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,118,182,0.06)"
                    }
                  }}
                >
                  {cat.name} <span style={{ opacity: 0.6 }}>({cat.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -- FEATURED ARTICLES -------------------------------------------------- */}
      {featuredArticles.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8" style={{ color: "#0A183A" }}>
              Artículos Destacados
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredArticles.map(article => (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <article
                    className="group rounded-2xl overflow-hidden border bg-white transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      borderColor: "rgba(30,118,182,0.15)",
                      boxShadow: "0 2px 16px rgba(30,118,182,0.06)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,118,182,0.35)"
                      ;(e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(30,118,182,0.14)"
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,118,182,0.15)"
                      ;(e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(30,118,182,0.06)"
                    }}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        unoptimized={article.image.includes('unsplash.com')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <span
                        className="absolute top-4 left-4 px-3 py-1 text-white text-xs font-semibold rounded-full"
                        style={{ backgroundColor: "#1E76B6" }}
                      >
                        Destacado
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><User size={12} />{article.author}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(article.date)}</span>
                        <span className="flex items-center gap-1"><Clock size={12} />{article.readTime}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 transition-colors line-clamp-2" style={{ color: "#0A183A" }}>
                        {article.title}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-3">{article.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-semibold capitalize" style={{ color: "#1E76B6" }}>
                          <Tag size={12} />{article.category}
                        </span>
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-[#1E76B6] transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -- REGULAR ARTICLES GRID ---------------------------------------------- */}
      <section
        className="px-4 sm:px-6 lg:px-8 pb-20 w-full"
        style={{ background: "linear-gradient(180deg, #f8fafd 0%, #ffffff 100%)" }}
      >
        <div className="max-w-7xl mx-auto pt-10">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-8" style={{ color: "#0A183A" }}>
            {featuredArticles.length > 0 || latestArticle ? 'Más Artículos' : 'Todos los Artículos'}
          </h2>

          {articles.length === 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : regularArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularArticles.map(article => (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <article
                    className="group rounded-2xl sm:rounded-3xl overflow-hidden border bg-white transition-all duration-300 hover:scale-[1.02] h-full flex flex-col"
                    style={{
                      borderColor: "rgba(30,118,182,0.12)",
                      boxShadow: "0 2px 12px rgba(30,118,182,0.05)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,118,182,0.35)"
                      ;(e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(30,118,182,0.13)"
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,118,182,0.12)"
                      ;(e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(30,118,182,0.05)"
                    }}
                  >
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                        unoptimized={article.image.includes('unsplash.com')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(article.date)}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{article.readTime} de lectura</span>
                      </div>
                      <h3
                        className="text-base sm:text-lg font-semibold mb-2 line-clamp-2 flex-shrink-0"
                        style={{ color: "#0A183A" }}
                      >
                        {article.title}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-1">{article.excerpt}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="flex items-center gap-1 text-xs font-semibold capitalize" style={{ color: "#1E76B6" }}>
                          <Tag size={11} />{article.category}
                        </span>
                        <ChevronRight size={15} className="text-gray-400 group-hover:text-[#1E76B6] transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                No se encontraron artículos que coincidan con tu búsqueda.
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-sm font-medium transition-colors"
                  style={{ color: "#1E76B6" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#173D68")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#1E76B6")}
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* -- CTA BANNER --------------------------------------------------------- */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 w-full bg-white">
        <div className="max-w-5xl mx-auto">
          <div
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden border p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{
              borderColor: "rgba(30,118,182,0.2)",
              background: "linear-gradient(135deg, #f0f6fb 0%, #e3f0f9 50%, #f8fafd 100%)",
              boxShadow: "0 4px 40px rgba(30,118,182,0.1)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl sm:rounded-3xl"
              style={{ background: "radial-gradient(ellipse at top right, rgba(30,118,182,0.08), transparent 60%)" }}
            />
            <div className="relative">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: "#0A183A" }}>
                ¿Listo para reducir tus costos en llantas?
              </h2>
              <p className="text-gray-500 text-sm sm:text-base">
                Prueba TirePro gratis y calcula el CPK de toda tu flota automáticamente.
              </p>
            </div>
            <a href="/companyregister" className="relative flex-shrink-0">
              <button
                className="text-white px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg"
                style={{ backgroundColor: "#1E76B6" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#173D68")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1E76B6")}
              >
                Comenzar Gratis
                <ArrowRight size={16} />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* -- FOOTER ------------------------------------------------------------- */}
      <footer
        className="border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full"
        style={{ borderColor: "rgba(30,118,182,0.15)", backgroundColor: "#0A183A" }}
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#1E76B6" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" fill="white" />
                  </svg>
                </div>
                <span className="font-semibold text-white">TirePro Colombia</span>
              </div>
              <p className="text-xs sm:text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                Software de optimización inteligente de llantas para flotas de vehículos en Colombia.
              </p>
              <div className="flex space-x-3">
                {['in', 'ig'].map(label => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label === 'in' ? 'LinkedIn' : 'Instagram'}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#1E76B6"
                      ;(e.currentTarget as HTMLAnchorElement).style.color = "white"
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.08)"
                      ;(e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.6)"
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <nav aria-labelledby="ft-product">
              <h4 id="ft-product" className="font-semibold mb-3 sm:mb-4 text-sm text-white">Producto</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <li><a href="/#producto" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="/#planes" className="hover:text-white transition-colors">Planes y precios</a></li>
                <li><a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </nav>

            <nav aria-labelledby="ft-legal">
              <h4 id="ft-legal" className="font-semibold mb-3 sm:mb-4 text-sm text-white">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <li><a href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="/delete" className="hover:text-white transition-colors">Eliminar datos</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </nav>

            <address className="not-italic">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm text-white">Contacto TirePro</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <li><a href="mailto:info@tirepro.com.co" className="hover:text-white transition-colors">info@tirepro.com.co</a></li>
                <li><a href="tel:+573151349122" className="hover:text-white transition-colors">+57 315 134 9122</a></li>
                <li>Bogotá, Colombia</li>
              </ul>
            </address>
          </div>

          <div
            className="pt-6 sm:pt-8 border-t flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm gap-4"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}
          >
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
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
      </a>
    </div>
  )
}

export default BlogClient