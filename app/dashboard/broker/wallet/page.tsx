'use client';

import { useEffect, useState } from 'react';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { COLORS } from '@/lib/theme';

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export default function BrokerWalletPage() {
  const [wallet, setWallet] = useState<{ balance: number; currency: string; walletId: string; minimumWithdrawal?: number } | null>(null);
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

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    Promise.all([
      webApi.brokerWallet(token),
      webApi.brokerWalletTransactions(token),
    ])
      .then(([walletData, txData]: any) => {
        setWallet(walletData);
        setTransactions(txData.transactions || []);
      })
      .catch(() => setError('Failed to load wallet data'))
      .finally(() => setLoading(false));
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');
    const token = localStorage.getItem('zcanopy_token');
    if (!token || !wallet) return;

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    if (wallet.minimumWithdrawal && withdrawAmount < wallet.minimumWithdrawal) {
      setWithdrawError(`Minimum withdrawal is UGX ${wallet.minimumWithdrawal.toLocaleString()}`);
      return;
    }
    if (withdrawAmount > wallet.balance) {
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
      });
      if ((res as any).success || (res as any).newBalance !== undefined) {
        setWithdrawSuccess('Withdrawal initiated successfully');
        setWallet((prev) => (prev ? { ...prev, balance: (res as any).newBalance ?? prev.balance } : prev));
        setAmount('');
        setPhone('');
        setPayeeName('');
      } else {
        setWithdrawError((res as any).message || 'Withdrawal failed');
      }
    } catch {
      setWithdrawError('Network error. Please try again.');
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel title="Available Balance">
          <p className="text-3xl font-bold text-[var(--zcanopy-primary)]">
            {wallet ? `UGX ${wallet.balance.toLocaleString()}` : 'UGX 0'}
          </p>
          <p className="text-sm text-gray-500">Wallet ID: {wallet?.walletId || '-'}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Withdraw Funds">
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
                min={wallet?.minimumWithdrawal || 10000}
                max={wallet?.balance || 0}
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
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
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
              />
            </div>
            {withdrawError && <p className="text-sm text-red-600">{withdrawError}</p>}
            {withdrawSuccess && <p className="text-sm text-green-600">{withdrawSuccess}</p>}
            <button
              type="submit"
              disabled={withdrawing}
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
