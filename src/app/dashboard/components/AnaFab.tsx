'use client';

import Link from 'next/link';

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AnaFab() {
  return (
    <Link href="/chat" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 group">
      <span className="pointer-events-none absolute -inset-4 rounded-full opacity-40 blur-xl" style={{ background: 'radial-gradient(circle, rgba(163,116,255,0.4) 0%, transparent 70%)' }} />
      <span className="relative flex items-center gap-2.5 rounded-full bg-white px-5 py-3 shadow-lg ring-1 ring-[#0A183A]/[0.06] transition-all group-hover:shadow-xl" style={{ boxShadow: '0 8px 32px -8px rgba(163,116,255,0.25)' }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full shadow-md" style={{ background: 'linear-gradient(135deg, #0A183A, #A374FF)' }}>
          <SparkleIcon className="ai-sparkle h-4 w-4 text-white" />
        </span>
        <span className="text-[13px] font-semibold text-[#0A183A]">Pregúntale a Ana</span>
      </span>
    </Link>
  );
}
