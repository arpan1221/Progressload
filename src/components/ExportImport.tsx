"use client";

import { useRef, useState } from "react";
import type { AppData, Session } from "@/lib/types";
import { mergeSessions } from "@/lib/sync";

interface ExportImportProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onClose: () => void;
  onSignOut?: () => void;
  signedIn: boolean;
}

export default function ExportImport({
  data,
  onImport,
  onClose,
  onSignOut,
  signedIn,
}: ExportImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workout-tracker-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Exported.");
    } catch {
      setMsg("Export failed.");
    }
  };

  const handleFile = async (file: File, mode: "merge" | "replace") => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const incoming =
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as AppData).sessions)
          ? ((parsed as AppData).sessions as Session[])
          : null;
      if (!incoming) {
        setMsg("Invalid file: no sessions array.");
        return;
      }
      const next: AppData =
        mode === "replace"
          ? { sessions: incoming }
          : { sessions: mergeSessions(data.sessions, incoming) };
      onImport(next);
      setMsg(`Imported ${incoming.length} session(s) (${mode}).`);
    } catch {
      setMsg("Import failed: could not read file.");
    }
  };

  const [pendingMode, setPendingMode] = useState<"merge" | "replace">("merge");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="safe-bottom safe-x w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-xl bg-surface-2 px-3 py-2 text-sm active:scale-95"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={exportJson}
            className="rounded-2xl bg-surface-2 py-4 text-base font-semibold active:scale-[0.98]"
          >
            Export JSON
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setPendingMode("merge")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                pendingMode === "merge"
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted"
              }`}
            >
              Merge
            </button>
            <button
              onClick={() => setPendingMode("replace")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                pendingMode === "replace"
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted"
              }`}
            >
              Replace
            </button>
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl bg-surface-2 py-4 text-base font-semibold active:scale-[0.98]"
          >
            Import JSON ({pendingMode})
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, pendingMode);
              e.target.value = "";
            }}
          />

          {signedIn && onSignOut ? (
            <button
              onClick={onSignOut}
              className="rounded-2xl bg-surface-2 py-4 text-base font-semibold text-red-400 active:scale-[0.98]"
            >
              Sign out
            </button>
          ) : null}

          {msg ? (
            <p className="text-center text-sm text-muted">{msg}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
