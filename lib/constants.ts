// Shared between server and client code — keep this file free of Node-only imports.

export const SESSION_COOKIE = "rb_session";

export const STATUSES = ["new", "approved", "in_production", "posted", "skipped"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<Status, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
  },
  approved: {
    label: "Approved",
    className: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  },
  in_production: {
    label: "In production",
    className: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  },
  posted: {
    label: "Posted",
    className: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  },
  skipped: {
    label: "Skipped",
    className: "bg-zinc-500/10 text-zinc-500 ring-zinc-500/20 dark:text-zinc-400",
  },
};

/** Statuses an assignee (non-admin) may move their own task between. */
export const ASSIGNEE_STATUSES: readonly Status[] = ["approved", "in_production", "posted"];

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const SUGGESTED_TAGS = [
  "hook",
  "transition",
  "audio",
  "trend",
  "editing",
  "format",
  "humor",
  "product",
  "tutorial",
];

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 30;
export const MAX_IDEA_LENGTH = 2000;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_BIO_LENGTH = 400;
/** Profile photos are stored in the database, so they stay small. */
export const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MIN_PASSWORD_LENGTH = 8;

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Lowercase, trim, collapse whitespace to dashes and drop characters that are not letters, digits, - or _. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_TAG_LENGTH);
}

export function normalizeTags(raw: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const value of raw) {
    const tag = normalizeTag(value);
    if (tag) out.add(tag);
    if (out.size >= MAX_TAGS) break;
  }
  return [...out];
}
