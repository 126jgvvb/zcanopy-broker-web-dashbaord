"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = window.localStorage.getItem("zcanopy_cookie_consent");
      if (!consent) {
        setVisible(true);
      }
    }
  }, []);

  const accept = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("zcanopy_cookie_consent", "true");
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)]/95 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--zcanopy-muted)]">
          We use cookies to remember your session and improve your experience.
          By continuing, you agree to our cookie policy.
        </p>
        <button
          onClick={accept}
          className="rounded-full bg-[var(--zcanopy-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--zcanopy-primary-alt)]"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
