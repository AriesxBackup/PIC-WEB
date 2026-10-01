import "server-only";
import type { Status } from "@/lib/constants";
import { escapeLike, getDb } from "@/lib/db";
import type { ReelKind } from "@/lib/instagram";
import type { Person } from "./users";

export type ReelSummary = {
  id: number;
  shortcode: string;
  kind: ReelKind;
  /** Instagram handle of the creator, once the preview has been fetched. */
  igAuthor: string | null;
  idea: string;
  status: Status;
  dueDate: string | null;
  createdAt: number;
  updatedAt: number;
  author: Person | null;
  assignee: Person | null;
  tags: string[];
  voteCount: number;
  votedByMe: boolean;
  commentCount: number;
};

type SummaryRow = {
  id: number;
  shortcode: string;
  kind: ReelKind;
  ig_author: string | null;
  idea: string;
  status: Status;
  due_date: string | null;
  created_at: number;
  updated_at: number;
  author_id: number | null;
  author_name: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  tags: string | null;
  vote_count: number;
  voted: number;
  comment_count: number;
};

const TAG_SEPARATOR = "\u001f";

const SELECT_SUMMARY = `
  SELECT r.id, r.shortcode, r.kind, r.ig_author, r.idea, r.status, r.due_date, r.created_at, r.updated_at,
         r.created_by AS author_id, au.name AS author_name,
         r.assignee_id, asg.name AS assignee_name,
         (SELECT group_concat(t.tag, char(31)) FROM reel_tags t WHERE t.reel_id = r.id) AS tags,
         (SELECT COUNT(*) FROM votes v WHERE v.reel_id = r.id) AS vote_count,
         EXISTS (SELECT 1 FROM votes v WHERE v.reel_id = r.id AND v.user_id = @me) AS voted,
         (SELECT COUNT(*) FROM comments c WHERE c.reel_id = r.id AND c.kind = 'comment') AS comment_count
  FROM reels r
  LEFT JOIN users au ON au.id = r.created_by
  LEFT JOIN users asg ON asg.id = r.assignee_id`;

function toSummary(row: SummaryRow): ReelSummary {
  return {
    id: row.id,
    shortcode: row.shortcode,
    kind: row.kind,
    igAuthor: row.ig_author,
    idea: row.idea,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: row.author_id !== null && row.author_name !== null ? { id: row.author_id, name: row.author_name } : null,
    assignee:
      row.assignee_id !== null && row.assignee_name !== null
        ? { id: row.assignee_id, name: row.assignee_name }
        : null,
    tags: row.tags ? row.tags.split(TAG_SEPARATOR).sort() : [],
    voteCount: row.vote_count,
    votedByMe: row.voted === 1,
    commentCount: row.comment_count,
  };
}

export type FeedFilters = {
  /** A status, or undefined for everything except skipped ideas. */
  status?: Status;
  tag?: string;
  q?: string;
  authorId?: number;
  assigneeId?: number;
  sort?: "new" | "top";
  limit?: number;
};

export function listReels(me: number, filters: FeedFilters): { items: ReelSummary[]; hasMore: boolean } {
  const where: string[] = [];
  const params: Record<string, unknown> = { me };

  if (filters.status) {
    where.push("r.status = @status");
    params.status = filters.status;
  } else {
    where.push("r.status != 'skipped'");
  }
  if (filters.tag) {
    where.push("EXISTS (SELECT 1 FROM reel_tags t WHERE t.reel_id = r.id AND t.tag = @tag)");
    params.tag = filters.tag;
  }
  if (filters.authorId) {
    where.push("r.created_by = @authorId");
    params.authorId = filters.authorId;
  }
  if (filters.assigneeId) {
    where.push("r.assignee_id = @assigneeId");
    params.assigneeId = filters.assigneeId;
  }
  if (filters.q) {
    where.push(`(r.idea LIKE @q ESCAPE '\\' OR au.name LIKE @q ESCAPE '\\' OR r.ig_author LIKE @q ESCAPE '\\'
      OR EXISTS (SELECT 1 FROM reel_tags t WHERE t.reel_id = r.id AND t.tag LIKE @q ESCAPE '\\'))`);
    params.q = `%${escapeLike(filters.q)}%`;
  }

  const limit = filters.limit ?? 24;
  params.limit = limit + 1;
  const order = filters.sort === "top" ? "vote_count DESC, r.created_at DESC" : "r.created_at DESC";
  const rows = getDb()
    .prepare(`${SELECT_SUMMARY} WHERE ${where.join(" AND ")} ORDER BY ${order}, r.id DESC LIMIT @limit`)
    .all(params) as SummaryRow[];
  return { items: rows.slice(0, limit).map(toSummary), hasMore: rows.length > limit };
}

