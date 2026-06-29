import type { LoggedSet } from "@/lib/types";

/** Local YYYY-MM-DD for "today" (local time, not UTC). */
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO timestamp for "now" — used as updatedAt on every mutation. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Whole days between a YYYY-MM-DD date and today (local).
 * 0 = today, 1 = yesterday, etc. Negative clamped to 0.
 */
export function daysAgo(date: string, today: string = todayLocal()): number {
  const a = Date.parse(`${date}T00:00:00`);
  const b = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  const diff = Math.round((b - a) / 86_400_000);
  return diff < 0 ? 0 : diff;
}

/** Human label: "today" / "yesterday" / "N days ago". */
export function daysAgoLabel(date: string, today: string = todayLocal()): string {
  const n = daysAgo(date, today);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}

/** Trim trailing zeros from a weight (30.0 -> "30", 2.5 -> "2.5"). */
export function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : String(Number(w.toFixed(2)));
}

/** Format working sets inline, e.g. "30×5, 30×5, 30×5". */
export function fmtSets(sets: LoggedSet[]): string {
  return sets.map((s) => `${fmtWeight(s.weight)}×${s.reps}`).join(", ");
}

/** Format seconds as M:SS. */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}
