"use client";

import { useEffect, useRef, useState } from "react";
import { fmtClock } from "@/lib/dates";

interface RestTimerProps {
  /** Increments when a set is logged → auto-(re)start the count-up timer. */
  startSignal: number;
  /** Reference line in seconds (default 2:30). */
  targetSeconds?: number;
}

/**
 * Count-UP rest timer with a configurable reference line (default 150s = 2:30).
 * Auto-starts whenever startSignal changes. Subtle vibration when the target
 * is first crossed, if the device supports it.
 */
export default function RestTimer({
  startSignal,
  targetSeconds = 150,
}: RestTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number>(0);
  const vibratedRef = useRef(false);

  // Auto-start / restart on each logged set.
  useEffect(() => {
    if (startSignal === 0) return; // no set logged yet this mount
    startRef.current = Date.now();
    vibratedRef.current = false;
    setElapsed(0);
    setRunning(true);
  }, [startSignal]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(secs);
      if (!vibratedRef.current && secs >= targetSeconds) {
        vibratedRef.current = true;
        try {
          navigator.vibrate?.([120, 60, 120]);
        } catch {
          /* vibration unsupported — ignore */
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, targetSeconds]);

  const reachedTarget = elapsed >= targetSeconds;
  const pct = Math.min(100, (elapsed / targetSeconds) * 100);

  const start = () => {
    startRef.current = Date.now();
    vibratedRef.current = false;
    setElapsed(0);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Rest
        </span>
        <span className="text-xs text-muted">
          target {fmtClock(targetSeconds)}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`tabular-nums text-5xl font-bold leading-none ${
            reachedTarget ? "text-emerald-400" : "text-foreground"
          }`}
        >
          {fmtClock(elapsed)}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold active:scale-95"
          >
            {running ? "Restart" : "Start"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-muted active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>
      {/* Progress bar with the reference line. */}
      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            reachedTarget ? "bg-emerald-400" : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
