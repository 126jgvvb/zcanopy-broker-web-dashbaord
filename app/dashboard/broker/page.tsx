'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { webApi } from '@/lib/api';
import { Panel, StatCard, LoadingState, ErrorState } from '@/components/ui';
import { COLORS } from '@/lib/theme';

interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  location: string;
  isAvailable: boolean;
  createdAt: string;
  imageUrl?: string[];
}

interface Booking {
  id: string;
  propertyTitle: string;
  customerName: string;
  customerPhone: string;
  date: string;
  status: string;
  amount: number;
}

interface Subscription {
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
}

export default function BrokerDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    Promise.all([
      webApi.brokerProperties(token),
      webApi.brokerBookings(token),
      webApi.brokerSubscriptionDetails(token),
      webApi.brokerWallet(token),
    ])
      .then(([propsData, bookingsData, subData, walletData]: any) => {
        setProperties((propsData as any).properties || []);
        setBookings((bookingsData as any).bookings || []);
        setSubscription({
          subscriptionTier: (subData as any).subscriptionTier || 'prop',
          subscriptionExpiresAt: (subData as any).subscriptionExpiresAt || null,
        });
        setWalletBalance((walletData as any).balance || 0);
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading broker dashboard" />;
  if (error) return <ErrorState message={error} />;

  const tierName = subscription?.subscriptionTier?.toUpperCase() || 'PROP';

  const stats = [
    { label: 'Total Properties', value: properties.length },
    { label: 'Active Bookings', value: bookings.filter((b) => b.status === 'Pending').length },
    { label: 'Completed Bookings', value: bookings.filter((b) => b.status === 'Approved').length },
    { label: 'Total Revenue', value: `UGX ${bookings.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}` },
    { label: 'Wallet Balance', value: `UGX ${walletBalance.toLocaleString()}` },
    { label: 'Current Plan', value: tierName },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Broker Dashboard</h2>
        <p className="text-gray-500">Welcome back! Here is what is happening with your listings.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Recent Properties"
          action={
            <Link href="/dashboard/broker/properties" className="text-xs font-semibold hover:underline" style={{ color: COLORS.primary }}>
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {properties.slice(0, 5).map((property) => (
              <div key={property.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[var(--zcanopy-accent-gold)]">
                <div>
                  <p className="font-medium">{property.title}</p>
                  <p className="text-sm text-gray-500">{property.location}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${property.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {property.isAvailable ? 'Available' : 'Booked'}
                </span>
              </div>
            ))}
            {properties.length === 0 && <p className="text-sm text-gray-500">No properties yet.</p>}
          </div>
        </Panel>

        <Panel
          title="Recent Bookings"
          action={
            <Link href="/dashboard/broker/bookings" className="text-xs font-semibold hover:underline" style={{ color: COLORS.primary }}>
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[var(--zcanopy-accent-gold)]">
                <div>
                  <p className="font-medium">{booking.propertyTitle}</p>
                  <p className="text-sm text-gray-500">{booking.customerPhone}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.status === 'Approved' ? 'bg-green-50 text-green-700' : booking.status === 'Pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                  {booking.status}
                </span>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-sm text-gray-500">No bookings yet.</p>}
          </div>
        </Panel>

        <Panel
          title="Subscription"
          action={
            <Link href="/dashboard/broker/subscription" className="text-xs font-semibold hover:underline" style={{ color: COLORS.primary }}>
              Manage
            </Link>
          }
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">{tierName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Quick Actions"
          action={
            <Link href="/dashboard/broker/wallet" className="text-xs font-semibold hover:underline" style={{ color: COLORS.primary }}>
              Wallet
            </Link>
          }
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/broker/wallet"
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[var(--zcanopy-accent-gold)]"
            >
              <span className="font-medium">Withdraw Funds</span>
              <span className="text-sm text-gray-500">UGX {walletBalance.toLocaleString()}</span>
            </Link>
            <Link
              href="/dashboard/broker/subscription"
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[var(--zcanopy-accent-gold)]"
            >
              <span className="font-medium">Upgrade Plan</span>
              <span className="text-sm text-gray-500">{tierName}</span>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
