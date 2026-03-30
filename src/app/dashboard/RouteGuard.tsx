"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Which company plans can access which route prefixes
const ROUTE_ACCESS: Record<string, { plans: string[]; roles?: string[] }> = {
  // Admin / fleet pages — pro or enterprise, admin role
  "/dashboard/resumen":      { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/analista":     { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/detalle":      { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/inventario":   { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/vehiculo":     { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/agregar":      { plans: ["pro", "enterprise"] },
  "/dashboard/buscar":       { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/desechos":     { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/semaforo":     { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/flota":        { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/trips":        { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/cupones":      { plans: ["pro", "enterprise"], roles: ["admin"] },
  "/dashboard/resumenMini":  { plans: ["pro", "enterprise", "basic"], roles: ["admin"] },

  // Distributor pages
  "/dashboard/distribuidor":   { plans: ["distribuidor"] },
  "/dashboard/analistaDist":   { plans: ["distribuidor"] },
  "/dashboard/pedidosDist":    { plans: ["distribuidor"] },
  "/dashboard/desechosDist":   { plans: ["distribuidor"] },
  "/dashboard/clientes":       { plans: ["distribuidor"] },
  "/dashboard/vehiculoDist":   { plans: ["distribuidor"] },
  "/dashboard/buscarDist":     { plans: ["distribuidor"] },
  "/dashboard/agregarDist":    { plans: ["distribuidor"] },
  "/dashboard/catalogoDist":   { plans: ["distribuidor"] },
};

// These routes are open to any logged-in user with a company
const OPEN_ROUTES = [
  "/dashboard/marketplace",
  "/dashboard/ajustes",
  "/dashboard/agregarConductor",
];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip the root /dashboard page (it has its own redirect logic)
    if (pathname === "/dashboard") { setAllowed(true); return; }

    // Open routes — just need a token
    if (OPEN_ROUTES.some((r) => pathname.startsWith(r))) {
      const token = localStorage.getItem("token");
      if (!token) { router.replace("/login"); return; }
      setAllowed(true);
      return;
    }

    // Find matching rule — sort by longest prefix first so /analistaDist matches before /analista
    const rule = Object.entries(ROUTE_ACCESS)
      .filter(([prefix]) => pathname.startsWith(prefix))
      .sort((a, b) => b[0].length - a[0].length)[0];
    if (!rule) {
      // Unknown route under /dashboard — allow (could be a card/component route)
      setAllowed(true);
      return;
    }

    const [, access] = rule;

    async function check() {
      try {
        const token = localStorage.getItem("token");
        const stored = localStorage.getItem("user");
        if (!token || !stored) { router.replace("/login"); return; }

        const user = JSON.parse(stored);
        if (!user.companyId) {
          // User without company trying to access dashboard
          router.replace("/marketplace");
          return;
        }

        // Check role if required
        if (access.roles && !access.roles.includes(user.role)) {
          redirectToHome(user);
          return;
        }

        // Fetch company plan
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/companies/${user.companyId}`
        );
        if (!res.ok) { router.replace("/login"); return; }
        const company = await res.json();

        if (!access.plans.includes(company.plan)) {
          redirectToHome(user, company.plan);
          return;
        }

        setAllowed(true);
      } catch {
        router.replace("/login");
      }
    }

    function redirectToHome(user: any, plan?: string) {
      const p = plan ?? "basic";
      if (p === "distribuidor") router.replace("/dashboard/distribuidor");
      else if (user.role === "admin" && (p === "pro" || p === "enterprise")) router.replace("/dashboard/resumen");
      else router.replace("/dashboard/agregarConductor");
    }

    check();
  }, [pathname, router]);

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1E76B6] rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
