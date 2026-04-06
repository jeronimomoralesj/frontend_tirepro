'use client'
import React, { useState, useEffect, useRef } from 'react'
import { AGENT_LIST } from '../lib/agents'
import { trackPlateSearch, trackPlateVehicleSelect, trackSearch } from '../lib/marketplaceAnalytics'
import {
  Calendar,
  BarChart3,
  Clock,
  MapPin,
  Menu,
  X,
  Download,
  ArrowRight,
  Check,
  ChevronDown,
  Zap,
  ChevronRight,
  DollarSign,
  Target,
  Activity,
  Tag,
  User,
  Eye,
  TrendingDown,
  Shield,
  Cpu,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import landing from '../../public/landing.png'
import Image from 'next/image'
import pcImage from '../../public/pc.png'
import logo from '../../public/logo_full.png'
import PublicNav from '../components/PublicNav'
import phoneImage from '../../public/phoneImg.png'
import feature1 from '../../public/feat1.png'
import feature2 from '../../public/feat1.png'
import Link from 'next/link'
import ScrollFlow from '../components/ScrollFlow'

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

// --- useInView hook ------------------------------------------------------------
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// --- Feature data --------------------------------------------------------------
const SHOWCASE_FEATURES = [
  {
    id:       'recomendaciones',
    tag:      'Decisiones inteligentes',
    heading:  'Sabe exactamente qué llanta cambiar, cuándo y por qué',
    body:     'TirePro clasifica automáticamente cada neumático por prioridad: reencauche, llanta nueva o seguimiento. Para cada caso encuentra la llanta óptima según marca, diseño, posición en el vehículo y el historial de desgaste de esa misma posición. Cero subjetividad.',
    bullets:  [
      'Semáforo de condición: crítico, precaución o apto',
      'Recomendación individual por llanta y posición',
      'Sugerencia de llanta óptima de reemplazo o reencauche',
      'Ahorro estimado por cada decisión, en pesos COP',
    ],
    // ← Replace feat1.png in /public with your actual screenshot
    image:    feature1,
    imageAlt: 'Pantalla de recomendaciones de TirePro mostrando clasificación de llantas por prioridad de reemplazo o reencauche para flotas de camiones en Colombia',
    accent:   '#1E76B6',
  },
  {
    id:       'bodega',
    tag:      'Gestión de inventario',
    heading:  'Compara tus llantas en uso con lo que tienes en bodega',
    body:     'TirePro cruza las necesidades de reemplazo de tu flota con el inventario disponible en tu bodega. Sabe al instante si puedes cubrir tus demandas con stock propio o si necesitas comprar llantas adicionales — y cuántas.',
    bullets:  [
      'Inventario de llantas en bodega centralizado',
      'Cruce automático con necesidades de reemplazo activas',
      'Alerta de déficit: cuántas llantas necesitas comprar',
      'Historial de entradas y salidas de bodega',
    ],
    // ← Replace feat2.png in /public with your actual screenshot
    image:    feature2,
    imageAlt: 'Módulo de bodega de TirePro comparando inventario de llantas disponibles contra necesidades de reemplazo de la flota colombiana',
    accent:   '#173D68',
  },
]

// --- FeatureShowcase component -------------------------------------------------
function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState(0)
  const { ref, visible } = useInView(0.1)

  const feature = SHOWCASE_FEATURES[activeTab]

  return (
    <section
      id="beneficios"
      ref={ref}
      className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0A183A 0%, #0d2244 100%)' }}
      aria-labelledby="showcase-heading"
    >
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div
          className="text-center mb-14 sm:mb-18 transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: '#1E76B6', letterSpacing: '0.16em' }}
          >
            Funcionalidades clave
          </p>
          <h2
            id="showcase-heading"
            className="font-bold leading-tight mb-5 text-white"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)' }}
          >
            Decisiones de llantas basadas
            <br />
            <span style={{ color: '#62b8f0' }}>en datos, no en intuición</span>
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Desde la recomendación de reemplazo hasta el control de bodega — TirePro centraliza cada decisión de neumáticos para tu flota de camiones, buses y tractocamiones en Colombia.
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex justify-center mb-10 transition-all duration-700"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '100ms',
          }}
        >
          <div
            className="inline-flex rounded-full p-1 gap-1"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            role="tablist"
            aria-label="Funcionalidades de TirePro"
          >
            {SHOWCASE_FEATURES.map((f, i) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={activeTab === i}
                onClick={() => setActiveTab(i)}
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300"
                style={{
                  background:   activeTab === i ? '#1E76B6' : 'transparent',
                  color:        activeTab === i ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  boxShadow:    activeTab === i ? '0 4px 16px rgba(30,118,182,0.4)' : 'none',
                }}
              >
                {f.tag}
              </button>
            ))}
          </div>
        </div>

        {/* Main feature card */}
        <div
          className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-all duration-700"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(32px)',
            transitionDelay: '200ms',
          }}
        >
          {/* Text side */}
          <div
            className="transition-all duration-500"
            style={{ opacity: 1 }}
            key={activeTab + '-text'}
          >
            {/* Animated accent line */}
            <div
              className="w-10 h-1 rounded-full mb-6"
              style={{ background: 'linear-gradient(90deg, #1E76B6, #62b8f0)' }}
              aria-hidden="true"
            />
            <h3
              className="font-bold leading-tight mb-5 text-white"
              style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
            >
              {feature.heading}
            </h3>
            <p className="text-base leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {feature.body}
            </p>
            <ul className="space-y-3 mb-10">
              {feature.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 transition-all duration-300"
                  style={{
                    transitionDelay: `${i * 60}ms`,
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: '#1E76B6' }}
                  >
                    <Check size={11} className="text-white" />
                  </div>
                  <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{b}</span>
                </li>
              ))}
            </ul>
            <a href="/signup">
              <button
                className="text-white px-7 py-3.5 rounded-full font-semibold text-sm transition-all inline-flex items-center gap-2"
                style={{ background: '#1E76B6', boxShadow: '0 4px 20px rgba(30,118,182,0.35)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#173D68'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#1E76B6'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Ver demo gratis <ArrowRight size={16} />
              </button>
            </a>
          </div>

          {/* Image side */}
          <figure
            className="relative transition-all duration-500"
            key={activeTab + '-image'}
          >
            {/* Glow behind image */}
            <div
              className="absolute -inset-4 rounded-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(30,118,182,0.22) 0%, transparent 70%)' }}
              aria-hidden="true"
            />

            {/* Browser chrome frame */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                border:     '1px solid rgba(30,118,182,0.25)',
                boxShadow:  '0 32px 80px rgba(0,0,0,0.55)',
                background: '#0A183A',
              }}
            >
              {/* Top bar */}
              <div
                className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                style={{ background: 'rgba(10,24,58,0.95)', borderBottom: '1px solid rgba(30,118,182,0.12)' }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70"   aria-hidden="true" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" aria-hidden="true" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70"  aria-hidden="true" />
                <div
                  className="ml-3 text-xs font-mono flex-1"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  tirepro.com.co — {feature.tag}
                </div>
              </div>

              {/* Screenshot — drop your file in /public/feat1.png or feat2.png */}
              <Image
                src={feature.image}
                alt={feature.imageAlt}
                className="w-full object-cover"
                style={{ display: 'block', aspectRatio: '16/10' }}
                loading="lazy"
                placeholder="blur"
              />
            </div>

            <figcaption className="sr-only">{feature.imageAlt}</figcaption>
          </figure>
        </div>

        {/* Bottom mini-cards — quick stats for each feature */}
        <div
          className="mt-14 grid sm:grid-cols-3 gap-4 transition-all duration-700"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '400ms',
          }}
        >
          {[
            { stat: '2 min', label: 'Para generar recomendaciones de toda la flota', icon: Zap },
            { stat: '100%', label: 'De llantas clasificadas con prioridad de acción', icon: Target },
            { stat: '$0',   label: 'Costo de decisiones incorrectas con TirePro', icon: DollarSign },
          ].map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl flex items-center gap-4 transition-all duration-200"
              style={{
                background:  'rgba(255,255,255,0.04)',
                border:      '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,118,182,0.1)'
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(30,118,182,0.3)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(30,118,182,0.2)' }}
              >
                <item.icon size={18} style={{ color: '#62b8f0' }} />
              </div>
              <div>
                <div className="text-xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>{item.stat}</div>
                <div className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

// =============================================================================
// Plate Search — find tires by license plate
// =============================================================================

const VEHICLE_TIRE_MAP: Record<string, { label: string; dimensions: string[] }> = {
  tractomula:    { label: "Tractomula",           dimensions: ["295/80R22.5", "11R22.5", "315/80R22.5", "12R22.5"] },
  bus:           { label: "Bus / Buseta",         dimensions: ["295/80R22.5", "275/80R22.5", "11R22.5"] },
  camion_pesado: { label: "Camion Pesado",        dimensions: ["295/80R22.5", "11R22.5", "12R22.5"] },
  camion_mediano:{ label: "Camion Mediano",       dimensions: ["235/75R17.5", "215/75R17.5", "9.5R17.5"] },
  camion_liviano:{ label: "Camion Liviano",       dimensions: ["7.50R16", "215/75R17.5", "225/70R19.5"] },
  volqueta:      { label: "Volqueta",             dimensions: ["12R24.5", "11R24.5", "315/80R22.5"] },
  furgon:        { label: "Furgon",               dimensions: ["215/75R17.5", "235/75R17.5", "7.50R16"] },
};

function PlateSearch() {
  const [placa, setPlaca] = useState("")
  const [step, setStep] = useState<"input" | "loading" | "results" | "select">("input")
  const [vehicleInfo, setVehicleInfo] = useState<{ marca?: string; linea?: string; modelo?: string; clase?: string; source?: string }>({})
  const [foundDimensions, setFoundDimensions] = useState<string[]>([])
  const [vehicleType, setVehicleType] = useState("")

  const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : "https://api.tirepro.com.co/api"

  async function handleSearch() {
    if (placa.length < 4) return
    setStep("loading")

    try {
      const res = await fetch(`${API_BASE}/marketplace/plate-lookup/${encodeURIComponent(placa)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found && data.dimensions.length > 0) {
          setVehicleInfo({ marca: data.marca, linea: data.linea, modelo: data.modelo, clase: data.clase, source: data.source })
          setFoundDimensions(data.dimensions)
          trackPlateSearch(placa, true)
          setStep("results")
          return
        }
      }
    } catch { /* fallback */ }

    trackPlateSearch(placa, false)
    // Not found anywhere — manual selection
    setStep("select")
  }

  function handleTypeSelect(type: string) {
    const match = VEHICLE_TIRE_MAP[type]
    if (!match) return
    setVehicleType(type)
    setVehicleInfo({ clase: match.label })
    setFoundDimensions(match.dimensions)
    trackPlateVehicleSelect(placa, type)
    setStep("results")
    // Save to community DB so the next person gets instant results
    fetch(`${API_BASE}/marketplace/plate-lookup/${encodeURIComponent(placa)}/community`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clase: type.toUpperCase() }),
    }).catch(() => {})
  }

  function goToMarketplace(dim: string) {
    window.location.href = `/marketplace?q=${encodeURIComponent(dim)}`
  }

  const vehicleLabel = [vehicleInfo.marca, vehicleInfo.linea, vehicleInfo.modelo].filter(Boolean).join(" ") || vehicleInfo.clase || "Vehiculo"

  return (
    <div className="mt-8 mb-4 max-w-lg mx-auto">
      {step === "input" && (
        <div>
          <p className="text-[11px] text-white/40 text-center mb-2">Busca las llantas exactas para tu vehiculo</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="Tu placa (ej: NFZ837)"
              maxLength={6}
              className="flex-1 pl-4 pr-4 py-3.5 rounded-full text-base font-bold text-center tracking-[0.3em] bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:bg-white/15 focus:border-white/40 transition-all"
              style={{ fontFamily: "'DM Mono', monospace" }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
            />
            <button onClick={handleSearch} disabled={placa.length < 4}
              className="px-6 py-3.5 rounded-full font-semibold text-sm transition-all disabled:opacity-40 hover:shadow-lg"
              style={{ background: "#1E76B6", color: "white" }}>
              Buscar
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-white/50">Consultando placa <span className="font-bold text-white tracking-wider">{placa}</span>...</p>
        </div>
      )}

      {step === "select" && (
        <div>
          <p className="text-white/60 text-xs text-center mb-3">
            <span className="font-bold text-white tracking-wider">{placa}</span> — Selecciona tu tipo de vehiculo:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(VEHICLE_TIRE_MAP).map(([key, val]) => (
              <button key={key} onClick={() => handleTypeSelect(key)}
                className="px-3 py-2.5 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/15 transition-all text-left"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {val.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setStep("input"); setPlaca(""); }} className="mt-2 text-[10px] text-white/30 hover:text-white/60 mx-auto block">
            Cambiar placa
          </button>
        </div>
      )}

      {step === "results" && (
        <div>
          <div className="text-center mb-3">
            <p className="text-xs text-white/40">
              <span className="font-bold text-white tracking-wider">{placa}</span>
              {vehicleInfo.source === "runt" && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300">RUNT</span>}
              {vehicleInfo.source === "tirepro" && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">TirePro</span>}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">{vehicleLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {foundDimensions.map((dim) => (
              <button key={dim} onClick={() => goToMarketplace(dim)}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", boxShadow: "0 4px 16px rgba(30,118,182,0.3)" }}>
                {dim}
              </button>
            ))}
          </div>
          <button onClick={() => { setStep("input"); setPlaca(""); setVehicleInfo({}); }} className="mt-3 text-[10px] text-white/30 hover:text-white/60 mx-auto block">
            Buscar otra placa
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Best-Sellers strip (server-fetched, 24h ISR cache) ──────────────── */
function BestSellers({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  return (
    <section className="w-full py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#1E76B6' }}>
            Los mas buscados
          </p>
          <h2 className="text-lg sm:text-xl font-black text-[#0A183A]">
            Llantas mas vendidas en Colombia
          </h2>
          <p className="text-[11px] mt-1.5" style={{ color: 'rgba(10,24,58,0.4)' }}>
            Precios directos de distribuidores verificados · Envio a todo el pais
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
          {items.map((l: any) => {
            const coverImg = l.imageUrls?.[l.coverIndex ?? 0] || l.imageUrls?.[0]
            const hasPromo = l.precioPromo && l.promoHasta && new Date(l.promoHasta) > new Date()
            const price = hasPromo ? l.precioPromo : l.precioCop
            const discount = hasPromo ? Math.round(((l.precioCop - l.precioPromo) / l.precioCop) * 100) : 0

            return (
              <a
                key={l.id}
                href={`/marketplace/product/${l.id}`}
                className="rounded-xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group"
              >
                {/* Image */}
                <div className="relative aspect-square flex items-center justify-center overflow-hidden bg-[#fafafa]">
                  {coverImg ? (
                    <img
                      src={coverImg}
                      alt={`${l.marca} ${l.modelo} ${l.dimension} — comprar llantas en Colombia`}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <Tag className="w-5 h-5 text-gray-200" />
                      <span className="text-[7px] text-gray-300">{l.marca}</span>
                    </div>
                  )}
                  {hasPromo && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[7px] font-black text-white bg-red-500">
                      -{discount}%
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-[8px] uppercase tracking-wider font-medium text-gray-400 truncate">{l.marca}</p>
                  <p className="text-[10px] font-bold text-[#0A183A] mt-0.5 leading-tight line-clamp-1">{l.modelo}</p>
                  <p className="text-[8px] text-gray-400">{l.dimension}</p>
                  <div className="mt-1">
                    <span className="text-[11px] font-black text-[#0A183A]">{fmtCOP(price)}</span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        <div className="text-center mt-6">
          <a
            href="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:scale-105"
            style={{ background: '#1E76B6' }}
          >
            Ver todo el marketplace
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}

const TireProLanding = ({ initialArticles = [], bestSellers = [] }: { initialArticles?: any[]; bestSellers?: any[] }) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null)
  const [activePlan, setActivePlan] = useState(1)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [countersStarted, setCountersStarted] = useState(false)
  const [counter1, setCounter1] = useState(0)
  const [counter2, setCounter2] = useState(0)
  const [counter3, setCounter3] = useState(0)
  const [counter4, setCounter4] = useState(0)
  const statsRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const articles = initialArticles

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Animated counters
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !countersStarted) {
          setCountersStarted(true)
          animateCounter(setCounter1, 28, 1200)
          animateCounter(setCounter2, 3, 1400)
          animateCounter(setCounter3, 95, 1000)
          animateCounter(setCounter4, 2000, 6000)
        }
      },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [countersStarted])

  function animateCounter(setter: (v: number) => void, target: number, duration: number) {
    const steps = 60
    const increment = target / steps
    let current = 0
    const interval = setInterval(() => {
      current += increment
      if (current >= target) {
        setter(target)
        clearInterval(interval)
      } else {
        setter(Math.floor(current))
      }
    }, duration / steps)
  }

  const features = [
    {
      icon: Eye,
      title: 'Inspecciones Digitales, Fáciles y Rápidas',
      description:
        'Registra profundidad de banda, presión y estado de desgaste desde la app o el sitio web en segundos. Sin papeles, sin errores manuales, funciona offline.',
      stat: '10× más rápido',
      detail: 'vs. inspección manual',
    },
    {
      icon: BarChart3,
      title: 'CPK Real Basado en Datos Históricos',
      description:
        'Analizamos miles de datos históricos de llantas para darte el CPK óptimo alcanzable. Recomendaciones basadas en datos reales, no en estimaciones.',
      stat: '-28% CPK',
      detail: 'promedio de clientes',
    },
    {
      icon: MapPin,
      title: 'Control Inteligente de Posiciones',
      description:
        'Gestión visual de montaje y rotación de llantas con recomendaciones óptimas por eje, tipo de vehículo y patrón de desgaste detectado por IA.',
      stat: '+3 vidas',
      detail: 'por llanta promedio',
    },
    {
      icon: Clock,
      title: 'Predicción Inteligente de Reemplazo',
      description:
        'Algoritmos de machine learning calculan la fecha exacta de reemplazo antes de la falla, en pesos colombianos, con alertas automáticas para cada conductor.',
      stat: '95% precisión',
      detail: 'en predicciones',
    },
  ]

  const plans = [
    {
      name: 'Plan Inicio',
      description: 'Para flotas pequeñas que están comenzando con gestión de llantas',
      price: 'Gratis',
      priceDetail: 'Para siempre',
      vehicles: 'Hasta 10 vehículos',
      features: [
        'Hasta 10 vehículos',
        'Un usuario',
        'Análisis básico con IA',
        'Llantas ilimitadas',
        'Monitoreo básico',
        'Reportes mensuales',
        'Soporte por email',
      ],
      cta: 'Comenzar gratis',
      popular: false,
    },
    {
      name: 'Plan Crecimiento',
      description: 'Para flotas en expansión que necesitan gestión avanzada',
      price: '$300.000',
      priceDetail: '/mes',
      vehicles: 'De 10 a 50 vehículos',
      features: [
        '10-50 vehículos',
        'Hasta 5 usuarios',
        'Análisis avanzado con IA',
        'Llantas ilimitadas',
        'Alertas predictivas en tiempo real',
        'Reportes semanales personalizados',
        'Dashboard avanzado',
        'Soporte prioritario',
        'Integración con sistemas',
      ],
      cta: 'Comenzar ahora',
      popular: true,
    },
    {
      name: 'Plan Empresarial',
      description: 'Para grandes flotas y distribuidores de neumáticos',
      price: '$1.000.000',
      priceDetail: '/mes',
      vehicles: 'Más de 50 vehículos',
      features: [
        'Vehículos ilimitados',
        'Usuarios ilimitados',
        'IA personalizada para tu flota',
        'Gestión multi-cliente',
        'Análisis predictivo avanzado',
        'Reportes en tiempo real',
        'API completa',
        'Gerente de cuenta dedicado',
        'Capacitación incluida',
        'SLA garantizado',
      ],
      cta: 'Contactar ventas',
      popular: false,
    },
  ]

  const testimonials = [
    {
      quote: 'TirePro nos ayudó a reducir nuestros costos en llantas en un 23% en solo 6 meses. Las inspecciones que antes tomaban medio día ahora las hacemos en minutos.',
      author: 'Carlos Méndez',
      role: 'Director de Operaciones',
      company: 'TransLogística SA',
      rating: 5,
      metric: '-23% CPK',
    },
    {
      quote: 'Las predicciones de reemplazo son increíblemente precisas. Ya no tenemos fallas en ruta. El ahorro en llantas pagó el software en el primer mes.',
      author: 'María González',
      role: 'Gerente de Flota',
      company: 'Distribuidora Nacional',
      rating: 5,
      metric: '0 fallas en ruta',
    },
    {
      quote: 'Ahora sabemos exactamente cuándo cambiar cada llanta y cuánto cuesta cada kilómetro recorrido. La IA de TirePro es la herramienta más poderosa de nuestra flota.',
      author: 'Juan Rodríguez',
      role: 'Jefe de Mantenimiento',
      company: 'Cargas Express',
      rating: 5,
      metric: '+3 vidas por llanta',
    },
  ]

  const faqs = [
    {
      q: '¿Cómo reduce TirePro mis costos de llantas y mantenimiento?',
      a: 'TirePro analiza miles de datos históricos de llantas para detectar el momento óptimo de reemplazo y maximizar la vida útil de cada neumático. Nuestros clientes reportan ahorros del 20-28% en costos de llantas en los primeros 6 meses.',
    },
    {
      q: '¿Cómo se realizan las inspecciones en TirePro?',
      a: 'Las inspecciones se hacen directamente desde la app móvil o el sitio web de forma muy sencilla e intuitiva. Registras las medidas de profundidad, presión y estado de cada llanta en segundos. La app funciona offline y sincroniza automáticamente cuando hay conexión.',
    },
    {
      q: '¿Qué necesito para empezar a usar TirePro?',
      a: 'Solo necesitas un smartphone o computador. La app móvil funciona offline y sincroniza cuando hay conexión. La configuración toma menos de 10 minutos. Registra tus vehículos y comienza a hacer inspecciones de inmediato.',
    },
    {
      q: '¿Cómo genera TirePro sus recomendaciones de reemplazo?',
      a: 'TirePro analiza miles de datos históricos de llantas — patrones de desgaste, CPK por marca y diseño, condiciones de operación — para calcular el momento óptimo de reemplazo. Cada recomendación está personalizada para tu tipo de vehículo y operación.',
    },
    {
      q: '¿Puedo cambiar de plan después o cancelar?',
      a: 'Sí, puedes cambiar de plan en cualquier momento sin penalizaciones. No hay contratos de permanencia. El cambio es instantáneo y mantienes toda tu información histórica.',
    },
    {
      q: '¿Los datos de mi flota están seguros en TirePro?',
      a: 'Todos los datos están encriptados con estándares bancarios y almacenados en servidores seguros en la nube. Cumplimos con todas las normativas de protección de datos de Colombia. Tu información nunca se comparte con terceros.',
    },
  ]

  const process = [
    {
      step: '01',
      icon: Cpu,
      title: 'Inspección rápida y sin papel',
      description:
        'Registra medidas de profundidad, presión y estado de cada llanta desde la app o el sitio web en segundos. Fácil, intuitivo y sin necesidad de conexión a internet.',
    },
    {
      step: '02',
      icon: BarChart3,
      title: 'Análisis con datos históricos',
      description:
        'Cruzamos tus métricas con miles de datos históricos de llantas. Sabes exactamente si tu CPK es óptimo y dónde está la oportunidad de mejora.',
    },
    {
      step: '03',
      icon: Target,
      title: 'Recomendación óptima de reemplazo',
      description:
        'IA determina el momento exacto de cambio, reencauche o rotación para minimizar CPK y maximizar vidas útiles.',
    },
    {
      step: '04',
      icon: DollarSign,
      title: 'Ahorro real en pesos colombianos',
      description:
        'Reportes de ahorro calculados en COP. Sabes cuánto dinero recuperas por cada decisión inteligente que toma TirePro.',
    },
  ]

  return (
    <div className="bg-white text-gray-900 min-h-screen overflow-x-hidden w-full" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* -- NAVBAR (unchanged) ----------------------------------------------- */}
      <PublicNav />

      {/* -- HERO --------------------------------------------------------------- */}
      <header
        ref={heroRef}
        className="relative w-full overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #030d1f 0%, #0A183A 45%, #0d2550 70%, #0f1e3d 100%)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Cinematic grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(30,118,182,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(30,118,182,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
          aria-hidden="true" />
        <div className="absolute pointer-events-none" style={{ top: '-10%', right: '-5%', width: '55%', height: '70%', background: 'radial-gradient(ellipse at center, rgba(30,118,182,0.18) 0%, transparent 70%)' }} aria-hidden="true" />
        <div className="absolute pointer-events-none" style={{ bottom: '-5%', left: '-10%', width: '45%', height: '50%', background: 'radial-gradient(ellipse at center, rgba(23,61,104,0.25) 0%, transparent 70%)' }} aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-28 sm:pt-36 md:pt-44 pb-16 sm:pb-24">
          <div className="max-w-3xl mx-auto text-center">


            <h1 className="font-bold leading-[1.08] tracking-tight mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)', color: '#ffffff' }}>
              Software de Gestion de Llantas con IA para Flotas
            </h1>

            <p className="mx-auto mb-8 leading-relaxed" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)', color: 'rgba(255,255,255,0.55)', maxWidth: '600px' }}>
              Reduce hasta un 25% el costo de tus llantas. Analizamos cada dato para decirte exactamente que hacer, cuando hacerlo y que comprar — para que cada peso invertido en neumaticos rinda al maximo.
            </p>

            {/* SEO sr-only */}
            <p className="sr-only">
              TirePro es el software de seguimiento y control de llantas con inteligencia artificial para flotas y el marketplace de llantas mas grande de Colombia. Plataforma de analisis de datos para gestion de neumaticos. Compra llantas nuevas y de reencauche para camiones, buses, volquetas, tractocamiones, camionetas y automoviles a los mejores precios de distribuidores verificados en Bogota, Medellin, Cali, Barranquilla, Bucaramanga, Pereira y toda Colombia. Software de llantas, control de neumaticos, gestion de flotas pesadas, CPK en tiempo real, prediccion de fallas con IA, marketplace de llantas Colombia, comprar llantas online.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <a href="/signup"
                className="px-8 py-4 rounded-full text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, #1E76B6, #173D68)', boxShadow: '0 4px 20px rgba(30,118,182,0.3)' }}>
                Comenzar gratis
              </a>
              <a href="/marketplace"
                className="px-8 py-4 rounded-full text-sm font-bold transition-all hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
                Ir al marketplace
              </a>
            </div>

            {/* Value props row */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-12">
              {[
                { icon: BarChart3, text: 'CPK en tiempo real' },
                { icon: Target, text: 'Prediccion de reemplazo' },
                { icon: Activity, text: '6 agentes de IA 24/7' },
                { icon: DollarSign, text: 'Ahorro medido en pesos' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <item.icon className="w-3.5 h-3.5" style={{ color: '#62b8f0' }} />
                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Landing image */}
            <div className="max-w-4xl mx-auto">
              <Image
                src={landing}
                alt="TirePro — Dashboard de gestión inteligente de llantas con IA para flotas de transporte en Colombia"
                className="w-full h-auto rounded-2xl shadow-2xl"
                style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}
                priority
              />
            </div>

            <p className="mt-8" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
              100% gratis · Para flotas de 1 a 1,000+ vehiculos
            </p>
          </div>
        </div>
      </header>

      {/* -- MISSION ------------------------------------------------------------- */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 w-full" style={{ background: '#ffffff' }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: '#1E76B6', letterSpacing: '0.18em' }}>
            Nuestra mision
          </p>
          <h2 className="font-bold leading-tight mb-6" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)', color: '#0A183A' }}>
            Estamos obsesionados con ayudarle a nuestros clientes a alcanzar la perfeccion en la gestion de sus llantas
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(10,24,58,0.5)' }}>
            Somos una empresa de analisis de datos que construyo dos productos para resolver un mismo problema: que cada llanta rinda lo maximo posible. Nuestra plataforma de gestion con IA le dice a tu flota exactamente que hacer, cuando hacerlo y por que. Y nuestro marketplace conecta esa decision con la compra perfecta — el neumatico correcto, al precio justo, del distribuidor indicado.
          </p>

          {/* Two products */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            <a href="/signup" className="group p-7 sm:p-8 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl text-left" style={{ background: 'linear-gradient(135deg, #0A183A 0%, #132d5e 100%)', border: '1px solid rgba(30,118,182,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#62b8f0' }}>Plataforma de gestion</p>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Visibilidad total de tu flota</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Sabe exactamente cuando cambiar cada llanta, que comprar, cuando reencauchar y cuanto estas ahorrando. CPK en tiempo real, predicciones con IA y 6 agentes especializados que trabajan 24/7.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#62b8f0] group-hover:gap-2 transition-all">
                Comenzar gratis <ArrowRight size={14} />
              </span>
            </a>

            <a href="/marketplace" className="group p-7 sm:p-8 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl text-left" style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f2fc 100%)', border: '1px solid rgba(30,118,182,0.12)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#1E76B6' }}>Marketplace</p>
              <h3 className="text-xl sm:text-2xl font-black text-[#0A183A] mb-2 group-hover:text-[#1E76B6] transition-colors">Compra la llanta correcta</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(10,24,58,0.5)' }}>
                Distribuidores verificados en toda Colombia. Compara precios, dimensiones y reencauche. Conectado con la plataforma para que siempre compres lo que realmente necesitas.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1E76B6] group-hover:gap-2 transition-all">
                Explorar marketplace <ArrowRight size={14} />
              </span>
            </a>
          </div>

          {/* What data analysis gives you */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { title: 'Que cambiar', desc: 'Clasificacion por prioridad: reencauche, llanta nueva o seguimiento' },
              { title: 'Cuando hacerlo', desc: 'Prediccion del momento exacto de reemplazo antes de la falla' },
              { title: 'Que comprar', desc: 'Recomendacion de la llanta optima segun historial y posicion' },
              { title: 'Cuanto ahorras', desc: 'Ahorro calculado en pesos colombianos por cada decision' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl" style={{ background: 'rgba(10,24,58,0.02)', border: '1px solid rgba(10,24,58,0.06)' }}>
                <h3 className="text-xs font-black text-[#0A183A] mb-1">{item.title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(10,24,58,0.45)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- TRUST / STATS BAR --------------------------------------------------- */}
      <section
        ref={statsRef}
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: '#ffffff', borderBottom: '1px solid rgba(10,24,58,0.07)' }}
        aria-labelledby="stats-heading"
      >
        <h2 id="stats-heading" className="sr-only">Resultados de TirePro</h2>
        <div className="max-w-6xl mx-auto">
          <p
            className="text-center text-xs font-semibold tracking-widest uppercase mb-12"
            style={{ color: 'rgba(10,24,58,0.35)', letterSpacing: '0.18em' }}
          >
            Resultados comprobados — Control de llantas para flotas colombianas
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {[
              { value: counter1, suffix: '%', label: 'Reducción promedio de CPK', sub: 'en los primeros 6 meses' },
              { value: counter2, suffix: ' vidas', label: 'Vidas adicionales por llanta', sub: 'con recomendaciones IA' },
              { value: counter3, suffix: '%', label: 'Precisión en predicciones', sub: 'de desgaste y fallas' },
              { value: counter4, suffix: '+', label: 'Vehículos activos', sub: 'en Colombia' },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div
                  className="text-4xl sm:text-5xl md:text-6xl font-black mb-2 tabular-nums"
                  style={{ color: '#0A183A', letterSpacing: '-0.02em' }}
                >
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-sm font-semibold mb-1" style={{ color: '#0A183A' }}>{stat.label}</div>
                <div className="text-xs" style={{ color: 'rgba(10,24,58,0.45)' }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- AGENTS ------------------------------------------------------------ */}
      <section
        className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 w-full overflow-hidden"
        style={{ background: '#030d1f' }}
        aria-labelledby="agents-heading"
      >
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true"
          style={{ backgroundImage: 'linear-gradient(rgba(30,118,182,1) 1px, transparent 1px), linear-gradient(90deg, rgba(30,118,182,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#1E76B6' }} aria-hidden="true" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: '#348CCB' }} aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'rgba(30,118,182,0.15)', border: '1px solid rgba(30,118,182,0.25)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#348CCB' }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#348CCB' }}>Agentes Activos</span>
            </div>
            <h2 id="agents-heading" className="font-black leading-none mb-6 text-white" style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)', letterSpacing: '-0.03em' }}>
              Agentifica tu flota
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Seis agentes de IA especializados trabajan 24/7 analizando cada llanta de tu flota. Cada uno es experto en un dominio critico.
            </p>
          </div>

          {/* Agent cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {AGENT_LIST.map((agent, i) => (
              <article
                key={i}
                className="group relative rounded-2xl p-6 sm:p-7 transition-all duration-500 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = agent.color + '40'; e.currentTarget.style.boxShadow = `0 0 60px ${agent.glow}`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Status indicator */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: agent.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: agent.color }}>{agent.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-white leading-none">{agent.metric}</span>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{agent.metricLabel}</p>
                  </div>
                </div>

                {/* Icon + Codename */}
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: agent.color }}>{(() => { const Icon = agent.icon; return <Icon className="w-5 h-5" />; })()}</span>
                  <h3 className="font-black text-xl sm:text-2xl tracking-tight" style={{ color: agent.color, fontFamily: "'DM Mono', monospace", letterSpacing: '-0.02em' }}>
                    {agent.codename}
                  </h3>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>{agent.role}</p>

                {/* Description */}
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.description}</p>

                {/* Bottom accent line */}
                <div className="mt-5 h-px w-full transition-all duration-500 group-hover:w-full" style={{ background: `linear-gradient(90deg, ${agent.color}, transparent)`, opacity: 0.3 }} />
              </article>
            ))}
          </div>

          {/* Bottom tagline */}
          <div className="mt-14 text-center">
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Seis agentes. Una mision. <span className="font-bold text-white">Cero llantas desperdiciadas.</span>
            </p>
          </div>
        </div>
      </section>

      {/* -- SCROLL FLOW (interactive process visualization) ------------------- */}
      <ScrollFlow />

      {/* -- FEATURE SHOWCASE ---------------------------------------------------- */}
      <FeatureShowcase />

      {/* -- PLATFORM POWER ---------------------------------------------------- */}
      <section
        className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: '#ffffff' }}
        aria-labelledby="platform-heading"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#1E76B6', letterSpacing: '0.16em' }}>
              Plataforma completa
            </p>
            <h2 id="platform-heading" className="font-bold leading-tight mb-5" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)', color: '#0A183A' }}>
              Todo lo que necesitas para gestionar<br />
              <span style={{ color: '#1E76B6' }}>llantas como un experto</span>
            </h2>
            <p className="text-base text-gray-500 max-w-2xl mx-auto">
              Desde la primera inspeccion hasta el desecho final — cada decision respaldada por datos e ingenieria de llantas.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Zap,
                title: 'Modo Rapido de Inspeccion',
                desc: 'Crea vehiculos, registra llantas y realiza inspecciones en un solo flujo. Ideal para trabajo en campo donde cada minuto cuenta.',
                accent: '#f97316',
              },
              {
                icon: Target,
                title: 'Analista con IA',
                desc: 'Motor de recomendaciones que detecta desalineacion a 1.5mm, valida que el diseno de la llanta corresponda al eje, e identifica el punto optimo de retiro a 3mm.',
                accent: '#1E76B6',
              },
              {
                icon: DollarSign,
                title: 'Pedidos Inteligentes',
                desc: 'Genera propuestas de compra con la llanta optima del catalogo de 2,500+ SKUs. Envia a distribuidores, recibe cotizaciones con IVA, acepta y ejecuta con un click.',
                accent: '#22c55e',
              },
              {
                icon: Activity,
                title: 'Semaforo de Alertas',
                desc: 'Cuatro niveles: critico, precaucion, vigilancia y optimo. Cada llanta clasificada automaticamente. Alertas enviadas al conductor via WhatsApp con link de confirmacion.',
                accent: '#ef4444',
              },
              {
                icon: Shield,
                title: 'Desechos y Trazabilidad',
                desc: 'Registra causales de descarte, milimetros finales y fotos. Modo rapido para desechar multiples llantas a la vez. Estadisticas de remanente perdido por mes.',
                accent: '#7c3aed',
              },
              {
                icon: BarChart3,
                title: 'Catalogo de 2,500+ SKUs',
                desc: 'Base de datos con todas las llantas del mercado colombiano. Autocomplete al crear llantas — marca, dimension, banda, profundidad inicial y precio se llenan solos.',
                accent: '#0A183A',
              },
              {
                icon: TrendingDown,
                title: 'CPK y Benchmarking',
                desc: 'Costo por kilometro en tiempo real comparado contra promedios de la industria. Detecta que marcas y disenos rinden mas en tu operacion especifica.',
                accent: '#348CCB',
              },
              {
                icon: AlertTriangle,
                title: 'Ingenieria de Desgaste',
                desc: 'Analisis experto de geometria de desgaste: sobreinflado cronico, baja presion, desalineacion unilateral. Recomendaciones de alineacion, rotacion y regrabado.',
                accent: '#f97316',
              },
              {
                icon: CheckCircle2,
                title: 'Inventario en Bodega',
                desc: 'Organiza llantas por buckets personalizados. Mueve llantas entre vehiculos y bodega. Cruce automatico de necesidades de reemplazo contra stock disponible.',
                accent: '#22c55e',
              },
            ].map((f, i) => (
              <article
                key={i}
                className="group relative p-6 sm:p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1"
                style={{ borderColor: 'rgba(52,140,203,0.12)', background: '#fafcff' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = f.accent + '40'; e.currentTarget.style.boxShadow = `0 12px 40px ${f.accent}15`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(52,140,203,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.accent + '12' }}
                >
                  <f.icon size={20} style={{ color: f.accent }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#0A183A' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(10,24,58,0.55)' }}>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -- WHY TIREPRO (comparison) ------------------------------------------- */}
      <section
        className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(180deg, #f7fafd 0%, #ffffff 100%)' }}
        aria-labelledby="comparison-heading"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#1E76B6', letterSpacing: '0.16em' }}>
              Por qué TirePro
            </p>
            <h2
              id="comparison-heading"
              className="font-bold leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', color: '#0A183A' }}
            >
              TirePro vs. gestión manual de llantas
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto mt-4">
              El segundo mayor costo operativo de tu flota merece algo mejor que Excel.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(10,24,58,0.08)' }}>
            {/* Header row */}
            <div
              className="grid grid-cols-3 text-center text-xs font-bold uppercase tracking-wider"
              style={{ background: '#0A183A', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}
            >
              <div className="p-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Función</div>
              <div className="p-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#62b8f0' }}>TirePro</div>
              <div className="p-4">Gestión manual / Excel</div>
            </div>
            {[
              ['Inspección de llantas', 'Digital, en segundos, desde app o web', 'Manual, horas de trabajo'],
              ['Análisis de CPK', 'Automático con benchmarks nacionales', 'Cálculo manual, sin contexto'],
              ['Predicción de reemplazo', 'IA con fecha exacta en COP', 'Estimación visual subjetiva'],
              ['Análisis de datos históricos', 'Miles de datos de llantas para mejores decisiones', 'No disponible'],
              ['Alertas de falla', 'Predictivas y automáticas', 'Reactivas (tras la falla)'],
              ['Reportes de ahorro', 'En pesos colombianos, automáticos', 'No disponible'],
            ].map(([feature, tirepro, manual], i) => (
              <div
                key={i}
                className="grid grid-cols-3 text-sm"
                style={{
                  borderTop: '1px solid rgba(10,24,58,0.06)',
                  background: i % 2 === 0 ? '#ffffff' : '#fafcff',
                }}
              >
                <div className="p-4 font-medium border-r" style={{ borderColor: 'rgba(10,24,58,0.06)', color: '#0A183A' }}>{feature}</div>
                <div className="p-4 border-r flex items-center gap-2" style={{ borderColor: 'rgba(10,24,58,0.06)', color: '#1E76B6', fontWeight: 600 }}>
                  <Check size={14} style={{ flexShrink: 0 }} />
                  {tirepro}
                </div>
                <div className="p-4 text-gray-400 flex items-center gap-2">
                  <X size={14} style={{ flexShrink: 0, color: '#d1d5db' }} />
                  {manual}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- TESTIMONIALS -------------------------------------------------------- */}
      <section
        className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: '#0A183A' }}
        aria-labelledby="testimonials-heading"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#1E76B6', letterSpacing: '0.16em' }}>
              Casos de éxito
            </p>
            <h2
              id="testimonials-heading"
              className="font-bold text-white"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)' }}
            >
              Flotas colombianas que ya redujeron su CPK con TirePro
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.map((testimonial, index) => (
              <article
                key={index}
                className="relative p-7 rounded-2xl transition-all duration-300"
                style={{
                  background: activeTestimonial === index ? 'rgba(30,118,182,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${activeTestimonial === index ? 'rgba(30,118,182,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTestimonial(index)}
                itemScope
                itemType="https://schema.org/Review"
              >
                {/* Metric badge */}
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
                  style={{ background: 'rgba(30,118,182,0.2)', color: '#62b8f0' }}
                >
                  {testimonial.metric}
                </div>

                <blockquote
                  className="text-sm leading-relaxed mb-5"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  itemProp="reviewBody"
                >
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                <footer>
                  <div className="font-semibold text-sm text-white" itemProp="author" itemScope itemType="https://schema.org/Person">
                    <span itemProp="name">{testimonial.author}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#1E76B6' }} itemProp="jobTitle">{testimonial.role}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} itemProp="organization">{testimonial.company}</div>
                  <meta itemProp="ratingValue" content={testimonial.rating.toString()} />
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -- BLOG ---------------------------------------------------------------- */}
      <section
        className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(180deg, #f7fafd 0%, #ffffff 100%)' }}
        aria-labelledby="blog-heading"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 sm:mb-20">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#1E76B6', letterSpacing: '0.16em' }}>
              Conocimiento
            </p>
            <h2
              id="blog-heading"
              className="font-bold leading-tight mb-4"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', color: '#0A183A' }}
            >
              Guías de gestión de llantas
              <br />para flotas en Colombia
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Estrategias de CPK, reencauche inteligente y mantenimiento preventivo de neumáticos para transportadores colombianos.
            </p>
          </div>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {articles.map((article) => (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <article className="group relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 hover:border-[#1E76B6]/40 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      <Image
                        src={article.image}
                        alt={`Imagen de portada para el artículo: ${article.title}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        width={800}
                        height={400}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{new Date(article.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{article.readTime}</span>
                        </div>
                      </div>
                      <h3 className="text-base font-bold mb-2 line-clamp-2 group-hover:text-[#1E76B6] transition-colors" style={{ color: '#0A183A' }}>
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4">{article.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(30,118,182,0.08)', color: '#1E76B6' }}
                        >
                          {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                        </span>
                        <ChevronRight size={15} className="text-gray-300 group-hover:text-[#1E76B6] transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">No hay artículos disponibles en este momento.</div>
          )}

          <div className="mt-12 text-center">
            <a href="/blog">
              <button
                className="text-white px-8 py-3.5 rounded-full font-semibold transition-all inline-flex items-center gap-2 text-sm"
                style={{ background: '#1E76B6', boxShadow: '0 4px 20px rgba(30,118,182,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E76B6')}
              >
                Ver todos los artículos <ArrowRight size={16} />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* -- MOBILE APP ---------------------------------------------------------- */}
      <section
        className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full bg-white"
        aria-labelledby="mobile-app-heading"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <figure className="order-2 lg:order-1 relative w-full flex justify-center">
              <div
                className="aspect-[9/16] w-full max-w-[240px] sm:max-w-[280px] rounded-[2.5rem] p-2 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #0A183A, #173D68)',
                  boxShadow: '0 40px 100px rgba(10,24,58,0.2)',
                }}
              >
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                  <Image
                    src={phoneImage}
                    alt="App móvil TirePro para iOS y Android - Inspección de llantas fácil e intuitiva, funciona offline"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {/* Floating UI card */}
              <div
                className="absolute bottom-8 -right-2 sm:-right-4 px-4 py-3 rounded-2xl text-xs font-medium hidden sm:block"
                style={{
                  background: 'white',
                  border: '1px solid rgba(30,118,182,0.15)',
                  boxShadow: '0 8px 32px rgba(10,24,58,0.12)',
                  color: '#0A183A',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
                  <span className="font-semibold">Inspección completada</span>
                </div>
                <div style={{ color: '#1E76B6' }}>CPK: $18/km · Estado: Óptimo</div>
              </div>
              <figcaption className="sr-only">Aplicación móvil de TirePro mostrando inspección con IA</figcaption>
            </figure>

            <div className="order-1 lg:order-2 space-y-7">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#1E76B6', letterSpacing: '0.16em' }}>
                  App móvil
                </p>
                <h2
                  id="mobile-app-heading"
                  className="font-bold leading-tight"
                  style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', color: '#0A183A' }}
                >
                  Controla tus llantas
                  <br />
                  <span style={{ color: '#1E76B6' }}>desde cualquier patio. Offline.</span>
                </h2>
              </div>
              <p className="text-base leading-relaxed text-gray-500">
                App de seguimiento de llantas para iOS y Android. Inspecciona neumáticos en patios, terminales y vías sin importar si tienes señal. Los datos de CPK, profundidad y presión sincronizan automáticamente.
              </p>
              <ul className="space-y-3.5">
                {[
                  'Modo offline completo para inspecciones sin internet',
                  'Inspecciones completas sin necesidad de conexión a internet',
                  'Sincronización automática en segundo plano',
                  'Disponible para iOS y Android',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: '#1E76B6' }}
                    >
                      <Check size={12} className="text-white" />
                    </div>
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto text-white px-7 py-3.5 rounded-full font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                    style={{ background: '#0A183A', boxShadow: '0 4px 16px rgba(10,24,58,0.2)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0A183A')}
                  >
                    <Download size={16} /> App Store
                  </button>
                </a>
                <button
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                  style={{ border: '1.5px solid #1E76B6', color: '#1E76B6', background: 'transparent' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#1E76B6'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#1E76B6'
                  }}
                >
                  <Download size={16} /> Google Play
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -- FAQ ----------------------------------------------------------------- */}
      <section
        id="preguntas"
        className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(180deg, #f7fafd 0%, #ffffff 100%)' }}
        aria-labelledby="faq-heading"
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#1E76B6', letterSpacing: '0.16em' }}>
              Preguntas frecuentes
            </p>
            <h2
              id="faq-heading"
              className="font-bold leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', color: '#0A183A' }}
            >
              Preguntas sobre gestión de llantas
              <br />y control de CPK con TirePro
            </h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <article
                key={index}
                className="border rounded-2xl overflow-hidden transition-all duration-200 bg-white"
                style={{
                  borderColor: activeQuestion === index ? 'rgba(30,118,182,0.3)' : 'rgba(10,24,58,0.07)',
                  boxShadow: activeQuestion === index ? '0 4px 20px rgba(30,118,182,0.08)' : 'none',
                }}
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <button
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between transition-all"
                  onClick={() => setActiveQuestion(activeQuestion === index ? null : index)}
                  aria-expanded={activeQuestion === index}
                >
                  <span
                    className="font-semibold pr-6 text-sm sm:text-base"
                    style={{ color: '#0A183A' }}
                    itemProp="name"
                  >
                    {faq.q}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: activeQuestion === index ? '#1E76B6' : 'rgba(30,118,182,0.08)',
                    }}
                  >
                    <ChevronDown
                      size={15}
                      style={{
                        color: activeQuestion === index ? 'white' : '#1E76B6',
                        transform: activeQuestion === index ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${activeQuestion === index ? 'max-h-96' : 'max-h-0'}`}
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <p className="text-sm text-gray-600 leading-relaxed" itemProp="text">{faq.a}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -- CALCULADORA --------------------------------------------------------- */}
      <section
        id="calculadora"
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: '#173D68' }}
        aria-labelledby="calculadora-heading"
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em' }}>
            Herramienta gratuita
          </p>
          <h2
            id="calculadora-heading"
            className="font-bold text-white mb-4"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)' }}
          >
            Calculadora de CPK de llantas gratuita
          </h2>
          <p className="mb-8" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem' }}>
            Descubre cuánto te cuesta cada kilómetro recorrido en neumáticos y dónde está el margen de ahorro para tu flota de camiones o buses.
          </p>
          <a href="/calculadora">
            <button
              className="bg-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold transition-all inline-flex items-center gap-2 text-base"
              style={{ color: '#173D68', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e8f3fa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              Ir a la calculadora <ArrowRight size={18} />
            </button>
          </a>
        </div>
      </section>

      {/* -- FEATURES ----------------------------------------------------------- */}
      <section
        className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full bg-white"
        aria-labelledby="features-heading"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#1E76B6', letterSpacing: '0.16em' }}>
              Tecnología
            </p>
            <h2
              id="features-heading"
              className="font-bold leading-tight mb-5"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', color: '#0A183A' }}
            >
              Gestión inteligente de llantas
              <br />para flotas pesadas en Colombia
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Herramientas con IA diseñadas para gerentes de flota de camiones, buses y tractocamiones que quieren reducir CPK y maximizar vidas de reencauche.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {features.map((feature, index) => (
              <article
                key={index}
                className="group relative p-8 sm:p-10 rounded-2xl sm:rounded-3xl border transition-all duration-500 overflow-hidden"
                style={{
                  borderColor: 'rgba(10,24,58,0.08)',
                  background: '#fafcff',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(30,118,182,0.3)'
                  e.currentTarget.style.background = '#f0f6fb'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(30,118,182,0.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(10,24,58,0.08)'
                  e.currentTarget.style.background = '#fafcff'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Subtle corner accent */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle at top right, rgba(30,118,182,0.08), transparent 70%)' }}
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between mb-6">
                  <div
                    className="w-13 h-13 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #1E76B6, #173D68)',
                      width: '3.25rem',
                      height: '3.25rem',
                      boxShadow: '0 4px 16px rgba(30,118,182,0.3)',
                    }}
                  >
                    <feature.icon size={22} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black" style={{ color: '#0A183A', letterSpacing: '-0.02em' }}>{feature.stat}</div>
                    <div className="text-xs" style={{ color: 'rgba(10,24,58,0.4)' }}>{feature.detail}</div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#0A183A' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(10,24,58,0.55)' }}>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -- FINAL CTA ----------------------------------------------------------- */}
      <section
        className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 lg:px-8 w-full bg-white"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="relative rounded-3xl overflow-hidden text-center px-8 sm:px-12 md:px-20 py-16 sm:py-20 md:py-24"
            style={{
              background: 'linear-gradient(135deg, #0A183A 0%, #173D68 60%, #0A183A 100%)',
              boxShadow: '0 30px 80px rgba(10,24,58,0.3)',
            }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(30,118,182,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,118,182,0.06) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
              aria-hidden="true"
            />
            {/* Glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(30,118,182,0.25) 0%, transparent 60%)' }}
              aria-hidden="true"
            />

            <div className="relative">
              <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em' }}>
                Únete hoy
              </p>
              <h2
                id="cta-heading"
                className="font-bold text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(1.8rem, 4.5vw, 4rem)' }}
              >
                Empieza a reducir el CPK
                <br />
                <span style={{ color: '#62b8f0' }}>de tu flota en Colombia hoy</span>
              </h2>
              <p className="text-base sm:text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Software de gestión de llantas con IA para camiones, buses, volquetas y tractocamiones. Sin tarjeta de crédito. Sin contrato. Resultados desde el primer mes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/companyregister" className="w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto text-white px-10 py-4 rounded-full font-bold transition-all inline-flex items-center justify-center gap-2 text-base"
                    style={{ background: '#1E76B6', boxShadow: '0 8px 32px rgba(30,118,182,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2485cc')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E76B6')}
                  >
                    Crear cuenta gratis <ArrowRight size={18} />
                  </button>
                </a>
                <a href="/contact" className="w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto px-10 py-4 rounded-full font-semibold transition-all text-base"
                    style={{ border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)'
                    }}
                  >
                    Hablar con ventas
                  </button>
                </a>
              </div>
              <ul className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-8 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {['Gratis para siempre', 'Sin tarjeta requerida', 'Configuración en 10 min'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check size={12} style={{ color: '#1E76B6' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -- JSON-LD STRUCTURED DATA --------------------------------------------- */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "TirePro",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web, iOS, Android",
              "url": "https://www.tirepro.com.co",
              "logo": "https://www.tirepro.com.co/logo_full.png",
              "description": "Software de gestión y seguimiento de llantas con inteligencia artificial para flotas de camiones, buses, volquetas y tractocamiones en Colombia. Calcula CPK, predice reencauches y detecta desgaste irregular.",
              "applicationSubCategory": "Fleet Management, Tire Management",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "COP",
                "description": "Plan Inicio gratuito para siempre — hasta 10 vehículos"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "47",
                "bestRating": "5"
              },
              "featureList": [
                "Control de CPK (costo por kilómetro) de llantas",
                "Inspecciones digitales de neumáticos",
                "Alertas predictivas de reencauche",
                "Seguimiento de desgaste de llantas",
                "Reportes de ahorro en pesos colombianos",
                "Gestión de flotas pesadas",
                "App offline para iOS y Android"
              ],
              "screenshot": "https://www.tirepro.com.co/landing.png",
              "softwareVersion": "2.0",
              "releaseNotes": "Dashboard con análisis de CPK proyectado y vida útil de llantas"
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "TirePro",
              "url": "https://www.tirepro.com.co",
              "logo": "https://www.tirepro.com.co/logo_full.png",
              "description": "Empresa colombiana de tecnología especializada en software de gestión de llantas con IA para flotas de transporte pesado.",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Bogotá",
                "addressRegion": "Cundinamarca",
                "addressCountry": "CO"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+57-315-134-9122",
                "contactType": "sales",
                "email": "info@tirepro.com.co",
                "availableLanguage": "Spanish"
              },
              "sameAs": [
                "https://www.linkedin.com/company/tirepro",
                "https://apps.apple.com/us/app/tirepro/id6741497732"
              ],
              "areaServed": ["Colombia", "Latinoamérica"],
              "knowsAbout": [
                "Gestión de llantas para flotas",
                "Control de CPK neumáticos",
                "Reencauche inteligente",
                "Mantenimiento preventivo de llantas",
                "Software de flotas pesadas Colombia"
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "¿Cómo reduce TirePro mis costos de llantas y mantenimiento?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "TirePro analiza miles de datos históricos de llantas para detectar el momento óptimo de reemplazo y maximizar la vida útil de cada neumático. Nuestros clientes reportan ahorros del 20-28% en costos de llantas en los primeros 6 meses."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cómo se realizan las inspecciones de llantas en TirePro?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Las inspecciones se hacen directamente desde la app móvil o el sitio web de forma muy sencilla e intuitiva. Registras las medidas de profundidad, presión y estado de cada llanta en segundos. La app funciona offline y sincroniza automáticamente cuando hay conexión."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Qué necesito para empezar a usar TirePro para mi flota?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Solo necesitas un smartphone o computador. La app móvil funciona offline y sincroniza cuando hay conexión. La configuración toma menos de 10 minutos. Registra tus vehículos y comienza a hacer inspecciones de inmediato."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cómo genera TirePro sus recomendaciones de reencauche y reemplazo?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "TirePro analiza miles de datos históricos de llantas — patrones de desgaste, CPK por marca y diseño, condiciones de operación — para calcular el momento óptimo de reemplazo o reencauche. Cada recomendación está personalizada para tu tipo de vehículo y operación."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿TirePro tiene plan gratuito para gestión de llantas?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. El Plan Inicio de TirePro es 100% gratuito para siempre y permite gestionar hasta 10 vehículos con llantas ilimitadas. Incluye inspecciones digitales, análisis de CPK y monitoreo básico sin necesidad de tarjeta de crédito."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Los datos de mi flota de llantas están seguros en TirePro?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Todos los datos están encriptados con estándares bancarios y almacenados en servidores seguros en la nube. Cumplimos con todas las normativas de protección de datos de Colombia. Tu información nunca se comparte con terceros."
                  }
                }
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Inicio",
                  "item": "https://www.tirepro.com.co"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Software de Gestión de Llantas",
                  "item": "https://www.tirepro.com.co/#producto"
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": "Calculadora CPK Llantas",
                  "item": "https://www.tirepro.com.co/calculadora"
                },
                {
                  "@type": "ListItem",
                  "position": 4,
                  "name": "Blog de Gestión de Flotas",
                  "item": "https://www.tirepro.com.co/blog"
                }
              ]
            }
          ])
        }}
      />

      {/* -- HIDDEN SEO CONTENT (visible to crawlers, sr-only visually) ---------- */}
      <section aria-label="Información sobre TirePro" className="sr-only">
        <h2>Software de gestión de llantas con IA para flotas en Colombia</h2>
        <p>
          TirePro es la plataforma líder de control de llantas para flotas pesadas en Colombia.
          Diseñado específicamente para empresas de transporte de carga, buses, volquetas y tractocamiones,
          TirePro digitaliza y automatiza el seguimiento de neumáticos para reducir el costo por kilómetro (CPK)
          y extender la vida útil de cada llanta mediante reencauche inteligente.
        </p>
        <h3>Control de CPK de llantas para flotas de camiones</h3>
        <p>
          El costo por kilómetro (CPK) de llantas es el indicador clave para cualquier gerente de flota en Colombia.
          TirePro calcula el CPK real y proyectado de cada neumático, identifica qué llantas tienen el peor desempeño
          y genera alertas de reemplazo antes de que ocurran fallas en ruta.
        </p>
        <h3>Reencauche inteligente de llantas para flotas colombianas</h3>
        <p>
          El reencauche permite extender la vida útil de las llantas hasta 3 veces adicionales,
          reduciendo el costo total por kilómetro hasta un 45%. TirePro predice el momento óptimo
          de reencauche para cada llanta según su desgaste real, marca, diseño y condición de operación.
        </p>
        <h3>Seguimiento de neumáticos offline — app para iOS y Android</h3>
        <p>
          La app móvil de TirePro funciona sin conexión a internet, ideal para patios, terminales y rutas
          con señal limitada. Compatible con iOS y Android, permite registrar inspecciones de profundidad
          de banda, presión y estado de desgaste en segundos.
        </p>
        <h3>Mantenimiento preventivo de llantas para transporte en Colombia</h3>
        <p>
          TirePro usa inteligencia artificial para predecir fallas de llantas antes de que ocurran,
          generando alertas automáticas de mantenimiento preventivo. Esto reduce las paradas no programadas,
          mejora la seguridad vial y optimiza la disponibilidad de la flota en ciudades como Bogotá,
          Medellín, Cali, Barranquilla, Bucaramanga y Cartagena.
        </p>
        <h3>Software de gestión de flotas pesadas Colombia — TirePro vs. Excel</h3>
        <p>
          A diferencia del control manual con hojas de cálculo Excel, TirePro centraliza toda la información
          de llantas en tiempo real, calcula CPK automáticamente y genera reportes de ahorro en pesos colombianos.
          Es la alternativa digital a Ruedata, VEC Fleet y la gestión manual de neumáticos para flotas en Colombia.
        </p>
      </section>

      {/* -- FOOTER (unchanged) -------------------------------------------------- */}
      <footer
        className="border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full"
        style={{ borderColor: 'rgba(30,118,182,0.15)', backgroundColor: '#0A183A' }}
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className="font-semibold text-white">TirePro</span>
              </div>
              <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Software de optimización inteligente de llantas para flotas de vehículos en Colombia
              </p>
              <nav aria-label="Redes sociales">
                <div className="flex space-x-4">
                  {[
                    { label: 'Facebook',link: "https://www.instagram.com/tirepro.app/", path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                    { label: 'Instagram',link: "https://www.instagram.com/tirepro.app/", path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                    { label: 'LinkedIn', link: "https://tr.ee/NHqhS82dFR",path: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z' },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href={social.link}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1E76B6'; (e.currentTarget as HTMLAnchorElement).style.color = 'white' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)' }}
                      aria-label={social.label}
                    >
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d={social.path}/></svg>
                    </a>
                  ))}
                </div>
              </nav>
            </div>
            <nav aria-labelledby="product-nav">
              <h4 id="product-nav" className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Producto</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="#producto" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/equipo" className="hover:text-white transition-colors">Nosotros</a></li>
                <li><a href="/developers" className="hover:text-white transition-colors">Desarrolladores</a></li>
              </ul>
            </nav>
            <nav aria-labelledby="legal-nav">
              <h4 id="legal-nav" className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="/delete" className="hover:text-white transition-colors">Eliminar datos</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </nav>
            <address className="not-italic">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Contacto TirePro</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="mailto:info@tirepro.com.co" className="hover:text-white transition-colors">info@tirepro.com.co</a></li>
                <li><a href="tel:+573151349122" className="hover:text-white transition-colors">+57 315 134 9122</a></li>
                <li>Bogotá, Colombia</li>
              </ul>
            </address>
          </div>
          <div
            className="pt-6 sm:pt-8 border-t flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm gap-4"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}
          >
            <p>© 2025 TirePro Colombia. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ en Colombia</p>
          </div>
        </div>
      </footer>

      {/* -- WHATSAPP FLOATING --------------------------------------------------- */}
      <a
        href="https://wa.me/3151349122?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20TirePro"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50"
        aria-label="Contáctanos por WhatsApp para consultas sobre TirePro"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-pulse" aria-hidden="true"></span>
      </a>
    </div>
  )
}

export default TireProLanding