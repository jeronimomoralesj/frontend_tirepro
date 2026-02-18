'use client'
import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Calculator,
  TrendingDown,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  Gauge,
  DollarSign,
  RotateCcw,
  ArrowRight,
  Shield,
} from 'lucide-react'
import Image from 'next/image'
import logo from "../../../public/logo_full.png"

// ─── Types ───────────────────────────────────────────────────────────────────
interface Reencauche {
  id: string
  costo: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)
const fmt = (n: number) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n: number) => n.toLocaleString('es-CO')
const parseNum = (s: string) => parseFloat(s.replace(/,/g, '.')) || 0

function daysBetween(dateStr: string) {
  const start = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

// ─── Shared input component — uses text + inputMode so user can type freely ──
function InputField({
  label, value, onChange, placeholder, prefix, type = 'text', hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  prefix?: string
  type?: 'text' | 'date'
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-gray-400 font-medium">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          inputMode={type === 'text' ? 'decimal' : undefined}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] transition-all text-sm ${prefix ? 'pl-7' : ''}`}
        />
      </div>
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  title, icon: Icon, children, accent = 'blue',
}: {
  title: string; icon: any; children: React.ReactNode; accent?: 'blue' | 'green' | 'orange'
}) {
  const border =
    accent === 'green' ? 'border-green-500/30'
    : accent === 'orange' ? 'border-orange-500/30'
    : 'border-blue-500/30'
  const iconBg =
    accent === 'green' ? 'from-green-500 to-green-600'
    : accent === 'orange' ? 'from-orange-500 to-orange-600'
    : 'from-blue-500 to-blue-600'
  return (
    <div className={`rounded-2xl border ${border} bg-gradient-to-br from-gray-900/80 to-black/80 p-6 sm:p-8`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className="text-white" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Result badge ─────────────────────────────────────────────────────────────
function ResultBadge({
  label, value, sub, color = 'blue',
}: {
  label: string; value: string; sub?: string; color?: 'blue' | 'green' | 'orange' | 'red'
}) {
  const grad = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    orange: 'from-orange-400 to-orange-600',
    red: 'from-red-400 to-red-600',
  }[color]
  return (
    <div className="text-center p-4 sm:p-6 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs sm:text-sm text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${grad} bg-clip-text text-transparent`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Reencauche row — only costo, free-text input ────────────────────────────
function ReencaucheRow({
  r, index, accentColor, onUpdate, onRemove,
}: {
  r: Reencauche
  index: number
  accentColor: string
  onUpdate: (id: string, value: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex gap-2 items-end p-4 rounded-xl bg-white/5 border border-white/10 relative">
      <span className={`absolute -top-3 left-4 text-xs bg-black px-2 ${accentColor}`}>
        Reencauche {index + 1}
      </span>
      <div className="flex-1 space-y-1.5">
        <label className="block text-sm text-gray-400 font-medium">Costo del reencauche (COP)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none pointer-events-none">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={r.costo}
            onChange={e => onUpdate(r.id, e.target.value)}
            placeholder="550000"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] transition-all text-sm"
          />
        </div>
      </div>
      <button
        onClick={() => onRemove(r.id)}
        className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center transition-all flex-shrink-0 mb-0.5"
        aria-label="Eliminar reencauche"
      >
        <Trash2 size={16} className="text-red-400" />
      </button>
    </div>
  )
}

// ─── Reencauche list helpers ──────────────────────────────────────────────────
function useReencauches() {
  const [list, setList] = useState<Reencauche[]>([])
  const add = () => setList(p => [...p, { id: uid(), costo: '' }])
  const remove = (id: string) => setList(p => p.filter(r => r.id !== id))
  const update = (id: string, value: string) =>
    setList(p => p.map(r => r.id === id ? { ...r, costo: value } : r))
  const totalCost = list.reduce((s, r) => s + parseNum(r.costo), 0)
  const reset = () => setList([])
  return { list, add, remove, update, totalCost, reset }
}

// ─── Add reencauche button ────────────────────────────────────────────────────
function AddReencaucheBtn({ onClick, color }: { onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 rounded-xl border border-dashed ${color} transition-all text-sm flex items-center justify-center gap-2`}
    >
      <Plus size={16} />
      Agregar Reencauche
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CalculadoraCPK() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'cpk' | 'cpkProyectado' | 'cpt'>('cpk')

  // ── CPK Real state ──────────────────────────────────────────────────────────
  const [costoInicial, setCostoInicial] = useState('')
  const [kmNueva, setKmNueva] = useState('')
  const [kmReencauches, setKmReencauches] = useState('')  // single total km for all reencauches
  const [reparaciones, setReparaciones] = useState('')
  const cpkRe = useReencauches()
  const [cpkResult, setCpkResult] = useState<null | {
    cpk: number; totalCosto: number; totalKm: number
  }>(null)

  // ── CPK Proyectado state ────────────────────────────────────────────────────
  const [kmActual, setKmActual] = useState('')
  const [menorMm, setMenorMm] = useState('')
  const [costoTotalProyectado, setCostoTotalProyectado] = useState('')
  const projRe = useReencauches()
  const [minimoSeguridad, setMinimoSeguridad] = useState(false)
  const [cpkProjResult, setCpkProjResult] = useState<null | {
    cpk: number; kmProyectados: number; mmUsados: number; totalCosto: number; pastMinimo: boolean
  }>(null)

  // ── CPT state ───────────────────────────────────────────────────────────────
  const [fechaInicio, setFechaInicio] = useState('')
  const [costoInicialCpt, setCostoInicialCpt] = useState('')
  const [reparacionesCpt, setReparacionesCpt] = useState('')
  const cptRe = useReencauches()
  const [cptView, setCptView] = useState<'dias' | 'meses'>('dias')
  const [cptResult, setCptResult] = useState<null | {
    cptDia: number; cptMes: number; totalCosto: number; dias: number; meses: number
  }>(null)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Calculators ─────────────────────────────────────────────────────────────
  const calcularCPK = () => {
    const ci = parseNum(costoInicial)
    const km = parseNum(kmNueva)
    const kmRe = parseNum(kmReencauches)
    const rep = parseNum(reparaciones)
    const totalCosto = ci + rep + cpkRe.totalCost
    const totalKm = km + kmRe
    if (totalKm <= 0) return
    setCpkResult({ cpk: totalCosto / totalKm, totalCosto, totalKm })
  }

  const calcularCPKProyectado = () => {
    const km = parseNum(kmActual)
    const mm = parseNum(menorMm)
    const ci = parseNum(costoTotalProyectado)
    const totalCosto = ci + projRe.totalCost
    const MM_INICIO = 22
    const mmUsados = MM_INICIO - mm

    if (mmUsados <= 0) {
      setCpkProjResult({ cpk: 0, kmProyectados: 0, mmUsados: 0, totalCosto, pastMinimo: false })
      return
    }

    const kmPorMm = km / mmUsados
    let mmRestantes = mm
    if (minimoSeguridad) {
      mmRestantes = mm - 2
      if (mmRestantes <= 0) {
        setCpkProjResult({ cpk: 0, kmProyectados: 0, mmUsados, totalCosto, pastMinimo: true })
        return
      }
    }

    const kmProyectados = kmPorMm * mmRestantes
    const totalKmProyectados = km + kmProyectados
    const cpk = totalKmProyectados > 0 ? totalCosto / totalKmProyectados : 0
    setCpkProjResult({ cpk, kmProyectados, mmUsados, totalCosto, pastMinimo: false })
  }

  const calcularCPT = () => {
    if (!fechaInicio) return
    const ci = parseNum(costoInicialCpt)
    const rep = parseNum(reparacionesCpt)
    const totalCosto = ci + rep + cptRe.totalCost
    const dias = daysBetween(fechaInicio)
    const meses = Math.max(1, Math.round(dias / 30.44))
    setCptResult({ cptDia: totalCosto / dias, cptMes: totalCosto / meses, totalCosto, dias, meses })
  }

  const resetAll = () => {
    setCostoInicial(''); setKmNueva(''); setKmReencauches(''); setReparaciones('')
    cpkRe.reset(); setCpkResult(null)
    setKmActual(''); setMenorMm(''); setCostoTotalProyectado('')
    projRe.reset(); setMinimoSeguridad(false); setCpkProjResult(null)
    setFechaInicio(''); setCostoInicialCpt(''); setReparacionesCpt('')
    cptRe.reset(); setCptResult(null)
  }

  const tabs = [
    { id: 'cpk' as const, label: 'CPK Real', icon: Calculator },
    { id: 'cpkProyectado' as const, label: 'CPK Proyectado', icon: Gauge },
    { id: 'cpt' as const, label: 'CPT (por Tiempo)', icon: Clock },
  ]

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
              <a href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</a>
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
              <a href="/blog" className="block text-gray-400 hover:text-white py-2">Blog</a>
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

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <header className="pt-28 sm:pt-32 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-5xl mx-auto text-center space-y-5">
          <nav aria-label="Ruta de navegación" className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <ChevronRight size={14} />
            <span className="text-gray-300">Calculadora CPK</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <Calculator size={14} />
            Herramienta Gratuita para Flotas en Colombia
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight tracking-tight">
            Calculadora de CPK y CPT
            <br />
            <span className="text-gray-500">para Flotas en Colombia</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Calcula el Costo por Kilómetro real, proyectado y el Costo por Tiempo de tus llantas.
            Incluye reencauches, reparaciones y el mínimo legal colombiano (2 mm).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" />Sin registro</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" />100% gratuita</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" />Resultados instantáneos</span>
          </div>
        </div>
      </header>

      {/* ── TABS ─────────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl mb-8">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────────── */}
      <main className="px-4 sm:px-6 lg:px-8 pb-24 w-full">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ════════════ TAB: CPK REAL ════════════ */}
          {activeTab === 'cpk' && (
            <>
              <div className="flex gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-gray-400">
                <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Fórmula:</strong>{' '}
                  CPK = (Costo Inicial + Reencauches + Reparaciones) ÷ (Km en nueva + Km totales en reencauches)
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Llanta nueva */}
                <SectionCard title="Llanta Nueva" icon={DollarSign}>
                  <div className="space-y-4">
                    <InputField
                      label="Costo de la llanta nueva (COP)"
                      value={costoInicial}
                      onChange={setCostoInicial}
                      placeholder="2300000"
                      prefix="$"
                      hint="Precio de compra sin o con IVA, sé consistente"
                    />
                    <InputField
                      label="Kilómetros recorridos totales"
                      value={kmNueva}
                      onChange={setKmNueva}
                      placeholder="120000"
                    />
                    <InputField
                      label="Reparaciones (COP)"
                      value={reparaciones}
                      onChange={setReparaciones}
                      placeholder="0"
                      prefix="$"
                      hint="Pinchazos, parches y reparaciones menores"
                    />
                  </div>
                </SectionCard>

                {/* Reencauches */}
                <SectionCard title="Reencauches" icon={RotateCcw}>
                  <div className="space-y-4">
                    {/* Km totales en reencauches — single field for all */}
                    <InputField
                      label="Kilómetros totales en todos los reencauches"
                      value={kmReencauches}
                      onChange={setKmReencauches}
                      placeholder="200000"
                      hint="Suma de todos los km recorridos en reencauche"
                    />

                    {cpkRe.list.length > 0 && (
                      <div className="space-y-3">
                        {cpkRe.list.map((r, i) => (
                          <ReencaucheRow
                            key={r.id}
                            r={r}
                            index={i}
                            accentColor="text-blue-400"
                            onUpdate={cpkRe.update}
                            onRemove={cpkRe.remove}
                          />
                        ))}
                      </div>
                    )}

                    {cpkRe.list.length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-2">
                        Sin reencauches aún. Agrégalos si aplica.
                      </p>
                    )}

                    <AddReencaucheBtn
                      onClick={cpkRe.add}
                      color="border-blue-500/40 text-blue-400 hover:border-blue-500 hover:bg-blue-500/5"
                    />

                    {cpkRe.list.length > 0 && (
                      <p className="text-xs text-right text-gray-500">
                        Total reencauches: <span className="text-white font-medium">${fmtInt(Math.round(cpkRe.totalCost))} COP</span>
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>

              <button
                onClick={calcularCPK}
                className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Calculator size={20} />
                Calcular CPK Real
              </button>

              {cpkResult && (
                <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent p-6 sm:p-8">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-400" />
                    Resultado CPK Real
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <ResultBadge label="CPK Real" value={`$${fmt(cpkResult.cpk)}`} sub="pesos por kilómetro" color="green" />
                    <ResultBadge label="Inversión Total" value={`$${fmtInt(Math.round(cpkResult.totalCosto))}`} sub="COP invertidos" color="blue" />
                    <ResultBadge label="Kilómetros Totales" value={`${fmtInt(Math.round(cpkResult.totalKm))} km`} sub={`${cpkRe.list.length} reencauche(s)`} color="orange" />
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 text-sm text-gray-400 flex gap-3">
                    <TrendingDown size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <p>
                      Un CPK de <strong className="text-white">${fmt(cpkResult.cpk)}/km</strong> significa que cada kilómetro recorrido te cuesta esa cantidad en llantas.
                      Compara entre marcas para encontrar la más rentable para tu operación.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════ TAB: CPK PROYECTADO ════════════ */}
          {activeTab === 'cpkProyectado' && (
            <>
              <div className="flex gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-sm text-gray-400">
                <Info size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">¿Cómo funciona?</strong>{' '}
                  Asumimos que la llanta sale de fábrica con 22 mm. Con el kilometraje actual y los mm restantes
                  calculamos cuánto le queda de vida y proyectamos el CPK final.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Estado actual */}
                <SectionCard title="Estado Actual de la Llanta" icon={Gauge} accent="orange">
                  <div className="space-y-4">
                    <InputField
                      label="Kilometraje actual de la llanta (km)"
                      value={kmActual}
                      onChange={setKmActual}
                      placeholder="80000"
                      hint="Kilómetros que lleva recorridos hasta hoy"
                    />
                    <InputField
                      label="Menor mm de profundidad actual"
                      value={menorMm}
                      onChange={setMenorMm}
                      placeholder="8"
                      hint="Mide con profundímetro. La llanta sale de fábrica con 22 mm."
                    />
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-500 space-y-1">
                      <p>📐 Profundidad de fábrica estándar: <span className="text-white font-medium">22 mm</span></p>
                      <p>🚨 Mínimo legal Colombia: <span className="text-red-400 font-medium">2 mm</span></p>
                    </div>
                    <button
                      onClick={() => setMinimoSeguridad(!minimoSeguridad)}
                      className={`w-full py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${
                        minimoSeguridad
                          ? 'bg-red-500/10 border-red-500/40 text-red-300'
                          : 'border-white/20 text-gray-400 hover:border-red-500/40 hover:text-red-400'
                      }`}
                    >
                      <Shield size={16} className={minimoSeguridad ? 'text-red-400' : 'text-gray-500'} />
                      {minimoSeguridad
                        ? '✓ Mínimo de seguridad Colombia (2 mm) activado'
                        : 'Tener en cuenta mínimo de seguridad en Colombia (2 mm)'}
                    </button>
                  </div>
                </SectionCard>

                {/* Costos + reencauches */}
                <SectionCard title="Costos" icon={DollarSign} accent="orange">
                  <div className="space-y-4">
                    <InputField
                      label="Costo total hasta hoy (COP)"
                      value={costoTotalProyectado}
                      onChange={setCostoTotalProyectado}
                      placeholder="2300000"
                      prefix="$"
                      hint="Costo inicial + reparaciones anteriores"
                    />

                    {projRe.list.length > 0 && (
                      <div className="space-y-3">
                        {projRe.list.map((r, i) => (
                          <ReencaucheRow
                            key={r.id}
                            r={r}
                            index={i}
                            accentColor="text-orange-400"
                            onUpdate={projRe.update}
                            onRemove={projRe.remove}
                          />
                        ))}
                      </div>
                    )}

                    {projRe.list.length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-2">
                        Sin reencauches aún. Agrégalos si aplica.
                      </p>
                    )}

                    <AddReencaucheBtn
                      onClick={projRe.add}
                      color="border-orange-500/40 text-orange-400 hover:border-orange-500 hover:bg-orange-500/5"
                    />

                    {projRe.list.length > 0 && (
                      <p className="text-xs text-right text-gray-500">
                        Total reencauches: <span className="text-white font-medium">${fmtInt(Math.round(projRe.totalCost))} COP</span>
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>

              <button
                onClick={calcularCPKProyectado}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Gauge size={20} />
                Calcular CPK Proyectado
              </button>

              {cpkProjResult && (
                <>
                  {cpkProjResult.pastMinimo ? (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-6 flex gap-4">
                      <AlertTriangle size={24} className="text-red-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-red-300 mb-2">⚠️ Esta llanta ya pasó el mínimo legal</h3>
                        <p className="text-sm text-gray-400">
                          Con {menorMm} mm de profundidad y restando los 2 mm del mínimo de seguridad colombiano,
                          esta llanta ya no puede seguir operando legalmente. Retírala inmediatamente del servicio.
                        </p>
                      </div>
                    </div>
                  ) : cpkProjResult.cpk === 0 ? (
                    <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/5 p-6 flex gap-4">
                      <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0 mt-1" />
                      <p className="text-sm text-gray-400">
                        Verifica los datos. La profundidad no puede ser mayor a 22 mm ni el kilometraje puede ser 0.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent p-6 sm:p-8">
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <CheckCircle size={20} className="text-orange-400" />
                        Resultado CPK Proyectado
                        {minimoSeguridad && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            Con mínimo legal 2 mm
                          </span>
                        )}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <ResultBadge label="CPK Proyectado" value={`$${fmt(cpkProjResult.cpk)}`} sub="pesos / km" color="orange" />
                        <ResultBadge label="Km Restantes" value={`${fmtInt(Math.round(cpkProjResult.kmProyectados))}`} sub="kilómetros proyectados" color="blue" />
                        <ResultBadge label="Inversión Total" value={`$${fmtInt(Math.round(cpkProjResult.totalCosto))}`} sub="COP" color="green" />
                        <ResultBadge label="Mm Consumidos" value={`${fmt(cpkProjResult.mmUsados)} mm`} sub="de 22 mm iniciales" color="red" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-400">
                        <div className="p-3 rounded-xl bg-white/5 flex gap-2">
                          <Info size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                          <p>Tasa de desgaste: <strong className="text-white">{fmt(parseNum(kmActual) / cpkProjResult.mmUsados)} km/mm</strong></p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 flex gap-2">
                          <Info size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                          <p>Profundidad restante útil: <strong className="text-white">{minimoSeguridad ? (parseNum(menorMm) - 2).toFixed(1) : menorMm} mm</strong></p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ════════════ TAB: CPT ════════════ */}
          {activeTab === 'cpt' && (
            <>
              <div className="flex gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-sm text-gray-400">
                <Info size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Fórmula CPT:</strong>{' '}
                  Costo Por Tiempo = Inversión Total ÷ Días (o meses) de uso.
                  Útil para comparar llantas independientemente del kilometraje.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Fecha y costos */}
                <SectionCard title="Fecha y Costos" icon={Clock} accent="green">
                  <div className="space-y-4">
                    <InputField
                      label="Fecha de instalación de la llanta"
                      value={fechaInicio}
                      onChange={setFechaInicio}
                      type="date"
                      hint="El día que se montó la llanta al vehículo"
                    />
                    <InputField
                      label="Costo inicial de la llanta (COP)"
                      value={costoInicialCpt}
                      onChange={setCostoInicialCpt}
                      placeholder="2300000"
                      prefix="$"
                    />
                    <InputField
                      label="Reparaciones acumuladas (COP)"
                      value={reparacionesCpt}
                      onChange={setReparacionesCpt}
                      placeholder="0"
                      prefix="$"
                    />
                  </div>
                </SectionCard>

                {/* Reencauches CPT */}
                <SectionCard title="Reencauches" icon={RotateCcw} accent="green">
                  <div className="space-y-4">
                    {cptRe.list.length > 0 && (
                      <div className="space-y-3">
                        {cptRe.list.map((r, i) => (
                          <ReencaucheRow
                            key={r.id}
                            r={r}
                            index={i}
                            accentColor="text-green-400"
                            onUpdate={cptRe.update}
                            onRemove={cptRe.remove}
                          />
                        ))}
                      </div>
                    )}

                    {cptRe.list.length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-4">
                        Sin reencauches aún. Agrégalos si aplica.
                      </p>
                    )}

                    <AddReencaucheBtn
                      onClick={cptRe.add}
                      color="border-green-500/40 text-green-400 hover:border-green-500 hover:bg-green-500/5"
                    />

                    {cptRe.list.length > 0 && (
                      <p className="text-xs text-right text-gray-500">
                        Total reencauches: <span className="text-white font-medium">${fmtInt(Math.round(cptRe.totalCost))} COP</span>
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>

              <button
                onClick={calcularCPT}
                className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
              >
                <Clock size={20} />
                Calcular CPT
              </button>

              {cptResult && (
                <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-400" />
                      Resultado CPT
                    </h3>
                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                      <button
                        onClick={() => setCptView('dias')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${cptView === 'dias' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        Por Día
                      </button>
                      <button
                        onClick={() => setCptView('meses')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${cptView === 'meses' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        Por Mes
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <ResultBadge
                      label={cptView === 'dias' ? 'CPT por Día' : 'CPT por Mes'}
                      value={cptView === 'dias' ? `$${fmt(cptResult.cptDia)}` : `$${fmtInt(Math.round(cptResult.cptMes))}`}
                      sub={cptView === 'dias' ? 'pesos por día' : 'pesos por mes'}
                      color="green"
                    />
                    <ResultBadge label="Inversión Total" value={`$${fmtInt(Math.round(cptResult.totalCosto))}`} sub="COP invertidos" color="blue" />
                    <ResultBadge
                      label={cptView === 'dias' ? 'Días en Servicio' : 'Meses en Servicio'}
                      value={cptView === 'dias' ? `${fmtInt(cptResult.dias)} días` : `${cptResult.meses} meses`}
                      sub={cptView === 'dias' ? `≈ ${cptResult.meses} meses` : `≈ ${fmtInt(cptResult.dias)} días`}
                      color="orange"
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 text-sm text-gray-400 flex gap-3">
                    <TrendingDown size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <p>
                      Esta llanta te cuesta{' '}
                      <strong className="text-white">${fmt(cptResult.cptDia)}/día</strong> o{' '}
                      <strong className="text-white">${fmtInt(Math.round(cptResult.cptMes))}/mes</strong>.
                      Ideal para calcular el costo operativo mensual de toda tu flota.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reset */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={resetAll}
              className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              Limpiar todos los cálculos
            </button>
          </div>
        </div>
      </main>

      {/* ── EDUCATIONAL SECTION ──────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent w-full"
        aria-labelledby="edu-heading"
      >
        <div className="max-w-5xl mx-auto">
          <h2 id="edu-heading" className="text-2xl sm:text-3xl font-semibold text-center mb-10">
            ¿Por qué calcular el CPK de tus llantas?
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingDown,
                title: 'Compra más inteligente',
                desc: 'Una llanta premium con 2 reencauches puede costar 32% menos por km que una "económica" sin reencauche. El CPK no miente.',
              },
              {
                icon: Shield,
                title: 'Mínimo legal en Colombia',
                desc: 'El Código Nacional de Tránsito establece 2 mm como profundidad mínima. Nuestra calculadora te avisa antes de llegar a ese límite.',
              },
              {
                icon: Calculator,
                title: 'Optimiza tu flota completa',
                desc: 'Calcula el CPK de cada referencia que usas y descubre qué marca es la más rentable para tu tipo de operación y rutas.',
              },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <item.icon size={22} className="text-white" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative p-8 sm:p-12 text-center space-y-5">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
                ¿Quieres calcular el CPK
                <br />
                <span className="text-gray-400">automáticamente para toda tu flota?</span>
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base">
                TirePro conecta inspecciones, compras y reencauches en un solo lugar.
                Con un clic sabes qué llanta es la más rentable para tu operación.
              </p>
              <a href="/companyregister">
                <button className="mt-2 bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-gray-100 transition-all inline-flex items-center gap-2">
                  Prueba TirePro Gratis
                  <ArrowRight size={18} />
                </button>
              </a>
              <p className="text-xs text-gray-600">Sin tarjeta de crédito · Plan gratuito para siempre</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-6 lg:px-8 w-full" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                </div>
                <span className="font-semibold">TirePro Colombia</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                Software de optimización inteligente de llantas para flotas en Colombia y Latinoamérica.
              </p>
            </div>
            <nav aria-labelledby="ft-product">
              <h4 id="ft-product" className="font-medium mb-3 text-sm">Producto</h4>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><a href="/#producto" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="/#planes" className="hover:text-white transition-colors">Planes y precios</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/calculadora" className="hover:text-white transition-colors">Calculadora CPK</a></li>
              </ul>
            </nav>
            <nav aria-labelledby="ft-legal">
              <h4 id="ft-legal" className="font-medium mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><a href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </nav>
            <address className="not-italic">
              <h4 className="font-medium mb-3 text-sm">Contacto</h4>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><a href="mailto:info@tirepro.com.co" className="hover:text-white transition-colors">info@tirepro.com.co</a></li>
                <li><a href="tel:+573151349122" className="hover:text-white transition-colors">+57 315 134 9122</a></li>
                <li>Bogotá, Colombia</li>
              </ul>
            </address>
          </div>
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-3">
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