"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { deleteUserSessions, getSessionToken, type SessionUser } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/db";
import {
  countActiveAdmins,
  createUser,
  deleteUser,
  getUser,
  setUserActive,
  setUserPassword,
  updateUserProfile,
} from "@/lib/data/users";
import { memberSchema, memberUpdateSchema, passwordSchema } from "@/lib/validation";
import { fieldErrors, text } from "./helpers";
import type { FormState } from "./types";

async function requireAdminUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.role === "admin" ? user : null;
}

const NOT_ADMIN = { error: "Only admins can manage the team." } as const;

/** True when this change would leave the team without an active admin. */
async function removesLastAdmin(userId: number): Promise<boolean> {
  const target = await getUser(userId);
  return !!target && target.role === "admin" && target.active && (await countActiveAdmins()) <= 1;
}

export async function createMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireAdminUser())) return NOT_ADMIN;
  const raw = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    role: text(formData, "role") || "member",
  };
  const values = { name: raw.name, email: raw.email, role: raw.role };
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  try {
    await createUser({ ...parsed.data, passwordHash: await hashPassword(parsed.data.password) });
  } catch (error) {
    if (isUniqueViolation(error)) return { fields: { email: "Someone already uses this email." }, values };
    throw error;
  }
  refresh();
  return { ok: true, message: `${parsed.data.name} can now log in with ${parsed.data.email}.` };
}

export async function updateMemberAction(userId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireAdminUser())) return NOT_ADMIN;
  const target = await getUser(userId);
  if (!target) return { error: "That person no longer exists." };

  const raw = { name: text(formData, "name"), email: text(formData, "email"), role: text(formData, "role") };
  const parsed = memberUpdateSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: raw };
  if (parsed.data.role !== "admin" && (await removesLastAdmin(userId))) {
    return { error: "The team needs at least one admin. Make someone else admin first.", values: raw };
  }

  try {
    await updateUserProfile(userId, parsed.data);
  } catch (error) {
    if (isUniqueViolation(error)) return { fields: { email: "Someone already uses this email." }, values: raw };
    throw error;
  }
  refresh();
  return { ok: true, message: "Saved." };
}

export async function resetMemberPasswordAction(
  userId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdminUser();
  if (!admin) return NOT_ADMIN;
  const target = await getUser(userId);
  if (!target) return { error: "That person no longer exists." };

  const password = passwordSchema.safeParse(text(formData, "password"));
  if (!password.success) return { fields: { password: password.error.issues[0].message } };

  await setUserPassword(userId, await hashPassword(password.data));
  // Old sessions end everywhere — except this browser when admins reset their own password.
  await deleteUserSessions(userId, userId === admin.id ? await getSessionToken() : undefined);
  return { ok: true, message: `New password set. Share it with ${target.name}.` };
}

export async function setMemberActiveAction(userId: number, active: boolean): Promise<{ error?: string }> {
  const admin = await requireAdminUser();
  if (!admin) return NOT_ADMIN;
  if (userId === admin.id) return { error: "You can't turn off your own account." };
  if (!active && (await removesLastAdmin(userId))) return { error: "The team needs at least one active admin." };

  await setUserActive(userId, active);
  if (!active) await deleteUserSessions(userId);
  refresh();
  return {};
}

export async function deleteMemberAction(userId: number): Promise<{ error?: string }> {
  const admin = await requireAdminUser();
  if (!admin) return NOT_ADMIN;
  if (userId === admin.id) return { error: "You can't delete your own account." };
  if ((await removesLastAdmin(userId))) return { error: "The team needs at least one active admin." };

  await deleteUser(userId);
  refresh();
  return {};
}
