"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, deleteUserSessions, getSessionToken } from "@/lib/auth/session";
import { getPasswordHash, setUserPassword, updateUserName } from "@/lib/data/users";
import { nameSchema, passwordSchema } from "@/lib/validation";
import { fieldErrors, text } from "./helpers";
import type { FormState } from "./types";

export async function updateMyNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = nameSchema.safeParse(text(formData, "name"));
  if (!name.success) return { fields: { name: name.error.issues[0].message } };
  updateUserName(user.id, name.data);
  refresh();
  return { ok: true, message: "Name updated." };
}

const passwordChangeSchema = z
  .object({ current: z.string().min(1, { message: "Enter your current password." }), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

export async function changeMyPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = passwordChangeSchema.safeParse({
    current: text(formData, "current"),
    password: text(formData, "password"),
    confirm: text(formData, "confirm"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const hash = getPasswordHash(user.id);
  if (!hash || !(await verifyPassword(parsed.data.current, hash))) {
    return { fields: { current: "That's not your current password." } };
  }
  setUserPassword(user.id, await hashPassword(parsed.data.password));
  deleteUserSessions(user.id, await getSessionToken());
  return { ok: true, message: "Password changed. Other devices were signed out." };
}

export async function logoutEverywhereAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) deleteUserSessions(user.id);
  await clearSessionCookie();
  redirect("/login");
}
