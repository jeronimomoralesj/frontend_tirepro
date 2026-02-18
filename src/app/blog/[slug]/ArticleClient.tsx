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
  ChevronLeft,
  ChevronRight,
  Tag,
  Share2,
  BookOpen,
  ArrowUp,
  ArrowRight,
} from 'lucide-react'
import logo from '../../../../public/logo_full.png'

interface Article {
  id: number
  title: string
  subtitle: string
  content: string
  coverImage: string
  category: string
  hashtags: string[]
  slug: string
  createdAt: string
  updatedAt: string
}

interface RelatedArticle {
  id: number
  title: string
  slug: string
  excerpt: string
  category: string
  date: string
  readTime: string
  image: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:6001/api'

const calculateReadTime = (content: string) => {
  const words = content?.replace(/<[^>]*>/g, '').split(' ').length || 0
  return `${Math.ceil(words / 200)} min`
}

const extractTextFromHTML = (html: string, maxLength = 155) => {
  if (!html) return ''
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

export default function ArticleClient({ article }: { article: Article }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([])
  const [copied, setCopied] = useState(false)

  const readTime = calculateReadTime(article.content)

  // Fetch related articles
  useEffect(() => {
    fetch(`${API_URL}/blog`)
      .then(r => r.json())
      .then((data: Article[]) => {
        const related = data
          .filter(a => a.category === article.category && a.id !== article.id)
          .slice(0, 3)
          .map(a => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.subtitle || extractTextFromHTML(a.content, 120),
            category: a.category,
            date: a.createdAt,
            readTime: calculateReadTime(a.content),
            image: a.coverImage || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
          }))
        setRelatedArticles(related)
      })
      .catch(() => {})
  }, [article.id, article.category])

  // Execute scripts inside article HTML
  useEffect(() => {
    if (!article) return
    const container = document.querySelector('.article-content')
    if (!container) return
    const buttons = container.querySelectorAll('button[onclick]')
    const buttonHandlers: { button: Element; onclick: string }[] = []
    buttons.forEach(btn => {
      const raw = btn.getAttribute('onclick')
      if (raw) { buttonHandlers.push({ button: btn, onclick: raw }); btn.removeAttribute('onclick') }
    })
    const scripts = container.querySelectorAll('script')
    scripts.forEach(oldScript => {
      const code = oldScript.textContent || ''
      if (!code.trim()) return
      try { (function () { eval(code) }).call(window) } catch (err) { console.error('Error evaluating <script>', err) }
      oldScript.remove()
    })
    setTimeout(() => {
      buttonHandlers.forEach(({ button, onclick }) => {
        const fnName = onclick.replace(/\(\);?$/, '').trim()
        button.addEventListener('click', e => {
          e.preventDefault()
          if (typeof (window as any)[fnName] === 'function') {
            try { (window as any)[fnName]() } catch (err) { console.error(`Error executing ${fnName}()`, err) }
          }
        })
      })
    }, 50)
  }, [article])

