'use client';

import { motion } from 'framer-motion';
import { TRIGGER_LABELS, TRIGGER_DESCRIPTIONS, ACTION_LABELS, getActionColor } from './constants';
import { TRIGGER_ICON_MAP, ACTION_ICON_MAP, BoltIcon, GearIcon } from './icons';
import type { TriggerNodeData, ActionNodeData } from './types';

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');
const inputCls = 'w-full rounded-lg border border-[#0A183A]/10 bg-white px-3 py-2 text-[13px] text-[#0A183A] placeholder:text-[#0A183A]/25 focus:border-[#A374FF] focus:outline-none focus:ring-1 focus:ring-[#A374FF]/20 transition-colors';
const labelCls = 'block text-[11px] font-semibold text-[#0A183A]/50 uppercase tracking-wider mb-1.5';

type Props = {
  nodeType: 'trigger' | 'action';
  data: TriggerNodeData | ActionNodeData;
  onUpdate: (data: Partial<TriggerNodeData> | Partial<ActionNodeData>) => void;
  onClose: () => void;
};

export default function NodeConfigPanel({ nodeType, data, onUpdate, onClose }: Props) {
  const isTrigger = nodeType === 'trigger';
  const triggerData = data as TriggerNodeData;
  const actionData = data as ActionNodeData;

  return (
    <motion.div
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      exit={{ x: 380 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute right-0 top-0 z-20 h-full w-[380px] border-l border-[#0A183A]/8 bg-white shadow-xl overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0A183A]/6 bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          {(() => {
            const Icon = isTrigger
              ? (TRIGGER_ICON_MAP[triggerData.triggerType] ?? BoltIcon)
              : (ACTION_ICON_MAP[actionData.actionType] ?? GearIcon);
            const iconColor = isTrigger ? '#A374FF' : getActionColor(actionData.actionType).color;
            return (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: `${iconColor}15` }}>
                <Icon className="h-4 w-4" style={{ color: iconColor }} />
              </div>
            );
          })()}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0A183A]/40">{isTrigger ? 'Trigger' : 'Acción'}</div>
            <div className="text-[14px] font-bold text-[#0A183A]">Configurar</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#0A183A]/30 hover:bg-[#F8FAFC] hover:text-[#0A183A]/60">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {isTrigger ? (
          <TriggerForm data={triggerData} onUpdate={onUpdate as (d: Partial<TriggerNodeData>) => void} />
        ) : (
          <ActionForm data={actionData} onUpdate={onUpdate as (d: Partial<ActionNodeData>) => void} />
        )}
      </div>
    </motion.div>
  );
}

function TriggerForm({ data, onUpdate }: { data: TriggerNodeData; onUpdate: (d: Partial<TriggerNodeData>) => void }) {
  const setType = (triggerType: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      tire_alert_level: { alertLevels: ['critical'] },
      tire_depth_threshold: { thresholdMm: 2 },
      scheduled_cron: { cron: '0 8 * * 1' },
      tire_eol_approaching: { daysThreshold: 30 },
      inspection_completed: {},
    };
    onUpdate({ triggerType, triggerConfig: defaults[triggerType] ?? {} });
  };

  return (
    <>
      <div>
        <label className={labelCls}>Tipo de trigger</label>
        <select value={data.triggerType} onChange={e => setType(e.target.value)} className={inputCls}>
          {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <p className="mt-1.5 text-[11px] text-[#0A183A]/35">{TRIGGER_DESCRIPTIONS[data.triggerType]}</p>
      </div>

      {data.triggerType === 'tire_alert_level' && (
        <div>
          <label className={labelCls}>Niveles de alerta</label>
          <div className="flex gap-2">
            {[
              { key: 'critical', label: 'Inmediato', c: '#ef4444' },
              { key: 'warning', label: '30 días', c: '#f59e0b' },
              { key: 'watch', label: '60 días', c: '#3b82f6' },
            ].map(l => {
              const levels = (data.triggerConfig.alertLevels as string[]) ?? [];
              const active = levels.includes(l.key);
              return (
                <button key={l.key} type="button"
                  onClick={() => {
                    const next = active ? levels.filter(x => x !== l.key) : [...levels, l.key];
                    onUpdate({ triggerConfig: { ...data.triggerConfig, alertLevels: next } });
                  }}
                  className={cn('rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all', active ? 'text-white border-transparent' : 'text-[#0A183A]/50 border-[#0A183A]/10')}
                  style={active ? { background: l.c } : undefined}
                >{l.label}</button>
              );
            })}
          </div>
        </div>
      )}

      {data.triggerType === 'tire_depth_threshold' && (
        <div>
          <label className={labelCls}>Profundidad mínima (mm)</label>
          <input type="number" value={(data.triggerConfig.thresholdMm as number) ?? 2}
            onChange={e => onUpdate({ triggerConfig: { ...data.triggerConfig, thresholdMm: parseFloat(e.target.value) || 2 } })}
            className={inputCls} />
        </div>
      )}

      {data.triggerType === 'scheduled_cron' && (
        <div>
          <label className={labelCls}>Expresión cron</label>
          <input value={(data.triggerConfig.cron as string) ?? ''}
            onChange={e => onUpdate({ triggerConfig: { ...data.triggerConfig, cron: e.target.value } })}
            placeholder="0 8 * * 1" className={inputCls} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { label: 'Diario 8am', cron: '0 8 * * *' },
              { label: 'Lunes 8am', cron: '0 8 * * 1' },
              { label: 'Cada mes', cron: '0 8 1 * *' },
            ].map(p => (
              <button key={p.cron} type="button"
                onClick={() => onUpdate({ triggerConfig: { ...data.triggerConfig, cron: p.cron } })}
                className="rounded-full border border-[#0A183A]/8 px-2.5 py-1 text-[10px] font-medium text-[#0A183A]/50 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors"
              >{p.label}</button>
            ))}
          </div>
        </div>
      )}

      {data.triggerType === 'tire_eol_approaching' && (
        <div>
          <label className={labelCls}>Días antes del fin de vida</label>
          <input type="number" value={(data.triggerConfig.daysThreshold as number) ?? 30}
            onChange={e => onUpdate({ triggerConfig: { ...data.triggerConfig, daysThreshold: parseInt(e.target.value) || 30 } })}
            className={inputCls} />
        </div>
      )}

      {data.triggerType === 'inspection_completed' && (
        <div className="rounded-lg bg-[#F8FAFC] px-3 py-2.5 text-[12px] text-[#0A183A]/50">
          Se activa automáticamente al completar cualquier inspección.
        </div>
      )}
    </>
  );
}

