"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import type { SessionUser } from "@/lib/auth/session";
import { ASSIGNEE_STATUSES, STATUS_META, isStatus, normalizeTags, type Status } from "@/lib/constants";
import { isUniqueViolation } from "@/lib/db";
import { addComment } from "@/lib/data/comments";
import {
  createReel,
  deleteReel,
  findReelByShortcode,
  getReelAccess,
  toggleVote,
  updateReelAssignment,
  updateReelIdea,
  updateReelStatus,
} from "@/lib/data/reels";
import { getUser } from "@/lib/data/users";
import { publish } from "@/lib/events";
import { warmPreviews } from "@/lib/instagram-preview";
import { resolveInstagramUrl } from "@/lib/instagram-server";
import { dueDateSchema, ideaSchema } from "@/lib/validation";
import { text } from "./helpers";
import type { FormState, LinkCheck } from "./types";

async function signedInUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function canEdit(user: SessionUser, createdBy: number | null): boolean {
  return user.role === "admin" || createdBy === user.id;
}

function formatDue(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Used by the "add reel" form to validate the link and spot duplicates as you type. */
export async function checkReelLink(input: string): Promise<LinkCheck> {
  await signedInUser();
  const reel = await resolveInstagramUrl(input.slice(0, 2000));
  if (!reel) return { status: "invalid" };
  const existing = await findReelByShortcode(reel.shortcode);
  return existing ? { status: "duplicate", ...reel, existing } : { status: "ok", ...reel };
}

export async function createReelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await signedInUser();
  const url = text(formData, "url").trim();
  const ideaRaw = text(formData, "idea");
  const tags = normalizeTags(formData.getAll("tags").filter((t): t is string => typeof t === "string"));
  const values = { url, idea: ideaRaw };

  const reel = await resolveInstagramUrl(url.slice(0, 2000));
  if (!reel) {
    return { fields: { url: "That doesn't look like an Instagram reel or post link." }, values };
  }
  const idea = ideaSchema.safeParse(ideaRaw);
  if (!idea.success) return { fields: { idea: idea.error.issues[0].message }, values };

  const duplicate = await findReelByShortcode(reel.shortcode);
  if (duplicate) {
    return {
      fields: { url: "This reel is already on the board — add your idea as a comment there." },
      values: { ...values, existingId: String(duplicate.id) },
    };
  }

  let id: number;
  try {
    id = await createReel({ shortcode: reel.shortcode, kind: reel.kind, idea: idea.data, tags, createdBy: user.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fields: { url: "Someone just added this reel. Refresh to see it." }, values };
    }
    throw error;
  }

  publish({ type: "reel.created", reelId: id, actorId: user.id, message: `${user.name} added a new reel` });
  after(() => warmPreviews([reel.shortcode]));
  redirect(`/reels/${id}?added=1`);
}

export async function updateIdeaAction(reelId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await signedInUser();
  const access = await getReelAccess(reelId);
  if (!access) return { error: "This reel no longer exists." };
  if (!canEdit(user, access.createdBy)) return { error: "Only the person who posted it (or an admin) can edit." };

  const idea = ideaSchema.safeParse(text(formData, "idea"));
  if (!idea.success) return { fields: { idea: idea.error.issues[0].message } };
  const tags = normalizeTags(formData.getAll("tags").filter((t): t is string => typeof t === "string"));

  await updateReelIdea(reelId, idea.data, tags);
  publish({ type: "reel.updated", reelId, actorId: user.id });
  refresh();
  return { ok: true };
}

export async function deleteReelAction(reelId: number): Promise<{ error?: string }> {
  const user = await signedInUser();
  const access = await getReelAccess(reelId);
  if (!access) redirect("/");
  if (!canEdit(user, access.createdBy)) return { error: "Only the person who posted it (or an admin) can delete." };

  await deleteReel(reelId);
  publish({ type: "reel.deleted", reelId, actorId: user.id });
  redirect("/");
}

export async function setStatusAction(reelId: number, status: Status): Promise<{ error?: string }> {
  const user = await signedInUser();
  if (!isStatus(status)) return { error: "Unknown status." };
  const access = await getReelAccess(reelId);
  if (!access) return { error: "This reel no longer exists." };

  const isAssignee = access.assigneeId === user.id;
  const allowed =
    user.role === "admin" ||
    (isAssignee && access.status !== "skipped" && ASSIGNEE_STATUSES.includes(status));
  if (!allowed) return { error: "Only an admin (or the assigned person) can change this." };
  if (access.status === status) return {};

  await updateReelStatus(reelId, status);
  const { label } = STATUS_META[status];
  await addComment(reelId, user.id, `moved this to ${label}`, "event");
  publish({ type: "reel.updated", reelId, actorId: user.id });
  refresh();
  return {};
}

export async function assignAction(reelId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await signedInUser();
  if (user.role !== "admin") return { error: "Only admins can assign work." };
  const access = await getReelAccess(reelId);
  if (!access) return { error: "This reel no longer exists." };

  const assigneeRaw = text(formData, "assigneeId");
  const assigneeId = assigneeRaw ? Number(assigneeRaw) : null;
  const assignee = assigneeId ? await getUser(assigneeId) : null;
  if (assigneeId && (!assignee || !assignee.active)) return { fields: { assigneeId: "Pick someone on the team." } };

  const due = dueDateSchema.safeParse(text(formData, "dueDate"));
  if (!due.success) return { fields: { dueDate: due.error.issues[0].message } };
  const dueDate = due.data || null;

  if (access.assigneeId === assigneeId && access.dueDate === dueDate) return { ok: true };

  await updateReelAssignment(reelId, assigneeId, dueDate);
  const note = assignee
    ? `assigned this to ${assignee.name}${dueDate ? ` · due ${formatDue(dueDate)}` : ""}`
    : "removed the assignment";
  await addComment(reelId, user.id, note, "event");
  publish({
    type: "reel.updated",
    reelId,
    actorId: user.id,
    ...(assignee && assignee.id !== user.id && access.assigneeId !== assignee.id
      ? { message: `${user.name} assigned you a reel`, targetUserId: assignee.id }
      : {}),
  });
  refresh();
  return { ok: true };
}

export async function toggleVoteAction(reelId: number): Promise<{ voted: boolean; count: number } | { error: string }> {
  const user = await signedInUser();
  if (!(await getReelAccess(reelId))) return { error: "This reel no longer exists." };
  const result = await toggleVote(reelId, user.id);
  publish({ type: "vote", reelId, actorId: user.id });
  // Re-render with the new count so the optimistic value doesn't flicker back.
  refresh();
  return result;
}
