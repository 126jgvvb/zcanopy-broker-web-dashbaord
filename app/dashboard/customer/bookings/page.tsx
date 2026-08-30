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

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--zcanopy-surface)] shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {bookings.map((booking) => (
              <tr key={booking.id} className="transition-colors hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--zcanopy-card-brown)]">{booking.propertyTitle}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{booking.date}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">UGX {booking.amount.toLocaleString()}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${booking.status === 'approved' ? 'bg-green-50 text-green-700' : booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                    {booking.status}
                  </span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
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
