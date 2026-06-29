"use client";

interface SyncIndicatorProps {
  pending: boolean;
  online: boolean;
}

/** Tiny "synced ● / pending ○" dot so the user trusts persistence. */
export default function SyncIndicator({ pending, online }: SyncIndicatorProps) {
  const label = pending ? "pending" : online ? "synced" : "local";
  const color = pending
    ? "text-amber-400"
    : online
      ? "text-emerald-400"
      : "text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${color}`}
      title={label}
      aria-label={`Sync status: ${label}`}
    >
      <span className="text-[10px] leading-none">{pending ? "○" : "●"}</span>
      {label}
    </span>
  );
}
