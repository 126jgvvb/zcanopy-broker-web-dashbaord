'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { webApi } from '@/lib/api';
import { COLORS } from '@/lib/theme';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await webApi.brokerLogin(email, password);

      const token = (result as any).token;
      if (!token) {
        setError('Login failed');
        return;
      }

      localStorage.setItem('zcanopy_token', token);
      localStorage.setItem('zcanopy_role', 'broker');
      localStorage.setItem('zcanopy_user', JSON.stringify(result));

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(209,160,84,0.22),transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-9 shadow-[var(--zcanopy-shadow)]">
        <div className="mb-8 text-center">
          <span
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl font-[family-name:var(--font-cormorant)] text-3xl font-semibold shadow-lg"
            style={{ backgroundColor: COLORS.accentGold, color: COLORS.cardBrown }}
          >
            Z
          </span>
          <p className="zc-kicker mt-5">Broker console</p>
          <h1 className="mt-1 text-4xl text-[var(--zcanopy-card-brown)]">Welcome back</h1>
          <p className="mt-2 text-sm text-[var(--zcanopy-muted)]">Sign in to manage your listings.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Broker Code / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-3 shadow-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-3 shadow-sm"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-[var(--zcanopy-muted)]">
          Not a broker?{' '}
          <button onClick={() => router.push('/signup')} className="font-semibold text-[var(--zcanopy-primary)] underline-offset-4 hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
