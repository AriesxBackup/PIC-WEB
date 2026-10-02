"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fakePasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { consumeAttempt, resetAttempts } from "@/lib/auth/rate-limit";
import { isSetupAllowed } from "@/lib/auth/setup-token";
import {
  clearSessionCookie,
  createSession,
  deleteExpiredSessions,
  deleteSession,
  getSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { countUsers, createFirstAdmin, findUserForLogin } from "@/lib/data/users";
import { emailSchema, nameSchema, passwordSchema } from "@/lib/validation";
import { clientIp, fieldErrors, safeNextPath, text } from "./helpers";
import type { FormState } from "./types";

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

async function startSession(userId: number): Promise<void> {
  await deleteExpiredSessions();
  const { token, expiresAt } = await createSession(userId);
  await setSessionCookie(token, expiresAt);
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const values = { email };
  if (!email || !password) return { error: "Enter your email and password.", values };

  const limitKey = `login:${await clientIp()}:${email}`;
  if (!consumeAttempt(limitKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    return { error: "Too many attempts. Wait 15 minutes and try again.", values };
  }

  const user = await findUserForLogin(email);
  const valid = user ? await verifyPassword(password, user.passwordHash) : await fakePasswordCheck(password);
  if (!user || !valid) return { error: "Wrong email or password.", values };
  if (!user.active) return { error: "This account is turned off. Ask your admin.", values };

  resetAttempts(limitKey);
  await startSession(user.id);
  redirect(safeNextPath(formData.get("next")));
}

const setupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

/** First run only: creates the admin account. */
export async function setupAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  if ((await countUsers()) > 0) redirect("/login");
  if (!isSetupAllowed(formData.get("token"))) return { error: "This setup link isn't valid." };

  const raw = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    confirm: text(formData, "confirm"),
  };
  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) {
    return { fields: fieldErrors(parsed.error), values: { name: raw.name, email: raw.email } };
  }

  const userId = await createFirstAdmin({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash: await hashPassword(parsed.data.password),
  });
  if (userId === null) redirect("/login");

  await startSession(userId);
  redirect("/");
}

export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
  redirect("/login");
}
