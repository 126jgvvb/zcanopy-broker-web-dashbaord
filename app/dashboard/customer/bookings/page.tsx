'use client';

import { useEffect, useState } from 'react';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';

interface Booking {
  id: string;
  propertyTitle: string;
  customerName: string;
  date: string;
  status: string;
  amount: number;
}

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    webApi.customerBookings(token)
      .then((data: any) => setBookings(data.bookings || []))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading bookings" />;
  if (error) return <ErrorState message={error} />;

  const q = query.trim().toLowerCase();
  const filteredBookings = q
    ? bookings.filter((b) => {
        const title = (b.propertyTitle || '').toLowerCase();
        const amount = String(b.amount ?? '').toLowerCase();
        return title.includes(q) || amount.includes(q);
      })
    : bookings;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">My Bookings</h2>
        <p className="text-gray-500">Track your property bookings.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by property title or amount"
          className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white px-4 py-2.5 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--zcanopy-primary)] focus:ring-2 focus:ring-[var(--zcanopy-primary)]/20 sm:max-w-md"
          aria-label="Search bookings by property title or amount"
        />
      </div>

      <div className="zc-table-wrap">
        <table className="zc-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id}>
                <td className="zc-table-primary">{booking.propertyTitle}</td>
                <td className="zc-table-muted">{booking.date}</td>
                <td className="zc-table-muted">UGX {booking.amount.toLocaleString()}</td>
                <td>
                  <span className={`zc-badge ${booking.status === 'approved' ? 'zc-badge-ok' : booking.status === 'pending' ? 'zc-badge-pending' : 'zc-badge-bad'}`}>
                    {booking.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan={4} className="zc-table-empty">
                  {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
