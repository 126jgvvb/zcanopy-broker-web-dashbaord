'use client';

import { useEffect, useState } from 'react';
import { webApi, uploadToSpaces } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { COLORS } from '@/lib/theme';
import { IdCard, Shield, AlertTriangle, CheckCircle, Clock, Upload } from 'lucide-react';

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

interface VerificationStatus {
  isVerified: boolean;
  idFrontUrl?: string;
  idBackUrl?: string;
  verificationStatus: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
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
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docError, setDocError] = useState('');
  const [docSuccess, setDocSuccess] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    Promise.all([
      webApi.brokerWallet(token),
      webApi.brokerWalletTransactions(token),
      webApi.getVerificationStatus(token),
    ])
      .then(([walletData, txData, verifyData]: any) => {
        setWallet(walletData);
        setTransactions(txData.transactions || []);
        setVerification(verifyData);
      })
      .catch(() => setError('Failed to load wallet data'))
      .finally(() => setLoading(false));
  }, []);

  const pick = (setFile: (f: File | null) => void, setPreview: (p: string | null) => void) => {
    return (file: File | null) => {
      setFile(file);
      setPreview(file ? URL.createObjectURL(file) : null);
    };
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError('');
    setDocSuccess('');
    
    if (!idFront || !idBack) {
      setDocError('Please upload both ID images');
      return;
    }

    setUploadingDocs(true);
    try {
      const [idFrontUrl, idBackUrl] = await Promise.all([
        uploadToSpaces(idFront, 'broker-docs'),
        uploadToSpaces(idBack, 'broker-docs'),
      ]);

      const token = localStorage.getItem('zcanopy_token');
      if (!token) return;

      const res: any = await webApi.submitVerificationDocuments(token, { idFrontUrl, idBackUrl });
      if (res.success) {
        setDocSuccess('Documents submitted successfully! Verification is in progress.');
        setVerification({ isVerified: false, verificationStatus: 'pending', idFrontUrl, idBackUrl });
        setIdFront(null);
        setIdBack(null);
        setIdFrontPreview(null);
        setIdBackPreview(null);
      } else {
        setDocError(res.message || 'Failed to submit documents');
      }
    } catch {
      setDocError('Network error. Please try again.');
    } finally {
      setUploadingDocs(false);
    }
  };

  const getVerificationBadge = () => {
    if (!verification) return null;
    const status = verification.verificationStatus;
    const configs = {
      unsubmitted: { color: 'bg-gray-100 text-gray-600', icon: AlertTriangle, text: 'Not Submitted' },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Under Review' },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Verified' },
      rejected: { color: 'bg-red-100 text-red-600', icon: AlertTriangle, text: 'Rejected' },
    };
    const config = configs[status as keyof typeof configs] || configs.unsubmitted;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.text}
      </span>
    );
  };

  const canWithdraw = verification?.verificationStatus === 'approved';

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!canWithdraw) {
      setWithdrawError('You must verify your identity before withdrawing funds.');
      return;
    }

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

      <Panel title="Document Verification" action={<div className="flex items-center gap-2">{getVerificationBadge()}</div>}>
        {verification?.verificationStatus === 'approved' ? (
          <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Identity Verified</p>
              <p className="text-sm text-green-600">Your documents have been approved. You can now withdraw funds.</p>
            </div>
          </div>
        ) : verification?.verificationStatus === 'pending' ? (
          <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Verification In Progress</p>
              <p className="text-sm text-yellow-600">Your documents are being reviewed. Withdrawals will be enabled once approved.</p>
            </div>
          </div>
        ) : verification?.verificationStatus === 'rejected' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Verification Rejected</p>
                <p className="text-sm text-red-600">Please upload clearer images of your ID documents.</p>
              </div>
            </div>
            <form onSubmit={handleDocUpload} className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Upload ID Documents</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">ID Front</p>
                  <label className={`flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${idFrontPreview ? 'border-[var(--zcanopy-primary)] bg-green-50' : 'border-gray-300 hover:border-[var(--zcanopy-primary)]'}`}>
                    {idFrontPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={idFrontPreview} alt="ID Front" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-gray-400">
                        <Upload className="mx-auto h-5 w-5" />
                        <p className="mt-1 text-xs">Upload</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(setIdFront, setIdFrontPreview)(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">ID Back</p>
                  <label className={`flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${idBackPreview ? 'border-[var(--zcanopy-primary)] bg-green-50' : 'border-gray-300 hover:border-[var(--zcanopy-primary)]'}`}>
                    {idBackPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={idBackPreview} alt="ID Back" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-gray-400">
                        <Upload className="mx-auto h-5 w-5" />
                        <p className="mt-1 text-xs">Upload</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(setIdBack, setIdBackPreview)(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </div>
              {docError && <p className="text-xs text-red-600">{docError}</p>}
              {docSuccess && <p className="text-xs text-green-600">{docSuccess}</p>}
              <button type="submit" disabled={uploadingDocs} className="w-full rounded-lg bg-[var(--zcanopy-primary)] py-2 text-sm font-medium text-white transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
                {uploadingDocs ? 'Uploading...' : 'Submit Documents'}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleDocUpload} className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-orange-50 p-3">
              <Shield className="h-6 w-6 text-orange-500" />
              <p className="text-sm text-orange-700">Verify your identity to enable withdrawals</p>
            </div>
            <p className="text-sm font-medium text-gray-700">Upload ID Documents</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">ID Front</p>
                <label className={`flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${idFrontPreview ? 'border-[var(--zcanopy-primary)] bg-green-50' : 'border-gray-300 hover:border-[var(--zcanopy-primary)]'}`}>
                  {idFrontPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={idFrontPreview} alt="ID Front" className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-gray-400">
                      <IdCard className="mx-auto h-5 w-5" />
                      <p className="mt-1 text-xs">Upload</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(setIdFront, setIdFrontPreview)(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">ID Back</p>
                <label className={`flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${idBackPreview ? 'border-[var(--zcanopy-primary)] bg-green-50' : 'border-gray-300 hover:border-[var(--zcanopy-primary)]'}`}>
                  {idBackPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={idBackPreview} alt="ID Back" className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-gray-400">
                      <IdCard className="mx-auto h-5 w-5" />
                      <p className="mt-1 text-xs">Upload</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(setIdBack, setIdBackPreview)(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
            {docError && <p className="text-xs text-red-600">{docError}</p>}
            {docSuccess && <p className="text-xs text-green-600">{docSuccess}</p>}
            <button type="submit" disabled={uploadingDocs} className="w-full rounded-lg bg-[var(--zcanopy-primary)] py-2 text-sm font-medium text-white transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50">
              {uploadingDocs ? 'Uploading...' : 'Submit Documents'}
            </button>
          </form>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Withdraw Funds">
          {!canWithdraw && (
            <div className="mb-4 rounded-lg bg-orange-50 p-3">
              <p className="flex items-center gap-2 text-sm text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                Verify your identity to withdraw funds
              </p>
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
                min={wallet?.minimumWithdrawal || 10000}
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
            {withdrawError && <p className="text-sm text-red-600">{withdrawError}</p>}
            {withdrawSuccess && <p className="text-sm text-green-600">{withdrawSuccess}</p>}
            <button
              type="submit"
              disabled={withdrawing || !canWithdraw}
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
