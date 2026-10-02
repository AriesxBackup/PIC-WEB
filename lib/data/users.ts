import "server-only";
import type { Role } from "@/lib/constants";
import { one, sql, transaction } from "@/lib/db";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: number;
  bio: string;
  igHandle: string;
  /** Increments on every avatar change; 0 means no photo was ever uploaded. */
  avatarVersion: number;
};

export type Person = { id: number; name: string; /** Present (and > 0) when the person has a profile photo. */ avatarV?: number };

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  created_at: number;
  bio: string;
  ig_handle: string;
  avatar_version: number;
};

const USER_COLUMNS = "u.id, u.email, u.name, u.role, u.active, u.created_at, u.bio, u.ig_handle, u.avatar_version";

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    bio: row.bio,
    igHandle: row.ig_handle,
    avatarVersion: row.avatar_version,
  };
}

export async function countUsers(): Promise<number> {
  return (await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users"))!.n;
}

export async function countActiveAdmins(): Promise<number> {
  return (await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND active"))!.n;
}

export async function getUser(id: number): Promise<User | null> {
  const row = await one<UserRow>(`SELECT ${USER_COLUMNS} FROM users u WHERE u.id = $1`, [id]);
  return row ? toUser(row) : null;
}

export async function findUserForLogin(email: string): Promise<(User & { passwordHash: string }) | null> {
  const row = await one<UserRow & { password_hash: string }>(
    `SELECT ${USER_COLUMNS}, u.password_hash FROM users u WHERE lower(u.email) = lower($1)`,
    [email],
  );
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

export async function getPasswordHash(id: number): Promise<string | null> {
  const row = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [id]);
  return row?.password_hash ?? null;
}

/** Throws a unique-violation error when the email is taken (check with isUniqueViolation). */
export async function createUser(input: { email: string; name: string; passwordHash: string; role: Role }): Promise<number> {
  const row = await one<{ id: number }>(
    `INSERT INTO users (email, name, password_hash, role, active, created_at)
     VALUES ($1, $2, $3, $4, TRUE, $5) RETURNING id`,
    [input.email, input.name, input.passwordHash, input.role, Date.now()],
  );
  return row!.id;
}

/** First-run setup: creates the admin only if nobody exists yet (null if someone beat us to it). */
export async function createFirstAdmin(input: { email: string; name: string; passwordHash: string }): Promise<number | null> {
  return transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(727275)");
    const [{ n }] = await tx.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM users");
    if (n > 0) return null;
    const [row] = await tx.query<{ id: number }>(
      `INSERT INTO users (email, name, password_hash, role, active, created_at)
       VALUES ($1, $2, $3, 'admin', TRUE, $4) RETURNING id`,
      [input.email, input.name, input.passwordHash, Date.now()],
    );
    return row.id;
  });
}

export type TeamMember = User & { reelCount: number; openTaskCount: number };

export async function listTeam(): Promise<TeamMember[]> {
  const rows = await sql<UserRow & { reel_count: number; open_task_count: number }>(
    `SELECT ${USER_COLUMNS},
            (SELECT COUNT(*)::int FROM reels r WHERE r.created_by = u.id) AS reel_count,
            (SELECT COUNT(*)::int FROM reels r WHERE r.assignee_id = u.id
               AND r.status IN ('new', 'approved', 'in_production')) AS open_task_count
     FROM users u
     ORDER BY u.active DESC, (u.role = 'admin') DESC, lower(u.name)`,
  );
  return rows.map((row) => ({ ...toUser(row), reelCount: row.reel_count, openTaskCount: row.open_task_count }));
}

/** Active people, for "assign to" and "posted by" pickers. */
export async function listActivePeople(): Promise<Person[]> {
  const rows = await sql<{ id: number; name: string; avatar_version: number }>(
    "SELECT id, name, avatar_version FROM users WHERE active ORDER BY lower(name)",
  );
  return rows.map((row) => ({ id: row.id, name: row.name, avatarV: row.avatar_version || undefined }));
}

/** A member's profile as shown on their profile page. */
export type Profile = User & { reelCount: number; votesReceived: number; commentCount: number };

export async function getProfile(id: number): Promise<Profile | null> {
  const row = await one<UserRow & { reel_count: number; votes_received: number; comment_count: number }>(
    `SELECT ${USER_COLUMNS},
            (SELECT COUNT(*)::int FROM reels r WHERE r.created_by = u.id) AS reel_count,
            (SELECT COUNT(*)::int FROM votes v JOIN reels r ON r.id = v.reel_id WHERE r.created_by = u.id) AS votes_received,
            (SELECT COUNT(*)::int FROM comments c WHERE c.author_id = u.id AND c.kind = 'comment') AS comment_count
     FROM users u WHERE u.id = $1`,
    [id],
  );
  return row
    ? { ...toUser(row), reelCount: row.reel_count, votesReceived: row.votes_received, commentCount: row.comment_count }
    : null;
}

export async function updateProfileDetails(id: number, input: { bio: string; igHandle: string }): Promise<void> {
  await sql("UPDATE users SET bio = $1, ig_handle = $2 WHERE id = $3", [input.bio, input.igHandle, id]);
}

export async function setAvatar(id: number, input: { mime: string; data: Buffer }): Promise<void> {
  await sql(
    `UPDATE users SET avatar_mime = $1, avatar_data = $2, avatar_version = avatar_version + 1 WHERE id = $3`,
    [input.mime, input.data, id],
  );
}

export async function clearAvatar(id: number): Promise<void> {
  await sql("UPDATE users SET avatar_mime = NULL, avatar_data = NULL, avatar_version = avatar_version + 1 WHERE id = $1", [id]);
}

export async function getAvatar(id: number): Promise<{ mime: string; data: Buffer } | null> {
  const row = await one<{ mime: string; data: Buffer }>("SELECT avatar_mime AS mime, avatar_data AS data FROM users WHERE id = $1 AND avatar_mime IS NOT NULL", [id]);
  return row ?? null;
}

export async function updateUserProfile(id: number, input: { name: string; email: string; role: Role }): Promise<void> {
  await sql("UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4", [input.name, input.email, input.role, id]);
}

export async function updateUserName(id: number, name: string): Promise<void> {
  await sql("UPDATE users SET name = $1 WHERE id = $2", [name, id]);
}

export async function setUserActive(id: number, active: boolean): Promise<void> {
  await sql("UPDATE users SET active = $1 WHERE id = $2", [active, id]);
}

export async function setUserPassword(id: number, passwordHash: string): Promise<void> {
  await sql("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
}

/** Their reels and comments stay on the board (shown as "Former member"). */
export async function deleteUser(id: number): Promise<void> {
  await sql("DELETE FROM users WHERE id = $1", [id]);
}
