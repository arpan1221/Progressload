import { getSupabase, getCurrentUserId } from "@/lib/supabase";
import type { AppData, Session, LoggedExercise } from "@/lib/types";
import { SEED_SESSIONS } from "@/config/seedSessions";
import { saveAppData } from "@/lib/store";

/** Shape of a row in the Supabase `sessions` table. */
interface SessionRow {
  id: string;
  user_id?: string;
  date: string;
  template_id: string;
  payload: LoggedExercise[];
  updated_at: string;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    date: row.date,
    templateId: row.template_id,
    exercises: Array.isArray(row.payload) ? row.payload : [],
    updatedAt: row.updated_at,
  };
}

/**
 * Merge two session arrays by id, keeping the entry with the newer updatedAt
 * (last-write-wins). The remote entry strips any local-only pendingSync flag.
 */
export function mergeSessions(local: Session[], remote: Session[]): Session[] {
  const byId = new Map<string, Session>();
  for (const s of local) byId.set(s.id, s);
  for (const s of remote) {
    const existing = byId.get(s.id);
    if (!existing) {
      byId.set(s.id, s);
      continue;
    }
    const newer =
      new Date(s.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
        ? s
        : existing;
    byId.set(s.id, newer);
  }
  return Array.from(byId.values());
}

/**
 * Hydrate app data on open.
 * - No env / no user: usable offline with seeds when local is empty.
 * - With user: fetch remote rows, merge LWW, seed if still empty, persist.
 * Always fails soft and never throws.
 */
export async function hydrate(
  local: AppData
): Promise<{ data: AppData; online: boolean; userId: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      data: local.sessions.length ? local : { sessions: SEED_SESSIONS },
      online: false,
      userId: null,
    };
  }

  let userId: string | null = null;
  try {
    userId = await getCurrentUserId();
  } catch {
    userId = null;
  }

  if (!userId) {
    return {
      data: local.sessions.length ? local : { sessions: SEED_SESSIONS },
      online: false,
      userId: null,
    };
  }

  try {
    const { data: rows, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      // Treat as offline; keep local data usable.
      return {
        data: local.sessions.length ? local : { sessions: SEED_SESSIONS },
        online: false,
        userId,
      };
    }

    const remote: Session[] = (rows ?? []).map((r) =>
      rowToSession(r as SessionRow)
    );
    let merged = mergeSessions(local.sessions, remote);

    if (merged.length === 0) {
      // Brand-new account with no history anywhere: seed and mark for sync.
      merged = SEED_SESSIONS.map((s) => ({ ...s, pendingSync: true }));
    }

    const data: AppData = { sessions: merged };
    saveAppData(data);
    return { data, online: true, userId };
  } catch {
    return {
      data: local.sessions.length ? local : { sessions: SEED_SESSIONS },
      online: false,
      userId,
    };
  }
}

/**
 * Best-effort upsert of a single session row.
 * Returns false on failure / offline / missing env / no user.
 */
export async function upsertSession(session: Session): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase.from("sessions").upsert({
      id: session.id,
      user_id: userId,
      date: session.date,
      template_id: session.templateId,
      payload: session.exercises,
      updated_at: session.updatedAt,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Upsert every session flagged pendingSync; clear the flag on success.
 * Returns the updated AppData (persisted to localStorage).
 */
export async function flushPending(data: AppData): Promise<AppData> {
  const sessions = await Promise.all(
    data.sessions.map(async (s) => {
      if (!s.pendingSync) return s;
      const ok = await upsertSession(s);
      if (!ok) return s;
      const { pendingSync: _drop, ...rest } = s;
      void _drop;
      return rest as Session;
    })
  );
  const next: AppData = { sessions };
  saveAppData(next);
  return next;
}
