import { BadgeCheck, Clapperboard, Lightbulb, Rocket, SkipForward } from "lucide-react";
import type { ComponentType } from "react";
import type { Status } from "@/lib/constants";

export const STATUS_ICON: Record<Status, ComponentType<{ className?: string }>> = {
  new: Lightbulb,
  approved: BadgeCheck,
  in_production: Clapperboard,
  posted: Rocket,
  skipped: SkipForward,
};

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const Icon = STATUS_ICON[status];
  return <Icon className={className} />;
}
