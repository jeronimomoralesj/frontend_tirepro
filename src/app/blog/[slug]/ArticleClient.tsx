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
  Tag,
  Share2,
  BookOpen,
  ArrowUp,
} from 'lucide-react'
import logo from '../../../../public/logo_text.png'
import logoTire from '../../../../public/logo_tire.png'

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

  const readTime = calculateReadTime(article.content)

  // Fetch related articles client-side
  useEffect(() => {
    fetch(`${API_URL}/blog`)
      .then((r) => r.json())
      .then((data: Article[]) => {
        const related = data
          .filter((a) => a.category === article.category && a.id !== article.id)
          .slice(0, 3)
          .map((a) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.subtitle || extractTextFromHTML(a.content, 120),
            category: a.category,
            date: a.createdAt,
            readTime: calculateReadTime(a.content),
            image:
              a.coverImage ||
              'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
          }))
        setRelatedArticles(related)
      })
      .catch(() => {})
  }, [article.id, article.category])

  // Execute scripts inside article HTML content
  useEffect(() => {
    if (!article) return

    const container = document.querySelector('.article-content')
    if (!container) return

    const buttons = container.querySelectorAll('button[onclick]')
    const buttonHandlers: { button: Element; onclick: string }[] = []

    buttons.forEach((btn) => {
      const raw = btn.getAttribute('onclick')
      if (raw) {
        buttonHandlers.push({ button: btn, onclick: raw })
        btn.removeAttribute('onclick')
      }
    })

    const scripts = container.querySelectorAll('script')
    scripts.forEach((oldScript) => {
      const code = oldScript.textContent || ''
      if (!code.trim()) return
      try {
        ;(function () {
          eval(code)
        }).call(window)
      } catch (err) {
        console.error('Error evaluating <script>', err)
      }
      oldScript.remove()
    })

    setTimeout(() => {
      buttonHandlers.forEach(({ button, onclick }) => {
        const fnName = onclick.replace(/\(\);?$/, '').trim()
        button.addEventListener('click', (e) => {
          e.preventDefault()
          if (typeof (window as any)[fnName] === 'function') {
            try {
              ;(window as any)[fnName]()
            } catch (err) {
              console.error(`Error executing ${fnName}()`, err)
            }
          }
        })
      })
    }, 50)
  }, [article])

  // Scroll listeners
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
      setShowScrollToTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const shareArticle = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.subtitle,
          url: window.location.href,
        })
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Enlace copiado al portapapeles')
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="bg-[#030712] text-white min-h-screen">
      {/* Article Content Styles */}
      <style jsx global>{`
        .article-content {
          font-size: 1.125rem;
          line-height: 1.7;
          color: #d1d5db;
          max-width: none;
        }

        .article-content form {
          background: linear-gradient(135deg, rgba(10, 24, 58, 0.4) 0%, rgba(23, 61, 104, 0.25) 100%);
          border: 1px solid rgba(52, 140, 203, 0.3);
          border-radius: 16px;
          padding: 2.5rem;
          margin: 2rem 0;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .article-content form p {
          color: #e5e7eb;
          font-weight: 600;
          margin: 1.5rem 0 1rem 0;
        }

        .article-content form input[type='radio'] {
          margin-right: 0.5rem;
          accent-color: #348ccb;
        }

        .article-content form label,
        .article-content form input[type='radio'] + text {
          color: #d1d5db;
          cursor: pointer;
          line-height: 1.6;
        }

        .article-content form button {
          background: linear-gradient(to right, #348ccb, #1e76b6);
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
          background: linear-gradient(to right, #1e76b6, #348ccb);
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

        @media (max-width: 768px) {
          .article-content table {
            font-size: 0.85rem;
            margin: 1rem 0;
            display: block;
            overflow-x: auto;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
          }

          .article-content th,
          .article-content td {
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
            line-height: 1.4;
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

        .article-content strong,
        .article-content b {
          font-weight: 700;
          color: #348ccb;
        }

        .article-content em,
        .article-content i {
          font-style: italic;
          color: #e5e7eb;
        }

        .article-content br {
          display: block;
          margin: 1rem 0;
          content: '';
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
          color: #348ccb;
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
          border-left: 4px solid #348ccb;
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
          color: #348ccb;
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
          color: #348ccb;
          text-decoration: underline;
          transition: color 0.2s ease;
        }

        .article-content a:hover {
          color: #1e76b6;
        }

        .article-content hr {
          border: none;
          height: 1px;
          background: linear-gradient(to right, transparent, #348ccb, transparent);
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
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${
          isMobileMenuOpen
            ? 'backdrop-blur-3xl bg-black/60 opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Floating Navbar */}
      <nav
        className={`fixed top-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] max-w-6xl z-50 transition-all duration-700 rounded-2xl ${
          isScrolled
            ? 'backdrop-blur-2xl bg-gradient-to-r from-white/15 via-white/8 to-white/15 border border-white/30 shadow-2xl'
            : 'backdrop-blur-xl bg-gradient-to-r from-white/8 via-transparent to-white/8 border border-white/20 shadow-xl'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/15 via-transparent to-[#348CCB]/15 opacity-60 rounded-2xl"></div>

        <div className="px-6 sm:px-8 lg:px-10 relative">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 relative z-10">
              <Link href="/">
                <div className="flex items-center space-x-2">
                  <Image
                    src={logoTire}
                    alt="TirePro"
                    width={32}
                    height={32}
                    className="p-2 filter brightness-0 invert"
                  />
                  <Image
                    src={logo}
                    alt="TirePro"
                    width={120}
                    height={32}
                    className="filter brightness-0 invert"
                  />
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 relative z-10">
              {['Plataforma', 'Blog', 'Planes', 'Contact'].map((item, i) => (
                <Link
                  key={i}
                  href={
                    item === 'Plataforma'
                      ? '/#platform'
                      : item === 'Planes'
                      ? '/#plans'
                      : `/${item.toLowerCase()}`
                  }
                  className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                  <span className="relative z-10">{item}</span>
                </Link>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3 relative z-10">
              <Link href="/login">
                <button className="px-4 py-2 rounded-xl border border-[#348CCB]/60 text-black backdrop-blur-lg bg-white/10 hover:bg-[#348CCB]/20 hover:border-[#348CCB] transition-all duration-300 hover:shadow-lg">
                  Ingresar
                </button>
              </Link>
              <Link href="/companyregister">
                <button className="px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-xl backdrop-blur-sm hover:shadow-xl hover:shadow-[#348CCB]/30 transition-all duration-300 hover:scale-105">
                  Comenzar
                </button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-1 rounded-xl backdrop-blur-lg bg-white/15 hover:bg-white/25 transition-all duration-300 relative z-50 border border-white/20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="relative">
                <Menu
                  className={`w-6 h-6 transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-0 rotate-45' : 'opacity-100'
                  }`}
                />
                <X
                  className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-100' : 'opacity-0 -rotate-45'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden absolute top-full left-1/2 transform -translate-x-1/2 w-full mt-4 z-50 transition-all duration-500 ${
            isMobileMenuOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-8 pointer-events-none'
          }`}
        >
          <div className="mx-4 rounded-3xl backdrop-blur-3xl bg-gradient-to-br from-white/25 via-white/15 to-white/20 border-2 border-white/40 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 via-transparent to-[#1E76B6]/20 rounded-3xl"></div>
            <div className="relative p-5 space-y-6">
              {['Plataforma', 'Blog', 'Planes', 'Contact'].map((item, i) => (
                <Link
                  key={i}
                  href={
                    item === 'Plataforma'
                      ? '#platform'
                      : item === 'Planes'
                      ? '#plans'
                      : `/${item.toLowerCase()}`
                  }
                  className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/30 space-y-4">
                <Link href="/login">
                  <button className="w-full py-2 px-6 rounded-2xl border-2 border-[#348CCB]/70 text-black font-semibold text-lg backdrop-blur-sm bg-white/15 hover:bg-[#348CCB]/20 transition-all duration-300 mb-3">
                    Ingresar
                  </button>
                </Link>
                <Link href="/companyregister">
                  <button className="w-full py-2 px-6 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-2xl backdrop-blur-sm hover:shadow-xl font-semibold text-lg transition-all duration-300">
                    Comenzar
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Back to Blog */}
      <div className="pt-20 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
          <Link
            href="/blog"
            className="inline-flex items-center space-x-2 text-[#348CCB] hover:text-white transition-colors group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span>Volver al Blog</span>
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Meta */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400 mb-4">
              <span className="px-3 py-1 bg-[#348CCB] text-white text-xs font-medium rounded-full capitalize w-fit">
                {article.category}
              </span>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center space-x-1">
                  <User size={14} />
                  <span className="whitespace-nowrap">Equipo TirePro</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span className="whitespace-nowrap">
                    {new Date(article.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span className="whitespace-nowrap">{readTime}</span>
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex items-center space-x-2">
                <BookOpen size={16} className="text-[#348CCB]" />
                <span className="text-sm text-gray-400">
                  Lectura de {readTime}
                </span>
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

          {/* Cover Image */}
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>

          {/* Content */}
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
                <span className="text-sm font-medium text-gray-300">
                  Etiquetas
                </span>
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
              {relatedArticles.map((related) => (
                <Link key={related.id} href={`/blog/${related.slug}`}>
                  <div className="group bg-gradient-to-br from-[#0A183A]/40 to-[#173D68]/20 rounded-2xl overflow-hidden border border-[#173D68]/30 hover:border-[#348CCB]/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={related.image}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>
                            {new Date(related.date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{related.readTime}</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold mb-3 group-hover:text-[#348CCB] transition-colors line-clamp-2">
                        {related.title}
                      </h3>
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                        {related.excerpt}
                      </p>
                      <span className="text-sm text-[#348CCB] capitalize">
                        {related.category}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Scroll to Top */}
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
                <Image
                  src={logoTire}
                  alt="TirePro"
                  width={32}
                  height={32}
                  className="p-1 filter brightness-0 invert"
                />
                <Image
                  src={logo}
                  alt="TirePro"
                  width={120}
                  height={32}
                  className="filter brightness-0 invert"
                />
              </div>
              <p className="text-gray-400 mb-4">
                Plataforma inteligente para la gestión y optimización de flotas
                de vehículos.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">
                Links Importantes
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/legal#terms-section"
                    className="hover:text-[#348CCB] transition-colors"
                  >
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal#privacy-section"
                    className="hover:text-[#348CCB] transition-colors"
                  >
                    Privacidad de Datos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-[#348CCB] transition-colors"
                  >
                    Contáctanos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/delete"
                    className="hover:text-[#348CCB] transition-colors"
                  >
                    Eliminar Datos
                  </Link>
                </li>
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