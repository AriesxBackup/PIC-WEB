import { twMerge } from "tailwind-merge";

/** Joins class names; later Tailwind classes win over conflicting earlier ones (e.g. w-auto over w-full). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

const AVATAR_GRADIENTS = [
  ["#f97316", "#db2777"],
  ["#8b5cf6", "#6366f1"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#0891b2"],
  ["#f59e0b", "#ef4444"],
  ["#ec4899", "#8b5cf6"],
  ["#14b8a6", "#84cc16"],
  ["#6366f1", "#0ea5e9"],
];

export function avatarBackground(id: number): string {
  const [from, to] = AVATAR_GRADIENTS[Math.abs(id) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelative(time: number, now: number): string {
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatShortDate(time);
}

export function formatShortDate(time: number, timeZone?: string): string {
  return new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone });
}

/** "Oct 12" for a YYYY-MM-DD string, without time-zone shifting. */
export function formatDueDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The calendar date of `time` in the viewer's time zone, as YYYY-MM-DD. */
export function localDate(time: number): string {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}
