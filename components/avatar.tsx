import type { Person } from "@/lib/data/users";
import { avatarBackground, cn, initials } from "@/lib/utils";

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
  xl: "size-24 text-xl",
  "2xl": "size-28 text-2xl",
};

export function Avatar({ person, size = "md", className }: { person: Person | null; size?: keyof typeof SIZES; className?: string }) {
  const name = person?.name ?? "Former member";
  return (
    <span
      title={name}
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-surface",
        SIZES[size],
        className,
      )}
      style={{ background: person ? avatarBackground(person.id) : "#5c665a" }}
    >
      {person?.avatarV ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny avatars served from our own API with versioned cache busting
        <img
          src={`/api/avatar/${person.id}?v=${person.avatarV}`}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
