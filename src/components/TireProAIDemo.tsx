'use client'

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const USER_MESSAGE =
  'Ana, muéstrame un gráfico con cuántas llantas tengo por marca en toda la flota.'

type Stage =
  | 'idle'
  | 'typing'
  | 'thinking'
  | 'replying'
  | 'card'
  | 'pdf'
  | 'done'

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} style={style}>
      <path d="M8 0l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5z" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function TireProAIDemo({ embedded = false }: { embedded?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapRef, { once: true, margin: '-100px' })

  const [stage, setStage] = useState<Stage>('idle')
  const [typed, setTyped] = useState('')
  const [playKey, setPlayKey] = useState(0)

  useEffect(() => {
    if (inView && stage === 'idle') setStage('typing')
  }, [inView, stage])

  useEffect(() => {
    if (stage !== 'typing') return
    setTyped('')
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setTyped(USER_MESSAGE.slice(0, i))
      if (i >= USER_MESSAGE.length) {
        window.clearInterval(id)
        window.setTimeout(() => setStage('thinking'), 450)
      }
    }, 26)
    return () => window.clearInterval(id)
  }, [stage, playKey])

  useEffect(() => {
    let id: number | undefined
    if (stage === 'thinking') id = window.setTimeout(() => setStage('replying'), 1400)
    if (stage === 'replying') id = window.setTimeout(() => setStage('card'), 700)
    if (stage === 'card') id = window.setTimeout(() => setStage('pdf'), 2600)
    if (stage === 'pdf') id = window.setTimeout(() => setStage('done'), 2200)
    return () => {
      if (id) window.clearTimeout(id)
    }
  }, [stage])

  const replay = () => {
    setStage('idle')
    setTyped('')
    setPlayKey((k) => k + 1)
    window.setTimeout(() => setStage('typing'), 80)
  }

  const showThinking = stage === 'thinking'
  const showReply = ['replying', 'card', 'pdf', 'done'].includes(stage)
  const showCard = ['card', 'pdf', 'done'].includes(stage)
  const showPdf = ['pdf', 'done'].includes(stage)
  const pdfDone = stage === 'done'

  const heading = (
    <div className={embedded ? 'text-center' : 'mx-auto max-w-2xl text-center'}>
      <h2
        className="text-balance font-semibold leading-tight"
        style={{ fontSize: embedded ? 'clamp(1.3rem, 3vw, 1.75rem)' : 'clamp(1.8rem, 4vw, 2.75rem)' }}
      >
        Le pides un análisis. Te entrega decisiones.
      </h2>
      <p
        className={`mt-3 text-sm leading-relaxed ${embedded ? 'mx-auto max-w-xs' : 'mx-auto mt-4 max-w-xl text-base'}`}
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        {embedded
          ? 'Le hablas, la IA analiza y te entrega resultados accionables.'
          : 'Sin filtros. Sin dashboards. Sin exportar a Excel. Le hablas, la IA analiza y te entrega resultados accionables.'}
      </p>
    </div>
  )

  const phone = (
    <div className={`relative mx-auto ${embedded ? 'mt-8 w-[300px] sm:w-[340px]' : 'mt-14 w-[340px] sm:w-[360px]'}`}>
      {!embedded && (
        <>
          <div className="pointer-events-none absolute -left-44 top-12 hidden lg:block">
            <SideHint label="Analizando…" delay={0} />
          </div>
          <div className="pointer-events-none absolute -right-44 top-1/3 hidden lg:block">
            <SideHint
              label={pdfDone ? 'PDF listo ✓' : 'Generando reporte…'}
              delay={0.4}
            />
          </div>
        </>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[60px] blur-2xl"
        style={{ background: 'rgba(163,116,255,0.12)' }}
      />

      <div
        className="relative overflow-hidden rounded-[44px] p-[10px]"
        style={{ border: '1px solid rgba(255,255,255,0.15)', background: '#0A183A', boxShadow: '0 30px 70px -25px rgba(10,24,58,0.7)' }}
      >
        <div className="relative overflow-hidden rounded-[34px] bg-white" style={{ border: '2px solid rgba(163,116,255,0.2)' }}>
          <div className="absolute left-1/2 top-2 z-30 flex h-6 w-28 -translate-x-1/2 items-center justify-center rounded-full" style={{ background: '#0A183A' }}>
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
          </div>

          <div className="relative z-20 flex items-center justify-between px-6 pt-2.5 text-[10px] font-medium" style={{ color: 'rgba(10,24,58,0.7)' }}>
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(10,24,58,0.6)' }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(10,24,58,0.6)' }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(10,24,58,0.4)' }} />
            </span>
          </div>

          <div className="relative z-20 mt-2 flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(10,24,58,0.05)' }}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#0A183A', color: '#A374FF' }}>
                <SparkleIcon className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold" style={{ color: '#0A183A' }}>
                  Ana · TirePro
                </div>
                <div className="text-[9px]" style={{ color: 'rgba(10,24,58,0.5)' }}>
                  {stage === 'idle' && 'Lista'}
                  {stage === 'typing' && 'Escuchándote…'}
                  {stage === 'thinking' && 'Procesando datos…'}
                  {stage === 'replying' && 'Respondiendo…'}
                  {stage === 'card' && 'Generando gráfico…'}
                  {stage === 'pdf' && 'Empaquetando PDF…'}
                  {stage === 'done' && 'Listo'}
                </div>
              </div>
            </div>
            <button
              onClick={replay}
              className="text-[10px] font-medium transition-colors"
              style={{ color: 'rgba(10,24,58,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#A374FF')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(10,24,58,0.4)')}
              aria-label="Reproducir"
            >
              ▶
            </button>
          </div>

          <div className="relative z-10 space-y-2.5 px-3 py-3" style={{ background: 'rgba(240,245,250,0.4)' }}>
            <div className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-tr-sm px-3 py-2 text-[11px] leading-snug text-white shadow-sm" style={{ background: '#0A183A' }}>
                {typed}
                {stage === 'typing' && (
                  <span className="ml-0.5 inline-block h-2.5 w-0.5 -translate-y-px bg-white align-middle animate-pulse" />
                )}
                {stage === 'idle' && (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }} className="italic">Esperando…</span>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(163,116,255,0.1)', color: '#A374FF' }}>
                    <SparkleIcon className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5" style={{ border: '1px solid rgba(163,116,255,0.2)' }}>
                    <span className="h-1 w-1 animate-pulse rounded-full" style={{ background: '#A374FF' }} />
                    <span className="h-1 w-1 animate-pulse rounded-full" style={{ background: '#A374FF', animationDelay: '0.2s' }} />
                    <span className="h-1 w-1 animate-pulse rounded-full" style={{ background: '#A374FF', animationDelay: '0.4s' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showReply && (
                <motion.div
                  key="reply"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[11px] leading-snug shadow-sm" style={{ border: '1px solid rgba(163,116,255,0.15)', color: '#0A183A' }}>
                    Listo, aquí tienes la distribución:
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCard && (
                <motion.div
                  key="card"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex justify-start"
                >
                  <ReportCard
                    showPdf={showPdf}
                    pdfDone={pdfDone}
                    replayKey={playKey}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 flex items-center gap-1.5 bg-white px-3 py-2.5" style={{ borderTop: '1px solid rgba(10,24,58,0.05)' }}>
            <button
              aria-label="Adjuntar"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full"
              style={{ background: 'rgba(10,24,58,0.05)', color: 'rgba(10,24,58,0.7)' }}
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-full px-3 py-1.5" style={{ background: '#f0f5fa' }}>
              <span className="text-[10px]" style={{ color: 'rgba(10,24,58,0.4)' }}>
                Pregúntale a Ana…
              </span>
            </div>
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full" style={{ background: 'rgba(163,116,255,0.1)', color: '#A374FF' }}>
              <MicIcon className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="flex justify-center pb-2 pt-1.5">
            <div className="h-1 w-24 rounded-full" style={{ background: 'rgba(10,24,58,0.8)' }} />
          </div>
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div ref={wrapRef} className="text-white">
        {heading}
        {phone}
      </div>
    )
  }

  return (
    <section
      id="ai-demo"
      ref={wrapRef}
      className="relative isolate overflow-hidden py-24 text-white sm:py-32"
      style={{ background: 'linear-gradient(180deg, #0A183A 0%, #0d2244 100%)' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'linear-gradient(rgba(163,116,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(163,116,255,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute -top-32 left-1/4 h-[440px] w-[440px] rounded-full blur-2xl" style={{ background: 'rgba(163,116,255,0.15)' }} />
        <div className="absolute -bottom-20 right-1/4 h-[380px] w-[380px] rounded-full blur-2xl" style={{ background: 'rgba(23,61,104,0.4)' }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(163,116,255,0.4), transparent)' }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 sm:px-6 lg:px-10">
        {heading}
        {phone}
      </div>
    </section>
  )
}

function SideHint({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]"
      style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}
    >
      <SparkleIcon className="h-3 w-3" style={{ color: '#A374FF' }} />
      {label}
    </motion.div>
  )
}

function ReportCard({
  showPdf,
  pdfDone,
  replayKey,
}: {
  showPdf: boolean
  pdfDone: boolean
  replayKey: number
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl rounded-tl-sm bg-white shadow-lg" style={{ border: '1px solid rgba(163,116,255,0.25)', color: '#0A183A' }}>
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(10,24,58,0.05)', background: 'linear-gradient(to right, white, #f5f0ff)' }}>
        <div>
          <div className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#A374FF' }}>
            <SparkleIcon className="h-2.5 w-2.5" />
            Generado por Ana
          </div>
          <div className="mt-0.5 text-[12px] font-semibold" style={{ color: '#0A183A' }}>
            Llantas por marca · Mayo 2026
          </div>
        </div>
        <div className="text-right text-[8px]" style={{ color: 'rgba(10,24,58,0.5)' }}>
          84 vehículos
          <br />
          612 llantas
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(10,24,58,0.05)' }}>
        <StatTile
          label="Marcas activas"
          value="6"
          delta="2 nuevas"
          deltaColor="text-emerald-600"
          delay={0.15}
          replayKey={replayKey}
        />
        <StatTile
          label="Top marca"
          value="Michelin"
          delta="34% del total"
          deltaColor="#A374FF"
          delay={0.3}
          replayKey={replayKey}
        />
      </div>

      <div className="px-3 pt-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-semibold" style={{ color: '#0A183A' }}>
            Distribución por marca
          </span>
          <span className="text-[8.5px]" style={{ color: 'rgba(10,24,58,0.4)' }}>
            612 llantas totales
          </span>
        </div>
        <BrandChart replayKey={replayKey} />
      </div>

      <div className="mx-3 mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'rgba(163,116,255,0.06)', border: '1px solid rgba(163,116,255,0.15)' }}>
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ background: 'linear-gradient(135deg, #0A183A, #A374FF)' }}>
          <SparkleIcon className="h-2.5 w-2.5" style={{ color: 'white' }} />
        </div>
        <div className="min-w-0">
          <div className="text-[8.5px] font-semibold" style={{ color: '#A374FF' }}>Agente activado</div>
          <div className="text-[7.5px] truncate" style={{ color: 'rgba(10,24,58,0.5)' }}>Reunión creada · Goodyear tiene 3 llantas críticas</div>
        </div>
      </div>

      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(10,24,58,0.05)' }}>
        <AnimatePresence mode="wait">
          {!showPdf ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[9.5px]"
              style={{ color: 'rgba(10,24,58,0.4)' }}
            >
              Empaquetando…
            </motion.div>
          ) : !pdfDone ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between text-[9.5px]">
                <span style={{ color: 'rgba(10,24,58,0.7)' }}>Generando PDF…</span>
                <span className="font-medium" style={{ color: '#A374FF' }}>
                  llantas_por_marca.pdf
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(10,24,58,0.05)' }}>
                <motion.div
                  key={`bar-${replayKey}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.9, ease: 'easeInOut' }}
                  className="h-full"
                  style={{ background: 'linear-gradient(to right, #0A183A, #A374FF, #c4a4ff)' }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(163,116,255,0.1)', color: '#A374FF' }}>
                  <PdfIcon />
                </div>
                <div>
                  <div className="text-[10px] font-semibold" style={{ color: '#0A183A' }}>
                    llantas_por_marca.pdf
                  </div>
                  <div className="text-[8.5px]" style={{ color: 'rgba(10,24,58,0.5)' }}>
                    1.8 MB · listo
                  </div>
                </div>
              </div>
              <button
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9.5px] font-medium text-white transition-colors"
                style={{ background: '#0A183A' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A374FF')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0A183A')}
              >
                Descargar
                <span>↓</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  delta,
  deltaColor,
  delay,
  replayKey,
}: {
  label: string
  value: string
  delta: string
  deltaColor: string
  delay: number
  replayKey: number
}) {
  const isHex = deltaColor.startsWith('#')
  return (
    <motion.div
      key={`${label}-${replayKey}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white px-3 py-2.5"
    >
      <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'rgba(10,24,58,0.5)' }}>
        {label}
      </div>
      <div className="mt-0.5 text-[15px] font-semibold" style={{ color: '#0A183A' }}>
        {value}
      </div>
      <div
        className={`mt-0.5 text-[9px] ${isHex ? '' : deltaColor}`}
        style={isHex ? { color: deltaColor } : undefined}
      >
        {delta}
      </div>
    </motion.div>
  )
}

const BRANDS = [
  { label: 'Michelin',     count: 208, color: '#A374FF' },
  { label: 'Bridgestone',  count: 156, color: '#0A183A' },
  { label: 'Continental',  count: 98,  color: '#7c5cbf' },
  { label: 'Goodyear',     count: 72,  color: '#173D68' },
  { label: 'Hankook',      count: 48,  color: '#c4a4ff' },
  { label: 'Pirelli',      count: 30,  color: '#4a2d8a' },
]

function BrandChart({ replayKey }: { replayKey: number }) {
  const maxCount = Math.max(...BRANDS.map(b => b.count))

  return (
    <div className="relative mt-2 overflow-hidden rounded-lg px-2.5 py-3" style={{ border: '1px solid rgba(10,24,58,0.1)', background: 'linear-gradient(to bottom right, #faf8ff, white)' }}>
      <div className="space-y-2">
        {BRANDS.map((brand, i) => (
          <div key={`${brand.label}-${replayKey}`} className="flex items-center gap-2">
            <span className="w-[58px] truncate text-right text-[7.5px] font-medium" style={{ color: 'rgba(10,24,58,0.6)' }}>
              {brand.label}
            </span>
            <div className="relative flex-1 h-3.5 rounded-sm overflow-hidden" style={{ background: 'rgba(10,24,58,0.04)' }}>
              <motion.div
                key={`bar-${brand.label}-${replayKey}`}
                initial={{ width: 0 }}
                animate={{ width: `${(brand.count / maxCount) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: brand.color }}
              />
            </div>
            <motion.span
              key={`num-${brand.label}-${replayKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
              className="w-6 text-right text-[8px] font-bold tabular-nums"
              style={{ color: '#0A183A' }}
            >
              {brand.count}
            </motion.span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
