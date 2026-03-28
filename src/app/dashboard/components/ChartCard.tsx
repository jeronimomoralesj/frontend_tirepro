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
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(52,140,203,0.08)]">
        {Icon && <Icon className="h-4 w-4 text-[#348CCB]" />}
        <h3 className="text-sm font-black text-[#0A183A]">{title}</h3>
      </div>

      <div className="p-5 h-72">{children}</div>
    </div>
  );
}
