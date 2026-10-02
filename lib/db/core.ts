// Database access shared by the app (through lib/db/index.ts) and the command-line scripts.
//
// - With a postgres:// DATABASE_URL (Railway, Docker) it uses a real PostgreSQL server.
// - Without one it uses PGlite: the same PostgreSQL engine running inside Node, stored in a folder —
//   so the site also runs on a laptop with zero setup, and every query is identical in both places.
//
// This file must stay free of "server-only" and relative imports so plain Node scripts can import it.
import fs from "node:fs";
import path from "node:path";

export type Row = Record<string, unknown>;

export interface Queryable {
  /** Runs one statement with $1, $2… parameters and returns the rows. */
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs a script that may contain several statements (no parameters). */
  exec(text: string): Promise<void>;
}

export interface Database extends Queryable {
  kind: "postgres" | "pglite";
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export type DatabaseTarget = {
  /** postgres://… for a PostgreSQL server, "memory://" for a throwaway in-memory database (tests). */
  url?: string;
  /** Folder for the built-in database when no URL is given. */
  dir: string;
};

export async function openDatabase(target: DatabaseTarget): Promise<Database> {
  const url = target.url?.trim();
  if (url && /^postgres(ql)?:\/\//i.test(url)) return openPostgres(url);
  if (url === "memory://") return openPglite(undefined);
  // A URL that isn't PostgreSQL is a mistake — never silently use a different (local) database instead.
  if (url) throw new Error(`The database URL must start with postgresql:// (got "${url.slice(0, 20)}…").`);
  return openPglite(target.dir);
}

/** Opens the database and brings its tables up to date. */
export async function openMigratedDatabase(target: DatabaseTarget): Promise<Database> {
  const db = await openDatabase(target);
  try {
    await migrate(db);
  } catch (error) {
    await db.close();
    throw error;
  }
  return db;
}

// ---------------------------------------------------------------------------------------------
// PostgreSQL server (Railway, Docker…)

/** Railway's public proxy uses a self-signed certificate; its private network needs no TLS. */
function sslFor(url: URL): false | { rejectUnauthorized: boolean } {
  const mode = (url.searchParams.get("sslmode") ?? process.env.PGSSLMODE ?? "").toLowerCase();
  if (mode === "disable") return false;
  if (mode === "verify-full" || mode === "verify-ca") return { rejectUnauthorized: true };
  if (mode) return { rejectUnauthorized: false };
  const host = url.hostname;
  const local = ["localhost", "127.0.0.1", "::1", "[::1]", "db", "postgres"].includes(host);
  return local || host.endsWith(".railway.internal") ? false : { rejectUnauthorized: false };
}

async function openPostgres(connection: string): Promise<Database> {
  const pg = (await import("pg")).default;
  // BIGINT columns hold millisecond timestamps (well within Number's safe range).
  pg.types.setTypeParser(20, (value: string) => Number(value));

  const url = new URL(connection);
  const ssl = sslFor(url);
  const explicitMode = Boolean(url.searchParams.get("sslmode") ?? process.env.PGSSLMODE);
  for (const key of ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(key);
  const makePool = (useSsl: typeof ssl) => {
    const created = new pg.Pool({
      connectionString: url.toString(),
      ssl: useSsl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    created.on("error", () => {
      // An idle connection dropped (e.g. database restart); the pool reconnects on the next query.
    });
    return created;
  };

  let pool = makePool(ssl);
  // Like libpq's default "prefer": use TLS when the server offers it, plain otherwise.
  if (ssl && !explicitMode) {
    try {
      await pool.query("SELECT 1");
    } catch (error) {
      if (!/does not support SSL/i.test(String((error as Error).message))) throw error;
      await pool.end();
      pool = makePool(false);
    }
  }

  const run = async <T>(client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }, text: string, params?: unknown[]) =>
    (await client.query(text, params)).rows as T[];

  return {
    kind: "postgres",
    query: (text, params) => run(pool, text, params),
    exec: async (text) => {
      await pool.query(text);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({
          query: (text, params) => run(client, text, params),
          exec: async (text) => {
            await client.query(text);
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

// ---------------------------------------------------------------------------------------------
// Built-in PostgreSQL (PGlite) — only one process may open a folder at a time.

const LOCK_FILE = ".reel-board.lock";

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function lockFolder(dir: string): () => void {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, LOCK_FILE);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
      const release = () => {
        try {
          if (fs.readFileSync(lock, "utf8") === String(process.pid)) fs.rmSync(lock);
        } catch {
          // already gone
        }
      };
      process.once("exit", release);
      return release;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const owner = Number(fs.readFileSync(lock, "utf8"));
      if (owner && owner !== process.pid && processAlive(owner)) {
        throw new Error(
          `The local database in ${dir} is in use by another program (process ${owner}). ` +
            "Stop the running site first, then try again.",
        );
      }
      fs.rmSync(lock, { force: true }); // left behind by a program that has exited
    }
  }
  throw new Error(`Could not lock ${dir}`);
}

async function openPglite(dir: string | undefined): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const release = dir ? lockFolder(dir) : () => {};
  let db: InstanceType<typeof PGlite>;
  try {
    db = new PGlite(dir);
    await db.waitReady;
  } catch (error) {
    release();
    throw error;
  }

  return {
    kind: "pglite",
    query: async (text, params) => (await db.query(text, params)).rows as never,
    exec: async (text) => {
      await db.exec(text);
    },
    transaction: (fn) =>
      db.transaction((tx) =>
        fn({
          query: async (text, params) => (await tx.query(text, params)).rows as never,
          exec: async (text) => {
            await tx.exec(text);
          },
        }),
      ),
    async close() {
      await db.close();
      release();
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Schema. Append new migrations at the end — never edit one that has already shipped.

export const MIGRATIONS: string[] = [
  /* 1: initial schema */ `
  CREATE TABLE users (
    id            INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    email         TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    BIGINT  NOT NULL
  );
  CREATE UNIQUE INDEX users_email_key ON users (lower(email));

  CREATE TABLE sessions (
    id         TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at BIGINT  NOT NULL,
    created_at BIGINT  NOT NULL
  );
  CREATE INDEX sessions_user_id ON sessions(user_id);

  CREATE TABLE reels (
    id          INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    shortcode   TEXT    NOT NULL UNIQUE,
    kind        TEXT    NOT NULL CHECK (kind IN ('reel', 'p', 'tv')),
    idea        TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'approved', 'in_production', 'posted', 'skipped')),
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date    TEXT    CHECK (due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  BIGINT  NOT NULL,
    updated_at  BIGINT  NOT NULL,
    ig_author   TEXT,
    ig_caption  TEXT,
    preview_at  BIGINT
  );
  CREATE INDEX reels_created_at ON reels(created_at);
  CREATE INDEX reels_status ON reels(status);
  CREATE INDEX reels_assignee_id ON reels(assignee_id);
  CREATE INDEX reels_created_by ON reels(created_by);

  CREATE TABLE reel_tags (
    reel_id INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    tag     TEXT    NOT NULL,
    PRIMARY KEY (reel_id, tag)
  );
  CREATE INDEX reel_tags_tag ON reel_tags(tag);

  CREATE TABLE votes (
    reel_id    INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at BIGINT  NOT NULL,
    PRIMARY KEY (reel_id, user_id)
  );
  CREATE INDEX votes_user_id ON votes(user_id);

  CREATE TABLE comments (
    id         INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    reel_id    INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    kind       TEXT    NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment', 'event')),
    body       TEXT    NOT NULL,
    created_at BIGINT  NOT NULL
  );
  CREATE INDEX comments_reel_id ON comments(reel_id, created_at);
  CREATE INDEX comments_author_id ON comments(author_id);

  -- Preview images fetched from Instagram (kept in the database so the app server stores no files).
  CREATE TABLE thumbnails (
    reel_id      INTEGER PRIMARY KEY REFERENCES reels(id) ON DELETE CASCADE,
    content_type TEXT    NOT NULL,
    data         BYTEA   NOT NULL,
    created_at   BIGINT  NOT NULL
  );
  `,
  /* 2: profiles */ `
  ALTER TABLE users ADD COLUMN bio            TEXT   NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN ig_handle      TEXT   NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN avatar_mime    TEXT;
  ALTER TABLE users ADD COLUMN avatar_data    BYTEA;
  ALTER TABLE users ADD COLUMN avatar_version BIGINT NOT NULL DEFAULT 0;
  `,
];

/** Applies pending migrations. Safe to call from several processes at once (advisory lock). */
export async function migrate(db: Database): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(727274)");
    await tx.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at BIGINT NOT NULL)");
    const applied = new Set((await tx.query<{ version: number }>("SELECT version FROM schema_migrations")).map((r) => r.version));
    for (let index = 0; index < MIGRATIONS.length; index++) {
      const version = index + 1;
      if (applied.has(version)) continue;
      await tx.exec(MIGRATIONS[index]);
      await tx.query("INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)", [version, Date.now()]);
    }
  });
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}

/** Escapes % and _ so user text can be used inside a LIKE/ILIKE pattern. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
