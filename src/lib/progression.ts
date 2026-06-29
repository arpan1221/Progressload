import type { Exercise, LoggedSet, Session, Hint } from "@/lib/types";

/**
 * Local YYYY-MM-DD for "today" when not provided explicitly.
 * Uses local time (not UTC) so the gym-day boundary matches the user's clock.
 */
function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * The working sets (sets where !isWarmup) of the MOST RECENT session whose
 * date < today that contains this exercise with >= 1 working set.
 * Returns null if there is no such session.
 *
 * Notes:
 * - Today's session is intentionally excluded (date strictly before today).
 * - Warmup sets are excluded from the returned working sets.
 * - A session that contains the exercise but only with warmup sets does not
 *   count as history (it has 0 working sets) and is skipped.
 */
export function getLastWorkingSets(
  exerciseId: string,
  sessions: Session[],
  today: string = localToday()
): LoggedSet[] | null {
  // Candidate sessions strictly before today. ISO YYYY-MM-DD sorts lexically.
  const prior = sessions
    .filter((s) => s.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  for (const session of prior) {
    const logged = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!logged) continue;
    const working = logged.sets.filter((set) => !set.isWarmup);
    if (working.length >= 1) return working;
  }

  return null;
}

/**
 * Progression hint shown above the logging UI.
 * - FIRST_TIME: no prior working sets for this exercise.
 * - ADD_WEIGHT: EVERY last working set hit the top of the target rep range.
 * - ADD_REPS: there is history but not all sets reached the top of the range.
 */
export function getProgressionHint(
  exercise: Exercise,
  sessions: Session[],
  today?: string
): Hint {
  const last = getLastWorkingSets(exercise.id, sessions, today);
  if (!last || last.length === 0) return "FIRST_TIME";
  const [, top] = exercise.targetRepRange;
  const allHitTop = last.every((set) => set.reps >= top);
  return allHitTop ? "ADD_WEIGHT" : "ADD_REPS";
}
