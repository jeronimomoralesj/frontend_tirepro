'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Sparkle, Mic, ArrowUp, Paperclip, Close,
  Chart, Wrench, AlertTriangle,
} from '@/components/chat/icons';
import { useSpeechRecognition, type SpeechRecognitionError } from '@/lib/useSpeechRecognition';
import { useSpeechSynthesis } from '@/lib/useSpeechSynthesis';
import type { AnaBlock } from '@/components/chat/AnaBlocks';
import { useChatLayout } from '@/components/chat/ChatShell';

const AnaBlocks = dynamic(() => import('@/components/chat/AnaBlocks'), { ssr: false });
const InspectionWizard = dynamic(() => import('@/components/chat/InspectionWizard'), { ssr: false });
const BulkUploadWidget = dynamic(() => import('@/components/chat/BulkUploadWidget'), { ssr: false });
const RotationWizard = dynamic(() => import('@/components/chat/RotationWizard'), { ssr: false });

const ANA_API = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/ana/chat`
  : 'https://api.tirepro.com.co/api/ana/chat';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

/* ═══════ Types ═══════ */

type Suggestion = { label: string; intent: string };
type Msg = { id: string; role: 'user' | 'assistant'; text: string; pending?: boolean; error?: boolean; blocks?: AnaBlock[]; suggestions?: Suggestion[] };

/* ═══════ Helpers ═══════ */

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

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
   PAGE — /chat/[id]
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const { refreshConversations, pendingMessage, setPendingMessage } = useChatLayout();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<'inspection' | 'upload' | 'rotation' | null>(null);
  // True once the company/user crosses ~80% of an AI quota (backend flag).
  const [usageWarning, setUsageWarning] = useState(false);

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
  const convIdRef = useRef(conversationId);
  const pendingHandled = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; }, [input]);
  useEffect(() => { const el = scrollRef.current; if (!el) return; requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })); }, [messages]);
  useEffect(() => { document.body.style.overflow = voiceOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [voiceOpen]);

  // Load conversation from DB — or bootstrap from pending message
  useEffect(() => {
    convIdRef.current = conversationId;

    if (pendingMessage && !pendingHandled.current) {
      pendingHandled.current = true;
      const text = pendingMessage;
      setPendingMessage(null);
      setLoading(false);

      // If the first message matches an action intent (upload / inspection / rotation),
      // skip the Ana round-trip and open the action widget directly with the local
      // detailed intro — otherwise the model returns a generic "here's the form" reply
      // with no instructions and the widget never appears.
      const intent = detectActionIntent(text);
      if (intent) {
        startAction(intent);
        return;
      }

      // Fire the first message immediately — sendMessage is defined below
      // so we inline the logic here to avoid stale closures
      const id = Math.random().toString(36).slice(2);
      const pendingId = id + '-r';
      setMessages([
        { id, role: 'user', text },
        { id: pendingId, role: 'assistant', text: '', pending: true },
      ]);
      (async () => {
        let reply: { text: string; blocks?: AnaBlock[]; suggestions?: Suggestion[]; error?: boolean };
        try {
          const res = await fetch(ANA_API, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ message: text, history: [], conversationId }),
          });
          if (res.status === 429) {
            const qb = await res.json().catch(() => ({} as { message?: string }));
            reply = { text: qb?.message || 'Has alcanzado el límite de consultas de IA de tu plan.', error: true };
            setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, pending: false, text: reply.text, error: true } : m));
            return;
          }
          if (!res.ok) throw new Error();
          const data = await res.json();
          setUsageWarning(!!data.usageWarning);
          reply = {
            text: data.text || 'No pude procesar tu solicitud.',
            blocks: Array.isArray(data.blocks) && data.blocks.length ? data.blocks : undefined,
            suggestions: Array.isArray(data.suggestions) && data.suggestions.length ? data.suggestions : undefined,
          };
        } catch { reply = { text: 'Hubo un error conectando con Ana.', error: true }; }
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, pending: false, text: reply.text, blocks: reply.blocks as AnaBlock[] | undefined, suggestions: reply.suggestions, error: reply.error } : m));
        refreshConversations();
      })();
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/ana/conversations/${conversationId}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setMessages(
            (data.messages ?? []).map((m: any) => ({
              id: m.id,
              role: m.role,
              text: m.text,
              blocks: m.blocks ?? undefined,
              suggestions: m.suggestions ?? undefined,
            }))
          );
        }
      } catch {}
      setLoading(false);
    })();
  }, [conversationId]);

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

  /* ── Actions (zero AI tokens) ── */
  const startAction = (action: 'inspection' | 'upload' | 'rotation') => {
    const labels: Record<string, string> = { inspection: 'Registrar inspección', upload: 'Subir datos de llantas', rotation: 'Mover / rotar llantas' };
    const intros: Record<string, string> = {
      inspection: '¡Vamos a registrar una inspección! Ingresa la placa del vehículo y selecciona la llanta en el diagrama. Luego registra las profundidades (interior, centro, exterior). Opcionalmente puedes agregar presión, foto y observaciones.',
      upload: '¡Perfecto! Vamos con la carga masiva. Necesitas un archivo Excel (.xlsx, .xls) o CSV con una llanta por fila.\n\nDatos mínimos por llanta:\n• Placa del vehículo (ej: ABC123)\n• Marca (ej: Continental, Michelin)\n• Diseño / modelo (ej: HDR2)\n• Dimensión (ej: 295/80R22.5)\n• Posición en el vehículo (1, 2, 3…)\n• Profundidad actual en mm (interior, centro, exterior)\n\nDatos opcionales pero recomendados:\n• Eje (direccion, traccion, libre, remolque)\n• Vida (nueva, reencauche1/2/3)\n• Costo, kilómetros de la llanta y del vehículo\n• Fecha de instalación, presión PSI\n\nTip: si no sabes el formato exacto, usa el botón "Descargar plantilla Excel" abajo — trae todas las columnas correctas y un ejemplo de fila. El sistema también reconoce variaciones como "fabricante", "prof_interna" o "medida_llanta" y corrige marcas y diseños automáticamente. En la vista previa puedes hacer clic en cualquier celda para editarla antes de subir.',
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

  /* ── Intent detection ── */
  const detectActionIntent = (text: string): 'inspection' | 'upload' | 'rotation' | null => {
    const lo = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/carga\s*masiva|subir\s*(datos|archivo|excel|llantas)|cargar\s*(archivo|datos|excel|llantas)|importar|bulk|upload/.test(lo)) return 'upload';
    if (/hacer.*inspeccion|registrar.*inspeccion|nueva.*inspeccion|inspeccionar|inspeccion\s*en\s*vivo|medir\s*(profundidad|llanta)/.test(lo)) return 'inspection';
    if (/rotar|mover.*posicion|cambiar.*posicion|intercambiar.*llanta|swap|posicion.*\d+.*posicion.*\d+|desmontar|enviar.*inventario|fin\s*de\s*vida|retirar.*llanta/.test(lo)) return 'rotation';
    return null;
  };

  /* ── Send message ── */
  const sendMessage = async (text: string): Promise<{ text: string; blocks?: AnaBlock[]; suggestions?: Suggestion[] } | null> => {
    const trimmed = text.trim(); if (!trimmed) return null;

    const intent = detectActionIntent(trimmed);
    if (intent) { setInput(''); startAction(intent); return null; }

    const id = Math.random().toString(36).slice(2); const pendingId = id + '-r';
    setMessages(prev => [...prev, { id, role: 'user', text: trimmed }, { id: pendingId, role: 'assistant', text: '', pending: true }]);
    setInput('');

    const history = messagesRef.current.filter(m => !m.pending && !m.error && m.text).slice(-6).map(m => ({ role: m.role, text: m.text }));
    let reply: { text: string; blocks?: AnaBlock[]; suggestions?: Suggestion[]; error?: boolean };
    try {
      const res = await fetch(ANA_API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: trimmed, history, conversationId: convIdRef.current }),
      });
      // AI quota reached (company monthly or user daily) — show the backend's
      // friendly message instead of a generic connection error.
      if (res.status === 429) {
        const body = await res.json().catch(() => ({} as { message?: string }));
        reply = {
          text: body?.message || 'Has alcanzado el límite de consultas de IA de tu plan. Intenta más tarde o contacta a soporte.',
          error: true,
        };
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, pending: false, text: reply.text, error: true } : m));
        return reply;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsageWarning(!!data.usageWarning);
      reply = {
        text: data.text || 'No pude procesar tu solicitud.',
        blocks: Array.isArray(data.blocks) && data.blocks.length ? data.blocks : undefined,
        suggestions: Array.isArray(data.suggestions) && data.suggestions.length ? data.suggestions : undefined,
      };
    } catch { reply = { text: 'Hubo un error conectando con Ana.', error: true }; }

    setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, pending: false, text: reply.text, blocks: reply.blocks as AnaBlock[] | undefined, suggestions: reply.suggestions, error: reply.error } : m));
    refreshConversations();
    return reply;
  };

  const retryLast = () => {
    const errorIdx = messages.findLastIndex(m => m.error);
    if (errorIdx < 1) return;
    const userMsg = messages[errorIdx - 1];
    if (userMsg?.role !== 'user') return;
    const text = userMsg.text;
    setMessages(prev => prev.filter(m => m.id !== messages[errorIdx].id && m.id !== userMsg.id));
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
    if (speechSupported) speechStart();
  };
  const closeVoice = () => { speechStop(); ttsStop(); submittingRef.current = false; setVoiceOpen(false); setVoiceStage('listening'); resetVoice(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); voiceOpen ? closeVoice() : startVoice(); }
      if (e.key === 'Escape' && voiceOpen) { e.preventDefault(); closeVoice(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [voiceOpen]);

  const handleSubmit = (e?: React.FormEvent) => { e?.preventDefault(); sendMessage(input); };
  const errorCopy = speechError ? VOICE_ERRORS[speechError] : null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#A374FF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Content */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
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
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
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
        {usageWarning && (
          <div className="mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl px-3 py-2 text-[11px]"
            style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', color: '#b45309' }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Estás cerca del límite de consultas de IA de tu plan este mes.</span>
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

      {/* ══════ Voice overlay ══════ */}
      {voiceOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
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
        </div>
      )}
    </>
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
                  {/^procesando\.{0,3}$/i.test(m.text.trim()) ? (
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" />
                      <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: '0.15s' }} />
                      <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: '0.3s' }} />
                      <span className="ai-shimmer-text text-[14px] font-medium text-[#0A183A]/60">Procesando tu solicitud…</span>
                    </div>
                  ) : (
                    <div className={`text-[14.5px] leading-relaxed ${m.error ? 'text-red-800' : 'text-[#0A183A]/85'}`}>{m.text.split('\n').map((line, i) => <p key={i} className="m-0 mb-1.5 last:mb-0">{line}</p>)}</div>
                  )}
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
