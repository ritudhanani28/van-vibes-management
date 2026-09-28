'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (role === 'CHEF') {
        router.replace('/chef');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, role, isLoading, router]);

  return (
    <div className="min-h-screen bg-brand-beige-light flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
    </div>
  );
}
