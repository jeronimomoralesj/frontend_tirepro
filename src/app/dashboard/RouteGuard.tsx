"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Which company plans + roles can access which route prefixes. `roles`
// is an allowlist (access only if user.role is in the list). `deniedRoles`
// is a blocklist (used to carve catalog-only roles out of the general
// distribuidor pages while still letting them hit /catalogoSku).
const CATALOG_ROLES = ["catalogo", "catalogo_admin"] as const;

const ROUTE_ACCESS: Record<string, { plans: string[]; roles?: string[]; deniedRoles?: string[] }> = {
  // Fleet pages — plus + pro tiers. Marketplace tier is intentionally
  // excluded (marketplace-only users have no fleet to manage — they
  // live on /marketplace). Admin-only destructive actions still gate
  // per-page (e.g. /agregar, /cupones).
  "/dashboard/resumen":      { plans: ["plus", "pro"] },
  "/dashboard/analista":     { plans: ["plus", "pro"] },
  "/dashboard/detalle":      { plans: ["plus", "pro"] },
  "/dashboard/inventario":   { plans: ["plus", "pro"] },
  "/dashboard/vehiculo":     { plans: ["plus", "pro"] },
  "/dashboard/agregar":      { plans: ["plus", "pro"], roles: ["admin"] },
  "/dashboard/buscar":       { plans: ["plus", "pro"] },
  "/dashboard/desechos":     { plans: ["plus", "pro"] },
  "/dashboard/semaforo":     { plans: ["plus", "pro"] },
  "/dashboard/flota":        { plans: ["plus", "pro"] },
  "/dashboard/trips":        { plans: ["plus", "pro"] },
  "/dashboard/cupones":      { plans: ["pro"], roles: ["admin"] },
  "/dashboard/resumenMini":  { plans: ["plus", "pro"] },

  // Distributor pages — visible to everyone on a distribuidor plan EXCEPT
  // catalog-scoped users (they only see /catalogoSku). Sidebar already
  // hides these links for catalog roles; this is the URL-typing defense.
  "/dashboard/distribuidor":   { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/analistaDist":   { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/pedidosDist":    { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/desechosDist":   { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/clientes":       { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/vehiculoDist":   { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/buscarDist":     { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/agregarDist":    { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/catalogoDist":   { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },
  "/dashboard/ventasDist":     { plans: ["distribuidor"], deniedRoles: [...CATALOG_ROLES] },

  // SKU catalog — the one distribuidor route catalog-roles can hit.
  "/dashboard/catalogoSku":    { plans: ["distribuidor"] },
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
      // Unknown route — allow for regular users (it's likely a shared
      // component / dynamic path). But DENY for catalog-scoped users:
      // they only have /catalogoSku plus OPEN_ROUTES, so an unknown path
      // almost certainly means they typed the URL of a surface they
      // shouldn't have access to. Bounce them back to catalogoSku.
      try {
        const stored = localStorage.getItem("user");
        const user = stored ? JSON.parse(stored) : null;
        if (user?.role === "catalogo" || user?.role === "catalogo_admin") {
          router.replace("/dashboard/catalogoSku");
          return;
        }
      } catch { /* fall through to optimistic allow */ }
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

        // Fetch company plan via the shared cache. Root /dashboard and
        // the sidebar ask for the same object in parallel — the dedupe
        // layer collapses them to one network call.
        const { fetchCompany } = await import("@/shared/fetchCompany");
        let company: { plan?: string };
        try {
          company = await fetchCompany(user.companyId);
        } catch {
          // Transient backend hiccup (429 / 5xx). Don't log the user out —
          // admit them optimistically; any invalid-token path will surface
          // itself via the next real API call.
          setAllowed(true);
          return;
        }
        const plan = company.plan ?? "pro";

        // Role gates — route to the user's home page for their plan +
        // role when they don't belong here. Two-sided check:
        //   `roles`       → allowlist (must include user.role)
        //   `deniedRoles` → blocklist (must NOT include user.role)
        // deniedRoles is how we carve catalog-only roles out of the rest
        // of the distribuidor surface without maintaining an allowlist
        // that drifts every time we add a new distribuidor role.
        if (access.roles && !access.roles.includes(user.role)) {
          redirectToHome(plan, user.role);
          return;
        }
        if (access.deniedRoles && access.deniedRoles.includes(user.role)) {
          redirectToHome(plan, user.role);
          return;
        }

        if (!access.plans.includes(plan)) {
          redirectToHome(plan, user.role);
          return;
        }

        setAllowed(true);
      } catch {
        router.replace("/login");
      }
    }

    function redirectToHome(plan: string, role?: string) {
      // Catalog-scoped roles land on the SKU catalog no matter the plan —
      // that's the only surface they have access to.
      if (role === "catalogo" || role === "catalogo_admin") {
        router.replace("/dashboard/catalogoSku");
        return;
      }
      if (plan === "distribuidor")      router.replace("/dashboard/distribuidor");
      else if (plan === "marketplace")  router.replace("/marketplace");
      else                              router.replace("/dashboard/resumen");
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
