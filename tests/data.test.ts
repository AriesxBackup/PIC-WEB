import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizeTag, normalizeTags } from "@/lib/constants";
import { getDb, isUniqueViolation } from "@/lib/db";
import { addComment, listComments } from "@/lib/data/comments";
import {
  countOpenTasks,
  createReel,
  findReelByShortcode,
  getPreviewTarget,
  getReel,
  listBoard,
  listOpenTasks,
  listReels,
  listTags,
  savePreviewInfo,
  toggleVote,
  updateReelAssignment,
  updateReelStatus,
} from "@/lib/data/reels";
import { countActiveAdmins, createUser, deleteUser, findUserForLogin, listTeam } from "@/lib/data/users";
import { imageType } from "@/lib/instagram-preview";

// Runs against an in-memory SQLite database (DATABASE_FILE=":memory:" in vitest.config.ts).

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

  beforeAll(() => {
    getDb();
    admin = createUser({ email: "admin@team.test", name: "Ada Admin", passwordHash: "x", role: "admin" });
    member = createUser({ email: "max@team.test", name: "Max Member", passwordHash: "x", role: "member" });
  });

  it("finds users case-insensitively and blocks duplicate emails", () => {
    expect(findUserForLogin("ADMIN@team.test")?.id).toBe(admin);
    let error: unknown;
    try {
      createUser({ email: "Admin@Team.test", name: "Copy", passwordHash: "x", role: "member" });
    } catch (e) {
      error = e;
    }
    expect(isUniqueViolation(error)).toBe(true);
    expect(countActiveAdmins()).toBe(1);
  });

  it("creates reels, prevents duplicates and filters the feed", () => {
    const first = createReel({ shortcode: "AAAAA11111", kind: "reel", idea: "Recreate the hook", tags: ["hook"], createdBy: member });
    createReel({ shortcode: "BBBBB22222", kind: "p", idea: "Use this 100% trending audio", tags: ["audio", "trend"], createdBy: admin });

    expect(findReelByShortcode("AAAAA11111")?.id).toBe(first);
    let error: unknown;
    try {
      createReel({ shortcode: "AAAAA11111", kind: "reel", idea: "again", tags: [], createdBy: admin });
    } catch (e) {
      error = e;
    }
    expect(isUniqueViolation(error)).toBe(true);

    expect(listReels(member, {}).items.map((r) => r.shortcode)).toEqual(["BBBBB22222", "AAAAA11111"]);
    expect(listReels(member, { tag: "hook" }).items.map((r) => r.id)).toEqual([first]);
    expect(listReels(member, { q: "100%" }).items).toHaveLength(1);
    expect(listReels(member, { q: "max" }).items.map((r) => r.id)).toEqual([first]);
    expect(listReels(member, { authorId: admin }).items).toHaveLength(1);
    expect(listTags().map((t) => t.tag).sort()).toEqual(["audio", "hook", "trend"]);
  });

  it("toggles votes and sorts by them", () => {
    const reel = findReelByShortcode("AAAAA11111")!.id;
    expect(toggleVote(reel, member)).toEqual({ voted: true, count: 1 });
    expect(toggleVote(reel, admin)).toEqual({ voted: true, count: 2 });
    expect(toggleVote(reel, admin)).toEqual({ voted: false, count: 1 });
    expect(getReel(reel, member)).toMatchObject({ voteCount: 1, votedByMe: true });
    expect(getReel(reel, admin)).toMatchObject({ voteCount: 1, votedByMe: false });
    expect(listReels(admin, { sort: "top" }).items[0].id).toBe(reel);
  });

  it("tracks status, assignment and tasks", () => {
    const reel = findReelByShortcode("BBBBB22222")!.id;
    updateReelStatus(reel, "approved");
    updateReelAssignment(reel, member, "2030-01-15");
    expect(countOpenTasks(member)).toBe(1);
    expect(listOpenTasks(member, member).map((r) => r.id)).toEqual([reel]);
    expect(listBoard(member).approved.map((r) => r.id)).toEqual([reel]);

    updateReelStatus(reel, "skipped");
    expect(listReels(member, {}).items.map((r) => r.id)).not.toContain(reel);
    expect(listReels(member, { status: "skipped" }).items.map((r) => r.id)).toEqual([reel]);
    expect(countOpenTasks(member)).toBe(0);
  });

  it("stores Instagram preview info and searches by creator handle", () => {
    const reel = findReelByShortcode("AAAAA11111")!.id;
    expect(getPreviewTarget("AAAAA11111")).toMatchObject({ id: reel, igAuthor: null, previewAt: null });
    savePreviewInfo(reel, { author: "nasa", caption: "Lunar landers, assemble." });
    expect(getReel(reel, admin)?.igAuthor).toBe("nasa");
    expect(listReels(admin, { q: "nasa" }).items.map((r) => r.id)).toEqual([reel]);
    // A later failed attempt keeps what we already know.
    savePreviewInfo(reel, { author: null, caption: null });
    expect(getPreviewTarget("AAAAA11111")?.igAuthor).toBe("nasa");
    expect(getPreviewTarget("AAAAA11111")?.previewAt).toBeGreaterThan(0);
  });

  it("keeps a member's reels and comments after they are deleted", () => {
    const reel = findReelByShortcode("AAAAA11111")!.id;
    addComment(reel, member, "Love it");
    deleteUser(member);
    expect(getReel(reel, admin)?.author).toBeNull();
    expect(listComments(reel)[0]).toMatchObject({ body: "Love it", author: null });
    expect(listTeam().map((u) => u.id)).toEqual([admin]);
  });
});
