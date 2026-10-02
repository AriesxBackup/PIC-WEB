import { STATUS_META, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset backdrop-blur-sm",
        meta.className,
        className,
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
