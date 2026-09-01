interface StatCardProps {
  label: string;
  value: string | number;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-6 shadow-[var(--zcanopy-shadow)]">
      <p className="zc-kicker">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl text-[var(--zcanopy-card-brown)]">{value}</p>
    </div>
  );
}
