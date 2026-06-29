"use client";

import { fmtWeight } from "@/lib/dates";

interface StepperProps {
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
  label: string;
  suffix?: string;
}

/**
 * Reusable ± stepper. No on-screen keyboard — big sweaty-thumb tap targets.
 * Values are clamped at `min` (default 0) and rounded to avoid float drift.
 */
export default function Stepper({
  value,
  step,
  min = 0,
  onChange,
  label,
  suffix,
}: StepperProps) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const dec = () => onChange(Math.max(min, round(value - step)));
  const inc = () => onChange(round(value + step));

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="flex items-stretch gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={dec}
          disabled={value <= min}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-3xl font-bold text-foreground active:scale-95 disabled:opacity-30"
        >
          −
        </button>
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-surface px-2 py-2 tabular-nums">
          <span className="text-4xl font-bold leading-none">
            {fmtWeight(value)}
          </span>
          {suffix ? (
            <span className="mt-1 text-xs text-muted">{suffix}</span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={inc}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-3xl font-bold text-foreground active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
