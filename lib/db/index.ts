import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DATABASE_FILE } from "@/lib/config";
import { MIGRATIONS, migrate } from "./migrations";

// One connection per server process. Kept on globalThis so dev hot-reloads don't open new ones.
const globalForDb = globalThis as unknown as { __reelBoardDb?: Database.Database; __reelBoardDbVersion?: number };

export function getDb(): Database.Database {
  if (!globalForDb.__reelBoardDb) {
    if (DATABASE_FILE !== ":memory:") fs.mkdirSync(path.dirname(DATABASE_FILE), { recursive: true });
    const db = new Database(DATABASE_FILE);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    db.pragma("synchronous = NORMAL");
    globalForDb.__reelBoardDb = db;
  }
  // Also runs after a dev hot-reload adds a migration while the connection is already open.
  if (globalForDb.__reelBoardDbVersion !== MIGRATIONS.length) {
    migrate(globalForDb.__reelBoardDb);
    globalForDb.__reelBoardDbVersion = MIGRATIONS.length;
  }
  return globalForDb.__reelBoardDb;
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE";
}

/** Escapes % and _ so user text can be used inside a LIKE pattern with ESCAPE '\'. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
