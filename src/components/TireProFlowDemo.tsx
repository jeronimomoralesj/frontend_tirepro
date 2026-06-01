'use client'

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const USER_MESSAGE =
  'Ana, cuando una llanta llegue a alerta critica, mandame un WhatsApp, un email y agenda una revision.'

type Stage =
  | 'idle'
  | 'typing'
  | 'thinking'
  | 'replying'
  | 'flow'
  | 'active'
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

function BoltIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WhatsAppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l4.9-1.4A10 10 0 1 0 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmailIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="m3 7 9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BellIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const FLOW_ACTIONS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    detail: '+57 312 •••• 89',
    color: '#25D366',
    iconBg: 'rgba(37,211,102,0.15)',
    Icon: WhatsAppIcon,
  },
  {
    id: 'email',
    label: 'Email',
    detail: 'info@tirepro.com.co',
    color: '#1E76B6',
    iconBg: 'rgba(30,118,182,0.15)',
    Icon: EmailIcon,
  },
  {
    id: 'calendar',
    label: 'Evento Calendar',
    detail: 'Revision de llanta',
    color: '#EA4335',
    iconBg: 'rgba(234,67,53,0.15)',
    Icon: CalendarIcon,
  },
  {
    id: 'notification',
    label: 'Notificacion push',
    detail: 'Alta prioridad',
    color: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.15)',
    Icon: BellIcon,
  },
]

