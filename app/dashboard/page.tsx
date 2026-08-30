'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ZLoadingIndicator from '@/components/ZLoadingIndicator';
import { COLORS } from '@/lib/theme';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const storedRole = localStorage.getItem('zcanopy_role');
    if (storedRole === 'broker') {
      router.replace('/dashboard/broker');
    } else if (storedRole === 'customer') {
      router.replace('/dashboard/customer');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <ZLoadingIndicator size={48} color={COLORS.primary} label="Redirecting..." />
    </div>
  );
}
