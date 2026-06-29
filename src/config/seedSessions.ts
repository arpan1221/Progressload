import type { Session } from "@/lib/types";

export const SEED_SESSIONS: Session[] = [
  {
    id: "seed-2026-06-22-chest-tri", date: "2026-06-22", templateId: "chest-tri", updatedAt: "2026-06-22T20:00:00Z",
    exercises: [
      { exerciseId: "db-flat-bench", sets: [
        { weight: 20, reps: 8, isWarmup: true }, { weight: 25, reps: 8, isWarmup: true },
        { weight: 30, reps: 5 }, { weight: 30, reps: 5 }, { weight: 30, reps: 5 } ] },
      { exerciseId: "db-incline", sets: [
        { weight: 27.5, reps: 5 }, { weight: 27.5, reps: 7 }, { weight: 27.5, reps: 6 }, { weight: 27.5, reps: 4 } ] },
      { exerciseId: "pec-deck", sets: [
        { weight: 60, reps: 10, isWarmup: true },
        { weight: 70, reps: 8 }, { weight: 70, reps: 7 }, { weight: 70, reps: 5 }, { weight: 70, reps: 4 } ] },
      { exerciseId: "dips", sets: [
        { weight: 0, reps: 6 }, { weight: 0, reps: 5 }, { weight: 0, reps: 5 }, { weight: 0, reps: 3 } ] },
      { exerciseId: "oh-tricep-ext", sets: [
        { weight: 20, reps: 15, isWarmup: true },
        { weight: 30, reps: 8 }, { weight: 30, reps: 7 }, { weight: 30, reps: 7 }, { weight: 30, reps: 7 } ] },
      { exerciseId: "rope-pushdown", sets: [
        { weight: 20, reps: 8 }, { weight: 20, reps: 7 }, { weight: 20, reps: 6 }, { weight: 20, reps: 6 } ] },
    ],
  },
  {
    id: "seed-2026-06-25-legs", date: "2026-06-25", templateId: "legs", updatedAt: "2026-06-25T20:00:00Z",
    exercises: [
      { exerciseId: "back-squat", sets: [
        { weight: 95, reps: 6, isWarmup: true },
        { weight: 135, reps: 5 }, { weight: 135, reps: 5 }, { weight: 135, reps: 4 }, { weight: 135, reps: 3 } ] },
      { exerciseId: "rdl", sets: [
        { weight: 95, reps: 10 }, { weight: 95, reps: 10 }, { weight: 95, reps: 10 } ] },
      { exerciseId: "leg-press", sets: [
        { weight: 180, reps: 10 }, { weight: 180, reps: 9 }, { weight: 180, reps: 8 } ] },
      { exerciseId: "leg-curl", sets: [
        { weight: 60, reps: 14 }, { weight: 60, reps: 14 }, { weight: 60, reps: 13 } ] },
      { exerciseId: "calf-raise", sets: [
        { weight: 100, reps: 15 }, { weight: 100, reps: 12 }, { weight: 100, reps: 12 }, { weight: 100, reps: 11 } ] },
    ],
  },
  {
    id: "seed-2026-06-26-back-bi", date: "2026-06-26", templateId: "back-bi", updatedAt: "2026-06-26T20:00:00Z",
    exercises: [
      { exerciseId: "pullup", sets: [
        { weight: 0, reps: 8, isWarmup: true }, { weight: 15, reps: 4 }, { weight: 0, reps: 5 } ] },
      { exerciseId: "cable-row", sets: [
        { weight: 70, reps: 12, isWarmup: true },
        { weight: 85, reps: 9 }, { weight: 85, reps: 8 }, { weight: 85, reps: 7 } ] },
      { exerciseId: "lat-pulldown", sets: [
        { weight: 85, reps: 10, isWarmup: true },
        { weight: 100, reps: 6 }, { weight: 100, reps: 6 }, { weight: 100, reps: 6 } ] },
      { exerciseId: "chest-supported-row", sets: [
        { weight: 80, reps: 10 }, { weight: 80, reps: 9 }, { weight: 80, reps: 8 }, { weight: 80, reps: 8 } ] },
      { exerciseId: "hammer-curl", sets: [
        { weight: 15, reps: 12 }, { weight: 15, reps: 10 }, { weight: 15, reps: 8 } ] },
      { exerciseId: "db-curl", sets: [
        { weight: 15, reps: 12 }, { weight: 15, reps: 9 }, { weight: 15, reps: 7 } ] },
    ],
  },
];
