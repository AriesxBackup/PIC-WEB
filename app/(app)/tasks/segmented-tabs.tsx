"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { springSoft } from "@/components/motion";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/tasks", label: "Mine", id: "mine" },
  { href: "/tasks?who=all", label: "Everyone", id: "everyone" },
] as const;

/** Segmented control for the Mine/Everyone tabs with a springy sliding active pill. */
export function SegmentedTabs({ active }: { active: "mine" | "everyone" }) {
  return (
    <div className="inline-flex rounded-2xl border border-border bg-surface-2/60 p-1 text-sm font-medium shadow-sm shadow-black/5 dark:shadow-black/30">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-10 items-center rounded-xl px-5 transition-colors duration-200 ease-brand",
              isActive ? "text-fg" : "text-muted hover:text-fg active:scale-[0.97]",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="tasks-tab"
                className="bg-brand-soft absolute inset-0 rounded-xl shadow-sm shadow-black/5 ring-1 ring-accent/25 ring-inset"
                transition={springSoft}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
