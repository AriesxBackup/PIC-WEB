import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { TimeAgo } from "@/components/clock";
import { ConfirmButton } from "@/components/form-controls";
import { Reveal } from "@/components/motion";
import { ReelEmbed } from "@/components/reel-embed";
import { StatusBadge } from "@/components/status-badge";
import { button } from "@/components/ui";
import { VoteButton } from "@/components/vote-button";
import { deleteReelAction } from "@/lib/actions/reels";
import { requireUser } from "@/lib/auth/dal";
import { listComments } from "@/lib/data/comments";
import { getReel, listTags } from "@/lib/data/reels";
import { listActivePeople } from "@/lib/data/users";
import { reelUrl } from "@/lib/instagram";
import { warmPreviews } from "@/lib/instagram-preview";
import { cn } from "@/lib/utils";
import { Discussion } from "./discussion";
import { IdeaEditor } from "./idea-editor";
import { ProductionPanel } from "./production-panel";

export const metadata: Metadata = { title: "Reel" };

export default async function ReelPage({ params, searchParams }: PageProps<"/reels/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const reelId = Number(id);
  if (!Number.isSafeInteger(reelId) || reelId <= 0) notFound();
  const reel = await getReel(reelId, user.id);
  if (!reel) notFound();

  const { added } = await searchParams;
  if (!reel.igAuthor) after(() => warmPreviews([reel.shortcode]));
  const isAdmin = user.role === "admin";
  const canEdit = isAdmin || reel.author?.id === user.id;
  const others = reel.voteCount - (reel.votedByMe ? 1 : 0);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/" className={`${button.ghost} -ml-3 mb-2`}>
        <ArrowLeft className="size-4" /> Feed
      </Link>

      {added === "1" ? (
        <p className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg shadow-black/5 backdrop-blur-xl dark:text-emerald-200">
          🎉 Saved! The whole team can see it now.
        </p>
      ) : null}

      {/* Phones: who + idea, then the reel, then the rest. Desktop: reel on the left, everything else on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <div className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-1">
          <Reveal delay={0}>
            <header className="flex items-center gap-3">
              <Avatar person={reel.author} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{reel.author?.name ?? "Former member"}</p>
                <p className="text-sm text-muted">
                  shared this <TimeAgo time={reel.createdAt} />
                </p>
              </div>
              <StatusBadge status={reel.status} />
            </header>
          </Reveal>

          <Reveal delay={0.05}>
            <IdeaEditor
              reelId={reel.id}
              idea={reel.idea}
              tags={reel.tags}
              canEdit={canEdit}
              knownTags={canEdit ? (await listTags()).map((t) => t.tag) : []}
            />
          </Reveal>
        </div>

        <div className="lg:sticky lg:top-20 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          <ReelEmbed
            kind={reel.kind}
            shortcode={reel.shortcode}
            author={reel.igAuthor}
            captioned
            eager
            className="mx-auto max-w-[400px]"
          />
          <a
            href={reelUrl(reel.kind, reel.shortcode)}
            target="_blank"
            rel="noreferrer"
            className={cn(button.secondary, "mx-auto mt-3 flex w-full max-w-[400px]")}
          >
            Open in Instagram <ArrowUpRight className="size-4" />
          </a>
        </div>

        <div className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-2">
          <Reveal delay={0.1}>
            <div className="flex flex-wrap items-center gap-3">
              <VoteButton reelId={reel.id} count={reel.voteCount} voted={reel.votedByMe} size="lg" />
              <p className="text-sm text-muted">
                {reel.votedByMe
                  ? others > 0
                    ? `You and ${others} other${others === 1 ? "" : "s"} want to make this`
                    : "You want to make this"
                  : reel.voteCount > 0
                    ? `${reel.voteCount} teammate${reel.voteCount === 1 ? "" : "s"} want${reel.voteCount === 1 ? "s" : ""} to make this`
                    : "Tap 🔥 if we should make this"}
              </p>
              {canEdit ? (
                <ConfirmButton
                  action={deleteReelAction.bind(null, reel.id)}
                  confirmLabel="Tap again to delete"
                  className="ml-auto px-3 py-2"
                >
                  <Trash2 className="size-4" /> Delete
                </ConfirmButton>
              ) : null}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <ProductionPanel
              reelId={reel.id}
              status={reel.status}
              assignee={reel.assignee}
              dueDate={reel.dueDate}
              isAdmin={isAdmin}
              isAssignee={reel.assignee?.id === user.id}
              people={isAdmin ? await listActivePeople() : []}
            />
          </Reveal>

          <Reveal delay={0.2}>
            <Discussion reelId={reel.id} comments={await listComments(reel.id)} me={user} />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
