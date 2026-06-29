"use client";

import { useState } from "react";
import { signInWithMagicLink } from "@/lib/supabase";

interface AuthGateProps {
  hasEnv: boolean;
  userId: string | null;
  offlineMode: boolean;
  onContinueOffline: () => void;
  children: React.ReactNode;
}

/**
 * If Supabase is configured and no user is signed in (and the user hasn't
 * chosen offline mode), show a single magic-link screen. Otherwise render the
 * app — it stays fully usable offline with seed data before login.
 */
export default function AuthGate({
  hasEnv,
  userId,
  offlineMode,
  onContinueOffline,
  children,
}: AuthGateProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!hasEnv || userId || offlineMode) {
    return <>{children}</>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await signInWithMagicLink(email.trim());
    setBusy(false);
    if (error) setError(error);
    else setSent(true);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Workout</h1>
        <p className="mt-1 text-muted">Beat last week.</p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-lg font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-muted">
            We sent a magic link to{" "}
            <span className="text-foreground">{email}</span>. Open it on this
            device to sign in.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-sm text-accent"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-border bg-surface px-4 py-4 text-lg outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-2xl bg-accent py-4 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send magic link"}
          </button>
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
        </form>
      )}

      <button
        onClick={onContinueOffline}
        className="text-center text-sm text-muted underline"
      >
        Continue offline (sync later)
      </button>
    </div>
  );
}
