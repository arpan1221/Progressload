# Workout Tracker — Build Spec for Claude Code

> Hand this whole file to Claude Code as the build prompt. It is a personal, single-user app. Optimize for **speed-to-build** and **gym reliability**, not generality. Target: working MVP in a few hours.

---

## 0. What you're building

A lightweight, mobile-first **PWA** workout tracker for one user (me). Its single job: **between sets at the gym, instantly show last session's numbers for the current exercise so I know what to beat** (progressive overload). It must work **offline** (gym basements have no signal), persist durably to **Supabase**, and sync across my phone and laptop.

The mental model for the whole app: it's a **"beat last week" machine**, not a logger. Every design decision serves surfacing the last-time numbers fast and making it one tap to log a set that matches or beats them.

---

## 1. Core principles (read before coding)

1. **The "last time" lookup is the load-bearing feature.** The instant I tap an exercise, show last session's working sets for it, big and prominent. Everything else is secondary.
2. **The read path must NEVER depend on the network.** All reads and writes during a workout hit local state first. Supabase is a sync layer underneath, not the live data source. A naive "fetch last week from Supabase on tap" design will hang in a no-signal gym — that is a build failure.
3. **Local-first; Supabase is durable backup + sync.** Render from local cache immediately; sync to/from Supabase opportunistically in the background.
4. **Single user, basically one device → no real conflict resolution.** Last-write-wins by `updatedAt` is sufficient. Do not build a sync engine.
5. **Minimal taps, no keyboard.** Steppers (± buttons) for weight and reps, pre-filled with last time's values. Big tap targets, dark theme, sweaty-thumb friendly.

---

## 2. Stack

- **Next.js 15 (App Router) on Vercel**, **TypeScript**. Render the workout UI **client-side** (`"use client"`) — no SSR/server components in the logging path.
- **Supabase** (Postgres + Auth) for persistence and sync.
- **localStorage** as the local working cache (data volume is tiny; a single JSON blob is fine — do not use IndexedDB).
- **PWA**: web manifest + service worker so it installs to the home screen, launches full-screen, and runs offline. Use `next-pwa` or a hand-rolled service worker.
- **Tailwind CSS**, dark mode, mobile-first.
- No state-management library. Plain React state + a small store module backed by localStorage.

---

## 3. Non-negotiable constraints

1. Fully usable **offline** — log a complete workout with airplane mode on, and it persists locally and syncs later.
2. Workout/logging UI is **client-rendered**.
3. **PWA installable**, launches full-screen from home screen.
4. Normal logging uses **steppers only** — no on-screen keyboard.
5. **Export / Import JSON** is part of the MVP (cheap insurance against data loss; also the migration bridge).

---

## 4. Architecture — local-first with Supabase sync

Three flows, that's the entire sync system:

**Hydrate (on app open)**
1. Load `AppData` from localStorage and render immediately.
2. If online + authenticated: `select * from sessions where user_id = me`. Merge with local by session `id`, keeping the row with the newer `updatedAt` (last-write-wins). Save merged result back to localStorage.

**Log a set / edit a session (during workout)**
1. Update in-memory React state → write localStorage. (This is instant and offline-proof; the "last time" lookup reads only from here.)
2. Fire a best-effort `upsert` of the affected session to Supabase. On failure (offline), mark the session `pendingSync = true` locally and move on — it's already safe.

**Flush (on regaining connectivity / app foreground)**
- Upsert all `pendingSync` sessions; clear the flag on success.

Show a tiny **`synced ● / pending ○`** indicator somewhere unobtrusive so I trust it.

---

## 5. Data model

```ts
type RepRange = [min: number, max: number];

interface Exercise {
  id: string;                 // stable slug, e.g. "db-flat-bench"
  name: string;               // "Dumbbell Flat Bench"
  muscleGroup: string;        // "Chest", "Triceps", etc.
  targetRepRange: RepRange;   // drives the progression hint
  isBodyweight?: boolean;     // dips, pull-ups: `weight` = ADDED weight (0 = bodyweight)
  weightStep?: number;        // default increment for the stepper (lb). default 5; 2.5 for small DBs/cables
}

interface WorkoutTemplate {
  id: string;                 // "chest-tri", "legs", "back-bi", "shoulders-abs"
  name: string;               // "Chest + Triceps"
  exerciseIds: string[];      // ordered
}

interface LoggedSet {
  weight: number;             // lb. For bodyweight exercises, this is ADDED weight (0 ok)
  reps: number;
  isWarmup?: boolean;         // warmups excluded from "last time" + progression logic
}

interface LoggedExercise {
  exerciseId: string;
  sets: LoggedSet[];
}

interface Session {
  id: string;                 // uuid
  date: string;               // "YYYY-MM-DD"
  templateId: string;
  exercises: LoggedExercise[];
  updatedAt: string;          // ISO timestamp — used for last-write-wins
  pendingSync?: boolean;      // local-only flag, not persisted to Supabase
}

interface AppData {
  sessions: Session[];        // exercises & templates are hardcoded config, not stored
}
```