  // Scroll listeners
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
      setShowScrollToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const shareArticle = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: article.title, text: article.subtitle, url: window.location.href }) } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="bg-black text-white min-h-screen overflow-x-hidden w-full">

      {/* ── GLOBAL ARTICLE STYLES ─────────────────────────────────────────────── */}
      <style jsx global>{`
        /* ── Base ── */
        .article-content {
          font-size: 1.125rem;
          line-height: 1.8;
          color: #d1d5db;
        }

        /* ── Headings ── */
        .article-content h1 { font-size: 2.25rem; font-weight: 700; color: #fff; margin: 2rem 0 1rem; line-height: 1.2; }
        .article-content h2 { font-size: 1.75rem; font-weight: 700; color: #fff; margin: 1.75rem 0 1rem; line-height: 1.3; }
        .article-content h3 { font-size: 1.375rem; font-weight: 600; color: #fff; margin: 1.5rem 0 0.75rem; line-height: 1.3; }
        .article-content h4 { font-size: 1.125rem; font-weight: 600; color: #fff; margin: 1.25rem 0 0.5rem; }
        .article-content h5, .article-content h6 { font-size: 1rem; font-weight: 600; color: #fff; margin: 1rem 0 0.5rem; }

        /* ── Body text ── */
        .article-content p { margin: 1.25rem 0; color: #d1d5db; font-size: 1.125rem; line-height: 1.8; }
        .article-content strong, .article-content b { font-weight: 700; color: #60a5fa; }
        .article-content em, .article-content i { font-style: italic; color: #e5e7eb; }

        /* ── Lists ── */
        .article-content ul { margin: 1.5rem 0; padding-left: 1.75rem; list-style-type: disc; }
        .article-content ol { margin: 1.5rem 0; padding-left: 1.75rem; list-style-type: decimal; }
        .article-content li { margin: 0.6rem 0; color: #d1d5db; font-size: 1.125rem; line-height: 1.7; }
        .article-content li::marker { color: #3b82f6; }
        .article-content ul ul, .article-content ol ol, .article-content ul ol, .article-content ol ul { margin: 0.4rem 0; padding-left: 1.5rem; }

        /* ── Blockquote ── */
        .article-content blockquote {
          margin: 2rem 0; padding: 1.25rem 1.5rem;
          border-left: 3px solid #3b82f6;
          background: rgba(59,130,246,0.07);
          border-radius: 0 12px 12px 0;
          font-style: italic; color: #e5e7eb;
        }
        .article-content blockquote p { margin: 0.4rem 0; }

        /* ── Code ── */
        .article-content code { background: rgba(59,130,246,0.12); color: #60a5fa; padding: 0.2rem 0.45rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.88em; }
        .article-content pre { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; overflow-x: auto; }
        .article-content pre code { background: none; padding: 0; color: #d1d5db; }

        /* ── Links ── */
        .article-content a { color: #60a5fa; text-decoration: underline; text-underline-offset: 3px; transition: color 0.2s; }
        .article-content a:hover { color: #93c5fd; }

        /* ── HR ── */
        .article-content hr { border: none; height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent); margin: 2.5rem 0; }

        /* ── Images ── */
        .article-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.5rem 0; display: block; }
        .article-content figure { margin: 1.5rem 0; text-align: center; }
        .article-content figcaption { margin-top: 0.5rem; font-size: 0.875rem; color: #9ca3af; font-style: italic; }

        /* ── TABLES — fully responsive, never cut off ── */
        .article-content .table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 1.75rem 0;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .article-content table {
          width: 100%;
          min-width: 500px;          /* prevents collapse on mobile */
          border-collapse: collapse;
          background: rgba(255,255,255,0.03);
          font-size: 0.95rem;
        }
        .article-content th {
          padding: 0.75rem 1rem;
          text-align: left;
          background: rgba(59,130,246,0.15);
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .article-content td {
          padding: 0.7rem 1rem;
          text-align: left;
          color: #d1d5db;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          vertical-align: top;
          line-height: 1.5;
        }
        .article-content tr:last-child td { border-bottom: none; }
        .article-content tr:hover td { background: rgba(255,255,255,0.03); }

        /* ── Forms inside articles ── */
        .article-content form {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 2rem 2.5rem;
          margin: 2rem 0;
        }
        .article-content form p { color: #e5e7eb; font-weight: 600; margin: 1.25rem 0 0.75rem; }
        .article-content form input[type='radio'] { margin-right: 0.5rem; accent-color: #3b82f6; }
        .article-content form label { color: #d1d5db; cursor: pointer; }
        .article-content form button {
          background: #fff; color: #000;
          border: none; padding: 0.7rem 1.5rem;
          border-radius: 999px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          margin-top: 1rem;
        }
        .article-content form button:hover { background: #e5e7eb; }
        .article-content #result {
          background: rgba(59,130,246,0.08);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 10px;
          padding: 1rem; margin-top: 1rem;
          color: #e5e7eb !important; font-size: 1rem !important;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 768px) {
          .article-content { font-size: 1rem; }
          .article-content h1 { font-size: 1.75rem; }
          .article-content h2 { font-size: 1.375rem; }
          .article-content h3 { font-size: 1.125rem; }
          .article-content p, .article-content li { font-size: 1rem; }
          .article-content ul, .article-content ol { padding-left: 1.25rem; }
          .article-content form { padding: 1.25rem; }
          /* table scrolls, hint shown by scrollbar */
          .article-content table { min-width: 420px; }
          .article-content th, .article-content td { padding: 0.55rem 0.75rem; font-size: 0.875rem; }
        }

        @media (max-width: 480px) {
          .article-content th, .article-content td { padding: 0.45rem 0.6rem; font-size: 0.8rem; }
        }
      `}</style>

      {/* ── TABLE WRAPPER INJECTION — wraps every bare <table> on mount ── */}
      <TableWrapper />

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
            <Link href="/" aria-label="TirePro - Inicio">
              <Image
                src={logo}
                height={50}
                width={120}
                alt="TirePro - Software de Gestión de Llantas con IA"
                className="filter brightness-0 invert h-10 sm:h-12 md:h-14 w-auto"
              />
            </Link>
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <Link href="/#producto" className="text-sm text-gray-400 hover:text-white transition-colors">Producto</Link>
              <Link href="/#beneficios" className="text-sm text-gray-400 hover:text-white transition-colors">Beneficios</Link>
              <Link href="/#planes" className="text-sm text-gray-400 hover:text-white transition-colors">Planes</Link>
              <Link href="/#preguntas" className="text-sm text-gray-400 hover:text-white transition-colors">Preguntas</Link>
              <Link href="/blog" className="text-sm text-white font-medium">Blog</Link>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Ingresar</Link>
              <Link href="/companyregister">
                <button className="bg-white text-black px-4 xl:px-6 py-2 sm:py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-all whitespace-nowrap">
                  Comenzar Gratis
                </button>
              </Link>
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
              <Link href="/#producto" className="block text-gray-400 hover:text-white py-2" onClick={() => setIsMobileMenuOpen(false)}>Producto</Link>
              <Link href="/#beneficios" className="block text-gray-400 hover:text-white py-2" onClick={() => setIsMobileMenuOpen(false)}>Beneficios</Link>
              <Link href="/#planes" className="block text-gray-400 hover:text-white py-2" onClick={() => setIsMobileMenuOpen(false)}>Planes</Link>
              <Link href="/#preguntas" className="block text-gray-400 hover:text-white py-2" onClick={() => setIsMobileMenuOpen(false)}>Preguntas</Link>
              <Link href="/blog" className="block text-white font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>Blog</Link>
              <Link href="/login" className="block text-gray-400 hover:text-white py-2" onClick={() => setIsMobileMenuOpen(false)}>Ingresar</Link>
              <Link href="/companyregister">
                <button className="w-full bg-white text-black px-6 py-3 rounded-full text-sm font-medium mt-2">
                  Comenzar Gratis
                </button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── BACK TO BLOG ─────────────────────────────────────────────────────── */}
      <div className="pt-24 sm:pt-28 pb-4 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Volver al Blog
          </Link>
        </div>
      </div>

      {/* ── ARTICLE ──────────────────────────────────────────────────────────── */}
      <article className="px-4 sm:px-6 lg:px-8 pb-16 w-full" itemScope itemType="https://schema.org/Article">

        <div className="max-w-4xl mx-auto">

          {/* Category + meta */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="px-3 py-1 bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-full capitalize">
                {article.category}
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <User size={13} />
                  <span itemProp="name">Equipo TirePro</span>
                </span>
                <time
                  className="flex items-center gap-1.5"
                  dateTime={article.createdAt}
                  itemProp="datePublished"
                >
                  <Calendar size={13} />
                  {new Date(article.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {readTime} de lectura
                </span>
              </div>
            </div>

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight tracking-tight text-white mb-4"
              itemProp="headline"
            >
              {article.title}
            </h1>

            {/* Subtitle */}
            {article.subtitle && (
              <p className="text-lg sm:text-xl text-gray-400 leading-relaxed mb-6" itemProp="description">
                {article.subtitle}
              </p>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between py-4 border-y border-white/10">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BookOpen size={14} className="text-blue-400" />
                Lectura de {readTime}
              </div>
              <button
                onClick={shareArticle}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-sm text-gray-400 hover:text-white transition-all"
              >
                <Share2 size={14} />
                {copied ? '¡Enlace copiado!' : 'Compartir'}
              </button>
            </div>
          </div>

          {/* Cover image */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
              itemProp="image"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Article body */}
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
            itemProp="articleBody"
          />

          {/* Hashtags */}
          {article.hashtags && article.hashtags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={14} className="text-blue-400" />
                <span className="text-sm text-gray-500 font-medium">Etiquetas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* ── RELATED ARTICLES ─────────────────────────────────────────────────── */}
      {relatedArticles.length > 0 && (
        <section
          className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent w-full"
          aria-labelledby="related-heading"
        >
          <div className="max-w-7xl mx-auto">
            <h2 id="related-heading" className="text-2xl sm:text-3xl font-semibold mb-8 text-center">
              Artículos Relacionados
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map(related => (
                <Link key={related.id} href={`/blog/${related.slug}`}>
                  <article className="group rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 hover:border-blue-500/40 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 hover:scale-[1.02] h-full flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <img
                        src={related.image}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(related.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {related.readTime}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold mb-2 group-hover:text-gray-300 transition-colors line-clamp-2 flex-shrink-0">
                        {related.title}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-1">{related.excerpt}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="flex items-center gap-1 text-xs text-blue-400">
                          <Tag size={11} />
                          <span className="capitalize">{related.category}</span>
                        </span>
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent pointer-events-none" />
            <div className="relative p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-1">¿Listo para optimizar tu flota?</h2>
                <p className="text-gray-400 text-sm">Prueba TirePro gratis y reduce hasta 25% tus costos en llantas.</p>
              </div>
              <Link href="/companyregister" className="flex-shrink-0">
                <button className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-all flex items-center gap-2 whitespace-nowrap">
                  Comenzar Gratis <ArrowRight size={16} />
                </button>
              </Link>
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
                Software de optimización inteligente de llantas para flotas en Colombia.
              </p>
              <div className="flex space-x-3">
                <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-xs font-bold transition-all">in</a>
                <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-xs font-bold transition-all">ig</a>
              </div>
            </div>
            <nav aria-labelledby="ft-product">
              <h4 id="ft-product" className="font-medium mb-3 text-sm">Producto</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li><Link href="/#producto" className="hover:text-white transition-colors">Características</Link></li>
                <li><Link href="/#planes" className="hover:text-white transition-colors">Planes y precios</Link></li>
                <li><Link href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </nav>
            <nav aria-labelledby="ft-legal">
              <h4 id="ft-legal" className="font-medium mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li><Link href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</Link></li>
                <li><Link href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</Link></li>
                <li><Link href="/delete" className="hover:text-white transition-colors">Eliminar datos</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contacto</Link></li>
              </ul>
            </nav>
            <address className="not-italic">
              <h4 className="font-medium mb-3 text-sm">Contacto</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li><a href="mailto:info@tirepro.com.co" className="hover:text-white transition-colors">info@tirepro.com.co</a></li>
                <li><a href="tel:+573151349122" className="hover:text-white transition-colors">+57 315 134 9122</a></li>
                <li>Bogotá, Colombia</li>
              </ul>
            </address>
          </div>
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-500 gap-4">
            <p>© 2025 TirePro Colombia. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ en Colombia</p>
          </div>
        </div>
      </footer>

      {/* ── SCROLL TO TOP ────────────────────────────────────────────────────── */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-11 h-11 bg-white text-black rounded-full shadow-xl hover:bg-gray-100 transition-all hover:scale-110 z-40 flex items-center justify-center"
          aria-label="Volver arriba"
        >
          <ArrowUp size={18} />
        </button>
      )}

      {/* WhatsApp */}
      <a
        href="https://wa.me/3151349122?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20TirePro"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-6 sm:bottom-6 sm:right-20 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50"
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

// ── Client component that wraps bare <table> elements in a scrollable div ─────
// This runs after hydration so it handles tables injected via dangerouslySetInnerHTML
function TableWrapper() {
  useEffect(() => {
    const container = document.querySelector('.article-content')
    if (!container) return
    container.querySelectorAll('table').forEach(table => {
      if (table.parentElement?.classList.contains('table-wrapper')) return
      const wrapper = document.createElement('div')
      wrapper.className = 'table-wrapper'
      table.parentNode?.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    })
  }, [])
  return null
}