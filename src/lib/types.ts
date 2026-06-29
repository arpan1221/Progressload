export type RepRange = [min: number, max: number];

export interface Exercise {
  id: string; // stable slug, e.g. "db-flat-bench"
  name: string; // "Dumbbell Flat Bench"
  muscleGroup: string; // "Chest", "Triceps", etc.
  targetRepRange: RepRange; // drives the progression hint
  isBodyweight?: boolean; // dips, pull-ups: `weight` = ADDED weight (0 = bodyweight)
  weightStep?: number; // default increment for the stepper (lb). default 5; 2.5 for small DBs/cables
}

export interface WorkoutTemplate {
  id: string; // "chest-tri", "legs", "back-bi", "shoulders-abs"
  name: string; // "Chest + Triceps"
  exerciseIds: string[]; // ordered
}

export interface LoggedSet {
  weight: number; // lb. For bodyweight exercises, this is ADDED weight (0 ok)
  reps: number;
  isWarmup?: boolean; // warmups excluded from "last time" + progression logic
}

export interface LoggedExercise {
  exerciseId: string;
  sets: LoggedSet[];
}

export interface Session {
  id: string; // uuid
  date: string; // "YYYY-MM-DD"
  templateId: string;
  exercises: LoggedExercise[];
  updatedAt: string; // ISO timestamp — used for last-write-wins
  pendingSync?: boolean; // local-only flag, not persisted to Supabase
}

export interface AppData {
  sessions: Session[]; // exercises & templates are hardcoded config, not stored
}

export type Hint = "FIRST_TIME" | "ADD_REPS" | "ADD_WEIGHT";
