'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkle, Mic, ArrowUp, Paperclip,
  Chart, Wrench, AlertTriangle,
} from '@/components/chat/icons';
import { useChatLayout } from '@/components/chat/ChatShell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const quickSuggestions = [
  { icon: Wrench, prompt: '¿Cuál es el CPK promedio de mi flota por marca?' },
  { icon: Chart, prompt: '¿Qué llantas necesitan cambio inmediato?' },
  { icon: AlertTriangle, prompt: '¿Cuáles son las mejores combinaciones marca/diseño por CPK?' },
  { icon: Sparkle, prompt: 'Dame un resumen general de mi flota de llantas.' },
];

const greetingFor = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

export default function ChatWelcomePage() {
  const router = useRouter();
  const { refreshConversations, setPendingMessage } = useChatLayout();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const greeting = useMemo(() => greetingFor(), []);

  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; }, [input]);

  const sendFirstMessage = async (text: string) => {
    const trimmed = text.trim(); if (!trimmed || sending) return;
    setSending(true);
    setInput('');
    try {
      const convRes = await fetch(`${API_BASE}/ana/conversations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed }),
      });
      if (convRes.ok) {
        const conv = await convRes.json();
        setPendingMessage(trimmed);
        refreshConversations();
        router.push(`/chat/${conv.id}`);
        return;
      }
    } catch {}
    setSending(false);
  };

  const handleSubmit = (e?: React.FormEvent) => { e?.preventDefault(); sendFirstMessage(input); };

  return (
    <>
      {/* Content */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-5 py-12 sm:px-8">
          <h1 className="animate-[fadeIn_0.4s_ease-out] text-[36px] font-medium tracking-tight text-[#0A183A] sm:text-[44px]">{greeting}</h1>

          {/* Action buttons */}
          <div className="mt-8 flex gap-3 animate-[fadeIn_0.45s_ease-out_0.05s_both]">
            <button type="button" onClick={() => sendFirstMessage('Registrar inspección')} className="group flex items-center gap-2.5 rounded-2xl border border-[#A374FF]/20 bg-[#A374FF]/[0.04] px-5 py-3 transition-colors hover:border-[#A374FF]/40 hover:bg-[#A374FF]/[0.08]">
              <Wrench className="h-4 w-4 text-[#A374FF]" />
              <span className="text-[13.5px] font-medium text-[#A374FF]">Inspección</span>
            </button>
            <button type="button" onClick={() => sendFirstMessage('Subir datos de llantas')} className="group flex items-center gap-2.5 rounded-2xl border border-[#0A183A]/10 bg-white px-5 py-3 transition-colors hover:border-[#0A183A]/20 hover:bg-[#F8FAFC]/60">
              <Paperclip className="h-4 w-4 text-[#0A183A]/55" />
              <span className="text-[13.5px] font-medium text-[#0A183A]/70">Subir datos</span>
            </button>
          </div>

          <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 animate-[fadeIn_0.5s_ease-out_0.1s_both]">
            {quickSuggestions.map(s => { const Icon = s.icon; return (
              <button key={s.prompt} type="button" onClick={() => sendFirstMessage(s.prompt)} className="group flex items-start gap-3 rounded-2xl border border-[#0A183A]/8 bg-white p-4 text-left transition-colors hover:border-[#0A183A]/20 hover:bg-[#F8FAFC]/60">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0A183A]/55 group-hover:text-[#0A183A]" />
                <span className="text-[13.5px] leading-snug text-[#0A183A]/75 group-hover:text-[#0A183A]">{s.prompt}</span>
              </button>
            ); })}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
        <div className="ai-bar-border mx-auto max-w-2xl overflow-hidden rounded-3xl">
          <form onSubmit={handleSubmit} className="flex w-full items-end gap-1 rounded-3xl bg-white/85 px-2 py-1.5 backdrop-blur-sm">
            <button type="button" aria-label="Adjuntar" onClick={() => sendFirstMessage('Subir datos de llantas')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0A183A]/45 hover:bg-[#F8FAFC]"><Paperclip className="h-4 w-4" /></button>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} rows={1} placeholder="Pregúntale algo a Ana" className="flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[14.5px] leading-relaxed text-[#0A183A] placeholder:text-[#0A183A]/35 focus:outline-none" />
            <button type="submit" disabled={!input.trim() || sending} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${input.trim() && !sending ? 'bg-gradient-to-br from-[#0A183A] to-[#A374FF] text-white' : 'bg-[#F8FAFC] text-[#0A183A]/30'}`}>
              {sending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
