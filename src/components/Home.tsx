"use client";

import type { Session } from "@/lib/types";
import { TEMPLATES } from "@/config/templates";
import { daysAgoLabel } from "@/lib/dates";
import SyncIndicator from "@/components/SyncIndicator";

interface HomeProps {
  sessions: Session[];
  online: boolean;
  pending: boolean;
  onStart: (templateId: string) => void;
  onOpenSettings: () => void;
}

export default function Home({
  sessions,
  online,
  pending,
  onStart,
  onOpenSettings,
}: HomeProps) {
  const lastDone = (templateId: string): string => {
    const dates = sessions
      .filter((s) => s.templateId === templateId)
      .map((s) => s.date)
      .sort();
    const latest = dates[dates.length - 1];
    return latest ? `last done: ${daysAgoLabel(latest)}` : "never done";
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="safe-top safe-x flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Workout</h1>
          <p className="text-xs text-muted">Beat last week.</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncIndicator pending={pending} online={online} />
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="rounded-xl bg-surface-2 px-3 py-2 text-lg leading-none active:scale-95"
          >
            ⋯
          </button>
        </div>
      </header>

      <div className="safe-x safe-bottom flex flex-1 flex-col gap-4 py-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onStart(t.id)}
            className="flex flex-col items-start gap-1 rounded-3xl border border-border bg-surface p-6 text-left active:scale-[0.99] active:bg-surface-2"
          >
            <span className="text-xl font-bold">{t.name}</span>
            <span className="text-sm text-muted">{lastDone(t.id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
