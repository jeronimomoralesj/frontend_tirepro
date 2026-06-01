'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { TRIGGER_LABELS, TRIGGER_DESCRIPTIONS, ACTION_LABELS, HIDDEN_ACTION_TYPES, getActionColor } from './constants';
import { TRIGGER_ICON_MAP, ACTION_ICON_MAP, BoltIcon, GearIcon } from './icons';
import type { TriggerNodeData, ActionNodeData } from './types';

const AnaBlocks = dynamic(() => import('@/components/chat/AnaBlocks'), { ssr: false });

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');
const inputCls = 'w-full rounded-lg border border-[#0A183A]/10 bg-white px-3 py-2 text-[13px] text-[#0A183A] placeholder:text-[#0A183A]/25 focus:border-[#A374FF] focus:outline-none focus:ring-1 focus:ring-[#A374FF]/20 transition-colors';
const labelCls = 'block text-[11px] font-semibold text-[#0A183A]/50 uppercase tracking-wider mb-1.5';

type Props = {
  nodeType: 'trigger' | 'action';
  data: TriggerNodeData | ActionNodeData;
  onUpdate: (data: Partial<TriggerNodeData> | Partial<ActionNodeData>) => void;
  onClose: () => void;
  onDelete?: () => void;
  actionIndex?: number;
  actionTotal?: number;
};

