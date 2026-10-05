'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { webApi, uploadToSpaces } from '@/lib/api';
import { IdCard, Eye, EyeOff } from 'lucide-react';
import { authErrorMessage } from '@/lib/api';
import { COLORS } from '@/lib/theme';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

function IdUpload({
  label,
  file,
  preview,
  onSelect,
}: {
  label: string;
  file: File | null;
  preview: string | null;
  onSelect: (file: File | null) => void;
}) {
  return (
    <div>
          <p className="text-xs font-medium text-[var(--zcanopy-card-brown)]">{label}</p>
      <label
        className={`flex h-16 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors ${
          preview ? 'border-[var(--zcanopy-primary)]' : 'border-gray-300 hover:border-[var(--zcanopy-primary)]'
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="text-gray-400">
            <IdCard className="mx-auto h-5 w-5" />
            <p className="mt-0.5 text-[11px]">Tap to upload</p>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        />
      </label>
      {file ? <p className="mt-1 truncate text-xs text-gray-400">{file.name}</p> : null}
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'otp' | 'welcome'>('details');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    brokerBrandName: '',
  });
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupBrandName, setSetupBrandName] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [otp, setOtp] = useState({ email: '', phone: '' });
  const [brokerCode, setBrokerCode] = useState('');
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
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
          const data = await webApi.registerBroker({
            fullName: '',
            email: '',
            phoneNumber: '',
            googleId: response.credential,
            idFrontUrl: '',
            idBackUrl: '',
          });
          if ((data as any).brokerCode) {
            router.push('/login');
          } else {
            setError('Google sign-up failed. Please try again.');
          }
        } catch {
          setError('Google sign-up failed. Please try again.');
        } finally {
          setGoogleLoading(false);
        }
      },
    });
    if (googleButtonRef.current) {
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        width: '100%',
        text: 'continue_with',
      });
    }
  }, []);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function pick(setFile: (f: File | null) => void, setPreview: (p: string | null) => void) {
    return (file: File | null) => {
      setFile(file);
      setPreview(file ? URL.createObjectURL(file) : null);
    };
  }

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!idFront || !idBack) {
      setError('Please upload both ID images');
      return;
    }

    setLoading(true);
    try {
      const [idFrontUrl, idBackUrl] = await Promise.all([
        uploadToSpaces(idFront, 'verification'),
        uploadToSpaces(idBack, 'verification'),
      ]);

      const data = await webApi.registerBroker({
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        idFrontUrl,
        idBackUrl,
      });
      if (!(data as any)?.success) {
        setError((data as any)?.message || 'Registration failed');
        return;
      }
      setResendMessage('Verification codes sent to your email and phone.');
      setStep('otp');
    } catch (err) {
      setError(authErrorMessage(err, 'registration details'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const verifyData = await webApi.verifyBrokerOtp({
        email: form.email,
        phoneNumber: form.phoneNumber,
        emailCode: otp.email,
        phoneCode: otp.phone,
      });
      if (!(verifyData as any).success) {
        setError((verifyData as any).message || 'OTP verification failed');
        return;
      }

      setBrokerCode((verifyData as any).brokerCode);
      setStep('welcome');
    } catch (err) {
      setError(authErrorMessage(err, 'verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setResendLoading(true);
    try {
      const sendData: any = await webApi.sendBrokerOtp({
        email: form.email,
        phoneNumber: form.phoneNumber,
      });
      if (!sendData?.success) {
        setResendMessage(sendData?.message || 'Could not resend codes.');
        return;
      }
      setResendMessage('New codes sent. Check your email and phone.');
      setOtp({ email: '', phone: '' });
    } catch (err) {
      setResendMessage(authErrorMessage(err, 'verification code'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleWelcomeComplete = async () => {
    setError('');
    
    if (setupPassword !== setupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!setupPassword || setupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await webApi.brokerSetup({
        brokerCode,
        password: setupPassword,
        deviceId: 'web-dashboard',
        brokerBrandName: setupBrandName || undefined,
      });
      if (!(data as any).success) {
        setError((data as any).message || 'Setup failed');
        return;
      }

      const loginData = await webApi.brokerEmailLogin(form.email, setupPassword);
      
      localStorage.setItem('zcanopy_token', (loginData as any).token);
      localStorage.setItem('zcanopy_role', 'broker');
      localStorage.setItem('zcanopy_user', JSON.stringify(loginData));
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(209,160,84,0.22),transparent_55%)]" />
      <div className="relative w-full max-w-sm rounded-3xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-6 shadow-[var(--zcanopy-shadow)]">
        <div className="mb-4 text-center">
          <img
            src="/logo.svg"
            alt="ZCanopy"
            className="mx-auto h-10 w-10 object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
          <p className="zc-kicker mt-3">Get started</p>
          <h1 className="mt-0.5 text-2xl text-[var(--zcanopy-card-brown)]">Broker Registration</h1>
          <p className="mt-1 text-xs text-[var(--zcanopy-muted)]">Create your broker account</p>
        </div>

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-3">
            <div ref={googleButtonRef} className="flex justify-center" />
            {googleLoading && <p className="text-center text-xs text-gray-500">Signing in with Google...</p>}

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Full Name</label>
              <input type="text" value={form.fullName} onChange={update('fullName')} className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 text-sm shadow-sm" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
              <input type="email" value={form.email} onChange={update('email')} className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 text-sm shadow-sm" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Phone Number</label>
              <input type="tel" value={form.phoneNumber} onChange={update('phoneNumber')} className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 text-sm shadow-sm" required />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <IdUpload
                label="ID Front"
                file={idFront}
                preview={idFrontPreview}
                onSelect={pick(setIdFront, setIdFrontPreview)}
              />
              <IdUpload
                label="ID Back"
                file={idBack}
                preview={idBackPreview}
                onSelect={pick(setIdBack, setIdBackPreview)}
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[var(--zcanopy-primary)] py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
              {loading ? 'Please wait...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-3">
            <p className="text-xs text-gray-500">Enter OTPs sent to your email and phone.</p>
            {resendMessage && <p className="text-xs text-gray-500">{resendMessage}</p>}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email OTP</label>
              <input type="text" value={otp.email} onChange={(e) => setOtp((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 text-sm shadow-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Phone OTP</label>
              <input type="text" value={otp.phone} onChange={(e) => setOtp((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 text-sm shadow-sm" required />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[var(--zcanopy-primary)] py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading}
              className="w-full text-xs font-medium text-[var(--zcanopy-primary)] underline-offset-4 hover:underline disabled:opacity-50"
            >
              {resendLoading ? 'Resending...' : "Didn't get the codes? Resend"}
            </button>
            {resendMessage && <p className="text-xs text-gray-500">{resendMessage}</p>}
          </form>
        )}

        {step === 'welcome' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--zcanopy-card-brown)]">Your broker code is</p>
            <p className="text-xl font-bold text-[var(--zcanopy-primary)]">{brokerCode}</p>
            <p className="text-xs text-gray-500">Create your password and brand name.</p>
            
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 pr-10 text-sm shadow-sm"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowSetupPassword((prev) => !prev)}
                  aria-label={showSetupPassword ? 'Hide passwords' : 'Show passwords'}
                  title={showSetupPassword ? 'Hide passwords' : 'Show passwords'}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-[var(--zcanopy-muted)] transition hover:bg-[color-mix(in_srgb,var(--zcanopy-primary)_12%,transparent)] hover:text-[var(--zcanopy-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zcanopy-primary)]/40"
                >
                  {showSetupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 pr-10 text-sm shadow-sm"
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowSetupPassword((prev) => !prev)}
                  aria-label={showSetupPassword ? 'Hide passwords' : 'Show passwords'}
                  title={showSetupPassword ? 'Hide passwords' : 'Show passwords'}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-[var(--zcanopy-muted)] transition hover:bg-[color-mix(in_srgb,var(--zcanopy-primary)_12%,transparent)] hover:text-[var(--zcanopy-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zcanopy-primary)]/40"
                >
                  {showSetupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Broker Brand Name (optional)</label>
              <input 
                type="text" 
                value={setupBrandName} 
                onChange={(e) => setSetupBrandName(e.target.value)} 
                className="w-full rounded-lg border border-[var(--zcanopy-border)] bg-white/70 px-3 py-2 text-sm shadow-sm" 
                placeholder="Mutaasa Brokers"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <button onClick={handleWelcomeComplete} disabled={loading} className="w-full rounded-lg bg-[var(--zcanopy-primary)] py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
              {loading ? 'Setting up & logging in...' : 'Complete Setup & Login'}
            </button>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-gray-500">
          Already have an account?{' '}
          <button onClick={() => router.push('/')} className="font-semibold text-[var(--zcanopy-primary)] underline-offset-4 hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
