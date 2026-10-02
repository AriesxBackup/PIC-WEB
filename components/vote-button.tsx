"use client";

import { useOptimistic, useTransition } from "react";
import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { toggleVoteAction } from "@/lib/actions/reels";
import { AnimatedNumber, spring } from "./motion";
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
    <motion.button
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
      whileTap={{ scale: 0.88 }}
      transition={spring}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums",
        size === "lg" ? "min-h-11 px-4 text-base" : "min-h-10 px-3.5 text-sm",
        state.voted
          ? "bg-orange-500/15 text-orange-600 ring-1 ring-orange-500/30 dark:text-orange-400"
          : "bg-surface-2 text-muted hover:text-fg",
      )}
    >
      <span aria-hidden className={cn(!state.voted && "grayscale")}>
        {/* Keyed on the vote state so toggling re-runs the pop. */}
        <motion.span
          key={state.voted ? "voted" : "unvoted"}
          className="inline-block"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={spring}
        >
          <Flame className={cn("size-4 transition", state.voted && "fill-current scale-110")} />
        </motion.span>
      </span>
      <AnimatedNumber value={state.count} />
    </motion.button>
  );
}
