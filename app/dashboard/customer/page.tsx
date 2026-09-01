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
  date: string;
  status: string;
  amount: number;
}

export default function CustomerDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token') || '';
    Promise.all([
      webApi.publicProperties(),
      webApi.customerBookings(token),
    ])
      .then(([propsData, bookingsData]: any) => {
        setProperties(propsData.properties || []);
        setBookings(bookingsData.bookings || []);
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading customer dashboard" />;
  if (error) return <ErrorState message={error} />;

  const stats = [
    { label: 'Listings Viewed', value: properties.length },
    { label: 'My Bookings', value: bookings.length },
    { label: 'Pending', value: bookings.filter((b) => b.status === 'pending').length },
    { label: 'Confirmed', value: bookings.filter((b) => b.status === 'approved').length },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="zc-kicker">Overview</p>
        <h2 className="mt-1 text-4xl text-[var(--zcanopy-card-brown)]">Customer Dashboard</h2>
        <p className="mt-1 text-[var(--zcanopy-muted)]">Explore properties and manage your bookings.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Featured Properties"
          action={
            <Link href="/dashboard/customer/properties" className="text-xs font-semibold hover:underline" style={{ color: COLORS.primary }}>
              Browse all
            </Link>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {properties.slice(0, 4).map((property) => (
              <div key={property.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[var(--zcanopy-accent-gold)]">
                <p className="font-medium">{property.title}</p>
                <p className="text-sm text-gray-500">{property.location}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${property.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {property.isAvailable ? 'Available' : 'Booked'}
                </span>
              </div>
            ))}
            {properties.length === 0 && <p className="text-sm text-gray-500">No listings found.</p>}
          </div>
        </Panel>

        <Panel
          title="My Bookings"
          action={
            <Link href="/dashboard/customer/bookings" className="text-xs font-semibold hover:underline" style={{ color: COLORS.primary }}>
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[var(--zcanopy-accent-gold)]">
                <div>
                  <p className="font-medium">{booking.propertyTitle}</p>
                  <p className="text-sm text-gray-500">{booking.date}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.status === 'approved' ? 'bg-green-50 text-green-700' : booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                  {booking.status}
                </span>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-sm text-gray-500">No bookings yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
