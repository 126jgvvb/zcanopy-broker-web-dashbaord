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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">My Bookings</h2>
        <p className="text-gray-500">Track your property bookings.</p>
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
            {bookings.map((booking) => (
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
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="zc-table-empty">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
