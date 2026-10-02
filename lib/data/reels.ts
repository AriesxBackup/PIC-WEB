import "server-only";
import type { Status } from "@/lib/constants";
import { escapeLike, one, sql, transaction, type Queryable } from "@/lib/db";
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
  tags: string[];
  vote_count: number;
  voted: boolean;
  comment_count: number;
};

// $1 is always the viewer's user id (for "did I vote?").
const SELECT_SUMMARY = `
  SELECT r.id, r.shortcode, r.kind, r.ig_author, r.idea, r.status, r.due_date, r.created_at, r.updated_at,
         r.created_by AS author_id, au.name AS author_name,
         r.assignee_id, asg.name AS assignee_name,
         COALESCE((SELECT array_agg(t.tag ORDER BY t.tag) FROM reel_tags t WHERE t.reel_id = r.id), '{}') AS tags,
         (SELECT COUNT(*)::int FROM votes v WHERE v.reel_id = r.id) AS vote_count,
         EXISTS (SELECT 1 FROM votes v WHERE v.reel_id = r.id AND v.user_id = $1) AS voted,
         (SELECT COUNT(*)::int FROM comments c WHERE c.reel_id = r.id AND c.kind = 'comment') AS comment_count
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
    tags: row.tags ?? [],
    voteCount: row.vote_count,
    votedByMe: row.voted,
    commentCount: row.comment_count,
  };
}

/** Collects query parameters and hands out $n placeholders ($1 is reserved for the viewer). */
function paramsFor(me: number) {
  const values: unknown[] = [me];
  return {
    values,
    add(value: unknown): string {
      values.push(value);
      return `$${values.length}`;
    },
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

export async function listReels(me: number, filters: FeedFilters): Promise<{ items: ReelSummary[]; hasMore: boolean }> {
  const p = paramsFor(me);
  const where: string[] = [];

  if (filters.status) where.push(`r.status = ${p.add(filters.status)}`);
  else where.push("r.status <> 'skipped'");
  if (filters.tag) {
    where.push(`EXISTS (SELECT 1 FROM reel_tags t WHERE t.reel_id = r.id AND t.tag = ${p.add(filters.tag)})`);
  }
  if (filters.authorId) where.push(`r.created_by = ${p.add(filters.authorId)}`);
  if (filters.assigneeId) where.push(`r.assignee_id = ${p.add(filters.assigneeId)}`);
  if (filters.q) {
    const q = p.add(`%${escapeLike(filters.q)}%`);
    where.push(`(r.idea ILIKE ${q} OR au.name ILIKE ${q} OR r.ig_author ILIKE ${q}
      OR EXISTS (SELECT 1 FROM reel_tags t WHERE t.reel_id = r.id AND t.tag ILIKE ${q}))`);
  }

  const limit = filters.limit ?? 24;
  const order = filters.sort === "top" ? "vote_count DESC, r.created_at DESC" : "r.created_at DESC";
  const rows = await sql<SummaryRow>(
    `${SELECT_SUMMARY} WHERE ${where.join(" AND ")} ORDER BY ${order}, r.id DESC LIMIT ${p.add(limit + 1)}`,
    p.values,
  );
  return { items: rows.slice(0, limit).map(toSummary), hasMore: rows.length > limit };
}

export async function getReel(id: number, me: number): Promise<ReelSummary | null> {
  const row = await one<SummaryRow>(`${SELECT_SUMMARY} WHERE r.id = $2`, [me, id]);
  return row ? toSummary(row) : null;
}

/** Everything grouped by status, for the board view. */
export async function listBoard(me: number): Promise<Record<Status, ReelSummary[]>> {
  const rows = await sql<SummaryRow>(`${SELECT_SUMMARY} ORDER BY r.created_at DESC LIMIT 1000`, [me]);
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
export async function listOpenTasks(me: number, assigneeId?: number): Promise<ReelSummary[]> {
  const p = paramsFor(me);
  const rows = await sql<SummaryRow>(
    `${SELECT_SUMMARY}
     WHERE r.assignee_id IS NOT NULL ${assigneeId ? `AND r.assignee_id = ${p.add(assigneeId)}` : ""}
       AND r.status IN ('new', 'approved', 'in_production')
     ORDER BY r.due_date IS NULL, r.due_date, r.created_at DESC`,
    p.values,
  );
  return rows.map(toSummary);
}

export async function listRecentlyPosted(me: number, assigneeId?: number, limit = 10): Promise<ReelSummary[]> {
  const p = paramsFor(me);
  const rows = await sql<SummaryRow>(
    `${SELECT_SUMMARY}
     WHERE r.status = 'posted' ${assigneeId ? `AND r.assignee_id = ${p.add(assigneeId)}` : ""}
     ORDER BY r.updated_at DESC LIMIT ${p.add(limit)}`,
    p.values,
  );
  return rows.map(toSummary);
}

export async function countOpenTasks(userId: number): Promise<number> {
  const row = await one<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM reels WHERE assignee_id = $1 AND status IN ('new', 'approved', 'in_production')",
    [userId],
  );
  return row!.n;
}

export async function findReelByShortcode(
  shortcode: string,
): Promise<{ id: number; authorName: string | null; createdAt: number } | null> {
  const row = await one<{ id: number; author_name: string | null; created_at: number }>(
    `SELECT r.id, u.name AS author_name, r.created_at
     FROM reels r LEFT JOIN users u ON u.id = r.created_by WHERE r.shortcode = $1`,
    [shortcode],
  );
  return row ? { id: row.id, authorName: row.author_name, createdAt: row.created_at } : null;
}

export type ReelAccess = {
  id: number;
  createdBy: number | null;
  assigneeId: number | null;
  status: Status;
  dueDate: string | null;
};

export async function getReelAccess(id: number): Promise<ReelAccess | null> {
  const row = await one<{
    id: number;
    created_by: number | null;
    assignee_id: number | null;
    status: Status;
    due_date: string | null;
  }>("SELECT id, created_by, assignee_id, status, due_date FROM reels WHERE id = $1", [id]);
  return row
    ? { id: row.id, createdBy: row.created_by, assigneeId: row.assignee_id, status: row.status, dueDate: row.due_date }
    : null;
}

async function replaceTags(tx: Queryable, reelId: number, tags: string[]): Promise<void> {
  await tx.query("DELETE FROM reel_tags WHERE reel_id = $1", [reelId]);
  for (const tag of tags) {
    await tx.query("INSERT INTO reel_tags (reel_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING", [reelId, tag]);
  }
}

/** Throws a unique-violation error if the reel is already on the board. */
export async function createReel(input: {
  shortcode: string;
  kind: ReelKind;
  idea: string;
  tags: string[];
  createdBy: number;
}): Promise<number> {
  return transaction(async (tx) => {
    const now = Date.now();
    const [row] = await tx.query<{ id: number }>(
      `INSERT INTO reels (shortcode, kind, idea, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, 'new', $4, $5, $5) RETURNING id`,
      [input.shortcode, input.kind, input.idea, input.createdBy, now],
    );
    await replaceTags(tx, row.id, input.tags);
    return row.id;
  });
}

export async function updateReelIdea(id: number, idea: string, tags: string[]): Promise<void> {
  await transaction(async (tx) => {
    await tx.query("UPDATE reels SET idea = $1, updated_at = $2 WHERE id = $3", [idea, Date.now(), id]);
    await replaceTags(tx, id, tags);
  });
}

export async function updateReelStatus(id: number, status: Status): Promise<void> {
  await sql("UPDATE reels SET status = $1, updated_at = $2 WHERE id = $3", [status, Date.now(), id]);
}

export async function updateReelAssignment(id: number, assigneeId: number | null, dueDate: string | null): Promise<void> {
  await sql("UPDATE reels SET assignee_id = $1, due_date = $2, updated_at = $3 WHERE id = $4", [
    assigneeId,
    dueDate,
    Date.now(),
    id,
  ]);
}

export async function deleteReel(id: number): Promise<void> {
  await sql("DELETE FROM reels WHERE id = $1", [id]);
}

/** Adds or removes the user's 🔥 vote. */
export async function toggleVote(reelId: number, userId: number): Promise<{ voted: boolean; count: number }> {
  return transaction(async (tx) => {
    const removed = await tx.query("DELETE FROM votes WHERE reel_id = $1 AND user_id = $2 RETURNING 1", [reelId, userId]);
    if (!removed.length) {
      await tx.query("INSERT INTO votes (reel_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [
        reelId,
        userId,
        Date.now(),
      ]);
    }
    const [{ n }] = await tx.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM votes WHERE reel_id = $1", [reelId]);
    return { voted: !removed.length, count: n };
  });
}

export async function listTags(): Promise<{ tag: string; count: number }[]> {
  return sql<{ tag: string; count: number }>(
    "SELECT tag, COUNT(*)::int AS count FROM reel_tags GROUP BY tag ORDER BY count DESC, tag LIMIT 60",
  );
}

// ---- Instagram previews ------------------------------------------------------------------

export type PreviewTarget = {
  id: number;
  shortcode: string;
  kind: ReelKind;
  igAuthor: string | null;
  previewAt: number | null;
  hasThumbnail: boolean;
};

export async function getPreviewTarget(shortcode: string): Promise<PreviewTarget | null> {
  const row = await one<{
    id: number;
    shortcode: string;
    kind: ReelKind;
    ig_author: string | null;
    preview_at: number | null;
    has_thumbnail: boolean;
  }>(
    `SELECT r.id, r.shortcode, r.kind, r.ig_author, r.preview_at,
            EXISTS (SELECT 1 FROM thumbnails th WHERE th.reel_id = r.id) AS has_thumbnail
     FROM reels r WHERE r.shortcode = $1`,
    [shortcode],
  );
  return row
    ? {
        id: row.id,
        shortcode: row.shortcode,
        kind: row.kind,
        igAuthor: row.ig_author,
        previewAt: row.preview_at,
        hasThumbnail: row.has_thumbnail,
      }
    : null;
}

/** Records a preview attempt; author/caption are kept when a later attempt fails. */
export async function savePreviewInfo(id: number, info: { author: string | null; caption: string | null }): Promise<void> {
  await sql(
    `UPDATE reels SET ig_author = COALESCE($1, ig_author), ig_caption = COALESCE($2, ig_caption), preview_at = $3
     WHERE id = $4`,
    [info.author, info.caption, Date.now(), id],
  );
}

export async function saveThumbnail(reelId: number, contentType: string, data: Uint8Array): Promise<void> {
  await sql(
    `INSERT INTO thumbnails (reel_id, content_type, data, created_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (reel_id) DO UPDATE SET content_type = EXCLUDED.content_type, data = EXCLUDED.data,
       created_at = EXCLUDED.created_at`,
    [reelId, contentType, Buffer.from(data), Date.now()],
  );
}

export async function getThumbnail(shortcode: string): Promise<{ contentType: string; data: Uint8Array } | null> {
  const row = await one<{ content_type: string; data: Uint8Array }>(
    "SELECT th.content_type, th.data FROM thumbnails th JOIN reels r ON r.id = th.reel_id WHERE r.shortcode = $1",
    [shortcode],
  );
  return row ? { contentType: row.content_type, data: row.data } : null;
}
