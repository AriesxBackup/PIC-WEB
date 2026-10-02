import Link from "next/link";
import { after } from "next/server";
import { Plus } from "lucide-react";
import { FeedFilters } from "@/components/feed-filters";
import { ReelCard } from "@/components/reel-card";
import { EmptyState, PageHeader, button } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { isStatus, normalizeTag } from "@/lib/constants";
import { listReels, listTags } from "@/lib/data/reels";
import { listActivePeople } from "@/lib/data/users";
import { feedHref, type FeedQuery } from "@/lib/feed";
import { warmPreviews } from "@/lib/instagram-preview";

const PAGE_SIZE = 24;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function FeedPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const params = await searchParams;

  const status = one(params.status);
  const query: FeedQuery = {
    status: isStatus(status) ? status : undefined,
    q: one(params.q).trim().replace(/^@/, "").slice(0, 100) || undefined,
    tag: normalizeTag(one(params.tag)) || undefined,
    by: Number(one(params.by)) || undefined,
    sort: one(params.sort) === "top" ? "top" : "new",
  };
  const limit = Math.min(Math.max(Number(one(params.limit)) || PAGE_SIZE, PAGE_SIZE), 240);

  const { items, hasMore } = await listReels(user.id, {
    status: query.status,
    q: query.q,
    tag: query.tag,
    authorId: query.by,
    sort: query.sort,
    limit,
  });
  const filtered = Boolean(query.status || query.q || query.tag || query.by);

  // Fetch missing previews (thumbnail + creator) after the page is sent, so the next visit has them.
  const missingPreviews = items.filter((reel) => !reel.igAuthor).map((reel) => reel.shortcode);
  if (missingPreviews.length) after(() => warmPreviews(missingPreviews));

  return (
    <>
      <PageHeader title="Team feed" subtitle="Reels the team saved — and what we could make from each one." />
      <FeedFilters query={query} tags={await listTags()} people={await listActivePeople()} />

      {items.length === 0 ? (
        filtered ? (
          <EmptyState icon="🔎" title="Nothing matches">
            Try another filter, or <Link href="/" className="font-medium text-fg underline">see everything</Link>.
          </EmptyState>
        ) : (
          <EmptyState icon="🎬" title="No reels yet">
            Found a reel worth copying? Tap <b>Add reel</b>, paste the Instagram link and write your idea.
            <div className="mt-4">
              <Link href="/reels/new" className={button.primary}>
                <Plus className="size-4" /> Add the first reel
              </Link>
            </div>
          </EmptyState>
        )
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {items.map((reel, i) => (
            <ReelCard key={reel.id} reel={reel} index={i} />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <Link href={feedHref({ ...query, limit: limit + PAGE_SIZE })} scroll={false} className={button.secondary}>
            Load more
          </Link>
        </div>
      ) : null}
    </>
  );
}
