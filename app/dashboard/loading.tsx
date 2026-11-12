'use client';

import { useEffect } from 'react';
import ZLoadingIndicator from '@/components/ZLoadingIndicator';
import { COLORS } from '@/lib/theme';

/**
 * Route-level loading state for the console. The pages fetch their data on
 * mount, so this is what the broker sees while that is in flight.
 */
export default function DashboardLoading() {
  useEffect(() => {
    // Nothing to clean up: the pages own their own requests.
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <ZLoadingIndicator size={64} color={COLORS.primary} label="Loading" />
    </div>
  );
}
