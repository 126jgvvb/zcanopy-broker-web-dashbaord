"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import ZLoadingIndicator from "./ZLoadingIndicator";
import { COLORS } from "@/lib/theme";

type Fetcher<T> = (token: string) => Promise<T>;

export function useDashboardData<T>(fetcher: Fetcher<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("zcanopy_token") || "" : "";
    fetcherRef.current(token)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}

export function Panel({
  title,
  action,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-6 shadow-[var(--zcanopy-shadow)]">
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-xl text-[var(--zcanopy-card-brown)]">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-6 shadow-[var(--zcanopy-shadow)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--zcanopy-shadow-hover)]">
      <p className="zc-kicker">
        {label}
      </p>
      <p className="mt-3 font-[family-name:var(--font-cormorant)] text-3xl font-semibold tracking-tight text-[var(--zcanopy-card-brown)]">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-[var(--zcanopy-muted)]">{hint}</p> : null}
    </div>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <ZLoadingIndicator size={56} color={COLORS.primary} label={label} />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3.5 text-sm text-red-700">
      {message}
    </div>
  );
}
