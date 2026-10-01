"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setStatusAction(reelId, next);
          if (result.error) toast.error(result.error);
          else toast.success(`${meta.emoji} Moved to ${meta.label}`);
        })
      }
      className={cn(button.secondary, "w-full py-2")}
    >
      {next === "posted" ? "🚀 Mark as posted" : "🎬 Start making it"}
    </button>
  );
}
