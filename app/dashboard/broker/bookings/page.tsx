'use client';

import { useEffect, useState } from 'react';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';

interface Booking {
  id: string;
  propertyTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string;
  status: string;
  amount: number;
  transactionCode?: string;
}

export default function BrokerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    webApi.brokerBookings(token)
      .then((data: any) => setBookings(data.bookings || []))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (bookingId: string, status: 'Approved' | 'Rejected') => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;
    setUpdating(bookingId);
    try {
      await webApi.brokerUpdateBookingStatus(token, bookingId, status);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <LoadingState label="Loading bookings" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      <div>
        <p className="zc-kicker">Schedule</p>
        <h2 className="mt-1 text-4xl text-[var(--zcanopy-card-brown)]">Bookings</h2>
        <p className="mt-1 text-[var(--zcanopy-muted)]">Manage your property bookings.</p>
      </div>

      <div className="zc-table-wrap">
        <table className="zc-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Phone</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="zc-table-primary">{booking.propertyTitle}</td>
                <td className="zc-table-muted">{booking.customerPhone}</td>
                <td className="zc-table-muted">{booking.date}</td>
                <td className="zc-table-muted">UGX {booking.amount.toLocaleString()}</td>
                <td>
                  <span className={`zc-badge ${booking.status === 'Approved' ? 'zc-badge-ok' : booking.status === 'Pending' ? 'zc-badge-pending' : 'zc-badge-bad'}`}>
                    {booking.status}
                  </span>
                </td>
                <td>
                  {booking.status === 'Pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateStatus(booking.id, 'Approved')}
                        disabled={updating === booking.id}
                        className="zc-link-ok disabled:opacity-50"
                      >
                        {updating === booking.id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => updateStatus(booking.id, 'Rejected')}
                        disabled={updating === booking.id}
                        className="zc-link-bad disabled:opacity-50"
                      >
                        {updating === booking.id ? '...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="zc-table-empty">
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
