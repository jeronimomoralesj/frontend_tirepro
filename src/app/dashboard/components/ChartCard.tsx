'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, icon: Icon, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 ${className}`}
      style={{
        border: '1px solid rgba(10,24,58,0.08)',
        boxShadow: '0 2px 12px -4px rgba(10,24,58,0.08)',
      }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(10,24,58,0.06)' }}
      >
        {Icon && (
          <div
            className="p-1.5 rounded-lg"
            style={{ background: 'rgba(163,116,255,0.08)' }}
          >
            <Icon className="h-3.5 w-3.5 text-[#A374FF]" />
          </div>
        )}
        <h3 className="text-sm font-bold text-[#0A183A]">{title}</h3>
      </div>

      <div className="p-5 h-72">{children}</div>
    </div>
  );
}
