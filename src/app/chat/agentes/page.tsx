'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from '@/components/chat/icons';
import FlowListView from '@/components/agentes/FlowListView';
import TemplatePicker from '@/components/agentes/TemplatePicker';
import { listFlows, toggleFlow, deleteFlow, listIntegrations, authFetch } from '@/components/agentes/api';
import type { ApiFlow, FlowTemplate } from '@/components/agentes/types';

const FlowCanvasEditor = dynamic(() => import('@/components/agentes/FlowCanvasEditor'), { ssr: false });

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');

/* ═══════ Integration icons ═══════ */
const EmailIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'} style={style}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="m3 7 9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const WhatsAppIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'} style={style}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" stroke="currentColor" strokeWidth="1.3" /><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l4.9-1.4A10 10 0 1 0 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const PhoneIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'} style={style}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const CalendarIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'} style={style}><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

type IntegrationItem = { id: string; name: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; connected: boolean };
const INTEGRATIONS: IntegrationItem[] = [
  { id: 'email', name: 'Email', icon: EmailIcon, color: '#1E76B6', connected: false },
  { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon, color: '#25D366', connected: false },
  { id: 'phone', name: 'Llamadas', icon: PhoneIcon, color: '#F59E0B', connected: false },
  { id: 'calendar', name: 'Calendar', icon: CalendarIcon, color: '#EA4335', connected: false },
];

/* ═══════ Page ═══════ */

export default function AgentsPageWrapper() {
  return <Suspense><AgentsPage /></Suspense>;
}

function AgentsPage() {
  const searchParams = useSearchParams();

  const [editorFlowId, setEditorFlowId] = useState<string | 'new' | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<FlowTemplate | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [view, setView] = useState<'flows' | 'manage'>('flows');

  const [flows, setFlows] = useState<ApiFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [connectToast, setConnectToast] = useState<string | null>(null);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected === 'google_calendar') {
      setConnectToast('Google Calendar conectado');
      setTimeout(() => setConnectToast(null), 4000);
      window.history.replaceState({}, '', '/chat/agentes');
    }
  }, [searchParams]);

  const loadFlows = useCallback(async () => {
    try { setFlows(await listFlows()); } catch {}
    setLoading(false);
  }, []);

  const loadIntegrations = useCallback(async () => {
    try {
      const data = await listIntegrations();
      setIntegrations(prev => prev.map(i => {
        const key = i.id === 'calendar' ? 'google_calendar' : i.id === 'phone' ? 'twilio_phone' : i.id;
        const status = data[key];
        return status ? { ...i, connected: status.connected ?? false } : i;
      }));
    } catch {}
  }, []);

  useEffect(() => { loadFlows(); loadIntegrations(); }, [loadFlows, loadIntegrations]);

  const handleToggle = async (id: string) => {
    const result = await toggleFlow(id);
    if (result) setFlows(prev => prev.map(f => f.id === id ? { ...f, status: result.status } : f));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este flujo?')) return;
    if (await deleteFlow(id)) setFlows(prev => prev.filter(f => f.id !== id));
  };

  const handleEditorClose = (refresh?: boolean) => {
    setEditorFlowId(null);
    setEditorTemplate(null);
    if (refresh) loadFlows();
  };

  const handlePickerSelect = (t: FlowTemplate | null) => {
    setShowPicker(false);
    setEditorTemplate(t);
    setEditorFlowId('new');
  };

  const disconnectIntegration = async (id: string) => {
    if (id === 'calendar') {
      try {
        const res = await authFetch('/integrations/google/disconnect', { method: 'DELETE' });
        if (res.ok) { setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: false } : i)); setConnectToast('Google Calendar desconectado'); setTimeout(() => setConnectToast(null), 3000); }
      } catch {}
    }
  };

  if (editorFlowId !== null) {
    return <FlowCanvasEditor flowId={editorFlowId} template={editorTemplate} onClose={handleEditorClose} />;
  }

  return (
    <>
      {/* Sub-header with tabs */}
      <div className="shrink-0 border-b border-[#0A183A]/6 bg-white">
        <div className="flex items-center justify-between px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#A374FF]"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-[14px] font-semibold text-[#0A183A]">Agentes</span>
          </div>
          {view === 'flows' && (
            <button type="button" onClick={() => setShowPicker(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A183A] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#173D68] transition-colors">
              <Plus className="h-3.5 w-3.5" /> Nuevo flujo
            </button>
          )}
        </div>
        <div className="flex gap-0 px-4 pt-2 sm:px-6">
          <button type="button" onClick={() => setView('flows')} className={cn('relative px-3 pb-2 text-[13px] font-medium transition-colors', view === 'flows' ? 'text-[#0A183A]' : 'text-[#0A183A]/40 hover:text-[#0A183A]/70')}>
            Flujos <span className="ml-1 text-[11px] text-[#0A183A]/20">{flows.length}</span>
            {view === 'flows' && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#0A183A]" />}
          </button>
          <button type="button" onClick={() => setView('manage')} className={cn('relative px-3 pb-2 text-[13px] font-medium transition-colors', view === 'manage' ? 'text-[#0A183A]' : 'text-[#0A183A]/40 hover:text-[#0A183A]/70')}>
            Gestionar
            {view === 'manage' && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#0A183A]" />}
          </button>
        </div>
      </div>

      {view === 'manage' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
            <h2 className="text-[16px] font-bold text-[#0A183A] mb-1">Integraciones</h2>
            <p className="text-[13px] text-[#0A183A]/45 mb-5">Conecta y administra tus servicios externos.</p>
            <div className="space-y-3">
              {integrations.map(integ => {
                const Icon = integ.icon;
                const isSystem = integ.id === 'email' || integ.id === 'whatsapp';
                return (
                  <div key={integ.id} className="flex items-center gap-4 rounded-xl border border-[#0A183A]/8 bg-white p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${integ.color}12` }}>
                      <Icon className="h-5 w-5" style={{ color: integ.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-[#0A183A]">{integ.name}</p>
                      <p className="text-[12px] text-[#0A183A]/40">{isSystem ? 'Integracion del sistema' : integ.connected ? 'Conectado' : 'No conectado'}</p>
                    </div>
                    <div className="shrink-0">
                      {isSystem ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Activo</span>
                      ) : integ.connected ? (
                        <button type="button" onClick={() => disconnectIntegration(integ.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-50">Desconectar</button>
                      ) : (
                        <button type="button" onClick={async () => { if (integ.id === 'calendar') { try { const res = await authFetch('/integrations/google/auth'); if (res.ok) { const { url } = await res.json(); window.location.href = url; } } catch {} } }}
                          className={cn('rounded-lg px-3 py-1.5 text-[12px] font-medium', integ.id === 'calendar' ? 'bg-[#0A183A] text-white hover:bg-[#173D68]' : 'border border-[#0A183A]/10 text-[#0A183A]/35 cursor-not-allowed')}
                          disabled={integ.id !== 'calendar'}>
                          {integ.id === 'calendar' ? 'Conectar' : 'Proximamente'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <FlowListView
          flows={flows}
          loading={loading}
          onOpenFlow={(id) => setEditorFlowId(id)}
          onNewFlow={() => setShowPicker(true)}
          onNewFromTemplate={(t) => { setEditorTemplate(t); setEditorFlowId('new'); }}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}

      {/* Template picker */}
      <AnimatePresence>
        {showPicker && <TemplatePicker onPick={handlePickerSelect} onClose={() => setShowPicker(false)} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {connectToast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white shadow-lg">{connectToast}</motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
