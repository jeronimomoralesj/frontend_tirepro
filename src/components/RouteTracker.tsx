"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!;

declare global {
  interface Window {
    dataLayer: unknown[]; // Changed from any[] to unknown[]
    gtag?: (
      command: string,
      targetId: string,
      parameters?: Record<string, string>
    ) => void; // Replaced any[] with specific parameter types
  }
}

export default function RouteTracker() {
  const pathname = usePathname();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      // skip the very first render
      isFirstLoad.current = false;
      return;
    }
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: pathname,
      });
    }
  }, [pathname]);

  return null;
}