export function getReel(id: number, me: number): ReelSummary | null {
  const row = getDb().prepare(`${SELECT_SUMMARY} WHERE r.id = @id`).get({ id, me }) as SummaryRow | undefined;
  return row ? toSummary(row) : null;
}

/** Everything grouped by status, for the board view. */
export function listBoard(me: number): Record<Status, ReelSummary[]> {
  const rows = getDb()
    .prepare(`${SELECT_SUMMARY} ORDER BY r.created_at DESC LIMIT 1000`)
    .all({ me }) as SummaryRow[];
  const board: Record<Status, ReelSummary[]> = {
    new: [],
    approved: [],
    in_production: [],
    posted: [],
    skipped: [],
  };
  for (const row of rows) board[row.status].push(toSummary(row));
  for (const status of ["approved", "in_production"] as const) board[status].sort(byDueDate);
  for (const status of ["posted", "skipped"] as const) board[status].sort((a, b) => b.updatedAt - a.updatedAt);
  return board;
}

function byDueDate(a: ReelSummary, b: ReelSummary): number {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return b.createdAt - a.createdAt;
}

/** Open work that has someone assigned, soonest due first. */
export function listOpenTasks(me: number, assigneeId?: number): ReelSummary[] {
  const rows = getDb()
    .prepare(
      `${SELECT_SUMMARY}
       WHERE r.assignee_id IS NOT NULL ${assigneeId ? "AND r.assignee_id = @assigneeId" : ""}
         AND r.status IN ('new', 'approved', 'in_production')
       ORDER BY r.due_date IS NULL, r.due_date, r.created_at DESC`,
    )
    .all({ me, assigneeId }) as SummaryRow[];
  return rows.map(toSummary);
}

export function listRecentlyPosted(me: number, assigneeId?: number, limit = 10): ReelSummary[] {
  const rows = getDb()
    .prepare(
      `${SELECT_SUMMARY}
       WHERE r.status = 'posted' ${assigneeId ? "AND r.assignee_id = @assigneeId" : ""}
       ORDER BY r.updated_at DESC LIMIT @limit`,
    )
    .all({ me, assigneeId, limit }) as SummaryRow[];
  return rows.map(toSummary);
}

export function countOpenTasks(userId: number): number {
  return (
    getDb()
      .prepare(
        "SELECT COUNT(*) AS n FROM reels WHERE assignee_id = ? AND status IN ('new', 'approved', 'in_production')",
      )
      .get(userId) as { n: number }
  ).n;
}

export function findReelByShortcode(
  shortcode: string,
): { id: number; authorName: string | null; createdAt: number } | null {
  const row = getDb()
    .prepare(
      `SELECT r.id, u.name AS author_name, r.created_at
       FROM reels r LEFT JOIN users u ON u.id = r.created_by WHERE r.shortcode = ?`,
    )
    .get(shortcode) as { id: number; author_name: string | null; created_at: number } | undefined;
  return row ? { id: row.id, authorName: row.author_name, createdAt: row.created_at } : null;
}

export type ReelAccess = {
  id: number;
  createdBy: number | null;
  assigneeId: number | null;
  status: Status;
  dueDate: string | null;
};

export function getReelAccess(id: number): ReelAccess | null {
  const row = getDb()
    .prepare("SELECT id, created_by, assignee_id, status, due_date FROM reels WHERE id = ?")
    .get(id) as
    | { id: number; created_by: number | null; assignee_id: number | null; status: Status; due_date: string | null }
    | undefined;
  return row
    ? {
        id: row.id,
        createdBy: row.created_by,
        assigneeId: row.assignee_id,
        status: row.status,
        dueDate: row.due_date,
      }
    : null;
}

