'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkle, Mic, ArrowUp, Paperclip, Plus, ChevronDown,
  Close, Chart, Wrench, AlertTriangle, PanelLeft,
  SettingsGear, LogOut,
} from '@/components/chat/icons';
import { useSpeechRecognition, type SpeechRecognitionError } from '@/lib/useSpeechRecognition';
import { useSpeechSynthesis } from '@/lib/useSpeechSynthesis';
import type { AnaBlock } from '@/components/chat/AnaBlocks';

const AnaBlocks = dynamic(() => import('@/components/chat/AnaBlocks'), { ssr: false });
const InspectionWizard = dynamic(() => import('@/components/chat/InspectionWizard'), { ssr: false });
const BulkUploadWidget = dynamic(() => import('@/components/chat/BulkUploadWidget'), { ssr: false });
const RotationWizard = dynamic(() => import('@/components/chat/RotationWizard'), { ssr: false });

const ANA_API = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/ana/chat`
  : 'https://api.tirepro.com.co/api/ana/chat';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

/* ═══════ Types ═══════ */

type Suggestion = { label: string; intent: string };
type Msg = { id: string; role: 'user' | 'assistant'; text: string; pending?: boolean; error?: boolean; blocks?: AnaBlock[]; suggestions?: Suggestion[] };
type Conversation = { id: string; title: string; messages: Msg[]; ts: number };

/* ═══════ Conversation storage ═══════ */

const STORAGE_KEY = 'ana_conversations';
function loadConversations(): Conversation[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveConversations(convs: Conversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, 50))); } catch {}
}
function titleFromMessages(msgs: Msg[]): string {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'Nueva conversación';
  return first.text.length > 40 ? first.text.slice(0, 40) + '…' : first.text;
}
function groupByDate(convs: Conversation[]): [string, Conversation[]][] {
  const now = Date.now();
  const day = 86400000;
  const groups: Record<string, Conversation[]> = {};
  for (const c of convs) {
    const age = now - c.ts;
    const label = age < day ? 'Hoy' : age < 2 * day ? 'Ayer' : age < 7 * day ? 'Esta semana' : 'Anteriores';
    (groups[label] ??= []).push(c);
  }
  const order = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores'];
  return order.filter(k => groups[k]).map(k => [k, groups[k]]);
}

/* ═══════ Suggestions ═══════ */

const quickSuggestions = [
  { icon: Wrench, prompt: '¿Cuál es el CPK promedio de mi flota por marca?' },
  { icon: Chart, prompt: '¿Qué llantas necesitan cambio inmediato?' },
  { icon: AlertTriangle, prompt: '¿Cuáles son las mejores combinaciones marca/diseño por CPK?' },
  { icon: Sparkle, prompt: 'Dame un resumen general de mi flota de llantas.' },
];

const greetingFor = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

const VOICE_ERRORS: Record<SpeechRecognitionError, { title: string; hint: string }> = {
  'not-allowed': { title: 'Micrófono bloqueado', hint: 'Chrome: clic en el ícono a la izquierda de la URL → Permisos del sitio → Micrófono → Permitir → recarga la página.' },
  'service-not-allowed': { title: 'Servicio no disponible', hint: 'Usa Chrome o Edge para dictado por voz.' },
  'no-speech': { title: 'No detecté voz', hint: 'Habla más fuerte o acerca el micrófono.' },
  'audio-capture': { title: 'Sin micrófono', hint: 'Revisa que tengas un micrófono conectado.' },
  'network': { title: 'Error de red', hint: 'Revisa tu conexión a internet.' },
  'aborted': { title: 'Cancelado', hint: '' },
  'language-not-supported': { title: 'Idioma no soportado', hint: '' },
  'unknown': { title: 'Error desconocido', hint: 'Intenta de nuevo.' },
};

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ChatFullPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) { router.replace('/login'); return; }

        const user = JSON.parse(stored);
        if (!user.companyId) { router.replace('/login'); return; }

        if (user.role !== 'admin') { router.replace('/dashboard/resumen'); return; }

        const { fetchCompany } = await import('@/shared/fetchCompany');
        const company = await fetchCompany(user.companyId) as { plan?: string };
        const plan = company.plan ?? '';

        if (plan !== 'plus' && plan !== 'pro') {
          router.replace('/dashboard/resumen');
          return;
        }

        setAllowed(true);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  /* ── State ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<'inspection' | 'upload' | 'rotation' | null>(null);

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceStage, setVoiceStage] = useState<'listening' | 'thinking' | 'transcript'>('listening');
  const [voiceFinal, setVoiceFinal] = useState('');
  const [voiceInterim, setVoiceInterim] = useState('');
  const voiceTranscript = (voiceFinal + (voiceInterim ? (voiceFinal ? ' ' : '') + voiceInterim : '')).trim();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>(messages);
  const submittingRef = useRef(false);
  const greetedRef = useRef(false);
  const ttsBlockRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; }, [input]);
  useEffect(() => { const el = scrollRef.current; if (!el) return; requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })); }, [messages]);
  useEffect(() => { document.body.style.overflow = voiceOpen || mobileNavOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [voiceOpen, mobileNavOpen]);

  /* ── Load conversations ── */
  useEffect(() => { setConversations(loadConversations()); }, []);

  /* ── Save conversations on change ── */
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    setConversations(prev => {
      const exists = prev.find(c => c.id === activeId);
      const updated: Conversation = { id: activeId, title: titleFromMessages(messages), messages: messages.filter(m => !m.pending && !m.error), ts: Date.now() };
      const next = exists ? prev.map(c => c.id === activeId ? updated : c) : [updated, ...prev];
      saveConversations(next);
      return next;
    });
  }, [messages, activeId]);

  const greeting = useMemo(() => greetingFor(), []);
  const grouped = useMemo(() => groupByDate(conversations), [conversations]);

  /* ── TTS ── */
  const tts = useSpeechSynthesis({ lang: 'es-CO' });
  const { speak: ttsSpeak, stop: ttsStop } = tts;

  /* ── Speech ── */
  const speech = useSpeechRecognition(
    useCallback((text: string, isFinal: boolean) => {
      if (submittingRef.current || ttsBlockRef.current) return;
      if (isFinal) { setVoiceFinal(p => (p ? p + ' ' : '') + text); setVoiceInterim(''); setVoiceStage('transcript'); }
      else { setVoiceInterim(text); if (text) setVoiceStage('transcript'); }
    }, []),
  );
  const { start: speechStart, stop: speechStop, supported: speechSupported, error: speechError, clearError: speechClearError } = speech;

  useEffect(() => { ttsBlockRef.current = tts.speaking; }, [tts.speaking]);

  const resetVoice = () => { setVoiceFinal(''); setVoiceInterim(''); };

  /* ── Messaging ── */
  /* ── Actions (zero AI tokens) ── */
  const startAction = (action: 'inspection' | 'upload' | 'rotation') => {
    if (!activeId) setActiveId(Math.random().toString(36).slice(2));
    const labels: Record<string, string> = {
      inspection: 'Registrar inspección',
      upload: 'Subir datos de llantas',
      rotation: 'Mover / rotar llantas',
    };
    const intros: Record<string, string> = {
      inspection: '¡Vamos a registrar una inspección! Ingresa la placa del vehículo y selecciona la llanta en el diagrama. Luego registra las profundidades (interior, centro, exterior). Opcionalmente puedes agregar presión, foto y observaciones.',
      upload: '¡Perfecto! Para la carga masiva necesitas un archivo Excel (.xlsx) o CSV con estos datos mínimos por llanta:\n\n• Placa del vehículo\n• Marca\n• Diseño / modelo\n• Dimensión (ej: 295/80R22.5)\n• Posición en el vehículo\n• Profundidad actual (mm)\n\nNo te preocupes por el formato exacto — el sistema reconoce columnas como "fabricante", "prof_interna", "medida_llanta" automáticamente y corrige marcas y diseños al vuelo.',
      rotation: '¡Listo! Selecciona el vehículo y la llanta que quieres mover. Puedes rotarla a otra posición, enviarla a inventario o darle fin de vida.',
    };
    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(36).slice(2), role: 'user', text: labels[action] },
      { id: Math.random().toString(36).slice(2), role: 'assistant', text: intros[action] },
    ]);
    setActiveAction(action);
  };
  const finishAction = (summary: string) => {
    if (summary) {
      setMessages(prev => [...prev, { id: Math.random().toString(36).slice(2), role: 'assistant', text: summary }]);
    } else {
      setMessages(prev => prev.length > 0 && prev[prev.length - 1].role === 'user' ? prev.slice(0, -1) : prev);
    }
    setActiveAction(null);
  };

  /* ── Intent detection (intercepts before AI call) ── */
  const detectActionIntent = (text: string): 'inspection' | 'upload' | 'rotation' | null => {
    const lo = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/carga\s*masiva|subir\s*(datos|archivo|excel|llantas)|cargar\s*(archivo|datos|excel|llantas)|importar|bulk|upload/.test(lo)) return 'upload';
    if (/hacer.*inspeccion|registrar.*inspeccion|nueva.*inspeccion|inspeccionar|inspeccion\s*en\s*vivo|medir\s*(profundidad|llanta)/.test(lo)) return 'inspection';
    if (/rotar|mover.*posicion|cambiar.*posicion|intercambiar.*llanta|swap|posicion.*\d+.*posicion.*\d+|desmontar|enviar.*inventario|fin\s*de\s*vida|retirar.*llanta/.test(lo)) return 'rotation';
    return null;
  };

  const sendMessage = async (text: string): Promise<{ text: string; blocks?: AnaBlock[]; suggestions?: Suggestion[] } | null> => {
    const trimmed = text.trim(); if (!trimmed) return null;

    const intent = detectActionIntent(trimmed);
    if (intent) { setInput(''); startAction(intent); return null; }

    if (!activeId) setActiveId(Math.random().toString(36).slice(2));
    const id = Math.random().toString(36).slice(2); const pendingId = id + '-r';
    setMessages(prev => [...prev, { id, role: 'user', text: trimmed }, { id: pendingId, role: 'assistant', text: '', pending: true }]);
    setInput('');
    const history = messagesRef.current.filter(m => !m.pending && !m.error && m.text).slice(-6).map(m => ({ role: m.role, text: m.text }));
    let reply: { text: string; blocks?: AnaBlock[]; suggestions?: Suggestion[]; error?: boolean };
    try {
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch(ANA_API, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ message: trimmed, history }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      reply = { text: data.text || 'No pude procesar tu solicitud.', blocks: Array.isArray(data.blocks) && data.blocks.length ? data.blocks : undefined, suggestions: Array.isArray(data.suggestions) && data.suggestions.length ? data.suggestions : undefined };
    } catch { reply = { text: 'Hubo un error conectando con Ana.', error: true }; }
    setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, pending: false, text: reply.text, blocks: reply.blocks as AnaBlock[] | undefined, suggestions: reply.suggestions, error: reply.error } : m));
    return reply;
  };

  const retryLast = () => {
    const errorIdx = messages.findLastIndex(m => m.error);
    if (errorIdx < 1) return;
    const userMsg = messages[errorIdx - 1];
    if (userMsg?.role !== 'user') return;
    const text = userMsg.text;
    const errorId = messages[errorIdx].id;
    const userId = userMsg.id;
    setMessages(prev => prev.filter(m => m.id !== errorId && m.id !== userId));
    sendMessage(text);
  };

  /* ── Voice flow ── */
  const submitVoiceTurn = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? voiceTranscript).trim(); if (!text) return;
    submittingRef.current = true; speechStop(); setVoiceFinal(''); setVoiceInterim(''); setVoiceStage('thinking');
    const reply = await sendMessage(text);
    if (!reply) { submittingRef.current = false; setVoiceStage('listening'); return; }
    setVoiceStage('listening'); ttsSpeak(reply.text);
  }, [voiceTranscript, speechStop, ttsSpeak]);

  useEffect(() => {
    if (!voiceOpen || tts.speaking || (!voiceFinal && !voiceInterim)) return;
    const t = window.setTimeout(() => submitVoiceTurn(), 2200);
    return () => window.clearTimeout(t);
  }, [voiceOpen, voiceFinal, voiceInterim, tts.speaking, submitVoiceTurn]);

  const prevSpeaking = useRef(false);
  useEffect(() => {
    const was = prevSpeaking.current; prevSpeaking.current = tts.speaking;
    if (!voiceOpen || !was || tts.speaking) return;
    submittingRef.current = false; if (speechSupported) speechStart(); setVoiceStage('listening');
  }, [tts.speaking, voiceOpen, speechSupported, speechStart]);

  useEffect(() => {
    if (!voiceOpen || greetedRef.current || tts.speaking || voiceFinal || voiceInterim || voiceStage === 'thinking') return;
    const t = window.setTimeout(() => { if (!greetedRef.current) { greetedRef.current = true; ttsSpeak('Hola, soy Ana. Cuéntame qué necesitas.'); } }, 5000);
    return () => window.clearTimeout(t);
  }, [voiceOpen, voiceFinal, voiceInterim, voiceStage, tts.speaking, ttsSpeak]);

  const startVoice = () => {
    setVoiceStage('listening'); resetVoice(); greetedRef.current = false; submittingRef.current = false; speechClearError();
    setVoiceOpen(true);
    // MUST call synchronously from click handler — any await/setTimeout
    // breaks Chrome's user-gesture requirement for SpeechRecognition.
    if (speechSupported) speechStart();
  };
  const closeVoice = () => { speechStop(); ttsStop(); submittingRef.current = false; setVoiceOpen(false); setVoiceStage('listening'); resetVoice(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); voiceOpen ? closeVoice() : startVoice(); }
      if (e.key === 'Escape') { if (voiceOpen) { e.preventDefault(); closeVoice(); } if (mobileNavOpen) setMobileNavOpen(false); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [voiceOpen, mobileNavOpen]);

  const handleSubmit = (e?: React.FormEvent) => { e?.preventDefault(); sendMessage(input); };
  const newChat = () => { setMessages([]); setActiveId(null); setInput(''); setActiveAction(null); textareaRef.current?.focus(); setMobileNavOpen(false); };
  const openChat = (c: Conversation) => { setActiveId(c.id); setMessages(c.messages); setActiveAction(null); setMobileNavOpen(false); };
  const deleteChat = (id: string) => {
    setConversations(prev => { const next = prev.filter(c => c.id !== id); saveConversations(next); return next; });
    if (activeId === id) { setMessages([]); setActiveId(null); }
  };
  const isEmpty = messages.length === 0;
  const errorCopy = speechError ? VOICE_ERRORS[speechError] : null;

  /* ═══════ Render ═══════ */

  if (!allowed) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1E76B6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-white">
      {/* ══════ Sidebar — desktop ══════ */}
      <aside className={cn('relative z-30 hidden h-full shrink-0 flex-col border-r border-[#0A183A]/8 bg-white transition-all duration-300 md:flex', sidebarOpen ? 'w-[260px]' : 'w-[64px]')}>
        <SidebarContent collapsed={!sidebarOpen} grouped={grouped} activeId={activeId} onToggle={() => setSidebarOpen(v => !v)} onNewChat={newChat} onOpenChat={openChat} onDeleteChat={deleteChat} onGoBack={() => router.push('/dashboard/resumen')} />
      </aside>

      {/* ══════ Sidebar — mobile ══════ */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div key="mob" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-[#0A183A]/30" onClick={() => setMobileNavOpen(false)} />
            <motion.aside initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -16, opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-[#0A183A]/8 bg-white">
              <SidebarContent collapsed={false} grouped={grouped} activeId={activeId} onToggle={() => setMobileNavOpen(false)} onNewChat={newChat} onOpenChat={openChat} onDeleteChat={deleteChat} onGoBack={() => router.push('/dashboard/resumen')} isMobile />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ Main ══════ */}
      <main className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#0A183A]/6 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMobileNavOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#0A183A]/60 hover:bg-[#F8FAFC] md:hidden"><PanelLeft className="h-4 w-4" /></button>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#0A183A]">
              <Sparkle className="h-3.5 w-3.5 text-[#A374FF]" /> Ana <ChevronDown className="h-3 w-3 text-[#0A183A]/35" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={newChat} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#0A183A]/65 hover:bg-[#F8FAFC] hover:text-[#0A183A]"><Plus className="h-3.5 w-3.5" /> Nueva</button>
            <button type="button" onClick={() => router.push('/dashboard/resumen')} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#0A183A]/65 hover:bg-[#F8FAFC] hover:text-[#0A183A]')}><Chart className="h-3.5 w-3.5" /> Dashboard</button>
          </div>
        </header>

        {/* Content */}
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
          {isEmpty && !activeAction ? <WelcomeView greeting={greeting} onPick={p => sendMessage(p)} onAction={startAction} /> : (
            <>
              <ChatMessages messages={messages} onSuggestion={i => sendMessage(i)} onRetry={retryLast} />
              {activeAction === 'inspection' && (
                <div className="mx-auto max-w-2xl px-4 pb-4 sm:px-6"><InspectionWizard onDone={finishAction} /></div>
              )}
              {activeAction === 'upload' && (
                <div className="mx-auto max-w-2xl px-4 pb-4 sm:px-6"><BulkUploadWidget onDone={finishAction} /></div>
              )}
              {activeAction === 'rotation' && (
                <div className="mx-auto max-w-2xl px-4 pb-4 sm:px-6"><RotationWizard onDone={finishAction} /></div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
          {/* Action buttons */}
          {!activeAction && (
            <div className="mx-auto mb-2 flex max-w-2xl gap-2">
              <button type="button" onClick={() => startAction('inspection')} className="inline-flex items-center gap-1.5 rounded-full border border-[#0A183A]/10 bg-white px-3 py-1.5 text-[11px] font-medium text-[#0A183A]/65 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">
                <Wrench className="h-3 w-3" /> Inspección
              </button>
              <button type="button" onClick={() => startAction('upload')} className="inline-flex items-center gap-1.5 rounded-full border border-[#0A183A]/10 bg-white px-3 py-1.5 text-[11px] font-medium text-[#0A183A]/65 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">
                <Paperclip className="h-3 w-3" /> Subir datos
              </button>
              <button type="button" onClick={() => startAction('rotation')} className="inline-flex items-center gap-1.5 rounded-full border border-[#0A183A]/10 bg-white px-3 py-1.5 text-[11px] font-medium text-[#0A183A]/65 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">
                <Chart className="h-3 w-3" /> Mover llanta
              </button>
            </div>
          )}
          <div className="ai-bar-border mx-auto max-w-2xl overflow-hidden rounded-3xl">
            <form onSubmit={handleSubmit} className="flex w-full items-end gap-1 rounded-3xl bg-white/85 px-2 py-1.5 backdrop-blur-sm">
              <button type="button" aria-label="Adjuntar" onClick={() => startAction('upload')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0A183A]/45 hover:bg-[#F8FAFC]"><Paperclip className="h-4 w-4" /></button>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} rows={1} placeholder="Pregúntale algo a Ana" className="flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[14.5px] leading-relaxed text-[#0A183A] placeholder:text-[#0A183A]/35 focus:outline-none" />
              {speechSupported && <button type="button" onClick={startVoice} title="⌘⇧M" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0A183A]/55 hover:bg-[#F8FAFC] transition-colors"><Mic className="relative h-4 w-4" /></button>}
              <button type="submit" disabled={!input.trim()} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${input.trim() ? 'bg-gradient-to-br from-[#0A183A] to-[#A374FF] text-white' : 'bg-[#F8FAFC] text-[#0A183A]/30'}`}><ArrowUp className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      </main>

      {/* ══════ Voice overlay ══════ */}
      <AnimatePresence>
        {voiceOpen && (
          <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[60] flex flex-col bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-[#0A183A]/8 px-5 py-3">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0A183A]/55">
                {(speech.listening || tts.speaking) && <span className="relative inline-flex h-1.5 w-1.5"><span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${tts.speaking ? 'bg-[#A374FF]' : 'bg-red-500'}`} /><span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tts.speaking ? 'bg-[#A374FF]' : 'bg-red-500'}`} /></span>}
                {tts.speaking ? 'Ana habla · es-CO' : voiceStage === 'thinking' ? 'Procesando' : speech.listening ? 'Escuchando · es-CO' : 'Listo'}
              </span>
              <button type="button" onClick={closeVoice} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-[#0A183A]/55 hover:bg-[#F8FAFC]"><Close className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Cerrar voz</span></button>
            </div>
            <div className="relative flex-1 overflow-y-auto">
              {messages.length === 0 && !voiceTranscript ? (
                <div className="flex h-full items-center justify-center px-6 py-12 text-center">
                  <div>
                    <div className="relative mx-auto h-36 w-36 sm:h-44 sm:w-44">
                      <div className="absolute inset-0 rounded-full bg-[#A374FF]/10 blur-2xl" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#0A183A] to-[#A374FF]" />
                      <div className="absolute inset-0 flex items-center justify-center">{voiceStage === 'thinking' ? <ThinkingDots /> : <VoiceWave />}</div>
                    </div>
                    <p className="mt-7 text-[22px] font-medium text-[#0A183A] sm:text-[26px]">Habla con Ana</p>
                    <p className="mt-2 text-[13px] text-[#0A183A]/55">Probá decir: "muéstrame las llantas críticas" o "cuál es el CPK".</p>
                  </div>
                </div>
              ) : (
                <ChatMessages messages={messages} onSuggestion={i => sendMessage(i)} liveTranscript={voiceTranscript || undefined} compact />
              )}
            </div>
            {errorCopy && (
              <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-3 sm:px-6">
                <div className="mx-auto flex max-w-2xl items-center gap-3">
                  <div className="min-w-0 flex-1"><div className="text-[13px] font-medium text-red-800">{errorCopy.title}</div>{errorCopy.hint && <div className="text-[12px] text-red-700/80">{errorCopy.hint}</div>}</div>
                  {speechError === 'not-allowed' || speechError === 'service-not-allowed' ? (
                    <button type="button" onClick={closeVoice} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-700 px-3 text-[12px] font-medium text-white hover:bg-red-800 shrink-0"><Close className="h-3.5 w-3.5" /> Cerrar</button>
                  ) : (
                    <button type="button" onClick={() => { speechStop(); ttsStop(); resetVoice(); speechClearError(); if (speechSupported) speechStart(); setVoiceStage('listening'); }} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-700 px-3 text-[12px] font-medium text-white hover:bg-red-800 shrink-0"><Mic className="h-3.5 w-3.5" /> Reintentar</button>
                  )}
                </div>
              </div>
            )}
            <div className="shrink-0 border-t border-[#0A183A]/8 bg-gradient-to-t from-[#F8FAFC]/40 to-white px-4 py-3 sm:px-6 sm:py-4">
              <div className="mx-auto flex max-w-2xl items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                  <div className="absolute inset-0 rounded-full bg-[#A374FF]/15 blur-xl" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#0A183A] to-[#A374FF]" />
                  <div className="absolute inset-0 flex items-center justify-center">{voiceStage === 'thinking' ? <ThinkingDots /> : tts.speaking ? <VoiceWave /> : <Mic className="h-5 w-5 text-white" />}</div>
                </div>
                <div className="min-w-0 flex-1">{voiceTranscript ? <p className="truncate text-[14px] text-[#0A183A]">{voiceTranscript}</p> : <p className="text-[13px] text-[#0A183A]/45">{tts.speaking ? 'Ana está hablando...' : 'Escuchando...'}</p>}</div>
                {voiceTranscript && <button type="button" onClick={() => { if (voiceTranscript.trim()) submitVoiceTurn(); }} className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-[#0A183A] to-[#A374FF] px-4 text-[13px] font-medium text-white shadow-sm hover:shadow-md"><ArrowUp className="h-4 w-4" /> Enviar</button>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ Sidebar content ═══════════════ */

function SidebarContent({ collapsed, grouped, activeId, onToggle, onNewChat, onOpenChat, onDeleteChat, onGoBack, isMobile }: {
  collapsed: boolean; grouped: [string, Conversation[]][]; activeId: string | null;
  onToggle: () => void; onNewChat: () => void; onOpenChat: (c: Conversation) => void;
  onDeleteChat: (id: string) => void; onGoBack: () => void; isMobile?: boolean;
}) {
  const [userData, setUserData] = useState<{ name: string; role: string; companyId: string } | null>(null);
  const [companyData, setCompanyData] = useState<{ name: string; profileImage?: string; plan: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setUserData({ name: parsed.name ?? '', role: parsed.role ?? '', companyId: parsed.companyId ?? '' });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!userData?.companyId) return;
    import('@/shared/fetchCompany')
      .then(({ fetchCompany }) => fetchCompany(userData.companyId))
      .then((c) => setCompanyData(c as { name: string; profileImage?: string; plan: string }))
      .catch(() => {});
  }, [userData?.companyId]);

  const handleLogout = () => { localStorage.clear(); window.location.href = '/login'; };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className={cn('flex items-center gap-2', collapsed && 'mx-auto')}>
          {collapsed ? (
            <Image src="/logo_tire.png" alt="TirePro" width={28} height={28} className="h-7 w-7" />
          ) : (
            <Image src="/logo_full.png" alt="TirePro" width={110} height={28} className="h-7 w-auto" />
          )}
        </div>
        {!collapsed && <button type="button" onClick={onToggle} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#0A183A]/40 hover:bg-[#F8FAFC]">{isMobile ? <Close className="h-3.5 w-3.5" /> : <PanelLeft className="h-4 w-4" />}</button>}
      </div>

      {/* Nav buttons */}
      <div className="px-3 pb-1">
        <button type="button" onClick={onNewChat} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#0A183A]/80 hover:bg-[#F8FAFC]', collapsed && 'justify-center px-0')}>
          <Plus className="h-4 w-4 text-[#0A183A]/55" /> {!collapsed && <span>Nueva conversación</span>}
        </button>
      </div>

      <div className="px-3">
        <a href="/chat/agentes" className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#0A183A]/80 hover:bg-[#F8FAFC]', collapsed && 'justify-center px-0')}>
          <Sparkle className="h-4 w-4 text-[#A374FF]" /> {!collapsed && <span>Agentes</span>}
        </a>
      </div>

      <div className="px-3">
        <button type="button" onClick={onGoBack} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#0A183A]/80 hover:bg-[#F8FAFC]', collapsed && 'justify-center px-0')}>
          <Chart className="h-4 w-4 text-[#0A183A]/55" /> {!collapsed && <span>Dashboard</span>}
        </button>
      </div>

      {/* Chat history */}
      <div className="mt-3 flex-1 overflow-y-auto px-3">
        {!collapsed && grouped.map(([label, items]) => (
          <div key={label} className="mb-4">
            <div className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[#0A183A]/35">{label}</div>
            <ul>
              {items.map(c => (
                <li key={c.id} className="group flex items-center">
                  <button type="button" onClick={() => onOpenChat(c)} className={cn('flex-1 min-w-0 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors', activeId === c.id ? 'bg-[#F8FAFC] text-[#0A183A]' : 'text-[#0A183A]/70 hover:bg-[#F8FAFC]')}>
                    <span className="block truncate">{c.title}</span>
                  </button>
                  <button type="button" onClick={() => onDeleteChat(c.id)} className="hidden group-hover:flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#0A183A]/30 hover:text-red-500 hover:bg-red-50" aria-label="Eliminar">
                    <Close className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom user section */}
      {!collapsed ? (
        <div className="shrink-0 border-t border-[#0A183A]/6 px-3 pb-3 pt-2">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[#F8FAFC] transition-colors">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={{ background: 'linear-gradient(135deg, #0A183A, #173D68)' }}
            >
              {companyData?.profileImage ? (
                <img src={companyData.profileImage} alt={companyData.name} className="h-full w-full object-contain p-0.5" />
              ) : (
                <span className="text-xs font-black text-white">
                  {companyData?.name?.charAt(0).toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-[#0A183A]">{userData?.name ?? ''}</p>
              {companyData && <p className="truncate text-[11px] leading-tight text-[#0A183A]/45">{companyData.name}</p>}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <a href="/settings" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-[#0A183A]/50 hover:bg-[#F8FAFC] hover:text-[#0A183A]/70 transition-colors">
              <SettingsGear className="h-3.5 w-3.5" /> Ajustes
            </a>
            <button type="button" onClick={handleLogout} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-50/60 hover:text-red-500 transition-colors">
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-[#0A183A]/6 px-3 py-2 space-y-1">
          <div className="mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg, #0A183A, #173D68)' }}>
            {companyData?.profileImage ? (
              <img src={companyData.profileImage} alt={companyData?.name ?? ''} className="h-full w-full object-contain p-0.5" />
            ) : (
              <span className="text-xs font-black text-white">{companyData?.name?.charAt(0).toUpperCase() ?? '?'}</span>
            )}
          </div>
          <button type="button" onClick={onToggle} className="flex h-8 w-full items-center justify-center rounded-md text-[#0A183A]/40 hover:bg-[#F8FAFC]"><PanelLeft className="h-4 w-4 rotate-180" /></button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Welcome ═══════════════ */

function WelcomeView({ greeting, onPick, onAction }: { greeting: string; onPick: (p: string) => void; onAction: (a: 'inspection' | 'upload') => void }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-5 py-12 sm:px-8">
      <h1 className="animate-[fadeIn_0.4s_ease-out] text-[36px] font-medium tracking-tight text-[#0A183A] sm:text-[44px]">{greeting}</h1>

      {/* Action buttons */}
      <div className="mt-8 flex gap-3 animate-[fadeIn_0.45s_ease-out_0.05s_both]">
        <button type="button" onClick={() => onAction('inspection')} className="group flex items-center gap-2.5 rounded-2xl border border-[#A374FF]/20 bg-[#A374FF]/[0.04] px-5 py-3 transition-colors hover:border-[#A374FF]/40 hover:bg-[#A374FF]/[0.08]">
          <Wrench className="h-4 w-4 text-[#A374FF]" />
          <span className="text-[13.5px] font-medium text-[#A374FF]">Inspección</span>
        </button>
        <button type="button" onClick={() => onAction('upload')} className="group flex items-center gap-2.5 rounded-2xl border border-[#0A183A]/10 bg-white px-5 py-3 transition-colors hover:border-[#0A183A]/20 hover:bg-[#F8FAFC]/60">
          <Paperclip className="h-4 w-4 text-[#0A183A]/55" />
          <span className="text-[13.5px] font-medium text-[#0A183A]/70">Subir datos</span>
        </button>
      </div>

      <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 animate-[fadeIn_0.5s_ease-out_0.1s_both]">
        {quickSuggestions.map(s => { const Icon = s.icon; return (
          <button key={s.prompt} type="button" onClick={() => onPick(s.prompt)} className="group flex items-start gap-3 rounded-2xl border border-[#0A183A]/8 bg-white p-4 text-left transition-colors hover:border-[#0A183A]/20 hover:bg-[#F8FAFC]/60">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0A183A]/55 group-hover:text-[#0A183A]" />
            <span className="text-[13.5px] leading-snug text-[#0A183A]/75 group-hover:text-[#0A183A]">{s.prompt}</span>
          </button>
        ); })}
      </div>
    </div>
  );
}

/* ═══════════════ Chat messages ═══════════════ */

function ChatMessages({ messages, onSuggestion, onRetry, liveTranscript, compact = false }: { messages: Msg[]; onSuggestion?: (i: string) => void; onRetry?: () => void; liveTranscript?: string; compact?: boolean }) {
  return (
    <div className={`mx-auto w-full max-w-2xl ${compact ? 'px-4 py-4 sm:px-6 sm:py-5' : 'px-4 py-8 sm:px-6 sm:py-10'}`}>
      <ul className="flex flex-col gap-5">
        {messages.map(m => m.role === 'user' ? (
          <li key={m.id} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#0A183A] to-[#173D68] px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-sm">{m.text}</div>
          </li>
        ) : (
          <li key={m.id} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${m.error ? 'bg-red-500' : 'bg-gradient-to-br from-[#0A183A] to-[#A374FF]'}`}>{m.error ? <AlertTriangle className="h-3 w-3" /> : <Sparkle className="ai-sparkle h-3 w-3" />}</span>
            <div className={`min-w-0 flex-1 pt-0.5 ${!m.pending ? (m.error ? 'rounded-2xl rounded-tl-md border border-red-200 bg-red-50/60 px-4 py-3' : 'ai-border rounded-2xl rounded-tl-md bg-white/80 px-4 py-3') : ''}`}>
              {m.pending ? (
                <div className="ai-border flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-white/80 px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" />
                  <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: '0.15s' }} />
                  <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: '0.3s' }} />
                  <span className="ai-shimmer-text ml-2 text-[12px] font-medium">Ana piensa…</span>
                </div>
              ) : (
                <>
                  <div className={`text-[14.5px] leading-relaxed ${m.error ? 'text-red-800' : 'text-[#0A183A]/85'}`}>{m.text.split('\n').map((line, i) => <p key={i} className="m-0 mb-1.5 last:mb-0">{line}</p>)}</div>
                  {m.error && onRetry && (
                    <button type="button" onClick={onRetry} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-red-700 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-red-800 transition-colors">
                      <ArrowUp className="h-3 w-3" /> Reintentar
                    </button>
                  )}
                  {m.blocks && m.blocks.length > 0 && <div className="mt-3"><AnaBlocks blocks={m.blocks} /></div>}
                  {m.suggestions && m.suggestions.length > 0 && onSuggestion && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.suggestions.map(s => <button key={s.label} type="button" onClick={() => onSuggestion(s.intent)} className="inline-flex items-center gap-1.5 rounded-full border border-[#A374FF]/25 bg-[#A374FF]/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#A374FF] hover:bg-[#A374FF]/10"><Chart className="h-3 w-3" />{s.label}</button>)}
                    </div>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
        {liveTranscript && (
          <li className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl border border-dashed border-[#A374FF]/40 bg-[#A374FF]/[0.04] px-4 py-2.5 text-[14px] italic leading-relaxed text-[#0A183A]/75">
              {liveTranscript}<span className="ml-0.5 inline-block animate-pulse-subtle text-[#A374FF]">▍</span>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}

function ThinkingDots() { return <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-white" /><span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-white" style={{ animationDelay: '0.2s' }} /><span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-white" style={{ animationDelay: '0.4s' }} /></div>; }
function VoiceWave() { return <div className="flex items-center gap-[3px]">{Array.from({ length: 14 }).map((_, i) => <span key={i} className="voice-bar inline-block w-[2.5px] rounded-full bg-white" style={{ height: 16 + (i % 5) * 3, animationDelay: `${i * 0.08}s` }} />)}</div>; }
