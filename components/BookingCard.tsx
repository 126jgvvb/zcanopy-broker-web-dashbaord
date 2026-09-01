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
    <div className="rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-5 shadow-[var(--zcanopy-shadow)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--zcanopy-shadow-hover)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-[family-name:var(--font-cormorant)] text-xl text-[var(--zcanopy-card-brown)]">{propertyTitle}</h4>
          <p className="mt-0.5 text-sm text-[var(--zcanopy-muted)]">{customerName}</p>
          <p className="text-sm text-[var(--zcanopy-muted)]">{date}</p>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-cormorant)] text-lg font-semibold text-[var(--zcanopy-card-brown)]">UGX {amount.toLocaleString()}</p>
          <span className={`mt-1.5 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${status === 'Approved' ? 'bg-emerald-50 text-emerald-800' : status === 'Pending' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
