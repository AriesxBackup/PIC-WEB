import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SESSION_RENEW_MS, SESSION_TTL_MS } from "@/lib/config";
import { SESSION_COOKIE, type Role } from "@/lib/constants";
import { getDb } from "@/lib/db";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
};

// Only a SHA-256 of the token is stored, so a leaked database can't be used to log in.
function sessionId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: number): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(sessionId(token), userId, expiresAt, now);
  return { token, expiresAt };
}

export function validateSessionToken(token: string): SessionUser | null {
  const db = getDb();
  const id = sessionId(token);
  const row = db
    .prepare(
      `SELECT s.expires_at, u.id, u.email, u.name, u.role, u.active
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(id) as
    | { expires_at: number; id: number; email: string; name: string; role: Role; active: number }
    | undefined;
  if (!row) return null;

  const now = Date.now();
  if (row.expires_at <= now || !row.active) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }
  if (row.expires_at - now < SESSION_RENEW_MS) {
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(now + SESSION_TTL_MS, id);
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId(token));
}

/** Signs a user out everywhere, optionally keeping the session behind `keepToken`. */
export function deleteUserSessions(userId: number, keepToken?: string): void {
  getDb()
    .prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?")
    .run(userId, keepToken ? sessionId(keepToken) : "");
}

export function deleteExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
}

/** True when the browser reached us over HTTPS (directly or through a reverse proxy / tunnel). */
export async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return (h.get("origin") ?? h.get("referer") ?? "").startsWith("https://");
}

export async function setSessionCookie(token: string, expiresAt: number): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await isSecureRequest(),
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
