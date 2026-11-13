'use client';

import { cloneElement, isValidElement, type MouseEvent, type ReactElement, useCallback } from 'react';
import { trackEvent, type AnalyticsEvent, type AnalyticsEventProps } from '@/lib/analytics';

interface TrackClickProps {
  /** The funnel or feature event to record. Must be a value from AnalyticsEvents. */
  event: AnalyticsEvent;
  /** Non-identifying properties to attach to the event. */
  data?: AnalyticsEventProps;
  /** A single clickable element (button or link) to wrap. */
  children: ReactElement<Record<string, unknown>>;
}

/**
 * Wraps a single clickable element with a tracking call, without touching its
 * own onClick or className. Works for buttons and links.
 */
export default function TrackClick({ event, data, children }: TrackClickProps) {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      trackEvent(event, data);
      const childProps = (children as ReactElement<{ onClick?: (e: MouseEvent) => void }>).props;
      childProps.onClick?.(e);
    },
    [event, data, children],
  );

  if (!isValidElement(children)) {
    return null;
  }

  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    onClick: handleClick,
  });
}
