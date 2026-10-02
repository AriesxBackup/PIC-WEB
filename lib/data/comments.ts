import "server-only";
import { one, sql } from "@/lib/db";
import type { Person } from "./users";

export type CommentItem = {
  id: number;
  /** "event" rows are automatic notes such as "moved this to Approved". */
  kind: "comment" | "event";
  body: string;
  createdAt: number;
  author: Person | null;
};

export async function listComments(reelId: number): Promise<CommentItem[]> {
  const rows = await sql<{
    id: number;
    kind: "comment" | "event";
    body: string;
    created_at: number;
    author_id: number | null;
    author_name: string | null;
  }>(
    `SELECT c.id, c.kind, c.body, c.created_at, c.author_id, u.name AS author_name
     FROM comments c LEFT JOIN users u ON u.id = c.author_id
     WHERE c.reel_id = $1 ORDER BY c.created_at, c.id`,
    [reelId],
  );
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at,
    author: row.author_id !== null && row.author_name !== null ? { id: row.author_id, name: row.author_name } : null,
  }));
}

export async function addComment(
  reelId: number,
  authorId: number,
  body: string,
  kind: "comment" | "event" = "comment",
): Promise<number> {
  const row = await one<{ id: number }>(
    "INSERT INTO comments (reel_id, author_id, kind, body, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [reelId, authorId, kind, body, Date.now()],
  );
  return row!.id;
}

export async function getComment(
  id: number,
): Promise<{ id: number; reelId: number; authorId: number | null; kind: string } | null> {
  const row = await one<{ id: number; reel_id: number; author_id: number | null; kind: string }>(
    "SELECT id, reel_id, author_id, kind FROM comments WHERE id = $1",
    [id],
  );
  return row ? { id: row.id, reelId: row.reel_id, authorId: row.author_id, kind: row.kind } : null;
}

export async function deleteComment(id: number): Promise<void> {
  await sql("DELETE FROM comments WHERE id = $1", [id]);
}
