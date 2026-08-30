'use client';

import { useEffect, useState } from 'react';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { Check, X } from 'lucide-react';
import { COLORS } from '@/lib/theme';

interface Tier {
  tier: string;
  name: string;
  price: number;
  currency: string;
  expiryDays: number;
  advantages: string[];
  limits: Record<string, number>;
}

interface PaymentForm {
  provider: string;
  phoneNumber: string;
  payeeName: string;
}

export default function BrokerSubscriptionPage() {
  const [activeTier, setActiveTier] = useState<string>('prop');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [subscribeSuccess, setSubscribeSuccess] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [payment, setPayment] = useState<PaymentForm>({
    provider: 'MTN',
    phoneNumber: '',
    payeeName: '',
  });
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    Promise.all([
      webApi.brokerSubscriptionDetails(token),
      webApi.subscriptionPackages(token),
    ])
      .then(([subData, pkgData]: any) => {
        setActiveTier(subData.subscriptionTier || 'prop');
        setExpiresAt(subData.subscriptionExpiresAt || null);
        setTiers(pkgData.tiers || []);
      })
      .catch(() => setError('Failed to load subscription data'))
      .finally(() => setLoading(false));
  }, []);

  const openPaymentDialog = (tier: string) => {
    setSelectedTier(tier);
    setPayment({ provider: 'MTN', phoneNumber: '', payeeName: '' });
    setPaymentError('');
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    if (!payment.phoneNumber.trim()) {
      setPaymentError('Please enter your mobile number');
      return;
    }

    setSubscribing(true);
    try {
      const res: any = await webApi.brokerSubscribe(token, {
        tier: selectedTier,
        phoneNumber: payment.phoneNumber.trim(),
        provider: payment.provider,
        payeeName: payment.payeeName.trim() || undefined,
      });
      if ((res as any).success) {
        setSubscribeSuccess(`Subscribed to ${selectedTier} successfully`);
        setActiveTier(selectedTier);
        setShowPaymentDialog(false);
      } else {
        setPaymentError((res as any).message || 'Subscription failed');
      }
    } catch {
      setPaymentError('Network error. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const activeTierData = tiers.find((t) => t.tier === activeTier) || tiers[0];
  const selectedTierData = tiers.find((t) => t.tier === selectedTier);

  const formatPrice = (tier: Tier) => {
    if (tier.price === 0) return 'Free';
    const grouped = tier.price.toString().replaceAll(/\d{1,3}(?=(\d{3})+(?!\d))/g, '$1,');
    return `${tier.currency} ${grouped}`;
  };

  const formatCountdown = () => {
    if (activeTier === 'prop' || !expiresAt) return 'Lifetime';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h remaining`;
  };

  if (loading) return <LoadingState label="Loading subscription" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Subscriptions</h2>
        <p className="text-gray-500">Manage your subscription plan and features.</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-[var(--zcanopy-card-brown)] to-[var(--zcanopy-primary)] p-5 shadow-sm text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Current Plan</h2>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">ACTIVE PLAN</p>
            <p className="text-3xl font-bold">{activeTierData?.name || 'Prop'}</p>
            <p className="text-white/80">{formatPrice(activeTierData || { price: 0, currency: 'UGX', tier: 'prop' })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white/80">
              {activeTier === 'prop' ? 'Free plan — no expiry' : 'Time remaining'}
            </p>
            <p className="text-2xl font-bold">{formatCountdown()}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3 text-center">
            <p className="text-xs text-white/70">Max Properties</p>
            <p className="text-lg font-bold">{activeTierData?.limits?.maxProperties ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 text-center">
            <p className="text-xs text-white/70">Photos/Property</p>
            <p className="text-lg font-bold">{activeTierData?.limits?.maxPhotosPerProperty ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 text-center">
            <p className="text-xs text-white/70">Videos/Property</p>
            <p className="text-lg font-bold">{activeTierData?.limits?.maxVideosPerProperty ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 text-center">
            <p className="text-xs text-white/70">Max Video Size</p>
            <p className="text-lg font-bold">{activeTierData?.limits?.maxVideoSizeMB ? `${activeTierData.limits.maxVideoSizeMB}MB` : '500MB'}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-[var(--zcanopy-card-brown)]">Available Plans</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {tiers.map((tier) => {
            const isActive = tier.tier === activeTier;
            return (
              <div
                key={tier.tier}
                className={`rounded-2xl border-2 p-5 transition-all ${
                  isActive ? 'border-[var(--zcanopy-primary)] shadow-md' : 'border-gray-100 bg-white shadow-sm'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-lg font-bold text-[var(--zcanopy-card-brown)]">{tier.name}</h4>
                  {isActive && (
                    <span className="rounded-full bg-[var(--zcanopy-primary)] px-3 py-1 text-xs font-semibold text-white">Active</span>
                  )}
                </div>
                <p className="mb-3 text-2xl font-bold" style={{ color: COLORS.primary }}>
                  {formatPrice(tier)}
                </p>
                <ul className="mb-4 space-y-1">
                  {tier.advantages.map((adv, idx) => (
                     <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                       <span className="mt-0.5 text-green-500"><Check className="h-4 w-4" /></span>
                       {adv}
                     </li>
                  ))}
                </ul>
                {!isActive && (
                  <button
                    onClick={() => openPaymentDialog(tier.tier)}
                    disabled={subscribing}
                    className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
                  >
                    {subscribing ? 'Processing...' : `Subscribe to ${tier.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {subscribeError && <p className="text-sm text-red-600">{subscribeError}</p>}
      {subscribeSuccess && <p className="text-sm text-green-600">{subscribeSuccess}</p>}

      {showPaymentDialog && selectedTierData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--zcanopy-card-brown)]">Complete Payment</h3>
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={subscribing}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">Plan</p>
              <p className="text-lg font-bold text-[var(--zcanopy-card-brown)]">{selectedTierData.name}</p>
              <p className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                {formatPrice(selectedTierData)}
              </p>
              {selectedTierData.expiryDays > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Valid for {selectedTierData.expiryDays} days
                </p>
              )}
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Payment Provider</label>
                <select
                  value={payment.provider}
                  onChange={(e) => setPayment({ ...payment, provider: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                >
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="AIRTEL">Airtel Money</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Mobile Number</label>
                <input
                  type="tel"
                  value={payment.phoneNumber}
                  onChange={(e) => setPayment({ ...payment, phoneNumber: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  placeholder="+256 7XX XXX XXX"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Payee Name (optional)</label>
                <input
                  type="text"
                  value={payment.payeeName}
                  onChange={(e) => setPayment({ ...payment, payeeName: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  placeholder="John Doe"
                />
              </div>

              {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}

              <button
                type="submit"
                disabled={subscribing}
                className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
              >
                {subscribing ? 'Processing...' : `Pay ${formatPrice(selectedTierData)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
