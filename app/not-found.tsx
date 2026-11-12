import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="zc-kicker">404</p>
        <h1 className="font-display mt-2 text-3xl text-[var(--zcanopy-card-brown)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-[var(--zcanopy-muted)]">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-[var(--zcanopy-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
