import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True when both Supabase env vars are present. */
export function hasSupabaseEnv(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Memoized Supabase client. Returns null when env is missing so callers can
 * fall back to offline/local-only behavior.
 */
export function getSupabase(): SupabaseClient | null {
  if (!hasSupabaseEnv()) return null;
  if (client) return client;
  client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  });
  return client;
}

/**
 * Send a magic-link email for passwordless sign-in.
 * Returns { error } where error is a human-readable string or null on success.
 */
export async function signInWithMagicLink(
  email: string
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    return { error: error ? error.message : null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sign-in failed." };
  }
}

/** Sign the current user out. Fails soft. */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // Fail soft — never throw to the UI.
  }
}

/** Resolve the current authenticated user id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth state changes. Invokes cb with the user id (or null).
 * Returns an unsubscribe function.
 */
export function onAuthChange(cb: (userId: string | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  try {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session?.user?.id ?? null);
    });
    return () => {
      try {
        data.subscription.unsubscribe();
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}
