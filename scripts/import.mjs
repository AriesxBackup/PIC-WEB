// Copies a whole board into the current database (local, or Railway when DATABASE_PUBLIC_URL is set):
//   npm run import -- data/app.db                       board from the earlier SQLite version (+ its previews)
//   npm run import -- reel-board-backup-2026-10-02.json a backup downloaded from Team → Download backup
// The target must be empty (a fresh site where nobody has signed up yet) so nothing gets mixed up.
import fs from "node:fs";
import path from "node:path";
import { openMigratedDatabase } from "../lib/db/core.ts";
import { databaseTarget } from "./db-target.mjs";

const source = process.argv[2];
if (!source || !fs.existsSync(source)) {
  console.error("Usage: npm run import -- <board.db | reel-board-backup.json>");
  process.exit(1);
}

/** Reads the board into plain objects, whatever the source format. */
async function readSource(file) {
  if (file.toLowerCase().endsWith(".json")) {
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    if (backup.format !== "reel-board-backup") throw new Error(`${file} is not a Reel Board backup.`);
    return { ...backup, thumbnails: [] };
  }

  const { default: Database } = await import("better-sqlite3");
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const columns = new Set(db.prepare("PRAGMA table_info(reels)").all().map((c) => c.name));
    const reels = db.prepare("SELECT * FROM reels ORDER BY id").all();
    const thumbsDir = path.join(path.dirname(file), "thumbs");
    const thumbnails = [];
    for (const reel of reels) {
      const thumb = path.join(thumbsDir, `${reel.shortcode}.img`);
      if (fs.existsSync(thumb)) thumbnails.push({ reel_id: reel.id, data: fs.readFileSync(thumb) });
    }
    return {
      users: db.prepare("SELECT * FROM users ORDER BY id").all().map((u) => ({ ...u, active: u.active === 1 })),
      reels: reels.map((r) => ({
        ...r,
        ig_author: columns.has("ig_author") ? r.ig_author : null,
        ig_caption: columns.has("ig_caption") ? r.ig_caption : null,
      })),
      reel_tags: db.prepare("SELECT reel_id, tag FROM reel_tags").all(),
      votes: db.prepare("SELECT reel_id, user_id, created_at FROM votes").all(),
      comments: db.prepare("SELECT id, reel_id, author_id, kind, body, created_at FROM comments ORDER BY id").all(),
      thumbnails,
    };
  } finally {
    db.close();
  }
}

function imageType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return "image/jpeg";
}

const board = await readSource(source);
const target = databaseTarget();
const db = await openMigratedDatabase(target);
try {
  const [{ n }] = await db.query("SELECT COUNT(*)::int AS n FROM users");
  if (n > 0) {
    console.error(`${target.label} already has ${n} account(s). Import only into a fresh board (before anyone signs up).`);
    process.exitCode = 1;
  } else {
    await db.transaction(async (tx) => {
      for (const u of board.users) {
        await tx.query(
          "INSERT INTO users (id, email, name, password_hash, role, active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [u.id, u.email, u.name, u.password_hash, u.role, Boolean(u.active), u.created_at],
        );
      }
      for (const r of board.reels) {
        await tx.query(
          `INSERT INTO reels (id, shortcode, kind, idea, status, assignee_id, due_date, created_by, created_at, updated_at,
                              ig_author, ig_caption)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [r.id, r.shortcode, r.kind, r.idea, r.status, r.assignee_id, r.due_date, r.created_by, r.created_at, r.updated_at,
            r.ig_author ?? null, r.ig_caption ?? null],
        );
      }
      for (const t of board.reel_tags) {
        await tx.query("INSERT INTO reel_tags (reel_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING", [t.reel_id, t.tag]);
      }
      for (const v of board.votes) {
        await tx.query("INSERT INTO votes (reel_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [
          v.reel_id,
          v.user_id,
          v.created_at,
        ]);
      }
      for (const c of board.comments) {
        await tx.query("INSERT INTO comments (id, reel_id, author_id, kind, body, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [
          c.id,
          c.reel_id,
          c.author_id,
          c.kind,
          c.body,
          c.created_at,
        ]);
      }
      for (const t of board.thumbnails) {
        await tx.query("INSERT INTO thumbnails (reel_id, content_type, data, created_at) VALUES ($1, $2, $3, $4)", [
          t.reel_id,
          imageType(t.data),
          t.data,
          Date.now(),
        ]);
      }
      // New rows continue numbering after the imported ones.
      for (const table of ["users", "reels", "comments"]) {
        await tx.query(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
        );
      }
    });
    console.log(
      `Imported into ${target.label}: ${board.users.length} accounts, ${board.reels.length} reels, ` +
        `${board.comments.length} comments, ${board.votes.length} votes, ${board.thumbnails.length} preview images.`,
    );
  }
} finally {
  await db.close();
}
