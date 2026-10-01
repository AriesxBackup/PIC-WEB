"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleVoteAction } from "@/lib/actions/reels";
import { cn } from "@/lib/utils";

export function VoteButton({
  reelId,
  count,
  voted,
  size = "sm",
}: {
  reelId: number;
  count: number;
  voted: boolean;
  size?: "sm" | "lg";
}) {
  const [, startTransition] = useTransition();
  const [state, toggle] = useOptimistic({ count, voted }, (current) => ({
    voted: !current.voted,
    count: current.count + (current.voted ? -1 : 1),
  }));

  return (
    <button
      type="button"
      aria-pressed={state.voted}
      aria-label={state.voted ? "Remove your fire vote" : "Fire vote — we should make this"}
      title={state.voted ? "You voted for this" : "Vote: we should make this"}
      onClick={() =>
        startTransition(async () => {
          toggle(undefined);
          const result = await toggleVoteAction(reelId);
          if ("error" in result) toast.error(result.error);
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums transition active:scale-95",
        size === "lg" ? "min-h-11 px-4 text-base" : "min-h-10 px-3.5 text-sm",
        state.voted
          ? "bg-orange-500/15 text-orange-600 ring-1 ring-orange-500/30 dark:text-orange-400"
          : "bg-surface-2 text-muted hover:text-fg",
      )}
    >
      <span aria-hidden className={cn("transition", state.voted ? "scale-110" : "grayscale")}>
        🔥
      </span>
      {state.count}
    </button>
  );
}
