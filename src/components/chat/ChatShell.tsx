'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkle, Plus, Close, Chart, PanelLeft,
  SettingsGear, LogOut,
} from '@/components/chat/icons';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

/* ═══════ Types ═══════ */

type ConvSummary = { id: string; title: string; updatedAt: string };

type ChatLayoutCtx = {
  conversations: ConvSummary[];
  refreshConversations: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
};

const ChatCtx = createContext<ChatLayoutCtx>({
  conversations: [],
  refreshConversations: async () => {},
  deleteConversation: async () => {},
});

export function useChatLayout() { return useContext(ChatCtx); }

/* ═══════ Helpers ═══════ */

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function groupByDate(convs: ConvSummary[]): [string, ConvSummary[]][] {
  const now = Date.now();
  const day = 86400000;
  const groups: Record<string, ConvSummary[]> = {};
  for (const c of convs) {
    const age = now - new Date(c.updatedAt).getTime();
    const label = age < day ? 'Hoy' : age < 2 * day ? 'Ayer' : age < 7 * day ? 'Esta semana' : 'Anteriores';
    (groups[label] ??= []).push(c);
  }
  const order = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores'];
  return order.filter(k => groups[k]).map(k => [k, groups[k]]);
}

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');

/* ═══════ ChatShell ═══════ */

export function ChatShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { document.body.style.overflow = mobileNavOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [mobileNavOpen]);

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

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ana/conversations`, { headers: authHeaders() });
      if (res.ok) setConversations(await res.json());
    } catch {}
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/ana/conversations/${id}`, { method: 'DELETE', headers: authHeaders() });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (pathname === `/chat/${id}`) router.push('/chat');
    } catch {}
  }, [pathname, router]);

  useEffect(() => { if (allowed) refreshConversations(); }, [allowed, refreshConversations]);

  const grouped = useMemo(() => groupByDate(conversations), [conversations]);

  const activeId = useMemo(() => {
    const match = pathname.match(/^\/chat\/([a-f0-9-]+)$/i);
    return match ? match[1] : null;
  }, [pathname]);

  const isAgentes = pathname.startsWith('/chat/agentes');

  const ctx = useMemo(() => ({ conversations, refreshConversations, deleteConversation }), [conversations, refreshConversations, deleteConversation]);

  if (!allowed) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1E76B6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ChatCtx.Provider value={ctx}>
      <div className="relative flex h-screen w-full overflow-hidden bg-white">
        {/* ══════ Sidebar — desktop ══════ */}
        <aside className={cn('relative z-30 hidden h-full shrink-0 flex-col border-r border-[#0A183A]/8 bg-white transition-all duration-300 md:flex', sidebarOpen ? 'w-[260px]' : 'w-[64px]')}>
          <SidebarContent
            collapsed={!sidebarOpen}
            grouped={grouped}
            activeId={activeId}
            isAgentes={isAgentes}
            onToggle={() => setSidebarOpen(v => !v)}
            onNewChat={() => router.push('/chat')}
            onOpenChat={(id) => router.push(`/chat/${id}`)}
            onDeleteChat={deleteConversation}
            onGoBack={() => router.push('/dashboard/resumen')}
          />
        </aside>

        {/* ══════ Sidebar — mobile ══════ */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div key="mob" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-40 md:hidden">
              <div className="absolute inset-0 bg-[#0A183A]/30" onClick={() => setMobileNavOpen(false)} />
              <motion.aside initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -16, opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-[#0A183A]/8 bg-white">
                <SidebarContent
                  collapsed={false}
                  grouped={grouped}
                  activeId={activeId}
                  isAgentes={isAgentes}
                  onToggle={() => setMobileNavOpen(false)}
                  onNewChat={() => { router.push('/chat'); setMobileNavOpen(false); }}
                  onOpenChat={(id) => { router.push(`/chat/${id}`); setMobileNavOpen(false); }}
                  onDeleteChat={deleteConversation}
                  onGoBack={() => router.push('/dashboard/resumen')}
                  isMobile
                />
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
                <Sparkle className="h-3.5 w-3.5 text-[#A374FF]" /> Ana
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => router.push('/chat')} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#0A183A]/65 hover:bg-[#F8FAFC] hover:text-[#0A183A]"><Plus className="h-3.5 w-3.5" /> Nueva</button>
              <button type="button" onClick={() => router.push('/dashboard/resumen')} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#0A183A]/65 hover:bg-[#F8FAFC] hover:text-[#0A183A]"><Chart className="h-3.5 w-3.5" /> Dashboard</button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </ChatCtx.Provider>
  );
}

/* ═══════════════ Sidebar content ═══════════════ */

function SidebarContent({ collapsed, grouped, activeId, isAgentes, onToggle, onNewChat, onOpenChat, onDeleteChat, onGoBack, isMobile }: {
  collapsed: boolean; grouped: [string, ConvSummary[]][]; activeId: string | null; isAgentes: boolean;
  onToggle: () => void; onNewChat: () => void; onOpenChat: (id: string) => void;
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

      <div className="px-3 pb-1">
        <button type="button" onClick={onNewChat} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#0A183A]/80 hover:bg-[#F8FAFC]', collapsed && 'justify-center px-0')}>
          <Plus className="h-4 w-4 text-[#0A183A]/55" /> {!collapsed && <span>Nueva conversación</span>}
        </button>
      </div>

      <div className="px-3">
        <a href="/chat/agentes" className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium hover:bg-[#F8FAFC]', isAgentes ? 'bg-[#F8FAFC] text-[#0A183A]' : 'text-[#0A183A]/80', collapsed && 'justify-center px-0')}>
          <Sparkle className="h-4 w-4 text-[#A374FF]" /> {!collapsed && <span>Agentes</span>}
        </a>
      </div>

      <div className="px-3">
        <button type="button" onClick={onGoBack} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#0A183A]/80 hover:bg-[#F8FAFC]', collapsed && 'justify-center px-0')}>
          <Chart className="h-4 w-4 text-[#0A183A]/55" /> {!collapsed && <span>Dashboard</span>}
        </button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-3">
        {!collapsed && grouped.map(([label, items]) => (
          <div key={label} className="mb-4">
            <div className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-[#0A183A]/35">{label}</div>
            <ul>
              {items.map(c => (
                <li key={c.id} className="group flex items-center">
                  <button type="button" onClick={() => onOpenChat(c.id)} className={cn('flex-1 min-w-0 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors', activeId === c.id ? 'bg-[#F8FAFC] text-[#0A183A]' : 'text-[#0A183A]/70 hover:bg-[#F8FAFC]')}>
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

      {!collapsed ? (
        <div className="shrink-0 border-t border-[#0A183A]/6 px-3 pb-3 pt-2">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[#F8FAFC] transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg, #0A183A, #173D68)' }}>
              {companyData?.profileImage ? (
                <img src={companyData.profileImage} alt={companyData.name} className="h-full w-full object-contain p-0.5" />
              ) : (
                <span className="text-xs font-black text-white">{companyData?.name?.charAt(0).toUpperCase() ?? '?'}</span>
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