function ActionForm({ data, onUpdate }: { data: ActionNodeData; onUpdate: (d: Partial<ActionNodeData>) => void }) {
  const setType = (actionType: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      send_email: { to: '', subject: 'Alerta TirePro' },
      send_whatsapp: { to: '' },
      create_calendar_event: { summary: 'Evento TirePro', durationMinutes: 60 },
      make_phone_call: { to: '', message: '' },
      create_notification: { priority: 2 },
    };
    onUpdate({ actionType, actionConfig: defaults[actionType] ?? {} });
  };

  return (
    <>
      <div>
        <label className={labelCls}>Tipo de acción</label>
        <select value={data.actionType} onChange={e => setType(e.target.value)} className={inputCls}>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {data.actionType === 'send_email' && (
        <>
          <div>
            <label className={labelCls}>Email destino</label>
            <input value={(data.actionConfig.to as string) ?? ''}
              onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, to: e.target.value } })}
              placeholder="admin@empresa.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Asunto</label>
            <input value={(data.actionConfig.subject as string) ?? ''}
              onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, subject: e.target.value } })}
              className={inputCls} />
            <p className="mt-1 text-[10px] text-[#0A183A]/30">Variables: {'{{tire.placa}}'}, {'{{tire.marca}}'}, {'{{tire.profundidad}}'}</p>
          </div>
        </>
      )}

      {data.actionType === 'send_whatsapp' && (
        <div>
          <label className={labelCls}>Número WhatsApp</label>
          <input value={(data.actionConfig.to as string) ?? ''}
            onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, to: e.target.value } })}
            placeholder="+573001234567" className={inputCls} />
        </div>
      )}

      {data.actionType === 'create_calendar_event' && (
        <>
          <div>
            <label className={labelCls}>Título del evento</label>
            <input value={(data.actionConfig.summary as string) ?? ''}
              onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, summary: e.target.value } })}
              className={inputCls} />
            <p className="mt-1 text-[10px] text-[#0A183A]/30">Variables: {'{{vehiclePlaca}}'}, {'{{tireMarca}}'}, {'{{tireDepth}}'}</p>
          </div>
          <div>
            <label className={labelCls}>Descripción del evento</label>
            <textarea value={(data.actionConfig.description as string) ?? ''}
              onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, description: e.target.value } })}
              rows={3} placeholder="Llanta {{tireMarca}} {{tireDiseno}} — {{tireDepth}}mm en {{vehiclePlaca}}"
              className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Programar para</label>
              <select value={(data.actionConfig.delayDays as number) ?? 0}
                onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, delayDays: parseInt(e.target.value) } })}
                className={inputCls}>
                <option value={0}>Mismo dia</option>
                <option value={1}>Siguiente dia</option>
                <option value={2}>En 2 dias</option>
                <option value={3}>En 3 dias</option>
                <option value={7}>En 1 semana</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Hora</label>
              <select value={(data.actionConfig.startHour as number) ?? 9}
                onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, startHour: parseInt(e.target.value) } })}
                className={inputCls}>
                {Array.from({ length: 14 }, (_, i) => i + 6).map(h => (
                  <option key={h} value={h}>{h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Duración</label>
            <select value={(data.actionConfig.durationMinutes as number) ?? 60}
              onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, durationMinutes: parseInt(e.target.value) } })}
              className={inputCls}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
            </select>
          </div>
        </>
      )}

      {data.actionType === 'make_phone_call' && (
        <>
          <div>
            <label className={labelCls}>Número de teléfono</label>
            <input value={(data.actionConfig.to as string) ?? ''}
              onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, to: e.target.value } })}
              placeholder="+573001234567" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mensaje</label>
            <textarea value={(data.actionConfig.message as string) ?? ''}
              onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, message: e.target.value } })}
              rows={3} className={inputCls} />
          </div>
        </>
      )}

      {data.actionType === 'create_notification' && (
        <div>
          <label className={labelCls}>Prioridad</label>
          <select value={(data.actionConfig.priority as number) ?? 2}
            onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, priority: parseInt(e.target.value) } })}
            className={inputCls}>
            <option value={1}>Baja</option>
            <option value={2}>Media</option>
            <option value={3}>Alta</option>
          </select>
        </div>
      )}
    </>
  );
}
