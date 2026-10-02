import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteUserSessions, validateSessionToken } from "@/lib/auth/session";
import { normalizeTag, normalizeTags } from "@/lib/constants";
import { getDb, isUniqueViolation, sql } from "@/lib/db";
import { addComment, listComments } from "@/lib/data/comments";
import {
  countOpenTasks,
  createReel,
  findReelByShortcode,
  getPreviewTarget,
  getReel,
  getThumbnail,
  listBoard,
  listOpenTasks,
  listReels,
  listTags,
  savePreviewInfo,
  saveThumbnail,
  toggleVote,
  updateReelAssignment,
  updateReelIdea,
  updateReelStatus,
} from "@/lib/data/reels";
import {
  countActiveAdmins,
  createFirstAdmin,
  createUser,
  deleteUser,
  findUserForLogin,
  listTeam,
  setUserActive,
} from "@/lib/data/users";
import { imageType } from "@/lib/instagram-preview";

// Runs against PostgreSQL (in-memory PGlite: DATABASE_URL="memory://" in vitest.config.mts).

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("passwords", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$131072$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });
});

describe("preview images", () => {
  it("detects the image type from the file's first bytes", () => {
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(imageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });
});

describe("tags", () => {
  it("normalizes user input", () => {
    expect(normalizeTag("  #Trending Audio! ")).toBe("trending-audio");
    expect(normalizeTag("Été")).toBe("été");
    expect(normalizeTags(["Hook", "hook", "", "Audio"])).toEqual(["hook", "audio"]);
  });
});

describe("data layer", () => {
  let admin: number;
  let member: number;

  beforeAll(async () => {
    admin = (await createFirstAdmin({ email: "admin@team.test", name: "Ada Admin", passwordHash: "x" }))!;
    member = await createUser({ email: "max@team.test", name: "Max Member", passwordHash: "x", role: "member" });
  });

  afterAll(async () => {
    await (await getDb()).close();
  });

  it("creates the first admin only once", async () => {
    expect(admin).toBeGreaterThan(0);
    expect(await createFirstAdmin({ email: "second@team.test", name: "Second", passwordHash: "x" })).toBeNull();
    expect(await countActiveAdmins()).toBe(1);
  });

  it("finds users case-insensitively and blocks duplicate emails", async () => {
    expect((await findUserForLogin("ADMIN@team.test"))?.id).toBe(admin);
    const error = await rejection(
      createUser({ email: "Admin@Team.test", name: "Copy", passwordHash: "x", role: "member" }),
    );
    expect(isUniqueViolation(error)).toBe(true);
  });

  it("keeps sessions valid only for active users", async () => {
    const { token } = await createSession(member);
    expect((await validateSessionToken(token))?.id).toBe(member);
    await setUserActive(member, false);
    expect(await validateSessionToken(token)).toBeNull();
    await setUserActive(member, true);
    const second = await createSession(member);
    await deleteUserSessions(member);
    expect(await validateSessionToken(second.token)).toBeNull();
  });

  it("creates reels, prevents duplicates and filters the feed", async () => {
    const first = await createReel({ shortcode: "AAAAA11111", kind: "reel", idea: "Recreate the hook", tags: ["hook"], createdBy: member });
    await createReel({ shortcode: "BBBBB22222", kind: "p", idea: "Use this 100% trending audio", tags: ["audio", "trend"], createdBy: admin });

    expect((await findReelByShortcode("AAAAA11111"))?.id).toBe(first);
    const error = await rejection(createReel({ shortcode: "AAAAA11111", kind: "reel", idea: "again", tags: [], createdBy: admin }));
    expect(isUniqueViolation(error)).toBe(true);

    expect((await listReels(member, {})).items.map((r) => r.shortcode)).toEqual(["BBBBB22222", "AAAAA11111"]);
    expect((await listReels(member, { tag: "hook" })).items.map((r) => r.id)).toEqual([first]);
    expect((await listReels(member, { q: "100%" })).items).toHaveLength(1);
    expect((await listReels(member, { q: "MAX" })).items.map((r) => r.id)).toEqual([first]);
    expect((await listReels(member, { authorId: admin })).items).toHaveLength(1);
    expect((await listTags()).map((t) => t.tag).sort()).toEqual(["audio", "hook", "trend"]);
    expect((await getReel(first, member))?.tags).toEqual(["hook"]);
  });

  it("edits ideas and replaces tags", async () => {
    const reel = (await findReelByShortcode("AAAAA11111"))!.id;
    await updateReelIdea(reel, "Recreate the hook, but faster", ["hook", "speed"]);
    expect(await getReel(reel, admin)).toMatchObject({ idea: "Recreate the hook, but faster", tags: ["hook", "speed"] });
  });

  it("toggles votes and sorts by them", async () => {
    const reel = (await findReelByShortcode("AAAAA11111"))!.id;
    expect(await toggleVote(reel, member)).toEqual({ voted: true, count: 1 });
    expect(await toggleVote(reel, admin)).toEqual({ voted: true, count: 2 });
    expect(await toggleVote(reel, admin)).toEqual({ voted: false, count: 1 });
    expect(await getReel(reel, member)).toMatchObject({ voteCount: 1, votedByMe: true });
    expect(await getReel(reel, admin)).toMatchObject({ voteCount: 1, votedByMe: false });
    expect((await listReels(admin, { sort: "top" })).items[0].id).toBe(reel);
  });

  it("tracks status, assignment and tasks", async () => {
    const reel = (await findReelByShortcode("BBBBB22222"))!.id;
    await updateReelStatus(reel, "approved");
    await updateReelAssignment(reel, member, "2030-01-15");
    expect(await countOpenTasks(member)).toBe(1);
    expect((await listOpenTasks(member, member)).map((r) => r.id)).toEqual([reel]);
    expect((await listBoard(member)).approved.map((r) => r.id)).toEqual([reel]);

    await updateReelStatus(reel, "skipped");
    expect((await listReels(member, {})).items.map((r) => r.id)).not.toContain(reel);
    expect((await listReels(member, { status: "skipped" })).items.map((r) => r.id)).toEqual([reel]);
    expect(await countOpenTasks(member)).toBe(0);
  });

  it("stores Instagram previews and searches by creator handle", async () => {
    const reel = (await findReelByShortcode("AAAAA11111"))!.id;
    expect(await getPreviewTarget("AAAAA11111")).toMatchObject({ id: reel, igAuthor: null, previewAt: null, hasThumbnail: false });
    await savePreviewInfo(reel, { author: "nasa", caption: "Lunar landers, assemble." });
    expect((await getReel(reel, admin))?.igAuthor).toBe("nasa");
    expect((await listReels(admin, { q: "NASA" })).items.map((r) => r.id)).toEqual([reel]);
    // A later failed attempt keeps what we already know.
    await savePreviewInfo(reel, { author: null, caption: null });
    expect((await getPreviewTarget("AAAAA11111"))?.igAuthor).toBe("nasa");

    await saveThumbnail(reel, "image/jpeg", new Uint8Array([0xff, 0xd8, 1, 2, 3]));
    expect((await getPreviewTarget("AAAAA11111"))?.hasThumbnail).toBe(true);
    const thumb = await getThumbnail("AAAAA11111");
    expect(thumb?.contentType).toBe("image/jpeg");
    expect([...thumb!.data]).toEqual([0xff, 0xd8, 1, 2, 3]);
  });

  it("keeps a member's reels and comments after they are deleted", async () => {
    const reel = (await findReelByShortcode("AAAAA11111"))!.id;
    await addComment(reel, member, "Love it");
    await deleteUser(member);
    expect((await getReel(reel, admin))?.author).toBeNull();
    expect((await listComments(reel))[0]).toMatchObject({ body: "Love it", author: null });
    expect((await listTeam()).map((u) => u.id)).toEqual([admin]);
    const [{ n }] = await sql<{ n: number }>("SELECT COUNT(*)::int AS n FROM votes WHERE user_id = $1", [member]);
    expect(n).toBe(0);
  });
});
