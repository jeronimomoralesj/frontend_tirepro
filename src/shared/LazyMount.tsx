"use client";

import React, { useEffect, useRef, useState } from "react";

// =============================================================================
// LazyMount — defer expensive subtree renders until the container scrolls into
// view (or close to it). After the first visibility, the subtree stays
// mounted — no thrash on scroll.
//
// Why it exists: the detalle dashboard has 12 cards, each running an
// O(n)-per-filter aggregation over up to 16k tires. Mounting all 12 at once
// blocks the main thread on every filter change. Wrapping each section in
// <LazyMount> means only the visible ~3 sections re-compute; the rest wait
// until the user scrolls toward them.
// =============================================================================

interface LazyMountProps {
  /** Content to render once the wrapper enters the viewport. */
  children: React.ReactNode;
  /** Placeholder height while waiting — keeps scroll position stable. */
  minHeight?: number | string;
  /**
   * Viewport margin for the IntersectionObserver. Positive = pre-mount
   * before the element enters the viewport. Default "400px" (~one screen).
   */
  rootMargin?: string;
  /** Force-mount immediately — useful for the first visible section. */
  eager?: boolean;
  /** Optional skeleton to render while waiting. */
  placeholder?: React.ReactNode;
  className?: string;
}

export default function LazyMount({
  children,
  minHeight = 320,
  rootMargin = "400px",
  eager = false,
  placeholder,
  className,
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(eager);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;

    // IntersectionObserver-based mount. Once the element has been seen at
    // least once, we tear down the observer and keep the children alive
    // so the user doesn't re-pay the render cost on subsequent scrolls.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div ref={ref} className={className} style={mounted ? undefined : { minHeight }}>
      {mounted
        ? children
        : placeholder ?? (
            <div
              className="flex items-center justify-center text-[#94a3b8] text-xs rounded-xl"
              style={{
                minHeight,
                background: "rgba(10,24,58,0.02)",
                border: "1px dashed rgba(52,140,203,0.15)",
              }}
            />
          )}
    </div>
  );
}
