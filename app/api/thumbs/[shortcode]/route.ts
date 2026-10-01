import fs from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth/dal";
import { ensurePreview, imageType, thumbPath } from "@/lib/instagram-preview";

const SHORTCODE_RE = /^[A-Za-z0-9_-]{5,64}$/;

// Preview image for a reel on the board (fetched from Instagram once, then served from disk).
export async function GET(_request: Request, context: RouteContext<"/api/thumbs/[shortcode]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { shortcode } = await context.params;
  if (!SHORTCODE_RE.test(shortcode) || !(await ensurePreview(shortcode))) {
    // Short cache so a reel whose preview appears later gets picked up.
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, max-age=300" } });
  }

  const bytes = await fs.readFile(thumbPath(shortcode));
  return new Response(bytes, {
    headers: {
      "Content-Type": imageType(bytes),
      // A reel's preview never changes.
      "Cache-Control": "private, max-age=2592000, immutable",
    },
  });
}