**Supabase schema — one table.** Templates/exercises are hardcoded in the app, so only sessions persist.

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  template_id text not null,
  payload jsonb not null,        -- the LoggedExercise[] for this session
  updated_at timestamptz not null default now()
);

alter table sessions enable row level security;

create policy "own rows" on sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

Map `Session` ⇄ row: `payload = session.exercises`; everything else is a column. The "last time" lookup runs **client-side against the cached sessions array** — no joins, no per-set rows, offline-friendly.

---

## 6. The "last time" lookup + progression hint

This is the heart of the app. Put it in `src/lib/progression.ts`.

```ts
// Most recent session BEFORE today that contains this exercise with >=1 working set.
function getLastWorkingSets(exerciseId: string, sessions: Session[]): LoggedSet[] | null;

// Hint shown above the logging UI.
type Hint = "FIRST_TIME" | "ADD_REPS" | "ADD_WEIGHT";

function getProgressionHint(exercise: Exercise, sessions: Session[]): Hint {
  const last = getLastWorkingSets(exercise.id, sessions);
  if (!last || last.length === 0) return "FIRST_TIME";
  const [, top] = exercise.targetRepRange;
  // Double progression: if EVERY working set hit the top of the range last time, add weight.
  const allHitTop = last.every(s => s.reps >= top);
  return allHitTop ? "ADD_WEIGHT" : "ADD_REPS";
}
```

Display:
- `FIRST_TIME` → "First time — set a baseline."
- `ADD_REPS` → "Beat last time — add reps." (show last sets)
- `ADD_WEIGHT` → "↑ Add weight today." (all sets hit the top of the range last time)

This operationalizes the double-progression system: stay at a weight, add reps each week until all sets reach the top of the rep range, then increase the weight and drop back to the bottom.

---

## 7. Seed config — templates + exercises

Hardcode in `src/config/templates.ts`. **Editing this file = changing my routine; no in-app creation UI needed for v1.**

```ts
export const EXERCISES: Exercise[] = [
  // Chest + Triceps
  { id: "db-flat-bench", name: "Dumbbell Flat Bench", muscleGroup: "Chest", targetRepRange: [5, 8], weightStep: 5 },
  { id: "db-incline", name: "Dumbbell Incline Press", muscleGroup: "Chest", targetRepRange: [6, 10], weightStep: 2.5 },
  { id: "pec-deck", name: "Pec Deck", muscleGroup: "Chest", targetRepRange: [8, 12], weightStep: 5 },
  { id: "dips", name: "Bodyweight Dips", muscleGroup: "Triceps", targetRepRange: [5, 10], isBodyweight: true, weightStep: 5 },
  { id: "oh-tricep-ext", name: "Overhead Triceps Extension", muscleGroup: "Triceps", targetRepRange: [8, 12], weightStep: 5 },
  { id: "rope-pushdown", name: "Rope Pushdown", muscleGroup: "Triceps", targetRepRange: [8, 12], weightStep: 5 },

  // Legs
  { id: "back-squat", name: "Barbell Back Squat", muscleGroup: "Quads", targetRepRange: [5, 8], weightStep: 5 },
  { id: "rdl", name: "Romanian Deadlift", muscleGroup: "Hamstrings", targetRepRange: [8, 10], weightStep: 5 },
  { id: "leg-press", name: "Leg Press", muscleGroup: "Quads", targetRepRange: [10, 12], weightStep: 10 },
  { id: "leg-curl", name: "Leg Curl", muscleGroup: "Hamstrings", targetRepRange: [10, 15], weightStep: 5 },
  { id: "calf-raise", name: "Standing Calf Raise", muscleGroup: "Calves", targetRepRange: [10, 15], weightStep: 10 },

  // Back + Biceps
  { id: "pullup", name: "Pull-Up", muscleGroup: "Back", targetRepRange: [5, 10], isBodyweight: true, weightStep: 5 },
  { id: "cable-row", name: "Cable Row", muscleGroup: "Back", targetRepRange: [8, 12], weightStep: 5 },
  { id: "lat-pulldown", name: "Lat Pulldown", muscleGroup: "Back", targetRepRange: [6, 10], weightStep: 5 },
  { id: "chest-supported-row", name: "Chest-Supported Row", muscleGroup: "Back", targetRepRange: [8, 12], weightStep: 5 },
  { id: "hammer-curl", name: "Hammer Curl", muscleGroup: "Biceps", targetRepRange: [8, 12], weightStep: 2.5 },
  { id: "db-curl", name: "Dumbbell Curl", muscleGroup: "Biceps", targetRepRange: [8, 12], weightStep: 2.5 },

  // Shoulders + Abs
  { id: "db-ohp", name: "Dumbbell Overhead Press", muscleGroup: "Shoulders", targetRepRange: [6, 10], weightStep: 2.5 },
  { id: "lateral-raise", name: "Lateral Raise", muscleGroup: "Shoulders", targetRepRange: [12, 20], weightStep: 2.5 },
  { id: "rear-delt-fly", name: "Reverse Pec Deck (Rear Delt)", muscleGroup: "Shoulders", targetRepRange: [15, 20], weightStep: 5 },
  { id: "cable-lateral", name: "Cable Lateral Raise", muscleGroup: "Shoulders", targetRepRange: [12, 15], weightStep: 2.5 },
  { id: "cable-crunch", name: "Cable Crunch", muscleGroup: "Abs", targetRepRange: [10, 15], weightStep: 5 },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscleGroup: "Abs", targetRepRange: [10, 15], isBodyweight: true, weightStep: 5 },
];

export const TEMPLATES: WorkoutTemplate[] = [
  { id: "chest-tri", name: "Chest + Triceps", exerciseIds: ["db-flat-bench","db-incline","pec-deck","dips","oh-tricep-ext","rope-pushdown"] },
  { id: "back-bi", name: "Back + Biceps", exerciseIds: ["pullup","lat-pulldown","cable-row","chest-supported-row","hammer-curl","db-curl"] },
  { id: "legs", name: "Legs", exerciseIds: ["back-squat","rdl","leg-press","leg-curl","calf-raise"] },
  { id: "shoulders-abs", name: "Shoulders + Abs", exerciseIds: ["db-ohp","lateral-raise","rear-delt-fly","cable-lateral","cable-crunch","hanging-leg-raise"] },
];
```

