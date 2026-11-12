'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The message is logged for diagnostics, but it can hold request details,
    // so only the error name is reported.
    console.error('[dashboard] route error:', error.name, error.digest ?? '');
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h2 className="text-2xl text-[var(--zcanopy-card-brown)]">
        This section could not be loaded
      </h2>
      <p className="mt-2 text-sm text-[var(--zcanopy-muted)]">
        Something went wrong while loading the page. Your listings and bookings
        are unaffected — try again.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[var(--zcanopy-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-[var(--zcanopy-border)] px-5 py-2.5 text-sm font-semibold text-[var(--zcanopy-card-brown)] transition-colors hover:border-[var(--zcanopy-primary)]"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
