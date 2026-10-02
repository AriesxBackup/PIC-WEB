import "server-only";
import path from "node:path";

/** Display name of the site. Override with the APP_NAME environment variable. */
export const APP_NAME = process.env.APP_NAME?.trim() || "Reel Board";

/** Local data folder (used when there's no DATABASE_URL, e.g. on your own computer). */
// turbopackIgnore: these are runtime paths, not files the build should bundle.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR?.trim() || "data");

/**
 * PostgreSQL connection string — on Railway set it to ${{Postgres.DATABASE_URL}}.
 * Without it, the built-in PostgreSQL (PGlite) stores the board in DATA_DIR/pglite.
 * "memory://" gives a throwaway in-memory database (tests).
 */
export const DATABASE_URL = process.env.DATABASE_URL?.trim() || "";
export const PGLITE_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "pglite");

/**
 * Optional. When set, the first-run admin setup only works via /setup?token=<SETUP_TOKEN>,
 * so nobody else can claim a freshly deployed public site before you do.
 */
export const SETUP_TOKEN = process.env.SETUP_TOKEN?.trim() || "";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions are extended once less than this much time is left. */
export const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;
