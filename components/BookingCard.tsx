import { COLORS } from '@/lib/theme';

interface BookingCardProps {
  id: string;
  propertyTitle: string;
  customerName: string;
  date: string;
  status: string;
  amount: number;
}

export default function BookingCard({ id, propertyTitle, customerName, date, status, amount }: BookingCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[var(--zcanopy-surface)] p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-[var(--zcanopy-card-brown)]">{propertyTitle}</h4>
          <p className="text-sm text-gray-500">{customerName}</p>
          <p className="text-sm text-gray-500">{date}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[var(--zcanopy-card-brown)]">UGX {amount.toLocaleString()}</p>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status === 'Approved' ? 'bg-green-50 text-green-700' : status === 'Pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
