"use client";

import { useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { StatusIcon } from "@/components/status-icon";
import { setStatusAction } from "@/lib/actions/reels";
import { STATUS_META, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NEXT: Partial<Record<Status, { to: Status; label: string }>> = {
  new: { to: "approved", label: "Approve" },
  approved: { to: "in_production", label: "Start" },
  in_production: { to: "posted", label: "Posted" },
};

/** One-tap pipeline advance for admins, right on the board card. */
export function QuickAdvance({ reelId, status }: { reelId: number; status: Status }) {
  const [pending, startTransition] = useTransition();
  const step = NEXT[status];
  if (!step) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setStatusAction(reelId, step.to);
          if (result.error) toast.error(result.error);
          else toast.success(`Moved to ${STATUS_META[step.to].label}`);
        })
      }
      className={cn(
        "inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-muted",
        "transition-[color,border-color,background-color,transform,box-shadow] duration-200 ease-brand",
        "hover:border-accent/50 hover:bg-brand-soft hover:text-fg active:scale-[0.98]",
        pending && "pointer-events-none opacity-60",
      )}
    >
      <StatusIcon status={step.to} className="size-4" />
      {step.label}
      <ArrowRight className="size-3.5" aria-hidden />
    </button>
  );
}
