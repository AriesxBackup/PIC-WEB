import type { NextRequest } from "next/server";
import { extractInstagramUrl } from "@/lib/instagram";

// Target of the PWA share sheet (see app/manifest.ts): Android's "Share → Reel Board" and
// the iPhone Shortcut both land here with the link somewhere in url/text/title.
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shared = ["url", "text", "title"]
    .map((key) => params.get(key) ?? "")
    .join(" ")
    .trim();
  const link = extractInstagramUrl(shared);

  const target = new URLSearchParams();
  if (link) target.set("url", link);
  else if (shared) target.set("shared", shared.slice(0, 500));
  const query = target.toString();

  return new Response(null, {
    status: 303,
    headers: { Location: `/reels/new${query ? `?${query}` : ""}` },
  });
}
