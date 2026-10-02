import "server-only";
import { DATABASE_PROBLEM, DATABASE_URL, PGLITE_DIR } from "@/lib/config";
import { MIGRATIONS, migrate, openDatabase, type Database, type Queryable, type Row } from "./core";

export { escapeLike, isUniqueViolation } from "./core";
export type { Queryable, Row } from "./core";

// One database connection (pool) per server process, kept on globalThis so dev hot-reloads reuse it.
const globalForDb = globalThis as unknown as {
  __reelBoardDb?: Promise<Database>;
  __reelBoardDbVersion?: number;
  __reelBoardMigrating?: Promise<void>;
};

export async function getDb(): Promise<Database> {
  // Never quietly fall back to a database that would be wiped on the next deploy.
  if (DATABASE_PROBLEM) throw new Error(DATABASE_PROBLEM);
  globalForDb.__reelBoardDb ??= openDatabase({ url: DATABASE_URL, dir: PGLITE_DIR }).catch((error) => {
    globalForDb.__reelBoardDb = undefined; // let the next request retry (e.g. database still starting)
    throw error;
  });
  const db = await globalForDb.__reelBoardDb;
  // Also runs when a dev hot-reload adds a migration while the connection is already open.
  if (globalForDb.__reelBoardDbVersion !== MIGRATIONS.length) {
    globalForDb.__reelBoardMigrating ??= migrate(db).finally(() => {
      globalForDb.__reelBoardMigrating = undefined;
    });
    await globalForDb.__reelBoardMigrating;
    globalForDb.__reelBoardDbVersion = MIGRATIONS.length;
  }
  return db;
}

export async function sql<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  return (await getDb()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params?: unknown[]): Promise<T | undefined> {
  return (await sql<T>(text, params))[0];
}

export async function transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
  return (await getDb()).transaction(fn);
}
