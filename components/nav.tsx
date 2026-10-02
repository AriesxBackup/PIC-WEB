"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CheckSquare, Columns3, Home, Plus, Settings, Shield } from "lucide-react";
import type { ComponentType } from "react";
import { Avatar } from "./avatar";
import { Logo } from "./logo";
import { button } from "./ui";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }>; badge?: number };

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({
  appName,
  user,
  openTasks,
}: {
  appName: string;
  user: { id: number; name: string; role: "admin" | "member" };
  openTasks: number;
}) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/board", label: "Board", icon: Columns3 },
    { href: "/tasks", label: "My tasks", icon: CheckSquare, badge: openTasks },
    ...(user.role === "admin" ? [{ href: "/admin", label: "Team", icon: Shield }] : []),
  ];

  return (
    <header className="glass hairline sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex min-h-11 min-w-0 items-center gap-2.5 font-bold tracking-tight">
          <Logo className="size-8 shrink-0 shadow-[0_2px_10px_rgb(10_20_10/0.25)] transition-transform duration-300 ease-spring group-hover:scale-105 group-active:scale-95" />
          <span className="truncate text-lg">{appName}</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-brand",
                  active ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="bg-brand-soft absolute inset-0 rounded-lg ring-1 ring-accent/25 ring-inset"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <item.icon className="relative size-4" />
                <span className="relative">{item.label}</span>
                {item.badge ? <Badge count={item.badge} className="relative" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* max-md:hidden (a variant) reliably beats the button's own inline-flex; on phones the bottom bar has "+" */}
          <Link href="/reels/new" className={cn(button.primary, "max-md:hidden")}>
            <Plus className="size-4" />
            Add reel
          </Link>
          <Link
            href="/settings"
            className="rounded-full p-0.5 transition hover:ring-2 hover:ring-accent/40"
            aria-label="Your account"
            title={`${user.name} — settings`}
          >
            <Avatar person={user} size="md" className="ring-0" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ isAdmin, openTasks }: { isAdmin: boolean; openTasks: number }) {
  const pathname = usePathname();
  const left: NavItem[] = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/board", label: "Board", icon: Columns3 },
  ];
  const right: NavItem[] = [
    { href: "/tasks", label: "Tasks", icon: CheckSquare, badge: openTasks },
    isAdmin ? { href: "/admin", label: "Team", icon: Shield } : { href: "/settings", label: "Me", icon: Settings },
  ];

  const renderItem = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-200 ease-brand",
          active ? "font-semibold text-fg" : "text-muted active:scale-95",
        )}
      >
        <span className="relative">
          <item.icon
            className={cn(
              "size-6 transition-transform duration-200 ease-spring",
              active && "scale-110",
            )}
          />
          {item.badge ? <Badge count={item.badge} className="absolute -right-2.5 -top-1.5" /> : null}
        </span>
        {item.label}
        {active ? (
          <motion.span
            layoutId="bottom-nav-dot"
            className="bg-accent absolute -bottom-0.5 h-1 w-1 rounded-full"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="glass hairline-t bottom-nav fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center px-2">
        {left.map(renderItem)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/reels/new"
            aria-label="Add a reel"
            className="bg-brand text-on-brand -mt-6 flex size-14 items-center justify-center rounded-2xl shadow-xl shadow-black/25 ring-4 ring-bg transition-transform duration-150 ease-spring hover:brightness-110 active:scale-90"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </Link>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}

function Badge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-4.5 items-center justify-center rounded-full bg-fg-strong px-1 text-[10px] font-bold leading-[18px] text-bg ring-2 ring-bg",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
