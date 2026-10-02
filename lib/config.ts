import "server-only";
import path from "node:path";

/** Display name of the site. Override with the APP_NAME environment variable. */
export const APP_NAME = process.env.APP_NAME?.trim() || "Reel Board";

/** True when running on Railway (Railway sets these for every deployment). */
export const ON_RAILWAY = Boolean(
  process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID,
);
const RAILWAY_VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() || "";

/** Local data folder (used when there's no DATABASE_URL). On Railway, an attached volume wins. */
// turbopackIgnore: these are runtime paths, not files the build should bundle.
export const DATA_DIR = path.resolve(
  /*turbopackIgnore: true*/ (ON_RAILWAY && RAILWAY_VOLUME) || process.env.DATA_DIR?.trim() || "data",
);

/**
 * PostgreSQL connection string — on Railway set DATABASE_URL to ${{Postgres.DATABASE_URL}}.
 * Railway's other spellings (DATABASE_PRIVATE_URL, POSTGRES_URL, or PGHOST/PGUSER/…) work too.
 * Without any, the built-in PostgreSQL (PGlite) stores the board in DATA_DIR/pglite.
 * "memory://" gives a throwaway in-memory database (tests).
 */
function resolveDatabaseUrl(): string {
  const direct = [process.env.DATABASE_URL, process.env.DATABASE_PRIVATE_URL, process.env.POSTGRES_URL]
    .map((value) => value?.trim())
    .find(Boolean);
  if (direct) return direct;
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (PGHOST && PGUSER && PGDATABASE) {
    const auth = `${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD ?? "")}`;
    return `postgresql://${auth}@${PGHOST}:${PGPORT || 5432}/${encodeURIComponent(PGDATABASE)}`;
  }
  return "";
}

export const DATABASE_URL = resolveDatabaseUrl();
export const PGLITE_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "pglite");

/**
 * A database setup that would lose the board (or can't work at all), explained for the person
 * deploying — or null when everything is fine. The site refuses to start with such a setup instead
 * of quietly using a database that is wiped on the next deploy.
 */
export const DATABASE_PROBLEM: string | null = (() => {
  if (DATABASE_URL.includes("${{")) {
    return (
      "DATABASE_URL contains the text of a Railway reference that was never filled in. In Railway → your web " +
      "service → Variables, delete it and add it again with “Add Reference” → Postgres → DATABASE_URL."
    );
  }
  if (DATABASE_URL && !/^postgres(ql)?:\/\//i.test(DATABASE_URL) && DATABASE_URL !== "memory://") {
    return "DATABASE_URL must be a PostgreSQL connection string starting with postgresql:// (check the variable's value).";
  }
  if (!DATABASE_URL && ON_RAILWAY && !RAILWAY_VOLUME && process.env.ALLOW_TEMPORARY_DATABASE !== "true") {
    return (
      "No database is connected, so everything would be erased on the next deploy. In Railway → your web service " +
      "→ Variables, add DATABASE_URL = ${{Postgres.DATABASE_URL}} (create a PostgreSQL database in the project first)."
    );
  }
  return null;
})();

/** Where the board is stored, in words (shown to admins on the Team page). */
export const DATABASE_LABEL = DATABASE_URL.startsWith("postgres")
  ? `PostgreSQL at ${new URL(DATABASE_URL).hostname}`
  : `Built-in database in ${PGLITE_DIR}`;

/**
 * Optional. When set, the first-run admin setup only works via /setup?token=<SETUP_TOKEN>,
 * so nobody else can claim a freshly deployed public site before you do.
 */
export const SETUP_TOKEN = process.env.SETUP_TOKEN?.trim() || "";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions are extended once less than this much time is left. */
export const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;
