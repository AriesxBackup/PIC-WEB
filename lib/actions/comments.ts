"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { addComment, deleteComment, getComment } from "@/lib/data/comments";
import { getReelAccess } from "@/lib/data/reels";
import { publish } from "@/lib/events";
import { commentSchema } from "@/lib/validation";
import { snippet, text } from "./helpers";
import type { FormState } from "./types";

export async function addCommentAction(reelId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await getReelAccess(reelId);
  if (!access) return { error: "This reel no longer exists." };

  const raw = text(formData, "body");
  const body = commentSchema.safeParse(raw);
  if (!body.success) return { fields: { body: body.error.issues[0].message }, values: { body: raw } };

  await addComment(reelId, user.id, body.data);
  const notify = access.createdBy && access.createdBy !== user.id ? access.createdBy : undefined;
  publish({
    type: "comment",
    reelId,
    actorId: user.id,
    ...(notify ? { message: `${user.name} commented on your reel: “${snippet(body.data, 40)}”`, targetUserId: notify } : {}),
  });
  refresh();
  return { ok: true };
}

export async function deleteCommentAction(commentId: number): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const comment = await getComment(commentId);
  if (!comment) return {};
  const isOwnComment = comment.kind === "comment" && comment.authorId === user.id;
  if (!isOwnComment && user.role !== "admin") return { error: "You can only delete your own comments." };

  await deleteComment(commentId);
  publish({ type: "comment", reelId: comment.reelId, actorId: user.id });
  refresh();
  return {};
}
