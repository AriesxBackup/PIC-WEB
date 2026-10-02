"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AVATAR_MIME_TYPES, MAX_AVATAR_BYTES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearAvatar, setAvatar, updateProfileDetails } from "@/lib/data/users";
import { bioSchema, igHandleSchema } from "@/lib/validation";
import { fieldErrors, text } from "./helpers";
import type { FormState } from "./types";

const profileSchema = z.object({ bio: bioSchema, igHandle: igHandleSchema });

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = profileSchema.safeParse({ bio: text(formData, "bio"), igHandle: text(formData, "igHandle") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  await updateProfileDetails(user.id, parsed.data);
  refresh();
  return { ok: true, message: "Profile saved." };
}

export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { fields: { avatar: "Choose a photo first." } };
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { fields: { avatar: "Photos must be JPEG, PNG or WebP." } };
  }
  if (file.size > MAX_AVATAR_BYTES) return { fields: { avatar: "Keep the photo under 4 MB." } };
  await setAvatar(user.id, { mime: file.type, data: Buffer.from(await file.arrayBuffer()) });
  refresh();
  return { ok: true, message: "Photo updated." };
}

export async function removeAvatarAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await clearAvatar(user.id);
  refresh();
}
