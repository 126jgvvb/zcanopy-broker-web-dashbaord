/* eslint-disable no-console */

/**
 * Privacy-first analytics via Umami.
 *
 * - No cookies, no localStorage identifiers, no device fingerprinting.
 * - Respects the browser's Do Not Track (DNT) setting.
 * - Does not run in development or on localhost unless
 *   NEXT_PUBLIC_UMAMI_ENABLE_DEV=true is set explicitly.
 * - Never sends PII: only funnel step names and non-identifying properties
 *   (a page section, the entry point, the chosen option).
 */

export const AnalyticsEvents = {
  SignupStarted: 'signup_started',
  SignupCompleted: 'signup_completed',
  WithdrawalRequested: 'withdrawal_requested',
  WithdrawalCompleted: 'withdrawal_completed',
  LandlordTitleSubmitted: 'landlord_title_submitted',
} as const;

/** The only event names the app is allowed to send. */
export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/** Non-identifying properties only — never emails, names, NINs or tokens. */
export type AnalyticsEventProps = Record<string, string | number | boolean>;

const IS_PROD = process.env.NODE_ENV === 'production';
const ENABLE_IN_DEV = process.env.NEXT_PUBLIC_UMAMI_ENABLE_DEV === 'true';

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const dnt =
    navigator.doNotTrack ??
    (typeof window !== 'undefined' ? (window as { doNotTrack?: string }).doNotTrack : undefined) ??
    (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack;
  return dnt === '1' || dnt === 'yes';
}

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (isDoNotTrackEnabled()) return false;
  if (!process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID) return false;
  if (!IS_PROD && !ENABLE_IN_DEV) return false;
  if (isLocalHost() && !ENABLE_IN_DEV) return false;
  return true;
}

/**
 * Tracks an event if Umami is available. Silently does nothing when the
 * script was blocked (ad blockers) or analytics is disabled, so callers never
 * need to guard.
 */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsEventProps): void {
  if (typeof window === 'undefined' || !isAnalyticsEnabled()) return;
  try {
    const umami = (window as unknown as { umami?: { track?: (...args: unknown[]) => void } }).umami;
    if (!umami?.track) return;
    umami.track(event, properties);
  } catch {
    // Analytics must never break the app.
  }
}

/** Declarative hook for attaching an event to any click/change handler. */
export function useTrackEvent(event: AnalyticsEvent, properties?: AnalyticsEventProps) {
  return () => trackEvent(event, properties);
}
