'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] unhandled error:', error.name, error.digest ?? '');
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-[var(--zcanopy-card-brown)]">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-[var(--zcanopy-muted)]">
          The console hit an unexpected error. Reload the page to continue.
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
            href="/"
            className="rounded-xl border border-[var(--zcanopy-border)] px-5 py-2.5 text-sm font-semibold text-[var(--zcanopy-card-brown)] transition-colors hover:border-[var(--zcanopy-primary)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
