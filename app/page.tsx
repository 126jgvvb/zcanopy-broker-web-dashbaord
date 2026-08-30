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
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-[var(--zcanopy-surface)] p-8 shadow-sm">
        <div className="mb-8 text-center">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl font-bold text-xl shadow-lg"
            style={{ backgroundColor: COLORS.accentGold, color: COLORS.cardBrown }}
          >
            Z
          </span>
          <h1 className="mt-4 text-2xl font-bold text-[var(--zcanopy-card-brown)]">Broker Login</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your broker account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Broker Code / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Not a broker?{' '}
          <button onClick={() => router.push('/signup')} className="font-semibold underline" style={{ color: COLORS.primary }}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
