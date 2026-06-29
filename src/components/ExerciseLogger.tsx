"use client";

import { useMemo, useState } from "react";
import type { Exercise, LoggedSet, Hint } from "@/lib/types";
import Stepper from "@/components/Stepper";
import RestTimer from "@/components/RestTimer";
import { fmtSets, fmtWeight } from "@/lib/dates";

interface ExerciseLoggerProps {
  exercise: Exercise;
  sets: LoggedSet[]; // today's logged sets for this exercise
  lastSets: LoggedSet[] | null; // last session's working sets
  hint: Hint;
  onSetsChange: (sets: LoggedSet[]) => void;
}

const HINT_TEXT: Record<Hint, string> = {
  FIRST_TIME: "First time — set a baseline.",
  ADD_REPS: "Beat last time — add reps.",
  ADD_WEIGHT: "↑ Add weight today.",
};

const HINT_STYLE: Record<Hint, string> = {
  FIRST_TIME: "bg-surface-2 text-muted",
  ADD_REPS: "bg-amber-500/20 text-amber-300",
  ADD_WEIGHT: "bg-emerald-500/20 text-emerald-300",
};

export default function ExerciseLogger({
  exercise,
  sets,
  lastSets,
  hint,
  onSetsChange,
}: ExerciseLoggerProps) {
  const weightStep = exercise.weightStep ?? 5;

  // Pre-fill: most recent set logged THIS session, else last time's first
  // working set, else a sensible baseline (0 lb, bottom of rep range).
  const prefill = useMemo(() => {
    if (sets.length > 0) {
      const s = sets[sets.length - 1];
      return { weight: s.weight, reps: s.reps };
    }
    if (lastSets && lastSets.length > 0) {
      return { weight: lastSets[0].weight, reps: lastSets[0].reps };
    }
    return { weight: 0, reps: exercise.targetRepRange[0] };
    // Recompute only when identity of source changes meaningfully.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [weight, setWeight] = useState(prefill.weight);
  const [reps, setReps] = useState(prefill.reps);
  const [isWarmup, setIsWarmup] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [restSignal, setRestSignal] = useState(0);

  const weightLabel = exercise.isBodyweight ? "Added" : "Weight";
  const weightSuffix = exercise.isBodyweight ? "added lb" : "lb";

  const logSet = () => {
    const next: LoggedSet = isWarmup
      ? { weight, reps, isWarmup: true }
      : { weight, reps };
    if (editing !== null) {
      const updated = sets.slice();
      updated[editing] = next;
      onSetsChange(updated);
      setEditing(null);
    } else {
      onSetsChange([...sets, next]);
      setRestSignal((n) => n + 1); // auto-start rest timer
    }
  };

  const startEdit = (i: number) => {
    const s = sets[i];
    setWeight(s.weight);
    setReps(s.reps);
    setIsWarmup(Boolean(s.isWarmup));
    setEditing(i);
  };

  const deleteSet = (i: number) => {
    onSetsChange(sets.filter((_, idx) => idx !== i));
    if (editing === i) setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-5 pt-1">
      {/* TOP: last time + hint — the load-bearing info. */}
      <div className="rounded-2xl bg-surface p-4">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
          Last time
        </div>
        <div className="text-lg font-semibold tabular-nums">
          {lastSets && lastSets.length > 0 ? fmtSets(lastSets) : "— no history —"}
        </div>
        <div
          className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${HINT_STYLE[hint]}`}
        >
          {HINT_TEXT[hint]}
        </div>
      </div>

      {/* Steppers */}
      <div className="grid grid-cols-2 gap-3">
        <Stepper
          label={weightLabel}
          value={weight}
          step={weightStep}
          min={0}
          onChange={setWeight}
          suffix={weightSuffix}
        />
        <Stepper
          label="Reps"
          value={reps}
          step={1}
          min={0}
          onChange={setReps}
          suffix="reps"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={isWarmup}
          onChange={(e) => setIsWarmup(e.target.checked)}
          className="h-5 w-5 accent-amber-400"
        />
        Warm-up set (excluded from progression)
      </label>

      <button
        type="button"
        onClick={logSet}
        className="rounded-2xl bg-accent py-4 text-lg font-bold text-white active:scale-[0.98]"
      >
        {editing !== null ? "Save Set" : "Log Set"}
      </button>

      {/* Today's logged sets */}
      {sets.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Today
          </div>
          {sets.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                editing === i ? "bg-accent/20" : "bg-surface-2"
              }`}
            >
              <span className="w-6 text-center text-sm text-muted">{i + 1}</span>
              <span className="flex-1 tabular-nums text-base font-semibold">
                {fmtWeight(s.weight)}
                {exercise.isBodyweight ? " added" : " lb"} × {s.reps}
                {s.isWarmup ? (
                  <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300">
                    warm-up
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="rounded-lg bg-surface px-3 py-2 text-sm active:scale-95"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteSet(i)}
                className="rounded-lg bg-surface px-3 py-2 text-sm text-red-400 active:scale-95"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <RestTimer startSignal={restSignal} />
    </div>
  );
}
