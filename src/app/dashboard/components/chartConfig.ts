import type { ChartOptions } from 'chart.js';

/* ── Brand palette ─────────────────────────────────────────────── */

export const COLORS = {
  primary:   '#0A183A',
  secondary: '#173D68',
  accent:    '#1E76B6',
  highlight: '#348CCB',

  /* 8 chart series — blues → teals → warm grays → amber accent */
  series: [
    '#348CCB', // bright blue
    '#1E76B6', // mid blue
    '#0F5A8E', // deep blue
    '#14B8A6', // teal
    '#0D9488', // dark teal
    '#64748B', // slate gray
    '#94A3B8', // cool gray
    '#F59E0B', // amber (warnings / attention)
  ] as const,

  success: '#22c55e',
  warning: '#f97316',
  danger:  '#ef4444',
} as const;

/* ── Chart.js global defaults ──────────────────────────────────── */

export const chartDefaults: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,

  animation: {
    duration: 800,
    easing: 'easeOutQuart',
  },

  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: COLORS.primary,
      padding: 12,
      cornerRadius: 8,
      borderWidth: 0,
      titleFont: { size: 12, weight: 'bold' },
      bodyFont:  { size: 12 },
    },
  },

  scales: {
    x: {
      grid:  { display: false },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 11 } },
    },
    y: {
      grid:  { display: false },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 11 } },
    },
  },

  elements: {
    line: { tension: 0.4, borderWidth: 2 },
    bar:  { borderRadius: 8 },
  },
};

/* ── Helpers ────────────────────────────────────────────────────── */

/** Canvas gradient for area-chart fills */
export function createGradient(
  ctx: CanvasRenderingContext2D,
  colorTop: string,
  colorBottom: string,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  return gradient;
}

/** Format number as Colombian pesos */
export function fmtCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Compact currency: $1.5M, $850K, $23K */
export function fmtCOPCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('es-CO')}`;
}

/** Format date for es-CO locale */
export function fmtDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
