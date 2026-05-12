"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Which company plans + roles can access which route prefixes. `roles`
// is an allowlist (access only if user.role is in the list). `deniedRoles`
// is a blocklist (used to carve scoped roles out of broad sections while
// still letting them hit the few pages they belong on).
const CATALOG_ROLES = ["catalogo", "catalogo_admin"] as const;
// marketplace_tracker is distribuidor-scoped like CATALOG_ROLES but with
// a different home set: catalogoSku + the 3 /dashboard/marketplace/*
// operations pages. Same exclusion shape across the fleet/distribuidor
// surfaces (it has no business on Pedidos/Desechos/Gestión/Vehículos
// either).
const SCOPED_DIST_ROLES = [...CATALOG_ROLES, "marketplace_tracker"] as const;
// "Regular" users (viewer / legacy regular) are drivers — their entire
// surface is the inspection capture flow at /dashboard/agregarConductor.
// They have no business on fleet-manager or distribuidor pages, on any
// plan, so we deny them across both surfaces.
const REGULAR_ROLES = ["viewer", "regular"] as const;

interface RouteRule {
  plans: string[];
  roles?: string[];
  deniedRoles?: string[];
}

const ROUTE_ACCESS: Record<string, RouteRule> = {
  // Fleet pages — plus + pro tiers. Marketplace tier is intentionally
  // excluded (marketplace-only users have no fleet to manage — they
  // live on /marketplace). Admin-only destructive actions still gate
  // per-page (e.g. /agregar, /cupones).
  "/dashboard/resumen":      { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/analista":     { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/detalle":      { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/inventario":   { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/vehiculo":     { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/agregar":      { plans: ["plus", "pro"], roles: ["admin"] },
  "/dashboard/buscar":       { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/desechos":     { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/semaforo":     { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/flota":        { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/trips":        { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },
  "/dashboard/cupones":      { plans: ["pro"], roles: ["admin"] },
  "/dashboard/resumenMini":  { plans: ["plus", "pro"], deniedRoles: [...REGULAR_ROLES] },

  // Distributor pages — visible to everyone on a distribuidor plan EXCEPT
  // catalog/marketplace-tracker scoped users (they live on /catalogoSku
  // and /dashboard/marketplace/*). Sidebar already hides these links;
  // this is the URL-typing defense.
  "/dashboard/distribuidor":   { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/analistaDist":   { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/pedidosDist":    { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/desechosDist":   { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/clientes":       { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/vehiculoDist":   { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/buscarDist":     { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/agregarDist":    { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/catalogoDist":   { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },
  "/dashboard/ventasDist":     { plans: ["distribuidor"], deniedRoles: [...SCOPED_DIST_ROLES, ...REGULAR_ROLES] },

  // SKU catalog — distribuidor-only, but accessible to all distribuidor
  // roles (admin / catalogo / catalogo_admin / marketplace_tracker).
  "/dashboard/catalogoSku":    { plans: ["distribuidor"] },

  // Marketplace operations — distribuidor plan, admin or marketplace_tracker
  // only. Plain catalogo / catalogo_admin sales reps stay out — they're
  // hired to push product, not to manage the storefront. Longest-prefix
  // match logic below means these rules win over the broader
  // "/dashboard/marketplace" entry in OPEN_ROUTES.
  "/dashboard/marketplace/perfil":       { plans: ["distribuidor"], roles: ["admin", "marketplace_tracker"] },
  "/dashboard/marketplace/pedidos":      { plans: ["distribuidor"], roles: ["admin", "marketplace_tracker"] },
  "/dashboard/marketplace/productos":    { plans: ["distribuidor"], roles: ["admin", "marketplace_tracker"] },
  "/dashboard/marketplace/estadisticas": { plans: ["distribuidor"], roles: ["admin", "marketplace_tracker"] },
};

// Routes open to any logged-in user with a token. Includes the bare
// /dashboard/marketplace browser (fleet shoppers + everyone else can
// look around). The /dashboard/marketplace/<sub> rules above carve the
// distribuidor-only ops pages back out via longest-prefix match.
const OPEN_ROUTES = [
  "/dashboard/marketplace",
  "/dashboard/ajustes",
  "/dashboard/agregarConductor",
];

// Find the longest-prefix rule across BOTH ROUTE_ACCESS and OPEN_ROUTES.
// Without this, a more-specific guarded route (e.g. /marketplace/perfil)
// would lose to its broader open-route ancestor (/marketplace), letting
// any logged-in user past the gate.
function findMatch(
  pathname: string,
): { prefix: string; rule: RouteRule | "open" } | null {
  let best: { prefix: string; rule: RouteRule | "open" } | null = null;
  for (const [prefix, rule] of Object.entries(ROUTE_ACCESS)) {
    if (pathname.startsWith(prefix) && (!best || prefix.length > best.prefix.length)) {
      best = { prefix, rule };
    }
  }
  for (const prefix of OPEN_ROUTES) {
    if (pathname.startsWith(prefix) && (!best || prefix.length > best.prefix.length)) {
      best = { prefix, rule: "open" };
    }
  }
  return best;
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip the root /dashboard page (it has its own redirect logic)
    if (pathname === "/dashboard") { setAllowed(true); return; }

    const match = findMatch(pathname);

    // Open match (no role/plan gating) — only need a token.
    if (match && match.rule === "open") {
      const token = localStorage.getItem("token");
      if (!token) { router.replace("/login"); return; }
      setAllowed(true);
      return;
    }

    if (!match) {
      // Unknown route — allow for regular users (it's likely a shared
      // component / dynamic path). But DENY for scoped distribuidor
      // roles: their world is /catalogoSku + the marketplace ops pages,
      // so an unknown path almost certainly means they typed a URL of
      // a surface they shouldn't reach. Bounce them to their home.
      try {
        const stored = localStorage.getItem("user");
        const user = stored ? JSON.parse(stored) : null;
        const role = user?.role;
        if (role === "catalogo" || role === "catalogo_admin") {
          router.replace("/dashboard/catalogoSku");
          return;
        }
        if (role === "marketplace_tracker") {
          router.replace("/dashboard/marketplace/perfil");
          return;
        }
        if (role === "viewer" || role === "regular") {
          router.replace("/dashboard/agregarConductor");
          return;
        }
      } catch { /* fall through to optimistic allow */ }
      setAllowed(true);
      return;
    }

    const access = match.rule as RouteRule;

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
        // deniedRoles is how we carve scoped distribuidor roles out of
        // the rest of the distribuidor surface without maintaining an
        // allowlist that drifts every time we add a new role.
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
      // Scoped distribuidor roles each have a fixed home — that's where
      // their nav lives, so unauthorized URL hits land them somewhere
      // they actually have permission to be.
      if (role === "catalogo" || role === "catalogo_admin") {
        router.replace("/dashboard/catalogoSku");
        return;
      }
      if (role === "marketplace_tracker") {
        router.replace("/dashboard/marketplace/perfil");
        return;
      }
      if (role === "viewer" || role === "regular") {
        router.replace("/dashboard/agregarConductor");
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
