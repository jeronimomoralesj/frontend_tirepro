'use client';

import { useEffect, useState } from 'react';
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
      let user: { companyId?: string; role?: string };
      try {
        user = JSON.parse(stored);
      } catch {
        return router.replace('/login');
      }

      const { companyId, role } = user;
      if (!companyId) {
        return router.replace('/login');
      }

      // 2) Fetch your company to read its plan
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/companies/${companyId}`
        );
        if (!res.ok) throw new Error('fetch failed');
        const company = await res.json() as { plan: string };

        // 3) Route based on plan + role
        if (company.plan === 'mini') {
          router.replace('/dashboard/resumenMini');
        } else if (role === 'admin') {
          router.replace('/dashboard/resumen');
        } else {
          router.replace('/dashboard/agregarConductor');
        }
      } catch (err) {
        console.error(err);
        // If we can’t fetch the plan for some reason, bounce to login
        router.replace('/login');
      }
    }

    bootstrap();
  }, [router]);

  // nothing to render here
  return null;
}
