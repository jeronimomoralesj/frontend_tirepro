type P = { className?: string; style?: React.CSSProperties };

export const BoltIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const RulerIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><path d="M21.7 6.7 17.3 2.3a1 1 0 0 0-1.4 0l-14 14a1 1 0 0 0 0 1.4l4.4 4.4a1 1 0 0 0 1.4 0l14-14a1 1 0 0 0 0-1.4ZM8 14l-2-2M11 11l-2-2M14 8l-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

export const ClockIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const HourglassIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><path d="M5 3h14M5 21h14M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const ClipboardIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="1.5" /><path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const EmailIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="m3 7 9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const WhatsAppIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" stroke="currentColor" strokeWidth="1.3" /><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l4.9-1.4A10 10 0 1 0 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const CalendarIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

export const PhoneIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const BellIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const GearIcon = ({ className, style }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} style={style}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

export const TRIGGER_ICON_MAP: Record<string, React.ComponentType<P>> = {
  tire_alert_level: BoltIcon,
  tire_depth_threshold: RulerIcon,
  scheduled_cron: ClockIcon,
  tire_eol_approaching: HourglassIcon,
  inspection_completed: ClipboardIcon,
};

export const ACTION_ICON_MAP: Record<string, React.ComponentType<P>> = {
  send_email: EmailIcon,
  send_whatsapp: WhatsAppIcon,
  create_calendar_event: CalendarIcon,
  make_phone_call: PhoneIcon,
  create_notification: BellIcon,
};

export const TEMPLATE_ICON_MAP: Record<string, React.ComponentType<P>> = {
  whatsapp: WhatsAppIcon,
  email: EmailIcon,
  calendar: CalendarIcon,
  notification: BellIcon,
  phone: PhoneIcon,
};
