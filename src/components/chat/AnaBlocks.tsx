'use client';

import { Fragment, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export type AnaTone = 'good' | 'warn' | 'bad' | 'neutral' | 'info';

type KpisBlock = { kind: 'kpis'; title?: string; items: { label: string; value: string; hint?: string; tone?: AnaTone }[] };
type BarBlock = { kind: 'bar'; title?: string; unit?: string; orientation?: 'vertical' | 'horizontal'; data: { label: string; value: number; color?: string }[] };
type LineBlock = { kind: 'line'; title?: string; unit?: string; area?: boolean; data: { label: string; value: number }[] };
type PieBlock = { kind: 'pie'; title?: string; donut?: boolean; data: { label: string; value: number; color?: string }[] };
type TableBlock = { kind: 'table'; title?: string; columns: string[]; rows: (string | number)[][] };
type GaugeBlock = { kind: 'gauge'; title?: string; label?: string; value: number; max?: number; unit?: string; tone?: AnaTone };
type CalloutBlock = { kind: 'callout'; tone?: AnaTone; title?: string; text: string };
type CalendarBlock = { kind: 'calendar'; title?: string; date?: string; events: { summary: string; start: string; end: string }[] };
type CalendarPreviewBlock = { kind: 'calendarPreview'; title: string; date: string; time: string; startTimeISO: string; durationMinutes: number; description?: string; attendees?: string[]; conflicts?: string[] };

export type AnaBlock = KpisBlock | BarBlock | LineBlock | PieBlock | TableBlock | GaugeBlock | CalloutBlock | CalendarBlock | CalendarPreviewBlock;

const PALETTE = ['#1E76B6', '#0A183A', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#14b8a6'];

const TONE_COLOR: Record<AnaTone, string> = {
  good: '#10b981', warn: '#f59e0b', bad: '#ef4444', info: '#0ea5e9', neutral: '#1E76B6',
};
const TONE_TEXT: Record<AnaTone, string> = {
  good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-red-600', info: 'text-sky-600', neutral: 'text-[#1E76B6]',
};
const TONE_BG: Record<AnaTone, string> = {
  good: 'bg-emerald-50 border-emerald-200',
  warn: 'bg-amber-50 border-amber-200',
  bad: 'bg-red-50 border-red-200',
  info: 'bg-sky-50 border-sky-200',
  neutral: 'bg-blue-50 border-blue-200',
};

export default function AnaBlocks({ blocks }: { blocks: AnaBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="flex flex-col gap-3 mt-2">
      {blocks.map((b, i) => (
        <Fragment key={i}>{renderBlock(b)}</Fragment>
      ))}
    </div>
  );
}

function renderBlock(b: AnaBlock) {
  switch (b.kind) {
    case 'kpis': return <Kpis block={b} />;
    case 'bar': return <BarBlockView block={b} />;
    case 'line': return <LineBlockView block={b} />;
    case 'pie': return <PieBlockView block={b} />;
    case 'table': return <TableBlockView block={b} />;
    case 'gauge': return <GaugeBlockView block={b} />;
    case 'callout': return <CalloutBlockView block={b} />;
    case 'calendar': return <CalendarBlockView block={b} />;
    case 'calendarPreview': return <CalendarPreviewView block={b} />;
    default: return null;
  }
}

function Kpis({ block }: { block: KpisBlock }) {
  const items = Array.isArray(block.items) ? block.items : [];
  if (!items.length) return null;
  const cols = Math.min(items.length, 4);
  return (
    <Card title={block.title}>
      <div className="grid gap-px overflow-hidden rounded-lg bg-gray-100" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((k, i) => (
          <div key={i} className="flex flex-col gap-0.5 bg-white px-3 py-2.5">
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-gray-400">{k.label}</span>
            <span className={`text-[16px] font-semibold ${k.tone ? TONE_TEXT[k.tone] : 'text-[#0A183A]'}`}>{k.value}</span>
            {k.hint && <span className="text-[11px] text-gray-400">{k.hint}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function BarBlockView({ block }: { block: BarBlock }) {
  const data = Array.isArray(block.data) ? block.data : [];
  if (!data.length) return null;
  const horizontal = block.orientation === 'horizontal' || data.length > 5;
  const unit = block.unit || '';
  const longestLabel = Math.max(...data.map(d => (d.label || '').length));
  const yAxisWidth = horizontal ? Math.min(Math.max(longestLabel * 6.5, 60), 120) : (unit ? 60 : 48);
  const chartHeight = horizontal ? Math.max(220, data.length * 36 + 40) : 240;
  return (
    <Card title={block.title} subtitle={unit}>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 24, bottom: horizontal ? 8 : 28, left: horizontal ? 4 : 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={!horizontal} horizontal={horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: '#374151' }} width={yAxisWidth} tickLine={false} axisLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#374151', dy: 4 }} angle={data.length > 4 ? -35 : 0} textAnchor={data.length > 4 ? 'end' : 'middle'} interval={0} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} height={data.length > 4 ? 52 : 30} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={yAxisWidth} />
              </>
            )}
            <Tooltip cursor={{ fill: 'rgba(30,118,182,0.08)' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(v: number) => [`${v}${unit ? ' ' + unit : ''}`, '']} />
            <Bar dataKey="value" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} barSize={horizontal ? 20 : undefined} maxBarSize={48}>
              {data.map((d, i) => <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />)}
              <LabelList dataKey="value" position={horizontal ? 'right' : 'top'} style={{ fontSize: 11, fontWeight: 600, fill: '#374151' }} formatter={(v: number) => `${v}${unit ? ' ' + unit : ''}`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function LineBlockView({ block }: { block: LineBlock }) {
  const data = Array.isArray(block.data) ? block.data : [];
  if (!data.length) return null;
  const unit = block.unit || '';
  return (
    <Card title={block.title} subtitle={unit}>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} unit={unit ? ` ${unit}` : ''} width={unit ? 60 : 40} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(v: number) => [`${v}${unit ? ' ' + unit : ''}`, '']} />
            <Line type="monotone" dataKey="value" stroke="#1E76B6" strokeWidth={2.5} dot={{ r: 3, fill: '#1E76B6' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PieBlockView({ block }: { block: PieBlock }) {
  const data = Array.isArray(block.data) ? block.data : [];
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <Card title={block.title}>
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[180px,1fr]">
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={block.donut === false ? 0 : 42} outerRadius={72} paddingAngle={1}>
                {data.map((d, i) => <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-[12.5px]">
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color || PALETTE[i % PALETTE.length] }} />
                <span className="flex-1 text-gray-500">{d.label}</span>
                <span className="font-medium text-[#0A183A]">{d.value}</span>
                <span className="text-gray-400">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function TableBlockView({ block }: { block: TableBlock }) {
  const columns = Array.isArray(block.columns) ? block.columns : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  if (!columns.length || !rows.length) return null;
  return (
    <Card title={block.title} noPad>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-400">
            <tr>{columns.map((c, i) => <th key={i} className="px-3 py-2 font-medium">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100">
                {(Array.isArray(row) ? row : []).map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-600">{cell == null ? '' : String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GaugeBlockView({ block }: { block: GaugeBlock }) {
  if (typeof block.value !== 'number' || !Number.isFinite(block.value)) return null;
  const max = block.max ?? 100;
  const pct = Math.max(0, Math.min(1, block.value / max));
  const tone = block.tone ?? (pct >= 0.8 ? 'good' : pct >= 0.5 ? 'warn' : 'bad');
  const color = TONE_COLOR[tone];
  const C = 2 * Math.PI * 42;
  return (
    <Card title={block.title}>
      <div className="flex items-center gap-4">
        <div className="relative h-[110px] w-[110px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" stroke="#eef2f7" strokeWidth="10" fill="none" />
            <circle cx="50" cy="50" r="42" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-semibold text-[#0A183A]">{Math.round(pct * 100)}%</span>
            {block.unit && <span className="text-[10.5px] text-gray-400">{block.unit}</span>}
          </div>
        </div>
        {block.label && <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-gray-500">{block.label}</div>}
      </div>
    </Card>
  );
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
  if (!block.text) return null;
  const tone = block.tone ?? 'info';
  return (
    <div className={`rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${TONE_BG[tone]}`}>
      {block.title && <div className={`mb-0.5 text-[12px] font-semibold ${TONE_TEXT[tone]}`}>{block.title}</div>}
      <div className="text-gray-600">{block.text}</div>
    </div>
  );
}

function Card({ title, subtitle, children, noPad }: { title?: string; subtitle?: string; children: React.ReactNode; noPad?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#0A183A]/8 bg-white">
      {(title || subtitle) && (
        <div className="flex items-baseline justify-between gap-2 border-b border-[#0A183A]/6 px-4 py-2.5">
          {title && <span className="text-[12.5px] font-semibold text-[#0A183A]">{title}</span>}
          {subtitle && <span className="text-[11px] uppercase tracking-wider text-[#0A183A]/45">{subtitle}</span>}
        </div>
      )}
      <div className={noPad ? '' : 'p-3'}>{children}</div>
    </div>
  );
}

/* ═══════ Calendar block ═══════ */

function CalendarBlockView({ block }: { block: CalendarBlock }) {
  const dateLabel = block.date
    ? new Date(block.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  if (!block.events?.length) {
    return (
      <Card title={block.title ?? 'Calendario'} subtitle={dateLabel}>
        <div className="flex flex-col items-center py-6 text-center">
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-[#0A183A]/10 mb-2">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-[13px] font-medium text-[#0A183A]/40">Sin eventos</p>
          <p className="text-[11px] text-[#0A183A]/25 mt-0.5">Tu calendario está libre</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={block.title ?? 'Calendario'} subtitle={dateLabel} noPad>
      <div className="divide-y divide-[#0A183A]/5">
        {block.events.map((evt, i) => {
          const startDate = new Date(evt.start);
          const endDate = new Date(evt.end);
          const startStr = startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
          const endStr = endDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
          const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
          const hour = startDate.getHours();
          const color = hour < 12 ? '#1E76B6' : hour < 17 ? '#f59e0b' : '#8b5cf6';

          return (
            <div key={i} className="flex items-stretch gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors">
              {/* Time column */}
              <div className="flex flex-col items-center shrink-0 w-14">
                <span className="text-[13px] font-bold text-[#0A183A] tabular-nums">{startStr}</span>
                <span className="text-[10px] text-[#0A183A]/35 tabular-nums">{endStr}</span>
              </div>
              {/* Color bar */}
              <div className="w-[3px] shrink-0 rounded-full" style={{ background: color }} />
              {/* Content */}
              <div className="min-w-0 flex-1 py-0.5">
                <p className="text-[13px] font-semibold text-[#0A183A] truncate">{evt.summary}</p>
                <p className="text-[11px] text-[#0A183A]/40 mt-0.5">
                  {durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}m` : ''}` : `${durationMin}m`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ═══════ Calendar preview (confirm/cancel) ═══════ */

function CalendarPreviewView({ block }: { block: CalendarPreviewBlock }) {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'confirmed' | 'error'>('idle');
  const [resultMsg, setResultMsg] = useState('');
  const durationLabel = block.durationMinutes >= 60
    ? `${Math.floor(block.durationMinutes / 60)}h${block.durationMinutes % 60 > 0 ? ` ${block.durationMinutes % 60}m` : ''}`
    : `${block.durationMinutes}m`;

  const handleConfirm = async () => {
    setStatus('confirming');
    try {
      const res = await fetch(`${API_BASE}/ana/calendar/confirm`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: block.title,
          startTimeISO: block.startTimeISO,
          durationMinutes: block.durationMinutes,
          description: block.description,
          attendees: block.attendees,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResultMsg(data.message || 'Evento creado.');
      setStatus('confirmed');
    } catch {
      setResultMsg('No se pudo crear el evento. Intenta de nuevo.');
      setStatus('error');
    }
  };

  if (status === 'confirmed') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-600"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[13px] font-semibold text-emerald-700">Evento creado</span>
        </div>
        <p className="text-[13px] text-emerald-700/80">{resultMsg}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-[13px] text-red-700">{resultMsg}</p>
        <button type="button" onClick={handleConfirm} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-700 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-red-800 transition-colors">Reintentar</button>
      </div>
    );
  }

  return (
    <Card title="Nuevo evento" noPad>
      <div className="px-4 py-3 space-y-2.5">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A183A] to-[#A374FF]">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#0A183A]">{block.title}</p>
            <p className="text-[12px] text-[#0A183A]/50">{block.date}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F8FAFC] p-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#0A183A]/35">Hora</p>
            <p className="text-[13px] font-medium text-[#0A183A]">{block.time}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#0A183A]/35">Duración</p>
            <p className="text-[13px] font-medium text-[#0A183A]">{durationLabel}</p>
          </div>
        </div>

        {/* Attendees */}
        {block.attendees && block.attendees.length > 0 && (
          <div className="rounded-lg bg-[#F8FAFC] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#0A183A]/35 mb-1">Invitados</p>
            <div className="flex flex-wrap gap-1.5">
              {block.attendees.map(email => (
                <span key={email} className="inline-flex items-center gap-1 rounded-full bg-white border border-[#0A183A]/10 px-2.5 py-1 text-[11px] text-[#0A183A]/70">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-[#0A183A]/40"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts warning */}
        {block.conflicts && block.conflicts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-semibold text-amber-700 mb-0.5">Conflicto de horario</p>
            <p className="text-[12px] text-amber-700/80">Se cruza con: {block.conflicts.join(', ')}</p>
          </div>
        )}

        {/* Description preview */}
        {block.description && block.description.length > 30 && (
          <details className="group">
            <summary className="cursor-pointer text-[11px] font-medium text-[#A374FF] hover:text-[#A374FF]/80">Ver descripción del evento</summary>
            <div className="mt-1.5 rounded-lg bg-[#F8FAFC] p-3 text-[12px] text-[#0A183A]/60 whitespace-pre-line max-h-40 overflow-y-auto">{block.description}</div>
          </details>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-[#0A183A]/6 px-4 py-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={status === 'confirming'}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#0A183A] to-[#A374FF] py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === 'confirming' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          {status === 'confirming' ? 'Creando…' : 'Confirmar'}
        </button>
      </div>
    </Card>
  );
}
