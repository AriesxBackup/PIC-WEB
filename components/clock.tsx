"use client";

import { useSyncExternalStore } from "react";
import { cn, daysBetween, formatDueDate, formatRelative, formatShortDate, localDate } from "@/lib/utils";

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}

const currentMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => null;

/**
 * The current minute on the client, or null while rendering on the server / hydrating.
 * Lets time-relative labels ("5m ago", "overdue") render without hydration mismatches.
 */
function useMinute(): number | null {
  return useSyncExternalStore(subscribe, currentMinute, serverMinute);
}

export function TimeAgo({ time, className }: { time: number; className?: string }) {
  const minute = useMinute();
  // Until hydration finishes, render a time-zone-independent date so server and client HTML match.
  return (
    <time
      dateTime={new Date(time).toISOString()}
      title={minute === null ? undefined : new Date(time).toLocaleString()}
      className={className}
    >
      {minute === null ? formatShortDate(time, "UTC") : formatRelative(time, minute * 60_000 + 59_999)}
    </time>
  );
}

export function DueBadge({ date, done, className }: { date: string; done?: boolean; className?: string }) {
  const minute = useMinute();
  let tone: "neutral" | "soon" | "late" = "neutral";
  let label = `Due ${formatDueDate(date)}`;

  if (minute !== null && !done) {
    const days = daysBetween(localDate(minute * 60_000), date);
    if (days < 0) {
      tone = "late";
      label = `Overdue · ${formatDueDate(date)}`;
    } else if (days === 0) {
      tone = "soon";
      label = "Due today";
    } else if (days === 1) {
      tone = "soon";
      label = "Due tomorrow";
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "late" && "bg-red-500/10 text-red-600 dark:text-red-400",
        tone === "soon" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        tone === "neutral" && "bg-surface-2 text-muted",
        className,
      )}
    >
      <span aria-hidden>📅</span>
      {label}
    </span>
  );
}
