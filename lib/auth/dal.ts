import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getSessionToken, validateSessionToken, type SessionUser } from "./session";

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await getSessionToken();
  return token ? validateSessionToken(token) : null;
});

/** Use in pages: sends signed-out visitors to the login screen. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in admin-only pages: non-admins get a 404. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
