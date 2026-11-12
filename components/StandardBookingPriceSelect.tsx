"use client";

import {
  STANDARD_BOOKING_FEE_BANDS,
  findStandardBookingFeeBand,
  formatPriceBound,
  formatUgx,
} from "@/lib/standardBookingFees";

/**
 * Suggests the standard broker booking price for a property.
 *
 * The dropdown lists the standard price for the band the property price falls
 * into, so the broker can apply it with one click. It is only a suggestion —
 * the broker is never restricted to it, and the fee field next to it stays
 * freely editable.
 */
export default function StandardBookingPriceSelect({
  id,
  price,
  fee,
  onSelectFee,
  disabled,
}: {
  id: string;
  /** The property's price, used to work out which band applies. */
  price: string | number;
  /** The broker booking fee currently entered. */
  fee: string;
  /** Called with the chosen standard fee. */
  onSelectFee: (fee: string) => void;
  disabled?: boolean;
}) {
  const band = findStandardBookingFeeBand(price);
  const currentFee = Number(fee);
  const currentIsStandard = STANDARD_BOOKING_FEE_BANDS.some((b) => b.fee === currentFee);

  return (
    <div className="mt-3 rounded-xl border border-dashed border-[var(--zcanopy-border)] bg-[color-mix(in_srgb,var(--zcanopy-accent-gold)_8%,var(--zcanopy-surface))] p-3">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--zcanopy-card-brown)]">
        Standard booking price for this property price
      </label>

      {band ? (
        <>
          <select
            id={id}
            value={currentIsStandard ? String(band.fee) : ""}
            onChange={(e) => {
              if (e.target.value) onSelectFee(e.target.value);
            }}
            disabled={disabled}
            className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] px-4 py-2.5 text-sm text-[var(--zcanopy-card-brown)] shadow-sm disabled:opacity-50"
          >
            <option value="">Use UGX {formatUgx(band.fee)}</option>
            {STANDARD_BOOKING_FEE_BANDS.map((b) => (
              <option key={b.fee} value={String(b.fee)}>
                UGX {formatUgx(b.fee)} — for properties{" "}
                {formatPriceBound(b.minPrice)} – {formatPriceBound(b.maxPrice)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[var(--zcanopy-text-secondary)]">
            Standard for properties {formatPriceBound(band.minPrice)} –{" "}
            {formatPriceBound(band.maxPrice)}. You can still use any other amount.
          </p>
        </>
      ) : (
        <p className="text-[11px] text-[var(--zcanopy-text-secondary)]">
          {price
            ? "No standard booking price is set for this property price. You can use any amount."
            : "Enter the property price to see the standard booking price for its range."}
        </p>
      )}
    </div>
  );
}
