import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/config";
import { getPreviewTarget, savePreviewInfo, type PreviewTarget } from "@/lib/data/reels";
import { reelUrl } from "@/lib/instagram";

// Feeds show a still preview instantly and only start Instagram's (heavy) player for reels on screen.
// Instagram blocks hotlinking its images (Cross-Origin-Resource-Policy: same-origin), so the preview
// is fetched once through Instagram's public oEmbed endpoint and kept in DATA_DIR/thumbs.

const THUMB_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "thumbs");
const RETRY_AFTER_MS = 6 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_PARALLEL = 3;
const IMAGE_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

export function thumbPath(shortcode: string): string {
  return path.join(THUMB_DIR, `${shortcode}.img`);
}

type PreviewState = { inflight: Map<string, Promise<boolean>>; active: number; queue: (() => void)[] };
const globalForPreview = globalThis as unknown as { __reelBoardPreview?: PreviewState };
const state: PreviewState = (globalForPreview.__reelBoardPreview ??= { inflight: new Map(), active: 0, queue: [] });

/** Runs at most MAX_PARALLEL Instagram requests at a time. */
async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (state.active >= MAX_PARALLEL) await new Promise<void>((resolve) => state.queue.push(resolve));
  else state.active++;
  try {
    return await task();
  } finally {
    const next = state.queue.shift();
    if (next) next(); // hand the slot straight to the next waiter
    else state.active--;
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function fetchPreview(target: PreviewTarget): Promise<boolean> {
  const oembed = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(reelUrl(target.kind, target.shortcode))}`;
  const res = await fetch(oembed, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`oEmbed responded ${res.status}`);
  const data = (await res.json()) as { author_name?: unknown; title?: unknown; thumbnail_url?: unknown };

  savePreviewInfo(target.id, {
    author: typeof data.author_name === "string" ? data.author_name.slice(0, 60) : null,
    caption: typeof data.title === "string" ? data.title.slice(0, 500) : null,
  });

  const thumb = typeof data.thumbnail_url === "string" ? new URL(data.thumbnail_url) : null;
  if (!thumb || thumb.protocol !== "https:" || !IMAGE_HOSTS.test(thumb.hostname)) return false;
  const image = await fetch(thumb, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(10000) });
  if (!image.ok || !(image.headers.get("content-type") ?? "").startsWith("image/")) return false;
  const bytes = Buffer.from(await image.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return false;

  await fs.mkdir(THUMB_DIR, { recursive: true });
  const tmp = `${thumbPath(target.shortcode)}.${process.pid}.tmp`;
  await fs.writeFile(tmp, bytes);
  await fs.rename(tmp, thumbPath(target.shortcode));
  return true;
}

/** Makes sure a board reel's preview image is on disk. Resolves true when it's ready to serve. */
export async function ensurePreview(shortcode: string): Promise<boolean> {
  if (await fileExists(thumbPath(shortcode))) return true;
  // Already downloading (e.g. started by after() on page render)? Wait for that instead.
  const running = state.inflight.get(shortcode);
  if (running) return running;

  const target = getPreviewTarget(shortcode);
  if (!target) return false;
  // Don't keep asking Instagram about a reel that failed recently (private, deleted, rate-limited…).
  if (target.previewAt && Date.now() - target.previewAt < RETRY_AFTER_MS) return false;

  const job = withSlot(() => fetchPreview(target))
    .catch(() => {
      savePreviewInfo(target.id, { author: null, caption: null });
      return false;
    })
    .finally(() => state.inflight.delete(shortcode));
  state.inflight.set(shortcode, job);
  return job;
}

/** Fetches previews in the background (call from `after()`), e.g. for reels shown on a page. */
export async function warmPreviews(shortcodes: string[]): Promise<void> {
  await Promise.all(shortcodes.map((code) => ensurePreview(code)));
}

/** Content type from the file's first bytes (Instagram serves JPEG, sometimes WebP/PNG). */
export function imageType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return "image/jpeg";
}
