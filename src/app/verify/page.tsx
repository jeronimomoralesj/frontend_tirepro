'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const [message, setMessage] = useState('Verifying your email...');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/verify?token=${token}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Verification failed');

        setStatus('success');
        setMessage('Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification failed. Try again later.');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712] text-white px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-semibold mb-4">
          {status === 'loading' && 'Verifying...'}
          {status === 'success' && '✅ Verified'}
          {status === 'error' && '❌ Verification Failed'}
        </h1>
        <p className="text-lg">{message}</p>
        {status === 'error' && (
          <button
            onClick={() => router.push('/auth/login')}
            className="mt-6 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}
