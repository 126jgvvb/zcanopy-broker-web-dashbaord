/**
 * Standard broker booking prices, grouped by the price band of the property
 * they apply to.
 *
 * These are a guide for the broker: the dashboard surfaces them as a
 * dropdown next to the booking fee so a fee that matches the property price
 * can be picked in one click. The broker is never restricted to them — the
 * fee field stays freely editable and a custom amount is always accepted.
 */
export interface StandardBookingFeeBand {
  /** Inclusive lower bound of the property price, in UGX. */
  minPrice: number;
  /** Inclusive upper bound of the property price, in UGX. */
  maxPrice: number;
  /** The standard broker booking fee for this price band, in UGX. */
  fee: number;
}

export const STANDARD_BOOKING_FEE_BANDS: StandardBookingFeeBand[] = [
  { minPrice: 100_000, maxPrice: 250_000, fee: 30_000 },
  { minPrice: 300_000, maxPrice: 450_000, fee: 40_000 },
  { minPrice: 500_000, maxPrice: 650_000, fee: 45_000 },
  { minPrice: 700_000, maxPrice: 800_000, fee: 50_000 },
  { minPrice: 850_000, maxPrice: 1_000_000, fee: 60_000 },
];

/** Formats a UGX amount for display, e.g. 30000 -> "30,000". */
export function formatUgx(amount: number): string {
  return amount.toLocaleString("en-US");
}

/** Short form of a price bound for the dropdown labels, e.g. 250000 -> "250K". */
export function formatPriceBound(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `${amount / 1_000}K`;
  return String(amount);
}

/**
 * Finds the standard booking fee band that a property price falls into.
 * Returns null when the price is outside every band (including the gaps
 * between them).
 */
export function findStandardBookingFeeBand(
  price: number | string | null | undefined,
): StandardBookingFeeBand | null {
  const value = typeof price === "string" ? Number(price.trim()) : price;
  if (!value || !Number.isFinite(value) || value <= 0) return null;
  return (
    STANDARD_BOOKING_FEE_BANDS.find(
      (band) => value >= band.minPrice && value <= band.maxPrice,
    ) ?? null
  );
}
