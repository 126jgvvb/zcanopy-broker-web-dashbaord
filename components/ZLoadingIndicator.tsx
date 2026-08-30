"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS } from "@/lib/theme";

interface ZLoadingIndicatorProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  durationMs?: number;
  label?: string;
}

export default function ZLoadingIndicator({
  size = 64,
  color = COLORS.primary,
  strokeWidth = 6,
  durationMs = 1200,
  label,
}: ZLoadingIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = (elapsed % durationMs) / durationMs;
      setProgress(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs]);

  const pad = strokeWidth / 2 + 2;
  const w = size - pad * 2;

  const pathLength = w * 3;
  const drawPhase = Math.min(progress / 0.7, 1);
  const drawn = pathLength * drawPhase;
  const fadePhase = progress < 0.7 ? 1 : Math.max(0, 1 - (progress - 0.7) / 0.3);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="status"
        aria-label="Loading"
      >
        <path
          d={`M ${pad} ${pad} L ${size - pad} ${pad} L ${pad} ${size - pad} L ${size - pad} ${size - pad}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={pathLength - Math.max(0.1, drawn)}
          opacity={fadePhase}
        />
      </svg>
      {label ? (
        <p className="text-sm font-medium" style={{ color }}>
          {label}
        </p>
      ) : null}
    </div>
  );
}