export default function NodeConfigPanel({ nodeType, data, onUpdate, onClose, onDelete, actionIndex, actionTotal }: Props) {
  const isTrigger = nodeType === 'trigger';
  const triggerData = data as TriggerNodeData;
  const actionData = data as ActionNodeData;

  return (
    <motion.div
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      exit={{ x: 380 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{ position: 'absolute', right: 0, top: 0, zIndex: 20, height: '100%', width: 380, borderLeft: '1px solid rgba(10,24,58,0.08)', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflowY: 'auto' }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0A183A]/6 bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          {(() => {
            const Icon = isTrigger ? (TRIGGER_ICON_MAP[triggerData.triggerType] ?? BoltIcon) : (ACTION_ICON_MAP[actionData.actionType] ?? GearIcon);
            const iconColor = isTrigger ? '#A374FF' : getActionColor(actionData.actionType).color;
            return (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${iconColor}15` }}>
                <Icon className="h-4 w-4" style={{ color: iconColor }} />
              </div>
            );
          })()}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0A183A]/40">
              {isTrigger ? 'Trigger' : (typeof actionIndex === 'number' && typeof actionTotal === 'number' && actionTotal > 1 ? `Accion ${actionIndex + 1} de ${actionTotal}` : 'Accion')}
            </div>
            <div className="text-[14px] font-bold text-[#0A183A]">Configurar</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isTrigger && onDelete && (
            <button type="button" onClick={onDelete} title="Eliminar esta accion" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#0A183A]/30 hover:bg-red-50 hover:text-red-500 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#0A183A]/30 hover:bg-[#F8FAFC] hover:text-[#0A183A]/60">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
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
            {[{ key: 'critical', label: 'Inmediato', c: '#ef4444' }, { key: 'warning', label: '30 dias', c: '#f59e0b' }, { key: 'watch', label: '60 dias', c: '#3b82f6' }].map(l => {
              const levels = (data.triggerConfig.alertLevels as string[]) ?? [];
              const active = levels.includes(l.key);
              return (
                <button key={l.key} type="button"
                  onClick={() => { const next = active ? levels.filter(x => x !== l.key) : [...levels, l.key]; onUpdate({ triggerConfig: { ...data.triggerConfig, alertLevels: next } }); }}
                  className={cn('rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all', active ? 'text-white border-transparent' : 'text-[#0A183A]/50 border-[#0A183A]/10')}
                  style={active ? { background: l.c } : undefined}>{l.label}</button>
              );
            })}
          </div>
        </div>
      )}
      {data.triggerType === 'tire_depth_threshold' && (
        <div>
          <label className={labelCls}>Profundidad minima (mm)</label>
          <input type="number" value={(data.triggerConfig.thresholdMm as number) ?? 2} onChange={e => onUpdate({ triggerConfig: { ...data.triggerConfig, thresholdMm: parseFloat(e.target.value) || 2 } })} className={inputCls} />
        </div>
      )}
      {data.triggerType === 'scheduled_cron' && (
        <div>
          <label className={labelCls}>Expresion cron</label>
          <input value={(data.triggerConfig.cron as string) ?? ''} onChange={e => onUpdate({ triggerConfig: { ...data.triggerConfig, cron: e.target.value } })} placeholder="0 8 * * 1" className={inputCls} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[{ label: 'Diario 8am', cron: '0 8 * * *' }, { label: 'Lunes 8am', cron: '0 8 * * 1' }, { label: 'Cada mes', cron: '0 8 1 * *' }].map(p => (
              <button key={p.cron} type="button" onClick={() => onUpdate({ triggerConfig: { ...data.triggerConfig, cron: p.cron } })}
                className="rounded-full border border-[#0A183A]/8 px-2.5 py-1 text-[10px] font-medium text-[#0A183A]/50 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">{p.label}</button>
            ))}
          </div>
        </div>
      )}
      {data.triggerType === 'tire_eol_approaching' && (
        <div>
          <label className={labelCls}>Dias antes del fin de vida</label>
          <input type="number" value={(data.triggerConfig.daysThreshold as number) ?? 30} onChange={e => onUpdate({ triggerConfig: { ...data.triggerConfig, daysThreshold: parseInt(e.target.value) || 30 } })} className={inputCls} />
        </div>
      )}
      {data.triggerType === 'inspection_completed' && (
        <div className="rounded-lg bg-[#F8FAFC] px-3 py-2.5 text-[12px] text-[#0A183A]/50">Se activa al completar cualquier inspeccion.</div>
      )}
    </>
  );
}

const CALENDAR_VARS = [
  { key: '{{vehiclePlaca}}', label: 'Placa vehiculo' }, { key: '{{tirePlaca}}', label: 'ID llanta' },
  { key: '{{tireMarca}}', label: 'Marca' }, { key: '{{tireDiseno}}', label: 'Diseno' },
  { key: '{{tireDimension}}', label: 'Dimension' }, { key: '{{tireDepth}}', label: 'Profundidad' },
  { key: '{{tireAlertLevel}}', label: 'Nivel alerta' }, { key: '{{position}}', label: 'Posicion' },
  { key: '{{companyName}}', label: 'Empresa' }, { key: '{{date}}', label: 'Fecha' },
];
const EMAIL_VARS = [
  { key: '{{vehiclePlaca}}', label: 'Placa vehiculo' }, { key: '{{tireMarca}}', label: 'Marca' },
  { key: '{{tireDiseno}}', label: 'Diseno' }, { key: '{{tireDepth}}', label: 'Profundidad' },
  { key: '{{tireAlertLevel}}', label: 'Nivel alerta' }, { key: '{{tirePlaca}}', label: 'ID llanta' },
  { key: '{{position}}', label: 'Posicion' }, { key: '{{companyName}}', label: 'Empresa' }, { key: '{{date}}', label: 'Fecha' },
];

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
        <label className={labelCls}>Tipo de accion</label>
        <select value={data.actionType} onChange={e => setType(e.target.value)} className={inputCls}>
          {Object.entries(ACTION_LABELS).filter(([k]) => !HIDDEN_ACTION_TYPES.has(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {data.actionType === 'send_email' && <EmailActionForm data={data} onUpdate={onUpdate} />}
      {data.actionType === 'send_whatsapp' && (
        <div><label className={labelCls}>Numero WhatsApp</label>
          <input value={(data.actionConfig.to as string) ?? ''} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, to: e.target.value } })} placeholder="+573001234567" className={inputCls} /></div>
      )}
      {data.actionType === 'create_calendar_event' && (
        <>
          <div><label className={labelCls}>Titulo del evento</label>
            <input value={(data.actionConfig.summary as string) ?? ''} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, summary: e.target.value } })} className={inputCls} /></div>
          <div><label className={labelCls}>Descripcion</label>
            <textarea value={(data.actionConfig.description as string) ?? ''} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, description: e.target.value } })} rows={4} placeholder="Llanta {{tireMarca}} — {{tireDepth}}mm en {{vehiclePlaca}}" className={inputCls} /></div>
          <div><label className={labelCls}>Insertar variable</label>
            <div className="flex flex-wrap gap-1.5">{CALENDAR_VARS.map(v => (
              <button key={v.key} type="button" onClick={() => onUpdate({ actionConfig: { ...data.actionConfig, description: ((data.actionConfig.description as string) ?? '') + v.key } })}
                className="rounded-md border border-[#0A183A]/8 bg-[#F8FAFC] px-2 py-1 text-[10px] font-medium text-[#0A183A]/50 hover:border-[#A374FF]/30 hover:text-[#A374FF] hover:bg-[#A374FF]/5 transition-colors">{v.label}</button>
            ))}</div></div>
          <div><label className={labelCls}>Programar para (dias despues)</label>
            <input type="number" min={0} max={365} value={(data.actionConfig.delayDays as number) ?? 0} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, delayDays: parseInt(e.target.value) || 0 } })} className={inputCls} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[{ label: 'Mismo dia', v: 0 }, { label: 'Siguiente dia', v: 1 }, { label: 'En 3 dias', v: 3 }, { label: 'En 1 semana', v: 7 }, { label: 'En 1 mes', v: 30 }].map(p => (
                <button key={p.v} type="button" onClick={() => onUpdate({ actionConfig: { ...data.actionConfig, delayDays: p.v } })}
                  className={cn('rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors', (data.actionConfig.delayDays as number) === p.v ? 'border-[#A374FF]/40 bg-[#A374FF]/10 text-[#A374FF]' : 'border-[#0A183A]/8 text-[#0A183A]/40 hover:border-[#A374FF]/30 hover:text-[#A374FF]')}>{p.label}</button>
              ))}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Hora</label>
              <input type="number" min={0} max={23} value={(data.actionConfig.startHour as number) ?? 9} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, startHour: parseInt(e.target.value) || 0 } })} className={inputCls} />
              <p className="mt-1 text-[10px] text-[#0A183A]/30">0-23 (7=7AM, 14=2PM)</p></div>
            <div><label className={labelCls}>Minuto</label>
              <input type="number" min={0} max={59} value={(data.actionConfig.startMinute as number) ?? 0} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, startMinute: parseInt(e.target.value) || 0 } })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Duracion (minutos)</label>
            <input type="number" min={5} max={480} value={(data.actionConfig.durationMinutes as number) ?? 60} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, durationMinutes: parseInt(e.target.value) || 60 } })} className={inputCls} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[{ label: '15 min', v: 15 }, { label: '30 min', v: 30 }, { label: '1 hora', v: 60 }, { label: '2 horas', v: 120 }].map(p => (
                <button key={p.v} type="button" onClick={() => onUpdate({ actionConfig: { ...data.actionConfig, durationMinutes: p.v } })}
                  className={cn('rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors', (data.actionConfig.durationMinutes as number) === p.v ? 'border-[#A374FF]/40 bg-[#A374FF]/10 text-[#A374FF]' : 'border-[#0A183A]/8 text-[#0A183A]/40 hover:border-[#A374FF]/30 hover:text-[#A374FF]')}>{p.label}</button>
              ))}</div></div>
        </>
      )}
      {data.actionType === 'make_phone_call' && (
        <>
          <div><label className={labelCls}>Numero de telefono</label><input value={(data.actionConfig.to as string) ?? ''} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, to: e.target.value } })} placeholder="+573001234567" className={inputCls} /></div>
          <div><label className={labelCls}>Mensaje</label><textarea value={(data.actionConfig.message as string) ?? ''} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, message: e.target.value } })} rows={3} className={inputCls} /></div>
        </>
      )}
      {data.actionType === 'create_notification' && (
        <div><label className={labelCls}>Prioridad</label>
          <select value={(data.actionConfig.priority as number) ?? 2} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, priority: parseInt(e.target.value) } })} className={inputCls}>
            <option value={1}>Baja</option><option value={2}>Media</option><option value={3}>Alta</option>
          </select></div>
      )}
    </>
  );
}

type ReportBlock = { kind: string; title?: string; description?: string };
const BLOCK_ICONS: Record<string, string> = { table: 'T', kpis: 'K', bar: 'B', pie: 'P', line: 'L', gauge: 'G', callout: '!' };

function EmailActionForm({ data, onUpdate }: { data: ActionNodeData; onUpdate: (d: Partial<ActionNodeData>) => void }) {
  const bodyText = (data.actionConfig.body as string) ?? '';
  const subjectText = (data.actionConfig.subject as string) ?? 'Alerta TirePro';
  const reportBlocks = (data.actionConfig.reportBlocks as ReportBlock[]) ?? [];

  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const el = aiRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 80) + 'px'; }, [aiInput]);

  const handleAiReport = async () => {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true); setAiError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://api.tirepro.com.co';
      const res = await fetch(`${base}/api/automation/ai-report-builder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
        body: JSON.stringify({ description: aiInput.trim(), currentBlocks: reportBlocks.length ? reportBlocks : undefined }),
      });
      if (!res.ok) {
        setAiError(`Error del servidor (${res.status}). Intenta de nuevo.`);
        setAiLoading(false);
        return;
      }
      const result = await res.json();
      if (result.impossible) { setAiError(result.reason ?? 'No es posible generar este reporte.'); setAiLoading(false); return; }
      if (result.error) { setAiError(result.error); setAiLoading(false); return; }
      if (result.blocks && Array.isArray(result.blocks) && result.blocks.length > 0) {
        onUpdate({ actionConfig: { ...data.actionConfig, reportBlocks: result.blocks, subject: result.subject ?? subjectText } });
        setAiInput('');
      } else {
        setAiError('No se generaron secciones. Intenta ser mas especifico.');
      }
    } catch {
      setAiError('Error de conexion. Verifica tu internet e intenta de nuevo.');
    }
    setAiLoading(false);
  };

  const removeBlock = (idx: number) => {
    const next = reportBlocks.filter((_, i) => i !== idx);
    onUpdate({ actionConfig: { ...data.actionConfig, reportBlocks: next.length ? next : undefined } });
  };

  return (
    <>
      <div><label className={labelCls}>Destinatarios</label>
        <input value={(data.actionConfig.to as string) ?? ''} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, to: e.target.value } })} placeholder="admin@empresa.com, jefe@empresa.com" className={inputCls} />
        <p className="mt-1 text-[10px] text-[#0A183A]/30">Separa multiples emails con coma</p></div>

      <div><label className={labelCls}>Asunto</label>
        <input value={subjectText} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, subject: e.target.value } })} placeholder="Reporte semanal de flota" className={inputCls} /></div>

      <div><label className={labelCls}>Mensaje</label>
        <textarea value={bodyText} onChange={e => onUpdate({ actionConfig: { ...data.actionConfig, body: e.target.value } })} rows={3} placeholder="Adjunto el reporte semanal de tu flota." className={inputCls} /></div>

      <div><label className={labelCls}>Variables</label>
        <div className="flex flex-wrap gap-1.5">{EMAIL_VARS.map(v => (
          <button key={v.key} type="button" onClick={() => onUpdate({ actionConfig: { ...data.actionConfig, body: bodyText + v.key } })}
            className="rounded-md border border-[#0A183A]/8 bg-[#F8FAFC] px-2 py-1 text-[10px] font-medium text-[#0A183A]/50 hover:border-[#A374FF]/30 hover:text-[#A374FF] hover:bg-[#A374FF]/5 transition-colors">{v.label}</button>
        ))}</div></div>

      {/* AI Report Builder */}
      <div><label className={labelCls}>Contenido del reporte</label>
        <div className="rounded-xl border border-[#A374FF]/20 bg-[#A374FF]/[0.03] p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#0A183A] to-[#A374FF]">
              <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-white"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <span className="text-[11px] font-semibold text-[#0A183A]">Describe que incluir en el reporte</span>
          </div>
          <div className="flex items-end gap-2">
            <textarea ref={aiRef} value={aiInput} onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiReport(); } }}
              rows={2} placeholder="Ej: Tabla de llantas criticas con costo, marca y CPK. Grafica de inversion del mes. Llantas por marca."
              className="flex-1 resize-none rounded-lg border border-[#0A183A]/10 bg-white px-2.5 py-2 text-[12px] text-[#0A183A] placeholder:text-[#0A183A]/25 focus:border-[#A374FF] focus:outline-none" />
            <button type="button" onClick={handleAiReport} disabled={!aiInput.trim() || aiLoading}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${aiInput.trim() && !aiLoading ? 'bg-[#0A183A] text-white hover:bg-[#173D68]' : 'bg-[#0A183A]/5 text-[#0A183A]/15'}`}>
              {aiLoading ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
          </div>
          {aiLoading && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#A374FF]/5 px-3 py-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#A374FF]/20 border-t-[#A374FF]" />
              <span className="text-[11px] text-[#A374FF] font-medium">Generando reporte...</span>
            </div>
          )}
          {aiError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <p className="text-[11px] text-red-700 flex-1">{aiError}</p>
              <button type="button" onClick={() => setAiError(null)} className="shrink-0 text-red-300 hover:text-red-500">
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
          )}
          {!aiLoading && !aiError && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Tabla llantas criticas con CPK', 'KPIs resumen de flota', 'Pie chart alertas por nivel', 'Grafica inversion mensual'].map(s => (
                <button key={s} type="button" onClick={() => setAiInput(s)}
                  className="rounded-full border border-[#0A183A]/6 px-2 py-0.5 text-[9px] font-medium text-[#0A183A]/35 hover:border-[#A374FF]/30 hover:text-[#A374FF] transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report blocks list */}
      {reportBlocks.length > 0 && (
        <div><label className={labelCls}>Secciones del reporte ({reportBlocks.length})</label>
          <div className="space-y-2">{reportBlocks.map((block, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-lg border border-[#0A183A]/8 bg-[#F8FAFC] px-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#A374FF]/10 text-[10px] font-bold text-[#A374FF]">{BLOCK_ICONS[block.kind] ?? '?'}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-[#0A183A] truncate">{block.title ?? block.kind}</p>
                {block.description && <p className="text-[10px] text-[#0A183A]/40 truncate">{block.description}</p>}
              </div>
              <button type="button" onClick={() => removeBlock(i)} className="shrink-0 text-[#0A183A]/20 hover:text-red-500 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}</div>
        </div>
      )}

      {/* Preview */}
      <div><label className={labelCls}>Vista previa del reporte</label>
        <div className="rounded-lg border border-[#0A183A]/8 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#0A183A]/6 px-3 py-2" style={{ background: 'linear-gradient(135deg, #0A183A, #1E76B6)' }}>
            <div className="h-3 w-3 rounded-sm bg-white/20" />
            <span className="text-[10px] font-semibold text-white/80">TirePro</span>
            <span className="ml-auto text-[9px] text-white/40">Reporte</span>
          </div>
          <div className="p-3">
            {bodyText && bodyText.split('\n').map((line, i) => <p key={i} className="mb-1 text-[11px] text-[#0A183A]/60">{line || ' '}</p>)}
            {reportBlocks.length > 0 && (
              <div className="mt-2">
                <AnaBlocks blocks={reportBlocks as any} />
              </div>
            )}
            {!bodyText && reportBlocks.length === 0 && <p className="text-[10px] text-[#0A183A]/30 italic">Plantilla por defecto con datos de la llanta</p>}
            <div className="mt-3"><span className="inline-block rounded-md bg-[#0A183A] px-3 py-1 text-[10px] font-semibold text-white">Ver en TirePro</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
