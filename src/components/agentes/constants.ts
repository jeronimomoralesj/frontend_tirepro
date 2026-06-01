import type { FlowTemplate } from './types';

export const TRIGGER_LABELS: Record<string, string> = {
  tire_alert_level: 'Nivel de alerta',
  tire_depth_threshold: 'Profundidad',
  scheduled_cron: 'Programado',
  tire_eol_approaching: 'Fin de vida',
  inspection_completed: 'Inspección',
};

export const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  tire_alert_level: 'Se activa cuando una llanta alcanza cierto nivel de alerta',
  tire_depth_threshold: 'Se activa al bajar de una profundidad mínima',
  scheduled_cron: 'Se ejecuta en un horario programado',
  tire_eol_approaching: 'Se activa cuando una llanta está por vencer',
  inspection_completed: 'Se activa al completar cualquier inspección',
};

export const ACTION_LABELS: Record<string, string> = {
  send_email: 'Email',
  send_whatsapp: 'WhatsApp',
  create_calendar_event: 'Calendar',
  make_phone_call: 'Llamada',
  create_notification: 'Notificación',
};

// Action channels we don't ship yet — kept in ACTION_LABELS so existing flows
// still render a label, but hidden from the action picker and the template
// list so users can't create new flows with them.
export const HIDDEN_ACTION_TYPES = new Set(['send_whatsapp', 'make_phone_call', 'create_notification']);

export const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  send_email: { color: '#1E76B6', bg: 'rgba(30,118,182,0.08)' },
  send_whatsapp: { color: '#25D366', bg: 'rgba(37,211,102,0.08)' },
  create_calendar_event: { color: '#EA4335', bg: 'rgba(234,67,53,0.08)' },
  make_phone_call: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  create_notification: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
};

export function getActionColor(actionType: string) {
  return ACTION_COLORS[actionType] ?? { color: '#0A183A', bg: 'rgba(10,24,58,0.05)' };
}

export function triggerSummary(type: string, config: Record<string, unknown>): string {
  if (type === 'tire_alert_level') {
    const levels = (config.alertLevels as string[]) ?? [];
    return levels.map(l => l === 'critical' ? 'Inmediato' : l === 'warning' ? '30 días' : l === 'watch' ? '60 días' : l).join(', ') || 'Sin niveles';
  }
  if (type === 'tire_depth_threshold') return `≤ ${config.thresholdMm ?? 2}mm`;
  if (type === 'scheduled_cron') return `${config.cron ?? config.cronExpression ?? ''}`;
  if (type === 'tire_eol_approaching') return `≤ ${config.daysThreshold ?? 30} días`;
  if (type === 'inspection_completed') return 'Cualquier inspección';
  return '';
}

export function actionSummary(type: string, config: Record<string, unknown>): string {
  if (type === 'send_email') return `${config.to ?? 'Sin destino'}`;
  if (type === 'send_whatsapp' || type === 'make_phone_call') return `${config.to ?? 'Sin destino'}`;
  if (type === 'create_calendar_event') return (config.summary as string) ?? (config.title as string) ?? 'Evento';
  if (type === 'create_notification') return `Prioridad ${config.priority ?? 2}`;
  return '';
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'critical-whatsapp',
    name: 'Alerta crítica por WhatsApp',
    description: 'Notifica por WhatsApp cuando una llanta requiere cambio inmediato',
    icon: 'whatsapp',
    triggerType: 'tire_alert_level',
    triggerConfig: { alertLevels: ['critical'] },
    actionType: 'send_whatsapp',
    actionConfig: { to: '' },
  },
  {
    id: 'weekly-email',
    name: 'Reporte semanal por email',
    description: 'Envía un resumen semanal del estado de la flota',
    icon: 'email',
    triggerType: 'scheduled_cron',
    triggerConfig: { cron: '0 8 * * 1' },
    actionType: 'send_email',
    actionConfig: { to: '', subject: 'Reporte semanal TirePro' },
  },
  {
    id: 'eol-calendar',
    name: 'Evento al acercarse fin de vida',
    description: 'Crea un evento en Calendar cuando una llanta está por vencer',
    icon: 'calendar',
    triggerType: 'tire_eol_approaching',
    triggerConfig: { daysThreshold: 30 },
    actionType: 'create_calendar_event',
    actionConfig: { summary: 'Llanta próxima a vencer', durationMinutes: 30 },
  },
  {
    id: 'inspection-notification',
    name: 'Notificación post-inspección',
    description: 'Notifica al equipo cuando se completa una inspección',
    icon: 'notification',
    triggerType: 'inspection_completed',
    triggerConfig: {},
    actionType: 'create_notification',
    actionConfig: { priority: 2 },
  },
  {
    id: 'depth-email',
    name: 'Alerta de profundidad por email',
    description: 'Email cuando la profundidad baja de un umbral',
    icon: 'email',
    triggerType: 'tire_depth_threshold',
    triggerConfig: { thresholdMm: 3 },
    actionType: 'send_email',
    actionConfig: { to: '', subject: 'Alerta profundidad: {{tire.placa}}' },
  },
];
