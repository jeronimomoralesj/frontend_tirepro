'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Search,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import { categorySlug } from './_lib/category'

// --- Types -------------------------------------------------------------------

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

// --- Skeleton card -----------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#1E76B6]/10 bg-white shadow-sm animate-pulse">
      <div className="h-48 bg-[#F0F7FF]" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/3 rounded bg-[#E5F0FA]" />
        <div className="h-4 w-full rounded bg-[#E5F0FA]" />
        <div className="h-4 w-4/5 rounded bg-[#E5F0FA]" />
      </div>
    </div>
  )
}

// --- Main --------------------------------------------------------------------

const BlogClient = ({ initialArticles = [] }: { initialArticles?: Article[] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const articles = initialArticles

  // Newest first — drives the cover card. The rest of the grid follows.
  const sorted = useMemo(
    () =>
      [...articles].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [articles],
  )
  const cover = sorted[0]
  const tail = sorted.slice(1)

  // Categories with counts, linked to the SSR hub at /blog/category/<slug>.
  // Surfaces the new infrastructure where users + crawlers actually
  // notice it — a horizontal strip above the grid, instead of a hidden
  // filter behind a state hook.
  const categories = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    for (const a of articles) {
      const label = (a.category ?? 'general').trim() || 'general'
      const slug = categorySlug(label)
      const entry = map.get(slug)
      if (entry) entry.count += 1
      else map.set(slug, { label, count: 1 })
    }
    return Array.from(map.entries())
      .map(([slug, e]) => ({ slug, ...e }))
      .sort((a, b) => b.count - a.count)
  }, [articles])

  const filteredTail = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return tail
    return tail.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    )
  }, [tail, searchTerm])

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="bg-white text-gray-900 min-h-screen w-full overflow-x-hidden">
      <PublicNav />

      {/* HERO ---------------------------------------------------------------- */}
      <header className="pt-28 sm:pt-32 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1E76B6]">
            <Sparkles size={14} />
            Blog TirePro
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-[#0A183A]">
            Cómo las flotas colombianas
            <br />
            <span className="text-[#1E76B6]">reducen su CPK.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-600 leading-relaxed">
            Guías técnicas, análisis y casos reales sobre gestión de llantas, reencauche
            inteligente y control de CPK para camiones, tractomulas, buses y SUV en Colombia.
          </p>

          {/* Search — front-and-center so it's the first interaction, not
              hidden under the cover card like before. */}
          <div className="mt-8 relative max-w-xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="search"
              placeholder="Buscar por palabra, modelo o categoría…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-[15px] text-[#0A183A] placeholder-gray-400 outline-none transition-all bg-white border border-[#1E76B6]/15 focus:border-[#1E76B6] focus:shadow-[0_0_0_4px_rgba(30,118,182,0.12)]"
            />
          </div>
        </div>
      </header>

      {/* CATEGORY HUBS — links to /blog/category/<slug> SSR hubs ------------- */}
      {categories.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A183A]">
                Explora por categoría
              </h2>
              <Link
                href="/glosario"
                className="text-xs font-semibold text-[#1E76B6] hover:text-[#0A183A] flex items-center gap-1"
              >
                Glosario técnico <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/blog/category/${c.slug}`}
                  className="group px-4 py-2 rounded-full bg-[#F0F7FF] border border-[#1E76B6]/15 text-[#0A183A] text-sm font-semibold capitalize hover:bg-[#1E76B6] hover:text-white hover:border-[#1E76B6] transition-colors"
                >
                  {c.label}
                  <span className="ml-1.5 text-xs font-normal text-[#1E76B6] group-hover:text-white/80">
                    {c.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* COVER — newest article ---------------------------------------------- */}
      {cover && (
        <section className="px-4 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <Link href={`/blog/${cover.slug}`} className="block group">
              <article className="relative rounded-3xl overflow-hidden border border-[#1E76B6]/15 shadow-[0_4px_32px_rgba(30,118,182,0.08)] hover:shadow-[0_12px_48px_rgba(30,118,182,0.18)] transition-shadow duration-300">
                <div className="relative h-[360px] md:h-[460px] lg:h-[520px] overflow-hidden">
                  <Image
                    src={cover.image}
                    alt={cover.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1280px"
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    priority
                    unoptimized={cover.image.includes('unsplash.com')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/0" />

                  <div className="absolute top-6 left-6 flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-white bg-[#1E76B6] shadow-md">
                      Más reciente
                    </span>
                    <Link
                      href={`/blog/category/${categorySlug(cover.category)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm capitalize"
                    >
                      {cover.category}
                    </Link>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-12 text-white">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-white/80 mb-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          {formatDate(cover.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} />
                          {cover.readTime}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                        {cover.title}
                      </h2>
                      <p className="mt-3 text-base sm:text-lg text-white/85 leading-relaxed line-clamp-2 max-w-2xl">
                        {cover.excerpt}
                      </p>
                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">
                        Leer artículo
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          </div>
        </section>
      )}

      {/* GRID ---------------------------------------------------------------- */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 bg-gradient-to-b from-[#F8FAFD] to-white">
        <div className="max-w-7xl mx-auto pt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0A183A] tracking-tight">
              {searchTerm.trim() ? 'Resultados' : 'Más artículos'}
            </h2>
            {searchTerm.trim() && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-sm font-semibold text-[#1E76B6] hover:text-[#0A183A]"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>

          {articles.length === 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredTail.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTail.map((article) => (
                <Link key={article.id} href={`/blog/${article.slug}`} className="group block h-full">
                  <article className="rounded-2xl overflow-hidden border border-[#1E76B6]/12 bg-white h-full flex flex-col shadow-[0_2px_12px_rgba(30,118,182,0.04)] hover:shadow-[0_10px_36px_rgba(30,118,182,0.14)] hover:border-[#1E76B6]/35 transition-all duration-300">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-[1.06] transition-transform duration-500"
                        loading="lazy"
                        unoptimized={article.image.includes('unsplash.com')}
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-white bg-[#0A183A]/90 backdrop-blur-sm capitalize">
                        {article.category}
                      </span>
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-3 text-[11px] text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(article.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {article.readTime}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold leading-snug text-[#0A183A] line-clamp-2 mb-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-3 mb-5 flex-1">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                        <span className="text-xs font-semibold text-[#1E76B6] group-hover:text-[#0A183A] transition-colors">
                          Leer artículo
                        </span>
                        <ArrowRight
                          size={15}
                          className="text-gray-400 group-hover:text-[#1E76B6] group-hover:translate-x-0.5 transition-all"
                        />
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
            </div>
          )}
        </div>
      </section>

      {/* CTA banner ---------------------------------------------------------- */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-[#1E76B6]/20 p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-br from-[#F0F6FB] via-[#E3F0F9] to-[#F8FAFD] shadow-[0_4px_40px_rgba(30,118,182,0.08)]">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0A183A] mb-2">
                ¿Listo para reducir tus costos en llantas?
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Prueba TirePro gratis y calcula el CPK de toda tu flota automáticamente.
              </p>
            </div>
            <Link
              href="/companyregister"
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E76B6] hover:bg-[#0A183A] text-white font-semibold transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
            >
              Comenzar gratis
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default BlogClient
