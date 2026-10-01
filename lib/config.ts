import "server-only";
import path from "node:path";

/** Display name of the site. Override with the APP_NAME environment variable. */
export const APP_NAME = process.env.APP_NAME?.trim() || "Reel Board";

/** Folder that holds the SQLite database (mount this as a volume when self-hosting). */
// turbopackIgnore: these are runtime paths, not files the build should bundle.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR?.trim() || "data");

/** SQLite file. DATABASE_FILE=":memory:" is handy for tests. */
export const DATABASE_FILE =
  process.env.DATABASE_FILE?.trim() || path.join(/*turbopackIgnore: true*/ DATA_DIR, "app.db");

/**
 * Optional. When set, the first-run admin setup only works via /setup?token=<SETUP_TOKEN>,
 * so nobody else can claim a freshly deployed public site before you do.
 */
export const SETUP_TOKEN = process.env.SETUP_TOKEN?.trim() || "";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions are extended once less than this much time is left. */
export const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;
