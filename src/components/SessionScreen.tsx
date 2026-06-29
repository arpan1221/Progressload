"use client";

import { useState } from "react";
import type { Session, LoggedSet, Hint } from "@/lib/types";
import { getTemplate, getExercise } from "@/config/templates";
import { getLastWorkingSets, getProgressionHint } from "@/lib/progression";
import ExerciseLogger from "@/components/ExerciseLogger";
import { fmtSets } from "@/lib/dates";

interface SessionScreenProps {
  session: Session;
  allSessions: Session[]; // for the "last time" lookup (today excluded by date)
  onUpdateSession: (session: Session) => void;
  onFinish: () => void;
}

const HINT_PILL: Record<Hint, string> = {
  FIRST_TIME: "bg-surface-2 text-muted",
  ADD_REPS: "bg-amber-500/20 text-amber-300",
  ADD_WEIGHT: "bg-emerald-500/20 text-emerald-300",
};

const HINT_SHORT: Record<Hint, string> = {
  FIRST_TIME: "First time",
  ADD_REPS: "Add reps",
  ADD_WEIGHT: "↑ Add weight",
};

export default function SessionScreen({
  session,
  allSessions,
  onUpdateSession,
  onFinish,
}: SessionScreenProps) {
  const template = getTemplate(session.templateId);
  const [expanded, setExpanded] = useState<string | null>(
    template?.exerciseIds[0] ?? null
  );

  if (!template) {
    return (
      <div className="p-6 text-center text-muted">
        Unknown template.
        <button
          onClick={onFinish}
          className="mt-4 block w-full rounded-xl bg-surface-2 py-3"
        >
          Back
        </button>
      </div>
    );
  }

  const setsFor = (exerciseId: string): LoggedSet[] =>
    session.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? [];

  const updateSets = (exerciseId: string, sets: LoggedSet[]) => {
    const others = session.exercises.filter(
      (e) => e.exerciseId !== exerciseId
    );
    const next: Session = {
      ...session,
      exercises:
        sets.length === 0
          ? others
          : [...others, { exerciseId, sets }],
    };
    onUpdateSession(next);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="safe-top safe-x sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 pb-3 backdrop-blur">
        <button
          onClick={onFinish}
          aria-label="Back"
          className="rounded-xl bg-surface-2 px-3 py-2 text-sm active:scale-95"
        >
          ←
        </button>
        <h1 className="flex-1 truncate text-center text-lg font-bold">
          {template.name}
        </h1>
        <span className="w-9" />
      </header>

      <div className="safe-x flex flex-1 flex-col gap-3 py-4">
        {template.exerciseIds.map((exId) => {
          const exercise = getExercise(exId);
          if (!exercise) return null;
          const last = getLastWorkingSets(exId, allSessions);
          const hint = getProgressionHint(exercise, allSessions);
          const todaySets = setsFor(exId);
          const isOpen = expanded === exId;
          const workingCount = todaySets.filter((s) => !s.isWarmup).length;

          return (
            <div
              key={exId}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : exId)}
                className="flex w-full items-start gap-3 p-4 text-left active:bg-surface-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">{exercise.name}</span>
                    {workingCount > 0 ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                        {workingCount} set{workingCount > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm text-muted tabular-nums">
                    {last && last.length > 0
                      ? `Last: ${fmtSets(last)}`
                      : "No history yet"}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${HINT_PILL[hint]}`}
                >
                  {HINT_SHORT[hint]}
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-border">
                  <ExerciseLogger
                    exercise={exercise}
                    sets={todaySets}
                    lastSets={last}
                    hint={hint}
                    onSetsChange={(s) => updateSets(exId, s)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onFinish}
          className="safe-bottom mt-2 rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white active:scale-[0.98]"
        >
          Finish workout
        </button>
      </div>
    </div>
  );
}
