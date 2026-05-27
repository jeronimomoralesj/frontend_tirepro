'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FLOW_TEMPLATES } from './constants';
import { TEMPLATE_ICON_MAP, GearIcon } from './icons';
import { askAiBuilder } from './api';
import type { FlowTemplate, ApiFlow } from './types';

type Props = {
  onPick: (template: FlowTemplate | null) => void;
  onClose: () => void;
};

export default function TemplatePicker({ onPick, onClose }: Props) {
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 80) + 'px'; }, [aiInput]);

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    const result = await askAiBuilder(aiInput.trim());
    setAiLoading(false);
    if (!result) {
      setAiError('No se pudo procesar la solicitud. Intenta de nuevo.');
      return;
    }
    if ((result as any).impossible) {
      setAiError((result as any).reason || 'Esta automatizacion no es posible con las opciones disponibles.');
      return;
    }
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
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A183A]/15 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#0A183A]/6 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#0A183A]">Nuevo flujo</h2>
            <p className="text-[12px] text-[#0A183A]/40 mt-0.5">Describe tu flujo o elige una plantilla</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#0A183A]/30 hover:bg-[#F8FAFC]">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* AI description section */}
        <div className="px-5 pt-5 pb-3">
          <div className="rounded-xl border border-[#A374FF]/20 bg-[#A374FF]/[0.03] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#0A183A] to-[#A374FF]">
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-white"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <span className="text-[12px] font-semibold text-[#0A183A]">Describe tu flujo</span>
            </div>
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSubmit(); } }}
                rows={1}
                placeholder="Ej: Cuando una llanta este critica, enviar WhatsApp al jefe de flota..."
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
            {aiError && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 mt-0.5 text-red-500"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-red-800">No es posible crear este flujo</p>
                  <p className="mt-0.5 text-[11px] text-red-600/80">{aiError}</p>
                </div>
                <button type="button" onClick={() => setAiError(null)} className="shrink-0 text-red-400 hover:text-red-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {['Alertar llantas criticas por WhatsApp', 'Reporte semanal por email'].map(s => (
                <button key={s} type="button" onClick={() => { setAiInput(s); setAiError(null); }}
                  className="rounded-full border border-[#0A183A]/6 px-2.5 py-1 text-[10px] font-medium text-[#0A183A]/40 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">{s}</button>
              ))}
            </div>
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
          {FLOW_TEMPLATES.map(t => {
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
      </motion.div>
    </motion.div>
  );
}
