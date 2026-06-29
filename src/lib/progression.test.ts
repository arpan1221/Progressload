import { describe, it, expect } from "vitest";
import type { Exercise, Session } from "@/lib/types";
import { getLastWorkingSets, getProgressionHint } from "@/lib/progression";

const TODAY = "2026-06-30";

const benchExercise: Exercise = {
  id: "db-flat-bench",
  name: "Dumbbell Flat Bench",
  muscleGroup: "Chest",
  targetRepRange: [5, 8],
  weightStep: 5,
};

// Helper to keep fixtures terse.
function session(
  id: string,
  date: string,
  exercises: Session["exercises"]
): Session {
  return {
    id,
    date,
    templateId: "chest-tri",
    updatedAt: `${date}T20:00:00Z`,
    exercises,
  };
}

describe("getLastWorkingSets", () => {
  it("returns the most recent session BEFORE today, not today's session", () => {
    const sessions: Session[] = [
      session("today", TODAY, [
        { exerciseId: "db-flat-bench", sets: [{ weight: 35, reps: 8 }] },
      ]),
      session("yesterday", "2026-06-29", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 30, reps: 5 },
            { weight: 30, reps: 5 },
          ],
        },
      ]),
      session("old", "2026-06-20", [
        { exerciseId: "db-flat-bench", sets: [{ weight: 25, reps: 5 }] },
      ]),
    ];

    const result = getLastWorkingSets("db-flat-bench", sessions, TODAY);
    expect(result).toEqual([
      { weight: 30, reps: 5 },
      { weight: 30, reps: 5 },
    ]);
  });

  it("ignores ordering of the input array and still picks the most recent prior date", () => {
    const sessions: Session[] = [
      session("old", "2026-06-10", [
        { exerciseId: "db-flat-bench", sets: [{ weight: 20, reps: 5 }] },
      ]),
      session("recent", "2026-06-28", [
        { exerciseId: "db-flat-bench", sets: [{ weight: 32, reps: 6 }] },
      ]),
      session("mid", "2026-06-18", [
        { exerciseId: "db-flat-bench", sets: [{ weight: 25, reps: 6 }] },
      ]),
    ];

    const result = getLastWorkingSets("db-flat-bench", sessions, TODAY);
    expect(result).toEqual([{ weight: 32, reps: 6 }]);
  });

  it("EXCLUDES warmup sets from the returned working sets", () => {
    const sessions: Session[] = [
      session("s1", "2026-06-22", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 20, reps: 8, isWarmup: true },
            { weight: 25, reps: 8, isWarmup: true },
            { weight: 30, reps: 5 },
            { weight: 30, reps: 5 },
            { weight: 30, reps: 4 },
          ],
        },
      ]),
    ];

    const result = getLastWorkingSets("db-flat-bench", sessions, TODAY);
    expect(result).toEqual([
      { weight: 30, reps: 5 },
      { weight: 30, reps: 5 },
      { weight: 30, reps: 4 },
    ]);
    // Confirm no warmup leaked through.
    expect(result?.every((s) => !s.isWarmup)).toBe(true);
  });

  it("skips a session whose only sets for the exercise are warmups (needs >=1 working set)", () => {
    const sessions: Session[] = [
      // Most recent prior session: only warmups for the exercise -> skip.
      session("warmups-only", "2026-06-28", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 20, reps: 8, isWarmup: true },
            { weight: 25, reps: 8, isWarmup: true },
          ],
        },
      ]),
      // Earlier session with a real working set -> this is the answer.
      session("has-working", "2026-06-20", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 25, reps: 8, isWarmup: true },
            { weight: 30, reps: 6 },
          ],
        },
      ]),
    ];

    const result = getLastWorkingSets("db-flat-bench", sessions, TODAY);
    expect(result).toEqual([{ weight: 30, reps: 6 }]);
  });

  it("returns null when the exercise was never done before", () => {
    const sessions: Session[] = [
      session("s1", "2026-06-22", [
        { exerciseId: "db-incline", sets: [{ weight: 27.5, reps: 6 }] },
      ]),
    ];

    expect(getLastWorkingSets("db-flat-bench", sessions, TODAY)).toBeNull();
  });

  it("returns null when the only session containing the exercise is today", () => {
    const sessions: Session[] = [
      session("today", TODAY, [
        { exerciseId: "db-flat-bench", sets: [{ weight: 30, reps: 5 }] },
      ]),
    ];

    expect(getLastWorkingSets("db-flat-bench", sessions, TODAY)).toBeNull();
  });

  it("returns null for an empty sessions array", () => {
    expect(getLastWorkingSets("db-flat-bench", [], TODAY)).toBeNull();
  });
});

