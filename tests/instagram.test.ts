import { describe, expect, it } from "vitest";
import { embedUrl, extractInstagramUrl, isInstagramShareLink, parseInstagramUrl } from "@/lib/instagram";

describe("parseInstagramUrl", () => {
  it.each([
    ["https://www.instagram.com/reel/C1a2B3c4D5e/", "reel", "C1a2B3c4D5e"],
    ["https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=MWQ1ZGUxMzBkMA==", "reel", "C1a2B3c4D5e"],
    ["https://instagram.com/reels/C1a2B3c4D5e", "reel", "C1a2B3c4D5e"],
    ["instagram.com/reel/C1a2B3c4D5e", "reel", "C1a2B3c4D5e"],
    ["https://m.instagram.com/reel/C1a2B3c4D5e/", "reel", "C1a2B3c4D5e"],
    ["https://www.instagram.com/p/DAbc_12-xyz/?img_index=1", "p", "DAbc_12-xyz"],
    ["https://www.instagram.com/tv/B8xYz12345/", "tv", "B8xYz12345"],
    ["https://www.instagram.com/some.creator/reel/C1a2B3c4D5e/", "reel", "C1a2B3c4D5e"],
    ["http://instagr.am/p/C1a2B3c4D5e/", "p", "C1a2B3c4D5e"],
    ["  https://www.instagram.com/reel/C1a2B3c4D5e/#comments  ", "reel", "C1a2B3c4D5e"],
    ["Look at this 🔥 https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=abc", "reel", "C1a2B3c4D5e"],
  ])("parses %s", (input, kind, shortcode) => {
    expect(parseInstagramUrl(input)).toEqual({
      kind,
      shortcode,
      url: `https://www.instagram.com/${kind}/${shortcode}/`,
    });
  });

  it.each([
    "",
    "hello",
    "https://www.instagram.com/",
    "https://www.instagram.com/some.creator/",
    "https://www.instagram.com/reels/audio/123456789/",
    "https://www.instagram.com/stories/creator/123456789/",
    "https://www.instagram.com/explore/tags/reels/",
    "https://www.tiktok.com/@user/video/123",
    "https://instagram.com.evil.example/reel/C1a2B3c4D5e/",
    "https://notinstagram.com/reel/C1a2B3c4D5e/",
    "https://www.instagram.com/reel/abc/",
  ])("rejects %s", (input) => {
    expect(parseInstagramUrl(input)).toBeNull();
  });

  it("only ever returns a canonical instagram.com URL, even for wrapped links", () => {
    expect(parseInstagramUrl("https://l.example/?u=https://www.instagram.com/reel/C1a2B3c4D5e/")?.url).toBe(
      "https://www.instagram.com/reel/C1a2B3c4D5e/",
    );
    expect(parseInstagramUrl("javascript:alert(1)//instagram.com/reel/C1a2B3c4D5e")?.url).toBe(
      "https://www.instagram.com/reel/C1a2B3c4D5e/",
    );
  });
});

describe("extractInstagramUrl", () => {
  it("pulls the link out of shared text", () => {
    expect(extractInstagramUrl("Watch this! https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=x).")).toBe(
      "https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=x",
    );
  });

  it("returns null when there is no Instagram link", () => {
    expect(extractInstagramUrl("no link here https://example.com")).toBeNull();
  });
});

describe("share links", () => {
  it("detects instagram.com/share/ links that need resolving", () => {
    expect(isInstagramShareLink("https://www.instagram.com/share/reel/BAbc123xyz/")).toBe(true);
    expect(parseInstagramUrl("https://www.instagram.com/share/reel/BAbc123xyz/")).toBeNull();
    expect(isInstagramShareLink("https://www.instagram.com/reel/C1a2B3c4D5e/")).toBe(false);
  });
});

describe("embedUrl", () => {
  it("builds the official embed address", () => {
    expect(embedUrl("reel", "C1a2B3c4D5e")).toBe("https://www.instagram.com/reel/C1a2B3c4D5e/embed/");
    expect(embedUrl("p", "C1a2B3c4D5e", true)).toBe("https://www.instagram.com/p/C1a2B3c4D5e/embed/captioned/");
  });
});
