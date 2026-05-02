'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

/**
 * Fetch fresh user record off the JWT and reconcile it with localStorage.
 * This self-heals stale role/plan caches — e.g. admin → marketplace_tracker
 * promotions take effect on the next navigation instead of requiring a
 * full logout. Returns the freshest role + plan, or null if the call
 * fails (caller falls back to whatever localStorage already has).
 */
async function refreshUserFromServer(token: string): Promise<{
  role: string; companyId: string; plan: string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const fresh = await res.json();
    if (!fresh?.id) return null;
    // Mirror onto localStorage so sidebar + RouteGuard see the fresh
    // values on their next read. Preserves any extra fields we don't
    // touch (avatar settings, etc.).
    try {
      const stored = JSON.parse(localStorage.getItem('user') ?? '{}');
      localStorage.setItem('user', JSON.stringify({
        ...stored,
        id: fresh.id,
        email: fresh.email,
        name: fresh.name,
        role: fresh.role,
        companyId: fresh.companyId ?? '',
        userPlan: fresh.userPlan ?? stored.userPlan ?? 'free',
        company: fresh.company ?? stored.company ?? null,
      }));
    } catch { /* ignore — bootstrap can still proceed off the fresh response */ }
    return {
      role: fresh.role,
      companyId: fresh.companyId ?? '',
      plan: fresh.company?.plan ?? '',
    };
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function bootstrap() {
      // 1) Get the user from localStorage
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!stored || !token) {
        return router.replace('/login');
      }
      let user: { companyId?: string; role?: string };
      try {
        user = JSON.parse(stored);
      } catch {
        return router.replace('/login');
      }

      // 2) Re-read user record off the server so a stale cached role
      //    doesn't dictate routing. If /users/me fails we fall back to
      //    whatever's in localStorage — bootstrap shouldn't be blocked
      //    by a transient API hiccup.
      const fresh = await refreshUserFromServer(token);
      const role = fresh?.role ?? user.role;
      const companyId = fresh?.companyId || user.companyId;
      if (!companyId) {
        return router.replace('/login');
      }

      // 3) Catalog-scoped + marketplace_tracker roles each have a
      //    dedicated home — shortcut them before we fetch the company
      //    record. Saves a round-trip and stops the flash of
      //    /distribuidor they would've seen otherwise.
      if (role === 'catalogo' || role === 'catalogo_admin') {
        return router.replace('/dashboard/catalogoSku');
      }
      if (role === 'marketplace_tracker') {
        return router.replace('/dashboard/marketplace/perfil');
      }

      // 4) Fetch company via the shared cache — dedupes with the concurrent
      //    sidebar + RouteGuard fetches that used to trip the 429 rate limit.
      try {
        let plan = fresh?.plan ?? '';
        if (!plan) {
          const { fetchCompany } = await import('@/shared/fetchCompany');
          const company = await fetchCompany(companyId) as { plan: string };
          plan = company.plan;
        }
        // 5) Route based on plan.
        //    - distribuidor  → distributor dashboard
        //    - marketplace   → public marketplace (no fleet to show)
        //    - plus | pro    → fleet resumen
        if (plan === 'distribuidor') {
          router.replace('/dashboard/distribuidor');
        } else if (plan === 'marketplace') {
          router.replace('/marketplace');
        } else {
          router.replace('/dashboard/resumen');
        }
      } catch (err) {
        // Transient 429 / gateway errors shouldn't log the user out. Default
        // to the fleet resumen — RouteGuard will do its own check and can
        // show a friendly error if the plan really doesn't allow it.
        console.warn('dashboard bootstrap fetch failed, routing to /resumen', err);
        router.replace('/dashboard/resumen');
      }
    }

    bootstrap();
  }, [router]);

  // nothing to render here
  return null;
}
