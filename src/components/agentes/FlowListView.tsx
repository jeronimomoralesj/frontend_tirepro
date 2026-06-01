'use client';

import { TRIGGER_LABELS, ACTION_LABELS, getActionColor } from './constants';
import { TEMPLATE_ICON_MAP, BoltIcon, GearIcon } from './icons';
import type { ApiFlow, FlowTemplate } from './types';
import { FLOW_TEMPLATES } from './constants';

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');

function timeAgo(iso?: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

type Props = {
  flows: ApiFlow[];
  loading: boolean;
  onOpenFlow: (id: string) => void;
  onNewFlow: () => void;
  onNewFromTemplate: (t: FlowTemplate) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function FlowListView({ flows, loading, onOpenFlow, onNewFlow, onNewFromTemplate, onToggle, onDelete }: Props) {
  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        {/* Template starters */}
        {flows.length < 5 && (
          <div className="mb-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#0A183A]/35">Empieza rapido</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {FLOW_TEMPLATES.map(t => {
                const Icon = TEMPLATE_ICON_MAP[t.icon] ?? GearIcon;
                return (
                  <button key={t.id} type="button" onClick={() => onNewFromTemplate(t)}
                    className="group flex w-[180px] shrink-0 flex-col rounded-xl border border-[#0A183A]/8 bg-white p-3.5 text-left transition-all hover:border-[#A374FF]/30 hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] group-hover:bg-[#A374FF]/10">
                      <Icon className="h-4 w-4 text-[#0A183A]/40 group-hover:text-[#A374FF]" />
                    </div>
                    <div className="mt-2.5 text-[12px] font-semibold text-[#0A183A] group-hover:text-[#A374FF] leading-tight">{t.name}</div>
                    <div className="mt-1 text-[10px] text-[#0A183A]/35 line-clamp-2 leading-relaxed">{t.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && flows.length === 0 && (
          <div className="flex items-center justify-center py-20 text-[13px] text-[#0A183A]/35">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#0A183A]/10 border-t-[#A374FF]" /> Cargando flujos...
          </div>
        )}

        {/* Empty state */}
        {!loading && flows.length === 0 && (
          <div className="mx-auto max-w-md rounded-xl border border-dashed border-[#0A183A]/15 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F8FAFC]">
              <BoltIcon className="h-6 w-6 text-[#0A183A]/25" />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-[#0A183A]">Sin flujos</p>
            <p className="mt-1 text-[13px] text-[#0A183A]/45">Crea tu primer flujo de automatizacion.</p>
            <button type="button" onClick={onNewFlow} className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#0A183A] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#173D68]">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Crear flujo
            </button>
          </div>
        )}

        {/* Flow cards grid */}
        {flows.length > 0 && (
          <>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#0A183A]/35">
              Flujos <span className="text-[#0A183A]/20">{flows.length}</span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {flows.map(flow => <FlowCard key={flow.id} flow={flow} onOpen={onOpenFlow} onToggle={onToggle} onDelete={onDelete} />)}

              <button type="button" onClick={onNewFlow}
                className="flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-[#0A183A]/10 bg-white/50 text-[12px] font-medium text-[#0A183A]/30 transition-all hover:border-[#A374FF]/40 hover:text-[#A374FF] hover:bg-white">
                <svg viewBox="0 0 24 24" fill="none" className="mr-1.5 h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Nuevo flujo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FlowCard({ flow, onOpen, onToggle, onDelete }: { flow: ApiFlow; onOpen: (id: string) => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const isActive = flow.status === 'active';
  const isError = flow.status === 'error';
  const { color } = getActionColor(flow.actionType);
  return (
    <div
      className={cn('group relative rounded-xl border bg-white transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer overflow-hidden', isError ? 'border-red-200' : 'border-[#0A183A]/8')}
      style={{ borderLeftWidth: 3, borderLeftColor: isError ? '#ef4444' : isActive ? color : '#D1D5DB' }}
      onClick={() => onOpen(flow.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', isActive ? 'bg-emerald-400' : isError ? 'bg-red-400' : 'bg-[#D1D5DB]')} />
          <p className="truncate text-[13px] font-semibold text-[#0A183A]">{flow.name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => onDelete(flow.id)} className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-[#0A183A]/20 hover:bg-red-50 hover:text-red-500 transition-all" aria-label="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <button type="button" onClick={() => onToggle(flow.id)} className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', isActive ? 'bg-emerald-400' : 'bg-[#D1D5DB]')}>
            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', isActive ? 'left-[18px]' : 'left-0.5')} />
          </button>
        </div>
      </div>

      {/* Engineering mat mini-preview */}
      <div className="mx-3 my-2 rounded-lg overflow-hidden" style={{ background: '#1A1D21' }}>
        <svg viewBox="0 0 340 80" className="w-full h-auto" fill="none">
          {/* Dot grid pattern */}
          <defs>
            <pattern id={`dots-${flow.id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.08)" />
            </pattern>
          </defs>
          <rect width="340" height="80" fill={`url(#dots-${flow.id})`} />

          {/* Trigger node */}
          <rect x="20" y="15" width="110" height="50" rx="8" fill="rgba(163,116,255,0.12)" stroke="rgba(163,116,255,0.3)" strokeWidth="1" />
          <rect x="20" y="15" width="110" height="3" rx="1.5" fill="#A374FF" />
          <circle cx="46" cy="42" r="10" fill="rgba(163,116,255,0.15)" />
          <circle cx="46" cy="42" r="5" fill="rgba(163,116,255,0.4)" />
          <text x="62" y="38" fontSize="8" fill="rgba(255,255,255,0.7)" fontWeight="600">{TRIGGER_LABELS[flow.triggerType] ?? 'Trigger'}</text>
          <text x="62" y="50" fontSize="7" fill="rgba(255,255,255,0.3)" fontWeight="400">Trigger</text>

          {/* Animated edge */}
          <path d="M130 40 C160 40, 180 40, 210 40" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 3" className="animated-edge" />

          {/* + node */}
          <circle cx="170" cy="40" r="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <path d="M167 40h6M170 37v6" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />

          {/* Action node */}
          <rect x="210" y="15" width="110" height="50" rx="8" fill={`${color}18`} stroke={`${color}40`} strokeWidth="1" />
          <rect x="210" y="15" width="110" height="3" rx="1.5" fill={color} />
          <circle cx="236" cy="42" r="10" fill={`${color}20`} />
          <circle cx="236" cy="42" r="5" fill={`${color}60`} />
          <text x="252" y="38" fontSize="8" fill="rgba(255,255,255,0.7)" fontWeight="600">{ACTION_LABELS[flow.actionType] ?? 'Accion'}</text>
          <text x="252" y="50" fontSize="7" fill="rgba(255,255,255,0.3)" fontWeight="400">Accion</text>
        </svg>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-[#0A183A]/4 px-4 py-2 text-[10px] text-[#0A183A]/35">
        <span>{flow.runCount} ejecuciones</span>
        <span>{timeAgo(flow.lastRunAt)}</span>
        {isError && <span className="text-red-500 font-medium">Error</span>}
      </div>
      {isError && flow.lastError && (
        <div className="border-t border-red-100 bg-red-50/50 px-4 py-1.5 text-[10px] text-red-500 truncate">{flow.lastError}</div>
      )}
    </div>
  );
}
