"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Clapperboard, Rocket } from "lucide-react";
import { button } from "@/components/ui";
import { setStatusAction } from "@/lib/actions/reels";
import { STATUS_META, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** One-tap progress buttons for the person a reel is assigned to. */
export function TaskActions({ reelId, status }: { reelId: number; status: Status }) {
  const [pending, startTransition] = useTransition();
  const next: Status | null = status === "in_production" ? "posted" : status === "posted" ? null : "in_production";
  if (!next) return null;
  const meta = STATUS_META[next];
  const isPosted = next === "posted";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setStatusAction(reelId, next);
          if (result.error) toast.error(result.error);
          else toast.success(`Moved to ${meta.label}`);
        })
      }
      className={cn(
        button.secondary,
        "w-full py-2 active:scale-[0.96]",
        isPosted &&
          "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 shadow-[0_0_24px_-8px_rgb(16_185_129/0.45)] hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:shadow-[0_0_30px_-6px_rgb(16_185_129/0.55)] dark:text-emerald-300",
      )}
    >
      {isPosted ? (
        <>
          <Rocket className="size-4" /> Mark as posted
        </>
      ) : (
        <>
          <Clapperboard className="size-4" /> Start making it
        </>
      )}
    </button>
  );
}
