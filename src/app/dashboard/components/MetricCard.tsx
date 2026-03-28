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
    <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[#1E76B6] overflow-hidden">
      <p className="text-xs uppercase tracking-wider text-gray-400 truncate">{label}</p>

      <p className={`mt-1 ${textSize} font-black text-[#0A183A] truncate`}>{value}</p>

      {trend && (
        <span
          className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${
            trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {trend.direction === 'up' ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {trend.value}%
        </span>
      )}

      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
