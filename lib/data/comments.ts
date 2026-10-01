import "server-only";
import { getDb } from "@/lib/db";
import type { Person } from "./users";

export type CommentItem = {
  id: number;
  /** "event" rows are automatic notes such as "moved this to Approved". */
  kind: "comment" | "event";
  body: string;
  createdAt: number;
  author: Person | null;
};

export function listComments(reelId: number): CommentItem[] {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.kind, c.body, c.created_at, c.author_id, u.name AS author_name
       FROM comments c LEFT JOIN users u ON u.id = c.author_id
       WHERE c.reel_id = ? ORDER BY c.created_at, c.id`,
    )
    .all(reelId) as {
    id: number;
    kind: "comment" | "event";
    body: string;
    created_at: number;
    author_id: number | null;
    author_name: string | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at,
    author: row.author_id !== null && row.author_name !== null ? { id: row.author_id, name: row.author_name } : null,
  }));
}

export function addComment(reelId: number, authorId: number, body: string, kind: "comment" | "event" = "comment"): number {
  const result = getDb()
    .prepare("INSERT INTO comments (reel_id, author_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(reelId, authorId, kind, body, Date.now());
  return Number(result.lastInsertRowid);
}

export function getComment(id: number): { id: number; reelId: number; authorId: number | null; kind: string } | null {
  const row = getDb().prepare("SELECT id, reel_id, author_id, kind FROM comments WHERE id = ?").get(id) as
    | { id: number; reel_id: number; author_id: number | null; kind: string }
    | undefined;
  return row ? { id: row.id, reelId: row.reel_id, authorId: row.author_id, kind: row.kind } : null;
}

export function deleteComment(id: number): void {
  getDb().prepare("DELETE FROM comments WHERE id = ?").run(id);
}
