"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import type { ReelSummary } from "@/lib/data/reels";
import { reelUrl } from "@/lib/instagram";
import { Avatar } from "./avatar";
import { DueBadge, TimeAgo } from "./clock";
import { spring } from "./motion";
import { ReelEmbed } from "./reel-embed";
import { StatusBadge } from "./status-badge";
import { VoteButton } from "./vote-button";

/**
 * Feed card: who shared it, the playable reel, their idea, and the team's reactions.
 *
 * The entrance stagger lives on a wrapper (delay in its transition) so the article's
 * whileHover/whileTap keep responding instantly — a delay on the article itself would
 * also delay every hover-out, since motion re-uses the resting transition on exit.
 */
export function ReelCard({ reel, index = 0 }: { reel: ReelSummary; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.05, 0.45) }}
    >
      <motion.article
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.99 }}
        transition={spring}
        className="card-surface flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm shadow-black/[0.04] transition-[border-color,box-shadow,transform] duration-200 ease-brand hover:border-accent/40 hover:shadow-lg hover:shadow-black/[0.08] sm:p-4 dark:shadow-black/30 dark:hover:shadow-black/50"
      >
        <header className="flex items-center gap-2.5">
          <Avatar person={reel.author} size="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{reel.author?.name ?? "Former member"}</p>
            <TimeAgo time={reel.createdAt} className="text-xs text-muted" />
          </div>
          <StatusBadge status={reel.status} />
        </header>

        <ReelEmbed kind={reel.kind} shortcode={reel.shortcode} author={reel.igAuthor} />

        <Link
          href={`/reels/${reel.id}`}
          className="group block rounded-xl border border-border/60 bg-surface-2 px-3.5 py-3 transition-colors duration-200 ease-brand hover:border-accent/40 hover:bg-brand-soft"
        >
          <p className="eyebrow mb-1.5 text-brand">💡 Idea</p>
          <p className="line-clamp-5 whitespace-pre-line text-[15px] leading-snug [overflow-wrap:anywhere]">{reel.idea}</p>
          {reel.tags.length ? (
            <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-muted">
              {reel.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </p>
          ) : null}
        </Link>

        {reel.assignee || reel.dueDate ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {reel.assignee ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar person={reel.assignee} size="xs" className="ring-0" />
                {reel.assignee.name} is on it
              </span>
            ) : null}
            {reel.dueDate ? <DueBadge date={reel.dueDate} done={reel.status === "posted"} /> : null}
          </div>
        ) : null}

        <footer className="flex items-center gap-2">
          <VoteButton reelId={reel.id} count={reel.voteCount} voted={reel.votedByMe} />
          <Link
            href={`/reels/${reel.id}#discussion`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-sm font-semibold tabular-nums text-muted transition hover:text-fg"
            aria-label={`${reel.commentCount} comments`}
          >
            <MessageCircle className="size-4" />
            {reel.commentCount}
          </Link>
          <a
            href={reelUrl(reel.kind, reel.shortcode)}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted transition hover:text-fg"
          >
            Instagram <ArrowUpRight className="size-3.5" />
          </a>
        </footer>
      </motion.article>
    </motion.div>
  );
}
