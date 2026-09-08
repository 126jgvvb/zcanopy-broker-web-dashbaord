'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      callback: async (response: { credential?: string }) => {
        if (!response.credential) return;
        setGoogleLoading(true);
        try {
          const data = await webApi.brokerGoogleLogin(response.credential);
          const token = (data as any).token;
          if (!token) {
            setError('Google sign-in failed. Please try again.');
            return;
          }
          localStorage.setItem('zcanopy_token', token);
          localStorage.setItem('zcanopy_role', 'broker');
          localStorage.setItem('zcanopy_user', JSON.stringify(data));
          router.push('/dashboard');
        } catch {
          setError('Google sign-in failed. Please try again.');
        } finally {
          setGoogleLoading(false);
        }
      },
    });
    if (googleButtonRef.current) {
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        width: '100%',
        text: 'signin_with',
      });
    }
  }, []);

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
          <img
            src="/logo.svg"
            alt="ZCanopy"
            className="mx-auto h-14 w-14 object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
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

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--zcanopy-border)]" />
          <span className="text-xs text-[var(--zcanopy-muted)]">or</span>
          <div className="h-px flex-1 bg-[var(--zcanopy-border)]" />
        </div>

        <div ref={googleButtonRef} className="mt-4 flex justify-center" />
        {googleLoading && <p className="text-center text-sm text-gray-500">Signing in with Google...</p>}

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
