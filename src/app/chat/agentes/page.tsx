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
const CalendarIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'} style={style}><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

type IntegrationItem = { id: string; name: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; connected: boolean; accountEmail?: string | null; system?: boolean };
const INTEGRATIONS: IntegrationItem[] = [
  { id: 'email', name: 'Email', icon: EmailIcon, color: '#1E76B6', connected: true, system: true },
  // WhatsApp + Llamadas hidden until those channels actually ship.
  { id: 'calendar', name: 'Google Calendar', icon: CalendarIcon, color: '#EA4335', connected: false },
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
        if (!status) return i;
        return {
          ...i,
          connected: status.connected ?? false,
          accountEmail: status.accountEmail ?? null,
          system: status.system ?? i.system,
        };
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
                const isSystem = !!integ.system;
                return (
                  <div key={integ.id} className={cn('rounded-xl border bg-white p-4', integ.connected ? 'border-[#0A183A]/8' : 'border-[#0A183A]/6')}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${integ.color}12` }}>
                        <Icon className="h-5 w-5" style={{ color: integ.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-[#0A183A]">{integ.name}</p>
                          {integ.connected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Conectado
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#0A183A]/40">
                          {isSystem ? 'Integracion del sistema — siempre activa' : !integ.connected ? 'No conectado' : null}
                        </p>
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
                    {/* Connected account details */}
                    {integ.connected && !isSystem && integ.accountEmail && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#F8FAFC] px-3.5 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-[#0A183A]/8">
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#0A183A]/40"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-[#0A183A]">Cuenta conectada</p>
                          <p className="text-[11px] text-[#0A183A]/50 truncate">{integ.accountEmail}</p>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-emerald-500"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    )}
                    {integ.connected && !isSystem && !integ.accountEmail && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-amber-50 px-3.5 py-2.5">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-amber-500"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        <p className="min-w-0 flex-1 text-[11px] text-amber-700">No se pudo verificar la cuenta. Reconecta para vincular tu email.</p>
                        <button type="button" onClick={async () => {
                          try { const res = await authFetch('/integrations/google/auth'); if (res.ok) { const { url } = await res.json(); window.location.href = url; } } catch {}
                        }} className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700 transition-colors">
                          Reconectar
                        </button>
                      </div>
                    )}
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
