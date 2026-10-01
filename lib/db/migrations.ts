import type { Database } from "better-sqlite3";

// Append new migrations to the end — never edit one that has already shipped.
// The index + 1 is stored in SQLite's `user_version` pragma.
export const MIGRATIONS: string[] = [
  /* 1: initial schema */ `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    id         TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user_id ON sessions(user_id);

  CREATE TABLE reels (
    id          INTEGER PRIMARY KEY,
    shortcode   TEXT    NOT NULL UNIQUE,
    kind        TEXT    NOT NULL CHECK (kind IN ('reel', 'p', 'tv')),
    idea        TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'approved', 'in_production', 'posted', 'skipped')),
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date    TEXT,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX reels_created_at ON reels(created_at);
  CREATE INDEX reels_status ON reels(status);
  CREATE INDEX reels_assignee_id ON reels(assignee_id);
  CREATE INDEX reels_created_by ON reels(created_by);

  CREATE TABLE reel_tags (
    reel_id INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    tag     TEXT    NOT NULL,
    PRIMARY KEY (reel_id, tag)
  ) WITHOUT ROWID;
  CREATE INDEX reel_tags_tag ON reel_tags(tag);

  CREATE TABLE votes (
    reel_id    INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (reel_id, user_id)
  ) WITHOUT ROWID;
  CREATE INDEX votes_user_id ON votes(user_id);

  CREATE TABLE comments (
    id         INTEGER PRIMARY KEY,
    reel_id    INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    kind       TEXT    NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment', 'event')),
    body       TEXT    NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX comments_reel_id ON comments(reel_id, created_at);
  CREATE INDEX comments_author_id ON comments(author_id);
  `,

  /* 2: preview info fetched from Instagram (creator handle, caption) — thumbnails are files in DATA_DIR/thumbs */ `
  ALTER TABLE reels ADD COLUMN ig_author TEXT;
  ALTER TABLE reels ADD COLUMN ig_caption TEXT;
  ALTER TABLE reels ADD COLUMN preview_at INTEGER;
  `,
];

export function migrate(db: Database): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}
