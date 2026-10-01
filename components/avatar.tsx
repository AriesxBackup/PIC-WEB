import type { Person } from "@/lib/data/users";
import { avatarBackground, cn, initials } from "@/lib/utils";

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
};

export function Avatar({ person, size = "md", className }: { person: Person | null; size?: keyof typeof SIZES; className?: string }) {
  const name = person?.name ?? "Former member";
  return (
    <span
      title={name}
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface",
        SIZES[size],
        className,
      )}
      style={{ background: person ? avatarBackground(person.id) : "#71717a" }}
    >
      {initials(name)}
    </span>
  );
}
