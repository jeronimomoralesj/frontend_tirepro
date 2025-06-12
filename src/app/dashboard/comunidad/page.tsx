'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CommunityLayout from './CommunityLayout';

export default function ComunidadPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string; companyId: string } | null>(null);

  useEffect(() => {
    async function bootstrap() {
      // Get the user from localStorage
      const stored = localStorage.getItem('user');
      if (!stored) {
        return router.replace('/login');
      }
      
      let userData: { companyId?: string; role?: string; name?: string };
      try {
        userData = JSON.parse(stored);
      } catch {
        return router.replace('/login');
      }

      const { companyId, role, name } = userData;
      if (!companyId) {
        return router.replace('/login');
      }

      setUser({ name: name || 'Usuario', role: role || 'user', companyId });
      setIsLoading(false);
    }

    bootstrap();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0A183A] to-[#1E76B6]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <CommunityLayout user={user} />;
}