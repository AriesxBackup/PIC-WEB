import "server-only";
import { isInstagramHost, isInstagramShareLink, parseInstagramUrl, type ParsedReel } from "./instagram";

/**
 * Like parseInstagramUrl, but also follows instagram.com/share/… redirects to find the real reel.
 * Resolution is best-effort (Instagram may refuse requests from servers) and never leaves Instagram's domains.
 */
export async function resolveInstagramUrl(input: string): Promise<ParsedReel | null> {
  const parsed = parseInstagramUrl(input);
  if (parsed || !isInstagramShareLink(input)) return parsed;

  let current = input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`;
  for (let hop = 0; hop < 4; hop++) {
    try {
      const url = new URL(current);
      if (url.protocol !== "https:" || !isInstagramHost(url.hostname)) return null;
      const res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; ReelBoard/1.0)" },
      });
      const location = res.headers.get("location");
      if (!location) return null;
      current = new URL(location, url).toString();
      const next = parseInstagramUrl(current);
      if (next) return next;
    } catch {
      return null;
    }
  }
  return null;
}