export default function TireProFlowDemo({ embedded = false }: { embedded?: boolean }) {
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
    if (stage === 'replying') id = window.setTimeout(() => setStage('flow'), 700)
    if (stage === 'flow') id = window.setTimeout(() => setStage('active'), 3500)
    if (stage === 'active') id = window.setTimeout(() => setStage('done'), 1500)
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
  const showReply = ['replying', 'flow', 'active', 'done'].includes(stage)
  const showFlow = ['flow', 'active', 'done'].includes(stage)
  const isActive = ['active', 'done'].includes(stage)

  const heading = (
    <div className={embedded ? 'text-center' : 'mx-auto max-w-2xl text-center'}>
      <h2
        className="text-balance font-semibold leading-tight"
        style={{ fontSize: embedded ? 'clamp(1.3rem, 3vw, 1.75rem)' : 'clamp(1.8rem, 4vw, 2.75rem)' }}
      >
        Le describes un flujo. Se activa solo.
      </h2>
      <p
        className={`mt-3 text-sm leading-relaxed ${embedded ? 'mx-auto max-w-xs' : 'mx-auto mt-4 max-w-xl text-base'}`}
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        {embedded
          ? 'Le dices que necesitas y Ana crea flujos automaticos.'
          : 'Sin codigo. Sin configuraciones. Le dices que necesitas y Ana crea flujos automaticos — WhatsApp, email, calendario, notificaciones.'}
      </p>
    </div>
  )

  const phone = (
    <div className={`relative mx-auto ${embedded ? 'mt-8 w-[300px] sm:w-[340px]' : 'mt-14 w-[340px] sm:w-[360px]'}`}>
      {!embedded && (
        <>
          <div className="pointer-events-none absolute -left-44 top-12 hidden lg:block">
            <SideHint label="Construyendo flujo..." delay={0} />
          </div>
          <div className="pointer-events-none absolute -right-44 top-1/3 hidden lg:block">
            <SideHint
              label={isActive ? 'Flujo activo' : '4 acciones configuradas'}
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
        style={{
          border: '1px solid rgba(255,255,255,0.15)',
          background: '#0A183A',
          boxShadow: '0 30px 70px -25px rgba(10,24,58,0.7)',
        }}
      >
        <div
          className="relative overflow-hidden rounded-[34px] bg-white"
          style={{ border: '2px solid rgba(163,116,255,0.2)' }}
        >
          <div
            className="absolute left-1/2 top-2 z-30 flex h-6 w-28 -translate-x-1/2 items-center justify-center rounded-full"
            style={{ background: '#0A183A' }}
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.3)' }}
            />
          </div>

          <div
            className="relative z-20 flex items-center justify-between px-6 pt-2.5 text-[10px] font-medium"
            style={{ color: 'rgba(10,24,58,0.7)' }}
          >
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(10,24,58,0.6)' }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(10,24,58,0.6)' }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(10,24,58,0.4)' }} />
            </span>
          </div>

          <div
            className="relative z-20 mt-2 flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(10,24,58,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: '#0A183A', color: '#A374FF' }}
              >
                <SparkleIcon className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold" style={{ color: '#0A183A' }}>
                  Ana · TirePro
                </div>
                <div className="text-[9px]" style={{ color: 'rgba(10,24,58,0.5)' }}>
                  {stage === 'idle' && 'Lista'}
                  {stage === 'typing' && 'Escuchandote...'}
                  {stage === 'thinking' && 'Analizando solicitud...'}
                  {stage === 'replying' && 'Creando flujo...'}
                  {stage === 'flow' && 'Configurando acciones...'}
                  {stage === 'active' && 'Flujo activado'}
                  {stage === 'done' && 'Listo'}
                </div>
              </div>
            </div>
            <button
              onClick={replay}
              className="text-[10px] font-medium transition-colors"
              style={{ color: 'rgba(10,24,58,0.4)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#A374FF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(10,24,58,0.4)')}
              aria-label="Reproducir"
            >
              ▶
            </button>
          </div>

          <div
            className="relative z-10 space-y-2.5 px-3 py-3"
            style={{ background: 'rgba(240,245,250,0.4)' }}
          >
            <div className="flex justify-end">
              <div
                className="max-w-[88%] rounded-2xl rounded-tr-sm px-3 py-2 text-[11px] leading-snug text-white shadow-sm"
                style={{ background: '#0A183A' }}
              >
                {typed}
                {stage === 'typing' && (
                  <span className="ml-0.5 inline-block h-2.5 w-0.5 -translate-y-px bg-white align-middle animate-pulse" />
                )}
                {stage === 'idle' && (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }} className="italic">
                    Esperando...
                  </span>
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
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: 'rgba(163,116,255,0.1)', color: '#A374FF' }}
                  >
                    <SparkleIcon className="h-3 w-3" />
                  </div>
                  <div
                    className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5"
                    style={{ border: '1px solid rgba(163,116,255,0.2)' }}
                  >
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
                  <div
                    className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[11px] leading-snug shadow-sm"
                    style={{ border: '1px solid rgba(163,116,255,0.15)', color: '#0A183A' }}
                  >
                    Listo, tu flujo esta configurado:
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showFlow && (
                <motion.div
                  key="flow"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex justify-start"
                >
                  <FlowCard isActive={isActive} replayKey={playKey} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className="relative z-10 flex items-center gap-1.5 bg-white px-3 py-2.5"
            style={{ borderTop: '1px solid rgba(10,24,58,0.05)' }}
          >
            <button
              aria-label="Adjuntar"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full"
              style={{ background: 'rgba(10,24,58,0.05)', color: 'rgba(10,24,58,0.7)' }}
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
            <div
              className="flex flex-1 items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: '#f0f5fa' }}
            >
              <span className="text-[10px]" style={{ color: 'rgba(10,24,58,0.4)' }}>
                Preguntale a Ana...
              </span>
            </div>
            <div
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full"
              style={{ background: 'rgba(163,116,255,0.1)', color: '#A374FF' }}
            >
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
      ref={wrapRef}
      className="relative isolate overflow-hidden py-24 text-white sm:py-32"
      style={{ background: 'linear-gradient(180deg, #0d2244 0%, #0A183A 100%)' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(163,116,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(163,116,255,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute -top-32 right-1/4 h-[440px] w-[440px] rounded-full blur-2xl" style={{ background: 'rgba(37,211,102,0.1)' }} />
        <div className="absolute -bottom-20 left-1/4 h-[380px] w-[380px] rounded-full blur-2xl" style={{ background: 'rgba(163,116,255,0.12)' }} />
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
      style={{
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.8)',
      }}
    >
      <SparkleIcon className="h-3 w-3" style={{ color: '#A374FF' }} />
      {label}
    </motion.div>
  )
}

function FlowCard({
  isActive,
  replayKey,
}: {
  isActive: boolean
  replayKey: number
}) {
  return (
    <div
      className="w-full overflow-hidden rounded-2xl rounded-tl-sm bg-white shadow-lg"
      style={{ border: '1px solid rgba(163,116,255,0.25)', color: '#0A183A' }}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{
          borderBottom: '1px solid rgba(10,24,58,0.05)',
          background: 'linear-gradient(to right, white, #f5f0ff)',
        }}
      >
        <div>
          <div
            className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: '#A374FF' }}
          >
            <SparkleIcon className="h-2.5 w-2.5" />
            Flujo creado por Ana
          </div>
          <div className="mt-0.5 text-[12px] font-semibold" style={{ color: '#0A183A' }}>
            Alerta critica · 4 acciones
          </div>
        </div>
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ background: 'linear-gradient(135deg, #0A183A, #A374FF)' }}
        >
          <BoltIcon className="h-3 w-3" style={{ color: 'white' }} />
        </div>
      </div>

      <div className="px-3 pt-2.5">
        <div
          className="text-[8px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(10,24,58,0.35)' }}
        >
          Cuando
        </div>
        <motion.div
          key={`trigger-${replayKey}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2"
          style={{
            background: 'rgba(163,116,255,0.06)',
            border: '1px solid rgba(163,116,255,0.15)',
          }}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: 'rgba(163,116,255,0.15)', color: '#A374FF' }}
          >
            <BoltIcon className="h-3 w-3" />
          </div>
          <div>
            <div className="text-[9.5px] font-semibold" style={{ color: '#0A183A' }}>
              Llanta en alerta critica
            </div>
            <div className="text-[8px]" style={{ color: 'rgba(10,24,58,0.45)' }}>
              Cambio inmediato requerido
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-center py-1">
        <motion.div
          key={`conn-${replayKey}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 16, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="w-px"
          style={{ background: 'linear-gradient(to bottom, #A374FF, rgba(163,116,255,0.2))' }}
        />
      </div>

      <div className="px-3 pb-2.5">
        <div
          className="text-[8px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(10,24,58,0.35)' }}
        >
          Entonces
        </div>
        <div
          className="mt-1.5 overflow-hidden rounded-lg"
          style={{ border: '1px solid rgba(10,24,58,0.08)' }}
        >
          {FLOW_ACTIONS.map((action, i) => (
            <motion.div
              key={`${action.id}-${replayKey}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.5 + i * 0.45 }}
              className="flex items-center gap-2 px-2.5 py-2"
              style={{
                borderBottom:
                  i < FLOW_ACTIONS.length - 1
                    ? '1px solid rgba(10,24,58,0.05)'
                    : undefined,
              }}
            >
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                style={{ background: action.iconBg, color: action.color }}
              >
                <action.Icon className="h-2.5 w-2.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-semibold" style={{ color: action.color }}>
                  {action.label}
                </div>
                <div className="text-[7.5px] truncate" style={{ color: 'rgba(10,24,58,0.45)' }}>
                  {action.detail}
                </div>
              </div>
              <CheckIcon className="h-3 w-3" style={{ color: action.color }} />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-3 py-2.5" style={{ borderTop: '1px solid rgba(10,24,58,0.05)' }}>
        <AnimatePresence mode="wait">
          {!isActive ? (
            <motion.div
              key="configuring"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: '#F59E0B' }} />
              <span className="text-[9.5px]" style={{ color: 'rgba(10,24,58,0.5)' }}>
                Configurando flujo...
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: '#22c55e' }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#22c55e' }} />
                </span>
                <span className="text-[9.5px] font-semibold" style={{ color: '#22c55e' }}>
                  Flujo activo
                </span>
              </div>
              <span className="text-[8.5px]" style={{ color: 'rgba(10,24,58,0.4)' }}>
                Se ejecuta automaticamente
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
