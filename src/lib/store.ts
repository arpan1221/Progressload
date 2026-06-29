import type { AppData } from "@/lib/types";

export const STORAGE_KEY = "workout-tracker:v1";

/**
 * Load AppData from localStorage.
 * SSR-safe: returns an empty AppData when running on the server.
 * Returns { sessions: [] } if empty / missing / unparseable.
 */
export function loadAppData(): AppData {
  if (typeof window === "undefined") return { sessions: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as AppData).sessions)
    ) {
      return parsed as AppData;
    }
    return { sessions: [] };
  } catch {
    return { sessions: [] };
  }
}

/**
 * Persist AppData to localStorage. No-op on the server.
 */
export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be full or unavailable; fail soft.
  }
}
