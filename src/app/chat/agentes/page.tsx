'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkle, Plus, Close, Chart, PanelLeft,
  SettingsGear, LogOut, ArrowUp,
} from '@/components/chat/icons';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

function authFetch(path: string, init: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
}

function timeAgo(iso?: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

const TRIGGER_LABELS: Record<string, string> = {
  tire_alert_level: 'Nivel de alerta',
  tire_depth_threshold: 'Profundidad',
  scheduled_cron: 'Programado',
  tire_eol_approaching: 'Fin de vida',
  inspection_completed: 'Inspección',
};
const ACTION_LABELS: Record<string, string> = {
  send_email: 'Email', send_whatsapp: 'WhatsApp', create_calendar_event: 'Calendar',
  make_phone_call: 'Llamada', create_notification: 'Notificación',
};
const ACTION_INTEGRATION: Record<string, string> = {
  send_email: 'email', send_whatsapp: 'whatsapp', create_calendar_event: 'calendar',
  make_phone_call: 'phone', create_notification: 'email',
};

function triggerDetail(config: Record<string, unknown>, type: string): string {
  if (type === 'tire_alert_level') {
    const levels = (config.alertLevels as string[]) ?? [];
    return levels.map(l => l === 'critical' ? 'Cambio inmediato' : l === 'warning' ? '30 días' : l === 'watch' ? '60 días' : l).join(', ');
  }
  if (type === 'tire_depth_threshold') return `≤ ${config.thresholdMm ?? 2}mm`;
  if (type === 'scheduled_cron') return `${config.cronExpression ?? ''}`;
  if (type === 'tire_eol_approaching') return `≤ ${config.daysThreshold ?? 30} días`;
  if (type === 'inspection_completed') return 'Cualquier inspección';
  return '';
}
function actionDetail(config: Record<string, unknown>, type: string): string {
  if (type === 'send_email' || type === 'send_whatsapp' || type === 'make_phone_call') return `${config.to ?? ''}`;
  if (type === 'create_calendar_event') return (config.title as string) ?? 'Evento';
  return '';
}

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');

/* ═══════ Icons ═══════ */

const EmailIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="m3 7 9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" stroke="currentColor" strokeWidth="1.3" /><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l4.9-1.4A10 10 0 1 0 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-5 w-5'}><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);
const BoltIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/* ═══════ Data ═══════ */

type Integration = { id: string; name: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; connected: boolean };
const INTEGRATIONS: Integration[] = [
  { id: 'email', name: 'Email', description: 'Gmail, Outlook', icon: EmailIcon, color: '#1E76B6', bg: 'rgba(30,118,182,0.08)', connected: false },
  { id: 'whatsapp', name: 'WhatsApp', description: 'Mensajes', icon: WhatsAppIcon, color: '#25D366', bg: 'rgba(37,211,102,0.08)', connected: false },
  { id: 'phone', name: 'Llamadas', description: 'Automáticas', icon: PhoneIcon, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', connected: false },
  { id: 'calendar', name: 'Calendar', description: 'Google Cal', icon: CalendarIcon, color: '#EA4335', bg: 'rgba(234,67,53,0.08)', connected: false },
];

type ApiFlow = {
  id: string; name: string; description?: string; status: string;
  triggerType: string; triggerConfig: Record<string, unknown>;
  actionType: string; actionConfig: Record<string, unknown>;
  runCount: number; errorCount: number; lastRunAt?: string | null; lastError?: string | null;
};

const getColor = (at: string) => INTEGRATIONS.find(x => x.id === (ACTION_INTEGRATION[at] ?? 'email'))?.color ?? '#0A183A';
const getBg = (at: string) => INTEGRATIONS.find(x => x.id === (ACTION_INTEGRATION[at] ?? 'email'))?.bg ?? 'rgba(10,24,58,0.05)';
const getName = (at: string) => INTEGRATIONS.find(x => x.id === (ACTION_INTEGRATION[at] ?? 'email'))?.name ?? '';
const getIcon = (at: string) => INTEGRATIONS.find(x => x.id === (ACTION_INTEGRATION[at] ?? 'email'))?.icon ?? EmailIcon;

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AgentsPage() {
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
        if (plan !== 'plus' && plan !== 'pro') { router.replace('/dashboard/resumen'); return; }
        setAllowed(true);
      } catch { router.replace('/login'); }
    })();
  }, [router]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [flows, setFlows] = useState<ApiFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Floating Ana state
  const [anaOpen, setAnaOpen] = useState(false);
  const [anaInput, setAnaInput] = useState('');
  const [anaLoading, setAnaLoading] = useState(false);
  const [anaSuggestion, setAnaSuggestion] = useState<ApiFlow | null>(null);
  const anaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const el = anaRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }, [anaInput]);
  useEffect(() => { document.body.style.overflow = mobileNavOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [mobileNavOpen]);

  const loadFlows = async () => {
    try { const res = await authFetch('/automation/flows'); if (res.ok) setFlows(await res.json()); } catch {}
    setLoading(false);
  };
  const loadIntegrations = async () => {
    try {
      const res = await authFetch('/automation/integrations');
      if (!res.ok) return;
      const data = await res.json();
      setIntegrations(prev => prev.map(i => {
        const key = i.id === 'calendar' ? 'google_calendar' : i.id === 'phone' ? 'twilio_phone' : i.id;
        const status = data[key];
        return status ? { ...i, connected: status.connected ?? false } : i;
      }));
    } catch {}
  };
  useEffect(() => { if (!allowed) return; loadFlows(); loadIntegrations(); }, [allowed]);

  const toggleFlow = async (id: string) => {
    try { const res = await authFetch(`/automation/flows/${id}/toggle`, { method: 'PATCH' }); if (res.ok) { const u = await res.json(); setFlows(prev => prev.map(f => f.id === id ? { ...f, status: u.status } : f)); } } catch {}
  };
  const deleteFlow = async (id: string) => {
    try { const res = await authFetch(`/automation/flows/${id}`, { method: 'DELETE' }); if (res.ok) setFlows(prev => prev.filter(f => f.id !== id)); } catch {}
  };

  const askAna = async () => {
    if (!anaInput.trim()) return;
    setAnaLoading(true);
    setAnaSuggestion(null);
    try {
      const res = await authFetch('/automation/ai-builder', { method: 'POST', body: JSON.stringify({ description: anaInput }) });
      if (res.ok) { const data = await res.json(); setAnaSuggestion(data); }
    } catch {}
    setAnaLoading(false);
  };

  const createFromSuggestion = async () => {
    if (!anaSuggestion) return;
    try {
      const res = await authFetch('/automation/flows', {
        method: 'POST',
        body: JSON.stringify({
          name: anaSuggestion.name,
          triggerType: anaSuggestion.triggerType,
          triggerConfig: anaSuggestion.triggerConfig,
          actionType: anaSuggestion.actionType,
          actionConfig: anaSuggestion.actionConfig,
        }),
      });
      if (res.ok) { const flow = await res.json(); setFlows(prev => [flow, ...prev]); setAnaSuggestion(null); setAnaInput(''); setAnaOpen(false); }
    } catch {}
  };

  if (!allowed) return (
    <div className="flex h-screen w-full items-center justify-center" style={{ background: '#F0F2F5' }}>
      <div className="w-6 h-6 border-2 border-gray-200 border-t-[#A374FF] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="relative flex h-screen w-full overflow-hidden" style={{ background: '#F0F2F5' }}>
      {/* ══════ Sidebar — desktop ══════ */}
      <aside className={cn('relative z-30 hidden h-full shrink-0 flex-col border-r border-[#E4E7EB] bg-white transition-all duration-300 md:flex', sidebarOpen ? 'w-[260px]' : 'w-[64px]')}>
        <AgentsSidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} onGoBack={() => router.push('/dashboard/resumen')} />
      </aside>

      {/* ══════ Sidebar — mobile ══════ */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div key="mob" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setMobileNavOpen(false)} />
            <motion.aside initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -16, opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-[#E4E7EB] bg-white">
              <AgentsSidebar collapsed={false} onToggle={() => setMobileNavOpen(false)} onGoBack={() => router.push('/dashboard/resumen')} isMobile />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ Main ══════ */}
      <main className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        {/* Header bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#E4E7EB] bg-white px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMobileNavOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#525866] hover:bg-[#F0F2F5] md:hidden"><PanelLeft className="h-4 w-4" /></button>
            <BoltIcon className="h-4 w-4 text-[#A374FF]" />
            <span className="text-[14px] font-semibold text-[#1A1D21]">Flujos</span>
            <span className="ml-1 rounded-md bg-[#F0F2F5] px-1.5 py-0.5 text-[11px] font-medium text-[#525866]">{flows.length}</span>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1D21] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2D3138] transition-colors">
            <Plus className="h-3.5 w-3.5" /> Nuevo flujo
          </button>
        </header>

        {/* Canvas area */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

            {/* Integrations bar */}
            <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-[11px] font-medium text-[#525866]/70 uppercase tracking-wider mr-1">Conectado:</span>
              {integrations.map(integ => {
                const Icon = integ.icon;
                return (
                  <div key={integ.id} className={cn('flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors', integ.connected ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700' : 'border-[#E4E7EB] bg-white text-[#525866]/60')}>
                    <Icon className="h-3.5 w-3.5" style={integ.connected ? undefined : { color: integ.color } as React.CSSProperties} />
                    {integ.name}
                    {integ.connected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  </div>
                );
              })}
            </div>

            {/* Flows grid */}
            {loading && flows.length === 0 && (
              <div className="flex items-center justify-center py-20 text-[13px] text-[#525866]/50">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#E4E7EB] border-t-[#A374FF]" /> Cargando flujos...
              </div>
            )}
            {!loading && flows.length === 0 && (
              <div className="mx-auto max-w-md rounded-xl border border-dashed border-[#D1D5DB] bg-white p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F2F5]">
                  <BoltIcon className="h-6 w-6 text-[#525866]/40" />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-[#1A1D21]">Sin flujos</p>
                <p className="mt-1 text-[13px] text-[#525866]/60">Crea tu primer flujo o pide ayuda a Ana.</p>
                <button type="button" onClick={() => setCreating(true)} className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#1A1D21] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2D3138]">
                  <Plus className="h-3.5 w-3.5" /> Crear flujo
                </button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {flows.map(flow => {
                const isActive = flow.status === 'active';
                const isError = flow.status === 'error';
                const color = getColor(flow.actionType);
                const Icon = getIcon(flow.actionType);
                return (
                  <div key={flow.id} className={cn('group relative rounded-xl border bg-white transition-all hover:shadow-lg hover:-translate-y-0.5', isError ? 'border-red-200' : 'border-[#E4E7EB]')} style={{ borderLeft: `3px solid ${isError ? '#ef4444' : isActive ? color : '#D1D5DB'}` }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', isActive ? 'bg-emerald-400' : isError ? 'bg-red-400' : 'bg-[#D1D5DB]')} />
                        <p className="truncate text-[13px] font-semibold text-[#1A1D21]">{flow.name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => deleteFlow(flow.id)} className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-[#525866]/30 hover:bg-red-50 hover:text-red-500 transition-all" aria-label="Eliminar"><Close className="h-3 w-3" /></button>
                        <button type="button" onClick={() => toggleFlow(flow.id)} className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', isActive ? 'bg-emerald-400' : 'bg-[#D1D5DB]')}>
                          <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', isActive ? 'left-[18px]' : 'left-0.5')} />
                        </button>
                      </div>
                    </div>

                    {/* Node visualization */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-1.5">
                        {/* Trigger node */}
                        <div className="flex items-center gap-1.5 rounded-md bg-[#F0F2F5] px-2 py-1">
                          <BoltIcon className="h-3 w-3 text-[#525866]/60" />
                          <span className="text-[11px] font-medium text-[#525866]">{TRIGGER_LABELS[flow.triggerType] ?? flow.triggerType}</span>
                        </div>
                        {/* Connector */}
                        <svg width="24" height="8" viewBox="0 0 24 8" className="shrink-0 text-[#D1D5DB]"><path d="M0 4h18M18 1l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
                        {/* Action node */}
                        <div className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ background: getBg(flow.actionType) }}>
                          <Icon className="h-3 w-3" style={{ color } as React.CSSProperties} />
                          <span className="text-[11px] font-medium" style={{ color }}>{ACTION_LABELS[flow.actionType] ?? flow.actionType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center gap-3 border-t border-[#F0F2F5] px-4 py-2 text-[10px] text-[#525866]/50">
                      <span>{flow.runCount} ejecuciones</span>
                      <span>{timeAgo(flow.lastRunAt)}</span>
                      {isError && <span className="text-red-500 font-medium">Error</span>}
                    </div>

                    {isError && flow.lastError && (
                      <div className="border-t border-red-100 bg-red-50/50 px-4 py-1.5 text-[10px] text-red-500 truncate">{flow.lastError}</div>
                    )}
                  </div>
                );
              })}

              {/* Add card */}
              {flows.length > 0 && (
                <button type="button" onClick={() => setCreating(true)} className="flex min-h-[120px] items-center justify-center rounded-xl border-2 border-dashed border-[#D1D5DB] bg-white/50 text-[12px] font-medium text-[#525866]/40 transition-all hover:border-[#A374FF]/40 hover:text-[#A374FF] hover:bg-white">
                  <Plus className="mr-1.5 h-4 w-4" /> Nuevo flujo
                </button>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* ══════ Floating Ana helper ══════ */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {anaOpen && (
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-[360px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[#E4E7EB] bg-white shadow-2xl">
              {/* Ana header */}
              <div className="flex items-center gap-2 border-b border-[#F0F2F5] px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0A183A] to-[#A374FF]">
                  <Sparkle className="ai-sparkle h-3 w-3 text-white" />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#1A1D21]">Ana</p>
                  <p className="text-[10px] text-[#525866]/60">Describe tu flujo y lo creo por ti</p>
                </div>
                <button type="button" onClick={() => setAnaOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-[#525866]/40 hover:bg-[#F0F2F5]"><Close className="h-3.5 w-3.5" /></button>
              </div>

              {/* Ana suggestion preview */}
              {anaSuggestion && (
                <div className="border-b border-[#F0F2F5] px-4 py-3">
                  <p className="text-[11px] font-medium text-[#525866]/50 uppercase tracking-wider mb-2">Flujo sugerido</p>
                  <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                    <p className="text-[13px] font-semibold text-[#1A1D21]">{anaSuggestion.name}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded bg-[#F0F2F5] px-1.5 py-0.5 text-[10px] font-medium text-[#525866]">{TRIGGER_LABELS[anaSuggestion.triggerType]}</span>
                      <span className="text-[10px] text-[#D1D5DB]">→</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: getBg(anaSuggestion.actionType), color: getColor(anaSuggestion.actionType) }}>{ACTION_LABELS[anaSuggestion.actionType]}</span>
                    </div>
                    {(anaSuggestion as any).explanation && (
                      <p className="mt-2 text-[11px] text-[#525866]/60">{(anaSuggestion as any).explanation}</p>
                    )}
                    <button type="button" onClick={createFromSuggestion} className="mt-3 w-full rounded-lg bg-[#1A1D21] py-1.5 text-[12px] font-semibold text-white hover:bg-[#2D3138] transition-colors">Crear este flujo</button>
                  </div>
                </div>
              )}

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
                {['Alertar llantas críticas por WhatsApp', 'Reporte semanal por email'].map(s => (
                  <button key={s} type="button" onClick={() => { setAnaInput(s); setAnaSuggestion(null); }} className="rounded-full border border-[#E4E7EB] px-2.5 py-1 text-[10px] font-medium text-[#525866]/60 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">{s}</button>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-[#F0F2F5] px-3 py-2.5">
                <div className="flex items-end gap-1.5 rounded-xl border border-[#E4E7EB] bg-[#FAFBFC] px-2.5 py-1.5">
                  <textarea
                    ref={anaRef}
                    value={anaInput}
                    onChange={e => setAnaInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAna(); } }}
                    rows={1}
                    placeholder="Describe qué quieres automatizar..."
                    className="flex-1 resize-none border-0 bg-transparent py-1 text-[13px] text-[#1A1D21] placeholder:text-[#525866]/35 focus:outline-none"
                  />
                  <button type="button" onClick={askAna} disabled={!anaInput.trim() || anaLoading} className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors', anaInput.trim() && !anaLoading ? 'bg-[#1A1D21] text-white' : 'bg-[#F0F2F5] text-[#525866]/30')}>
                    {anaLoading ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB button */}
        <button type="button" onClick={() => setAnaOpen(v => !v)} className={cn('flex h-12 items-center gap-2 rounded-full px-4 shadow-lg transition-all hover:shadow-xl hover:scale-105', anaOpen ? 'bg-[#1A1D21] text-white' : 'bg-gradient-to-r from-[#0A183A] to-[#A374FF] text-white')}>
          {anaOpen ? <Close className="h-4 w-4" /> : <Sparkle className="ai-sparkle h-4 w-4" />}
          <span className="text-[13px] font-semibold">{anaOpen ? 'Cerrar' : 'Ana te ayuda'}</span>
        </button>
      </div>

      {/* ══════ Create flow modal ══════ */}
      <AnimatePresence>
        {creating && (
          <CreateFlowModal
            onClose={() => setCreating(false)}
            onCreated={(flow) => { setFlows(prev => [flow, ...prev]); setCreating(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ Create flow modal ═══════════════ */

function CreateFlowModal({ onClose, onCreated }: { onClose: () => void; onCreated: (f: ApiFlow) => void }) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('tire_alert_level');
  const [alertLevels, setAlertLevels] = useState<string[]>(['critical']);
  const [thresholdMm, setThresholdMm] = useState('2');
  const [actionType, setActionType] = useState('send_email');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Alerta TirePro: {{tire.placa}}');
  const [saving, setSaving] = useState(false);
  const toggleLevel = (l: string) => setAlertLevels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const triggerConfig: Record<string, unknown> =
      triggerType === 'tire_alert_level' ? { alertLevels }
      : triggerType === 'tire_depth_threshold' ? { thresholdMm: parseFloat(thresholdMm) || 2 }
      : triggerType === 'tire_eol_approaching' ? { daysThreshold: 30 }
      : {};
    const actionConfig: Record<string, unknown> =
      actionType === 'send_email' ? { to, subject }
      : actionType === 'create_notification' ? { priority: 2 }
      : { to };
    try {
      const res = await authFetch('/automation/flows', { method: 'POST', body: JSON.stringify({ name, triggerType, triggerConfig, actionType, actionConfig }) });
      if (res.ok) onCreated(await res.json());
    } catch {}
    setSaving(false);
  };

  const inputCls = 'w-full rounded-lg border border-[#E4E7EB] bg-white px-3 py-2 text-[13px] text-[#1A1D21] placeholder:text-[#525866]/30 focus:border-[#A374FF] focus:outline-none focus:ring-1 focus:ring-[#A374FF]/20 transition-colors';
  const labelCls = 'block text-[11px] font-semibold text-[#525866] uppercase tracking-wider mb-1.5';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F0F2F5] px-5 py-4">
          <h2 className="text-[16px] font-bold text-[#1A1D21]">Nuevo flujo</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#525866]/40 hover:bg-[#F0F2F5]"><Close className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div><label className={labelCls}>Nombre</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Alerta cambio inmediato" className={inputCls} /></div>

          <div><label className={labelCls}>Trigger</label>
            <select value={triggerType} onChange={e => setTriggerType(e.target.value)} className={inputCls}>
              <option value="tire_alert_level">Nivel de alerta de llanta</option>
              <option value="tire_depth_threshold">Profundidad mínima</option>
              <option value="tire_eol_approaching">Fin de vida próximo</option>
              <option value="inspection_completed">Inspección completada</option>
            </select>
          </div>

          {triggerType === 'tire_alert_level' && (
            <div><label className={labelCls}>Niveles</label>
              <div className="flex gap-2">
                {[{ key: 'critical', label: 'Inmediato', c: '#ef4444' }, { key: 'warning', label: '30 días', c: '#f59e0b' }, { key: 'watch', label: '60 días', c: '#3b82f6' }].map(l => (
                  <button key={l.key} type="button" onClick={() => toggleLevel(l.key)} className={cn('rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all', alertLevels.includes(l.key) ? 'text-white border-transparent' : 'text-[#525866] border-[#E4E7EB]')} style={alertLevels.includes(l.key) ? { background: l.c } : undefined}>{l.label}</button>
                ))}
              </div>
            </div>
          )}
          {triggerType === 'tire_depth_threshold' && (
            <div><label className={labelCls}>Profundidad (mm)</label><input type="number" value={thresholdMm} onChange={e => setThresholdMm(e.target.value)} className={inputCls} /></div>
          )}

          <div><label className={labelCls}>Acción</label>
            <select value={actionType} onChange={e => setActionType(e.target.value)} className={inputCls}>
              <option value="send_email">Enviar email</option>
              <option value="send_whatsapp">Enviar WhatsApp</option>
              <option value="create_notification">Notificación in-app</option>
            </select>
          </div>

          {(actionType === 'send_email' || actionType === 'send_whatsapp') && (
            <div><label className={labelCls}>{actionType === 'send_email' ? 'Email destino' : 'Número WhatsApp'}</label><input value={to} onChange={e => setTo(e.target.value)} placeholder={actionType === 'send_email' ? 'admin@empresa.com' : '+573001234567'} className={inputCls} /></div>
          )}
          {actionType === 'send_email' && (
            <div><label className={labelCls}>Asunto</label><input value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} /></div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#F0F2F5] px-5 py-3.5">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] font-medium text-[#525866] hover:bg-[#F0F2F5] transition-colors">Cancelar</button>
          <button type="button" onClick={handleCreate} disabled={saving || !name.trim()} className={cn('rounded-lg px-5 py-2 text-[13px] font-semibold text-white transition-all', saving || !name.trim() ? 'bg-[#D1D5DB]' : 'bg-[#1A1D21] hover:bg-[#2D3138]')}>
            {saving ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════ Sidebar ═══════════════ */

function AgentsSidebar({ collapsed, onToggle, onGoBack, isMobile }: {
  collapsed: boolean; onToggle: () => void; onGoBack: () => void; isMobile?: boolean;
}) {
  const [userData, setUserData] = useState<{ name: string; role: string; companyId: string } | null>(null);
  const [companyData, setCompanyData] = useState<{ name: string; profileImage?: string; plan: string } | null>(null);

  useEffect(() => { try { const raw = localStorage.getItem('user'); if (raw) { const p = JSON.parse(raw); setUserData({ name: p.name ?? '', role: p.role ?? '', companyId: p.companyId ?? '' }); } } catch {} }, []);
  useEffect(() => { if (!userData?.companyId) return; import('@/shared/fetchCompany').then(({ fetchCompany }) => fetchCompany(userData.companyId)).then((c) => setCompanyData(c as any)).catch(() => {}); }, [userData?.companyId]);
  const handleLogout = () => { localStorage.clear(); window.location.href = '/login'; };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className={cn('flex items-center gap-2', collapsed && 'mx-auto')}>
          {collapsed ? <Image src="/logo_tire.png" alt="TirePro" width={28} height={28} className="h-7 w-7" /> : <Image src="/logo_full.png" alt="TirePro" width={110} height={28} className="h-7 w-auto" />}
        </div>
        {!collapsed && <button type="button" onClick={onToggle} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#525866]/50 hover:bg-[#F0F2F5]">{isMobile ? <Close className="h-3.5 w-3.5" /> : <PanelLeft className="h-4 w-4" />}</button>}
      </div>

      <div className="px-3 pb-1">
        <a href="/chat" className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#525866] hover:bg-[#F0F2F5]', collapsed && 'justify-center px-0')}><Plus className="h-4 w-4 text-[#525866]/50" /> {!collapsed && <span>Nueva conversación</span>}</a>
      </div>
      <div className="px-3">
        <a href="/chat/agentes" className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium bg-[#F0F2F5] text-[#1A1D21]', collapsed && 'justify-center px-0')}><Sparkle className="h-4 w-4 text-[#A374FF]" /> {!collapsed && <span>Agentes</span>}</a>
      </div>
      <div className="px-3">
        <button type="button" onClick={onGoBack} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#525866] hover:bg-[#F0F2F5]', collapsed && 'justify-center px-0')}><Chart className="h-4 w-4 text-[#525866]/50" /> {!collapsed && <span>Dashboard</span>}</button>
      </div>

      <div className="flex-1" />

      {!collapsed ? (
        <div className="shrink-0 border-t border-[#E4E7EB] px-3 pb-3 pt-2">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[#F0F2F5] transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg, #0A183A, #173D68)' }}>
              {companyData?.profileImage ? <img src={companyData.profileImage} alt={companyData.name} className="h-full w-full object-contain p-0.5" /> : <span className="text-xs font-black text-white">{companyData?.name?.charAt(0).toUpperCase() ?? '?'}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight text-[#1A1D21]">{userData?.name ?? ''}</p>
              {companyData && <p className="truncate text-[10px] leading-tight text-[#525866]/50">{companyData.name}</p>}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <a href="/settings" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-medium text-[#525866]/50 hover:bg-[#F0F2F5] hover:text-[#525866] transition-colors"><SettingsGear className="h-3 w-3" /> Ajustes</a>
            <button type="button" onClick={handleLogout} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-50/60 hover:text-red-500 transition-colors"><LogOut className="h-3 w-3" /> Salir</button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-[#E4E7EB] px-3 py-2 space-y-1">
          <div className="mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg, #0A183A, #173D68)' }}>
            {companyData?.profileImage ? <img src={companyData.profileImage} alt={companyData?.name ?? ''} className="h-full w-full object-contain p-0.5" /> : <span className="text-xs font-black text-white">{companyData?.name?.charAt(0).toUpperCase() ?? '?'}</span>}
          </div>
          <button type="button" onClick={onToggle} className="flex h-7 w-full items-center justify-center rounded-md text-[#525866]/40 hover:bg-[#F0F2F5]"><PanelLeft className="h-4 w-4 rotate-180" /></button>
        </div>
      )}
    </div>
  );
}