describe("getProgressionHint", () => {
  it("returns FIRST_TIME when there is no history", () => {
    expect(getProgressionHint(benchExercise, [], TODAY)).toBe("FIRST_TIME");
  });

  it("returns FIRST_TIME when the exercise exists only in today's session", () => {
    const sessions: Session[] = [
      session("today", TODAY, [
        { exerciseId: "db-flat-bench", sets: [{ weight: 30, reps: 8 }] },
      ]),
    ];
    expect(getProgressionHint(benchExercise, sessions, TODAY)).toBe(
      "FIRST_TIME"
    );
  });

  it("returns FIRST_TIME when prior session has only warmups for the exercise", () => {
    const sessions: Session[] = [
      session("s1", "2026-06-22", [
        {
          exerciseId: "db-flat-bench",
          sets: [{ weight: 20, reps: 8, isWarmup: true }],
        },
      ]),
    ];
    expect(getProgressionHint(benchExercise, sessions, TODAY)).toBe(
      "FIRST_TIME"
    );
  });

  it("returns ADD_REPS when not all working sets hit the top of the range", () => {
    // targetRepRange top = 8; one set is below 8.
    const sessions: Session[] = [
      session("s1", "2026-06-22", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 30, reps: 8 },
            { weight: 30, reps: 8 },
            { weight: 30, reps: 5 },
          ],
        },
      ]),
    ];
    expect(getProgressionHint(benchExercise, sessions, TODAY)).toBe("ADD_REPS");
  });

  it("returns ADD_WEIGHT when EVERY working set reps >= top of the range", () => {
    const sessions: Session[] = [
      session("s1", "2026-06-22", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 30, reps: 8 },
            { weight: 30, reps: 8 },
            { weight: 30, reps: 9 },
          ],
        },
      ]),
    ];
    expect(getProgressionHint(benchExercise, sessions, TODAY)).toBe(
      "ADD_WEIGHT"
    );
  });

  it("returns ADD_WEIGHT when reps exactly equal the top (>= boundary)", () => {
    const sessions: Session[] = [
      session("s1", "2026-06-22", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 30, reps: 8 },
            { weight: 30, reps: 8 },
          ],
        },
      ]),
    ];
    expect(getProgressionHint(benchExercise, sessions, TODAY)).toBe(
      "ADD_WEIGHT"
    );
  });

  it("ignores warmups when computing the hint (warmup low reps must not force ADD_REPS)", () => {
    const sessions: Session[] = [
      session("s1", "2026-06-22", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 20, reps: 2, isWarmup: true }, // low-rep warmup, must be ignored
            { weight: 30, reps: 8 },
            { weight: 30, reps: 8 },
          ],
        },
      ]),
    ];
    expect(getProgressionHint(benchExercise, sessions, TODAY)).toBe(
      "ADD_WEIGHT"
    );
  });

  it("evaluates the hint against the most recent prior session, not older ones", () => {
    const sessions: Session[] = [
      // Older: all hit top.
      session("old", "2026-06-15", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 30, reps: 8 },
            { weight: 30, reps: 8 },
          ],
        },
      ]),
      // Most recent: one set short -> ADD_REPS should win.
      session("recent", "2026-06-25", [
        {
          exerciseId: "db-flat-bench",
          sets: [
            { weight: 35, reps: 8 },
            { weight: 35, reps: 6 },
          ],
        },
      ]),
    ];
    expect(getProgressionHint(benchExercise, sessions, TODAY)).toBe("ADD_REPS");
  });
});
