import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { ReelSummary } from "@/lib/data/reels";
import { Avatar } from "./avatar";
import { DueBadge } from "./clock";
import { ReelThumb } from "./reel-thumb";
import { StatusBadge } from "./status-badge";

/** Small card for the board and task lists — no embedded player, just the essentials. */
export function CompactReel({
  reel,
  showStatus = false,
  children,
}: {
  reel: ReelSummary;
  showStatus?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:border-pink-500/30">
      <Link href={`/reels/${reel.id}`} className="flex gap-3">
        <ReelThumb shortcode={reel.shortcode} className="h-16 w-11" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-3 text-sm font-medium leading-snug [overflow-wrap:anywhere]">{reel.idea}</span>
          {reel.tags.length || reel.igAuthor ? (
            <span className="mt-1 block truncate text-xs text-muted">
              {[reel.igAuthor ? `@${reel.igAuthor}` : null, ...reel.tags.map((t) => `#${t}`)].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </span>
      </Link>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">
        {showStatus ? <StatusBadge status={reel.status} /> : null}
        <span className="inline-flex items-center gap-1" title={`Shared by ${reel.author?.name ?? "a former member"}`}>
          <Avatar person={reel.author} size="xs" className="ring-0" />
        </span>
        {reel.assignee ? (
          <span className="inline-flex items-center gap-1 font-medium text-fg/80">
            → <Avatar person={reel.assignee} size="xs" className="ring-0" /> {reel.assignee.name}
          </span>
        ) : null}
        {reel.dueDate ? <DueBadge date={reel.dueDate} done={reel.status === "posted" || reel.status === "skipped"} /> : null}
        <span className="ml-auto inline-flex items-center gap-2 tabular-nums">
          {reel.voteCount ? <span>🔥 {reel.voteCount}</span> : null}
          {reel.commentCount ? (
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="size-3.5" /> {reel.commentCount}
            </span>
          ) : null}
        </span>
      </div>
      {children ? <div className="mt-2.5 border-t border-border pt-2.5">{children}</div> : null}
    </div>
  );
}
