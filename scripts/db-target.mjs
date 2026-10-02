// Which database a command-line script should use (same rules as the site):
// DATABASE_PUBLIC_URL / DATABASE_URL → that PostgreSQL server (e.g. Railway), otherwise the local
// built-in database in DATA_DIR/pglite (./data by default).
// DATABASE_PUBLIC_URL wins because Railway's private DATABASE_URL only works inside Railway.
import path from "node:path";

export function databaseTarget() {
  const url = (process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || "").trim();
  const dir = path.join(path.resolve(process.env.DATA_DIR || "data"), "pglite");
  return { url, dir, label: url ? `PostgreSQL at ${new URL(url).host}` : `the local database (${dir})` };
}
