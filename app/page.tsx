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
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState('');
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState('');
  const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
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
      const result = await webApi.login(email, password, 'broker');

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

  async function handleForgotPasswordSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setForgotPasswordMessage('');
    setLoading(true);
    try {
      const res = await webApi.sendForgotPasswordOtp(forgotPasswordEmail.trim());
      const data = res as any;
      if (!data.success) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      setForgotPasswordMessage(data.message || 'OTP sent to your email.');
      setForgotPasswordStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPasswordVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setForgotPasswordMessage('');
    setLoading(true);
    try {
      const res = await webApi.verifyForgotPasswordOtp(forgotPasswordEmail.trim(), forgotPasswordOtp.trim());
      const data = res as any;
      if (!data.valid) {
        throw new Error(data.message || 'Invalid OTP');
      }
      setForgotPasswordMessage('OTP verified. Set your new password.');
      setForgotPasswordStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setForgotPasswordMessage('');
    if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (forgotPasswordNewPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await webApi.resetPassword(forgotPasswordEmail.trim(), forgotPasswordNewPassword);
      const data = res as any;
      if (!data.success) {
        throw new Error(data.message || 'Failed to reset password');
      }
      setForgotPasswordMessage('Password reset successfully. You can now sign in.');
      setForgotPasswordMode(false);
      setForgotPasswordStep('email');
      setForgotPasswordEmail('');
      setForgotPasswordOtp('');
      setForgotPasswordNewPassword('');
      setForgotPasswordConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

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

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setForgotPasswordMode(true); setError(''); setForgotPasswordMessage(''); setForgotPasswordStep('email'); }}
              className="text-xs font-medium text-[var(--zcanopy-primary)] hover:underline"
            >
              Forgot password?
            </button>
          </div>

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

        {forgotPasswordMode && (
          <div className="mt-6 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--zcanopy-card-brown)]">Reset your password</h2>
            {forgotPasswordStep === 'email' && (
              <form onSubmit={handleForgotPasswordSendOtp} className="space-y-4">
                <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Email</label>
                <input
                  type="email"
                  required
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white px-4 py-3 shadow-sm outline-none transition focus:border-[var(--zcanopy-primary)] focus:ring-2 focus:ring-[var(--zcanopy-primary)]/30"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {forgotPasswordMessage && <p className="text-sm text-green-600">{forgotPasswordMessage}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
                <button type="button" onClick={() => { setForgotPasswordMode(false); setError(''); setForgotPasswordMessage(''); }} className="w-full text-sm font-medium text-[var(--zcanopy-muted)] hover:text-[var(--zcanopy-card-brown)]">
                  Back to login
                </button>
              </form>
            )}

            {forgotPasswordStep === 'otp' && (
              <form onSubmit={handleForgotPasswordVerifyOtp} className="space-y-4">
                <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Enter OTP sent to {forgotPasswordEmail}</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={forgotPasswordOtp}
                  onChange={(e) => setForgotPasswordOtp(e.target.value)}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white px-4 py-3 shadow-sm outline-none transition focus:border-[var(--zcanopy-primary)] focus:ring-2 focus:ring-[var(--zcanopy-primary)]/30"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {forgotPasswordMessage && <p className="text-sm text-green-600">{forgotPasswordMessage}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
                  {loading ? 'Verifying…' : 'Verify OTP'}
                </button>
                <button type="button" onClick={() => { setForgotPasswordStep('email'); setError(''); setForgotPasswordMessage(''); }} className="w-full text-sm font-medium text-[var(--zcanopy-muted)] hover:text-[var(--zcanopy-card-brown)]">
                  Back
                </button>
              </form>
            )}

            {forgotPasswordStep === 'reset' && (
              <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={forgotPasswordNewPassword}
                  onChange={(e) => setForgotPasswordNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white px-4 py-3 shadow-sm outline-none transition focus:border-[var(--zcanopy-primary)] focus:ring-2 focus:ring-[var(--zcanopy-primary)]/30"
                />
                <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={forgotPasswordConfirmPassword}
                  onChange={(e) => setForgotPasswordConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white px-4 py-3 shadow-sm outline-none transition focus:border-[var(--zcanopy-primary)] focus:ring-2 focus:ring-[var(--zcanopy-primary)]/30"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {forgotPasswordMessage && <p className="text-sm text-green-600">{forgotPasswordMessage}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        )}

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
