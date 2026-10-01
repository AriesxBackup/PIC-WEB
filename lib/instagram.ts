// Parsing helpers for Instagram links. Pure functions — safe to use on the server and in the browser.

export type ReelKind = "reel" | "p" | "tv";

export type ParsedReel = {
  shortcode: string;
  kind: ReelKind;
  /** Canonical link without tracking parameters. */
  url: string;
};

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "instagr.am",
  "www.instagr.am",
]);

const KIND_BY_SEGMENT: Record<string, ReelKind> = {
  reel: "reel",
  reels: "reel",
  p: "p",
  tv: "tv",
};

// First path segments that are Instagram features rather than usernames.
const RESERVED_SEGMENTS = new Set(["share", "stories", "explore", "accounts", "direct", "s"]);

const SHORTCODE_RE = /^[A-Za-z0-9_-]{5,64}$/;
// e.g. instagram.com/reels/audio/123/ is an audio page, not a reel.
const NOT_SHORTCODES = new Set(["audio", "videos", "tagged"]);
// The lookbehind stops "notinstagram.com/…" from matching.
const URL_IN_TEXT_RE = /(?:https?:\/\/)?(?<![\w.-])(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/[^\s<>"']+/i;

/** Finds the first Instagram link inside arbitrary text (e.g. text shared from the Instagram app). */
export function extractInstagramUrl(text: string): string | null {
  const match = text.match(URL_IN_TEXT_RE);
  if (!match) return null;
  return match[0].replace(/[),.!?]+$/, "");
}

function toUrl(input: string): URL | null {
  const candidate = (extractInstagramUrl(input) ?? input).trim();
  if (!candidate) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Turns any reel/post link (with or without tracking params, username prefix, `reels/` plural,
 * mobile host…) into its shortcode + canonical URL. Returns null when the link isn't a post.
 */
export function parseInstagramUrl(input: string): ParsedReel | null {
  const url = toUrl(input);
  if (!url) return null;
  const parts = url.pathname.split("/").filter(Boolean);

  for (const start of [0, 1]) {
    if (start === 1 && (parts.length < 3 || RESERVED_SEGMENTS.has(parts[0].toLowerCase()))) break;
    const kind = KIND_BY_SEGMENT[parts[start]?.toLowerCase() ?? ""];
    const shortcode = parts[start + 1];
    if (kind && shortcode && SHORTCODE_RE.test(shortcode) && !NOT_SHORTCODES.has(shortcode.toLowerCase())) {
      return { kind, shortcode, url: reelUrl(kind, shortcode) };
    }
  }
  return null;
}

export function isInstagramHost(hostname: string): boolean {
  return INSTAGRAM_HOSTS.has(hostname.toLowerCase());
}

/** Instagram "share" links (instagram.com/share/…) hide the shortcode behind a redirect. */
export function isInstagramShareLink(input: string): boolean {
  const url = toUrl(input);
  return !!url && url.pathname.toLowerCase().startsWith("/share/");
}

export function reelUrl(kind: ReelKind, shortcode: string): string {
  return `https://www.instagram.com/${kind}/${shortcode}/`;
}

export function embedUrl(kind: ReelKind, shortcode: string, captioned = false): string {
  return `https://www.instagram.com/${kind}/${shortcode}/embed/${captioned ? "captioned/" : ""}`;
}
