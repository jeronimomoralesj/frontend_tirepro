'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FLOW_TEMPLATES, HIDDEN_ACTION_TYPES } from './constants';
import { TEMPLATE_ICON_MAP, GearIcon } from './icons';
import { askAiBuilder } from './api';
import type { FlowTemplate } from './types';

type AiMessage = { role: 'user' | 'ai'; text: string; type?: 'error' | 'clarification' };

type Props = {
  onPick: (template: FlowTemplate | null) => void;
  onClose: () => void;
};

export default function TemplatePicker({ onPick, onClose }: Props) {
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 80) + 'px'; }, [aiInput]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userText = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userText }]);
    setAiInput('');
    setAiLoading(true);

    const result = await askAiBuilder(userText);
    setAiLoading(false);

    if (!result) {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'No se pudo procesar la solicitud. Intenta de nuevo.', type: 'error' }]);
      return;
    }
    if ((result as any).impossible) {
      setAiMessages(prev => [...prev, { role: 'ai', text: (result as any).reason || 'Esta automatizacion no es posible con las opciones disponibles.', type: 'error' }]);
      return;
    }
    if ((result as any).clarification) {
      setAiMessages(prev => [...prev, { role: 'ai', text: (result as any).question || 'Necesito mas detalles.', type: 'clarification' }]);
      return;
    }

    setAiMessages(prev => [...prev, { role: 'ai', text: `Listo. Creando flujo: "${result.name}"` }]);
    setTimeout(() => {
      onPick({
        id: 'ai-generated',
        name: result.name,
        description: '',
        icon: 'notification',
        triggerType: result.triggerType,
        triggerConfig: result.triggerConfig,
        actionType: result.actionType,
        actionConfig: result.actionConfig,
      });
    }, 600);
  };

  const showChat = aiMessages.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A183A]/15 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#0A183A]/6 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#0A183A]">Nuevo flujo</h2>
            <p className="text-[12px] text-[#0A183A]/40 mt-0.5">Describe tu flujo o elige una plantilla</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#0A183A]/30 hover:bg-[#F8FAFC]">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* AI description section */}
          <div className="px-5 pt-5 pb-3">
            <div className="rounded-xl border border-[#A374FF]/20 bg-[#A374FF]/[0.03] p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#0A183A] to-[#A374FF]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-white"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
                <span className="text-[12px] font-semibold text-[#0A183A]">Describe tu flujo</span>
              </div>

              {/* Chat messages */}
              {showChat && (
                <div className="mb-3 max-h-[200px] overflow-y-auto space-y-2 rounded-lg bg-white/60 p-2.5">
                  {aiMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[#0A183A] text-white'
                          : m.type === 'error'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : m.type === 'clarification'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-[#F8FAFC] text-[#0A183A]'
                      }`}>
                        {m.type === 'error' && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            <span className="text-[10px] font-semibold uppercase">No disponible</span>
                          </div>
                        )}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A374FF]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A374FF]" style={{ animationDelay: '0.15s' }} />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A374FF]" style={{ animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSubmit(); } }}
                  rows={1}
                  placeholder={showChat ? 'Responde o describe algo diferente...' : 'Ej: Cuando una llanta este critica, enviar WhatsApp al jefe de flota...'}
                  className="flex-1 resize-none rounded-lg border border-[#0A183A]/10 bg-white px-3 py-2 text-[13px] text-[#0A183A] placeholder:text-[#0A183A]/25 focus:border-[#A374FF] focus:outline-none focus:ring-1 focus:ring-[#A374FF]/20"
                />
                <button type="button" onClick={handleAiSubmit} disabled={!aiInput.trim() || aiLoading}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${aiInput.trim() && !aiLoading ? 'bg-[#0A183A] text-white hover:bg-[#173D68]' : 'bg-[#0A183A]/5 text-[#0A183A]/20'}`}>
                  {aiLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
              </div>
              {!showChat && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {['Alertar llantas criticas por WhatsApp', 'Reporte semanal por email'].map(s => (
                    <button key={s} type="button" onClick={() => setAiInput(s)}
                      className="rounded-full border border-[#0A183A]/6 px-2.5 py-1 text-[10px] font-medium text-[#0A183A]/40 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">{s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-5 py-1">
            <div className="flex-1 h-px bg-[#0A183A]/6" />
            <span className="text-[10px] font-medium text-[#0A183A]/25 uppercase tracking-wider">o elige plantilla</span>
            <div className="flex-1 h-px bg-[#0A183A]/6" />
          </div>

          {/* Templates */}
          <div className="grid grid-cols-1 gap-2.5 px-5 pb-3 sm:grid-cols-2">
            {FLOW_TEMPLATES.filter(t => !HIDDEN_ACTION_TYPES.has(t.actionType)).map(t => {
              const Icon = TEMPLATE_ICON_MAP[t.icon] ?? GearIcon;
              return (
                <button key={t.id} type="button" onClick={() => onPick(t)}
                  className="group flex items-start gap-3 rounded-xl border border-[#0A183A]/8 bg-white p-3.5 text-left transition-all hover:border-[#A374FF]/30 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] group-hover:bg-[#A374FF]/10">
                    <Icon className="h-4 w-4 text-[#0A183A]/40 group-hover:text-[#A374FF]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#0A183A] group-hover:text-[#A374FF]">{t.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#0A183A]/40 line-clamp-2">{t.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Blank */}
          <div className="border-t border-[#0A183A]/6 px-5 py-3.5">
            <button type="button" onClick={() => onPick(null)}
              className="w-full rounded-xl border-2 border-dashed border-[#0A183A]/10 py-3 text-[13px] font-medium text-[#0A183A]/40 transition-all hover:border-[#A374FF]/30 hover:text-[#A374FF]">
              Empezar en blanco
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
