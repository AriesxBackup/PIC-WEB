import "server-only";
import type { Role } from "@/lib/constants";
import { getDb } from "@/lib/db";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: number;
};

export type Person = { id: number; name: string };

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: number;
  created_at: number;
};

const USER_COLUMNS = "id, email, name, role, active, created_at";

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
  };
}

export function countUsers(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
}

export function countActiveAdmins(): number {
  return (
    getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get() as {
      n: number;
    }
  ).n;
}

export function getUser(id: number): User | null {
  const row = getDb().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id) as
    | UserRow
    | undefined;
  return row ? toUser(row) : null;
}

export function findUserForLogin(email: string): (User & { passwordHash: string }) | null {
  const row = getDb()
    .prepare(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`)
    .get(email) as (UserRow & { password_hash: string }) | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

export function getPasswordHash(id: number): string | null {
  const row = getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(id) as
    | { password_hash: string }
    | undefined;
  return row?.password_hash ?? null;
}

/** Throws a UNIQUE constraint error when the email is taken (check with isUniqueViolation). */
export function createUser(input: { email: string; name: string; passwordHash: string; role: Role }): number {
  const result = getDb()
    .prepare(
      "INSERT INTO users (email, name, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
    )
    .run(input.email, input.name, input.passwordHash, input.role, Date.now());
  return Number(result.lastInsertRowid);
}

export type TeamMember = User & { reelCount: number; openTaskCount: number };

export function listTeam(): TeamMember[] {
  const rows = getDb()
    .prepare(
      `SELECT ${USER_COLUMNS.split(", ").map((c) => `u.${c}`).join(", ")},
              (SELECT COUNT(*) FROM reels r WHERE r.created_by = u.id) AS reel_count,
              (SELECT COUNT(*) FROM reels r WHERE r.assignee_id = u.id
                 AND r.status IN ('new', 'approved', 'in_production')) AS open_task_count
       FROM users u
       ORDER BY u.active DESC, u.role = 'admin' DESC, u.name COLLATE NOCASE`,
    )
    .all() as (UserRow & { reel_count: number; open_task_count: number })[];
  return rows.map((row) => ({
    ...toUser(row),
    reelCount: row.reel_count,
    openTaskCount: row.open_task_count,
  }));
}

/** Active people, for "assign to" and "posted by" pickers. */
export function listActivePeople(): Person[] {
  return getDb()
    .prepare("SELECT id, name FROM users WHERE active = 1 ORDER BY name COLLATE NOCASE")
    .all() as Person[];
}

export function updateUserProfile(id: number, input: { name: string; email: string; role: Role }): void {
  getDb()
    .prepare("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?")
    .run(input.name, input.email, input.role, id);
}

export function updateUserName(id: number, name: string): void {
  getDb().prepare("UPDATE users SET name = ? WHERE id = ?").run(name, id);
}

export function setUserActive(id: number, active: boolean): void {
  getDb().prepare("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
}

export function setUserPassword(id: number, passwordHash: string): void {
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

/** Their reels and comments stay on the board (shown as "Former member"). */
export function deleteUser(id: number): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}
