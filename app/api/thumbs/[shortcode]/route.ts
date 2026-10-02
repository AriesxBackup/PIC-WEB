import { getCurrentUser } from "@/lib/auth/dal";
import { getThumbnail } from "@/lib/data/reels";
import { ensurePreview } from "@/lib/instagram-preview";

const SHORTCODE_RE = /^[A-Za-z0-9_-]{5,64}$/;

// Preview image for a reel on the board (fetched from Instagram once, then served from the database).
export async function GET(_request: Request, context: RouteContext<"/api/thumbs/[shortcode]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { shortcode } = await context.params;
  const thumbnail =
    SHORTCODE_RE.test(shortcode) && (await ensurePreview(shortcode)) ? await getThumbnail(shortcode) : null;
  if (!thumbnail) {
    // Short cache so a reel whose preview appears later gets picked up.
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, max-age=300" } });
  }
  return new Response(Buffer.from(thumbnail.data), {
    headers: {
      "Content-Type": thumbnail.contentType,
      // A reel's preview never changes.
      "Cache-Control": "private, max-age=2592000, immutable",
    },
  });
}