---

## 8. Optional seed sessions (so the app works on first launch)

Put in `src/config/seedSessions.ts`. **Load these only if local storage is empty AND Supabase returns no rows** — they give the "beat last week" feature real history on day one. These are my actual recent logs; warmups flagged and excluded from progression. (Fix the `back-bi` date if needed.)

```ts
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
```

---

## 9. Screens (3)

**A. Home** — four big buttons (Chest + Triceps / Back + Biceps / Legs / Shoulders + Abs). Under each, "last done: N days ago". Tapping one creates a new in-progress `Session` for that template and goes to the Session screen. Also: a small header with the `synced/pending` dot and a settings/⋯ entry for Export/Import.

**B. Session** — vertical list of the template's exercises in order. Each row collapsed shows: exercise name + last time's working sets inline (e.g. `Last: 30×5, 30×5, 30×5`) + the progression hint as a small colored pill. Tap a row to expand its logging UI. A "Finish workout" button at the bottom.

**C. Exercise logging (inline expand — not a new page)**
- **Top, prominent:** last session's working sets, and the hint ("↑ Add weight today" / "Beat last time — add reps").
- **Weight stepper** (± `weightStep`) and **reps stepper** (±1), both **pre-filled with last time's first working set values** (or last logged set this session, whichever is more recent). For bodyweight exercises, label the weight field "added lb" and allow 0.
- Big **Log Set** button → appends to today's sets and shows a running list of today's logged sets (tap a logged set to edit/delete).
- **Rest timer**: on logging a set, auto-start a count-up timer with a 2:30 reference line (configurable). This matters — short rest is why my reps collapse set-to-set, so make the timer visible and prominent. A subtle chime/vibration at the target is a nice-to-have.

---

## 10. Auth

Supabase **magic-link** (email). One login that persists; RLS keyed to `auth.uid()` (policy above). On first run with no session, show a minimal email-entry screen. After login, hydrate. Keep it to one screen — don't gold-plate it.

---

## 11. MVP scope — build vs cut

**Build:** the 3 screens; local-first store + localStorage; Supabase sync (hydrate / best-effort upsert / flush-on-reconnect, LWW); the "last time" lookup + progression hint; steppers pre-filled with last values; rest timer; 4 seeded templates + exercises; optional seed sessions; magic-link auth; Export/Import JSON; PWA manifest + service worker.

**Cut for v1 (do not build):** in-app exercise/template creation UI (edit config files instead); charts/analytics/graphs; RIR or notes fields; multi-user/social anything; real conflict resolution; any non-workout screens.

---

## 12. Suggested build order

1. Scaffold Next.js + TS + Tailwind; PWA manifest + service worker; dark mobile shell.
2. Types + `templates.ts` + `seedSessions.ts`.
3. Local store module (load/save localStorage, in-memory state).
4. `progression.ts` — `getLastWorkingSets` + `getProgressionHint` (the core; unit-test these).
5. Screens A → B → C, wired to local store only (fully working offline first).
6. Rest timer + steppers polish.
7. Supabase: table + RLS, magic-link auth, hydrate/upsert/flush, sync indicator.
8. Export/Import JSON.
9. Install as PWA on phone; test a full workout in airplane mode, then confirm it syncs on reconnect.

---

## 13. Definition of done

- I can install it to my iPhone home screen and launch it full-screen.
- With **airplane mode on**, I can start a workout, see last week's numbers for every exercise, log all sets via steppers, and finish — with everything persisting across an app restart.
- On reconnect, the session appears in Supabase; opening the app on my laptop shows the same data.
- Tapping any exercise shows last session's working sets in under a second, plus a correct add-reps / add-weight hint.
- Export produces a JSON file; Import restores from it.

---

## 14. Setup notes

- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Provide the `create table` + policy SQL as a migration in the repo.
- Weight unit is **pounds** throughout.
- Keep dependencies minimal: Next, React, Supabase JS client, Tailwind, a PWA helper. Nothing else unless justified.