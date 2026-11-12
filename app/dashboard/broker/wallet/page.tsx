'use client';

import { useEffect, useState } from 'react';
import { webApi, type LandlordVerificationStatus } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { COLORS } from '@/lib/theme';
import LandlordTitleSearchForm from '@/components/LandlordTitleSearchForm';
import { AlertTriangle, CheckCircle, KeyRound } from 'lucide-react';

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export default function BrokerWalletPage() {
  const [wallet, setWallet] = useState<{ balance?: number; heldBalance?: number; currency?: string; walletId?: string; name?: string; minimumWithdrawal?: number } | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('MTN');
  const [payeeName, setPayeeName] = useState('');
  const [landlordStatus, setLandlordStatus] = useState<LandlordVerificationStatus | null>(null);

  // Landlord OTP withdrawal flow state
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otp, setOtp] = useState('');

  const reloadLandlordStatus = async (token: string) => {
    try {
      const status: any = await webApi.getLandlordDetailsStatus(token);
      setLandlordStatus(status || { status: 'unsubmitted' });
    } catch {
      setLandlordStatus({ status: 'unsubmitted' });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    Promise.all([
      webApi.brokerWallet(token),
      webApi.brokerWalletTransactions(token),
      webApi.getLandlordDetailsStatus(token).catch(() => ({ status: 'unsubmitted' })),
    ])
      .then(([walletData, txData, landlordData]: any) => {
        setWallet(walletData);
        setTransactions(txData.transactions || []);
        setLandlordStatus(landlordData || { status: 'unsubmitted' });
      })
      .catch(() => setError('Failed to load wallet data'))
      .finally(() => setLoading(false));
  }, []);

  const canWithdraw = landlordStatus?.status === 'approved';

  const handleSendOtp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!canWithdraw) {
      setWithdrawError('Your landlord & title details must be approved before withdrawing funds.');
      return;
    }

    setOtpSending(true);
    try {
      const token = localStorage.getItem('zcanopy_token');
      if (!token) return;

      const res: any = await webApi.requestWithdrawalOtp(token);
      if (res?.success) {
        setOtpSent(true);
        setWithdrawSuccess(res.message || 'An OTP has been sent to the landlord. Enter it to complete the withdrawal.');
      } else {
        setWithdrawError(res?.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!canWithdraw) {
      setWithdrawError('Your landlord & title details must be approved before withdrawing funds.');
      return;
    }

    if (!otp.trim()) {
      setWithdrawError('Enter the OTP that was sent to the landlord to authorise this withdrawal.');
      return;
    }

    const token = localStorage.getItem('zcanopy_token');
    if (!token || !wallet) return;

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    if (withdrawAmount < (wallet.minimumWithdrawal ?? 10000)) {
      setWithdrawError(`Minimum withdrawal is UGX ${(wallet.minimumWithdrawal ?? 10000).toLocaleString()}`);
      return;
    }
    if (withdrawAmount > (wallet.balance ?? 0)) {
      setWithdrawError('Insufficient balance');
      return;
    }

    setWithdrawing(true);
    try {
      const res: any = await webApi.brokerWithdraw(token, {
        amount: withdrawAmount,
        phoneNumber: phone,
        provider,
        payeeName: payeeName || undefined,
        otp: otp.trim(),
      });
      if ((res as any).success || (res as any).newBalance !== undefined) {
        setWithdrawSuccess('Withdrawal initiated successfully');
        setWallet((prev) => (prev ? { ...prev, balance: (res as any).newBalance ?? prev.balance } : prev));
        setAmount('');
        setPhone('');
        setPayeeName('');
        setOtp('');
        setOtpSent(false);
      } else {
        setWithdrawError((res as any).message || 'Withdrawal failed');
      }
    } catch (err) {
      // Show what the server actually said: a failed withdrawal must never be
      // mistaken for a successful one.
      setWithdrawError(
        err instanceof Error && err.message
          ? err.message
          : 'Withdrawal failed. Please try again.',
      );
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <LoadingState label="Loading wallet" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Wallet</h2>
        <p className="text-gray-500">Your earnings and payouts.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Available Balance">
          <p className="text-3xl font-bold text-[var(--zcanopy-primary)]">
            {wallet ? `UGX ${(wallet.balance ?? 0).toLocaleString()}` : 'UGX 0'}
          </p>
          <p className="text-sm text-gray-500">Wallet ID: {wallet?.walletId || '-'}</p>
        </Panel>
        <Panel title="Held in Escrow">
          <p className="text-3xl font-bold text-[var(--zcanopy-card-brown)]">
            {wallet ? `UGX ${(wallet.heldBalance ?? 0).toLocaleString()}` : 'UGX 0'}
          </p>
          <p className="text-sm text-gray-500">Booking funds awaiting customer approval — not withdrawable yet</p>
        </Panel>
        <Panel title="Currency">
          <p className="text-3xl font-bold text-[var(--zcanopy-card-brown)]">{wallet?.currency || 'UGX'}</p>
        </Panel>
        <Panel title="Minimum Withdrawal">
          <p className="text-3xl font-bold text-[var(--zcanopy-card-brown)]">
            {wallet?.minimumWithdrawal ? `UGX ${wallet.minimumWithdrawal.toLocaleString()}` : 'UGX 10,000'}
          </p>
        </Panel>
      </div>

      <Panel title="Landlord &amp; Title Verification">
        <LandlordTitleSearchForm
          initialStatus={landlordStatus}
          onSubmitted={() => {
            const token = localStorage.getItem('zcanopy_token');
            if (token) reloadLandlordStatus(token);
          }}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Withdraw Funds">
          {!canWithdraw && (
            <div className="mb-4 rounded-lg bg-orange-50 p-3">
              <p className="flex items-center gap-2 text-sm text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                Get your landlord &amp; title details approved to withdraw funds
              </p>
            </div>
          )}
          {canWithdraw && !otpSent && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-blue-50 p-3">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div className="space-y-2">
                <p className="text-sm text-blue-700">
                  Every withdrawal requires an OTP sent to the landlord (phone number or email on file).
                  Request the code, obtain it from the landlord, then complete the withdrawal.
                </p>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {otpSending ? 'Sending OTP…' : 'Send OTP to landlord'}
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount (UGX)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                placeholder="Enter amount"
                required
                min={(wallet?.minimumWithdrawal ?? 10000)}
                max={wallet?.balance || 0}
                disabled={!canWithdraw}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mobile Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                placeholder="+256 7XX XXX XXX"
                required
                disabled={!canWithdraw}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                disabled={!canWithdraw}
              >
                <option value="MTN">MTN Mobile Money</option>
                <option value="AIRTEL">Airtel Money</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Payee Name (optional)</label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                placeholder="John Doe"
                disabled={!canWithdraw}
              />
            </div>
            {otpSent && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Landlord OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center tracking-[0.3em] shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  placeholder="123456"
                  required
                />
                <p className="mt-1 text-xs text-[var(--zcanopy-muted)]">
                  Sent to the landlord&apos;s phone number or email on file. Valid for a few minutes.
                </p>
              </div>
            )}
            {withdrawError && <p className="text-sm text-red-600">{withdrawError}</p>}
            {withdrawSuccess && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {withdrawSuccess}
              </p>
            )}
            <button
              type="submit"
              disabled={withdrawing || !canWithdraw || !otpSent}
              className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
            >
              {withdrawing ? 'Processing...' : 'Withdraw'}
            </button>
          </form>
        </Panel>

        <Panel title="Recent Transactions" action={<span className="text-xs text-gray-400">Last {transactions.length} records</span>}>
          <div className="zc-table-wrap">
            <table className="zc-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="zc-table-primary capitalize">{tx.type}</td>
                    <td className="zc-table-muted">UGX {tx.amount.toLocaleString()}</td>
                    <td className="zc-table-muted" style={{ whiteSpace: 'normal' }}>{tx.reason}</td>
                    <td className="zc-table-muted">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="zc-table-empty">
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
