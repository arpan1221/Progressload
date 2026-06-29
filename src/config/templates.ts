import type { Exercise, WorkoutTemplate } from "@/lib/types";

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
  { id: "chest-tri", name: "Chest + Triceps", exerciseIds: ["db-flat-bench", "db-incline", "pec-deck", "dips", "oh-tricep-ext", "rope-pushdown"] },
  { id: "back-bi", name: "Back + Biceps", exerciseIds: ["pullup", "lat-pulldown", "cable-row", "chest-supported-row", "hammer-curl", "db-curl"] },
  { id: "legs", name: "Legs", exerciseIds: ["back-squat", "rdl", "leg-press", "leg-curl", "calf-raise"] },
  { id: "shoulders-abs", name: "Shoulders + Abs", exerciseIds: ["db-ohp", "lateral-raise", "rear-delt-fly", "cable-lateral", "cable-crunch", "hanging-leg-raise"] },
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function getTemplate(id: string): WorkoutTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
