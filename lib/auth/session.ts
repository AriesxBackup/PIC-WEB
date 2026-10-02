import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SESSION_RENEW_MS, SESSION_TTL_MS } from "@/lib/config";
import { SESSION_COOKIE, type Role } from "@/lib/constants";
import { one, sql } from "@/lib/db";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  /** Increments on every avatar change; 0 means no profile photo. */
  avatarVersion: number;
};

// Only a SHA-256 of the token is stored, so a leaked database can't be used to log in.
function sessionId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await sql("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)", [
    sessionId(token),
    userId,
    expiresAt,
    now,
  ]);
  return { token, expiresAt };
}

export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const id = sessionId(token);
  const row = await one<{ expires_at: number; id: number; email: string; name: string; role: Role; active: boolean; avatar_version: number }>(
    `SELECT s.expires_at, u.id, u.email, u.name, u.role, u.active, u.avatar_version
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [id],
  );
  if (!row) return null;

  const now = Date.now();
  if (row.expires_at <= now || !row.active) {
    await sql("DELETE FROM sessions WHERE id = $1", [id]);
    return null;
  }
  if (row.expires_at - now < SESSION_RENEW_MS) {
    await sql("UPDATE sessions SET expires_at = $1 WHERE id = $2", [now + SESSION_TTL_MS, id]);
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, avatarVersion: row.avatar_version };
}

export async function deleteSession(token: string): Promise<void> {
  await sql("DELETE FROM sessions WHERE id = $1", [sessionId(token)]);
}

/** Signs a user out everywhere, optionally keeping the session behind `keepToken`. */
export async function deleteUserSessions(userId: number, keepToken?: string): Promise<void> {
  await sql("DELETE FROM sessions WHERE user_id = $1 AND id <> $2", [userId, keepToken ? sessionId(keepToken) : ""]);
}

export async function deleteExpiredSessions(): Promise<void> {
  await sql("DELETE FROM sessions WHERE expires_at <= $1", [Date.now()]);
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
