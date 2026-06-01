'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
  subtitle?: string;
  index?: number;
}

export default function MetricCard({ label, value, trend, subtitle }: MetricCardProps) {
  const strVal = String(value);
  const textSize = strVal.length > 12 ? "text-lg" : strVal.length > 8 ? "text-xl" : "text-3xl";

  return (
    <div
      className="bg-white rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.98]"
      style={{
        border: '1px solid rgba(10,24,58,0.08)',
        boxShadow: '0 2px 12px -4px rgba(10,24,58,0.08)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-1 h-4 rounded-full"
          style={{ background: 'linear-gradient(180deg, #1E76B6, #A374FF)' }}
        />
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold truncate">{label}</p>
      </div>

      <p className={`${textSize} font-black text-[#0A183A] truncate`}>{value}</p>

      {trend && (
        <span
          className={`mt-1.5 inline-flex items-center gap-1 text-sm font-semibold ${
            trend.direction === 'up' ? 'text-emerald-500' : 'text-red-500'
          }`}
        >
          {trend.direction === 'up' ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {trend.value}%
        </span>
      )}

      {subtitle && <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>}
    </div>
  );
}
