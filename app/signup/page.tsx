'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { webApi } from '@/lib/api';
import { IdCard } from 'lucide-react';
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
          <p className="text-sm font-medium text-[var(--zcanopy-card-brown)]">{label}</p>
      <label
        className={`flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition-colors ${
          preview ? 'border-[var(--zcanopy-primary)]' : 'border-gray-300 hover:border-[var(--zcanopy-primary)]'
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="text-gray-400">
            <IdCard className="mx-auto h-8 w-8" />
            <p className="mt-1 text-xs">Tap to upload</p>
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
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [otp, setOtp] = useState({ email: '', phone: '' });
  const [brokerCode, setBrokerCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!idFront || !idBack) {
      setError('Please upload both ID images');
      return;
    }

    setLoading(true);
    try {
      const [idFrontBase64, idBackBase64] = await Promise.all([toBase64(idFront), toBase64(idBack)]);

      const data = await webApi.registerBroker({
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        idFrontUrl: idFrontBase64,
        idBackUrl: idBackBase64,
      });
      if ((data as any).message && !(data as any).brokerId) {
        setError((data as any).message || 'Registration failed');
        return;
      }
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const sendData = await webApi.sendBrokerOtp({
        email: form.email,
        phoneNumber: form.phoneNumber,
      });
      if ((sendData as any).message && !(sendData as any).success) {
        setError((sendData as any).message || 'Failed to send OTP');
        return;
      }

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
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeComplete = async () => {
    setLoading(true);
    try {
      const data = await webApi.brokerSetup({
        brokerCode,
        password: form.password,
        deviceId: 'web-dashboard',
        brokerBrandName: form.brokerBrandName || undefined,
      });
      if (!(data as any).success) {
        setError((data as any).message || 'Setup failed');
        return;
      }

      localStorage.setItem('zcanopy_token', (data as any).token || (data as any).sessionToken);
      localStorage.setItem('zcanopy_role', 'broker');
      localStorage.setItem('zcanopy_user', JSON.stringify(data));
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(209,160,84,0.22),transparent_55%)]" />
      <div className="relative w-full max-w-lg rounded-3xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-9 shadow-[var(--zcanopy-shadow)]">
        <div className="mb-8 text-center">
          <span
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl font-[family-name:var(--font-cormorant)] text-3xl font-semibold shadow-lg"
            style={{ backgroundColor: COLORS.accentGold, color: COLORS.cardBrown }}
          >
            Z
          </span>
          <p className="zc-kicker mt-5">Get started</p>
          <h1 className="mt-1 text-4xl text-[var(--zcanopy-card-brown)]">Broker Registration</h1>
          <p className="mt-2 text-sm text-[var(--zcanopy-muted)]">Create your broker account to get started</p>
        </div>

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" value={form.fullName} onChange={update('fullName')} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" required />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={form.email} onChange={update('email')} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" required />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
              <input type="tel" value={form.phoneNumber} onChange={update('phoneNumber')} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" required />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IdUpload
                label="National ID — Front"
                file={idFront}
                preview={idFrontPreview}
                onSelect={pick(setIdFront, setIdFrontPreview)}
              />
              <IdUpload
                label="National ID — Back"
                file={idBack}
                preview={idBackPreview}
                onSelect={pick(setIdBack, setIdBackPreview)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={form.password} onChange={update('password')} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" required minLength={6} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" required minLength={6} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Broker Brand Name (optional)</label>
              <input type="text" value={form.brokerBrandName} onChange={update('brokerBrandName')} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" placeholder="Mutaasa Brokers" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
              {loading ? 'Please wait...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">Enter the OTPs sent to your email and phone.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email OTP</label>
              <input type="text" value={otp.email} onChange={(e) => setOtp((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone OTP</label>
              <input type="text" value={otp.phone} onChange={(e) => setOtp((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {step === 'welcome' && (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold text-[var(--zcanopy-card-brown)]">Your broker code is</p>
            <p className="text-3xl font-bold text-[var(--zcanopy-primary)]">{brokerCode}</p>
            <p className="text-sm text-gray-500">Save this code. You will need it to log in.</p>
            <button onClick={handleWelcomeComplete} disabled={loading} className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
              {loading ? 'Setting up...' : 'Go to Dashboard'}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={() => router.push('/')} className="font-semibold text-[var(--zcanopy-primary)] underline-offset-4 hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
