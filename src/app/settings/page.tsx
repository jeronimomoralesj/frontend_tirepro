"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BarChart3, ShoppingCart } from "lucide-react";

// Dynamically import the ajustes page component to avoid duplicating 1800 lines
const AjustesPage = React.lazy(() => import("../dashboard/ajustes/page"));

export default function SettingsPage() {
  const [hasCompany, setHasCompany] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      setHasCompany(!!user.companyId);
    } catch { /* */ }
    setLoading(false);
  }, []);

  if (loading) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Standalone nav — no sidebar */}
      <header className="sticky top-0 z-50 bg-white" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={hasCompany ? "/dashboard/resumen" : "/marketplace"} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#0A183A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{hasCompany ? "Plataforma" : "Marketplace"}</span>
          </Link>

          <div className="flex-1 flex justify-center">
            <Link href="/">
              <Image src="/logo_full.png" alt="TirePro" width={100} height={30} className="h-6 sm:h-7 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {hasCompany && (
              <Link href="/dashboard/resumen" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white bg-[#0A183A] hover:bg-[#173D68] transition-colors">
                <BarChart3 className="w-3 h-3" /> Plataforma
              </Link>
            )}
            <Link href="/marketplace" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0A183A] border border-gray-200 hover:bg-[#f0f7ff] transition-colors">
              <ShoppingCart className="w-3 h-3" /> Marketplace
            </Link>
          </div>
        </div>
      </header>

      {/* Content — renders the ajustes page without sidebar */}
      <div className="max-w-5xl mx-auto">
        <React.Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#1E76B6]/30 border-t-[#1E76B6] rounded-full animate-spin" />
          </div>
        }>
          <AjustesPage />
        </React.Suspense>
      </div>
    </div>
  );
}
