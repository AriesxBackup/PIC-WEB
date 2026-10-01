import type { Status } from "./constants";

export type FeedQuery = { status?: Status; q?: string; tag?: string; by?: number; sort?: "new" | "top" };

/** URL of the feed with the given filters (empty values are left out). */
export function feedHref(query: FeedQuery & { limit?: number }): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.tag) params.set("tag", query.tag);
  if (query.by) params.set("by", String(query.by));
  if (query.sort === "top") params.set("sort", "top");
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
