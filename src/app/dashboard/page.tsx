'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function bootstrap() {
      // 1) Get the user from localStorage
      const stored = localStorage.getItem('user');
      if (!stored) {
        return router.replace('/login');
      }
      let user: { companyId?: string };
      try {
        user = JSON.parse(stored);
      } catch {
        return router.replace('/login');
      }

      const { companyId } = user;
      if (!companyId) {
        return router.replace('/login');
      }

      // 2) Fetch company via the shared cache — dedupes with the concurrent
      // sidebar + RouteGuard fetches that used to trip the 429 rate limit.
      try {
        const { fetchCompany } = await import('@/shared/fetchCompany');
        const company = await fetchCompany(companyId) as { plan: string };

        // 3) Route based on plan.
        //    - distribuidor  → distributor dashboard
        //    - marketplace   → public marketplace (no fleet to show)
        //    - plus | pro    → fleet resumen
        if (company.plan === 'distribuidor') {
          router.replace('/dashboard/distribuidor');
        } else if (company.plan === 'marketplace') {
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