function replaceTags(reelId: number, tags: string[]): void {
  const db = getDb();
  db.prepare("DELETE FROM reel_tags WHERE reel_id = ?").run(reelId);
  const insert = db.prepare("INSERT OR IGNORE INTO reel_tags (reel_id, tag) VALUES (?, ?)");
  for (const tag of tags) insert.run(reelId, tag);
}

/** Throws a UNIQUE constraint error if the reel is already on the board. */
export function createReel(input: {
  shortcode: string;
  kind: ReelKind;
  idea: string;
  tags: string[];
  createdBy: number;
}): number {
  const db = getDb();
  return db.transaction(() => {
    const now = Date.now();
    const result = db
      .prepare(
        `INSERT INTO reels (shortcode, kind, idea, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'new', ?, ?, ?)`,
      )
      .run(input.shortcode, input.kind, input.idea, input.createdBy, now, now);
    const id = Number(result.lastInsertRowid);
    replaceTags(id, input.tags);
    return id;
  })();
}

export function updateReelIdea(id: number, idea: string, tags: string[]): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE reels SET idea = ?, updated_at = ? WHERE id = ?").run(idea, Date.now(), id);
    replaceTags(id, tags);
  })();
}

export function updateReelStatus(id: number, status: Status): void {
  getDb().prepare("UPDATE reels SET status = ?, updated_at = ? WHERE id = ?").run(status, Date.now(), id);
}

export function updateReelAssignment(id: number, assigneeId: number | null, dueDate: string | null): void {
  getDb()
    .prepare("UPDATE reels SET assignee_id = ?, due_date = ?, updated_at = ? WHERE id = ?")
    .run(assigneeId, dueDate, Date.now(), id);
}

export function deleteReel(id: number): void {
  getDb().prepare("DELETE FROM reels WHERE id = ?").run(id);
}

/** Adds or removes the user's 🔥 vote. */
export function toggleVote(reelId: number, userId: number): { voted: boolean; count: number } {
  const db = getDb();
  return db.transaction(() => {
    const removed = db.prepare("DELETE FROM votes WHERE reel_id = ? AND user_id = ?").run(reelId, userId).changes;
    if (!removed) {
      db.prepare("INSERT INTO votes (reel_id, user_id, created_at) VALUES (?, ?, ?)").run(reelId, userId, Date.now());
    }
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM votes WHERE reel_id = ?").get(reelId) as { n: number };
    return { voted: !removed, count: n };
  })();
}

export type PreviewTarget = {
  id: number;
  shortcode: string;
  kind: ReelKind;
  igAuthor: string | null;
  previewAt: number | null;
};

export function getPreviewTarget(shortcode: string): PreviewTarget | null {
  const row = getDb()
    .prepare("SELECT id, shortcode, kind, ig_author, preview_at FROM reels WHERE shortcode = ?")
    .get(shortcode) as
    | { id: number; shortcode: string; kind: ReelKind; ig_author: string | null; preview_at: number | null }
    | undefined;
  return row
    ? { id: row.id, shortcode: row.shortcode, kind: row.kind, igAuthor: row.ig_author, previewAt: row.preview_at }
    : null;
}

/** Records a preview attempt; author/caption are kept when a later attempt fails. */
export function savePreviewInfo(id: number, info: { author: string | null; caption: string | null }): void {
  getDb()
    .prepare(
      `UPDATE reels SET ig_author = COALESCE(?, ig_author), ig_caption = COALESCE(?, ig_caption), preview_at = ?
       WHERE id = ?`,
    )
    .run(info.author, info.caption, Date.now(), id);
}

export function listTags(): { tag: string; count: number }[] {
  return getDb()
    .prepare("SELECT tag, COUNT(*) AS count FROM reel_tags GROUP BY tag ORDER BY count DESC, tag LIMIT 60")
    .all() as { tag: string; count: number }[];
}
